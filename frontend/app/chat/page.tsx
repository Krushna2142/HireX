/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { apiJson } from '@/lib/api/client';

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setReply(null); setLoading(true);
    try {
      const data = await apiJson<{ reply: string }>('/api/llm/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'web-1', message }),
      });
      setReply(data.reply);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Chat</h1>
      <form onSubmit={send} className="flex gap-2">
        <input className="border p-2 flex-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." />
        <button className="bg-blue-600 text-white px-4 rounded" disabled={loading} type="submit">{loading ? 'Sending...' : 'Send'}</button>
      </form>
      {error && <p className="text-red-600">{error}</p>}
      {reply && <div className="bg-gray-100 p-3 rounded"><b>Reply:</b> {reply}</div>}
    </main>
  );
}