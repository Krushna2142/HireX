'use client';

import React, { useState } from 'react';

export interface MockQuestion {
  question: string;
  hints: string[];
  idealAnswerPoints: string[];
}

export const MockInterviewQA: React.FC<{
  question: MockQuestion;
  onAnswerSubmit: (answer: string) => void;
  isLoading?: boolean;
}> = ({ question, onAnswerSubmit, isLoading = false }) => {
  const [answer, setAnswer] = useState('');
  const [showHints, setShowHints] = useState(false);

  const handleSubmit = () => {
    if (answer.trim()) {
      onAnswerSubmit(answer);
      setAnswer('');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">{question.question}</h2>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
        disabled={isLoading}
        className="w-full h-32 p-3 bg-slate-800 text-white rounded border border-slate-700 focus:border-blue-500"
      />

      {showHints && (
        <div className="bg-blue-900/20 border border-blue-700 p-3 rounded">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Hints:</h3>
          <ul className="space-y-1">
            {question.hints.map((hint, i) => (
              <li key={i} className="text-sm text-blue-200">
                • {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setShowHints(!showHints)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
        >
          {showHints ? 'Hide Hints' : 'Show Hints'}
        </button>

        <button
          onClick={handleSubmit}
          disabled={isLoading || !answer.trim()}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold disabled:opacity-50"
        >
          {isLoading ? 'Evaluating...' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
};