import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export const CreateExamPage = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.post('/exams', {
        title,
        description,
        durationMinutes: Number(durationMinutes),
      });

      setMessage(`✅ Tạo bộ đề thi thành công! Mã đề: ${response.data.id}`);
      setTitle('');
      setDescription('');
      setTimeout(() => {
        navigate('/courses');
      }, 1500);
    } catch (err: any) {
      console.error('Lỗi khi tạo đề:', err);
      const errorMsg = err.response?.data?.message || 'Tạo đề thi thất bại. Vui lòng kiểm tra lại.';
      setMessage(`❌ ${Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-gray-800">Trang Giảng viên: Tạo bộ đề thi mới</h1>
          <button 
            onClick={() => navigate('/courses')}
            className="text-sm font-semibold text-amber-600 hover:underline"
          >
            ← Quay lại trang danh sách
          </button>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleCreateExam} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tiêu đề bộ đề thi</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Đề thi chính thức ĐGNL 2026 - Đề số 4" 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Thời gian làm bài (Phút)</label>
            <input 
              type="number" 
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả cấu trúc / Hướng dẫn</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả chi tiết nội dung đề thi..." 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm h-32"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-sm text-sm"
          >
            {loading ? 'Đang lưu vào hệ thống...' : 'Xác nhận Tạo bộ đề thi'}
          </button>
        </form>
      </div>
    </div>
  );
};