import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async getProfile(userId: string) {
    const result = await this.db.query(
      'SELECT id, full_name, email, headline, location, bio, created_at FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    return result.rows[0];
  }

  async updateProfile(userId: string, data: { full_name?: string; headline?: string; location?: string; bio?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.full_name) {
      fields.push(`full_name = $${idx++}`);
      values.push(data.full_name);
    }
    if (data.headline !== undefined) {
      fields.push(`headline = $${idx++}`);
      values.push(data.headline);
    }
    if (data.location !== undefined) {
      fields.push(`location = $${idx++}`);
      values.push(data.location);
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(data.bio);
    }

    if (fields.length === 0) {
      return this.getProfile(userId);
    }

    values.push(userId);
    const result = await this.db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, full_name, email, headline, location, bio, created_at`,
      values,
    );

    return result.rows[0];
  }
}