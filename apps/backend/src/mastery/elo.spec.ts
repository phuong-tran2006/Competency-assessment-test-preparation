import { expectedScore, ratingToLevel, updateRating } from './elo';

describe('Elo mastery baseline', () => {
  it('rewards correct answers and lowers the score for wrong answers', () => {
    expect(updateRating(1200, 0.5, true)).toBeGreaterThan(1200);
    expect(updateRating(1200, 0.5, false)).toBeLessThan(1200);
  });
  it('rewards harder correct answers more and predicts success from mastery', () => {
    expect(updateRating(1200, 0.9, true)).toBeGreaterThan(updateRating(1200, 0.1, true));
    expect(expectedScore(1600, 0.5)).toBeGreaterThan(expectedScore(1000, 0.5));
  });
  it('retains the established level boundaries', () => {
    expect([999, 1000, 1300, 1600].map(ratingToLevel)).toEqual(['Yếu', 'Trung bình', 'Khá', 'Tốt']);
  });
});
