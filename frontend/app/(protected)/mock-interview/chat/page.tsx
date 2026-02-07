/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
export const dynamic = 'force-dynamic';

import { useRef, useState } from 'react';
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

  async function sendMessage() {
    if (!input.trim()) return;

    // Auth-only placeholder: local echo
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
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
                {m.createdAt
                  ? new Date(m.createdAt).toLocaleTimeString()
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
          className="flex-1 rounded border px-3 py-2"
          placeholder={user ? 'Type a message...' : 'Login to chat'}
          disabled={!user}
        />
        <button
          onClick={sendMessage}
          className="rounded bg-primary px-4 py-2 text-white"
          disabled={!user}
        >
          Send
        </button>
      </div>
    </main>
  );
}