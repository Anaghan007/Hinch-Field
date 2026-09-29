export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { name, phone } = req.body || {};
    if (!name || !phone) return res.status(400).json({ success: false, error: 'Name & phone required' });

    const URL = process.env.KV_REST_API_URL;
    const TOKEN = process.env.KV_REST_API_TOKEN;

    let code, tries = 0;
    do {
      code = String(Math.floor(1000 + Math.random() * 9000));
      const c = await fetch(`${URL}/get/member:${code}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const d = await c.json();
      if (!d.result) break;
      tries++;
    } while (tries < 30);

    if (tries >= 30) return res.status(500).json({ success: false, error: 'Try again' });

    const now = Date.now();
    const clean = String(phone).replace(/[^0-9]/g, '');
    const m = { code, name: String(name).trim(), phone: clean, purchasedAt: now, expiresAt: now + 365*24*60*60*1000, isActive: true };

    // Save member by code
    await fetch(`${URL}/set/member:${code}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(m)
    });

    // Save phone index → code
    await fetch(`${URL}/set/phone:${clean}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(code)
    });

    return res.status(200).json({ success: true, code, expiresAt: m.expiresAt });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: 'Failed' });
  }
}
