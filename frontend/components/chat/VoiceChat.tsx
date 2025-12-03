/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

/* Fully typed, error-free VoiceChat component with voice in/out.
   - Works without extra deps using Web Speech APIs (best on Chromium).
   - Gracefully falls back to typing when recognition is unsupported.
   - Uses token-based Tailwind classes (border-border, bg-card, etc.).
*/

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { Button } from '../ui/Button';

/* ============================================================================
   Types and safe globals for SpeechRecognition / SpeechSynthesis (TS-friendly)
   ========================================================================== */

// A safe union type that avoids referencing bare SpeechRecognition,
// which may not be in your TS lib setup.
type AnySpeechRecognition =
  | (Window & typeof globalThis)['webkitSpeechRecognition']
  | (Window & typeof globalThis)['SpeechRecognition']
  | undefined;

declare global {
  interface Window {
    // Chromium typically exposes this
    webkitSpeechRecognition?: any;
    // Some browsers expose the standard name
    SpeechRecognition?: any;
  }
}

/* ============================================================================
   Hooks: Speech Recognition and Speech Synthesis
   ========================================================================== */

function useSpeechRecognition(lang = 'en-US') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<AnySpeechRecognition | undefined>(undefined);

  useEffect(() => {
    // Detect either vendor or standard constructor safely
    const ctor =
      (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) ||
      (typeof window !== 'undefined' && (window as any).SpeechRecognition);

    if (ctor) {
      setSupported(true);
      const rec = new ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = lang;
      recognitionRef.current = rec;
    } else {
      setSupported(false);
      recognitionRef.current = undefined;
    }
  }, [lang]);

  const start = useCallback(() => {
    const rec: any = recognitionRef.current;
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
    const rec: any = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setListening(false);
  }, []);

  return { supported, listening, transcript, start, stop, setTranscript };
}

function useSpeechSynthesis(
  voiceMatcher: (v: SpeechSynthesisVoice) => boolean = (v) => v.lang.startsWith('en')
) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);

    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    // Some browsers populate voices asynchronously
    window.speechSynthesis.onvoiceschanged = load;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const voice = voices.find(voiceMatcher) || voices[0];
        if (voice) u.voice = voice;
        u.rate = 1.0;
        u.pitch = 1.0;
        window.speechSynthesis.speak(u);
      } catch {
        // swallow synthesis errors
      }
    },
    [supported, voices, voiceMatcher]
  );

  const cancel = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }, []);

  return { supported, voices, speak, cancel };
}

/* ============================================================================
   Types for messages
   ========================================================================== */
type Msg = { role: 'user' | 'assistant'; content: string };

/* ============================================================================
   Component
   ========================================================================== */
export default function VoiceChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Welcome to JobCrawler mock interview. Press the mic, answer questions, and I will follow up like a real interviewer. Ready?',
    },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Speech hooks
  const asr = useSpeechRecognition('en-US');
  const tts = useSpeechSynthesis((v) => v.lang.startsWith('en') && /Female|Google UK English Female/i.test(v.name));

  // Put recognized speech into the input when listening ends
  useEffect(() => {
    if (!asr.listening && asr.transcript) {
      setInput(asr.transcript);
    }
  }, [asr.listening, asr.transcript]);

  // Auto-scroll the message list
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
      tts.speak(reply);
    } catch {
      const fallback = 'Network issue. Please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: fallback }]);
    } finally {
      setPending(false);
    }
  }

  const disabled = pending || asr.listening;

  return (
    <div className="mx-auto grid h-[calc(100vh-8rem)] max-w-5xl grid-rows-[1fr_auto] rounded-xl border border-border bg-card/70 backdrop-blur">
      {/* Messages */}
      <div ref={listRef} className="scrollable grid gap-4 overflow-auto p-4">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} text={m.content} />
        ))}
        {pending && <Bubble role="assistant" text="Typing…" subtle />}
      </div>

      {/* Composer */}
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

        <Button
          variant="outline"
          className="h-10 px-3"
          onClick={() => sendUser(input)}
          disabled={disabled && !input}
          aria-label="Send message"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}

/* ============================================================================
   Bubble
   ========================================================================== */
function Bubble({
  role,
  text,
  subtle = false,
}: {
  role: 'user' | 'assistant';
  text: string;
  subtle?: boolean;
}) {
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