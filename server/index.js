const express = require('express');
const { URL } = require('url');
const app = express();
const PORT = process.env.PORT || 5178;

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const cheerio = require('cheerio');

app.use(express.json());

// ensure cache dir exists
const CACHE_DIR = path.join(__dirname, 'cache');
try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) {}

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600', 10); // seconds

function cacheFilenameFor(url) {
  const h = crypto.createHash('sha256').update(url).digest('hex');
  return path.join(CACHE_DIR, `${h}.json`);
}

async function readCache(url) {
  const fn = cacheFilenameFor(url);
  try {
    const stat = await fsp.stat(fn);
    const age = (Date.now() - stat.mtimeMs) / 1000;
    if (age > CACHE_TTL) return null;
    const txt = await fsp.readFile(fn, 'utf8');
    return JSON.parse(txt);
  } catch (e) { return null; }
}

async function writeCache(url, obj) {
  const fn = cacheFilenameFor(url);
  try {
    await fsp.writeFile(fn, JSON.stringify(obj), 'utf8');
  } catch (e) { /* ignore */ }
}

// Simple health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// GET /api/fetch?url=...
app.get('/api/fetch', async (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).json({ ok: false, error: 'missing url parameter' });

  let parsed;
  try {
    parsed = new URL(raw);
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'invalid url' });
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    return res.status(400).json({ ok: false, error: 'only http/https allowed' });
  }

  try {
    // check cache first
    const cached = await readCache(raw);
    if (cached) return res.json({ ok: true, cached: true, ...cached });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(raw, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);

    if (!resp.ok) return res.status(502).json({ ok: false, status: resp.status, statusText: resp.statusText });

    const html = await resp.text();

    // parse with cheerio for structured extraction
    const $ = cheerio.load(html || '');
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    const snippets = [];

    // Find candidate sections by headings containing keywords
    const headingKeywords = ['leaderboard', 'leaderboards', 'winners', 'winner', 'top 1000', 'season 2', 'season 3', 'season 4'];
    $('h1,h2,h3,h4,h5').each((i, el) => {
      const txt = $(el).text().toLowerCase();
      for (const kw of headingKeywords) {
        if (txt.includes(kw)) {
          // gather sibling content block
          const container = $(el).parent();
          const excerpt = container.text().replace(/\s+/g, ' ').trim();
          snippets.push({ kind: 'heading', heading: $(el).text().trim(), snippet: excerpt.slice(0, 2000) });
          break;
        }
      }
    });

    // also search for elements with class or id names that include leaderboard/winner
    $('[class], [id]').each((i, el) => {
      const cls = ($(el).attr('class') || '') + ' ' + ($(el).attr('id') || '');
      const lower = cls.toLowerCase();
      if (lower.includes('leader') || lower.includes('winner')) {
        const snippet = $(el).text().replace(/\s+/g, ' ').trim();
        snippets.push({ kind: 'section', selector: cls.trim().slice(0,200), snippet: snippet.slice(0,2000) });
      }
    });

    // fallback: raw body keyword search
    const lc = bodyText.toLowerCase();
    const keywords = ['season 2', 'season two', 'season 3', 'season 4', 'winner', 'winners', 'top 1000', 'leaderboard'];
    for (const kw of keywords) {
      const idx = lc.indexOf(kw);
      if (idx >= 0) {
        const start = Math.max(0, idx - 200);
        const snippet = bodyText.substring(start, Math.min(bodyText.length, idx + 200));
        snippets.push({ kind: 'keyword', keyword: kw, snippet });
      }
    }

    // extract @handles and direct links to X/Twitter/farcaster
    const handles = Array.from(bodyText.matchAll(/@[-_A-Za-z0-9]{3,30}/g)).slice(0, 200).map(m => m[0]);
    const links = [];
    $('a[href]').each((i, a) => {
      const href = $(a).attr('href');
      if (!href) return;
      if (/x\.com|twitter\.com|farcaster|guild\.xyz|zama\.ai|zama\.org/.test(href)) links.push(href);
    });

    const result = { url: raw, title: parsed.hostname, snippets, handles: Array.from(new Set(handles)).slice(0, 200), links: Array.from(new Set(links)).slice(0, 200), fetchedAt: Date.now() };

    // write cache (best-effort)
    try { await writeCache(raw, result); } catch (e) {}

    res.json({ ok: true, cached: false, ...result });
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ ok: false, error: 'fetch timeout' });
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Zamapedia server proxy running on port ${PORT}`);
});
