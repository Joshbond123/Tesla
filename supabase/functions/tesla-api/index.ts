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

async function trySmtpSend(port: number, useTls: boolean, to: string, subject: string, html: string): Promise<boolean> {
  const fromAddr = '"Tesla Award Program" <' + SMTP_USER + ">";
  try {
    const conn = useTls
      ? await Deno.connectTls({ hostname: "smtp.gmail.com", port })
      : await Deno.connect({ hostname: "smtp.gmail.com", port, transport: "tcp" });

    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const buf = new Uint8Array(4096);

    async function readLine(timeoutMs = 10000): Promise<string> {
      let result = "";
      const start = Date.now();
      while (true) {
        if (Date.now() - start > timeoutMs) throw new Error("SMTP read timeout");
        const n = await conn.read(buf);
        if (!n) break;
        result += dec.decode(buf.subarray(0, n));
        if (result.endsWith("\r\n")) break;
      }
      return result.trim();
    }

    async function send(data: string) {
      await conn.write(enc.encode(data + "\r\n"));
    }

    const greeting = await readLine(8000);
    if (!greeting.startsWith("220")) throw new Error("SMTP greeting: " + greeting);

    await send("EHLO localhost");
    let line = "";
    do { line = await readLine(5000); } while (line.startsWith("250-"));

    // For port 587, send STARTTLS before AUTH
    if (!useTls) {
      await send("STARTTLS");
      const starttlsResp = await readLine(5000);
      if (!starttlsResp.startsWith("220")) throw new Error("STARTTLS failed: " + starttlsResp);
      // Upgrade to TLS
      const tlsConn = await Deno.startTls(conn as any, { hostname: "smtp.gmail.com" });
      // Re-send EHLO after STARTTLS
      await (async () => {
        const tlsEnc = new TextEncoder();
        const tlsDec = new TextDecoder();
        const tlsBuf = new Uint8Array(4096);
        const tlsReadLine = async (): Promise<string> => {
          let r = "";
          while (true) {
            const n = await tlsConn.read(tlsBuf);
            if (!n) break;
            r += tlsDec.decode(tlsBuf.subarray(0, n));
            if (r.endsWith("\r\n")) break;
          }
          return r.trim();
        };
        const tlsSend = async (d: string) => { await tlsConn.write(enc.encode(d + "\r\n")); };
        await tlsSend("EHLO localhost");
        let l = "";
        do { l = await tlsReadLine(); } while (l.startsWith("250-"));
        await tlsSend("AUTH LOGIN");
        await tlsReadLine();
        await tlsSend(btoa(SMTP_USER));
        await tlsReadLine();
        await tlsSend(btoa(SMTP_PASS));
        const authR = await tlsReadLine();
        if (!authR.startsWith("235")) throw new Error("AUTH: " + authR);
        await tlsSend("MAIL FROM:<" + SMTP_USER + ">");
        await tlsReadLine();
        await tlsSend("RCPT TO:<" + to + ">");
        await tlsReadLine();
        await tlsSend("DATA");
        await tlsReadLine();
        await tlsSend("From: " + fromAddr + "\r\nTo: " + to + "\r\nSubject: " + subject + "\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n" + html + "\r\n.");
        await tlsReadLine();
        await tlsSend("QUIT");
        tlsConn.close();
      })();
      console.log("Email sent via STARTTLS port 587 to " + to);
      return true;
    }

    // Direct SSL (port 465)
    await send("AUTH LOGIN");
    await readLine(5000);
    await send(btoa(SMTP_USER));
    await readLine(5000);
    await send(btoa(SMTP_PASS));
    const authResp = await readLine(8000);
    if (!authResp.startsWith("235")) throw new Error("AUTH: " + authResp);

    await send("MAIL FROM:<" + SMTP_USER + ">");
    await readLine(5000);
    await send("RCPT TO:<" + to + ">");
    await readLine(5000);
    await send("DATA");
    await readLine(5000);
    await send("From: " + fromAddr + "\r\nTo: " + to + "\r\nSubject: " + subject + "\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n" + html + "\r\n.");
    await readLine(12000);
    await send("QUIT");
    conn.close();
    console.log("Email sent via SSL port 465 to " + to);
    return true;
  } catch (err) {
    console.error("SMTP port " + port + " failed: " + (err?.message || err));
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
    verification_token: verificationToken, verification_status: "pending", entry_count: 1,
  }, "id");

  if (error) {
    if (error.code === "23505") return json({ error: "This email has already been entered." }, 409);
    console.error("Entry DB error:", error);
    return json({ error: "Server error. Please try again." }, 500);
  }

  const verifyLink = SELF_BASE + "/api/verify?token=" + verificationToken + "&email=" + encodeURIComponent(emailKey);
  // Non-blocking email send (tries both ports)
  sendEmailBackground(emailKey, "⚡ Verify Your Email — Tesla Award Program",
    buildVerificationEmail(firstName || "there", verifyLink, entry.id));

  return json({
    success: true,
    message: "Entry submitted! Check your email or use the instant verify button.",
    entryId: entry.id,
    verifyLink: verifyLink
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

  const sessionToken = hexRandom(32);
  await dbInsert("user_sessions", { token: sessionToken, user_id: entry.id });
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
  if (entry.verification_status === "verified") return json({ error: "Already verified." }, 409);

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

  if (entry.verification_status !== "verified") {
    const verifyLink = SELF_BASE + "/api/verify?token=" + entry.verification_token + "&email=" + encodeURIComponent(emailKey);
    sendEmailBackground(emailKey, "⚡ Complete Your Tesla Award Verification",
      buildVerificationEmail(entry.first_name || "there", verifyLink, entry.id));
    return json({ error: "Not verified yet. We resent your verification email.", verifyLink }, 403);
  }

  const sessionToken = hexRandom(32);
  await dbInsert("user_sessions", { token: sessionToken, user_id: entry.id });
  return json({ success: true, sessionToken, user: { email: entry.email, firstName: entry.first_name || "", lastName: entry.last_name || "", entryId: entry.id, phone: entry.phone || "" } });
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
  return json({ valid: true, user: { email: user.email, firstName: user.first_name || "", lastName: user.last_name || "", entryId: user.entryId, phone: user.phone || "" } });
}

async function handleOrder(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const { sessionToken, selectedCar, deliveryDetails, deliveryMethod, paymentMethod } = body;
  const user = await getSessionUser(sessionToken || "");
  if (!user) return json({ error: "Invalid session. Verify your email first." }, 401);

  const orderId = "TSLA-" + crypto.randomUUID().substring(0, 8).toUpperCase();
  const trackingNumber = "TRK-" + hexRandom(4).toUpperCase();
  const method = deliveryMethod ?? { id: "standard", name: "Standard Delivery", price: 299 };
  const estimatedDelivery = new Date(Date.now() + (String(method.id) === "express" ? 2 : 10) * 86400000).toISOString().split("T")[0];

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

  const order = { orderId, trackingNumber, email: user.email, entryId: user.entryId, selectedCar: selectedCar ?? {}, deliveryDetails: deliveryDetails ?? {}, deliveryMethod: method, paymentMethod: paymentMethod ?? {}, status: "confirmed", orderDate: orderRow?.order_date, estimatedDelivery, timeline };
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
  const car = order.selectedCar;
  const method = order.deliveryMethod;
  return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head><body style=\"margin:0;padding:0;background:#F7F8FA;font-family:sans-serif;\"><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#F7F8FA;padding:40px 0;\"><tr><td align=\"center\"><table width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#FFF;border-radius:16px;overflow:hidden;\"><tr><td style=\"background:#171A20;padding:28px 36px;text-align:center;\"><span style=\"color:#E31937;font-size:22px;font-weight:900;\">TESLA AWARD PROGRAM</span></td></tr><tr><td style=\"padding:36px;text-align:center;\"><div style=\"font-size:56px;margin-bottom:12px;\">🎉</div><h1 style=\"font-size:24px;font-weight:800;color:#171A20;margin:0 0 8px;\">Order Confirmed!</h1><p style=\"color:#00A550;font-weight:600;margin:0 0 20px;\">Your Tesla is on its way</p><p style=\"font-size:14px;color:#5C5E62;\">Order: <strong>" + order.orderId + "</strong> · Tracking: <strong>" + order.trackingNumber + "</strong></p><p style=\"font-size:14px;color:#5C5E62;\">Vehicle: Tesla " + (car?.name ?? "—") + " · Est. Delivery: <strong style=\"color:#00A550;\">" + order.estimatedDelivery + "</strong></p><p style=\"font-size:14px;color:#5C5E62;\">Delivery: " + String(method?.name ?? "Standard") + "</p></td></tr></table></td></tr></table></body></html>";
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
  const r = await fetch(REST + "/admin_settings?select=key,value&key=eq.delivery_fee&limit=1", { headers: SB_HEADERS });
  if (!r.ok) return json({ deliveryFee: 299 });
  const rows = await r.json();
  const row = rows[0];
  const fee = row?.value?.amount ?? 299;
  return json({ deliveryFee: fee });
}

async function handleAdminSaveSettings(req: Request) {
  let body: { deliveryFee?: number };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  if (body.deliveryFee === undefined) return json({ error: "deliveryFee required" }, 400);
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
    if (!insR.ok) return json({ error: "Failed to save setting" }, 500);
  }
  return json({ success: true, deliveryFee: body.deliveryFee });
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
    if (route === "/api/admin/stats" && req.method === "GET") return await handleAdminGetStats();
    return json({ error: "Not found." }, 404);
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error." }, 500);
  }
});
