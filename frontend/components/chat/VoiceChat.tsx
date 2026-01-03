/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';

// Minimal speech recognition shape we actually use at runtime.
// No global augmentations to avoid conflicts.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult?: ((event: any) => void) | null;
  onend?: (() => void) | null;
  onerror?: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function useSpeechRecognition(lang = 'en-US') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const win: any = typeof window !== 'undefined' ? window : undefined;
    const ctor: SpeechRecognitionCtor | undefined = win?.webkitSpeechRecognition ?? win?.SpeechRecognition;

    if (ctor) {
      setSupported(true);
      const rec = new ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = lang;
      recognitionRef.current = rec;
    } else {
      setSupported(false);
      recognitionRef.current = null;
    }
  }, [lang]);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || listening) return;
    setTranscript('');
    try {
      rec.onresult = (e: any) => {
        let txt = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          txt += e.results[i][0].transcript;
        }
        setTranscript(txt.trim());
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setListening(false);
  }, []);

  return { supported, listening, transcript, start, stop, setTranscript };
}

export default function VoiceChat() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Welcome to the mock interview. Press the mic or type and hit send.' },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const asr = useSpeechRecognition('en-US');

  useEffect(() => {
    if (!asr.listening && asr.transcript) setInput(asr.transcript);
  }, [asr.listening, asr.transcript]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  async function sendUser(text: string) {
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [...prev, { role: 'user', content: value }]);
    setInput('');
    setPending(true);
    try {
      const res = await fetch('/api/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: value }] }),
      });
      const data = await res.json();
      const reply = (data?.reply as string) || 'Thanks, could you elaborate on that?';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network issue. Please try again.' }]);
    } finally {
      setPending(false);
    }
  }

  const disabled = pending || asr.listening;

  return (
    <div className="mx-auto grid h-[calc(100vh-12rem)] max-w-5xl grid-rows-[1fr_auto] rounded-xl border border-border bg-card/70 backdrop-blur">
      <div ref={listRef} className="grid gap-4 overflow-auto p-4">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} text={m.content} />
        ))}
        {pending && <Bubble role="assistant" text="Typing…" subtle />}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <button
          className={[
            'inline-flex h-10 w-10 items-center justify-center rounded-md border transition',
            asr.listening ? 'border-red-500/50 bg-red-500/10 text-red-600' : 'hover:bg-muted',
          ].join(' ')}
          onClick={() => (asr.listening ? asr.stop() : asr.start())}
          title={asr.listening ? 'Stop listening' : 'Start listening'}
          aria-label="Toggle microphone"
        >
          {asr.listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendUser(input);
            }
          }}
          placeholder={asr.supported ? 'Speak or type your answer…' : 'Type your answer…'}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-border focus:ring-0"
        />

        <button
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-3 text-sm hover:bg-muted disabled:opacity-50"
          onClick={() => sendUser(input)}
          disabled={disabled && !input}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function Bubble({ role, text, subtle = false }: { role: 'user' | 'assistant'; text: string; subtle?: boolean }) {
  const user = role === 'user';
  return (
    <div className={['flex', user ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
          user
            ? 'rounded-br-sm bg-primary/10 text-primary'
            : 'rounded-bl-sm bg-card text-card-foreground border border-border',
          subtle && 'opacity-70',
        ].join(' ')}
      >
        {text}
      </div>
    </div>
  );
}