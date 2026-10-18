import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialType, Role } from '@prisma/client';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tạo material trong 1 lesson
  async create(
    lessonId: string,
    userId: string,
    role: Role,
    dto: CreateMaterialDto,
  ) {
    await this.assertLessonOwner(lessonId, userId, role);

    // Validate theo type — đảm bảo content/url khớp
    this.validateByType(dto.type, dto.content, dto.url);

    const order =
      dto.order ??
      (await this.prisma.material.count({ where: { lessonId } })) + 1;

    return this.prisma.material.create({
      data: {
        lessonId,
        type: dto.type,
        title: dto.title,
        content: dto.type === MaterialType.TEXT ? dto.content : null,
        url: dto.type === MaterialType.TEXT ? null : dto.url,
        order,
      },
    });
  }

  // Danh sách material của 1 lesson (public)
  async findByLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    return this.prisma.material.findMany({
      where: { lessonId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Không tìm thấy tài liệu');
    return material;
  }

  async update(id: string, userId: string, role: Role, dto: UpdateMaterialDto) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        lesson: {
          select: {
            chapter: { select: { course: { select: { instructorId: true } } } },
          },
        },
      },
    });
    if (!material) throw new NotFoundException('Không tìm thấy tài liệu');
    this.checkOwner(material.lesson.chapter.course.instructorId, userId, role);

    // Nếu đổi type, phải validate lại content/url
    const finalType = dto.type ?? material.type;
    const finalContent =
      dto.content !== undefined ? dto.content : (material.content ?? undefined);
    const finalUrl =
      dto.url !== undefined ? dto.url : (material.url ?? undefined);
    this.validateByType(finalType, finalContent, finalUrl);

    return this.prisma.material.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title,
        order: dto.order,
        // Đảm bảo không lưu đồng thời content và url
        content: finalType === MaterialType.TEXT ? finalContent : null,
        url: finalType === MaterialType.TEXT ? null : finalUrl,
      },
    });
  }

  async remove(id: string, userId: string, role: Role) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        lesson: {
          select: {
            chapter: { select: { course: { select: { instructorId: true } } } },
          },
        },
      },
    });
    if (!material) throw new NotFoundException('Không tìm thấy tài liệu');
    this.checkOwner(material.lesson.chapter.course.instructorId, userId, role);

    await this.prisma.material.delete({ where: { id } });
    return { message: 'Đã xóa tài liệu' };
  }

  // ===== Helpers =====

  /**
   * Kiểm tra tính hợp lệ của content/url theo type:
   * - TEXT  → bắt buộc có content, không có url
   * - VIDEO, PDF, LINK → bắt buộc có url, không có content
   */
  private validateByType(type: MaterialType, content?: string, url?: string) {
    if (type === MaterialType.TEXT) {
      if (!content || content.trim().length === 0) {
        throw new BadRequestException(
          'Material type TEXT yêu cầu trường content',
        );
      }
      if (url) {
        throw new BadRequestException(
          'Material type TEXT không được có trường url',
        );
      }
    } else {
      if (!url || url.trim().length === 0) {
        throw new BadRequestException(
          `Material type ${type} yêu cầu trường url`,
        );
      }
      if (content) {
        throw new BadRequestException(
          `Material type ${type} không được có trường content`,
        );
      }
    }
  }

  private async assertLessonOwner(
    lessonId: string,
    userId: string,
    role: Role,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: { select: { course: { select: { instructorId: true } } } },
      },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');
    this.checkOwner(lesson.chapter.course.instructorId, userId, role);
  }

  private checkOwner(ownerId: string, userId: string, role: Role) {
    if (role !== Role.ADMIN && ownerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác tài liệu này');
    }
  }
}
