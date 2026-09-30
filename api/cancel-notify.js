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
      const price = l.price || 0;
      return '<tr>' +
        '<td style="padding:16px 12px;border-bottom:1px solid #E6E4E0;font-size:13px;color:#0A0A0A;">' +
          '<b style="font-weight:600;">' + (i+1) + '. ' + (l.name || 'Product') + '</b>' +
        '</td>' +
        '<td style="padding:16px 12px;border-bottom:1px solid #E6E4E0;text-align:center;font-size:13px;color:#0A0A0A;">' + l.qty + '</td>' +
        '<td style="padding:16px 12px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;">₹' + price.toLocaleString('en-IN') + '</td>' +
        '<td style="padding:16px 12px;border-bottom:1px solid #E6E4E0;text-align:right;font-size:13px;color:#0A0A0A;font-weight:600;">₹' + (price * l.qty).toLocaleString('en-IN') + '</td>' +
      '</tr>';
    }).join('');

    const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:20px;background:#F5F4F2;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;">' +

    '<div style="max-width:680px;margin:0 auto;background:#FFFFFF;padding:40px 36px 0;">' +

      // ─── Logo Header ───
      '<div style="text-align:center;padding-bottom:24px;border-bottom:2px solid #0A0A0A;">' +
        '<div style="font-family:Georgia,serif;font-size:34px;letter-spacing:12px;font-weight:600;color:#0A0A0A;line-height:1;margin-bottom:8px;">HINCHFIELD</div>' +
        '<div style="font-size:10px;letter-spacing:8px;color:#7C7C7C;text-transform:uppercase;">— Wear Your Story —</div>' +
      '</div>' +

      // ─── Alert Title Bar ───
      '<div style="padding:24px 0 8px;">' +
        '<div style="font-size:10px;letter-spacing:3px;color:#DC2626;text-transform:uppercase;font-weight:600;">CANCELLATION NOTICE</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:12px;flex-wrap:wrap;">' +
          '<div>' +
            '<div style="font-family:Georgia,serif;font-size:28px;color:#0A0A0A;font-weight:500;letter-spacing:1px;">Order Cancelled</div>' +
            '<div style="font-size:12px;color:#7C7C7C;margin-top:6px;letter-spacing:1px;">' + order.id + '</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<div style="font-size:10px;letter-spacing:2px;color:#7C7C7C;text-transform:uppercase;">Date</div>' +
            '<div style="font-size:13px;font-weight:600;color:#0A0A0A;margin-top:4px;">' + new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + '</div>' +
            '<div style="display:inline-block;background:#FEF2F2;color:#DC2626;border:1px solid #DC2626;padding:5px 10px;font-size:10px;letter-spacing:1.5px;margin-top:8px;font-weight:600;">CANCELLED</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // ─── Divider ───
      '<div style="height:1px;background:#E6E4E0;margin:24px 0 0;"></div>' +

      // ─── Items Table ───
      '<table style="width:100%;border-collapse:collapse;margin-top:24px;">' +
        '<thead>' +
          '<tr style="background:#0A0A0A;">' +
            '<th style="padding:12px;text-align:left;font-size:10px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:500;">Item</th>' +
            '<th style="padding:12px;text-align:center;font-size:10px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:500;width:60px;">Qty</th>' +
            '<th style="padding:12px;text-align:right;font-size:10px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:500;width:90px;">Price</th>' +
            '<th style="padding:12px;text-align:right;font-size:10px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:500;width:90px;">Total</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + itemsHtml + '</tbody>' +
      '</table>' +

      // ─── Totals ───
      '<table style="width:100%;margin-top:20px;margin-left:auto;max-width:340px;float:right;">' +
        '<tr>' +
          '<td style="padding:6px 12px;text-align:right;font-size:13px;color:#7C7C7C;">Subtotal</td>' +
          '<td style="padding:6px 12px;text-align:right;font-size:13px;color:#0A0A0A;width:100px;">₹' + (t ? t.sub : 0).toLocaleString('en-IN') + '</td>' +
        '</tr>' +
        (t && t.discount ? '<tr><td style="padding:6px 12px;text-align:right;font-size:13px;color:#0A0A0A;">Member Discount</td><td style="padding:6px 12px;text-align:right;font-size:13px;color:#0A0A0A;">−₹' + t.discount.toLocaleString('en-IN') + '</td></tr>' : '') +
        '<tr>' +
          '<td style="padding:6px 12px;text-align:right;font-size:13px;color:#7C7C7C;">Delivery</td>' +
          '<td style="padding:6px 12px;text-align:right;font-size:13px;color:#0A0A0A;">' + (t && t.del ? '₹' + t.del.toLocaleString('en-IN') : 'FREE') + '</td>' +
        '</tr>' +
        '<tr>' +
          '<td style="padding:16px 12px 6px;text-align:right;font-size:12px;color:#0A0A0A;letter-spacing:2px;border-top:2px solid #0A0A0A;">TOTAL ' + (isOnline ? 'PAID' : 'COD') + '</td>' +
          '<td style="padding:16px 12px 6px;text-align:right;font-family:Georgia,serif;font-size:26px;color:#0A0A0A;font-weight:600;border-top:2px solid #0A0A0A;">₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</td>' +
        '</tr>' +
      '</table>' +
      '<div style="clear:both;"></div>' +

      // ─── Divider ───
      '<div style="height:1px;background:#E6E4E0;margin:32px 0 0;"></div>' +

      // ─── Customer Section ───
      '<div style="padding:24px 0 8px;">' +
        '<div style="font-size:10px;letter-spacing:3px;color:#7C7C7C;text-transform:uppercase;margin-bottom:14px;">Customer Details</div>' +
        '<div style="font-size:13px;line-height:1.9;color:#0A0A0A;">' +
          '<b style="color:#0A0A0A;">' + c.name + '</b><br>' +
          '<span style="color:#7C7C7C;">' + c.phone + '</span><br>' +
          '<span style="color:#7C7C7C;">' + c.addr + '<br>' + c.city + ', ' + c.state + ' — ' + c.pin + '</span>' +
        '</div>' +
      '</div>' +

      // ─── Action Banner ───
      '<div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:18px 20px;margin:24px 0 8px;">' +
        '<div style="font-size:10px;letter-spacing:3px;color:#DC2626;text-transform:uppercase;font-weight:600;margin-bottom:6px;">Action Required</div>' +
        '<div style="font-size:14px;color:#0A0A0A;line-height:1.6;">' +
          (isOnline
            ? 'Refund <b>₹' + (t ? t.total : 0).toLocaleString('en-IN') + '</b> via Razorpay Dashboard'
            : 'Do <b>NOT</b> ship this order') +
        '</div>' +
      '</div>' +

      // ─── Payment Info ───
      '<div style="padding:16px 0 8px;font-size:12px;color:#7C7C7C;line-height:1.9;">' +
        '<b style="color:#0A0A0A;font-size:11px;letter-spacing:1px;">PAYMENT INFO</b><br>' +
        'Method: ' + (isOnline ? 'Paid Online (Razorpay)' : 'Cash on Delivery') + '<br>' +
        (order.payment && order.payment.razorpay_payment_id ? 'Payment ID: ' + order.payment.razorpay_payment_id + '<br>' : '') +
        'Cancelled At: ' + new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) +
      '</div>' +

    '</div>' +

    // ─── Footer (outside white card) ───
    '<div style="max-width:680px;margin:0 auto;">' +
      '<div style="background:#0A0A0A;padding:24px;text-align:center;">' +
        '<div style="font-family:Georgia,serif;font-size:16px;letter-spacing:6px;color:#FFFFFF;font-weight:500;">HINCHFIELD</div>' +
        '<div style="font-size:11px;color:#FFFFFF;opacity:0.6;margin-top:12px;letter-spacing:1px;">WhatsApp 7434053550 · support.hinchfield@gmail.com</div>' +
        '<div style="font-size:11px;color:#FFFFFF;opacity:0.4;margin-top:6px;letter-spacing:2px;">HINCHFIELD.STORE</div>' +
      '</div>' +
      '<div style="text-align:center;padding:16px;font-size:10px;color:#7C7C7C;letter-spacing:2px;">© 2026 HINCHFIELD · ALL RIGHTS RESERVED</div>' +
    '</div>' +

    '</body></html>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HinchField <orders@hinchfield.store>',
        to: ['support.hinchfield@gmail.com'],
        subject: 'Order Cancelled — ' + order.id + ' — ₹' + (t ? t.total : 0),
        html
      })
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false });
  }
}
