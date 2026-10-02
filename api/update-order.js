export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  const ADMIN_PWD = 'HF2026';

  try {
    const { id, status, pwd } = req.body || {};
    if (pwd !== ADMIN_PWD) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!id || !status) return res.status(400).json({ success: false });

    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

    const raw = await redis.get('order:' + id);
    if (!raw) return res.status(404).json({ success: false, error: 'Not found' });

    const order = typeof raw === 'string' ? JSON.parse(raw) : raw;
    order.status = status;
    order.updatedAt = Date.now();
    if (status === 'Delivered') order.deliveredAt = Date.now();

    await redis.set('order:' + id, order);

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
