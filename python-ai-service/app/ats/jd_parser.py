"""
Job Description Parser
Extracts role-specific requirements dynamically from any JD.
No hardcoded skill lists — everything derived from the JD text itself.
"""
import re
from typing import List, Dict, Any, Set

# Broad tech keyword detection (used only to identify WHAT to look for, not to score)
TECH_TOKEN_PATTERN = re.compile(
    r'\b[a-z][a-z0-9+#./-]{1,40}\b', re.I
)

STOP_WORDS = frozenset({
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
    'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
    'will', 'with', 'have', 'from', 'this', 'that', 'they', 'been', 'said',
    'each', 'which', 'their', 'other', 'about', 'many', 'then', 'them',
    'than', 'some', 'very', 'when', 'come', 'here', 'just', 'like', 'long',
    'make', 'much', 'over', 'such', 'take', 'year', 'years', 'into', 'work',
    'working', 'team', 'role', 'using', 'developed', 'built', 'created',
    'designed', 'implemented', 'experience', 'project', 'projects', 'skills',
    'skill', 'company', 'position', 'responsible', 'ability', 'strong',
    'good', 'must', 'should', 'would', 'could', 'required', 'requirements',
    'responsibilities', 'qualifications', 'preferred', 'nice', 'plus',
    'bonus', 'benefits', 'perks', 'culture', 'mission', 'vision', 'values',
    'opportunity', 'candidate', 'candidates', 'applicant', 'applicants',
    'join', 'looking', 'seeking', 'hiring', 'apply', 'application',
    'description', 'job', 'title', 'location', 'salary', 'benefits',
    'equal', 'employer', 'diversity', 'inclusion', 'accommodations',
})

ROLE_FAMILY_PATTERNS = {
    'ai_ml': re.compile(r'\b(ai|artificial\s+intelligence|machine\s+learning|ml|deep\s+learning|nlp|llm|rag|data\s+scientist|pytorch|tensorflow|scikit|vector\s+database|embedding|prompt\s+engineering|generative\s+ai)\b', re.I),
    'frontend': re.compile(r'\b(frontend|front[-\s]?end|react|next\.?js|vue|angular|html|css|tailwind|ui\s+developer|ux|javascript|typescript)\b', re.I),
    'backend': re.compile(r'\b(backend|back[-\s]?end|api|node\.?js|nestjs|spring\s+boot|django|fastapi|express|microservices|rest|graphql|server[-\s]?side)\b', re.I),
    'fullstack': re.compile(r'\b(full[-\s]?stack|fullstack|mern|mean|react.*node|node.*react|frontend.*backend|backend.*frontend)\b', re.I),
    'devops': re.compile(r'\b(devops|sre|kubernetes|docker|ci/?cd|aws|azure|gcp|terraform|jenkins|github\s+actions|cloud\s+engineer|platform\s+engineer|infrastructure)\b', re.I),
    'data': re.compile(r'\b(data\s+analyst|data\s+engineer|etl|power\s+bi|tableau|sql\s+analyst|business\s+intelligence|analytics|data\s+pipeline)\b', re.I),
    'mobile': re.compile(r'\b(mobile|android|ios|flutter|react\s+native|swift|kotlin|app\s+developer)\b', re.I),
    'security': re.compile(r'\b(security|cybersecurity|penetration|pentesting|infosec|soc|vulnerability|firewall|encryption)\b', re.I),
    'qa': re.compile(r'\b(qa|quality\s+assurance|testing|test\s+engineer|automation\s+testing|selenium|cypress|playwright|jest|manual\s+testing)\b', re.I),
    'product': re.compile(r'\b(product\s+manager|product\s+owner|product\s+management|roadmap|stakeholder|agile|scrum\s+master)\b', re.I),
    'design': re.compile(r'\b(ui\s+design|ux\s+design|figma|adobe|graphic\s+design|interaction\s+design|design\s+system|wireframe|prototype)\b', re.I),
}

SENIORITY_PATTERNS = {
    'intern': re.compile(r'\b(intern|internship|trainee|apprentice)\b', re.I),
    'junior': re.compile(r'\b(junior|entry[-\s]?level|fresher|graduate|0[-\s]?\d\s*year)\b', re.I),
    'mid': re.compile(r'\b(mid[-\s]?level|intermediate|\d[-\s]?\d\s*years?|associate)\b', re.I),
    'senior': re.compile(r'\b(senior|lead|staff|principal|\d\+\s*years|[5-9]\s*years)\b', re.I),
    'lead': re.compile(r'\b(lead|principal|architect|head|director|vp|manager)\b', re.I),
}


def detect_role_family(text: str) -> str:
    scores: Dict[str, int] = {}
    for family, pattern in ROLE_FAMILY_PATTERNS.items():
        matches = pattern.findall(text)
        scores[family] = len(matches)
    if not scores or max(scores.values()) == 0:
        return 'general'
    return max(scores, key=scores.get)


def detect_seniority(text: str) -> str:
    for level in ['lead', 'senior', 'mid', 'junior', 'intern']:
        if SENIORITY_PATTERNS[level].search(text):
            return level
    return 'mid'


def extract_experience_years(text: str) -> float:
    patterns = [
        r'(\d+)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)',
        r'(?:minimum|min|at\s+least)\s+(\d+)\s*(?:years?|yrs?)',
        r'(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?)',
    ]
    for p in patterns:
        m = re.search(p, text, re.I)
        if m:
            return float(m.group(1))
    return 0.0


def extract_skills_from_text(text: str, declared_skills: List[str] = None) -> List[str]:
    """Extract skills dynamically from JD text + declared skills."""
    text_lower = text.lower()
    skills: Set[str] = set()

    # 1. Declared skills from recruiter always take priority
    if declared_skills:
        for s in declared_skills:
            clean = s.strip().lower()
            if clean:
                skills.add(clean)

    # 2. Extract tech-looking tokens from text
    tokens = TECH_TOKEN_PATTERN.findall(text_lower)
    for token in tokens:
        if token in STOP_WORDS:
            continue
        if len(token) < 2:
            continue
        # Likely a tech skill if it contains digits, +, #, . or is capitalized in original
        if re.search(r'[0-9+#.]', token):
            skills.add(token)
        elif len(token) > 3 and token not in STOP_WORDS:
            # Check if it appears near skill-related context
            context_window = 80
            idx = text_lower.find(token)
            if idx >= 0:
                context = text_lower[max(0, idx - context_window):idx + len(token) + context_window]
                if re.search(r'(skill|technolog|tool|framework|language|platform|experience|proficien|knowledge|familiar|working|hands[-\s]?on)', context, re.I):
                    skills.add(token)

    return sorted(skills)


def parse_job_description(
    title: str,
    description: str,
    declared_skills: List[str] = None,
    experience_min: float = 0,
) -> Dict[str, Any]:
    """Parse any JD and extract structured requirements dynamically."""
    full_text = f"{title} {description}"

    role_family = detect_role_family(full_text)
    seniority = detect_seniority(full_text)
    jd_experience = extract_experience_years(description)
    min_years = max(experience_min or 0, jd_experience)

    all_skills = extract_skills_from_text(full_text, declared_skills)

    # Split into must-have vs nice-to-have based on context
    must_have: List[str] = []
    nice_to_have: List[str] = []

    for skill in all_skills:
        # Find context around skill mention
        idx = full_text.lower().find(skill)
        if idx < 0:
            nice_to_have.append(skill)
            continue
        context = full_text[max(0, idx - 150):idx + len(skill) + 150].lower()
        if re.search(r'(must|required|essential|mandatory|needed|critical|core|primary|minimum)', context, re.I):
            must_have.append(skill)
        elif re.search(r'(nice|preferred|bonus|plus|good\s+to\s+have|familiar|exposure|knowledge\s+of)', context, re.I):
            nice_to_have.append(skill)
        elif skill in (declared_skills or []):
            must_have.append(skill)
        else:
            nice_to_have.append(skill)

    # Deduplicate preserving order
    seen: Set[str] = set()
    must_dedup = []
    for s in must_have:
        if s not in seen:
            seen.add(s)
            must_dedup.append(s)
    nice_dedup = []
    for s in nice_to_have:
        if s not in seen:
            seen.add(s)
            nice_dedup.append(s)

    return {
        'roleFamily': role_family,
        'seniority': seniority,
        'minYears': min_years,
        'mustHave': must_dedup[:15],
        'niceToHave': nice_dedup[:10],
        'allSkills': all_skills,
        'titleKeywords': [w for w in title.lower().split() if len(w) > 2 and w not in STOP_WORDS],
    }