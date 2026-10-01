export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const { code, deviceId } = req.body || {};
    if (!code || !deviceId) return res.status(400).json({ success:false, error:'Missing data' });
    if (!/^\d{4}$/.test(code)) return res.status(200).json({ success:false, error:'Invalid code' });

    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

    // 🚫 Brute-force throttle
    const tryKey = 'mem:tries:' + deviceId;
    const tries = Number(await redis.get(tryKey) || 0);
    if (tries >= 5) return res.status(200).json({ success:false, error:'Too many wrong attempts — try again after 1 hour' });

    const data = await redis.get('mem:code:' + code);

    // 1. કોડ નથી અથવા એક્સપાયર થઈ ગયો
    if (!data || Date.now() > data.expiresAt){
      await redis.set(tryKey, tries + 1, { ex: 3600 });
      return res.status(200).json({ success:false, error:'Invalid code' });
    }

    // 🔄 2. AUTO-BIND FIX: જૂના કોડ (જેમાં deviceId નથી) ને ટોમેટિક લોક કરો
    if (!data.deviceId) {
      data.deviceId = deviceId;
      await redis.set('mem:code:' + code, data, { ex: 365*24*60*60 });
      await redis.set('mem:device:' + deviceId, data, { ex: 365*24*60*60 });
      // હવે આ કોડ આ ડિવાઇસ સાથે લોક થઈ ગયો, આગળ વધવા દો
    } 
    // 3. નવા કોડ માટે ડિવાઇસ ચેક
    else if (data.deviceId !== deviceId){
      await redis.set(tryKey, tries + 1, { ex: 3600 });
      
      // 📧 તારે સિક્યુરિટી એલર્ટ
      const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
      await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{ Authorization:'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type':'application/json' },
        body: JSON.stringify({
          from:'HinchField <orders@hinchfield.store>',
          to:['support.hinchfield@gmail.com'],
          subject:' Code ' + code + ' tried on a NEW device (blocked)',
          html:'<p>Code <b>' + code + '</b> (owner: ' + data.name + ' / ' + data.phone + ') કોઈએ બીજા device પર try કર્યો.</p><p>Device ID: ' + deviceId + '<br>IP: ' + ip + '<br>Time: ' + new Date().toString() + '</p><p>Attempt <b>blocked</b>. Code ફક્ત owner ના device પર જ ચાલે છે.</p>'
        })
      }).catch(()=>{});

      return res.status(200).json({ success:false, error:'Invalid code' });
    }

    // ✅ સફળ
    await redis.del(tryKey);
    return res.status(200).json({ success:true, name:data.name, expiresAt:data.expiresAt });
  } catch(e){ 
    console.error('membership-verify error:', e); 
    return res.status(500).json({ success:false, error:e.message }); 
  }
}
