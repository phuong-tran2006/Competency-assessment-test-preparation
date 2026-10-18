import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuizStore } from '../../store/quizStore';
import { CountdownTimer } from '../../components/CountdownTimer';
import { quizService } from '../../services/quiz.service';

export const QuizEngine = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    questions, answers, currentIndex, 
    setQuestions, setAnswer, nextQuestion, prevQuestion, jumpToQuestion 
  } = useQuizStore();

  // Gọi API lấy đề thi thật
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!examId) return;
      try {
        setLoading(true);
        const data = await quizService.getExamQuestions(examId);
        setQuestions(data);
      } catch (error) {
        console.error('Lỗi khi tải đề thi:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [examId, setQuestions]);

  const handleSubmit = async () => {
    if (!examId) return;
    try {
      setIsSubmitting(true);
      // Gửi dữ liệu đáp án lên API
      await quizService.submitExam(examId, answers);
      alert('Nộp bài thành công! Điểm của bạn đã được ghi nhận.');
      navigate('/courses'); // Điều hướng về trang danh sách khóa học sau khi nộp
    } catch (error) {
      console.error('Lỗi khi nộp bài:', error);
      alert('Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    alert('Hết giờ! Hệ thống tự động nộp bài.');
    handleSubmit();
  };

  if (loading) return <div className="p-10 text-center font-medium text-gray-500">Đang tải đề thi...</div>;
  if (questions.length === 0) return <div className="p-10 text-center text-red-500 font-medium">Không tìm thấy dữ liệu đề thi!</div>;

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm border-b p-4 flex justify-between items-center px-10">
        <h1 className="text-xl font-bold text-gray-800">Mã đề thi: {examId}</h1>
        <CountdownTimer initialSeconds={600} onTimeUp={handleTimeUp} />
      </div>

      <div className="flex gap-6 p-6 max-w-6xl mx-auto w-full flex-1">
        <div className="flex-1 bg-white p-8 shadow-sm rounded-lg border flex flex-col">
          <h2 className="text-xl font-bold mb-6 text-gray-800">
            Câu {currentIndex + 1}: <span className="font-normal">{currentQ.content}</span>
          </h2>
          
          <div className="space-y-4 flex-1">
            {currentQ.options.map(opt => (
              <label 
                key={opt.id} 
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  answers[currentQ.id] === opt.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={currentQ.id}
                  value={opt.id}
                  checked={answers[currentQ.id] === opt.id}
                  onChange={() => setAnswer(currentQ.id, opt.id)}
                  className="w-5 h-5 text-blue-600 cursor-pointer"
                />
                <span className="text-gray-700">{opt.text}</span>
              </label>
            ))}
          </div>
          
          <div className="mt-8 flex justify-between border-t pt-6">
            <button 
              onClick={prevQuestion} 
              disabled={currentIndex === 0} 
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-300 font-medium"
            >
              Quay lại
            </button>
            <button 
              onClick={nextQuestion} 
              disabled={currentIndex === questions.length - 1} 
              className="px-6 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700 font-medium shadow-sm"
            >
              Câu tiếp theo
            </button>
          </div>
        </div>

        <div className="w-80 bg-white p-6 shadow-sm rounded-lg border flex flex-col h-fit">
          <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b">Bảng câu hỏi</h3>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => jumpToQuestion(idx)}
                  className={`w-10 h-10 rounded text-sm font-semibold transition-all ${
                    isCurrent ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                  } ${
                    isAnswered ? 'bg-green-500 text-white border-green-600' : 'bg-gray-100 text-gray-600 border hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-3 rounded-md font-bold shadow-sm transition-colors"
          >
            {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
          </button>
        </div>
      </div>
    </div>
  );
};