import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { FilterQuestionsDto } from './dto/filter-questions.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: FilterQuestionsDto) {
    const where: Prisma.QuestionWhereInput = {};
    if (filter.search) {
      where.content = { contains: filter.search, mode: 'insensitive' };
    }
    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.lessonId) where.lessonId = filter.lessonId;
    if (filter.type) where.type = filter.type;
    if (filter.difficulty) where.difficulty = filter.difficulty;
    return this.prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateQuestionDto) {
    const { options, ...rest } = dto;
    return this.prisma.question.create({
      data: {
        ...rest,
        options: options === undefined ? undefined : (options as Prisma.InputJsonValue),
      },
    });
  }

  update(id: string, dto: UpdateQuestionDto) {
    const { options, ...rest } = dto;
    return this.prisma.question.update({
      where: { id },
      data: {
        ...rest,
        ...(options !== undefined && {
          options: options as Prisma.InputJsonValue,
        }),
      },
    });
  }
}
