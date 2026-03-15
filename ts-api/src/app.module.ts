import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/datbase.module';
import { AuthModule } from './auth/auth.module';
import { ResumesModule } from './resumes/resumes.module';
import { JobsModule } from './jobs/jobs.module';
import { InterviewsModule } from './interviews/interviews.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,        // ✅ ConfigService available everywhere including APP_GUARD
      load: [configuration],
    }),
    PrismaModule,
    DatabaseModule,
    AuthModule,
    ResumesModule,
    JobsModule,
    InterviewsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // ✅ Only needs ConfigService + Reflector — both globally available
    },
  ],
})
export class AppModule {}