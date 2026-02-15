import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split('Bearer ')[1];

    if (!token) return false;

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      request.user = decodedToken;
      return true;
    } catch {
      return false;
    }
  }
}
