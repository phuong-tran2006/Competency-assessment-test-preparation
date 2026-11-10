import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Các API public của module này KHÔNG BAO GIỜ trả về `isCorrect`.
// Đáp án đúng chỉ được chấm ở phía server qua luồng Attempts
// (POST /attempts → PUT answers → POST /attempts/:id/submit).
function sanitizeOption(option: {
  id: string;
  content: string;
  order: number;
}) {
  return { id: option.id, content: option.content, order: option.order };
}

function sanitizeQuestion(question: any) {
  const { ...rest } = question;
  return {
    ...rest,
    options: (question.options ?? []).map(sanitizeOption),
  };
}

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  // Lấy danh sách tất cả các bộ đề thi kèm số lượng câu hỏi
  async getAllExams() {
    return this.prisma.exam.findMany({
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  // Lấy chi tiết đề thi kèm danh sách câu hỏi.
  // Options đã được strip `isCorrect` — client không bao giờ thấy đáp án.
  async getExamById(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: {
              include: {
                options: {
                  select: { id: true, content: true, order: true },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy bộ đề thi với mã: ${id}`);
    }

    // Ép phẳng mảng câu hỏi lồng nhau từ bảng trung gian để Frontend hiển thị được số câu
    return {
      ...exam,
      questions: exam.questions.map((eq) => sanitizeQuestion(eq.question)),
    };
  }

  // Lấy riêng danh sách câu hỏi (đã strip `isCorrect`)
  async getQuestionsByExamId(id: string) {
    const exam = await this.getExamById(id);
    return exam.questions.map(sanitizeQuestion);
  }

  /**
   * @deprecated Luồng nộp bài legacy — không lưu DB, không auth, match lỏng.
   * Dùng POST /attempts/:id/submit thay thế. Giữ lại để tương thích ngược,
   * luôn báo lỗi hướng dẫn client chuyển sang luồng mới.
   */
  async submitExam() {
    throw new BadRequestException(
      'API này đã ngừng hỗ trợ. Hãy dùng POST /attempts/:id/submit để nộp bài.',
    );
  }

  /**
   * @deprecated Không còn dùng. Lịch sử làm bài xem qua GET /attempts/history.
   */
  async getAttempts() {
    return [];
  }

  // Tạo đề thi thủ công từ Admin. KHÔNG tự bốc câu hỏi mẫu nữa —
  // câu hỏi do admin/giảng viên gắn tường minh qua ExamQuestion.
  async createExam(data: { id?: string; title: string; description?: string }) {
    const examId = (data.id || `exam-${Date.now()}`).trim();
    if (!examId) {
      throw new BadRequestException('Mã đề thi không hợp lệ.');
    }

    const existing = await this.prisma.exam.findUnique({
      where: { id: examId },
    });
    if (existing) {
      throw new BadRequestException(
        `Mã đề thi "${examId}" đã tồn tại. Vui lòng chọn mã khác.`,
      );
    }

    return this.prisma.exam.create({
      data: {
        id: examId,
        title: data.title?.trim() || 'Bộ đề thi mới',
        description: data.description || '',
      },
    });
  }
}
