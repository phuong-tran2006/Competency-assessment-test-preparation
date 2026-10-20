import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, Role } from '@prisma/client';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      course: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
      },
      coursePrerequisite: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new CoursesService(prisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll — lọc status theo role', () => {
    it('khách/learner chỉ thấy PUBLISHED', async () => {
      await service.findAll({});
      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: CourseStatus.PUBLISHED }),
        }),
      );
    });

    it('admin thấy tất cả, lọc theo status nếu có', async () => {
      await service.findAll({
        viewerRole: Role.ADMIN,
        status: CourseStatus.DRAFT,
      });
      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: CourseStatus.DRAFT }),
        }),
      );
    });
  });

  describe('findOne — ẩn khóa chưa publish', () => {
    it('learner không xem được khóa DRAFT', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'c1',
        status: CourseStatus.DRAFT,
        instructorId: 'other',
      });
      await expect(
        service.findOne('c1', 'learner1', Role.LEARNER),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('chủ sở hữu xem được khóa DRAFT của mình', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'c1',
        status: CourseStatus.DRAFT,
        instructorId: 'me',
      });
      const res = await service.findOne('c1', 'me', Role.INSTRUCTOR);
      expect(res.id).toBe('c1');
    });
  });

  describe('addPrerequisite', () => {
    beforeEach(() => {
      prisma.course.findUnique
        .mockResolvedValueOnce({ instructorId: 'me' }) // assertOwner
        .mockResolvedValueOnce({ id: 'p1' }); // prerequisite tồn tại
    });

    it('400 khi tự phụ thuộc chính mình', async () => {
      await expect(
        service.addPrerequisite('c1', 'c1', 'me', Role.INSTRUCTOR),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('409 khi quan hệ đã tồn tại', async () => {
      prisma.coursePrerequisite.findUnique.mockResolvedValue({
        courseId: 'c1',
        prerequisiteId: 'p1',
      });
      await expect(
        service.addPrerequisite('c1', 'p1', 'me', Role.INSTRUCTOR),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('400 khi tạo chu trình', async () => {
      prisma.coursePrerequisite.findUnique.mockResolvedValue(null);
      // p1 đã phụ thuộc c1 -> thêm c1 phụ thuộc p1 tạo cycle
      prisma.coursePrerequisite.findMany.mockImplementation(
        async ({ where }: any) =>
          where.courseId === 'p1' ? [{ prerequisiteId: 'c1' }] : [],
      );
      await expect(
        service.addPrerequisite('c1', 'p1', 'me', Role.INSTRUCTOR),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
