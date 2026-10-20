import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

function ctxWithRole(role: string | undefined) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('cho qua khi route không yêu cầu role', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(ctxWithRole(undefined))).toBe(true);
  });

  it('cho qua khi user đúng role', () => {
    reflector.getAllAndOverride.mockReturnValue(['INSTRUCTOR', 'ADMIN']);
    expect(
      guard.canActivate(ctxWithRole('INSTRUCTOR')),
    ).toBe(true);
  });

  it('chặn khi user sai role', () => {
    reflector.getAllAndOverride.mockReturnValue(['INSTRUCTOR', 'ADMIN']);
    expect(guard.canActivate(ctxWithRole('LEARNER'))).toBe(false);
  });

  it('chặn khi chưa đăng nhập', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(guard.canActivate(ctxWithRole(undefined))).toBe(false);
    expect(ROLES_KEY).toBeDefined();
  });
});
