import { Controller, Get, Param } from '@nestjs/common';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessons.findOne(id);
  }
}
