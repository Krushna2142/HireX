"use client";
import React from 'react';

export default function Controls({ isMicOn, isCamOn, onToggleMic, onToggleCam }: { isMicOn: boolean; isCamOn: boolean; onToggleMic: () => void; onToggleCam: () => void; }) {
  return (
    <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 }}>
      <button onClick={onToggleMic} style={{ padding: '8px 12px' }}>{isMicOn ? 'Mute' : 'Unmute'}</button>
      <button onClick={onToggleCam} style={{ padding: '8px 12px' }}>{isCamOn ? 'Camera Off' : 'Camera On'}</button>
      <button style={{ padding: '8px 12px' }}>Share Screen</button>
      <button style={{ padding: '8px 12px', background: '#e53935', color: '#fff' }}>Leave</button>
    </div>
  );
}
