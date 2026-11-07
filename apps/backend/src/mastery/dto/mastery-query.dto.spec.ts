import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PracticeQuestionsQueryDto, MasteryHistoryQueryDto } from './mastery-query.dto';

describe('Mastery query validation', () => {
  it('parses false literally instead of coercing it to true', () => {
    const dto = plainToInstance(PracticeQuestionsQueryDto, { unseenOnly: 'false', page: '2', difficultyMin: '0.2' });
    expect(dto.unseenOnly).toBe(false);
    expect(dto.page).toBe(2);
    expect(validateSync(dto)).toHaveLength(0);
  });
  it.each([{ unseenOnly: 'invalid' }, { limit: '101' }, { page: '0' }, { difficultyMin: '-1' }, { difficultyMax: 'NaN' }])(
    'rejects malformed or unbounded filters %j',
    (input) => expect(validateSync(plainToInstance(PracticeQuestionsQueryDto, input)).length).toBeGreaterThan(0),
  );
  it('restricts replay order to asc or desc', () => {
    expect(validateSync(plainToInstance(MasteryHistoryQueryDto, { order: 'invalid' })).length).toBeGreaterThan(0);
  });
});
