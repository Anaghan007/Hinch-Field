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
      return '<tr>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;font-size:13px;color:#0A0A0A;">' +
          '<b style="font-weight:600;">' + (i+1) + '.</b> ' + (l.name || 'Product') +
        '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:center;font-size:13px;color:#7C7C7C;">' + l.qty + '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;font-weight:500;">₹' + (l.price * l.qty).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const html =
    '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:0;background:#F5F4F2;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;">' +

    '<div style="max-width:600px;margin:0 auto;background:#FFFFFF;">' +

      // ─── Header ───
      '<div style="padding:40px 32px 32px;text-align:center;border-bottom:1px solid #E6E4E0;">' +
        '<div style="font-family:Georgia,serif;font-size:32px;letter-spacing:10px;font-weight:500;color:#0A0A0A;line-height:1;">HINCHFIELD</div>' +
        '<div style="font-size:10px;letter-spacing:6px;color:#7C7C7C;text-transform:uppercase;margin-top:10px;">Wear Your Story</div>' +
      '</div>' +

      // ─── Alert Banner ───
      '<div style="background:#0A0A0A;padding:32px 32px 28px;text-align:center;">' +
        '<div style="display:inline-block;width:56px;height:56px;border:2px solid #FFFFFF;border-radius:50%;line-height:52px;font-size:28px;color:#FFFFFF;margin-bottom:16px;">!</div>' +
        '<div style="font-size:11px;letter-spacing:4px;color:#FFFFFF;text-transform:uppercase;opacity:0.7;">Notification</div>' +
        '<div style="font-family:Georgia,serif;font-size:26px;letter-spacing:3px;color:#FFFFFF;margin-top:8px;font-weight:500;">ORDER CANCELLED</div>' +
        '<div style="font-size:12px;color:#FFFFFF;opacity:0.6;margin-top:10px;letter-spacing:1px;">Customer has cancelled this order</div>' +
      '</div>' +

      // ─── Order Summary Bar ───
      '<div style="padding:28px 32px 20px;background:#FAFAF9;">' +
        '<table style="width:100%;font-size:12px;">' +
          '<tr>' +
            '<td style="padding:6px 0;color:#7C7C7C;letter-spacing:2px;text-transform:uppercase;font-size:10px;">Order ID</td>' +
            '<td style="padding:6px 0;text-align:right;font-weight:600;letter-spacing:1px;color:#0A0A0A;">' + order.id + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:6px 0;color:#7C7C7C;letter-spacing:2px;text-transform:uppercase;font-size:10px;">Amount</td>' +
            '<td style="padding:6px 0;text-align:right;font-weight:600;font-size:16px;color:#0A0A0A;">₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:6px 0;color:#7C7C7C;letter-spacing:2px;text-transform:uppercase;font-size:10px;">Payment</td>' +
            '<td style="padding:6px 0;text-align:right;font-weight:500;color:' + (isOnline ? '#0A0A0A' : '#7C7C7C') + ';">' + (isOnline ? '⚠ PAID ONLINE' : 'Cash on Delivery') + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:6px 0;color:#7C7C7C;letter-spacing:2px;text-transform:uppercase;font-size:10px;">Cancelled At</td>' +
            '<td style="padding:6px 0;text-align:right;color:#0A0A0A;font-size:12px;">' + new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // ─── Customer Section ───
      '<div style="padding:28px 32px 8px;">' +
        '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #E6E4E0;">Customer Details</div>' +
        '<table style="width:100%;font-size:13px;margin-top:16px;">' +
          '<tr>' +
            '<td style="padding:6px 0;color:#7C7C7C;width:110px;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Name</td>' +
            '<td style="padding:6px 0;color:#0A0A0A;font-weight:500;">' + c.name + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:6px 0;color:#7C7C7C;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Phone</td>' +
            '<td style="padding:6px 0;color:#0A0A0A;"><a href="tel:' + c.phone + '" style="color:#0A0A0A;text-decoration:none;font-weight:500;">' + c.phone + '</a></td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:6px 0;color:#7C7C7C;font-size:11px;letter-spacing:1px;text-transform:uppercase;vertical-align:top;">Address</td>' +
            '<td style="padding:6px 0;color:#0A0A0A;line-height:1.6;">' + c.addr + '<br>' + c.city + ', ' + c.state + ' — ' + c.pin + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // ─── Items Section ───
      '<div style="padding:28px 32px 8px;">' +
        '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #E6E4E0;">Items Ordered</div>' +
        '<table style="width:100%;border-collapse:collapse;margin-top:6px;">' +
          '<thead>' +
            '<tr>' +
              '<th style="padding:10px 8px;text-align:left;font-size:10px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;font-weight:500;border-bottom:1px solid #E6E4E0;">Item</th>' +
              '<th style="padding:10px 8px;text-align:center;font-size:10px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;font-weight:500;border-bottom:1px solid #E6E4E0;width:60px;">Qty</th>' +
              '<th style="padding:10px 8px;text-align:right;font-size:10px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;font-weight:500;border-bottom:1px solid #E6E4E0;width:90px;">Total</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +
      '</div>' +

      // ─── Action Box ───
      '<div style="padding:24px 32px 8px;">' +
        '<div style="border:1px solid #0A0A0A;padding:20px;text-align:center;">' +
          '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;margin-bottom:8px;">Action Required</div>' +
          '<div style="font-family:Georgia,serif;font-size:16px;color:#0A0A0A;letter-spacing:1px;line-height:1.5;">' +
            (isOnline
              ? 'Refund <b>₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</b><br><span style="font-size:12px;color:#7C7C7C;">via Razorpay Dashboard</span>'
              : 'Do NOT ship this order') +
          '</div>' +
        '</div>' +
      '</div>' +

      // ─── Footer ───
      '<div style="padding:32px 32px 24px;text-align:center;">' +
        '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;margin-bottom:10px;">Questions?</div>' +
        '<div style="font-size:12px;color:#0A0A0A;line-height:1.8;">' +
          'WhatsApp · <b>7434053550</b><br>' +
          '<a href="mailto:support.hinchfield@gmail.com" style="color:#0A0A0A;text-decoration:none;">support.hinchfield@gmail.com</a>' +
        '</div>' +
      '</div>' +

      // ─── Bottom Bar ───
      '<div style="background:#0A0A0A;padding:18px;text-align:center;">' +
        '<div style="font-size:10px;letter-spacing:3px;color:#FFFFFF;opacity:0.5;">© 2026 HINCHFIELD · HINCHFIELD.STORE</div>' +
      '</div>' +

    '</div>' +
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
