import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { BackButton } from '../../components/BackButton';
import { confirmDialog, toast } from '../../store/uiStore';
import { authService } from '../../services/auth.service';
import { attemptService } from '../../services/attempt.service';
import type { HistoryItem } from '../../services/attempt.service';
import api from '../../services/api';

interface UserMe {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  targetScore: number | null;
  createdAt: string;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatMonth(value: string | null) {
  if (!value) return 'Chưa rõ';
  const d = new Date(value);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

export const UserProfile = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'history' | 'ongoing'>('history');

  const [me, setMe] = useState<UserMe | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // Backend chưa có endpoint "bài đang làm dở" riêng — suy ra từ attempts
  // IN_PROGRESS của user qua GET /attempts/history? (hiện chỉ trả SUBMITTED)
  // nên tạm dùng mảng rỗng thay vì dữ liệu giả.
  const [ongoing] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<UserMe>('/users/me').then((r) => r.data),
      attemptService.getHistory(),
    ])
      .then(([meData, historyData]) => {
        if (cancelled) return;
        setMe(meData);
        setHistory(historyData);
      })
      .catch((err) => {
        console.error('Lỗi tải hồ sơ:', err);
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Không tải được hồ sơ. Vui lòng đăng nhập lại.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!history.length) return { avg: 0, best: 0 };
    const best = history.reduce((max, it) => Math.max(max, it.score), 0);
    const avg = Math.round((history.reduce((s, it) => s + it.score, 0) / history.length) * 100) / 100;
    return { avg, best };
  }, [history]);

  const totalQuestions = useMemo(
    () => history.reduce((s, it) => s + (it.total ?? 0), 0),
    [history],
  );

  const handleLogout = async () => {
    const ok = await confirmDialog({
      title: 'Đăng xuất khỏi tài khoản?',
      message: 'Bạn sẽ cần đăng nhập lại để tiếp tục luyện thi.',
      confirmLabel: 'Đăng xuất',
      tone: 'danger',
    });
    if (!ok) return;

    await authService.logout();
    toast.info('Đã đăng xuất', 'Hẹn gặp lại bạn.');
    navigate('/login', { replace: true });
  };

  const displayName = me?.fullName || user?.fullName || user?.name || 'Học viên V-ACT';
  const displayEmail = me?.email || user?.email || 'Chưa cập nhật email';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500 font-semibold">Đang tải hồ sơ...</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto mb-6">
        <BackButton to="/" label="Về trang chủ" />
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* CỘT TRÁI: THÔNG TIN NGƯỜI DÙNG (dữ liệu thật từ GET /users/me) */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center sticky top-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center text-4xl font-black shadow-md mb-4">
              {displayName.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{displayName}</h2>
            <p className="text-sm text-gray-500 mb-6">{displayEmail}</p>

            <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100 shadow-sm">
              <p className="text-xs text-amber-800 font-bold uppercase tracking-wider mb-1">Mục tiêu ĐGNL</p>
              <p className="text-3xl font-black text-amber-600">
                {me?.targetScore ?? '—'}
                <span className="text-sm text-amber-500 font-medium">/1200</span>
              </p>
            </div>

            <div className="border-t border-gray-100 pt-4 text-left space-y-3">
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Ngày tham gia:</span>
                <span className="font-semibold text-gray-800">{formatMonth(me?.createdAt ?? null)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Tổng bài đã nộp:</span>
                <span className="font-semibold text-gray-800">{history.length}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Tổng số câu đã làm:</span>
                <span className="font-semibold text-gray-800">{totalQuestions}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
              <Link
                to="/history"
                className="block w-full py-2.5 rounded-xl text-sm font-bold text-center text-amber-600 bg-amber-50 hover:bg-amber-100 transition"
              >
                Lịch sử làm bài
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full py-2.5 rounded-xl text-sm font-bold text-center text-gray-600 hover:text-red-600 hover:bg-red-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: QUẢN LÝ BÀI THI (dữ liệu thật từ GET /attempts/history) */}
        <div className="md:col-span-3 space-y-6">

          {/* Chỉ số tổng quan năng lực */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Điểm Trung Bình</p>
                <p className="text-2xl font-black text-gray-800">
                  {history.length ? stats.avg : '—'}
                  {history.length > 0 && <span className="text-base font-semibold text-gray-400"> điểm/bài</span>}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-xl font-black">
                📊
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Điểm Cao Nhất</p>
                <p className="text-2xl font-black text-gray-800">
                  {history.length ? stats.best : '—'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 text-xl font-black">
                🏆
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* TABS */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                  activeTab === 'history' ? 'bg-amber-50 text-amber-600 border-b-2 border-amber-500' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Bài đã hoàn thành
              </button>
              <button
                onClick={() => setActiveTab('ongoing')}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                  activeTab === 'ongoing' ? 'bg-amber-50 text-amber-600 border-b-2 border-amber-500' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Bài đang làm dở
              </button>
            </div>

            {/* NỘI DUNG TABS */}
            <div className="p-6">
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {history.length > 0 ? (
                    history.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border border-gray-100 rounded-xl hover:shadow-md hover:border-amber-100 transition-all bg-gray-50/50">
                        <div className="mb-4 sm:mb-0">
                          <h3 className="font-bold text-gray-800 text-lg">{item.exam?.title ?? 'Bài luyện tập tự sinh'}</h3>
                          <p className="text-sm text-gray-500 mt-1">Hoàn thành: {formatDate(item.submittedAt)}</p>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between items-center sm:items-end">
                          <div className="text-2xl font-black text-green-600">{item.score}<span className="text-lg text-gray-400">/{item.total}</span></div>
                          <Link to={`/results/${item.id}`} className="text-sm text-amber-600 font-bold hover:text-amber-700 hover:underline mt-1">Xem chi tiết &rarr;</Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">Bạn chưa hoàn thành bài thi nào.</p>
                  )}
                </div>
              )}

              {activeTab === 'ongoing' && (
                <div className="space-y-4">
                  {ongoing.length > 0 ? (
                    ongoing.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border border-gray-100 rounded-xl hover:shadow-md hover:border-amber-100 transition-all bg-gray-50/50">
                        <div className="mb-4 sm:mb-0">
                          <h3 className="font-bold text-gray-800 text-lg">{item.exam?.title ?? 'Bài luyện tập'}</h3>
                          <p className="text-sm text-gray-500 mt-1">Bắt đầu: {formatDate(item.startedAt)}</p>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <Link to={`/practice/${item.exam?.id ?? ''}`} className="px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-sm">
                            Tiếp tục làm
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">Không có bài thi nào đang làm dở.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
