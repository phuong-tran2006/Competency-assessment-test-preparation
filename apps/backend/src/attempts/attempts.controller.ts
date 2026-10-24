import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttemptsService } from './attempts.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  start(@Req() req: any, @Body() dto: CreateAttemptDto) {
    return this.attemptsService.startAttempt(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/answers/:questionId')
  saveAnswer(
    @Req() req: any,
    @Param('id') id: string,
    @Param('questionId') qId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.attemptsService.saveAnswer(id, qId, dto, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/submit')
  submit(@Req() req: any, @Param('id') id: string) {
    return this.attemptsService.submitAttempt(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('history')
  getHistory(@Req() req: any) {
    return this.attemptsService.getHistory(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/results')
  getResults(@Req() req: any, @Param('id') id: string) {
    return this.attemptsService.getResults(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/analysis')
  getAnalysis(@Req() req: any, @Param('id') id: string) {
    return this.attemptsService.getAnalysis(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.attemptsService.getAttempt(id, req.user.id);
  }
}
