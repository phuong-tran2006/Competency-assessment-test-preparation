import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import type { AppRole } from '../../types/auth.types';

interface ProtectedRouteProps {
  allowedRoles: AppRole[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role;

  // ADMIN đi được mọi trang để thuận tiện demo và kiểm thử
  if (!role || (role !== 'ADMIN' && !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
