import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./features/auth/Login";
import { Register } from "./features/auth/Register";
import { CourseList } from "./features/courses/CourseList";
import { QuizPage } from "./features/quiz/QuizPage";
import { CreateExamPage } from "./features/admin/CreateExamPage";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { HomePage } from "./features/home/HomePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/courses" element={<CourseList />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/create-exam" element={<CreateExamPage />} />
        <Route path="/practice/:examId" element={<QuizPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
