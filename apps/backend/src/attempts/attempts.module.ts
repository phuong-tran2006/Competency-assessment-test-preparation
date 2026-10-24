import { Module } from '@nestjs/common';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { AttemptsTimeoutService } from './attempts-timeout.service';

@Module({
  controllers: [AttemptsController],
  providers: [AttemptsService, AttemptsTimeoutService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
