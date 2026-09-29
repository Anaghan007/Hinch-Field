export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });

    const URL = process.env.KV_REST_API_URL;
    const TOKEN = process.env.KV_REST_API_TOKEN;
    const clean = String(phone).replace(/[^0-9]/g, '');

    const r = await fetch(`${URL}/get/phone:${clean}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const d = await r.json();
    if (!d.result) return res.status(404).json({ success: false, error: 'No membership found' });

    const code = typeof d.result === 'string' ? d.result : d.result.code;
    const m = await fetch(`${URL}/get/member:${code}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const md = await m.json();
    if (!md.result) return res.status(404).json({ success: false, error: 'Not found' });

    const mem = typeof md.result === 'string' ? JSON.parse(md.result) : md.result;
    if (!mem.isActive) return res.status(400).json({ success: false, error: 'Inactive' });
    if (Date.now() > mem.expiresAt) return res.status(400).json({ success: false, error: 'Expired' });

    return res.status(200).json({ success: true, code: mem.code, name: mem.name, phone: mem.phone, expiresAt: mem.expiresAt });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: 'Lookup failed' });
  }
}
