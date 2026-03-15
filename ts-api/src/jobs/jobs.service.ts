/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  Injectable, Logger, NotFoundException,
  ForbiddenException, ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../database/database.service';
import { AlertsService } from '../alerts/alerts.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

// ── Source-tagged job interface ───────────────────────────────────────────────
// Every job in the system carries a source tag so the frontend
// knows which actions are available (apply internally vs redirect externally)

export type JobSource = 'internal' | 'serpapi';

export interface UnifiedJob {
  id: string;
  source: JobSource;
  title: string;
  company: string;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description: string;
  postedAt: string;
  applyUrl: string | null;         // external URL for SerpAPI jobs
  recruiterName: string | null;    // populated for internal jobs
  applicantCount: number;
  status: string;
  matchScore?: number;             // populated if candidate profile exists
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly serpApiKey: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly alertsService: AlertsService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.serpApiKey = this.config.get<string>('serpApiKey') || '';
  }

  // ── SerpAPI: Fetch jobs from Google Jobs ──────────────────────────────────

  async fetchSerpApiJobs(params: {
    query: string;
    location?: string;
    workMode?: string;
    page?: number;
  }): Promise<UnifiedJob[]> {
    if (!this.serpApiKey) {
      this.logger.warn('SERPAPI_KEY not configured — skipping external job fetch');
      return [];
    }

    try {
      const searchQuery = [
        params.query,
        params.workMode === 'remote' ? 'remote' : '',
      ].filter(Boolean).join(' ');

      const { data } = await firstValueFrom(
        this.httpService.get('https://serpapi.com/search', {
          params: {
            engine:    'google_jobs',
            q:         searchQuery,
            location:  params.location || 'India',
            hl:        'en',
            gl:        'in',
            start:     ((params.page || 1) - 1) * 10,
            api_key:   this.serpApiKey,
          },
          timeout: 10_000,
        }),
      );

      const jobs: UnifiedJob[] = (data.jobs_results || []).map((job: any) => ({
        id:             `serpapi_${job.job_id || Buffer.from(job.title + job.company_name).toString('base64').slice(0, 16)}`,
        source:         'serpapi' as JobSource,
        title:          job.title,
        company:        job.company_name,
        location:       job.location,
        workMode:       this.inferWorkMode(job),
        employmentType: this.inferEmploymentType(job),
        salaryMin:      this.parseSalaryMin(job.detected_extensions?.salary),
        salaryMax:      this.parseSalaryMax(job.detected_extensions?.salary),
        salaryCurrency: 'INR',
        requiredSkills: [],             // Google Jobs doesn't expose structured skills
        description:    job.description || '',
        postedAt:       job.detected_extensions?.posted_at || new Date().toISOString(),
        applyUrl:       job.related_links?.[0]?.link || job.share_link || null,
        recruiterName:  null,
        applicantCount: 0,
        status:         'active',
      }));

      this.logger.log(`SerpAPI returned ${jobs.length} jobs for query: "${searchQuery}"`);
      return jobs;

    } catch (err) {
      // Non-fatal — degrade gracefully to internal jobs only
      this.logger.error(`SerpAPI fetch failed: ${err.message}`);
      return [];
    }
  }

  // ── Internal jobs → UnifiedJob shape ─────────────────────────────────────

  private mapInternalJob(row: any): UnifiedJob {
    return {
      id:             row.id,
      source:         'internal',
      title:          row.title,
      company:        row.company,
      location:       row.location,
      workMode:       row.work_mode,
      employmentType: row.employment_type,
      salaryMin:      row.salary_min,
      salaryMax:      row.salary_max,
      salaryCurrency: row.salary_currency || 'INR',
      requiredSkills: row.required_skills || [],
      description:    row.description,
      postedAt:       row.created_at,
      applyUrl:       null,            // always null — use internal apply flow
      recruiterName:  row.recruiter_name,
      applicantCount: parseInt(row.applicant_count) || 0,
      status:         row.status,
    };
  }

  // ── Unified browse: merge internal + SerpAPI ──────────────────────────────

  async browseJobsUnified(
    userId: string | null,
    filters: {
      search?: string;
      workMode?: string;
      salaryMin?: number;
      skills?: string[];
      page?: number;
      limit?: number;
      includeExternal?: boolean;
    },
  ): Promise<{ jobs: UnifiedJob[]; total: number; sources: { internal: number; external: number } }> {

    const page    = filters.page    || 1;
    const limit   = filters.limit   || 20;

    // Fetch both sources in parallel — don't let one block the other
    const [internalResult, serpResult] = await Promise.allSettled([
      this.fetchInternalJobs(filters),
      filters.includeExternal !== false
        ? this.fetchSerpApiJobs({
            query:    filters.search || 'software engineer',
            location: 'India',
            workMode: filters.workMode,
            page,
          })
        : Promise.resolve([]),
    ]);

    const internalJobs: UnifiedJob[] =
      internalResult.status === 'fulfilled' ? internalResult.value : [];

    const serpJobs: UnifiedJob[] =
      serpResult.status === 'fulfilled' ? serpResult.value : [];

    // Merge strategy: internal jobs first (they have full tracking),
    // then SerpAPI jobs deduplicated by title+company
    const internalKeys = new Set(
      internalJobs.map(j => `${j.title.toLowerCase()}:${j.company.toLowerCase()}`),
    );

    const dedupedSerpJobs = serpJobs.filter(
      j => !internalKeys.has(`${j.title.toLowerCase()}:${j.company.toLowerCase()}`),
    );

    // Compute match scores if user has a profile
    let jobs = [...internalJobs, ...dedupedSerpJobs];

    if (userId) {
      jobs = await this.injectMatchScores(userId, jobs);
      // Sort by match score descending, then by posted date
      jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return {
      jobs,
      total: jobs.length,
      sources: {
        internal: internalJobs.length,
        external: dedupedSerpJobs.length,
      },
    };
  }

  // ── Internal jobs fetch ───────────────────────────────────────────────────

  private async fetchInternalJobs(filters: {
    search?: string;
    workMode?: string;
    salaryMin?: number;
    skills?: string[];
    page?: number;
    limit?: number;
  }): Promise<UnifiedJob[]> {
    const conditions: string[] = ["j.status = 'active'"];
    const params: any[] = [];
    let idx = 1;

    if (filters.search) {
      conditions.push(`(j.title ILIKE $${idx} OR j.description ILIKE $${idx} OR j.company ILIKE $${idx})`);
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

    const { rows } = await this.db.query(
      `SELECT j.*, u.full_name AS recruiter_name
       FROM jobs j
       JOIN users u ON u.id = j.recruiter_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY j.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, filters.limit || 20, ((filters.page || 1) - 1) * (filters.limit || 20)],
    );

    return rows.map(row => this.mapInternalJob(row));
  }

  // ── Compute skill-based match scores ─────────────────────────────────────

  private async injectMatchScores(
    userId: string,
    jobs: UnifiedJob[],
  ): Promise<UnifiedJob[]> {
    const profileResult = await this.db.query(
      'SELECT top_skills FROM candidate_profiles WHERE user_id = $1',
      [userId],
    );

    if (profileResult.rows.length === 0) return jobs;

    const userSkills: string[] = (profileResult.rows[0].top_skills || [])
      .map((s: string) => s.toLowerCase());

    return jobs.map(job => {
      if (!job.requiredSkills?.length || !userSkills.length) {
        return { ...job, matchScore: 0 };
      }

      const jobSkillsLower = job.requiredSkills.map(s => s.toLowerCase());
      const overlap = userSkills.filter(s => jobSkillsLower.includes(s)).length;
      const matchScore = Math.round((overlap / jobSkillsLower.length) * 100);

      return { ...job, matchScore };
    });
  }

  // ── Recruiter: Post a job ─────────────────────────────────────────────────

  async createJob(recruiterId: string, dto: CreateJobDto) {
    const { rows } = await this.db.query(
      `INSERT INTO jobs (
        recruiter_id, title, description, company, location,
        work_mode, employment_type, salary_min, salary_max,
        salary_currency, required_skills, experience_min,
        experience_max, industry
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        recruiterId, dto.title, dto.description, dto.company,
        dto.location, dto.workMode || 'hybrid',
        dto.employmentType || 'full_time',
        dto.salaryMin, dto.salaryMax, dto.salaryCurrency || 'INR',
        dto.requiredSkills || [], dto.experienceMin || 0,
        dto.experienceMax, dto.industry,
      ],
    );

    const job = rows[0];
    this.logger.log(`Job posted: ${job.id} by recruiter: ${recruiterId}`);
    await this.alertsService.notifyMatchingCandidates(job);
    return this.mapInternalJob({ ...job, recruiter_name: null });
  }

  // ── Recruiter: Get own job postings with pipeline stats ──────────────────

  async getRecruiterJobs(recruiterId: string) {
    const { rows } = await this.db.query(
      `SELECT j.*,
        COUNT(a.id)                                          AS total_applications,
        COUNT(a.id) FILTER (WHERE a.status = 'applied')     AS new_applicants,
        COUNT(a.id) FILTER (WHERE a.status = 'reviewed')    AS reviewed,
        COUNT(a.id) FILTER (WHERE a.status = 'shortlisted') AS shortlisted,
        COUNT(a.id) FILTER (WHERE a.status = 'interview')   AS in_interview,
        COUNT(a.id) FILTER (WHERE a.status = 'offered')     AS offered,
        COUNT(a.id) FILTER (WHERE a.status = 'rejected')    AS rejected
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.recruiter_id = $1
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [recruiterId],
    );
    return rows;
  }

  // ── Recruiter: Get applicants for a job ──────────────────────────────────

  async getJobApplicants(jobId: string, recruiterId: string) {
    const jobCheck = await this.db.query(
      'SELECT id FROM jobs WHERE id = $1 AND recruiter_id = $2',
      [jobId, recruiterId],
    );
    if (jobCheck.rows.length === 0) {
      throw new ForbiddenException('You do not own this job posting');
    }

    const { rows } = await this.db.query(
      `SELECT
        a.*,
        u.full_name, u.email,
        cp.headline, cp.experience_level, cp.experience_years,
        cp.top_skills, cp.location AS candidate_location, cp.photo_url,
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

  // ── Recruiter: Update application status ─────────────────────────────────

  async updateApplicationStatus(
    applicationId: string,
    recruiterId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const ownership = await this.db.query(
      `SELECT a.id, a.candidate_id, a.job_id, j.title
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1 AND j.recruiter_id = $2`,
      [applicationId, recruiterId],
    );

    if (ownership.rows.length === 0) {
      throw new ForbiddenException('Not authorized to update this application');
    }

    const { candidate_id, job_id, title } = ownership.rows[0];

    const { rows } = await this.db.query(
      `UPDATE applications
       SET status = $1, recruiter_notes = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [dto.status, dto.recruiterNotes, applicationId],
    );

    await this.alertsService.createAlert({
      userId: candidate_id,
      type: 'application_update',
      title: `Application ${dto.status}`,
      message: this.statusMessage(dto.status, title),
      metadata: { job_id, application_id: applicationId, status: dto.status },
    });

    return rows[0];
  }

  // ── Candidate: Apply to an internal job ──────────────────────────────────

  async applyToJob(
    candidateId: string,
    jobId: string,
    resumeId: string,
    coverLetter?: string,
  ) {
    const jobResult = await this.db.query(
      `SELECT id, title, recruiter_id FROM jobs WHERE id = $1 AND status = 'active'`,
      [jobId],
    );

    if (jobResult.rows.length === 0) {
      throw new NotFoundException('Job not found or no longer accepting applications');
    }

    const job = jobResult.rows[0];

    // Compute match score at application time
    const profileResult = await this.db.query(
      'SELECT top_skills FROM candidate_profiles WHERE user_id = $1',
      [candidateId],
    );
    const jobResult2 = await this.db.query(
      'SELECT required_skills FROM jobs WHERE id = $1',
      [jobId],
    );

    let matchScore: number | null = null;
    if (profileResult.rows.length && jobResult2.rows.length) {
      const userSkills  = (profileResult.rows[0].top_skills || []).map((s: string) => s.toLowerCase());
      const jobSkills   = (jobResult2.rows[0].required_skills || []).map((s: string) => s.toLowerCase());
      if (jobSkills.length) {
        const overlap = userSkills.filter((s: string) => jobSkills.includes(s)).length;
        matchScore = Math.round((overlap / jobSkills.length) * 100);
      }
    }

    try {
      const { rows } = await this.db.query(
        `INSERT INTO applications (job_id, candidate_id, resume_id, cover_letter, match_score)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [jobId, candidateId, resumeId, coverLetter, matchScore],
      );

      await this.alertsService.createAlert({
        userId: job.recruiter_id,
        type: 'new_applicant',
        title: 'New Application Received',
        message: `Someone applied to "${job.title}"`,
        metadata: { job_id: jobId, application_id: rows[0].id, match_score: matchScore },
      });

      return rows[0];

    } catch (err) {
      if (err.code === '23505') {
        throw new ConflictException('You have already applied to this job');
      }
      throw err;
    }
  }

  // ── Candidate: Get own applications ──────────────────────────────────────

  async getCandidateApplications(candidateId: string) {
    const { rows } = await this.db.query(
      `SELECT
        a.*,
        j.title, j.company, j.location, j.work_mode,
        j.salary_min, j.salary_max, j.salary_currency,
        j.required_skills
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.candidate_id = $1
       ORDER BY a.applied_at DESC`,
      [candidateId],
    );
    return rows;
  }

  // ── Recruiter: Update job status ─────────────────────────────────────────

  async updateJobStatus(
    jobId: string,
    recruiterId: string,
    status: 'active' | 'paused' | 'closed',
  ) {
    const { rows } = await this.db.query(
      `UPDATE jobs SET status = $1, updated_at = NOW()
       WHERE id = $2 AND recruiter_id = $3 RETURNING *`,
      [status, jobId, recruiterId],
    );

    if (rows.length === 0) {
      throw new ForbiddenException('Not authorized or job not found');
    }
    return rows[0];
  }

  // ── Private: status message for alerts ───────────────────────────────────

  private statusMessage(status: string, jobTitle: string): string {
    const map: Record<string, string> = {
      reviewed:    `Your application for "${jobTitle}" has been reviewed`,
      shortlisted: `You've been shortlisted for "${jobTitle}" 🎉`,
      interview:   `You're invited for an interview for "${jobTitle}" 🚀`,
      offered:     `You've received an offer for "${jobTitle}" 🎊`,
      rejected:    `Your application for "${jobTitle}" wasn't selected this time`,
    };
    return map[status] || `Application status updated to "${status}"`;
  }

  // ── Private: SerpAPI response parsers ────────────────────────────────────

  private inferWorkMode(job: any): string {
    const text = (job.title + ' ' + (job.description || '')).toLowerCase();
    if (text.includes('remote'))       return 'remote';
    if (text.includes('hybrid'))       return 'hybrid';
    if (text.includes('on-site') || text.includes('onsite')) return 'onsite';
    return 'hybrid';
  }

  private inferEmploymentType(job: any): string {
    const schedule = job.detected_extensions?.schedule_type?.toLowerCase() || '';
    if (schedule.includes('contract'))  return 'contract';
    if (schedule.includes('part'))      return 'part_time';
    if (schedule.includes('intern'))    return 'internship';
    return 'full_time';
  }

  private parseSalaryMax(salary?: string): number | null {
  if (!salary) return null;
  const matches = salary.match(/[\d,]+/g);
  if (!matches || matches.length < 2) return null;
  return parseInt(matches[1].replace(/,/g, ''), 10);
}

// Also fix parseSalaryMin for consistency
private parseSalaryMin(salary?: string): number | null {
  if (!salary) return null;
  const matches = salary.match(/[\d,]+/g);
  if (!matches || matches.length === 0) return null;
  return parseInt(matches[0].replace(/,/g, ''), 10);
}
}