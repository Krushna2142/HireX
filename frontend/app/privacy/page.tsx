// frontend/app/privacy/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy · HireX' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-slate-300 md:px-8" style={{ fontFamily: "'Sora', sans-serif", background: '#070B14', minHeight: '100vh' }}>
      <h1 className="text-3xl font-extrabold text-slate-50">Privacy Policy</h1>
      <p className="mt-3 text-sm text-slate-500">Summary of how HireX handles data. Questions? Sign in and use in-app support.</p>
      {[
        ['Account data', 'We store the name, email and role you register with, plus session and security logs needed to protect your account.'],
        ['Resumes', 'Uploaded resumes are stored in private storage and accessed only via short-lived signed URLs by you and recruiters you apply to.'],
        ['Analysis', 'Resume text is processed to generate skills, scores and recommendations shown in your workspace.'],
        ['Notifications', 'Product notifications are delivered in-app. Account emails (verification, password reset) are sent to your registered address.'],
        ['Your controls', 'You can update profile visibility, delete saved items and sign out of sessions at any time from Settings.'],
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