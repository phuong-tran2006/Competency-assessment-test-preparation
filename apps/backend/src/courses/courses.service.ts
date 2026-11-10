import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseStatus, Role } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(instructorId: string, dto: CreateCourseDto) {
    const { topicIds, ...rest } = dto;
    return this.prisma.course.create({
      data: {
        ...rest,
        instructorId,
        status: CourseStatus.DRAFT,
        courseTopics: topicIds?.length
          ? { create: topicIds.map((topicId) => ({ topicId })) }
          : undefined,
      },
      include: { courseTopics: { include: { topic: true } }, chapters: true },
    });
  }

  async findAll(query: any, user?: any) {
    const { search, status, page = 1, limit = 20 } = query;
    const where: any = {};

    if (!user || user.role === Role.LEARNER) {
      where.status = CourseStatus.PUBLISHED;
    } else if (user.role === Role.INSTRUCTOR) {
      where.OR = [
        { status: CourseStatus.PUBLISHED },
        { instructorId: user.id },
      ];
    } else if (status) {
      where.status = status;
    }
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          instructor: { select: { id: true, fullName: true, email: true } },
          _count: { select: { chapters: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    const itemsWithCounts = await Promise.all(
      items.map(async (course) => {
        const lessonsCount = await this.prisma.lesson.count({
          where: { chapter: { courseId: course.id } },
        });
        return {
          ...course,
          thumbnail: null, // Fix lỗi thiếu thumbnail cho FE
          lessonsCount,
        };
      }),
    );
    return {
      items: itemsWithCounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user?: any) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, fullName: true, email: true } },
        courseTopics: { include: { topic: true } },
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: { materials: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    if (
      course.status !== CourseStatus.PUBLISHED &&
     (!user || (user.role === Role.LEARNER && course.instructorId !== user.id))
    ) {
      throw new NotFoundException(
        'Không tìm thấy khóa học (hoặc chưa xuất bản)',
      );
    }
    return course;
  }

  // API lấy lessons theo course (Fix Lỗi 6 & 14)
  async findLessonsByCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');

    return this.prisma.lesson.findMany({
      where: { chapter: { courseId } },
      orderBy: [{ chapter: { order: 'asc' } }, { order: 'asc' }],
    });
  }

  // API thêm prerequisite cho course (Fix Lỗi 16)
  async addPrerequisite(
    courseId: string,
    prerequisiteId: string,
    userId: string,
    role: Role,
  ) {
    await this.assertOwnerOrAdmin(courseId, userId, role);
    if (courseId === prerequisiteId)
      throw new BadRequestException('Không thể tự phụ thuộc chính mình');

    return this.prisma.coursePrerequisite.create({
      data: { courseId, prerequisiteId },
    });
  }

  async removePrerequisite(
    courseId: string,
    prerequisiteId: string,
    userId: string,
    role: Role,
  ) {
    await this.assertOwnerOrAdmin(courseId, userId, role);
    return this.prisma.coursePrerequisite.delete({
      where: { courseId_prerequisiteId: { courseId, prerequisiteId } },
    });
  }

  async update(id: string, userId: string, role: Role, dto: UpdateCourseDto) {
    await this.assertOwnerOrAdmin(id, userId, role);
    const { topicIds, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Cập nhật thông tin cơ bản
      const course = await tx.course.update({ where: { id }, data: rest });

      // Nếu có topicIds mới, thay thế toàn bộ courseTopics
      if (topicIds) {
        await tx.courseTopic.deleteMany({ where: { courseId: id } });
        if (topicIds.length) {
          await tx.courseTopic.createMany({
            data: topicIds.map((topicId) => ({ courseId: id, topicId })),
          });
        }
      }
      return course;
    });
  }

  async remove(id: string, userId: string, role: Role) {
    await this.assertOwnerOrAdmin(id, userId, role);
    await this.prisma.course.delete({ where: { id } });
    return { message: 'Đã xóa khóa học' };
  }

  async attachTopics(
    courseId: string,
    userId: string,
    role: Role,
    topicIds: string[],
  ) {
    await this.assertOwnerOrAdmin(courseId, userId, role);
    return this.prisma.courseTopic.createMany({
      data: topicIds.map((topicId) => ({ courseId, topicId })),
      skipDuplicates: true,
    });
  }

  async detachTopic(
    courseId: string,
    topicId: string,
    userId: string,
    role: Role,
  ) {
    await this.assertOwnerOrAdmin(courseId, userId, role);
    return this.prisma.courseTopic.delete({
      where: { courseId_topicId: { courseId, topicId } },
    });
  }

  private async assertOwnerOrAdmin(
    courseId: string,
    userId: string,
    role: Role,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    if (role !== Role.ADMIN && course.instructorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');
    }
  }
}
