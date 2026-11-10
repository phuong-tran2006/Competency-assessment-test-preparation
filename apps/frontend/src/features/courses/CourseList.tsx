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

interface FeaturedExam {
  id: string;
  title: string;
  description: string | null;
  _count?: { questions: number };
}

const TIME_OPTIONS = [
  { label: '15 phút', minutes: 15, questions: 10 },
  { label: '30 phút', minutes: 30, questions: 20 },
  { label: '45 phút', minutes: 45, questions: 30 },
  { label: '60 phút', minutes: 60, questions: 40 },
];

const PRACTICE_MODULES = [
  {
    id: 'bank-mixed',
    title: 'Luyện Tập Tổ Hợp Tổng Quát',
    topic: 'Tất cả chuyên đề',
    description:
      'Tổng hợp câu hỏi từ cả 4 mảng kiến thức giúp rèn luyện phản xạ và đánh giá năng lực toàn diện.',
    badge: 'Tổ hợp thích ứng',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'bank-toan',
    title: 'Chuyên Đề: Toán Học & Tư Duy Định Lượng',
    topic: 'Toán học',
    description:
      'Rèn luyện kỹ năng giải Toán ĐGNL từ cơ bản đến nâng cao (Đại số, Giải tích, Hình học, Xác suất thống kê).',
    badge: 'Toán học',
    color: 'from-blue-600 to-indigo-700',
  },
  {
    id: 'bank-tieng-viet',
    title: 'Chuyên Đề: Sử Dụng Ngôn Ngữ Tiếng Việt',
    topic: 'Tiếng Việt',
    description:
      'Luyện tập các dạng câu hỏi Từ vựng, Ngữ pháp, Biện pháp tu từ và Đọc hiểu văn bản Tiếng Việt.',
    badge: 'Tiếng Việt',
    color: 'from-emerald-600 to-teal-700',
  },
  {
    id: 'bank-tieng-anh',
    title: 'Chuyên Đề: Sử Dụng Ngôn Ngữ Tiếng Anh',
    topic: 'Tiếng Anh',
    description:
      'Ôn luyện Cấu trúc câu, Ngữ pháp, Từ vựng học thuật và Kỹ năng đọc hiểu văn bản Tiếng Anh.',
    badge: 'Tiếng Anh',
    color: 'from-purple-600 to-indigo-700',
  },
  {
    id: 'bank-logic',
    title: 'Chuyên Đề: Tư Duy Khoa Học & Phân Tích Số Liệu',
    topic: 'Logic - Suy luận',
    description:
      'Rèn luyện kỹ năng Suy luận logic, Đọc hiểu bảng biểu số liệu và Đánh giá giả thuyết khoa học.',
    badge: 'Tư duy khoa học',
    color: 'from-rose-600 to-red-700',
  },
];

export const CourseList = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<FeaturedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Cho phép học sinh chọn mốc thời gian tự luyện tập (mặc định 30 phút)
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);

  const currentOption =
    TIME_OPTIONS.find((opt) => opt.minutes === selectedMinutes) ?? TIME_OPTIONS[1];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // GET /courses trả về dạng phân trang: { items, total, page, limit, totalPages }
        // GET /exams trả về danh sách bộ đề minh họa
        const [coursesRes, examsRes] = await Promise.all([
          api.get('/courses').catch(() => null),
          api.get('/exams').catch(() => null),
        ]);
        const list = coursesRes
          ? Array.isArray(coursesRes.data)
            ? coursesRes.data
            : (coursesRes.data?.items ?? [])
          : [];
        setCourses(list);
        setExams(Array.isArray(examsRes?.data) ? examsRes.data : []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách khóa học:', err);
        setError('Không thể tải danh sách khóa học. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gray-50 px-4">
        <p className="text-lg text-red-500 font-semibold text-center">{error}</p>
        <BackButton to="/" label="Về trang chủ" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* THANH ĐIỀU HƯỚNG */}
        <div className="flex flex-wrap justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <Link
            to="/"
            className="text-sm font-bold text-amber-600 hover:underline flex items-center gap-1"
          >
            &larr; Quay về Trang chủ
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/courses/course-1/lessons/lesson-1"
              className="px-4 py-2 bg-blue-50 text-blue-800 text-xs font-bold rounded-xl hover:bg-blue-100 transition"
            >
              📖 Học Khóa Lý Thuyết
            </Link>
            <Link
              to="/profile"
              className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition shadow-sm"
            >
              📊 Xem Hồ Sơ Năng Lực Elo
            </Link>
          </div>
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

        {/* KHU VỰC 1: BỘ ĐỀ MINH HỌA CHÍNH THỨC */}
        <div className="mb-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 border-b border-gray-200 pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 block mb-1">
                ĐỀ THI TIÊU CHUẨN
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-blue-900">
                Bộ Đề Minh Họa Chính Thức ĐGNL ĐHQG-HCM
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Làm bài thi minh họa chuẩn qua các năm để đánh giá năng lực và làm quen áp lực phòng thi.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-500 py-8 text-center">Đang tải bộ đề minh họa...</p>
          ) : exams.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">Chưa có bộ đề minh họa nào.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-extrabold rounded-full uppercase">
                        Chuẩn cấu trúc ĐGNL
                      </span>
                      <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg">
                        {exam._count?.questions || 0} câu
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                      {exam.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-6">
                      {exam.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-semibold">
                      ⏱ Thời gian tiêu chuẩn
                    </span>
                    <Link
                      to={`/practice/${exam.id}`}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-5 rounded-xl transition text-xs uppercase tracking-wider shadow-sm"
                    >
                      Làm đề ngay
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KHU VỰC 2: LUYỆN TẬP THÍCH ỨNG THEO CHUYÊN ĐỀ (CÓ CHỌN MỐC THỜI GIAN) */}
        <div className="mb-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-6 border-b border-gray-200 pb-4 gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 block mb-1">
                LUYỆN TẬP CHUYÊN SÂU
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-blue-900">
                Luyện Tập Thích Ứng Theo Chuyên Đề
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Chọn mốc thời gian phù hợp với quỹ thời gian của bạn hôm nay để bắt đầu luyện tập.
              </p>
            </div>

            {/* BỘ CHỌN MỐC THỜI GIAN CHO HỌC SINH */}
            <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2 self-start lg:self-auto">
              <span className="text-xs font-bold text-gray-600 px-2">
                ⏳ Chọn thời gian:
              </span>
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => setSelectedMinutes(opt.minutes)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${
                    selectedMinutes === opt.minutes
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRACTICE_MODULES.map((mod) => (
              <div
                key={mod.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div
                    className={`bg-gradient-to-r ${mod.color} px-6 py-3 text-white flex justify-between items-center`}
                  >
                    <span className="text-xs font-extrabold uppercase tracking-wider">
                      {mod.badge}
                    </span>
                    <span className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                      ⏱ {currentOption.minutes} phút
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                      {mod.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{mod.description}</p>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-600">
                    📝 {currentOption.questions} câu hỏi • {currentOption.minutes} phút
                  </span>
                  <Link
                    to={`/practice/${mod.id}?time=${currentOption.minutes}&count=${currentOption.questions}`}
                    className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-xl transition text-xs uppercase tracking-wider shadow-sm"
                  >
                    Luyện tập ngay
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KHU VỰC 3: DANH SÁCH KHÓA HỌC */}
        <div>
          <div className="mb-6 border-b border-gray-200 pb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 block mb-1">
              KHÓA HỌC LÝ THUYẾT
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-blue-900">
              Khóa Học Nền Tảng
            </h2>
          </div>

          {loading ? (
            <p className="text-gray-500 py-8 text-center">Đang tải danh sách khóa học...</p>
          ) : courses.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">Chưa có khóa học nào.</p>
          ) : (
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
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
