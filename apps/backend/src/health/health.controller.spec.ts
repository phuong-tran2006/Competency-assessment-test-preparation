import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  function createController(queryRaw: jest.Mock) {
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
    return new HealthController(prisma);
  }

  it('trả ok + connected khi DB ping thành công', async () => {
    const controller = createController(jest.fn().mockResolvedValue([{ '?column?': 1 }]));
    const res = await controller.check();
    expect(res).toMatchObject({ status: 'ok', database: 'connected' });
    expect(typeof res.timestamp).toBe('string');
  });

  it('trả degraded + disconnected khi DB ping thất bại', async () => {
    const controller = createController(
      jest.fn().mockRejectedValue(new Error('connection refused')),
    );
    const res = await controller.check();
    expect(res).toMatchObject({ status: 'degraded', database: 'disconnected' });
    expect(res.error).toContain('connection refused');
  });
});
