'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { interviewApi, type InterviewStage } from '@/lib/axios';

type InterviewItem = {
  id: string;
  candidate_name?: string;
  job_title?: string;
  current_stage: InterviewStage;
  status_code: number;
  updated_at: string;
};

type Dashboard = {
  total: number;
  shortlisted: number;
  rejected: number;
  scheduled: number;
  hired: number;
};

const STAGE_OPTIONS: InterviewStage[] = [
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_IN_PROGRESS',
  'INTERVIEW_PASSED',
  'INTERVIEW_FAILED',
  'FINAL_REVIEW',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'ON_HOLD',
];

export default function RecruiterInterviewsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stageUpdatingId, setStageUpdatingId] = useState<string | null>(null);

  const [openScheduleFor, setOpenScheduleFor] = useState<string | null>(null);
  const [roundType, setRoundType] = useState<'hr' | 'technical' | 'managerial' | 'assignment'>('technical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMins, setDurationMins] = useState(45);
  const [mode, setMode] = useState<'video' | 'phone' | 'offline'>('video');
  const [scheduling, setScheduling] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [listRes, dashRes] = await Promise.all([
        interviewApi.listRecruiterInterviews({ limit: 50 }),
        interviewApi.getRecruiterDashboard(),
      ]);
      setItems((listRes.data ?? []) as InterviewItem[]);
      setStats((dashRes.data ?? null) as Dashboard | null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load recruiter interviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  const pipeline = useMemo(
    () => [
      { label: 'Total', value: stats?.total ?? 0, color: '#fff' },
      { label: 'Shortlisted', value: stats?.shortlisted ?? 0, color: '#38BDF8' },
      { label: 'Scheduled', value: stats?.scheduled ?? 0, color: '#A78BFA' },
      { label: 'Rejected', value: stats?.rejected ?? 0, color: '#F87171' },
      { label: 'Hired', value: stats?.hired ?? 0, color: '#10B981' },
    ],
    [stats],
  );

  const onStageChange = async (id: string, stage: InterviewStage) => {
    try {
      setStageUpdatingId(id);
      await interviewApi.updateStage(id, stage);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to update stage');
    } finally {
      setStageUpdatingId(null);
    }
  };

  const openSchedule = (interviewId: string) => {
    setOpenScheduleFor(interviewId);
    setRoundType('technical');
    setScheduledAt('');
    setDurationMins(45);
    setMode('video');
  };

  const submitSchedule = async () => {
    if (!openScheduleFor) return;
    if (!scheduledAt) {
      alert('Please select schedule date/time');
      return;
    }
    try {
      setScheduling(true);
      await interviewApi.scheduleRound(openScheduleFor, {
        roundType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMins,
        mode,
      });
      await load();
      setOpenScheduleFor(null);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to schedule round');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <main style={{ padding: 20, color: 'white' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Recruiter Interviews</h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
        Manage pipeline, open live panel, and schedule rounds.
      </p>

      {error && <div style={{ marginBottom: 12, color: '#FCA5A5' }}>{error}</div>}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
        {pipeline.map((p) => (
          <div key={p.label} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 12, background: 'rgba(255,255,255,.02)' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{p.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: p.color }}>{p.value}</div>
          </div>
        ))}
      </section>

      <section style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.08)', fontWeight: 600 }}>
          Candidates in Interview Process
        </div>

        {loading ? (
          <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>No interviews yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,.03)' }}>
                  <th style={{ padding: 10, fontSize: 12 }}>Candidate</th>
                  <th style={{ padding: 10, fontSize: 12 }}>Job</th>
                  <th style={{ padding: 10, fontSize: 12 }}>Stage</th>
                  <th style={{ padding: 10, fontSize: 12 }}>Status Code</th>
                  <th style={{ padding: 10, fontSize: 12 }}>Updated</th>
                  <th style={{ padding: 10, fontSize: 12 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                    <td style={{ padding: 10, fontSize: 13 }}>{row.candidate_name ?? '-'}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>{row.job_title ?? '-'}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>{row.current_stage}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>{row.status_code}</td>
                    <td style={{ padding: 10, fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
                      {new Date(row.updated_at).toLocaleString()}
                    </td>
                    <td style={{ padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <select
                        defaultValue={row.current_stage}
                        disabled={stageUpdatingId === row.id}
                        onChange={(e) => void onStageChange(row.id, e.target.value as InterviewStage)}
                        style={{ background: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,.2)', borderRadius: 6, padding: '6px 8px', fontSize: 12 }}
                      >
                        <option value={row.current_stage}>{row.current_stage}</option>
                        {STAGE_OPTIONS.filter((s) => s !== row.current_stage).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => openSchedule(row.id)}
                        style={{ background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
                      >
                        Schedule Round
                      </button>

                      <Link
                        href={`/recruiter/interviews/${row.id}/live`}
                        style={{ background: '#7c3aed', color: 'white', textDecoration: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}
                      >
                        Live Panel
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {openScheduleFor && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ width: 420, background: '#0b1220', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>Schedule Interview Round</h3>

            <label style={{ fontSize: 12 }}>Round Type</label>
            <select value={roundType} onChange={(e) => setRoundType(e.target.value as any)} style={{ width: '100%', margin: '6px 0 10px', padding: 8, borderRadius: 6, background: '#111827', color: 'white', border: '1px solid rgba(255,255,255,.2)' }}>
              <option value="technical">Technical</option>
              <option value="hr">HR</option>
              <option value="managerial">Managerial</option>
              <option value="assignment">Assignment</option>
            </select>

            <label style={{ fontSize: 12 }}>Date & Time</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={{ width: '100%', margin: '6px 0 10px', padding: 8, borderRadius: 6, background: '#111827', color: 'white', border: '1px solid rgba(255,255,255,.2)' }} />

            <label style={{ fontSize: 12 }}>Duration (mins)</label>
            <input type="number" min={15} max={180} value={durationMins} onChange={(e) => setDurationMins(Number(e.target.value))} style={{ width: '100%', margin: '6px 0 10px', padding: 8, borderRadius: 6, background: '#111827', color: 'white', border: '1px solid rgba(255,255,255,.2)' }} />

            <label style={{ fontSize: 12 }}>Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={{ width: '100%', margin: '6px 0 14px', padding: 8, borderRadius: 6, background: '#111827', color: 'white', border: '1px solid rgba(255,255,255,.2)' }}>
              <option value="video">Video</option>
              <option value="phone">Phone</option>
              <option value="offline">Offline</option>
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setOpenScheduleFor(null)} style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,.25)', borderRadius: 6, padding: '8px 12px' }}>
                Cancel
              </button>
              <button onClick={() => void submitSchedule()} disabled={scheduling} style={{ background: '#22c55e', color: '#052e16', border: 'none', borderRadius: 6, padding: '8px 12px', fontWeight: 700 }}>
                {scheduling ? 'Scheduling…' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}