const ADMIN_PWD = 'HF2026';
const OTP_EXPIRY_MS = 5 * 60 * 1000;        // 5 min
const SESSION_EXPIRY_DAYS = 365;             // 1 year

function generateSessionKey(){
  return 'sk_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN
    });

    /* ═══ SAVE ORDER ═══ */
    if (action === 'save' && req.method === 'POST') {
      const { order, session_key } = req.body || {};
      if (!order || !order.id) return res.status(400).json({ success: false, error: 'Invalid order' });

      await redis.set('order:' + order.id, order);
      await redis.lpush('orders:all', order.id);

      // 🔑 Resolve email: accountEmail → session → cart email
      let em = '';
      // 1️⃣ Priority: accountEmail (login user's email)
      if (order.customer && order.customer.accountEmail) {
        em = order.customer.accountEmail.toLowerCase().trim();
        console.log('   → Using accountEmail:', em);
      }
      // 2️⃣ Fallback: session key
      if (!em && session_key) {
        try {
          const sess = await redis.get('session:' + session_key);
          if (sess) {
            const s = typeof sess === 'string' ? JSON.parse(sess) : sess;
            em = (s.email || '').toLowerCase().trim();
            console.log('   → Using session email:', em);
          }
        } catch(e){ console.error('Session lookup error:', e); }
      }
      // 3️⃣ Last fallback: cart email
      if (!em && order.customer && order.customer.email) {
        em = order.customer.email.toLowerCase().trim();
        console.log('   → Using cart email:', em);
      }

      if (em) {
        await redis.sadd('user:' + em + ':orders', order.id);
        console.log('✅ Linked order', order.id, 'to user', em);
      } else {
        console.warn('❌ Order', order.id, 'has NO email — cannot link');
      }

      return res.status(200).json({ success: true, id: order.id, email: em });
    }

    /* ═══ LIST ALL ORDERS (Admin) ═══ */
    if (action === 'list' && req.method === 'GET') {
      if (req.query.pwd !== ADMIN_PWD) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const ids = await redis.lrange('orders:all', 0, -1);
      if (!ids || !ids.length) return res.status(200).json({ success: true, orders: [] });
      const orders = [];
      for (const id of ids) {
        const raw = await redis.get('order:' + id);
        if (raw) { try { orders.push(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch (e) {} }
      }
      return res.status(200).json({ success: true, orders });
    }

    /* ═══ UPDATE STATUS ═══ */
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

    /* ═══ SET ADMIN DEVICE ═══ */
    if (action === 'set-admin' && req.method === 'POST') {
      const { deviceId, pwd } = req.body || {};
      if (pwd !== ADMIN_PWD) return res.status(401).json({ success: false, error: 'Unauthorized' });
      if (!deviceId) return res.status(400).json({ success: false, error: 'Missing deviceId' });
      await redis.set('admin:device', deviceId);
      return res.status(200).json({ success: true });
    }

    /* ═══ GET ADMIN DEVICE ═══ */
    if (action === 'get-admin' && req.method === 'GET') {
      const deviceId = await redis.get('admin:device');
      return res.status(200).json({ success: true, deviceId: deviceId || null });
    }

    /* ═══ SEND OTP ═══ */
    if (action === 'send-otp' && req.method === 'POST') {
      const { email } = req.body || {};
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return res.status(400).json({ success: false, error: 'Valid email required' });
      }
      const cleanEmail = email.toLowerCase().trim();
      const otp = String(Math.floor(1000 + Math.random() * 9000));
      await redis.set('otp:' + cleanEmail, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS }, { ex: 300 });
      // Send via Resend
      const KEY = process.env.RESEND_API_KEY;
      if (!KEY) return res.status(500).json({ success: false, error: 'Email service not configured' });
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'HinchField <orders@hinchfield.store>',
            to: [cleanEmail],
            subject: '🔐 Your HinchField Login Code: ' + otp,
            html: '<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px 24px;background:#FFFFFF;color:#0A0A0A;">' +
              '<div style="text-align:center;padding-bottom:20px;border-bottom:2px solid #0A0A0A;margin-bottom:24px;"><h1 style="font-family:Georgia,serif;font-size:22px;letter-spacing:4px;margin:0;">HINCHFIELD</h1></div>' +
              '<p style="font-size:13px;color:#7C7C7C;margin:0 0 8px;">Your login code</p>' +
              '<p style="font-size:38px;letter-spacing:14px;font-weight:700;margin:0;padding:20px;text-align:center;background:#F5F4F2;">' + otp + '</p>' +
              '<p style="font-size:12px;color:#7C7C7C;margin:20px 0 0;">Valid for 5 minutes. If you didn\'t request this, ignore this email.</p>' +
              '<p style="font-size:10px;color:#7C7C7C;margin:32px 0 0;text-align:center;border-top:1px solid #E6E4E0;padding-top:16px;">© 2026 HinchField · hinchfield.store</p>' +
            '</div>'
          })
        });
      } catch (e) { console.error('Resend error:', e); }
      return res.status(200).json({ success: true });
    }

    /* ═══ VERIFY OTP ═══ */
    if (action === 'verify-otp' && req.method === 'POST') {
      const { email, otp, deviceId } = req.body || {};
      if (!email || !otp) return res.status(400).json({ success: false, error: 'Missing data' });
      const cleanEmail = email.toLowerCase().trim();
      const data = await redis.get('otp:' + cleanEmail);
      if (!data) return res.status(400).json({ success: false, error: 'OTP expired or not found' });
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (Date.now() > parsed.expiresAt) { await redis.del('otp:' + cleanEmail); return res.status(400).json({ success: false, error: 'OTP expired' }); }
      if (parsed.otp !== otp) return res.status(400).json({ success: false, error: 'Invalid OTP' });
      // Delete used OTP
      await redis.del('otp:' + cleanEmail);
      // Delete old session if exists
      const oldKey = await redis.get('user:' + cleanEmail + ':current_session');
      if (oldKey) { await redis.del('session:' + oldKey); }
      // Create new session
      const sessionKey = generateSessionKey();
      const sessionData = {
        email: cleanEmail,
        deviceId: deviceId || null,
        createdAt: Date.now(),
        lastSeen: Date.now()
      };
      await redis.set('session:' + sessionKey, sessionData, { ex: SESSION_EXPIRY_DAYS * 24 * 60 * 60 });
      await redis.set('user:' + cleanEmail + ':current_session', sessionKey);
      // Ensure user profile exists
      const profile = await redis.get('user:' + cleanEmail + ':profile');
      let user = profile ? (typeof profile === 'string' ? JSON.parse(profile) : profile) : null;
      if (!user) {
        user = { email: cleanEmail, createdAt: Date.now() };
        await redis.set('user:' + cleanEmail + ':profile', user);
      }
      return res.status(200).json({ success: true, session_key: sessionKey, user });
    }

    /* ═══ USER DATA (orders + membership) ═══ */
    if (action === 'user-data' && req.method === 'GET') {
      const sk = req.query.session_key;
      if (!sk) return res.status(400).json({ success: false, error: 'Session required' });
      const sess = await redis.get('session:' + sk);
      if (!sess) return res.status(401).json({ success: false, error: 'Session expired' });
      const s = typeof sess === 'string' ? JSON.parse(sess) : sess;
      // Update lastSeen
      s.lastSeen = Date.now();
      await redis.set('session:' + sk, s, { ex: SESSION_EXPIRY_DAYS * 24 * 60 * 60 });
      const email = s.email;
      // Get orders
      const orderIds = await redis.smembers('user:' + email + ':orders');
      const orders = [];
      if (orderIds && orderIds.length) {
        for (const id of orderIds) {
          const raw = await redis.get('order:' + id);
          if (raw) { try { orders.push(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch (e) {} }
        }
        orders.sort((a, b) => b.timestamp - a.timestamp);
      }
      // Get membership
      const memRaw = await redis.get('user:' + email + ':membership');
      let membership = memRaw ? (typeof memRaw === 'string' ? JSON.parse(memRaw) : memRaw) : null;
      if (membership && Date.now() >= membership.expiresAt) { membership = null; }
      // Get user profile
      const profRaw = await redis.get('user:' + email + ':profile');
      const user = profRaw ? (typeof profRaw === 'string' ? JSON.parse(profRaw) : profRaw) : null;
      return res.status(200).json({ success: true, orders, membership, user });
    }

    /* ═══ LOGOUT ═══ */
    if (action === 'logout' && req.method === 'POST') {
      const { session_key } = req.body || {};
      if (!session_key) return res.status(200).json({ success: true });
      const sess = await redis.get('session:' + session_key);
      if (sess) {
        const s = typeof sess === 'string' ? JSON.parse(sess) : sess;
        await redis.del('session:' + session_key);
        if (s.email) await redis.del('user:' + s.email + ':current_session');
      }
      return res.status(200).json({ success: true });
    }

    /* ═══ CLEANUP (lazy housekeeping) ═══ */
    if (action === 'cleanup' && req.method === 'POST') {
      // 10% chance to run — cleans old sessions > 90 days inactive
      const keys = await redis.keys('session:*');
      const now = Date.now();
      const MAX = 90 * 24 * 60 * 60 * 1000;
      let cleaned = 0;
      for (const k of keys.slice(0, 100)) {
        const raw = await redis.get(k);
        if (raw) {
          const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (s.lastSeen && (now - s.lastSeen) > MAX) {
            await redis.del(k);
            if (s.email) {
              const cur = await redis.get('user:' + s.email + ':current_session');
              if (cur === k.replace('session:', '')) await redis.del('user:' + s.email + ':current_session');
            }
            cleaned++;
          }
        }
      }
      return res.status(200).json({ success: true, cleaned });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (e) {
    console.error('orders API error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
