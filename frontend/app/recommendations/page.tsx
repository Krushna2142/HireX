'use client';

import { useMemo, useState } from 'react';
import { RecommendationCard } from '../../components/recommendations/RecommendationCard';

type Recommendation = {
  id: string;
  title: string;
  score: number;
  subtitle?: string;
};

const mockData: Recommendation[] = [
  { id: '1', title: 'Senior Data Engineer', score: 87, subtitle: 'High overlap: Python, ETL' },
  { id: '2', title: 'ML Platform Engineer', score: 81, subtitle: 'Skills: Kubernetes, Model Ops' },
  { id: '3', title: 'Recommendation Systems Engineer', score: 77, subtitle: 'Semantic: vector search' }
];

export default function RecommendationsPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockData;
    return mockData.filter((r) => r.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Recommendations</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Personalized roles ranked by skill + semantic fit.
      </p>

      <div className="mt-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recommendations…"
          className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <RecommendationCard
            key={r.id}
            title={r.title}
            score={`${r.score}%`}
            subtitle={r.subtitle}
          />
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-card-foreground">How scoring works (placeholder)</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-muted-foreground">
          <li>Skill vector overlap (hard + soft)</li>
          <li>Semantic transformer similarity</li>
          <li>Recent activity weighting</li>
          <li>Resume gap penalty</li>
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-card-foreground">Improve Your Match</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your resume and fill missing skill tags to boost recommendation accuracy.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href="/resume"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Upload Resume
          </a>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
          >
            Go to Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}