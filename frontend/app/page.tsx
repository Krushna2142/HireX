'use client';

import Hero from '@/components/Hero';
import { Tile } from '@/components/dashboard/Tile';
import { Briefcase, FileText, Sparkles, Video } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="page-gradient">
      <Hero />
      
      {/* Features Section Placeholder */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <h2 className="text-2xl font-semibold text-foreground">AI-Powered Features</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          JobCrawler combines intelligent search, personalized recommendations, and AI tools to supercharge your job hunt.
        </p>
        
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            icon={<Briefcase className="h-5 w-5" />}
            title="Job Tracker"
            desc="Track applications and manage your job search pipeline"
            href="/dashboard"
          />
          <Tile
            icon={<FileText className="h-5 w-5" />}
            title="Resume Optimizer"
            desc="AI-powered resume analysis and optimization"
            href="/resume"
          />
          <Tile
            icon={<Sparkles className="h-5 w-5" />}
            title="Smart Recommendations"
            desc="Personalized job matches based on your profile"
            href="/recommendations"
          />
          <Tile
            icon={<Video className="h-5 w-5" />}
            title="Mock Interview"
            desc="Practice with AI interviewer and get instant feedback"
            href="/mock-interview"
          />
        </div>
      </section>
    </main>
  );
}