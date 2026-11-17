'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import CredentialsModal from '@/components/auth/CredentialsModal';
import { roleRedirectPath } from '@/lib/auth';

// Import New Landing Components
import Navbar from '@/app/_components/landing/components/Navbar';
import HeroSection from '@/app/_components/landing/components/HeroSection';
import ScrollStoryChapters from '@/app/_components/landing/components/ScrollStoryChapters';
import CampusHiringShowcase from '@/app/_components/landing/components/CampusHiringShowcase';
import ModuleScrollSpine from '@/app/_components/landing/components/ModuleScrollSpine';
import SolutionsAndWorkflow from '@/app/_components/landing/components/SolutionsAndWorkflow';
import FaqAndFinalCta from '@/app/_components/landing/components/FaqAndFinalCta';
import AskHirexChat from '@/app/_components/landing/components/AskHirexChat';

function SearchParamsHandler({ onAuthParam }: { onAuthParam: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      onAuthParam();
      router.replace('/'); 
    }
  }, [searchParams, onAuthParam, router]);
  return null;
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const storyTrackRef = useRef<HTMLDivElement | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.replace(roleRedirectPath(user.role));
    }
  }, [user, loading, router]);

  if (!loading && user) return null;

  // This triggers your OLD Role Selection / Login / Register Modal
  const handleOpenGetStarted = () => setModalOpen(true);

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsHandler onAuthParam={handleOpenGetStarted} />
      </Suspense>

      {/* Landing Page Root Wrapper */}
      <div className="landing-root min-h-screen bg-[#04070D] text-slate-100" style={{ fontFamily: 'var(--font-landing-sans)' }}>
        <Navbar onOpenGetStarted={handleOpenGetStarted} />
        
        <main>
          <HeroSection onOpenGetStarted={handleOpenGetStarted} />
          
          <div id="module-story-track" ref={storyTrackRef} className="relative">
            <ModuleScrollSpine trackRef={storyTrackRef} />
            <ScrollStoryChapters />
            <CampusHiringShowcase />
          </div>
          
          <SolutionsAndWorkflow onOpenGetStarted={handleOpenGetStarted} />
          <FaqAndFinalCta onOpenGetStarted={handleOpenGetStarted} />
        </main>
        
        <AskHirexChat />
      </div>

      {/* YOUR EXISTING AUTH MODAL (Role Selection -> Login/Register) */}
      <CredentialsModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}