/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { getFirebaseFirestore } from '@/lib/firebase/Client';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/components/providers/AuthProvider';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: any;
};

export default function ChatRoomPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let unsub: () => void;

    async function init() {
      try {
        const db = getFirebaseFirestore();
        const q = query(
          collection(db, 'rooms', 'mock-interview', 'messages'),
          orderBy('createdAt', 'asc')
        );

        unsub = onSnapshot(q, (snap) => {
          const list: Message[] = snap.docs.map((d) => {
            const data = d.data() as Omit<Message, 'id'>;
            return { id: d.id, ...data };
          });

          setMessages(list);
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
          });
        });
      } catch (err) {
        console.error('Chat init error:', err);
      }
    }

    init();
    return () => unsub?.();
  }, []);

  async function sendMessage() {
    if (!input.trim()) return;

    try {
      const db = getFirebaseFirestore();
      await addDoc(collection(db, 'rooms', 'mock-interview', 'messages'), {
        role: 'user',
        content: input.trim(),
        createdAt: serverTimestamp(),
        sender: {
          uid: user?.uid ?? null,
          name: user?.displayName ?? user?.email ?? 'Guest',
        },
      });
      setInput('');
    } catch (err) {
      console.error('Send message error:', err);
    }
  }

  return (
    <main className="page-gradient mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Live Interview Chat</h1>

      <div
        ref={scrollRef}
        className="mt-4 mb-4 max-h-[60vh] space-y-3 overflow-auto rounded-lg border border-border bg-card p-4"
      >
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className="inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm"
              style={{
                background:
                  m.role === 'user' ? 'rgba(99,102,241,0.08)' : undefined,
              }}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {m.createdAt?.toDate
                  ? m.createdAt.toDate().toLocaleTimeString()
                  : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Type your answer..."
        />
        <button
          onClick={sendMessage}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          Send
        </button>
      </div>
    </main>
  );
}
