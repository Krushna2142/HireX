/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/features/jobs/types/speech.d.ts
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export {};