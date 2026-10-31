import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface ProtectedRouteProps {
  allowedRoles: Array<"STUDENT" | "INSTRUCTOR" | "ADMIN">;
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();

  console.log("DỮ LIỆU USER HIỆN TẠI:", user);

  // 1. Nếu chưa đăng nhập -> Đuổi về trang login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Chuyển đổi role của user và danh sách cho phép về chữ IN HOA để so sánh an toàn tuyệt đối
  const userRole = (user.role || "").trim().toUpperCase();
  const upperAllowedRoles = allowedRoles.map((r) => r.toUpperCase());

  // 3. Nếu không nằm trong danh sách quyền -> Chặn lại
  if (!upperAllowedRoles.includes(userRole)) {
    alert("Bạn không có quyền truy cập trang này!");
    return <Navigate to="/" replace />;
  }

  // 4. Hợp lệ -> Cho phép đi tiếp
  return <Outlet />;
};
