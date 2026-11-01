import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service';
import type { AttemptResults, AttemptDetail } from '../../services/attempt.service';
import { BackButton } from '../../components/BackButton';

type Verdict = 'correct' | 'wrong' | 'blank';

function verdictOf(detail: AttemptDetail): Verdict {
  if (detail.selectedOptionIds.length === 0) return 'blank';
  return detail.isCorrect ? 'correct' : 'wrong';
}

const VERDICT_LABEL: Record<Verdict, string> = {
  correct: 'Đúng',
  wrong: 'Sai',
  blank: 'Bỏ trống',
};

const VERDICT_CLASS: Record<Verdict, string> = {
  correct: 'bg-green-100 text-green-800 border-green-300',
  wrong: 'bg-red-100 text-red-800 border-red-300',
  blank: 'bg-gray-100 text-gray-600 border-gray-300',
};

function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

export const ResultPage = () => {
  const { attemptId } = useParams();
  const [data, setData] = useState<AttemptResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attemptId) {
      setError('Không tìm thấy mã lượt làm bài.');
      setLoading(false);
      return;
    }

    attemptService
      .getResults(attemptId)
      .then(setData)
      .catch((err) => {
        console.error('Lỗi tải kết quả:', err);
        setError(
          err.response?.data?.message ||
            'Không tải được kết quả bài làm. Bài có thể chưa được nộp.',
        );
      })
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500 font-semibold">Đang tải kết quả...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gray-50 px-4">
        <p className="text-lg text-red-500 font-semibold text-center">{error}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <BackButton to="/history" label="Về lịch sử làm bài" />
          <BackButton to="/exams" label="Danh sách đề thi" variant="ghost" />
        </div>
      </div>
    );
  }

  const { summary, topicSummary, details } = data;
  const totalTime = details.reduce((sum, d) => sum + d.timeSpent, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <BackButton to="/history" label="Về lịch sử làm bài" />

        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Kết quả bài làm</h1>
            <p className="mt-1 text-sm text-gray-500">
              Mã lượt: {data.attemptId}
              {data.submittedAt &&
                ` • Nộp lúc ${new Date(data.submittedAt).toLocaleString('vi-VN')}`}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/history"
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50"
            >
              Lịch sử làm bài
            </Link>
            <Link
              to="/courses"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm"
            >
              Tiếp tục học
            </Link>
          </div>
        </div>

        {/* Tổng quan điểm: điểm thường + weighted */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-gray-500 uppercase block mb-2">
              Điểm thường
            </span>
            <span className="text-3xl font-black text-gray-900">
              {data.score}/{data.total}
            </span>
            <span className="block mt-1 text-sm font-semibold text-amber-600">
              {summary.percentage}%
            </span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-gray-500 uppercase block mb-2">
              Điểm có trọng số
            </span>
            <span className="text-3xl font-black text-gray-900">
              {data.weightedScore}
            </span>
            <span className="block mt-1 text-sm font-semibold text-amber-600">
              / {summary.maxWeightedScore} ({summary.weightedPercentage}%)
            </span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-gray-500 uppercase block mb-2">
              Đúng / Sai / Bỏ trống
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-green-600">
                {summary.correctCount}
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-2xl font-black text-red-500">
                {summary.wrongCount}
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-2xl font-black text-gray-500">
                {summary.unansweredCount}
              </span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-gray-500 uppercase block mb-2">
              Tổng thời gian
            </span>
            <span className="text-3xl font-black text-gray-900">
              {formatSeconds(totalTime)}
            </span>
            <span className="block mt-1 text-sm font-semibold text-gray-500">
              TB {details.length ? Math.round(totalTime / details.length) : 0}s/câu
            </span>
          </div>
        </div>

        {/* Kết quả theo chủ đề */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <h2 className="px-6 py-4 text-lg font-bold text-gray-800 border-b border-gray-100">
            Kết quả theo chủ đề
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Chủ đề</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Đúng/Tổng</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Tỷ lệ</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Điểm trọng số</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topicSummary.map((t) => (
                  <tr key={t.topicId}>
                    <td className="px-6 py-3 font-semibold text-gray-800">{t.name}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {t.correct}/{t.total}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${t.percentage}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-700">{t.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{t.weightedScore}</td>
                    <td className="px-6 py-3 text-gray-700">{formatSeconds(t.timeSpent)}</td>
                  </tr>
                ))}
                {topicSummary.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                      Chưa có dữ liệu theo chủ đề.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bảng phân tích thời gian từng câu (mục Analysis gộp vào Result) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <h2 className="px-6 py-4 text-lg font-bold text-gray-800 border-b border-gray-100">
            Phân tích thời gian từng câu
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Câu</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Chủ đề</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Độ khó</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Kết quả</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {details.map((d, idx) => {
                  const v = verdictOf(d);
                  return (
                    <tr key={d.questionId}>
                      <td className="px-6 py-3 font-semibold text-gray-800">Câu {idx + 1}</td>
                      <td className="px-6 py-3 text-gray-700">{d.topic?.name ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-700">{d.difficulty}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full border text-xs font-bold ${VERDICT_CLASS[v]}`}
                        >
                          {VERDICT_LABEL[v]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-700">{formatSeconds(d.timeSpent)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chi tiết đáp án + giải thích */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Chi tiết đáp án</h2>
          {details.map((d, idx) => {
            const v = verdictOf(d);
            return (
              <div
                key={d.questionId}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h3 className="text-base font-bold text-gray-800">Câu {idx + 1}</h3>
                  <span
                    className={`px-3 py-1 rounded-full border text-xs font-bold ${VERDICT_CLASS[v]}`}
                  >
                    {VERDICT_LABEL[v]}
                  </span>
                </div>

                <div
                  className="text-gray-700 text-base mb-4 leading-relaxed font-medium"
                  dangerouslySetInnerHTML={{ __html: d.content }}
                />

                <div className="space-y-2">
                  {[...d.options]
                    .sort((a, b) => a.order - b.order)
                    .map((opt) => {
                      const isCorrect = d.correctOptionIds.includes(opt.id);
                      const isSelected = d.selectedOptionIds.includes(opt.id);

                      let cls = 'bg-gray-50 border-gray-200 text-gray-600';
                      if (isCorrect) cls = 'bg-green-50 border-green-400 text-green-900 font-bold';
                      else if (isSelected) cls = 'bg-red-50 border-red-400 text-red-900';

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${cls}`}
                        >
                          <span className="text-xs font-bold mt-0.5 min-w-[70px]">
                            {isCorrect ? 'Đáp án đúng' : isSelected ? 'Bạn chọn' : ''}
                          </span>
                          <span>{opt.content}</span>
                        </div>
                      );
                    })}
                </div>

                {d.explanation && (
                  <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
                    <span className="font-bold">Giải thích: </span>
                    <span dangerouslySetInnerHTML={{ __html: d.explanation }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
