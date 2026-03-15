/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Controller, Get, Put, Body, Req,
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.candidates.getEnrichedProfile(req.user.id);
  }

  @Put('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateCandidateProfileDto) {
    return this.candidates.updateProfile(req.user.id, dto);
  }

  @Get('profile/completion')
  getCompletion(@Req() req: any) {
    return this.candidates.getCompletionDetails(req.user.id);
  }
}