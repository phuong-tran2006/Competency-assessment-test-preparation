import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Role } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tạo lesson trong 1 chapter
  async create(
    chapterId: string,
    userId: string,
    role: Role,
    dto: CreateLessonDto,
  ) {
    await this.assertChapterOwner(chapterId, userId, role);

    const order =
      dto.order ??
      (await this.prisma.lesson.count({ where: { chapterId } })) + 1;

    return this.prisma.lesson.create({
      data: {
        chapterId,
        title: dto.title,
        content: dto.content,
        order,
      },
      include: { materials: true },
    });
  }

  // Danh sách lesson của 1 chapter (public — dùng cho learner xem nội dung)
  async findByChapter(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true },
    });
    if (!chapter) throw new NotFoundException('Không tìm thấy chương');

    return this.prisma.lesson.findMany({
      where: { chapterId },
      orderBy: { order: 'asc' },
      include: {
        materials: { orderBy: { order: 'asc' } },
      },
    });
  }

  // Chi tiết 1 lesson
  async findOne(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        materials: { orderBy: { order: 'asc' } },
        chapter: {
          select: {
            id: true,
            title: true,
            courseId: true,
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');
    return lesson;
  }

  async update(id: string, userId: string, role: Role, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        chapter: { select: { course: { select: { instructorId: true } } } },
      },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');
    this.checkOwner(lesson.chapter.course.instructorId, userId, role);

    return this.prisma.lesson.update({
      where: { id },
      data: dto,
      include: { materials: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(id: string, userId: string, role: Role) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        chapter: { select: { course: { select: { instructorId: true } } } },
      },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');
    this.checkOwner(lesson.chapter.course.instructorId, userId, role);

    await this.prisma.lesson.delete({ where: { id } });
    return { message: 'Đã xóa bài học' };
  }

  // ===== Helpers =====
  private async assertChapterOwner(
    chapterId: string,
    userId: string,
    role: Role,
  ) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { course: { select: { instructorId: true } } },
    });
    if (!chapter) throw new NotFoundException('Không tìm thấy chương');
    this.checkOwner(chapter.course.instructorId, userId, role);
  }

  private checkOwner(ownerId: string, userId: string, role: Role) {
    if (role !== Role.ADMIN && ownerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác bài học này');
    }
  }
}
