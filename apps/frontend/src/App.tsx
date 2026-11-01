import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./features/auth/Login";
import { Register } from "./features/auth/Register";
import { CourseList } from "./features/courses/CourseList";
import { QuizPage } from "./features/quiz/QuizPage";
import { CreateExamPage } from "./features/admin/CreateExamPage";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { HomePage } from "./features/home/HomePage";
import { UserProfile } from "./features/profile/UserProfile";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { InstructorDashboard } from "./features/instructor/InstructorDashboard";
import { ExamList } from "./features/attempts/ExamList";
import { ResultPage } from "./features/attempts/ResultPage";
import { HistoryPage } from "./features/attempts/HistoryPage";
import { Toaster } from "./components/Toaster";
import { ConfirmDialog } from "./components/ConfirmDialog";

function App() {
  return (
    <BrowserRouter>
      {/* Thông báo nổi và hộp xác nhận dùng chung cho toàn ứng dụng */}
      <Toaster />
      <ConfirmDialog />

      <Routes>
        {/* 1. Nhóm trang Public (Ai cũng có thể truy cập) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CourseList />} />
        <Route path="/exams" element={<ExamList />} />

        {/* 2. Nhóm trang dành cho HỌC VIÊN (LEARNER) */}
        <Route element={<ProtectedRoute allowedRoles={["LEARNER"]} />}>
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/practice/:examId" element={<QuizPage />} />
          <Route path="/results/:attemptId" element={<ResultPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>

        {/* 3. Nhóm trang dành cho GIẢNG VIÊN (INSTRUCTOR) */}
        <Route element={<ProtectedRoute allowedRoles={["INSTRUCTOR"]} />}>
          <Route path="/instructor" element={<InstructorDashboard />} />
          {/* Nếu sau này giảng viên có thêm trang tạo đề thi riêng, bạn đưa vào đây */}
        </Route>

        {/* 4. Nhóm trang dành cho QUẢN TRỊ VIÊN (ADMIN) */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/create-exam" element={<CreateExamPage />} />
        </Route>

        {/* Catch-all: đường dẫn lạ về trang chủ, không đá về /login
            (đá về /login khiến người đã đăng nhập tưởng bị đăng xuất) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
