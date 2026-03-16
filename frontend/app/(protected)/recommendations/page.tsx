// frontend/app/(protected)/recommendations/page.tsx
'use client';

import { useEffect, useState } from 'react';
import JobRecommendations from '@/components/recommendations/JobRecommendations';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function checkHasAnalysis(): Promise<boolean> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  try {
    const res = await fetch(`${API}/resumes/latest`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return false;
    const resume = await res.json();
    return resume?.status === 'analyzed';
  } catch {
    return false;
  }
}

export default function RecommendationsPage() {
  const [hasAnalysis, setHasAnalysis] = useState<boolean | null>(null);

  useEffect(() => {
    checkHasAnalysis().then(setHasAnalysis);
  }, []);

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="section-header mb-8">
        <h1 className="text-3xl font-bold">Recommendations</h1>
        <p className="text-[var(--text-muted)] mt-1 text-sm">
          Jobs matched to your skills and experience from your resume analysis
        </p>
      </div>

      {/* Gate: no analysis yet */}
      {hasAnalysis === false && (
        <div className="card p-6 mb-8 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-xl mt-0.5">⚠</span>
            <div>
              <p className="font-semibold text-amber-400 text-sm">No resume analysis found</p>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                Upload and analyse your resume from the sidebar to get personalised job recommendations.
              </p>
              <a href="/resumes" className="btn btn-secondary mt-3 inline-block text-xs">
                Go to Resume →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations grid */}
      {hasAnalysis !== false && (
        <JobRecommendations layout="grid" />
      )}
    </section>
  );
}