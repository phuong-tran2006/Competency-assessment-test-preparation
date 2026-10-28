import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuizStore } from "../../store/quizStore";
import { quizService } from "../../services/quiz.service";

export const QuizEngine = () => {
  const {
    questions,
    answers,
    reviewList,
    setAnswer,
    toggleReview,
    jumpToQuestion,
    submitQuiz,
    setResultData,
  } = useQuizStore();
  const { examId } = useParams();

  const [timeLeft, setTimeLeft] = useState(3600); // 60 phút
  const [isSubmitting, setIsSubmitting] = useState(false);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Hàm nộp bài tích hợp gọi API thật theo chuẩn Contract mới
  const handleSubmit = async (isAutoSubmit = false) => {
    // Chỉ hiện bảng hỏi nếu người dùng tự bấm nút nộp bài
    if (!isAutoSubmit) {
      const confirm = window.confirm("Bạn có chắc chắn muốn nộp bài không?");
      if (!confirm) return;
    }

    if (!examId) {
      alert("Không tìm thấy mã đề thi hợp lệ!");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await quizService.submitExam(examId, answers);

      const finalResultData = result.data ? result.data : result;

      setResultData(finalResultData);

      submitQuiz();
    } catch (error) {
      console.error("Lỗi khi nộp bài:", error);
      alert("Có lỗi xảy ra khi nộp bài lên hệ thống. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (timeLeft <= 0) {
      setTimeout(() => {
        handleSubmit(true);
      }, 0);
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleScrollToQuestion = (index: number) => {
    jumpToQuestion(index);
    questionRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const answeredCount = Object.keys(answers).length;

  const getSectionTitles = (index: number) => {
    const titles = [];
    if (index === 0) {
      titles.push({ type: "main", text: "PHẦN 1: SỬ DỤNG NGÔN NGỮ" });
      titles.push({ type: "sub", text: "1.1. TIẾNG VIỆT" });
    } else if (index === 30) {
      titles.push({ type: "sub", text: "1.2. TIẾNG ANH" });
    } else if (index === 60) {
      titles.push({ type: "main", text: "PHẦN 2: TOÁN HỌC" });
    } else if (index === 90) {
      titles.push({ type: "main", text: "PHẦN 3: TƯ DUY KHOA HỌC" });
      titles.push({ type: "sub", text: "3.1. LOGIC, PHÂN TÍCH SỐ LIỆU" });
    } else if (index === 102) {
      titles.push({ type: "sub", text: "3.2. SUY LUẬN KHOA HỌC" });
    }
    return titles;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      {/* CỘT TRÁI: DANH SÁCH CÂU HỎI CUỘN DỌC */}
      <div className="flex-1 space-y-6 lg:max-h-[calc(100vh-40px)] lg:overflow-y-auto pr-2">
        <h1 className="text-center text-xl font-black text-amber-600 uppercase tracking-wide py-3 bg-amber-50 rounded-xl border border-amber-200">
          ĐỀ LUYỆN THI ĐGNL 2026 V-ACT – ĐỀ 1
        </h1>

        {questions.map((q, idx) => {
          const sectionTitles = getSectionTitles(idx);

          return (
            <div key={q.id}>
              {/* Render Tiêu đề phần */}
              {sectionTitles.map((title, i) => (
                <h2
                  key={i}
                  className={
                    title.type === "main"
                      ? "text-xl font-black text-blue-800 mt-8 mb-4 border-b-2 border-blue-800 pb-2 uppercase tracking-wide"
                      : "text-lg font-bold text-gray-700 mt-4 mb-4"
                  }
                >
                  {title.text}
                </h2>
              ))}

              {/* Box chứa từng câu hỏi */}
              <div
                ref={(el) => {
                  questionRefs.current[idx] = el;
                }}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    Câu {idx + 1}
                  </h3>
                  <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-md shadow-sm">
                    Trắc nghiệm
                  </span>
                </div>

                <div
                  className="text-left text-gray-700 text-base mb-6 leading-relaxed font-medium"
                  dangerouslySetInnerHTML={{ __html: q.content }}
                />

                <div className="space-y-3 pl-2">
                  {q.options.map((opt) => {
                    const isSelected = answers[q.id] === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50 border-blue-400"
                            : "bg-white border-transparent hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={isSelected}
                          onChange={() => setAnswer(q.id, opt.id)}
                          className="mt-1 w-4 h-4 text-blue-600"
                        />
                        <span className="ml-3 text-gray-700 font-medium">
                          {opt.text}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Nút lát kiểm tra lại */}
                <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => toggleReview(q.id)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-purple-600 transition"
                  >
                    <span>Lát kiểm tra lại</span>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        reviewList[q.id]
                          ? "border-purple-600 bg-purple-600"
                          : "border-gray-300 bg-transparent"
                      }`}
                    >
                      {reviewList[q.id] && (
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CỘT PHẢI: BẢNG TRẠNG THÁI STICKY */}
      <div className="w-full lg:w-[320px]">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-md sticky top-6">
          <div className="grid grid-cols-2 gap-4 text-center border-b pb-4 mb-5">
            <div>
              <span className="text-gray-500 text-xs font-bold block mb-1">
                Số câu đã làm
              </span>
              <span className="text-2xl font-black text-gray-800">
                {answeredCount}/{questions.length}
              </span>
            </div>
            <div className="border-l border-gray-100">
              <span className="text-gray-500 text-xs font-bold block mb-1">
                Thời gian còn lại
              </span>
              <span className="text-2xl font-black text-slate-600">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="max-h-[250px] overflow-y-auto mb-6 pr-1">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isReviewed = !!reviewList[q.id];
                const sectionTitles = getSectionTitles(idx); // <-- Gọi hàm mới ở đây

                let btnStyle =
                  "w-full aspect-square rounded-full flex items-center justify-center font-bold text-sm border transition-all ";
                if (isReviewed)
                  btnStyle += "bg-purple-500 border-purple-500 text-white";
                else if (isAnswered)
                  btnStyle += "bg-green-500 border-green-500 text-white";
                else
                  btnStyle +=
                    "bg-white border-gray-200 text-gray-700 hover:bg-gray-100";

                return (
                  <React.Fragment key={`nav-${q.id}`}>
                    {/* Render Tiêu đề xen kẽ vào bảng số */}
                    {sectionTitles.map((title, i) => (
                      <div
                        key={`title-${idx}-${i}`}
                        className={`col-span-5 text-left border-b pb-1 ${
                          title.type === "main"
                            ? "mt-4 mb-1 text-[11px] font-bold text-blue-700 uppercase border-blue-200"
                            : "mt-2 mb-1 text-[10px] font-bold text-gray-500 border-gray-100"
                        }`}
                      >
                        {title.text}
                      </div>
                    ))}

                    <button
                      onClick={() => handleScrollToQuestion(idx)}
                      className={btnStyle}
                    >
                      {idx + 1}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-extrabold text-base rounded-full shadow-md transition-all mb-6 uppercase"
          >
            {isSubmitting ? "ĐANG NỘP BÀI..." : "NỘP BÀI"}
          </button>

          {/* Chú giải màu sắc */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-green-500 inline-block"></span>
              <span className="text-xs font-semibold text-gray-600">
                Câu đã làm
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full border border-gray-300 bg-white inline-block"></span>
              <span className="text-xs font-semibold text-gray-600">
                Câu chưa làm
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-purple-500 inline-block"></span>
              <span className="text-xs font-semibold text-gray-600">
                Câu cần kiểm tra lại
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
