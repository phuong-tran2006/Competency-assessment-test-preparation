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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Nhóm trang Public (Ai cũng có thể truy cập) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CourseList />} />

        {/* 2. Nhóm trang dành cho HỌC VIÊN (STUDENT) */}
        <Route element={<ProtectedRoute allowedRoles={["STUDENT"]} />}>
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/practice/:examId" element={<QuizPage />} />
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

        {/* Catch-all: Nếu nhập đường dẫn linh tinh thì đá về trang Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
