/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/jobs/jobs.service.ts

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../database/database.service';
import { AlertsService } from '../alerts/alerts.service';
import { JobsStreamService } from './jobs-stream.service';
import { LlmService } from '../ollama/Llm.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

export type JobSource = 'internal' | 'serpapi' | 'linkedin' | 'indeed';

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
  applyUrl: string | null;
  recruiterName: string | null;
  applicantCount: number;
  status: string;
  matchScore?: number;
}

export interface BrowseFilters {
  search?: string;
  workMode?: string;
  salaryMin?: number;
  skills?: string[];
  page?: number;
  limit?: number;
  source?: 'internal' | 'serpapi' | 'linkedin' | 'indeed' | 'all';
}

interface CountRow {
  count: string;
}

interface SourceCountRow {
  source: string;
  count: string;
}

interface ProfileRow {
  top_skills: string[];
  experience_level: string | null;
  current_title: string | null;
  target_roles: string[] | null;
  preferred_locations: string[] | null;
}

interface OwnershipRow {
  id: string;
  candidate_user_id: string;
  title: string;
}

interface JobRow {
  id: string;
  title: string;
  recruiter_user_id: string;
  source: string;
}

interface ResumeContextRow {
  summary: string | null;
  top_skills: string[] | null;
  experience_level: string | null;
  trajectory: string | null;
}

interface RecommendationPlan {
  queries: string[];
  location?: string;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly serpApiKey: string;
  private readonly rapidApiKey: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly alerts: AlertsService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly llm: LlmService,
    private readonly stream: JobsStreamService,
  ) {
    this.serpApiKey = this.config.get<string>('SERPAPI_KEY') ?? '';
    this.rapidApiKey = this.config.get<string>('RAPIDAPI_KEY') ?? '';

    if (!this.serpApiKey) this.logger.warn('SERPAPI_KEY not set — Google Jobs disabled');
    if (!this.rapidApiKey) this.logger.warn('RAPIDAPI_KEY not set — LinkedIn/Indeed disabled');
  }

  async browseJobs(
    userId: string | null,
    filters: BrowseFilters,
  ): Promise<{
    jobs: UnifiedJob[];
    total: number;
    sources: { internal: number; serpapi: number; linkedin: number; indeed: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [`j.status = 'PUBLISHED'`];
    const params: unknown[] = [];
    let idx = 1;

    const sourceFilter = filters.source ?? 'all';

    if (sourceFilter !== 'all') {
      conditions.push(`j.source = $${idx}`);
      params.push(sourceFilter);
      idx++;
    }

    if (filters.search) {
      conditions.push(
        `(j.title ILIKE $${idx} OR j.description ILIKE $${idx} OR j.company_name ILIKE $${idx})`,
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

    const [countResult, rowsResult, sourceResult] = await Promise.all([
      this.db.query<CountRow>(
        `SELECT COUNT(*) FROM jobs j WHERE ${where}`,
        params,
      ),
      this.db.query(
        `SELECT
           j.*,
           j.company_name AS company,
           j.recruiter_user_id AS recruiter_id,
           u.full_name AS recruiter_name,
           COUNT(a.id) AS applicant_count
         FROM jobs j
         LEFT JOIN users u ON u.id = j.recruiter_user_id
         LEFT JOIN job_applications a ON a.job_id = j.id
         WHERE ${where}
         GROUP BY j.id, u.full_name
         ORDER BY j.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
      this.db.query<SourceCountRow>(
        `SELECT j.source, COUNT(*) AS count
         FROM jobs j
         WHERE ${where}
         GROUP BY j.source`,
        params,
      ),
    ]);

    let jobs: UnifiedJob[] = rowsResult.rows.map((row) => this.mapRow(row));

    if (userId) {
      jobs = await this.injectMatchScores(userId, jobs);
      jobs.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }

    const sourceCounts = sourceResult.rows.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.source] = parseInt(row.count, 10);
        return acc;
      },
      {},
    );

    return {
      jobs,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
      sources: {
        internal: sourceCounts.internal ?? 0,
        serpapi: sourceCounts.serpapi ?? 0,
        linkedin: sourceCounts.linkedin ?? 0,
        indeed: sourceCounts.indeed ?? 0,
      },
    };
  }

  async getRecommendations(userId: string): Promise<UnifiedJob[]> {
    this.logger.log(`[recs] Building for userId: ${userId}`);

    try {
      const profileResult = await this.db.query<ProfileRow>(
        `SELECT top_skills, experience_level, current_title, target_roles, preferred_locations
         FROM jobseeker_profiles
         WHERE user_id = $1`,
        [userId],
      );

      if (!profileResult.rows.length || !profileResult.rows[0].top_skills?.length) {
        this.logger.warn(`[recs] No profile for ${userId} — returning latest jobs`);
        return this.browseJobs(null, { limit: 12, source: 'all' }).then((result) => result.jobs);
      }

      const {
        top_skills,
        experience_level,
        current_title,
        target_roles,
        preferred_locations,
      } = profileResult.rows[0];

      const skills = this.toStringArray(top_skills);
      const expLevel = experience_level;
      const curTitle = current_title;
      const targetRoles = this.toStringArray(target_roles);
      const preferredLocation = this.toStringArray(preferred_locations)[0] ?? 'India';

      const { rows: resumeRows } = await this.db.query<ResumeContextRow>(
        `SELECT
           ra.top_skills,
           ra.experience_level,
           ra.trajectory,
           r.analysis_json->>'summary' AS summary
         FROM resume_analyses ra
         JOIN resumes r ON r.id = ra.resume_id
         WHERE r.user_id = $1
           AND ra.status = 'COMPLETED'
         ORDER BY ra.created_at DESC
         LIMIT 1`,
        [userId],
      );

      const resumeContext = resumeRows[0] ?? null;

      const plan = await this.buildRecommendationPlan({
        skills,
        targetRoles,
        currentTitle: curTitle,
        preferredLocation,
        experienceLevel: expLevel,
        resumeSummary: resumeContext?.summary ?? null,
        trajectory: resumeContext?.trajectory ?? null,
      });

      const externalByQuery = await Promise.all(
        plan.queries.slice(0, 4).map(async (query) => {
          const [serp, linkedin, indeed] = await Promise.all([
            this.fetchSerpApiJobs({ query, location: plan.location ?? preferredLocation }),
            this.fetchLinkedInJobs({ query, location: plan.location ?? preferredLocation }),
            this.fetchIndeedJobs({ query, location: plan.location ?? preferredLocation }),
          ]);

          return [...serp, ...linkedin, ...indeed];
        }),
      );

      const externalJobs = externalByQuery.flat();
      const internalJobs = (await this.browseJobs(userId, { limit: 30, source: 'internal' })).jobs;
      const allJobs = this.dedupeJobs([...internalJobs, ...externalJobs]);
      const scored = this.scoreRecommendations(allJobs, skills, targetRoles, curTitle, expLevel);

      this.logger.log(`[recs] Generated ${scored.length} total recommendations`);
      return scored.slice(0, 25);
    } catch (err: any) {
      this.logger.error(`[recs] Failed to build recommendations: ${err.message}`);
      return this.browseJobs(null, { limit: 12, source: 'all' }).then((result) => result.jobs);
    }
  }

  private async buildRecommendationPlan(input: {
    skills: string[];
    targetRoles: string[];
    currentTitle: string | null;
    preferredLocation: string;
    experienceLevel: string | null;
    resumeSummary: string | null;
    trajectory: string | null;
  }): Promise<RecommendationPlan> {
    const fallbackQueries = this.fallbackQueries(input);

    try {
      const plan = await this.llm.extractJsonWithRetry<RecommendationPlan>(
        'You are a job search planner. Return only JSON with fields {"queries": string[], "location": string}.',
        `Build 4 concise search queries to find currently open jobs from web sources.
Location: ${input.preferredLocation}
Target roles: ${input.targetRoles.join(', ') || 'none'}
Current title: ${input.currentTitle ?? 'none'}
Experience level: ${input.experienceLevel ?? 'unknown'}
Top skills: ${input.skills.join(', ') || 'none'}
Resume summary: ${input.resumeSummary ?? 'none'}
Career trajectory: ${input.trajectory ?? 'none'}

Return JSON only.`,
      );

      const queries = Array.from(
        new Set(this.toStringArray(plan.queries).map((query) => query.trim()).filter(Boolean)),
      );

      return {
        queries: queries.length ? queries : fallbackQueries,
        location: plan.location?.trim() || input.preferredLocation,
      };
    } catch (err: any) {
      this.logger.warn(`[recs] Gemini planning fallback: ${err.message}`);

      return {
        queries: fallbackQueries,
        location: input.preferredLocation,
      };
    }
  }

  private fallbackQueries(input: {
    skills: string[];
    targetRoles: string[];
    currentTitle: string | null;
    preferredLocation: string;
  }): string[] {
    const role = input.targetRoles[0] ?? input.currentTitle ?? 'software engineer';
    const skillsChunk = input.skills.slice(0, 3).join(' ');

    return [
      `${role} ${skillsChunk}`.trim(),
      `${role} remote`,
      `${role} ${input.preferredLocation}`,
      `${role} jobs open now`,
    ];
  }

  private dedupeJobs(jobs: UnifiedJob[]): UnifiedJob[] {
    const seen = new Set<string>();
    const out: UnifiedJob[] = [];

    for (const job of jobs) {
      const key = `${job.title}|${job.company}|${job.location ?? ''}`.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      out.push(job);
    }

    return out;
  }

  private scoreRecommendations(
    jobs: UnifiedJob[],
    skills: string[],
    targetRoles: string[],
    currentTitle: string | null,
    experienceLevel: string | null,
  ): UnifiedJob[] {
    const normalize = (value: string) => value.toLowerCase().trim();
    const userSkills = this.toStringArray(skills).map(normalize);
    const roleHints = this.toStringArray([...targetRoles, currentTitle ?? ''])
      .map(normalize)
      .filter(Boolean);

    return jobs
      .map((job) => {
        const title = normalize(job.title ?? '');
        const desc = normalize(job.description ?? '');
        const jobSkills = this.toStringArray(job.requiredSkills).map(normalize);

        let score = 0;

        for (const skill of userSkills) {
          if (jobSkills.includes(skill)) score += 9;
          else if (title.includes(skill)) score += 4;
          else if (desc.includes(skill)) score += 2;
        }

        for (const role of roleHints) {
          if (title.includes(role)) score += 7;
        }

        if (experienceLevel && desc.includes(normalize(experienceLevel))) {
          score += 3;
        }

        const finalScore = Math.min(
          99,
          Math.max(job.matchScore ?? 0, Math.round(35 + score * 1.8)),
        );

        return { ...job, matchScore: finalScore };
      })
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  async createJob(recruiterId: string, dto: CreateJobDto): Promise<UnifiedJob> {
    const { rows } = await this.db.query(
      `INSERT INTO jobs (
        recruiter_user_id,
        source,
        title,
        description,
        company_name,
        location,
        work_mode,
        employment_type,
        salary_min,
        salary_max,
        salary_currency,
        required_skills,
        experience_min,
        experience_max,
        industry,
        status,
        published_at
      ) VALUES (
        $1,'internal',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'PUBLISHED',NOW()
      )
      RETURNING *, company_name AS company, recruiter_user_id AS recruiter_id`,
      [
        recruiterId,
        dto.title,
        dto.description,
        dto.company,
        dto.location ?? null,
        dto.workMode ?? 'hybrid',
        dto.employmentType ?? 'full_time',
        dto.salaryMin ?? null,
        dto.salaryMax ?? null,
        dto.salaryCurrency ?? 'INR',
        dto.requiredSkills ?? [],
        dto.experienceMin ?? 0,
        dto.experienceMax ?? null,
        dto.industry ?? null,
      ],
    );

    const job = rows[0];

    this.logger.log(`Job created: ${String(job.id)} by recruiter: ${recruiterId}`);

    void this.alerts.notifyMatchingCandidates(job);

    this.stream.emitJobCreated({
      id: String(job.id),
      title: String(job.title),
      company: String(job.company_name ?? job.company ?? ''),
    });

    return this.mapRow({ ...job, recruiter_name: null, applicant_count: 0 });
  }

  async getRecruiterJobs(recruiterId: string): Promise<any[]> {
    const { rows } = await this.db.query(
      `SELECT
         j.*,
         j.company_name AS company,
         j.recruiter_user_id AS recruiter_id,
         COUNT(a.id) AS total_applications,
         COUNT(a.id) FILTER (WHERE a.status = 'APPLIED') AS new_applicants,
         COUNT(a.id) FILTER (WHERE a.status = 'SHORTLISTED') AS shortlisted,
         COUNT(a.id) FILTER (
           WHERE a.status IN ('INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS')
         ) AS in_interview,
         COUNT(a.id) FILTER (WHERE a.status = 'OFFERED') AS offered,
         COUNT(a.id) FILTER (WHERE a.status = 'HIRED') AS hired,
         COUNT(a.id) FILTER (WHERE a.status = 'REJECTED') AS rejected
       FROM jobs j
       LEFT JOIN job_applications a ON a.job_id = j.id
       WHERE j.recruiter_user_id = $1
         AND j.source = 'internal'
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [recruiterId],
    );

    return rows;
  }

  async getJobApplicants(jobId: string, recruiterId: string): Promise<any[]> {
    await this.assertRecruiterOwns(jobId, recruiterId);

    const { rows } = await this.db.query(
      `SELECT
         a.*,
         a.candidate_user_id AS candidate_id,
         a.applied_at,
         a.match_score,
         u.full_name,
         u.email,
         jp.headline,
         jp.experience_level,
         jp.top_skills,
         jp.location AS candidate_location,
         jp.photo_url,
         r.id AS resume_id,
         r.original_file_name,
         r.storage_bucket,
         r.storage_path,
         r.mime_type,
         r.size_bytes,
         r.analysis_status,
         r.analysis_json,
         ra.top_skills AS analysis_top_skills,
         ra.skills AS analysis_skills,
         ra.experience_level AS analysis_experience_level,
         ra.status AS resume_analysis_status
       FROM job_applications a
       JOIN users u ON u.id = a.candidate_user_id
       LEFT JOIN jobseeker_profiles jp ON jp.user_id = a.candidate_user_id
       LEFT JOIN resumes r ON r.id = a.resume_id
       LEFT JOIN resume_analyses ra ON ra.resume_id = r.id
       WHERE a.job_id = $1
       ORDER BY a.match_score DESC NULLS LAST, a.applied_at DESC`,
      [jobId],
    );

    return rows;
  }

  async updateApplicationStatus(
    applicationId: string,
    recruiterId: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<any> {
    const canonicalStatus = this.toApplicationStatus(dto.status);

    const { rows: ownership } = await this.db.query<OwnershipRow>(
      `SELECT
         a.id,
         a.candidate_user_id,
         j.title
       FROM job_applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1
         AND j.recruiter_user_id = $2`,
      [applicationId, recruiterId],
    );

    if (!ownership.length) {
      throw new ForbiddenException('Not authorized to update this application');
    }

    const { candidate_user_id, title } = ownership[0];

    const { rows } = await this.db.query(
      `UPDATE job_applications
       SET
         status = $1,
         recruiter_notes = $2,
         last_status_changed_at = NOW(),
         updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [canonicalStatus, dto.recruiterNotes ?? null, applicationId],
    );

    await this.db.query(
      `INSERT INTO candidate_status_events (
         application_id,
         to_status,
         changed_by_user_id,
         reason,
         metadata,
         created_at
       ) VALUES ($1,$2,$3,$4,$5,NOW())`,
      [
        applicationId,
        canonicalStatus,
        recruiterId,
        dto.recruiterNotes ?? null,
        JSON.stringify({ source: 'jobs.updateApplicationStatus' }),
      ],
    );

    await this.alerts.createAlert({
      userId: candidate_user_id,
      type: 'application_update',
      title: `Application ${this.humanStatus(canonicalStatus)}`,
      message: this.statusMessage(canonicalStatus, title),
      metadata: { application_id: applicationId, status: canonicalStatus },
    });

    this.stream.emitAlert({
      type: 'application_update',
      message: this.statusMessage(canonicalStatus, title),
    });

    return rows[0];
  }

  async updateJobStatus(
    jobId: string,
    recruiterId: string,
    status: string,
  ): Promise<any> {
    const canonicalStatus = this.toJobStatus(status);

    const { rows } = await this.db.query(
      `UPDATE jobs
       SET
         status = $1,
         published_at = CASE WHEN $1 = 'PUBLISHED' THEN COALESCE(published_at, NOW()) ELSE published_at END,
         closed_at = CASE WHEN $1 = 'CLOSED' THEN NOW() ELSE closed_at END,
         updated_at = NOW()
       WHERE id = $2
         AND recruiter_user_id = $3
         AND source = 'internal'
       RETURNING *, company_name AS company, recruiter_user_id AS recruiter_id`,
      [canonicalStatus, jobId, recruiterId],
    );

    if (!rows.length) {
      throw new ForbiddenException('Not authorized or job not found');
    }

    return rows[0];
  }

  async applyToJob(
    candidateId: string,
    jobId: string,
    resumeId: string,
    coverLetter?: string,
  ): Promise<any> {
    const { rows: jobRows } = await this.db.query<JobRow>(
      `SELECT id, title, recruiter_user_id, source
       FROM jobs
       WHERE id = $1
         AND status = 'PUBLISHED'`,
      [jobId],
    );

    if (!jobRows.length) {
      throw new NotFoundException('Job not found or closed');
    }

    const job = jobRows[0];

    if (job.source !== 'internal') {
      throw new ForbiddenException(
        'This is an external job — please apply via the provided URL',
      );
    }

    const [profileResult, skillsResult] = await Promise.all([
      this.db.query<{ top_skills: string[] }>(
        `SELECT top_skills FROM jobseeker_profiles WHERE user_id = $1`,
        [candidateId],
      ),
      this.db.query<{ required_skills: string[] }>(
        `SELECT required_skills FROM jobs WHERE id = $1`,
        [jobId],
      ),
    ]);

    let matchScore: number | null = null;
    const userSkills = profileResult.rows[0]?.top_skills ?? [];
    const jobSkills = skillsResult.rows[0]?.required_skills ?? [];

    if (userSkills.length && jobSkills.length) {
      const lower = (arr: string[]) => arr.map((skill) => skill.toLowerCase());
      const overlap = lower(userSkills).filter((skill) =>
        lower(jobSkills).includes(skill),
      ).length;

      matchScore = Math.round((overlap / jobSkills.length) * 100);
    }

    try {
      const { rows } = await this.db.query(
        `INSERT INTO job_applications (
           job_id,
           candidate_user_id,
           resume_id,
           cover_letter,
           match_score,
           status
         )
         VALUES ($1,$2,$3,$4,$5,'APPLIED')
         RETURNING *`,
        [jobId, candidateId, resumeId || null, coverLetter ?? null, matchScore],
      );

      await this.db.query(
        `UPDATE jobs
         SET applicant_count = applicant_count + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [jobId],
      );

      await this.alerts.createAlert({
        userId: job.recruiter_user_id,
        type: 'new_applicant',
        title: 'New Application Received',
        message: `Someone applied to "${job.title}"`,
        metadata: {
          job_id: jobId,
          application_id: rows[0].id,
          match_score: matchScore,
        },
      });

      this.stream.emitAlert({
        type: 'new_applicant',
        message: `New application received for "${job.title}"`,
      });

      return rows[0];
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('Already applied to this job');
      }

      throw err;
    }
  }

  async getCandidateApplications(candidateId: string): Promise<any[]> {
    const { rows } = await this.db.query(
      `SELECT
         a.*,
         a.candidate_user_id AS candidate_id,
         j.title,
         j.company_name AS company,
         j.location,
         j.work_mode,
         j.salary_min,
         j.salary_max,
         j.source,
         j.apply_url
       FROM job_applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.candidate_user_id = $1
       ORDER BY a.applied_at DESC`,
      [candidateId],
    );

    return rows;
  }

  async fetchSerpApiJobs(params: {
    query: string;
    location?: string;
  }): Promise<UnifiedJob[]> {
    if (!this.serpApiKey) return [];

    try {
      const { data } = await firstValueFrom(
        this.http.get('https://serpapi.com/search.json', {
          params: {
            engine: 'google_jobs',
            q: params.query,
            location: params.location ?? 'India',
            hl: 'en',
            gl: 'in',
            api_key: this.serpApiKey,
          },
          timeout: 10_000,
        }),
      );

      return ((data.jobs_results ?? []) as any[]).map((job) => ({
        id: `serpapi_${job.job_id}`,
        source: 'serpapi' as JobSource,
        title: job.title ?? '',
        company: job.company_name ?? '',
        location: job.location ?? '',
        workMode: this.inferWorkMode(job),
        employmentType: this.inferEmpType(job),
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: 'INR',
        requiredSkills: [],
        description: job.description ?? '',
        postedAt: new Date().toISOString(),
        applyUrl: job.related_links?.[0]?.link ?? null,
        recruiterName: null,
        applicantCount: 0,
        status: 'PUBLISHED',
      }));
    } catch {
      return [];
    }
  }

  async fetchLinkedInJobs(params: {
    query: string;
    location?: string;
  }): Promise<UnifiedJob[]> {
    if (!this.rapidApiKey) return [];

    try {
      const { data } = await firstValueFrom(
        this.http.get('https://jsearch.p.rapidapi.com/search', {
          params: {
            query: `${params.query} in ${params.location ?? 'India'}`,
            page: '1',
            num_pages: '1',
            date_posted: 'week',
          },
          headers: {
            'X-RapidAPI-Key': this.rapidApiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
          timeout: 10_000,
        }),
      );

      return ((data?.data ?? []) as any[]).slice(0, 10).map((job) => ({
        id: `linkedin_${job.job_id}`,
        source: 'linkedin' as JobSource,
        title: job.job_title ?? '',
        company: job.employer_name ?? '',
        location: job.job_city
          ? `${job.job_city}, ${job.job_country ?? ''}`
          : job.job_country ?? '',
        workMode: job.job_is_remote ? 'remote' : 'hybrid',
        employmentType: this.inferEmpTypeFromText(job.job_employment_type ?? ''),
        salaryMin: job.job_min_salary ?? null,
        salaryMax: job.job_max_salary ?? null,
        salaryCurrency: 'INR',
        requiredSkills: this.toStringArray(job.job_required_skills).slice(0, 8),
        description: (job.job_description ?? '').slice(0, 5000),
        postedAt: job.job_posted_at_datetime_utc
          ? new Date(job.job_posted_at_datetime_utc).toISOString()
          : new Date().toISOString(),
        applyUrl: job.job_apply_link ?? null,
        recruiterName: null,
        applicantCount: 0,
        status: 'PUBLISHED',
      }));
    } catch (err: any) {
      this.logger.error(`fetchLinkedInJobs failed: ${err.message}`);
      return [];
    }
  }

  async fetchIndeedJobs(params: {
    query: string;
    location?: string;
  }): Promise<UnifiedJob[]> {
    if (!this.rapidApiKey) return [];

    try {
      const { data } = await firstValueFrom(
        this.http.get('https://jsearch.p.rapidapi.com/search', {
          params: {
            query: `${params.query} in ${params.location ?? 'India'}`,
            page: '2',
            num_pages: '1',
            date_posted: 'week',
          },
          headers: {
            'X-RapidAPI-Key': this.rapidApiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
          timeout: 10_000,
        }),
      );

      return ((data?.data ?? []) as any[]).slice(0, 10).map((job) => ({
        id: `indeed_${job.job_id}`,
        source: 'indeed' as JobSource,
        title: job.job_title ?? '',
        company: job.employer_name ?? '',
        location: job.job_city
          ? `${job.job_city}, ${job.job_country ?? ''}`
          : job.job_country ?? '',
        workMode: job.job_is_remote ? 'remote' : 'hybrid',
        employmentType: this.inferEmpTypeFromText(job.job_employment_type ?? ''),
        salaryMin: job.job_min_salary ?? null,
        salaryMax: job.job_max_salary ?? null,
        salaryCurrency: 'INR',
        requiredSkills: this.toStringArray(job.job_required_skills).slice(0, 8),
        description: (job.job_description ?? '').slice(0, 5000),
        postedAt: job.job_posted_at_datetime_utc
          ? new Date(job.job_posted_at_datetime_utc).toISOString()
          : new Date().toISOString(),
        applyUrl: job.job_apply_link ?? null,
        recruiterName: null,
        applicantCount: 0,
        status: 'PUBLISHED',
      }));
    } catch (err: any) {
      this.logger.error(`fetchIndeedJobs failed: ${err.message}`);
      return [];
    }
  }

  private mapRow(row: any): UnifiedJob {
    return {
      id: row.id,
      source: (row.source ?? 'internal') as JobSource,
      title: row.title,
      company: row.company_name ?? row.company ?? '',
      location: row.location,
      workMode: row.work_mode,
      employmentType: row.employment_type,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      salaryCurrency: row.salary_currency ?? 'INR',
      requiredSkills: row.required_skills ?? [],
      description: row.description ?? '',
      postedAt: row.published_at ?? row.created_at,
      applyUrl: row.apply_url ?? null,
      recruiterName: row.recruiter_name ?? null,
      applicantCount: parseInt(row.applicant_count ?? '0', 10),
      status: row.status,
    };
  }

  private async injectMatchScores(
    userId: string,
    jobs: UnifiedJob[],
  ): Promise<UnifiedJob[]> {
    const { rows } = await this.db.query<{ top_skills: string[] }>(
      `SELECT top_skills FROM jobseeker_profiles WHERE user_id = $1`,
      [userId],
    );

    if (!rows.length) return jobs;

    const userSkills = (rows[0].top_skills ?? []).map((skill) =>
      skill.toLowerCase(),
    );

    return jobs.map((job) => {
      if (!job.requiredSkills?.length || !userSkills.length) {
        return { ...job, matchScore: 0 };
      }

      const jobSkillsLower = job.requiredSkills.map((skill) =>
        skill.toLowerCase(),
      );

      const overlap = userSkills.filter((skill) =>
        jobSkillsLower.includes(skill),
      ).length;

      const matchScore = Math.round((overlap / jobSkillsLower.length) * 100);

      return { ...job, matchScore };
    });
  }

  private async assertRecruiterOwns(
    jobId: string,
    recruiterId: string,
  ): Promise<void> {
    const { rows } = await this.db.query(
      `SELECT id
       FROM jobs
       WHERE id = $1
         AND recruiter_user_id = $2
         AND source = $3`,
      [jobId, recruiterId, 'internal'],
    );

    if (!rows.length) {
      throw new ForbiddenException('You do not own this job posting');
    }
  }

  private toApplicationStatus(status: string): string {
    const value = String(status ?? '').trim();

    const map: Record<string, string> = {
      APPLIED: 'APPLIED',
      UNDER_REVIEW: 'UNDER_REVIEW',
      SHORTLISTED: 'SHORTLISTED',
      REJECTED: 'REJECTED',
      INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
      INTERVIEW_IN_PROGRESS: 'INTERVIEW_IN_PROGRESS',
      INTERVIEW_PASSED: 'INTERVIEW_PASSED',
      INTERVIEW_FAILED: 'INTERVIEW_FAILED',
      FINAL_REVIEW: 'FINAL_REVIEW',
      OFFERED: 'OFFERED',
      HIRED: 'HIRED',
      ON_HOLD: 'ON_HOLD',
      WITHDRAWN: 'WITHDRAWN',

      applied: 'APPLIED',
      reviewed: 'UNDER_REVIEW',
      reviewing: 'UNDER_REVIEW',
      shortlisted: 'SHORTLISTED',
      interview: 'INTERVIEW_SCHEDULED',
      offered: 'OFFERED',
      rejected: 'REJECTED',
      hired: 'HIRED',
      on_hold: 'ON_HOLD',
      withdrawn: 'WITHDRAWN',
    };

    return map[value] ?? map[value.toUpperCase()] ?? 'APPLIED';
  }

  private toJobStatus(status: string): string {
    const value = String(status ?? '').trim();

    const map: Record<string, string> = {
      DRAFT: 'DRAFT',
      PUBLISHED: 'PUBLISHED',
      PAUSED: 'PAUSED',
      CLOSED: 'CLOSED',
      ARCHIVED: 'ARCHIVED',

      draft: 'DRAFT',
      active: 'PUBLISHED',
      published: 'PUBLISHED',
      paused: 'PAUSED',
      closed: 'CLOSED',
      archived: 'ARCHIVED',
    };

    return map[value] ?? map[value.toUpperCase()] ?? 'PUBLISHED';
  }

  private humanStatus(status: string): string {
    return status
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private statusMessage(status: string, title: string): string {
    const map: Record<string, string> = {
      APPLIED: `Your application for "${title}" has been received`,
      UNDER_REVIEW: `Your application for "${title}" is under review`,
      SHORTLISTED: `Great news — you've been shortlisted for "${title}" 🎉`,
      INTERVIEW_SCHEDULED: `You're invited to interview for "${title}" 🚀`,
      INTERVIEW_IN_PROGRESS: `Your interview for "${title}" is in progress`,
      INTERVIEW_PASSED: `You passed the interview stage for "${title}"`,
      INTERVIEW_FAILED: `Your interview for "${title}" was not selected this time`,
      FINAL_REVIEW: `Your application for "${title}" is in final review`,
      OFFERED: `You've received an offer for "${title}" 🎊`,
      HIRED: `You have been hired for "${title}" 🎊`,
      REJECTED: `Your application for "${title}" wasn't selected this time`,
      ON_HOLD: `Your application for "${title}" is on hold`,
      WITHDRAWN: `Your application for "${title}" was withdrawn`,
    };

    return map[status] ?? `Application status updated for "${title}"`;
  }

  private inferWorkMode(job: any): string {
    return this.inferWorkModeFromText(`${job.title ?? ''} ${job.description ?? ''}`);
  }

  private inferWorkModeFromText(text: string): string {
    const normalized = text.toLowerCase();

    if (normalized.includes('remote')) return 'remote';
    if (normalized.includes('hybrid')) return 'hybrid';

    return 'hybrid';
  }

  private inferEmpType(job: any): string {
    return this.inferEmpTypeFromText(job.detected_extensions?.schedule_type ?? '');
  }

  private inferEmpTypeFromText(value: string): string {
    const normalized = value.toLowerCase();

    if (normalized.includes('contract') || normalized.includes('freelance')) {
      return 'contract';
    }

    if (normalized.includes('part')) return 'part_time';
    if (normalized.includes('intern')) return 'internship';

    return 'full_time';
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }

    return [];
  }
}