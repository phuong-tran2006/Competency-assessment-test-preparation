import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

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
    if (topicId === prerequisiteId) {
      throw new BadRequestException(
        'Chủ đề không thể là prerequisite của chính nó',
      );
    }

    const [topic, prerequisite] = await Promise.all([
      this.prisma.topic.findUnique({ where: { id: topicId } }),
      this.prisma.topic.findUnique({ where: { id: prerequisiteId } }),
    ]);
    if (!topic) throw new NotFoundException('Không tìm thấy chủ đề');
    if (!prerequisite)
      throw new NotFoundException('Không tìm thấy prerequisite');

    // Đã tồn tại?
    const existing = await this.prisma.topicPrerequisite.findUnique({
      where: { topicId_prerequisiteId: { topicId, prerequisiteId } },
    });
    if (existing)
      throw new ConflictException('Quan hệ prerequisite đã tồn tại');

    // Phát hiện chu trình
    const hasCycle = await this.wouldCreateCycle(topicId, prerequisiteId);
    if (hasCycle) {
      throw new BadRequestException(
        'Không thể thêm: quan hệ này tạo chu trình trong đồ thị prerequisite',
      );
    }

    return this.prisma.topicPrerequisite.create({
      data: { topicId, prerequisiteId },
      include: { prerequisite: true },
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

    // BFS lấy tất cả ancestor
    const ancestors: Array<{ id: string; name: string; level: number }> = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string; level: number }> = [
      { id: topicId, level: 0 },
    ];

    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const prereqs = await this.prisma.topicPrerequisite.findMany({
        where: { topicId: current.id },
        include: { prerequisite: { select: { id: true, name: true } } },
      });

      for (const p of prereqs) {
        if (!visited.has(p.prerequisite.id)) {
          ancestors.push({
            id: p.prerequisite.id,
            name: p.prerequisite.name,
            level: current.level + 1,
          });
          queue.push({ id: p.prerequisite.id, level: current.level + 1 });
        }
      }
    }

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

  /**
   * Kiểm tra nếu thêm edge (topicId -> prerequisiteId) có tạo chu trình không.
   *
   * Ý tưởng: BFS từ prerequisiteId theo hướng "prerequisites của nó".
   * Nếu gặp lại topicId → có chu trình.
   *
   * Ví dụ đã có: B phụ thuộc A (edge B -> A).
   * Muốn thêm: A phụ thuộc B (edge A -> B).
   * Từ B, duyệt prerequisites của B → gặp A → có chu trình.
   */
  private async wouldCreateCycle(
    topicId: string,
    prerequisiteId: string,
  ): Promise<boolean> {
    const visited = new Set<string>();
    const queue: string[] = [prerequisiteId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === topicId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const prereqs = await this.prisma.topicPrerequisite.findMany({
        where: { topicId: current },
        select: { prerequisiteId: true },
      });
      queue.push(...prereqs.map((p) => p.prerequisiteId));
    }

    return false;
  }
}
