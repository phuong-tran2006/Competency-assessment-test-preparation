import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuizStore } from '../../store/quizStore';
import api from '../../services/api';
import { QuizEngine } from './QuizEngine';

const AVAILABLE_TIMES = [15, 30, 45, 60, 90, 150];

const QuizIntro = ({
  examTitle,
  selectedMinutes,
  onSelectMinutes,
}: {
  examTitle: string;
  selectedMinutes: number;
  onSelectMinutes: (m: number) => void;
}) => {
  const setStep = useQuizStore((state) => state.setStep);
  const setTimeLeft = useQuizStore((state) => state.setTimeLeft);
  const questions = useQuizStore((state) => state.questions);

  const handleStart = () => {
    setTimeLeft(selectedMinutes * 60);
    setStep('playing');
  };

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
          Số lượng câu hỏi: <strong className="text-gray-900">{questions.length} câu</strong> &nbsp;|&nbsp; Thời gian đếm ngược: <strong className="text-blue-900">{selectedMinutes} phút</strong>
        </p>
        <button
          onClick={handleStart}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-md transition duration-200 uppercase tracking-wider"
        >
          BẮT ĐẦU LÀM BÀI ({selectedMinutes} PHÚT)
        </button>
      </div>
    </div>
  );
};

// --- MÀN HÌNH 3: KẾT QUẢ & BIẾN THIÊN ĐIỂM ELO ---
const QuizResult = () => {
  const { resultData, resetQuiz, setStep } = useQuizStore();

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm border text-center font-sans">
      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
        ✓
      </div>
      <h1 className="text-2xl font-extrabold text-gray-800 mb-1">
        Đã Nộp Bài Thành Công!
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Kết quả làm bài và chỉ số năng lực Elo theo chủ đề đã được lưu vào hồ sơ của bạn.
      </p>

      {resultData && (
        <>
          <div className="grid grid-cols-3 gap-4 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase block">Số câu đúng</span>
              <span className="text-2xl font-black text-gray-800">
                {resultData.correctAnswers ?? 0} / {resultData.totalQuestions ?? 0}
              </span>
            </div>
            <div className="border-x border-amber-200">
              <span className="text-xs text-gray-500 font-bold uppercase block">Tỷ lệ chính xác</span>
              <span className="text-2xl font-black text-amber-600">
                {resultData.score ?? 0}%
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase block">Quy đổi thang 1200</span>
              <span className="text-2xl font-black text-blue-900">
                {resultData.vactScore ?? Math.round(((resultData.score || 0) * 1200) / 100)}
              </span>
            </div>
          </div>

          {resultData.eloChanges && resultData.eloChanges.length > 0 && (
            <div className="mb-6 text-left border border-blue-100 bg-blue-50/40 rounded-xl p-5">
              <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>📈 Cập nhật chỉ số Elo theo Chủ đề (K = 32)</span>
                <span className="text-xs font-semibold text-blue-600">Mốc cơ sở: 1200</span>
              </h3>
              <div className="space-y-2.5">
                {resultData.eloChanges.map((item: any) => (
                  <div
                    key={item.topicId}
                    className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
                  >
                    <div>
                      <span className="font-bold text-gray-800 text-sm">{item.topicName}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        (Đúng {item.correct}/{item.total} câu)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-700">
                        {Math.round(item.oldRating)} &rarr;{' '}
                        <strong className="text-blue-900">{Math.round(item.newRating)}</strong>
                      </span>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                          item.delta > 0
                            ? 'bg-green-100 text-green-700'
                            : item.delta < 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.delta > 0 ? `+${item.delta}` : item.delta} Elo
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {item.level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <button
          onClick={() => setStep('review')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition uppercase tracking-wider text-sm"
        >
          Xem chi tiết đáp án
        </button>
        <Link
          to="/profile"
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition uppercase tracking-wider text-sm"
        >
          Xem Hồ sơ Elo
        </Link>
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
  const { currentStep, setQuestions, resetQuiz, setTimeLeft } = useQuizStore();
  const [loading, setLoading] = useState(true);
  const { examId } = useParams();
  const [searchParams] = useSearchParams();

  const timeFromUrl = Number(searchParams.get('time')) || 30;
  const countFromUrl = Number(searchParams.get('count')) || 20;
  const [selectedMinutes, setSelectedMinutes] = useState<number>(timeFromUrl);

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

  useEffect(() => {
    if (!examId) {
      setLoading(false);
      return;
    }

    resetQuiz();
    const defaultMin = examId.startsWith('bank-') ? timeFromUrl : 60;
    setSelectedMinutes(defaultMin);
    setTimeLeft(defaultMin * 60);
    setLoading(true);

    api
      .get(`/exams/${examId}/questions`, {
        params: examId.startsWith('bank-') ? { count: countFromUrl } : undefined,
      })
      .then((res) => {
        const data = res.data || [];
        const formatted = data.map((q: any) => ({
          id: q.id,
          examId: examId,
          content: q.content,
          options: q.options.map((opt: any, index: number) => {
            const isCorrect =
              opt.isCorrect === true ||
              opt.isCorrect === 'true' ||
              opt.isCorrect === 1 ||
              Number(q.correct) === index;

            return {
              id: opt.id !== undefined ? String(opt.id) : String(index),
              text: opt.text || opt.content || String(opt),
              isCorrect: isCorrect,
            };
          }),
          explanation: q.explanation || '',
        }));
        setQuestions(formatted);
      })
      .catch((err) => console.error('Lỗi tải đề:', err))
      .finally(() => setLoading(false));
  }, [examId, timeFromUrl, countFromUrl, setQuestions, resetQuiz, setTimeLeft]);

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
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500 font-medium">
          Không tìm thấy mã đề thi. Vui lòng quay lại trang danh sách!
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-6 px-4">
      {currentStep === 'intro' && (
        <QuizIntro
          examTitle={currentExamTitle}
          selectedMinutes={selectedMinutes}
          onSelectMinutes={(m) => {
            setSelectedMinutes(m);
            setTimeLeft(m * 60);
          }}
        />
      )}
      {(currentStep === 'playing' || currentStep === 'review') && <QuizEngine />}
      {currentStep === 'result' && <QuizResult />}
    </div>
  );
};