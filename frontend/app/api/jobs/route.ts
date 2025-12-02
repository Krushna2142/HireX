import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: 'j1',
      title: 'Senior Backend Engineer',
      company: 'ExampleCorp',
      location: 'Remote',
      skills: ['python', 'postgres', 'docker']
    },
    {
      id: 'j2',
      title: 'ML Engineer',
      company: 'AI Labs',
      location: 'Berlin, DE',
      skills: ['python', 'transformers', 'kubernetes']
    },
    {
      id: 'j3',
      title: 'Platform Engineer',
      company: 'InfraWorks',
      location: 'Austin, TX',
      skills: ['golang', 'aws', 'terraform']
    }
  ]);
}