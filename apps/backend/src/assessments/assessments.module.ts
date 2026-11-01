import { Module } from '@nestjs/common';
import { AttemptsModule } from '../attempts/attempts.module';
import { AssessmentsController } from './assessments.controller';

@Module({
  imports: [AttemptsModule],
  controllers: [AssessmentsController],
})
export class AssessmentsModule {}
