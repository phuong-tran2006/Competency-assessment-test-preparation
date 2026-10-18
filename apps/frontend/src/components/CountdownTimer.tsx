import { useEffect, useState } from 'react';

interface Props {
  initialSeconds: number;
  onTimeUp: () => void;
}

export const CountdownTimer = ({ initialSeconds, onTimeUp }: Props) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    
    // Cleanup interval khi component unmount để tránh rò rỉ bộ nhớ
    return () => clearInterval(timerId);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center gap-2 text-lg font-bold text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
      <span>⏳</span>
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};