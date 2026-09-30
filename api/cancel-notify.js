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
      const extras = (l.colorChoice ? '<br><span style="font-size:11px;color:#7C7C7C !important;">Colour: ' + l.colorChoice + '</span>' : '')
                   + (l.custom ? '<br><span style="font-size:11px;color:#7C7C7C !important;">Custom (' + l.custom.pos + '): ' + (l.custom.note || '') + '</span>' : '');
      return '<tr>' +
        '<td class="force-light" style="padding:14px 8px;border-bottom:1px solid #E6E4E0 !important;font-size:13px;color:#0A0A0A !important;background-color:#FFFFFF !important;font-weight:500;">' +
          (i+1) + '. ' + (l.name || 'Product') + extras +
        '</td>' +
        '<td class="force-light" style="padding:14px 8px;border-bottom:1px solid #E6E4E0 !important;text-align:center;font-size:13px;color:#0A0A0A !important;width:70px;background-color:#FFFFFF !important;">' + l.qty + '</td>' +
        '<td class="force-light" style="padding:14px 8px;border-bottom:1px solid #E6E4E0 !important;text-align:right;font-size:13px;color:#0A0A0A !important;width:100px;background-color:#FFFFFF !important;">₹' + (l.price||0).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const discountRow = (t && t.discount) ? '<tr>' +
      '<td colspan="2" class="force-light" style="padding:8px;text-align:right;font-size:13px;color:#0A0A0A !important;background-color:#FFFFFF !important;">⭐ Member Discount (50%)</td>' +
      '<td class="force-light" style="padding:8px;text-align:right;font-size:13px;color:#0A0A0A !important;background-color:#FFFFFF !important;">−₹' + t.discount.toLocaleString('en-IN') + '</td>' +
    '</tr>' : '';

    const html =
    '<!DOCTYPE html>' +
    '<html><head>' +
    '<meta charset="utf-8">' +
    '<meta name="color-scheme" content="only light">' +
    '<meta name="supported-color-schemes" content="only light">' +
    '<style type="text/css">' +
      ':root { color-scheme: light only !important; supported-color-schemes: light only !important; }' +
      'body, table, td, div, p, tr, th { background-color: #FFFFFF !important; color: #0A0A0A !important; }' +
      '.force-light, .force-light * { background-color: #FFFFFF !important; color: #0A0A0A !important; }' +
      '.force-gray, .force-gray * { background-color: #FAFAF9 !important; color: #0A0A0A !important; }' +
      '.force-black, .force-black * { background-color: #0A0A0A !important; color: #FFFFFF !important; }' +
      '.force-red, .force-red * { background-color: #FEF2F2 !important; color: #DC2626 !important; }' +
      '.muted, .muted * { color: #7C7C7C !important; }' +
      '@media (prefers-color-scheme: dark) {' +
        'body, table, td, div, p, tr, th { background-color: #FFFFFF !important; color: #0A0A0A !important; }' +
        '.force-light, .force-light * { background-color: #FFFFFF !important; color: #0A0A0A !important; }' +
        '.force-gray, .force-gray * { background-color: #FAFAF9 !important; color: #0A0A0A !important; }' +
        '.force-black, .force-black * { background-color: #0A0A0A !important; color: #FFFFFF !important; }' +
        '.force-red, .force-red * { background-color: #FEF2F2 !important; color: #DC2626 !important; }' +
        '.muted, .muted * { color: #7C7C7C !important; }' +
      '}' +
      '[data-ogsc] body, [data-ogsc] table, [data-ogsc] td, [data-ogsc] div { background-color: #FFFFFF !important; color: #0A0A0A !important; }' +
      '[data-ogsc] .force-light, [data-ogsc] .force-light * { background-color: #FFFFFF !important; color: #0A0A0A !important; }' +
      '[data-ogsc] .force-gray, [data-ogsc] .force-gray * { background-color: #FAFAF9 !important; color: #0A0A0A !important; }' +
      '[data-ogsc] .force-black, [data-ogsc] .force-black * { background-color: #0A0A0A !important; color: #FFFFFF !important; }' +
    '</style>' +
    '</head>' +
    '<body class="force-light" style="margin:0;padding:0;background-color:#F5F4F2 !important;font-family:Arial,Helvetica,sans-serif;">' +

    '<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F4F2" style="background-color:#F5F4F2 !important;">' +
    '<tr><td align="center" style="padding:24px 12px;background-color:#F5F4F2 !important;">' +

    '<table width="620" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" class="force-light" style="max-width:620px;width:100%;background-color:#FFFFFF !important;color:#0A0A0A !important;">' +

      // Order Info
      '<tr><td class="force-light" style="padding:28px 40px 0;background-color:#FFFFFF !important;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0">' +
          '<tr>' +
            '<td class="force-light" style="vertical-align:top;background-color:#FFFFFF !important;">' +
              '<div class="muted" style="font-size:10px;letter-spacing:3px;color:#7C7C7C !important;text-transform:uppercase;">Order Cancelled</div>' +
              '<div style="font-family:Arial,sans-serif;font-size:26px;font-weight:600;color:#0A0A0A !important;margin-top:6px;letter-spacing:1px;">' + order.id + '</div>' +
            '</td>' +
            '<td class="force-light" style="text-align:right;vertical-align:top;background-color:#FFFFFF !important;">' +
              '<div class="muted" style="font-size:10px;letter-spacing:3px;color:#7C7C7C !important;text-transform:uppercase;">Date</div>' +
              '<div style="font-size:14px;font-weight:600;color:#0A0A0A !important;margin-top:6px;">' + new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + '</div>' +
              '<div style="margin-top:10px;"><span class="force-black" style="display:inline-block;background-color:#0A0A0A !important;color:#FFFFFF !important;font-size:10px;letter-spacing:1.5px;padding:6px 12px;font-weight:600;">CANCELLED</span></div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +

      // Alert
      '<tr><td class="force-light" style="padding:24px 40px 0;background-color:#FFFFFF !important;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FEF2F2" class="force-red" style="background-color:#FEF2F2 !important;border-left:4px solid #DC2626 !important;">' +
          '<tr><td class="force-red" style="padding:14px 16px;background-color:#FEF2F2 !important;">' +
            '<div style="font-size:13px;color:#DC2626 !important;font-weight:600;">⚠ Customer has cancelled this order</div>' +
            '<div style="font-size:12px;color:#DC2626 !important;margin-top:4px;opacity:0.7;">' + (isOnline ? 'Payment was made online — refund required' : 'COD order — do not ship') + '</div>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Items
      '<tr><td class="force-light" style="padding:28px 40px 0;background-color:#FFFFFF !important;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' +
          '<thead><tr class="force-black" bgcolor="#0A0A0A" style="background-color:#0A0A0A !important;">' +
            '<th class="force-black" style="padding:12px 8px;text-align:left;font-size:11px;letter-spacing:2px;color:#FFFFFF !important;text-transform:uppercase;font-weight:600;background-color:#0A0A0A !important;">Item</th>' +
            '<th class="force-black" style="padding:12px 8px;text-align:center;font-size:11px;letter-spacing:2px;color:#FFFFFF !important;text-transform:uppercase;font-weight:600;width:70px;background-color:#0A0A0A !important;">Qty</th>' +
            '<th class="force-black" style="padding:12px 8px;text-align:right;font-size:11px;letter-spacing:2px;color:#FFFFFF !important;text-transform:uppercase;font-weight:600;width:100px;background-color:#0A0A0A !important;">Price</th>' +
          '</tr></thead>' +
          '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +
      '</td></tr>' +

      // Totals
      '<tr><td class="force-light" style="padding:0 40px;background-color:#FFFFFF !important;">' +
        '<table cellpadding="0" cellspacing="0" border="0" style="margin-left:auto;margin-top:8px;width:320px;">' +
          '<tr>' +
            '<td class="force-light muted" style="padding:8px;text-align:right;font-size:13px;color:#7C7C7C !important;background-color:#FFFFFF !important;">Subtotal</td>' +
            '<td class="force-light" style="padding:8px;text-align:right;font-size:13px;color:#0A0A0A !important;width:110px;background-color:#FFFFFF !important;">₹' + (t ? t.sub : 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
          discountRow +
          '<tr>' +
            '<td class="force-light muted" style="padding:8px;text-align:right;font-size:13px;color:#7C7C7C !important;background-color:#FFFFFF !important;">Delivery</td>' +
            '<td class="force-light" style="padding:8px;text-align:right;font-size:13px;color:#0A0A0A !important;background-color:#FFFFFF !important;">' + (t && t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td class="force-light" style="padding:16px 8px 8px;text-align:right;font-size:13px;letter-spacing:2px;color:#0A0A0A !important;text-transform:uppercase;font-weight:600;border-top:2px solid #0A0A0A !important;background-color:#FFFFFF !important;">Total ' + (isOnline ? 'Paid' : 'COD') + '</td>' +
            '<td class="force-light" style="padding:16px 8px 8px;text-align:right;font-size:22px;color:#0A0A0A !important;font-weight:700;border-top:2px solid #0A0A0A !important;background-color:#FFFFFF !important;">₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +

      // Customer
      '<tr><td class="force-light" style="padding:32px 40px 0;background-color:#FFFFFF !important;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAFAF9" class="force-gray" style="background-color:#FAFAF9 !important;border:1px solid #E6E4E0 !important;">' +
          '<tr><td class="force-gray" style="padding:24px 28px;background-color:#FAFAF9 !important;">' +
            '<div style="text-align:center;padding-bottom:18px;border-bottom:1px solid #E6E4E0 !important;margin-bottom:20px;">' +
              '<div class="muted" style="font-size:10px;letter-spacing:4px;color:#7C7C7C !important;text-transform:uppercase;">Delivery Details</div>' +
            '</div>' +
            '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;">' +
              '<tr>' +
                '<td class="force-gray" style="padding:8px 0;vertical-align:top;width:100px;background-color:#FAFAF9 !important;">' +
                  '<div class="muted" style="font-size:9px;letter-spacing:2px;color:#7C7C7C !important;text-transform:uppercase;">Name</div>' +
                '</td>' +
                '<td class="force-gray" style="padding:8px 0;vertical-align:top;background-color:#FAFAF9 !important;">' +
                  '<div style="font-size:14px;font-weight:600;color:#0A0A0A !important;">' + c.name + '</div>' +
                '</td>' +
              '</tr>' +
              '<tr>' +
                '<td class="force-gray" style="padding:8px 0;vertical-align:top;background-color:#FAFAF9 !important;">' +
                  '<div class="muted" style="font-size:9px;letter-spacing:2px;color:#7C7C7C !important;text-transform:uppercase;">Phone</div>' +
                '</td>' +
                '<td class="force-gray" style="padding:8px 0;vertical-align:top;background-color:#FAFAF9 !important;">' +
                  '<div style="font-size:14px;color:#0A0A0A !important;font-weight:500;">' + c.phone + '</div>' +
                '</td>' +
              '</tr>' +
              '<tr>' +
                '<td class="force-gray" style="padding:8px 0;vertical-align:top;background-color:#FAFAF9 !important;">' +
                  '<div class="muted" style="font-size:9px;letter-spacing:2px;color:#7C7C7C !important;text-transform:uppercase;">Address</div>' +
                '</td>' +
                '<td class="force-gray" style="padding:8px 0;vertical-align:top;background-color:#FAFAF9 !important;">' +
                  '<div style="font-size:13px;color:#0A0A0A !important;line-height:1.7;">' + c.addr + '</div>' +
                '</td>' +
              '</tr>' +
              '<tr>' +
                '<td class="force-gray" style="padding:8px 0;vertical-align:top;background-color:#FAFAF9 !important;">' +
                  '<div class="muted" style="font-size:9px;letter-spacing:2px;color:#7C7C7C !important;text-transform:uppercase;">City</div>' +
                '</td>' +
                '<td class="force-gray" style="padding:8px 0;vertical-align:top;background-color:#FAFAF9 !important;">' +
                  '<div style="font-size:13px;color:#0A0A0A !important;">' + c.city + ', ' + c.state + ' <span style="color:#7C7C7C !important;">— ' + c.pin + '</span></div>' +
                '</td>' +
              '</tr>' +
            '</table>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Action
      '<tr><td class="force-light" style="padding:28px 40px 0;background-color:#FFFFFF !important;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A0A0A" class="force-black" style="background-color:#0A0A0A !important;">' +
          '<tr><td class="force-black" style="padding:20px 24px;text-align:center;background-color:#0A0A0A !important;">' +
            '<div style="font-size:10px;letter-spacing:4px;color:#FFFFFF !important;opacity:0.5;text-transform:uppercase;">Action Required</div>' +
            '<div style="font-family:Georgia,serif;font-size:18px;color:#FFFFFF !important;letter-spacing:1px;margin-top:8px;line-height:1.5;">' +
              (isOnline ? 'Refund <b>₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</b> via Razorpay' : 'Do NOT ship this order') +
            '</div>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Footer
      '<tr><td class="force-light" style="padding:32px 40px 24px;text-align:center;background-color:#FFFFFF !important;">' +
        '<div style="font-size:11px;color:#0A0A0A !important;font-weight:600;letter-spacing:2px;margin-bottom:10px;">HINCHFIELD</div>' +
        '<div class="muted" style="font-size:11px;color:#7C7C7C !important;line-height:1.8;">' +
          'WhatsApp: <b style="color:#0A0A0A !important;">7434053550</b> · <a href="mailto:support.hinchfield@gmail.com" style="color:#0A0A0A !important;text-decoration:none;">support.hinchfield@gmail.com</a><br>' +
          '<a href="https://hinchfield.store" style="color:#7C7C7C !important;text-decoration:none;">hinchfield.store</a>' +
        '</div>' +
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
