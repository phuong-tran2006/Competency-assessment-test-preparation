import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { AddPrerequisiteDto } from './dto/add-prerequisite.dto';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topics: TopicsService) {}

  // ==================== Public ====================

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.topics.findAll({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.topics.findOne(id);
  }

  @Get(':id/graph')
  getGraph(@Param('id') id: string) {
    return this.topics.getGraph(id);
  }

  // ==================== Instructor / Admin ====================

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateTopicDto) {
    return this.topics.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.topics.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.topics.remove(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Post(':id/prerequisites')
  addPrerequisite(
    @Param('id') topicId: string,
    @Body() dto: AddPrerequisiteDto,
  ) {
    return this.topics.addPrerequisite(topicId, dto.prerequisiteId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Delete(':id/prerequisites/:prerequisiteId')
  removePrerequisite(
    @Param('id') topicId: string,
    @Param('prerequisiteId') prerequisiteId: string,
  ) {
    return this.topics.removePrerequisite(topicId, prerequisiteId);
  }
}
