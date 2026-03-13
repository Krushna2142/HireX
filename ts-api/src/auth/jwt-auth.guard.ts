/* eslint-disable prettier/prettier */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwtSecret: string;

  constructor(private readonly config: ConfigService, private readonly authService: AuthService) {
    this.jwtSecret = this.config.get<string>('jwt.secret') || 'supersecretkey';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers['authorization'];
    if (!authHeader) throw new UnauthorizedException('Missing Authorization header');

    const token = authHeader.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('Missing token');

    try {
      // Verify using AuthService method (your own JWT)
      const payload = this.authService.verifyToken(token);
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}