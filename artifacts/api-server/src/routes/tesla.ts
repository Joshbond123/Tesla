import { Router } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

const router = Router();

// In-memory storage
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
  selectedCar: Record<string, string>; deliveryDetails: Record<string, string>;
  status: string; orderDate: string; estimatedDelivery: string;
  timeline: { stage: string; timestamp: string | null; completed: boolean }[];
}> = {};

// Email transporter — credentials come from environment secrets
const smtpUser = process.env["SMTP_USER"] ?? "";
const smtpPass = process.env["SMTP_PASS"] ?? "";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: smtpUser, pass: smtpPass },
});

// POST /api/entry
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

    entries[email.toLowerCase()] = {
      id: entryId,
      email: email.toLowerCase(),
      phone,
      firstName: firstName || "",
      lastName: lastName || "",
      verificationToken,
      verified: false,
      createdAt: new Date().toISOString(),
    };

    const domains = process.env["REPLIT_DOMAINS"] ?? "";
    const primaryDomain = domains.split(",")[0]?.trim();
    const baseUrl = primaryDomain
      ? `https://${primaryDomain}`
      : `http://localhost:${process.env["PORT"] ?? 8080}`;

    const verifyLink = `${baseUrl}/api/verify?token=${verificationToken}&email=${encodeURIComponent(email.toLowerCase())}`;

    await transporter.sendMail({
      from: `"Tesla Giveaway" <${smtpUser}>`,
      to: email,
      subject: "⚡ Verify Your Email - Tesla Giveaway Entry",
      html: getVerificationEmailTemplate(firstName || "there", verifyLink, entryId),
    });

    logger.info({ email }, "Verification email sent");

    res.json({ success: true, message: "Entry submitted! Please check your email to verify.", entryId });
  } catch (err) {
    logger.error({ err }, "Entry error");
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// GET /api/verify
router.get("/verify", (req, res) => {
  const { token, email } = req.query as { token?: string; email?: string };

  if (!token || !email) {
    res.redirect("/verify-error.html?reason=invalid");
    return;
  }

  const entry = entries[email.toLowerCase()];
  if (!entry) {
    res.redirect("/verify-error.html?reason=notfound");
    return;
  }

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

// GET /api/session
router.get("/session", (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token || !verifiedUsers[token]) {
    res.status(401).json({ valid: false });
    return;
  }
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

// POST /api/order
router.post("/order", async (req, res) => {
  try {
    const { sessionToken, selectedCar, deliveryDetails } = req.body as {
      sessionToken: string;
      selectedCar: Record<string, string>;
      deliveryDetails: Record<string, string>;
    };

    if (!sessionToken || !verifiedUsers[sessionToken]) {
      res.status(401).json({ error: "Invalid session. Please verify your email first." });
      return;
    }

    const user = verifiedUsers[sessionToken];
    const orderId = "TSLA-" + uuidv4().substring(0, 8).toUpperCase();
    const trackingNumber = "TRK-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const order = {
      orderId,
      trackingNumber,
      email: user.email,
      entryId: user.entryId,
      selectedCar,
      deliveryDetails,
      status: "confirmed",
      orderDate: new Date().toISOString(),
      estimatedDelivery: getEstimatedDelivery(),
      timeline: [
        { stage: "Order Confirmed", timestamp: new Date().toISOString(), completed: true },
        { stage: "Processing", timestamp: null, completed: false },
        { stage: "Shipped", timestamp: null, completed: false },
        { stage: "In Transit", timestamp: null, completed: false },
        { stage: "Out for Delivery", timestamp: null, completed: false },
        { stage: "Delivered", timestamp: null, completed: false },
      ],
    };

    orders[orderId] = order;

    await transporter.sendMail({
      from: '"Tesla Giveaway" <techledger10@gmail.com>',
      to: user.email,
      subject: "🎉 Order Confirmed! Your Tesla is on the way!",
      html: getOrderConfirmationTemplate(order),
    });

    logger.info({ email: user.email, orderId }, "Order confirmation sent");
    res.json({ success: true, order });
  } catch (err) {
    logger.error({ err }, "Order error");
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// GET /api/order/:orderId
router.get("/order/:orderId", (req, res) => {
  const order = orders[req.params["orderId"] ?? ""];
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json({ order: simulateOrderProgress(order) });
});

// GET /api/order/tracking/:trackingNumber  — must be registered BEFORE /order/:orderId
router.get("/order/tracking/:trackingNumber", (req, res) => {
  const order = Object.values(orders).find(
    (o) => o.trackingNumber === req.params["trackingNumber"],
  );
  if (!order) {
    res.status(404).json({ error: "Tracking number not found." });
    return;
  }
  res.json({ order: simulateOrderProgress(order) });
});

// Helpers
function getEstimatedDelivery() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().split("T")[0]!;
}

function simulateOrderProgress(order: typeof orders[string]) {
  const now = new Date();
  const orderDate = new Date(order.orderDate);
  const hoursElapsed = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
  const updated = { ...order, timeline: order.timeline.map((t) => ({ ...t })) };

  if (hoursElapsed > 1 && !updated.timeline[1]!.completed) {
    updated.timeline[1]!.completed = true;
    updated.timeline[1]!.timestamp = new Date(orderDate.getTime() + 1 * 3600_000).toISOString();
    updated.status = "processing";
  }
  if (hoursElapsed > 24 && !updated.timeline[2]!.completed) {
    updated.timeline[2]!.completed = true;
    updated.timeline[2]!.timestamp = new Date(orderDate.getTime() + 24 * 3600_000).toISOString();
    updated.status = "shipped";
  }
  if (hoursElapsed > 48 && !updated.timeline[3]!.completed) {
    updated.timeline[3]!.completed = true;
    updated.timeline[3]!.timestamp = new Date(orderDate.getTime() + 48 * 3600_000).toISOString();
    updated.status = "in_transit";
  }
  if (hoursElapsed > 72 && !updated.timeline[4]!.completed) {
    updated.timeline[4]!.completed = true;
    updated.timeline[4]!.timestamp = new Date(orderDate.getTime() + 72 * 3600_000).toISOString();
    updated.status = "out_for_delivery";
  }

  return updated;
}

function getVerificationEmailTemplate(firstName: string, verifyLink: string, entryId: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Verify Email</title></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#0a0a0a,#111);border:1px solid #222;border-radius:16px;overflow:hidden;max-width:600px;">
      <tr><td style="padding:40px 40px 20px;text-align:center;"><span style="color:#E82127;font-size:24px;font-weight:700;letter-spacing:2px;">TESLA</span></td></tr>
      <tr><td style="background:linear-gradient(135deg,#1a0000,#E82127 50%,#1a0000);padding:3px;"></td></tr>
      <tr><td style="padding:40px;">
        <h1 style="color:#fff;font-size:28px;font-weight:600;margin:0 0 12px;text-align:center;">⚡ Almost There, ${firstName}!</h1>
        <p style="color:#aaa;font-size:16px;line-height:1.6;text-align:center;margin:0 0 30px;">You're one step away from potentially winning a brand new Tesla. Verify your email to complete your entry.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${verifyLink}" style="display:inline-block;background:linear-gradient(135deg,#E82127,#ff3b3f);color:#fff;text-decoration:none;padding:16px 48px;border-radius:8px;font-size:18px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Verify My Email</a>
        </td></tr></table>
        <p style="color:#666;font-size:13px;text-align:center;margin:30px 0 0;line-height:1.6;">Or copy: <span style="color:#E82127;word-break:break-all;">${verifyLink}</span></p>
      </td></tr>
      <tr><td style="padding:0 40px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;">
          <tr><td style="padding:20px;"><p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Entry Details</p>
          <p style="color:#ccc;font-size:14px;margin:0;">Entry ID: <span style="color:#fff;font-family:monospace;">${entryId}</span><br>Status: <span style="color:#E82127;">Pending Verification</span></p></td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#0a0a0a;padding:30px 40px;border-top:1px solid #1a1a1a;">
        <p style="color:#555;font-size:12px;text-align:center;margin:0;line-height:1.6;">© 2026 Tesla Giveaway. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function getOrderConfirmationTemplate(order: typeof orders[string]) {
  const car = order.selectedCar;
  const addr = order.deliveryDetails;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#0a0a0a,#111);border:1px solid #222;border-radius:16px;overflow:hidden;max-width:600px;">
      <tr><td style="padding:40px 40px 20px;text-align:center;"><span style="color:#E82127;font-size:24px;font-weight:700;letter-spacing:2px;">TESLA</span></td></tr>
      <tr><td style="padding:40px 40px 20px;text-align:center;">
        <div style="font-size:64px;margin-bottom:12px;">🎉</div>
        <h1 style="color:#fff;font-size:28px;font-weight:600;margin:0 0 8px;">Order Confirmed!</h1>
        <p style="color:#00cc44;font-size:18px;margin:0;">Your Tesla order has been placed successfully</p>
      </td></tr>
      <tr><td style="padding:20px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;">
          <tr><td style="padding:24px;">
            <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">Order Summary</p>
            <table width="100%">
              <tr><td style="padding:8px 0;color:#888;font-size:14px;">Order ID</td><td style="padding:8px 0;color:#fff;font-family:monospace;text-align:right;">${order.orderId}</td></tr>
              <tr><td style="padding:8px 0;color:#888;font-size:14px;">Tracking #</td><td style="padding:8px 0;color:#E82127;font-family:monospace;text-align:right;">${order.trackingNumber}</td></tr>
              <tr><td style="padding:8px 0;color:#888;font-size:14px;">Vehicle</td><td style="padding:8px 0;color:#fff;text-align:right;">${car["name"] ?? ""}</td></tr>
              <tr><td style="padding:8px 0;color:#888;font-size:14px;">Color</td><td style="padding:8px 0;color:#fff;text-align:right;">${car["color"] ?? ""}</td></tr>
              <tr><td style="padding:8px 0;color:#888;font-size:14px;">Est. Delivery</td><td style="padding:8px 0;color:#fff;text-align:right;">${order.estimatedDelivery}</td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:10px 40px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;">
          <tr><td style="padding:24px;">
            <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Delivery Address</p>
            <p style="color:#ccc;font-size:14px;margin:0;line-height:1.6;">${addr["fullName"] ?? ""}<br>${addr["address"] ?? ""}<br>${addr["city"] ?? ""}, ${addr["state"] ?? ""} ${addr["zipCode"] ?? ""}<br>${addr["country"] ?? ""}</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#0a0a0a;padding:30px 40px;border-top:1px solid #1a1a1a;">
        <p style="color:#555;font-size:12px;text-align:center;margin:0;line-height:1.6;">© 2026 Tesla Giveaway. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

export default router;
