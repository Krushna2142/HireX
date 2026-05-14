/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/axios';
import { useResumes, type Resume } from '@/hooks/useResumePolling';

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
  selectedResume?: {
    id: string;
    fileName?: string | null;
    experienceLevel?: string | null;
    experienceYears?: number | null;
    topSkills?: string[];
    industryTags?: string[];
  } | null;
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

function getFilename(value?: string | null) {
  return (value?.split('/').pop() ?? value ?? 'resume').replace(/^\d+-/, '');
}

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

function ResumeSelector({
  resumes,
  selectedId,
  onSelect,
}: {
  resumes: Resume[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const analysed = resumes.filter((resume) => resume.status === 'analyzed');

  if (!analysed.length) return null;

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#0D1220',
      }}
    >
      <p
        style={{
          margin: '0 0 10px',
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
        }}
      >
        Select resume for recommendations
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {analysed.map((resume) => {
          const active = resume.id === selectedId;

          return (
            <button
              key={resume.id}
              type="button"
              onClick={() => onSelect(resume.id)}
              style={{
                padding: '9px 12px',
                borderRadius: 10,
                border: active
                  ? '1px solid rgba(167,139,250,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: active
                  ? 'rgba(124,58,237,0.18)'
                  : 'rgba(255,255,255,0.03)',
                color: active ? '#C4B5FD' : 'rgba(255,255,255,0.58)',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'Sora, sans-serif',
              }}
            >
              📄 {getFilename(resume.fileName)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: JobRec }) {
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
            <div style={scoreLabelStyle}>ATS</div>
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
            <div style={scoreLabelStyle}>match</div>
          </div>
        </div>
      </div>

      <p style={bodyTextStyle}>{job.matchReason}</p>
      <p style={mutedTextStyle}>{job.atsReason}</p>

      {job.employmentType && (
        <div>
          <span style={chipStyle}>{job.employmentType.replace('_', ' ')}</span>
        </div>
      )}

      {job.matchedSkills?.length > 0 && (
        <div>
          <p style={miniLabelStyle}>Matched skills</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {job.matchedSkills.slice(0, 8).map((skill) => (
              <span key={skill} style={greenSkillStyle}>
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
              <span key={skill} style={yellowSkillStyle}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 4, display: 'flex', gap: 10 }}>
        {job.source === 'internal' ? (
          <a href="/jobs" style={buttonStyle}>
            Apply in-app
          </a>
        ) : job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={buttonStyle}
          >
            Apply externally ↗
          </a>
        ) : (
          <a href="/jobs" style={buttonStyle}>
            View in Jobs
          </a>
        )}
      </div>
    </article>
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
  const { resumes, loading: resumesLoading } = useResumes();
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  const analysedResumes = useMemo(
    () => resumes.filter((resume) => resume.status === 'analyzed'),
    [resumes],
  );

  useEffect(() => {
    if (!selectedResumeId && analysedResumes.length > 0) {
      setSelectedResumeId(analysedResumes[0].id);
    }
  }, [analysedResumes, selectedResumeId]);

  const swrKey = selectedResumeId
    ? `/recommendations/jobs?limit=12&resumeId=${encodeURIComponent(selectedResumeId)}`
    : null;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<RecommendationsResponse>(swrKey, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });

  const jobs = data?.recommendations ?? [];
  const skills = data?.profile?.skills ?? data?.selectedResume?.topSkills ?? [];

  const errorMessage: string | null =
    (error?.response?.data?.message as string | undefined) ??
    (error?.response?.data?.error as string | undefined) ??
    (error?.message as string | undefined) ??
    null;

  return (
    <>
      <style>{`@keyframes rcPulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

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

            {isValidating && selectedResumeId && (
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
            Jobs ranked using the selected resume analysis, skills, and ATS fit
          </p>
        </div>

        <div
          style={{
            padding: '0 2rem 4rem',
            maxWidth: 1280,
            margin: '0 auto',
          }}
        >
          <ResumeSelector
            resumes={resumes}
            selectedId={selectedResumeId}
            onSelect={(id) => {
              setSelectedResumeId(id);
              void mutate();
            }}
          />

          {!resumesLoading && resumes.length === 0 && (
            <Gate
              icon="📄"
              color="#FBBF24"
              title="No resume uploaded"
              body="Upload and analyse at least one resume to unlock recommendations."
              cta="Upload Resume"
              href="/resume-analysis"
            />
          )}

          {!resumesLoading && resumes.length > 0 && analysedResumes.length === 0 && (
            <Gate
              icon="⚡"
              color="#A78BFA"
              title="No analysed resume yet"
              body="Your resume is uploaded but not analysed. Analyse it first to generate resume-specific recommendations."
              cta="Go to Resume Analysis"
              href="/resume-analysis"
            />
          )}

          {selectedResumeId && isLoading && (
            <div
              style={{
                padding: '2rem',
                borderRadius: 16,
                background: '#0D1220',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              Loading recommendations for selected resume…
            </div>
          )}

          {selectedResumeId && !isLoading && errorMessage && (
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

          {selectedResumeId && !isLoading && !errorMessage && jobs.length > 0 && (
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
                    For: {getFilename(data?.selectedResume?.fileName)}
                  </p>
                </div>

                {skills.length ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {skills.slice(0, 8).map((skill) => (
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

          {selectedResumeId && !isLoading && !errorMessage && jobs.length === 0 && (
            <Gate
              icon="🔍"
              color="#60A5FA"
              title="No matching jobs found"
              body={data?.reason ?? 'No recommendations found for this selected resume.'}
              cta="Browse All Jobs"
              href="/jobs"
            />
          )}
        </div>
      </div>
    </>
  );
}

const scoreLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.3)',
  marginTop: 2,
};

const bodyTextStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(226,232,240,0.72)',
  fontSize: 12,
  lineHeight: 1.65,
};

const mutedTextStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(226,232,240,0.48)',
  fontSize: 11,
  lineHeight: 1.6,
};

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

const greenSkillStyle: React.CSSProperties = {
  ...skillStyle,
  color: '#34D399',
  background: 'rgba(52,211,153,0.08)',
  borderColor: 'rgba(52,211,153,0.2)',
};

const yellowSkillStyle: React.CSSProperties = {
  ...skillStyle,
  color: '#FBBF24',
  background: 'rgba(251,191,36,0.08)',
  borderColor: 'rgba(251,191,36,0.2)',
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
  background: 'rgba(96,165,250,0.12)',
  border: '1px solid rgba(96,165,250,0.25)',
  color: '#60A5FA',
};