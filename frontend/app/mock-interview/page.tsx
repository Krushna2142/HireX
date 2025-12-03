'use client';

import Link from 'next/link';

export default function MockInterviewIntro() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <h1 className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-4xl font-semibold text-transparent">
        Mock Interview
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Practice interviews with an AI interviewer that listens and speaks. Choose any role and start a session.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ConfigCard title="Frontend Engineer" />
        <ConfigCard title="Backend Engineer" />
        <ConfigCard title="Full‑stack Engineer" />
        <ConfigCard title="Data Engineer" />
      </div>

      <div className="mt-8">
        <Link
          href="/mock-interview/chat"
          className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm text-background transition hover:bg-foreground/90"
        >
          Start voice interview
        </Link>
      </div>
    </main>
  );
}

function ConfigCard({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur">
      <div className="text-sm font-medium text-card-foreground">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">
        Behavioral + technical questions tailored to this track.
      </div>
    </div>
  );
}