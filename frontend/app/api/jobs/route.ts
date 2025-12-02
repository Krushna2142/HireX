import { NextResponse } from 'next/server';

export async function GET() {
  // Mock data until backend is implemented
  return NextResponse.json([
    {
      id: 'j1',
      title: 'Senior Backend Engineer',
      company: 'ExampleCorp',
      location: 'Remote',
      skills: ['python', 'postgres', 'docker'],
      postedAt: new Date().toISOString()
    },
    {
      id: 'j2',
      title: 'ML Engineer',
      company: 'AI Labs',
      location: 'Berlin, DE',
      skills: ['python', 'transformers', 'kubernetes'],
      postedAt: new Date().toISOString()
    }
  ]);
}