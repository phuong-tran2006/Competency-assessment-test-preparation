# Thống nhất role học viên thành STUDENT

Role hiện tại gồm `STUDENT`, `INSTRUCTOR`, `ADMIN`.

Migration `20261108000000_unify_student_role` chuyển các tài khoản `LEARNER`
sang `STUDENT`, giữ nguyên ID và quan hệ dữ liệu, sau đó loại `LEARNER` khỏi
enum PostgreSQL. Toàn bộ thay đổi nằm trong một transaction.

Database cần có lịch sử migration của dự án. Với database trước đây được tạo
bằng `prisma db push`, hãy đối chiếu và baseline migration hiện có trước khi
deploy; sao lưu dữ liệu trước khi thay đổi cấu trúc.

Seed dùng `STUDENT` cho cả nhánh tạo mới và cập nhật tài khoản học viên mẫu.
Email của các tài khoản mẫu được giữ nguyên.

## Phiên đăng nhập cũ

Frontend nâng phiên bản `auth-storage` lên 1 và chuyển role `LEARNER` đã lưu
thành `STUDENT` khi khôi phục phiên. Token và thông tin user được giữ nguyên.
Backend xác định quyền từ user trong database khi xác thực JWT, nên token cũ
sẽ sử dụng role mới sau khi migration được áp dụng.

## Cập nhật database

Từ `apps/backend`, áp dụng migration và tạo lại Prisma Client:

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma migrate status
```

Migration `20261108010000_mastery_data` cập nhật dữ liệu mastery, bổ sung
snapshot câu trả lời, index và các ràng buộc kiểm tra dữ liệu. Dùng migration
để áp dụng đầy đủ các thay đổi SQL và ghi nhận lịch sử cập nhật database.

### Cấu trúc dữ liệu sau migration

`TopicMastery` dùng bảng `topic_masteries` hiện có. Cột `rating` được đổi tên
thành `masteryScore`, giữ dữ liệu, ID và quan hệ. Khóa duy nhất
`(userId, topicId)` bảo đảm một bản ghi cho mỗi sinh viên/chủ đề. Foreign key
liên kết `User` và `Topic`; database từ chối điểm NaN/vô hạn và bộ đếm âm.

`attempts` trong model cũ được giữ tên để tương thích: đây là **số câu trả lời
có chọn đáp án đã được dùng cập nhật Elo**, được API trả dưới tên `evidenceCount`.
Điểm Elo không phải phần trăm. Giá trị khởi đầu hiện tại là 1200.

## API đọc dữ liệu

Tất cả endpoint nằm dưới `/api` và yêu cầu JWT.

| Endpoint                               | Quyền             | Dữ liệu                                               |
| -------------------------------------- | ----------------- | ----------------------------------------------------- |
| `GET /mastery/me`                      | STUDENT           | Điểm từng topic, mức đánh giá, bằng chứng, tiên quyết |
| `GET /mastery/me/questions`            | STUDENT           | Câu hỏi, độ khó, topic; không chứa đáp án đúng        |
| `GET /mastery/me/history`              | STUDENT           | Các bài đã nộp và sự kiện đúng/sai từng câu           |
| `GET /mastery/users/:userId`           | INSTRUCTOR, ADMIN | Profile mastery của sinh viên                         |
| `GET /mastery/users/:userId/questions` | INSTRUCTOR, ADMIN | Ngân hàng câu hỏi phục vụ chọn bài                    |
| `GET /mastery/users/:userId/history`   | INSTRUCTOR, ADMIN | Lịch sử sinh viên phục vụ thuật toán                  |

Query chung: `topicId`, `page` (mặc định 1), `limit` (mặc định 20, tối đa 100).
Profile nhận thêm `masteryThreshold` trong [0,3000] (mặc định 1300).
Câu hỏi nhận `difficultyMin`, `difficultyMax` trong [0,1], với
`difficultyMin <= difficultyMax`, và `unseenOnly=true|false` (mặc định `false`).
`unseenOnly` loại câu đã xuất hiện trong bài đã nộp của chính sinh viên đó.
Lịch sử nhận `order=asc|desc` (mặc định `desc`); M4 dùng `asc` để phát lại theo thứ tự thời gian.
Kết quả lịch sử phân trang theo **lượt làm bài**, mỗi lượt kèm câu trả lời được lọc theo topic.

Profile trả thêm:

- `isAssessed`: đã có bằng chứng được dùng tính mastery.
- `evidenceCount`: số câu trả lời có chọn đáp án đã được dùng cập nhật Elo.
- `hasHistory`: có bằng chứng mastery hoặc có lượt đã nộp chứa topic này.
- `submittedAttemptCount`: số lượt đã nộp có câu hỏi thuộc topic này,
  kể cả lịch sử cũ chưa được xử lý hoặc câu bỏ trống.
- `isMastered`: có bằng chứng và điểm đạt ngưỡng.
- `prerequisiteIds`: tiên quyết trực tiếp; `ancestorIds`: toàn bộ tiên quyết bắc cầu.
- `unmetPrerequisiteIds`, `ready`: topic có đủ nền tảng để học tiếp hay chưa.
- `prerequisiteCycle`: phát hiện chu trình nếu có dữ liệu cũ không hợp lệ;
  topic có chu trình không được đánh dấu sẵn sàng.

Sinh viên chưa có lịch sử nhận điểm khởi đầu, `isAssessed=false`,
`hasHistory=false`, `evidenceCount=0`, mức `Chưa đánh giá`; API không ghi điểm giả
vào database. Tiên quyết chưa có bằng chứng được xem là chưa đạt.

## Hợp đồng chấm bài và cập nhật điểm

M1 gọi `AttemptsService.finalizeAttempt()` như trước. Luồng này giữ khóa trên
lượt thi và lưu đồng thời kết quả chấm, thống kê topic, metadata câu hỏi và mastery
trong **một transaction**. Nếu lưu mastery lỗi, toàn bộ việc chấm được rollback.
Lưu đáp án cũng khóa cùng lượt thi để không ghi đè sau khi bài đã được chấm.

`MasteryService.updateAfterGrading(tx, attemptId)` là điểm tích hợp nội bộ cho M1/M4:

1. Chỉ xử lý bài đã chấm và thuộc sinh viên `STUDENT`.
2. Dùng `masteryUpdatedAt` và khóa lượt thi để không tính lại khi retry/timeout.
3. Khóa user để hai lượt thi đồng thời không ghi mất cập nhật của nhau.
4. Đọc toàn bộ đáp án và mastery liên quan theo lô; upsert một lần cho mỗi topic.
5. Đánh dấu lượt thi đã cập nhật, kể cả khi không có câu được chọn đáp án.

Chưa cung cấp endpoint cho client gửi trực tiếp điểm mastery. Công thức hiện tại
dùng lại `src/mastery/elo.ts` (khởi đầu 1200, K=32); M4 có thể thay công thức tại
đây khi thuật toán được chốt. Câu bỏ trống vẫn bị chấm sai nhưng không phải bằng
chứng cập nhật Elo, theo quy ước prototype hiện có. Ngưỡng 1300 là tham số khởi
đầu phục vụ phát triển và kiểm thử, chưa phải ngưỡng được hiệu chuẩn từ dữ liệu thực tế.

Khi chấm, `ExamAnswer.difficultyAtSubmission` và `topicIdAtSubmission` ghi
metadata đã dùng. Lịch sử ưu tiên snapshot nên thay câu hỏi sau này không sửa
đầu vào thuật toán của các bài đã chấm. Với lịch sử trước migration, snapshot
ban đầu chỉ có thể lấy từ metadata câu hỏi hiện còn trong database.

Lịch sử cũ không bị chấm lại tự động. Script `npm run mastery:proto` vẫn hỗ trợ
phát lại lịch sử STUDENT và ghi `masteryScore`; đây là công cụ bảo trì/đánh giá
offline, nên chạy khi dừng việc nộp bài để tránh ghi đè cập nhật trực tuyến.

## Tiên quyết và truy vấn

Dùng model `TopicPrerequisite` / bảng `topic_prerequisites` hiện có làm bảng
Prerequisite. API quản trị vẫn là `POST /topics/:id/prerequisites` và
`DELETE /topics/:id/prerequisites/:prerequisiteId`. Thêm cạnh dùng khóa transaction
cho đồ thị, kiểm tra topic tồn tại, cạnh trùng, tự phụ thuộc và chu trình, kể cả
khi hai request đồng thời thêm hai cạnh ngược nhau.

Đọc profile dùng số truy vấn cố định: user, topic, mastery, cạnh và tổng hợp lịch sử;
duyệt ancestor trong bộ nhớ. Không query riêng từng topic/ancestor. Các index:

- `topic_masteries(userId, topicId)` unique và index user/topic hiện có.
- `questions(topicId, difficulty)` hiện có cho chọn bài theo topic/độ khó.
- `exam_attempts(userId, status, submittedAt)` cho lịch sử cá nhân.
- `exam_answers(attemptId, questionId)` unique cho đáp án.
- Index mới `(questionId, attemptId)` và `(topicIdAtSubmission, attemptId)`
  cho lọc câu chưa gặp và lịch sử theo topic.

## Fixtures và kiểm thử

Từ `apps/backend`, sau khi áp dụng migration, tạo dữ liệu demo bằng:

```bash
npm run seed:mastery
```

Seed riêng tạo 5 topic demo, 10 câu hỏi, 4 cạnh và 4 tài khoản STUDENT, mật khẩu
`MasteryDemo@123`. ID bắt đầu bằng `mastery-demo-`; seed lặp lại không tạo bản ghi
trùng. Chạy lại sẽ đặt lại những fixture cùng ID, không đụng tài khoản khác.

| User ID                 | Email                           | Trường hợp                             |
| ----------------------- | ------------------------------- | -------------------------------------- |
| `mastery-demo-weak`     | `mastery.weak@example.test`     | Yếu ở nhiều chủ đề                     |
| `mastery-demo-blocked`  | `mastery.blocked@example.test`  | Topic nâng cao tốt, nền tảng chưa đạt  |
| `mastery-demo-mastered` | `mastery.mastered@example.test` | Thành thạo phần lớn nội dung           |
| `mastery-demo-new`      | `mastery.new@example.test`      | Không có lượt thi/mastery được tạo sẵn |

Mỗi sinh viên đã có lịch sử có 20 lượt thi, 200 đáp án. Điểm được tính từ đúng
chuỗi đáp án đó bằng cùng hàm Elo, không gán điểm tùy ý. `seed:mastery` độc lập
với `seed:all` để việc seed bình thường không tự tạo tài khoản demo.

Các unit test liên quan gồm:

- `src/mastery/elo.spec.ts`: công thức Elo và ngưỡng phân loại.
- `src/mastery/mastery.service.spec.ts`: profile, câu hỏi, lịch sử, snapshot
  và cập nhật mastery sau chấm bài.
- `src/mastery/dto/mastery-query.dto.spec.ts`: chuyển đổi boolean và kiểm tra
  thứ tự lịch sử.
- `src/topics/prerequisite-graph.spec.ts`: tổ tiên, khoảng cách và chu trình.
- `src/topics/topics.service.spec.ts`: thêm tiên quyết trong transaction,
  kiểm tra cạnh trùng và cạnh tạo chu trình.
- `src/attempts/attempts.service.spec.ts`: lưu đáp án, chấm bài, snapshot
  và tích hợp gọi cập nhật mastery.

Các unit test này dùng mock Prisma, có thể chạy độc lập với dữ liệu seed và
PostgreSQL. Chúng kiểm tra logic ứng dụng; khóa đồng thời, rollback và các
ràng buộc SQL cần được xác minh riêng trên database thật.
