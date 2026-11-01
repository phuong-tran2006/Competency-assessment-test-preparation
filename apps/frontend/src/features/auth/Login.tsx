import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore"; // 1. IMPORT STORE VÀO ĐÂY

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 2. LẤY HÀM setAuth TỪ ZUSTAND STORE
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      const token =
        response.access_token || response.token || response.accessToken;

      const rawRole = response.user?.role || "STUDENT";
      const normalizedRole =
        rawRole.toUpperCase() === "LEARNER" ? "STUDENT" : rawRole.toUpperCase();

      // Lấy user từ backend và "ép" (mock) thêm trường role để test
      const user = {
        ...response.user,
        role: normalizedRole,
      };

      // 3. GỌI GLOBAL STATE ZUSTAND
      if (token && user) {
        setAuth(user, token);
      }

      alert("Đăng nhập thành công!");
      if (user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (user.role === "INSTRUCTOR") {
        navigate("/instructor"); // Điều chỉnh lại path này nếu route giảng viên của bạn khác
      } else {
        navigate("/");
      }
    } catch (err: any) {
      console.error("Lỗi đăng nhập:", err);
      // 4. BẮT LỖI CHI TIẾT TỪ BACKEND NHƯ BÊN REGISTER
      setError(
        err.response?.data?.message ||
          "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-black text-amber-500 uppercase tracking-wide">
          V-ACT Luyện Thi ĐGNL
        </h2>
        <h2 className="mt-2 text-center text-xl font-bold text-gray-800">
          Đăng nhập vào tài khoản của bạn
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg font-medium">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-bold text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                  placeholder="nhap_email@gmail.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700">
                Mật khẩu
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-md text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all disabled:opacity-50 uppercase tracking-wider"
              >
                {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="font-bold text-amber-600 hover:text-amber-500"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
