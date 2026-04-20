/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorators';
import { Roles } from '../auth/decorators/roles.decorators';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Public()
  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.admin.login(body.username, body.password);
  }

  @Get('dashboard')
  @Roles('admin')
  dashboard(@Req() req: any) {
    return this.admin.getDashboard(req.user.id);
  }
}
