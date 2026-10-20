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

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalAuthGuard } from '../common/guards/optional-auth.guard';
import { ExamsService } from './exams.service';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // API lấy danh sách đề thi: GET /exams
  @Get()
  async getExams() {
    return this.examsService.findAll();
  }

  // API lấy câu hỏi đề thi: GET /exams/:id/questions
  @Get(':id/questions')
  async getExamQuestions(@Param('id') id: string) {
    return this.examsService.getQuestionsByExamId(id);
  }

  // API nộp bài thi: POST /exams/:id/submit (lưu attempt nếu đã đăng nhập)
  @UseGuards(OptionalAuthGuard)
  @Post(':id/submit')
  async submitExam(
    @Param('id') id: string,
    @Body() body: { answers: Record<string, string | string[]> },
    @Req() req: any,
  ) {
    return this.examsService.submitExam(id, body.answers, req.user?.id);
  }

  // Lịch sử làm bài của chính mình: GET /exams/:id/attempts
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/attempts')
  async getAttempts(@Param('id') id: string, @Req() req: any) {
    return this.examsService.getAttempts(id, req.user.id);
  }
}