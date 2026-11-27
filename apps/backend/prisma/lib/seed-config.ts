import { Role } from '@prisma/client';

export interface SeedAccount {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export interface SeedConfig {
  mode: 'demo' | 'production';
  accounts: SeedAccount[];
}

/** Validate accounts before running migrations or writing production data. */
export function seedConfig(mode: SeedConfig['mode'], env = process.env): SeedConfig {
  if (mode === 'demo' && env.NODE_ENV === 'production') {
    throw new Error('NODE_ENV=production: dùng npm run seed:production với tài khoản cấu hình riêng');
  }
  const defaults = [
    { role: Role.ADMIN, email: 'admin@vact.com', fullName: 'Quản trị viên Demo' },
    { role: Role.INSTRUCTOR, email: 'instructor@vact.com', fullName: 'Giảng viên Demo' },
    { role: Role.STUDENT, email: 'learner@vact.com', fullName: 'Học viên Demo' },
  ];
  const accounts = defaults.map((account) => {
    if (mode === 'demo') return { ...account, password: 'admin123' };
    const prefix = 'SEED_' + account.role;
    const email = env[prefix + '_EMAIL']?.trim().toLowerCase();
    const password = env[prefix + '_PASSWORD'];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12) {
      throw new Error(prefix + '_EMAIL và ' + prefix + '_PASSWORD (ít nhất 12 ký tự) là bắt buộc');
    }
    return { ...account, email, password, fullName: env[prefix + '_NAME']?.trim() || account.fullName.replace('Demo', '').trim() };
  });
  if (new Set(accounts.map((account) => account.email)).size !== accounts.length) {
    throw new Error('Ba tài khoản seed phải dùng email khác nhau');
  }
  return { mode, accounts };
}
