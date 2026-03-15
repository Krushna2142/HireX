import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/datbase.module';
import { AuthModule } from './auth/auth.module';
import { ResumesModule } from './resumes/resumes.module';
import { JobsModule } from './jobs/jobs.module';
import { InterviewsModule } from './interviews/interviews.module';
import { PrismaModule } from 'prisma/prisma.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'; // ✅ adjust path if different

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,    // ✅ before everything — global @prisma dependency
    DatabaseModule,
    AuthModule,      // ✅ must be before feature modules so guard can resolve AuthService
    ResumesModule,
    JobsModule,
    InterviewsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // ✅ enforces auth globally — no per-module wiring needed
    },
  ],
})
export class AppModule {}