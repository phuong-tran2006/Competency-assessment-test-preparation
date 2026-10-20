import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Thêm PrismaModule vào đây
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}