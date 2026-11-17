import re
import math
from collections import Counter
from typing import List, Dict, Tuple

# Pre-defined Concept Bank (No LLM needed, pure data structure)
INTERVIEW_CONCEPT_BANK = {
    "tell_me_about_yourself": {
        "expected_concepts": ["background", "experience", "skills", "passion", "role", "company", "goals"],
        "min_words": 50,
        "max_words": 250
    },
    "explain_challenge": {
        "expected_concepts": ["problem", "solution", "debug", "architecture", "team", "result", "learned", "impact"],
        "min_words": 100,
        "max_words": 500
    },
    "system_design": {
        "expected_concepts": ["database", "api", "cache", "load balancer", "scalability", "microservices", "latency", "throughput"],
        "min_words": 150,
        "max_words": 800
    }
}

def tokenize(text: str) -> List[str]:
    """Convert text to lowercase tokens, removing punctuation"""
    text = text.lower()
    tokens = re.findall(r'\b[a-z0-9]+\b', text)
    return tokens

def calculate_jaccard_similarity(list1: List[str], list2: List[str]) -> float:
    """Mathematical similarity between two sets of words"""
    set1, set2 = set(list1), set(list2)
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    if not union: return 0.0
    return len(intersection) / len(union)

def calculate_tf_idf_density(candidate_tokens: List[str], concept_words: List[str]) -> float:
    """Calculates how densely the candidate used the expected concepts"""
    candidate_counts = Counter(candidate_tokens)
    total_words = len(candidate_tokens)
    if total_words == 0: return 0.0
    
    concept_hits = sum(candidate_counts[word] for word in concept_words if word in candidate_counts)
    return (concept_hits / total_words) * 100

def evaluate_answer_from_scratch(question_category: str, candidate_answer: str) -> Dict[str, Any]:
    """
    FROM SCRATCH EVALUATION ALGORITHM:
    1. Checks structural constraints (length).
    2. Calculates Jaccard Similarity (Concept Coverage).
    3. Calculates TF Density (Concept Focus).
    4. Outputs a mathematical score (0-100).
    """
    config = INTERVIEW_CONCEPT_BANK.get(question_category, INTERVIEW_CONCEPT_BANK["tell_me_about_yourself"])
    expected_concepts = config["expected_concepts"]
    
    tokens = tokenize(candidate_answer)
    word_count = len(tokens)
    
    # 1. Structural Score (Did they write enough?)
    min_w, max_w = config["min_words"], config["max_words"]
    if word_count < min_w:
        structural_score = (word_count / min_w) * 50 # Penalty for too short
    elif word_count > max_w:
        structural_score = 70 # Penalty for rambling
    else:
        structural_score = 100 # Perfect length
        
    # 2. Concept Coverage Score (Jaccard Similarity)
    jaccard_score = calculate_jaccard_similarity(tokens, expected_concepts) * 100
    
    # 3. Concept Density Score (TF-IDF approach)
    density_score = calculate_tf_idf_density(tokens, expected_concepts)
    density_score = min(100, density_score * 5) # Scale it up
    
    # 4. Final Weighted Score
    # 30% Structure, 40% Concept Coverage, 30% Concept Density
    final_score = round(
        (structural_score * 0.30) + 
        (jaccard_score * 0.40) + 
        (density_score * 0.30), 
        1
    )
    
    # Generate Rule-Based Feedback
    feedback = []
    if structural_score < 60:
        feedback.append("Your answer was too brief. Provide more context and details.")
    if jaccard_score < 30:
        feedback.append(f"Missing key concepts. Try to include terms related to: {', '.join(expected_concepts[:3])}.")
    if final_score >= 80:
        feedback.append("Excellent structure and highly relevant technical concepts.")
        
    return {
        "score": final_score,
        "word_count": word_count,
        "concept_coverage_percent": round(jaccard_score, 1),
        "feedback": " ".join(feedback) if feedback else "Good answer.",
        "missing_concepts": [c for c in expected_concepts if c not in tokens]
    }