import { useNavigate, Link } from 'react-router-dom';

interface BackButtonProps {
  /** Đường dẫn cố định. Bỏ trống thì quay lại trang trước trong lịch sử. */
  to?: string;
  label?: string;
  /** solid: nền trắng viền xám (dùng trên nền xám). ghost: không viền. */
  variant?: 'solid' | 'ghost';
  className?: string;
}

const ARROW = (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const STYLES: Record<'solid' | 'ghost', string> = {
  solid:
    'bg-white border border-gray-200 text-gray-700 shadow-sm hover:border-amber-400 hover:text-amber-600',
  ghost: 'text-gray-600 hover:bg-amber-50 hover:text-amber-600',
};

/**
 * Nút quay lại dùng chung. Theo phong cách trang chủ: bo góc lớn, chữ bold,
 * màu nhấn amber, mũi tên dịch nhẹ sang trái khi hover.
 */
export const BackButton = ({
  to,
  label = 'Quay lại',
  variant = 'solid',
  className = '',
}: BackButtonProps) => {
  const navigate = useNavigate();

  const base = `group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${STYLES[variant]} ${className}`;

  const content = (
    <>
      <span className="transition-transform group-hover:-translate-x-0.5">
        {ARROW}
      </span>
      {label}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={base}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => navigate(-1)} className={base}>
      {content}
    </button>
  );
};
