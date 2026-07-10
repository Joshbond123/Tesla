// ─────────────────────────────────────────────────────────────────────────────
// Tesla Award Program — GitHub Pages Demo Version
// All API calls are intercepted and simulated client-side via localStorage.
// ─────────────────────────────────────────────────────────────────────────────

// ── MOCK API ─────────────────────────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  // Simulate realistic network delay
  await new Promise(r => setTimeout(r, 350 + Math.random() * 450));

  // POST /entry
  if (endpoint === '/entry' && method === 'POST') {
    const key = (body.email || '').toLowerCase().trim();
    if (!key) throw new Error('Email is required.');
    const entries = JSON.parse(localStorage.getItem('_tp_entries') || '{}');
    if (entries[key]) throw new Error('This email has already been entered. Only one entry per person is permitted.');
    const token = rand64();
    entries[key] = {
      email: key, phone: body.phone || '',
      firstName: body.firstName || '', lastName: body.lastName || '',
      token, verified: false, createdAt: new Date().toISOString()
    };
    localStorage.setItem('_tp_entries', JSON.stringify(entries));
    localStorage.setItem('_tp_pending_email', key);
    localStorage.setItem('_tp_pending_name', body.firstName || '');
    return { success: true, message: 'Entry submitted! Check your email to verify.' };
  }

  // POST /resend
  if (endpoint === '/resend' && method === 'POST') {
    return { success: true, message: 'Verification email resent.' };
  }

  // GET /session
  if (endpoint.startsWith('/session')) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('session') || localStorage.getItem('tesla_session_token');
    if (!token) return { valid: false };
    const sessions = JSON.parse(localStorage.getItem('_tp_sessions') || '{}');
    const session = sessions[token];
    if (!session) return { valid: false };
    const entries = JSON.parse(localStorage.getItem('_tp_entries') || '{}');
    const entry = entries[session.email] || {};
    return {
      valid: true,
      user: {
        email: session.email,
        firstName: entry.firstName || session.firstName || '',
        lastName: entry.lastName || '',
        entryId: session.entryId,
        phone: entry.phone || ''
      }
    };
  }

  // POST /order
  if (endpoint === '/order' && method === 'POST') {
    const orderId = 'TSLA-' + randId(8);
    const trackingNumber = 'TRK-' + randId(8);
    const isExpress = body.deliveryMethod?.id === 'express';
    const daysToAdd = isExpress ? 2 : 10;
    const est = new Date(); est.setDate(est.getDate() + daysToAdd);
    const order = {
      orderId, trackingNumber,
      email: body.sessionToken || 'demo@example.com',
      selectedCar: body.selectedCar || {},
      deliveryDetails: body.deliveryDetails || {},
      deliveryMethod: body.deliveryMethod || {},
      paymentMethod: body.paymentMethod || {},
      status: 'confirmed',
      orderDate: new Date().toISOString(),
      estimatedDelivery: est.toISOString().split('T')[0],
      timeline: [
        { stage: 'Order Confirmed',   timestamp: new Date().toISOString(), completed: true  },
        { stage: 'Processing',        timestamp: null,                     completed: false },
        { stage: 'Shipped',           timestamp: null,                     completed: false },
        { stage: 'In Transit',        timestamp: null,                     completed: false },
        { stage: 'Out for Delivery',  timestamp: null,                     completed: false },
        { stage: 'Delivered',         timestamp: null,                     completed: false }
      ]
    };
    const orders = JSON.parse(localStorage.getItem('_tp_orders') || '{}');
    orders[orderId] = order;
    localStorage.setItem('_tp_orders', JSON.stringify(orders));
    return { success: true, order };
  }

  // GET /order/tracking/:trackingNumber  (must come before /order/:id)
  const trackMatch = endpoint.match(/^\/order\/tracking\/([^/]+)$/);
  if (trackMatch) {
    const orders = JSON.parse(localStorage.getItem('_tp_orders') || '{}');
    const order = Object.values(orders).find(o => o.trackingNumber === trackMatch[1]);
    if (!order) throw new Error('Tracking number not found.');
    return { order };
  }

  // GET /order/:orderId
  const orderMatch = endpoint.match(/^\/order\/([^/]+)$/);
  if (orderMatch) {
    const orders = JSON.parse(localStorage.getItem('_tp_orders') || '{}');
    const order = orders[orderMatch[1]];
    if (!order) throw new Error('Order not found.');
    return { order };
  }

  return { success: true };
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function rand64() {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}
function randId(n) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function isValidPhone(p) { return p && p.replace(/\D/g,'').length >= 7; }

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function getSession() {
  return localStorage.getItem('tesla_session_token') || getParam('session');
}

function logout() {
  localStorage.removeItem('tesla_session_token');
  localStorage.removeItem('tesla_selected_car');
  localStorage.removeItem('tesla_delivery_details');
  localStorage.removeItem('tesla_delivery_method');
  window.location.href = 'index.html';
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const existing = document.getElementById('toast-container');
  if (existing) existing.remove();
  const c = document.createElement('div');
  c.id = 'toast-container';
  c.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;';
  const t = document.createElement('div');
  const bg = type === 'success' ? '#00A550' : type === 'error' ? '#E31937' : '#171A20';
  t.style.cssText = `background:${bg};color:white;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:600;max-width:340px;box-shadow:0 8px 24px rgba(0,0,0,.2);animation:fadeInUp .3s ease;`;
  t.textContent = msg;
  c.appendChild(t);
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 4000);
}

// ── COUNTDOWN ─────────────────────────────────────────────────────────────────
function startCountdown(endDate) {
  function update() {
    const diff = endDate - Date.now();
    if (diff <= 0) return;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    const dEl = document.getElementById('days');
    const hEl = document.getElementById('hours');
    const mEl = document.getElementById('minutes');
    const sEl = document.getElementById('seconds');
    if (dEl) dEl.textContent = pad(d);
    if (hEl) hEl.textContent = pad(h);
    if (mEl) mEl.textContent = pad(m);
    if (sEl) sEl.textContent = pad(s);
  }
  update();
  setInterval(update, 1000);
}

// ── COUNTER ANIMATION ─────────────────────────────────────────────────────────
function animateCounter(el, target, duration) {
  if (!el) return;
  const start = Date.now();
  const tick = () => {
    const p = Math.min((Date.now() - start) / duration, 1);
    el.textContent = Math.floor(p * target).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString();
  };
  requestAnimationFrame(tick);
}

// ── SCROLL ANIMATIONS ─────────────────────────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal,.anim-fade-up').forEach(el => observer.observe(el));
}

// ── HTML ESCAPING ─────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollAnimations);
} else {
  initScrollAnimations();
}
