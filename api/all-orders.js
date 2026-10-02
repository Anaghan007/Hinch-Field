export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ADMIN_PWD = 'HF2026';

  try {
    if (req.query.pwd !== ADMIN_PWD) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

    const ids = await redis.lrange('orders:all', 0, -1);
    if (!ids || !ids.length) return res.status(200).json({ success: true, orders: [] });

    const orders = [];
    for (const id of ids) {
      const raw = await redis.get('order:' + id);
      if (raw) {
        try { orders.push(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch (e) {}
      }
    }

    return res.status(200).json({ success: true, orders });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
