import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Record<string, jest.Mock>;
  let jwt: { signAsync: jest.Mock };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
    jwt = { signAsync: jest.fn().mockResolvedValue('token-123') };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('tạo user mới với password đã hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({ id: 'u1' });

      await service.register({
        email: 'a@b.com',
        password: 'secret123',
      } as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: 'hashed' }),
        }),
      );
    });

    it('409 khi email đã tồn tại', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(
        service.register({ email: 'a@b.com', password: 'x' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('trả token khi đúng credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: 'h',
        role: 'LEARNER',
        status: 'ACTIVE',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await service.login({
        email: 'a@b.com',
        password: 'secret123',
      } as any);
      expect(res.accessToken).toBe('token-123');
    });

    it('401 khi sai email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@y.com', password: 'p' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('401 khi sai mật khẩu', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: 'h',
        status: 'ACTIVE',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ email: 'a@b.com', password: 'sai' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('401 khi tài khoản bị khóa', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: 'h',
        status: 'LOCKED',
      });
      await expect(
        service.login({ email: 'a@b.com', password: 'p' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
