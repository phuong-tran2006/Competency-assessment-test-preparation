## 1. Mẫu file `README.md` ở thư mục gốc dự án

Bạn tạo file `README.md` ngay tại thư mục gốc (`Competency-assessment-test-preparation/`) với nội dung bên dưới. Thành viên mới chỉ cần đọc file này là có thể tự dựng môi trường chạy code:

```markdown
# 🚀 Dự án Luyện thi Đánh giá năng lực (Monorepo)

Chào mừng bạn đến với nhóm phát triển! Dưới đây là hướng dẫn thiết lập môi trường làm việc trên máy cá nhân.

---

## 🛠️ Yêu cầu tiền đề (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:
- **Node.js**: phiên bản `>= 20.x`
- **Docker Desktop**: đã bật và đang chạy (`Engine running`)
- **VS Code**: Trình biên dịch khuyên dùng
- **Git**: Quản lý mã nguồn

---

## ⚙️ Hướng dẫn khởi chạy dự án (Quick Start)

### 1. Clone repository & Cài đặt Extensions
```bash
git clone https://github.com/phuong-tran2006/Competency-assessment-test-preparation
cd Competency-assessment-test-preparation

```

> **Lưu ý:** Khi mở dự án bằng VS Code, hãy nhấn **Install** khi VS Code gợi ý cài đặt các extension trong file `.vscode/extensions.json` (Prisma, Tailwind, ESLint).
---

### 2. Khởi chạy Database & Redis (Docker)

Mở Docker Desktop, sau đó chạy lệnh:

```bash
docker compose up -d

```

*Lệnh này sẽ khởi chạy PostgreSQL (Cổng 5432) và Redis (Cổng 6379) chạy ngầm.*

---

### 3. Thiết lập CSDL & Chạy Backend (NestJS)

```bash
# Di chuyển vào thư mục backend
cd apps/backend

# Cài đặt thư viện
npm install

# Khởi tạo biến môi trường (Tạo file .env từ .env.example)
cp .env.example .env

# Đồng bộ CSDL với Prisma
npx prisma db push
npx prisma generate

# Chạy Backend ở chế độ Development
npm run start:dev

```

📍 **Backend URL:** `http://localhost:3000`

---

### 4. Khởi chạy Frontend (React + Vite)

Mở một cửa sổ Terminal mới trên VS Code:

```bash
# Di chuyển vào thư mục frontend
cd apps/frontend

# Cài đặt thư viện
npm install

# Chạy Frontend
npm run dev

```

📍 **Frontend URL:** `http://localhost:5173`

---

## 🌲 Quy tắc làm việc với Git (Git Flow)

1. **Không push trực tiếp lên nhánh `main**`.
2. **Tạo nhánh mới cho từng tính năng:**
* Cú pháp: `feature/<tên-tính-năng>` hoặc `fix/<tên-lỗi>`
* Ví dụ: `feature/login-page`, `fix/prisma-connection`


3. **Quy tắc đặt tên Commit (Conventional Commits):**
* `feat: ...` (Thêm tính năng mới)
* `fix: ...` (Sửa lỗi)
* `docs: ...` (Cập nhật tài liệu)
* `refactor: ...` (Tối ưu lại code)


4. Tạo **Pull Request (PR)** trên GitHub và nhờ Lead/Member khác review trước khi merge vào `main`.

```