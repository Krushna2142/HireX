'use client';
import ResumeUpload from '@/features/resume/components/ResumeUpload';

export default function ResumePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Resume Intelligence</h1>
        <p className="text-sm opacity-70">
          Upload your resume (PDF) to extract skills & identify improvement opportunities.
        </p>
      </header>
      <ResumeUpload />
      <section className="rounded-xl border p-6 space-y-2">
        <h2 className="text-lg font-semibold">Next (planned)</h2>
        <ul className="list-disc pl-5 text-sm opacity-70 space-y-1">
          <li>Highlight missing high-demand keywords.</li>
          <li>Suggest bullet rewrites for clarity & impact.</li>
          <li>Cross-reference with desired roles skill graph.</li>
        </ul>
      </section>
    </div>
  );
}