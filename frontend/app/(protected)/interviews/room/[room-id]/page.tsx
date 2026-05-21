'use client';

import { useParams } from 'next/navigation';
import HireXInterviewRoom from '@/components/interviews/HireXInterviewRoom';

export default function InterviewRoomPage() {
  const params = useParams<{ 'room-id': string }>();
  const roomId = params?.['room-id'];

  if (!roomId) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#020617',
          color: '#F8FAFC',
          fontFamily: "'Sora', sans-serif",
        }}
      >
        Invalid interview room.
      </div>
    );
  }

  return <HireXInterviewRoom roomId={roomId} />;
}