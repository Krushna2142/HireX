'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';

type SavedJob = {
  id: string;
  title?: string | null;
  company?: string | null;
  companyName?: string | null;
  company_name?: string | null;
  location?: string | null;
  workMode?: string | null;
  work_mode?: string | null;
  employmentType?: string | null;
  employment_type?: string | null;
  salaryMin?: number | null;
  salary_min?: number | null;
  salaryMax?: number | null;
  salary_max?: number | null;
  source?: string | null;
  applyUrl?: string | null;
  apply_url?: string | null;
  description?: string | null;
};

const C = {
  bg: '#070B14',
  card: 'rgba(15,23,42,0.78)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(56,189,248,0.28)',
  text: '#F8FAFC',
  muted: 'rgba(226,232,240,0.68)',
  faint: 'rgba(226,232,240,0.42)',
  sky: '#38BDF8',
  purple: '#A78BFA',
  pink: '#F472B6',
  green: '#34D399',
};

function getSavedIdsFromLocalStorage(): string[] {
  if (typeof window === 'undefined') return [];

  const keys = [
    'jc_saved_jobs',
    'saved_jobs',
    'savedJobs',
    'jobcrawler_saved_jobs',
    'savedJobIds',
  ];

  const ids = new Set<string>();

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') ids.add(item);
          else if (item?.id) ids.add(String(item.id));
        }
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const value of Object.values(parsed)) {
          if (typeof value === 'string') ids.add(value);
          else if ((value as any)?.id) ids.add(String((value as any).id));
        }
      }
    } catch {
      raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((id) => ids.add(id));
    }
  }

  return Array.from(ids);
}

function normalizeJobsPayload(payload: any): SavedJob[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
}

function getCompany(job: SavedJob) {
  return job.companyName ?? job.company_name ?? job.company ?? 'Company not set';
}

function getWorkMode(job: SavedJob) {
  return job.workMode ?? job.work_mode ?? 'mode not set';
}

function getEmploymentType(job: SavedJob) {
  return job.employmentType ?? job.employment_type ?? 'type not set';
}

function getSalary(job: SavedJob) {
  const min = job.salaryMin ?? job.salary_min;
  const max = job.salaryMax ?? job.salary_max;

  if (!min && !max) return 'Salary not disclosed';
  if (min && max) return `₹${min} - ₹${max}`;
  if (min) return `From ₹${min}`;

  return `Up to ₹${max}`;
}

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  const savedIds = useMemo(() => getSavedIdsFromLocalStorage(), []);

  useEffect(() => {
    async function loadSavedJobs() {
      setLoading(true);

      try {
        try {
          const savedResponse = await api.get('/jobs/saved');
          const savedJobs = normalizeJobsPayload(savedResponse.data);

          if (savedJobs.length) {
            setJobs(savedJobs);
            return;
          }
        } catch {
          // Backend saved-jobs endpoint may not exist yet.
          // Fallback to localStorage saved IDs + normal jobs endpoint.
        }

        if (!savedIds.length) {
          setJobs([]);
          return;
        }

        const allJobsResponse = await api.get('/jobs', {
          params: {
            source: 'all',
            limit: 200,
            page: 1,
          },
        });

        const allJobs = normalizeJobsPayload(allJobsResponse.data);
        const filtered = allJobs.filter((job) => savedIds.includes(String(job.id)));

        setJobs(filtered);
      } finally {
        setLoading(false);
      }
    }

    void loadSavedJobs();
  }, [savedIds]);

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '2rem',
        color: C.text,
        background:
          'radial-gradient(circle at top left, rgba(56,189,248,0.10), transparent 32%), radial-gradient(circle at top right, rgba(244,114,182,0.12), transparent 28%), #070B14',
      }}
    >
      <header
        style={{
          border: `1px solid ${C.borderStrong}`,
          background:
            'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(2,6,23,0.92))',
          borderRadius: 26,
          padding: '1.5rem',
          marginBottom: 18,
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        }}
      >
        <p
          style={{
            margin: 0,
            color: C.sky,
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Saved Jobs
        </p>

        <h1
          style={{
            margin: '0.5rem 0 0',
            fontSize: 34,
            letterSpacing: '-0.055em',
            lineHeight: 1.08,
          }}
        >
          Your bookmarked opportunities
        </h1>

        <p
          style={{
            margin: '0.8rem 0 0',
            color: C.muted,
            maxWidth: 760,
            lineHeight: 1.7,
            fontSize: 14,
          }}
        >
          Jobs you save from the jobs page will appear here for quick access.
        </p>
      </header>

      {loading ? (
        <div
          style={{
            border: `1px solid ${C.border}`,
            background: C.card,
            borderRadius: 22,
            padding: '2rem',
            color: C.muted,
          }}
        >
          Loading saved jobs...
        </div>
      ) : jobs.length === 0 ? (
        <section
          style={{
            border: `1px dashed ${C.borderStrong}`,
            background: 'rgba(15,23,42,0.55)',
            borderRadius: 22,
            padding: '3rem 2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 42, marginBottom: 12 }}>🔖</div>
          <h2 style={{ margin: 0, fontSize: 24 }}>No saved jobs yet</h2>
          <p
            style={{
              margin: '0.8rem auto 1.2rem',
              color: C.muted,
              maxWidth: 520,
              lineHeight: 1.7,
            }}
          >
            Click the save icon on any job card. Saved jobs will become accessible from this sidebar section.
          </p>

          <Link
            href="/jobs"
            style={{
              display: 'inline-flex',
              borderRadius: 14,
              padding: '12px 16px',
              color: '#020617',
              fontWeight: 900,
              textDecoration: 'none',
              background: `linear-gradient(135deg, ${C.sky}, ${C.purple}, ${C.pink})`,
            }}
          >
            Browse Jobs
          </Link>
        </section>
      ) : (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {jobs.map((job) => (
            <article
              key={job.id}
              style={{
                border: `1px solid ${C.border}`,
                background:
                  'linear-gradient(145deg, rgba(15,23,42,0.82), rgba(2,6,23,0.86))',
                borderRadius: 22,
                padding: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: C.text,
                      fontSize: 18,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {job.title ?? 'Untitled Job'}
                  </h2>

                  <p
                    style={{
                      margin: '0.45rem 0 0',
                      color: C.muted,
                      fontSize: 13,
                    }}
                  >
                    {getCompany(job)} · {job.location ?? 'Location not set'}
                  </p>
                </div>

                <span
                  style={{
                    border: `1px solid ${C.borderStrong}`,
                    color: C.sky,
                    borderRadius: 999,
                    padding: '5px 9px',
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                  }}
                >
                  {job.source ?? 'job'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginTop: 14,
                }}
              >
                <span style={chipStyle}>{getWorkMode(job)}</span>
                <span style={chipStyle}>{getEmploymentType(job)}</span>
                <span style={chipStyle}>{getSalary(job)}</span>
              </div>

              <p
                style={{
                  color: C.muted,
                  lineHeight: 1.7,
                  fontSize: 13,
                  margin: '1rem 0 0',
                }}
              >
                {(job.description ?? 'No description available.').slice(0, 180)}
                {(job.description ?? '').length > 180 ? '...' : ''}
              </p>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Link
                  href={`/jobs/${job.id}`}
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 13,
                    padding: '10px 12px',
                    color: C.text,
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 800,
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  View Details
                </Link>

                {job.applyUrl ?? job.apply_url ? (
                  <a
                    href={job.applyUrl ?? job.apply_url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      borderRadius: 13,
                      padding: '10px 12px',
                      color: '#020617',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 900,
                      background: C.green,
                    }}
                  >
                    Apply
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

const chipStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  color: C.muted,
  borderRadius: 999,
  padding: '5px 9px',
  fontSize: 11,
  fontWeight: 800,
  background: 'rgba(255,255,255,0.035)',
};