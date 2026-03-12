import { NextResponse } from 'next/server';
// frontend/app/api/mock-interview/route.ts
type Msg = { role: 'user' | 'assistant'; content: string };

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: Msg[] };
    const last = messages?.slice().reverse().find(m => m.role === 'user')?.content ?? '';
    const reply = generateMockReply(last, messages || []);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: 'Sorry, something went wrong. Please try again.' }, { status: 200 });
  }
}

function generateMockReply(lastUser: string, history: Msg[]): string {
  const lower = lastUser.toLowerCase();
  if (!lastUser.trim()) return 'To start, could you briefly introduce yourself and the role you are targeting?';
  if (/(strength|weakness)/i.test(lower)) return 'What is your greatest strength, and a key area you are improving?';
  if (/(project|recent)/i.test(lower)) return 'Tell me about a recent project, your role, and measurable impact.';
  if (/(conflict|challenge|difficult)/i.test(lower)) return 'Describe a difficult technical challenge and trade-offs.';
  if (/(optimi[sz]e|performance|scale)/i.test(lower)) return 'Walk me through a performance bottleneck you fixed.';
  if (/(frontend|react|next)/i.test(lower)) return 'How do you choose server vs client components in Next.js?';
  if (/(backend|api|database|sql|cache)/i.test(lower)) return 'Design a filterable, paginated API. Indexes/caching?';
  return 'Thanks. Add a concrete example with metrics (time, error rate, cost, throughput).';
}