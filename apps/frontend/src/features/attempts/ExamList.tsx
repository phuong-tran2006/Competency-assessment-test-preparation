import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { BackButton } from '../../components/BackButton';
import { useAuthStore } from '../../store/authStore';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  _count?: { questions: number };
}

export const ExamList = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    api
      .get('/exams')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
        setExams(list);
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách đề thi:', err);
        setError('Không thể tải danh sách đề thi. Vui lòng thử lại sau.');
      })
      .finally(() => setLoading(false));
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gray-50 px-4">
        <p className="text-lg text-red-500 font-semibold text-center">{error}</p>
        <BackButton to="/" label="Về trang chủ" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <BackButton to="/" label="Về trang chủ" />
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Phòng thi thử V-ACT
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Chọn một bộ đề để bắt đầu. Hệ thống tự động chấm điểm và phân tích theo chủ đề.
          </p>
          {isAuthenticated ? (
            <Link
              to="/history"
              className="mt-6 inline-block text-sm font-bold text-amber-600 hover:text-amber-500 underline"
            >
              Xem lịch sử làm bài
            </Link>
          ) : (
            <p className="mt-6 text-sm text-gray-500">
              <Link to="/login" className="font-bold text-amber-600 hover:text-amber-500 underline">
                Đăng nhập
              </Link>{' '}
              để bắt đầu làm bài và lưu lịch sử.
            </p>
          )}
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
                  {exam._count?.questions ?? 0} câu hỏi
                </span>
                {isAuthenticated ? (
                  <Link
                    to={`/practice/${exam.id}`}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm text-sm"
                  >
                    VÀO THI
                  </Link>
                ) : (
                  <Link
                    to={`/login?next=/practice/${exam.id}`}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm text-sm"
                    title="Đăng nhập để vào thi"
                  >
                    ĐĂNG NHẬP ĐỂ THI
                  </Link>
                )}
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
