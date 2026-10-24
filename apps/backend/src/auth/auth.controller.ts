import { Body, Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
  @UseGuards(AuthGuard('jwt'))
  @Get('status')
  getStatus(@Req() req: any) {
    return { isValid: true, user: req.user };
  }

  // Endpoint logout (Stateless JWT - chỉ trả success để FE xóa token)
  @Post('logout')
  logout() {
    return { success: true, message: 'Đăng xuất thành công' };
  }
}
