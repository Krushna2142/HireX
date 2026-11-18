'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { campusApi, type CampusBranch } from '@/lib/axios';
import {
  C, CampusPage, Field, Err, panelStyle, primaryBtn, secondaryBtn, smallBtn,
  inputStyle, labelStyle, num,
} from '@/app/_components/campus/kit';
import SkillPicker from '@/app/_components/campus/SkillPicker';

type College = { id: string; name: string; city?: string | null };
type CustomRule = { field: string; operator: string; value: string; label: string };
type CritRow = { branchSelector: string; minCgpa: string; minTenthPct: string; maxActiveBacklogs: string; allowHistorical: boolean };

const STEPS = ['Basics', 'Colleges', 'Eligibility', 'Branch criteria', 'Rounds & publish'];
const OPERATORS = ['gte', 'lte', 'eq', 'neq', 'in', 'not_in', 'contains', 'exists'];

export default function CreateDrivePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [colleges, setColleges] = useState<College[]>([]);
  const [branches, setBranches] = useState<CampusBranch[]>([]);

  const [form, setForm] = useState({
    title: '', jobRole: '', description: '', employmentType: 'full_time',
    workMode: 'onsite', ctcMin: '', ctcMax: '', location: '', vacancies: '1',
    applicationOpenAt: '', applicationCloseAt: '', driveDate: '', requiredDocuments: '',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [rounds, setRounds] = useState<Array<{ roundType: string; durationMins: number }>>([{ roundType: 'technical', durationMins: 45 }]);
  const [colSel, setColSel] = useState({ all: false, ids: [] as string[] });
  const [elig, setElig] = useState({
    graduationYears: '', allowAllBranches: true, branchIds: [] as string[],
    minimumCGPA: '', minimum10thPercentage: '', minimum12thPercentage: '',
    maximumActiveBacklogs: '', allowHistoricalBacklogs: true, maximumHistoricalBacklogs: '',
    combinator: 'AND' as 'AND' | 'OR', custom: [] as CustomRule[],
  });
  const [criteria, setCriteria] = useState<CritRow[]>([]);
  const [publishNow, setPublishNow] = useState(true);

  useEffect(() => {
    Promise.all([campusApi.listColleges(), campusApi.branchCatalogue()])
      .then(([c, b]) => { setColleges(c.data as College[]); setBranches(b.data ?? []); })
      .catch(() => toast.error('Could not load colleges / branches.'));
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const chosenBranches = useMemo(
    () => branches.filter((b) => elig.branchIds.includes(b.id)),
    [branches, elig.branchIds],
  );

  const validate = (): string => {
    if (step === 0) {
      if (!form.title.trim()) return 'Drive title is required.';
      if (!form.jobRole.trim()) return 'Job role is required.';
      if (form.description.trim().length < 20) return 'Description must be at least 20 characters.';
      if (skills.length === 0) return 'Select at least one required skill.';
    }
    if (step === 1 && !colSel.all && colSel.ids.length === 0) return 'Select at least one college or choose "All colleges".';
    if (step === 2 && !elig.allowAllBranches && elig.branchIds.length === 0) return 'Select branches or enable "All branches".';
    return '';
  };

  const next = () => { const e = validate(); if (e) return setError(e); setError(''); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };

  const addCriterionRow = (selector: string) => {
    if (!selector || criteria.some((c) => c.branchSelector === selector)) return;
    setCriteria((p) => [...p, { branchSelector: selector, minCgpa: '', minTenthPct: '', maxActiveBacklogs: '', allowHistorical: true }]);
  };

  const submit = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const drive = (await campusApi.createDrive({
        title: form.title.trim(), jobRole: form.jobRole.trim(), description: form.description.trim(),
        requiredSkills: skills, employmentType: form.employmentType, workMode: form.workMode,
        ctcMin: form.ctcMin ? num(form.ctcMin) : undefined, ctcMax: form.ctcMax ? num(form.ctcMax) : undefined,
        location: form.location || undefined, vacancies: num(form.vacancies) || 1,
        applicationOpenAt: form.applicationOpenAt ? new Date(form.applicationOpenAt).toISOString() : undefined,
        applicationCloseAt: form.applicationCloseAt ? new Date(form.applicationCloseAt).toISOString() : undefined,
        driveDate: form.driveDate ? new Date(form.driveDate).toISOString() : undefined,
        requiredDocuments: form.requiredDocuments.split(',').map((s) => s.trim()).filter(Boolean),
        roundsTemplate: rounds as any,
      })).data;

      await campusApi.setDriveColleges(drive.id, {
        allColleges: colSel.all,
        colleges: colSel.all ? undefined : colSel.ids.map((collegeId) => ({ collegeId })),
      });

      await campusApi.setDriveEligibility(drive.id, {
        combinator: elig.combinator,
        rule: {
          graduationYears: elig.graduationYears.split(',').map((y) => num(y.trim())).filter((y) => y > 0),
          allowAllBranches: elig.allowAllBranches,
          allowedBranchIds: elig.allowAllBranches ? undefined : elig.branchIds,
          minimumCGPA: elig.minimumCGPA ? num(elig.minimumCGPA) : undefined,
          minimum10thPercentage: elig.minimum10thPercentage ? num(elig.minimum10thPercentage) : undefined,
          minimum12thPercentage: elig.minimum12thPercentage ? num(elig.minimum12thPercentage) : undefined,
          maximumActiveBacklogs: elig.maximumActiveBacklogs ? num(elig.maximumActiveBacklogs) : undefined,
          allowHistoricalBacklogs: elig.allowHistoricalBacklogs,
          maximumHistoricalBacklogs: elig.allowHistoricalBacklogs ? undefined : (elig.maximumHistoricalBacklogs ? num(elig.maximumHistoricalBacklogs) : 0),
          custom: elig.custom.filter((c) => c.field).map((c) => ({ field: c.field, operator: c.operator, value: c.value, label: c.label || c.field })) as any,
        },
      });

      if (criteria.length) {
        await campusApi.setDriveCriteria(drive.id, {
          criteria: criteria.map((c) => ({
            branchSelector: c.branchSelector,
            minCgpa: c.minCgpa ? num(c.minCgpa) : undefined,
            minTenthPct: c.minTenthPct ? num(c.minTenthPct) : undefined,
            maxActiveBacklogs: c.maxActiveBacklogs ? num(c.maxActiveBacklogs) : undefined,
            allowHistorical: c.allowHistorical,
          })) as any,
        });
      }

      if (publishNow) await campusApi.publishDrive(drive.id);
      toast.success(publishNow ? 'Drive published.' : 'Drive saved as draft.');
      router.push('/recruiter/campus/drives');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to create drive.');
      setBusy(false);
    }
  }, [form, skills, rounds, colSel, elig, criteria, publishNow, router]);

  return (
    <CampusPage title="Create Campus Drive" subtitle="Configure the role, college visibility, eligibility rules and per-branch criteria. Drafts are never published automatically.">
      {/* Stepper */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {STEPS.map((s, i) => (
          <button key={s} type="button" onClick={() => i < step && setStep(i)} style={{
            ...smallBtn, cursor: i < step ? 'pointer' : 'default',
            borderColor: i === step ? C.borderStrong : C.border,
            background: i === step ? 'rgba(167,139,250,0.14)' : 'transparent',
            color: i === step ? C.purple : i < step ? C.green : C.faint,
          }}>{i + 1}. {s}</button>
        ))}
      </div>
      {error && <div style={{ marginBottom: 14 }}><Err message={error} /></div>}

      {step === 0 && (
        <div style={{ ...panelStyle, display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Drive title *"><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="FY26 Campus Hiring — Engineering" style={inputStyle} /></Field>
            <Field label="Job role *"><input value={form.jobRole} onChange={(e) => set('jobRole', e.target.value)} placeholder="Software Engineer" style={inputStyle} /></Field>
          </div>
          <Field label="Job description *"><textarea rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
          <SkillPicker value={skills} onChange={setSkills} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
            <Field label="Employment type"><select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)} style={inputStyle}><option value="full_time">Full-time</option><option value="internship">Internship</option><option value="contract">Contract</option></select></Field>
            <Field label="Work mode"><select value={form.workMode} onChange={(e) => set('workMode', e.target.value)} style={inputStyle}><option value="onsite">Onsite</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select></Field>
            <Field label="CTC min"><input type="number" value={form.ctcMin} onChange={(e) => set('ctcMin', e.target.value)} style={inputStyle} /></Field>
            <Field label="CTC max"><input type="number" value={form.ctcMax} onChange={(e) => set('ctcMax', e.target.value)} style={inputStyle} /></Field>
            <Field label="Vacancies"><input type="number" min={1} value={form.vacancies} onChange={(e) => set('vacancies', e.target.value)} style={inputStyle} /></Field>
            <Field label="Location"><input value={form.location} onChange={(e) => set('location', e.target.value)} style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
            <Field label="Applications open"><input type="datetime-local" value={form.applicationOpenAt} onChange={(e) => set('applicationOpenAt', e.target.value)} style={inputStyle} /></Field>
            <Field label="Applications close"><input type="datetime-local" value={form.applicationCloseAt} onChange={(e) => set('applicationCloseAt', e.target.value)} style={inputStyle} /></Field>
            <Field label="Drive date"><input type="date" value={form.driveDate} onChange={(e) => set('driveDate', e.target.value)} style={inputStyle} /></Field>
          </div>
          <Field label="Required documents (comma separated)"><input value={form.requiredDocuments} onChange={(e) => set('requiredDocuments', e.target.value)} placeholder="resume, marksheet" style={inputStyle} /></Field>
        </div>
      )}

      {step === 1 && (
        <div style={{ ...panelStyle, display: 'grid', gap: 14 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={colSel.all} onChange={(e) => setColSel({ all: e.target.checked, ids: e.target.checked ? [] : colSel.ids })} />
            <span style={{ fontSize: 13, fontWeight: 800 }}>Publish to ALL onboarded colleges</span>
          </label>
          {!colSel.all && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
              {colleges.map((c) => {
                const on = colSel.ids.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => setColSel((p) => ({ ...p, ids: on ? p.ids.filter((x) => x !== c.id) : [...p.ids, c.id] }))} style={{
                    ...secondaryBtn, textAlign: 'left', borderColor: on ? C.borderStrong : C.border,
                    background: on ? 'rgba(167,139,250,0.12)' : 'transparent',
                  }}>{on ? '✓ ' : ''}{c.name}{c.city ? ` · ${c.city}` : ''}</button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div style={{ ...panelStyle, display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>
            <Field label="Graduation years (comma)"><input value={elig.graduationYears} onChange={(e) => setElig({ ...elig, graduationYears: e.target.value })} placeholder="2026, 2027" style={inputStyle} /></Field>
            <Field label="Min CGPA"><input type="number" step="0.01" value={elig.minimumCGPA} onChange={(e) => setElig({ ...elig, minimumCGPA: e.target.value })} style={inputStyle} /></Field>
            <Field label="Min 10th %"><input type="number" value={elig.minimum10thPercentage} onChange={(e) => setElig({ ...elig, minimum10thPercentage: e.target.value })} style={inputStyle} /></Field>
            <Field label="Min 12th %"><input type="number" value={elig.minimum12thPercentage} onChange={(e) => setElig({ ...elig, minimum12thPercentage: e.target.value })} style={inputStyle} /></Field>
            <Field label="Max active backlogs"><input type="number" value={elig.maximumActiveBacklogs} onChange={(e) => setElig({ ...elig, maximumActiveBacklogs: e.target.value })} style={inputStyle} /></Field>
            <Field label="Rule combinator"><select value={elig.combinator} onChange={(e) => setElig({ ...elig, combinator: e.target.value as any })} style={inputStyle}><option value="AND">AND (all must pass)</option><option value="OR">OR (any must pass)</option></select></Field>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={elig.allowHistoricalBacklogs} onChange={(e) => setElig({ ...elig, allowHistoricalBacklogs: e.target.checked })} />
            <span style={{ fontSize: 13 }}>Allow historical backlogs</span>
          </label>
          {!elig.allowHistoricalBacklogs && (
            <Field label="Max historical backlogs"><input type="number" value={elig.maximumHistoricalBacklogs} onChange={(e) => setElig({ ...elig, maximumHistoricalBacklogs: e.target.value })} style={{ ...inputStyle, maxWidth: 200 }} /></Field>
          )}
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={elig.allowAllBranches} onChange={(e) => setElig({ ...elig, allowAllBranches: e.target.checked })} />
            <span style={{ fontSize: 13, fontWeight: 800 }}>All branches eligible</span>
          </label>
          {!elig.allowAllBranches && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {branches.map((b) => {
                const on = elig.branchIds.includes(b.id);
                return (
                  <label key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', background: on ? 'rgba(52,211,153,0.08)' : 'transparent' }}>
                    <input type="checkbox" checked={on} onChange={() => setElig((p) => ({ ...p, branchIds: on ? p.branchIds.filter((x) => x !== b.id) : [...p.branchIds, b.id] }))} />
                    <span style={{ fontSize: 12 }}>{b.name} <span style={{ color: C.faint }}>· {b.college?.name}</span></span>
                  </label>
                );
              })}
            </div>
          )}
          <div>
            <span style={labelStyle}>Custom rules</span>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {elig.custom.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr auto', gap: 8 }}>
                  <input value={r.field} placeholder="field (e.g. internship)" onChange={(e) => setElig((p) => { const c = [...p.custom]; c[i] = { ...c[i], field: e.target.value }; return { ...p, custom: c }; })} style={inputStyle} />
                  <select value={r.operator} onChange={(e) => setElig((p) => { const c = [...p.custom]; c[i] = { ...c[i], operator: e.target.value }; return { ...p, custom: c }; })} style={inputStyle}>{OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                  <input value={r.value} placeholder="value" onChange={(e) => setElig((p) => { const c = [...p.custom]; c[i] = { ...c[i], value: e.target.value }; return { ...p, custom: c }; })} style={inputStyle} />
                  <input value={r.label} placeholder="label" onChange={(e) => setElig((p) => { const c = [...p.custom]; c[i] = { ...c[i], label: e.target.value }; return { ...p, custom: c }; })} style={inputStyle} />
                  <button type="button" style={smallBtn} onClick={() => setElig((p) => ({ ...p, custom: p.custom.filter((_, x) => x !== i) }))}>✕</button>
                </div>
              ))}
              <button type="button" style={{ ...smallBtn, width: 'fit-content' }} onClick={() => setElig((p) => ({ ...p, custom: [...p.custom, { field: '', operator: 'gte', value: '', label: '' }] }))}>+ Add custom rule</button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ ...panelStyle, display: 'grid', gap: 14 }}>
          <p style={{ margin: 0, color: C.faint, fontSize: 12.5, lineHeight: 1.6 }}>
            Override the base rule per branch (or for ALL). Branch-specific values win over the base eligibility rule.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select defaultValue="" onChange={(e) => { addCriterionRow(e.target.value); e.target.value = ''; }} style={{ ...inputStyle, maxWidth: 320 }}>
              <option value="">+ Add criteria for…</option>
              <option value="ALL">ALL branches</option>
              {(elig.allowAllBranches ? branches : chosenBranches).map((b) => (
                <option key={b.id} value={b.id}>{b.name} · {b.college?.name}</option>
              ))}
            </select>
          </div>
          {criteria.length === 0 ? (
            <p style={{ color: C.faint, fontSize: 13 }}>No per-branch criteria — base rule applies everywhere.</p>
          ) : criteria.map((row, i) => (
            <div key={row.branchSelector} style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 13, color: C.purple }}>{row.branchSelector === 'ALL' ? 'ALL branches' : branches.find((b) => b.id === row.branchSelector)?.name ?? row.branchSelector}</strong>
                <button type="button" style={smallBtn} onClick={() => setCriteria((p) => p.filter((_, x) => x !== i))}>Remove</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                <Field label="Min CGPA"><input type="number" step="0.01" value={row.minCgpa} onChange={(e) => setCriteria((p) => p.map((r, x) => x === i ? { ...r, minCgpa: e.target.value } : r))} style={inputStyle} /></Field>
                <Field label="Min 10th %"><input type="number" value={row.minTenthPct} onChange={(e) => setCriteria((p) => p.map((r, x) => x === i ? { ...r, minTenthPct: e.target.value } : r))} style={inputStyle} /></Field>
                <Field label="Max active backlogs"><input type="number" value={row.maxActiveBacklogs} onChange={(e) => setCriteria((p) => p.map((r, x) => x === i ? { ...r, maxActiveBacklogs: e.target.value } : r))} style={inputStyle} /></Field>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={row.allowHistorical} onChange={(e) => setCriteria((p) => p.map((r, x) => x === i ? { ...r, allowHistorical: e.target.checked } : r))} />
                  Allow historical backlogs
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 4 && (
        <div style={{ ...panelStyle, display: 'grid', gap: 14 }}>
          <div>
            <span style={labelStyle}>Selection rounds</span>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {rounds.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8 }}>
                  <select value={r.roundType} onChange={(e) => setRounds((p) => p.map((x, k) => k === i ? { ...x, roundType: e.target.value } : x))} style={inputStyle}>
                    <option value="technical">Technical</option><option value="hr">HR</option>
                    <option value="managerial">Managerial</option><option value="assignment">Assignment</option>
                  </select>
                  <input type="number" min={10} value={r.durationMins} onChange={(e) => setRounds((p) => p.map((x, k) => k === i ? { ...x, durationMins: num(e.target.value) } : x))} style={inputStyle} />
                  <button type="button" style={smallBtn} onClick={() => setRounds((p) => p.filter((_, x) => x !== i))}>✕</button>
                </div>
              ))}
              <button type="button" style={{ ...smallBtn, width: 'fit-content' }} onClick={() => setRounds((p) => [...p, { roundType: 'hr', durationMins: 30 }])}>+ Add round</button>
            </div>
          </div>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, display: 'grid', gap: 6, color: C.muted, fontSize: 13 }}>
            <strong style={{ color: C.text }}>Review</strong>
            <span>{form.title || 'Untitled'} · {form.jobRole || 'role'} · {form.vacancies} vacancies</span>
            <span>Colleges: {colSel.all ? 'ALL' : colSel.ids.length} · Branches: {elig.allowAllBranches ? 'ALL' : elig.branchIds.length} · Min CGPA: {elig.minimumCGPA || '—'}</span>
            <span>Window: {form.applicationOpenAt || '—'} → {form.applicationCloseAt || '—'}</span>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
            <span style={{ fontSize: 13, fontWeight: 800 }}>Publish immediately (otherwise saved as DRAFT)</span>
          </label>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 16 }}>
        <button type="button" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)} style={{ ...secondaryBtn, opacity: step === 0 ? .5 : 1 }}>← Back</button>
        {step < STEPS.length - 1
          ? <button type="button" onClick={next} style={primaryBtn}>Next →</button>
          : <button type="button" disabled={busy} onClick={() => void submit()} style={primaryBtn}>{busy ? 'Saving…' : publishNow ? 'Create & Publish' : 'Create draft'}</button>}
      </div>
    </CampusPage>
  );
}