import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { COURSES_DATA } from '../../data/courseData';
import { BackButton } from '../../components/BackButton';

export const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? COURSES_DATA[courseId] : undefined;

  const allLessons = useMemo(
    () => (course ? course.chapters.flatMap((c) => c.lessons) : []),
    [course],
  );

  const [activeLessonId, setActiveLessonId] = useState<string>(
    allLessons[0]?.id ?? '',
  );
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  if (!course) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-600 font-semibold text-lg">
          Không tìm thấy khóa học này.
        </p>
        <BackButton to="/" label="Về trang chủ" />
      </div>
    );
  }

  const currentLesson =
    allLessons.find((l) => l.id === activeLessonId) ?? allLessons[0];
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson?.id);
  const progress = allLessons.length
    ? Math.round((completedIds.length / allLessons.length) * 100)
    : 0;

  const toggleComplete = (id: string) => {
    setCompletedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <BackButton to="/" label="Về trang chủ" />

        {/* Header khóa học theo style HomePage */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
              {course.badge}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900 mb-2">
              {course.title}
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              {course.description}
            </p>
          </div>

          <div className="w-full md:w-56 bg-amber-50/70 border border-amber-200 rounded-xl p-4">
            <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
              <span>Tiến độ học</span>
              <span className="text-amber-600">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Đã xong {completedIds.length}/{allLessons.length} bài học
            </p>
          </div>
        </div>

        {/* Nội dung 2 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: Nội dung bài học */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-blue-900">
                  {currentLesson?.title}
                </h2>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full shrink-0">
                  ⏱ {currentLesson?.duration}
                </span>
              </div>

              <div className="text-gray-700 leading-relaxed space-y-4 mb-8">
                <p>{currentLesson?.content}</p>
              </div>

              {currentLesson?.pdfUrl && (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-4 mb-8">
                  <div>
                    <p className="text-sm font-bold text-blue-900">
                      Tài liệu PDF đính kèm
                    </p>
                    <p className="text-xs text-gray-500">
                      Tải về để xem công thức và bài tập tự luyện
                    </p>
                  </div>
                  <a
                    href={currentLesson.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white border border-blue-200 text-blue-900 text-sm font-bold rounded-xl hover:bg-blue-50 transition"
                  >
                    Mở PDF
                  </a>
                </div>
              )}
            </div>

            {/* Thanh điều hướng bài học */}
            <div className="pt-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => currentLesson && toggleComplete(currentLesson.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                  completedIds.includes(currentLesson?.id ?? '')
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {completedIds.includes(currentLesson?.id ?? '')
                  ? '✓ Đã hoàn thành'
                  : 'Đánh dấu hoàn thành'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex <= 0}
                  onClick={() =>
                    setActiveLessonId(allLessons[currentIndex - 1].id)
                  }
                  className="px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Bài trước
                </button>
                <button
                  type="button"
                  disabled={currentIndex >= allLessons.length - 1}
                  onClick={() =>
                    setActiveLessonId(allLessons[currentIndex + 1].id)
                  }
                  className="px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 transition"
                >
                  Bài tiếp theo
                </button>
              </div>
            </div>
          </div>

          {/* Cột phải: Mục lục khóa học */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 h-fit space-y-5">
            <h3 className="text-base font-extrabold text-blue-900 border-b border-gray-100 pb-3">
              Nội dung khóa học
            </h3>

            <div className="space-y-4">
              {course.chapters.map((chapter) => (
                <div key={chapter.id}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    {chapter.title}
                  </p>
                  <div className="space-y-1.5">
                    {chapter.lessons.map((lesson) => {
                      const isActive = lesson.id === currentLesson?.id;
                      const isDone = completedIds.includes(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setActiveLessonId(lesson.id)}
                          className={`w-full text-left p-3 rounded-xl text-sm transition flex items-start justify-between gap-2 ${
                            isActive
                              ? 'bg-amber-50 border border-amber-300 text-blue-900 font-bold'
                              : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                          }`}
                        >
                          <span>{lesson.title}</span>
                          {isDone && (
                            <span className="text-green-600 font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <Link
                to="/exams"
                className="block w-full text-center py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-sm transition"
              >
                Luyện đề V-ACT ngay
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};