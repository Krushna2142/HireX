'use client';
// frontend/components/assistant/AskHireX.tsx
// Floating "Ask HireX" product assistant. Session-only history, grounded backend (unchanged).
import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2, Sparkles, AlertTriangle, RotateCw } from 'lucide-react';
import { askHireX } from '@/lib/assistant';

type Msg = { id: number; role: 'user' | 'bot'; text: string; error?: boolean; retry?: string };

const WELCOME = "Hi! I'm HireX Assistant. Ask me anything about HireX, its features, recruitment workflows or campus hiring.";
const SUGGESTED = [
  'What is HireX?',
  'How does ATS Checker work?',
  'How can recruiters post jobs?',
  'What is Campus Hiring?',
  'How can colleges use HireX?',
  'How does AI Interview work?',
];

let seq = 0;
const nextId = () => ++seq;

function BotAvatar() {
  return (
    <span className="mr-2 mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 text-white">
      <Sparkles size={12} aria-hidden />
    </span>
  );
}

export default function AskHireX() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) setMessages([{ id: nextId(), role: 'bot', text: WELCOME }]);
  }, [open, messages.length]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, open]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(async (raw?: string, isRetry = false) => {
    const text = (raw ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setMessages((m) => {
      const base = isRetry ? m.filter((x) => !x.error) : m;
      return [...base, ...(isRetry ? [] : [{ id: nextId(), role: 'user' as const, text }])];
    });
    setSending(true);
    try {
      const res = await askHireX(text);
      setMessages((m) => [...m, { id: nextId(), role: 'bot', text: res.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: nextId(), role: 'bot', text: 'Sorry, I could not reach the HireX assistant right now. Please try again in a moment.', error: true, retry: text },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  return (
    <>
      <style>{`
        @keyframes hx-panel{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}
        @keyframes hx-ping{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.6);opacity:0}}
        @keyframes hx-msg{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .hx-panel{transform-origin:bottom right;animation:hx-panel .25s cubic-bezier(.2,.7,.2,1)}
        .hx-ping{animation:hx-ping 2.4s ease-out infinite}
        .hx-msg{animation:hx-msg .25s ease both}
        @media (prefers-reduced-motion:reduce){.hx-panel,.hx-ping,.hx-msg{animation:none}}
      `}</style>

      <button
        type="button"
        aria-label={open ? 'Close HireX assistant' : 'Open HireX assistant'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[95] grid h-14 w-14 cursor-pointer place-items-center rounded-2xl border border-sky-400/40 bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-[0_16px_40px_rgba(56,189,248,0.35)] transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
      >
        {!open && <span aria-hidden className="hx-ping absolute inset-0 rounded-2xl border border-sky-400/60" />}
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#34D399]" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Ask HireX assistant"
          className={`hx-panel fixed z-[96] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1020]/95 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl
            max-sm:inset-x-3 max-sm:bottom-24 max-sm:h-[70vh]
            sm:bottom-24 sm:right-5 ${expanded ? 'sm:h-[76vh] sm:w-[520px]' : 'sm:h-[560px] sm:w-[380px]'}`}
        >
          <div className="relative flex items-center gap-3 border-b border-white/10 bg-[#0D1424] px-4 py-3">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-white"><Sparkles size={16} /></span>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-100">Ask HireX</p>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Product assistant · online</p>
            </div>
            <button type="button" aria-label={expanded ? 'Minimize panel' : 'Expand panel'} onClick={() => setExpanded((v) => !v)}
              className="hidden cursor-pointer rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 sm:grid">
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)}
              className="cursor-pointer rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
              <X size={14} />
            </button>
          </div>

          <div ref={listRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`hx-msg flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'bot' && <BotAvatar />}
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed
                  ${m.role === 'user' ? 'rounded-br-sm bg-gradient-to-br from-sky-500 to-sky-600 text-white'
                    : m.error ? 'rounded-bl-sm border border-amber-400/30 bg-amber-400/10 text-amber-200'
                    : 'rounded-bl-sm border border-white/10 bg-white/5 text-slate-200'}`}>
                  {m.error && <AlertTriangle size={13} className="mb-0.5 mr-1 inline" aria-hidden />}
                  {m.text}
                  {m.retry && (
                    <button type="button" onClick={() => void send(m.retry, true)} disabled={sending}
                      className="mt-2 flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/40 px-2.5 py-1 text-[11px] font-bold text-amber-100 transition hover:bg-amber-400/15 disabled:opacity-40">
                      <RotateCw size={11} aria-hidden /> Try again
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start" role="status" aria-label="HireX assistant is typing">
                <BotAvatar />
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3">
                  {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400" style={{ animationDelay: `${i * 120}ms` }} />)}
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && !sending && (
            <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
              {SUGGESTED.map((s) => (
                <button key={s} type="button" onClick={() => void send(s)}
                  className="cursor-pointer rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-[11px] font-semibold text-sky-300 transition hover:-translate-y-px hover:bg-sky-400/20 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-center gap-2 border-t border-white/10 bg-[#0D1424] px-3 py-3">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={500}
              placeholder="Ask about features, workflows, campus hiring…" aria-label="Message HireX assistant"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-slate-100 transition placeholder:text-slate-500 focus:border-sky-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-sky-400/20" />
            <button type="submit" disabled={sending || !input.trim()} aria-label="Send message"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl bg-sky-500 text-white transition hover:bg-sky-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}