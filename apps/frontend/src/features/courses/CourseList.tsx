import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { BackButton } from '../../components/BackButton';

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: string;
  lessonsCount: number;
  instructor?: {
    id: string;
    fullName: string | null;
    email: string;
  };
  _count?: {
    chapters: number;
  };
}

export const CourseList = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // GET /courses trả về dạng phân trang: { items, total, page, limit, totalPages }
        const response = await api.get('/courses');
        const list = Array.isArray(response.data)
          ? response.data
          : (response.data?.items ?? []);
        setCourses(list);
      } catch (err) {
        console.error('Lỗi khi tải danh sách khóa học:', err);
        setError('Không thể tải danh sách khóa học. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500 font-semibold">Đang tải danh sách khóa học...</p>
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
            Danh sách Khóa học Luyện thi V-ACT
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Hệ thống ôn tập toàn diện theo cấu trúc đề thi đánh giá năng lực mới nhất.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/exams"
              className="text-sm font-bold text-amber-600 hover:text-amber-500 underline"
            >
              Vào phòng thi thử
            </Link>
            <Link
              to="/history"
              className="text-sm font-bold text-amber-600 hover:text-amber-500 underline"
            >
              Lịch sử làm bài
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between"
            >
              <div className="p-6">
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider mb-4">
                  Chuẩn cấu trúc ĐGNL
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug">
                  {course.title}
                </h3>
                <p className="text-gray-600 text-sm line-clamp-3">
                  {course.description || 'Chưa có mô tả cho khóa học này.'}
                </p>
                {course.instructor && (
                  <p className="mt-3 text-xs font-semibold text-gray-500">
                    Giảng viên: {course.instructor.fullName || course.instructor.email}
                  </p>
                )}
              </div>

              <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">
                  {course._count?.chapters ?? 0} chương • {course.lessonsCount ?? 0} bài học
                </span>

                <Link
                  to={`/courses/${course.id}`}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm text-sm"
                >
                  VÀO HỌC
                </Link>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Hiện tại chưa có khóa học nào trên hệ thống.</p>
          </div>
        )}
      </div>
    </div>
  );
};
