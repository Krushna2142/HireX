import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SerpAdapter } from './serp.adapter';

@Injectable()
export class JobsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly serpAdapter: SerpAdapter,
  ) {}

  /**
   * Fetch jobs from SerpAPI and store in DB
   */
  async fetchAndStore(query: string, location = 'India') {
    const jobs = await this.serpAdapter.getJobs(query, location);

    if (!jobs.length) return [];

    const stored: any[] = [];

    for (const job of jobs) {
      const result = await this.db.query(
        `INSERT INTO jobs (id, title, company, location, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           company = EXCLUDED.company,
           location = EXCLUDED.location,
           description = EXCLUDED.description
         RETURNING *`,
        [job.id, job.title, job.company, job.location, job.description],
      );
      stored.push(result.rows[0]);
    }

    return stored;
  }

  /**
   * Get all stored jobs, optionally filtered by query
   */
  async getAll(search?: string) {
    if (search) {
      const result = await this.db.query(
        `SELECT * FROM jobs
         WHERE title ILIKE $1 OR company ILIKE $1 OR location ILIKE $1
         ORDER BY created_at DESC NULLS LAST
         LIMIT 50`,
        [`%${search}%`],
      );
      return result.rows;
    }

    const result = await this.db.query(
      'SELECT * FROM jobs ORDER BY created_at DESC NULLS LAST LIMIT 50',
    );
    return result.rows;
  }

  /**
   * Semantic match using pgvector
   */
  async match(resumeId: string) {
    // Get the resume embedding
    const resumeResult = await this.db.query(
      'SELECT embedding FROM resumes WHERE id = $1',
      [resumeId],
    );

    if (resumeResult.rows.length === 0 || !resumeResult.rows[0].embedding) {
      throw new Error('Resume embedding not found');
    }

    const embedding = resumeResult.rows[0].embedding;

    // Use pgvector similarity search
    const result = await this.db.query(
      `SELECT id, title, company, location, description,
              1 - (embedding <=> $1::vector) AS similarity
       FROM jobs
       WHERE embedding IS NOT NULL
       AND 1 - (embedding <=> $1::vector) > 0.7
       ORDER BY embedding <=> $1::vector
       LIMIT 10`,
      [JSON.stringify(embedding)],
    );

    return result.rows;
  }
}