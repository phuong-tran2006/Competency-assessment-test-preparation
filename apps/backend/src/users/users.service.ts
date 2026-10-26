import { BadRequestException, Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        targetScore: true,
        createdAt: true,
      },
    });
  }

  update(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        targetScore: true,
        updatedAt: true,
      },
    });
  }

  updateStatus(userId: string, status: UserStatus) {
    if (!Object.values(UserStatus).includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });
  }
}
