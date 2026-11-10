import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MasteryHistoryQueryDto, MasteryQueryDto, PracticeQuestionsQueryDto } from './dto/mastery-query.dto';
import { MasteryService } from './mastery.service';

@Controller('mastery')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MasteryController {
  constructor(private readonly mastery: MasteryService) {}

  @Get('me')
  @Roles(Role.STUDENT)
  profile(@Req() req: { user: { id: string } }, @Query() query: MasteryQueryDto) {
    return this.mastery.getProfile(req.user.id, query);
  }

  @Get('me/questions')
  @Roles(Role.STUDENT)
  questions(@Req() req: { user: { id: string } }, @Query() query: PracticeQuestionsQueryDto) {
    return this.mastery.getQuestions(req.user.id, query);
  }

  @Get('me/history')
  @Roles(Role.STUDENT)
  history(@Req() req: { user: { id: string } }, @Query() query: MasteryHistoryQueryDto) {
    return this.mastery.getHistory(req.user.id, query);
  }

  @Get('users/:userId')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  studentProfile(@Param('userId') userId: string, @Query() query: MasteryQueryDto) {
    return this.mastery.getProfile(userId, query);
  }

  @Get('users/:userId/questions')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  studentQuestions(@Param('userId') userId: string, @Query() query: PracticeQuestionsQueryDto) {
    return this.mastery.getQuestions(userId, query);
  }

  @Get('users/:userId/history')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  studentHistory(@Param('userId') userId: string, @Query() query: MasteryHistoryQueryDto) {
    return this.mastery.getHistory(userId, query);
  }
}
