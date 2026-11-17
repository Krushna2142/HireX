// ts-api/src/assistant/assistant.knowledge.ts
// Server-side, verified product knowledge. Single source of truth for the
// public "Ask HireX" assistant. Never add unverified claims here.

export interface KnowledgeEntry {
  id: string;
  topic: string;
  keywords: string[];
  answer: string;
}

export const ASSISTANT_FALLBACK =
  "I don't have verified information about that yet. Please contact HireX support.";

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'overview',
    topic: 'What is HireX',
    keywords: ['what is hirex', 'about hirex', 'overview', 'platform', 'what does hirex do', 'introduce'],
    answer:
      'HireX is an AI-powered recruitment and campus hiring platform. It connects resume analysis, ATS screening, smart job matching, application tracking, real-time interviews and college placement workflows in one product for candidates, recruiters and colleges.',
  },
  {
    id: 'candidates',
    topic: 'Candidate features',
    keywords: ['candidate', 'job seeker', 'student', 'for me', 'apply', 'my resume', 'profile'],
    answer:
      'Candidates can create a profile, upload a PDF/DOCX resume for AI analysis, browse a unified job feed (company posts plus synced Google/LinkedIn/Indeed roles), get resume-specific job recommendations with matched/missing skills, apply, track every application through the hiring pipeline and join scheduled interviews.',
  },
  {
    id: 'recruiters',
    topic: 'Recruiter features',
    keywords: ['recruiter', 'employer', 'company', 'hire', 'post job', 'posting', 'vacancy'],
    answer:
      'Recruiters can post jobs, receive applications, run bulk ATS screening against the exact job description, auto-shortlist against vacancies, move candidates through a transparent pipeline, schedule multi-round interviews, join a real-time video room with chat and screen-share, and submit structured 1–5 score feedback.',
  },
  {
    id: 'ats',
    topic: 'ATS Checker',
    keywords: ['ats', 'ats checker', 'ats score', 'screening', 'shortlist score', 'resume score'],
    answer:
      'The ATS Checker scores a resume against one specific job description: required-skill match, semantic fit, experience relevance, role-title and section completeness. It also runs a resume integrity scan (hidden text, invisible unicode, prompt injection, keyword stuffing) and caps the score when manipulation is detected, so recruiters always see why a score was given.',
  },
  {
    id: 'resume-analysis',
    topic: 'AI Resume Analysis',
    keywords: ['resume analysis', 'analyse resume', 'analyze resume', 'resume upload', 'parse', 'skills extraction'],
    answer:
      'Upload a PDF, DOCX or DOC resume and HireX extracts the text, detects skills, projects, education, certifications and experience level/years, then returns an ATS-style score with strengths, gaps and improvement tips. The analysis also powers your profile and job recommendations.',
  },
  {
    id: 'matching',
    topic: 'Smart Job Matching',
    keywords: ['match', 'matching', 'recommendation', 'recommended jobs', 'job suggestions'],
    answer:
      'Recommendations are ranked per selected resume using the ATS score for that job plus skill overlap, role family, industry and experience signals. Every recommendation shows matched skills, missing skills and a plain-language reason.',
  },
  {
    id: 'tracking',
    topic: 'Application tracking',
    keywords: ['track', 'tracking', 'application status', 'pipeline', 'where is my application'],
    answer:
      'Every application has its own timeline: applied, ATS checked, shortlisted, interview scheduled/in progress/passed, offer, hired — or rejected/on hold. Candidates see status changes in their dashboard and alerts; recruiters see the same pipeline per job with candidate-level flow tracking.',
  },
  {
    id: 'interviews',
    topic: 'Interview module',
    keywords: ['interview', 'interviews', 'video', 'room', 'rounds', 'schedule interview', 'mock'],
    answer:
      'Recruiters schedule rounds (technical/HR/managerial/assignment) which generate a secure room link. The room is real-time WebRTC with video, audio, chat, screen-share, a recording indicator and live transcript capture. Afterwards recruiters submit structured score feedback, and candidates can also run AI mock interview sessions for practice.',
  },
  {
    id: 'campus',
    topic: 'Campus Hiring',
    keywords: ['campus', 'campus hiring', 'college', 'placement', 'tpo', 'drive', 'university'],
    answer:
      'Campus Hiring is built into HireX, not a separate product. Recruiters publish campus drives to selected colleges with branch-wise eligibility rules (CGPA, backlogs, graduation year, custom criteria). College placement cells see only drives shared with them, check student eligibility with explained reasons, import students in bulk, track rounds and offers, and view placement analytics.',
  },
  {
    id: 'eligibility',
    topic: 'Drive eligibility',
    keywords: ['eligibility', 'eligible', 'criteria', 'cgpa', 'backlog', 'branch'],
    answer:
      'Each drive defines an eligibility rule (graduation years, branches, minimum CGPA/10th/12th, backlog limits, custom conditions) with optional per-branch overrides. Evaluation is deterministic and never silently rejects: a student is ELIGIBLE, NOT_ELIGIBLE with explicit reasons, or NEEDS_INFO when academic data is missing.',
  },
  {
    id: 'colleges-how',
    topic: 'College onboarding',
    keywords: ['college onboarding', 'how colleges join', 'placement cell setup', 'import students'],
    answer:
      'A platform admin onboards the college; placement staff (College Admin / TPO / Coordinator) then configure campuses, departments and branches, register or bulk-import students, review published drives, run the eligibility checker and coordinate applications, rounds and offers from the Placement workspace.',
  },
  {
    id: 'alerts',
    topic: 'Notifications',
    keywords: ['alert', 'alerts', 'notification', 'notifications', 'email'],
    answer:
      'HireX sends in-app alerts for application updates, interview schedules and reminders, job matches and round results, with a live message-style inbox. Email delivery is currently limited to account emails (verification/password); product notifications are in-app.',
  },
  {
    id: 'security',
    topic: 'Security & accounts',
    keywords: ['security', 'safe', 'privacy', 'account', 'login', 'sign in', 'password', 'oauth'],
    answer:
      'Accounts support email/password and Google/GitHub sign-in with rotating refresh tokens and session revocation. Resume files are stored privately and accessed via short-lived signed URLs. Role-based access controls keep recruiter, candidate and college data separated.',
  },
  {
    id: 'start',
    topic: 'Getting started',
    keywords: ['get started', 'start', 'sign up', 'register', 'create account', 'pricing', 'free', 'cost'],
    answer:
      'Click Get Started, choose Job Seeker or Recruiter and create your account (or continue with Google). Candidates should upload and analyse a resume to unlock recommendations. College placement accounts are provisioned by a platform admin. HireX does not publish paid plans in-product today.',
  },
];

/** Deterministic keyword scoring — no LLM needed for known topics. */
export function matchKnowledge(question: string): KnowledgeEntry | null {
  const q = ` ${question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  if (!q.trim()) return null;
  let best: KnowledgeEntry | null = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(` ${kw} `) || q.includes(kw)) score += kw.split(' ').length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore > 0 ? best : null;
}

/** Condensed, verified facts injected into the LLM grounding prompt. */
export const GROUNDING_FACTS = KNOWLEDGE.map((k) => `- ${k.topic}: ${k.answer}`).join('\n');