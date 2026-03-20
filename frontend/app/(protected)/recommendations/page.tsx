'use client';

import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/axios';
import { useLatestResume } from '@/hooks/useRealTimeAlerts';

interface JobRec {
  id:             string;
  title:          string;
  company:        string;
  location:       string | null;
  workMode:       string | null;
  employmentType: string | null;
  salaryMin:      number | null;
  salaryMax:      number | null;
  requiredSkills: string[];
  applyUrl:       string | null;
  matchScore?:    number;
  source:         'internal' | 'serpapi';
  postedAt:       string;
}

const fetcher = (url: string) => api.get(url).then(r => r.data);

const fmtSalary = (min: number | null, max: number | null): string | null => {
  if (!min && !max) return null;
  const f = (n: number) => `₹${(n / 100_000).toFixed(0)}L`;
  if (min && max) return `${f(min)}–${f(max)} PA`;
  return min ? `From ${f(min)}` : `Up to ${f(max!)}`;
};

function JobCard({ job }: { job: JobRec }) {
  const salary     = fmtSalary(job.salaryMin, job.salaryMax);
  const isDirect   = job.source === 'internal';
  const score      = job.matchScore ?? 0;
  const scoreColor = score >= 80 ? '#34D399' : score >= 60 ? '#FBBF24' : '#60A5FA';

  return (
    <div style={{
      padding: '1.25rem 1.5rem', borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.07)',
      background: '#0D1220',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>{job.title}</p>
            {isDirect && (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)', fontWeight: 600 }}>
                Direct
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {job.company}
            {job.location && ` · ${job.location}`}
            {job.workMode && ` · ${job.workMode}`}
          </p>
        </div>
        {score > 0 && (
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor, fontFamily: 'monospace', lineHeight: 1 }}>{score}%</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>match</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {job.employmentType && (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {job.employmentType.replace('_', ' ')}
          </span>
        )}
        {salary && (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}>
            {salary}
          </span>
        )}
      </div>

      {job.requiredSkills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {job.requiredSkills.slice(0, 6).map((skill: string) => (
            <span key={skill} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(167,139,250,0.08)', color: 'rgba(167,139,250,0.8)', border: '1px solid rgba(167,139,250,0.15)' }}>
              {skill}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 4 }}>
        {isDirect ? (
          <a href="/jobs" style={{ fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 8, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', color: '#A78BFA', textDecoration: 'none' }}>
            Apply in-app
          </a>
        ) : job.applyUrl ? (
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 8, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', color: '#60A5FA', textDecoration: 'none' }}>
            Apply externally ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: '#0D1220', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[55, 35, 100].map((w, i) => (
        <div key={i} style={{ height: i === 2 ? 40 : 14, width: `${w}%`, borderRadius: 6, background: `rgba(255,255,255,0.0${i + 4})`, animation: 'rcPulse 1.5s ease infinite' }} />
      ))}
      <style>{`@keyframes rcPulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

function Gate({ icon, title, body, cta, href, color }: {
  icon: string; title: string; body: string;
  cta: string; href: string; color: string;
}) {
  return (
    <div style={{ padding: '2rem', borderRadius: 14, border: `1px solid ${color}33`, background: `${color}08`, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color }}>{title}</p>
        <p style={{ margin: '4px 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{body}</p>
        <a href={href} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 8, background: `${color}18`, border: `1px solid ${color}44`, color, textDecoration: 'none' }}>
          {cta}
        </a>
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const { resume, loading: resumeLoading } = useLatestResume();

  const hasAnalysis  = resume?.status === 'analyzed';
  const isProcessing = resume?.status === 'processing';
  const isFailed     = resume?.status === 'failed';
  const isUploaded   = resume?.status === 'uploaded';

  // Key architectural decision: only fire /jobs/recommendations AFTER analysis
  // is confirmed complete. Calling it earlier causes a 500 because
  // candidate_profiles.top_skills is empty — the backend has nothing to score with.
  const { data: jobs, error, isLoading, isValidating, mutate } = useSWR<JobRec[]>(
    hasAnalysis ? '/jobs/recommendations' : null,
    fetcher,
    {
      refreshInterval:    60_000,
      revalidateOnFocus:  true,
      shouldRetryOnError: false, // 500s need user action, not auto-retry loops
    },
  );

  // Safe error message extraction from axios error shape
  const errorMessage: string | null =
    (error?.response?.data?.message as string | undefined) ??
    (error?.response?.data?.error  as string | undefined) ??
    (error?.message as string | undefined) ??
    null;

  return (
    <>
      <style>{`@keyframes rcSpin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>

        {/* Header */}
        <div style={{ background: '#0D1220', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Recommendations</h1>
            {isValidating && hasAnalysis && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 5px #34D399', display: 'inline-block' }} />
            )}
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            Jobs matched to your skills{hasAnalysis ? ' · refreshes every 60s' : ''}
          </p>
        </div>

        <div style={{ padding: '0 2rem 4rem', maxWidth: 900, margin: '0 auto' }}>

          {/* State gates — each blocks rendering the actual recommendations */}

          {!resumeLoading && !resume && (
            <Gate icon="📄" color="#FBBF24"
              title="No resume uploaded"
              body="Upload your resume and run the AI analysis to unlock personalised job matches."
              cta="Upload Resume" href="/resumes" />
          )}

          {!resumeLoading && isUploaded && (
            <Gate icon="⚡" color="#A78BFA"
              title="Resume not yet analysed"
              body="Go to Resume Analysis and click Analyse with Groq to extract your skills and unlock matches."
              cta="Go to Resume Analysis" href="/resume-analysis" />
          )}

          {!resumeLoading && isProcessing && (
            <div style={{ padding: '2rem', borderRadius: 14, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)', display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid rgba(251,191,36,0.3)', borderTopColor: '#FBBF24', animation: 'rcSpin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FBBF24' }}>Groq is analysing your resume</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(251,191,36,0.5)' }}>Recommendations will appear here automatically once complete · page auto-updates</p>
              </div>
            </div>
          )}

          {!resumeLoading && isFailed && (
            <Gate icon="⚠" color="#F87171"
              title="Analysis failed"
              body="Something went wrong during Groq analysis. Go to Resume Analysis to retry."
              cta="Retry Analysis" href="/resume-analysis" />
          )}

          {/* Recommendations loading */}
          {hasAnalysis && isLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Recommendations 500 / backend error */}
          {hasAnalysis && !isLoading && errorMessage && (
            <div style={{ padding: '2rem', borderRadius: 14, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.04)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#F87171' }}>Could not load recommendations</p>
              <code style={{ display: 'block', fontSize: 11, color: 'rgba(248,113,113,0.7)', background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                {errorMessage}
              </code>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Root cause:</strong> your BullMQ analysis worker saves results to{' '}
                <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4 }}>resume_analyses</code>{' '}
                but does not write <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4 }}>top_skills</code>{' '}
                back to <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4 }}>candidate_profiles</code>.{' '}
                The recommendations service reads from the profile table and 500s when it finds no skills.
                Share your BullMQ worker file and I'll add the sync.
              </p>
              <button onClick={() => void mutate()} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                Retry
              </button>
            </div>
          )}

          {/* Empty results */}
          {hasAnalysis && !isLoading && !errorMessage && (jobs?.length ?? 0) === 0 && (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: '#0D1220' }}>
              <p style={{ fontSize: 32, margin: '0 0 12px' }}>🔍</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>No matches found yet</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>Jobs sync every 30 minutes. Check back shortly.</p>
              <a href="/jobs" style={{ fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60A5FA', textDecoration: 'none' }}>Browse all jobs</a>
            </div>
          )}

          {/* Results grid */}
          {hasAnalysis && !isLoading && !errorMessage && (jobs?.length ?? 0) > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>
                  {jobs!.length} matched job{jobs!.length !== 1 ? 's' : ''}
                </p>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Ranked by skill match</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
                {jobs!.map((job: JobRec) => <JobCard key={job.id} job={job} />)}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
