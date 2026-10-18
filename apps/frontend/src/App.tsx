import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QuizEngine } from './features/quiz/QuizEngine';

const Home = () => (
  <div className="p-10 text-center">
    <h1 className="text-3xl font-bold mb-6 text-blue-700">Nền Tảng Luyện Thi ĐGNL</h1>
    <div className="space-x-4">
      <Link to="/courses" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Khóa học</Link>
      <Link to="/practice/exam-1" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Vào thi thử</Link>
    </div>
  </div>
);

const CourseList = () => <div className="p-10 text-xl font-semibold">Trang Danh sách khóa học</div>;
const LessonPlayer = () => <div className="p-10 text-xl font-semibold">Giao diện bài học (Video/Tài liệu)</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<CourseList />} />
        <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
        
        {/* Đã thay đổi dòng này để render QuizEngine thật */}
        <Route path="/practice/:examId" element={<QuizEngine />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;