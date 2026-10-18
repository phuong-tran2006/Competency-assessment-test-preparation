import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { QuestionType } from '@prisma/client';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuestionDto) {
    // Topic tồn tại?
    const topic = await this.prisma.topic.findUnique({
      where: { id: dto.topicId },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy chủ đề');

    // Validate options theo type
    this.validateOptions(dto.type, dto.options);

    const { options, ...questionData } = dto;

    return this.prisma.question.create({
      data: {
        ...questionData,
        options: {
          create: options.map((o, i) => ({
            content: o.content,
            isCorrect: o.isCorrect,
            order: o.order ?? i,
          })),
        },
      },
      include: {
        options: { orderBy: { order: 'asc' } },
        topic: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(query: QueryQuestionDto) {
    const {
      topicId,
      type,
      difficultyMin,
      difficultyMax,
      search,
      page = 1,
      limit = 20,
    } = query;
    const where: any = {};
    if (topicId) where.topicId = topicId;
    if (type) where.type = type;
    if (search) where.content = { contains: search, mode: 'insensitive' };
    if (difficultyMin !== undefined || difficultyMax !== undefined) {
      where.difficulty = {};
      if (difficultyMin !== undefined) where.difficulty.gte = difficultyMin;
      if (difficultyMax !== undefined) where.difficulty.lte = difficultyMax;
    }

    const [items, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          topic: { select: { id: true, name: true } },
          _count: { select: { options: true } },
        },
      }),
      this.prisma.question.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { order: 'asc' } },
        topic: { select: { id: true, name: true } },
      },
    });
    if (!question) throw new NotFoundException('Không tìm thấy câu hỏi');
    return question;
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const existing = await this.prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy câu hỏi');

    const finalType = dto.type ?? existing.type;
    const finalOptions =
      dto.options ??
      existing.options.map((o) => ({
        content: o.content,
        isCorrect: o.isCorrect,
        order: o.order,
      }));

    this.validateOptions(finalType, finalOptions);

    const { options, ...questionData } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Nếu có cập nhật options → xóa cũ, tạo mới
      if (options) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
      }

      return tx.question.update({
        where: { id },
        data: {
          ...questionData,
          ...(options && {
            options: {
              create: options.map((o, i) => ({
                content: o.content,
                isCorrect: o.isCorrect,
                order: o.order ?? i,
              })),
            },
          }),
        },
        include: {
          options: { orderBy: { order: 'asc' } },
          topic: { select: { id: true, name: true } },
        },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy câu hỏi');

    await this.prisma.question.delete({ where: { id } });
    return { message: 'Đã xóa câu hỏi' };
  }

  /**
   * Kiểm tra số lượng option đúng theo từng type:
   *  - MULTIPLE_CHOICE: đúng 1 đáp án đúng
   *  - MULTI_SELECT: >= 1 đáp án đúng
   *  - TRUE_FALSE: đúng 2 option, 1 đúng 1 sai
   *  - FILL_IN_THE_BLANK: >= 1 đáp án đúng (các đáp án chấp nhận)
   */
  private validateOptions(
    type: QuestionType,
    options: Array<{ content: string; isCorrect: boolean }>,
  ) {
    const correctCount = options.filter((o) => o.isCorrect).length;

    switch (type) {
      case QuestionType.MULTIPLE_CHOICE:
        if (correctCount !== 1) {
          throw new BadRequestException(
            `MULTIPLE_CHOICE yêu cầu đúng 1 đáp án đúng, hiện có ${correctCount}`,
          );
        }
        if (options.length < 2) {
          throw new BadRequestException('Cần ít nhất 2 lựa chọn');
        }
        break;

      case QuestionType.MULTI_SELECT:
        if (correctCount < 1) {
          throw new BadRequestException(
            'MULTI_SELECT cần ít nhất 1 đáp án đúng',
          );
        }
        if (options.length < 2) {
          throw new BadRequestException('Cần ít nhất 2 lựa chọn');
        }
        break;

      case QuestionType.TRUE_FALSE:
        if (options.length !== 2) {
          throw new BadRequestException('TRUE_FALSE yêu cầu đúng 2 lựa chọn');
        }
        if (correctCount !== 1) {
          throw new BadRequestException(
            'TRUE_FALSE yêu cầu đúng 1 đáp án đúng',
          );
        }
        break;

      case QuestionType.FILL_IN_THE_BLANK:
        if (correctCount < 1) {
          throw new BadRequestException(
            'FILL_IN_THE_BLANK cần ít nhất 1 đáp án chấp nhận',
          );
        }
        break;
    }
  }
}
