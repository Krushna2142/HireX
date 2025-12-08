/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { apiForm } from '@/lib/api/client';

type AnalysisResult = {
  fileName: string;
  wordCount: number;
  entities: { organizations: string[]; locations: string[]; people: string[] };
  sections: { label: string; text: string }[];
  skillsCategorized: Record<string, string[]>;
  skills: string[];
  roleRecommendations: { role: string; match: number; rationale: string; resources: { title: string; url: string; type: string }[] }[];
  missingSkills: string[];
  preview: string;
};

export default function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [userId, setUserId] = useState('guest');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) { setError('Please select a PDF'); return; }
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported'); return;
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('userId', userId);

    setLoading(true);
    try {
      const data = await apiForm<AnalysisResult>('/api/analyze/resume', fd);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId" className="border p-2" />
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>

      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Summary</h3>
          <p><b>File:</b> {result.fileName}</p>
          <p><b>Words:</b> {result.wordCount}</p>
          <p><b>Preview:</b> {result.preview}</p>

          <h4 className="font-semibold">Sections</h4>
          <ul className="list-disc pl-5">
            {result.sections.map((s, i) => (
              <li key={i}><b>{s.label}</b>: {s.text}</li>
            ))}
          </ul>

          <h4 className="font-semibold">Skills</h4>
          <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(result.skillsCategorized, null, 2)}</pre>

          <h4 className="font-semibold">Role Recommendations</h4>
          <ul className="list-disc pl-5">
            {result.roleRecommendations.map((r, i) => (
              <li key={i}>
                <b>{r.role}</b> — {r.match}% — {r.rationale}
                <ul className="list-disc pl-5">
                  {r.resources.map((res, j) => (
                    <li key={j}><a href={res.url} target="_blank" rel="noreferrer">{res.title}</a> ({res.type})</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {result.missingSkills?.length ? (
            <>
              <h4 className="font-semibold">Missing Skills</h4>
              <ul className="list-disc pl-5">
                {result.missingSkills.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}