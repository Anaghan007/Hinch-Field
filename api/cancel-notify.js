export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const { order } = req.body || {};
    if (!order || !order.id) return res.status(400).json({ success: false });

    const KEY = process.env.RESEND_API_KEY;
    if (!KEY) return res.status(500).json({ success: false });

    const c = order.customer;
    const t = order.totals;

    const itemsHtml = order.items.map((l, i) => {
      return '<tr>' +
        '<td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;">' + (i+1) + '. ' + (l.name || 'Product') + '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">' + l.qty + '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">₹' + (l.price * l.qty).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const isOnline = order.payment && order.payment.method === 'online';
    const action = isOnline
      ? 'Refund ₹' + (t ? t.total : 0) + ' via Razorpay Dashboard'
      : 'Do NOT ship this order';

    const html =
    '<div style="font-family:Arial;padding:20px;background:#fff;max-width:600px;">' +
      '<div style="border:3px solid #DC2626;padding:20px;background:#FEF2F2;">' +
        '<h1 style="color:#DC2626;margin:0 0 8px;font-size:22px;letter-spacing:2px;">⚠️ ORDER CANCELLED</h1>' +
        '<p style="color:#DC2626;margin:0;font-size:13px;">Customer has cancelled this order</p>' +
      '</div>' +
      '<div style="padding:20px 0;">' +
        '<table style="width:100%;font-size:13px;line-height:2;">' +
          '<tr><td style="color:#666;width:130px;">Order ID</td><td><b>' + order.id + '</b></td></tr>' +
          '<tr><td style="color:#666;">Amount</td><td><b>₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</b></td></tr>' +
          '<tr><td style="color:#666;">Payment</td><td>' + (isOnline ? '⚠️ PAID ONLINE' : 'Cash on Delivery') + '</td></tr>' +
          '<tr><td style="color:#666;">Cancelled At</td><td>' + new Date().toLocaleString('en-IN') + '</td></tr>' +
        '</table>' +
        '<hr style="margin:20px 0;border:none;border-top:1px solid #eee;">' +
        '<h3 style="font-size:12px;letter-spacing:1.5px;color:#666;text-transform:uppercase;">Customer</h3>' +
        '<p style="font-size:13px;line-height:1.8;">' +
          '<b>' + c.name + '</b><br>' + c.phone + '<br>' + c.addr + '<br>' + c.city + ', ' + c.state + ' — ' + c.pin +
        '</p>' +
        '<h3 style="font-size:12px;letter-spacing:1.5px;color:#666;text-transform:uppercase;margin-top:20px;">Items</h3>' +
        '<table style="width:100%;border-collapse:collapse;">' + itemsHtml + '</table>' +
        '<div style="margin-top:24px;padding:14px;background:#FEF2F2;border-left:4px solid #DC2626;">' +
          '<p style="margin:0;font-size:13px;color:#DC2626;"><b>Action:</b> ' + action + '</p>' +
        '</div>' +
      '</div>' +
    '</div>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HinchField Alerts <orders@hinchfield.store>',
        to: ['support.hinchfield@gmail.com'],
        subject: '⚠️ ORDER CANCELLED — ' + order.id + ' — ₹' + (t ? t.total : 0),
        html
      })
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false });
  }
}
