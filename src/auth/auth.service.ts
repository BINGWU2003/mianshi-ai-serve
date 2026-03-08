import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

export interface JwtPayload {
  sub: number;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * 验证用户名密码（示例：实际项目应从数据库查找用户）
   * 返回不含 password 的 user 对象，验证失败返回 null
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<
    { id: number; username: string; password: string },
    'password'
  > | null> {
    // TODO: 接入真实数据库查询
    const mockUser = {
      id: 1,
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
    };

    if (username !== mockUser.username) return null;

    const isMatch = await bcrypt.compare(password, mockUser.password);
    if (!isMatch) return null;

    const { password: _password, ...result } = mockUser;
    void _password;
    return result;
  }

  /**
   * 登录：校验用户后签发 access_token
   */
  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload: JwtPayload = { sub: user.id, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
