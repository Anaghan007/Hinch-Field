export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const { order } = req.body || {};
    if (!order || !order.id) return res.status(400).json({ success: false, error: 'Invalid order data' });

    const KEY = process.env.RESEND_API_KEY;
    if (!KEY) return res.status(500).json({ success: false, error: 'Missing RESEND_API_KEY' });

    const c = order.customer || {};
    const t = order.totals || {};
    const p = order.payment || {};
    const isOnline = p.method === 'online';

    // 1. Items HTML
    const itemsHtml = (order.items || []).map((l, i) => {
      const extras = (l.colorChoice ? '<br><span style="font-size:11px;color:#7C7C7C;">Colour: ' + l.colorChoice + '</span>' : '')
                   + (l.custom ? '<br><span style="font-size:11px;color:#7C7C7C;">Custom (' + l.custom.pos + '): ' + (l.custom.note || '') + '</span>' : '');
      return '<tr>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;font-size:13px;font-weight:500;color:#0A0A0A;background:#FFFFFF;">' +
          (i+1) + '. ' + (l.name || 'Product') + extras +
        '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:center;font-size:13px;width:70px;color:#0A0A0A;background:#FFFFFF;">' + l.qty + '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;width:100px;white-space:nowrap;color:#0A0A0A;background:#FFFFFF;">₹' + (l.price||0).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    // 2. Dynamic Subject Line
    const subject = isOnline 
      ? `🚨 REFUND REQUIRED: PAID Order Cancelled — ${order.id} — ₹${t.total || 0}`
      : `📦 COD Order Cancelled — ${order.id} — ₹${t.total || 0}`;

    // 3. Dynamic Alert Banner
    const alertBanner = isOnline
      ? '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FEF2F2;border-left:4px solid #DC2626;">' +
          '<tr><td style="padding:14px 16px;background-color:#FEF2F2;">' +
            '<div style="font-size:14px;color:#DC2626;font-weight:700;letter-spacing:0.5px;">💳 PAID ORDER CANCELLED — REFUND REQUIRED!</div>' +
            '<div style="font-size:12px;color:#DC2626;opacity:0.85;margin-top:4px;">Customer paid online. You must initiate the refund from Razorpay Dashboard.</div>' +
          '</td></tr>' +
        '</table>'
      : '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F4F2;border-left:4px solid #0A0A0A;">' +
          '<tr><td style="padding:14px 16px;background-color:#F5F4F2;">' +
            '<div style="font-size:14px;color:#0A0A0A;font-weight:700;letter-spacing:0.5px;">📦 COD ORDER CANCELLED</div>' +
            '<div style="font-size:12px;color:#0A0A0A;opacity:0.75;margin-top:4px;">Cash on Delivery order. Do NOT ship / dispatch this package.</div>' +
          '</td></tr>' +
        '</table>';

    // 4. Razorpay Payment Details Box (Only for PAID orders)
    const paymentDetailsHtml = isOnline && (p.razorpay_payment_id || p.razorpay_order_id)
      ? '<tr><td style="padding:20px 40px 0;">' +
          '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB;border:1px dashed #DC2626;border-radius:4px;">' +
            '<tr><td style="padding:16px;">' +
              '<div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#DC2626;font-weight:700;margin-bottom:10px;">⚠ Razorpay Refund Details</div>' +
              (p.razorpay_payment_id ? '<div style="font-size:13px;margin-bottom:6px;"><span style="color:#7C7C7C;">Payment ID:</span> <b style="color:#0A0A0A;letter-spacing:0.5px;background:#FEE2E2;padding:2px 6px;border-radius:3px;">' + p.razorpay_payment_id + '</b></div>' : '') +
              (p.razorpay_order_id ? '<div style="font-size:13px;"><span style="color:#7C7C7C;">Razorpay Order ID:</span> <b style="color:#0A0A0A;letter-spacing:0.5px;">' + p.razorpay_order_id + '</b></div>' : '') +
            '</td></tr>' +
          '</table>' +
        '</td></tr>'
      : '';

    // 5. Final HTML Structure
    const html =
    '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"></head>' +
    '<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#F5F4F2;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F4F2;padding:20px 0;">' +
    '<tr><td align="center">' +
    '<table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background-color:#FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.05);border-radius:8px;overflow:hidden;">' +

      // Top Badge
      '<tr><td style="padding:30px 40px 20px;text-align:center;' + (isOnline ? 'background-color:#FEF2F2;' : 'background-color:#F5F4F2;') + '">' +
        '<div style="display:inline-block;padding:8px 16px;border-radius:4px;' + (isOnline ? 'background-color:#DC2626;color:#FFFFFF;' : 'background-color:#0A0A0A;color:#FFFFFF;') + 'font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">' +
          (isOnline ? '💳 PAID ORDER CANCELLED' : '📦 COD ORDER CANCELLED') +
        '</div>' +
      '</td></tr>' +

      // Order ID & Date
      '<tr><td style="padding:10px 40px 0;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td style="vertical-align:top;">' +
            '<div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7C7C7C;">Order ID</div>' +
            '<div style="font-size:24px;font-weight:700;margin-top:6px;letter-spacing:1px;color:#0A0A0A;">' + order.id + '</div>' +
          '</td>' +
          '<td style="text-align:right;vertical-align:top;">' +
            '<div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7C7C7C;">Date</div>' +
            '<div style="font-size:14px;font-weight:600;margin-top:6px;color:#0A0A0A;">' + new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + '</div>' +
          '</td>' +
        '</tr></table>' +
      '</td></tr>' +

      // Alert Banner
      '<tr><td style="padding:24px 40px 0;">' + alertBanner + '</td></tr>' +

      // Razorpay Details (if Paid)
      paymentDetailsHtml +

      // Items Table
      '<tr><td style="padding:28px 40px 0;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' +
          '<thead><tr style="background-color:#0A0A0A;">' +
            '<th style="padding:12px 8px;text-align:left;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:#FFFFFF;">Item</th>' +
            '<th style="padding:12px 8px;text-align:center;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;width:70px;color:#FFFFFF;">Qty</th>' +
            '<th style="padding:12px 8px;text-align:right;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;width:100px;color:#FFFFFF;">Price</th>' +
          '</tr></thead>' +
          '<tbody>' + itemsHtml + '</tbody>' +
        '</table>' +
      '</td></tr>' +

      // Totals
      '<tr><td style="padding:10px 40px 8px;">' +
        '<table cellpadding="0" cellspacing="0" border="0" style="margin-left:auto;margin-top:8px;width:100%;max-width:340px;">' +
          '<tr><td style="padding:8px 12px;text-align:right;font-size:13px;color:#7C7C7C;">Subtotal</td><td style="padding:8px 12px;text-align:right;font-size:14px;color:#0A0A0A;">₹' + (t.sub || 0).toLocaleString('en-IN') + '</td></tr>' +
          ((t.discount) ? '<tr><td style="padding:8px 12px;text-align:right;font-size:13px;color:#0A0A0A;">⭐ Member Discount</td><td style="padding:8px 12px;text-align:right;font-size:14px;color:#0A0A0A;">−₹' + t.discount.toLocaleString('en-IN') + '</td></tr>' : '') +
          '<tr><td style="padding:8px 12px;text-align:right;font-size:13px;color:#7C7C7C;">Delivery</td><td style="padding:8px 12px;text-align:right;font-size:14px;color:#0A0A0A;">' + (t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td></tr>' +
          '<tr><td style="padding:16px 12px 8px;text-align:right;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;border-top:2px solid #0A0A0A;color:#0A0A0A;">Total ' + (isOnline ? '(PAID)' : '(COD)') + '</td><td style="padding:16px 12px 8px;text-align:right;font-size:22px;font-weight:700;border-top:2px solid #0A0A0A;color:#0A0A0A;">₹' + (t.total || 0).toLocaleString('en-IN') + '</td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Customer Details
      '<tr><td style="padding:28px 40px 0;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' +
          '<tr><td style="border-top:1px solid #E6E4E0;padding:0;"></td></tr>' +
          '<tr><td style="padding:16px 0 12px;"><div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:600;color:#7C7C7C;">Customer Details</div></td></tr>' +
          '<tr><td style="padding:10px 0 0;"><div style="font-size:18px;font-weight:700;letter-spacing:0.5px;line-height:1.3;color:#0A0A0A;">' + (c.name || 'N/A') + '</div></td></tr>' +
          '<tr><td style="padding:4px 0 4px;"><div style="font-size:13px;letter-spacing:1px;color:#7C7C7C;">📞 ' + (c.phone || 'N/A') + '</div></td></tr>' +
          '<tr><td style="padding:4px 0 20px;"><div style="font-size:13px;line-height:1.5;color:#7C7C7C;">' + (c.addr || '') + ', ' + (c.city || '') + ', ' + (c.state || '') + ' - ' + (c.pin || '') + '</div></td></tr>' +
          '<tr><td style="border-top:1px solid #E6E4E0;padding:0;"></td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Action Required Box
      '<tr><td style="padding:28px 40px 30px;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0A0A;border-radius:4px;">' +
          '<tr><td style="padding:24px;text-align:center;">' +
            '<div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#FFFFFF;opacity:0.6;">Action Required</div>' +
            '<div style="font-family:Georgia,serif;font-size:18px;letter-spacing:1px;margin-top:10px;line-height:1.5;color:#FFFFFF;">' +
              (isOnline ? 'Initiate Refund of <b>₹' + (t.total || 0).toLocaleString('en-IN') + '</b> via Razorpay' : 'Cancel Shipping / Do Not Dispatch this COD Order') +
            '</div>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

    '</table></td></tr></table></body></html>';

    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HinchField <orders@hinchfield.store>', // તારું verified domain
        to: ['support.hinchfield@gmail.com'],
        subject: subject,
        html: html
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error('Resend API Error:', errData);
      return res.status(500).json({ success: false, error: 'Resend API failed' });
    }

    return res.status(200).json({ success: true });
    
  } catch (e) {
    console.error('Cancel Notify Error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
