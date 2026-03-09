'use client';

import { createClient } from '@supabase/supabase-js';
import { Loader2, LogOut, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import CredentialsModal from './CredentialsModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignInButton() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <button className="px-4 py-2 text-sm bg-gray-100 rounded-md">
        <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
        Loading...
      </button>
    );
  }

  if (session) {
    return (
      <button
        className="px-4 py-2 text-sm bg-gray-100 rounded-md"
        onClick={async () => {
          await supabase.auth.signOut();
        }}
      >
        <LogOut className="w-4 h-4 inline mr-2" />
        Sign Out
      </button>
    );
  }

  return (
    <>
      <button
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        onClick={() => setOpen(true)}
      >
        <LogIn className="w-4 h-4 inline mr-2" />
        Sign In
      </button>

      <CredentialsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}