export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { ip } = req.body || {};
    if (!ip) return res.status(400).json({ success: false, error: 'IP required' });

    const URL = process.env.KV_REST_API_URL;
    const TOKEN = process.env.KV_REST_API_TOKEN;

    const r = await fetch(`${URL}/get/ip:${ip}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const d = await r.json();
    if (!d.result) return res.status(404).json({ success: false, error: 'Not found' });

    const data = typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
    if (Date.now() > data.expiresAt) return res.status(400).json({ success: false, error: 'Expired' });

    return res.status(200).json({ success: true, code: data.code, name: data.name, expiresAt: data.expiresAt });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: 'Lookup failed' });
  }
}
