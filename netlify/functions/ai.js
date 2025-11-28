export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const query = (body.query || '').toString();
    if (!query) return { statusCode: 400, body: JSON.stringify({ error: 'Missing query' }) };

    // Quick server-side relevance guard: refuse non-Zama queries early.
    // This prevents the model from answering unrelated topics and avoids
    // unnecessary upstream API calls. If you need a more sophisticated
    // classifier, replace this with an ML-based checker or an allowlist.
    const isZamaRelated = (q) => {
      const s = (q || '').toLowerCase();
      const kws = ['zama', 'fhe', 'fhevm', 'homomorphic', 'homomorphic encryption', 'zk', 'zkp', 'zero-knowledge', 'zama.ai', 'zama.org', 'farcaster', 'guild', 'leaderboard'];
      for (const k of kws) {
        if (s.includes(k)) return true;
      }
      return false;
    };

    if (!isZamaRelated(query)) {
      // Return the special refusal string the frontend recognizes.
      return { statusCode: 200, body: JSON.stringify({ text: 'i only gZama bro!' }) };
    }

    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';
    const API_KEY = process.env.GEMINI_KEY;

    if (!API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_KEY not configured' }) };
    }

    const payload = {
      contents: [{ parts: [{ text: query }] }]
    };

    const res = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: t }) };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { statusCode: 200, body: JSON.stringify({ text, raw: data }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
