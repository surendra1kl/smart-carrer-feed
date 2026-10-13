from typing import List, Dict

def rank_content(content_items: List[Dict], user_preferences: Dict) -> List[Dict]:
    """
    Ranks content based on keyword matching with user goals and interests.
    
    Args:
        content_items: List of dicts with 'title' and 'description'.
        user_preferences: Dict with 'goal' (str) and 'interests' (List[str]).
        
    Returns:
        Ranked list of content items.
    """
    goal = user_preferences.get('goal', '').lower()
    interests = [i.lower() for i in user_preferences.get('interests', [])]
    
    scored_items = []
    
    for item in content_items:
        score = 0
        title = item.get('title', '').lower()
        description = item.get('description', '').lower()
        text = f"{title} {description}"
        
        # 1. Goal Match (High Weight)
        if goal and goal in text:
            score += 10
            # Bonus for exact match in title
            if goal in title:
                score += 5
                
        # 2. Interests Match (Medium Weight)
        for interest in interests:
            if interest in text:
                score += 3
                if interest in title:
                    score += 2
                    
        # 3. Recency (Small Weight - assuming publishedAt exists)
        # In a real app, you'd calculate hours since published
        
        scored_items.append({**item, 'relevance_score': score})
        
    # Sort by score descending
    ranked_items = sorted(scored_items, key=lambda x: x['relevance_score'], reverse=True)
    
    return ranked_items

# Example Usage:
if __name__ == "__main__":
    sample_content = [
        {"title": "How to become an AI Engineer", "description": "A complete guide to machine learning and neural networks."},
        {"title": "Top 10 React Hooks", "description": "Improve your web development skills with these hooks."},
        {"title": "System Design Interview Prep", "description": "Master the art of scalable systems."},
    ]
    
    prefs = {
        "goal": "AI Engineer",
        "interests": ["Machine Learning", "System Design"]
    }
    
    ranked = rank_content(sample_content, prefs)
    for item in ranked:
        print(f"Score: {item['relevance_score']} | Title: {item['title']}")
