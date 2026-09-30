export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const { order } = req.body || {};
    if (!order || !order.id) return res.status(400).json({ success: false });

    const KEY = process.env.RESEND_API_KEY;
    if (!KEY) return res.status(500).json({ success: false });

    /* ─────────── helpers ─────────── */
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
    const inr = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');

    /* ─────────── normalize order data ─────────── */
    const c     = order.customer || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const lines = items.map((l) => ({
      name:   esc(l.name || 'Product'),
      qty:    Number(l.qty || 1),
      price:  Number(l.price || 0),
      color:  l.colorChoice ? esc(l.colorChoice) : '',
      custom: l.custom ? { pos: esc(l.custom.pos || ''), note: esc(l.custom.note || '') } : null,
    }));

    const subCalc  = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const t        = order.totals || {};
    const sub      = Number(t.sub ?? subCalc);
    const discount = Number(t.discount || 0);
    const del      = Number(t.del || 0);
    const total    = Number(t.total ?? (sub - discount + del));

    const isOnline   = order.payment && order.payment.method === 'online';
    const payLabel   = isOnline ? 'Paid Online' : 'Cash on Delivery';
    const totalLabel = isOnline ? 'Total Paid' : 'Total COD';

    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); // "30 Sept 2026"
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // ⚠️ Host your emblem as a PNG (email clients block SVG) → public/logo-mark.png
    const LOGO_URL = 'https://hinchfield.store/logo-mark.png';

    /* ─────────── reusable styles ─────────── */
    const LABEL = 'font-size:10px;letter-spacing:3px;color:#9A9A9A;text-transform:uppercase;';
    const CELL  = 'padding:14px 12px;border-bottom:1px solid #E6E4E0;font-size:13px;color:#0A0A0A;';
    const TH    = 'padding:12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:#FFFFFF;';
    const TOT_L = 'padding:6px 0;text-align:right;font-size:13px;color:#7C7C7C;';
    const TOT_R = 'padding:6px 0;text-align:right;font-size:13px;color:#0A0A0A;font-weight:500;';

    /* ─────────── item rows ─────────── */
    const itemsHtml = lines.map((l, i) => {
      const extras =
        (l.color  ? `<br><span style="font-size:11px;color:#7C7C7C;font-weight:400;">Colour: ${l.color}</span>` : '') +
        (l.custom ? `<br><span style="font-size:11px;color:#7C7C7C;font-weight:400;">Custom (${l.custom.pos}): ${l.custom.note}</span>` : '');
      return `<tr>
        <td style="${CELL}font-weight:600;">${i + 1}. ${l.name}${extras}</td>
        <td style="${CELL}text-align:center;width:60px;">${l.qty}</td>
        <td style="${CELL}text-align:right;width:80px;">${inr(l.price)}</td>
        <td style="${CELL}text-align:right;width:90px;font-weight:600;">${inr(l.price * l.qty)}</td>
      </tr>`;
    }).join('');

    const discountRow = discount > 0 ? `
      <tr>
        <td style="${TOT_L}">Member Discount</td>
        <td style="${TOT_R}">−${inr(discount)}</td>
      </tr>` : '';

    const barMsg = isOnline
      ? `💳&nbsp; Refund ${inr(total)} via Razorpay Dashboard`
      : '🛑&nbsp; Order Cancelled — Do NOT Ship / Hand Over to Courier';

    /* ─────────── email html (matches invoice design) ─────────── */
    const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Order Cancelled — ${esc(order.id)}</title>
</head>
<body style="margin:0;padding:0;background:#F5F4F2;-webkit-text-size-adjust:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Order ${esc(order.id)} has been cancelled${isOnline ? ' — refund pending' : ' — do not ship'}.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F2;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:640px;background:#FFFFFF;">
        <tr><td style="padding:40px 36px 36px;">

          <!-- ─── LOGO (emblem + wordmark, left aligned like invoice) ─── -->
          <!-- ─── LOGO (text only, centred) ─── -->
<div style="text-align:center;padding-bottom:24px;border-bottom:2px solid #0A0A0A;">
  <div style="font-size:30px;font-weight:800;letter-spacing:6px;color:#0A0A0A;line-height:1;margin-right:-6px;">HINCHFIELD</div>
  <div style="font-size:9px;letter-spacing:4px;color:#0A0A0A;text-transform:uppercase;margin-top:10px;margin-right:-4px;">—&nbsp;&nbsp;Wear Your Story&nbsp;&nbsp;—</div>
</div>

          <!-- ─── META ROW: ref left / date + badges right ─── -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;">
            <tr>
              <td style="vertical-align:top;">
                <div style="${LABEL}">Order Reference</div>
                <div style="font-size:26px;font-weight:700;color:#0A0A0A;letter-spacing:1px;margin-top:8px;line-height:1;">${esc(order.id)}</div>
              </td>
              <td style="vertical-align:top;text-align:right;">
                <div style="${LABEL}">Cancelled On</div>
                <div style="font-size:14px;font-weight:600;color:#0A0A0A;margin-top:8px;">${dateStr}</div>
                <div style="font-size:11px;color:#7C7C7C;margin-top:2px;">${timeStr}</div>
                <div style="margin-top:10px;">
                  <span style="display:inline-block;background:#0A0A0A;color:#FFFFFF;font-size:10px;letter-spacing:2px;padding:6px 12px;text-transform:uppercase;font-weight:600;">Cancelled</span>
                  <span style="display:inline-block;background:#EDECEA;border:1px solid #E0DEDA;color:#0A0A0A;font-size:10px;letter-spacing:2px;padding:6px 12px;text-transform:uppercase;font-weight:600;">${payLabel}</span>
                </div>
              </td>
            </tr>
          </table>

          <!-- ─── ITEMS TABLE (black head, light row borders) ─── -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px;border-collapse:collapse;">
            <tr style="background:#0A0A0A;">
              <th style="${TH}text-align:left;">Item</th>
              <th style="${TH}text-align:center;width:60px;">Qty</th>
              <th style="${TH}text-align:right;width:80px;">Price</th>
              <th style="${TH}text-align:right;width:90px;">Total</th>
            </tr>
            ${itemsHtml}
          </table>

          <!-- ─── TOTALS (thick rule above grand total, like invoice) ─── -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
            <tr>
              <td style="width:55%;"></td>
              <td style="width:45%;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="${TOT_L}">Subtotal</td><td style="${TOT_R};width:110px;">${inr(sub)}</td></tr>
                  ${discountRow}
                  <tr><td style="${TOT_L}">Delivery</td><td style="${TOT_R}">${del ? inr(del) : 'FREE'}</td></tr>
                  <tr>
                    <td style="padding:14px 0 4px;text-align:right;font-size:11px;letter-spacing:2px;color:#0A0A0A;text-transform:uppercase;font-weight:600;border-top:2px solid #0A0A0A;">${totalLabel}</td>
                    <td style="padding:11px 0 4px;text-align:right;font-size:24px;font-weight:800;color:#0A0A0A;border-top:2px solid #0A0A0A;width:110px;">${inr(total)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- ─── DELIVERY ADDRESS ─── -->
          <div style="margin-top:34px;padding-top:24px;border-top:1px solid #E6E4E0;">
            <div style="${LABEL}margin-bottom:12px;">Delivery Address</div>
            <div style="font-size:14px;line-height:1.9;color:#333333;">
              <span style="color:#0A0A0A;font-weight:700;">${esc(c.name)}</span><br>
              ${esc(c.phone)}<br>
              ${esc(c.addr)}<br>
              ${esc(c.city)}, ${esc(c.state)} — ${esc(c.pin)}
            </div>
          </div>

          <!-- ─── BLACK ACTION BAR (same style as delivery bar) ─── -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
            <tr><td style="background:#0A0A0A;padding:16px 18px;text-align:center;">
              <div style="font-size:13px;font-weight:700;letter-spacing:1px;color:#FFFFFF;">${barMsg}</div>
            </td></tr>
          </table>

          <!-- ─── FOOTER (3 centred lines, like invoice) ─── -->
          <div style="margin-top:34px;text-align:center;">
            <div style="font-size:13px;font-weight:700;letter-spacing:1px;color:#0A0A0A;text-transform:uppercase;">Hinchfield</div>
            <div style="font-size:12px;color:#7C7C7C;line-height:1.9;margin-top:8px;">
              WhatsApp: <a href="https://wa.me/917434053550" style="color:#7C7C7C;text-decoration:none;">7434053550</a> ·
              <a href="mailto:support.hinchfield@gmail.com" style="color:#7C7C7C;text-decoration:none;">support.hinchfield@gmail.com</a><br>
              <a href="https://hinchfield.store" style="color:#7C7C7C;text-decoration:none;">hinchfield.store</a>
            </div>
          </div>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text = [
      'HINCHFIELD — Order Cancelled',
      'Order: ' + order.id,
      'Cancelled on: ' + dateStr + ' ' + timeStr,
      'Payment: ' + payLabel,
      '',
      ...items.map((l, i) => (i + 1) + '. ' + l.name + ' x' + l.qty + ' = ' + inr(l.price * l.qty)),
      '',
      'Subtotal: ' + inr(sub),
      ...(discount ? ['Discount: -' + inr(discount)] : []),
      'Delivery: ' + (del ? inr(del) : 'FREE'),
      totalLabel + ': ' + inr(total),
      '',
      'Deliver to: ' + [c.name, c.phone, c.addr, c.city + ', ' + c.state + ' - ' + c.pin].filter(Boolean).join(', '),
      '',
      isOnline ? 'ACTION: Refund ' + inr(total) + ' via Razorpay Dashboard' : 'ACTION: Do NOT ship this order',
    ].join('\n');

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'HinchField <orders@hinchfield.store>',
        to: ['support.hinchfield@gmail.com'],
        subject: '⚠️ Order Cancelled — ' + order.id,
        html,
        text,
      }),
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false });
  }
}
