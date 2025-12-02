'use client';
import MockInterview from '../../features/jobs/components/MockInterview';

export default function InterviewPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mock Interview</h1>
        <p className="text-sm opacity-70">
          Practice technical & behavioral rounds. This is an interactive prototype.
        </p>
      </header>
      <MockInterview />
    </div>
  );
}