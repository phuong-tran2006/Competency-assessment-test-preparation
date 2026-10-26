import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tải danh sách đề thi từ Backend để hiển thị trực quan lên Dashboard Admin
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await api.get('/exams');
        setExams(response.data);
      } catch (err) {
        console.error('Lỗi khi tải danh sách đề thi cho Admin:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar Quản trị độc lập */}
      <nav className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-black bg-amber-500 px-3 py-1 rounded-lg text-white">V-ACT ADMIN</span>
          <span className="text-sm text-gray-300">Hệ thống Quản lý Nền tảng Luyện thi ĐGNL</span>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/admin/create-exam')}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm transition shadow-sm"
          >
            + Tạo đề thi mới
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Đăng xuất
          </button>
        </div>
      </nav>

      {/* Nội dung Dashboard Quản trị */}
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Tổng quan hệ thống quản trị</h1>

        {/* Các thẻ thống kê */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-semibold uppercase">Tổng số Bộ đề thi</h3>
            <p className="text-4xl font-extrabold text-blue-600 mt-2">{exams.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-semibold uppercase">Ngân hàng Câu hỏi</h3>
            <p className="text-4xl font-extrabold text-amber-600 mt-2">120</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-semibold uppercase">Học viên tham gia</h3>
            <p className="text-4xl font-extrabold text-green-600 mt-2">15</p>
          </div>
        </div>

        {/* Bảng quản lý đề thi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Quản lý Danh sách Bộ đề thi</h2>
            <button 
              onClick={() => navigate('/courses')}
              className="text-sm text-amber-600 font-semibold hover:underline"
            >
              Xem giao diện Học viên →
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-6">Đang tải dữ liệu...</p>
          ) : exams.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Chưa có bộ đề thi nào được tạo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 text-xs font-bold uppercase">
                    <th className="py-3 px-4">Mã Đề (ID)</th>
                    <th className="py-3 px-4">Tiêu đề bộ đề</th>
                    <th className="py-3 px-4">Mô tả</th>
                    <th className="py-3 px-4 text-center">Số câu hỏi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-gray-50 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500">{exam.id}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{exam.title}</td>
                      <td className="py-3.5 px-4 text-gray-600 truncate max-w-xs">{exam.description || 'Không có mô tả'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold">
                          {exam._count?.questions || 0} câu
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};