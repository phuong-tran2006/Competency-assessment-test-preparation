export const DIFFICULTY_WEIGHT_BASE = 1;

export function questionWeight(difficulty: number): number {
  return DIFFICULTY_WEIGHT_BASE + difficulty;
}

export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isAnswerCorrect(
  selected: string[],
  correct: string[],
): boolean {
  const selectedSet = new Set(selected);
  if (selectedSet.size !== correct.length) return false;
  return correct.every((id) => selectedSet.has(id));
}
