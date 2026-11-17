// frontend/app/terms/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service · HireX' };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-slate-300 md:px-8" style={{ fontFamily: "'Sora', sans-serif", background: '#070B14', minHeight: '100vh' }}>
      <h1 className="text-3xl font-extrabold text-slate-50">Terms of Service</h1>
      <p className="mt-3 text-sm text-slate-500">The rules for using HireX, in plain language.</p>
      {[
        ['Your account', 'One person per account. Keep credentials confidential; you are responsible for activity under your account.'],
        ['Acceptable use', 'Do not upload misleading resumes, attempt to manipulate ATS scoring (hidden text, prompt injection), or scrape the platform. Integrity violations may limit your scores or access.'],
        ['Content', 'You own your resume and job content. You grant HireX the licence needed to analyse, display and match it within the product.'],
        ['Recruitment outcomes', 'HireX provides tooling and scores as decision support. Hiring and placement decisions remain the responsibility of recruiters and colleges.'],
        ['Availability', 'The service is provided as-is; we may update or restrict features with reasonable notice.'],
      ].map(([h, b]) => (
        <section key={h} className="mt-8">
          <h2 className="text-lg font-bold text-slate-100">{h}</h2>
          <p className="mt-2 text-sm leading-relaxed">{b}</p>
        </section>
      ))}
      <a href="/" className="mt-10 inline-block text-sm font-bold text-sky-400">← Back to home</a>
    </main>
  );
}