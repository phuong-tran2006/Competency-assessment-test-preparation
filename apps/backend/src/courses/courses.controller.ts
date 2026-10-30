import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role, CourseStatus } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AttachTopicsDto } from './dto/attach-topics.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  // ===== Public =====
  @Get()
  findAll(@Query() query: any, @Req() req: any) {
    return this.courses.findAll(query, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.courses.findOne(id, req.user);
  }

  @Get(':id/lessons')
  getLessons(@Param('id') courseId: string) {
    return this.courses.findLessonsByCourse(courseId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post(':id/prerequisites')
  addPrerequisite(
    @Param('id') id: string,
    @Body('prerequisiteId') prereqId: string,
    @Req() req: any,
  ) {
    return this.courses.addPrerequisite(
      id,
      prereqId,
      req.user.id,
      req.user.role,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete(':id/prerequisites/:prerequisiteId')
  removePrerequisite(
    @Param('id') id: string,
    @Param('prerequisiteId') prereqId: string,
    @Req() req: any,
  ) {
    return this.courses.removePrerequisite(
      id,
      prereqId,
      req.user.id,
      req.user.role,
    );
  }

  // ===== Instructor / Admin =====
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post()
  create(@Req() req: any, @Body() dto: CreateCourseDto) {
    return this.courses.create(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courses.update(id, req.user.id, req.user.role, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.courses.remove(id, req.user.id, req.user.role);
  }

  // ===== Gắn / gỡ topic =====
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post(':id/topics')
  attachTopics(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: AttachTopicsDto,
  ) {
    return this.courses.attachTopics(
      id,
      req.user.id,
      req.user.role,
      dto.topicIds,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete(':id/topics/:topicId')
  detachTopic(
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Req() req: any,
  ) {
    return this.courses.detachTopic(id, topicId, req.user.id, req.user.role);
  }
}
