/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useHistory } from '@/features/resume/hooks/useHistory';
import { getRecommendations } from '@/features/resume/hooks/useRecommendations';

export default function RecommendationsPage() {
  const [pageId, setPageId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('pageId');
    setPageId(id ? Number(id) : null);
  }, []);

  const { data: items, isLoading, error } = useHistory('guest', 100);
  const selected = useMemo(() => {
    if (!items || pageId == null) return null;
    return items.find((i) => i.id === pageId) || null;
  }, [items, pageId]);

  const recommendations = useMemo(() => {
    return selected ? getRecommendations(selected.result) : [];
  }, [selected]);

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Recommendations</h1>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-600">{(error as any).message}</p>}

      {!selected && !isLoading && <p>Select an item from the Dashboard.</p>}

      {selected && (
        <>
          <div className="border rounded p-4">
            <p><b>File:</b> {selected.fileName}</p>
            <p className="text-sm text-gray-600"><b>Date:</b> {new Date(selected.createdAt).toLocaleString()}</p>
          </div>

          {recommendations.length === 0 ? (
            <p>No recommendations found.</p>
          ) : (
            <ul className="space-y-4">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="border rounded p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{rec.role}</h3>
                    <span className="text-sm">Match: {rec.match}%</span>
                  </div>
                  <p className="text-sm text-gray-700">{rec.rationale}</p>
                  <div>
                    <h4 className="font-semibold">Resources</h4>
                    <ul className="list-disc pl-5">
                      {rec.resources.map((r, j) => (
                        <li key={j}>
                          <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> <span className="text-xs text-gray-600">({r.type})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}