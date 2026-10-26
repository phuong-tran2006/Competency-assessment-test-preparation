// import { Controller, Get } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    //update
    private readonly appService: AppService,
  ) {}

  //update
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // API lấy câu hỏi cho đề thi
  /*
  @Get('exams/:id/questions')
  async getExamQuestions(@Param('id') id: string) {
    // Truy vấn danh sách câu hỏi trong Database kèm theo danh sách lựa chọn đáp án (options)
    const questions = await this.prisma.question.findMany({
      include: {
        options: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!questions || questions.length === 0) {
      throw new NotFoundException(`Chưa có dữ liệu câu hỏi trong cơ sở dữ liệu`);
    }

    // Biến đổi cấu trúc dữ liệu trả về sao cho khớp với kiểu dữ liệu Question trên Frontend
    return questions.map((q) => ({
      id: q.id,
      examId: id,
      content: q.content,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.content, // Map từ `content` trong DB sang `text` ở Frontend
        isCorrect: opt.isCorrect,
      })),
    }));
  }
    */
}
