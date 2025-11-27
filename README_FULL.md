Zamapedia — Local Development & Deployment Guide
===============================================

Overview
--------
Zamapedia is a single-page React app (Vite) that provides a Zama-focused AI assistant. Key features:

- Frontend (React + Vite)
  - Interactive background `ZCanvas` animation
  - Live background assistant avatar with TTS + fallback audio
  - Query UI and answer rendering with inline, clickable source links
  - Sources Manager (localStorage) to curate trusted Zama sources
  - Client-side relevance classifier to keep the assistant Zama-focused

- Server (Express proxy)
  - `GET /api/fetch?url=...`: server-side fetch proxy that retrieves pages (bypassing CORS), extracts snippets/handles/links using Cheerio, and caches results on disk.
  - File-based cache to reduce repeated fetches.

Purpose of this README
----------------------
This document explains how to set up the project locally, run the development environment (both frontend and server), configure the AI API key (if you want to enable direct AI calls), and troubleshoot common issues.

Requirements
------------
- Node.js 18+ (LTS recommended)
- npm (comes with Node)
- Windows PowerShell (instructions include PowerShell commands)

Quick start (developer)
-----------------------
Open two terminals (or tabs) and run the server and the frontend separately.

1) Start the server (proxy + scraper):

```powershell
cd server
npm install
npm start
```

The server listens on port 5178 by default. You can change the port by setting the `PORT` environment variable.

2) Start the frontend (dev server):

```powershell
# from project root
npm install
npm run dev
```

This starts the Vite dev server (usually on port 5173). Open the URL printed by Vite in your browser.

Notes:
- The frontend calls `/api/fetch` relative to the current host. When running the dev server, make sure the server is reachable at the same origin or adjust your host/proxy. If the frontend and server are on different origins, update the fetch URL in the frontend (in `src/App.jsx`) to point to the server host (e.g., `http://localhost:5178/api/fetch`).

Configuring the AI key
----------------------
The app can send queries to an AI endpoint defined in `src/App.jsx` under `API_CONFIG`. By default this file contains a placeholder API configuration. To enable AI calls:

- Option A (quick edit): open `src/App.jsx`, find `API_CONFIG` and replace `apiKey` with your key.
- Option B (preferred): change the code to read `import.meta.env.VITE_GL_API_KEY` and create a `.env.local` file in the project root with:

```properties
VITE_GL_API_KEY=your_real_api_key_here
```

Note: Many cloud LLM APIs are not CORS-enabled for direct browser usage. For production use you should send AI requests from a server-side endpoint (not from the browser) to keep the API key secret and avoid CORS issues.

Server-side fetch proxy & caching
---------------------------------
The server implements a `GET /api/fetch?url=...` endpoint that:

- Fetches the page server-side (10s timeout)
- Parses HTML with `cheerio` and extracts candidate snippets (leaderboards, winners, handles, relevant links)
- Stores a JSON cache file under `server/cache/` to avoid repeated fetches (default TTL = 3600s)

Environment variables (server):
- `PORT` — server port (default 5178)
- `CACHE_TTL` — cache time-to-live in seconds (default 3600)

Automatic snippet inclusion (RAG helper)
----------------------------------------
When you submit a query, the frontend will attempt to gather snippets from your saved `zamaSources` by calling `/api/fetch` and include returned snippets in the AI request payload. This helps the model answer using the curated sources.

Sources Manager (curation UX)
-----------------------------
In the app header there is a `Sources` button that opens the Sources Manager modal. You can:

- Add trusted sources (title + URL)
- Remove sources
- Import/Export sources as JSON
- Click `Fetch` next to a source to have the server fetch and extract snippets/handles/links and display a quick status ("Snippet found" / "No snippet found").

If a page is blocked by client-side CORS, the server proxy will fetch it successfully and return data to the frontend.

Key files & components
----------------------
- `src/App.jsx` — main app file (UI components, AI integration, classifier, SourcesManager, ZCanvas)
- `src/index.css` — global styles and animations
- `src/assets/` — images used by the app
- `server/index.js` — Express proxy, snippet extraction (Cheerio), caching
- `server/package.json` — server dependencies

Dev workflow & notes
--------------------
- Use separate terminals for server and frontend.
- When you change server code, restart the server.
- When you change frontend code, Vite will hot-reload most edits.

Production & deployment ideas
-----------------------------
- Build frontend: `npm run build` (from project root). This generates `dist/`.
- Serve the built frontend from a static host (Netlify, Vercel, S3 + CloudFront) or let the server serve static files (you'd need to update `server/index.js` to host `dist/` or use a separate static server).
- For a secure deployment, host the server behind an authenticated endpoint and restrict `/api/fetch` to an allowlist of domains or require an API token to avoid misuse.
- For RAG at scale, implement an ingestion pipeline:
  - Periodic crawler fetches curated `zamaSources` server-side.
  - Extract sections and create embeddings (OpenAI embeddings or local model)
  - Store embeddings in a vector DB (Pinecone, Weaviate, Qdrant, or FAISS) and retrieve top passages at query time.

Troubleshooting
---------------
- TTS not working:
  - Many browsers restrict SpeechSynthesis in cross-origin or non-secure contexts. Use the "Play sound" fallback button (fires a beep/melody).
- `Failed to connect to the AI Assistant` or 401/403:
  - Check `API_CONFIG` in `src/App.jsx` and make sure the API key is correct.
  - Prefer calling AI APIs from server-side to avoid CORS and protect the key.
- Server fetch returns an error:
  - Check server logs (terminal where `npm start` for server was run).
  - The server may time out (10s default). Increase the timeout in `server/index.js` if needed.
- No snippet found for a source:
  - Some sites embed content via JS or load it dynamically (client-side). The server tries to parse HTML but may not execute JavaScript—if content is loaded dynamically, consider using a headless browser (Puppeteer) in your indexer.

Security & privacy
------------------
- Do not commit real API keys to the repository. Use environment variables or a secure secret manager.
- The `/api/fetch` endpoint can fetch arbitrary URLs. Restrict its usage before exposing it publicly (use an allowlist or require an API key).

Extending the app
-----------------
- Improve the classifier: replace the keyword-based classifier with an embedding-based or trained classifier to reduce false positives.
- Implement full RAG: periodic ingestion, embeddings, and a vector DB for accurate retrieval.
- Add site-specific parsers (e.g., `zama.org`) to extract structured winners/leaderboard data instead of heuristic text matching.
- Add telemetry to log which sources were used in answers, to help curate and improve grounding.

Contributing
------------
- Pull requests welcome. Please keep changes focused and update this README if you add or change behavior.

License
-------
(Choose a license and add it to the repo. No license is specified in this project.)

Contact
-------
For questions about this project, open an issue in the repository or contact the maintainer.
