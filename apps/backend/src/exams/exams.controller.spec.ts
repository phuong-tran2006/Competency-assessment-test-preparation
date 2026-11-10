import { Test, TestingModule } from '@nestjs/testing';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

describe('ExamsController', () => {
  let controller: ExamsController;
  let service: { getAllExams: jest.Mock; getExamById: jest.Mock; getQuestionsByExamId: jest.Mock };

  beforeEach(async () => {
    service = {
      getAllExams: jest.fn(),
      getExamById: jest.fn(),
      getQuestionsByExamId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsController],
      providers: [{ provide: ExamsService, useValue: service }],
    }).compile();

    controller = module.get<ExamsController>(ExamsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAllExams ủy quyền cho service', async () => {
    service.getAllExams.mockResolvedValue([]);
    await controller.getAllExams();
    expect(service.getAllExams).toHaveBeenCalled();
  });

  it('getExamById truyền đúng id', async () => {
    service.getExamById.mockResolvedValue({ id: 'e1' });
    await controller.getExamById('e1');
    expect(service.getExamById).toHaveBeenCalledWith('e1');
  });

  it('getQuestionsByExamId truyền đúng id', async () => {
    service.getQuestionsByExamId.mockResolvedValue([]);
    await controller.getQuestionsByExamId('e1');
    expect(service.getQuestionsByExamId).toHaveBeenCalledWith('e1');
  });
});
