export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ADMIN_PWD = 'HF2026';
  const action = req.query.action;

  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN
    });

    // SAVE ORDER
    if (action === 'save' && req.method === 'POST') {
      const { order } = req.body || {};
      if (!order || !order.id) {
        return res.status(400).json({ success: false, error: 'Invalid order' });
      }
      await redis.set('order:' + order.id, order);
      await redis.lpush('orders:all', order.id);
      return res.status(200).json({ success: true, id: order.id });
    }

    // LIST ALL ORDERS
    if (action === 'list' && req.method === 'GET') {
      if (req.query.pwd !== ADMIN_PWD) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
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
    }

    // UPDATE STATUS
    if (action === 'update' && req.method === 'POST') {
      const { id, status, pwd } = req.body || {};
      if (pwd !== ADMIN_PWD) return res.status(401).json({ success: false, error: 'Unauthorized' });
      if (!id || !status) return res.status(400).json({ success: false, error: 'Missing data' });

      const raw = await redis.get('order:' + id);
      if (!raw) return res.status(404).json({ success: false, error: 'Not found' });

      const order = typeof raw === 'string' ? JSON.parse(raw) : raw;
      order.status = status;
      order.updatedAt = Date.now();
      if (status === 'Delivered') order.deliveredAt = Date.now();

      await redis.set('order:' + id, order);
      return res.status(200).json({ success: true });
    }

    // MY ORDERS (public — by phone)
    if (action === 'my-orders' && req.method === 'GET') {
      const phone = (req.query.phone || '').replace(/[^0-9]/g, '');
      if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });

      const ids = await redis.lrange('orders:all', 0, -1);
      if (!ids || !ids.length) return res.status(200).json({ success: true, orders: [] });

      const orders = [];
      for (const id of ids) {
        const raw = await redis.get('order:' + id);
        if (raw) {
          try {
            const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const oPhone = (o.customer && o.customer.phone || '').replace(/[^0-9]/g, '');
            if (oPhone && oPhone.endsWith(phone.slice(-10))) orders.push(o);
          } catch (e) {}
        }
      }
      return res.status(200).json({ success: true, orders });
    }

    // CUSTOMER CANCEL (phone verification)
    if (action === 'cancel' && req.method === 'POST') {
      const { id, phone } = req.body || {};
      if (!id || !phone) return res.status(400).json({ success: false, error: 'Missing id or phone' });

      const raw = await redis.get('order:' + id);
      if (!raw) return res.status(404).json({ success: false, error: 'Not found' });

      const order = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const oPhone = (order.customer && order.customer.phone || '').replace(/[^0-9]/g, '');
      const cPhone = phone.replace(/[^0-9]/g, '');
      if (!oPhone.endsWith(cPhone.slice(-10))) {
        return res.status(403).json({ success: false, error: 'Phone mismatch' });
      }

      // 24-hour check
      if (Date.now() - order.timestamp > 24*60*60*1000) {
        return res.status(400).json({ success: false, error: 'Cannot cancel after 24 hours' });
      }

      order.status = 'Cancelled';
      order.updatedAt = Date.now();
      await redis.set('order:' + id, order);

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (e) {
    console.error('orders API error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
