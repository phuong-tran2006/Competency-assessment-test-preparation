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

  // API lấy chi tiết bộ đề thi
  @Get(':id')
  async getExamById(@Param('id') id: string) {
    return this.examsService.getExamById(id);
  }

  // API lấy danh sách câu hỏi (để tương thích hoàn toàn với cấu trúc Frontend)
  @Get(':id/questions')
  async getQuestionsByExamId(@Param('id') id: string) {
    return this.examsService.getQuestionsByExamId(id);
  }

  // API Nộp bài thi (Nhận tín hiệu từ nút "Nộp bài" trên Frontend)
  @Post(':id/submit')
  async submitExam(@Param('id') id: string, @Body() body: any) {
    return this.examsService.submitExam(id, body);
  }

  // API Lịch sử làm bài (Chống lỗi gãy luồng nếu Frontend gọi đến)
  @Get(':id/attempts')
  async getAttempts(@Param('id') id: string) {
    return this.examsService.getAttempts(id);
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