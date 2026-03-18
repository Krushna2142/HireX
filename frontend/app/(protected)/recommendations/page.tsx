// frontend/app/(protected)/recommendations/page.tsx
'use client';

import JobRecommendations from '@/components/recommendations/JobRecommendations';
import { useLatestResume } from '@/hooks/useRealTimeAlerts';

export default function RecommendationsPage() {
  // ✅ Real-time — polls every 10s, shows analysis state live
  const { resume, loading } = useLatestResume();

  const hasAnalysis = resume?.status === 'analyzed';

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      <div className="section-header mb-8">
        <h1 className="text-3xl font-bold">Recommendations</h1>
        <p className="text-[var(--text-muted)] mt-1 text-sm">
          Jobs matched to your skills and experience · refreshes every 60s
        </p>
      </div>

      {!loading && resume?.status === 'processing' && (
        <div className="card p-6 mb-8 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-3">
            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(96,165,250,0.3)', borderTopColor: '#60A5FA', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p className="text-blue-400 text-sm font-medium">
              Analysing your resume — recommendations will appear here automatically once complete
            </p>
          </div>
        </div>
      )}

      {!loading && !resume && (
        <div className="card p-6 mb-8 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-xl mt-0.5">⚠</span>
            <div>
              <p className="font-semibold text-amber-400 text-sm">No resume found</p>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                Upload and analyse your resume to get personalised job recommendations.
              </p>
              <a href="/resumes" className="btn btn-secondary mt-3 inline-block text-xs">Go to Resume →</a>
            </div>
          </div>
        </div>
      )}

      {!loading && resume && !hasAnalysis && resume.status !== 'processing' && (
        <div className="card p-6 mb-8 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-xl mt-0.5">⚠</span>
            <div>
              <p className="font-semibold text-amber-400 text-sm">Resume not yet analysed</p>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                Click <strong>Analyse Resume</strong> in the sidebar to get personalised matches.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Show recommendations if analysed — JobRecommendations polls live on its own */}
      {hasAnalysis && <JobRecommendations layout="grid" />}
    </section>
  );
}