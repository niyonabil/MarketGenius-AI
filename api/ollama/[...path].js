const OLLAMA_CLOUD_HOST = 'https://ollama.com';

export default async function handler(req, res) {
  const segments = req.query.path;
  const path = Array.isArray(segments) ? segments.join('/') : (segments || '');

  if (!path) {
    return res.status(400).json({ error: 'Missing Ollama API path.' });
  }

  const upstreamUrl = `${OLLAMA_CLOUD_HOST}/${path}`;
  const authHeader = req.headers.authorization;
  const envApiKey = process.env.OLLAMA_API_KEY;

  const headers = { 'Content-Type': 'application/json' };
  if (authHeader) {
    headers.Authorization = authHeader;
  } else if (envApiKey) {
    headers.Authorization = `Bearer ${envApiKey}`;
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body)
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const text = await upstream.text();
    res.setHeader('content-type', contentType);
    return res.status(upstream.status).send(text);
  } catch (error) {
    return res.status(502).json({ error: error?.message || 'Upstream Ollama request failed.' });
  }
}
