import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link, useNavigate } from "react-router-dom";

// 1. Cập nhật Enum in hoa cho khớp với Prisma Backend
type UserStatus = "ACTIVE" | "PENDING" | "LOCKED" | "REJECTED";

interface SystemUser {
  id: string;
  fullName: string; // Đổi name thành fullName theo schema của bạn
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  status: UserStatus;
  createdAt: string;
}

export const AdminDashboard = () => {
  const { user, token, logout } = useAuthStore(); // Lấy thêm token nếu hệ thống bạn đã có JWT
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "users" | "courses" | "reports" | "stats"
  >("users");

  // 2. Dữ liệu thật từ State
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // BASE_URL của NestJS backend
  const API_URL = "http://localhost:3000/api/users";

  // --- LOGIC GỌI API ---

  // Lấy danh sách user từ Backend
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token || ""}`, // Gắn token nếu cần Guard
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách người dùng:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Tự động chạy fetchUsers khi component được load
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  // Xử lý Duyệt giảng viên
  const handleApprove = async (userId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn duyệt giảng viên này?")) {
      try {
        await fetch(`${API_URL}/${userId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({ status: "ACTIVE" }),
        });
        fetchUsers(); // Load lại bảng sau khi cập nhật thành công
      } catch (error) {
        console.error("Lỗi duyệt:", error);
      }
    }
  };

  // Xử lý Từ chối giảng viên
  const handleReject = async (userId: string) => {
    if (window.confirm("Từ chối cấp quyền cho giảng viên này?")) {
      try {
        await fetch(`${API_URL}/${userId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({ status: "REJECTED" }),
        });
        fetchUsers();
      } catch (error) {
        console.error("Lỗi từ chối:", error);
      }
    }
  };

  // Xử lý Khóa / Mở khóa tài khoản
  const handleToggleLock = async (
    userId: string,
    currentStatus: UserStatus,
  ) => {
    const isLocking = currentStatus === "ACTIVE";
    const confirmMsg = isLocking
      ? "Khóa tài khoản này? Người dùng sẽ không thể đăng nhập."
      : "Mở khóa cho tài khoản này hoạt động lại?";

    if (window.confirm(confirmMsg)) {
      try {
        await fetch(`${API_URL}/${userId}/toggle-lock`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        fetchUsers();
      } catch (error) {
        console.error("Lỗi thay đổi trạng thái khóa:", error);
      }
    }
  };

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) {
      logout(); // Xóa token/user trong global state
      navigate("/login"); // Đẩy về trang đăng nhập
    }
  };

  // Hàm hiển thị Badge trạng thái (Đã cập nhật key in hoa)
  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">
            Đang hoạt động
          </span>
        );
      case "PENDING":
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700">
            Chờ phê duyệt
          </span>
        );
      case "LOCKED":
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">
            Đã bị khóa
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-200 text-gray-600">
            Bị từ chối
          </span>
        );
      default:
        return null;
    }
  };

  // --- GIAO DIỆN UI (Giữ nguyên cấu trúc, chỉ cập nhật biến mapping) ---
  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <Link
            to="/"
            className="text-xl font-black text-white uppercase tracking-wide"
          >
            V-ACT Admin
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {user?.name || "Quản trị viên"}
              </p>
              <p className="text-xs text-amber-500 font-semibold">
                Administrator
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === "users" ? "bg-amber-500 text-white" : "text-slate-300 hover:bg-slate-800"}`}
          >
            Quản lý Người dùng
          </button>
          <button
            onClick={() => setActiveTab("courses")}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === "courses" ? "bg-amber-500 text-white" : "text-slate-300 hover:bg-slate-800"}`}
          >
            Quản lý Khóa học
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === "reports" ? "bg-amber-500 text-white" : "text-slate-300 hover:bg-slate-800"}`}
          >
            Kiểm duyệt Nội dung
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === "stats" ? "bg-amber-500 text-white" : "text-slate-300 hover:bg-slate-800"}`}
          >
            Thống kê & Audit Log
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 rounded-lg font-bold text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-8 bg-gray-50 relative">
        {activeTab === "users" && (
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">
              Quản lý Người dùng
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                    <th className="p-4 font-bold uppercase tracking-wider">
                      Họ và tên
                    </th>
                    <th className="p-4 font-bold uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="p-4 font-bold uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="p-4 font-bold uppercase tracking-wider text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-gray-500 font-medium"
                      >
                        Không có người dùng nào.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((sysUser) => (
                      <tr
                        key={sysUser.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="p-4 font-bold text-gray-800">
                          {sysUser.fullName || "Chưa cập nhật"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full ${sysUser.role === "INSTRUCTOR" ? "bg-blue-100 text-blue-700" : sysUser.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-gray-200 text-gray-700"}`}
                          >
                            {sysUser.role}
                          </span>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(sysUser.status)}
                        </td>
                        <td className="p-4 text-right space-x-3">
                          {/* Phê duyệt giảng viên */}
                          {sysUser.role === "INSTRUCTOR" &&
                            sysUser.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => handleApprove(sysUser.id)}
                                  className="text-green-600 hover:text-green-800 text-sm font-bold"
                                >
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => handleReject(sysUser.id)}
                                  className="text-gray-500 hover:text-gray-700 text-sm font-bold"
                                >
                                  Từ chối
                                </button>
                              </>
                            )}

                          {/* Khóa/Mở khóa */}
                          {(sysUser.status === "ACTIVE" ||
                            sysUser.status === "LOCKED") &&
                            sysUser.role !== "ADMIN" && (
                              <button
                                onClick={() =>
                                  handleToggleLock(sysUser.id, sysUser.status)
                                }
                                className={`text-sm font-bold ${sysUser.status === "ACTIVE" ? "text-red-600 hover:text-red-800" : "text-blue-600 hover:text-blue-800"}`}
                              >
                                {sysUser.status === "ACTIVE"
                                  ? "Khóa tài khoản"
                                  : "Mở khóa"}
                              </button>
                            )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "courses" && (
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">
              Bao quát Khóa học
            </h1>
          </div>
        )}
        {activeTab === "reports" && (
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">
              Kiểm duyệt Nội dung
            </h1>
          </div>
        )}
        {activeTab === "stats" && (
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">
              Thống kê & Audit Log
            </h1>
          </div>
        )}
      </div>
    </div>
  );
};
