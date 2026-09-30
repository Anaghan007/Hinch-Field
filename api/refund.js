export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const { payment_id, amount } = req.body || {};
    if (!payment_id) return res.status(400).json({ success: false, error: 'Payment ID required' });

    const KEY_ID = process.env.RAZORPAY_KEY_ID;
    const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    if (!KEY_ID || !KEY_SECRET) return res.status(500).json({ success: false, error: 'Razorpay not configured' });

    const auth = Buffer.from(KEY_ID + ':' + KEY_SECRET).toString('base64');

    const body = {};
    if (amount) body.amount = Math.round(amount * 100); // paise
    body.speed = 'normal';

    const r = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();

    if (!r.ok) {
      console.error('Refund failed:', data);
      return res.status(r.status).json({ success: false, error: data.error?.description || 'Refund failed' });
    }

    return res.status(200).json({
      success: true,
      refund_id: data.id,
      amount: data.amount / 100,
      status: data.status
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
