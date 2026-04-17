'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { interviewApi } from '@/lib/axios';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';

export default function InterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const roomId =
    (params?.['room-id'] as string) ??
    (params?.roomId as string) ??
    '';

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      if (!user || !roomId) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        await interviewApi.getRoomAccess(roomId);

        const tokenRes = await interviewApi.getLivekitToken(roomId);
        if (!mounted) return;

        setToken(tokenRes.data.token);
        setServerUrl(tokenRes.data.url);
      } catch (e: any) {
        if (!mounted) return;
        setError(
          e?.response?.data?.message ??
            'Unable to join interview room. Link may be invalid or expired.',
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [roomId, user]);

  if (!user) return <div style={{ padding: 24 }}>Please login first.</div>;
  if (!roomId) return <div style={{ padding: 24 }}>Invalid room ID.</div>;
  if (loading) return <div style={{ padding: 24 }}>Preparing interview room...</div>;

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: '#f87171' }}>{error}</p>
        <button onClick={() => router.push('/interviews')}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video
        audio
        onDisconnected={() => {
          router.push(user.role === 'recruiter' ? '/recruiter/interviews' : '/interviews');
        }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}