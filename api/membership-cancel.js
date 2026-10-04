export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const { phone, code } = req.body || {};
    if (!phone && !code) return res.status(400).json({ success: false, error: 'Phone or code required' });

    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

    let deleted = false;
    let deletedCode = null;

    // 🔑 Helper — clean up all related keys for a membership record
    async function nukeMembership(data, codeStr) {
      await redis.del('mem:code:' + codeStr);
      if (data.deviceId) await redis.del('mem:device:' + data.deviceId);
      // 🔑 THE FIX — also delete the user-linked membership (used by user-data API)
      if (data.email) {
        await redis.del('user:' + data.email.toLowerCase().trim() + ':membership');
        console.log('🗑️ Deleted user:' + data.email + ':membership');
      }
    }

    // Option 1: By 4-digit code
    if (code && /^\d{4}$/.test(code)) {
      const data = await redis.get('mem:code:' + code);
      if (data) {
        const d = typeof data === 'string' ? JSON.parse(data) : data;
        await nukeMembership(d, code);
        deleted = true;
        deletedCode = code;
      }
    }

    // Option 2: By phone number (scan all codes)
    if (phone && !deleted) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const keys = await redis.keys('mem:code:*');
      for (const key of keys) {
        const raw = await redis.get(key);
        if (!raw) continue;
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (data && data.phone && data.phone.replace(/[^0-9]/g, '') === cleanPhone) {
          const foundCode = key.replace('mem:code:', '');
          await nukeMembership(data, foundCode);
          deleted = true;
          deletedCode = foundCode;
          break;
        }
      }
    }

    if (!deleted) {
      return res.status(200).json({ success: false, error: 'Membership not found' });
    }

    return res.status(200).json({ success: true, message: 'Membership cancelled', code: deletedCode });
  } catch (e) {
    console.error('membership-cancel error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
