import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuizStore } from "../../store/quizStore";
import { attemptService } from "../../services/attempt.service";
import { confirmDialog, toast } from "../../store/uiStore";
import { BackButton } from "../../components/BackButton";

export const QuizEngine = ({ examTitle }: { examTitle?: string }) => {
  const {
    questions,
    answers,
    reviewList,
    setAnswer,
    toggleReview,
    jumpToQuestion,
    submitQuiz,
    setResultData,
    resultData,
    currentStep,
    setStep,
    attemptId,
    timeLeft,
    setTimeLeft,
  } = useQuizStore();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasSubmittedRef = useRef(false);
  const lastInteractionRef = useRef(Date.now());

  const isReviewMode = currentStep === "review";

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!isAutoSubmit) {
      const unanswered = questions.length - Object.keys(answers).length;
      const ok = await confirmDialog({
        title: "Nộp bài thi?",
        message:
          unanswered > 0
            ? `Bạn còn ${unanswered} câu chưa trả lời. Sau khi nộp sẽ không sửa được đáp án.`
            : "Bạn đã trả lời hết các câu. Sau khi nộp sẽ không sửa được đáp án.",
        confirmLabel: "Nộp bài",
        cancelLabel: "Làm tiếp",
        tone: unanswered > 0 ? "danger" : "default",
      });
      if (!ok) return;
    }

    if (!attemptId) {
      toast.error(
        "Không tìm thấy lượt làm bài",
        "Vui lòng tải lại trang để bắt đầu lại.",
      );
      return;
    }

    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    try {
      setIsSubmitting(true);

      // Đồng bộ toàn bộ đáp án đang giữ ở client trước khi nộp
      await Promise.all(
        Object.entries(answers).map(([questionId, optionId]) =>
          attemptService
            .saveAnswer(attemptId, questionId, [optionId])
            .catch((err) =>
              console.error(`Không lưu được đáp án câu ${questionId}:`, err),
            ),
        ),
      );

      await attemptService.submit(attemptId);
      const results = await attemptService.getResults(attemptId);
      setResultData(results);
      submitQuiz();
      toast.success(
        isAutoSubmit ? "Hết giờ, đã nộp bài tự động" : "Nộp bài thành công",
        `Bạn đạt ${results.score}/${results.total} câu đúng.`,
      );
      navigate(`/results/${attemptId}`);
    } catch (error) {
      console.error("Lỗi khi nộp bài:", error);
      hasSubmittedRef.current = false;
      toast.error(
        "Không nộp được bài",
        "Có lỗi khi gửi bài lên hệ thống. Kiểm tra kết nối và thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isReviewMode) return;
    if (timeLeft <= 0) {
      setTimeout(() => {
        handleSubmit(true);
      }, 0);
      return;
    }
    const timer = setInterval(
      () => setTimeLeft((prev: number) => prev - 1),
      1000,
    );
    return () => clearInterval(timer);
  }, [timeLeft, isReviewMode, setTimeLeft]);

  // Cảnh báo khi còn 5 phút và 1 phút. Dùng ref để mỗi mốc chỉ nhắc một lần.
  const warnedRef = useRef<Record<number, boolean>>({});
  useEffect(() => {
    if (isReviewMode || timeLeft <= 0) return;

    for (const mark of [300, 60]) {
      if (timeLeft <= mark && !warnedRef.current[mark]) {
        warnedRef.current[mark] = true;
        toast.warning(
          `Còn ${mark / 60} phút`,
          "Hết giờ hệ thống sẽ tự động nộp bài.",
        );
        break;
      }
    }
  }, [timeLeft, isReviewMode]);

  // Rời khỏi bài thi giữa giờ: xác nhận trước vì đáp án đã lưu nhưng bài chưa nộp
  const handleExit = async () => {
    const ok = await confirmDialog({
      title: "Thoát khỏi bài thi?",
      message:
        "Đáp án đã chọn vẫn được lưu, nhưng bài chưa được nộp và đồng hồ vẫn tiếp tục chạy.",
      confirmLabel: "Thoát",
      cancelLabel: "Ở lại làm bài",
      tone: "danger",
    });
    if (ok) navigate("/exams");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Lưu đáp án lên server ngay khi chọn, kèm thời gian đã dùng cho câu đó
  const handleSelect = (questionId: string, optionId: string) => {
    if (!attemptId) return;

    const now = Date.now();
    const last = lastInteractionRef.current;
    lastInteractionRef.current = now;
    const timeSpent = Math.min(600, Math.max(0, Math.round((now - last) / 1000)));

    attemptService
      .saveAnswer(attemptId, questionId, [optionId], timeSpent)
      .catch((err) => console.error('Không lưu được đáp án:', err));
  };

  const handleScrollToQuestion = (index: number) => {
    jumpToQuestion(index);
    questionRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentStep === "playing") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentStep]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      {/* CỘT TRÁI */}
      <div className="flex-1 space-y-6 lg:max-h-[calc(100vh-40px)] lg:overflow-y-auto pr-2">
        <div className="flex items-center gap-3">
          {isReviewMode ? (
            <BackButton to="/exams" label="Danh sách đề" />
          ) : (
            <button
              type="button"
              onClick={handleExit}
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-700 shadow-sm hover:border-amber-400 hover:text-amber-600 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              <span className="transition-transform group-hover:-translate-x-0.5">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </span>
              Thoát
            </button>
          )}

          <h1 className="flex-1 text-center text-xl font-black text-amber-600 uppercase tracking-wide py-3 bg-amber-50 rounded-xl border border-amber-200">
            {examTitle || 'ĐỀ LUYỆN THI ĐGNL V-ACT'}
          </h1>
        </div>

        {questions.map((q, idx) => {
          const questionDetail = resultData?.details?.find(
            (d: any) => String(d.questionId) === String(q.id),
          );
          const explanation = questionDetail?.explanation || q.explanation;
          const selectedOptionId = answers[q.id];

          const correctOption = q.options.find(
            (opt) =>
              opt.isCorrect === true ||
              opt.isCorrect === "true" ||
              opt.isCorrect === 1,
          );

          const isUserCorrect =
            !!selectedOptionId &&
            ((correctOption &&
              String(correctOption.id) === String(selectedOptionId)) ||
              questionDetail?.isCorrect === true ||
              String(questionDetail?.correctOptionId) ===
                String(selectedOptionId) ||
              questionDetail?.correctAnswers?.includes(selectedOptionId));

          return (
            <div key={q.id}>
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
                    const isSelected = selectedOptionId === opt.id;

                    const isThisOptionCorrect =
                      opt.isCorrect === true ||
                      opt.isCorrect === "true" ||
                      opt.isCorrect === 1 ||
                      (isReviewMode && questionDetail && opt.id !== undefined
                        ? String(questionDetail.correctOptionId) ===
                            String(opt.id) ||
                          String(questionDetail.correctAnswer) ===
                            String(opt.id) ||
                          questionDetail.correctAnswers?.includes(opt.id)
                        : false);

                    let itemClass =
                      "bg-white border-transparent hover:bg-gray-50 cursor-pointer";

                    if (isReviewMode) {
                      if (isThisOptionCorrect) {
                        itemClass =
                          "bg-green-100 border-green-500 text-green-900 cursor-default font-bold";
                      } else if (isSelected) {
                        itemClass =
                          "bg-red-100 border-red-500 text-red-900 cursor-default";
                      } else {
                        itemClass = "bg-gray-50 opacity-50 cursor-default";
                      }
                    } else if (isSelected) {
                      itemClass = "bg-blue-50 border-blue-400 cursor-pointer";
                    }

                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start p-3 rounded-lg border transition-all ${itemClass}`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={isSelected}
                          onChange={() => {
                            if (isReviewMode) return;
                            setAnswer(q.id, opt.id);
                            handleSelect(q.id, opt.id);
                          }}
                          disabled={isReviewMode}
                          readOnly={isReviewMode}
                          className={`mt-1 w-4 h-4 ${isReviewMode ? "cursor-default" : "cursor-pointer"} text-blue-600`}
                        />
                        <span className="ml-3 font-medium">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>

                {isReviewMode && (
                  <div
                    className={`mt-4 p-4 rounded-lg text-sm border ${
                      isUserCorrect
                        ? "bg-green-50 border-green-200 text-green-900"
                        : "bg-red-50 border-red-200 text-red-900"
                    }`}
                  >
                    <div
                      className={`font-bold text-base mb-1 ${isUserCorrect ? "text-green-700" : "text-red-700"}`}
                    >
                      {isUserCorrect
                        ? "✅ Chính xác!"
                        : !selectedOptionId
                          ? "⚠️ Bạn chưa làm câu này!"
                          : "❌ Sai!"}
                    </div>
                    {explanation && (
                      <div className="mt-1">
                        <span className="font-semibold">Giải thích: </span>
                        <span
                          dangerouslySetInnerHTML={{ __html: explanation }}
                        />
                      </div>
                    )}
                  </div>
                )}

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

      {/* CỘT PHẢI */}
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
              <span
                className={`text-2xl font-black ${
                  !isReviewMode && timeLeft <= 60
                    ? "text-red-600 animate-pulse"
                    : !isReviewMode && timeLeft <= 300
                      ? "text-amber-600"
                      : "text-slate-600"
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="max-h-[250px] overflow-y-auto mb-6 pr-1">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isReviewed = !!reviewList[q.id];

                let btnStyle =
                  "w-full aspect-square rounded-full flex items-center justify-center font-bold text-sm border transition-all ";

                if (isReviewMode) {
                  const selectedOptionId = answers[q.id];
                  const questionDetail = resultData?.details?.find(
                    (d: any) => String(d.questionId) === String(q.id),
                  );
                  const correctOption = q.options.find(
                    (opt) =>
                      opt.isCorrect === true ||
                      opt.isCorrect === "true" ||
                      opt.isCorrect === 1,
                  );

                  const isUserCorrect =
                    !!selectedOptionId &&
                    ((correctOption &&
                      String(correctOption.id) === String(selectedOptionId)) ||
                      questionDetail?.isCorrect === true ||
                      String(questionDetail?.correctOptionId) ===
                        String(selectedOptionId) ||
                      questionDetail?.correctAnswers?.includes(
                        selectedOptionId,
                      ));

                  if (isUserCorrect) {
                    btnStyle += "bg-green-500 border-green-500 text-white";
                  } else {
                    btnStyle += "bg-red-500 border-red-500 text-white";
                  }
                } else {
                  if (isReviewed)
                    btnStyle += "bg-purple-500 border-purple-500 text-white";
                  else if (isAnswered)
                    btnStyle += "bg-green-500 border-green-500 text-white";
                  else
                    btnStyle +=
                      "bg-white border-gray-200 text-gray-700 hover:bg-gray-100";
                }

                return (
                  <button
                    key={`nav-${q.id}`}
                    onClick={() => handleScrollToQuestion(idx)}
                    className={btnStyle}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {isReviewMode ? (
            <button
              onClick={() => setStep("result")}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-full shadow-md transition-all mb-6 uppercase"
            >
              Về bảng kết quả
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-extrabold text-base rounded-full shadow-md transition-all mb-6 uppercase"
            >
              {isSubmitting ? "ĐANG NỘP BÀI..." : "NỘP BÀI"}
            </button>
          )}

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-green-500 inline-block"></span>
              <span className="text-xs font-semibold text-gray-600">
                {isReviewMode ? "Câu làm đúng" : "Câu đã làm"}
              </span>
            </div>
            {isReviewMode ? (
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-red-500 inline-block"></span>
                <span className="text-xs font-semibold text-gray-600">
                  Câu làm sai hoặc chưa làm
                </span>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};