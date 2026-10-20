import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Controller()
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  // ===== Public: đọc nội dung =====
  @Get('courses/:courseId/lessons')
  findByCourse(@Param('courseId') courseId: string) {
    return this.lessons.findByCourse(courseId);
  }

  @Get('chapters/:chapterId/lessons')
  findByChapter(@Param('chapterId') chapterId: string) {
    return this.lessons.findByChapter(chapterId);
  }

  @Get('lessons/:id')
  findOne(@Param('id') id: string) {
    return this.lessons.findOne(id);
  }

  // ===== Instructor / Admin: ghi =====
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post('chapters/:chapterId/lessons')
  create(
    @Param('chapterId') chapterId: string,
    @Req() req: any,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessons.create(chapterId, req.user.id, req.user.role, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Patch('lessons/:id')
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessons.update(id, req.user.id, req.user.role, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete('lessons/:id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.lessons.remove(id, req.user.id, req.user.role);
  }
}
