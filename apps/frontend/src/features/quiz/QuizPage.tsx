import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuizStore } from '../../store/quizStore';
import { attemptService } from '../../services/attempt.service';
import { QuizEngine } from './QuizEngine';
import { BackButton } from '../../components/BackButton';
import { toast } from '../../store/uiStore';

/**
 * Chuẩn hóa câu hỏi từ BE về shape FE đang dùng.
 * Hỗ trợ cả `/exams/:id/questions` (có `options[].content`)
 * và `/attempts` (`questions[].options[].content`, không trả isCorrect).
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
  }));
}

// --- MÀN HÌNH 1: GIỚI THIỆU & CHỌN BẮT ĐẦU ĐỀ THI ---
const QuizIntro = ({
  examTitle,
  questionCount,
  selectedMinutes,
  onSelectMinutes,
  onStart,
  starting,
  startError,
}: {
  examTitle: string;
  questionCount: number;
  selectedMinutes: number;
  onSelectMinutes: (m: number) => void;
  onStart: () => void;
  starting: boolean;
  startError: string;
}) => {
  const AVAILABLE_TIMES = [15, 30, 45, 60, 90, 150];

  return (
    <div className="max-w-4xl mx-auto mt-8 p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="mb-4 flex justify-between items-center">
        <Link to="/courses" className="text-sm font-bold text-amber-600 hover:underline">
          &larr; Quay lại Danh sách đề
        </Link>
        <Link to="/profile" className="text-sm font-bold text-blue-700 hover:underline">
          Xem Hồ sơ Năng lực Elo &rarr;
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900 mb-3">
            {examTitle}
          </h1>
          <p className="text-gray-600 leading-relaxed text-sm md:text-base">
            Hệ thống tự động ghi nhận kết quả từng câu hỏi và cập nhật chỉ số năng lực <b>Elo Rating</b> theo từng chuyên đề dựa trên độ khó câu hỏi.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center min-w-[200px]">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">
            V-ACT 2026
          </span>
          <span className="text-lg font-black text-gray-800">Chuẩn cấu trúc ĐHQG</span>
        </div>
      </div>

      {/* KHỐI CHO HỌC SINH TỰ CHỌN MỐC THỜI GIAN LÀM BÀI */}
      <div className="mb-8">
        <h2 className="text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-3 text-center">
          ⏳ Chọn mốc thời gian làm bài của bạn
        </h2>
        <div className="flex flex-wrap justify-center gap-2.5">
          {AVAILABLE_TIMES.map((min) => (
            <button
              key={min}
              type="button"
              onClick={() => onSelectMinutes(min)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition ${
                selectedMinutes === min
                  ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {min} phút
            </button>
          ))}
        </div>
      </div>

      <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 text-center max-w-xl mx-auto shadow-sm">
        <h3 className="text-lg font-bold text-amber-700 mb-2 uppercase">{examTitle}</h3>
        <p className="text-gray-600 text-sm mb-5">
          Số lượng câu hỏi: <strong className="text-gray-900">{questionCount} câu</strong> &nbsp;|&nbsp; Thời gian đếm ngược: <strong className="text-blue-900">{selectedMinutes} phút</strong>
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
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow transition uppercase tracking-wider text-sm"
        >
          Làm lại đề này
        </button>
      </div>
    </div>
  );
};

export const QuizPage = () => {
  const { currentStep, setQuestions, setStep, setAttemptId, setTimeLeft } =
    useQuizStore();
  const { resetQuiz } = useQuizStore();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const { examId } = useParams();
  const [searchParams] = useSearchParams();

  const timeFromUrl = Number(searchParams.get('time')) || 30;
  const [selectedMinutes, setSelectedMinutes] = useState<number>(timeFromUrl);
  const questionCount = useQuizStore((state) => state.questions.length);
  const questions = useQuizStore((state) => state.questions);

  const examTitles: Record<string, string> = {
    'vact-exam-2026': 'Đề minh họa ĐGNL ĐHQG TP.HCM năm 2026',
    'vact-exam-2025': 'Đề minh họa ĐGNL ĐHQG TP.HCM năm 2025',
    'vact-exam-2024': 'Đề minh họa ĐGNL ĐHQG TP.HCM năm 2024',
    'bank-mixed': 'Luyện Tập Tổ Hợp Tổng Quát',
    'bank-toan': 'Luyện Tập Chuyên Đề: Toán Học & Tư Duy Định Lượng',
    'bank-tieng-viet': 'Luyện Tập Chuyên Đề: Sử Dụng Ngôn Ngữ Tiếng Việt',
    'bank-tieng-anh': 'Luyện Tập Chuyên Đề: Sử Dụng Ngôn Ngữ Tiếng Anh',
    'bank-logic': 'Luyện Tập Chuyên Đề: Tư Duy Khoa Học & Phân Tích Số Liệu',
  };
  const currentExamTitle =
    (examId && examTitles[examId]) || `Bộ đề luyện thi V-ACT (${examId})`;

  // Khôi phục phiên làm bài còn dở sau F5: nếu store đang ở màn playing/review
  // nhưng danh sách câu hỏi trong memory trống (localStorage cũ chưa lưu questions),
  // thì nạp lại từ attemptId đã persist; không khôi phục được thì về màn intro.
  useEffect(() => {
    if (!examId) {
      setLoading(false);
      return;
    }
    const st = useQuizStore.getState();
    if (
      (st.currentStep === 'playing' || st.currentStep === 'review') &&
      st.questions.length === 0
    ) {
      if (st.attemptId) {
        attemptService
          .getAttempt(st.attemptId)
          .then((detail) => {
            if (Array.isArray(detail.questions) && detail.questions.length) {
              setQuestions(mapQuestions(detail.questions));
            } else {
              resetQuiz();
            }
          })
          .catch(() => resetQuiz())
          .finally(() => setLoading(false));
      } else {
        resetQuiz();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          Đang tải bộ câu hỏi...
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
          examTitle={currentExamTitle}
          questionCount={questionCount}
          selectedMinutes={selectedMinutes}
          onSelectMinutes={(m) => {
            setSelectedMinutes(m);
            setTimeLeft(m * 60);
          }}
          onStart={handleStart}
          starting={starting}
          startError={startError}
        />
      )}
      {(currentStep === 'playing' || currentStep === 'review') &&
        (questions.length > 0 ? (
          <QuizEngine examTitle={currentExamTitle} />
        ) : (
          <div className="max-w-xl mx-auto mt-20 p-8 bg-white rounded-2xl shadow-sm border text-center">
            <p className="text-gray-600 mb-2 font-bold">
              Không khôi phục được phiên làm bài cũ.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Dữ liệu câu hỏi đã hết hạn. Vui lòng bắt đầu lại lượt thi mới.
            </p>
            <button
              onClick={() => resetQuiz()}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow transition uppercase tracking-wider text-sm"
            >
              Về màn bắt đầu
            </button>
          </div>
        ))}
      {currentStep === 'result' && <QuizResult />}
    </div>
  );
};
