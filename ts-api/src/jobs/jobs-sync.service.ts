// ts-api/src/jobs/jobs-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

interface JobData {
  job_id?: string | number;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_country?: string;
  job_description: string;
  job_employment_type?: string;
  job_required_skills?: string[];
  job_apply_link?: string;
}

@Injectable()
export class JobsSyncService {
  private readonly logger = new Logger(JobsSyncService.name);
  private readonly supportedJobs = [
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Data Scientist',
    'Product Manager',
    'DevOps Engineer',
  ];

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  @Cron('0 */12 * * *')
  async syncJobs() {
    this.logger.log('Starting scheduled job sync...');
    
    for (const query of this.supportedJobs) {
      this.logger.log(`Syncing jobs for query: ${query}`);
      
      // Priority 1: RapidAPI (JSearch)
      let jobsFetched = await this.syncFromAdapter('jsearch', query);
      
      // Fallback: SerpAPI if RapidAPI fails or returns 0
      if (jobsFetched === 0) {
        this.logger.log(`RapidAPI returned 0 jobs for "${query}". Trying SerpAPI fallback...`);
        jobsFetched = await this.syncFromAdapter('serpapi', query);
      }

      // Fallback: Database Cached Jobs (handled by browseJobs returning DB jobs if live fetch fails)
      // If both fail, we just log and keep existing DB jobs.
      if (jobsFetched === 0) {
        this.logger.warn(`Both RapidAPI and SerpAPI failed for "${query}". Relying on cached DB jobs.`);
      }

      // Delay between queries to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    this.logger.log('Job sync completed.');
  }

  private async syncFromAdapter(adapter: string, query: string): Promise<number> {
    try {
      let response;
      let jobs: JobData[] = [];

      if (adapter === 'jsearch') {
        response = await firstValueFrom(
          this.httpService.get('https://jsearch.p.rapidapi.com/search', {
            params: { query, num_pages: '1', date_posted: 'all' },
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
              'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
            },
            timeout: 15000,
          })
        );
        jobs = response.data?.data || [];
      } else if (adapter === 'serpapi') {
        response = await firstValueFrom(
          this.httpService.get('https://serpapi.com/search.json', {
            params: {
              engine: 'google_jobs',
              q: query,
              api_key: process.env.SERPAPI_KEY || '',
            },
            timeout: 15000,
          })
        );
        jobs = this.transformSerpApiJobs(response.data?.jobs_results || []);
      }

      this.logger.log(`Adapter ${adapter} returned ${jobs.length} jobs for query: ${query}`);

      let newJobsCount = 0;
      for (const jobData of jobs) {
        const isNew = await this.processJob(jobData, adapter);
        if (isNew) newJobsCount++;
      }

      return newJobsCount;

    } catch (error: any) {
      if (error.response?.status === 429) {
        this.logger.warn(`Rate limit (429) hit for adapter ${adapter} on query "${query}".`);
      } else if (error.response?.status === 503) {
        this.logger.warn(`Adapter ${adapter} returned 503 for query "${query}".`);
      } else {
        this.logger.error(`Failed to sync from ${adapter} for query "${query}": ${error.message}`);
      }
      return 0;
    }
  }

  private async processJob(jobData: JobData, adapter: string): Promise<boolean> {
    try {
      const dedupString = `${jobData.job_title}|${jobData.employer_name}|${jobData.job_city || ''}|${jobData.job_employment_type || ''}`.toLowerCase();
      const uniqueHash = crypto.createHash('md5').update(dedupString).digest('hex');

      const orConditions: any[] = [{ externalId: uniqueHash }];
      if (jobData.job_id) {
        orConditions.push({ externalId: jobData.job_id.toString() });
      }

      const existingJob = await this.prisma.job.findFirst({
        where: { OR: orConditions },
      });

      if (existingJob) {
        return false; // Not new
      }

      await this.prisma.job.create({
        data: {
          externalId: uniqueHash,
          title: jobData.job_title,
          companyName: jobData.employer_name,
          location: jobData.job_city || jobData.job_country || 'Remote',
          description: jobData.job_description,
          requiredSkills: this.extractSkills(jobData.job_description),
          employmentType: jobData.job_employment_type || 'full_time',
          workMode: this.detectWorkMode(jobData),
          status: 'PUBLISHED',
          source: adapter === 'jsearch' ? 'linkedin' : 'serpapi', // Map adapters to sources
          applyUrl: jobData.job_apply_link || null,
          recruiterUserId: await this.getSystemRecruiterId(),
        },
      });

      this.logger.log(`Created new job: ${jobData.job_title} at ${jobData.employer_name}`);
      return true; // Is new

    } catch (error: any) {
      this.logger.error(`Failed to process job: ${jobData.job_title} - ${error.message}`);
      return false;
    }
  }

  private transformSerpApiJobs(serpJobs: any[]): JobData[] {
    return serpJobs.map((job) => ({
      job_title: job.title || '',
      employer_name: job.company_name || '',
      job_city: job.location?.split(',').shift() || '',
      job_country: '',
      job_description: job.description || '',
      job_employment_type: job.detected_extensions?.schedule_type || 'full_time',
      job_required_skills: [],
      job_apply_link: job.related_links?.[0]?.link || job.share_link || '',
      job_id: job.job_id || '',
    }));
  }

  private extractSkills(description: string): string[] {
    if (!description) return [];
    const commonSkills = [
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust',
      'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask',
      'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
      'docker', 'kubernetes', 'aws', 'gcp', 'azure',
      'git', 'ci/cd', 'jenkins', 'github actions',
      'graphql', 'rest api', 'microservices', 'agile', 'scrum'
    ];
    const descLower = description.toLowerCase();
    const foundSkills = commonSkills.filter(skill => descLower.includes(skill.toLowerCase()));
    return [...new Set(foundSkills)];
  }

  private detectWorkMode(jobData: JobData): string {
    const description = (jobData.job_description || '').toLowerCase();
    const title = (jobData.job_title || '').toLowerCase();
    if (description.includes('remote') || title.includes('remote')) return 'remote';
    if (description.includes('hybrid')) return 'hybrid';
    return 'onsite';
  }

  private async getSystemRecruiterId(): Promise<string> {
    const systemEmail = 'system@hirex.jobs';
    const systemUser = await this.prisma.user.findFirst({ where: { email: systemEmail } });
    if (systemUser) return systemUser.id;

    const newUser = await this.prisma.user.create({
      data: {
        email: systemEmail,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$system-generated-hash',
        fullName: 'HireX System',
        role: 'RECRUITER',
        emailVerified: true,
        isActive: true,
      },
    });
    return newUser.id;
  }
}