/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { getFirebaseFirestore } from '@/lib/firebase/Client';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  DocumentData,
} from 'firebase/firestore';
import { useAuth } from '../../components/providers/AuthProvider';

type Job = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  createdAt?: any;
  createdBy?: string | null;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;

    async function init() {
      try {
        const db = getFirebaseFirestore();
        const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
        unsub = onSnapshot(
          q,
          (snapshot) => {
            if (!mounted) return;
            const list: Job[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as DocumentData),
            }));
            setJobs(list);
            setLoading(false);
          },
          (err) => {
            console.error('Jobs snapshot error:', err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Jobs init error:', err);
        setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  async function addTestJob() {
    try {
      const db = getFirebaseFirestore();
      await addDoc(collection(db, 'jobs'), {
        title: 'Test Job ' + new Date().toLocaleTimeString(),
        company: 'Acme Inc',
        location: 'Remote',
        createdAt: serverTimestamp(),
        createdBy: user?.uid ?? null,
      });
    } catch (err) {
      console.error('Add job error:', err);
    }
  }

  return (
    <main className="page-gradient mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Live Job Feed</h1>
        <div className="flex gap-2">
          <button onClick={addTestJob} className="rounded-md border border-border px-3 py-2">
            Add Test Job
          </button>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="text-muted-foreground">No jobs yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((j) => (
              <div key={j.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="text-base font-semibold text-card-foreground">{j.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{j.company} • {j.location}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Posted: {j.createdAt?.toDate ? j.createdAt.toDate().toLocaleString() : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}