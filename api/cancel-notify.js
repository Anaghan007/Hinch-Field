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
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:center;font-size:13px;color:#0A0A0A;">' + l.qty + '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;">₹' + (l.price || 0).toLocaleString('en-IN') + '</td>' +
        '<td style="padding:14px 8px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;font-weight:600;">₹' + ((l.price || 0) * l.qty).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const html =
    '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:0;background:#F5F4F2;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;">' +

    '<div style="max-width:640px;margin:0 auto;background:#FFFFFF;padding:32px 28px;">' +

      // ─── Logo ───
      '<div style="text-align:center;padding:24px;border-bottom:2px solid #0A0A0A;background-color:#FFFFFF !important;">' +
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background-color:#FFFFFF !important;">' +
    '<tr>' +
      '<td style="background-color:#FFFFFF !important;padding:8px 20px;text-align:center;">' +
        '<img src="https://hinchfield.store/images/logo.png" alt="HINCHFIELD" width="200" style="display:block;height:auto;max-width:200px;width:200px;background-color:#FFFFFF;" />' +
      '</td>' +
    '</tr>' +
  '</table>' +
'</div>' +

      // ─── Cancelled Notice Bar ───
      '<div style="background:#0A0A0A;color:#FFFFFF;padding:14px 18px;margin-top:24px;text-align:center;">' +
        '<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;">⚠ &nbsp; Order Cancelled</div>' +
      '</div>' +

      // ─── Order Header ───
      '<table style="width:100%;margin-top:24px;margin-bottom:24px;">' +
        '<tr>' +
          '<td style="vertical-align:top;">' +
            '<div style="font-size:11px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;">Order ID</div>' +
            '<div style="font-size:22px;font-weight:600;color:#0A0A0A;letter-spacing:1px;margin-top:6px;">' + order.id + '</div>' +
          '</td>' +
          '<td style="vertical-align:top;text-align:right;">' +
            '<div style="font-size:11px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;">Date</div>' +
            '<div style="font-size:13px;font-weight:500;color:#0A0A0A;margin-top:6px;">' + new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + '</div>' +
            '<div style="display:inline-block;margin-top:8px;font-size:10px;letter-spacing:1.5px;padding:5px 10px;text-transform:uppercase;' +
              (isOnline
                ? 'background:#0A0A0A;color:#FFFFFF;'
                : 'background:#F5F4F2;color:#0A0A0A;border:1px solid #E6E4E0;') +
            '">' + (isOnline ? 'Paid Online' : 'Cash on Delivery') + '</div>' +
          '</td>' +
        '</tr>' +
      '</table>' +

      // ─── Items Table ───
      '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">' +
        '<thead>' +
          '<tr style="background:#0A0A0A;color:#FFFFFF;">' +
            '<th style="padding:12px 8px;text-align:left;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">Item</th>' +
            '<th style="padding:12px 8px;text-align:center;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;width:50px;">Qty</th>' +
            '<th style="padding:12px 8px;text-align:right;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;width:80px;">Price</th>' +
            '<th style="padding:12px 8px;text-align:right;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;width:80px;">Total</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + itemsHtml + '</tbody>' +
      '</table>' +

      // ─── Totals ───
      '<table style="width:100%;margin-left:auto;max-width:340px;margin-bottom:24px;">' +
        '<tr>' +
          '<td style="padding:6px 8px;text-align:right;font-size:13px;color:#7C7C7C;">Subtotal</td>' +
          '<td style="padding:6px 8px;text-align:right;font-size:13px;color:#0A0A0A;width:100px;">₹' + (t && t.sub ? t.sub.toLocaleString('en-IN') : '0') + '</td>' +
        '</tr>' +
        (t && t.discount ? '<tr>' +
          '<td style="padding:6px 8px;text-align:right;font-size:13px;color:#0A0A0A;">⭐ Member Discount</td>' +
          '<td style="padding:6px 8px;text-align:right;font-size:13px;color:#0A0A0A;">−₹' + t.discount.toLocaleString('en-IN') + '</td>' +
        '</tr>' : '') +
        '<tr>' +
          '<td style="padding:6px 8px;text-align:right;font-size:13px;color:#7C7C7C;">Delivery</td>' +
          '<td style="padding:6px 8px;text-align:right;font-size:13px;color:#0A0A0A;">' + (t && t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td>' +
        '</tr>' +
        '<tr style="border-top:2px solid #0A0A0A;">' +
          '<td style="padding:14px 8px;text-align:right;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#0A0A0A;font-weight:500;">' + (isOnline ? 'Total Paid' : 'Total COD') + '</td>' +
          '<td style="padding:14px 8px;text-align:right;font-size:22px;font-weight:700;color:#0A0A0A;">₹' + (t ? t.total.toLocaleString('en-IN') : '0') + '</td>' +
        '</tr>' +
      '</table>' +

      // ─── Customer Details ───
      '<div style="border-top:1px solid #E6E4E0;padding-top:20px;margin-bottom:20px;">' +
        '<div style="font-size:11px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;margin-bottom:12px;">Customer</div>' +
        '<div style="font-size:13px;line-height:1.8;color:#0A0A0A;">' +
          '<b>' + c.name + '</b><br>' +
          c.phone + '<br>' +
          c.addr + '<br>' +
          c.city + ', ' + c.state + ' — ' + c.pin +
        '</div>' +
      '</div>' +

      // ─── Action Banner ───
      '<div style="background:#0A0A0A;color:#FFFFFF;padding:18px;text-align:center;margin-bottom:24px;">' +
        '<div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;margin-bottom:6px;">Action Required</div>' +
        '<div style="font-size:14px;letter-spacing:1px;font-weight:500;">' +
          (isOnline
            ? 'Refund ₹' + (t ? t.total.toLocaleString('en-IN') : '0') + ' via Razorpay'
            : 'Do NOT ship this order') +
        '</div>' +
      '</div>' +

      // ─── Footer ───
      '<div style="text-align:center;padding-top:16px;border-top:1px solid #E6E4E0;">' +
        '<div style="font-size:11px;letter-spacing:1.5px;color:#7C7C7C;line-height:2;">' +
          'HINCHFIELD · <a href="https://hinchfield.store" style="color:#0A0A0A;text-decoration:none;">hinchfield.store</a><br>' +
          'WhatsApp 7434053550 · support.hinchfield@gmail.com' +
        '</div>' +
      '</div>' +

    '</div>' +
    '</body></html>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HinchField Alerts <orders@hinchfield.store>',
        to: ['support.hinchfield@gmail.com'],
        subject: '⚠ Order Cancelled — ' + order.id + ' — ₹' + (t ? t.total : 0),
        html
      })
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false });
  }
}
