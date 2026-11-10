import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MasteryQueryDto, RecommendationsQueryDto } from './dto/mastery-query.dto';
import { MasteryService } from './mastery.service';

/**
 * Alias route khớp API spec tuần 44/45 (`/users/me/...`).
 * Route gốc `/mastery/...` vẫn giữ nguyên để FE hiện tại không gãy.
 */
@Controller('users/me')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.STUDENT)
export class UsersMasteryController {
  constructor(private readonly mastery: MasteryService) {}

  @Get('mastery')
  list(@Req() req: { user: { id: string } }, @Query() query: MasteryQueryDto) {
    return this.mastery.getProfile(req.user.id, query);
  }

  @Get('mastery/:topicId')
  one(@Req() req: { user: { id: string } }, @Param('topicId') topicId: string, @Query() query: MasteryQueryDto) {
    return this.mastery.getProfile(req.user.id, Object.assign(new MasteryQueryDto(), query, { topicId }));
  }

  @Get('recommendations')
  recommendations(@Req() req: { user: { id: string } }, @Query() query: RecommendationsQueryDto) {
    return this.mastery.getRecommendations(req.user.id, query);
  }

  @Get('recommendations/:topicId')
  recommendationDetail(
    @Req() req: { user: { id: string } },
    @Param('topicId') topicId: string,
    @Query() query: RecommendationsQueryDto,
  ) {
    return this.mastery.getRecommendationDetail(req.user.id, topicId, query);
  }
}
