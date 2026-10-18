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
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Controller()
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  // ===== Public =====
  @Get('lessons/:lessonId/materials')
  findByLesson(@Param('lessonId') lessonId: string) {
    return this.materials.findByLesson(lessonId);
  }

  @Get('materials/:id')
  findOne(@Param('id') id: string) {
    return this.materials.findOne(id);
  }

  // ===== Instructor / Admin =====
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post('lessons/:lessonId/materials')
  create(
    @Param('lessonId') lessonId: string,
    @Req() req: any,
    @Body() dto: CreateMaterialDto,
  ) {
    return this.materials.create(lessonId, req.user.id, req.user.role, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Patch('materials/:id')
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.materials.update(id, req.user.id, req.user.role, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete('materials/:id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.materials.remove(id, req.user.id, req.user.role);
  }
}
