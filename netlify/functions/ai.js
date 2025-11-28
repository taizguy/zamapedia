export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const query = (body.query || '').toString();
    if (!query) return { statusCode: 400, body: JSON.stringify({ error: 'Missing query' }) };

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
