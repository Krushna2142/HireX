'use client';
export const dynamic = 'force-dynamic';
// frontend/app/%28protected%29/mock-interview/chat/page.tsx
export default function ChatRoomPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">🎤 Live Interview Chat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            AI-powered mock interview with instant feedback & grading
          </p>
        </div>
        <a
          href="/mock-interview"
          className="btn btn-secondary text-sm"
        >
          ← Back
        </a>
      </div>

      {/* MindPal Chatbot - Full Height */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-0)] shadow-lg">
        <div className="flex items-center gap-2 bg-[var(--surface-1)] px-4 py-3 border-b border-[var(--border-0)]">
          <span className="text-lg">🎯</span>
          <h2 className="text-sm font-semibold">PrepWise AI</h2>
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
            ● Live
          </span>
        </div>
        <iframe
          src="https://chatbot.getmindpal.com/mock-interview-master-7ia"
          width="100%"
          height="650"
          frameBorder={0}
          allow="microphone"
          title="PrepWise AI Mock Interview"
          className="bg-[var(--surface-0)]"
        />
      </div>
    </main>
  );
}
