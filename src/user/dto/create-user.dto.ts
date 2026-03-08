import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: '名字长度不能小于2' })
  @MaxLength(12, { message: '名字长度不能大于12' })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '密码长度不能小于8' })
  @MaxLength(32, { message: '密码长度不能大于32' })
  password: string;
}
