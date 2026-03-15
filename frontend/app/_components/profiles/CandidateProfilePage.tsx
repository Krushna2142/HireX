/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import {
  useCandidateProfile,
  useUpdateCandidateProfile,
  useProfileCompletion,
} from '../../../hooks/userProfile';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT  = '#38BDF8';
const BG      = '#070B14';
const CARD_BG = '#0D1424';
const BORDER  = 'rgba(255,255,255,0.07)';

// ─────────────────────────────────────────────────────────────────────────────
// Style factories — functions prevent duplicate-property ts(1117)
// ─────────────────────────────────────────────────────────────────────────────

const input = (extra?: React.CSSProperties): React.CSSProperties => ({
  width:        '100%',
  padding:      '10px 14px',
  background:   'rgba(255,255,255,0.05)',
  border:       '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color:        '#F1F5F9',
  fontSize:     '13px',
  outline:      'none',
  transition:   'border-color 0.15s, box-shadow 0.15s',
  ...extra,
});

const labelStyle: React.CSSProperties = {
  display:       'block',
  fontSize:      '11px',
  fontWeight:    600,
  color:         'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom:  '6px',
};

const cardStyle: React.CSSProperties = {
  background:   CARD_BG,
  border:       `1px solid ${BORDER}`,
  borderRadius: '14px',
  padding:      '1.5rem',
  marginBottom: '1rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize:     '14px',
  fontWeight:   600,
  color:        '#F1F5F9',
  margin:       '0 0 1.25rem',
};

// ─────────────────────────────────────────────────────────────────────────────
// TagInput
// ─────────────────────────────────────────────────────────────────────────────

interface TagInputProps {
  label:        string;
  values:       string[];
  onChange:     (v: string[]) => void;
  placeholder?: string;
  accent?:      string;
}

function TagInput({
  label,
  values,
  onChange,
  placeholder,
  accent = ACCENT,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  function add() {
    const val = draft.trim();
    if (val && !values.includes(val)) {
      onChange([...values, val]);
      setDraft('');
    }
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={labelStyle}>{label}</label>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? `Add ${label.toLowerCase()} and press Enter`}
          style={input({ flex: 1 })}
        />
        <button
          type="button"
          onClick={add}
          style={{
            padding:      '10px 16px',
            background:   `${accent}18`,
            border:       `1px solid ${accent}33`,
            borderRadius: '10px',
            color:         accent,
            fontSize:     '12px',
            cursor:       'pointer',
            whiteSpace:   'nowrap',
            fontWeight:    500,
          }}
        >
          Add
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {values.map(v => (
          <span
            key={v}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          '4px',
              padding:      '4px 10px',
              borderRadius: '20px',
              background:   `${accent}15`,
              border:       `1px solid ${accent}33`,
              color:         accent,
              fontSize:     '12px',
            }}
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter(x => x !== v))}
              style={{
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                color:      'inherit',
                fontSize:   '13px',
                lineHeight:  1,
                padding:    '0 0 0 2px',
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ToggleGroup
// ─────────────────────────────────────────────────────────────────────────────

interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleGroupProps {
  options:   ToggleOption[];
  value:     string | string[];
  onChange:  (v: string | string[]) => void;
  multiple?: boolean;
  accent?:   string;
}

function ToggleGroup({
  options,
  value,
  onChange,
  multiple = false,
  accent = ACCENT,
}: ToggleGroupProps) {
  function isSelected(opt: string): boolean {
    return Array.isArray(value) ? value.includes(opt) : value === opt;
  }

  function toggle(opt: string) {
    if (!multiple) {
      onChange(opt);
      return;
    }
    const arr = Array.isArray(value) ? value : [];
    onChange(isSelected(opt) ? arr.filter(v => v !== opt) : [...arr, opt]);
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {options.map(opt => {
        const selected = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            style={{
              padding:      '7px 16px',
              borderRadius: '8px',
              fontSize:     '12px',
              fontWeight:   selected ? 600 : 400,
              cursor:       'pointer',
              border:       selected
                ? `1px solid ${accent}66`
                : '1px solid rgba(255,255,255,0.1)',
              background:   selected
                ? `${accent}18`
                : 'rgba(255,255,255,0.04)',
              color:        selected ? accent : 'rgba(255,255,255,0.45)',
              transition:   'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CompletionRing
// ─────────────────────────────────────────────────────────────────────────────

function CompletionRing({ score }: { score: number }) {
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - score / 100);
  const color = score >= 80
    ? '#10B981'
    : score >= 50
    ? ACCENT
    : '#F59E0B';

  return (
    <div style={{ position: 'relative', width: 72, height: 72 }}>
      <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="5"
        />
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={fill}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{
        position:  'absolute',
        top:       '50%',
        left:      '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <span style={{
          fontSize:   '14px',
          fontWeight:  700,
          color,
          fontFamily: 'monospace',
        }}>
          {score}
        </span>
        <span style={{
          fontSize: '9px',
          color:    'rgba(255,255,255,0.3)',
          display:  'block',
        }}>
          %
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'identity',    label: 'Identity'    },
  { id: 'preferences', label: 'Preferences' },
  { id: 'salary',      label: 'Salary'      },
  { id: 'visibility',  label: 'Visibility'  },
];

const WORK_MODES: ToggleOption[] = [
  { value: 'remote', label: '🌍 Remote' },
  { value: 'hybrid', label: '🏢 Hybrid' },
  { value: 'onsite', label: '📍 On-site' },
  { value: 'any',    label: '✦ Any'     },
];

const EMPLOYMENT_TYPES: ToggleOption[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'contract',  label: 'Contract'  },
  { value: 'part_time', label: 'Part-time' },
  { value: 'freelance', label: 'Freelance' },
];

const AVAILABILITY_OPTIONS: ToggleOption[] = [
  { value: 'immediate',   label: 'Immediate'   },
  { value: '2_weeks',     label: '2 Weeks'     },
  { value: '1_month',     label: '1 Month'     },
  { value: 'not_looking', label: 'Not Looking' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateProfilePage() {
  const { data: profile, isLoading }       = useCandidateProfile();
  const { data: completion }               = useProfileCompletion();
  const { mutate: update, isPending }      = useUpdateCandidateProfile();
  const [activeSection, setActiveSection]  = useState('identity');
  const [form, setForm]                    = useState<Record<string, any>>({});

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
        Loading profile…
      </div>
    );
  }

  // ── Merge server state with local form state ─────────────────────────────
  // Cast to Record<string,any> so `get()` can index by dynamic string key.
  // TypeScript's structural typing rejects string-indexed access on typed
  // interfaces — the cast is intentional and scoped to this pattern only.
  const p   = { ...profile, ...form } as Record<string, any>;
  const set = (key: string, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));
  const get = (key: string, fallback: any = '') => p[key] ?? fallback;

  const isDirty         = Object.keys(form).length > 0;
  const completionScore = completion?.score ?? profile?.profileCompletion ?? 0;

  // ── Safe array helpers — guard against undefined optional fields ─────────
  // profile.topSkills is string[] | undefined per the Prisma schema.
  // Always use nullish coalescing before array operations.
  const topSkills: string[]          = profile?.topSkills ?? [];
  const targetRoles: string[]        = get('targetRoles', []) as string[];
  const targetIndustries: string[]   = get('targetIndustries', []) as string[];
  const employmentTypes: string[]    = get('employmentTypes', []) as string[];
  const preferredLocations: string[] = get('preferredLocations', []) as string[];

  function handleSave() {
    update(form, { onSuccess: () => setForm({}) });
  }

  return (
    <div style={{
      fontFamily: "'Sora', sans-serif",
      background:  BG,
      minHeight:  '100vh',
      padding:    '2rem',
      color:      '#E2E8F0',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0D1424; color: #F1F5F9; }
      `}</style>

      {/* ── Page header ──────────────────────────────────────────────────── */}

      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        marginBottom:   '2rem',
        flexWrap:       'wrap',
        gap:            '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 4px' }}>
            My Profile
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            A complete profile improves your AI job match quality
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
          <CompletionRing score={completionScore} />

          {/* Missing fields nudge */}
          {(completion?.checks ?? []).filter((c: any) => !c.done).length > 0 && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 6px' }}>
                Complete to improve matches:
              </p>
              {(completion?.checks ?? [])
                .filter((c: any) => !c.done)
                .slice(0, 3)
                .map((c: any) => (
                  <div key={c.field} style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         '6px',
                    marginBottom:'3px',
                  }}>
                    <span style={{
                      width:        '5px',
                      height:       '5px',
                      borderRadius: '50%',
                      background:   '#F59E0B',
                      display:      'inline-block',
                      flexShrink:    0,
                    }} />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                      {c.field}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section tabs ─────────────────────────────────────────────────── */}

      <div style={{
        display:      'flex',
        gap:          '4px',
        marginBottom: '1.5rem',
        background:   'rgba(255,255,255,0.04)',
        borderRadius: '10px',
        padding:      '4px',
        width:        'fit-content',
      }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding:      '7px 16px',
              borderRadius: '7px',
              fontSize:     '12px',
              fontWeight:   activeSection === s.id ? 600 : 400,
              cursor:       'pointer',
              border:       'none',
              background:   activeSection === s.id ? ACCENT : 'none',
              color:        activeSection === s.id ? '#fff' : 'rgba(255,255,255,0.4)',
              transition:   'all 0.15s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── IDENTITY ─────────────────────────────────────────────────────── */}

      {activeSection === 'identity' && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Personal Information</h2>

          {/* AI-populated snapshot — only shown when analysis exists */}
          {profile?.currentTitle && (
            <div style={{
              display:      'flex',
              gap:          '10px',
              alignItems:   'flex-start',
              padding:      '12px 14px',
              background:   `${ACCENT}0A`,
              border:       `1px solid ${ACCENT}22`,
              borderRadius: '10px',
              marginBottom: '1.25rem',
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>🤖</span>
              <div>
                <p style={{ fontSize: '12px', color: ACCENT, fontWeight: 600, margin: '0 0 3px' }}>
                  Auto-populated from resume analysis
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  {profile.currentTitle}
                  {profile.currentCompany ? ` at ${profile.currentCompany}` : ''}
                  {profile.experienceLevel ? ` · ${profile.experienceLevel}` : ''}
                  {profile.experienceYears != null ? ` · ${profile.experienceYears}y exp` : ''}
                </p>
              </div>
            </div>
          )}

          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 '1rem',
            marginBottom:        '1rem',
          }}>
            <div>
              <label style={labelStyle}>Headline</label>
              <input
                value={get('headline')}
                onChange={e => set('headline', e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                style={input()}
              />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input
                value={get('location')}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. Pune, Maharashtra"
                style={input()}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                value={get('phone')}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
                style={input()}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Bio / Professional Summary</label>
            <textarea
              value={get('bio')}
              onChange={e => set('bio', e.target.value)}
              placeholder="Brief professional summary shown to recruiters…"
              rows={4}
              style={input({ resize: 'vertical', lineHeight: '1.6' }) as React.CSSProperties}
            />
          </div>

          {/* Skills — read-only, populated from resume analysis */}
          {/* ✅ Fixed: use pre-computed `topSkills` array (never undefined) */}
          {topSkills.length > 0 && (
            <div>
              <label style={labelStyle}>Top Skills — from resume analysis</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {topSkills.map((skill: string) => (
                  <span
                    key={skill}
                    style={{
                      fontSize:     '11px',
                      padding:      '3px 10px',
                      borderRadius: '20px',
                      background:   'rgba(16,185,129,0.1)',
                      border:       '1px solid rgba(16,185,129,0.2)',
                      color:        '#10B981',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
                Updated automatically when you upload a new resume
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── PREFERENCES ──────────────────────────────────────────────────── */}

      {activeSection === 'preferences' && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Job Preferences</h2>

          <TagInput
            label="Target Roles"
            values={targetRoles}
            onChange={v => set('targetRoles', v)}
            placeholder="e.g. Software Engineer, Tech Lead"
          />

          <TagInput
            label="Target Industries"
            values={targetIndustries}
            onChange={v => set('targetIndustries', v)}
            placeholder="e.g. Fintech, SaaS, HealthTech"
          />

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Work Mode Preference</label>
            <ToggleGroup
              options={WORK_MODES}
              value={get('workMode', '')}
              onChange={v => set('workMode', v)}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Employment Types</label>
            <ToggleGroup
              options={EMPLOYMENT_TYPES}
              value={employmentTypes}
              onChange={v => set('employmentTypes', v)}
              multiple
            />
          </div>

          {/* Relocation toggle */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                role="switch"
                aria-checked={get('willingToRelocate', false)}
                onClick={() => set('willingToRelocate', !get('willingToRelocate', false))}
                style={{
                  width:        '44px',
                  height:       '24px',
                  borderRadius: '12px',
                  background:   get('willingToRelocate', false)
                    ? ACCENT
                    : 'rgba(255,255,255,0.12)',
                  position:    'relative',
                  cursor:      'pointer',
                  flexShrink:   0,
                  transition:  'background 0.2s',
                }}
              >
                <div style={{
                  position:     'absolute',
                  top:          '3px',
                  left:          get('willingToRelocate', false) ? '22px' : '3px',
                  width:        '18px',
                  height:       '18px',
                  borderRadius: '50%',
                  background:   '#fff',
                  transition:   'left 0.2s',
                  boxShadow:    '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                Open to relocation
              </span>
            </div>
          </div>

          {get('willingToRelocate', false) && (
            <TagInput
              label="Preferred Locations"
              values={preferredLocations}
              onChange={v => set('preferredLocations', v)}
              placeholder="e.g. Bangalore, Mumbai, Remote"
            />
          )}
        </div>
      )}

      {/* ── SALARY ───────────────────────────────────────────────────────── */}

      {activeSection === 'salary' && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Salary Expectations & Availability</h2>

          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr 140px',
            gap:                 '1rem',
            marginBottom:        '1rem',
          }}>
            <div>
              <label style={labelStyle}>Minimum (annual)</label>
              <input
                type="number"
                value={get('salaryMin') || ''}
                onChange={e => set('salaryMin', parseInt(e.target.value) || null)}
                placeholder="1200000"
                style={input()}
              />
            </div>
            <div>
              <label style={labelStyle}>Maximum (annual)</label>
              <input
                type="number"
                value={get('salaryMax') || ''}
                onChange={e => set('salaryMax', parseInt(e.target.value) || null)}
                placeholder="2000000"
                style={input()}
              />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select
                value={get('salaryCurrency', 'INR')}
                onChange={e => set('salaryCurrency', e.target.value)}
                style={input({ cursor: 'pointer' }) as React.CSSProperties}
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
          </div>

          <label style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '10px',
            cursor:      'pointer',
            marginBottom:'1.5rem',
          }}>
            <input
              type="checkbox"
              checked={get('salaryNegotiable', true)}
              onChange={e => set('salaryNegotiable', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: ACCENT, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
              Salary is negotiable
            </span>
          </label>

          <div>
            <label style={labelStyle}>Availability</label>
            <ToggleGroup
              options={AVAILABILITY_OPTIONS}
              value={get('availability', 'immediate')}
              onChange={v => set('availability', v)}
              accent="#10B981"
            />
          </div>
        </div>
      )}

      {/* ── VISIBILITY ───────────────────────────────────────────────────── */}

      {activeSection === 'visibility' && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Profile Visibility</h2>

          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '1rem 1.25rem',
            background:     get('isVisible', true)
              ? 'rgba(16,185,129,0.06)'
              : 'rgba(255,255,255,0.03)',
            border:         get('isVisible', true)
              ? '1px solid rgba(16,185,129,0.2)'
              : `1px solid ${BORDER}`,
            borderRadius:   '12px',
            gap:            '1rem',
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 4px' }}>
                Visible to Recruiters
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {get('isVisible', true)
                  ? 'Recruiters can discover and view your profile in candidate search'
                  : 'Your profile is hidden — no recruiter can find you currently'}
              </p>
            </div>

            <div
              role="switch"
              aria-checked={get('isVisible', true)}
              onClick={() => set('isVisible', !get('isVisible', true))}
              style={{
                width:        '48px',
                height:       '26px',
                borderRadius: '13px',
                background:   get('isVisible', true)
                  ? '#10B981'
                  : 'rgba(255,255,255,0.12)',
                position:    'relative',
                cursor:      'pointer',
                flexShrink:   0,
                transition:  'background 0.2s',
              }}
            >
              <div style={{
                position:     'absolute',
                top:          '3px',
                left:          get('isVisible', true) ? '25px' : '3px',
                width:        '20px',
                height:       '20px',
                borderRadius: '50%',
                background:   '#fff',
                transition:   'left 0.2s',
                boxShadow:    '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky save bar ───────────────────────────────────────────────── */}

      {isDirty && (
        <div style={{
          position:       'fixed',
          bottom:         '1.5rem',
          right:          '2rem',
          display:        'flex',
          alignItems:     'center',
          gap:            '12px',
          background:     CARD_BG,
          border:         `1px solid ${BORDER}`,
          borderRadius:   '12px',
          padding:        '12px 16px',
          boxShadow:      '0 8px 32px rgba(0,0,0,0.4)',
          zIndex:          100,
          animation:      'slideUp 0.2s ease',
        }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            {Object.keys(form).length} unsaved change
            {Object.keys(form).length > 1 ? 's' : ''}
          </span>

          <button
            onClick={() => setForm({})}
            style={{
              padding:      '8px 14px',
              background:   'none',
              border:       `1px solid ${BORDER}`,
              borderRadius: '8px',
              color:        'rgba(255,255,255,0.4)',
              fontSize:     '12px',
              cursor:       'pointer',
            }}
          >
            Discard
          </button>

          <button
            onClick={handleSave}
            disabled={isPending}
            style={{
              padding:      '8px 20px',
              background:   `linear-gradient(135deg, ${ACCENT}cc, ${ACCENT})`,
              border:       'none',
              borderRadius: '8px',
              color:        '#fff',
              fontSize:     '12px',
              fontWeight:    600,
              cursor:        isPending ? 'not-allowed' : 'pointer',
              opacity:       isPending ? 0.6 : 1,
              transition:   'opacity 0.15s',
            }}
          >
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}