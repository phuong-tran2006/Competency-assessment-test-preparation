/**
 * Elo 1 phía cho mastery theo từng topic.
 *
 * Quy ước:
 * - rating: điểm mastery của sinh viên ở 1 topic (thang ~0-3000, khởi đầu 1200).
 * - expected = 1 / (1 + 10 ^ ((questionRating - rating) / 400))
 * - questionRating suy từ difficulty (0..1) -> thang 800..2000.
 * - K cố định 32.
 */
export const INITIAL_RATING = 1200;
export const K_FACTOR = 32;

export function questionRating(difficulty: number): number {
  const d = Math.min(1, Math.max(0, difficulty ?? 0.5));
  return 800 + d * 1200;
}

export function expectedScore(rating: number, difficulty: number): number {
  return 1 / (1 + Math.pow(10, (questionRating(difficulty) - rating) / 400));
}

export function updateRating(
  rating: number,
  difficulty: number,
  correct: boolean,
): number {
  const actual = correct ? 1 : 0;
  return Math.round((rating + K_FACTOR * (actual - expectedScore(rating, difficulty))) * 100) / 100;
}

export function ratingToLevel(rating: number): 'Yếu' | 'Trung bình' | 'Khá' | 'Tốt' {
  if (rating < 1000) return 'Yếu';
  if (rating < 1300) return 'Trung bình';
  if (rating < 1600) return 'Khá';
  return 'Tốt';
}
