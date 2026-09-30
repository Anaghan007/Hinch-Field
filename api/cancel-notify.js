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
    const isOnline = order.payment && order.payment.method === 'online';
    const dateStr = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

    const itemsHtml = order.items.map((l, i) => {
      return '<tr>' +
        '<td style="padding:16px 10px;border-bottom:1px solid #E6E4E0;font-size:13px;color:#0A0A0A;font-weight:500;">' + (i+1) + '. ' + (l.name || 'Product') + '</td>' +
        '<td style="padding:16px 10px;border-bottom:1px solid #E6E4E0;text-align:center;font-size:13px;color:#0A0A0A;">' + l.qty + '</td>' +
        '<td style="padding:16px 10px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;">₹' + (l.price || 0).toLocaleString('en-IN') + '</td>' +
        '<td style="padding:16px 10px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;font-weight:700;">₹' + ((l.price || 0) * l.qty).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#F5F4F2;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">' +

    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F4F2;padding:20px 0;">' +
    '<tr><td align="center">' +

    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;background:#FFFFFF;">' +

      // ═══ HEADER ═══
      '<tr><td style="padding:36px 40px 24px;text-align:center;border-bottom:1px solid #0A0A0A;">' +
        '<img src="https://hinchfield.store/images/logo.png" alt="HINCHFIELD" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;">' +
        '<div style="font-size:10px;letter-spacing:5px;color:#7C7C7C;text-transform:uppercase;margin-top:8px;">WEAR YOUR STORY</div>' +
      '</td></tr>' +

      // ═══ CANCELLED BANNER ═══
      '<tr><td style="background:#0A0A0A;padding:20px 40px;text-align:center;">' +
        '<div style="font-size:11px;letter-spacing:5px;color:#FFFFFF;text-transform:uppercase;opacity:0.7;">ORDER CANCELLED</div>' +
      '</td></tr>' +

      // ═══ ORDER INFO ═══
      '<tr><td style="padding:32px 40px 8px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
          '<tr>' +
            '<td style="vertical-align:top;">' +
              '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;">Order ID</div>' +
              '<div style="font-family:Georgia,serif;font-size:24px;font-weight:500;color:#0A0A0A;letter-spacing:1px;margin-top:8px;">' + order.id + '</div>' +
            '</td>' +
            '<td style="vertical-align:top;text-align:right;">' +
              '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;">Date</div>' +
              '<div style="font-size:13px;font-weight:600;color:#0A0A0A;margin-top:8px;">' + dateStr + '</div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +

      // ═══ STATUS BAR ═══
      '<tr><td style="padding:20px 40px 28px;">' +
        '<div style="background:#F5F4F2;padding:14px 18px;border-left:3px solid #0A0A0A;">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>' +
            '<td style="font-size:12px;color:#7C7C7C;letter-spacing:1px;">STATUS</td>' +
            '<td style="text-align:right;font-size:12px;font-weight:700;color:#0A0A0A;letter-spacing:1px;">CANCELLED</td>' +
          '</tr></table>' +
        '</div>' +
        '<div style="margin-top:10px;text-align:center;">' +
          '<span style="display:inline-block;font-size:10px;letter-spacing:2px;padding:6px 14px;border:1px solid ' + (isOnline ? '#DC2626' : '#E6E4E0') + ';color:' + (isOnline ? '#DC2626' : '#7C7C7C') + ';text-transform:uppercase;">' + (isOnline ? 'PAID ONLINE' : 'CASH ON DELIVERY') + '</span>' +
        '</div>' +
      '</td></tr>' +

      // ═══ ITEMS TABLE ═══
      '<tr><td style="padding:0 40px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">' +
          '<thead>' +
            '<tr style="background:#0A0A0A;">' +
              '<th style="padding:12px 10px;text-align:left;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:500;">ITEM</th>' +
              '<th style="padding:12px 10px;text-align:center;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:500;width:60px;">QTY</th>' +
              '<th style="padding:12px 10px;text-align:right;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:500;width:90px;">PRICE</th>' +
              '<th style="padding:12px 10px;text-align:right;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:500;width:100px;">TOTAL</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +
      '</td></tr>' +

      // ═══ TOTALS ═══
      '<tr><td style="padding:24px 40px 24px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:320px;margin-left:auto;">' +
          '<tr>' +
            '<td style="padding:8px 0;text-align:right;font-size:13px;color:#7C7C7C;">Subtotal</td>' +
            '<td style="padding:8px 0 8px 20px;text-align:right;font-size:13px;color:#0A0A0A;width:110px;">₹' + (t && t.sub ? t.sub.toLocaleString('en-IN') : 0) + '</td>' +
          '</tr>' +
          (t && t.discount ? '<tr><td style="padding:8px 0;text-align:right;font-size:13px;color:#7C7C7C;">Member Discount</td><td style="padding:8px 0 8px 20px;text-align:right;font-size:13px;color:#0A0A0A;">−₹' + t.discount.toLocaleString('en-IN') + '</td></tr>' : '') +
          '<tr>' +
            '<td style="padding:8px 0;text-align:right;font-size:13px;color:#7C7C7C;">Delivery</td>' +
            '<td style="padding:8px 0 8px 20px;text-align:right;font-size:13px;color:#0A0A0A;">' + (t && t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td>' +
          '</tr>' +
          '<tr><td colspan="2" style="padding:0;"><div style="border-top:2px solid #0A0A0A;margin:8px 0 0;"></div></td></tr>' +
          '<tr>' +
            '<td style="padding:14px 0 0;text-align:right;font-size:11px;letter-spacing:2px;color:#0A0A0A;text-transform:uppercase;font-weight:600;">TOTAL ' + (isOnline ? 'PAID' : 'COD') + '</td>' +
            '<td style="padding:14px 0 0 20px;text-align:right;font-family:Georgia,serif;font-size:24px;font-weight:600;color:#0A0A0A;">₹' + (t && t.total ? t.total.toLocaleString('en-IN') : 0) + '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +

      // ═══ DELIVERY ADDRESS ═══
      '<tr><td style="padding:8px 40px 24px;">' +
        '<div style="border-top:1px solid #E6E4E0;padding-top:24px;">' +
          '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;margin-bottom:14px;">Delivery Address</div>' +
          '<div style="font-size:13px;line-height:1.9;color:#0A0A0A;">' +
            '<b style="font-weight:700;">' + c.name + '</b><br>' +
            '<a href="tel:' + c.phone + '" style="color:#0A0A0A;text-decoration:none;">' + c.phone + '</a><br>' +
            c.addr + '<br>' +
            c.city + ', ' + c.state + ' — ' + c.pin +
          '</div>' +
        '</div>' +
      '</td></tr>' +

      // ═══ ACTION BOX ═══
      '<tr><td style="padding:0 40px 32px;">' +
        '<div style="border:1px solid ' + (isOnline ? '#DC2626' : '#0A0A0A') + ';padding:20px;text-align:center;' + (isOnline ? 'background:#FEF2F2;' : '') + '">' +
          '<div style="font-size:10px;letter-spacing:3px;color:' + (isOnline ? '#DC2626' : '#7C7C7C') + ';text-transform:uppercase;margin-bottom:8px;">Action Required</div>' +
          '<div style="font-family:Georgia,serif;font-size:16px;color:' + (isOnline ? '#DC2626' : '#0A0A0A') + ';line-height:1.6;font-weight:500;">' +
            (isOnline
              ? 'Refund <b>₹' + (t && t.total ? t.total.toLocaleString('en-IN') : 0) + '</b><br><span style="font-size:12px;color:#7C7C7C;font-family:Arial,sans-serif;font-weight:400;">via Razorpay Dashboard</span>'
              : 'Do NOT ship this order') +
          '</div>' +
        '</div>' +
      '</td></tr>' +

      // ═══ FOOTER ═══
      '<tr><td style="background:#0A0A0A;padding:24px 40px;text-align:center;">' +
        '<div style="font-family:Georgia,serif;font-size:16px;letter-spacing:6px;color:#FFFFFF;margin-bottom:8px;">HINCHFIELD</div>' +
        '<div style="font-size:11px;color:#FFFFFF;opacity:0.6;line-height:1.9;letter-spacing:1px;">' +
          'WhatsApp: 7434053550<br>' +
          'support.hinchfield@gmail.com<br>' +
          '<a href="https://hinchfield.store" style="color:#FFFFFF;text-decoration:none;opacity:0.8;">hinchfield.store</a>' +
        '</div>' +
      '</td></tr>' +

      // ═══ LEGAL BAR ═══
      '<tr><td style="background:#F5F4F2;padding:16px 40px;text-align:center;">' +
        '<div style="font-size:10px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;">© 2026 HINCHFIELD · NO RETURN / NO EXCHANGE</div>' +
      '</td></tr>' +

    '</table>' +

    '</td></tr></table>' +

    '</body></html>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HinchField <orders@hinchfield.store>',
        to: ['support.hinchfield@gmail.com'],
        subject: '⚠️ Order Cancelled — ' + order.id + ' — ₹' + (t ? t.total : 0),
        html
      })
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false });
  }
}
