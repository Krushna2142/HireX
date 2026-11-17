'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { campusApi, type CampusDrive } from '@/lib/axios';
import {
  C, CampusPage, Empty, Err, SkeletonRows, StatCard,
  panelStyle, inputStyle, labelStyle,
} from '@/app/_components/campus/kit';

type Analytics = any;

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted }}>
        <span>{label}</span><strong style={{ color }}>{value}</strong>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, transition: 'width .5s ease' }} />
      </div>
    </div>
  );
}

function Board() {
  const params = useSearchParams();
  const [drives, setDrives] = useState<CampusDrive[]>([]);
  const [driveId, setDriveId] = useState(params.get('drive') ?? '');
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!driveId) { setData(null); return; }
    setLoading(true); setError('');
    try { const r = await campusApi.driveAnalytics(driveId); setData(r.data); }
    catch (e: any) { setError(e?.response?.data?.message ?? 'Failed to load analytics.'); }
    finally { setLoading(false); }
  }, [driveId]);

  useEffect(() => { campusApi.myDrives().then((r) => { setDrives(r.data ?? []); if (!driveId && r.data?.length) setDriveId(r.data[0].id); }).catch(() => {}); }, []);
  useEffect(() => { void load(); }, [load]);

  const t = data?.totals ?? {};
  const funnel = data?.funnel ?? [];
  const maxFunnel = funnel[0]?.value || 1;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={panelStyle}>
        <select value={driveId} onChange={(e) => setDriveId(e.target.value)} style={{ ...inputStyle, maxWidth: 320 }}>
          {drives.length === 0 && <option value="">No drives</option>}
          {drives.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </div>
      {error && <Err message={error} onRetry={() => void load()} />}
      {loading ? <SkeletonRows rows={4} height={90} /> : !data ? <Empty icon="📈" title="Select a drive" /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            <StatCard label="Applications" value={t.applications ?? 0} color={C.sky} />
            <StatCard label="Shortlisted" value={t.shortlisted ?? 0} color={C.yellow} />
            <StatCard label="Interviewed" value={t.interviewed ?? 0} color={C.purple} />
            <StatCard label="Offered" value={t.offered ?? 0} color={C.green} />
            <StatCard label="Joined" value={t.joined ?? 0} color={C.green} />
            <StatCard label="Rejected" value={t.rejected ?? 0} color={C.red} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
            <div style={panelStyle}>
              <span style={labelStyle}>Hiring funnel</span>
              <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                {funnel.map((f: any, i: number) => (
                  <Bar key={f.stage} label={f.stage} value={f.value} total={maxFunnel} color={[C.sky, C.yellow, C.purple, C.green, C.green][i % 5]} />
                ))}
              </div>
            </div>
            <div style={panelStyle}>
              <span style={labelStyle}>Branch-wise applicants</span>
              <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                {(data.byBranch ?? []).slice(0, 8).map((b: any) => (
                  <Bar key={b.branch} label={b.branch} value={b.count} total={t.applications ?? 1} color={C.purple} />
                ))}
                {(data.byBranch ?? []).length === 0 && <span style={{ color: C.faint, fontSize: 12.5 }}>No applicant data yet.</span>}
              </div>
            </div>
            <div style={panelStyle}>
              <span style={labelStyle}>Batch-wise applicants</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {(data.byBatch ?? []).map((b: any) => (
                  <span key={b.year} style={{ border: `1px solid ${C.border}`, borderRadius: 999, padding: '6px 12px', fontSize: 12, color: C.muted }}>
                    {b.year}: <strong style={{ color: C.sky }}>{b.count}</strong>
                  </span>
                ))}
                {(data.byBatch ?? []).length === 0 && <span style={{ color: C.faint, fontSize: 12.5 }}>No batch data yet.</span>}
              </div>
              <div style={{ marginTop: 16 }}>
                <span style={labelStyle}>Eligibility split</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {Object.entries(data.byEligibility ?? {}).map(([k, v]) => (
                    <span key={k} style={{ border: `1px solid ${C.border}`, borderRadius: 999, padding: '6px 12px', fontSize: 12, color: k === 'ELIGIBLE' ? C.green : k === 'NOT_ELIGIBLE' ? C.red : C.yellow }}>
                      {k.replaceAll('_', ' ').toLowerCase()}: <strong>{String(v)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CampusAnalyticsPage() {
  return (
    <CampusPage title="Drive Analytics" subtitle="Funnel, branch and batch breakdown for each campus drive.">
      <Suspense fallback={null}><Board /></Suspense>
    </CampusPage>
  );
}