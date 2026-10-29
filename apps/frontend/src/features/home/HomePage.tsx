// src/features/home/HomePage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./home.css";
import { BRAND, ROUTES, STR } from "./strings";

type CurrentUser = { name: string } | null;

// Adjust these field names to match what GET /exams really returns.
type ExamSummary = {
  id: string | number;
  title: string;
  description?: string;
  questionCount?: number;
};

type HomePageProps = {
  /** Pass the logged-in user from your auth context, or null for a guest. */
  user?: CurrentUser;
};

/* ---------- data ---------- */

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

function Navbar({ user }: { user: CurrentUser }) {
  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to={ROUTES.home} className="nav__brand">
          {BRAND}
        </Link>
        <nav className="nav__links" aria-label="Điều hướng chính">
          <Link to={ROUTES.exams}>{STR.nav.exams}</Link>
          <a href="#how">{STR.nav.how}</a>
          <a href="#structure">{STR.nav.structure}</a>
        </nav>
        <div className="nav__actions">
          {user ? (
            <>
              <span className="nav__user">{user.name}</span>
              <Link to={ROUTES.exams} className="btn btn--primary">
                {STR.nav.enter}
              </Link>
            </>
          ) : (
            <>
              <Link to={ROUTES.login} className="btn btn--ghost">
                {STR.nav.login}
              </Link>
              <Link to={ROUTES.register} className="btn btn--primary">
                {STR.nav.register}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ user }: { user: CurrentUser }) {
  return (
    <section className="hero">
      <div className="container hero__inner">
        <span className="tag">{STR.hero.badge}</span>
        <h1 className="hero__title">{STR.hero.title}</h1>
        <p className="hero__subtitle">{STR.hero.subtitle}</p>
        <div className="hero__cta">
          <Link to={ROUTES.exams} className="btn btn--primary btn--lg">
            {STR.hero.ctaPrimary}
          </Link>
          {!user && (
            <Link to={ROUTES.register} className="btn btn--outline btn--lg">
              {STR.hero.ctaSecondary}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
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
  const { exams, loading } = useFeaturedExams(3);

  return (
    <section className="section section--tint">
      <div className="container">
        <h2 className="section__title">{STR.featured.title}</h2>

        {loading && <p className="note">{STR.featured.loading}</p>}
        {!loading && exams.length === 0 && (
          <p className="note">{STR.featured.empty}</p>
        )}

        <div className="grid grid--3">
          {exams.map((exam) => (
            <article key={exam.id} className="card exam">
              <h3 className="card__title">{exam.title}</h3>
              {exam.description && (
                <p className="card__text">{exam.description}</p>
              )}
              <div className="exam__footer">
                {typeof exam.questionCount === "number" && (
                  <span className="exam__count">
                    {exam.questionCount} {STR.featured.questions}
                  </span>
                )}
                <Link
                  to={`${ROUTES.practice}/${exam.id}`}
                  className="btn btn--primary"
                >
                  {STR.featured.open}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="center">
          <Link to={ROUTES.exams} className="btn btn--outline">
            {STR.featured.all}
          </Link>
        </div>
      </div>
    </section>
  );
}

function Courses() {
  return (
    <section className="section">
      <div className="container">
        <h2 className="section__title">{STR.courses.title}</h2>
        <div className="grid grid--3">
          {STR.courses.items.map((course) => (
            <article key={course.title} className="card">
              <h3 className="card__title">{course.title}</h3>
              <p className="card__text">{course.text}</p>
              <Link to={course.link} className="btn btn--primary">
                {STR.courses.open}
              </Link>
            </article>
          ))}
        </div>
        {STR.courses.loading && <p className="note">{STR.courses.loading}</p>}
        {!STR.courses.loading && STR.courses.items.length === 0 && (
          <p className="note">{STR.courses.empty}</p>
        )}
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

export function HomePage({ user = null }: HomePageProps) {
  return (
    <div className="home">
      <Navbar user={user} />
      <main>
        <Hero user={user} />
        <HowItWorks />
        <ExamStructure />
        <Courses />
        <FeaturedExams />
      </main>
      <Footer />
    </div>
  );
}
