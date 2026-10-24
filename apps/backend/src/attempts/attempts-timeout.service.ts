import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AttemptsService } from './attempts.service';

@Injectable()
export class AttemptsTimeoutService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AttemptsTimeoutService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly attempts: AttemptsService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, 15_000);

    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const count = await this.attempts.autoSubmitExpired(100);
      if (count > 0) {
        this.logger.log(`Đã tự nộp ${count} bài quá hạn`);
      }
    } catch (error) {
      this.logger.error(
        'Tự nộp bài quá hạn thất bại',
        error as Error,
      );
    } finally {
      this.running = false;
    }
  }
}
