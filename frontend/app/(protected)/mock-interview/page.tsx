export default function MockInterviewPage() {
  return (
   <section className="px-4 sm:px-6 lg:px-8">
      <div className="section-header">
        <h1 className="text-3xl font-bold">Mock Interview</h1>
      </div>
      <div className="card p-6">
        <p className="text-[var(--text-muted)]">Practice with AI-driven questions and get feedback.</p>
        <div className="mt-4 flex gap-3">
          <button className="btn">Start Session</button>
          <button className="btn btn-secondary">Browse Question Bank</button>
        </div>
      </div>
    </section>
  );
}