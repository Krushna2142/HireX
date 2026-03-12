import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
//  ts-api/src/users/users.controller.ts
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('me')
  async updateProfile(@Req() req: any, @Body() body: { full_name?: string }) {
    return this.usersService.updateProfile(req.user.id, body);
  }
}