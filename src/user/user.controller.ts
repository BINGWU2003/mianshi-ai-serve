import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { Body, Param } from '@nestjs/common';
import { UserService } from './user.service';
import type { User } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '../auth/auth.guard';
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard)
  findAll(): User[] {
    console.log('findAll');
    return this.userService.findAll();
  }
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number): User | null {
    const user = this.userService.findOne(id);
    console.log('user', user);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
  @Post()
  create(@Body() user: CreateUserDto): User {
    return this.userService.create(user as Omit<User, 'id'>);
  }
  @Put(':id')
  update(@Param('id') id: number, @Body() user: Omit<User, 'id'>): User | null {
    const result = this.userService.update(id, user);
    if (!result) {
      throw new Error('User not found');
    }
    return result;
  }
  @Delete(':id')
  delete(@Param('id') id: number): boolean {
    const result = this.userService.delete(id);
    if (!result) {
      throw new Error('User not found');
    }
    return this.userService.delete(id);
  }
}
