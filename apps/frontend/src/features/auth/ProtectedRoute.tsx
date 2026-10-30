import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  allowedRoles: Array<'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>;
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();

  // Nếu chưa đăng nhập -> Đuổi về trang login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Nếu đã đăng nhập nhưng KHÔNG ĐÚNG QUYỀN -> Đuổi về trang chủ hoặc báo lỗi 403
  if (!allowedRoles.includes(user.role)) {
    alert("Bạn không có quyền truy cập trang này!");
    return <Navigate to="/" replace />;
  }

  // Nếu hợp lệ -> Cho phép đi tiếp vào giao diện bên trong
  return <Outlet />;
};