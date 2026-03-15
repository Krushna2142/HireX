/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import {
  useRecruiterProfile,
  useUpdateRecruiterProfile,
} from '../../../hooks/userProfile';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — recruiter brand uses pink (#F472B6)
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT  = '#F472B6';
const BG      = '#0B0F1A';
const CARD_BG = '#0F1526';
const BORDER  = 'rgba(255,255,255,0.07)';

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline stats interface — mirrors what the enriched API returns
// Explicit typing here eliminates all (profile as any) casts downstream
// ─────────────────────────────────────────────────────────────────────────────

interface PipelineStats {
  totalJobs:         number;
  totalApplications: number;
  newApplicants:     number;
  shortlisted:       number;
  inInterview:       number;
  offered:           number;
  rejected:          number;
  activeJobs:        number;
  offerRate:         number;
  avgDaysToHire:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Style factories
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

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label:        string;
  values:       string[];
  onChange:     (v: string[]) => void;
  placeholder?: string;
}) {
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
            background:   `${ACCENT}18`,
            border:       `1px solid ${ACCENT}33`,
            borderRadius: '10px',
            color:         ACCENT,
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
              background:   `${ACCENT}15`,
              border:       `1px solid ${ACCENT}33`,
              color:         ACCENT,
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
// PipelineStat card
// ─────────────────────────────────────────────────────────────────────────────

function PipelineStat({
  label,
  value,
  accent,
}: {
  label:  string;
  value:  string | number;
  accent: string;
}) {
  return (
    <div style={{
      background:   'rgba(255,255,255,0.03)',
      border:       `1px solid rgba(255,255,255,0.06)`,
      borderRadius: '10px',
      padding:      '12px 14px',
      textAlign:    'center',
    }}>
      <div style={{
        fontSize:   '22px',
        fontWeight:  700,
        color:       accent,
        fontFamily: 'monospace',
        lineHeight:  1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize:      '10px',
        color:         'rgba(255,255,255,0.3)',
        marginTop:     '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {label}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'company',  label: 'Company'       },
  { id: 'identity', label: 'My Details'    },
  { id: 'hiring',   label: 'Hiring Intent' },
  { id: 'pipeline', label: 'Pipeline'      },
];

const COMPANY_SIZES = [
  { value: '1-10',    label: '1–10'    },
  { value: '11-50',   label: '11–50'   },
  { value: '51-200',  label: '51–200'  },
  { value: '201-500', label: '201–500' },
  { value: '500+',    label: '500+'    },
];

const HIRING_VOLUMES = [
  { value: '1-5',  label: '1–5 / qtr'  },
  { value: '5-20', label: '5–20 / qtr' },
  { value: '20+',  label: '20+ / qtr'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function RecruiterProfilePage() {
  const { data: profile, isLoading }      = useRecruiterProfile();
  const { mutate: update, isPending }     = useUpdateRecruiterProfile();
  const [activeSection, setActiveSection] = useState('company');
  const [form, setForm]                   = useState<Record<string, any>>({});

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
        Loading…
      </div>
    );
  }

  // ── Merge server state with local form state ─────────────────────────────
  // Cast to Record<string,any> so `get()` can index by dynamic string key.
  const p   = { ...profile, ...form } as Record<string, any>;
  const set = (key: string, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));
  const get = (key: string, fallback: any = '') => p[key] ?? fallback;

  const isDirty       = Object.keys(form).length > 0;
  const completionPct = profile?.profileCompletion ?? 0;

  // ── Safe array helpers — guard against undefined optional fields ─────────
  // companyIndustry, hiringRoles, typicalStack are string[] | undefined.
  // Pre-compute as guaranteed string[] to prevent .length / .map errors.
  const companyIndustry: string[] = get('companyIndustry', []) as string[];
  const hiringRoles: string[]     = get('hiringRoles', [])     as string[];
  const typicalStack: string[]    = get('typicalStack', [])    as string[];

  // ── Pipeline stats — typed extraction from enriched API response ─────────
  // Avoids (profile as any) cast at every access site
  const pipeline: PipelineStats | undefined =
    (profile as unknown as { pipeline?: PipelineStats })?.pipeline;

  function handleSave() {
    update(form, { onSuccess: () => setForm({}) });
  }

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background:  BG,
      minHeight:  '100vh',
      padding:    '2rem',
      color:      '#E2E8F0',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0F1526; color: #F1F5F9; }
      `}</style>

      {/* ── Page header ──────────────────────────────────────────────────── */}

      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        marginBottom:   '1.5rem',
        flexWrap:       'wrap',
        gap:            '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 4px' }}>
            Recruiter Profile
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            A complete company profile increases candidate response rates
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize:   '26px',
            fontWeight:  700,
            fontFamily: 'monospace',
            lineHeight:  1,
            color: completionPct >= 80
              ? '#10B981'
              : completionPct >= 50
              ? ACCENT
              : '#F59E0B',
          }}>
            {completionPct}%
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
            Profile complete
          </div>
        </div>
      </div>

      {/* Completion bar */}
      <div style={{
        height:       '4px',
        background:   'rgba(255,255,255,0.06)',
        borderRadius: '99px',
        overflow:     'hidden',
        marginBottom: '1.75rem',
      }}>
        <div style={{
          width:        `${completionPct}%`,
          height:       '100%',
          background:   `linear-gradient(90deg, ${ACCENT}, #EC4899)`,
          borderRadius: '99px',
          transition:   'width 0.6s ease',
        }} />
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

      {/* ── COMPANY ──────────────────────────────────────────────────────── */}

      {activeSection === 'company' && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Company Information</h2>

          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 '1rem',
            marginBottom:        '1rem',
          }}>
            <div>
              <label style={labelStyle}>Company Name</label>
              <input
                value={get('companyName')}
                onChange={e => set('companyName', e.target.value)}
                placeholder="e.g. Razorpay"
                style={input()}
              />
            </div>
            <div>
              <label style={labelStyle}>HQ Location</label>
              <input
                value={get('companyLocation')}
                onChange={e => set('companyLocation', e.target.value)}
                placeholder="e.g. Bangalore, India"
                style={input()}
              />
            </div>
            <div>
              <label style={labelStyle}>Company Website</label>
              <input
                type="url"
                value={get('companyWebsite')}
                onChange={e => set('companyWebsite', e.target.value)}
                placeholder="https://yourcompany.com"
                style={input()}
              />
            </div>
            <div>
              <label style={labelStyle}>Company Logo URL</label>
              <input
                type="url"
                value={get('companyLogoUrl')}
                onChange={e => set('companyLogoUrl', e.target.value)}
                placeholder="https://cdn.company.com/logo.png"
                style={input()}
              />
            </div>
          </div>

          {/* Company size toggle group */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Company Size</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COMPANY_SIZES.map(opt => {
                const selected = get('companySize') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('companySize', opt.value)}
                    style={{
                      padding:      '7px 16px',
                      borderRadius: '8px',
                      fontSize:     '12px',
                      fontWeight:   selected ? 600 : 400,
                      cursor:       'pointer',
                      border:       selected
                        ? `1px solid ${ACCENT}66`
                        : '1px solid rgba(255,255,255,0.1)',
                      background:   selected
                        ? `${ACCENT}18`
                        : 'rgba(255,255,255,0.04)',
                      color:        selected ? ACCENT : 'rgba(255,255,255,0.45)',
                      transition:   'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Company Description</label>
            <textarea
              value={get('companyDescription')}
              onChange={e => set('companyDescription', e.target.value)}
              placeholder="Brief description of what your company builds…"
              rows={4}
              style={input({ resize: 'vertical', lineHeight: '1.6' }) as React.CSSProperties}
            />
          </div>

          {/* ✅ Fixed: pre-computed companyIndustry (never undefined) */}
          <TagInput
            label="Industries"
            values={companyIndustry}
            onChange={v => set('companyIndustry', v)}
            placeholder="e.g. Fintech, SaaS, HealthTech"
          />
        </div>
      )}

      {/* ── IDENTITY ─────────────────────────────────────────────────────── */}

      {activeSection === 'identity' && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>My Details</h2>

          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 '1rem',
          }}>
            <div>
              <label style={labelStyle}>Job Title</label>
              <input
                value={get('title')}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Senior Technical Recruiter"
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
            <div>
              <label style={labelStyle}>LinkedIn URL</label>
              <input
                type="url"
                value={get('linkedinUrl')}
                onChange={e => set('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                style={input()}
              />
            </div>
            <div>
              <label style={labelStyle}>Profile Photo URL</label>
              <input
                type="url"
                value={get('photoUrl')}
                onChange={e => set('photoUrl', e.target.value)}
                placeholder="https://…"
                style={input()}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── HIRING INTENT ────────────────────────────────────────────────── */}

      {activeSection === 'hiring' && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Hiring Intent</h2>

          {/* ✅ Fixed: pre-computed hiringRoles and typicalStack */}
          <TagInput
            label="Roles You Hire For"
            values={hiringRoles}
            onChange={v => set('hiringRoles', v)}
            placeholder="e.g. Frontend Engineer, DevOps Lead"
          />

          <TagInput
            label="Typical Tech Stack"
            values={typicalStack}
            onChange={v => set('typicalStack', v)}
            placeholder="e.g. React, Node.js, PostgreSQL, Docker"
          />

          {/* Hiring volume */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Hiring Volume (per quarter)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {HIRING_VOLUMES.map(opt => {
                const selected = get('hiringVolume') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('hiringVolume', opt.value)}
                    style={{
                      padding:      '8px 18px',
                      borderRadius: '8px',
                      fontSize:     '12px',
                      fontWeight:   selected ? 600 : 400,
                      cursor:       'pointer',
                      border:       selected
                        ? `1px solid ${ACCENT}66`
                        : '1px solid rgba(255,255,255,0.1)',
                      background:   selected
                        ? `${ACCENT}18`
                        : 'rgba(255,255,255,0.04)',
                      color:        selected ? ACCENT : 'rgba(255,255,255,0.45)',
                      transition:   'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remote toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              role="switch"
              aria-checked={get('openToRemote', true)}
              onClick={() => set('openToRemote', !get('openToRemote', true))}
              style={{
                width:        '44px',
                height:       '24px',
                borderRadius: '12px',
                background:   get('openToRemote', true)
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
                left:          get('openToRemote', true) ? '22px' : '3px',
                width:        '18px',
                height:       '18px',
                borderRadius: '50%',
                background:   '#fff',
                transition:   'left 0.2s',
              }} />
            </div>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
              Open to hiring remote candidates
            </span>
          </div>
        </div>
      )}

      {/* ── PIPELINE (read-only live stats) ──────────────────────────────── */}

      {activeSection === 'pipeline' && (
        <>
          {pipeline ? (
            <div>
              {/* Top KPI row */}
              <div style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(4,1fr)',
                gap:                 '10px',
                marginBottom:        '10px',
              }}>
                <PipelineStat
                  label="Active Jobs"
                  value={pipeline.activeJobs ?? 0}
                  accent={ACCENT}
                />
                <PipelineStat
                  label="Total Applications"
                  value={pipeline.totalApplications ?? 0}
                  accent="#38BDF8"
                />
                <PipelineStat
                  label="In Interview"
                  value={pipeline.inInterview ?? 0}
                  accent="#F59E0B"
                />
                <PipelineStat
                  label="Offers Extended"
                  value={pipeline.offered ?? 0}
                  accent="#10B981"
                />
              </div>

              {/* Secondary metrics */}
              <div style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr',
                gap:                 '10px',
              }}>
                <PipelineStat
                  label="Offer Acceptance Rate"
                  value={`${pipeline.offerRate ?? 0}%`}
                  accent="#10B981"
                />
                <PipelineStat
                  label="Avg Days to Hire"
                  value={pipeline.avgDaysToHire != null
                    ? `${pipeline.avgDaysToHire}d`
                    : '—'}
                  accent={ACCENT}
                />
              </div>

              <p style={{
                fontSize:  '11px',
                color:     'rgba(255,255,255,0.2)',
                marginTop: '12px',
                textAlign: 'center',
              }}>
                Pipeline stats update in real-time via Supabase Realtime
              </p>
            </div>
          ) : (
            // Empty state — no jobs posted yet
            <div style={{
              ...cardStyle,
              textAlign: 'center',
              padding:   '3rem',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
                Post your first job to see live pipeline statistics here
              </p>
            </div>
          )}
        </>
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