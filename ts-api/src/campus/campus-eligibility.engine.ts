// ts-api/src/campus/campus-eligibility.engine.ts
/**
 * Deterministic eligibility engine.
 *
 * Guarantees:
 *  - No I/O, no Date.now(), no randomness -> same input always yields same output.
 *  - Missing academic data is NEVER treated as failure. It yields NEEDS_INFO
 *    with an explicit missingFields[] list so the UI can ask for the data.
 *  - Branch-specific criteria override the base rule field-by-field.
 *  - Every evaluated rule produces a human-readable explanation.
 */

export type EligibilityStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEEDS_INFO';
export type RuleCombinator = 'AND' | 'OR';
export type CheckState = 'pass' | 'fail' | 'missing' | 'skipped';

export type CustomOperator =
  | 'eq' | 'neq' | 'gte' | 'lte' | 'gt' | 'lt'
  | 'in' | 'not_in' | 'contains' | 'exists';

export interface CustomRule {
  field: string;
  operator: CustomOperator;
  value?: unknown;
  label?: string;
}

export interface BaseEligibilityRule {
  graduationYears?: number[];
  allowedBranchIds?: string[];
  allowedCanonicalKeys?: string[];
  allowAllBranches?: boolean;
  minimumCGPA?: number | null;
  minimum10thPercentage?: number | null;
  minimum12thPercentage?: number | null;
  maximumActiveBacklogs?: number | null;
  maximumHistoricalBacklogs?: number | null;
  allowHistoricalBacklogs?: boolean;
  custom?: CustomRule[];
}

export interface BranchCriterionInput {
  branchSelector: string; // branchId | canonicalKey | 'ALL'
  minCgpa?: number | null;
  minTenthPct?: number | null;
  minTwelfthPct?: number | null;
  maxActiveBacklogs?: number | null;
  maxHistoricalBacklogs?: number | null;
  allowHistorical?: boolean;
  custom?: CustomRule[];
}

export interface StudentAcademicInput {
  collegeStudentId: string;
  userId: string;
  collegeId: string;
  branchId: string;
  departmentId: string;
  canonicalKey?: string | null;
  branchName?: string | null;
  graduationYear: number;
  cgpa?: number | null;
  tenthPct?: number | null;
  twelfthPct?: number | null;
  activeBacklogs?: number | null;
  historicalBacklogs?: number | null;
  customAcademics?: Record<string, unknown> | null;
}

export interface EligibilityCheck {
  key: string;
  label: string;
  state: CheckState;
  required?: unknown;
  actual?: unknown;
  message: string;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: string[];
  missingFields: string[];
  checks: EligibilityCheck[];
  appliedCriterion: string | null;
  evaluatedRule: BaseEligibilityRule;
}

export interface EvaluateInput {
  student: StudentAcademicInput;
  rule: BaseEligibilityRule;
  combinator?: RuleCombinator;
  criteria?: BranchCriterionInput[];
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Most specific selector wins: exact branchId > canonicalKey > ALL. */
export function resolveBranchCriterion(
  student: StudentAcademicInput,
  criteria: BranchCriterionInput[] = [],
): BranchCriterionInput | null {
  const byId = criteria.find((c) => c.branchSelector === student.branchId);
  if (byId) return byId;
  if (student.canonicalKey) {
    const byKey = criteria.find(
      (c) => c.branchSelector === student.canonicalKey,
    );
    if (byKey) return byKey;
  }
  return criteria.find((c) => c.branchSelector === 'ALL') ?? null;
}

function pick<T>(override: T | null | undefined, base: T | null | undefined): T | null {
  if (override !== null && override !== undefined) return override;
  if (base !== null && base !== undefined) return base;
  return null;
}

function compare(operator: CustomOperator, actual: unknown, expected: unknown): boolean {
  const a = num(actual);
  const e = num(expected);
  switch (operator) {
    case 'eq': return String(actual ?? '') === String(expected ?? '');
    case 'neq': return String(actual ?? '') !== String(expected ?? '');
    case 'gte': return a !== null && e !== null && a >= e;
    case 'lte': return a !== null && e !== null && a <= e;
    case 'gt': return a !== null && e !== null && a > e;
    case 'lt': return a !== null && e !== null && a < e;
    case 'in':
      return Array.isArray(expected) && expected.map(String).includes(String(actual ?? ''));
    case 'not_in':
      return Array.isArray(expected) && !expected.map(String).includes(String(actual ?? ''));
    case 'contains':
      if (Array.isArray(actual)) return actual.map(String).includes(String(expected ?? ''));
      return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
    case 'exists': return actual !== null && actual !== undefined && actual !== '';
    default: return false;
  }
}

export function evaluateEligibility(input: EvaluateInput): EligibilityResult {
  const { student } = input;
  const base = input.rule ?? {};
  const combinator: RuleCombinator = input.combinator ?? 'AND';
  const criterion = resolveBranchCriterion(student, input.criteria);

  const rule: BaseEligibilityRule = {
    graduationYears: base.graduationYears ?? [],
    allowedBranchIds: base.allowedBranchIds ?? [],
    allowedCanonicalKeys: base.allowedCanonicalKeys ?? [],
    allowAllBranches: base.allowAllBranches !== false,
    minimumCGPA: pick(criterion?.minCgpa, base.minimumCGPA),
    minimum10thPercentage: pick(criterion?.minTenthPct, base.minimum10thPercentage),
    minimum12thPercentage: pick(criterion?.minTwelfthPct, base.minimum12thPercentage),
    maximumActiveBacklogs: pick(criterion?.maxActiveBacklogs, base.maximumActiveBacklogs),
    maximumHistoricalBacklogs: pick(
      criterion?.maxHistoricalBacklogs,
      base.maximumHistoricalBacklogs,
    ),
    allowHistoricalBacklogs:
      criterion?.allowHistorical ?? base.allowHistoricalBacklogs ?? true,
    custom: [...(base.custom ?? []), ...(criterion?.custom ?? [])],
  };

  const checks: EligibilityCheck[] = [];

  // ── Graduation year ───────────────────────────────────────────────────────
  const years = rule.graduationYears ?? [];
  if (years.length === 0) {
    checks.push({ key: 'graduationYear', label: 'Graduation year', state: 'skipped', message: 'All graduation years accepted.' });
  } else if (student.graduationYear == null) {
    checks.push({ key: 'graduationYear', label: 'Graduation year', state: 'missing', required: years, message: 'Graduation year is not on record.' });
  } else {
    const ok = years.includes(student.graduationYear);
    checks.push({
      key: 'graduationYear', label: 'Graduation year', state: ok ? 'pass' : 'fail',
      required: years, actual: student.graduationYear,
      message: ok ? `Batch ${student.graduationYear} is eligible.` : `Only batches ${years.join(', ')} are eligible.`,
    });
  }

  // ── Branch scope ──────────────────────────────────────────────────────────
  const branchIds = rule.allowedBranchIds ?? [];
  const canonicalKeys = rule.allowedCanonicalKeys ?? [];
  if (rule.allowAllBranches || (branchIds.length === 0 && canonicalKeys.length === 0)) {
    checks.push({ key: 'branch', label: 'Branch', state: 'skipped', message: 'All branches accepted.' });
  } else {
    const ok =
      branchIds.includes(student.branchId) ||
      (!!student.canonicalKey && canonicalKeys.includes(student.canonicalKey));
    checks.push({
      key: 'branch', label: 'Branch', state: ok ? 'pass' : 'fail',
      actual: student.branchName ?? student.branchId,
      message: ok ? 'Branch is within the eligible scope.' : 'This branch is not eligible for the drive.',
    });
  }

  // ── Numeric minimums ──────────────────────────────────────────────────────
  const minimums: Array<{ key: keyof StudentAcademicInput; ruleKey: keyof BaseEligibilityRule; label: string; unit: string }> = [
    { key: 'cgpa', ruleKey: 'minimumCGPA', label: 'CGPA', unit: '' },
    { key: 'tenthPct', ruleKey: 'minimum10thPercentage', label: '10th percentage', unit: '%' },
    { key: 'twelfthPct', ruleKey: 'minimum12thPercentage', label: '12th / diploma percentage', unit: '%' },
  ];

  for (const m of minimums) {
    const required = num(rule[m.ruleKey]);
    if (required === null) {
      checks.push({ key: String(m.key), label: m.label, state: 'skipped', message: `No minimum ${m.label} required.` });
      continue;
    }
    const actual = num(student[m.key]);
    if (actual === null) {
      checks.push({ key: String(m.key), label: m.label, state: 'missing', required, message: `${m.label} is not on record.` });
      continue;
    }
    const ok = actual >= required;
    checks.push({
      key: String(m.key), label: m.label, state: ok ? 'pass' : 'fail', required, actual,
      message: ok
        ? `${m.label} ${actual}${m.unit} meets the required ${required}${m.unit}.`
        : `${m.label} ${actual}${m.unit} is below the required ${required}${m.unit}.`,
    });
  }

  // ── Active backlogs ───────────────────────────────────────────────────────
  const maxActive = num(rule.maximumActiveBacklogs);
  if (maxActive === null) {
    checks.push({ key: 'activeBacklogs', label: 'Active backlogs', state: 'skipped', message: 'No active backlog limit.' });
  } else {
    const actual = num(student.activeBacklogs);
    if (actual === null) {
      checks.push({ key: 'activeBacklogs', label: 'Active backlogs', state: 'missing', required: maxActive, message: 'Active backlog count is not on record.' });
    } else {
      const ok = actual <= maxActive;
      checks.push({
        key: 'activeBacklogs', label: 'Active backlogs', state: ok ? 'pass' : 'fail', required: maxActive, actual,
        message: ok ? `Active backlogs (${actual}) within limit ${maxActive}.` : `Active backlogs (${actual}) exceed the allowed limit of ${maxActive}.`,
      });
    }
  }

  // ── Historical backlogs ───────────────────────────────────────────────────
  if (rule.allowHistoricalBacklogs === false) {
    const actual = num(student.historicalBacklogs);
    if (actual === null) {
      checks.push({ key: 'historicalBacklogs', label: 'Backlog history', state: 'missing', message: 'Backlog history is not on record.' });
    } else {
      const ok = actual === 0;
      checks.push({
        key: 'historicalBacklogs', label: 'Backlog history', state: ok ? 'pass' : 'fail', actual,
        message: ok ? 'No backlog history.' : 'Drive does not accept any backlog history.',
      });
    }
  } else {
    const maxHist = num(rule.maximumHistoricalBacklogs);
    if (maxHist === null) {
      checks.push({ key: 'historicalBacklogs', label: 'Backlog history', state: 'skipped', message: 'Backlog history allowed.' });
    } else {
      const actual = num(student.historicalBacklogs);
      if (actual === null) {
        checks.push({ key: 'historicalBacklogs', label: 'Backlog history', state: 'missing', required: maxHist, message: 'Backlog history is not on record.' });
      } else {
        const ok = actual <= maxHist;
        checks.push({
          key: 'historicalBacklogs', label: 'Backlog history', state: ok ? 'pass' : 'fail', required: maxHist, actual,
          message: ok ? `Backlog history (${actual}) within limit ${maxHist}.` : `Backlog history (${actual}) exceeds the allowed limit of ${maxHist}.`,
        });
      }
    }
  }

  // ── Custom rules ──────────────────────────────────────────────────────────
  for (const [index, cr] of (rule.custom ?? []).entries()) {
    const label = cr.label ?? cr.field;
    const actual = student.customAcademics?.[cr.field];
    if (cr.operator !== 'exists' && (actual === undefined || actual === null || actual === '')) {
      checks.push({ key: `custom:${index}:${cr.field}`, label, state: 'missing', message: `${label} is not on record.` });
      continue;
    }
    const ok = compare(cr.operator, actual, cr.value);
    checks.push({
      key: `custom:${index}:${cr.field}`, label, state: ok ? 'pass' : 'fail',
      required: cr.value, actual,
      message: ok ? `${label} satisfies the requirement.` : `${label} does not satisfy the requirement (${cr.operator} ${String(cr.value ?? '')}).`,
    });
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const evaluated = checks.filter((c) => c.state !== 'skipped');
  const failed = evaluated.filter((c) => c.state === 'fail');
  const missing = evaluated.filter((c) => c.state === 'missing');

  let status: EligibilityStatus;
  if (combinator === 'OR') {
    const anyPass = evaluated.some((c) => c.state === 'pass');
    status = anyPass ? 'ELIGIBLE' : failed.length ? 'NOT_ELIGIBLE' : 'NEEDS_INFO';
  } else {
    status = failed.length ? 'NOT_ELIGIBLE' : missing.length ? 'NEEDS_INFO' : 'ELIGIBLE';
  }

  return {
    status,
    reasons: failed.map((c) => c.message),
    missingFields: missing.map((c) => c.key),
    checks,
    appliedCriterion: criterion?.branchSelector ?? null,
    evaluatedRule: rule,
  };
}