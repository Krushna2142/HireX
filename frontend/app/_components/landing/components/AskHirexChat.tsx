import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageSquare, Minimize2, Send, Sparkles, X } from 'lucide-react';
import { getAskHirexReply } from '../utils/hirexLogic';

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  suggestions?: string[];
}

const SUGGESTED_QUESTIONS = [
  'What is HireX?',
  'How does ATS Checker work?',
  'How does AI Resume Analysis work?',
  'How can recruiters use HireX?',
  'What is Campus Hiring?',
];

export default function AskHirexChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Welcome to Ask HireX (Local Demo Assistant). Ask about AI Resume Analysis, ATS Checker, Smart Job Matching, Recruiter pipelines, or multi-branch Campus Hiring.',
      suggestions: SUGGESTED_QUESTIONS,
    },
  ]);

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const sendQuestion = (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    typingTimerRef.current = window.setTimeout(() => {
      const reply = getAskHirexReply(trimmed);
      const assistantMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: reply.answer,
        suggestions: reply.followUpSuggestions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 320);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {/* Floating Launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Ask HireX Demo Assistant"
          className="inline-flex h-12 items-center gap-2.5 rounded-xl border border-cyan-400/50 bg-[#0A1628] px-4 text-xs font-semibold text-white shadow-2xl transition-transform duration-200 hover:border-cyan-300 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-cyan-300 cursor-pointer"
        >
          <MessageSquare className="h-4 w-4 text-cyan-300" />
          <span>Ask HireX</span>
        </button>
      )}

      {/* Chat Panel (Bottom sheet on mobile, floating studio panel on desktop) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Ask HireX Demo Assistant"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 flex h-[78vh] max-h-[560px] flex-col overflow-hidden rounded-t-2xl border border-slate-700/90 bg-[#070D19] shadow-2xl sm:static sm:h-[520px] sm:w-[390px] sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0B1325] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <div>
                  <p className="font-display text-sm font-bold text-white">Ask HireX</p>
                  <p className="text-[11px] text-cyan-300/90">
                    Local Demo Assistant · Simulated Responses
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Minimize Ask HireX"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Ask HireX"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-cyan-400 font-medium text-slate-950'
                        : 'border border-slate-800 bg-[#0D172B] text-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((q) => (
                        <button
                          key={`${msg.id}-${q}`}
                          type="button"
                          onClick={() => sendQuestion(q)}
                          className="rounded-md border border-slate-700 bg-[#091120] px-2.5 py-1.5 text-left text-[11px] font-medium text-cyan-200 hover:border-cyan-400 cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-start">
                  <div
                    aria-label="Assistant typing"
                    className="rounded-xl border border-slate-800 bg-[#0D172B] px-3.5 py-2 text-xs text-cyan-300"
                  >
                    Analyzing demo response...
                  </div>
                </div>
              )}
              <div ref={listEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendQuestion(inputValue);
              }}
              className="flex items-center gap-2 border-t border-slate-800 bg-[#091120] p-3"
            >
              <label htmlFor="ask-hirex-input" className="sr-only">
                Ask HireX a question
              </label>
              <input
                id="ask-hirex-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about ATS, Resume AI, or Campus..."
                className="flex-1 rounded-lg border border-slate-700 bg-[#050A14] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Send question"
                disabled={!inputValue.trim() || isTyping}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400 text-slate-950 disabled:opacity-45 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
