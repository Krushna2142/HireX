/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/jobs/jobs.service.ts

import {
  Injectable, Logger, NotFoundException,
  ForbiddenException, ConflictException,
} from '@nestjs/common';
import { ConfigService }  from '@nestjs/config';
import { HttpService }    from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../database/database.service';
import { AlertsService }   from '../alerts/alerts.service';
import { CreateJobDto }    from './dto/create-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

// ── Discriminated union — every job in the system has a source ───────────────

export type JobSource = 'internal' | 'serpapi';

export interface UnifiedJob {
  id:              string;
  source:          JobSource;
  title:           string;
  company:         string;
  location:        string | null;
  workMode:        string | null;
  employmentType:  string | null;
  salaryMin:       number | null;
  salaryMax:       number | null;
  salaryCurrency:  string;
  requiredSkills:  string[];
  description:     string;
  postedAt:        string;
  applyUrl:        string | null;    // null for internal — use /apply endpoint
  recruiterName:   string | null;    // only for internal jobs
  applicantCount:  number;
  status:          string;
  matchScore?:     number;           // 0–99, injected by recommendation engine
}

// ── Filter shape for browse ───────────────────────────────────────────────────

export interface BrowseFilters {
  search?:          string;
  workMode?:        string;
  salaryMin?:       number;
  skills?:          string[];
  page?:            number;
  limit?:           number;
  source?:          'internal' | 'serpapi' | 'all';  // explicit filter
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly serpApiKey: string;

  constructor(
    private readonly db:     DatabaseService,
    private readonly alerts: AlertsService,
    private readonly config: ConfigService,
    private readonly http:   HttpService,
  ) {
    this.serpApiKey = this.config.get<string>('SERPAPI_KEY') ?? '';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC BROWSE — merged feed with source filter support
  // ══════════════════════════════════════════════════════════════════════════

  async browseJobs(
    userId:  string | null,
    filters: BrowseFilters,
  ): Promise<{
    jobs:    UnifiedJob[];
    total:   number;
    sources: { internal: number; serpapi: number };
  }> {
    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    const conditions: string[] = ["j.status = 'active'"];
    const params: unknown[] = [];
    let idx = 1;

    // Source filter — default to 'all'
    const sourceFilter = filters.source ?? 'all';
    if (sourceFilter !== 'all') {
      conditions.push(`j.source = $${idx}`);
      params.push(sourceFilter);
      idx++;
    }

    if (filters.search) {
      conditions.push(
        `(j.title ILIKE $${idx} OR j.description ILIKE $${idx} OR j.company ILIKE $${idx})`,
      );
      params.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.workMode) {
      conditions.push(`j.work_mode = $${idx}`);
      params.push(filters.workMode);
      idx++;
    }

    if (filters.salaryMin) {
      conditions.push(`(j.salary_max IS NULL OR j.salary_max >= $${idx})`);
      params.push(filters.salaryMin);
      idx++;
    }

    if (filters.skills?.length) {
      conditions.push(`j.required_skills && $${idx}::text[]`);
      params.push(filters.skills);
      idx++;
    }

    const where = conditions.join(' AND ');

    // Parallel: count + paginated rows
    const [countResult, rowsResult] = await Promise.all([
      this.db.query(
        `SELECT COUNT(*) FROM jobs j WHERE ${where}`,
        params,
      ),
      this.db.query(
        `SELECT
           j.*,
           u.full_name AS recruiter_name,
           COUNT(a.id) AS applicant_count
         FROM jobs j
         LEFT JOIN users u ON u.id = j.recruiter_id
         LEFT JOIN applications a ON a.job_id = j.id
         WHERE ${where}
         GROUP BY j.id, u.full_name
         ORDER BY j.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
    ]);

    let jobs: UnifiedJob[] = rowsResult.rows.map(r => this.mapRow(r));

    // Inject match scores when user is authenticated
    if (userId) {
      jobs = await this.injectMatchScores(userId, jobs);
      jobs.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }

    // Source breakdown for UI (e.g. "12 recruiter / 8 live")
    const internal = jobs.filter(j => j.source === 'internal').length;
    const serpapi  = jobs.filter(j => j.source === 'serpapi').length;

    return {
      jobs,
      total:   parseInt(countResult.rows[0].count, 10),
      sources: { internal, serpapi },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RECOMMENDATIONS — skill-matched, ranked, both sources
  // ══════════════════════════════════════════════════════════════════════════

  async getRecommendations(userId: string): Promise<UnifiedJob[]> {
    this.logger.log(`[recs] Building for userId: ${userId}`);

    const profileResult = await this.db.query(
      `SELECT top_skills, experience_level, current_title, industry_tags
       FROM candidate_profiles WHERE user_id = $1`,
      [userId],
    );

    // No profile = analysis hasn't run → return latest active jobs
    if (!profileResult.rows.length || !profileResult.rows[0].top_skills?.length) {
      this.logger.warn(`[recs] No profile for ${userId} — returning latest jobs`);
      return this.browseJobs(null, { limit: 12, source: 'all' })
        .then(r => r.jobs);
    }

    const { top_skills, experience_level, current_title, industry_tags } =
      profileResult.rows[0];

    const skills     = top_skills       as string[];
    const expLevel   = experience_level as string | null;
    const curTitle   = current_title    as string | null;
    const industries = (industry_tags   as string[] | null) ?? [];

    this.logger.log(`[recs] Profile: ${curTitle} | Skills: ${skills.slice(0, 4).join(', ')}`);

    // Fetch all active jobs (both sources) and score them
    const { rows } = await this.db.query(
      `SELECT j.*, u.full_name AS recruiter_name,
              COUNT(a.id) AS applicant_count
       FROM jobs j
       LEFT JOIN users u ON u.id = j.recruiter_id
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.status = 'active'
       GROUP BY j.id, u.full_name`,
      [],
    );

    const normalise = (s: string) => s.toLowerCase().trim();
    const userSkills = skills.map(normalise);

    const scored = rows
      .map((row: any) => {
        const jobSkills  = (row.required_skills as string[] ?? []).map(normalise);
        const jobTitle   = normalise(row.title ?? '');
        const jobDesc    = normalise(row.description ?? '');
        const jobLevel   = normalise(row.experience_level ?? '');
        const jobInd     = normalise(row.industry ?? '');

        let score = 0;

        for (const skill of userSkills) {
          if (jobSkills.some(js => js === skill || js.includes(skill) || skill.includes(js))) {
            score += 10; // exact skill match — recruiter explicitly listed it
          } else if (new RegExp(`\\b${skill}\\b`).test(jobTitle)) {
            score += 6;  // word boundary title match
          } else if (jobDesc.includes(skill)) {
            score += 2;  // description mention
          }
        }

        if (expLevel && jobLevel && normalise(expLevel) === jobLevel) score += 5;
        for (const tag of industries.map(normalise)) {
          if (jobInd.includes(tag)) score += 3;
        }

        const daysSince = (Date.now() - new Date(row.created_at).getTime()) / 86_400_000;
        if (daysSince < 2) score += 4;
        else if (daysSince < 7) score += 2;

        const matchScore = score > 0
          ? Math.min(99, Math.round(40 + score * 2.2))
          : 0;

        return { row, score, matchScore };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(x => ({ ...this.mapRow(x.row), matchScore: x.matchScore }));

    this.logger.log(`[recs] ${scored.length} jobs matched from DB (internal + serpapi)`);
    return scored;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RECRUITER ACTIONS — internal jobs only
  // ══════════════════════════════════════════════════════════════════════════

  async createJob(recruiterId: string, dto: CreateJobDto): Promise<UnifiedJob> {
    const { rows } = await this.db.query(
      `INSERT INTO jobs (
        recruiter_id, source, title, description, company, location,
        work_mode, employment_type, salary_min, salary_max,
        salary_currency, required_skills, experience_min,
        experience_max, industry, status
      ) VALUES ($1,'internal',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active')
      RETURNING *`,
      [
        recruiterId, dto.title, dto.description, dto.company,
        dto.location, dto.workMode ?? 'hybrid',
        dto.employmentType ?? 'full_time',
        dto.salaryMin ?? null, dto.salaryMax ?? null,
        dto.salaryCurrency ?? 'INR',
        dto.requiredSkills ?? [],
        dto.experienceMin ?? 0, dto.experienceMax ?? null,
        dto.industry ?? null,
      ],
    );

    const job = rows[0];
    this.logger.log(`Job created: ${job.id} by recruiter: ${recruiterId}`);

    // Notify matching candidates (non-blocking)
    void this.alerts.notifyMatchingCandidates(job);

    return this.mapRow({ ...job, recruiter_name: null, applicant_count: 0 });
  }

  async getRecruiterJobs(recruiterId: string): Promise<any[]> {
    const { rows } = await this.db.query(
      `SELECT j.*,
         COUNT(a.id)                                          AS total_applications,
         COUNT(a.id) FILTER (WHERE a.status = 'applied')     AS new_applicants,
         COUNT(a.id) FILTER (WHERE a.status = 'shortlisted') AS shortlisted,
         COUNT(a.id) FILTER (WHERE a.status = 'interview')   AS in_interview,
         COUNT(a.id) FILTER (WHERE a.status = 'offered')     AS offered
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.recruiter_id = $1 AND j.source = 'internal'
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [recruiterId],
    );
    return rows;
  }

  async getJobApplicants(jobId: string, recruiterId: string): Promise<any[]> {
    await this.assertRecruiterOwns(jobId, recruiterId);

    const { rows } = await this.db.query(
      `SELECT a.*, u.full_name, u.email,
         cp.headline, cp.experience_level, cp.top_skills,
         cp.location AS candidate_location, cp.photo_url,
         r.file_name, r.raw_file
       FROM applications a
       JOIN users u ON u.id = a.candidate_id
       LEFT JOIN candidate_profiles cp ON cp.user_id = a.candidate_id
       LEFT JOIN resumes r ON r.id = a.resume_id
       WHERE a.job_id = $1
       ORDER BY a.match_score DESC NULLS LAST, a.applied_at DESC`,
      [jobId],
    );
    return rows;
  }

  async updateApplicationStatus(
    applicationId: string,
    recruiterId:   string,
    dto:           UpdateApplicationStatusDto,
  ): Promise<any> {
    const { rows: ownership } = await this.db.query(
      `SELECT a.id, a.candidate_id, j.title
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1 AND j.recruiter_id = $2`,
      [applicationId, recruiterId],
    );

    if (!ownership.length) {
      throw new ForbiddenException('Not authorized to update this application');
    }

    const { candidate_id, title } = ownership[0];

    const { rows } = await this.db.query(
      `UPDATE applications
       SET status = $1, recruiter_notes = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [dto.status, dto.recruiterNotes, applicationId],
    );

    await this.alerts.createAlert({
      userId:   candidate_id,
      type:     'application_update',
      title:    `Application ${dto.status}`,
      message:  this.statusMessage(dto.status, title),
      metadata: { application_id: applicationId, status: dto.status },
    });

    return rows[0];
  }

  async updateJobStatus(
    jobId:       string,
    recruiterId: string,
    status:      'active' | 'paused' | 'closed',
  ): Promise<any> {
    const { rows } = await this.db.query(
      `UPDATE jobs SET status = $1, updated_at = NOW()
       WHERE id = $2 AND recruiter_id = $3 AND source = 'internal'
       RETURNING *`,
      [status, jobId, recruiterId],
    );
    if (!rows.length) throw new ForbiddenException('Not authorized or job not found');
    return rows[0];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CANDIDATE ACTIONS
  // ══════════════════════════════════════════════════════════════════════════

  async applyToJob(
    candidateId:  string,
    jobId:        string,
    resumeId:     string,
    coverLetter?: string,
  ): Promise<any> {
    const { rows: jobRows } = await this.db.query(
      `SELECT id, title, recruiter_id, source
       FROM jobs WHERE id = $1 AND status = 'active'`,
      [jobId],
    );

    if (!jobRows.length) throw new NotFoundException('Job not found or closed');

    const job = jobRows[0];

    // SerpAPI jobs are external — candidates must apply via applyUrl
    if (job.source === 'serpapi') {
      throw new ForbiddenException(
        'This is an external job — please apply via the provided URL',
      );
    }

    // Compute match score at application time
    const [profileResult, skillsResult] = await Promise.all([
      this.db.query('SELECT top_skills FROM candidate_profiles WHERE user_id = $1', [candidateId]),
      this.db.query('SELECT required_skills FROM jobs WHERE id = $1', [jobId]),
    ]);

    let matchScore: number | null = null;
    const userSkills = profileResult.rows[0]?.top_skills as string[] ?? [];
    const jobSkills  = skillsResult.rows[0]?.required_skills as string[] ?? [];

    if (userSkills.length && jobSkills.length) {
      const lower = (arr: string[]) => arr.map(s => s.toLowerCase());
      const overlap = lower(userSkills).filter(s => lower(jobSkills).includes(s)).length;
      matchScore = Math.round((overlap / jobSkills.length) * 100);
    }

    try {
      const { rows } = await this.db.query(
        `INSERT INTO applications (job_id, candidate_id, resume_id, cover_letter, match_score)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [jobId, candidateId, resumeId, coverLetter, matchScore],
      );

      await this.alerts.createAlert({
        userId:   job.recruiter_id,
        type:     'new_applicant',
        title:    'New Application Received',
        message:  `Someone applied to "${job.title}"`,
        metadata: { job_id: jobId, application_id: rows[0].id, match_score: matchScore },
      });

      return rows[0];
    } catch (err: any) {
      if (err.code === '23505') throw new ConflictException('Already applied to this job');
      throw err;
    }
  }

  async getCandidateApplications(candidateId: string): Promise<any[]> {
    const { rows } = await this.db.query(
      `SELECT a.*, j.title, j.company, j.location,
         j.work_mode, j.salary_min, j.salary_max, j.source
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.candidate_id = $1
       ORDER BY a.applied_at DESC`,
      [candidateId],
    );
    return rows;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  private mapRow(row: any): UnifiedJob {
    return {
      id:             row.id,
      source:         (row.source ?? 'internal') as JobSource,
      title:          row.title,
      company:        row.company ?? '',
      location:       row.location,
      workMode:       row.work_mode,
      employmentType: row.employment_type,
      salaryMin:      row.salary_min,
      salaryMax:      row.salary_max,
      salaryCurrency: row.salary_currency ?? 'INR',
      requiredSkills: row.required_skills ?? [],
      description:    row.description ?? '',
      postedAt:       row.created_at,
      applyUrl:       row.apply_url ?? null,
      recruiterName:  row.recruiter_name ?? null,
      applicantCount: parseInt(row.applicant_count ?? '0', 10),
      status:         row.status,
    };
  }

  private async injectMatchScores(
    userId: string,
    jobs:   UnifiedJob[],
  ): Promise<UnifiedJob[]> {
    const { rows } = await this.db.query(
      'SELECT top_skills FROM candidate_profiles WHERE user_id = $1',
      [userId],
    );
    if (!rows.length) return jobs;

    const userSkills = (rows[0].top_skills as string[] ?? [])
      .map(s => s.toLowerCase());

    return jobs.map(job => {
      if (!job.requiredSkills?.length || !userSkills.length) {
        return { ...job, matchScore: 0 };
      }
      const jobSkillsLower = job.requiredSkills.map(s => s.toLowerCase());
      const overlap  = userSkills.filter(s => jobSkillsLower.includes(s)).length;
      const matchScore = Math.round((overlap / jobSkillsLower.length) * 100);
      return { ...job, matchScore };
    });
  }

  private async assertRecruiterOwns(
    jobId:       string,
    recruiterId: string,
  ): Promise<void> {
    const { rows } = await this.db.query(
      'SELECT id FROM jobs WHERE id = $1 AND recruiter_id = $2 AND source = $3',
      [jobId, recruiterId, 'internal'],
    );
    if (!rows.length) throw new ForbiddenException('You do not own this job posting');
  }

  private statusMessage(status: string, title: string): string {
    const map: Record<string, string> = {
      reviewed:    `Your application for "${title}" has been reviewed`,
      shortlisted: `You've been shortlisted for "${title}" 🎉`,
      interview:   `You're invited for an interview for "${title}" 🚀`,
      offered:     `You've received an offer for "${title}" 🎊`,
      rejected:    `Your application for "${title}" wasn't selected this time`,
    };
    return map[status] ?? `Application status updated for "${title}"`;
  }

  // Kept for backwards compatibility — JobsSyncService calls this
  async fetchSerpApiJobs(params: {
    query:     string;
    location?: string;
  }): Promise<UnifiedJob[]> {
    if (!this.serpApiKey) return [];

    try {
      const { data } = await firstValueFrom(
        this.http.get('https://serpapi.com/search', {
          params: {
            engine:  'google_jobs',
            q:       params.query,
            location: params.location ?? 'India',
            hl:      'en',
            gl:      'in',
            api_key: this.serpApiKey,
          },
          timeout: 10_000,
        }),
      );

      return ((data.jobs_results ?? []) as any[]).map(job => ({
        id:             `serpapi_${job.job_id}`,
        source:         'serpapi' as JobSource,
        title:          job.title ?? '',
        company:        job.company_name ?? '',
        location:       job.location ?? '',
        workMode:       this.inferWorkMode(job),
        employmentType: this.inferEmpType(job),
        salaryMin:      null,
        salaryMax:      null,
        salaryCurrency: 'INR',
        requiredSkills: [],
        description:    job.description ?? '',
        postedAt:       new Date().toISOString(),
        applyUrl:       job.related_links?.[0]?.link ?? null,
        recruiterName:  null,
        applicantCount: 0,
        status:         'active',
      }));
    } catch {
      return [];
    }
  }

  private inferWorkMode(job: any): string {
    const t = `${job.title} ${job.description ?? ''}`.toLowerCase();
    if (t.includes('remote')) return 'remote';
    if (t.includes('hybrid')) return 'hybrid';
    return 'hybrid';
  }

  private inferEmpType(job: any): string {
    const s = (job.detected_extensions?.schedule_type ?? '').toLowerCase();
    if (s.includes('contract')) return 'contract';
    if (s.includes('part'))     return 'part_time';
    if (s.includes('intern'))   return 'internship';
    return 'full_time';
  }
}