import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { toast, confirmDialog } from "../../store/uiStore";
import { authService } from "../../services/auth.service";
import "./home.css";
import { BRAND, ROUTES, STR } from "./strings";
import ExamCard from "../../components/ExamCard";

type ExamSummary = {
  id: string | number;
  title: string;
  description?: string;
  questionCount?: number;
};

/* ---------- hooks ---------- */

function useFeaturedExams(limit = 3) {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const base = import.meta.env.VITE_API_URL ?? "";

    fetch(`${base}/exams`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list: ExamSummary[] = Array.isArray(data)
          ? data
          : (data.items ?? []);
        setExams(list.slice(0, limit));
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setExams([]);
        setLoading(false);
      });

    return () => controller.abort();
  }, [limit]);

  return { exams, loading };
}

/* ---------- sections ---------- */

function Navbar() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  // Đăng xuất qua service: xóa phiên store lẫn token, tránh trạng thái treo
  const handleLogout = async () => {
    const ok = await confirmDialog({
      title: "Đăng xuất khỏi tài khoản?",
      message: "Bạn sẽ cần đăng nhập lại để tiếp tục luyện thi.",
      confirmLabel: "Đăng xuất",
      tone: "danger",
    });
    if (!ok) return;

    await authService.logout();
    toast.info("Đã đăng xuất", "Hẹn gặp lại bạn.");
    navigate("/login", { replace: true });
  };

  // Xác định đường dẫn khi click vào Avatar tùy theo Role
  const getProfileRoute = () => {
    if (user?.role === "INSTRUCTOR") return "/instructor";
    if (user?.role === "ADMIN") return "/admin/dashboard";
    return "/profile";
  };

  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="w-full px-4 lg:px-12 py-4 flex items-center justify-between mx-auto">
        {/* LOGO */}
        <Link
          to={ROUTES.home}
          className="text-2xl font-black text-blue-900 tracking-wide hover:opacity-80 transition"
        >
          {BRAND}
        </Link>

        {/* MENU LINK CHÍNH - Thay đổi linh hoạt theo Role */}
        <nav
          className="hidden md:flex gap-8 items-center"
          aria-label="Điều hướng chính"
        >
          {user?.role === "INSTRUCTOR" ? (
            <>
              <Link
                to="/instructor"
                className="font-semibold text-gray-600 hover:text-amber-500 transition-colors"
              >
                Quản lý Khóa học
              </Link>
              <Link
                to="/instructor"
                className="font-semibold text-gray-600 hover:text-amber-500 transition-colors"
              >
                Ngân hàng Câu hỏi
              </Link>
              <Link
                to="/instructor"
                className="font-semibold text-gray-600 hover:text-amber-500 transition-colors"
              >
                Kết quả Học viên
              </Link>
            </>
          ) : (
            <>
              <a
                href="#courses"
                className="font-semibold text-gray-600 hover:text-amber-500 transition-colors"
              >
                Khóa học
              </a>
              <Link
                to={ROUTES.exams}
                className="font-semibold text-gray-600 hover:text-amber-500 transition-colors"
              >
                {STR.nav.exams}
              </Link>
              <a
                href="#how"
                className="font-semibold text-gray-600 hover:text-amber-500 transition-colors"
              >
                {STR.nav.how}
              </a>
              <a
                href="#structure"
                className="font-semibold text-gray-600 hover:text-amber-500 transition-colors"
              >
                {STR.nav.structure}
              </a>
            </>
          )}
        </nav>

        {/* KHU VỰC TÀI KHOẢN */}
        <div>
          {isAuthenticated ? (
            <div className="flex items-center gap-5">
              <Link
                to={getProfileRoute()}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="font-bold text-gray-800 hover:text-amber-600">
                  {user?.name || "Học viên"}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="text-sm font-bold text-gray-500 hover:text-red-500 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to={ROUTES.login}
                className="text-sm font-bold text-blue-900 hover:text-blue-700 transition"
              >
                Đăng nhập
              </Link>
              <Link
                to={ROUTES.register}
                className="px-6 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg shadow-md hover:bg-amber-600 transition"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { isAuthenticated, user } = useAuthStore();
  const isInstructor = user?.role === "INSTRUCTOR";

  return (
    <section className="hero">
      <div className="container hero__inner">
        <span className="tag">
          {isInstructor ? "Khu vực Quản trị Giảng viên" : STR.hero.badge}
        </span>
        <h1 className="hero__title">
          {isInstructor
            ? `Xin chào, ${user?.name || "Giảng viên"}! Quản lý học tập hiệu quả.`
            : STR.hero.title}
        </h1>
        <p className="hero__subtitle">
          {isInstructor
            ? "Hệ thống hỗ trợ biên soạn khóa học, quản lý ngân hàng câu hỏi gắn thẻ (tags) và theo dõi kết quả đánh giá năng lực của học viên."
            : STR.hero.subtitle}
        </p>
        <div className="hero__cta">
          {isInstructor ? (
            <Link to="/instructor" className="btn btn--primary btn--lg">
              Vào Bảng điều khiển Quản trị
            </Link>
          ) : (
            <>
              <Link to={ROUTES.exams} className="btn btn--primary btn--lg">
                {STR.hero.ctaPrimary}
              </Link>
              {!isAuthenticated && (
                <Link to={ROUTES.register} className="btn btn--outline btn--lg">
                  {STR.hero.ctaSecondary}
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { user } = useAuthStore();
  if (user?.role === "INSTRUCTOR") return null; // Ẩn phần hướng dẫn học viên nếu là giảng viên

  return (
    <section id="how" className="section section--tint">
      <div className="container">
        <h2 className="section__title">{STR.how.title}</h2>
        <ol className="grid grid--4 steps">
          {STR.how.steps.map((step, index) => (
            <li
              key={step.title}
              className={`card step ${step.available ? "" : "step--soon"}`}
            >
              <span className="step__number">{index + 1}</span>
              <h3 className="card__title">{step.title}</h3>
              <p className="card__text">{step.text}</p>
              {!step.available && <span className="badge">{STR.how.soon}</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ExamStructure() {
  const { user } = useAuthStore();
  if (user?.role === "INSTRUCTOR") return null;

  return (
    <section id="structure" className="section">
      <div className="container">
        <h2 className="section__title">{STR.structure.title}</h2>
        <p className="section__lead">{STR.structure.summary}</p>
        <div className="grid grid--5">
          {STR.structure.sections.map((s) => (
            <div key={s.name} className="card stat">
              <span className="stat__number">{s.questions}</span>
              <span className="stat__unit">{STR.structure.unit}</span>
              <span className="stat__label">{s.name}</span>
            </div>
          ))}
        </div>
        <p className="note">{STR.structure.source}</p>
      </div>
    </section>
  );
}

function FeaturedExams() {
  const { user } = useAuthStore();

  // Dữ liệu tĩnh tạm thời để test giao diện
  // Sau khi backend có data, bạn dùng lại useFeaturedExams(3) để fetch API
  const exams = [
    {
      id: "dgnl-2026",
      title: "Đề minh họa ĐGNL ĐHQG TPHCM năm 2026",
      description: "Bộ đề thi chuẩn cấu trúc mới nhất năm 2026.",
      questionCount: 30,
    },
    {
      id: "dgnl-2025",
      title: "Đề minh họa ĐGNL ĐHQG TPHCM năm 2025",
      description:
        "Đề thi chính thức và minh họa lưu trữ năm 2025, rèn luyện tư duy logic và phân tích số liệu.",
      questionCount: 6,
    },
    {
      id: "dgnl-2024",
      title: "Đề minh họa ĐGNL ĐHQG TPHCM năm 2024",
      description:
        "Bộ đề ôn tập nền tảng từ kỳ thi ĐGNL năm 2024, củng cố kiến thức cơ bản.",
      questionCount: 6,
    },
  ];

  // Nếu là giảng viên (Giữ nguyên như code cũ của bạn)
  if (user?.role === "INSTRUCTOR") {
    return (
      <section className="section section--tint">
        {/* ... (Giữ nguyên phần code dành cho INSTRUCTOR từ dòng 173 - 210) ... */}
      </section>
    );
  }

  // --- GIAO DIỆN BỘ ĐỀ DÀNH CHO HỌC VIÊN (Thay đổi phần này) ---
  return (
    <section className="bg-[#FFFDF5] py-20">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-blue-900 mb-12">
          Bộ đề luyện tập
        </h2>

        {exams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 mb-8">Chưa có bộ đề nào để hiển thị.</p>
        )}

        <Link to={ROUTES.exams}>
          <button className="border-2 border-orange-400 text-orange-500 hover:bg-orange-50 font-bold py-3 px-8 rounded-lg transition-colors">
            Xem tất cả bộ đề
          </button>
        </Link>
      </div>
    </section>
  );
}

function Courses() {
  const { user } = useAuthStore();
  if (user?.role === "INSTRUCTOR") return null;

  return (
    <section id="courses" className="section">
      <div className="container">
        <h2 className="section__title text-center">Khóa học</h2>
        <div className="grid grid--3">
          {STR.courses.items.map((course) => (
            <article key={course.title} className="card">
              <h3 className="card__title font-bold text-center">
                {course.title}
              </h3>
              <p className="card__text">{course.text}</p>

              {/* Thêm div bọc ngoài để căn giữa nút */}
              <div className="flex justify-center w-full mt-4">
                <Link to={course.link} className="btn btn--primary">
                  {STR.courses.open}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>{STR.footer.project}</p>
        <p className="footer__disclaimer">{STR.footer.disclaimer}</p>
      </div>
    </footer>
  );
}

/* ---------- page ---------- */

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.role === "ADMIN") {
      navigate("/admin/dashboard", { replace: true });
    } else if (user?.role === "INSTRUCTOR") {
      navigate("/instructor", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="home">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <ExamStructure />
        <Courses />
        <FeaturedExams />
      </main>
      <Footer />
    </div>
  );
}
