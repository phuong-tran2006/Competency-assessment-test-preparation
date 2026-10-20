import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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

  async findAll(query: {
    search?: string;
    status?: CourseStatus;
    page?: number;
    limit?: number;
    viewerRole?: Role;
    viewerId?: string;
  }) {
    const { search, status, page = 1, limit = 20, viewerRole, viewerId } =
      query;
    const where: any = {};
    // Public/learner chỉ thấy khóa PUBLISHED; instructor thấy khóa của mình
    // + khóa published; admin thấy tất cả. Param status chỉ có hiệu lực
    // trong phạm vi role được phép.
    if (viewerRole === Role.ADMIN) {
      if (status) where.status = status;
    } else if (viewerRole === Role.INSTRUCTOR) {
      if (status) {
        where.status = status;
        if (status !== CourseStatus.PUBLISHED)
          where.instructorId = viewerId;
      } else {
        where.OR = [
          { status: CourseStatus.PUBLISHED },
          { instructorId: viewerId },
        ];
      }
    } else {
      where.status = CourseStatus.PUBLISHED;
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

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, viewerId?: string, viewerRole?: Role) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, fullName: true, email: true } },
        courseTopics: { include: { topic: true } },
        prerequisites: { include: { prerequisite: true } },
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
    // Khóa chưa publish chỉ chủ sở hữu/admin được xem chi tiết
    if (
      course.status !== CourseStatus.PUBLISHED &&
      viewerRole !== Role.ADMIN &&
      course.instructorId !== viewerId
    ) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }
    return course;
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

  // ===== Course prerequisites (metadata cho recommendation) =====
  async addPrerequisite(
    courseId: string,
    prerequisiteId: string,
    userId: string,
    role: Role,
  ) {
    if (courseId === prerequisiteId) {
      throw new BadRequestException(
        'Khóa học không thể là prerequisite của chính nó',
      );
    }
    await this.assertOwnerOrAdmin(courseId, userId, role);
    const prerequisite = await this.prisma.course.findUnique({
      where: { id: prerequisiteId },
      select: { id: true },
    });
    if (!prerequisite)
      throw new NotFoundException('Không tìm thấy khóa học prerequisite');
    const existing = await this.prisma.coursePrerequisite.findUnique({
      where: { courseId_prerequisiteId: { courseId, prerequisiteId } },
    });
    if (existing)
      throw new ConflictException('Quan hệ prerequisite đã tồn tại');
    if (await this.wouldCreateCourseCycle(courseId, prerequisiteId)) {
      throw new BadRequestException(
        'Không thể thêm: quan hệ này tạo chu trình prerequisite',
      );
    }
    return this.prisma.coursePrerequisite.create({
      data: { courseId, prerequisiteId },
      include: { prerequisite: true },
    });
  }

  async removePrerequisite(
    courseId: string,
    prerequisiteId: string,
    userId: string,
    role: Role,
  ) {
    await this.assertOwnerOrAdmin(courseId, userId, role);
    const existing = await this.prisma.coursePrerequisite.findUnique({
      where: { courseId_prerequisiteId: { courseId, prerequisiteId } },
    });
    if (!existing)
      throw new NotFoundException('Quan hệ prerequisite không tồn tại');
    await this.prisma.coursePrerequisite.delete({
      where: { courseId_prerequisiteId: { courseId, prerequisiteId } },
    });
    return { message: 'Đã xoá quan hệ prerequisite' };
  }

  private async wouldCreateCourseCycle(
    courseId: string,
    prerequisiteId: string,
  ): Promise<boolean> {
    const visited = new Set<string>();
    const queue: string[] = [prerequisiteId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === courseId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const prereqs = await this.prisma.coursePrerequisite.findMany({
        where: { courseId: current },
        select: { prerequisiteId: true },
      });
      queue.push(...prereqs.map((p) => p.prerequisiteId));
    }
    return false;
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
