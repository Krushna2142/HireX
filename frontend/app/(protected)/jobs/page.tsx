'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useJobFeed } from '@/features/jobs/hooks/useJobs';
import { JobCard } from '@/features/jobs/components/JobCard';
import { JobSkeleton } from '@/features/jobs/components/JobSkeleton';
import { useCandidateProfile } from '@/hooks/userProfile';
import { JobFilters } from '@/features/jobs/types/Index';
import { useQueryClient } from '@tanstack/react-query';
import { JOB_KEYS } from '@/features/jobs/hooks/useJobs';

// ── Refresh status bar ────────────────────────────────────────────────────────
// Shows "Refreshing…" during background fetches, "Updated HH:MM:SS" otherwise.
// Sits in the header row without disrupting the layout.

function RefreshStatus({
  isFetching,
  updatedAt,
  onRefresh,
}: {
  isFetching: boolean;
  updatedAt:  number;   // timestamp ms from dataUpdatedAt
  onRefresh:  () => void;
}) {
  const time = updatedAt
    ? new Intl.DateTimeFormat('en', {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(updatedAt))
    : null;

  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        '10px',
      fontSize:   '12px',
      color:      'rgba(255,255,255,0.3)',
      fontFamily: 'monospace',
    }}>
      {isFetching ? (
        <>
          <span style={{
            width:      '7px',
            height:     '7px',
            borderRadius: '50%',
            background: '#38BDF8',
            display:    'inline-block',
            animation:  'jc-pulse 1s ease infinite',
          }} />
          Refreshing…
        </>
      ) : time ? (
        `Updated ${time}`
      ) : null}

      <button
        onClick={onRefresh}
        disabled={isFetching}
        title="Refresh jobs now"
        style={{
          padding:      '4px 10px',
          borderRadius: '6px',
          fontSize:     '11px',
          cursor:       isFetching ? 'not-allowed' : 'pointer',
          background:   'rgba(255,255,255,0.04)',
          border:       '1px solid rgba(255,255,255,0.09)',
          color:        isFetching ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)',
          transition:   'all 0.15s',
        }}
      >
        ↻ Refresh
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const { user }    = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<JobFilters>({
    includeExternal: true,
    page: 1,
  });

  // isFetching = true during both initial load AND background refreshes.
  // isLoading  = true only on initial load (no cached data yet).
  // dataUpdatedAt = timestamp of the last successful fetch.
  const {
    data,
    isLoading,
    isFetching,
    dataUpdatedAt,
  } = useJobFeed(filters);

  const { data: profile } = useCandidateProfile();
  const activeResumeId = user?.role === 'candidate'
    ? profile?.activeResumeId ?? undefined
    : undefined;

  function update(patch: Partial<JobFilters>) {
    setFilters(prev => ({ ...prev, ...patch, page: 1 }));
  }

  function handleManualRefresh() {
    void queryClient.invalidateQueries({ queryKey: JOB_KEYS.all });
  }

  return (
    <div style={{
      fontFamily: "'Sora', sans-serif",
      background: '#070B14',
      minHeight:  '100vh',
      padding:    '2rem',
      color:      '#E2E8F0',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');
        @keyframes jc-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        marginBottom:   '1.5rem',
        flexWrap:       'wrap',
        gap:            '0.75rem',
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 4px' }}>
            Job Feed
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            {data?.sources
              ? `${data.sources.internal} platform · ${data.sources.external} from Google Jobs · refreshes every 60s`
              : 'Loading jobs…'}
          </p>
        </div>

        {/* ✅ Only shows during background fetches — never on initial skeleton load */}
        {!isLoading && (
          <RefreshStatus
            isFetching={isFetching}
            updatedAt={dataUpdatedAt}
            onRefresh={handleManualRefresh}
          />
        )}
      </div>

      {/* ── Filters — unchanged ────────────────────────────────────────────── */}
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

        <button
          onClick={() => update({ includeExternal: !filters.includeExternal })}
          style={{
            padding:      '8px 16px',
            borderRadius: '8px',
            fontSize:     '12px',
            cursor:       'pointer',
            border:       filters.includeExternal
              ? '1px solid rgba(16,185,129,0.4)'
              : '1px solid rgba(255,255,255,0.1)',
            background:   filters.includeExternal
              ? 'rgba(16,185,129,0.1)'
              : 'rgba(255,255,255,0.04)',
            color:        filters.includeExternal
              ? '#10B981'
              : 'rgba(255,255,255,0.4)',
            transition:   'all 0.15s',
          }}
        >
          ⊕ Google Jobs {filters.includeExternal ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* ── Job grid ───────────────────────────────────────────────────────── */}
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

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
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