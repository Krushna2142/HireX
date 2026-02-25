import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseGuard } from './firebase.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, FirebaseGuard],
  exports: [FirebaseGuard],
})
export class AuthModule {}