import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { Link, useParams } from 'react-router-dom';
import { BackButton } from '../../components/BackButton';

export const LessonPlayer = () => {
  const { courseId = 'course-1', lessonId = 'lesson-1' } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  const [course, setCourse] = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourseAndLesson = async () => {
      setLoading(true);
      try {
        const [courseRes, lessonRes] = await Promise.all([
          api.get(`/courses/${courseId}`).catch(() => null),
          api.get(`/lessons/${lessonId}`).catch(() => null),
        ]);

        if (courseRes?.data) setCourse(courseRes.data);
        if (lessonRes?.data) setCurrentLesson(lessonRes.data);
      } catch (err) {
        console.error('Lỗi tải bài học:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndLesson();
  }, [courseId, lessonId]);

  const chapters = course?.chapters || [
    {
      id: 'chapter-1',
      title: 'Chương 1: Giới hạn và liên tục',
      lessons: [
        { id: 'lesson-1', title: 'Bài 1: Khái niệm giới hạn' },
        { id: 'lesson-2', title: 'Bài 2: Các dạng giới hạn thường gặp' },
      ],
    },
    {
      id: 'chapter-2',
      title: 'Chương 2: Đạo hàm',
      lessons: [{ id: 'lesson-3', title: 'Bài 1: Định nghĩa đạo hàm' }],
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 font-sans">
      {/* Khu vực Video và Nội dung chính bên trái */}
      <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-amber-600 font-bold hover:underline flex items-center gap-1 text-sm"
          >
            &larr; Quay lại Trang chủ Khóa học
          </Link>
          <Link
            to="/courses"
            className="text-blue-700 font-bold hover:underline text-sm"
          >
            Chuyển sang Luyện đề thi &rarr;
          </Link>
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="mb-4">
          <BackButton to="/courses" label="Quay lại danh sách khóa học" variant="ghost" />
        </div>

        <div className="bg-slate-900 w-full aspect-video max-h-[420px] rounded-2xl shadow-lg flex items-center justify-center text-white mb-6">
          <div className="text-center p-6">
            <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-4 text-2xl shadow-md">
              ▶
            </div>
            <p className="text-xl font-bold text-white">
              {currentLesson?.title || `Bài giảng V-ACT (${lessonId})`}
            </p>
            <p className="text-sm text-slate-300 mt-2">
              Khóa học: {course?.title || 'Toán nền tảng & Tư duy ĐGNL V-ACT'}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Đang tải nội dung bài giảng...</p>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {currentLesson?.title || 'Bài 1: Khái niệm giới hạn'}
            </h1>
            <p className="text-amber-600 mt-1 text-sm font-bold">
              {currentLesson?.chapter?.title || 'Chương 1: Kiến thức trọng tâm'}
            </p>

            {/* Nội dung lý thuyết */}
            <div className="mt-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold border-b pb-3 mb-4 text-blue-900">
                📖 Nội dung bài học
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {currentLesson?.content ||
                  'Giới hạn của hàm số là giá trị mà hàm số tiến tới khi biến số tiến gần đến một giá trị xác định.'}
              </p>
            </div>

            {/* Tài liệu đính kèm (Materials từ DB) */}
            <div className="mt-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold border-b pb-3 mb-4 text-blue-900">
                📎 Tài liệu học tập & Bài tập tự luyện
              </h3>
              {currentLesson?.materials && currentLesson.materials.length > 0 ? (
                <div className="space-y-3">
                  {currentLesson.materials.map((mat: any) => (
                    <div
                      key={mat.id}
                      className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex justify-between items-center"
                    >
                      <div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 mr-2">
                          {mat.type}
                        </span>
                        <span className="font-bold text-gray-800">
                          {mat.title}
                        </span>
                        {mat.content && (
                          <p className="text-sm text-gray-600 mt-2">
                            {mat.content}
                          </p>
                        )}
                      </div>
                      {mat.url && (
                        <a
                          href={mat.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm"
                        >
                          Tải PDF
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">
                  Hãy nắm vững lý thuyết trên và chuyển sang phần Bộ đề luyện tập để kiểm tra năng lực.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sidebar Danh sách Chương & Bài giảng bên phải */}
      <div className="w-full lg:w-96 bg-white border-l border-gray-200 shadow-sm flex flex-col">
        <div className="p-5 border-b bg-amber-50/50">
          <h2 className="font-extrabold text-lg text-blue-900">
            {course?.title || 'Nội dung khóa học'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Chọn bài học bên dưới để chuyển bài
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {chapters.map((chap: any) => (
            <div key={chap.id} className="space-y-2">
              <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider px-2">
                {chap.title}
              </h4>
              {chap.lessons?.map((les: any) => {
                const isActive = les.id === lessonId;
                return (
                  <Link
                    key={les.id}
                    to={`/courses/${courseId}/lessons/${les.id}`}
                    className={`block p-3.5 rounded-xl border transition-all ${
                      isActive
                        ? 'border-amber-500 bg-amber-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? 'bg-amber-500 text-white'
                            : 'border-2 border-gray-300 text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                      <span
                        className={`text-sm ${
                          isActive
                            ? 'font-bold text-amber-800'
                            : 'font-medium text-gray-700'
                        }`}
                      >
                        {les.title}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};