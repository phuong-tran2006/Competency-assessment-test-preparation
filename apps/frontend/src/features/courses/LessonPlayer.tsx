import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseService } from '../../services/course.service';
import type { Course, Lesson } from '../../types';

export const LessonPlayer = () => {
  const { courseId, lessonId } = useParams<{ courseId: string, lessonId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        // Lấy thông tin khóa học để hiển thị danh sách Sidebar
        const courseData = await courseService.getCourseById(courseId);
        setCourse(courseData);

        // Lấy chi tiết bài học hiện tại, hoặc mặc định bài đầu tiên nếu chưa chọn
        if (lessonId && lessonId !== 'default') {
           const lessonData = await courseService.getLessonDetails(courseId, lessonId);
           setCurrentLesson(lessonData);
        } else if (courseData.lessons && courseData.lessons.length > 0) {
           setCurrentLesson(courseData.lessons[0]);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu bài học:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId, lessonId]);

  if (loading) return <div className="p-10 text-center font-medium text-gray-500">Đang tải nội dung bài học...</div>;
  if (!course || !currentLesson) return <div className="p-10 text-center text-red-500 font-medium">Không tìm thấy dữ liệu bài học!</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Khu vực Video và Nội dung chính */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="bg-black w-full aspect-video rounded-xl shadow-lg flex items-center justify-center text-white mb-6">
          <p className="text-xl opacity-70">Khu vực phát Video: {currentLesson.title}</p>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{currentLesson.title}</h1>
        <p className="text-gray-600 mt-2 font-medium">Thời lượng: {currentLesson.duration}</p>
        <div className="mt-8 prose max-w-none text-gray-700 bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-bold border-b pb-2 mb-4">Tài liệu đính kèm</h3>
          <p>{currentLesson.content || 'Giảng viên chưa cập nhật tài liệu cho bài học này.'}</p>
        </div>
      </div>

      {/* Sidebar Danh sách bài giảng bên phải */}
      <div className="w-96 bg-white border-l shadow-sm flex flex-col">
        <div className="p-5 border-b bg-gray-50">
          <h2 className="font-bold text-lg text-gray-800 line-clamp-1">{course.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{course.lessonsCount} bài học</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {course.lessons?.map((lesson, index) => (
            <Link
              key={lesson.id}
              to={`/courses/${courseId}/lessons/${lesson.id}`}
              className={`block p-4 rounded-lg border transition-all ${
                lesson.id === currentLesson.id
                  ? 'bg-blue-50 border-blue-300 shadow-sm'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 border-gray-300">
                  {lesson.isCompleted && <span className="text-[10px] text-green-500 font-bold">✓</span>}
                </div>
                <div>
                  <h3 className={`text-sm font-medium ${lesson.id === currentLesson.id ? 'text-blue-700' : 'text-gray-700'}`}>
                    Bài {index + 1}: {lesson.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{lesson.duration}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};