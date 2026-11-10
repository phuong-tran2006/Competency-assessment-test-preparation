import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { BackButton } from '../../components/BackButton';
import { confirmDialog, toast } from '../../store/uiStore';
import { authService } from '../../services/auth.service';
import api from '../../services/api';

interface EloTopic {
  topicId: string;
  topicName: string;
  rating: number;
  attempts: number;
  level: 'Yếu' | 'Trung bình' | 'Khá' | 'Tốt';
}

export const UserProfile = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'history' | 'ongoing'>('history');
  const [eloProfile, setEloProfile] = useState<EloTopic[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/exams/profile/elo')
      .then((res) => {
        setEloProfile(res.data?.eloProfile || []);
        setAttempts(res.data?.attempts || []);
      })
      .catch((err) => console.error('Lỗi tải hồ sơ Elo:', err))
      .finally(() => setLoading(false));
  }, []);

  const avgElo =
    eloProfile.length > 0
      ? Math.round(
          eloProfile.reduce((sum, item) => sum + item.rating, 0) /
            eloProfile.length,
        )
      : 1200;

  const weakestTopic =
    eloProfile.length > 0
      ? [...eloProfile].sort((a, b) => a.rating - b.rating)[0]
      : null;

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

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'Tốt':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Khá':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Trung bình':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  void activeTab;
  void setActiveTab;
  void handleLogout;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <BackButton to="/" label="Về trang chủ" />
        </div>
        {/* THANH ĐIỀU HƯỚNG TRÊN CÙNG */}
        <div className="flex flex-wrap justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm font-bold text-amber-600 hover:underline"
            >
              &larr; Trang chủ
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-extrabold text-blue-900">
              Bảng Điều Khiển & Hồ Sơ Năng Lực Học Viên (Adaptive Elo)
            </h1>
          </div>
          <div className="flex gap-3">
            <Link
              to="/courses/course-1/lessons/lesson-1"
              className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-100 transition"
            >
              📖 Học Lý Thuyết
            </Link>
            <Link
              to="/courses"
              className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition shadow-sm"
            >
              🎯 Vào Luyện Đề & Chuyên Đề
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* CỘT TRÁI: THÔNG TIN HỌC VIÊN & CHỈ SỐ ELO TRUNG BÌNH */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center text-3xl font-black shadow-md mb-3">
                {user?.name?.charAt(0)?.toUpperCase() || 'H'}
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                {user?.name || 'Học viên V-ACT'}
              </h2>
              <p className="text-xs text-gray-500 mb-5">
                {user?.email || 'learner@vact.com'}
              </p>

              <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-xl p-4 mb-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wider text-blue-200 font-bold mb-1">
                  Chỉ số Elo Tổng hợp
                </p>
                <p className="text-3xl font-black text-amber-400">
                  {avgElo}
                  <span className="text-xs text-blue-200 font-normal">
                    {' '}
                    Elo
                  </span>
                </p>
                <p className="text-[11px] text-blue-200 mt-1">
                  Mốc khởi điểm chuẩn: 1200 Elo
                </p>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mục tiêu ĐGNL:</span>
                  <span className="font-bold text-amber-700">900 / 1200</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số đề đã hoàn thành:</span>
                  <span className="font-bold text-gray-800">
                    {attempts.length} đề
                  </span>
                </div>
              </div>
            </div>

            {/* GỢI Ý HỌC TẬP THÍCH ỨNG */}
            {weakestTopic && (
              <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-extrabold rounded-full uppercase">
                  💡 Gợi ý cá nhân hóa
                </span>
                <h3 className="font-bold text-gray-900 mt-3 text-sm">
                  Cần ưu tiên ôn tập: {weakestTopic.topicName}
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Chỉ số Elo hiện tại của bạn ở mảng{' '}
                  <b>{weakestTopic.topicName}</b> là{' '}
                  <b>{weakestTopic.rating} Elo</b> ({weakestTopic.level}). Hãy
                  luyện thêm chuyên đề này để cải thiện điểm số!
                </p>
                <Link
                  to="/courses"
                  className="mt-4 block text-center w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition"
                >
                  Luyện chuyên đề {weakestTopic.topicName} &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: HỆ THỐNG ELO THEO CHỦ ĐỀ & LỊCH SỬ LÀM BÀI */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    📊 Hồ Sơ Năng Lực Elo Theo Chuyên Đề (Topic Mastery)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Điểm Elo tự động tăng/giảm theo độ khó câu hỏi sau mỗi lần nộp bài (Dưới 1000: Yếu | 1000-1299: Trung bình | 1300-1599: Khá | 1600+: Tốt)
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  Đang tải dữ liệu Elo...
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eloProfile.map((topic) => {
                    const percent = Math.min(
                      100,
                      Math.max(10, Math.round(((topic.rating - 600) / 1400) * 100)),
                    );
                    return (
                      <div
                        key={topic.topicId}
                        className="p-4 rounded-xl border border-gray-200 bg-gray-50/60"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-gray-800 text-sm">
                            {topic.topicName}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getLevelBadge(
                              topic.level,
                            )}`}
                          >
                            {topic.level}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-2xl font-black text-blue-900">
                            {topic.rating}{' '}
                            <span className="text-xs font-semibold text-gray-500">
                              Elo
                            </span>
                          </span>
                          <span className="text-xs text-gray-500">
                            Đã giải: {topic.attempts} câu
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LỊCH SỬ LÀM BÀI THI THẬT TỪ DATABASE */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">
                🕒 Lịch Sử Nộp Bài Gần Đây
              </h2>

              {attempts.length > 0 ? (
                <div className="space-y-3">
                  {attempts.map((att) => (
                    <div
                      key={att.id}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200 rounded-xl hover:border-amber-300 transition bg-gray-50/40"
                    >
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm">
                          {att.exam?.title || 'Bài luyện tập ĐGNL V-ACT'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Thời gian nộp:{' '}
                          {att.submittedAt
                            ? new Date(att.submittedAt).toLocaleString('vi-VN')
                            : 'Vừa xong'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-3 sm:mt-0">
                        <div className="text-right">
                          <span className="text-lg font-black text-emerald-600">
                            {att.score}/{att.total} câu
                          </span>
                          <span className="block text-[11px] text-gray-500">
                            ({Math.round((att.score / Math.max(1, att.total)) * 100)}%)
                          </span>
                        </div>
                        {att.exam?.id && (
                          <Link
                            to={`/practice/${att.exam.id}`}
                            className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition"
                          >
                            Thi lại
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-3">
                    Bạn chưa có lượt nộp bài nào. Hãy làm một đề thi để hệ thống tính toán chỉ số Elo cho bạn!
                  </p>
                  <Link
                    to="/courses"
                    className="inline-block px-5 py-2.5 bg-amber-500 text-white text-xs font-bold rounded-xl"
                  >
                    Chọn đề thi ngay
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
