'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/TextArea';
import { ArrowUpCircle, MessageSquare } from 'lucide-react';
// frontend/features/jobs/components/MockInterview.tsx
interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export default function MockInterview() {
  const [turns, setTurns] = useState<ChatTurn[]>([
    { role: 'system', content: 'Welcome to the mock interview. Ask for a question to begin.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  function send() {
    if (!input.trim()) return;
    setTurns(t => [...t, { role: 'user', content: input.trim() }]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      setTurns(t => [
        ...t,
        {
          role: 'assistant',
          content:
            'Here is a generated follow-up question (placeholder). Explain the time complexity of your solution.'
        }
      ]);
      setLoading(false);
    }, 1000);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare size={18} /> Interview Session
        </div>
        <div className="mt-4 space-y-4 max-h-[360px] overflow-y-auto pr-2">
          {turns.map((t, i) => (
            <div
              key={i}
              className={`rounded-md px-3 py-2 text-sm ${
                t.role === 'assistant'
                  ? 'bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                  : t.role === 'user'
                  ? 'bg-black/5 dark:bg-white/10'
                  : 'opacity-70 italic'
              }`}
            >
              <strong className="capitalize">{t.role}:</strong> {t.content}
            </div>
          ))}
          {loading && (
            <div className="animate-pulse rounded-md bg-indigo-600/10 px-3 py-2 text-sm text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
              Assistant is thinking…
            </div>
          )}
        </div>
        <div className="mt-5 space-y-3">
          <Textarea
            rows={3}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your answer or ask for the next question..."
          />
          <div className="flex gap-3">
            <Button onClick={send} disabled={loading}>
              Send <ArrowUpCircle size={16} className="ml-1" />
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setTurns([
                  { role: 'system', content: 'Session restarted. Ask for a question to begin.' }
                ])
              }
            >
              Reset Session
            </Button>
          </div>
        </div>
      </div>
      <div className="rounded-xl border p-6 space-y-2 text-sm">
        <h3 className="text-base font-semibold">Upcoming Features</h3>
        <ul className="list-disc pl-5 space-y-1 opacity-70">
          <li>Adaptive difficulty based on your answers.</li>
          <li>Behavioral vs technical round switching.</li>
          <li>Answer quality grading & score history.</li>
        </ul>
      </div>
    </div>
  );
}
