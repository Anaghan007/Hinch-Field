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
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;font-size:13px;color:#0A0A0A;font-weight:500;background-color:#FFFFFF;">' +
          (i+1) + '. ' + (l.name || 'Product') + extras +
        '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:center;font-size:13px;color:#0A0A0A;width:70px;background-color:#FFFFFF;">' + l.qty + '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;width:100px;background-color:#FFFFFF;">₹' + (l.price||0).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const discountRow = (t && t.discount) ? '<tr>' +
      '<td colspan="2" style="padding:8px 8px;text-align:right;font-size:13px;color:#0A0A0A;background-color:#FFFFFF;">⭐ Member Discount (50%)</td>' +
      '<td style="padding:8px 8px;text-align:right;font-size:13px;color:#0A0A0A;background-color:#FFFFFF;">−₹' + t.discount.toLocaleString('en-IN') + '</td>' +
    '</tr>' : '';

    const html =
    '<!DOCTYPE html>' +
    '<html><head>' +
    '<meta charset="utf-8">' +
    '<meta name="color-scheme" content="light">' +
    '<meta name="supported-color-schemes" content="light">' +
    '</head>' +
    '<body style="margin:0;padding:0;background-color:#F5F4F2;font-family:Arial,Helvetica,sans-serif;">' +

    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F4F2;">' +
    '<tr><td align="center" style="padding:24px 12px;">' +

    '<table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background-color:#FFFFFF;color:#0A0A0A;">' +

      // Order Info
      '<tr><td style="padding:28px 40px 0;background-color:#FFFFFF;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0">' +
          '<tr>' +
            '<td style="vertical-align:top;">' +
              '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;">Order Cancelled</div>' +
              '<div style="font-family:Arial,sans-serif;font-size:26px;font-weight:600;color:#0A0A0A;margin-top:6px;letter-spacing:1px;">' + order.id + '</div>' +
            '</td>' +
            '<td style="text-align:right;vertical-align:top;">' +
              '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;">Date</div>' +
              '<div style="font-size:14px;font-weight:600;color:#0A0A0A;margin-top:6px;">' + new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + '</div>' +
              '<div style="margin-top:10px;"><span style="display:inline-block;background-color:#0A0A0A;color:#FFFFFF;font-size:10px;letter-spacing:1.5px;padding:6px 12px;font-weight:600;">CANCELLED</span></div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +

      // Alert
      '<tr><td style="padding:24px 40px 0;background-color:#FFFFFF;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FEF2F2;border-left:4px solid #DC2626;">' +
          '<tr><td style="padding:14px 16px;">' +
            '<div style="font-size:13px;color:#DC2626;font-weight:600;">⚠ Customer has cancelled this order</div>' +
            '<div style="font-size:12px;color:#7C7C7C;margin-top:4px;">' + (isOnline ? 'Payment was made online — refund required' : 'COD order — do not ship') + '</div>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Items Table
      '<tr><td style="padding:28px 40px 0;background-color:#FFFFFF;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' +
          '<thead><tr style="background-color:#0A0A0A;">' +
            '<th style="padding:12px 8px;text-align:left;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:600;background-color:#0A0A0A;">Item</th>' +
            '<th style="padding:12px 8px;text-align:center;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:600;width:70px;background-color:#0A0A0A;">Qty</th>' +
            '<th style="padding:12px 8px;text-align:right;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:600;width:100px;background-color:#0A0A0A;">Price</th>' +
          '</tr></thead>' +
          '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +
      '</td></tr>' +

      // Totals
      '<tr><td style="padding:0 40px;background-color:#FFFFFF;">' +
        '<table cellpadding="0" cellspacing="0" border="0" style="margin-left:auto;margin-top:8px;width:320px;">' +
          '<tr>' +
            '<td style="padding:8px;text-align:right;font-size:13px;color:#7C7C7C;background-color:#FFFFFF;">Subtotal</td>' +
            '<td style="padding:8px;text-align:right;font-size:13px;color:#0A0A0A;width:110px;background-color:#FFFFFF;">₹' + (t ? t.sub : 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
          discountRow +
          '<tr>' +
            '<td style="padding:8px;text-align:right;font-size:13px;color:#7C7C7C;background-color:#FFFFFF;">Delivery</td>' +
            '<td style="padding:8px;text-align:right;font-size:13px;color:#0A0A0A;background-color:#FFFFFF;">' + (t && t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:16px 8px 8px;text-align:right;font-size:13px;letter-spacing:2px;color:#0A0A0A;text-transform:uppercase;font-weight:600;border-top:2px solid #0A0A0A;background-color:#FFFFFF;">Total ' + (isOnline ? 'Paid' : 'COD') + '</td>' +
            '<td style="padding:16px 8px 8px;text-align:right;font-size:22px;color:#0A0A0A;font-weight:700;border-top:2px solid #0A0A0A;background-color:#FFFFFF;">₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</td>' +
          '</tr>' +
        '</table>' +
      '</td></tr>' +

      // Customer Section
      '<tr><td style="padding:32px 40px 0;background-color:#FFFFFF;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAFAF9;border:1px solid #E6E4E0;">' +
          '<tr><td style="padding:24px 28px;">' +
            '<div style="text-align:center;padding-bottom:18px;border-bottom:1px solid #E6E4E0;margin-bottom:20px;">' +
              '<div style="font-size:10px;letter-spacing:4px;color:#7C7C7C;text-transform:uppercase;">Delivery Details</div>' +
            '</div>' +
            '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;">' +
              '<tr>' +
                '<td style="padding:8px 0;vertical-align:top;width:100px;background-color:#FAFAF9;">' +
                  '<div style="font-size:9px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;">Name</div>' +
                '</td>' +
                '<td style="padding:8px 0;vertical-align:top;background-color:#FAFAF9;">' +
                  '<div style="font-size:14px;font-weight:600;color:#0A0A0A;">' + c.name + '</div>' +
                '</td>' +
              '</tr>' +
              '<tr>' +
                '<td style="padding:8px 0;vertical-align:top;background-color:#FAFAF9;">' +
                  '<div style="font-size:9px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;">Phone</div>' +
                '</td>' +
                '<td style="padding:8px 0;vertical-align:top;background-color:#FAFAF9;">' +
                  '<div style="font-size:14px;color:#0A0A0A;font-weight:500;">' + c.phone + '</div>' +
                '</td>' +
              '</tr>' +
              '<tr>' +
                '<td style="padding:8px 0;vertical-align:top;background-color:#FAFAF9;">' +
                  '<div style="font-size:9px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;">Address</div>' +
                '</td>' +
                '<td style="padding:8px 0;vertical-align:top;background-color:#FAFAF9;">' +
                  '<div style="font-size:13px;color:#0A0A0A;line-height:1.7;">' + c.addr + '</div>' +
                '</td>' +
              '</tr>' +
              '<tr>' +
                '<td style="padding:8px 0;vertical-align:top;background-color:#FAFAF9;">' +
                  '<div style="font-size:9px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;">City</div>' +
                '</td>' +
                '<td style="padding:8px 0;vertical-align:top;background-color:#FAFAF9;">' +
                  '<div style="font-size:13px;color:#0A0A0A;">' + c.city + ', ' + c.state + ' <span style="color:#7C7C7C;">— ' + c.pin + '</span></div>' +
                '</td>' +
              '</tr>' +
            '</table>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Action
      '<tr><td style="padding:28px 40px 0;background-color:#FFFFFF;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0A0A;">' +
          '<tr><td style="padding:20px 24px;text-align:center;">' +
            '<div style="font-size:10px;letter-spacing:4px;color:#7C7C7C;text-transform:uppercase;">Action Required</div>' +
            '<div style="font-family:Georgia,serif;font-size:18px;color:#FFFFFF;letter-spacing:1px;margin-top:8px;line-height:1.5;">' +
              (isOnline ? 'Refund <b>₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</b> via Razorpay' : 'Do NOT ship this order') +
            '</div>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Footer
      '<tr><td style="padding:32px 40px 24px;text-align:center;background-color:#FFFFFF;">' +
        '<div style="font-size:11px;color:#0A0A0A;font-weight:600;letter-spacing:2px;margin-bottom:10px;">HINCHFIELD</div>' +
        '<div style="font-size:11px;color:#7C7C7C;line-height:1.8;">' +
          'WhatsApp: <b style="color:#0A0A0A;">7434053550</b> · <a href="mailto:support.hinchfield@gmail.com" style="color:#0A0A0A;text-decoration:none;">support.hinchfield@gmail.com</a><br>' +
          '<a href="https://hinchfield.store" style="color:#7C7C7C;text-decoration:none;">hinchfield.store</a>' +
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
