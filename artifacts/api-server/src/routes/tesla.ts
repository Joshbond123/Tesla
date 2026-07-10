import { Router } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

const router = Router();

// ── IN-MEMORY STORAGE ──────────────────────────────────────────────────
const entries: Record<string, {
  id: string; email: string; phone: string;
  firstName: string; lastName: string;
  verificationToken: string; verified: boolean; createdAt: string;
}> = {};

const verifiedUsers: Record<string, {
  email: string; entryId: string; verifiedAt: string;
}> = {};

const orders: Record<string, {
  orderId: string; trackingNumber: string; email: string; entryId: string;
  selectedCar: Record<string, string>;
  deliveryDetails: Record<string, string>;
  deliveryMethod: Record<string, string | number>;
  paymentMethod: Record<string, string>;
  status: string; orderDate: string; estimatedDelivery: string;
  timeline: { stage: string; timestamp: string | null; completed: boolean }[];
}> = {};

// Resend cooldown (email → last resend timestamp)
const resendTimestamps: Record<string, number> = {};

// ── MAILER ────────────────────────────────────────────────────────────
const smtpUser = process.env["SMTP_USER"] ?? "";
const smtpPass = process.env["SMTP_PASS"] ?? "";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: smtpUser, pass: smtpPass },
});

// Helper: build base URL from REPLIT_DOMAINS env
function getBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"] ?? "";
  const primary = domains.split(",")[0]?.trim();
  return primary
    ? `https://${primary}`
    : `http://localhost:${process.env["PORT"] ?? 8080}`;
}

// ── POST /api/entry ───────────────────────────────────────────────────
router.post("/entry", async (req, res) => {
  try {
    const { email, phone, firstName, lastName } = req.body as {
      email: string; phone: string; firstName?: string; lastName?: string;
    };

    if (!email || !phone) {
      res.status(400).json({ error: "Email and phone number are required." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }

    if (entries[email.toLowerCase()]) {
      res.status(409).json({ error: "This email has already been entered. Only one entry per person is allowed." });
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const entryId = uuidv4();
    const emailKey = email.toLowerCase();

    entries[emailKey] = {
      id: entryId,
      email: emailKey,
      phone,
      firstName: firstName || "",
      lastName: lastName || "",
      verificationToken,
      verified: false,
      createdAt: new Date().toISOString(),
    };

    const baseUrl = getBaseUrl();
    const verifyLink = `${baseUrl}/api/verify?token=${verificationToken}&email=${encodeURIComponent(emailKey)}`;

    await transporter.sendMail({
      from: `"Tesla Award Program" <${smtpUser}>`,
      to: email,
      subject: "⚡ Verify Your Email — Tesla Award Program",
      html: buildVerificationEmail(firstName || "there", verifyLink, entryId),
    });

    logger.info({ email: emailKey }, "Verification email sent");
    res.json({ success: true, message: "Entry submitted! Check your email to verify.", entryId });
  } catch (err) {
    logger.error({ err }, "Entry error");
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// ── GET /api/verify ───────────────────────────────────────────────────
router.get("/verify", (req, res) => {
  const { token, email } = req.query as { token?: string; email?: string };

  if (!token || !email) { res.redirect("/verify-error.html?reason=invalid"); return; }

  const entry = entries[email.toLowerCase()];
  if (!entry) { res.redirect("/verify-error.html?reason=notfound"); return; }

  if (entry.verificationToken !== token) {
    res.redirect("/verify-error.html?reason=invalid_token");
    return;
  }

  entry.verified = true;
  const sessionToken = crypto.randomBytes(32).toString("hex");
  verifiedUsers[sessionToken] = {
    email: email.toLowerCase(),
    entryId: entry.id,
    verifiedAt: new Date().toISOString(),
  };

  res.redirect(`/dashboard.html?session=${sessionToken}`);
});

// ── POST /api/resend ──────────────────────────────────────────────────
router.post("/resend", async (req, res) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) { res.status(400).json({ error: "Email is required." }); return; }

    const emailKey = email.toLowerCase();
    const entry = entries[emailKey];
    if (!entry) { res.status(404).json({ error: "Email address not found. Please enter the program first." }); return; }

    if (entry.verified) {
      res.status(409).json({ error: "This email has already been verified." });
      return;
    }

    // Rate limit: 60 seconds between resends
    const lastResend = resendTimestamps[emailKey];
    if (lastResend && Date.now() - lastResend < 60_000) {
      res.status(429).json({ error: "Please wait 60 seconds before requesting another email." });
      return;
    }

    resendTimestamps[emailKey] = Date.now();

    const baseUrl = getBaseUrl();
    const verifyLink = `${baseUrl}/api/verify?token=${entry.verificationToken}&email=${encodeURIComponent(emailKey)}`;

    await transporter.sendMail({
      from: `"Tesla Award Program" <${smtpUser}>`,
      to: email,
      subject: "⚡ Verification Email Resent — Tesla Award Program",
      html: buildVerificationEmail(entry.firstName || "there", verifyLink, entry.id),
    });

    logger.info({ email: emailKey }, "Verification email resent");
    res.json({ success: true, message: "Verification email resent." });
  } catch (err) {
    logger.error({ err }, "Resend error");
    res.status(500).json({ error: "Failed to resend email. Please try again." });
  }
});

// ── GET /api/session ──────────────────────────────────────────────────
router.get("/session", (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token || !verifiedUsers[token]) { res.status(401).json({ valid: false }); return; }

  const user = verifiedUsers[token];
  const entry = entries[user.email];
  res.json({
    valid: true,
    user: {
      email: user.email,
      firstName: entry?.firstName || "",
      lastName: entry?.lastName || "",
      entryId: user.entryId,
      phone: entry?.phone || "",
    },
  });
});

// ── POST /api/order ───────────────────────────────────────────────────
router.post("/order", async (req, res) => {
  try {
    const { sessionToken, selectedCar, deliveryDetails, deliveryMethod, paymentMethod } = req.body as {
      sessionToken: string;
      selectedCar: Record<string, string>;
      deliveryDetails: Record<string, string>;
      deliveryMethod?: Record<string, string | number>;
      paymentMethod?: Record<string, string>;
    };

    if (!sessionToken || !verifiedUsers[sessionToken]) {
      res.status(401).json({ error: "Invalid session. Please verify your email first." });
      return;
    }

    const user = verifiedUsers[sessionToken];
    const orderId = "TSLA-" + uuidv4().substring(0, 8).toUpperCase();
    const trackingNumber = "TRK-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    // Estimated delivery: express = +2 days, standard = +10 days
    const isExpress = (deliveryMethod?.id === "express");
    const daysToAdd = isExpress ? 2 : 10;

    const order = {
      orderId,
      trackingNumber,
      email: user.email,
      entryId: user.entryId,
      selectedCar: selectedCar ?? {},
      deliveryDetails: deliveryDetails ?? {},
      deliveryMethod: deliveryMethod ?? { id: "standard", name: "Standard Delivery", price: 299 },
      paymentMethod: paymentMethod ?? { id: "unknown", name: "Not specified" },
      status: "confirmed",
      orderDate: new Date().toISOString(),
      estimatedDelivery: calcEstimatedDelivery(daysToAdd),
      timeline: [
        { stage: "Order Confirmed",     timestamp: new Date().toISOString(), completed: true  },
        { stage: "Processing",          timestamp: null, completed: false },
        { stage: "Shipped",             timestamp: null, completed: false },
        { stage: "In Transit",          timestamp: null, completed: false },
        { stage: "Out for Delivery",    timestamp: null, completed: false },
        { stage: "Delivered",           timestamp: null, completed: false },
      ],
    };

    orders[orderId] = order;

    // Send confirmation email (best effort)
    try {
      await transporter.sendMail({
        from: `"Tesla Giveaway" <${smtpUser}>`,
        to: user.email,
        subject: "🎉 Order Confirmed — Your Tesla is on the way!",
        html: buildOrderConfirmationEmail(order),
      });
      logger.info({ email: user.email, orderId }, "Order confirmation email sent");
    } catch (emailErr) {
      logger.warn({ err: emailErr }, "Failed to send order confirmation email");
    }

    res.json({ success: true, order });
  } catch (err) {
    logger.error({ err }, "Order error");
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// ── GET /api/order/tracking/:trackingNumber — MUST be before /order/:orderId
router.get("/order/tracking/:trackingNumber", (req, res) => {
  const order = Object.values(orders).find(
    o => o.trackingNumber === req.params["trackingNumber"],
  );
  if (!order) { res.status(404).json({ error: "Tracking number not found." }); return; }
  res.json({ order: simulateProgress(order) });
});

// ── GET /api/order/:orderId ────────────────────────────────────────────
router.get("/order/:orderId", (req, res) => {
  const order = orders[req.params["orderId"] ?? ""];
  if (!order) { res.status(404).json({ error: "Order not found." }); return; }
  res.json({ order: simulateProgress(order) });
});

// ── HELPERS ───────────────────────────────────────────────────────────
function calcEstimatedDelivery(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

function simulateProgress(order: typeof orders[string]) {
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

function buildOrderConfirmationEmail(order: typeof orders[string]) {
  const car  = order.selectedCar;
  const addr = order.deliveryDetails;
  const method = order.deliveryMethod;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;max-width:560px;box-shadow:0 8px 32px rgba(0,0,0,.08);">
  <tr><td style="background:#171A20;padding:32px 40px;text-align:center;">
    <span style="color:#E31937;font-size:26px;font-weight:900;letter-spacing:.12em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">TESLA AWARD PROGRAM</span>
  </td></tr>
  <tr><td style="padding:0;"><div style="height:4px;background:linear-gradient(90deg,#E31937,#ff6b6b);"></div></td></tr>
  <tr><td style="padding:44px 40px;text-align:center;">
    <div style="font-size:64px;margin-bottom:16px;">🎉</div>
    <h1 style="font-size:28px;font-weight:800;color:#171A20;margin:0 0 10px;">Order Confirmed!</h1>
    <p style="font-size:16px;color:#00A550;font-weight:600;margin:0 0 32px;">Your Tesla is on its way to you</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-radius:14px;text-align:left;margin-bottom:24px;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0 0 14px;font-size:12px;color:#B0B3B8;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Order Summary</p>
      <table width="100%">
        <tr><td style="padding:7px 0;font-size:14px;color:#5C5E62;">Order ID</td><td style="padding:7px 0;font-size:14px;color:#E31937;font-family:monospace;font-weight:700;text-align:right;">${order.orderId}</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#5C5E62;">Tracking #</td><td style="padding:7px 0;font-size:14px;color:#171A20;font-family:monospace;font-weight:700;text-align:right;">${order.trackingNumber}</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#5C5E62;">Vehicle</td><td style="padding:7px 0;font-size:14px;color:#171A20;font-weight:600;text-align:right;">Tesla ${car["name"] ?? "—"}</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#5C5E62;">Colour</td><td style="padding:7px 0;font-size:14px;color:#171A20;font-weight:600;text-align:right;">${car["color"] ?? "—"}</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#5C5E62;">Delivery Method</td><td style="padding:7px 0;font-size:14px;color:#171A20;font-weight:600;text-align:right;">${String(method["name"] ?? "Standard")}</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#5C5E62;">Est. Delivery</td><td style="padding:7px 0;font-size:14px;color:#00A550;font-weight:700;text-align:right;">${order.estimatedDelivery}</td></tr>
      </table>
    </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-radius:14px;text-align:left;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0 0 14px;font-size:12px;color:#B0B3B8;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Delivery Address</p>
      <p style="margin:0;font-size:14px;color:#171A20;line-height:1.8;">${addr["fullName"] ?? ""}<br>${addr["address"] ?? ""}<br>${addr["city"] ?? ""}, ${addr["state"] ?? ""} ${addr["zipCode"] ?? ""}<br>${addr["country"] ?? ""}</p>
    </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#F7F8FA;padding:24px 40px;border-top:1px solid #E5E7EB;">
    <p style="margin:0;font-size:12px;color:#B0B3B8;text-align:center;line-height:1.6;">© 2026 Tesla Award Program. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export default router;
