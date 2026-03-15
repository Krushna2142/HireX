import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  Req,
  UseInterceptors,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResumesService } from './resumes.service';

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private readonly service: ResumesService) {}

  @Post('upload-raw')
@UseInterceptors(FileInterceptor('file'))
async uploadRaw(@UploadedFile() file: Express.Multer.File, @Req() req: any) {

 console.log("Uploading file:", file?.originalname)

 if (!file) throw new BadRequestException('No file uploaded')

 const userId = req.user.id

 return this.service.saveRawResume(file, userId)
}
}