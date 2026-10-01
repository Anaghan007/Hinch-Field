export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success:false });
  try {
    const { code, deviceId, token, action } = req.body || {};
    if (!code || !deviceId || !action) return res.status(400).json({ success:false, error:'Missing data' });
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
    const data = await redis.get('mem:code:' + code);
    if (!data || Date.now() > data.expiresAt) return res.status(200).json({ success:false, error:'Invalid code' });
    if (action === 'create'){
      if (data.deviceId !== deviceId) return res.status(200).json({ success:false, error:'Only the owner\'s current device can create a transfer token' });
      const used = Number(await redis.get('mem:transfers:' + code) || 0);
      if (used >= 2) return res.status(200).json({ success:false, error:'Transfer limit reached (2 per year). Contact support on WhatsApp.' });
      const t = String(Math.floor(100000 + Math.random() * 900000));
      await redis.set('mem:transfer:' + code, { token:t }, { ex: 600 });
      return res.status(200).json({ success:true, token:t });
    }
    if (action === 'use'){
      const pending = await redis.get('mem:transfer:' + code);
      if (!pending || pending.token !== token) return res.status(200).json({ success:false, error:'Invalid or expired token' });
      const oldId = data.deviceId;
      data.deviceId = deviceId;
      await redis.set('mem:code:' + code, data, { ex: 365*24*60*60 });
      if (oldId) await redis.del('mem:device:' + oldId);
      await redis.set('mem:device:' + deviceId, data, { ex: 365*24*60*60 });
      await redis.del('mem:transfer:' + code);
      await redis.set('mem:transfers:' + code, Number(await redis.get('mem:transfers:' + code) || 0) + 1, { ex: 365*24*60*60 });
      return res.status(200).json({ success:true, name:data.name, expiresAt:data.expiresAt });
    }
    return res.status(400).json({ success:false, error:'Bad action' });
  } catch(e){ console.error('membership-transfer error:', e); return res.status(500).json({ success:false, error:e.message }); }
}
