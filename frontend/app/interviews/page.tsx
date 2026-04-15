'use client';

import { useEffect, useMemo, useState } from 'react';
import { interviewApi } from '@/lib/axios';

type InterviewItem = {
  id: string;
  current_stage: string;
  status_code: number;
  final_status: string | null;
  updated_at: string;
  created_at: string;
  job_title?: string;
  company?: string;
};

type RoundItem = {
  id: string;
  round_number: number;
  round_type: string;
  scheduled_at: string | null;
  duration_mins: number | null;
  mode: string | null;
  meeting_join_url: string | null;
  result: string | null;
  score: number | null;
  feedback: string | null;
};

const stageColor = (stage: string) => {
  if (stage === 'REJECTED') return '#F87171';
  if (stage === 'HIRED') return '#10B981';
  if (stage === 'SHORTLISTED') return '#38BDF8';
  if (stage.includes('INTERVIEW')) return '#A78BFA';
  return 'rgba(255,255,255,0.75)';
};

export default function CandidateInterviewsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedInterview = useMemo(
    () => items.find((x) => x.id === selected) ?? null,
    [items, selected],
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await interviewApi.listCandidateInterviews({ limit: 30 });
        if (!alive) return;
        const data = (res.data ?? []) as InterviewItem[];
        setItems(data);
        if (data.length && !selected) setSelected(data[0].id);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message ?? 'Failed to load interviews');
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const iv = setInterval(load, 30_000); // light refresh for realtime-ish experience
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [selected]);

  useEffect(() => {
    let alive = true;
    const loadDetail = async () => {
      if (!selected) return;
      try {
        const res = await interviewApi.getCandidateInterview(selected);
        if (!alive) return;
        setRounds((res.data?.rounds ?? []) as RoundItem[]);
      } catch {
        if (!alive) return;
        setRounds([]);
      }
    };
    void loadDetail();
    return () => {
      alive = false;
    };
  }, [selected]);

  const nextRound = useMemo(() => {
    const now = Date.now();
    return rounds
      .filter((r) => r.scheduled_at && new Date(r.scheduled_at).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];
  }, [rounds]);

  return (
    <main style={{ padding: 20, color: 'white' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>My Interviews</h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
        Track your real interview process, rounds, reminders, and join links.
      </p>

      {error && (
        <div style={{ marginBottom: 12, color: '#FCA5A5' }}>{error}</div>
      )}

      {nextRound && (
        <section style={{ marginBottom: 16, padding: 14, border: '1px solid rgba(56,189,248,.25)', borderRadius: 10, background: 'rgba(56,189,248,.08)' }}>
          <div style={{ fontSize: 13, color: '#38BDF8', fontWeight: 700 }}>Upcoming Round</div>
          <div style={{ marginTop: 4, fontSize: 15 }}>
            {nextRound.round_type.toUpperCase()} · {nextRound.scheduled_at ? new Date(nextRound.scheduled_at).toLocaleString() : 'TBD'}
          </div>
          {nextRound.meeting_join_url && (
            <a
              href={nextRound.meeting_join_url}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-block', marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#38BDF8', color: '#001018', textDecoration: 'none', fontWeight: 700 }}
            >
              Join Interview
            </a>
          )}
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
        <section style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.08)', fontWeight: 600 }}>
            Applications in Process
          </div>
          <div style={{ maxHeight: 540, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>No interviews yet.</div>
            ) : (
              items.map((it) => {
                const active = selected === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelected(it.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 12,
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,.06)',
                      background: active ? 'rgba(255,255,255,.06)' : 'transparent',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{it.job_title ?? 'Job'}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{it.company ?? '-'}</div>
                    <div style={{ marginTop: 6, fontSize: 11, color: stageColor(it.current_stage), fontWeight: 700 }}>
                      {it.current_stage}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.08)', fontWeight: 600 }}>
            {selectedInterview ? `${selectedInterview.job_title ?? 'Interview'} Timeline` : 'Interview Details'}
          </div>

          {!selectedInterview ? (
            <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>Select an interview.</div>
          ) : (
            <div style={{ padding: 12 }}>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>Current Stage: </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: stageColor(selectedInterview.current_stage) }}>
                  {selectedInterview.current_stage}
                </span>
              </div>

              <h3 style={{ margin: '10px 0 8px', fontSize: 14 }}>Rounds</h3>
              {rounds.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>No rounds scheduled yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {rounds.map((r) => (
                    <div key={r.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          Round {r.round_number}: {r.round_type.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{r.result ?? 'pending'}</div>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.7)' }}>
                        {r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : 'Not scheduled'}
                      </div>
                      {r.meeting_join_url && (
                        <a
                          href={r.meeting_join_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: '#38BDF8' }}
                        >
                          Open Join Link
                        </a>
                      )}
                      {typeof r.score === 'number' && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#A78BFA' }}>Score: {r.score}</div>
                      )}
                      {r.feedback && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{r.feedback}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}