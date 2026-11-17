import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseServiceClient } from '../lib/supabase';

export type IntegritySeverity = 'none' | 'low' | 'medium' | 'high';

export interface IntegrityFinding {
  type: string;
  severity: IntegritySeverity;
  detail: string;
  sample?: string;
}

export interface IntegrityReport {
  flagged: boolean;
  severity: IntegritySeverity;
  scoreCap: number | null;
  findings: IntegrityFinding[];
  hiddenLines: string[];
  hiddenRatio: number;
  cleanText: string;
}

// ✅ FIXED: Removed the "ideal candidate" pattern to prevent false positives
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |any )?(previous|prior|above) (instructions|prompts?)/i,
  /\b(ats|ai|assistant|language model|llm|chatgpt)\b.{0,40}\b(must|should|please|instruction|ignore|rate|score)\b/i,
  /system prompt|you are an? (ai|assistant)/i,
];

const ZERO_WIDTH = /[\u200B-\u200F\u2060\u2061-\u2064\uFEFF\u00AD]/g;

@Injectable()
export class AtsIntegrityService {
  private readonly logger = new Logger(AtsIntegrityService.name);

  async scan(input: {
    text: string;
    bucket?: string | null;
    storagePath?: string | null;
    fileName?: string;
    mimeType?: string | null;
  }): Promise<IntegrityReport> {
    const findings: IntegrityFinding[] = [];
    let text = input.text ?? '';
    let hiddenLines: string[] = [];
    let hiddenRatio = 0;

    // 1. binary-level scan (python)
    const file = await this.scanFile(input);
    if (file) {
      hiddenLines = file.hiddenText;
      hiddenRatio = file.hiddenRatio;
      for (const f of file.findings.slice(0, 20)) {
        findings.push({
          type: 'hidden_text',
          severity: f.reasons.includes('white_text') || f.reasons.includes('invisible_render_mode') ? 'high' : 'medium',
          detail: `${f.reasons.join(', ')} (page ${f.page})`,
          sample: f.sample,
        });
      }
      for (const line of hiddenLines) {
        if (line.length > 2) text = text.split(line).join(' ');
      }
    }

    // 2. zero-width / invisible unicode
    const zw = (text.match(ZERO_WIDTH) ?? []).length;
    if (zw > 0) {
      findings.push({
        type: 'invisible_unicode',
        severity: zw > 20 ? 'high' : 'medium',
        detail: `${zw} zero-width/invisible characters`,
      });
      text = text.replace(ZERO_WIDTH, '');
    }

    // 3. AI injection phrases (run on ORIGINAL incl. hidden text)
    const original = `${input.text ?? ''}\n${hiddenLines.join('\n')}`;
    for (const re of INJECTION_PATTERNS) {
      const m = original.match(re);
      if (m) {
        findings.push({
          type: 'ai_injection',
          severity: 'high',
          detail: 'Text addressed to AI/ATS',
          sample: m[0].slice(0, 120),
        });
      }
    }

    // 4. keyword stuffing
    const tokens = text.toLowerCase().match(/[a-z][a-z0-9+#.]{2,}/g) ?? [];
    if (tokens.length > 80) {
      const freq = new Map<string, number>();
      for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
      const limit = Math.max(10, Math.round(tokens.length * 0.04));
      const stuffed = [...freq.entries()]
        .filter(([w, c]) => c > limit && !COMMON.has(w))
        .slice(0, 5);
      if (stuffed.length) {
        findings.push({
          type: 'keyword_stuffing',
          severity: stuffed.length >= 3 ? 'high' : 'medium',
          detail: stuffed.map(([w, c]) => `${w}×${c}`).join(', '),
        });
      }
    }

    // 5. hidden ratio
    if (hiddenRatio > 0.15) {
      findings.push({
        type: 'hidden_ratio',
        severity: 'high',
        detail: `${Math.round(hiddenRatio * 100)}% of text hidden`,
      });
    }

    const severity = this.maxSeverity(findings);
    const scoreCap = severity === 'high' ? 35 : severity === 'medium' ? 55 : null;

    return {
      flagged: severity === 'high' || severity === 'medium',
      severity,
      scoreCap,
      findings,
      hiddenLines,
      hiddenRatio,
      cleanText: text,
    };
  }

  private maxSeverity(findings: IntegrityFinding[]): IntegritySeverity {
    const order: IntegritySeverity[] = ['none', 'low', 'medium', 'high'];
    return findings.reduce<IntegritySeverity>(
      (acc, f) => (order.indexOf(f.severity) > order.indexOf(acc) ? f.severity : acc),
      'none',
    );
  }

  private async scanFile(input: {
    bucket?: string | null;
    storagePath?: string | null;
    fileName?: string;
    mimeType?: string | null;
  }): Promise<{
    hiddenText: string[];
    findings: Array<{ page: number; reasons: string[]; sample: string }>;
    hiddenRatio: number;
  } | null> {
    const base = process.env.PYTHON_API_URL?.replace(/\/$/, '');
    if (!base || !input.bucket || !input.storagePath) return null;

    try {
      const { data, error } = await getSupabaseServiceClient()
        .storage.from(input.bucket)
        .download(input.storagePath);
      if (error || !data) throw new Error(error?.message ?? 'download failed');

      // ✅ FIXED: Use native Node 18+ File API for perfect fetch compatibility
      const form = new FormData();
      const arrayBuffer = await data.arrayBuffer();
      const file = new File([arrayBuffer], input.fileName ?? 'resume', {
        type: input.mimeType ?? 'application/pdf',
      });
      form.append('file', file);

      const res = await fetch(`${base}/resume/hidden-scan`, {
        method: 'POST',
        headers: process.env.PYTHON_API_KEY ? { 'x-api-key': process.env.PYTHON_API_KEY } : undefined,
        body: form,
      });

      if (!res.ok) throw new Error(`hidden-scan ${res.status}`);
      return (await res.json()) as any;
    } catch (err) {
      this.logger.warn(`Hidden-text scan skipped: ${(err as Error).message}`);
      return null;
    }
  }
}

const COMMON = new Set([
  'and', 'the', 'with', 'for', 'using', 'experience', 'developed', 'built',
  'team', 'project', 'work', 'skills', 'application', 'applications',
]);