import ResumeUpload from '@/features/resume/components/ResumeUpload';

export default function AnalyzePage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Resume Analysis</h1>
      <ResumeUpload />
    </main>
  );
}