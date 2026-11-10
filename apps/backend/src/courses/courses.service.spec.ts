import { NotFoundException } from '@nestjs/common';
import { CourseStatus, Role } from '@prisma/client';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';

function createService() {
  const prisma = {
    course: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
    },
  };
  return {
    service: new CoursesService(prisma as unknown as PrismaService),
    prisma,
  };
}

describe('CoursesService — STUDENT access', () => {
  it('a student cannot use a status filter to list unpublished courses', async () => {
    const { service, prisma } = createService();

    await service.findAll(
      { status: CourseStatus.DRAFT },
      { id: 'student-1', role: Role.STUDENT },
    );

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: CourseStatus.PUBLISHED } }),
    );
    expect(prisma.course.count).toHaveBeenCalledWith({
      where: { status: CourseStatus.PUBLISHED },
    });
  });

  it.each([CourseStatus.DRAFT, CourseStatus.HIDDEN])(
    'a student cannot read another instructor\'s %s course',
    async (status) => {
      const { service, prisma } = createService();
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        instructorId: 'instructor-1',
        status,
      });

      await expect(
        service.findOne('course-1', { id: 'student-1', role: Role.STUDENT }),
      ).rejects.toThrow(NotFoundException);
    },
  );

  it('a student can read a published course', async () => {
    const { service, prisma } = createService();
    const course = {
      id: 'course-1',
      instructorId: 'instructor-1',
      status: CourseStatus.PUBLISHED,
    };
    prisma.course.findUnique.mockResolvedValue(course);

    await expect(
      service.findOne('course-1', { id: 'student-1', role: Role.STUDENT }),
    ).resolves.toEqual(course);
  });

  it('an instructor still lists published courses and their own courses', async () => {
    const { service, prisma } = createService();

    await service.findAll({}, { id: 'instructor-1', role: Role.INSTRUCTOR });

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { status: CourseStatus.PUBLISHED },
            { instructorId: 'instructor-1' },
          ],
        },
      }),
    );
  });

  it('an admin can still filter unpublished courses', async () => {
    const { service, prisma } = createService();

    await service.findAll(
      { status: CourseStatus.DRAFT },
      { id: 'admin-1', role: Role.ADMIN },
    );

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: CourseStatus.DRAFT } }),
    );
  });
});
