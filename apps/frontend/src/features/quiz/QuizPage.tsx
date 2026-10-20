import { useEffect, useState } from 'react';
import { useQuizStore } from '../../store/quizStore';
import { quizService } from '../../services/quiz.service';
import { QuizEngine } from './QuizEngine';

// --- MÀN HÌNH 1: GIỚI THIỆU & CHỌN BẮT ĐẦU ĐỀ THI (Giống ảnh mẫu 2 & 3) ---
const QuizIntro = () => {
  const setStep = useQuizStore((state) => state.setStep);

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
      {/* Tiêu đề bộ đề */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900 mb-3">
            Bộ đề Đánh Giá Năng Lực V-ACT ĐHQG TP.HCM mới nhất 2026
          </h1>
          <p className="text-gray-600 leading-relaxed text-sm md:text-base">
            Đề Đánh Giá Năng Lực V-ACT ĐHQG TP.HCM mới nhất 2026 là bộ đề ôn luyện được biên soạn theo định hướng bài thi Đánh giá năng lực của ĐHQG-HCM, giúp học sinh làm quen với cấu trúc đề và áp lực thời gian.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center min-w-[200px]">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">V-ACT 2026</span>
          <span className="text-lg font-black text-gray-800">Chuẩn cấu trúc ĐHQG</span>
        </div>
      </div>

      {/* Chi tiết đề thi mẫu */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Đề thi mẫu đánh giá năng lực ĐHQG - TP.HCM 2026 - Đề 1</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">Môn chính</span>
            <h3 className="font-bold text-gray-800 mt-2">Toán</h3>
            <p className="text-xs text-gray-500 mt-1">30 câu • 40 phút</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">Môn chính</span>
            <h3 className="font-bold text-gray-800 mt-2">Tiếng Việt</h3>
            <p className="text-xs text-gray-500 mt-1">30 câu • 40 phút</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">Môn chính</span>
            <h3 className="font-bold text-gray-800 mt-2">Tiếng Anh</h3>
            <p className="text-xs text-gray-500 mt-1">30 câu • 40 phút</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Môn phụ</span>
            <h3 className="font-bold text-gray-800 mt-2">Logic, phân tích dữ liệu</h3>
            <p className="text-xs text-gray-500 mt-1">12 câu • 40 phút</p>
          </div>
        </div>
      </div>

      {/* Khung Bắt đầu làm bài (Giống ảnh 3) */}
      <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 text-center max-w-xl mx-auto shadow-sm">
        <h3 className="text-xl font-bold text-amber-600 mb-2">ĐỀ LUYỆN THI ĐGNL 2026 V-ACT – ĐỀ 1</h3>
        <p className="text-gray-600 text-sm mb-4">
          Số câu: <strong className="text-gray-800">6 câu</strong> &nbsp;|&nbsp; Thời gian làm bài: <strong className="text-gray-800">60 phút</strong>
        </p>
        <button
          onClick={() => setStep('playing')}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-md transition duration-200 uppercase tracking-wider"
        >
          BẮT ĐẦU LÀM BÀI
        </button>
      </div>
    </div>
  );
};

// --- MÀN HÌNH 3: KẾT QUẢ ---
const QuizResult = () => {
  const resetQuiz = useQuizStore((state) => state.resetQuiz);
  return (
    <div className="max-w-xl mx-auto mt-20 p-8 bg-white rounded-2xl shadow-sm border text-center">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">✓</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Đã Nộp Bài Thành Công!</h1>
      <p className="text-gray-600 mb-6">Kết quả của bạn đã được ghi nhận vào hệ thống.</p>
      <button
        onClick={resetQuiz}
        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow hover:bg-blue-700 transition"
      >
        Làm lại từ đầu
      </button>
    </div>
  );
};

// --- COMPONENT TỔNG QUẢN LÝ ---
export const QuizPage = () => {
  const { currentStep, setQuestions } = useQuizStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tự động tải trước dữ liệu từ Backend khi vào trang
    quizService.getExamQuestions('exam-1')
      .then((data) => {
        const formatted = data.map((q: any) => ({
          id: q.id,
          examId: 'exam-1',
          content: q.content,
          options: q.options.map((opt: any) => ({
            id: opt.id,
            text: opt.text || opt.content,
            isCorrect: opt.isCorrect,
          })),
        }));
        setQuestions(formatted);
      })
      .catch((err) => console.error("Lỗi tải đề:", err))
      .finally(() => setLoading(false));
  }, [setQuestions]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600 font-medium">Đang tải dữ liệu hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-6 px-4">
      {currentStep === 'intro' && <QuizIntro />}
      {currentStep === 'playing' && <QuizEngine />}
      {currentStep === 'result' && <QuizResult />}
    </div>
  );
};