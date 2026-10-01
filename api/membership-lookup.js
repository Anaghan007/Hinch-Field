export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success:false });
  try {
    const { phone, deviceId } = req.body || {};
    if (!phone || !deviceId) return res.status(400).json({ success:false, error:'Missing data' });
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
    const deviceData = await redis.get('mem:device:' + deviceId);
    if (deviceData && deviceData.phone === phone && Date.now() < deviceData.expiresAt){
      return res.status(200).json({ success:true, ...deviceData });
    }
    return res.status(200).json({ success:false, error:'No membership on this device' });
  } catch(e){ console.error('membership-lookup error:', e); return res.status(500).json({ success:false, error:e.message }); }
}
