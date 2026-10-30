import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  status: 'published' | 'draft';
  students: number;
}

export const InstructorDashboard = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'courses' | 'questions' | 'students'>('courses');
  
  const [showModal, setShowModal] = useState(false);
  
  // 1. STATE LƯU TRỮ DANH SÁCH KHÓA HỌC
  const [courses, setCourses] = useState<Course[]>([
    { id: '1', title: 'Toán Logic & Phân tích số liệu V-ACT', status: 'published', students: 120 },
    { id: '2', title: 'Ngôn ngữ Tiếng Việt nâng cao', status: 'draft', students: 0 }
  ]);

  // 2. STATE CHO CÁC Ô NHẬP LIỆU TRONG FORM
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // 3. HÀM XỬ LÝ LƯU KHÓA HỌC MỚI
  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Tạo object khóa học mới
    const newCourse: Course = {
      id: Date.now().toString(), // Tạo ID ngẫu nhiên bằng thời gian thực
      title: newTitle,
      status: 'draft',           // Mặc định tạo ra là bản nháp
      students: 0
    };

    // Nối khóa học mới vào danh sách cũ
    setCourses([...courses, newCourse]);
    
    // Xóa trắng form và đóng popup
    setNewTitle("");
    setNewDesc("");
    setShowModal(false);
  };

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* SIDEBAR BÊN TRÁI */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-100">
          <Link to="/" className="text-xl font-black text-amber-500 uppercase tracking-wide">
            V-ACT Instructor
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{user?.name}</p>
              <p className="text-xs text-green-600 font-semibold">Giảng viên</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('courses')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === 'courses' ? 'bg-amber-50 text-amber-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Quản lý Khóa học & Đề thi
          </button>
          <button 
            onClick={() => setActiveTab('questions')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === 'questions' ? 'bg-amber-50 text-amber-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Ngân hàng Câu hỏi
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === 'students' ? 'bg-amber-50 text-amber-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Kết quả Học viên
          </button>
        </nav>
      </div>

      {/* KHU VỰC NỘI DUNG CHÍNH BÊN PHẢI */}
      <div className="flex-1 overflow-auto p-8 bg-gray-50 relative">
        {activeTab === 'courses' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Quản lý Khóa học</h1>
              <button 
                onClick={() => setShowModal(true)} 
                className="px-5 py-2.5 bg-amber-500 text-white font-bold text-sm rounded-lg shadow hover:bg-amber-600 transition-colors"
              >
                + Tạo khóa học mới
              </button>
            </div>
            
            {/* DANH SÁCH KHÓA HỌC (TABLE) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                    <th className="p-4 font-bold uppercase tracking-wider">Tên khóa học</th>
                    <th className="p-4 font-bold uppercase tracking-wider">Trạng thái</th>
                    <th className="p-4 font-bold uppercase tracking-wider">Số học viên</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => (
                    <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold text-gray-800">{course.title}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {course.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-gray-600">{course.students}</td>
                      <td className="p-4 text-right space-x-3">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-bold">Chỉnh sửa</button>
                        <button className="text-red-600 hover:text-red-800 text-sm font-bold">Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {courses.length === 0 && (
                <div className="p-12 text-center text-gray-500 font-medium">
                  Chưa có khóa học nào được tạo.
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL (CỬA SỔ BẬT LÊN) ĐỂ TẠO KHÓA HỌC */}
        {showModal && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl transform transition-all">
              <h2 className="text-2xl font-black mb-6 text-gray-800">Tạo khóa học mới</h2>
              
              {/* Gắn hàm handleCreateCourse vào form */}
              <form onSubmit={handleCreateCourse}>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tên khóa học</label>
                    {/* Bổ sung bg-white và text-gray-900, liên kết value với state */}
                    <input 
                      type="text" 
                      required 
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-amber-500 focus:border-amber-500" 
                      placeholder="VD: Toán Logic V-ACT 2026..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả ngắn</label>
                    {/* Bổ sung bg-white và text-gray-900, liên kết value với state */}
                    <textarea 
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-amber-500 focus:border-amber-500" 
                      rows={3} 
                      placeholder="Giới thiệu về khóa học..."
                    ></textarea>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                    Hủy bỏ
                  </button>
                  <button type="submit" className="px-5 py-2.5 font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md transition-colors">
                    Tạo khóa học
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CÁC TAB KHÁC... */}
        {activeTab === 'questions' && (
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Ngân hàng Câu hỏi</h1>
            <p className="text-gray-600">Khu vực quản lý 400+ câu hỏi trắc nghiệm, gắn thẻ chủ đề và độ khó.</p>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Kết quả Học viên</h1>
            <p className="text-gray-600">Thống kê điểm số và thời gian làm bài trung bình của từng học viên.</p>
          </div>
        )}
      </div>
    </div>
  );
};