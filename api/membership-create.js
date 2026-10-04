export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const { name, phone, email, deviceId, session_key } = req.body || {};
    if (!name || !phone || !deviceId) {
      return res.status(400).json({ success: false, error: 'Missing data' });
    }

    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN
    });

    // 🔑 Email resolve: body → session fallback
    let cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail && session_key) {
      try {
        const sess = await redis.get('session:' + session_key);
        if (sess) {
          const s = typeof sess === 'string' ? JSON.parse(sess) : sess;
          cleanEmail = (s.email || '').toLowerCase().trim();
        }
      } catch (e) {
        console.warn('Session lookup failed:', e);
      }
    }

    // Generate unique 4-digit code
    let code, tries = 0;
    do {
      code = String(Math.floor(1000 + Math.random() * 9000));
      const existing = await redis.get('mem:code:' + code);
      if (!existing) break;
      tries++;
    } while (tries < 50);

    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 365 days
    const membership = {
      code,
      name,
      phone,
      email: cleanEmail,
      deviceId,
      expiresAt
    };

    // Save under code + device keys
    await redis.set('mem:code:' + code, membership, { ex: 365 * 24 * 60 * 60 });
    await redis.set('mem:device:' + deviceId, membership, { ex: 365 * 24 * 60 * 60 });

    // 🔑 Save to user's email → for login restore
    if (cleanEmail) {
      await redis.set('user:' + cleanEmail + ':membership', membership, { ex: 365 * 24 * 60 * 60 });
      console.log('Membership linked to email:', cleanEmail, 'code:', code);
    } else {
      console.warn('Membership created WITHOUT email link — device:', deviceId);
    }

    return res.status(200).json({
      success: true,
      code,
      name,
      phone,
      email: cleanEmail,
      expiresAt
    });
  } catch (e) {
    console.error('membership-create error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
