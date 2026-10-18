import {
  Body,
  Controller,
  Delete,
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
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.INSTRUCTOR, Role.ADMIN)
@Controller()
export class ChaptersController {
  constructor(private readonly chapters: ChaptersService) {}

  @Post('courses/:courseId/chapters')
  create(
    @Param('courseId') courseId: string,
    @Req() req: any,
    @Body() dto: CreateChapterDto,
  ) {
    return this.chapters.create(courseId, req.user.id, req.user.role, dto);
  }

  @Patch('chapters/:id')
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.chapters.update(id, req.user.id, req.user.role, dto);
  }

  @Delete('chapters/:id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.chapters.remove(id, req.user.id, req.user.role);
  }
}
