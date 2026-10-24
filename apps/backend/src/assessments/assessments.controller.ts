import { Controller, Post, Req, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttemptsService } from '../attempts/attempts.service';
import { CreatePlacementDto } from '../attempts/dto/create-placement.dto';

@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('placement')
  createPlacement(@Req() req: any, @Body() dto: CreatePlacementDto) {
    return this.attemptsService.startPlacement(req.user.id, dto);
  }
}
