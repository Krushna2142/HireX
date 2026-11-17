import { Injectable, Logger } from '@nestjs/common';
import { AtsBreakdown, AtsCheckResult, AtsRecommendation } from './ats.types';
import { AtsIntegrityService, IntegrityReport } from './ats-integrity.service';
import { JdProfile, JdProfileService, JdSkill } from './jd-profile.service';

// ✅ FIXED: Added hasSkillsSection to track resume formatting
type Sections = { skills: string; evidence: string; all: string; hasSkillsSection: boolean };

@Injectable()
export class AtsEvaluatorService {
  private readonly logger = new Logger(AtsEvaluatorService.name);

  constructor(
    private readonly jd: JdProfileService,
    private readonly integrity: AtsIntegrityService,
  ) {}

  async evaluate(ctx: {
    job: { title: string; description?: string | null; requiredSkills?: string[] | null; experienceMin?: number | null };
    resumeText: string;
    experienceYears: number;
    resume: { storageBucket?: string | null; storagePath?: string | null; originalFileName?: string; mimeType?: string | null };
  }): Promise<AtsCheckResult> {
    const [profile, report] = await Promise.all([
      this.jd.get(ctx.job),
      this.integrity.scan({
        text: ctx.resumeText,
        bucket: ctx.resume.storageBucket,
        storagePath: ctx.resume.storagePath,
        fileName: ctx.resume.originalFileName,
        mimeType: ctx.resume.mimeType,
      }),
    ]);

    const text = this.norm(report.cleanText);
    const sections = this.split(text);

    const must = this.scoreSkills(profile.mustHave, sections);
    const nice = this.scoreSkills(profile.niceToHave, sections);
    
    const expPct =
      profile.minYears <= 0
        ? 80
        : Math.min(100, Math.round((ctx.experienceYears / profile.minYears) * 100));
        
    const titlePct = this.ratio(profile.titleKeywords, text);
    const domainPct = this.ratio(profile.domainKeywords, text);
    const w = profile.weights;

    let score = Math.round(
      (must.pct * w.mustHave +
        nice.pct * w.niceToHave +
        expPct * w.experience +
        titlePct * w.title +
        domainPct * w.domain) /
        100,
    );

    const warnings: string[] = [];
    if (text.length < 150) {
      score = Math.min(score, 25);
      warnings.push('Very little readable resume text.');
    }
    if (must.missing.length === profile.mustHave.length && profile.mustHave.length) {
      score = Math.min(score, 30);
      warnings.push('No required skills found in visible resume text.');
    }

    const uncapped = score;
    if (report.scoreCap !== null && score > report.scoreCap) {
      score = report.scoreCap;
      warnings.push(`Score capped at ${report.scoreCap}: resume integrity ${report.severity.toUpperCase()}.`);
    }

    score = Math.max(0, Math.min(100, score));
    const recommendation = this.recommend(score);
    const flagTag = report.flagged ? `[FLAGGED:${report.severity.toUpperCase()}] ` : '';

    const breakdown: AtsBreakdown = {
      requiredSkillMatch: must.pct,
      semanticMatch: nice.pct,
      projectRelevance: must.evidencePct,
      experienceRelevance: expPct,
      roleTitleRelevance: titlePct,
      sectionCompleteness: domainPct,
      keywordPlacement: must.evidencePct,
      formattingReadability: report.flagged ? 0 : 100,
      jdRoleFamily: profile.roleFamily,
      requiredSkillsUsed: profile.mustHave.map((s) => s.name),
      resumeSkillsDetected: must.matched,
      resumeTextLength: text.length,
      evidence: must.evidence.slice(0, 15),
      warnings,
      debug: {
        profileSource: profile.source,
        weights: w,
        uncappedScore: uncapped,
        integrity: {
          flagged: report.flagged,
          severity: report.severity,
          scoreCap: report.scoreCap,
          hiddenRatio: report.hiddenRatio,
          findings: report.findings,
        },
      },
    };

    return {
      score,
      recommendation,
      matchedSkills: must.matched,
      missingSkills: must.missing,
      reason:
        `${flagTag}${recommendation}: ${score}% for "${ctx.job.title}" ` +
        `(${profile.roleFamily}, ${profile.seniority}). Required matched ${must.matched.length}/${profile.mustHave.length}; ` +
        `evidenced in experience/projects ${must.evidenced}/${profile.mustHave.length}. ` +
        (report.flagged ? `Integrity: ${report.findings.slice(0, 3).map((f) => f.type).join(', ')}. Recruiter review required.` : ''),
      breakdown,
    };
  }

  // ── helpers ────────────────────────────────────────────────
  private scoreSkills(skills: JdSkill[], s: Sections) {
    if (!skills.length) return { pct: 60, evidencePct: 60, matched: [] as string[], missing: [] as string[], evidence: [] as string[], evidenced: 0 };
    let got = 0;
    let max = 0;
    let evidenced = 0;
    const matched: string[] = [];
    const missing: string[] = [];
    const evidence: string[] = [];

    for (const sk of skills) {
      max += sk.weight;
      const terms = [sk.name, ...sk.synonyms];
      const inEvidence = terms.some((t) => this.has(s.evidence, t));
      const inSkills = terms.some((t) => this.has(s.skills, t) || this.has(s.all, t));

      if (inEvidence) {
        got += sk.weight;
        evidenced++;
        matched.push(sk.name);
        evidence.push(`Used in experience/projects: ${sk.name}`);
      } else if (inSkills) {
        // ✅ FIXED: If there's no explicit skills section, 'inSkills' just means it's in the text.
        // Give 80% weight instead of 50% to avoid over-penalizing poorly formatted resumes.
        got += s.hasSkillsSection ? sk.weight * 0.5 : sk.weight * 0.8;
        matched.push(sk.name);
        evidence.push(`Listed only (no usage evidence): ${sk.name}`);
      } else {
        missing.push(sk.name);
      }
    }

    return {
      pct: Math.round((got / max) * 100),
      evidencePct: Math.round((evidenced / skills.length) * 100),
      matched,
      missing,
      evidence,
      evidenced,
    };
  }

  private split(text: string): Sections {
    const re = /\b(skills?|technical skills|technologies|tech stack|core competencies)\b/;
    const idx = text.search(re);
    const headings = /\b(experience|work history|employment|projects?|education|certifications?|summary|achievements)\b/g;
    let skills = '';
    let evidence = text;
    
    // ✅ FIXED: Track if an explicit skills section exists
    const hasSkillsSection = idx >= 0;

    if (hasSkillsSection) {
      const rest = text.slice(idx + 6);
      headings.lastIndex = 0;
      const m = headings.exec(rest);
      const end = m ? idx + 6 + m.index : Math.min(text.length, idx + 800);
      skills = text.slice(idx, end);
      evidence = text.slice(0, idx) + ' ' + text.slice(end);
    }
    
    return { skills, evidence, all: text, hasSkillsSection };
  }

  private ratio(words: string[], text: string): number {
    const list = words.filter(Boolean);
    // ✅ FIXED: Neutral baseline instead of free 60% points
    if (!list.length) return 50; 
    return Math.round((list.filter((w) => this.has(text, w)).length / list.length) * 100);
  }

  private has(hay: string, needle: string): boolean {
    const n = needle.toLowerCase().trim();
    if (!n || !hay) return false;
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#])${esc}([^a-z0-9+#]|$)`, 'i').test(hay);
  }

  private norm(t: string): string {
    return String(t ?? '').toLowerCase().replace(/[ \t]+/g, ' ');
  }

  private recommend(score: number): AtsRecommendation {
    if (score >= 85) return 'STRONG_SHORTLIST';
    if (score >= 70) return 'SHORTLIST';
    if (score >= 55) return 'REVIEW';
    if (score >= 40) return 'WEAK_MATCH';
    return 'REJECT';
  }
}