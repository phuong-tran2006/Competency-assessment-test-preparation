/* import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Điều chỉnh đường dẫn đến PrismaService của bạn

@Controller('exams')
export class ExamsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/questions')
  async getExamQuestions(@Param('id') id: string) {
    // Nếu trong hệ thống của bạn các câu hỏi được lấy theo Topic hoặc Exam, 
    // bạn có thể tùy chỉnh query cho phù hợp. 
    // Dưới đây là ví dụ lấy toàn bộ câu hỏi (hoặc lọc theo cấu trúc đề thi nếu có bảng Exam):
    
    const questions = await this.prisma.question.findMany({
      include: {
        options: true, // Lấy kèm danh sách đáp án A, B, C, D
      },
      take: 10, // Lấy giới hạn số câu hỏi cho một đề thi thử
    });

    if (!questions || questions.length === 0) {
      throw new NotFoundException(`Không tìm thấy câu hỏi cho đề thi ${id}`);
    }

    return questions;
  }
} */

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ExamsService } from './exams.service';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // API lấy câu hỏi đề thi: GET /exams/:id/questions
  @Get(':id/questions')
  async getExamQuestions(@Param('id') id: string) {
    return this.examsService.getQuestionsByExamId(id);
  }

  // API nộp bài thi: POST /exams/:id/submit
  @Post(':id/submit')
  async submitExam(
    @Param('id') id: string,
    @Body() body: { answers: Record<string, string> },
  ) {
    return this.examsService.submitExam(id, body.answers);
  }
}