import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/feed", async (req, res) => {
    const { goal, interests } = req.query;
    if (!goal) return res.status(400).json({ error: "Goal is required" });

    const newsKey = process.env.NEWS_API_KEY;
    const youtubeKey = process.env.YOUTUBE_API_KEY;
    const interestList = (interests as string || "").split(",").filter(Boolean);

    try {
      // Fetch News
      let newsItems = [];
      if (newsKey) {
        const newsQuery = interestList.length > 0 
          ? `${goal} AND (${interestList.join(" OR ")})`
          : goal as string;

        const newsRes = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(newsQuery)}&sortBy=relevancy&pageSize=12&language=en&apiKey=${newsKey}`
        );
        
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          newsItems = (newsData.articles || []).map((a: any) => ({
            id: a.url,
            title: a.title,
            description: a.description,
            url: a.url,
            source: "News",
            thumbnail: a.urlToImage,
            publishedAt: a.publishedAt,
          }));
        } else {
          console.error("NewsAPI Error:", await newsRes.text());
        }
      }

      // Fetch YouTube
      let youtubeItems = [];
      if (youtubeKey) {
        const ytQuery = interestList.length > 0 
          ? `${goal} ${interestList.join(" ")}`
          : goal as string;

        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(ytQuery)}&maxResults=12&type=video&key=${youtubeKey}`
        );
        
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          youtubeItems = (ytData.items || []).map((v: any) => ({
            id: v.id.videoId,
            title: v.snippet.title,
            description: v.snippet.description,
            url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
            source: "YouTube",
            thumbnail: v.snippet.thumbnails.high.url,
            publishedAt: v.snippet.publishedAt,
          }));
        } else {
          console.error("YouTube API Error:", await ytRes.text());
        }
      }

      // Fetch GitHub Repositories
      let githubItems = [];
      const githubToken = process.env.GITHUB_TOKEN;
      const ghQuery = interestList.length > 0 
        ? `${goal} ${interestList.join(" ")}`
        : goal as string;

      const ghRes = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(ghQuery)}&sort=stars&order=desc&per_page=12`,
        {
          headers: {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "CareerFeed-App",
            ...(githubToken ? { "Authorization": `token ${githubToken}` } : {})
          }
        }
      );

      if (ghRes.ok) {
        const ghData = await ghRes.json();
        githubItems = (ghData.items || []).map((repo: any) => ({
          id: repo.id.toString(),
          title: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          source: "GitHub",
          thumbnail: repo.owner.avatar_url,
          publishedAt: repo.updated_at,
        }));
      } else {
        console.error("GitHub API Error:", await ghRes.text());
      }

      // Fetch Reddit Posts
      let redditItems = [];
      const redditQuery = interestList.length > 0 
        ? `${goal} ${interestList.join(" ")}`
        : goal as string;

      // Using public .json endpoint for simplicity and reliability in preview
      const redditRes = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(redditQuery)}&sort=relevance&limit=12`,
        {
          headers: {
            "User-Agent": "CareerFeed-App/1.0"
          }
        }
      );

      if (redditRes.ok) {
        const redditData = await redditRes.json();
        redditItems = (redditData.data.children || []).map((child: any) => {
          const post = child.data;
          return {
            id: post.id,
            title: post.title,
            description: post.selftext || `Posted in r/${post.subreddit}`,
            url: `https://www.reddit.com${post.permalink}`,
            source: "Reddit",
            thumbnail: post.thumbnail && post.thumbnail.startsWith("http") ? post.thumbnail : "https://www.redditstatic.com/icon.png",
            publishedAt: new Date(post.created_utc * 1000).toISOString(),
          };
        });
      } else {
        console.error("Reddit API Error:", await redditRes.text());
      }

      // Combine
      let combined = [...newsItems, ...youtubeItems, ...githubItems, ...redditItems];

      // Simple Keyword-Based Ranking (Node.js version of recommendation_engine.py)
      const goalLower = (goal as string).toLowerCase();
      const interestsLower = interestList.map(i => i.toLowerCase());

      combined = combined.map(item => {
        let score = 0;
        const text = `${item.title} ${item.description}`.toLowerCase();
        
        if (text.includes(goalLower)) score += 10;
        if (item.title.toLowerCase().includes(goalLower)) score += 5;
        
        interestsLower.forEach(interest => {
          if (text.includes(interest)) score += 3;
          if (item.title.toLowerCase().includes(interest)) score += 2;
        });

        return { ...item, relevance_score: score };
      });

      // Sort by score descending, then by date
      combined.sort((a, b) => {
        if (b.relevance_score !== a.relevance_score) {
          return b.relevance_score - a.relevance_score;
        }
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });

      res.json(combined);
    } catch (error) {
      console.error("Feed fetch error:", error);
      res.status(500).json({ error: "Failed to fetch feed" });
    }
  });

  app.post("/api/generate-interests", async (req, res) => {
    const { goal } = req.body;
    if (!goal) return res.status(400).json({ error: "Goal is required" });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a list of 8-10 specific technical interests, skills, or topics that someone aiming to be a "${goal}" should follow to stay updated. 
        Return as a JSON array of strings. 
        Example for "Web Developer": ["React", "Tailwind CSS", "Node.js", "Web Performance", "Accessibility", "TypeScript", "System Design", "Frontend Security"].`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              interests: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["interests"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (error) {
      console.error("Interest Generation Error:", error);
      res.status(500).json({ error: "Failed to generate interests" });
    }
  });

  app.post("/api/generate-schedule", async (req, res) => {
    const { prompt } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              schedule: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    task: { type: Type.STRING },
                    time: { type: Type.STRING }
                  },
                  required: ["task", "time"]
                }
              }
            },
            required: ["schedule"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (error) {
      console.error("Schedule Generation Error:", error);
      res.status(500).json({ error: "Failed to generate schedule" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
