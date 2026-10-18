import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

@Module({
  controllers: [
    CoursesController,
    ChaptersController,
    LessonsController,
    MaterialsController,
  ],
  providers: [
    CoursesService,
    ChaptersService,
    LessonsService,
    MaterialsService,
  ],
})
export class CoursesModule {}
