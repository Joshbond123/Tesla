// Tesla Award Program — Supabase Edge Function (v10)
// Fixes: Non-blocking email sending via EdgeRuntime.waitUntil, SMTP timeout,
//        proper error handling, fast response to frontend.

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
  if (!r.ok) {
    const err = await r.text();
    return { data: null, error: { message: err } };
  }
  const rows = await r.json();
  return { data: rows[0] ?? null, error: null };
}

async function dbInsert(table: string, body: Record<string, unknown>, select?: string) {
  const url = select
    ? REST + "/" + table + "?select=" + select
    : REST + "/" + table;
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
  if (!r.ok) {
    const err = await r.text();
    return { error: { message: err } };
  }
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
    // "already exists" is OK — user may exist from previous attempt
    if (!msg.toLowerCase().includes("already")) {
      return { data: null, error: { message: msg || "create user failed" } };
    }
    // Try to look up the existing user
    const lookR = await fetch(
      AUTH + "/admin/users?filter=" + encodeURIComponent(email),
      { headers: SB_HEADERS }
    );
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

// ── EMAIL VIA GMAIL SMTPS (NON-BLOCKING) ──────────────────────────────────────
function sendEmailBackground(to: string, subject: string, html: string) {
  console.log('[Email] Queuing background email to:', to);
  // Fire-and-forget: don't await this in request handlers.
  // Uses EdgeRuntime.waitUntil to keep the isolate alive until email is sent.
  const promise = (async () => {
    const fromAddr = '"Tesla Award Program" <' + SMTP_USER + ">";
    try {
      console.log('[Email] Connecting to smtp.gmail.com:465...');
    const conn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 });
    console.log('[Email] SMTP connection established');
      const enc = new TextEncoder();
      const dec = new TextDecoder();
      const buf = new Uint8Array(4096);

      async function readLine(timeoutMs = 15000): Promise<string> {
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

      function b64(s: string): string {
        return btoa(unescape(encodeURIComponent(s)));
      }

      // Read greeting with timeout
      const greeting = await readLine(10000);
      if (!greeting.startsWith("220")) throw new Error("SMTP greeting failed: " + greeting);

      await send("EHLO localhost");
      let line = "";
      do { line = await readLine(5000); } while (line.startsWith("250-"));

      await send("AUTH LOGIN");
      await readLine(5000);
      await send(b64(SMTP_USER));
      await readLine(5000);
      await send(b64(SMTP_PASS));
      const authResp = await readLine(10000);
      if (!authResp.startsWith("235")) throw new Error("SMTP AUTH failed: " + authResp);

      await send("MAIL FROM:<" + SMTP_USER + ">");
      await readLine(5000);
      await send("RCPT TO:<" + to + ">");
      await readLine(5000);
      await send("DATA");
      await readLine(5000);
      await send(
        "From: " + fromAddr + "\r\n" +
        "To: " + to + "\r\n" +
        "Subject: " + subject + "\r\n" +
        "MIME-Version: 1.0\r\n" +
        "Content-Type: text/html; charset=UTF-8\r\n\r\n" +
        html + "\r\n."
      );
      await readLine(15000);
      await send("QUIT");
      conn.close();
      console.log("Email sent to " + to);
    } catch (err) {
      console.error("Email send failed (non-fatal):", err);
    }
  })();

  // Keep the isolate alive until the email promise resolves
  if (typeof EdgeRuntime !== "undefined" && "waitUntil" in EdgeRuntime) {
    (EdgeRuntime as any).waitUntil(promise);
  }
}

// ── ROUTE HANDLERS ────────────────────────────────────────────────────────────
async function handleHealth() {
  return json({ status: "ok" });
}

async function handleEntry(req: Request) {
  let body: { email?: string; phone?: string; firstName?: string; lastName?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const { email, phone, firstName = "", lastName = "" } = body;
  if (!email || !phone) return json({ error: "Email and phone number are required." }, 400);
  const emailKey = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailKey))
    return json({ error: "Please enter a valid email address." }, 400);

  // Check for existing entry
  const { data: existing } = await dbGet1("giveaway_users", "id", { email: "eq." + emailKey });
  if (existing) return json({ error: "This email has already been entered. Only one entry per person is allowed." }, 409);

  const verificationToken = hexRandom(32);

  // Create auth user (non-fatal if fails — user may already exist)
  const authResult = await authCreateUser(emailKey, phone, { firstName, lastName });

  // Insert the giveaway entry
  const { data: entry, error } = await dbInsert("giveaway_users", {
    auth_user_id: authResult.data?.user?.id ?? null,
    email: emailKey, phone, first_name: firstName, last_name: lastName,
    verification_token: verificationToken, verification_status: "pending", entry_count: 1,
  }, "id");

  if (error) {
    if (error.code === "23505") return json({ error: "This email has already been entered. Only one entry per person is allowed." }, 409);
    console.error("Entry DB error:", error);
    return json({ error: "Server error. Please try again." }, 500);
  }

  // Send email in background — does NOT block the response
  const verifyLink = SELF_BASE + "/api/verify?token=" + verificationToken + "&email=" + encodeURIComponent(emailKey);
  sendEmailBackground(emailKey, "⚡ Verify Your Email — Tesla Award Program", buildVerificationEmail(firstName || "there", verifyLink, entry.id));

  // Return response immediately — email is sent in background
  return json({ success: true, message: "Entry submitted! Check your email to verify.", entryId: entry.id });
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
  const { error: sessionError } = await dbInsert("user_sessions", { token: sessionToken, user_id: entry.id });
  if (sessionError) return Response.redirect(FRONTEND_URL + "/verify-error.html?reason=server", 302);
  return Response.redirect(FRONTEND_URL + "/dashboard.html?session=" + sessionToken, 302);
}

async function handleResend(req: Request) {
  let body: { email?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const { email } = body;
  if (!email) return json({ error: "Email is required." }, 400);
  const emailKey = email.toLowerCase();

  const { data: entry, error } = await dbGet1("giveaway_users", "id,first_name,verification_token,verification_status", { email: "eq." + emailKey });
  if (error || !entry) return json({ error: "Email address not found. Please enter the program first." }, 404);
  if (entry.verification_status === "verified") return json({ error: "This email has already been verified." }, 409);

  const verifyLink = SELF_BASE + "/api/verify?token=" + entry.verification_token + "&email=" + encodeURIComponent(emailKey);
  sendEmailBackground(emailKey, "⚡ Verification Email Resent — Tesla Award Program", buildVerificationEmail(entry.first_name || "there", verifyLink, entry.id));
  return json({ success: true, message: "Verification email resent." });
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
    sendEmailBackground(emailKey, "⚡ Complete Your Tesla Award Verification", buildVerificationEmail(entry.first_name || "there", verifyLink, entry.id));
    return json({ error: "Your entry is not verified yet. We just resent your verification email." }, 403);
  }

  const sessionToken = hexRandom(32);
  const { error: sessionError } = await dbInsert("user_sessions", { token: sessionToken, user_id: entry.id });
  if (sessionError) return json({ error: "Login failed. Please try again." }, 500);
  return json({ success: true, sessionToken, user: { email: entry.email, firstName: entry.first_name || "", lastName: entry.last_name || "", entryId: entry.id, phone: entry.phone || "" } });
}

async function getSessionUser(sessionToken: string) {
  if (!sessionToken) return null;
  const now = new Date().toISOString();
  const { data } = await dbGet1(
    "user_sessions",
    "token,user_id,giveaway_users(id,email,phone,first_name,last_name)",
    { token: "eq." + sessionToken, expires_at: "gt." + now }
  );
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
  let body: { sessionToken?: string; selectedCar?: any; deliveryDetails?: any; deliveryMethod?: any; paymentMethod?: any };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const { sessionToken, selectedCar, deliveryDetails, deliveryMethod, paymentMethod } = body;
  const user = await getSessionUser(sessionToken || "");
  if (!user) return json({ error: "Invalid session. Please verify your email first." }, 401);

  const orderId = "TSLA-" + crypto.randomUUID().substring(0, 8).toUpperCase();
  const trackingNumber = "TRK-" + hexRandom(4).toUpperCase();
  const method = deliveryMethod ?? { id: "standard", name: "Standard Delivery", price: 299 };
  const estimatedDelivery = calcEstimatedDelivery(String(method.id) === "express" ? 2 : 10);

  const { data: carRow, error: carError } = await dbInsert("selected_cars", { user_id: user.id, data: selectedCar ?? {} }, "id");
  if (carError) return json({ error: "Server error. Please try again." }, 500);

  const { data: deliveryRow, error: deliveryError } = await dbInsert("delivery_details", { user_id: user.id, data: deliveryDetails ?? {} }, "id");
  if (deliveryError) return json({ error: "Server error. Please try again." }, 500);

  const { data: orderRow, error: orderError } = await dbInsert("orders", {
    order_id: orderId, tracking_number: trackingNumber, user_id: user.id,
    selected_car_id: carRow.id, delivery_details_id: deliveryRow.id,
    delivery_method: method, payment_method: paymentMethod ?? { id: "unknown", name: "Not specified" },
    status: "confirmed", estimated_delivery: estimatedDelivery,
  }, "id,order_date");
  if (orderError) return json({ error: "Server error. Please try again." }, 500);

  const timeline = defaultTimeline(new Date(orderRow.order_date).toISOString());
  for (let i = 0; i < timeline.length; i++) {
    await dbInsert("tracking_data", {
      order_id: orderRow.id, stage: timeline[i].stage, stage_order: i,
      timestamp: timeline[i].timestamp, completed: timeline[i].completed,
    });
  }

  const order = {
    orderId, trackingNumber, email: user.email, entryId: user.entryId,
    selectedCar: selectedCar ?? {}, deliveryDetails: deliveryDetails ?? {},
    deliveryMethod: method, paymentMethod: paymentMethod ?? { id: "unknown", name: "Not specified" },
    status: "confirmed", orderDate: new Date(orderRow.order_date).toISOString(),
    estimatedDelivery, timeline,
  };
  sendEmailBackground(user.email, "🎉 Order Confirmed — Your Tesla is on the way!", buildOrderConfirmationEmail(order));
  return json({ success: true, order });
}

async function handleTracking(trackingNumber: string) {
  const order = await loadOrderBy("tracking_number", trackingNumber);
  if (!order) return json({ error: "Tracking number not found." }, 404);
  return json({ order: simulateProgress(order) });
}

async function handleOrderLookup(orderId: string) {
  const order = await loadOrderBy("order_id", orderId);
  if (!order) return json({ error: "Order not found." }, 404);
  return json({ order: simulateProgress(order) });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
async function loadOrderBy(column: string, value: string) {
  const { data, error } = await dbGet1(
    "orders",
    "id,order_id,tracking_number,status,order_date,estimated_delivery,delivery_method,payment_method,giveaway_users(id,email),selected_cars(data),delivery_details(data),tracking_data(stage,stage_order,timestamp,completed)",
    { [column]: "eq." + value }
  );
  if (error || !data) return null;
  const user = Array.isArray(data.giveaway_users) ? data.giveaway_users[0] : data.giveaway_users;
  const car = Array.isArray(data.selected_cars) ? data.selected_cars[0] : data.selected_cars;
  const delivery = Array.isArray(data.delivery_details) ? data.delivery_details[0] : data.delivery_details;
  const tracking = ((data.tracking_data ?? []).sort((a: any, b: any) => a.stage_order - b.stage_order)).map((t: any) => ({ stage: t.stage, timestamp: t.timestamp, completed: t.completed }));
  return {
    orderId: data.order_id, trackingNumber: data.tracking_number,
    email: user?.email ?? "", entryId: user?.id ?? "",
    selectedCar: car?.data ?? {}, deliveryDetails: delivery?.data ?? {},
    deliveryMethod: data.delivery_method ?? {}, paymentMethod: data.payment_method ?? {},
    status: data.status, orderDate: new Date(data.order_date).toISOString(),
    estimatedDelivery: data.estimated_delivery, timeline: tracking,
  };
}

function defaultTimeline(orderDate: string) {
  return [
    { stage: "Order Confirmed", timestamp: orderDate, completed: true },
    { stage: "Processing", timestamp: null, completed: false },
    { stage: "Shipped", timestamp: null, completed: false },
    { stage: "In Transit", timestamp: null, completed: false },
    { stage: "Out for Delivery", timestamp: null, completed: false },
    { stage: "Delivered", timestamp: null, completed: false },
  ];
}

function calcEstimatedDelivery(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function simulateProgress(order: any) {
  const now = new Date();
  const orderDate = new Date(order.orderDate);
  const hrs = (now.getTime() - orderDate.getTime()) / 3_600_000;
  const updated = { ...order, timeline: order.timeline.map((t: any) => ({ ...t })) };
  function advance(idx: number, h: number, status: string) {
    if (hrs > h && !updated.timeline[idx]?.completed) {
      updated.timeline[idx].completed = true;
      updated.timeline[idx].timestamp = new Date(orderDate.getTime() + h * 3_600_000).toISOString();
      updated.status = status;
    }
  }
  advance(1, 1, "processing"); advance(2, 24, "shipped");
  advance(3, 48, "in_transit"); advance(4, 72, "out_for_delivery"); advance(5, 96, "delivered");
  return updated;
}

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────
function buildVerificationEmail(firstName: string, verifyLink: string, entryId: string) {
  return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><title>Verify Email</title></head>" +
    "<body style=\"margin:0;padding:0;background:#F7F8FA;font-family:sans-serif;\">" +
    "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#F7F8FA;padding:40px 0;\"><tr><td align=\"center\">" +
    "<table width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#FFF;border-radius:16px;overflow:hidden;max-width:560px;\">" +
    "<tr><td style=\"background:#171A20;padding:28px 36px;text-align:center;\"><span style=\"color:#E31937;font-size:22px;font-weight:900;letter-spacing:.1em;\">TESLA AWARD PROGRAM</span></td></tr>" +
    "<tr><td style=\"padding:36px;\">" +
    "<h1 style=\"font-size:22px;font-weight:800;color:#171A20;margin:0 0 12px;\">Hi " + firstName + ", you're almost in! ⚡</h1>" +
    "<p style=\"font-size:15px;color:#5C5E62;line-height:1.7;margin:0 0 28px;\">Verify your email to confirm your Tesla Award Program entry.</p>" +
    "<a href=\"" + verifyLink + "\" style=\"display:inline-block;background:#E31937;color:#FFF;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:700;\">Verify My Email</a>" +
    "<p style=\"font-size:12px;color:#B0B3B8;margin:20px 0 0;\">Entry ID: <code>" + entryId + "</code></p>" +
    "<p style=\"font-size:12px;color:#B0B3B8;margin:8px 0 0;\">Or copy: <span style=\"color:#E31937;word-break:break-all;\">" + verifyLink + "</span></p>" +
    "</td></tr>" +
    "<tr><td style=\"background:#F7F8FA;padding:20px 36px;border-top:1px solid #E5E7EB;text-align:center;\">" +
    "<p style=\"margin:0;font-size:11px;color:#B0B3B8;\">&copy; 2026 Tesla Award Program. All rights reserved.</p>" +
    "</td></tr></table></td></tr></table></body></html>";
}

function buildOrderConfirmationEmail(order: any) {
  const car = order.selectedCar;
  const addr = order.deliveryDetails;
  const method = order.deliveryMethod;
  const cityLine = addr?.city
    ? "<p style=\"font-size:14px;color:#5C5E62;margin:4px 0;\">To: " + addr.city + ", " + addr.state + "</p>"
    : "";
  return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><title>Order Confirmed</title></head>" +
    "<body style=\"margin:0;padding:0;background:#F7F8FA;font-family:sans-serif;\">" +
    "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#F7F8FA;padding:40px 0;\"><tr><td align=\"center\">" +
    "<table width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#FFF;border-radius:16px;overflow:hidden;max-width:560px;\">" +
    "<tr><td style=\"background:#171A20;padding:28px 36px;text-align:center;\"><span style=\"color:#E31937;font-size:22px;font-weight:900;\">TESLA AWARD PROGRAM</span></td></tr>" +
    "<tr><td style=\"padding:36px;text-align:center;\">" +
    "<div style=\"font-size:56px;margin-bottom:12px;\">🎉</div>" +
    "<h1 style=\"font-size:24px;font-weight:800;color:#171A20;margin:0 0 8px;\">Order Confirmed!</h1>" +
    "<p style=\"color:#00A550;font-weight:600;margin:0 0 20px;\">Your Tesla is on its way</p>" +
    "<p style=\"font-size:14px;color:#5C5E62;margin:4px 0;\">Order: <strong>" + order.orderId + "</strong> · Tracking: <strong>" + order.trackingNumber + "</strong></p>" +
    "<p style=\"font-size:14px;color:#5C5E62;margin:4px 0;\">Vehicle: Tesla " + (car?.name ?? "—") + " · Est. Delivery: <strong style=\"color:#00A550;\">" + order.estimatedDelivery + "</strong></p>" +
    "<p style=\"font-size:14px;color:#5C5E62;margin:4px 0;\">Delivery Method: " + String(method?.name ?? "Standard") + "</p>" +
    cityLine +
    "</td></tr>" +
    "<tr><td style=\"background:#F7F8FA;padding:20px 36px;border-top:1px solid #E5E7EB;text-align:center;\">" +
    "<p style=\"margin:0;font-size:11px;color:#B0B3B8;\">&copy; 2026 Tesla Award Program. All rights reserved.</p>" +
    "</td></tr></table></td></tr></table></body></html>";
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
    return json({ error: "Not found." }, 404);
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Internal server error." }, 500);
  }
});
