import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

function createService() {
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
  );
  return { service, prisma, jwt };
}

describe('AuthService — canonical roles', () => {
  it('register creates a STUDENT account explicitly', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'student-1', role: Role.STUDENT });

    await service.register({ email: 'student@example.com', password: 'Test@123' });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'student@example.com',
        role: Role.STUDENT,
        passwordHash: expect.any(String),
      }),
      select: expect.objectContaining({ role: true }),
    });
  });

  it.each([Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN])(
    'login preserves the %s role in both the token and response',
    async (role) => {
      const { service, prisma, jwt } = createService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        role,
        status: 'ACTIVE',
        passwordHash: await bcrypt.hash('Test@123', 4),
      });

      const result = await service.login({
        email: 'user@example.com',
        password: 'Test@123',
      });

      expect(result.user.role).toBe(role);
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'user@example.com',
        role,
      });
    },
  );
});
