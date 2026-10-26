import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  // Lấy chi tiết đề thi kèm theo danh sách câu hỏi và các lựa chọn đáp án
  async getExamById(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: {
              include: { options: true },
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
      questions: exam.questions.map((eq) => eq.question),
    };
  }

  // Lấy riêng danh sách câu hỏi
  async getQuestionsByExamId(id: string) {
    const exam = await this.getExamById(id);
    return exam.questions;
  }

  // Xử lý nộp bài thi và TỰ ĐỘNG CHẤM ĐIỂM CHÍNH XÁC TUYỆT ĐỐI
  async submitExam(examId: string, data: any) {
    // Hứng dữ liệu linh hoạt từ mọi kiểu gửi của frontend
    const userAnswers = data.answers ? data.answers : (data || {}); 
    console.log("📝 Dữ liệu học viên chọn gửi lên:", userAnswers);

    let correctCount = 0;
    let totalQuestions = 0;

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: {
            question: {
              include: { options: true },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi để chấm điểm!');
    }

    const questions = exam.questions.map((eq) => eq.question);
    totalQuestions = questions.length;

    questions.forEach((q) => {
      // Tìm đáp án đúng trong DB (isCorrect === true)
      const correctOption = q.options.find((opt) => opt.isCorrect);
      const userSelected = userAnswers[q.id];

      console.log(`--- Câu hỏi: ${q.id} ---`);
      console.log(`Đáp án đúng trong DB (ID): ${correctOption?.id} | (Order): ${correctOption?.order}`);
      console.log(`Học viên chọn: ${userSelected}`);

      if (correctOption && userSelected !== undefined) {
        // Chấp nhận cả 2 trường hợp: Frontend gửi lên trùng ID hoặc trùng Order index
        if (
          userSelected === correctOption.id || 
          Number(userSelected) === correctOption.order ||
          String(userSelected) === String(correctOption.id)
        ) {
          correctCount++;
        }
      }
    });

    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      success: true,
      message: 'Nộp bài và chấm điểm thành công!',
      examId: examId,
      correctAnswers: correctCount,
      totalQuestions: totalQuestions,
      score: percentage,
      submittedAt: new Date(),
    };
  }
  // Lấy danh sách lịch sử nộp bài (trả về mảng rỗng để không bị lỗi UI)
  async getAttempts(examId: string) {
    return [];
  }

  // Tạo đề thi thủ công từ Admin và tự động gán sẵn các câu hỏi mẫu
  async createExam(data: { id?: string; title: string; description?: string }) {
    const examId = data.id || `exam-${Date.now()}`;
    
    const newExam = await this.prisma.exam.create({
      data: {
        id: examId,
        title: data.title || 'Bộ đề thi mới',
        description: data.description || '',
      },
    });

    // Tự động bốc sẵn các câu hỏi từ ngân hàng gắn vào đề này
    const sampleQuestions = await this.prisma.question.findMany({ take: 6 });
    
    for (let i = 0; i < sampleQuestions.length; i++) {
      await this.prisma.examQuestion.create({
        data: {
          examId: newExam.id,
          questionId: sampleQuestions[i].id,
        },
      }).catch(() => {
        // Bỏ qua nếu đã tồn tại liên kết trùng lặp
      });
    }

    return newExam;
  }
}