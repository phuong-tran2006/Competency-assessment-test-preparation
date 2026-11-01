import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { BackButton } from '../../components/BackButton';
import { confirmDialog, toast } from '../../store/uiStore';
import { authService } from '../../services/auth.service';

export const UserProfile = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'history' | 'ongoing'>('history');

  // TODO: Thay thế bằng dữ liệu gọi từ API Backend
  const mockHistory = [
    { id: '1', title: 'Đề minh họa ĐGNL ĐHQG TPHCM 2026', score: 85, total: 120, date: '30/10/2026' },
    { id: '2', title: 'Đề thi thử V-ACT số 1', score: 92, total: 120, date: '25/10/2026' },
  ];

  const mockOngoing = [
    { id: '3', title: 'Đề thi thử V-ACT số 2', progress: 45, lastSaved: 'Hôm nay' },
  ];

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

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto mb-6">
        <BackButton to="/" label="Về trang chủ" />
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* CỘT TRÁI: THÔNG TIN NGƯỜI DÙNG */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center sticky top-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center text-4xl font-black shadow-md mb-4">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{user?.name || 'Học viên V-ACT'}</h2>
            <p className="text-sm text-gray-500 mb-6">{user?.email || 'Chưa cập nhật email'}</p>
            
            {/* THÊM MỚI: Bảng Mục tiêu ĐGNL */}
            <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100 shadow-sm">
              <p className="text-xs text-amber-800 font-bold uppercase tracking-wider mb-1">Mục tiêu ĐGNL</p>
              <p className="text-3xl font-black text-amber-600">850<span className="text-sm text-amber-500 font-medium">/1200</span></p>
            </div>

            <div className="border-t border-gray-100 pt-4 text-left space-y-3">
              {/* THÊM MỚI: Trường THPT */}
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Trường THPT:</span>
                <span className="font-semibold text-gray-800">Chưa cập nhật</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Ngày tham gia:</span>
                <span className="font-semibold text-gray-800">Tháng 10/2026</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Tổng bài đã nộp:</span>
                <span className="font-semibold text-gray-800">{mockHistory.length}</span>
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

        {/* CỘT PHẢI: QUẢN LÝ BÀI THI */}
        <div className="md:col-span-3 space-y-6">
          
          {/* THÊM MỚI: Chỉ số tổng quan năng lực */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Điểm Trung Bình</p>
                <p className="text-2xl font-black text-gray-800">88.5<span className="text-base font-semibold text-gray-400">/120</span></p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-xl font-black">
                📊
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Điểm Cao Nhất</p>
                <p className="text-2xl font-black text-gray-800">92<span className="text-base font-semibold text-gray-400">/120</span></p>
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
                  {mockHistory.length > 0 ? (
                    mockHistory.map((exam) => (
                      <div key={exam.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border border-gray-100 rounded-xl hover:shadow-md hover:border-amber-100 transition-all bg-gray-50/50">
                        <div className="mb-4 sm:mb-0">
                          <h3 className="font-bold text-gray-800 text-lg">{exam.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">Hoàn thành: {exam.date}</p>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between items-center sm:items-end">
                          <div className="text-2xl font-black text-green-600">{exam.score}<span className="text-lg text-gray-400">/{exam.total}</span></div>
                          <Link to={`/review/${exam.id}`} className="text-sm text-amber-600 font-bold hover:text-amber-700 hover:underline mt-1">Xem chi tiết &rarr;</Link>
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
                  {mockOngoing.length > 0 ? (
                    mockOngoing.map((exam) => (
                      <div key={exam.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border border-gray-100 rounded-xl hover:shadow-md hover:border-amber-100 transition-all bg-gray-50/50">
                        <div className="mb-4 sm:mb-0">
                          <h3 className="font-bold text-gray-800 text-lg">{exam.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">Lưu lần cuối: {exam.lastSaved}</p>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-blue-100">Đã làm {exam.progress} câu</span>
                          <Link to={`/practice/${exam.id}`} className="px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-sm">
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