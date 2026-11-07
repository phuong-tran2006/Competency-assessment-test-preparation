import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { PREREQUISITE_GRAPH_LOCK_ID, prerequisiteAncestors, prerequisiteMap, wouldCreateCycle } from './prerequisite-graph';

@Injectable()
export class TopicsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CRUD cơ bản ====================

  async create(dto: CreateTopicDto) {
    const existing = await this.prisma.topic.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Tên chủ đề đã tồn tại');

    return this.prisma.topic.create({
      data: { name: dto.name, description: dto.description },
    });
  }

  async findAll(query: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 50 } = query;
    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.topic.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              questions: true,
              courseTopics: true,
              prerequisites: true,
            },
          },
        },
      }),
      this.prisma.topic.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        prerequisites: {
          include: { prerequisite: true },
        },
        dependentTopics: {
          include: { topic: true },
        },
        _count: {
          select: { questions: true, courseTopics: true },
        },
      },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy chủ đề');
    return topic;
  }

  async update(id: string, dto: UpdateTopicDto) {
    await this.ensureExists(id);

    // Nếu đổi tên, check trùng
    if (dto.name) {
      const dup = await this.prisma.topic.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (dup) throw new ConflictException('Tên chủ đề đã tồn tại');
    }

    return this.prisma.topic.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.topic.delete({ where: { id } });
    return { message: 'Đã xóa chủ đề' };
  }

  // ==================== Prerequisite Graph ====================

  /**
   * Thêm quan hệ: topic <-- phụ thuộc -- prerequisite
   * Kiểm tra 3 điều kiện:
   *   1. Cả 2 topic đều tồn tại
   *   2. Không tự phụ thuộc chính mình
   *   3. Không tạo chu trình
   */
  async addPrerequisite(topicId: string, prerequisiteId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize graph changes so simultaneous inverse edges cannot both pass validation.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${PREREQUISITE_GRAPH_LOCK_ID}::bigint)`;
      const topics = await tx.topic.findMany({
        where: { id: { in: [topicId, prerequisiteId] } }, select: { id: true },
      });
      if (!topics.some((topic) => topic.id === topicId)) throw new NotFoundException('Không tìm thấy chủ đề');
      if (!topics.some((topic) => topic.id === prerequisiteId)) throw new NotFoundException('Không tìm thấy prerequisite');
      const edges = await tx.topicPrerequisite.findMany({ select: { topicId: true, prerequisiteId: true } });
      if (edges.some((edge) => edge.topicId === topicId && edge.prerequisiteId === prerequisiteId)) {
        throw new ConflictException('Quan hệ prerequisite đã tồn tại');
      }
      if (wouldCreateCycle(edges, topicId, prerequisiteId)) {
        throw new BadRequestException('Không thể thêm: quan hệ này tạo chu trình trong đồ thị prerequisite');
      }
      return tx.topicPrerequisite.create({ data: { topicId, prerequisiteId }, include: { prerequisite: true } });
    });
  }

  async removePrerequisite(topicId: string, prerequisiteId: string) {
    const existing = await this.prisma.topicPrerequisite.findUnique({
      where: { topicId_prerequisiteId: { topicId, prerequisiteId } },
    });
    if (!existing)
      throw new NotFoundException('Quan hệ prerequisite không tồn tại');

    await this.prisma.topicPrerequisite.delete({
      where: { topicId_prerequisiteId: { topicId, prerequisiteId } },
    });
    return { message: 'Đã xoá quan hệ prerequisite' };
  }

  /**
   * Trả về đồ thị prerequisite đầy đủ của 1 topic
   * gồm tất cả ancestor (bắc cầu)
   */
  async getGraph(topicId: string) {
    await this.ensureExists(topicId);

    const edges = await this.prisma.topicPrerequisite.findMany({
      include: { prerequisite: { select: { id: true, name: true } } },
    });
    const names = new Map(edges.map((edge) => [edge.prerequisiteId, edge.prerequisite.name]));
    const ancestors = prerequisiteAncestors(prerequisiteMap(edges), topicId)
      .map((ancestor) => ({ ...ancestor, name: names.get(ancestor.id)! }));

    return {
      topicId,
      ancestors,
      totalAncestors: ancestors.length,
    };
  }

  // ==================== Helpers ====================

  private async ensureExists(id: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('Không tìm thấy chủ đề');
    return topic;
  }

}
