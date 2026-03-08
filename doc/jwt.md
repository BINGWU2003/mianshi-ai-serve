# NestJS 配置 JWT 认证

> 项目：`mianshi-ai-serve`
> 日期：2026-03-06

---

## 一、原理概述

JWT（JSON Web Token）认证的基本流程：

```
客户端                          服务端
  │                               │
  │  POST /auth/login             │
  │  { username, password }  ─── ►│ 核验账号密码
  │                               │ ↓ 通过
  │◄── { access_token: "xxx" } ── │ 用密钥签发 JWT
  │                               │
  │  GET /user                    │
  │  Authorization: Bearer xxx ──►│ AuthGuard 验证 JWT
  │                               │ ↓ 有效
  │◄── 响应数据 ────────────────── │ 放行，执行 Controller
```

JWT 本身由三段 Base64 组成：`Header.Payload.Signature`

- **Header**：算法类型（默认 HS256）
- **Payload**：自定义数据（`sub` 用户 ID、`username`、过期时间等）
- **Signature**：使用服务端密钥对前两段签名，防篡改

---

## 二、安装依赖

```bash
# 运行时依赖
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs

# 类型声明（开发依赖）
pnpm add -D @types/passport-jwt @types/bcryptjs
```

| 包                          | 用途                                              |
| --------------------------- | ------------------------------------------------- |
| `@nestjs/jwt`               | NestJS 官方封装，提供 `JwtModule` 和 `JwtService` |
| `@nestjs/passport`          | NestJS 与 Passport 的集成层                       |
| `passport` / `passport-jwt` | Passport 核心 + JWT 策略                          |
| `bcryptjs`                  | 密码 hash 和比对，纯 JS 实现（无需编译）          |

---

## 三、配置环境变量

`.env`：

```env
DB_TYPE=mongodb
DB_URL=mongodb://localhost:27017/test

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d
```

> **⚠️ 生产环境**：`JWT_SECRET` 必须替换为高强度随机字符串（32位以上），绝不能提交到 Git。

---

## 四、文件结构

本次新增的文件全部位于 `src/auth/` 目录：

```
src/
├── auth/
│   ├── dto/
│   │   └── login.dto.ts       ← 登录请求体 DTO（参数校验）
│   ├── auth.module.ts         ← 注册 JwtModule，导出供外部使用
│   ├── auth.service.ts        ← 业务逻辑：校验用户、签发 Token
│   ├── auth.controller.ts     ← 路由：POST /auth/login
│   └── auth.guard.ts          ← 路由守卫：验证 Bearer Token
├── app.module.ts              ← 根模块，引入 AuthModule
└── .env                       ← 环境变量：JWT_SECRET、JWT_EXPIRES_IN
```

---

## 五、各文件完整代码与说明

### 5.1 `dto/login.dto.ts` — 请求体校验

```typescript
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于 6 位' })
  password: string;
}
```

**要点：**

- 使用 `class-validator` 装饰器，配合 `ValidationPipe` 自动校验请求体。
- 需要在 `main.ts` 开启全局 `ValidationPipe`（`useGlobalPipes(new ValidationPipe())`）。

---

### 5.2 `auth.service.ts` — 核心业务逻辑

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

export interface JwtPayload {
  sub: number; // JWT 标准字段，存放用户 ID
  username: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * 校验用户名密码。
   * 实际项目中应改为从数据库查询用户，
   * 这里暂时 mock 数据。
   */
  async validateUser(username: string, password: string) {
    // TODO: 替换为真实数据库查询
    const mockUser = {
      id: 1,
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
    };

    if (username !== mockUser.username) return null;

    const isMatch = await bcrypt.compare(password, mockUser.password);
    if (!isMatch) return null;

    // 返回时去掉 password 字段，避免敏感信息泄露
    const { password: _password, ...result } = mockUser;
    void _password;
    return result;
  }

  /**
   * 登录：校验通过后使用 jwtService 签发 access_token。
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
```

**要点：**

- `bcrypt.hash` 将明文密码哈希存储，`bcrypt.compare` 比对时无需解密。
- `jwtService.signAsync(payload)` 会自动按 `AuthModule` 中配置的 `secret` 和 `expiresIn` 签名。
- 返回值只含 `access_token`，客户端需自行存储（如 `localStorage`）。

---

### 5.3 `auth.module.ts` — 注册 JwtModule

```typescript
import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [JwtModule, AuthGuard, AuthService],
})
export class AuthModule {}
```

**要点：**

- 使用 `JwtModule.registerAsync` 而非 `JwtModule.register`，可从 `ConfigService` 异步读取环境变量，避免在模块初始化时环境变量尚未加载的问题。
- `configService.getOrThrow` 表示若环境变量缺失则直接报错，比 `get` 更安全。
- `exports` 中必须导出 `JwtModule`，这样 `AuthGuard`（以及其他需要 `JwtService` 的模块）才能正常注入 `JwtService`。

---

### 5.4 `auth.controller.ts` — 登录接口

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK) // 默认 POST 返回 201，这里强制返回 200
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.password);
  }
}
```

**要点：**

- `@HttpCode(HttpStatus.OK)` 将登录接口的状态码从默认 `201 Created` 改为 `200 OK`，语义更准确。
- `@Body()` 会自动把请求体反序列化为 `LoginDto` 实例，`ValidationPipe` 同步触发校验。

---

### 5.5 `auth.guard.ts` — JWT 路由守卫

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { JwtPayload } from './auth.service';

// 扩展 Request 类型，挂载解码后的用户信息
type RequestWithUser = Request & { user?: JwtPayload };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('未携带 Token，请先登录');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      // 将解码后的 payload 挂载到 request，Controller 可通过 @Req() 取到
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Token 无效或已过期，请重新登录');
    }

    return true;
  }

  // 从 "Authorization: Bearer <token>" 头中提取 token
  private extractTokenFromHeader(request: RequestWithUser): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

**要点：**

- `canActivate` 返回 `false` 或抛出异常都会阻止请求到达 Controller。
- `jwtService.verifyAsync` 会同时验证签名合法性和是否过期；任何异常都会进 `catch`，统一抛 `401`。
- `request.user = payload` 将解码后的用户信息挂到请求对象，后续 Controller 可通过 `@Req() req` 直接读取 `req.user`。

---

### 5.6 `app.module.ts` — 根模块注册

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule, // ← 引入 AuthModule
    UserModule,
  ],
  // ...
})
export class AppModule {}
```

**要点：**

- `ConfigModule` 必须在 `AuthModule` **之前**声明，确保 `ConfigService` 在 `AuthModule` 初始化时已可用。
- `isGlobal: true` 使 `ConfigModule` 在整个应用中无需再次 `import` 即可使用。

---

### 5.7 使用守卫保护路由

在需要保护的 Controller 或方法上添加 `@UseGuards(AuthGuard)`：

```typescript
// src/user/user.controller.ts
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

@Controller('user')
export class UserController {
  @Get()
  @UseGuards(AuthGuard) // ← 只保护这一个接口
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    // 该接口不加守卫，公开访问
    return this.userService.findOne(id);
  }
}
```

也可以将 `@UseGuards(AuthGuard)` 加在 `@Controller` 类级别，保护整个 Controller 下所有路由。

---

## 六、接口调试示例

### 登录获取 Token

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

成功响应：

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJpYXQiOjE3MDk3MjQ4MDAsImV4cCI6MTcxMDMyOTYwMH0.xxxxxx"
}
```

### 访问受保护接口

```http
GET /user
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token 缺失响应（401）：

```json
{ "message": "未携带 Token，请先登录", "statusCode": 401 }
```

Token 过期/无效响应（401）：

```json
{ "message": "Token 无效或已过期，请重新登录", "statusCode": 401 }
```

---

## 七、扩展方向

### 7.1 接入真实数据库

将 `auth.service.ts` 中的 mock 替换为 `UserService` 查询：

```typescript
// 注入 UserService
constructor(
  private readonly jwtService: JwtService,
  private readonly userService: UserService,
) {}

async validateUser(username: string, password: string) {
  const user = await this.userService.findByUsername(username);
  if (!user) return null;
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return null;
  const { password: _, ...result } = user;
  return result;
}
```

### 7.2 `@CurrentUser()` 自定义装饰器

避免在每个方法里写 `@Req() req`，封装一个装饰器直接取出 `user`：

```typescript
// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Controller 中使用
@Get('profile')
@UseGuards(AuthGuard)
getProfile(@CurrentUser() user: JwtPayload) {
  return user; // { sub: 1, username: 'admin' }
}
```

### 7.3 全局守卫 + `@Public()` 装饰器

注册全局守卫，仅对标记了 `@Public()` 的路由放行，其余全部要求认证：

```typescript
// app.module.ts
providers: [
  { provide: APP_GUARD, useClass: AuthGuard },
]

// src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// auth.guard.ts 中增加判断
const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
  context.getHandler(),
  context.getClass(),
]);
if (isPublic) return true;

// 使用
@Public()
@Post('login')
login() { ... }
```

### 7.4 Refresh Token 双 Token 方案

|        | Access Token          | Refresh Token         |
| ------ | --------------------- | --------------------- |
| 有效期 | 短（15min ~ 2h）      | 长（7d ~ 30d）        |
| 用途   | 访问受保护接口        | 换取新的 Access Token |
| 存储   | `localStorage` / 内存 | `httpOnly Cookie`     |

流程：access_token 过期 → 客户端用 refresh_token 请求 `/auth/refresh` → 服务端验证后签发新 access_token。
