'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Recognition = typeof window extends any
  ? (window as any).webkitSpeechRecognition | SpeechRecognition | undefined
  : undefined;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export function useSpeechRecognition(lang = 'en-US') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<Recognition>();

  useEffect(() => {
    const Ctor = window?.webkitSpeechRecognition || (window as any)?.SpeechRecognition;
    if (Ctor) {
      setSupported(true);
      const rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = lang;
      recognitionRef.current = rec;
    } else {
      setSupported(false);
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

export function useSpeechSynthesis(voiceMatcher: (v: SpeechSynthesisVoice) => boolean = v =>
  v.lang.startsWith('en')) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);

    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
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
        utteranceRef.current = u;
        window.speechSynthesis.speak(u);
      } catch {}
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