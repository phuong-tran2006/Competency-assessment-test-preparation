import { BadRequestException, ConflictException } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { PrismaService } from '../prisma/prisma.service';

function setup() {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]), $transaction: jest.fn(),
    topic: { findMany: jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]) },
    topicPrerequisite: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
  };
  prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  return { prisma, service: new TopicsService(prisma as unknown as PrismaService) };
}

describe('TopicsService prerequisite mutations', () => {
  it('validates and inserts under a transaction-scoped graph lock', async () => {
    const { service, prisma } = setup();
    await service.addPrerequisite('b', 'a');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.topicPrerequisite.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.topicPrerequisite.create).toHaveBeenCalledWith({ data: { topicId: 'b', prerequisiteId: 'a' }, include: { prerequisite: true } });
  });
  it('rejects the reverse edge that would form a cycle', async () => {
    const { service, prisma } = setup();
    prisma.topicPrerequisite.findMany.mockResolvedValue([{ topicId: 'b', prerequisiteId: 'a' }]);
    await expect(service.addPrerequisite('a', 'b')).rejects.toThrow(BadRequestException);
    expect(prisma.topicPrerequisite.create).not.toHaveBeenCalled();
  });
  it('rejects duplicate prerequisites', async () => {
    const { service, prisma } = setup();
    prisma.topicPrerequisite.findMany.mockResolvedValue([{ topicId: 'b', prerequisiteId: 'a' }]);
    await expect(service.addPrerequisite('b', 'a')).rejects.toThrow(ConflictException);
  });
});
