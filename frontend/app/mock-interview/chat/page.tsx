'use client';

import dynamic from 'next/dynamic';
const VoiceChat = dynamic(() => import('../../../components/chat/VoiceChat'), { ssr: false });

export default function VoiceInterviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <h1 className="mb-4 text-lg font-semibold">Interview Chat</h1>
      <VoiceChat />
    </main>
  );
}