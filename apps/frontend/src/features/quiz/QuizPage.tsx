import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuizStore } from '../../store/quizStore';
import { quizService } from '../../services/quiz.service';
import { attemptService } from '../../services/attempt.service';
import { QuizEngine } from './QuizEngine';
import { BackButton } from '../../components/BackButton';
import { toast } from '../../store/uiStore';

/**
 * Chuẩn hóa câu hỏi từ BE về shape FE đang dùng.
 * Hỗ trợ cả `/exams/:id/questions` (có `options[].content`)
 * và `/attempts` (`questions[].options[].content`, không trả isCorrect).
 * BE không bao giờ trả `isCorrect` ở các endpoint này nên mọi kiểm tra
 * đáp án ở client chỉ mang tính hiển thị lại (review), kết quả chuẩn
 * lấy từ GET /attempts/:id/results.
 */
function mapQuestions(data: any[]) {
  return data.map((q: any) => ({
    id: q.id ?? q.questionId,
    content: q.content,
    options: (q.options ?? []).map((opt: any, index: number) => ({
      id: opt.id !== undefined ? String(opt.id) : String(index),
      text: opt.text || opt.content || String(opt),
      isCorrect: opt.isCorrect === true,
    })),
    explanation: q.explanation || '',
    topic: q.topic?.name ?? q.topic ?? '',
  }));
}

// --- MÀN HÌNH 1: GIỚI THIỆU & CHỌN BẮT ĐẦU ĐỀ THI ---
// Dùng metadata đề thay vì preload toàn bộ câu hỏi (tránh lộ đáp án,
// tránh tải nặng khi đề lớn).
const QuizIntro = ({
  examMeta,
  onStart,
  starting,
  startError,
}: {
  examMeta: { title: string; questionCount: number } | null;
  onStart: () => void;
  starting: boolean;
  startError: string;
}) => {
  const questionCount = examMeta?.questionCount ?? 0;

  return (
    <div className="max-w-4xl mx-auto">
      <BackButton to="/exams" label="Chọn đề khác" />

      <div className="mt-6 p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900 mb-3">
            {examMeta?.title ?? 'Bộ đề Đánh Giá Năng Lực V-ACT'}
          </h1>
          <p className="text-gray-600 leading-relaxed text-sm md:text-base">
            Đề ôn luyện được biên soạn theo định hướng bài thi Đánh giá năng lực, giúp học sinh làm quen với cấu trúc đề và áp lực thời gian.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center min-w-[200px]">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">V-ACT 2026</span>
          <span className="text-lg font-black text-gray-800">Chuẩn cấu trúc ĐHQG</span>
        </div>
      </div>

      <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 text-center max-w-xl mx-auto shadow-sm">
        <p className="text-gray-600 text-sm mb-4">
          Số câu: <strong className="text-gray-800">{questionCount > 0 ? `${questionCount} câu` : 'Đang tải...'}</strong> &nbsp;|&nbsp; Thời gian làm bài được tính từ lúc bấm bắt đầu
        </p>
        {startError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg font-medium">
            {startError}
          </div>
        )}
        <button
          onClick={onStart}
          disabled={starting}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-extrabold rounded-xl shadow-md transition duration-200 uppercase tracking-wider"
        >
          {starting ? 'ĐANG TẠO LƯỢT THI...' : 'BẮT ĐẦU LÀM BÀI'}
        </button>
      </div>
      </div>
    </div>
  );
};

// --- MÀN HÌNH 3: KẾT QUẢ ---
// Điểm chi tiết hiển thị ở trang /results/:attemptId (ResultPage).
// Màn này chỉ là bước chuyển tiếp khi người dùng quay lại từ trang khác.
const QuizResult = () => {
  const { resultData, resetQuiz, attemptId } = useQuizStore();

  return (
    <div className="max-w-xl mx-auto mt-20 p-8 bg-white rounded-2xl shadow-sm border text-center font-sans">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">✓</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Đã Nộp Bài Thành Công!</h1>
      <p className="text-gray-600 mb-6">Kết quả của bạn đã được ghi nhận vào hệ thống.</p>

      {resultData?.summary && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600 font-medium">Số câu đúng:</span>
            <span className="font-bold text-gray-800">
              {resultData.score} / {resultData.total}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600 font-medium">Điểm có trọng số:</span>
            <span className="font-bold text-gray-800">
              {resultData.weightedScore} / {resultData.summary.maxWeightedScore}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Tỷ lệ đạt được:</span>
            <span className="font-bold text-amber-600">
              {resultData.summary.percentage}%
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        {attemptId && (
          <Link
            to={`/results/${attemptId}`}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow transition uppercase tracking-wider"
          >
            Xem chi tiết kết quả
          </Link>
        )}
        <button
          onClick={resetQuiz}
          className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow transition uppercase tracking-wider"
        >
          Làm lại từ đầu
        </button>
      </div>
    </div>
  );
};

// --- COMPONENT TỔNG QUẢN LÝ ---
export const QuizPage = () => {
  const { currentStep, setQuestions, setStep, setAttemptId, setTimeLeft } =
    useQuizStore();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [examMeta, setExamMeta] = useState<{ title: string; questionCount: number } | null>(null);
  const { examId } = useParams();

  // Chỉ tải metadata đề cho màn giới thiệu — nội dung câu hỏi thật
  // chỉ tải sau khi POST /attempts tạo lượt làm bài.
  useEffect(() => {
    if (!examId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    quizService
      .getExamMeta(examId)
      .then(setExamMeta)
      .catch((err) => {
        console.error('Lỗi tải đề:', err);
        toast.error(
          'Không tải được đề thi',
          'Vui lòng kiểm tra kết nối và thử lại.',
        );
      })
      .finally(() => setLoading(false));
  }, [examId]);

  // Tạo ExamAttempt thật trên backend rồi mới vào phòng thi
  const handleStart = async () => {
    if (!examId) return;

    setStarting(true);
    setStartError('');
    try {
      // POST /attempts trả { attemptId, questionIds, timeLimit, ... }
      const created = await attemptService.start(examId);
      const newAttemptId = created.attemptId ?? created.id;
      setAttemptId(newAttemptId);

      // GET /attempts/:id trả đầy đủ nội dung câu hỏi kèm option id thật
      const detail = await attemptService.getAttempt(newAttemptId);
      if (Array.isArray(detail.questions) && detail.questions.length) {
        setQuestions(mapQuestions(detail.questions));
      }

      setTimeLeft(
        detail.remainingSeconds ?? created.timeLimit ?? 3600,
      );
      setStep('playing');
      toast.info('Bài thi đã bắt đầu', 'Chúc bạn làm bài tốt. Hết giờ hệ thống sẽ tự nộp.');
    } catch (err: any) {
      console.error('Lỗi tạo lượt làm bài:', err);
      const message =
        err.response?.data?.message ||
        'Không tạo được lượt làm bài. Vui lòng đăng nhập và thử lại.';
      setStartError(message);
      // Lỗi ở đây đã hiển thị ngay trên màn hình, không cần toast
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600 font-medium text-lg flex items-center gap-3">
          <span className="animate-spin w-5 h-5 border-4 border-amber-500 border-t-transparent rounded-full block"></span>
          Đang tải dữ liệu đề thi...
        </p>
      </div>
    );
  }

  if (!examId) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center gap-5 px-4">
        <p className="text-red-500 font-medium text-center">
          Không tìm thấy mã đề thi. Vui lòng quay lại trang danh sách.
        </p>
        <BackButton to="/exams" label="Về danh sách đề thi" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-6 px-4">
      {currentStep === 'intro' && (
        <QuizIntro
          examMeta={examMeta}
          onStart={handleStart}
          starting={starting}
          startError={startError}
        />
      )}
      {(currentStep === 'playing' || currentStep === 'review') && <QuizEngine />}
      {currentStep === 'result' && <QuizResult />}
    </div>
  );
};
