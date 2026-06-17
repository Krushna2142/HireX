# python-ai-service/app/recommendations/service.py
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Dict, Any

class RecommendationEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=5000,
            ngram_range=(1, 2)
        )
        
    def match_resume_to_jobs(self, resume_text: str, jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Uses Scikit-Learn TF-IDF to match resume text against job descriptions.
        Returns jobs sorted by match score (0-100).
        """
        if not jobs or not resume_text.strip():
            return []
            
        # Combine title, description, and skills for better matching
        job_texts = [
            f"{job.get('title', '')} {job.get('description', '')} {' '.join(job.get('required_skills', []))}" 
            for job in jobs
        ]
        
        texts = [resume_text] + job_texts
        
        try:
            # Fit and transform all texts
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # Calculate cosine similarity between resume (index 0) and all jobs
            cosine_similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
            
            # Build scored jobs list
            scored_jobs = []
            for idx, score in enumerate(cosine_similarities):
                job = jobs[idx].copy()
                # Convert to percentage (0-100)
                job['match_score'] = round(float(score * 100), 2)
                job['similarity_score'] = round(float(score), 4)
                scored_jobs.append(job)
                
            # Sort by highest match score
            scored_jobs.sort(key=lambda x: x['match_score'], reverse=True)
            
            return scored_jobs
            
        except Exception as e:
            print(f"[RecommendationEngine] Error in scikit-learn matching: {e}")
            # Return jobs without scores if matching fails
            return jobs