import { Test, TestingModule } from '@nestjs/testing';
import { ExamsService } from './exams.service';
import { AttemptsService } from '../attempts/attempts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExamsService', () => {
  let service: ExamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: AttemptsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
