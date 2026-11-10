import { Controller, Get, Post, Body, Param, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // API lấy danh sách tất cả các bộ đề thi
  @Get()
  async getAllExams() {
    return this.examsService.getAllExams();
  }

  // API lấy chi tiết bộ đề thi (options đã strip `isCorrect`)
  @Get(':id')
  async getExamById(@Param('id') id: string) {
    return this.examsService.getExamById(id);
  }

  // API lấy danh sách câu hỏi (options đã strip `isCorrect`)
  @Get(':id/questions')
  async getQuestionsByExamId(@Param('id') id: string) {
    return this.examsService.getQuestionsByExamId(id);
  }

  // API Giảng viên/Admin tạo bộ đề thi mới
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createExam(
    @Body() body: { id?: string; title: string; description?: string },
    @Req() req: any,
  ) {
    const user = req.user;
    if (user && user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      throw new UnauthorizedException('Bạn không có quyền tạo đề thi.');
    }

    return this.examsService.createExam(body);
  }
}
