import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export type AppRole = 'LEARNER' | 'INSTRUCTOR' | 'ADMIN';

interface ProtectedRouteProps {
  allowedRoles: AppRole[];
}

// Backend trả role LEARNER; một số bản FE cũ lưu STUDENT nên cần map lại.
const ROLE_ALIASES: Record<string, AppRole> = {
  STUDENT: 'LEARNER',
  LEARNER: 'LEARNER',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
};

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const role = ROLE_ALIASES[String(user.role).toUpperCase()];

  // ADMIN đi được mọi trang để thuận tiện demo và kiểm thử
  if (!role || (role !== 'ADMIN' && !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
