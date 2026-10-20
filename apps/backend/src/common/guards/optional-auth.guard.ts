import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard JWT "mềm": có token hợp lệ thì gắn user, không có/không hợp lệ
// thì cho qua với user = null (dùng cho route public nhưng phân biệt role).
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
