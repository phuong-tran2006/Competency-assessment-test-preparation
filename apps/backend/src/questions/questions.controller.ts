import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateQuestionDto } from './dto/create-question.dto';
import { FilterQuestionsDto } from './dto/filter-questions.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get()
  findAll(@Query() filter: FilterQuestionsDto) {
    return this.questions.findAll(filter);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateQuestionDto) {
    return this.questions.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questions.update(id, dto);
  }
}
