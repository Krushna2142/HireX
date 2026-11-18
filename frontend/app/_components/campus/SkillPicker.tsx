'use client';
import { useMemo, useState } from 'react';
import { C, inputStyle, labelStyle, primaryBtn } from './kit';

const CATALOG: Record<string, string[]> = {
  'Frontend / UI': [
    'javascript', 'typescript', 'react', 'next.js', 'html', 'css', 'tailwind css',
    'redux', 'zustand', 'framer motion', 'material ui', 'shadcn ui',
    'responsive design', 'web accessibility',
  ],
  'Backend / APIs': [
    'node.js', 'express.js', 'nestjs', 'java', 'spring boot', 'python', 'fastapi',
    'django', 'rest api', 'graphql', 'websocket', 'microservices',
    'authentication', 'jwt', 'oauth',
  ],
  'Databases / Storage': [
    'postgresql', 'mysql', 'mongodb', 'redis', 'supabase', 'firebase', 'prisma',
    'sql', 'database design', 'query optimization', 'database indexing',
  ],
  'Cloud / DevOps': [
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd', 'linux', 'git',
    'github actions', 'terraform', 'nginx',
  ],
  'AI / ML / Data': [
    'machine learning', 'deep learning', 'nlp', 'llm', 'rag', 'pytorch',
    'tensorflow', 'scikit-learn', 'pandas', 'numpy', 'data analysis', 'power bi',
  ],
  'Core CS': [
    'data structures', 'algorithms', 'oop', 'operating systems', 'dbms',
    'computer networks', 'system design',
  ],
  'Mobile': ['android', 'ios', 'flutter', 'react native', 'kotlin', 'swift'],
  'Testing / Tools': ['jest', 'cypress', 'selenium', 'postman', 'jira', 'agile'],
};

const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export default function SkillPicker({
  value, onChange, required = true,
}: { value: string[]; onChange: (next: string[]) => void; required?: boolean }) {
  const [custom, setCustom] = useState('');
  const selected = useMemo(() => new Set(value.map(norm)), [value]);

  const add = (raw: string) => {
    const s = norm(raw);
    if (!s || selected.has(s)) return;
    onChange([...value, s]);
  };
  const remove = (s: string) => onChange(value.filter((x) => norm(x) !== norm(s)));
  const addCustom = () => { add(custom); setCustom(''); };

  const chip = {
    border: `1px solid ${C.border}`, background: 'rgba(15,23,42,0.72)', color: C.muted,
    borderRadius: 999, padding: '6px 12px', fontSize: 11.5, fontWeight: 800,
    cursor: 'pointer', fontFamily: "'Sora', sans-serif",
  } as const;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <span style={labelStyle}>Required skills{required ? ' *' : ''}</span>

      {/* Selected */}
      <div style={{ ...inputStyle, minHeight: 46, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {value.length === 0 ? (
          <span style={{ color: C.faint }}>No skills selected yet.</span>
        ) : value.map((s) => (
          <button key={s} type="button" onClick={() => remove(s)} title="Remove"
            style={{ ...chip, color: C.purple, borderColor: C.borderStrong, background: 'rgba(167,139,250,0.14)' }}>
            {cap(s)} ✕
          </button>
        ))}
      </div>

      {/* Catalogue */}
      <div style={{
        border: `1px solid ${C.border}`, borderRadius: 14, padding: 14,
        maxHeight: 300, overflowY: 'auto', display: 'grid', gap: 14, background: 'rgba(8,12,20,0.6)',
      }}>
        {Object.entries(CATALOG).map(([group, skills]) => (
          <div key={group} style={{ display: 'grid', gap: 8 }}>
            <span style={{ color: C.purple, fontSize: 11, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {group}
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {skills.map((s) => {
                const on = selected.has(s);
                return (
                  <button key={s} type="button" disabled={on} onClick={() => add(s)}
                    style={{ ...chip, opacity: on ? 0.35 : 1, cursor: on ? 'default' : 'pointer' }}>
                    {on ? '✓' : '+'} {cap(s)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Custom */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Add custom IT skill"
          style={inputStyle}
        />
        <button type="button" onClick={addCustom} style={{ ...primaryBtn, padding: '10px 22px' }}>Add</button>
      </div>
    </div>
  );
}