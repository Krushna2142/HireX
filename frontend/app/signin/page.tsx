'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/credentials');
  }, [router]);

  return (
    <main className="page-gradient mx-auto max-w-7xl px-4 py-12 md:px-8">
      <p className="text-muted-foreground">Redirecting to login...</p>
    </main>
  );
}