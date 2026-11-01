import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./features/auth/Login";
import { Register } from "./features/auth/Register";
import { CourseList } from "./features/courses/CourseList";
import { LessonPlayer } from "./features/courses/LessonPlayer";
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
        <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />

        {/* 2. Nhóm trang Học tập & Làm bài thi (Mở cho cả STUDENT, INSTRUCTOR, ADMIN) */}
        <Route element={<ProtectedRoute allowedRoles={["STUDENT", "INSTRUCTOR", "ADMIN"]} />}>
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/practice/:examId" element={<QuizPage />} />
        </Route>

        {/* 3. Nhóm trang dành cho GIẢNG VIÊN (INSTRUCTOR & ADMIN) */}
        <Route element={<ProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN"]} />}>
          <Route path="/instructor" element={<InstructorDashboard />} />
        </Route>

        {/* 4. Nhóm trang dành cho QUẢN TRỊ VIÊN (ADMIN) */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/create-exam" element={<CreateExamPage />} />
        </Route>

        {/* Catch-all: Nếu nhập đường dẫn lạ thì về trang chủ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;