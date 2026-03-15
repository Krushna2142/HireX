/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { DatabaseModule } from './database/datbase.module';
import { AuthModule } from './auth/auth.module';
import { ResumesModule } from './resumes/resumes.module';
import { JobsModule } from './jobs/jobs.module';
import { InterviewsModule } from './interviews/interviews.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OllamaModule } from './ollama/ollama.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // ── BullMQ reads redis config parsed from REDIS_URL or individual vars
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redis = config.get('redis');
        return {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          connection: {
            host:     redis.host,
            port:     redis.port,
            password: redis.password,
            ...(redis.tls && {
              tls: { rejectUnauthorized: false },
            }),
          },
        };
      },
    }),

    PrismaModule,
    DatabaseModule,
    OllamaModule,
    AuthModule,
    ResumesModule,
    JobsModule,
    InterviewsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}