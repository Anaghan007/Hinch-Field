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

    const itemsHtml = order.items.map((l, i) => {
      const extras = (l.colorChoice ? '<br><span style="font-size:11px;color:#7C7C7C;font-weight:400;">Colour: ' + l.colorChoice + '</span>' : '')
                   + (l.custom ? '<br><span style="font-size:11px;color:#7C7C7C;font-weight:400;">Custom (' + l.custom.pos + '): ' + (l.custom.note || '') + '</span>' : '');
      return '<tr>' +
        '<td style="padding:14px 12px;border-bottom:1px solid #E6E4E0;font-size:13px;color:#0A0A0A;font-weight:600;">' +
          (i+1) + '. ' + (l.name || 'Product') + extras +
        '</td>' +
        '<td style="padding:14px 12px;border-bottom:1px solid #E6E4E0;text-align:center;font-size:13px;color:#0A0A0A;">' + l.qty + '</td>' +
        '<td style="padding:14px 12px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;">₹' + (l.price || 0).toLocaleString('en-IN') + '</td>' +
        '<td style="padding:14px 12px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;font-weight:600;">₹' + ((l.price || 0) * l.qty).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const html =
    '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#F5F4F2;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">' +

    '<div style="max-width:640px;margin:0 auto;background:#FFFFFF;padding:40px 36px;">' +

      // ─── LOGO ───
      '<div style="text-align:center;padding-bottom:24px;border-bottom:2px solid #0A0A0A;">' +
        '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:34px;letter-spacing:12px;color:#0A0A0A;font-weight:500;line-height:1;">HINCHFIELD</div>' +
        '<div style="font-size:10px;letter-spacing:6px;color:#7C7C7C;text-transform:uppercase;margin-top:12px;">— Wear Your Story —</div>' +
      '</div>' +

      // ─── STATUS HEADER ───
      '<table style="width:100%;margin-top:28px;">' +
        '<tr>' +
          '<td style="vertical-align:top;">' +
            '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;">Order Reference</div>' +
            '<div style="font-size:26px;font-weight:600;color:#0A0A0A;letter-spacing:1px;margin-top:6px;">' + order.id + '</div>' +
          '</td>' +
          '<td style="vertical-align:top;text-align:right;">' +
            '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;">Cancelled On</div>' +
            '<div style="font-size:14px;font-weight:500;color:#0A0A0A;margin-top:6px;">' + new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + '</div>' +
            '<div style="font-size:11px;color:#7C7C7C;margin-top:2px;">' + new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) + '</div>' +
          '</td>' +
        '</tr>' +
      '</table>' +

      // ─── BADGES ───
      '<div style="margin-top:14px;">' +
        '<span style="display:inline-block;background:#0A0A0A;color:#FFFFFF;font-size:10px;letter-spacing:2px;padding:6px 12px;text-transform:uppercase;">Cancelled</span>' +
        '&nbsp;' +
        '<span style="display:inline-block;background:#F5F4F2;color:#0A0A0A;font-size:10px;letter-spacing:2px;padding:6px 12px;text-transform:uppercase;border:1px solid #E6E4E0;">' +
          (isOnline ? 'Paid Online' : 'Cash on Delivery') +
        '</span>' +
      '</div>' +

      // ─── ITEMS TABLE ───
      '<table style="width:100%;border-collapse:collapse;margin-top:32px;">' +
        '<thead>' +
          '<tr style="background:#0A0A0A;color:#FFFFFF;">' +
            '<th style="padding:12px;text-align:left;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:500;">Item</th>' +
            '<th style="padding:12px;text-align:center;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:500;width:60px;">Qty</th>' +
            '<th style="padding:12px;text-align:right;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:500;width:80px;">Price</th>' +
            '<th style="padding:12px;text-align:right;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:500;width:90px;">Total</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + itemsHtml + '</tbody>' +
      '</table>' +

      // ─── TOTALS ───
      '<table style="width:100%;margin-top:16px;">' +
        '<tr>' +
          '<td style="width:55%;"></td>' +
          '<td>' +
            '<table style="width:100%;">' +
              '<tr>' +
                '<td style="padding:6px 0;text-align:right;font-size:13px;color:#7C7C7C;">Subtotal</td>' +
                '<td style="padding:6px 0;text-align:right;font-size:13px;color:#0A0A0A;width:110px;">₹' + (t ? t.sub : 0).toLocaleString('en-IN') + '</td>' +
              '</tr>' +
              (t && t.discount ? '<tr>' +
                '<td style="padding:6px 0;text-align:right;font-size:13px;color:#7C7C7C;">Member Discount</td>' +
                '<td style="padding:6px 0;text-align:right;font-size:13px;color:#0A0A0A;">−₹' + t.discount.toLocaleString('en-IN') + '</td>' +
              '</tr>' : '') +
              '<tr>' +
                '<td style="padding:6px 0;text-align:right;font-size:13px;color:#7C7C7C;">Delivery</td>' +
                '<td style="padding:6px 0;text-align:right;font-size:13px;color:#0A0A0A;">' + (t && t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td>' +
              '</tr>' +
              '<tr>' +
                '<td style="padding:14px 0 6px;text-align:right;font-size:11px;letter-spacing:2px;color:#0A0A0A;text-transform:uppercase;border-top:2px solid #0A0A0A;font-weight:600;">Total</td>' +
                '<td style="padding:14px 0 6px;text-align:right;font-size:22px;color:#0A0A0A;border-top:2px solid #0A0A0A;font-weight:700;">₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</td>' +
              '</tr>' +
            '</table>' +
          '</td>' +
        '</tr>' +
      '</table>' +

      // ─── DELIVERY ADDRESS ───
      '<div style="margin-top:36px;padding-top:24px;border-top:1px solid #E6E4E0;">' +
        '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;margin-bottom:14px;">Delivery Address</div>' +
        '<div style="font-size:14px;line-height:1.8;color:#0A0A0A;">' +
          '<b style="font-weight:600;">' + c.name + '</b><br>' +
          '<span style="color:#333;">' + c.phone + '</span><br>' +
          '<span style="color:#333;">' + c.addr + '</span><br>' +
          '<span style="color:#333;">' + c.city + ', ' + c.state + ' — ' + c.pin + '</span>' +
        '</div>' +
      '</div>' +

      // ─── ACTION BOX (Black bar like invoice) ───
      '<div style="margin-top:28px;background:#0A0A0A;color:#FFFFFF;padding:18px;text-align:center;">' +
        '<div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:0.6;">Action Required</div>' +
        '<div style="font-size:14px;letter-spacing:1px;margin-top:8px;font-weight:500;">' +
          (isOnline
            ? 'Refund ₹' + (t ? t.total : 0).toLocaleString('en-IN') + ' via Razorpay Dashboard'
            : 'Do NOT ship this order') +
        '</div>' +
      '</div>' +

      // ─── FOOTER ───
      '<div style="margin-top:36px;padding-top:24px;border-top:1px solid #E6E4E0;text-align:center;">' +
        '<div style="font-family:Georgia,serif;font-size:14px;letter-spacing:4px;color:#0A0A0A;text-transform:uppercase;font-weight:500;">Hinchfield</div>' +
        '<div style="font-size:12px;color:#7C7C7C;line-height:1.8;margin-top:10px;">' +
          'WhatsApp: <a href="https://wa.me/917434053550" style="color:#0A0A0A;text-decoration:none;font-weight:500;">7434053550</a>' +
          ' · ' +
          '<a href="mailto:support.hinchfield@gmail.com" style="color:#0A0A0A;text-decoration:none;font-weight:500;">support.hinchfield@gmail.com</a>' +
          '<br>' +
          '<a href="https://hinchfield.store" style="color:#0A0A0A;text-decoration:none;">hinchfield.store</a>' +
        '</div>' +
        '<div style="font-size:10px;color:#B8B5B0;letter-spacing:2px;margin-top:14px;text-transform:uppercase;">© 2026 Hinchfield · No Return / No Exchange</div>' +
      '</div>' +

    '</div>' +
    '</body></html>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HinchField <orders@hinchfield.store>',
        to: ['support.hinchfield@gmail.com'],
        subject: '⚠️ Order Cancelled — ' + order.id,
        html
      })
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false });
  }
}
