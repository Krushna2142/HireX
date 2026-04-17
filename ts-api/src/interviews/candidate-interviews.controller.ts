import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';

@Controller('candidate/interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('candidate')
export class CandidateInterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  listMy(
    @Req() req: any,
    @Query('statusCode') statusCode?: string,
    @Query('limit') limit?: string,
  ) {
    return this.interviewsService.listCandidateInterviews(req.user.id, {
      statusCode: statusCode ? Number(statusCode) : undefined,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.interviewsService.getCandidateInterview(req.user.id, id);
  }
}