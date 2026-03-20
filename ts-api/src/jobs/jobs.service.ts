/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/jobs/jobs.service.ts

import {
  Injectable, Logger, NotFoundException,
  ForbiddenException, ConflictException,
} from '@nestjs/common';
import { ConfigService }   from '@nestjs/config';
import { HttpService }     from '@nestjs/axios';
import { firstValueFrom }  from 'rxjs';
import { DatabaseService } from '../database/database.service';
import { AlertsService }   from '../alerts/alerts.service';
import { JobsStreamService } from './jobs-stream.service';
import { CreateJobDto }    from './dto/create-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

// ── Public types ──────────────────────────────────────────────────────────────

export type JobSource = 'internal' | 'serpapi' | 'linkedin' | 'indeed';

export interface UnifiedJob {
  id:             string;
  source:         JobSource;
  title:          string;
  company:        string;
  location:       string | null;
  workMode:       string | null;
  employmentType: string | null;
  salaryMin:      number | null;
  salaryMax:      number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description:    string;
  postedAt:       string;
  applyUrl:       string | null;
  recruiterName:  string | null;
  applicantCount: number;
  status:         string;
  matchScore?:    number;
}

export interface BrowseFilters {
  search?:    string;
  workMode?:  string;
  salaryMin?: number;
  skills?:    string[];
  page?:      number;
  limit?:     number;
  // ✅ source now includes all platforms
  source?:    'internal' | 'serpapi' | 'linkedin' | 'indeed' | 'all';
}

// ── Typed DB row interfaces ───────────────────────────────────────────────────

interface CountRow      { count: string; }
interface ProfileRow    { top_skills: string[]; experience_level: string; current_title: string; industry_tags: string[]; }
interface OwnershipRow  { id: string; candidate_id: string; title: string; }
interface JobRow        { id: string; title: string; recruiter_id: string; source: string; }

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class JobsService {
  private readonly logger     = new Logger(JobsService.name);
  private readonly serpApiKey: string;
  private readonly rapidApiKey: string;

  constructor(
    private readonly db:     DatabaseService,
    private readonly alerts: AlertsService,
    private readonly config: ConfigService,
    private readonly http:   HttpService,
    private readonly stream: JobsStreamService,  // ✅ injected for SSE events
  ) {
    // ✅ Both keys — SERPAPI_KEY for Google Jobs, RAPIDAPI_KEY for LinkedIn + Indeed
    this.serpApiKey  = this.config.get<string>('SERPAPI_KEY')  ?? '';
    this.rapidApiKey = this.config.get<string>('RAPIDAPI_KEY') ?? '';

    if (!this.serpApiKey)  this.logger.warn('SERPAPI_KEY not set  — Google Jobs disabled');
    if (!this.rapidApiKey) this.logger.warn('RAPIDAPI_KEY not set — LinkedIn/Indeed disabled');
  }

  // ── Browse jobs — pure DB query, sync service keeps DB fresh ─────────────

  async browseJobs(
    userId:  string | null,
    filters: BrowseFilters,
  ): Promise<{
    jobs:    UnifiedJob[];
    total:   number;
    sources: { internal: number; serpapi: number; linkedin: number; indeed: number };
  }> {
    const page   = filters.page  ?? 1;
    const limit  = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ["j.status = 'active'"];
    const params: unknown[]    = [];
    let   idx = 1;

    const sourceFilter = filters.source ?? 'all';

    if (sourceFilter === 'internal') {
      conditions.push(`j.source = $${idx}`); params.push('internal'); idx++;
    } else if (sourceFilter === 'serpapi') {
      conditions.push(`j.source = $${idx}`); params.push('serpapi'); idx++;
    } else if (sourceFilter === 'linkedin') {
      conditions.push(`j.source = $${idx}`); params.push('linkedin'); idx++;
    } else if (sourceFilter === 'indeed') {
      conditions.push(`j.source = $${idx}`); params.push('indeed'); idx++;
    }
    // 'all' → no source filter, returns everything

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

    const [countResult, rowsResult] = await Promise.all([
      this.db.query<CountRow>(
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

    if (userId) {
      jobs = await this.injectMatchScores(userId, jobs);
      jobs.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }

    // ✅ Count all four sources separately for frontend display
    const internal = jobs.filter(j => j.source === 'internal').length;
    const serpapi  = jobs.filter(j => j.source === 'serpapi').length;
    const linkedin = jobs.filter(j => j.source === 'linkedin').length;
    const indeed   = jobs.filter(j => j.source === 'indeed').length;

    return {
      jobs,
      total:   parseInt(countResult.rows[0].count, 10),
      sources: { internal, serpapi, linkedin, indeed },
    };
  }

  // ── Recommendations ───────────────────────────────────────────────────────

  async getRecommendations(userId: string): Promise<UnifiedJob[]> {
    this.logger.log(`[recs] Building for userId: ${userId}`);

    const profileResult = await this.db.query<ProfileRow>(
      `SELECT top_skills, experience_level, current_title, industry_tags
       FROM candidate_profiles WHERE user_id = $1`,
      [userId],
    );

    if (!profileResult.rows.length || !profileResult.rows[0].top_skills?.length) {
      this.logger.warn(`[recs] No profile for ${userId} — returning latest jobs`);
      return this.browseJobs(null, { limit: 12, source: 'all' }).then(r => r.jobs);
    }

    const { top_skills, experience_level, current_title, industry_tags } =
      profileResult.rows[0];

    const skills     = top_skills       as string[];
    const expLevel   = experience_level as string | null;
    const curTitle   = current_title    as string | null;
    const industries = (industry_tags   as string[] | null) ?? [];

    this.logger.log(`[recs] ${curTitle} | Skills: ${skills.slice(0, 4).join(', ')}`);

    const { rows } = await this.db.query(
      `SELECT j.*, u.full_name AS recruiter_name, COUNT(a.id) AS applicant_count
       FROM jobs j
       LEFT JOIN users u ON u.id = j.recruiter_id
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.status = 'active'
       GROUP BY j.id, u.full_name`,
      [],
    );

    const normalise  = (s: string) => s.toLowerCase().trim();
    const userSkills = skills.map(normalise);

    const scored = rows
      .map((row: any) => {
        const jobSkills = (row.required_skills as string[] ?? []).map(normalise);
        const jobTitle  = normalise(row.title       ?? '');
        const jobDesc   = normalise(row.description ?? '');
        const jobLevel  = normalise(row.experience_level ?? '');
        const jobInd    = normalise(row.industry    ?? '');

        let score = 0;

        for (const skill of userSkills) {
          if (jobSkills.some(js => js === skill || js.includes(skill) || skill.includes(js))) {
            score += 10;
          } else if (new RegExp(`\\b${skill}\\b`).test(jobTitle)) {
            score += 6;
          } else if (jobDesc.includes(skill)) {
            score += 2;
          }
        }

        if (expLevel && jobLevel && normalise(expLevel) === jobLevel) score += 5;
        for (const tag of industries.map(normalise)) {
          if (jobInd.includes(tag)) score += 3;
        }

        const daysSince = (Date.now() - new Date(row.created_at).getTime()) / 86_400_000;
        if (daysSince < 2)      score += 4;
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

    this.logger.log(`[recs] ${scored.length} matched jobs`);
    return scored;
  }

  // ── Create internal job (recruiter) ──────────────────────────────────────

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
        recruiterId,
        dto.title,          dto.description,   dto.company,
        dto.location,       dto.workMode        ?? 'hybrid',
        dto.employmentType  ?? 'full_time',
        dto.salaryMin       ?? null,
        dto.salaryMax       ?? null,
        dto.salaryCurrency  ?? 'INR',
        dto.requiredSkills  ?? [],
        dto.experienceMin   ?? 0,
        dto.experienceMax   ?? null,
        dto.industry        ?? null,
      ],
    );

    const job = rows[0];
    this.logger.log(`Job created: ${job.id} by recruiter: ${recruiterId}`);

    // Notify matching candidates via alert rows
    void this.alerts.notifyMatchingCandidates(job);

    // ✅ Emit SSE → all connected browsers see new job instantly
    // No polling lag — EventSource clients revalidate SWR immediately
    this.stream.emitJobCreated({
      id:      String(job.id),
      title:   String(job.title),
      company: String(job.company),
    });

    return this.mapRow({ ...job, recruiter_name: null, applicant_count: 0 });
  }

  // ── Recruiter: own job listings ───────────────────────────────────────────

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

  // ── Recruiter: applicants for a specific job ──────────────────────────────

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

  // ── Recruiter: update application status + alert candidate ───────────────

  async updateApplicationStatus(
    applicationId: string,
    recruiterId:   string,
    dto:           UpdateApplicationStatusDto,
  ): Promise<any> {
    const { rows: ownership } = await this.db.query<OwnershipRow>(
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

    // Alert the candidate of their updated status
    await this.alerts.createAlert({
      userId:   candidate_id,
      type:     'application_update',
      title:    `Application ${dto.status}`,
      message:  this.statusMessage(dto.status, title),
      metadata: { application_id: applicationId, status: dto.status },
    });

    // ✅ Emit SSE → candidate's alert badge updates in real time
    this.stream.emitAlert({
      type:    'application_update',
      message: this.statusMessage(dto.status, title),
    });

    return rows[0];
  }

  // ── Recruiter: toggle job listing status ─────────────────────────────────

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

  // ── Candidate: apply to an internal job ──────────────────────────────────

  async applyToJob(
    candidateId:  string,
    jobId:        string,
    resumeId:     string,
    coverLetter?: string,
  ): Promise<any> {
    const { rows: jobRows } = await this.db.query<JobRow>(
      `SELECT id, title, recruiter_id, source
       FROM jobs WHERE id = $1 AND status = 'active'`,
      [jobId],
    );

    if (!jobRows.length) throw new NotFoundException('Job not found or closed');

    const job = jobRows[0];

    // External jobs (serpapi / linkedin / indeed) — must apply via applyUrl
    if (job.source !== 'internal') {
      throw new ForbiddenException(
        'This is an external job — please apply via the provided URL',
      );
    }

    const [profileResult, skillsResult] = await Promise.all([
      this.db.query<{ top_skills: string[] }>(
        'SELECT top_skills FROM candidate_profiles WHERE user_id = $1',
        [candidateId],
      ),
      this.db.query<{ required_skills: string[] }>(
        'SELECT required_skills FROM jobs WHERE id = $1',
        [jobId],
      ),
    ]);

    let matchScore: number | null = null;
    const userSkills = profileResult.rows[0]?.top_skills  ?? [];
    const jobSkills  = skillsResult.rows[0]?.required_skills ?? [];

    if (userSkills.length && jobSkills.length) {
      const lower   = (arr: string[]) => arr.map(s => s.toLowerCase());
      const overlap = lower(userSkills).filter(s => lower(jobSkills).includes(s)).length;
      matchScore    = Math.round((overlap / jobSkills.length) * 100);
    }

    try {
      const { rows } = await this.db.query(
        `INSERT INTO applications (job_id, candidate_id, resume_id, cover_letter, match_score)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [jobId, candidateId, resumeId, coverLetter, matchScore],
      );

      // Alert the recruiter of the new applicant
      await this.alerts.createAlert({
        userId:   job.recruiter_id,
        type:     'new_applicant',
        title:    'New Application Received',
        message:  `Someone applied to "${job.title}"`,
        metadata: { job_id: jobId, application_id: rows[0].id, match_score: matchScore },
      });

      // ✅ SSE → recruiter dashboard updates applicant count in real time
      this.stream.emitAlert({
        type:    'new_applicant',
        message: `New application received for "${job.title}"`,
      });

      return rows[0];
    } catch (err: any) {
      if (err.code === '23505') throw new ConflictException('Already applied to this job');
      throw err;
    }
  }

  // ── Candidate: own applications ───────────────────────────────────────────

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

  // ── On-demand SerpAPI fetch (used by sync service fallback) ──────────────

  async fetchSerpApiJobs(params: {
    query:     string;
    location?: string;
  }): Promise<UnifiedJob[]> {
    if (!this.serpApiKey) return [];

    try {
      const { data } = await firstValueFrom(
        this.http.get('https://serpapi.com/search.json', {
          params: {
            engine:   'google_jobs',
            q:        params.query,
            location: params.location ?? 'India',
            hl:       'en',
            gl:       'in',
            api_key:  this.serpApiKey,   // ✅ SERPAPI_KEY
          },
          timeout: 10_000,
        }),
      );

      return ((data.jobs_results ?? []) as any[]).map(job => ({
        id:             `serpapi_${job.job_id}`,
        source:         'serpapi' as JobSource,
        title:          job.title            ?? '',
        company:        job.company_name     ?? '',
        location:       job.location         ?? '',
        workMode:       this.inferWorkMode(job),
        employmentType: this.inferEmpType(job),
        salaryMin:      null,
        salaryMax:      null,
        salaryCurrency: 'INR',
        requiredSkills: [],
        description:    job.description      ?? '',
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

  // ── On-demand LinkedIn fetch via RAPIDAPI_KEY ─────────────────────────────

  async fetchLinkedInJobs(params: {
    query:     string;
    location?: string;
  }): Promise<UnifiedJob[]> {
    if (!this.rapidApiKey) return [];

    try {
      const { data } = await firstValueFrom(
        this.http.get('https://linkedin-jobs-search.p.rapidapi.com/', {
          params: {
            query:        params.query,
            location:     params.location ?? 'India',
            distance:     '25',
            page_number:  '0',
          },
          headers: {
            'X-RapidAPI-Key':  this.rapidApiKey,   // ✅ RAPIDAPI_KEY
            'X-RapidAPI-Host': 'linkedin-jobs-search.p.rapidapi.com',
          },
          timeout: 10_000,
        }),
      );

      return ((data ?? []) as any[]).map(job => ({
        id:             `linkedin_${job.linkedin_job_url_cleaned ?? job.job_title}`,
        source:         'linkedin' as JobSource,
        title:          job.job_title      ?? '',
        company:        job.company_name   ?? '',
        location:       job.job_location   ?? '',
        workMode:       this.inferWorkModeFromText(`${job.job_title} ${job.job_summary}`),
        employmentType: this.inferEmpTypeFromText(job.job_employment_type ?? ''),
        salaryMin:      null,
        salaryMax:      null,
        salaryCurrency: 'INR',
        requiredSkills: [],
        description:    (job.job_summary ?? '').slice(0, 5000),
        postedAt:       new Date().toISOString(),
        applyUrl:       job.linkedin_job_url_cleaned ?? null,
        recruiterName:  null,
        applicantCount: 0,
        status:         'active',
      }));
    } catch {
      return [];
    }
  }

  // ── On-demand Indeed fetch via RAPIDAPI_KEY ───────────────────────────────

  async fetchIndeedJobs(params: {
    query:     string;
    location?: string;
  }): Promise<UnifiedJob[]> {
    if (!this.rapidApiKey) return [];

    try {
      const { data } = await firstValueFrom(
        this.http.get('https://indeed12.p.rapidapi.com/jobs/search', {
          params: {
            query:    params.query,
            location: params.location ?? 'India',
            page_id:  '1',
            locality: 'in',
          },
          headers: {
            'X-RapidAPI-Key':  this.rapidApiKey,   // ✅ RAPIDAPI_KEY
            'X-RapidAPI-Host': 'indeed12.p.rapidapi.com',
          },
          timeout: 10_000,
        }),
      );

      return ((data?.hits ?? []) as any[]).map(job => ({
        id:             `indeed_${job.id ?? job.trackingKey}`,
        source:         'indeed' as JobSource,
        title:          job.title             ?? '',
        company:        job.company?.name     ?? '',
        location:       job.location?.label   ?? '',
        workMode:       job.remoteWorkModel?.text?.toLowerCase().includes('remote')
                        ? 'remote' : 'hybrid',
        employmentType: 'full_time',
        salaryMin:      job.salary?.min       ?? null,
        salaryMax:      job.salary?.max       ?? null,
        salaryCurrency: 'INR',
        requiredSkills: [],
        description:    (job.description ?? job.snippet ?? '').slice(0, 5000),
        postedAt:       job.pubDate ? new Date(job.pubDate).toISOString() : new Date().toISOString(),
        applyUrl:       job.applyUrl ?? job.externalApplyUrl ?? null,
        recruiterName:  null,
        applicantCount: 0,
        status:         'active',
      }));
    } catch {
      return [];
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private mapRow(row: any): UnifiedJob {
    return {
      id:             row.id,
      source:         (row.source ?? 'internal') as JobSource,
      title:          row.title,
      company:        row.company        ?? '',
      location:       row.location,
      workMode:       row.work_mode,
      employmentType: row.employment_type,
      salaryMin:      row.salary_min,
      salaryMax:      row.salary_max,
      salaryCurrency: row.salary_currency ?? 'INR',
      requiredSkills: row.required_skills ?? [],
      description:    row.description    ?? '',
      postedAt:       row.created_at,
      applyUrl:       row.apply_url      ?? null,
      recruiterName:  row.recruiter_name ?? null,
      applicantCount: parseInt(row.applicant_count ?? '0', 10),
      status:         row.status,
    };
  }

  private async injectMatchScores(
    userId: string,
    jobs:   UnifiedJob[],
  ): Promise<UnifiedJob[]> {
    const { rows } = await this.db.query<{ top_skills: string[] }>(
      'SELECT top_skills FROM candidate_profiles WHERE user_id = $1',
      [userId],
    );
    if (!rows.length) return jobs;

    const userSkills = (rows[0].top_skills ?? []).map(s => s.toLowerCase());

    return jobs.map(job => {
      if (!job.requiredSkills?.length || !userSkills.length) {
        return { ...job, matchScore: 0 };
      }
      const jobSkillsLower = job.requiredSkills.map(s => s.toLowerCase());
      const overlap        = userSkills.filter(s => jobSkillsLower.includes(s)).length;
      const matchScore     = Math.round((overlap / jobSkillsLower.length) * 100);
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
      shortlisted: `Great news — you've been shortlisted for "${title}" 🎉`,
      interview:   `You're invited to interview for "${title}" 🚀`,
      offered:     `You've received an offer for "${title}" 🎊`,
      rejected:    `Your application for "${title}" wasn't selected this time`,
    };
    return map[status] ?? `Application status updated for "${title}"`;
  }

  private inferWorkMode(job: any): string {
    return this.inferWorkModeFromText(`${job.title ?? ''} ${job.description ?? ''}`);
  }

  private inferWorkModeFromText(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('remote')) return 'remote';
    if (t.includes('hybrid')) return 'hybrid';
    return 'hybrid';
  }

  private inferEmpType(job: any): string {
    return this.inferEmpTypeFromText(job.detected_extensions?.schedule_type ?? '');
  }

  private inferEmpTypeFromText(s: string): string {
    s = s.toLowerCase();
    if (s.includes('contract') || s.includes('freelance')) return 'contract';
    if (s.includes('part'))    return 'part_time';
    if (s.includes('intern'))  return 'internship';
    return 'full_time';
  }
}