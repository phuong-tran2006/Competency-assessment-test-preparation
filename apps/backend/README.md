# Backend V-ACT

NestJS, Prisma 7 và PostgreSQL. Các lệnh dưới đây chạy trong `apps/backend`, trừ khi ghi rõ.

## Demo một lệnh

Cài dependency bằng `npm ci`, sao chép `.env.example` thành `.env` và đặt `DATABASE_URL`. PostgreSQL 16+ phải chạy sẵn, database phải tồn tại nhưng chưa cần có bảng.

```bash
npm run seed
```

Lệnh chạy `prisma migrate deploy`, `prisma generate`, seed và audit. Không dùng `db push` hoặc `migrate reset` để dựng bản demo/release. Có thể chạy cùng lệnh từ thư mục gốc repository.

Kết quả trên DB trắng:

| Dữ liệu | Kết quả |
| --- | --- |
| Tài khoản ACTIVE | `admin@vact.com` (ADMIN), `instructor@vact.com` (INSTRUCTOR), `learner@vact.com` (STUDENT) |
| Mật khẩu demo khi tạo mới | `admin123` |
| Topics | Toán, Tiếng Việt, Tiếng Anh, Logic - Suy luận, Suy luận khoa học |
| Câu hỏi | 492: 400 câu ngân hàng và 92 câu từ ba file đề năm |
| Đề | `vact-exam-2024`, `vact-exam-2025`, `vact-exam-2026`: mỗi đề 120 câu |
| Cơ cấu mỗi đề | 30 Tiếng Việt + 30 Tiếng Anh + 30 Toán + 30 Logic/Suy luận khoa học |
| Nội dung học | 1 khóa PUBLISHED của instructor, 2 chương, 3 bài học, 1 tài liệu TEXT có ví dụ |
| Học viên | 1 ghi danh, 1 bài học hoàn thành |
| Lịch sử demo | 3 lượt SUBMITTED, 360 answers có snapshot; điểm lần lượt 60, 72, 84 trên 120 |
| Elo mẫu | Tính lại từ đáp án mẫu bằng `INITIAL_RATING=1200`, `K=32`; bỏ qua câu bỏ trống |

Ba đề dùng file nguồn năm riêng và bổ sung từ ngân hàng chung. Tổng 90 câu Tiếng Anh được phân bổ riêng giữa ba đề; các nhóm khác có thể dùng chung câu ngân hàng. Seed giữ các câu đã chọn và option ID khi chạy lại.

Seed dùng transaction và advisory lock chung với importer. Không xóa câu hỏi, topic hoặc lịch sử để vượt FK Restrict. Mật khẩu, lịch sử và mastery hiện có được giữ lại. Nếu email seed đã có sai role hoặc không ACTIVE, seed báo lỗi và rollback thay vì tự đổi quyền. Dữ liệu lịch sử/Elo demo là mô phỏng để trình diễn, chưa phải kết quả hiệu chuẩn trên người học thật. Elo hiện được triển khai dưới dạng công thức/prototype, API nộp bài chưa tự cập nhật mastery cho các bài mới.

## Kiểm chứng trước bàn giao

```bash
npm run validate:bank
npm run check:types
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run test:seed:integration
npm run test:assessment:integration
```

Đặt `TEST_DATABASE_URL` tới PostgreSQL kiểm thử có quyền `CREATE DATABASE`. Hai bài integration tự tạo database tên ngẫu nhiên, áp dụng toàn bộ migration và xóa đúng các DB vừa tạo khi kết thúc. Nếu không có biến này, chúng dùng server trong `DATABASE_URL` làm nơi tạo DB tạm.

- `test:seed:integration`: chạy CLI seed từ DB trắng hai lần; kiểm tra tài khoản/mật khẩu, đề/câu hỏi, học liệu, snapshot, điểm và Elo; thử rollback khi role xung đột, FK Restrict, index/query plan và schema drift. Chạy production hai lần với tài khoản riêng; kiểm tra lỗi cấu hình/backup dừng trước khi ghi, checksum và restore toàn bộ bảng.
- `test:assessment:integration`: khởi động API trên cổng tạm, đăng ký/đăng nhập, làm/nộp đủ ba đề, kiểm tra không lộ đáp án, snapshot sau sửa/reseed, từ chối nộp lại; so sánh count/hash của mọi bảng sau backup/restore.
- Báo cáo: `test-results/seed/<run>/report.json` và `test-results/assessment/<run>/report.json`. CI chạy trên PostgreSQL 16 và lưu các báo cáo JSON.

Audit chỉ đọc dữ liệu của DB đang cấu hình:

```bash
npm run audit:assessment
```

Audit phải thoát mã 0, `issues=[]`, mỗi đề 120 câu với đúng cơ cấu, `missingSnapshots=0`. Audit còn đối chiếu dữ liệu JSON, đáp án đúng/sai, metadata snapshot, tổng điểm và tổng theo topic. Không tự sửa dữ liệu lịch sử khi audit gặp lỗi.

## Seed production và backup cuối

Cấu hình `DATABASE_URL` trỏ đúng DB đích, `NODE_ENV=production`, `JWT_SECRET` riêng và các biến bên dưới qua môi trường triển khai hoặc file `.env` không commit:

```dotenv
SEED_ADMIN_EMAIL=admin@your-domain.vn
SEED_ADMIN_PASSWORD=<mat-khau-rieng-it-nhat-12-ky-tu>
SEED_INSTRUCTOR_EMAIL=instructor@your-domain.vn
SEED_INSTRUCTOR_PASSWORD=<mat-khau-rieng-it-nhat-12-ky-tu>
SEED_STUDENT_EMAIL=student@your-domain.vn
SEED_STUDENT_PASSWORD=<mat-khau-rieng-it-nhat-12-ky-tu>
SEED_BACKUP_DIR=backups
```

Ba email phải khác nhau. Có thể thêm `SEED_ADMIN_NAME`, `SEED_INSTRUCTOR_NAME`, `SEED_STUDENT_NAME`. Chạy trong thời gian bảo trì để bản backup cuối phản ánh trạng thái phát hành đã audit:

```bash
npm run seed:production
```

Thứ tự thực thi:

1. Sinh Prisma Client; kiểm tra cấu hình tài khoản và JSON nguồn trước thay đổi DB.
2. Backup DB hiện tại thành `*-before.dump`. Backup thất bại thì không chạy migration/seed.
3. `prisma migrate deploy`, sau đó seed topics, ngân hàng, ba đề và ba tài khoản trong một transaction.
4. Audit dữ liệu thật, xác nhận đủ 120 câu/đề. Có lỗi thì lệnh thất bại và chưa được coi là sẵn sàng go-live.
5. Tạo `*-ready.dump` và `*-report.json` chứa số lượng, kết quả audit, kích thước và SHA-256 của cả hai archive. Log/report không chứa mật khẩu hoặc connection URL.

Luồng production không tạo học liệu, lịch sử và Elo mô phỏng. Chạy lại giữ nguyên mật khẩu tài khoản đã tồn tại, không dùng seed để reset mật khẩu. Demo seed bị từ chối khi `NODE_ENV=production`. Migration và transaction seed là các bước riêng; nếu có lỗi sau migration, giữ bản backup trước thay đổi để phục hồi theo quy trình vận hành. Nếu backup cuối lỗi, chạy lại sau khi sửa nguyên nhân và lấy báo cáo PASS mới.

PostgreSQL client tools phải có major version bằng hoặc cao hơn server. Trên Windows script tự tìm trong `C:/Program Files/PostgreSQL`; đặt `PG_BIN` nếu cần chọn phiên bản/thư mục khác. Backup dùng custom format, kiểm tra archive bằng `pg_restore --list`, chỉ công bố file khi hoàn tất và từ chối ghi đè file có sẵn. Chuyển backup/report cuối sang nơi lưu trữ bảo mật ngoài máy triển khai trước go-live.

Backup/restore thủ công:

```bash
npm run db:backup -- --output backups/release-final.dump
# Đặt RESTORE_DATABASE_URL tới một DB kiểm thử mới, chưa có bảng
npm run db:restore -- --input backups/release-final.dump
# Sau restore: đặt DATABASE_URL tới DB kiểm thử vừa khôi phục
npm run audit:assessment
```

Restore từ chối database đã có bảng; không ghi đè production. Kiểm thử integration đã chứng minh archive khôi phục được bằng cách so sánh count/hash mọi bảng, bao gồm lịch sử làm bài.

## Schema, FK và migration cuối

Nguồn chuẩn để bạn tự vẽ ERD: [prisma/schema.prisma](prisma/schema.prisma). Bản này không tạo hình ERD.

| Nhóm quan hệ | Liên kết chính và chính sách xóa |
| --- | --- |
| Học liệu | User 1–N Course; Course 1–N Chapter; Chapter 1–N Lesson; Lesson 1–N Material. Chuỗi học liệu dùng Restrict. |
| Chủ đề | Course N–N Topic qua CourseTopic; Topic tự liên kết N–N qua TopicPrerequisite; Course tự liên kết N–N qua CoursePrerequisite. Các bảng nối dùng khóa ghép và Restrict. |
| Đề và câu hỏi | Topic 1–N Question; Question 1–N QuestionOption; Exam N–N Question qua ExamQuestion. Restrict giữ nội dung đang được tham chiếu. |
| Bài làm | User 1–N ExamAttempt (xóa user: SetNull); Exam 1–N ExamAttempt (Restrict); ExamAttempt 1–N ExamAnswer (Restrict); Question 1–N ExamAnswer (Restrict). |
| Snapshot/topic | ExamAnswer lưu JSON câu hỏi/options và FK topic tại lúc làm bài; Topic dùng Restrict. `selectedOptionIds` là mảng ID, không phải FK tới QuestionOption; snapshot giữ ý nghĩa lịch sử. |
| Kết quả/Elo | ExamAttempt 1–N AttemptTopicResult (Cascade khi xóa attempt); User 1–N TopicMastery (Cascade khi xóa user); FK về Topic đều Restrict. |
| Tương tác | Enrollment nối User–Course; LessonProgress và Comment nối User–Lesson; Notification thuộc User. Report giữ reporter bằng Restrict; AuditLog.admin dùng SetNull. |

Migration cuối: [20261122000000_finalize_seed_indexes](prisma/migrations/20261122000000_finalize_seed_indexes/migration.sql), chỉ thêm index, không sửa/xóa dữ liệu:

| Index | Truy vấn được phục vụ |
| --- | --- |
| `exam_attempts_userId_status_submittedAt_idx` (đã có) | Lịch sử theo user/status và thời gian nộp; lọc attempt trước khi join answers |
| `exam_answers_attemptId_id_idx` (mới) | Đọc answers của một attempt theo thứ tự ID cho kết quả/phân tích |
| `exam_attempts_examId_idx` (mới) | Đếm lượt làm theo đề và kiểm tra FK khi thao tác Exam |
| Unique `(attemptId, questionId)` | Lưu/tìm đáp án của một câu trong một lượt thi |
| `exam_answers_questionId_attemptId_idx`, `exam_answers_topicIdAtSubmission_attemptId_idx` | Truy vết answers theo câu/topic |
| `exam_attempts_status_deadlineAt_idx` | Tìm bài đang làm đã hết hạn |

`userId` và `status` nằm ở ExamAttempt nên không thêm cột/index trùng sang ExamAnswer. Integration xác nhận index tồn tại và planner dùng được; đây không phải benchmark tải production. Kiểm tra drift sau deploy:

```bash
npx prisma migrate status
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

Không sửa migration đã áp dụng. Các CHECK constraint dữ liệu (thang difficulty, mastery hữu hạn, số attempts không âm, prerequisite không tự trỏ) nằm trong SQL migration. Hai constraint difficulty được giữ `NOT VALID` để dữ liệu cũ không chặn deploy; audit chỉ rõ dữ liệu cần xử lý trước go-live.

## Các lệnh seed bổ trợ

`seed:bank` nhập dữ liệu assessment chuẩn (topics, ngân hàng, ba đề); `seed:topics` chỉ khởi tạo topics chuẩn và báo difficulty cũ sai thang. `seed:exam` dùng cùng importer với `seed:bank`, thay cho script đề demo cũ. Các lệnh bổ trợ cần DB đã migrate; đường dẫn bàn giao chính vẫn là `npm run seed` hoặc `npm run seed:production`.

## Kết quả rà soát ngày 22/11/2026

Đã kiểm thử cục bộ trên Windows, Node.js 24.21.0 và PostgreSQL 18.6: validate ngân hàng, typecheck, build backend/frontend, 80 unit test, 1 HTTP smoke test và cả hai bài integration đều đạt. Schema sau toàn bộ migration khớp `schema.prisma`. Seed từ thư mục gốc chạy lại thành công; backup/restore so khớp count/hash của 24 bảng public, gồm bảng lịch sử migration. CI được cấu hình chạy lại các bước tương ứng trên PostgreSQL 16.

Production mode đã được kiểm chứng bằng database tạm và tài khoản riêng. Chưa chạy trên production thật vì cấu hình hiện có chỉ trỏ tới database local; cần cung cấp cấu hình đích và các biến tài khoản để thực hiện seed/backup go-live thật.
