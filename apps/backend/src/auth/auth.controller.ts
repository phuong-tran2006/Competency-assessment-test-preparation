import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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

  // Kiểm tra token còn hiệu lực không (FE dùng để check trạng thái đăng nhập)
  @UseGuards(AuthGuard('jwt'))
  @Get('status')
  status(@Req() req: any) {
    return {
      authenticated: true,
      user: { id: req.user.id, email: req.user.email, role: req.user.role },
    };
  }

  // JWT stateless: server không lưu token nên logout = client xóa token.
  // Endpoint này để FE gọi thống nhất, sau này có blacklist sẽ xử lý ở đây.
  @Post('logout')
  logout() {
    return { message: 'Đã đăng xuất' };
  }
}
