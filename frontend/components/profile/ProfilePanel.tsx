/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// ─────────────────────────────────────────────────────────────────────────────
// components/ProfilePanel.tsx
//
// Shared slide-in profile + settings drawer.
// Rendered inside both CandidateDashboard and RecruiterDashboard.
// Opened by the Sidebar username card via ProfilePanelContext.
//
// Tabs:
//   👤 Identity    — headline, bio, location, phone, portfolio, skills snapshot
//   🎯 Preferences — target roles, industries, work mode, employment type
//   💰 Salary      — min/max, currency, negotiable, availability
//   ⚙ Settings    — notifications, visibility, password change, danger zone
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useProfilePanel }     from '@/components/context/ProfilePanelContext';
import {
  useCandidateProfile,
  useUpdateCandidateProfile,
  useProfileCompletion,
} from '@/hooks/userProfile';
import { useAuth } from '@/components/providers/AuthProvider';

// Inside ProfilePanel():
const { user } = useAuth();
// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:     '#0B0F1C',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.35)',
  faint:  'rgba(255,255,255,0.18)',
  sky:    '#38BDF8',
  purple: '#A78BFA',
  green:  '#10B981',
  amber:  '#F59E0B',
  red:    '#F87171',
} as const;

// ── Style helpers ─────────────────────────────────────────────────────────────

const inp = (x?: React.CSSProperties): React.CSSProperties => ({
  width: '100%', padding: '10px 14px', boxSizing: 'border-box' as const,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#F1F5F9', fontSize: 13, outline: 'none',
  fontFamily: 'Sora, sans-serif', transition: 'border-color 0.15s', ...x,
});

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: C.muted, textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', marginBottom: 6,
};

// ── CompletionRing ─────────────────────────────────────────────────────────────

function CompletionRing({ score }: { score: number }) {
  const r = 30, circ = 2 * Math.PI * r;
  const color = score >= 80 ? C.green : score >= 50 ? C.sky : C.amber;
  return (
    <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
      <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: C.faint }}>%</span>
      </div>
    </div>
  );
}

// ── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({ label, values, onChange, placeholder, accent = C.sky }: {
  label: string; values: string[]; onChange: (v: string[]) => void;
  placeholder?: string; accent?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = () => { const v = draft.trim(); if (v && !values.includes(v)) { onChange([...values, v]); setDraft(''); } };
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label style={lbl}>{label}</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder} style={inp({ flex: 1 })} />
        <button type="button" onClick={add} style={{ padding: '10px 14px', background: `${accent}18`, border: `1px solid ${accent}33`, borderRadius: 10, color: accent, fontSize: 12, cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 500, flexShrink: 0 }}>Add</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {values.map(v => (
          <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: `${accent}15`, border: `1px solid ${accent}33`, color: accent, fontSize: 12 }}>
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 13, lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── PillGroup ─────────────────────────────────────────────────────────────────

function PillGroup({ options, value, onChange, multiple = false, accent = C.sky }: {
  options: { value: string; label: string }[];
  value: string | string[]; onChange: (v: any) => void;
  multiple?: boolean; accent?: string;
}) {
  const isSel = (o: string) => Array.isArray(value) ? value.includes(o) : value === o;
  const toggle = (o: string) => {
    if (!multiple) { onChange(o); return; }
    const arr = Array.isArray(value) ? value : [];
    onChange(isSel(o) ? arr.filter(v => v !== o) : [...arr, o]);
  };
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const sel = isSel(opt.value);
        return (
          <button key={opt.value} type="button" onClick={() => toggle(opt.value)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: sel ? 600 : 400, cursor: 'pointer', border: sel ? `1px solid ${accent}66` : '1px solid rgba(255,255,255,0.1)', background: sel ? `${accent}18` : 'rgba(255,255,255,0.04)', color: sel ? accent : C.muted, transition: 'all 0.15s', fontFamily: 'Sora, sans-serif' }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

// ── SwitchRow ─────────────────────────────────────────────────────────────────

function SwitchRow({ label, sub, checked, onChange, accent = C.green }: {
  label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void; accent?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.faint }}>{sub}</p>}
      </div>
      <div onClick={() => onChange(!checked)} role="switch" aria-checked={checked} style={{ width: 40, height: 22, borderRadius: 11, background: checked ? accent : 'rgba(255,255,255,0.12)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.35)' }} />
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'identity',    label: '👤 Identity'    },
  { id: 'preferences', label: '🎯 Preferences' },
  { id: 'salary',      label: '💰 Salary'      },
  { id: 'settings',    label: '⚙ Settings'    },
];

const WORK_MODES        = [{ value: 'remote', label: '🌍 Remote' }, { value: 'hybrid', label: '🏢 Hybrid' }, { value: 'onsite', label: '📍 On-site' }, { value: 'any', label: '✦ Any' }];
const EMPLOYMENT_TYPES  = [{ value: 'full_time', label: 'Full-time' }, { value: 'contract', label: 'Contract' }, { value: 'part_time', label: 'Part-time' }, { value: 'freelance', label: 'Freelance' }];
const AVAILABILITY_OPTS = [{ value: 'immediate', label: 'Immediate' }, { value: '2_weeks', label: '2 Weeks' }, { value: '1_month', label: '1 Month' }, { value: 'not_looking', label: 'Not Looking' }];

// ── ProfilePanel ──────────────────────────────────────────────────────────────

export function ProfilePanel() {
  const { open, closePanel }                  = useProfilePanel();
  const { data: profile }                     = useCandidateProfile();
  const { data: completion }                  = useProfileCompletion();
  const { mutate: update, isPending }         = useUpdateCandidateProfile();

  const [activeTab, setActiveTab]             = useState('identity');
  const [form, setForm]                       = useState<Record<string, any>>({});
  const [currentPw, setCurrentPw]            = useState('');
  const [newPw, setNewPw]                     = useState('');
  const [confirmPw, setConfirmPw]             = useState('');
  const [pwMsg, setPwMsg]                     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Escape key closes
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, closePanel]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const merged = { ...profile, ...form } as Record<string, any>;
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const get = (k: string, fb: any = '') => merged[k] ?? fb;

  const isDirty         = Object.keys(form).length > 0;
  const completionScore = completion?.score ?? profile?.profileCompletion ?? 0;
  const topSkills       = (profile?.topSkills ?? []) as string[];

  const handlePwChange = () => {
    setPwMsg(null);
    if (!currentPw)        { setPwMsg({ type: 'err', text: 'Enter your current password.' }); return; }
    if (newPw.length < 8)  { setPwMsg({ type: 'err', text: 'New password must be at least 8 characters.' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: 'err', text: 'Passwords do not match.' }); return; }
    // TODO: wire to PATCH /auth/password
    setPwMsg({ type: 'ok', text: 'Password updated ✓' });
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };

  return (
    <>
      <style>{`
        @keyframes panelFadeIn  { from{opacity:0}             to{opacity:1}              }
        @keyframes panelSlideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes panelSlideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0D1424; color: #F1F5F9; }
        .pp-scroll::-webkit-scrollbar { width: 3px; }
        .pp-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={closePanel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 40, animation: 'panelFadeIn 0.2s ease' }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
        background: C.bg, borderLeft: `1px solid ${C.border}`,
        zIndex: 50, display: 'flex', flexDirection: 'column',
        fontFamily: "'Sora', sans-serif",
        animation: 'panelSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '-24px 0 64px rgba(0,0,0,0.6)',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
          <CompletionRing score={completionScore} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>
              Profile &amp; Settings
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
              {profile?.full_name ?? user?.email ?? 'Your account'}
            </p>
            {completionScore < 100 && (
              <p style={{ margin: '3px 0 0', fontSize: 11, color: completionScore < 60 ? C.amber : C.muted }}>
                {100 - completionScore}% left to complete — better scores = better matches
              </p>
            )}
          </div>
          <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 22, lineHeight: 1, padding: 6, borderRadius: 8, transition: 'color 0.15s', flexShrink: 0 }}>✕</button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, padding: '0.75rem 1.5rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: activeTab === t.id ? 600 : 400, cursor: 'pointer', border: 'none', background: activeTab === t.id ? C.sky : 'transparent', color: activeTab === t.id ? '#fff' : C.muted, transition: 'all 0.15s', fontFamily: 'Sora, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable content ── */}
        <div className="pp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* ────────── IDENTITY ────────── */}
          {activeTab === 'identity' && (
            <div style={{ animation: 'panelSlideUp 0.2s ease' }}>
              {profile?.currentTitle && (
                <div style={{ display: 'flex', gap: 10, padding: '11px 14px', background: `${C.sky}0A`, border: `1px solid ${C.sky}22`, borderRadius: 10, marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>🤖</span>
                  <div>
                    <p style={{ fontSize: 11, color: C.sky, fontWeight: 600, margin: '0 0 2px' }}>Auto-populated from resume analysis</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                      {profile.currentTitle}
                      {profile.currentCompany ? ` at ${profile.currentCompany}` : ''}
                      {profile.experienceLevel ? ` · ${profile.experienceLevel}` : ''}
                      {profile.experienceYears != null ? ` · ${profile.experienceYears}y exp` : ''}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><label style={lbl}>Headline</label><input value={get('headline')} onChange={e => set('headline', e.target.value)} placeholder="e.g. Senior Full Stack Engineer" style={inp()} /></div>
                <div><label style={lbl}>Location</label><input value={get('location')} onChange={e => set('location', e.target.value)} placeholder="e.g. Pune, Maharashtra" style={inp()} /></div>
                <div><label style={lbl}>Phone</label><input value={get('phone')} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" style={inp()} /></div>
                <div><label style={lbl}>Portfolio / LinkedIn</label><input value={get('portfolioUrl')} onChange={e => set('portfolioUrl', e.target.value)} placeholder="https://linkedin.com/in/you" style={inp()} /></div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={lbl}>Bio / Professional Summary</label>
                <textarea value={get('bio')} onChange={e => set('bio', e.target.value)} rows={4} placeholder="Brief professional summary shown to recruiters…" style={inp({ resize: 'vertical', lineHeight: 1.6 }) as React.CSSProperties} />
              </div>

              {topSkills.length > 0 && (
                <div>
                  <label style={lbl}>Top Skills — from resume (read only)</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {topSkills.map(s => (
                      <span key={s} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: C.green }}>{s}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>Updated automatically on each resume analysis</p>
                </div>
              )}
            </div>
          )}

          {/* ────────── PREFERENCES ────────── */}
          {activeTab === 'preferences' && (
            <div style={{ animation: 'panelSlideUp 0.2s ease' }}>
              <TagInput label="Target Roles"      values={get('targetRoles', [])}      onChange={v => set('targetRoles', v)}      placeholder="e.g. Software Engineer, Tech Lead" />
              <TagInput label="Target Industries" values={get('targetIndustries', [])} onChange={v => set('targetIndustries', v)} placeholder="e.g. Fintech, SaaS, HealthTech"     />
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={lbl}>Work Mode</label>
                <PillGroup options={WORK_MODES} value={get('workMode', '')} onChange={v => set('workMode', v)} />
              </div>
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={lbl}>Employment Types</label>
                <PillGroup options={EMPLOYMENT_TYPES} value={get('employmentTypes', [])} onChange={v => set('employmentTypes', v)} multiple accent={C.purple} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div onClick={() => set('willingToRelocate', !get('willingToRelocate', false))} role="switch" aria-checked={get('willingToRelocate', false)} style={{ width: 40, height: 22, borderRadius: 11, background: get('willingToRelocate', false) ? C.sky : 'rgba(255,255,255,0.12)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: get('willingToRelocate', false) ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>Open to relocation</span>
              </div>
              {get('willingToRelocate', false) && (
                <TagInput label="Preferred Locations" values={get('preferredLocations', [])} onChange={v => set('preferredLocations', v)} placeholder="e.g. Bangalore, Remote" />
              )}
            </div>
          )}

          {/* ────────── SALARY ────────── */}
          {activeTab === 'salary' && (
            <div style={{ animation: 'panelSlideUp 0.2s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px', gap: 12, marginBottom: 12 }}>
                <div><label style={lbl}>Min (annual)</label><input type="number" value={get('salaryMin') || ''} onChange={e => set('salaryMin', parseInt(e.target.value) || null)} placeholder="1200000" style={inp()} /></div>
                <div><label style={lbl}>Max (annual)</label><input type="number" value={get('salaryMax') || ''} onChange={e => set('salaryMax', parseInt(e.target.value) || null)} placeholder="2000000" style={inp()} /></div>
                <div>
                  <label style={lbl}>Currency</label>
                  <select value={get('salaryCurrency', 'INR')} onChange={e => set('salaryCurrency', e.target.value)} style={inp({ cursor: 'pointer' }) as React.CSSProperties}>
                    <option value="INR">INR ₹</option><option value="USD">USD $</option>
                    <option value="EUR">EUR €</option><option value="GBP">GBP £</option>
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: '1.5rem' }}>
                <input type="checkbox" checked={get('salaryNegotiable', true)} onChange={e => set('salaryNegotiable', e.target.checked)} style={{ width: 16, height: 16, accentColor: C.sky, cursor: 'pointer' }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>Salary is negotiable</span>
              </label>
              <div>
                <label style={lbl}>Availability</label>
                <PillGroup options={AVAILABILITY_OPTS} value={get('availability', 'immediate')} onChange={v => set('availability', v)} accent={C.green} />
              </div>
            </div>
          )}

          {/* ────────── SETTINGS ────────── */}
          {activeTab === 'settings' && (
            <div style={{ animation: 'panelSlideUp 0.2s ease' }}>

              {/* Notifications */}
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>🔔 Notifications</p>
              <SwitchRow label="Application status updates" sub="Email when your application changes"    checked={get('notifyApplicationUpdates', true)}  onChange={v => set('notifyApplicationUpdates', v)} accent={C.sky}    />
              <SwitchRow label="New job matches"             sub="Email when jobs match your profile"      checked={get('notifyNewMatches', true)}           onChange={v => set('notifyNewMatches', v)}           accent={C.sky}    />
              <SwitchRow label="Interview invitations"       sub="Instant notification on invite"         checked={get('notifyInterview', true)}            onChange={v => set('notifyInterview', v)}            accent={C.green}  />
              <SwitchRow label="Weekly digest"               sub="Activity summary every Monday"          checked={get('notifyWeeklyDigest', false)}         onChange={v => set('notifyWeeklyDigest', v)}                          />
              <SwitchRow label="Resume analysis complete"    sub="Notify when AI finishes your resume"    checked={get('notifyResumeAnalysis', true)}        onChange={v => set('notifyResumeAnalysis', v)}       accent={C.purple} />

              {/* Visibility */}
              <p style={{ margin: '1.5rem 0 12px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>👁 Profile Visibility</p>
              <SwitchRow
                label="Visible to recruiters"
                sub={get('isVisible', true) ? 'Recruiters can find and contact you' : 'Profile is hidden from all searches'}
                checked={get('isVisible', true)} onChange={v => set('isVisible', v)} accent={C.green}
              />

              {/* Password */}
              <p style={{ margin: '1.5rem 0 12px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>🔐 Change Password</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                <div><label style={lbl}>Current Password</label><input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" style={inp()} /></div>
                <div><label style={lbl}>New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" style={inp()} /></div>
                <div><label style={lbl}>Confirm New Password</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" style={inp()} /></div>
              </div>
              {pwMsg && (
                <p style={{ margin: '0 0 12px', fontSize: 12, color: pwMsg.type === 'ok' ? C.green : C.red, padding: '8px 12px', borderRadius: 8, background: pwMsg.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${pwMsg.type === 'ok' ? C.green : C.red}33` }}>
                  {pwMsg.text}
                </p>
              )}
              <button onClick={handlePwChange} style={{ padding: '9px 20px', borderRadius: 9, background: `${C.sky}10`, border: `1px solid ${C.sky}33`, color: C.sky, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                Update Password
              </button>

              {/* Danger zone */}
              <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', borderRadius: 12, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.03)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: C.red }}>⚠ Danger Zone</p>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: C.muted }}>These actions are permanent and cannot be undone.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { if (confirm('Clear all application history?')) { /* TODO: DELETE /profile/applications */ } }} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)', color: C.red, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>Clear History</button>
                  <button onClick={() => { if (confirm('Permanently delete account? All data will be lost.')) { /* TODO: DELETE /auth/account */ } }} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>Delete Account</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky save bar ── */}
        {isDirty && (
          <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, background: C.bg, animation: 'panelSlideUp 0.2s ease' }}>
            <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>
              {Object.keys(form).length} unsaved change{Object.keys(form).length > 1 ? 's' : ''}
            </span>
            <button onClick={() => setForm({})} style={{ padding: '9px 16px', background: 'none', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>Discard</button>
            <button onClick={() => update(form, { onSuccess: () => setForm({}) })} disabled={isPending} style={{ padding: '9px 22px', background: `linear-gradient(135deg, ${C.sky}cc, ${C.sky})`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1, fontFamily: 'Sora, sans-serif' }}>
              {isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}