# python-ai-service/app/ats/jd_profile.py
"""
JD requirement extraction.
PRIMARY: NVIDIA NIM (Nemotron 3 Ultra) via nim_provider.
DETERMINISTIC FALLBACK: SKILL_ALIASES bank — used only when NIM is disabled or
fails after retries, and always marked source='deterministic' (never silent).
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from typing import Any, Dict, List, Optional

from app.core.nim_provider import NimProviderError, get_nim_provider
from app.resume.skills import SKILL_ALIASES

logger = logging.getLogger(__name__)

SYSTEM = (
    "You extract hiring requirements from a job description for ANY profession.\n"
    "Return ONLY JSON:\n"
    '{"roleFamily":string,"seniority":"intern|junior|mid|senior|lead","minYears":number,\n'
    '"mustHave":[{"name":string,"synonyms":string[],"weight":1-5}],\n'
    '"niceToHave":[{"name":string,"synonyms":string[],"weight":1-3}],\n'
    '"titleKeywords":string[],"domainKeywords":string[]}\n'
    "Rules: mustHave = explicitly required or core to the role (max 12). "
    "niceToHave = preferred/bonus (max 8). synonyms = alternate spellings or "
    "abbreviations a resume might use. Lowercase everything."
)

_SENIORITIES = {"intern", "junior", "mid", "senior", "lead"}
_CACHE: Dict[str, Dict[str, Any]] = {}
_LOCK = asyncio.Lock()


def _skill_list(value: Any, max_weight: int) -> List[Dict[str, Any]]:
    if not isinstance(value, list):
        return []
    out = []
    for item in value:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).lower().strip()
        if not name:
            continue
        synonyms = [
            str(s).lower().strip()
            for s in (item.get("synonyms") or [])
            if isinstance(s, str) and s.strip()
        ]
        try:
            weight = min(max_weight, max(1, int(item.get("weight") or 3)))
        except Exception:
            weight = 3
        out.append({"name": name, "synonyms": synonyms, "weight": weight})
    return out


def _validate(raw: Dict[str, Any], declared: List[str]) -> Dict[str, Any]:
    must = _skill_list(raw.get("mustHave"), 5)
    for skill in declared:
        n = skill.lower().strip()
        if n and not any(m["name"] == n or n in m["synonyms"] for m in must):
            must.append({"name": n, "synonyms": [], "weight": 4})
    seniority = raw.get("seniority") if raw.get("seniority") in _SENIORITIES else "mid"
    try:
        min_years = max(float(raw.get("minYears") or 0), 0)
    except Exception:
        min_years = 0.0
    return {
        "roleFamily": str(raw.get("roleFamily") or "general").lower(),
        "seniority": seniority,
        "minYears": min_years,
        "mustHave": must[:14],
        "niceToHave": _skill_list(raw.get("niceToHave"), 3)[:10],
        "titleKeywords": [
            str(t).lower() for t in (raw.get("titleKeywords") or []) if isinstance(t, str)
        ],
        "domainKeywords": [
            str(t).lower() for t in (raw.get("domainKeywords") or []) if isinstance(t, str)
        ],
    }


_ROLE_PATTERNS = [
    ("ai", r"\b(ai|artificial intelligence|machine learning|ml|deep learning|nlp|llm|rag|data scientist|pytorch|tensorflow|scikit|vector database|embedding)\b"),
    ("fullstack", r"\b(full stack|fullstack|mern|react.*node|node.*react)\b"),
    ("frontend", r"\b(frontend|front end|react|next\.js|ui developer)\b"),
    ("backend", r"\b(backend|back end|api|nestjs|spring boot|django|fastapi)\b"),
    ("devops", r"\b(devops|cloud|kubernetes|docker|ci/cd|aws|azure)\b"),
    ("mobile", r"\b(mobile|android|ios|flutter|react native)\b"),
    ("data", r"\b(data analyst|data engineer|etl|power bi|sql analyst)\b"),
]


_NOISE_WORDS = {"development", "basics", "basic", "fundamentals", "knowledge", "experience",
                "proficiency", "pipelines", "pipeline", "platforms", "platform", "orm", "framework"}
_PROTECTED = ("ci/cd", "ci cd")


def _compact(value: str) -> str:
    return re.sub(r"[^a-z0-9+#]", "", value.lower())


def _alternatives(skill: str) -> List[str]:
    """
    'NestJS or Express.js' -> ['nestjs', 'express.js']
    'Git and GitHub'       -> ['git', 'github']
    'CI/CD pipelines'      -> ['ci/cd pipelines'] (protected, not split on '/')
    Any ONE alternative satisfies the requirement.
    """
    s = skill.lower().strip()
    if any(p in s for p in _PROTECTED):
        return [s]
    parts = [p.strip() for p in re.split(r"\s+or\s+|\s+and\s+|/|,|&", s) if p.strip()]
    return parts or [s]


def _lookup_aliases(term: str) -> List[str]:
    """Resolve a free-text skill to its alias group (react.js -> react, reactjs, ...)."""
    words = [w for w in term.split() if w not in _NOISE_WORDS]
    candidates = {term, " ".join(words)} | set(words)
    out: List[str] = []
    cands = {_compact(c) for c in candidates if c}
    cands |= {c[:-2] for c in cands if c.endswith("js") and len(c) > 4}  # reactjs -> react
    for key, aliases in SKILL_ALIASES.items():
        group = [key] + list(aliases)
        if any(_compact(g) in cands for g in group):
            out.extend(a.strip() for a in aliases if a.strip())
            out.append(key)
    return out


def _expand_declared(skill: str) -> Dict[str, Any]:
    name = skill.lower().strip()
    alts = _alternatives(name)
    synonyms: List[str] = []
    for alt in alts:
        cleaned = " ".join(w for w in alt.split() if w not in _NOISE_WORDS) or alt
        synonyms.extend([alt, cleaned])
        synonyms.extend(_lookup_aliases(alt))
    seen: set = set()
    uniq = [x for x in synonyms if x and x != name and not (x in seen or seen.add(x))]
    return {"name": name, "synonyms": uniq, "weight": 4}


def deterministic_jd_profile(
    title: str, description: str, declared: List[str]
) -> Dict[str, Any]:
    text = f"{title} {description}".lower()
    family = "software"
    for name, pattern in _ROLE_PATTERNS:
        if re.search(pattern, text, re.I):
            family = name
            break
    must: List[Dict[str, Any]] = []
    for skill in declared:
        n = skill.lower().strip()
        if n:
            must.append(_expand_declared(n))
    for key, aliases in SKILL_ALIASES.items():
        if len(must) >= 16:
            break
        if key not in [m["name"] for m in must] and any(a.strip() in text for a in aliases):
            must.append({"name": key, "synonyms": aliases, "weight": 3})
    return {
        "roleFamily": family,
        "seniority": "mid",
        "minYears": 0.0,
        "mustHave": must,
        "niceToHave": [],
        "titleKeywords": [w for w in re.findall(r"[a-z]+", title.lower()) if len(w) > 2],
        "domainKeywords": [],
    }


async def fetch_jd_profile(
    title: str, description: str, declared: List[str], experience_min: float = 0
) -> Dict[str, Any]:
    """NIM-backed extraction. Raises NimProviderError on exhausted retries."""
    provider = get_nim_provider()
    user = (
        f"TITLE: {title}\n"
        f"DECLARED SKILLS: {', '.join(declared) or 'none'}\n"
        f"MIN YEARS: {experience_min}\n"
        f"DESCRIPTION:\n{(description or '')[:6000]}"
    )
    out = await provider.chat_json(SYSTEM, user)
    profile = _validate(out["result"], declared)
    profile["minYears"] = max(profile["minYears"], float(experience_min or 0))
    profile["source"] = "nim"
    profile["provider"] = out["provider"]
    return profile


async def get_jd_profile_cached(
    title: str, description: str, declared: List[str], experience_min: float = 0
) -> Dict[str, Any]:
    key = hashlib.sha256(
        f"{title}|{description}|{','.join(declared)}".encode()
    ).hexdigest()
    async with _LOCK:
        hit = _CACHE.get(key)
        if hit:
            return hit
    provider = get_nim_provider()
    if provider.enabled:
        try:
            profile = await fetch_jd_profile(title, description, declared, experience_min)
        except NimProviderError as err:
            logger.warning("[JD] NIM extraction failed (%s) — deterministic profile used", err)
            profile = deterministic_jd_profile(title, description, declared)
            profile["source"] = "deterministic"
            profile["provider"] = {"provider": "none", "model": None, "fallback": True, "reason": str(err)}
    else:
        profile = deterministic_jd_profile(title, description, declared)
        profile["source"] = "deterministic"
        profile["provider"] = {"provider": "none", "model": None, "fallback": True, "reason": "NIM not configured"}
    async with _LOCK:
        if len(_CACHE) > 500:
            _CACHE.pop(next(iter(_CACHE)), None)
        _CACHE[key] = profile
    return profile