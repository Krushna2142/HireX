'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useJobFeed } from '@/features/jobs/hooks/useJobs';
import { JobCard } from '@/features/jobs/components/JobCard';
import { JobSkeleton } from '@/features/jobs/components/JobSkeleton';
import { useCandidateProfile } from '@/hooks/userProfile';
import { JobFilters } from '@/features/jobs/types/Index';

export default function JobsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<JobFilters>({
    includeExternal: true,
    page: 1,
  });

  const { data, isLoading } = useJobFeed(filters);

  // Get candidate's active resume for apply flow
  const { data: profile } = useCandidateProfile();
  const activeResumeId = user?.role === 'candidate'
    ? profile?.activeResumeId ?? undefined
    : undefined;

  function update(patch: Partial<JobFilters>) {
    setFilters(prev => ({ ...prev, ...patch, page: 1 }));
  }

  return (
    <div style={{
      fontFamily:   "'Sora', sans-serif",
      background:   '#070B14',
      minHeight:    '100vh',
      padding:      '2rem',
      color:        '#E2E8F0',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 4px' }}>
          Job Feed
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          {data?.sources
            ? `${data.sources.internal} platform jobs · ${data.sources.external} from Google Jobs`
            : 'Loading jobs…'}
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display:      'flex',
        gap:          '10px',
        marginBottom: '1.5rem',
        flexWrap:     'wrap',
      }}>
        <input
          placeholder="Search jobs, companies, skills…"
          value={filters.search ?? ''}
          onChange={e => update({ search: e.target.value || undefined })}
          style={{
            flex:         '1',
            minWidth:     '220px',
            padding:      '10px 14px',
            background:   'rgba(255,255,255,0.05)',
            border:       '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color:        '#F1F5F9',
            fontSize:     '13px',
            outline:      'none',
          }}
        />

        {/* Work mode filter */}
        {['remote', 'hybrid', 'onsite'].map(mode => (
          <button
            key={mode}
            onClick={() => update({ workMode: filters.workMode === mode ? undefined : mode })}
            style={{
              padding:      '8px 16px',
              borderRadius: '8px',
              fontSize:     '12px',
              cursor:       'pointer',
              border:       filters.workMode === mode
                ? '1px solid rgba(56,189,248,0.4)'
                : '1px solid rgba(255,255,255,0.1)',
              background:   filters.workMode === mode
                ? 'rgba(56,189,248,0.1)'
                : 'rgba(255,255,255,0.04)',
              color:        filters.workMode === mode
                ? '#38BDF8'
                : 'rgba(255,255,255,0.4)',
              transition:   'all 0.15s',
            }}
          >
            {mode}
          </button>
        ))}

        {/* Toggle external jobs */}
        <button
          onClick={() => update({ includeExternal: !filters.includeExternal })}
          style={{
            padding:    '8px 16px',
            borderRadius:'8px',
            fontSize:   '12px',
            cursor:     'pointer',
            border:     filters.includeExternal
              ? '1px solid rgba(16,185,129,0.4)'
              : '1px solid rgba(255,255,255,0.1)',
            background: filters.includeExternal
              ? 'rgba(16,185,129,0.1)'
              : 'rgba(255,255,255,0.04)',
            color:      filters.includeExternal
              ? '#10B981'
              : 'rgba(255,255,255,0.4)',
            transition: 'all 0.15s',
          }}
        >
          ⊕ Google Jobs {filters.includeExternal ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Job grid */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap:                 '1rem',
      }}>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <JobSkeleton key={i} />)
          : data?.jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                activeResumeId={activeResumeId}
              />
            ))}
      </div>

      {/* Empty state */}
      {!isLoading && data?.jobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            No jobs found for your filters
          </p>
          <button
            onClick={() => setFilters({ includeExternal: true, page: 1 })}
            style={{
              marginTop:    '12px',
              padding:      '8px 18px',
              background:   'rgba(56,189,248,0.1)',
              border:       '1px solid rgba(56,189,248,0.2)',
              borderRadius: '8px',
              color:        '#38BDF8',
              fontSize:     '12px',
              cursor:       'pointer',
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
/*

---

## Final File Mapping — Everything Placed Correctly
```
app/
├── _components/
│   ├── dashboards/
│   │   ├── CandidateDashboard.tsx    ← CandidateDashboard from earlier
│   │   └── RecruiterDashboard.tsx    ← RecruiterDashboard from earlier
│   └── profiles/
│       ├── CandidateProfilePage.tsx  ← profile component (not a page route)
│       └── RecruiterProfilePage.tsx
│
├── _providers/
│   └── AuthProvider.tsx              ← existing, no change
│
└── (protected)/
    ├── layout.tsx                    ← auth guard + realtime wiring ← UPDATED
    ├── dashboard/page.tsx            ← role switch ← UPDATED
    ├── jobs/page.tsx                 ← unified feed ← NEW
    ├── profile/page.tsx              ← role switch ← NEW
    ├── resumes/page.tsx              ← existing upload page ← keep as-is
    ├── mock-interview/               ← existing, no change
    ├── recommendations/              ← existing, no change
    └── settings/                     ← existing, no change
    */