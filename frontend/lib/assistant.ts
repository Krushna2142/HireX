// frontend/lib/assistant.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function askHireX(question: string): Promise<{ reply: string }> {
  // Mock response for demo - replace with actual API call
  const responses: Record<string, string> = {
    'What is HireX?': 'HireX is an AI-powered recruitment platform that helps candidates find jobs and recruiters manage hiring pipelines efficiently.',
    'How does ATS Checker work?': 'Our ATS checker analyzes your resume against specific job descriptions, scoring you on required skills, semantic matching, and providing actionable suggestions.',
    'How can recruiters post jobs?': 'Recruiters can post jobs through our dashboard, set requirements, and our AI automatically matches and ranks candidates.',
    'What is Campus Hiring?': 'Campus Hiring lets companies run placement drives across multiple colleges with automated eligibility checks and bulk student management.',
    'How can colleges use HireX?': 'Colleges can manage placement cells, track student applications, and coordinate with recruiters for campus drives.',
    'How does AI Interview work?': 'Our AI conducts mock interviews, provides real-time feedback on responses, and helps candidates practice before actual interviews.',
  };

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const reply = responses[question] || `Great question! HireX provides comprehensive solutions for ${question.toLowerCase()}. Our platform uses AI to streamline the entire recruitment process.`;
  
  return { reply };
}