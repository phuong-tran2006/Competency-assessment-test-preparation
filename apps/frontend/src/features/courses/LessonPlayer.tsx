import { Link, useParams } from 'react-router-dom';
import { BackButton } from '../../components/BackButton';

export const LessonPlayer = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Khu vực Video và Nội dung chính bên trái */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="mb-4">
          <BackButton to="/courses" label="Quay lại danh sách khóa học" variant="ghost" />
        </div>

        <div className="bg-gray-900 w-full aspect-video rounded-2xl shadow-lg flex items-center justify-center text-white mb-6">
          <div className="text-center p-6">
            <div className="text-5xl mb-3">▶️</div>
            <p className="text-lg font-medium text-gray-200">Trình phát bài giảng V-ACT</p>
            <p className="text-sm text-gray-400 mt-1">Đang phát bài học ID: {lessonId || 'default'}</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800">Bài học luyện thi V-ACT (Khóa: {courseId})</h1>
        <p className="text-gray-600 mt-2 font-medium">Thời lượng: 15:00</p>
        
        <div className="mt-6 prose max-w-none text-gray-700 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 text-gray-800">Tài liệu đính kèm & Hướng dẫn</h3>
          <p className="leading-relaxed">Chào mừng bạn đến với nội dung học tập trực tuyến. Hệ thống đang kết nối dữ liệu bài giảng từ máy chủ cơ sở dữ liệu V-ACT.</p>
        </div>
      </div>

      {/* Sidebar Danh sách bài giảng bên phải */}
      <div className="w-96 bg-white border-l border-gray-200 shadow-sm flex flex-col">
        <div className="p-5 border-b bg-gray-50">
          <h2 className="font-bold text-lg text-gray-800">Nội dung khóa học</h2>
          <p className="text-sm text-gray-500 mt-1">3 bài học</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider px-2">
              Chương 1: Kiến thức trọng tâm
            </h4>
            
            <Link
              to={`/courses/${courseId}/lessons/lesson-1`}
              className="block p-3.5 rounded-xl border border-blue-300 bg-blue-50 shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-blue-500 bg-blue-500 text-white text-[9px] font-bold">✓</div>
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 leading-snug">
                    Bài 1: Tổng quan về kỳ thi V-ACT
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">15:00</p>
                </div>
              </div>
            </Link>

            <Link
              to={`/courses/${courseId}/lessons/lesson-2`}
              className="block p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-gray-300"></div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 leading-snug">
                    Bài 2: Chiến lược làm bài phần Toán
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">20:00</p>
                </div>
              </div>
            </Link>

            <Link
              to={`/courses/${courseId}/lessons/lesson-3`}
              className="block p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 border-gray-300"></div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 leading-snug">
                    Bài 3: Luyện tập đề thi mẫu
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">30:00</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};