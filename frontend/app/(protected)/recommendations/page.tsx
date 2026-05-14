'use client';

import useSWR from 'swr';
import api from '@/lib/axios';
import { useLatestResume } from '@/hooks/useRealTimeAlerts';

interface JobRec {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  requiredSkills: string[];
  applyUrl: string | null;
  matchScore: number;
  atsScore: number;
  atsRecommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  matchedSkills: string[];
  missingSkills: string[];
  matchReason: string;
  atsReason: string;
  source: 'internal' | 'serpapi' | 'linkedin' | 'indeed';
  postedAt: string;
}

interface RecommendationsResponse {
  recommendations: JobRec[];
  reason?: string;
  profile?: {
    skills?: string[];
    experienceLevel?: string;
    experienceYears?: number;
    currentTitle?: string | null;
    targetRoles?: string[];
    industryTags?: string[];
  };
}

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const fmtSalary = (min: number | null, max: number | null): string | null => {
  if (!min && !max) return null;
  const f = (n: number) => `₹${(n / 100_000).toFixed(0)}L`;
  if (min && max) return `${f(min)}–${f(max)} PA`;
  return min ? `From ${f(min)}` : `Up to ${f(max!)}`;
};

function getScoreColor(score: number) {
  if (score >= 80) return '#34D399';
  if (score >= 60) return '#FBBF24';
  return '#60A5FA';
}

function getSourceLabel(source: JobRec['source']) {
  if (source === 'internal') return 'Recruiter';
  if (source === 'serpapi') return 'Google';
  if (source === 'linkedin') return 'LinkedIn';
  if (source === 'indeed') return 'Indeed';
  return 'Job';
}

function RecommendationBadge({
  recommendation,
}: {
  recommendation: JobRec['atsRecommendation'];
}) {
  const meta = {
    SHORTLIST: {
      label: 'Shortlist fit',
      color: '#34D399',
      bg: 'rgba(52,211,153,0.12)',
      border: 'rgba(52,211,153,0.28)',
    },
    REVIEW: {
      label: 'Review fit',
      color: '#FBBF24',
      bg: 'rgba(251,191,36,0.12)',
      border: 'rgba(251,191,36,0.28)',
    },
    REJECT: {
      label: 'Weak fit',
      color: '#F87171',
      bg: 'rgba(248,113,113,0.12)',
      border: 'rgba(248,113,113,0.28)',
    },
  }[recommendation];

  return (
    <span
      style={{
        fontSize: 10,
        padding: '3px 8px',
        borderRadius: 999,
        background: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.border}`,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </span>
  );
}

function JobCard({ job }: { job: JobRec }) {
  const salary = fmtSalary(job.salaryMin, job.salaryMax);
  const atsColor = getScoreColor(job.atsScore);
  const matchColor = getScoreColor(job.matchScore);

  return (
    <article
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.07)',
        background:
          'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(2,6,23,0.92))',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              flexWrap: 'wrap',
              marginBottom: 5,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: '#F1F5F9',
                lineHeight: 1.35,
              }}
            >
              {job.title}
            </h2>

            <span
              style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 20,
                background: 'rgba(96,165,250,0.10)',
                color: '#60A5FA',
                border: '1px solid rgba(96,165,250,0.25)',
                fontWeight: 800,
              }}
            >
              {getSourceLabel(job.source)}
            </span>

            <RecommendationBadge recommendation={job.atsRecommendation} />
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            {job.company}
            {job.location && ` · ${job.location}`}
            {job.workMode && ` · ${job.workMode}`}
          </p>
        </div>

        <div
          style={{
            flexShrink: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            textAlign: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: atsColor,
                fontFamily: 'monospace',
                lineHeight: 1,
              }}
            >
              {job.atsScore}%
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                marginTop: 2,
              }}
            >
              ATS
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: matchColor,
                fontFamily: 'monospace',
                lineHeight: 1,
              }}
            >
              {job.matchScore}%
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                marginTop: 2,
              }}
            >
              match
            </div>
          </div>
        </div>
      </div>

      <p
        style={{
          margin: 0,
          color: 'rgba(226,232,240,0.72)',
          fontSize: 12,
          lineHeight: 1.65,
        }}
      >
        {job.matchReason}
      </p>

      <p
        style={{
          margin: 0,
          color: 'rgba(226,232,240,0.48)',
          fontSize: 11,
          lineHeight: 1.6,
        }}
      >
        {job.atsReason}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {job.employmentType && (
          <span style={chipStyle}>{job.employmentType.replace('_', ' ')}</span>
        )}

        {salary && (
          <span
            style={{
              ...chipStyle,
              color: '#34D399',
              background: 'rgba(52,211,153,0.08)',
              borderColor: 'rgba(52,211,153,0.18)',
            }}
          >
            {salary}
          </span>
        )}
      </div>

      {job.matchedSkills?.length > 0 && (
        <div>
          <p style={miniLabelStyle}>Matched skills</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {job.matchedSkills.slice(0, 8).map((skill) => (
              <span
                key={skill}
                style={{
                  ...skillStyle,
                  color: '#34D399',
                  background: 'rgba(52,211,153,0.08)',
                  borderColor: 'rgba(52,211,153,0.2)',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {job.missingSkills?.length > 0 && (
        <div>
          <p style={miniLabelStyle}>Missing skills</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {job.missingSkills.slice(0, 6).map((skill) => (
              <span
                key={skill}
                style={{
                  ...skillStyle,
                  color: '#FBBF24',
                  background: 'rgba(251,191,36,0.08)',
                  borderColor: 'rgba(251,191,36,0.2)',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 4, display: 'flex', gap: 10 }}>
        {job.source === 'internal' ? (
          <a
            href="/jobs"
            style={{
              ...buttonStyle,
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.35)',
              color: '#A78BFA',
            }}
          >
            Apply in-app
          </a>
        ) : job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...buttonStyle,
              background: 'rgba(96,165,250,0.12)',
              border: '1px solid rgba(96,165,250,0.25)',
              color: '#60A5FA',
            }}
          >
            Apply externally ↗
          </a>
        ) : (
          <a
            href="/jobs"
            style={{
              ...buttonStyle,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            View in Jobs
          </a>
        )}
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.06)',
        background: '#0D1220',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {[55, 35, 100, 80].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 2 ? 42 : 14,
            width: `${w}%`,
            borderRadius: 6,
            background: `rgba(255,255,255,0.0${i + 4})`,
            animation: 'rcPulse 1.5s ease infinite',
          }}
        />
      ))}
      <style>{`@keyframes rcPulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

function Gate({
  icon,
  title,
  body,
  cta,
  href,
  color,
}: {
  icon: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: '2rem',
        borderRadius: 16,
        border: `1px solid ${color}33`,
        background: `${color}08`,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>

      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color }}>
          {title}
        </p>

        <p
          style={{
            margin: '4px 0 14px',
            fontSize: 13,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.65,
          }}
        >
          {body}
        </p>

        <a
          href={href}
          style={{
            fontSize: 13,
            fontWeight: 700,
            padding: '8px 16px',
            borderRadius: 8,
            background: `${color}18`,
            border: `1px solid ${color}44`,
            color,
            textDecoration: 'none',
          }}
        >
          {cta}
        </a>
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const { resume, loading: resumeLoading } = useLatestResume();

  const hasAnalysis = resume?.status === 'analyzed';
  const isProcessing = resume?.status === 'processing';
  const isFailed = resume?.status === 'failed';
  const isUploaded = resume?.status === 'uploaded';

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<RecommendationsResponse>(
    hasAnalysis ? '/recommendations/jobs?limit=12' : null,
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    },
  );

  const jobs = data?.recommendations ?? [];

  const errorMessage: string | null =
    (error?.response?.data?.message as string | undefined) ??
    (error?.response?.data?.error as string | undefined) ??
    (error?.message as string | undefined) ??
    null;

  return (
    <>
      <style>{`@keyframes rcSpin{to{transform:rotate(360deg)}}`}</style>

      <div
        style={{
          minHeight: '100vh',
          background: '#080C14',
          fontFamily: "'Sora', sans-serif",
          color: '#E2E8F0',
        }}
      >
        <div
          style={{
            background: '#0D1220',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '1.25rem 2rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 900,
                color: '#F1F5F9',
                letterSpacing: '-0.03em',
              }}
            >
              Recommendations
            </h1>

            {isValidating && hasAnalysis && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#34D399',
                  boxShadow: '0 0 5px #34D399',
                  display: 'inline-block',
                }}
              />
            )}
          </div>

          <p
            style={{
              margin: '4px 0 0',
              fontSize: 12,
              color: 'rgba(255,255,255,0.38)',
            }}
          >
            Jobs ranked using your analysed resume, skills, and ATS fit
            {hasAnalysis ? ' · refreshes every 60s' : ''}
          </p>
        </div>

        <div
          style={{
            padding: '0 2rem 4rem',
            maxWidth: 1120,
            margin: '0 auto',
          }}
        >
          {!resumeLoading && !resume && (
            <Gate
              icon="📄"
              color="#FBBF24"
              title="No resume uploaded"
              body="Upload your resume first. After upload, it will appear in Resume Analysis as queued/uploaded."
              cta="Upload Resume"
              href="/resumes"
            />
          )}

          {!resumeLoading && isUploaded && (
            <Gate
              icon="⚡"
              color="#A78BFA"
              title="Resume uploaded and queued"
              body="Your resume is uploaded. Go to Resume Analysis and start analysis with the JobCrawler Python AI service."
              cta="Go to Resume Analysis"
              href="/resume-analysis"
            />
          )}

          {!resumeLoading && isProcessing && (
            <div
              style={{
                padding: '2rem',
                borderRadius: 16,
                border: '1px solid rgba(251,191,36,0.2)',
                background: 'rgba(251,191,36,0.04)',
                display: 'flex',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '2.5px solid rgba(251,191,36,0.3)',
                  borderTopColor: '#FBBF24',
                  animation: 'rcSpin 0.8s linear infinite',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#FBBF24',
                  }}
                >
                  JobCrawler Python AI is analysing your resume
                </p>

                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: 12,
                    color: 'rgba(251,191,36,0.58)',
                  }}
                >
                  Recommendations and ATS job scores will appear here once the
                  analysis is complete.
                </p>
              </div>
            </div>
          )}

          {!resumeLoading && isFailed && (
            <Gate
              icon="⚠"
              color="#F87171"
              title="Analysis failed"
              body="Resume analysis failed. Go to Resume Analysis and retry with the Python AI service."
              cta="Retry Analysis"
              href="/resume-analysis"
            />
          )}

          {hasAnalysis && isLoading && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
                gap: 16,
              }}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          )}

          {hasAnalysis && !isLoading && errorMessage && (
            <div
              style={{
                padding: '2rem',
                borderRadius: 16,
                border: '1px solid rgba(248,113,113,0.2)',
                background: 'rgba(248,113,113,0.04)',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#F87171',
                }}
              >
                Could not load recommendations
              </p>

              <code
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: 'rgba(248,113,113,0.78)',
                  background: 'rgba(0,0,0,0.25)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                {errorMessage}
              </code>

              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.46)',
                  lineHeight: 1.7,
                }}
              >
                Recommendations depend on your completed resume analysis,
                stored skills, and Python ATS scoring service.
              </p>

              <button
                type="button"
                onClick={() => void mutate()}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.25)',
                  color: '#F87171',
                  cursor: 'pointer',
                  fontFamily: 'Sora, sans-serif',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {hasAnalysis && !isLoading && !errorMessage && jobs.length === 0 && (
            <div
              style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)',
                background: '#0D1220',
              }}
            >
              <p style={{ fontSize: 32, margin: '0 0 12px' }}>🔍</p>

              <p
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: 'rgba(255,255,255,0.6)',
                  margin: '0 0 4px',
                }}
              >
                No matches found yet
              </p>

              <p
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.35)',
                  margin: '0 0 16px',
                }}
              >
                Jobs sync from APIs into PostgreSQL. Check again after jobs are
                synced.
              </p>

              <a
                href="/jobs"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: 'rgba(96,165,250,0.1)',
                  border: '1px solid rgba(96,165,250,0.25)',
                  color: '#60A5FA',
                  textDecoration: 'none',
                }}
              >
                Browse all jobs
              </a>
            </div>
          )}

          {hasAnalysis && !isLoading && !errorMessage && jobs.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 900,
                      color: '#F1F5F9',
                    }}
                  >
                    {jobs.length} recommended job{jobs.length !== 1 ? 's' : ''}
                  </p>

                  <p
                    style={{
                      margin: '4px 0 0',
                      color: 'rgba(255,255,255,0.35)',
                      fontSize: 12,
                    }}
                  >
                    Ranked by Python ATS score + skill match
                  </p>
                </div>

                {data?.profile?.skills?.length ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {data.profile.skills.slice(0, 6).map((skill) => (
                      <span key={skill} style={skillStyle}>
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
                  gap: 16,
                }}
              >
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const chipStyle: React.CSSProperties = {
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.48)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const skillStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '3px 8px',
  borderRadius: 6,
  background: 'rgba(167,139,250,0.08)',
  color: 'rgba(167,139,250,0.9)',
  border: '1px solid rgba(167,139,250,0.18)',
  fontWeight: 700,
};

const miniLabelStyle: React.CSSProperties = {
  margin: '0 0 6px',
  color: 'rgba(255,255,255,0.28)',
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const buttonStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  padding: '8px 16px',
  borderRadius: 9,
  textDecoration: 'none',
};