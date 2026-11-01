// components/ExamCard.tsx
import { Link } from "react-router-dom"; // Dùng react-router-dom nếu bạn dùng React thuần (import { Link } from 'react-router-dom')

interface Exam {
  id: string;
  title: string;
  description: string;
  questionCount: number;
}

export default function ExamCard({ exam }: { exam: Exam }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow text-left">
      <div className="mb-4">
        <span className="bg-yellow-100 text-yellow-700 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase">
          Chuẩn cấu trúc ĐGNL
        </span>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
        {exam.title}
      </h3>
      
      <p className="text-gray-600 text-sm mb-8 flex-grow line-clamp-3">
        {exam.description}
      </p>
      
      <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-50">
        <span className="text-sm text-gray-500 font-medium">{exam.questionCount} câu hỏi</span>
        
        {/* Nối vào trang chi tiết hoặc trang thi của bộ đề */}
        <Link to={`/practice/${exam.id}`}>
          <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg transition-colors text-sm">
            VÀO HỌC
          </button>
        </Link>
      </div>
    </div>
  );
}