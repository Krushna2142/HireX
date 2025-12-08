'use client';

import Link from 'next/link';

export default function MockInterviewPage() {
  return (
    <main className="page-gradient mx-auto max-w-7xl px-4 py-12 md:px-8">
      <h1 className="text-3xl font-bold">Mock Interview</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Practice interviews with an AI interviewer. Choose a role and start a session.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {['Frontend Engineer', 'Backend Engineer', 'Full‑stack Engineer', 'Data Engineer'].map((t) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="text-card-foreground font-medium">{t}</div>
            <div className="mt-1 text-sm text-muted-foreground">Behavioral + technical questions tailored to this track.</div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/mock-interview/chat"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary/90"
        >
          Start Chatbot →
        </Link>
      </div>
    </main>
  );
}