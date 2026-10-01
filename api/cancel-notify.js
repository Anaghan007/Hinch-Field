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
      const extras = (l.colorChoice ? '<br><span class="text-muted" style="font-size:11px;">Colour: ' + l.colorChoice + '</span>' : '')
                   + (l.custom ? '<br><span class="text-muted" style="font-size:11px;">Custom (' + l.custom.pos + '): ' + (l.custom.note || '') + '</span>' : '');
      return '<tr>' +
        '<td class="bg-card text-main" style="padding:14px 8px;border-bottom:1px solid #E6E4E0;font-size:13px;font-weight:500;">' +
          (i+1) + '. ' + (l.name || 'Product') + extras +
        '</td>' +
        '<td class="bg-card text-main" style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:center;font-size:13px;width:70px;">' + l.qty + '</td>' +
        '<td class="bg-card text-main" style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;width:100px;white-space:nowrap;">₹' + (l.price||0).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const html =
    '<!DOCTYPE html>' +
    '<html><head>' +
    '<meta charset="utf-8">' +
    '<meta name="color-scheme" content="light dark">' +
    '<meta name="supported-color-schemes" content="light dark">' +
    '<style type="text/css">' +
      'body, .bg-card { background-color: #FFFFFF; }' +
      '.bg-soft { background-color: #FAFAF9; }' +
      '.bg-dark { background-color: #0A0A0A; }' +
      '.text-main { color: #0A0A0A; }' +
      '.text-muted { color: #7C7C7C; }' +
      '.text-white { color: #FFFFFF; }' +
      '@media (prefers-color-scheme: dark) {' +
        'body, .bg-card { background-color: #0A0A0A !important; }' +
        '.bg-soft { background-color: #1A1A1A !important; }' +
        '.bg-dark { background-color: #FFFFFF !important; }' +
        '.text-main { color: #FFFFFF !important; }' +
        '.text-muted { color: #999999 !important; }' +
        '.text-white { color: #0A0A0A !important; }' +
      '}' +
      '[data-ogsc] body, [data-ogsc] .bg-card { background-color: #0A0A0A !important; }' +
      '[data-ogsc] .text-main { color: #FFFFFF !important; }' +
      '[data-ogsc] .text-muted { color: #999999 !important; }' +
    '</style>' +
    '</head>' +
    '<body class="bg-card" style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;">' +

    '<table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-card">' +
    '<tr><td align="center" style="padding:0;">' +

    '<table width="620" cellpadding="0" cellspacing="0" border="0" class="bg-card" style="max-width:620px;width:100%;">' +

      // Order Info
      '<tr><td class="bg-card" style="padding:28px 40px 0;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0">' +
          '<tr>' +
            '<td style="vertical-align:top;" class="bg-card">' +
              '<div class="text-muted" style="font-size:10px;letter-spacing:3px;text-transform:uppercase;">Order Cancelled</div>' +
              '<div class="text-main" style="font-family:Arial,sans-serif;font-size:26px;font-weight:600;margin-top:6px;letter-spacing:1px;">' + order.id + '</div>' +
            '</td>' +
            '<td style="text-align:right;vertical-align:top;" class="bg-card">' +
              '<div class="text-muted" style="font-size:10px;letter-spacing:3px;text-transform:uppercase;">Date</div>' +
              '<div class="text-main" style="font-size:14px;font-weight:600;margin-top:6px;">' + new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + '</div>' +
              '<div style="margin-top:10px;"><span class="bg-dark text-white" style="display:inline-block;font-size:10px;letter-spacing:1.5px;padding:6px 12px;font-weight:600;">CANCELLED</span></div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +

      // Alert
      '<tr><td class="bg-card" style="padding:24px 40px 0;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FEF2F2;border-left:4px solid #DC2626;">' +
          '<tr><td style="padding:14px 16px;background-color:#FEF2F2;">' +
            '<div style="font-size:13px;color:#DC2626;font-weight:600;">⚠ Customer has cancelled this order</div>' +
            '<div style="font-size:12px;color:#DC2626;opacity:0.75;margin-top:4px;">' + (isOnline ? 'Payment was made online — refund required' : 'COD order — do not ship') + '</div>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Items
      '<tr><td class="bg-card" style="padding:28px 40px 0;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' +
          '<thead><tr class="bg-dark">' +
            '<th class="bg-dark text-white" style="padding:12px 8px;text-align:left;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Item</th>' +
            '<th class="bg-dark text-white" style="padding:12px 8px;text-align:center;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;width:70px;">Qty</th>' +
            '<th class="bg-dark text-white" style="padding:12px 8px;text-align:right;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;width:100px;">Price</th>' +
          '</tr></thead>' +
          '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +
      '</td></tr>' +

      // Totals
      '<tr><td class="bg-card" style="padding:0 40px 8px;">' +
        '<table cellpadding="0" cellspacing="0" border="0" style="margin-left:auto;margin-top:8px;width:100%;max-width:340px;">' +
          '<tr>' +
            '<td class="text-muted bg-card" style="padding:10px 12px;text-align:right;font-size:13px;white-space:nowrap;">Subtotal</td>' +
            '<td class="text-main bg-card" style="padding:10px 12px;text-align:right;font-size:14px;font-weight:500;width:130px;white-space:nowrap;">₹' + (t ? t.sub : 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
          ((t && t.discount) ?
            '<tr>' +
              '<td class="text-main bg-card" style="padding:10px 12px;text-align:right;font-size:13px;white-space:nowrap;">⭐ Member Discount (50%)</td>' +
              '<td class="text-main bg-card" style="padding:10px 12px;text-align:right;font-size:14px;font-weight:500;white-space:nowrap;">−₹' + t.discount.toLocaleString('en-IN') + '</td>' +
            '</tr>' : '') +
          '<tr>' +
            '<td class="text-muted bg-card" style="padding:10px 12px;text-align:right;font-size:13px;white-space:nowrap;">Delivery</td>' +
            '<td class="text-main bg-card" style="padding:10px 12px;text-align:right;font-size:14px;font-weight:500;white-space:nowrap;">' + (t && t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td class="text-main bg-card" style="padding:16px 12px 8px;text-align:right;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;border-top:2px solid #0A0A0A;white-space:nowrap;">Total ' + (isOnline ? 'Paid' : 'COD') + '</td>' +
            '<td class="text-main bg-card" style="padding:16px 12px 8px;text-align:right;font-size:22px;font-weight:700;border-top:2px solid #0A0A0A;white-space:nowrap;">₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +

      // Customer - Receipt Style (Name + Phone only)
      '<tr><td class="bg-card" style="padding:28px 40px 0;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' +

          // Receipt top border
          '<tr><td style="border-top:1px solid #E6E4E0;padding:0;"></td></tr>' +

          // Header
          '<tr><td class="bg-card" style="padding:16px 0 12px;">' +
            '<div class="text-muted" style="font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:600;">Customer</div>' +
          '</td></tr>' +

          // Divider
          '<tr><td style="border-top:1px solid #E6E4E0;padding:0;"></td></tr>' +

          // Name - Big Bold
          '<tr><td class="bg-card" style="padding:20px 0 0;">' +
            '<div class="text-main" style="font-size:20px;font-weight:700;letter-spacing:0.5px;line-height:1.3;">' + c.name + '</div>' +
          '</td></tr>' +

          // Phone - Small Muted
          '<tr><td class="bg-card" style="padding:6px 0 20px;">' +
            '<div class="text-muted" style="font-size:12px;letter-spacing:1.5px;font-weight:400;">' + c.phone + '</div>' +
          '</td></tr>' +

          // Receipt bottom border
          '<tr><td style="border-top:1px solid #E6E4E0;padding:0;"></td></tr>' +

        '</table>' +
      '</td></tr>' +

      // Action
      '<tr><td class="bg-card" style="padding:28px 40px 0;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-dark">' +
          '<tr><td class="bg-dark" style="padding:20px 24px;text-align:center;">' +
            '<div class="text-white" style="font-size:10px;letter-spacing:4px;text-transform:uppercase;opacity:0.6;">Action Required</div>' +
            '<div class="text-white" style="font-family:Georgia,serif;font-size:18px;letter-spacing:1px;margin-top:8px;line-height:1.5;">' +
              (isOnline ? 'Refund <b>₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</b> via Razorpay' : 'Do NOT ship this order') +
            '</div>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

    '</table>' +

    '</td></tr>' +
    '</table>' +

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
