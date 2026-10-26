import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api'; // Đảm bảo đường dẫn import api (hoặc axios) cấu hình đúng với project của bạn

interface Exam {
  id: string;
  title: string;
  description: string;
  _count?: {
    questions: number;
  };
}

export const CourseList = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        // Gọi API lấy danh sách đề thi thay vì danh sách khóa học
        const response = await api.get('/exams'); 
        setExams(response.data);
      } catch (err) {
        console.error('Lỗi khi tải danh sách đề thi:', err);
        setError('Không thể tải danh sách đề thi. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500 font-semibold">Đang tải danh sách đề thi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-red-500 font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Danh sách Bộ đề Luyện thi V-ACT
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Hệ thống ôn tập toàn diện với cấu trúc đề thi đánh giá năng lực mới nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {exams.map((exam) => (
            <div 
              key={exam.id} 
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between"
            >
              <div className="p-6">
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider mb-4">
                  Chuẩn cấu trúc ĐGNL
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug">
                  {exam.title}
                </h3>
                <p className="text-gray-600 text-sm line-clamp-3">
                  {exam.description || 'Chưa có mô tả cho đề thi này.'}
                </p>
              </div>
              
              <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">
                  {exam._count?.questions || 0} câu hỏi
                </span>
                
                {/* Chuyển hướng chính xác vào phòng thi với đúng mã exam.id */}
                <Link 
                  to={`/practice/${exam.id}`} 
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm text-sm"
                >
                  VÀO HỌC
                </Link>
              </div>
            </div>
          ))}
        </div>
        
        {exams.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Hiện tại chưa có đề thi nào trên hệ thống.</p>
          </div>
        )}
      </div>
    </div>
  );
};