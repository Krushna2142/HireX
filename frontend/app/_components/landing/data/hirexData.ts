export interface CandidatePreset {
  id: string;
  name: string;
  targetRole: string;
  experienceYears: number;
  education: string;
  summary: string;
  skills: string[];
  extractedHighlights: {
    label: string;
    detail: string;
  }[];
  matchedOpportunities: {
    company: string;
    role: string;
    location: string;
    compensation: string;
    matchScore: number;
    keyAlignments: string[];
  }[];
}

export interface JobPreset {
  id: string;
  title: string;
  department: string;
  company: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperience: number;
}

export interface EcosystemModule {
  id: string;
  index: string;
  title: string;
  shortLabel: string;
  summary: string;
  inputs: string[];
  outputs: string[];
  connectedIds: string[];
}

export interface PipelineStage {
  id: string;
  step: string;
  name: string;
  candidateCount: number;
  conversionRate: string;
  automationNote: string;
}

export interface InterviewTurn {
  id: string;
  speaker: 'ai' | 'candidate';
  timestamp: string;
  phase: string;
  text: string;
  signalNote: string;
}

export interface AcademicBranch {
  id: string;
  name: string;
  shortCode: string;
  totalStudents: number;
  avgCgpa: number;
  eligibleRatio70: number;
  eligibleRatio75: number;
  eligibleRatio80: number;
  shortlistedCount: number;
  offersProjected: number;
  topSkills: string[];
}

export interface PersonaSolution {
  id: 'candidate' | 'recruiter' | 'college';
  label: string;
  headline: string;
  description: string;
  capabilities: {
    title: string;
    detail: string;
  }[];
  workflowSteps: {
    step: string;
    title: string;
    detail: string;
    outcome: string;
  }[];
  illustrativeMetric: {
    value: string;
    caption: string;
  };
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const HERO_MEDIA = {
  // Pointing to the public/images directory
  heroBackdrop: '/images/hero_cinematic_core_1794850869046.jpg',
  aiResumeBackdrop: '/images/ai_resume_neural_backdrop_1794850869428.jpg',
  campusBackdrop: '/images/campus_university_architecture_1794850869652.jpg',
  recruiterBackdrop: '/images/recruiter_studio_workspace_1794850869779.jpg',
  studentPortrait: '/images/hero_student_portrait_1794851668918.jpg',
};

export const FRAGMENTED_ARTIFACTS = [
  {
    id: 'resumes',
    title: 'Unstructured PDF Resumes',
    source: '412 inbox attachments',
    friction: 'Manual keyword scanning across inconsistent formats',
  },
  {
    id: 'applications',
    title: 'Siloed Job Applications',
    source: '6 disconnected job boards',
    friction: 'Duplicate candidate records and dropped follow-ups',
  },
  {
    id: 'lists',
    title: 'Static Candidate Lists',
    source: '14 offline CSV exports',
    friction: 'Stale shortlists with no live skill verification',
  },
  {
    id: 'schedules',
    title: 'Manual Interview Schedules',
    source: '48 calendar threads',
    friction: 'Panel conflicts and delayed candidate feedback loops',
  },
  {
    id: 'spreadsheets',
    title: 'Placement Spreadsheets',
    source: '9 department trackers',
    friction: 'Zero real-time branch eligibility or offer tracking',
  },
];

export const ECOSYSTEM_MODULES: EcosystemModule[] = [
  {
    id: 'resume-analysis',
    index: '01',
    title: 'AI Resume Analysis',
    shortLabel: 'Resume Analysis',
    summary:
      'Parses unstructured resumes into normalized competency graphs, verifying role tenure, project depth, and domain fluency.',
    inputs: ['PDF / DOCX Resumes', 'Portfolio Links', 'Academic Transcripts'],
    outputs: ['Structured Skill Graph', 'Experience Timeline', 'Candidate Insights'],
    connectedIds: ['ats-checker', 'job-matching'],
  },
  {
    id: 'ats-checker',
    index: '02',
    title: 'ATS Checker',
    shortLabel: 'ATS Checker',
    summary:
      'Evaluates resume alignment against live job descriptions, isolating missing technical requirements and structural parsing gaps.',
    inputs: ['Parsed Resume', 'Target Job Description'],
    outputs: ['Alignment Score', 'Missing Skill Matrix', 'Tailored Recommendations'],
    connectedIds: ['resume-analysis', 'job-matching', 'recruitment-management'],
  },
  {
    id: 'job-matching',
    index: '03',
    title: 'Smart Job Matching',
    shortLabel: 'Job Matching',
    summary:
      'Connects verified candidate capability vectors directly with open roles across enterprise teams and campus drives.',
    inputs: ['Competency Graph', 'Role Benchmarks'],
    outputs: ['Ranked Opportunity Feed', 'Contextual Fit Rationale'],
    connectedIds: ['resume-analysis', 'ats-checker', 'recruitment-management'],
  },
  {
    id: 'recruitment-management',
    index: '04',
    title: 'Recruitment Management',
    shortLabel: 'Pipeline Ops',
    summary:
      'Orchestrates job requisitions, automated screening, collaborative shortlisting, interview rounds, and offer execution in one ledger.',
    inputs: ['Shortlisted Talent', 'Panel Availability'],
    outputs: ['Stage Progression', 'Offer Decisions', 'Hiring Velocity Metrics'],
    connectedIds: ['ats-checker', 'ai-interview', 'campus-hiring'],
  },
  {
    id: 'ai-interview',
    index: '05',
    title: 'AI Interview',
    shortLabel: 'AI Interview',
    summary:
      'Conducts structured technical and behavioral screening sessions with adaptive follow-up prompts and auditable evaluation rubrics.',
    inputs: ['Role Rubric', 'Candidate Profile'],
    outputs: ['Session Transcript', 'Competency Scorecard', 'Panel Brief'],
    connectedIds: ['recruitment-management', 'campus-hiring'],
  },
  {
    id: 'campus-hiring',
    index: '06',
    title: 'Campus Hiring',
    shortLabel: 'Campus Hiring',
    summary:
      'Links one corporate recruitment team with multiple partner colleges, academic departments, and thousands of verified students.',
    inputs: ['Drive Criteria', 'Multi-Branch Student Rosters'],
    outputs: ['Eligibility Filter', 'Round Coordination', 'Placement Analytics'],
    connectedIds: ['recruitment-management', 'ai-interview', 'job-matching'],
  },
];

export const CANDIDATE_PRESETS: CandidatePreset[] = [
  {
    id: 'aarav',
    name: 'Aarav Mehta (Demo Profile)',
    targetRole: 'Full-Stack Systems Engineer',
    experienceYears: 3,
    education: 'B.Tech Computer Engineering · 8.6 CGPA',
    summary:
      'Built distributed telemetry dashboards in TypeScript and React with Node.js microservices and automated CI/CD pipelines.',
    skills: [
      'TypeScript',
      'React',
      'Node.js',
      'PostgreSQL',
      'REST APIs',
      'Docker',
      'Tailwind CSS',
      'System Design',
    ],
    extractedHighlights: [
      {
        label: 'Core Engineering Stack',
        detail: 'TypeScript, React 19, Node.js, PostgreSQL verified across 4 shipped projects',
      },
      {
        label: 'Production Delivery',
        detail: '3.2 years experience reducing API p95 latency by 38% (illustrative demo)',
      },
      {
        label: 'Architectural Readiness',
        detail: 'Strong frontend state architecture; recommended deeper Kubernetes observability',
      },
    ],
    matchedOpportunities: [
      {
        company: 'Northstar Cloud Systems (Demo)',
        role: 'Senior Product Engineer',
        location: 'Bengaluru · Hybrid',
        compensation: 'Demo Range: 22–28 LPA',
        matchScore: 94,
        keyAlignments: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      },
      {
        company: 'Vektor Mobility Labs (Demo)',
        role: 'Frontend Platform Architect',
        location: 'Pune · Hybrid',
        compensation: 'Demo Range: 20–25 LPA',
        matchScore: 89,
        keyAlignments: ['TypeScript', 'React', 'System Design', 'Tailwind CSS'],
      },
      {
        company: 'Kestrel FinTech Core (Demo)',
        role: 'Distributed Services Engineer',
        location: 'Remote',
        compensation: 'Demo Range: 24–30 LPA',
        matchScore: 81,
        keyAlignments: ['Node.js', 'PostgreSQL', 'Docker', 'REST APIs'],
      },
    ],
  },
  {
    id: 'ananya',
    name: 'Ananya Kulkarni (Demo Profile)',
    targetRole: 'Applied AI & Data Engineer',
    experienceYears: 2,
    education: 'B.E. AI & Data Science · 9.1 CGPA',
    summary:
      'Designed document-parsing transformers, vector retrieval pipelines, and Python evaluation harnesses for enterprise search.',
    skills: [
      'Python',
      'PyTorch',
      'SQL',
      'FastAPI',
      'Vector Search',
      'Data Pipelines',
      'TypeScript',
      'Docker',
    ],
    extractedHighlights: [
      {
        label: 'ML & Retrieval Depth',
        detail: 'PyTorch, FastAPI, and vector indexing verified across benchmark datasets',
      },
      {
        label: 'Production Delivery',
        detail: '2.1 years experience deploying inference endpoints with automated eval suites',
      },
      {
        label: 'Growth Opportunity',
        detail: 'Add distributed streaming (Kafka) and cloud IAM hardening for platform roles',
      },
    ],
    matchedOpportunities: [
      {
        company: 'Helios Applied AI (Demo)',
        role: 'Applied ML Engineer',
        location: 'Hyderabad · Hybrid',
        compensation: 'Demo Range: 21–27 LPA',
        matchScore: 96,
        keyAlignments: ['Python', 'PyTorch', 'Vector Search', 'FastAPI'],
      },
      {
        company: 'Aether Knowledge Graph (Demo)',
        role: 'Search Infrastructure Engineer',
        location: 'Bengaluru · On-site',
        compensation: 'Demo Range: 19–24 LPA',
        matchScore: 88,
        keyAlignments: ['Python', 'SQL', 'Data Pipelines', 'Docker'],
      },
      {
        company: 'Meridian Analytics (Demo)',
        role: 'Full-Stack AI Developer',
        location: 'Mumbai · Hybrid',
        compensation: 'Demo Range: 18–23 LPA',
        matchScore: 84,
        keyAlignments: ['Python', 'TypeScript', 'FastAPI', 'SQL'],
      },
    ],
  },
];

export const JOB_PRESETS: JobPreset[] = [
  {
    id: 'fullstack',
    title: 'Full-Stack Product Engineer',
    department: 'Core Platform',
    company: 'Northstar Cloud Systems (Demo)',
    requiredSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes'],
    preferredSkills: ['System Design', 'GraphQL', 'CI/CD'],
    minExperience: 2,
  },
  {
    id: 'applied-ai',
    title: 'Applied AI Infrastructure Engineer',
    department: 'Intelligence Lab',
    company: 'Helios Applied AI (Demo)',
    requiredSkills: ['Python', 'PyTorch', 'FastAPI', 'Vector Search', 'Docker', 'Kafka'],
    preferredSkills: ['SQL', 'TypeScript', 'Distributed Systems'],
    minExperience: 2,
  },
];

export const RECRUITMENT_PIPELINE: PipelineStage[] = [
  {
    id: 'creation',
    step: '01',
    name: 'Job Creation',
    candidateCount: 1,
    conversionRate: 'Req Active',
    automationNote: 'Skill rubric & eligibility criteria locked',
  },
  {
    id: 'applications',
    step: '02',
    name: 'Applications',
    candidateCount: 1240,
    conversionRate: '100% Intake',
    automationNote: 'Multi-channel & campus rosters normalized',
  },
  {
    id: 'screening',
    step: '03',
    name: 'AI Screening',
    candidateCount: 418,
    conversionRate: '33.7% Pass',
    automationNote: 'Resume parsing + ATS benchmark scoring',
  },
  {
    id: 'shortlisting',
    step: '04',
    name: 'Shortlisting',
    candidateCount: 142,
    conversionRate: '11.5% Ranked',
    automationNote: 'Contextual skill-match verification',
  },
  {
    id: 'assessment',
    step: '05',
    name: 'Assessment',
    candidateCount: 76,
    conversionRate: '6.1% Cleared',
    automationNote: 'Role-specific technical evaluation',
  },
  {
    id: 'interviews',
    step: '06',
    name: 'AI + Panel Interviews',
    candidateCount: 28,
    conversionRate: '2.3% Finalists',
    automationNote: 'Structured transcript & rubric handoff',
  },
  {
    id: 'offers',
    step: '07',
    name: 'Offers Released',
    candidateCount: 12,
    conversionRate: '100% Tracked',
    automationNote: 'Digital offer acceptance & onboarding sync',
  },
];

export const AI_INTERVIEW_TURNS: InterviewTurn[] = [
  {
    id: 'turn-1',
    speaker: 'ai',
    timestamp: '00:18',
    phase: 'Architecture Calibration',
    text: 'Your resume notes a 38% p95 latency reduction on a telemetry API. What bottleneck did profiling uncover first, and how did you verify the fix under load?',
    signalNote: 'Targeting real systems ownership vs. surface buzzwords',
  },
  {
    id: 'turn-2',
    speaker: 'candidate',
    timestamp: '01:04',
    phase: 'Candidate Response',
    text: 'Tracing revealed N+1 PostgreSQL queries inside the aggregation endpoint. I replaced sequential lookups with a batched CTE, added a composite index, and replayed 2x peak traffic in staging.',
    signalNote: 'Verified database indexing, query planning, and load testing',
  },
  {
    id: 'turn-3',
    speaker: 'ai',
    timestamp: '02:12',
    phase: 'Adaptive Follow-Up',
    text: 'When adding that composite index, how did you evaluate write-amplification trade-offs on high-frequency inserts?',
    signalNote: 'Probing depth of trade-off reasoning in production',
  },
  {
    id: 'turn-4',
    speaker: 'candidate',
    timestamp: '03:05',
    phase: 'Candidate Response',
    text: 'We measured insert throughput over 48 hours and kept the index partial to active tenant partitions, holding write overhead under 4% while preserving sub-35ms reads.',
    signalNote: 'Strong quantitative judgment and partitioning awareness',
  },
];

export const AI_INTERVIEW_EVALUATION = {
  overallReadiness: 'Recommended for Final Panel',
  rubricBreakdown: [
    { dimension: 'Systems Architecture', score: '9.2 / 10', note: 'Clear grasp of query plans and partitioning trade-offs' },
    { dimension: 'Execution & Ownership', score: '8.9 / 10', note: 'Quantified staging validation before production rollout' },
    { dimension: 'Technical Communication', score: '9.0 / 10', note: 'Concise, structured answers without filler' },
  ],
};

export const ACADEMIC_BRANCHES: AcademicBranch[] = [
  {
    id: 'ce',
    name: 'Computer Engineering',
    shortCode: 'CE',
    totalStudents: 640,
    avgCgpa: 8.1,
    eligibleRatio70: 0.88,
    eligibleRatio75: 0.76,
    eligibleRatio80: 0.58,
    shortlistedCount: 214,
    offersProjected: 68,
    topSkills: ['Data Structures', 'TypeScript', 'Distributed Systems'],
  },
  {
    id: 'it',
    name: 'Information Technology',
    shortCode: 'IT',
    totalStudents: 520,
    avgCgpa: 8.0,
    eligibleRatio70: 0.86,
    eligibleRatio75: 0.72,
    eligibleRatio80: 0.54,
    shortlistedCount: 172,
    offersProjected: 54,
    topSkills: ['Cloud APIs', 'React', 'Database Design'],
  },
  {
    id: 'aids',
    name: 'AI & Data Science',
    shortCode: 'AI & DS',
    totalStudents: 410,
    avgCgpa: 8.3,
    eligibleRatio70: 0.91,
    eligibleRatio75: 0.81,
    eligibleRatio80: 0.64,
    shortlistedCount: 164,
    offersProjected: 52,
    topSkills: ['Python', 'PyTorch', 'Vector Retrieval'],
  },
  {
    id: 'ece',
    name: 'Electronics & Comm (ECE)',
    shortCode: 'ECE',
    totalStudents: 480,
    avgCgpa: 7.8,
    eligibleRatio70: 0.81,
    eligibleRatio75: 0.66,
    eligibleRatio80: 0.45,
    shortlistedCount: 128,
    offersProjected: 36,
    topSkills: ['Embedded C', 'VLSI', 'Signal Processing'],
  },
  {
    id: 'ee',
    name: 'Electrical Engineering',
    shortCode: 'EE',
    totalStudents: 360,
    avgCgpa: 7.6,
    eligibleRatio70: 0.76,
    eligibleRatio75: 0.60,
    eligibleRatio80: 0.39,
    shortlistedCount: 88,
    offersProjected: 24,
    topSkills: ['Power Systems', 'PLC Automation', 'MATLAB'],
  },
  {
    id: 'mech',
    name: 'Mechanical Engineering',
    shortCode: 'MECH',
    totalStudents: 440,
    avgCgpa: 7.5,
    eligibleRatio70: 0.74,
    eligibleRatio75: 0.57,
    eligibleRatio80: 0.36,
    shortlistedCount: 94,
    offersProjected: 28,
    topSkills: ['CAD / CAE', 'Thermodynamics', 'Robotics'],
  },
  {
    id: 'civil',
    name: 'Civil Engineering',
    shortCode: 'CIVIL',
    totalStudents: 320,
    avgCgpa: 7.4,
    eligibleRatio70: 0.71,
    eligibleRatio75: 0.52,
    eligibleRatio80: 0.31,
    shortlistedCount: 62,
    offersProjected: 19,
    topSkills: ['Structural BIM', 'AutoCAD', 'Project Controls'],
  },
];

export const CAMPUS_COLLEGES_DEMO = [
  { name: 'National Institute of Technology (Demo)', city: 'Pune', students: 1120, activeDrives: 14 },
  { name: 'Apex Engineering University (Demo)', city: 'Bengaluru', students: 980, activeDrives: 11 },
  { name: 'Meridian School of Engineering (Demo)', city: 'Hyderabad', students: 1070, activeDrives: 9 },
];

export const USER_SOLUTIONS: PersonaSolution[] = [
  {
    id: 'candidate',
    label: 'Candidate',
    headline: 'Precision feedback before you ever hit apply.',
    description:
      'Candidates upload a single profile to inspect ATS parsing fidelity, uncover missing competencies, discover verified role matches, and complete structured AI practice or screening interviews.',
    capabilities: [
      { title: 'Resume Insights', detail: 'Line-by-line parsing audit showing how recruiters and ATS engines read your experience.' },
      { title: 'Job Discovery', detail: 'Role feed ranked by verified skill overlap rather than generic keyword spam.' },
      { title: 'Application Tracking', detail: 'Real-time visibility across screening, assessment, interview, and offer stages.' },
      { title: 'Interview Participation', detail: 'Structured AI interview rooms with clear prompts and instant readiness summaries.' },
    ],
    workflowSteps: [
      { step: '01', title: 'Upload & Parse Resume', detail: 'Drop PDF or DOCX to extract verified skills, projects, and academic standing.', outcome: 'Structured talent profile' },
      { step: '02', title: 'Run ATS Readiness Check', detail: 'Benchmark against target roles to isolate missing skills and phrasing gaps.', outcome: 'Actionable optimization plan' },
      { step: '03', title: 'Apply to Matched Roles', detail: 'Connect directly to open company requisitions and campus placement drives.', outcome: 'High-signal submissions' },
      { step: '04', title: 'Complete AI Interview', detail: 'Respond to adaptive role questions and advance straight to final panels.', outcome: 'Faster offer cycle' },
    ],
    illustrativeMetric: {
      value: '3.4x',
      caption: 'Higher shortlist conversion when candidates close top 2 ATS skill gaps (demo benchmark)',
    },
  },
  {
    id: 'recruiter',
    label: 'Recruiter',
    headline: 'From open requisition to signed offer in one continuous flow.',
    description:
      'Recruiters publish roles once, evaluate normalized candidate graphs with transparent ATS scoring, run automated first-round AI interviews, and manage every shortlist across corporate and campus pipelines.',
    capabilities: [
      { title: 'Job Publishing', detail: 'Define core skills, experience thresholds, and branch eligibility rules in seconds.' },
      { title: 'Candidate Screening', detail: 'Replace manual PDF skimming with structured competency comparisons.' },
      { title: 'Shortlisting', detail: 'Collaborate with hiring managers using explainable fit scores and skill highlights.' },
      { title: 'Interview Management', detail: 'Review AI interview transcripts, scores, and schedule final panel rounds cleanly.' },
      { title: 'Hiring Analytics', detail: 'Monitor funnel drop-off, time-to-shortlist, and offer acceptance velocity.' },
    ],
    workflowSteps: [
      { step: '01', title: 'Publish Role & Rubric', detail: 'Specify required skills, minimum experience, or campus CGPA criteria.', outcome: 'Live requisition active' },
      { step: '02', title: 'Automated ATS Ranking', detail: 'Incoming applicants are parsed, scored, and grouped by verified capability.', outcome: 'Top tier surfaced immediately' },
      { step: '03', title: 'Launch AI Screening', detail: 'Invite shortlisted candidates to asynchronous structured AI interviews.', outcome: 'Auditable evaluation briefs' },
      { step: '04', title: 'Panel & Offer Execution', detail: 'Advance finalists to human panels and issue tracked digital offers.', outcome: 'Zero spreadsheet handoffs' },
    ],
    illustrativeMetric: {
      value: '68%',
      caption: 'Reduction in manual resume screening hours per engineering requisition (demo benchmark)',
    },
  },
  {
    id: 'college',
    label: 'College & TPO',
    headline: 'Coordinate every branch, drive, and offer without spreadsheet chaos.',
    description:
      'Training and Placement Officers orchestrate multi-company campus drives across Computer Engineering, IT, ECE, Mechanical, Civil, Electrical, and AI & DS from a single unified hub.',
    capabilities: [
      { title: 'Placement Coordination', detail: 'Centralize employer schedules, drive notices, and student readiness profiles.' },
      { title: 'Campus Drives', detail: 'Run simultaneous hiring drives across multiple visiting companies without slot collisions.' },
      { title: 'All-Branch Eligibility', detail: 'Instantly filter eligible students across every engineering and technical department.' },
      { title: 'Student Management', detail: 'Track verified CGPA, backlogs, resume readiness, and interview attendance.' },
      { title: 'Placement Analytics', detail: 'Generate department-level offer rates, median packages, and recruiter trends.' },
    ],
    workflowSteps: [
      { step: '01', title: 'Onboard Branch Rosters', detail: 'Sync verified student records across CE, IT, ECE, Mechanical, Civil, EE, and AI & DS.', outcome: 'Unified campus directory' },
      { step: '02', title: 'Configure Drive Eligibility', detail: 'Apply recruiter branch, CGPA, and skill rules with one automated filter pass.', outcome: 'Instant verified cohort' },
      { step: '03', title: 'Orchestrate Multi-Round Drives', detail: 'Track online assessments, AI screening, and on-campus interviews in real time.', outcome: 'Zero coordination bottlenecks' },
      { step: '04', title: 'Publish Placement Analytics', detail: 'Export live department placement health for leadership and accreditation reports.', outcome: 'Complete institutional clarity' },
    ],
    illustrativeMetric: {
      value: '7 Branches',
      caption: 'Unified across 3,170+ demo student profiles with instant eligibility verification',
    },
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-hirex',
    question: 'What is HireX Motion Lab?',
    answer:
      'HireX is an AI-powered recruitment and campus hiring platform concept unifying resume analysis, ATS alignment checking, smart job matching, pipeline orchestration, AI interviews, and multi-college campus placement coordination. All metrics and profiles shown on this experimental showcase are fictional and illustrative.',
  },
  {
    id: 'how-campus-works',
    question: 'How does HireX handle multi-branch Campus Hiring?',
    answer:
      'One corporate recruiter can launch a single drive targeting multiple partner colleges and academic departments—including Computer Engineering, IT, ECE, Mechanical, Civil, Electrical, and AI & DS. Training and Placement Officers verify student eligibility automatically based on CGPA and skill criteria, then track every assessment and offer round live.',
  },
  {
    id: 'ats-transparency',
    question: 'How is the ATS Checker different from basic keyword counters?',
    answer:
      'Instead of brittle exact-word counting, HireX maps extracted resume experience against job requirements to surface verified skill overlaps, missing technical prerequisites, and concrete phrasing or project recommendations.',
  },
  {
    id: 'ai-interview-fairness',
    question: 'How do AI Interviews support human hiring panels?',
    answer:
      'AI Interviews conduct structured first-round technical and behavioral conversations with adaptive follow-up questions. Human panels receive a complete timestamped transcript and rubric-aligned evaluation summary so final decisions always stay with your team.',
  },
  {
    id: 'demo-scope',
    question: 'Is this website connected to live production APIs or real candidate data?',
    answer:
      'No. This is an independent experimental motion showcase built with deterministic local demo data and simulated interactive workflows. No external production HireX database, authentication, or backend API is connected.',
  },
];
