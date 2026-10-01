export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });
  try {
    const { deviceId } = req.body || {};
    if (!deviceId) return res.status(400).json({ success:false, error:'Missing deviceId' });
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
    const data = await redis.get('mem:device:' + deviceId);
    if (!data) return res.status(200).json({ success:true, membership:null });
    if (Date.now() > data.expiresAt){
      await redis.del('mem:device:' + deviceId);
      await redis.del('mem:code:' + data.code);
      return res.status(200).json({ success:true, membership:null });
    }
    return res.status(200).json({ success:true, membership:data });
  } catch(e){ console.error('membership-check-device error:', e); return res.status(500).json({ success:false, error:e.message }); }
}
