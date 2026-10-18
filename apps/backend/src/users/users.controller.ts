import { Body, Controller, Get, Patch, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: any) {
    return this.users.me(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  update(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.users.update(req.user.id, dto);
  }
}
