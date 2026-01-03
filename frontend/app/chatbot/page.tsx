'use client';

import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hi! Ask me about roles, skills, or resumes.' },
  ]);
  const [input, setInput] = useState('');

  const send = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      role: 'user',
      text: input.trim(),
    };

    setMessages((m) => [...m, userMsg]);
    setInput('');

    // Replace with your API call
    const reply: Message = {
      role: 'assistant',
      text: 'Thanks! I will analyze that.',
    };

    setMessages((m) => [...m, reply]);
  };

  return (
    <section className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 card p-6">
        <div className="section-header">
          <h1 className="text-3xl font-bold">Chatbot</h1>
        </div>

        <div className="panel p-4 h-[420px] overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 ${
                m.role === 'user'
                  ? 'text-white'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <span className="font-semibold">
                {m.role === 'user' ? 'You' : 'Assistant'}:
              </span>{' '}
              {m.text}
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <input
            className="px-3 py-2 flex-1"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="btn" onClick={send}>
            Send
          </button>
        </div>
      </div>

      <aside className="panel p-6">
        <div className="section-header">
          <h2 className="text-xl font-bold">Shortcuts</h2>
        </div>
        <ul className="space-y-2 text-sm">
          <li>
            <button className="btn btn-secondary w-full">
              Recommend roles
            </button>
          </li>
          <li>
            <button className="btn btn-secondary w-full">
              Find missing skills
            </button>
          </li>
          <li>
            <button className="btn btn-secondary w-full">
              Suggest learning paths
            </button>
          </li>
        </ul>
      </aside>
    </section>
  );
}
