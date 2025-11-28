import { URL } from 'url';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { load } from 'cheerio';

// SECURITY NOTE:
// This function fetches arbitrary URLs and extracts snippets. Before exposing
// publicly, restrict usage by implementing an allowlist of approved hostnames
// or require an API token. The function currently performs a best-effort
// ephemeral cache in the function container's temp dir; for durable caching
// use an external store (S3, Redis, etc.).

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600', 10); // seconds

function cacheDir() {
  const d = path.join(os.tmpdir(), 'zamapedia-fetch-cache');
  try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
  return d;
}

function cacheFilenameFor(url) {
  const h = crypto.createHash('sha256').update(url).digest('hex');
  return path.join(cacheDir(), `${h}.json`);
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
  try { await fsp.writeFile(fn, JSON.stringify(obj), 'utf8'); } catch (e) {}
}

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const raw = params.url;
    if (!raw) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'missing url parameter' }) };

    let parsed;
    try { parsed = new URL(raw); } catch (e) { return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'invalid url' }) }; }

    if (!/^https?:$/i.test(parsed.protocol)) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'only http/https allowed' }) };
    }

    // check cache first
    const cached = await readCache(raw);
    if (cached) return { statusCode: 200, body: JSON.stringify({ ok: true, cached: true, ...cached }) };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(raw, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);

    if (!resp.ok) return { statusCode: 502, body: JSON.stringify({ ok: false, status: resp.status, statusText: resp.statusText }) };

    const html = await resp.text();
    const $ = load(html || '');
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    const snippets = [];
    const headingKeywords = ['leaderboard', 'leaderboards', 'winners', 'winner', 'top 1000', 'season 2', 'season 3', 'season 4'];
    $('h1,h2,h3,h4,h5').each((i, el) => {
      const txt = $(el).text().toLowerCase();
      for (const kw of headingKeywords) {
        if (txt.includes(kw)) {
          const container = $(el).parent();
          const excerpt = container.text().replace(/\s+/g, ' ').trim();
          snippets.push({ kind: 'heading', heading: $(el).text().trim(), snippet: excerpt.slice(0, 2000) });
          break;
        }
      }
    });

    $('[class], [id]').each((i, el) => {
      const cls = ($(el).attr('class') || '') + ' ' + ($(el).attr('id') || '');
      const lower = cls.toLowerCase();
      if (lower.includes('leader') || lower.includes('winner')) {
        const snippet = $(el).text().replace(/\s+/g, ' ').trim();
        snippets.push({ kind: 'section', selector: cls.trim().slice(0,200), snippet: snippet.slice(0,2000) });
      }
    });

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

    const handles = Array.from(bodyText.matchAll(/@[-_A-Za-z0-9]{3,30}/g)).slice(0, 200).map(m => m[0]);
    const links = [];
    $('a[href]').each((i, a) => {
      const href = $(a).attr('href');
      if (!href) return;
      if (/x\.com|twitter\.com|farcaster|guild\.xyz|zama\.ai|zama\.org/.test(href)) links.push(href);
    });

    const result = { url: raw, title: parsed.hostname, snippets, handles: Array.from(new Set(handles)).slice(0,200), links: Array.from(new Set(links)).slice(0,200), fetchedAt: Date.now() };

    try { await writeCache(raw, result); } catch (e) {}

    return { statusCode: 200, body: JSON.stringify({ ok: true, cached: false, ...result }) };
  } catch (err) {
    if (err && err.name === 'AbortError') return { statusCode: 504, body: JSON.stringify({ ok: false, error: 'fetch timeout' }) };
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
