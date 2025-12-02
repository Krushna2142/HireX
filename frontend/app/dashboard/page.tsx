'use client';
import Link from 'next/link';
import { ArrowRight, Brain, FileText, MessageSquare, Search } from 'lucide-react';

export default function Landing() {
  const features = [
    {
      title: 'Smart Recommendations',
      icon: <Search size={20} />,
      description: 'Skills + semantic matching to surface high-fit roles.',
      href: '/recommendations'
    },
    {
      title: 'Resume Intelligence',
      icon: <FileText size={20} />,
      description: 'Parse, extract gaps & skill coverage (upload PDF).',
      href: '/resume'
    },
    {
      title: 'Mock Interview',
      icon: <MessageSquare size={20} />,
      description: 'Adaptive multi-round Q/A engine (coming soon).',
      href: '/interview'
    },
    {
      title: 'Skill Graph',
      icon: <Brain size={20} />,
      description: 'Visualize connections & missing clusters.',
      href: '/recommendations'
    }
  ];
  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Accelerate Your Job Search with Intelligence
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed opacity-80">
          Central hub for tailored job recommendations, resume insights, mock interviews and skill
          gap analysis. Start with uploading your resume or exploring recommended roles.
        </p>
        <div className="flex gap-4">
          <Link
            href="/recommendations"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-500"
          >
            Explore Recommendations <ArrowRight size={16} />
          </Link>
          <Link
            href="/resume"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 px-5 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
          >
            Upload Resume
          </Link>
        </div>
      </section>
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(f => (
          <Link
            key={f.title}
            href={f.href}
            className="group relative rounded-xl border bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:shadow-md dark:bg-neutral-900/70 dark:ring-white/10"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-indigo-600/10 p-2 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                {f.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs opacity-70">{f.description}</p>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[2px] scale-x-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition group-hover:scale-x-100" />
          </Link>
        ))}
      </section>
    </div>
  );
}