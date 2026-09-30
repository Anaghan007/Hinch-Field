export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const { order } = req.body || {};
    if (!order || !order.customer || !order.customer.email)
      return res.status(400).json({ success: false, error: 'Missing order data' });

    const KEY = process.env.RESEND_API_KEY;
    if (!KEY) return res.status(500).json({ success: false, error: 'Email not configured' });

    const c = order.customer;
    const t = order.totals;

    const itemsHtml = order.items.map((l, i) => {
      const color = l.colorChoice ? '<br><span style="color:#666;font-size:11px;">Colour: ' + l.colorChoice + '</span>' : '';
      const custom = l.custom ? '<br><span style="color:#666;font-size:11px;">Custom (' + l.custom.pos + '): ' + (l.custom.note || '') + '</span>' : '';
      return '<tr>' +
        '<td style="padding:12px 6px;border-bottom:1px solid #eee;font-size:13px;"><b>' + (i+1) + '. ' + (l.name||'Product') + '</b>' + color + custom + '</td>' +
        '<td style="padding:12px 6px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">' + l.qty + '</td>' +
        '<td style="padding:12px 6px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">₹' + (l.price||0).toLocaleString('en-IN') + '</td>' +
        '<td style="padding:12px 6px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600;">₹' + ((l.price||0)*(l.qty||0)).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const discountRow = t.discount ? '<tr><td colspan="3" style="padding:6px;text-align:right;font-size:13px;">⭐ Member Discount (50%)</td><td style="padding:6px;text-align:right;font-size:13px;">−₹' + t.discount.toLocaleString('en-IN') + '</td></tr>' : '';

    const payBadge = order.payment && order.payment.method === 'online'
      ? '<span style="background:#0A0A0A;color:#fff;padding:4px 10px;font-size:10px;letter-spacing:1px;">PAID ONLINE</span>'
      : '<span style="background:#f5f4f2;color:#0A0A0A;padding:4px 10px;font-size:10px;letter-spacing:1px;border:1px solid #e6e4e0;">CASH ON DELIVERY</span>';

    const html =
    '<div style="max-width:600px;margin:0 auto;background:#fff;font-family:Arial,sans-serif;color:#0A0A0A;">' +
      '<div style="padding:28px 24px;text-align:center;border-bottom:2px solid #0A0A0A;">' +
        '<h1 style="margin:0;font-family:Georgia,serif;font-size:26px;letter-spacing:6px;font-weight:500;">HINCHFIELD</h1>' +
        '<p style="margin:6px 0 0;font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;">Wear Your Story</p>' +
      '</div>' +
      '<div style="padding:24px;">' +
        '<div style="text-align:center;margin-bottom:20px;">' +
          '<p style="margin:0 0 6px;font-size:10px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;">Order Confirmed</p>' +
          '<h2 style="margin:0 0 8px;font-size:20px;font-weight:500;letter-spacing:2px;">' + order.id + '</h2>' +
          payBadge +
        '</div>' +
        '<div style="background:#f5f4f2;padding:14px;margin-bottom:20px;">' +
          '<table style="width:100%;font-size:12px;">' +
            '<tr><td style="padding:3px 0;color:#7C7C7C;">Date</td><td style="padding:3px 0;text-align:right;font-weight:500;">' + new Date(order.timestamp).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + '</td></tr>' +
            (order.payment && order.payment.razorpay_payment_id ? '<tr><td style="padding:3px 0;color:#7C7C7C;">Payment ID</td><td style="padding:3px 0;text-align:right;font-size:11px;">' + order.payment.razorpay_payment_id + '</td></tr>' : '') +
          '</table>' +
        '</div>' +
        '<h3 style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7C7C7C;margin:0 0 10px;">Items Ordered</h3>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:18px;">' +
          '<thead><tr style="background:#0A0A0A;color:#fff;">' +
            '<th style="padding:8px 6px;text-align:left;font-size:10px;letter-spacing:1px;">ITEM</th>' +
            '<th style="padding:8px 6px;text-align:center;font-size:10px;letter-spacing:1px;">QTY</th>' +
            '<th style="padding:8px 6px;text-align:right;font-size:10px;letter-spacing:1px;">PRICE</th>' +
            '<th style="padding:8px 6px;text-align:right;font-size:10px;letter-spacing:1px;">TOTAL</th>' +
          '</tr></thead>' +
          '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +
        '<table style="width:100%;margin-bottom:20px;">' +
          '<tr><td style="padding:5px 6px;text-align:right;font-size:13px;color:#7C7C7C;">Subtotal</td><td style="padding:5px 6px;text-align:right;font-size:13px;width:110px;">₹' + t.sub.toLocaleString('en-IN') + '</td></tr>' +
          discountRow +
          '<tr><td style="padding:5px 6px;text-align:right;font-size:13px;color:#7C7C7C;">Delivery</td><td style="padding:5px 6px;text-align:right;font-size:13px;">' + (t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td></tr>' +
          '<tr style="border-top:2px solid #0A0A0A;">' +
            '<td style="padding:10px 6px;text-align:right;font-size:13px;letter-spacing:1px;">TOTAL</td>' +
            '<td style="padding:10px 6px;text-align:right;font-size:18px;font-weight:600;">₹' + t.total.toLocaleString('en-IN') + '</td>' +
          '</tr>' +
        '</table>' +
        '<h3 style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7C7C7C;margin:0 0 10px;">Delivery Address</h3>' +
        '<div style="background:#f5f4f2;padding:14px;font-size:13px;line-height:1.7;">' +
          '<b>' + c.name + '</b><br>' + c.phone + '<br>' + c.addr + '<br>' + c.city + ', ' + c.state + ' — ' + c.pin +
        '</div>' +
        '<div style="background:#0A0A0A;color:#fff;padding:14px;margin-top:18px;text-align:center;font-size:12px;letter-spacing:1px;">' +
          '🚚 Expected delivery in 4-5 business days' +
        '</div>' +
        '<div style="text-align:center;padding:20px 0 8px;font-size:12px;color:#7C7C7C;line-height:1.7;">' +
          'Questions? WhatsApp: <b style="color:#0A0A0A;">7434053550</b><br>' +
          'support.hinchfield@gmail.com' +
        '</div>' +
      '</div>' +
      '<div style="background:#f5f4f2;padding:16px;text-align:center;font-size:11px;color:#7C7C7C;letter-spacing:1px;">' +
        '© 2026 HINCHFIELD · hinchfield.store<br>No Return / No Exchange' +
      '</div>' +
    '</div>';

    const cr = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HinchField <orders@hinchfield.store>',
        to: [c.email],
        subject: 'Order Confirmed — ' + order.id + ' | HinchField',
        html
      })
    });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HinchField <orders@hinchfield.store>',
        to: ['support.hinchfield@gmail.com'],
        reply_to: c.email,
        subject: '🛒 NEW ORDER — ' + order.id + ' — ₹' + t.total,
        html
      })
    });

    return res.status(cr.ok ? 200 : 500).json({ success: cr.ok });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false });
  }
}
