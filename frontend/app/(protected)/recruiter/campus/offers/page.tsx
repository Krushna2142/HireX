'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { campusApi, type CampusDrive } from '@/lib/axios';
import {
  C, CampusPage, Empty, Err, OfferPill, SkeletonRows, StatCard, fmtDate, money, num,
  panelStyle, inputStyle, smallBtn, tbl, tblWrap, thStyle, tdStyle,
} from '@/app/_components/campus/kit';

type OfferRow = any;

function Board() {
  const params = useSearchParams();
  const [drives, setDrives] = useState<CampusDrive[]>([]);
  const [driveId, setDriveId] = useState(params.get('drive') ?? '');
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!driveId) { setRows([]); return; }
    setLoading(true); setError('');
    try { const { data } = await campusApi.driveOffers(driveId); setRows(data ?? []); }
    catch (e: any) { setError(e?.response?.data?.message ?? 'Failed to load offers.'); }
    finally { setLoading(false); }
  }, [driveId]);

  useEffect(() => { campusApi.myDrives().then((r) => { setDrives(r.data ?? []); if (!driveId && r.data?.length) setDriveId(r.data[0].id); }).catch(() => {}); }, []);
  useEffect(() => { void load(); }, [load]);

  const markJoined = async (id: string) => {
    setBusyId(id);
    try { await campusApi.markJoined(id); toast.success('Marked as joined.'); void load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Update failed.'); }
    finally { setBusyId(null); }
  };

  const counts = rows.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={panelStyle}>
        <select value={driveId} onChange={(e) => setDriveId(e.target.value)} style={{ ...inputStyle, maxWidth: 320 }}>
          {drives.length === 0 && <option value="">No drives</option>}
          {drives.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
        <StatCard label="Released" value={counts.RELEASED ?? 0} color={C.sky} />
        <StatCard label="Accepted" value={counts.ACCEPTED ?? 0} color={C.green} />
        <StatCard label="Joined" value={counts.JOINED ?? 0} color={C.green} />
        <StatCard label="Declined" value={counts.DECLINED ?? 0} color={C.red} />
      </div>
      {error && <Err message={error} onRetry={() => void load()} />}
      {loading ? <SkeletonRows rows={4} /> : rows.length === 0 ? (
        <Empty icon="💌" title="No offers yet" body="Release offers from the Applicants page once a candidate clears rounds." />
      ) : (
        <div style={tblWrap}>
          <table style={tbl}>
            <thead><tr><th style={thStyle}>Candidate</th><th style={thStyle}>Status</th><th style={thStyle}>CTC</th><th style={thStyle}>Role</th><th style={thStyle}>Joining</th><th style={thStyle}></th></tr></thead>
            <tbody>
              {rows.map((r: OfferRow) => (
                <tr key={r.id}>
                  <td style={tdStyle}><strong style={{ color: C.text }}>{r.application?.candidate?.fullName ?? '—'}</strong><div style={{ fontSize: 11, color: C.faint }}>{r.application?.candidate?.email}</div></td>
                  <td style={tdStyle}><OfferPill status={r.status} /></td>
                  <td style={tdStyle}>{money(r.ctc, r.currency)}</td>
                  <td style={tdStyle}>{r.roleTitle ?? '—'}</td>
                  <td style={tdStyle}>{fmtDate(r.joiningDate)}</td>
                  <td style={tdStyle}>{r.status === 'ACCEPTED' && <button type="button" disabled={busyId === r.id} onClick={() => void markJoined(r.id)} style={smallBtn}>{busyId === r.id ? '…' : 'Mark joined'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CampusOffersPage() {
  return (
    <CampusPage title="Campus Offers" subtitle="Track released, accepted, declined and joined offers per drive.">
      <Suspense fallback={null}><Board /></Suspense>
    </CampusPage>
  );
}