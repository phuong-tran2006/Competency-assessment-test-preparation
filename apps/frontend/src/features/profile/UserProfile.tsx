import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const UserProfile = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'history' | 'ongoing'>('history');

  // TODO: Thay thế bằng dữ liệu gọi từ API Backend (VD: quizService.getHistory())
  const mockHistory = [
    { id: '1', title: 'Đề minh họa ĐGNL ĐHQG TPHCM 2026', score: 85, total: 120, date: '30/10/2026' },
    { id: '2', title: 'Đề thi thử V-ACT số 1', score: 92, total: 120, date: '25/10/2026' },
  ];

  const mockOngoing = [
    { id: '3', title: 'Đề thi thử V-ACT số 2', progress: 45, lastSaved: 'Hôm nay' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* CỘT TRÁI: THÔNG TIN NGƯỜI DÙNG */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center sticky top-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center text-4xl font-black shadow-md mb-4">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{user?.name || 'Học viên V-ACT'}</h2>
            <p className="text-sm text-gray-500 mb-6">{user?.email || 'Chưa cập nhật email'}</p>
            
            <div className="border-t border-gray-100 pt-4 text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ngày tham gia:</span>
                <span className="font-semibold text-gray-800">Tháng 10/2026</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tổng bài đã nộp:</span>
                <span className="font-semibold text-gray-800">{mockHistory.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: QUẢN LÝ BÀI THI */}
        <div className="md:col-span-3">
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
                      <div key={exam.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:shadow-md transition">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{exam.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">Hoàn thành: {exam.date}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-green-600">{exam.score}/{exam.total}</div>
                          <Link to={`/review/${exam.id}`} className="text-sm text-blue-600 font-semibold hover:underline">Xem chi tiết</Link>
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
                      <div key={exam.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:shadow-md transition">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{exam.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">Lưu lần cuối: {exam.lastSaved}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Đã làm {exam.progress} câu</span>
                          <Link to={`/practice/${exam.id}`} className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition">
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