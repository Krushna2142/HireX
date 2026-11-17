'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { campusApi, type CampusDrive } from '@/lib/axios';
import ApplicantsBoard from '@/app/_components/campus/ApplicantsBoard';
import { CampusPage, inputStyle, panelStyle } from '@/app/_components/campus/kit';

function Board() {
  const params = useSearchParams();
  const [drives, setDrives] = useState<CampusDrive[]>([]);
  const [driveId, setDriveId] = useState(params.get('drive') ?? '');
  useEffect(() => { campusApi.myDrives().then((r) => { setDrives(r.data ?? []); if (!driveId && r.data?.length) setDriveId(r.data[0].id); }).catch(() => {}); }, []);
  const drive = drives.find((d) => d.id === driveId) ?? null;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={panelStyle}>
        <label style={{ display: 'grid', gap: 7, maxWidth: 420 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(226,232,240,0.42)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Drive</span>
          <select value={driveId} onChange={(e) => setDriveId(e.target.value)} style={inputStyle}>
            {drives.length === 0 && <option value="">No drives</option>}
            {drives.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </label>
      </div>
      <ApplicantsBoard drive={drive} presetStatus="SHORTLISTED" />
    </div>
  );
}

export default function CampusShortlistedPage() {
  return (
    <CampusPage title="Shortlisted Candidates" subtitle="Candidates who cleared screening — schedule interviews and move them forward.">
      <Suspense fallback={null}><Board /></Suspense>
    </CampusPage>
  );
}