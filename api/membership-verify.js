export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });
  try {
    const { code, deviceId, email, session_key } = req.body || {};
    if (!code || !deviceId) return res.status(400).json({ success:false, error:'Missing data' });
    if (!/^\d{4}$/.test(code)) return res.status(200).json({ success:false, error:'Invalid code' });

    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

    const data = await redis.get('mem:code:' + code);
    if (!data || Date.now() > data.expiresAt){
      return res.status(200).json({ success:false, error:'Invalid code' });
    }

    // 🔑 Resolve requester's email — priority: session → email param
    let requesterEmail = (email || '').toLowerCase().trim();
    if (session_key){
      try {
        const sess = await redis.get('session:' + session_key);
        if (sess){
          const s = typeof sess === 'string' ? JSON.parse(sess) : sess;
          if (s.email) requesterEmail = String(s.email).toLowerCase().trim();
        }
      } catch(_){}
    }

    // 🔒 CRITICAL CHECK: code must belong to the logged-in email
    const ownerEmail = String(data.email || '').toLowerCase().trim();
    if (!requesterEmail){
      return res.status(200).json({ success:false, error:'Please login to apply membership' });
    }
    if (!ownerEmail){
      // Legacy membership with no email — only allow if device matches
      if (data.deviceId !== deviceId){
        return res.status(200).json({ success:false, error:'Invalid code' });
      }
    } else if (ownerEmail !== requesterEmail){
      // 🚨 Someone else's code — reject
      console.warn('🚨 Code belongs to', ownerEmail, 'but tried by', requesterEmail);
      return res.status(200).json({ success:false, error:'This code is not linked to your account' });
    }

    // ✅ Email matches — verify device binding
    if (data.deviceId && data.deviceId !== deviceId){
      try {
        const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
        await fetch('https://api.resend.com/emails', {
          method:'POST',
          headers:{ Authorization:'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type':'application/json' },
          body: JSON.stringify({
            from:'HinchField <orders@hinchfield.store>',
            to:['support.hinchfield@gmail.com'],
            subject:'🚨 Code ' + code + ' tried on a NEW device (blocked)',
            html:'<p>Code <b>' + code + '</b> (owner: ' + (data.name||'') + ' / ' + (data.phone||'') + ') tried on different device.</p><p>Device: ' + deviceId + '<br>IP: ' + ip + '<br>Time: ' + new Date().toString() + '</p>'
          })
        }).catch(()=>{});
      } catch(_){}
      return res.status(200).json({ success:false, error:'Invalid code' });
    }

    return res.status(200).json({ success:true, name:data.name, expiresAt:data.expiresAt, email: ownerEmail });
  } catch(e){
    console.error('membership-verify error:', e);
    return res.status(500).json({ success:false, error:e.message });
  }
}
