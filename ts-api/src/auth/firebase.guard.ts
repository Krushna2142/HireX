import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) return false;

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = decoded;
      return true;
    } catch {
      return false;
    }
  }
}