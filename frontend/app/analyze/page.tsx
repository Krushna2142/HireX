'use client';

// ❌ Wrong — component doesn't exist at this path
// import ResumeUpload from '@/features/resume/components/ResumeUpload';

// ✅ Option 1 — redirect to the existing resume page
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AnalyzePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/resumes');
  }, [router]);

  return null;
}
