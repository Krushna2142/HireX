'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/components/recruiter/CandidateDetailsDrawer.tsx

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type AnyRecord = Record<string, any>;

type CandidateDetailsDrawerProps = {
  open: boolean;
  app: AnyRecord | null;
  job?: AnyRecord | null;
  onClose: () => void;
};

const C = {
  bg: '#080C14',
  panel: '#0D1220',
  panel2: '#101827',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(167,139,250,0.32)',
  text: '#F8FAFC',
  muted: 'rgba(226,232,240,0.68)',
  faint: 'rgba(226,232,240,0.42)',
  sky: '#38BDF8',
  purple: '#A78BFA',
  pink: '#F472B6',
  green: '#34D399',
  yellow: '#FBBF24',
  red: '#F87171',
  orange: '#FB923C',
};

const FLOW_STAGES = [
  'Applied',
  'ATS Checked',
  'Shortlisted',
  'Scheduled',
  'Interview',
  'Feedback',
  'Hired',
];

function safeString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStatus(value: unknown) {
  return safeString(value, 'applied').replace(/_/g, ' ').toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function readPath(obj: AnyRecord | null | undefined, path: string): unknown {
  if (!obj) return undefined;

  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as AnyRecord)[key];
  }, obj);
}

function firstValue(obj: AnyRecord | null | undefined, paths: string[], fallback = '') {
  for (const path of paths) {
    const value = readPath(obj, path);

    if (value !== null && value !== undefined && safeString(value).trim()) {
      return safeString(value);
    }
  }

  return fallback;
}

function firstArray(obj: AnyRecord | null | undefined, paths: string[]): string[] {
  for (const path of paths) {
    const value = readPath(obj, path);

    if (Array.isArray(value)) {
      return value
        .map((item) => safeString(item).trim())
        .filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function getCandidateName(app: AnyRecord) {
  return firstValue(app, [
    'candidate.fullName',
    'candidate.full_name',
    'candidate.name',
    'candidate.displayName',
    'candidate.email',
    'candidateEmail',
    'candidate_email',
  ], 'Candidate');
}

function getCandidateEmail(app: AnyRecord) {
  return firstValue(app, [
    'candidate.email',
    'candidateEmail',
    'candidate_email',
    'email',
  ], 'No email shown');
}

function getCandidatePhone(app: AnyRecord) {
  return firstValue(app, [
    'candidate.phone',
    'candidate.phoneNumber',
    'candidate.phone_number',
    'phone',
    'phoneNumber',
  ], 'Not provided');
}

function getCandidateId(app: AnyRecord) {
  return firstValue(app, [
    'candidate.id',
    'candidate_id',
    'candidateId',
  ], '—');
}

function getApplicationId(app: AnyRecord) {
  return safeString(app?.id, '—');
}

function getAppliedAt(app: AnyRecord) {
  return firstValue(app, [
    'applied_at',
    'appliedAt',
    'created_at',
    'createdAt',
  ]);
}

function getJobTitle(app: AnyRecord, job?: AnyRecord | null) {
  return firstValue(app, [
    'job.title',
    'jobs.title',
    'job_title',
    'jobTitle',
  ], firstValue(job, ['title'], 'Selected Job'));
}

function getCompany(app: AnyRecord, job?: AnyRecord | null) {
  return firstValue(app, [
    'job.companyName',
    'job.company_name',
    'jobs.company',
    'jobs.company_name',
    'company',
    'companyName',
  ], firstValue(job, ['companyName', 'company_name', 'company'], 'Company'));
}

function getResumeUrl(app: AnyRecord) {
  return firstValue(app, [
    'resume_url',
    'resumeUrl',
    'resume_file_url',
    'resumeFileUrl',
    'resume_storage_url',
    'resumeStorageUrl',
    'latest_resume_url',
    'latestResumeUrl',
    'resume.url',
    'resume.fileUrl',
    'resume.file_url',
    'resume.publicUrl',
    'resume.public_url',
    'candidate.resumeUrl',
    'candidate.resume_url',
    'candidate.resumeFileUrl',
    'candidate.resume_file_url',
    'candidate.resume.url',
    'candidate.resume.fileUrl',
    'candidate.latestResume.url',
    'candidate.latest_resume.url',
  ]);
}

function getResumeFileName(app: AnyRecord) {
  return firstValue(app, [
    'resume.fileName',
    'resume.file_name',
    'resume.originalName',
    'resume.original_name',
    'resume_name',
    'resumeName',
    'candidate.resume.fileName',
    'candidate.resume.file_name',
  ], 'Candidate resume');
}

function getAtsScore(app: AnyRecord) {
  return Math.round(
    safeNumber(
      app?.ats_score ??
        app?.atsScore ??
        app?.match_score ??
        app?.matchScore ??
        app?.ats?.atsScore ??
        app?.ats?.score,
      0,
    ),
  );
}

function hasAts(app: AnyRecord) {
  return (
    app?.ats_score !== null &&
    app?.ats_score !== undefined
  ) || (
    app?.atsScore !== null &&
    app?.atsScore !== undefined
  ) || Boolean(app?.ats);
}

function getAtsRecommendation(app: AnyRecord) {
  const direct = firstValue(app, [
    'ats_recommendation',
    'atsRecommendation',
    'ats.recommendation',
  ]);

  if (direct) return direct.toUpperCase();

  const score = getAtsScore(app);

  if (!hasAts(app)) return 'NOT CHECKED';
  if (score >= 75) return 'SHORTLIST';
  if (score >= 55) return 'REVIEW';
  return 'REJECT';
}

function getAtsReason(app: AnyRecord) {
  return firstValue(app, [
    'ats_reason',
    'atsReason',
    'ats.reason',
    'ats.notes',
    'resumeAnalysis.reason',
    'analysis.reason',
  ], 'No ATS explanation returned yet.');
}

function getMatchedSkills(app: AnyRecord) {
  return firstArray(app, [
    'ats_matched_skills',
    'atsMatchedSkills',
    'matchedSkills',
    'ats.matchedSkills',
    'ats.matched_skills',
    'resumeAnalysis.matchedSkills',
  ]);
}

function getMissingSkills(app: AnyRecord) {
  return firstArray(app, [
    'ats_missing_skills',
    'atsMissingSkills',
    'missingSkills',
    'ats.missingSkills',
    'ats.missing_skills',
    'resumeAnalysis.missingSkills',
  ]);
}

function getDetectedSkills(app: AnyRecord) {
  return firstArray(app, [
    'candidate.skills',
    'resumeAnalysis.skills',
    'analysis.skills',
    'skills',
    'ats.skills',
  ]);
}

function getPipelineIndex(app: AnyRecord) {
  const status = normalizeStatus(app?.status);

  if (status.includes('hired') || status.includes('offer')) return 6;
  if (status.includes('feedback') || status.includes('completed')) return 5;
  if (status.includes('interview')) return 4;
  if (status.includes('scheduled')) return 3;
  if (status.includes('shortlist')) return 2;
  if (hasAts(app)) return 1;

  return 0;
}

function getFlowColor(app: AnyRecord) {
  const status = normalizeStatus(app?.status);
  const recommendation = getAtsRecommendation(app);

  if (status.includes('reject') || recommendation === 'REJECT') return C.red;
  if (status.includes('hired') || status.includes('offer')) return C.green;
  if (status.includes('interview') || status.includes('scheduled')) return C.purple;
  if (status.includes('shortlist') || recommendation === 'SHORTLIST') return C.yellow;
  if (hasAts(app)) return C.sky;

  return C.faint;
}

function getExternalUrl(app: AnyRecord, key: 'linkedin' | 'github' | 'portfolio') {
  if (key === 'linkedin') {
    return firstValue(app, ['candidate.linkedin', 'linkedin', 'personalInfo.linkedin']);
  }

  if (key === 'github') {
    return firstValue(app, ['candidate.github', 'github', 'personalInfo.github']);
  }

  return firstValue(app, ['candidate.portfolio', 'portfolio', 'personalInfo.portfolio']);
}

function CandidateFlow({ app }: { app: AnyRecord }) {
  const activeIndex = getPipelineIndex(app);
  const color = getFlowColor(app);

  return (
    <div style={flowStyle}>
      {FLOW_STAGES.map((stage, index) => {
        const done = index <= activeIndex;

        return (
          <div key={stage} style={flowItemStyle}>
            <span
              style={{
                ...flowDotStyle,
                background: done ? color : 'rgba(255,255,255,0.14)',
                boxShadow: done ? `0 0 14px ${color}` : 'none',
              }}
            >
              {done ? '✓' : ''}
            </span>

            <span style={{ color: done ? C.text : C.faint }}>{stage}</span>

            {index < FLOW_STAGES.length - 1 && (
              <i
                style={{
                  ...flowLineStyle,
                  background: index < activeIndex ? color : 'rgba(255,255,255,0.10)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color = C.text,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div style={metricCardStyle}>
      <span>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

function SkillPill({ skill, tone }: { skill: string; tone: 'good' | 'bad' | 'neutral' }) {
  const color = tone === 'good' ? C.green : tone === 'bad' ? C.red : C.sky;

  return (
    <span
      style={{
        ...skillPillStyle,
        color,
        borderColor: `${color}40`,
        background: `${color}12`,
      }}
    >
      {skill}
    </span>
  );
}

export default function CandidateDetailsDrawer({
  open,
  app,
  job,
  onClose,
}: CandidateDetailsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const resumeUrl = useMemo(() => (app ? getResumeUrl(app) : ''), [app]);

  if (!mounted || !open || !app) return null;

  const name = getCandidateName(app);
  const email = getCandidateEmail(app);
  const phone = getCandidatePhone(app);
  const status = normalizeStatus(app.status);
  const atsScore = getAtsScore(app);
  const recommendation = getAtsRecommendation(app);
  const matchedSkills = getMatchedSkills(app);
  const missingSkills = getMissingSkills(app);
  const detectedSkills = getDetectedSkills(app);
  const linkedin = getExternalUrl(app, 'linkedin');
  const github = getExternalUrl(app, 'github');
  const portfolio = getExternalUrl(app, 'portfolio');

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1400);
    } catch {
      setCopied('');
    }
  }

  return createPortal(
    <div style={overlayStyle} onClick={onClose}>
      <aside style={drawerStyle} onClick={(event) => event.stopPropagation()}>
        <header style={drawerHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>Candidate Details</p>
            <h2 style={titleStyle}>{name}</h2>
            <p style={mutedTextStyle}>{email}</p>
          </div>

          <button type="button" onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </header>

        <section style={heroCardStyle}>
          <div style={avatarStyle}>
            {name.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={candidateTitleStyle}>{name}</h3>
            <p style={mutedTextStyle}>
              {getJobTitle(app, job)} · {getCompany(app, job)}
            </p>

            <div style={badgeRowStyle}>
              <span style={statusBadgeStyle}>{status}</span>
              <span style={statusBadgeStyle}>ATS {hasAts(app) ? `${atsScore}%` : 'pending'}</span>
              <span style={statusBadgeStyle}>{recommendation.toLowerCase()}</span>
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeadStyle}>
            <div>
              <p style={sectionTitleStyle}>Candidate Flow</p>
              <p style={sectionSubStyle}>Separate tracking for this application only.</p>
            </div>
          </div>

          <CandidateFlow app={app} />
        </section>

        <section style={metricGridStyle}>
          <MetricCard label="Application ID" value={getApplicationId(app)} color={C.purple} />
          <MetricCard label="Candidate ID" value={getCandidateId(app)} color={C.sky} />
          <MetricCard label="Applied At" value={formatDate(getAppliedAt(app))} />
          <MetricCard label="Phone" value={phone} />
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeadStyle}>
            <div>
              <p style={sectionTitleStyle}>Resume Access</p>
              <p style={sectionSubStyle}>{getResumeFileName(app)}</p>
            </div>

            {resumeUrl ? (
              <a href={resumeUrl} target="_blank" rel="noreferrer" style={primaryLinkStyle}>
                Open Resume →
              </a>
            ) : (
              <span style={disabledPillStyle}>No resume URL</span>
            )}
          </div>

          {!resumeUrl && (
            <div style={warningBoxStyle}>
              Resume file URL is not returned from backend yet. In `/jobs/:jobId/applicants`,
              include candidate latest resume URL from storage, for example `resumeUrl` or
              `candidate.resume.fileUrl`.
            </div>
          )}
        </section>

        <section style={sectionStyle}>
          <p style={sectionTitleStyle}>ATS Intelligence</p>

          <div style={atsGridStyle}>
            <MetricCard
              label="ATS Score"
              value={hasAts(app) ? `${atsScore}%` : 'Pending'}
              color={atsScore >= 75 ? C.green : atsScore >= 55 ? C.yellow : C.red}
            />
            <MetricCard label="Recommendation" value={recommendation} color={C.purple} />
            <MetricCard label="Matched Skills" value={matchedSkills.length} color={C.green} />
            <MetricCard label="Missing Skills" value={missingSkills.length} color={C.red} />
          </div>

          <div style={reasonBoxStyle}>
            {getAtsReason(app)}
          </div>

          <div style={skillSectionStyle}>
            <p style={miniTitleStyle}>Matched Skills</p>
            <div style={skillWrapStyle}>
              {matchedSkills.length ? (
                matchedSkills.map((skill) => <SkillPill key={skill} skill={skill} tone="good" />)
              ) : (
                <span style={emptyTextStyle}>No matched skills returned.</span>
              )}
            </div>
          </div>

          <div style={skillSectionStyle}>
            <p style={miniTitleStyle}>Missing Skills / Gaps</p>
            <div style={skillWrapStyle}>
              {missingSkills.length ? (
                missingSkills.map((skill) => <SkillPill key={skill} skill={skill} tone="bad" />)
              ) : (
                <span style={emptyTextStyle}>No missing skills returned.</span>
              )}
            </div>
          </div>

          <div style={skillSectionStyle}>
            <p style={miniTitleStyle}>Detected Resume Skills</p>
            <div style={skillWrapStyle}>
              {detectedSkills.length ? (
                detectedSkills.map((skill) => <SkillPill key={skill} skill={skill} tone="neutral" />)
              ) : (
                <span style={emptyTextStyle}>No detected skills available.</span>
              )}
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <p style={sectionTitleStyle}>Candidate Links</p>

          <div style={linkGridStyle}>
            {linkedin ? (
              <a href={linkedin} target="_blank" rel="noreferrer" style={secondaryLinkStyle}>
                LinkedIn →
              </a>
            ) : (
              <span style={disabledLinkStyle}>LinkedIn not provided</span>
            )}

            {github ? (
              <a href={github} target="_blank" rel="noreferrer" style={secondaryLinkStyle}>
                GitHub →
              </a>
            ) : (
              <span style={disabledLinkStyle}>GitHub not provided</span>
            )}

            {portfolio ? (
              <a href={portfolio} target="_blank" rel="noreferrer" style={secondaryLinkStyle}>
                Portfolio →
              </a>
            ) : (
              <span style={disabledLinkStyle}>Portfolio not provided</span>
            )}
          </div>
        </section>

        <section style={sectionStyle}>
          <p style={sectionTitleStyle}>Quick Copy</p>

          <div style={linkGridStyle}>
            <button
              type="button"
              style={copyButtonStyle}
              onClick={() => void copyText('Application ID copied', getApplicationId(app))}
            >
              Copy Application ID
            </button>

            <button
              type="button"
              style={copyButtonStyle}
              onClick={() => void copyText('Candidate ID copied', getCandidateId(app))}
            >
              Copy Candidate ID
            </button>

            <button
              type="button"
              style={copyButtonStyle}
              onClick={() => void copyText('Email copied', email)}
            >
              Copy Email
            </button>
          </div>

          {copied && <p style={copiedTextStyle}>{copied}</p>}
        </section>
      </aside>
    </div>,
    document.body,
  );
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: 'rgba(2,6,23,0.76)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  justifyContent: 'flex-end',
};

const drawerStyle: CSSProperties = {
  width: 'min(720px, 100vw)',
  height: '100vh',
  overflowY: 'auto',
  background: 'linear-gradient(180deg, #0B1020, #070B14)',
  borderLeft: `1px solid ${C.borderStrong}`,
  padding: '1.25rem',
  color: C.text,
  fontFamily: "'Sora', sans-serif",
  boxShadow: '-30px 0 90px rgba(0,0,0,0.50)',
};

const drawerHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  marginBottom: 16,
};

const closeButtonStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 16,
  border: `1px solid ${C.border}`,
  background: C.panel2,
  color: C.text,
  cursor: 'pointer',
  fontSize: 20,
  fontWeight: 900,
};

const eyebrowStyle: CSSProperties = {
  margin: '0 0 6px',
  color: C.purple,
  fontSize: 11,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.09em',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 950,
  letterSpacing: '-0.05em',
};

const mutedTextStyle: CSSProperties = {
  margin: '5px 0 0',
  color: C.faint,
  fontSize: 13,
};

const heroCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 22,
  padding: '1rem',
  display: 'flex',
  gap: 14,
  alignItems: 'center',
  marginBottom: 14,
};

const avatarStyle: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 20,
  display: 'grid',
  placeItems: 'center',
  background: `linear-gradient(135deg, ${C.sky}, ${C.purple}, ${C.pink})`,
  color: '#020617',
  fontSize: 28,
  fontWeight: 950,
};

const candidateTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 19,
  fontWeight: 950,
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 10,
};

const statusBadgeStyle: CSSProperties = {
  border: `1px solid ${C.borderStrong}`,
  background: 'rgba(167,139,250,0.12)',
  color: C.purple,
  borderRadius: 999,
  padding: '5px 9px',
  fontSize: 11,
  fontWeight: 900,
  textTransform: 'capitalize',
};

const sectionStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 20,
  padding: '1rem',
  marginTop: 14,
};

const sectionHeadStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: C.text,
  fontSize: 12,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const sectionSubStyle: CSSProperties = {
  margin: '5px 0 0',
  color: C.faint,
  fontSize: 12,
};

const flowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${FLOW_STAGES.length}, minmax(84px, 1fr))`,
  gap: 6,
  overflowX: 'auto',
  paddingTop: 12,
};

const flowItemStyle: CSSProperties = {
  position: 'relative',
  display: 'grid',
  justifyItems: 'center',
  gap: 6,
  fontSize: 10,
  fontWeight: 850,
  textAlign: 'center',
};

const flowDotStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  color: '#020617',
  fontSize: 11,
  fontWeight: 950,
  zIndex: 2,
};

const flowLineStyle: CSSProperties = {
  position: 'absolute',
  top: 11,
  left: '50%',
  width: '100%',
  height: 3,
  zIndex: 1,
};

const metricGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 10,
  marginTop: 14,
};

const metricCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 16,
  padding: '12px 14px',
  display: 'grid',
  gap: 6,
};

const primaryLinkStyle: CSSProperties = {
  color: '#020617',
  background: `linear-gradient(135deg, ${C.sky}, ${C.purple}, ${C.pink})`,
  borderRadius: 14,
  padding: '10px 14px',
  textDecoration: 'none',
  fontWeight: 950,
  fontSize: 13,
};

const disabledPillStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.04)',
  color: C.faint,
  borderRadius: 999,
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 850,
};

const warningBoxStyle: CSSProperties = {
  marginTop: 12,
  border: '1px solid rgba(251,191,36,0.28)',
  background: 'rgba(251,191,36,0.08)',
  color: '#FDE68A',
  borderRadius: 14,
  padding: '12px 14px',
  fontSize: 12,
  lineHeight: 1.6,
};

const atsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 10,
  marginTop: 12,
};

const reasonBoxStyle: CSSProperties = {
  marginTop: 12,
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 14,
  padding: '12px 14px',
  color: C.muted,
  fontSize: 13,
  lineHeight: 1.65,
};

const skillSectionStyle: CSSProperties = {
  marginTop: 14,
};

const miniTitleStyle: CSSProperties = {
  margin: '0 0 8px',
  color: C.faint,
  fontSize: 11,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const skillWrapStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 7,
};

const skillPillStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 999,
  padding: '6px 9px',
  fontSize: 11,
  fontWeight: 850,
};

const emptyTextStyle: CSSProperties = {
  color: C.faint,
  fontSize: 12,
};

const linkGridStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 9,
  marginTop: 12,
};

const secondaryLinkStyle: CSSProperties = {
  border: `1px solid ${C.borderStrong}`,
  background: 'rgba(167,139,250,0.12)',
  color: C.purple,
  borderRadius: 14,
  padding: '10px 12px',
  textDecoration: 'none',
  fontWeight: 850,
  fontSize: 13,
};

const disabledLinkStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.03)',
  color: C.faint,
  borderRadius: 14,
  padding: '10px 12px',
  fontSize: 13,
};

const copyButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  color: C.text,
  borderRadius: 14,
  padding: '10px 12px',
  cursor: 'pointer',
  fontWeight: 850,
  fontFamily: "'Sora', sans-serif",
};

const copiedTextStyle: CSSProperties = {
  margin: '10px 0 0',
  color: C.green,
  fontSize: 12,
  fontWeight: 850,
};