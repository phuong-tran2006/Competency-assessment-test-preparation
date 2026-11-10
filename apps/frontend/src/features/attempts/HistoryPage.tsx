import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { attemptService } from '../../services/attempt.service';
import type { HistoryItem } from '../../services/attempt.service';
import { BackButton } from '../../components/BackButton';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

function durationOf(startedAt: string, submittedAt: string | null) {
  if (!submittedAt) return '—';
  const seconds = Math.max(
    0,
    Math.floor(
      (new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    ),
  );
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

export const HistoryPage = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    attemptService
      .getHistory()
      .then(setItems)
      .catch((err) => {
        console.error('Lỗi tải lịch sử:', err);
        setError(
          err.response?.data?.message ||
            'Không tải được lịch sử làm bài. Vui lòng đăng nhập lại.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500 font-semibold">Đang tải lịch sử làm bài...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gray-50 px-4">
        <p className="text-lg text-red-500 font-semibold text-center">{error}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-md transition"
          >
            Đăng nhập
          </Link>
          <BackButton to="/" label="Về trang chủ" variant="ghost" />
        </div>
      </div>
    );
  }

  const best = items.reduce((max, it) => Math.max(max, it.score), 0);
  const avg = items.length
    ? Math.round((items.reduce((sum, it) => sum + it.score, 0) / items.length) * 100) / 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <BackButton to="/" label="Về trang chủ" />

        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Lịch sử làm bài</h1>
            <p className="mt-1 text-sm text-gray-500">
              Toàn bộ các lượt thi đã nộp của bạn.
            </p>
          </div>
          <Link
            to="/exams"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm"
          >
            Làm bài mới
          </Link>
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-2">
                Số lượt đã nộp
              </span>
              <span className="text-3xl font-black text-gray-900">{items.length}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-2">
                Điểm cao nhất
              </span>
              <span className="text-3xl font-black text-green-600">{best}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-2">
                Điểm trung bình
              </span>
              <span className="text-3xl font-black text-amber-600">{avg}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Đề thi</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Điểm</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Trọng số</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Nộp lúc</th>
                  <th scope="col" className="px-6 py-3 text-left font-bold">Thời gian làm</th>
                  <th scope="col" className="px-6 py-3 text-right font-bold">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {it.exam?.title ?? 'Bài luyện tập tự sinh'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="font-bold text-gray-900">{it.score}</span>
                      <span className="text-gray-400">/{it.total}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{it.weightedScore}</td>
                    <td className="px-6 py-4 text-gray-700">{formatDate(it.submittedAt)}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {durationOf(it.startedAt, it.submittedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/results/${it.id}`}
                        className="font-bold text-amber-600 hover:text-amber-500 underline"
                      >
                        Xem kết quả
                      </Link>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Bạn chưa nộp bài thi nào. Hãy làm bài đầu tiên để xem phân tích kết quả.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
