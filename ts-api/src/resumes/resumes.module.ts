import { Module } from '@nestjs/common';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module'; // ✅ Add this

@Module({
  imports: [
    PrismaModule,
    AuthModule, // ✅ Makes AuthService + JwtAuthGuard available in this context
  ],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}