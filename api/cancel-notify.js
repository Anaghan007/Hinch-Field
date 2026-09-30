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
        '<td style="padding:14px 12px;border-bottom:1px solid #E6E4E0;font-size:13px;color:#0A0A0A;font-weight:500;">' +
          (i+1) + '. ' + (l.name || 'Product') +
        '</td>' +
        '<td style="padding:14px 12px;border-bottom:1px solid #E6E4E0;text-align:center;font-size:13px;color:#0A0A0A;">' + l.qty + '</td>' +
        '<td style="padding:14px 12px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;">₹' + (l.price || 0).toLocaleString('en-IN') + '</td>' +
        '<td style="padding:14px 12px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;font-weight:600;">₹' + ((l.price || 0) * l.qty).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const html =
    '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:0;background:#F5F4F2;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">' +

    '<div style="max-width:640px;margin:0 auto;background:#FFFFFF;">' +

      // ═══ HEADER ═══
      '<div style="padding:36px 40px 28px;">' +
        '<div style="display:flex;align-items:center;gap:14px;">' +
          '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:34px;letter-spacing:6px;font-weight:600;color:#0A0A0A;line-height:1;">HF</div>' +
          '<div>' +
            '<div style="font-family:Georgia,serif;font-size:18px;letter-spacing:6px;font-weight:500;color:#0A0A0A;line-height:1;">HINCHFIELD</div>' +
            '<div style="font-size:8px;letter-spacing:4px;color:#7C7C7C;text-transform:uppercase;margin-top:4px;">— Wear Your Story —</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // ═══ DIVIDER ═══
      '<div style="padding:0 40px;"><div style="border-top:2px solid #0A0A0A;"></div></div>' +

      // ═══ TITLE ═══
      '<div style="padding:28px 40px 20px;">' +
        '<div style="font-size:10px;letter-spacing:4px;color:#7C7C7C;text-transform:uppercase;margin-bottom:6px;">Notification</div>' +
        '<div style="font-family:Georgia,serif;font-size:28px;color:#0A0A0A;letter-spacing:1px;font-weight:500;line-height:1.2;">Order Cancelled</div>' +
      '</div>' +

      // ═══ ORDER META ═══
      '<div style="padding:0 40px 24px;">' +
        '<table style="width:100%;font-size:12px;">' +
          '<tr>' +
            '<td style="padding:0 0 16px;vertical-align:top;width:50%;">' +
              '<div style="font-size:9px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;margin-bottom:6px;">Order ID</div>' +
              '<div style="font-size:22px;font-weight:600;letter-spacing:1px;color:#0A0A0A;font-family:Georgia,serif;">' + order.id + '</div>' +
            '</td>' +
            '<td style="padding:0 0 16px;vertical-align:top;width:50%;text-align:right;">' +
              '<div style="font-size:9px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;margin-bottom:6px;">Cancelled At</div>' +
              '<div style="font-size:13px;color:#0A0A0A;">' + new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + '</div>' +
              '<div style="font-size:11px;color:#7C7C7C;margin-top:2px;">' + new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) + '</div>' +
            '</td>' +
          '</tr>' +
          '<tr>' +
            '<td colspan="2">' +
              '<div style="display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:6px 14px;font-size:10px;letter-spacing:2px;text-transform:uppercase;">⚠ Order Cancelled by Customer</div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // ═══ ITEMS HEADER ═══
      '<div style="padding:0 40px;">' +
        '<table style="width:100%;border-collapse:collapse;">' +
          '<thead>' +
            '<tr style="background:#0A0A0A;">' +
              '<th style="padding:14px 12px;text-align:left;font-size:10px;letter-spacing:2.5px;color:#FFFFFF;text-transform:uppercase;font-weight:500;">Item</th>' +
              '<th style="padding:14px 12px;text-align:center;font-size:10px;letter-spacing:2.5px;color:#FFFFFF;text-transform:uppercase;font-weight:500;width:60px;">Qty</th>' +
              '<th style="padding:14px 12px;text-align:right;font-size:10px;letter-spacing:2.5px;color:#FFFFFF;text-transform:uppercase;font-weight:500;width:90px;">Price</th>' +
              '<th style="padding:14px 12px;text-align:right;font-size:10px;letter-spacing:2.5px;color:#FFFFFF;text-transform:uppercase;font-weight:500;width:100px;">Total</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +
      '</div>' +

      // ═══ TOTALS ═══
      '<div style="padding:20px 40px 0;">' +
        '<table style="width:60%;margin-left:auto;font-size:13px;">' +
          '<tr>' +
            '<td style="padding:8px 12px;text-align:right;color:#7C7C7C;font-size:11px;letter-spacing:1px;">Subtotal</td>' +
            '<td style="padding:8px 12px;text-align:right;color:#0A0A0A;font-weight:500;">₹' + ((t ? t.sub : 0) || 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
          (t && t.discount ? '<tr>' +
            '<td style="padding:8px 12px;text-align:right;color:#0A0A0A;font-size:11px;letter-spacing:1px;">⭐ Member Discount</td>' +
            '<td style="padding:8px 12px;text-align:right;color:#0A0A0A;font-weight:500;">−₹' + t.discount.toLocaleString('en-IN') + '</td>' +
          '</tr>' : '') +
          '<tr>' +
            '<td style="padding:8px 12px;text-align:right;color:#7C7C7C;font-size:11px;letter-spacing:1px;">Delivery</td>' +
            '<td style="padding:8px 12px;text-align:right;color:#0A0A0A;font-weight:500;">' + (t && t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td colspan="2" style="padding:10px 0 0;"><div style="border-top:2px solid #0A0A0A;"></div></td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:14px 12px 0;text-align:right;font-size:11px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;vertical-align:middle;">' +
              (isOnline ? 'Total Paid' : 'Total COD') +
            '</td>' +
            '<td style="padding:8px 12px 0;text-align:right;font-family:Georgia,serif;font-size:26px;font-weight:600;color:#0A0A0A;">₹' + ((t ? t.total : 0) || 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // ═══ CUSTOMER ═══
      '<div style="padding:32px 40px 0;">' +
        '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;margin-bottom:14px;">Customer</div>' +
        '<table style="width:100%;font-size:13px;">' +
          '<tr>' +
            '<td style="padding:0 0 10px;color:#7C7C7C;font-size:10px;letter-spacing:2px;text-transform:uppercase;width:90px;vertical-align:top;">Name</td>' +
            '<td style="padding:0 0 10px;color:#0A0A0A;font-weight:500;">' + c.name + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:0 0 10px;color:#7C7C7C;font-size:10px;letter-spacing:2px;text-transform:uppercase;vertical-align:top;">Phone</td>' +
            '<td style="padding:0 0 10px;color:#0A0A0A;"><a href="tel:' + c.phone + '" style="color:#0A0A0A;text-decoration:none;">' + c.phone + '</a></td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:0 0 10px;color:#7C7C7C;font-size:10px;letter-spacing:2px;text-transform:uppercase;vertical-align:top;">Address</td>' +
            '<td style="padding:0 0 10px;color:#0A0A0A;line-height:1.6;">' + c.addr + '<br>' + c.city + ', ' + c.state + ' — ' + c.pin + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // ═══ ACTION BANNER ═══
      '<div style="padding:28px 40px 0;">' +
        '<div style="background:#0A0A0A;padding:24px;text-align:center;">' +
          '<div style="font-size:9px;letter-spacing:4px;color:#FFFFFF;text-transform:uppercase;opacity:0.55;margin-bottom:10px;">Action Required</div>' +
          '<div style="font-family:Georgia,serif;font-size:17px;color:#FFFFFF;letter-spacing:1px;line-height:1.5;font-weight:500;">' +
            (isOnline
              ? 'Refund <span style="border-bottom:1px solid rgba(255,255,255,0.4);padding-bottom:2px;">₹' + ((t ? t.total : 0) || 0).toLocaleString('en-IN') + '</span><br><span style="font-size:11px;color:#FFFFFF;opacity:0.6;font-family:-apple-system,sans-serif;letter-spacing:2px;text-transform:uppercase;font-weight:400;">via Razorpay Dashboard</span>'
              : 'Do Not Ship This Order') +
          '</div>' +
        '</div>' +
      '</div>' +

      // ═══ FOOTER ═══
      '<div style="padding:32px 40px 20px;text-align:center;">' +
        '<div style="font-family:Georgia,serif;font-size:14px;letter-spacing:6px;color:#0A0A0A;font-weight:500;">HINCHFIELD</div>' +
        '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;margin-top:8px;text-transform:uppercase;">— Wear Your Story —</div>' +
        '<div style="font-size:11px;color:#7C7C7C;margin-top:18px;line-height:1.8;">' +
          'WhatsApp <b style="color:#0A0A0A;">7434053550</b><br>' +
          '<a href="mailto:support.hinchfield@gmail.com" style="color:#7C7C7C;text-decoration:none;">support.hinchfield@gmail.com</a>' +
        '</div>' +
      '</div>' +

      // ═══ BOTTOM BAR ═══
      '<div style="background:#0A0A0A;padding:16px;text-align:center;">' +
        '<div style="font-size:9px;letter-spacing:3px;color:#FFFFFF;opacity:0.5;text-transform:uppercase;">© 2026 HINCHFIELD · HINCHFIELD.STORE</div>' +
      '</div>' +

    '</div>' +
    '</body></html>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HinchField <orders@hinchfield.store>',
        to: ['support.hinchfield@gmail.com'],
        subject: '⚠️ Order Cancelled — ' + order.id + ' — ₹' + ((t ? t.total : 0) || 0),
        html
      })
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false });
  }
}
