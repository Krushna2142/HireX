/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';// frontend/features/jobs/hooks/useSpeech.ts

import { useCallback, useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------
   Global declarations for Web Speech API (TypeScript fix)
------------------------------------------------------- */
declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

/* -------------------------------------------------------
   Speech Recognition Hook
------------------------------------------------------- */
export function useSpeechRecognition(lang = 'en-US') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const Ctor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Ctor) {
      setSupported(false);
      recognitionRef.current = null;
      return;
    }

    setSupported(true);
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;

    recognitionRef.current = rec;
  }, [lang]);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || listening) return;

    setTranscript('');

    rec.onresult = (e: any) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    try {
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

/* -------------------------------------------------------
   Speech Synthesis Hook
------------------------------------------------------- */
export function useSpeechSynthesis(
  voiceMatcher: (v: SpeechSynthesisVoice) => boolean = (v) =>
    v.lang.startsWith('en')
) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    setSupported(true);

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;

      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voice = voices.find(voiceMatcher) || voices[0];
        if (voice) utterance.voice = voice;

        utterance.rate = 1;
        utterance.pitch = 1;

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
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
