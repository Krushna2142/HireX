/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
// ts-api/src/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async getProfile(userId: string) {
    const result = await this.db.query(
      'SELECT id, full_name, email, created_at FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    return result.rows[0];
  }

  async updateProfile(userId: string, data: { full_name?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.full_name) {
      fields.push(`full_name = $${idx++}`);
      values.push(data.full_name);
    }

    if (fields.length === 0) {
      return this.getProfile(userId);
    }

    values.push(userId);
    const result = await this.db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, full_name, email, created_at`,
      values,
    );

    return result.rows[0];
  }
}