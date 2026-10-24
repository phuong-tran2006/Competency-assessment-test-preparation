import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AttemptsModule } from '../attempts/attempts.module';

@Module({
  imports: [PrismaModule, AttemptsModule],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
