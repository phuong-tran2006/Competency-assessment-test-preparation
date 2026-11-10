import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  async getAllExams() {
    return this.examsService.getAllExams();
  }

  // API Lấy Hồ sơ Năng lực Elo & Thống kê Kho 400 câu hỏi
  @Get('profile/elo')
  async getLearnerDashboard(@Req() req: any) {
    return this.examsService.getLearnerDashboard(req.user?.id);
  }

  // API Bốc câu hỏi ngẫu nhiên từ Kho 400 câu (Adaptive Practice theo Topic & Độ khó)
  @Get('bank/practice')
  async getPracticeFromBank(
    @Query('topic') topic?: string,
    @Query('difficulty') difficulty?: string,
    @Query('count') count?: string,
  ) {
    return this.examsService.getPracticeFromBank({
      topicName: topic,
      difficulty: difficulty ? Number(difficulty) : undefined,
      count: count ? Number(count) : 20,
    });
  }

  @Get(':id')
  async getExamById(@Param('id') id: string) {
    return this.examsService.getExamById(id);
  }

  @Get(':id/questions')
  async getQuestionsByExamId(
    @Param('id') id: string,
    @Query('topic') topic?: string,
    @Query('count') count?: string,
  ) {
    // Nếu mã đề là 'adaptive-bank' thì bốc ngẫu nhiên từ Kho 400 câu hỏi!
    if (id.startsWith('bank-')) {
      return this.examsService.getQuestionsFromBankByCode(id, count ? Number(count) : 20);
    }
    return this.examsService.getQuestionsByExamId(id);
  }

  @Post(':id/submit')
  async submitExam(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.examsService.submitExam(id, body, req.user?.id);
  }

  @Get(':id/attempts')
  async getAttempts(@Param('id') id: string) {
    return this.examsService.getAttempts(id);
  }

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