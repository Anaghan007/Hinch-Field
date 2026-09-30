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
      const extras = (l.colorChoice ? '<br><span style="font-size:11px;color:#7C7C7C;">Colour: ' + l.colorChoice + '</span>' : '')
                   + (l.custom ? '<br><span style="font-size:11px;color:#7C7C7C;">Custom (' + l.custom.pos + '): ' + (l.custom.note || '') + '</span>' : '');
      return '<tr>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;font-size:13px;color:#0A0A0A;font-weight:500;">' +
          (i+1) + '. ' + (l.name || 'Product') + extras +
        '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:center;font-size:13px;color:#0A0A0A;">' + l.qty + '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;">₹' + (l.price||0).toLocaleString('en-IN') + '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;font-weight:600;">₹' + ((l.price||0) * l.qty).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const discountRow = (t && t.discount) ? '<tr>' +
      '<td colspan="3" style="padding:8px 8px;text-align:right;font-size:13px;color:#0A0A0A;">⭐ Member Discount (50%)</td>' +
      '<td style="padding:8px 8px;text-align:right;font-size:13px;color:#0A0A0A;">−₹' + t.discount.toLocaleString('en-IN') + '</td>' +
    '</tr>' : '';

    const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:0;background:#F5F4F2;font-family:Arial,Helvetica,sans-serif;">' +

    '<div style="max-width:620px;margin:0 auto;background:#FFFFFF;">' +

      // Header with Logo
      '<div style="padding:32px 40px 24px;">' +
        '<table style="width:100%;"><tr>' +
          '<td style="vertical-align:middle;">' +
            '<table><tr>' +
              '<td style="vertical-align:middle;padding-right:12px;">' +
                '<div style="font-family:Georgia,serif;font-size:38px;font-weight:700;color:#0A0A0A;line-height:1;letter-spacing:-2px;">H</div>' +
              '</td>' +
              '<td style="vertical-align:middle;">' +
                '<div style="font-family:Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:2px;color:#0A0A0A;line-height:1;">HINCHFIELD</div>' +
                '<div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:5px;color:#7C7C7C;margin-top:4px;">— WEAR YOUR STORY —</div>' +
              '</td>' +
            '</tr></table>' +
          '</td>' +
        '</tr></table>' +
      '</div>' +

      // Top Border
      '<div style="border-top:2px solid #0A0A0A;margin:0 40px;"></div>' +

      // Order Info Section
      '<div style="padding:28px 40px 0;">' +
        '<table style="width:100%;">' +
          '<tr>' +
            '<td style="vertical-align:top;">' +
              '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;">Order Cancelled</div>' +
              '<div style="font-family:Arial,sans-serif;font-size:26px;font-weight:600;color:#0A0A0A;margin-top:6px;letter-spacing:1px;">' + order.id + '</div>' +
            '</td>' +
            '<td style="text-align:right;vertical-align:top;">' +
              '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;">Date</div>' +
              '<div style="font-size:14px;font-weight:600;color:#0A0A0A;margin-top:6px;">' +
                new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) +
              '</div>' +
              '<div style="margin-top:10px;">' +
                '<span style="display:inline-block;background:#0A0A0A;color:#FFFFFF;font-size:10px;letter-spacing:1.5px;padding:6px 12px;font-weight:600;">CANCELLED</span>' +
              '</div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // Alert Banner
      '<div style="padding:24px 40px 0;">' +
        '<div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:14px 16px;">' +
          '<div style="font-size:13px;color:#DC2626;font-weight:600;letter-spacing:0.5px;">⚠ Customer has cancelled this order</div>' +
          '<div style="font-size:12px;color:#7C7C7C;margin-top:4px;">' +
            (isOnline ? 'Payment was made online — refund required' : 'COD order — do not ship') +
          '</div>' +
        '</div>' +
      '</div>' +

      // Items Table
      '<div style="padding:28px 40px 0;">' +
        '<table style="width:100%;border-collapse:collapse;">' +
          '<thead>' +
            '<tr style="background:#0A0A0A;">' +
              '<th style="padding:12px 8px;text-align:left;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:600;">Item</th>' +
              '<th style="padding:12px 8px;text-align:center;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:600;width:60px;">Qty</th>' +
              '<th style="padding:12px 8px;text-align:right;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:600;width:90px;">Price</th>' +
              '<th style="padding:12px 8px;text-align:right;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:600;width:90px;">Total</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +
      '</div>' +

      // Totals
      '<div style="padding:0 40px;">' +
        '<table style="width:100%;margin-left:auto;max-width:320px;margin-top:8px;">' +
          '<tr>' +
            '<td style="padding:8px 8px;text-align:right;font-size:13px;color:#7C7C7C;">Subtotal</td>' +
            '<td style="padding:8px 8px;text-align:right;font-size:13px;color:#0A0A0A;width:110px;">₹' + (t ? t.sub : 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
          discountRow +
          '<tr>' +
            '<td style="padding:8px 8px;text-align:right;font-size:13px;color:#7C7C7C;">Delivery</td>' +
            '<td style="padding:8px 8px;text-align:right;font-size:13px;color:#0A0A0A;">' + (t && t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td>' +
          '</tr>' +
          '<tr style="border-top:2px solid #0A0A0A;">' +
            '<td style="padding:16px 8px 8px;text-align:right;font-size:13px;letter-spacing:2px;color:#0A0A0A;text-transform:uppercase;font-weight:600;">Total ' + (isOnline ? 'Paid' : 'COD') + '</td>' +
            '<td style="padding:16px 8px 8px;text-align:right;font-size:22px;color:#0A0A0A;font-weight:700;">₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // Customer Section
      '<div style="padding:32px 40px 0;border-top:1px solid #E6E4E0;margin-top:24px;">' +
        '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;margin-bottom:14px;">Customer Details</div>' +
        '<div style="font-size:14px;color:#0A0A0A;line-height:1.8;">' +
          '<b style="font-weight:600;">' + c.name + '</b><br>' +
          '<span style="color:#7C7C7C;">' + c.phone + '</span><br>' +
          c.addr + '<br>' +
          c.city + ', ' + c.state + ' — ' + c.pin +
        '</div>' +
      '</div>' +

      // Action Required
      '<div style="padding:28px 40px 0;">' +
        '<div style="background:#0A0A0A;padding:20px 24px;text-align:center;">' +
          '<div style="font-size:10px;letter-spacing:4px;color:#7C7C7C;text-transform:uppercase;">Action Required</div>' +
          '<div style="font-family:Georgia,serif;font-size:18px;color:#FFFFFF;letter-spacing:1px;margin-top:8px;line-height:1.5;">' +
            (isOnline
              ? 'Refund <b>₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</b> via Razorpay'
              : 'Do NOT ship this order') +
          '</div>' +
        '</div>' +
      '</div>' +

      // Footer
      '<div style="padding:32px 40px 24px;text-align:center;">' +
        '<div style="font-size:11px;color:#0A0A0A;font-weight:600;letter-spacing:2px;margin-bottom:10px;">HINCHFIELD</div>' +
        '<div style="font-size:11px;color:#7C7C7C;line-height:1.8;">' +
          'WhatsApp: <b style="color:#0A0A0A;">7434053550</b> · <a href="mailto:support.hinchfield@gmail.com" style="color:#0A0A0A;text-decoration:none;">support.hinchfield@gmail.com</a><br>' +
          '<a href="https://hinchfield.store" style="color:#7C7C7C;text-decoration:none;">hinchfield.store</a>' +
        '</div>' +
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
