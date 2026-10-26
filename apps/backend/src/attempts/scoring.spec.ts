import { isAnswerCorrect, questionWeight, roundScore } from './scoring';

describe('scoring', () => {
  describe('isAnswerCorrect', () => {
    it('đúng khi chọn đúng 1 đáp án', () => {
      expect(isAnswerCorrect(['a'], ['a'])).toBe(true);
    });

    it('sai khi chọn thiếu đáp án đúng (multi-select)', () => {
      expect(isAnswerCorrect(['a'], ['a', 'b'])).toBe(false);
    });

    it('sai khi chọn thừa đáp án sai', () => {
      expect(isAnswerCorrect(['a', 'c'], ['a', 'b'])).toBe(false);
    });

    it('sai khi không chọn gì mà câu có đáp án đúng', () => {
      expect(isAnswerCorrect([], ['a'])).toBe(false);
    });

    it('không phân biệt thứ tự chọn', () => {
      expect(isAnswerCorrect(['b', 'a'], ['a', 'b'])).toBe(true);
    });
  });

  describe('questionWeight', () => {
    it('trọng số tăng theo độ khó', () => {
      expect(questionWeight(0)).toBe(1);
      expect(questionWeight(3)).toBe(4);
    });
  });

  describe('roundScore', () => {
    it('làm tròn 2 chữ số thập phân', () => {
      expect(roundScore(66.666)).toBe(66.67);
      expect(roundScore(50)).toBe(50);
    });
  });
});
