// ts-api/src/ats/jd-profile.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import axios from 'axios';

export interface JdSkill {
  name: string;
  synonyms: string[];
  weight: number; // 1-5
}

export interface JdProfile {
  roleFamily: string;
  seniority: 'intern' | 'junior' | 'mid' | 'senior' | 'lead';
  minYears: number;
  mustHave: JdSkill[];
  niceToHave: JdSkill[];
  titleKeywords: string[];
  domainKeywords: string[];
  weights: { mustHave: number; niceToHave: number; experience: number; title: number; domain: number };
  source: 'llm' | 'fallback';
  provider?: { provider: string; model: string | null; fallback: boolean };
}

@Injectable()
export class JdProfileService {
  private readonly logger = new Logger(JdProfileService.name);
  private readonly cache = new Map<string, JdProfile>();

  async get(job: {
    title: string;
    description?: string | null;
    requiredSkills?: string[] | null;
    experienceMin?: number | null;
  }): Promise<JdProfile> {
    const key = createHash('sha256')
      .update(`${job.title}|${job.description ?? ''}|${(job.requiredSkills ?? []).join(',')}`)
      .digest('hex');

    const hit = this.cache.get(key);
    if (hit) return hit;

    let profile: JdProfile;
    try {
      // ✅ PRIMARY: NVIDIA NIM (Nemotron 3 Ultra) through the Python AI service.
      // No Ollama / Gemini on the ATS path.
      profile = await this.fetchFromPython(job);
    } catch (err) {
      this.logger.warn(
        `JD profile NIM path failed, deterministic fallback: ${(err as Error).message}`,
      );
      profile = this.fallback(job);
    }

    this.cache.set(key, profile);
    if (this.cache.size > 500) {
      const first = this.cache.keys().next().value;
      if (first) this.cache.delete(first);
    }
    return profile;
  }

  private async fetchFromPython(job: {
    title: string;
    description?: string | null;
    requiredSkills?: string[] | null;
    experienceMin?: number | null;
  }): Promise<JdProfile> {
    const base = process.env.PYTHON_API_URL?.replace(/\/$/, '');
    if (!base) throw new Error('PYTHON_API_URL not configured');

    const { data } = await axios.post(
      `${base}/ats/jd-profile`,
      {
        title: job.title,
        description: job.description ?? '',
        requiredSkills: job.requiredSkills ?? [],
        experienceMin: job.experienceMin ?? 0,
      },
      {
        timeout: 45_000,
        headers: process.env.PYTHON_API_KEY
          ? { 'x-api-key': process.env.PYTHON_API_KEY }
          : undefined,
      },
    );

    const raw = data?.profile ?? data;
    if (!raw?.mustHave?.length) throw new Error('Empty JD profile from Python');
    return this.normalize(raw, job);
  }

  private skillList(v: any, maxW: number): JdSkill[] {
    if (!Array.isArray(v)) return [];
    return v
      .filter((s) => s && typeof s.name === 'string' && s.name.trim())
      .map((s) => ({
        name: s.name.toLowerCase().trim(),
        synonyms: (Array.isArray(s.synonyms) ? s.synonyms : [])
          .filter((x: unknown) => typeof x === 'string')
          .map((x: string) => x.toLowerCase().trim()),
        weight: Math.min(maxW, Math.max(1, Number(s.weight) || 3)),
      }));
  }

  private normalize(raw: any, job: any): JdProfile {
    const mustHave = this.skillList(raw?.mustHave, 5);
    for (const s of job.requiredSkills ?? []) {
      const n = String(s).toLowerCase().trim();
      if (n && !mustHave.some((m) => m.name === n || m.synonyms.includes(n))) {
        mustHave.push({ name: n, synonyms: [], weight: 4 });
      }
    }
    if (!mustHave.length) return this.fallback(job);
    const seniority = (['intern', 'junior', 'mid', 'senior', 'lead'] as const).includes(
      raw?.seniority,
    )
      ? raw.seniority
      : 'mid';
    return {
      roleFamily: String(raw?.roleFamily ?? 'general').toLowerCase(),
      seniority,
      minYears: Math.max(Number(raw?.minYears) || 0, Number(job.experienceMin) || 0),
      mustHave,
      niceToHave: this.skillList(raw?.niceToHave, 3),
      titleKeywords: (raw?.titleKeywords ?? []).map((x: string) => String(x).toLowerCase()),
      domainKeywords: (raw?.domainKeywords ?? []).map((x: string) => String(x).toLowerCase()),
      weights: this.weightsFor(seniority),
      source: 'llm',
      provider: raw?.provider ?? { provider: 'nvidia-nim', model: null, fallback: false },
    };
  }

  private fallback(job: any): JdProfile {
    const skills: JdSkill[] = (job.requiredSkills ?? []).map((s: string) => ({
      name: String(s).toLowerCase().trim(),
      synonyms: [],
      weight: 3,
    }));
    return {
      roleFamily: 'general',
      seniority: 'mid',
      minYears: Number(job.experienceMin) || 0,
      mustHave: skills,
      niceToHave: [],
      titleKeywords: String(job.title)
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 2),
      domainKeywords: [],
      weights: this.weightsFor('mid'),
      source: 'fallback',
      provider: { provider: 'none', model: null, fallback: true },
    };
  }

  private weightsFor(s: string) {
    if (s === 'senior' || s === 'lead')
      return { mustHave: 40, niceToHave: 8, experience: 27, title: 15, domain: 10 };
    if (s === 'intern' || s === 'junior')
      return { mustHave: 50, niceToHave: 10, experience: 10, title: 15, domain: 15 };
    return { mustHave: 45, niceToHave: 10, experience: 20, title: 15, domain: 10 };
  }
}