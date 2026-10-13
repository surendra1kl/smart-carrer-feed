from fastapi import FastAPI, Query
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

@app.get("/api/feed")
async def get_feed(goal: str = Query(...)):
    combined_feed = []
    
    # 1. Fetch News
    if NEWS_API_KEY:
        async with httpx.AsyncClient() as client:
            news_url = f"https://newsapi.org/v2/everything?q={goal}&sortBy=relevancy&pageSize=5&apiKey={NEWS_API_KEY}"
            response = await client.get(news_url)
            data = response.json()
            articles = data.get("articles", [])
            for a in articles:
                combined_feed.append({
                    "title": a["title"],
                    "description": a["description"],
                    "url": a["url"],
                    "source": "News"
                })

    # 2. Fetch YouTube
    if YOUTUBE_API_KEY:
        async with httpx.AsyncClient() as client:
            yt_url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={goal}&maxResults=5&type=video&key={YOUTUBE_API_KEY}"
            response = await client.get(yt_url)
            data = response.json()
            videos = data.get("items", [])
            for v in videos:
                combined_feed.append({
                    "title": v["snippet"]["title"],
                    "description": v["snippet"]["description"],
                    "url": f"https://www.youtube.com/watch?v={v['id']['videoId']}",
                    "source": "YouTube"
                })

    # 3. Simple Ranking (In real app, use AI here)
    # For now, just return combined
    return combined_feed

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
