# API Test — Attempts & Assessments

Tài liệu test cho 2 nhóm API:

- **Placement / Practice / Attempt**: `POST /assessments/placement`, `POST /attempts`, `GET /attempts/:id`, `PUT /attempts/:id/answers/:questionId`, `POST /attempts/:id/submit`, `GET /attempts/history`.
- **Kết quả học tập**: `GET /attempts/:id/results`, `GET /attempts/:id/analysis`.

Tất cả route đã được đăng ký trong `AppModule` và chạy dưới prefix `/api`.

---

## 1. API và quyền

| Method | Endpoint | Quyền | Trả về |
|---|---|---|---|
| POST | `/assessments/placement` | Bearer JWT | `attemptId`, `totalQuestions`, `deadlineAt` |
| POST | `/attempts` | Bearer JWT | `attemptId`, `totalQuestions`, `questionIds` |
| GET | `/attempts/:id` | Chủ attempt | Trạng thái, câu hỏi, đáp án đã chọn, thời gian còn lại |
| PUT | `/attempts/:id/answers/:questionId` | Chủ attempt | Đáp án đã lưu |
| POST | `/attempts/:id/submit` | Chủ attempt | `score`, `weightedScore`, `total` |
| GET | `/attempts/history` | Bearer JWT | Mảng attempt đã nộp |
| GET | `/attempts/:id/results` | Chủ attempt, đã nộp | `summary`, `topicSummary`, `details` |
| GET | `/attempts/:id/analysis` | Chủ attempt, đã nộp | `timeAnalysis`, `topicAnalysis`, `questionAnalysis` |

User khác truy cập attempt nhận `404`. Không có token nhận `401`. Gọi results/analysis khi chưa nộp nhận `400`.

---

## 2. Hành vi chính

- **Practice**: lọc theo `topicIds`, `difficultyMin`, `difficultyMax`; random câu hỏi; trả thêm `requestedCount`, `shortfall`.
- **Placement**: chia câu theo topic (round-robin), topic thiếu câu thì bù sang topic khác.
- **Timed attempt**: server tính `deadlineAt = startedAt + timeLimit`; hết giờ thì tự nộp qua cron 15 giây hoặc khi có request tiếp theo.
- **Auto-grading**: so khớp đúng tập option, không phụ thuộc thứ tự; câu bỏ trống tính sai.
- **Weighted score**: mỗi câu đúng cộng `1 + difficulty`; công thức tập trung trong `src/attempts/scoring.ts`.
- **Result persistence**: lưu điểm theo topic vào bảng `attempt_topic_results`.
- **Result summary**: `correctCount`, `wrongCount`, `unansweredCount`, `percentage`, `weightedPercentage`.
- **Question analysis**: đáp án chọn, đáp án đúng, giải thích, `isCorrect`, `timeSpent` từng câu.
- **Time analysis**: tổng thời gian, số câu đã trả lời, thời gian trung bình.

---

## 3. Giới hạn hiện tại

- Schema chưa có model `Subject`; đang phân nhóm theo `Topic`.
- `GET /attempts/history` chưa phân trang.
- Luồng cũ `POST /exams/:id/submit` chưa có auth guard và frontend đang gửi answers dạng string thay vì mảng; không dùng luồng này nếu cần lưu attempt/history.
- Cron tự nộp chạy theo từng instance backend; chưa có distributed lock.
- Công thức `1 + difficulty` cần nhóm xác nhận là thiết kế chính thức.

---

## 4. Dữ liệu test

Dữ liệu nền và dữ liệu test đã gộp trong `prisma/seed.ts`.

```bash
cd apps/backend
npx prisma migrate deploy
npx prisma generate
npm run seed
```

Nếu môi trường chỉ dùng `db push`:

```bash
npx prisma db push
npx prisma generate
npm run seed
```

Tài khoản test:

```text
test.learner@vact.com / Test@123
```

Fixture:

| ID | Nội dung |
|---|---|
| `attempt-test-submitted` | Đã nộp, 4/6 đúng, weightedScore `5.2` |
| `attempt-test-submitted-2` | Đã nộp, 6/6 đúng, weightedScore `7.9` |
| `attempt-test-inprogress` | Đang làm, 3 câu, đã trả lời 1 câu |
| `attempt-test-expired` | Quá hạn 10 phút, dùng để test tự nộp |

`npm run seed` idempotent: xoá và tạo lại 4 attempt test, không đụng attempt khác.

---

## 5. Chạy test tự động

```bash
cd apps/backend

# Terminal 1
npm run start:dev

# Terminal 2
pwsh ./test-api/run-api-tests.ps1 -BaseUrl http://localhost:3000/api
```

Kết quả mong đợi:

```text
KẾT QUẢ: 33/33 PASS, 0 FAIL
```

Trước khi test lại, chạy `npm run seed` để reset `attempt-test-expired`.

Script dùng `curl.exe`, in lệnh curl tương ứng và kiểm tra status + JSON.

---

## 6. Curl nhanh

### Biến môi trường

```bash
BASE=http://localhost:3000/api
TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test.learner@vact.com","password":"Test@123"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).accessToken")
AUTH="Authorization: Bearer $TOKEN"
```

PowerShell:

```powershell
$BASE = 'http://localhost:3000/api'
$login = curl.exe -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"email":"test.learner@vact.com","password":"Test@123"}' | ConvertFrom-Json
$TOKEN = $login.accessToken
$AUTH = "Authorization: Bearer $TOKEN"
```

`POST` của Nest trả `201`, `GET` trả `200`.

### Placement

```bash
curl -i -X POST "$BASE/assessments/placement" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"topicIds":["topic-1","topic-2"]}'
```

### Bắt đầu attempt

```bash
curl -i -X POST "$BASE/attempts" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"examId":"exam-1","timeLimit":900}'
```

Lưu `attemptId` từ response:

```bash
ATTEMPT_ID=<attemptId>
```

### Lấy attempt

```bash
curl -i "$BASE/attempts/$ATTEMPT_ID" -H "$AUTH"
curl -i "$BASE/attempts/attempt-test-inprogress" -H "$AUTH"
```

### Lưu đáp án

```bash
OPTION_ID=$(curl -s "$BASE/questions/q-1" | jq -r '.options[] | select(.isCorrect) | .id' | head -n1)

curl -i -X PUT "$BASE/attempts/$ATTEMPT_ID/answers/q-1" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"selectedOptionIds\":[\"$OPTION_ID\"],\"timeSpent\":12}"
```

PowerShell lấy `OPTION_ID`:

```powershell
$OPTION_ID = (curl.exe -s "$BASE/questions/q-1" | ConvertFrom-Json).options |
  Where-Object isCorrect | Select-Object -First 1 -ExpandProperty id
```

Lỗi cần test:

```bash
# Câu không thuộc attempt -> 404
curl -i -X PUT "$BASE/attempts/$ATTEMPT_ID/answers/q-999" -H "$AUTH" \
  -H "Content-Type: application/json" -d '{"selectedOptionIds":[],"timeSpent":1}'

# Option không thuộc câu -> 400
curl -i -X PUT "$BASE/attempts/$ATTEMPT_ID/answers/q-1" -H "$AUTH" \
  -H "Content-Type: application/json" -d '{"selectedOptionIds":["khong-ton-tai"],"timeSpent":1}'
```

### Nộp bài

```bash
curl -i -X POST "$BASE/attempts/$ATTEMPT_ID/submit" -H "$AUTH"
```

Nộp lần 2 phải trả `400`.

### Lịch sử

```bash
curl -i "$BASE/attempts/history" -H "$AUTH"
curl -i "$BASE/attempts/history"                  # 401 khi không token
```

### Kết quả

```bash
curl -i "$BASE/attempts/$ATTEMPT_ID/results" -H "$AUTH"
curl -i "$BASE/attempts/attempt-test-inprogress/results" -H "$AUTH"  # 400
```

Response có `summary`, `topicSummary`, `details`.

### Phân tích

```bash
curl -i "$BASE/attempts/$ATTEMPT_ID/analysis" -H "$AUTH"
```

Response có `timeAnalysis`, `topicAnalysis`, `questionAnalysis`.

### Hết giờ

```bash
curl -i "$BASE/attempts/attempt-test-expired" -H "$AUTH"
curl -i "$BASE/attempts/attempt-test-expired/results" -H "$AUTH"
```

Attempt phải chuyển `SUBMITTED`, `remainingSeconds = 0`.

### Quyền sở hữu

```bash
TOKEN2=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"learner@vact.com","password":"learner123"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).accessToken")

curl -i "$BASE/attempts/attempt-test-submitted" -H "Authorization: Bearer $TOKEN2"
# Kỳ vọng: 404
```

---

## 7. Script test kiểm tra gì?

- Health, login đúng/sai.
- Exams/questions public.
- Placement + lưu đáp án.
- Tạo attempt từ exam, lưu đáp án đúng/sai/multi-select.
- Chấm điểm, câu bỏ trống, weighted score.
- Results summary, topic summary, explanation.
- Analysis theo topic và từng câu.
- History, quyền sở hữu, lỗi 400/401/404.
- Tự nộp khi quá hạn.
- Cleanup attempt placement còn dang dở.

---

## 8. File chính

| File | Vai trò |
|---|---|
| `src/attempts/attempts.service.ts` | Sinh đề, chấm điểm, deadline, lưu topic results, results/analysis |
| `src/attempts/attempts.controller.ts` | Routes `/attempts` |
| `src/attempts/attempts-timeout.service.ts` | Cron tự nộp |
| `src/attempts/scoring.ts` | Công thức điểm, so khớp đáp án |
| `src/attempts/dto/*` | Validate request |
| `src/assessments/*` | Placement API |
| `src/exams/exams.service.ts` | Dùng scoring chung cho luồng exam |
| `prisma/schema.prisma` | `deadlineAt`, `AttemptTopicResult` |
| `prisma/migrations/20261024130148_add_attempt_deadline_and_topic_results` | Migration tương ứng |
| `prisma/seed.ts` | Dữ liệu nền + test |
| `package.json` | Script `seed` |
| `test-api/run-api-tests.ps1` | Test tự động |

---

## 9. Lưu ý

- Backend dùng prefix `/api`.
- Cần `DATABASE_URL`, `JWT_SECRET` trong `.env`.
- Port mặc định `3000`; nếu khác, truyền `-BaseUrl http://localhost:3001/api`.
- Không trộn `migrate deploy` và `db push` trên cùng một database.
- Trước khi test lại: `npm run seed`.
