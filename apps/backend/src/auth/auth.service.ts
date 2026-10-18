import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

function toPublicUser(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  return { id: user.id, email: user.email, name: user.name };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password, name: dto.name },
    });
    return {
      ...toPublicUser(user),
      accessToken: this.sign(user.id, user.email),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      ...toPublicUser(user),
      accessToken: this.sign(user.id, user.email),
    };
  }

  logout() {
    // Stateless JWT over Bearer header: client discards the token.
    return { message: 'Logged out' };
  }

  private sign(sub: string, email: string): string {
    return this.jwt.sign({ sub, email });
  }
}
