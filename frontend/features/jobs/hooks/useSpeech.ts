/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event?: any) => void) | null;
  start(): void;
  stop(): void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;

  const w = window as Window & {
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(lang = 'en-US') {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();

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

export function useSpeechSynthesis(
  voiceMatcher: (v: SpeechSynthesisVoice) => boolean = (v) => v.lang.startsWith('en'),
) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    setSupported(true);

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());

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
    [supported, voices, voiceMatcher],
  );

  const cancel = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }, []);

  return { supported, voices, speak, cancel };
}