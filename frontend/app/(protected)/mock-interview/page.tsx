'use client';
// frontend/app/%28protected%29/mock-interview/page.tsx
import { useState } from 'react';

export default function MockInterviewPage() {
  const [showChat, setShowChat] = useState(false);

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="section-header">
        <h1 className="text-3xl font-bold">🎤 Mock Interview</h1>
      </div>

      {/* Info Card */}
      <div className="card p-6 mb-6">
        <p className="text-[var(--text-muted)] text-lg">
          Practice with our AI-powered interview coach. Get instant grading, 
          skill gap analysis, and personalized resource recommendations.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">
            ✅ Instant Feedback
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-400">
            📊 Score & Grading
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-400">
            📚 Resource Recommendations
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-400">
            🗺️ Study Roadmap
          </span>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            className="btn"
            onClick={() => setShowChat(true)}
          >
            🎯 Start Interview Session
          </button>
          <a
            href="/mock-interview/chat"
            className="btn btn-secondary"
          >
            💬 Voice Chat Mode
          </a>
        </div>
      </div>

      {/* PrepWise AI Chatbot Embed */}
      {showChat && (
        <div className="card overflow-hidden rounded-xl border border-[var(--border-0)]">
          <div className="flex items-center justify-between bg-[var(--surface-1)] px-4 py-3 border-b border-[var(--border-0)]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎤</span>
              <h2 className="text-sm font-semibold">PrepWise AI — Mock Interview Coach</h2>
              <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                ● Live
              </span>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-0)] transition text-xl leading-none"
              title="Close"
            >
              ✕
            </button>
          </div>
          <iframe
            src="https://chatbot.getmindpal.com/mock-interview-master-7ia"
            width="100%"
            height="600"
            frameBorder={0}
            allow="microphone"
            title="PrepWise AI Mock Interview"
            className="bg-[var(--surface-0)]"
          />
        </div>
      )}

      {/* Always-visible Embedded Version (alternative) */}
      {!showChat && (
        <div className="card overflow-hidden rounded-xl border border-[var(--border-0)] mt-2">
          <div className="flex items-center gap-2 bg-[var(--surface-1)] px-4 py-3 border-b border-[var(--border-0)]">
            <span className="text-lg">🎤</span>
            <h2 className="text-sm font-semibold">PrepWise AI — Ready to Interview</h2>
          </div>
          <div className="p-8 text-center">
            <p className="text-5xl mb-4">🎯</p>
            <h3 className="text-xl font-bold mb-2">Ready to ace your interview?</h3>
            <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
              Our AI coach will ask role-specific questions, grade your answers, 
              and recommend resources for any skill gaps.
            </p>
            <button
              className="btn"
              onClick={() => setShowChat(true)}
            >
              Start Mock Interview →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}