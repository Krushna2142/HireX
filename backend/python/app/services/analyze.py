import io
from typing import List, Dict
import pdfminer.high_level as pdfminer
import spacy
from spacy.matcher import PhraseMatcher
from .nlp_components import create_section_header_detector

# Load spaCy model and add custom components once
_nlp = spacy.load("en_core_web_sm")
_nlp.add_pipe("section_header_detector", last=True)

# Base skills and synonyms
CANONICAL_SKILLS = [
    # Languages
    "python","javascript","typescript","java","c++","c#","go","rust","sql",
    # Frontend
    "react","next.js","vue","angular","redux","tailwind","html","css",
    # Backend
    "node","express","django","flask","spring","fastapi","graphql","rest",
    # Cloud/DevOps
    "aws","gcp","azure","docker","kubernetes","terraform","ansible","jenkins","git","ci","cd",
    # Data/ML
    "postgres","mysql","mongodb","redis","rabbitmq","airflow",
    "pytorch","tensorflow","sklearn","ml","machine learning","nlp","data engineering",
    # Other
    "system design","microservices"
]

SKILL_SYNONYMS = {
    # short forms and variants
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "node.js": "node",
    "react.js": "react",
    "nextjs": "next.js",
    "tf": "tensorflow",
    "sklearn": "sklearn",
    "ci/cd": "ci",
    "pgsql": "postgres",
    "mongo": "mongodb",
    "k8s": "kubernetes",
    "gcloud": "gcp",
    "aws cloud": "aws",
    "azure cloud": "azure",
    "micro-services": "microservices",
}

# Combine canonical skills and synonym keys for phrase matching
PHRASE_TERMS = list(set(CANONICAL_SKILLS + list(SKILL_SYNONYMS.keys())))
_phrase_matcher = PhraseMatcher(_nlp.vocab, attr="LOWER")
_phrase_patterns = [spacy.tokens.Doc(_nlp.vocab, words=term.split()) for term in PHRASE_TERMS]
_phrase_matcher.add("SKILL", _phrase_patterns)

# Lightweight job ontology: role -> required -> recommended resources
JOB_ONTOLOGY: Dict[str, Dict] = {
    "Full-Stack Engineer": {
        "required": ["javascript","react","node","sql"],
        "resources": [
            {"title":"The Odin Project","url":"https://www.theodinproject.com","type":"free"},
            {"title":"Full-Stack Open","url":"https://fullstackopen.com","type":"free"},
        ],
    },
    "Backend Engineer": {
        "required": ["node","express","sql","rest"],
        "resources": [
            {"title":"Node + Express Guide","url":"https://expressjs.com","type":"free"},
            {"title":"Designing APIs","url":"https://martinfowler.com/articles/richardsonMaturityModel.html","type":"free"},
        ],
    },
    "Frontend Engineer": {
        "required": ["javascript","react","html","css"],
        "resources": [
            {"title":"React Docs","url":"https://react.dev","type":"free"},
            {"title":"Web.dev Learn","url":"https://web.dev/learn","type":"free"},
        ],
    },
    "Data Engineer": {
        "required": ["python","sql","data engineering","aws"],
        "resources": [
            {"title":"Data Engineering Cookbook","url":"https://github.com/andkret/Cookbook","type":"free"},
            {"title":"Airflow Docs","url":"https://airflow.apache.org","type":"free"},
        ],
    },
    "ML Engineer": {
        "required": ["python","ml","pytorch","tensorflow"],
        "resources": [
            {"title":"DeepLearning.ai","url":"https://www.deeplearning.ai","type":"paid"},
            {"title":"Papers with Code","url":"https://paperswithcode.com","type":"free"},
        ],
    },
    "Cloud/DevOps Engineer": {
        "required": ["docker","kubernetes","aws"],
        "resources": [
            {"title":"Kubernetes Docs","url":"https://kubernetes.io/docs/home/","type":"free"},
            {"title":"AWS Training","url":"https://aws.amazon.com/training/","type":"free"},
        ],
    },
}

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    fp = io.BytesIO(pdf_bytes)
    try:
        text = pdfminer.extract_text(fp) or ""
        return text
    except Exception:
        return ""

def normalize_term(term: str) -> str:
    t = term.lower().strip()
    return SKILL_SYNONYMS.get(t, t)

def spacy_analyze(text: str) -> Dict:
    doc = _nlp(text)

    # Named entities
    orgs = sorted({ent.text for ent in doc.ents if ent.label_ == "ORG"})
    locs = sorted({ent.text for ent in doc.ents if ent.label_ in ("GPE", "LOC")})
    people = sorted({ent.text for ent in doc.ents if ent.label_ == "PERSON"})

    # Sections detected by custom component
    sections = [
        {"label": span.label_, "text": span.text[:800]} for span in (doc._.sections or [])
    ]

    # Skill matching with normalization and canonical filtering
    spans = _phrase_matcher(doc)
    found_set = set()
    for _, start, end in spans:
        term = doc[start:end].text
        norm = normalize_term(term)
        # If synonym → canonical, map to canonical
        canonical = SKILL_SYNONYMS.get(norm, norm)
        if canonical in CANONICAL_SKILLS:
            found_set.add(canonical)
        else:
            # If synonym not mapped, still store normalized term
            found_set.add(norm)

    categorized = categorize_skills(found_set)

    return {
        "entities": {"organizations": orgs, "locations": locs, "people": people},
        "sections": sections,
        "skills_raw": sorted(list(found_set)),
        "skillsCategorized": categorized,
    }

def categorize_skills(skills: set) -> Dict[str, List[str]]:
    categories = {
        "Languages": {"python","javascript","typescript","java","c++","c#","go","rust","sql"},
        "Frontend": {"react","next.js","vue","angular","redux","tailwind","html","css"},
        "Backend": {"node","express","django","flask","spring","fastapi","graphql","rest","microservices"},
        "Cloud/DevOps": {"aws","gcp","azure","docker","kubernetes","terraform","ansible","jenkins","git","ci","cd"},
        "Data/ML": {"postgres","mysql","mongodb","redis","rabbitmq","airflow","pytorch","tensorflow","sklearn","ml","machine learning","nlp","data engineering"},
        "Other": {"system design"},
    }
    cat_out: Dict[str, List[str]] = {k: [] for k in categories.keys()}
    for s in skills:
        placed = False
        for cat, vocab in categories.items():
            if s in vocab:
                cat_out[cat].append(s); placed = True; break
        if not placed:
            cat_out["Other"].append(s)
    for cat in cat_out:
        cat_out[cat] = sorted(list(set(cat_out[cat])))
    return cat_out

def recommend_roles(categorized: Dict[str, List[str]]) -> List[Dict]:
    normalized_flat = {s for items in categorized.values() for s in items}
    results = []
    for role, cfg in JOB_ONTOLOGY.items():
        req = cfg["required"]
        matched = [r for r in req if r in normalized_flat]
        pct = round(len(matched) / len(req) * 100)
        rationale = f"Matched {len(matched)}/{len(req)}: " + ", ".join(matched) if matched else "Few core matches detected"
        results.append({"role": role, "match": pct, "rationale": rationale, "resources": cfg["resources"]})
    results.sort(key=lambda x: x["match"], reverse=True)
    return results

def missing_skills(top_role: Dict, categorized: Dict[str, List[str]]) -> List[str]:
    if not top_role:
        return []
    normalized_flat = {s for items in categorized.values() for s in items}
    req = JOB_ONTOLOGY.get(top_role["role"], {}).get("required", [])
    return [r for r in req if r not in normalized_flat]

def analyze_pdf(pdf_bytes: bytes, filename: str) -> Dict:
    text = extract_text_from_pdf_bytes(pdf_bytes)
    nlp_result = spacy_analyze(text)

    total_words = len(text.split())
    roles = recommend_roles(nlp_result["skillsCategorized"])
    top = roles[0] if roles else None
    missing = missing_skills(top, nlp_result["skillsCategorized"]) if top else []

    return {
        "fileName": filename,
        "wordCount": total_words,
        "entities": nlp_result["entities"],
        "sections": nlp_result["sections"],
        "skillsCategorized": nlp_result["skillsCategorized"],
        "skills": sorted(list({s for items in nlp_result["skillsCategorized"].values() for s in items})),
        "roleRecommendations": roles,
        "missingSkills": missing,
        "preview": text[:1000],
    }