import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { toast, confirmDialog } from "../../store/uiStore";
import { authService } from "../../services/auth.service";
import "./home.css";
import { BRAND, ROUTES, STR } from "./strings";

interface FeaturedExam {
  id: string;
  title: string;
  description: string | null;
  _count?: { questions: number };
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

  // Chỉ coi là đã đăng nhập khi cả isAuthenticated === true VÀ có thông tin user + token
  const isLoggedIn = isAuthenticated && !!user;

  return (
    <header className="sticky top-0 z-10 border-b border-amber-100 bg-[#fdfbf7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          to={ROUTES.home}
          className="text-xl font-extrabold tracking-tight text-blue-900"
        >
          {BRAND}
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-gray-700 md:flex">
          <a href="#courses" className="hover:text-amber-600">
            {STR.nav.course}
          </a>
          <a href="#featured" className="hover:text-amber-600">
            {STR.nav.exams}
          </a>
          <a href="#how" className="hover:text-amber-600">
            {STR.nav.how}
          </a>
          <a href="#structure" className="hover:text-amber-600">
            {STR.nav.structure}
          </a>
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              {user?.role === "ADMIN" && (
                <Link
                  to="/admin/dashboard"
                  className="text-xs font-extrabold px-3 py-1.5 rounded-lg bg-purple-100 text-purple-800 hover:bg-purple-200"
                >
                  Quản trị viên
                </Link>
              )}
              <Link
                to="/profile"
                className="flex items-center gap-2 font-bold text-gray-800 hover:text-amber-600 transition-colors"
                title="Xem Hồ sơ năng lực Elo"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || "H"}
                </div>
                <span>{user?.name || "Học viên"}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 font-semibold text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:border-red-200 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <>
              <Link
                to={ROUTES.login}
                className="px-4 py-2 font-bold text-blue-900 hover:text-amber-600 transition"
              >
                {STR.nav.login}
              </Link>
              <Link
                to={ROUTES.register}
                className="rounded-xl bg-amber-500 px-5 py-2.5 font-extrabold text-white shadow-sm transition hover:bg-amber-600"
              >
                {STR.nav.register}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { isAuthenticated, user } = useAuthStore();
  const isLoggedIn = isAuthenticated && !!user;

  return (
    <section className="border-b border-amber-100/80">
      <div className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
        <span className="inline-block rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
          {STR.hero.badge}
        </span>
        <h1 className="mt-5 text-3xl font-extrabold leading-tight text-blue-900 md:text-5xl">
          {STR.hero.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-600 md:text-lg">
          {STR.hero.subtitle}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {isLoggedIn ? (
            <>
              <Link
                to={ROUTES.exams}
                className="rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-amber-600"
              >
                {STR.hero.ctaPrimary}
              </Link>
              <Link
                to="/profile"
                className="rounded-xl border-2 border-blue-900 bg-white px-7 py-3.5 text-sm font-extrabold text-blue-900 transition hover:bg-blue-50"
              >
                Xem Hồ sơ Năng lực Elo
              </Link>
            </>
          ) : (
            <>
              <Link
                to={ROUTES.login}
                className="rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-amber-600"
              >
                Đăng nhập để Bắt đầu học
              </Link>
              <Link
                to={ROUTES.register}
                className="rounded-xl border-2 border-amber-500 bg-white px-7 py-3.5 text-sm font-extrabold text-amber-600 transition hover:bg-amber-50"
              >
                {STR.hero.ctaSecondary}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section
      id="how"
      className="border-b border-amber-100/80 bg-amber-50/40 py-16"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-2xl font-extrabold text-blue-900 md:text-3xl">
          {STR.how.title}
        </h2>

        <ol className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STR.how.steps.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-sm font-extrabold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ExamStructure() {
  const total = STR.structure.sections.reduce((s, x) => s + x.questions, 0);

  return (
    <section
      id="structure"
      className="border-b border-amber-100/80 bg-amber-50/40 py-16"
    >
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-2xl font-extrabold text-blue-900 md:text-3xl">
          {STR.structure.title}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {STR.structure.summary}
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STR.structure.sections.map((s) => {
            const pct = Math.round((s.questions / total) * 100);
            return (
              <div
                key={s.name}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="text-2xl font-extrabold text-amber-600">
                  {s.questions}{" "}
                  <span className="text-xs font-semibold text-gray-500">
                    {STR.structure.unit}
                  </span>
                </div>
                <div className="mt-1 text-sm font-bold text-gray-800">
                  {s.name}
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          {STR.structure.source}
        </p>
      </div>
    </section>
  );
}

function Courses() {
  return (
    <section id="courses" className="border-b border-amber-100/80 py-16">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-2xl font-extrabold text-blue-900 md:text-3xl">
          {STR.courses.title}
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STR.courses.items.map((c) => (
            <div
              key={c.title}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div>
                <h3 className="text-center text-lg font-bold text-gray-900">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{c.text}</p>
              </div>
              <div className="mt-6 flex justify-center">
                <Link
                  to={c.link}
                  className="inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-amber-600"
                >
                  {STR.courses.open}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedExams() {
  const exams: FeaturedExam[] = [
    {
      id: "vact-exam-2026",
      title: "Đề minh họa ĐGNL ĐHQG TPHCM năm 2026",
      description: "Bộ đề thi chuẩn cấu trúc mới nhất năm 2026.",
      _count: { questions: 30 },
    },
    {
      id: "vact-exam-2025",
      title: "Đề minh họa ĐGNL ĐHQG TPHCM năm 2025",
      description:
        "Đề thi chính thức và minh họa lưu trữ năm 2025, rèn luyện tư duy logic và phân tích số liệu.",
      _count: { questions: 6 },
    },
    {
      id: "vact-exam-2024",
      title: "Đề minh họa ĐGNL ĐHQG TPHCM năm 2024",
      description:
        "Bộ đề ôn tập nền tảng từ kỳ thi ĐGNL năm 2024, củng cố kiến thức cơ bản.",
      _count: { questions: 6 },
    },
  ];

  return (
    <section id="featured" className="py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-end justify-between">
          <h2 className="mx-auto text-center text-2xl font-extrabold text-blue-900 md:text-3xl">
            {STR.featured.title}
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div>
                <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Chuẩn cấu trúc ĐGNL
                </span>
                <h3 className="mt-3 text-lg font-bold text-gray-900">
                  {exam.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                  {exam.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-xs font-semibold text-gray-500">
                  {exam._count?.questions ?? 0} {STR.featured.questions}
                </span>
                <Link
                  to={`${ROUTES.practice}/${exam.id}`}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-600"
                >
                  VÀO HỌC
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to={ROUTES.exams}
            className="inline-block rounded-xl border border-orange-500 px-6 py-2.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
          >
            {STR.featured.all}
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8 text-xs text-gray-500">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 sm:flex-row sm:items-center">
        <div>
          <span className="font-bold text-gray-700">{BRAND}</span> —{" "}
          {STR.footer.project}
        </div>
        <div className="text-gray-400">{STR.footer.disclaimer}</div>
      </div>
    </footer>
  );
}

export function HomePage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] text-gray-800">
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

export default HomePage;