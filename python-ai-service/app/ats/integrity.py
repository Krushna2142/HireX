"""
Resume Integrity Scanner
Detects hidden text, zero-width unicode, prompt injection, keyword stuffing.
"""
import re
import unicodedata
from typing import List, Dict, Any

ZERO_WIDTH_PATTERN = re.compile(
    r'[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD\u180E\u061C\u200E\u200F\u2028\u2029\u2066-\u2069]'
)

# ✅ FIXED: Removed the "ideal candidate" pattern to prevent false positives
INJECTION_PATTERNS = [
    re.compile(r'ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)', re.I),
    re.compile(r'(rank|rate|score|select|shortlist|hire|recommend)\s+(this|the)\s+(candidate|resume|applicant|person)', re.I),
    re.compile(r'\b(ats|ai|assistant|language\s+model|llm|chatgpt|gpt|claude|gemini)\b.{0,60}\b(must|should|please|instruction|ignore|override|bypass)', re.I),
    re.compile(r'system\s*prompt', re.I),
    re.compile(r'you\s+are\s+an?\s+(ai|assistant|interviewer|recruiter)', re.I),
    re.compile(r'disregard\s+(all|any|the)\s+(previous|prior|above)', re.I),
    re.compile(r'forget\s+(everything|all|what|your)\s+(you|instructions|rules|learned|know)', re.I),
    re.compile(r'act\s+as\s+(if|though)\s+(you|the)\s+(are|is)\s+(a|an|the)', re.I),
    re.compile(r'\bATS\b.{0,30}\b(pass|beat|trick|fool|hack|manipulate|exploit)\b', re.I),
]

COMMON_WORDS = frozenset({
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
    'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
    'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did',
    'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'have', 'from',
    'this', 'that', 'they', 'been', 'said', 'each', 'which', 'their', 'will',
    'other', 'about', 'many', 'then', 'them', 'than', 'some', 'very', 'when',
    'come', 'here', 'just', 'like', 'long', 'make', 'much', 'over', 'such',
    'take', 'year', 'into', 'work', 'team', 'role', 'using', 'developed',
    'built', 'created', 'designed', 'implemented', 'experience', 'project',
    'projects', 'skills', 'skill', 'company', 'position', 'responsible',
})


def scan_zero_width(text: str) -> Dict[str, Any]:
    matches = ZERO_WIDTH_PATTERN.findall(text)
    return {
        'found': len(matches) > 0,
        'count': len(matches),
        'characters': [f'U+{ord(c):04X} ({unicodedata.name(c, "UNKNOWN")})' for c in matches[:20]],
        'cleaned_text': ZERO_WIDTH_PATTERN.sub('', text),
    }


def scan_prompt_injection(text: str) -> List[Dict[str, str]]:
    findings = []
    for pattern in INJECTION_PATTERNS:
        match = pattern.search(text)
        if match:
            findings.append({
                'type': 'ai_injection',
                'severity': 'high',
                'matched_text': match.group(0)[:200],
                'pattern': pattern.pattern[:100],
            })
    return findings


def scan_keyword_stuffing(text: str, threshold_ratio: float = 0.04) -> Dict[str, Any]:
    tokens = re.findall(r'[a-z][a-z0-9+#.]{2,}', text.lower())
    if len(tokens) < 80:
        return {'found': False, 'stuffed_words': [], 'detail': ''}

    freq: Dict[str, int] = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1

    limit = max(10, int(len(tokens) * threshold_ratio))
    stuffed = [
        {'word': w, 'count': c, 'ratio': round(c / len(tokens) * 100, 2)}
        for w, c in sorted(freq.items(), key=lambda x: -x[1])
        if c > limit and w not in COMMON_WORDS
    ]

    return {
        'found': len(stuffed) > 0,
        'stuffed_words': stuffed[:10],
        'detail': ', '.join(f"{s['word']}x{s['count']}" for s in stuffed[:5]),
    }


def run_integrity_scan(text: str, hidden_lines: List[str] = None, hidden_ratio: float = 0.0) -> Dict[str, Any]:
    """Full integrity scan combining all checks."""
    all_findings: List[Dict[str, Any]] = []
    # ✅ FIXED: Removed dead 'warnings' initialization here

    # 1. Zero-width unicode
    zw = scan_zero_width(text)
    if zw['found']:
        all_findings.append({
            'type': 'invisible_unicode',
            'severity': 'high' if zw['count'] > 20 else 'medium',
            'detail': f"{zw['count']} zero-width/invisible characters detected",
            'characters': zw['characters'],
        })
        text = zw['cleaned_text']

    # 2. Prompt injection (check original + hidden text)
    combined_text = text + '\n' + '\n'.join(hidden_lines or [])
    injections = scan_prompt_injection(combined_text)
    all_findings.extend(injections)

    # 3. Keyword stuffing
    stuffing = scan_keyword_stuffing(text)
    if stuffing['found']:
        all_findings.append({
            'type': 'keyword_stuffing',
            'severity': 'high' if len(stuffing['stuffed_words']) >= 3 else 'medium',
            'detail': stuffing['detail'],
            'stuffed_words': stuffing['stuffed_words'],
        })

    # 4. Hidden ratio
    if hidden_ratio > 0.15:
        all_findings.append({
            'type': 'hidden_content_ratio',
            'severity': 'high',
            'detail': f"{round(hidden_ratio * 100, 1)}% of document text is hidden",
        })

    # Determine overall severity
    severities = [f.get('severity', 'low') for f in all_findings]
    if 'high' in severities:
        overall = 'high'
    elif 'medium' in severities:
        overall = 'medium'
    elif severities:
        overall = 'low'
    else:
        overall = 'none'

    flagged = overall in ('high', 'medium')
    warnings = [f['detail'] for f in all_findings]

    return {
        'flagged': flagged,
        'severity': overall,
        'findings': all_findings,
        'warnings': warnings,
        'clean_text': text,
        'hidden_lines': hidden_lines or [],
        'hidden_ratio': hidden_ratio,
    }