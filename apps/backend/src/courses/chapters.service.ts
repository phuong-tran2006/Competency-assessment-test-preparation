import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    courseId: string,
    userId: string,
    role: Role,
    dto: CreateChapterDto,
  ) {
    await this.assertCourseOwner(courseId, userId, role);
    const order =
      dto.order ??
      (await this.prisma.chapter.count({ where: { courseId } })) + 1;
    return this.prisma.chapter.create({
      data: { courseId, title: dto.title, order },
    });
  }

  // Danh sách chapter của 1 course (public — learner xem cấu trúc khóa học)
  async findByCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    return this.prisma.chapter.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          select: { id: true, title: true, order: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          include: { materials: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!chapter) throw new NotFoundException('Không tìm thấy chương');
    return chapter;
  }

  async update(id: string, userId: string, role: Role, dto: UpdateChapterDto) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: { course: { select: { instructorId: true } } },
    });
    if (!chapter) throw new NotFoundException('Không tìm thấy chương');
    this.checkOwner(chapter.course.instructorId, userId, role);
    return this.prisma.chapter.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string, role: Role) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id },
      include: { course: { select: { instructorId: true } } },
    });
    if (!chapter) throw new NotFoundException('Không tìm thấy chương');
    this.checkOwner(chapter.course.instructorId, userId, role);
    await this.prisma.chapter.delete({ where: { id } });
    return { message: 'Đã xóa chương' };
  }

  private async assertCourseOwner(
    courseId: string,
    userId: string,
    role: Role,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    this.checkOwner(course.instructorId, userId, role);
  }

  private checkOwner(ownerId: string, userId: string, role: Role) {
    if (role !== Role.ADMIN && ownerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác');
    }
  }
}
