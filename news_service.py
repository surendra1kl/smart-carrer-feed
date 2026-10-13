from fastapi import FastAPI, HTTPException, Query
import httpx
import os
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Smart Career Feed - News Service")

# Configuration
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
BASE_URL = "https://newsapi.org/v2/everything"

# Common career keywords for filtering
CAREER_KEYWORDS = [
    "career", "job", "hiring", "skills", "learning", "tutorial", "guide", 
    "roadmap", "interview", "salary", "promotion", "workplace", "productivity",
    "technology", "programming", "engineering", "design", "management"
]

@app.get("/fetch-news")
async def fetch_career_news(
    query: str = Query(..., description="The career goal or topic to search for"),
    interests: Optional[str] = Query(None, description="Comma-separated interests")
):
    """
    Fetches articles from NewsAPI and filters them based on career-related keywords.
    """
    if not NEWS_API_KEY:
        raise HTTPException(status_code=500, detail="NEWS_API_KEY not configured")

    # Construct the search query
    search_query = query
    if interests:
        search_query += f" AND ({' OR '.join(interests.split(','))})"

    try:
        async with httpx.AsyncClient() as client:
            params = {
                "q": search_query,
                "sortBy": "relevancy",
                "pageSize": 20,
                "language": "en",
                "apiKey": NEWS_API_KEY
            }
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            articles = data.get("articles", [])
            filtered_articles = []

            for article in articles:
                title = (article.get("title") or "").lower()
                description = (article.get("description") or "").lower()
                content = (article.get("content") or "").lower()
                full_text = f"{title} {description} {content}"

                # Basic Filtering: Check if at least one career keyword is present
                # This helps remove generic news that just happens to mention the query
                is_relevant = any(keyword in full_text for keyword in CAREER_KEYWORDS)

                if is_relevant:
                    filtered_articles.append({
                        "id": article.get("url"),
                        "title": article.get("title"),
                        "description": article.get("description"),
                        "url": article.get("url"),
                        "source": "News",
                        "thumbnail": article.get("urlToImage"),
                        "publishedAt": article.get("publishedAt"),
                        "author": article.get("author")
                    })

            return {
                "total_results": len(filtered_articles),
                "articles": filtered_articles
            }

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"NewsAPI error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Run this service independently if needed
    uvicorn.run(app, host="0.0.0.0", port=8001)
