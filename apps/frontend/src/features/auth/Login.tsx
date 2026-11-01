import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../services/auth.service";
import { toast } from "../../store/uiStore";
import { BackButton } from "../../components/BackButton";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // authService.login đã ghi { user, accessToken } vào authStore
      const response = await authService.login(email, password);
      if (!response.accessToken) {
        throw new Error("Máy chủ không trả về token đăng nhập.");
      }

      // Mỗi vai trò có trang chủ riêng
      const role = String(response.user?.role ?? "").toUpperCase();
      const landing =
        role === "ADMIN"
          ? "/admin/dashboard"
          : role === "INSTRUCTOR"
            ? "/instructor"
            : "/";

      toast.success(
        "Đăng nhập thành công",
        `Xin chào ${response.user?.fullName || response.user?.email}.`,
      );
      navigate(landing, { replace: true });
    } catch (err: any) {
      console.error("Lỗi đăng nhập:", err);
      const message =
        err.response?.data?.message ||
        "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.";
      const text = Array.isArray(message) ? message.join(" ") : message;
      setError(text);
      toast.error("Đăng nhập thất bại", text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
        <BackButton to="/" label="Về trang chủ" />
      </div>

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
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  placeholder="nhap_email@student.vn"
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
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
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
