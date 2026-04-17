"use client";
import React from 'react';

export default function Sidebar() {
  return (
    <div style={{ padding: 12 }}>
      <h3>Interview Sidebar</h3>
      <section style={{ marginBottom: 12 }}>
        <h4>Chat</h4>
        <div style={{ height: 200, background: '#fafafa', border: '1px solid #eee' }}>In-room chat placeholder</div>
      </section>
      <section style={{ marginBottom: 12 }}>
        <h4>Notes</h4>
        <textarea rows={8} style={{ width: '100%' }} placeholder="Take real-time notes here" />
      </section>
      <section>
        <h4>Resume</h4>
        <div style={{ background: '#fff', border: '1px solid #eee', padding: 8 }}>Candidate resume preview</div>
      </section>
    </div>
  );
}
