import { Router } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { logger } from "../lib/logger.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import {
  type OrderResponse,
  buildOrderConfirmationEmail,
  buildVerificationEmail,
  calcEstimatedDelivery,
  defaultTimeline,
  getBaseUrl,
  simulateProgress,
} from "../lib/order-logic.js";

const router = Router();

const resendTimestamps: Record<string, number> = {};

const smtpUser = process.env["SMTP_USER"]?.trim();
const smtpPass = process.env["SMTP_PASS"]?.trim();

function getMailTransporter() {
  if (!smtpUser || !smtpPass) {
    throw new Error("Missing SMTP_USER or SMTP_PASS environment variables.");
  }
  return nodemailer.createTransport({ service: "gmail", auth: { user: smtpUser, pass: smtpPass } });
}

async function sendMail(message: nodemailer.SendMailOptions) {
  return getMailTransporter().sendMail(message);
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
      verification_status: "pending", entry_count: 1,
    }).select("id").single();
    if (error) {
      if (error.code === "23505") { res.status(409).json({ error: "This email has already been entered. Only one entry per person is allowed." }); return; }
      throw error;
    }

    const verifyLink = `${getBaseUrl()}/api/verify?token=${verificationToken}&email=${encodeURIComponent(emailKey)}`;
    // Email verification disabled
    res.json({ success: true, message: "Entry submitted successfully!", entryId: entry.id, emailSent: false });
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
    // Check if user already has an order
    const { data: verifyExistingOrder } = await supabase.from("orders").select("order_id").eq("user_id", entry.id).maybeSingle();
    
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const { error: sessionError } = await supabase.from("user_sessions").insert({ token: sessionToken, user_id: entry.id });
    if (sessionError) throw sessionError;
    
    if (verifyExistingOrder) {
      res.redirect(`/order-placed.html?session=${sessionToken}`);
    } else {
      res.redirect(`/dashboard.html?session=${sessionToken}`);
    }
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
    await sendMail({ from: `"Tesla Award Program" <${smtpUser!}>`, to: emailKey, subject: "⚡ Verification Email Resent — Tesla Award Program", html: buildVerificationEmail(entry.first_name || "there", verifyLink, entry.id) });
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
    // Email verification disabled — all users treated as verified
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const { error: sessionError } = await supabase.from("user_sessions").insert({ token: sessionToken, user_id: entry.id });
    if (sessionError) throw sessionError;
    // Check if user already has an order — load FULL order data
    let hasOrder = false;
    let orderData = null;
    try {
      const { data: fullOrder } = await supabase.from("orders").select("order_id,tracking_number,status,order_date,estimated_delivery,delivery_method,payment_method,selected_cars(data),delivery_details(data),tracking_data(stage,stage_order,timestamp,completed)").eq("user_id", entry.id).order("order_date", { ascending: false }).limit(1).maybeSingle();
      if (fullOrder) {
        hasOrder = true;
        const car = Array.isArray(fullOrder.selected_cars) ? fullOrder.selected_cars[0] : fullOrder.selected_cars;
        const delivery = Array.isArray(fullOrder.delivery_details) ? fullOrder.delivery_details[0] : fullOrder.delivery_details;
        const tracking = ((fullOrder.tracking_data ?? []) as any[]).sort((a, b) => a.stage_order - b.stage_order).map((t) => ({ stage: t.stage, timestamp: t.timestamp, completed: t.completed }));
        orderData = {
          orderId: fullOrder.order_id, trackingNumber: fullOrder.tracking_number, status: fullOrder.status,
          orderDate: fullOrder.order_date, estimatedDelivery: fullOrder.estimated_delivery,
          deliveryMethod: fullOrder.delivery_method || {}, paymentMethod: fullOrder.payment_method || {},
          selectedCar: car?.data || {}, deliveryDetails: delivery?.data || {}, timeline: tracking
        };
      }
    } catch (_) {}
    res.json({ success: true, sessionToken, user: { email: entry.email, firstName: entry.first_name || "", lastName: entry.last_name || "", entryId: entry.id, phone: entry.phone || "" }, hasOrder, order: orderData });
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
    const supabase = await getSupabaseAdmin();
    // Check if user already has an order — load FULL order data
    let hasOrder = false;
    let orderData = null;
    try {
      const { data: fullOrder } = await supabase.from("orders").select("order_id,tracking_number,status,order_date,estimated_delivery,delivery_method,payment_method,selected_cars(data),delivery_details(data),tracking_data(stage,stage_order,timestamp,completed)").eq("user_id", user.id).order("order_date", { ascending: false }).limit(1).maybeSingle();
      if (fullOrder) {
        hasOrder = true;
        const car = Array.isArray(fullOrder.selected_cars) ? fullOrder.selected_cars[0] : fullOrder.selected_cars;
        const delivery = Array.isArray(fullOrder.delivery_details) ? fullOrder.delivery_details[0] : fullOrder.delivery_details;
        const tracking = ((fullOrder.tracking_data ?? []) as any[]).sort((a, b) => a.stage_order - b.stage_order).map((t) => ({ stage: t.stage, timestamp: t.timestamp, completed: t.completed }));
        orderData = {
          orderId: fullOrder.order_id, trackingNumber: fullOrder.tracking_number, status: fullOrder.status,
          orderDate: fullOrder.order_date, estimatedDelivery: fullOrder.estimated_delivery,
          deliveryMethod: fullOrder.delivery_method || {}, paymentMethod: fullOrder.payment_method || {},
          selectedCar: car?.data || {}, deliveryDetails: delivery?.data || {}, timeline: tracking
        };
      }
    } catch (_) {}
    res.json({ valid: true, user: { email: user.email, firstName: user.first_name || "", lastName: user.last_name || "", entryId: user.entryId, phone: user.phone || "" }, hasOrder, order: orderData });
  } catch (err) { logger.error({ err }, "Session error"); res.status(500).json({ valid: false }); }
});

router.post("/order", async (req, res) => {
  try {
    const { sessionToken, selectedCar, deliveryDetails, deliveryMethod, paymentMethod } = req.body as { sessionToken: string; selectedCar: Record<string, string>; deliveryDetails: Record<string, string>; deliveryMethod?: Record<string, string | number>; paymentMethod?: Record<string, string> };
        const user = await getSessionUser(sessionToken);
    if (!user) { res.status(401).json({ error: "Invalid session. Please verify your email first." }); return; }
    const supabase = await getSupabaseAdmin();
    
    // Check if user already has an order
    const { data: existingOrder, error: orderCheckError } = await supabase.from("orders").select("id").eq("user_id", user.id).maybeSingle();
    if (orderCheckError) throw orderCheckError;
    if (existingOrder) { res.status(400).json({ error: "You have already placed an order. Each user is restricted to one order only." }); return; }
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
      await sendMail({ from: `"Tesla Giveaway" <${smtpUser!}>`, to: user.email, subject: "🎉 Order Confirmed — Your Tesla is on the way!", html: buildOrderConfirmationEmail(order) });
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

export default router;
