import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/database.service';

type DashboardCounts = {
  total_users: number;
  candidates: number;
  recruiters: number;
  admins: number;
  mock_interviews_completed: number;
  resume_builder_usage: number;
  resumes_uploaded: number;
  resumes_analyzed: number;
  ats_scoring_runs: number;
  interviews_scheduled: number;
  interviews_completed: number;
  shortlisted: number;
  hired: number;
  active_jobs: number;
  closed_jobs: number;
  total_revenue: number;
  active_subscriptions: number;
};

@Injectable()
export class AdminService {
  private readonly jwtSecret: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret = this.config.get<string>('jwt.secret') ?? 'supersecretkey';
  }

  login(username: string, password: string) {
    const adminUser = this.config.get<string>('ADMIN_USERNAME') ?? 'admin';
    const adminPass = this.config.get<string>('ADMIN_PASSWORD') ?? 'admin12345';

    if (username !== adminUser || password !== adminPass) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const token = jwt.sign(
      {
        sub: `admin:${adminUser}`,
        email: 'admin@jobcrawler.local',
        role: 'admin',
      },
      this.jwtSecret,
      { expiresIn: '7d' } as jwt.SignOptions,
    );

    return {
      token,
      user: {
        id: `admin:${adminUser}`,
        full_name: 'Platform Admin',
        email: 'admin@jobcrawler.local',
        role: 'admin',
        created_at: new Date(0).toISOString(),
      },
    };
  }

  async getDashboard(adminId: string) {
    void adminId;

    const [users, resumes, interviews, jobs] = await Promise.all([
      this.db.query<{
        total_users: string;
        candidates: string;
        recruiters: string;
        admins: string;
      }>(
        `SELECT
           COUNT(*) AS total_users,
           COUNT(*) FILTER (WHERE role = 'candidate') AS candidates,
           COUNT(*) FILTER (WHERE role = 'recruiter') AS recruiters,
           COUNT(*) FILTER (WHERE role = 'admin') AS admins
         FROM users`,
      ),
      this.db.query<{
        resumes_uploaded: string;
        resumes_analyzed: string;
        ats_scoring_runs: string;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM resumes) AS resumes_uploaded,
           (SELECT COUNT(*) FROM resume_analyses WHERE status = 'completed') AS resumes_analyzed,
           (SELECT COUNT(*) FROM resume_analyses) AS ats_scoring_runs`,
      ),
      this.db.query<{
        mock_interviews_completed: string;
        interviews_scheduled: string;
        interviews_completed: string;
        shortlisted: string;
        hired: string;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM mock_interview_sessions WHERE status = 'completed') AS mock_interviews_completed,
           (SELECT COUNT(*) FROM recruiter_interview_rounds WHERE scheduled_at IS NOT NULL) AS interviews_scheduled,
           (SELECT COUNT(*) FROM recruiter_interview_rounds WHERE result IS NOT NULL AND result <> 'pending') AS interviews_completed,
           (SELECT COUNT(*) FROM recruiter_interviews WHERE current_stage = 'SHORTLISTED') AS shortlisted,
           (SELECT COUNT(*) FROM recruiter_interviews WHERE current_stage = 'HIRED') AS hired`,
      ),
      this.db.query<{
        active_jobs: string;
        closed_jobs: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'active') AS active_jobs,
           COUNT(*) FILTER (WHERE status = 'closed') AS closed_jobs
         FROM jobs`,
      ),
    ]);

    const data: DashboardCounts = {
      total_users: Number(users.rows[0]?.total_users ?? 0),
      candidates: Number(users.rows[0]?.candidates ?? 0),
      recruiters: Number(users.rows[0]?.recruiters ?? 0),
      admins: Number(users.rows[0]?.admins ?? 0),
      mock_interviews_completed: Number(
        interviews.rows[0]?.mock_interviews_completed ?? 0,
      ),
      resume_builder_usage: 0,
      resumes_uploaded: Number(resumes.rows[0]?.resumes_uploaded ?? 0),
      resumes_analyzed: Number(resumes.rows[0]?.resumes_analyzed ?? 0),
      ats_scoring_runs: Number(resumes.rows[0]?.ats_scoring_runs ?? 0),
      interviews_scheduled: Number(
        interviews.rows[0]?.interviews_scheduled ?? 0,
      ),
      interviews_completed: Number(
        interviews.rows[0]?.interviews_completed ?? 0,
      ),
      shortlisted: Number(interviews.rows[0]?.shortlisted ?? 0),
      hired: Number(interviews.rows[0]?.hired ?? 0),
      active_jobs: Number(jobs.rows[0]?.active_jobs ?? 0),
      closed_jobs: Number(jobs.rows[0]?.closed_jobs ?? 0),
      total_revenue: 0,
      active_subscriptions: 0,
    };

    return {
      generated_at: new Date().toISOString(),
      exact_counts: true,
      metrics: data,
    };
  }
}
