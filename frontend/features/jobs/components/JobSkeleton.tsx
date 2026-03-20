export function JobSkeleton() {
  return (
    <div style={{
      background: '#0D1424',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '14px',
      padding: '1.25rem',
    }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .sk {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 800px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 6px;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div>
          <div className="sk" style={{ width: '180px', height: '14px', marginBottom: '8px' }} />
          <div className="sk" style={{ width: '120px', height: '12px' }} />
        </div>
        <div className="sk" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {[60, 80, 90].map(w => (
          <div key={w} className="sk" style={{ width: `${w}px`, height: '22px' }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '5px', marginBottom: '12px' }}>
        {[50, 65, 55].map(w => (
          <div key={w} className="sk" style={{ width: `${w}px`, height: '20px' }} />
        ))}
      </div>

      <div className="sk" style={{ width: '100%', height: '12px', marginBottom: '6px' }} />
      <div className="sk" style={{ width: '80%', height: '12px' }} />
    </div>
  );
}


/*
Backend:
├── src/jobs/jobs.service.ts        ← SerpAPI integration, unified feed, match scoring
├── src/jobs/jobs.controller.ts     ← @Public() on GET /jobs, userId passed if authenticated
└── src/jobs/jobs.module.ts         ← HttpModule registered for SerpAPI HTTP calls

Frontend:
├── features/jobs/types/index.ts    ← UnifiedJob, JobSource, Application, RecruiterJob types
├── features/jobs/api/jobsApi.ts    ← Full API layer for both candidate + recruiter
├── features/jobs/hooks/useJobs.ts  ← TanStack Query hooks for all job operations
├── features/jobs/components/
│   ├── JobCard.tsx                 ← Source-aware card (internal vs SerpAPI)
│   └── JobSkeleton.tsx             ← Loading skeleton
*/
