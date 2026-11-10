import { Module } from '@nestjs/common';
import { MasteryController } from './mastery.controller';
import { MasteryService } from './mastery.service';
import { UsersMasteryController } from './users-mastery.controller';

@Module({ controllers: [MasteryController, UsersMasteryController], providers: [MasteryService], exports: [MasteryService] })
export class MasteryModule {}
