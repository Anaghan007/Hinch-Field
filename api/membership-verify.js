export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { code } = req.body || {};
    if (!code || !/^\d{4}$/.test(String(code).trim()))
      return res.status(400).json({ success: false, error: 'Invalid format' });

    const URL = process.env.KV_REST_API_URL;
    const TOKEN = process.env.KV_REST_API_TOKEN;

    const r = await fetch(`${URL}/get/member:${String(code).trim()}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const d = await r.json();
    if (!d.result) return res.status(404).json({ success: false, error: 'Code not found' });

    const m = typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
    if (!m.isActive) return res.status(400).json({ success: false, error: 'Inactive' });
    if (Date.now() > m.expiresAt) return res.status(400).json({ success: false, error: 'Expired' });

    return res.status(200).json({ success: true, name: m.name, expiresAt: m.expiresAt, discount: 50 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: 'Verify failed' });
  }
}
