import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma/prisma.service';

function setup() {
  const question = {
    id: 'q1', content: 'Prompt', explanation: 'Solution from PDF',
    options: [{ id: 'o1', content: 'Choice', order: 0, isCorrect: true }],
  };
  const prisma = {
    question: {
      findUnique: jest.fn().mockResolvedValue(question),
      findMany: jest.fn().mockResolvedValue([question]),
      count: jest.fn().mockResolvedValue(1),
    }
  };
  return new QuestionsService(prisma as unknown as PrismaService);
}

describe('QuestionsService public solutions (T47.3)', () => {
  it('does not reveal the PDF explanation or correct flag in a public question', async () => {
    const question = await setup().findOne('q1');
    expect(question).not.toHaveProperty('explanation');
    expect(question.options[0]).toEqual({ id: 'o1', content: 'Choice', order: 0 });
  });

  it('also removes solutions from paginated public search results', async () => {
    const result = await setup().findAll({});
    expect(result.total).toBe(1);
    expect(result.items[0]).not.toHaveProperty('explanation');
    expect(result.items[0].options[0]).not.toHaveProperty('isCorrect');
  });
});
