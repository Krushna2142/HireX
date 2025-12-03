'use client';

import { useMemo, useState } from 'react';
import { RecommendationCard } from '../../components/recommendations/RecommendationCard';

export default function RecommendationsPage() {
  const [query, setQuery] = useState('');
  const mockData = [
    { id: '1', title: 'Senior Data Engineer', score: 87, subtitle: 'High overlap: Python, ETL' },
    { id: '2', title: 'ML Platform Engineer', score: 81, subtitle: 'Skills: Kubernetes, Model Ops' },
    { id: '3', title: 'Recommendation Systems Engineer', score: 77, subtitle: 'Semantic: vector search' },
  ];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockData;
    return mockData.filter((r) => r.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <main className="page-gradient mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Recommendations</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Personalized roles ranked by skill + semantic fit.</p>

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
          <RecommendationCard key={r.id} title={r.title} score={`${r.score}%`} subtitle={r.subtitle} />
        ))}
      </div>
    </main>
  );
}