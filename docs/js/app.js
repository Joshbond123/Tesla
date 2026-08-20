// ╔══════════════════════════════════════════════════════════╗
// ║     Tesla Vehicle Award Program — Shared Utilities       ║
// ║     Production v3.0 — Premium Experience                 ║
// ╚══════════════════════════════════════════════════════════╝

// ── API CONFIGURATION ──────────────────────────────────────────────────
// Allow setting API base via URL param, localStorage, or config file
const urlApiParam = new URLSearchParams(window.location.search).get('api_url');
if (urlApiParam) {
  localStorage.setItem('tesla_api_base', urlApiParam);
  window.TESLA_API_BASE = urlApiParam;
}

function normalizeApiBase(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isValidApiBase(value) {
  if (!value) return false;
  try {
    const url = new URL(value, window.location.origin);
    return url.pathname.replace(/\/+$/, '').endsWith('/api');
  } catch (err) {
    return false;
  }
}

const isGitHubPages = window.location.hostname.endsWith('github.io');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isInfinityFree = /infinityfree|epizy|rf\.gd|42web|kesug|great-site|freewebhostmost/i.test(window.location.hostname);

// Prefer explicit URL param / window override, then same-origin PHP API on real hosts.
// Ignore stale localStorage pointing at dead Supabase URLs when hosted on InfinityFree.
var storedApi = '';
try { storedApi = localStorage.getItem('tesla_api_base') || ''; } catch (e) {}
if (storedApi && isInfinityFree && /supabase\.co/i.test(storedApi)) {
  try { localStorage.removeItem('tesla_api_base'); } catch (e2) {}
  storedApi = '';
}

const configuredApiBase = normalizeApiBase(
  window.TESLA_API_BASE ||
  storedApi ||
  ''
);

if (configuredApiBase && !isValidApiBase(configuredApiBase)) {
  console.error('[Tesla] Invalid API base URL. It must end in /api:', configuredApiBase);
}

// Production PHP hosts (InfinityFree etc.) must use same-origin /api — never hang on remote edge timeouts.
const API_BASE = isValidApiBase(configuredApiBase)
  ? configuredApiBase
  : (isGitHubPages
      ? 'https://puebwzumwqizgbmksrpq.supabase.co/functions/v1/tesla-api/api'
      : '/api');

window.TESLA_API_BASE = API_BASE;

function getApiConfigurationError() {
  if (!API_BASE) {
    if (isGitHubPages) {
      return 'The secure backend API is not configured for this GitHub Pages deployment.\n\n👉 Configure the GitHub Pages workflow with a TESLA_API_BASE repository variable or environment secret that points to your hosted API URL ending in /api.\n\nFor quick local testing, add ?api_url=YOUR_API_URL to the URL, e.g.:\n?api_url=https://your-secure-api.example.com/api';
    }
    return 'API base URL is not configured. Please set window.TESLA_API_BASE or deploy the backend server.';
  }
  return '';
}

// Log API configuration for debugging
console.log('[Tesla] API_BASE:', API_BASE || '(not configured — backend features will be unavailable)');
console.log('[Tesla] Hostname:', window.location.hostname);
console.log('[Tesla] isGitHubPages:', isGitHubPages);

// ── API CALLS ──────────────────────────────────────────────────────────
async function apiCall(endpoint, method, body) {
  method = method || 'GET';
  body = body || null;
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 20000);
  
  const configError = getApiConfigurationError();
  if (configError) throw new Error(configError);

  const options = { method, headers: { 'Content-Type': 'application/json' }, signal: controller.signal };
  if (body) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(API_BASE + endpoint, options);
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('The backend API timed out before completing the request. Please try again.');
    }
    throw new Error('Unable to reach the backend API. Please check your connection and try again.\n\nMake sure the API server is running at: ' + API_BASE);
  } finally {
    clearTimeout(timeout);
  }

  const contentType = res.headers.get('content-type') || '';
  let data;
  try {
    data = contentType.includes('application/json') ? await res.json() : { error: await res.text() };
  } catch (e) {
    data = { error: 'Invalid response from server' };
  }
  
  if (!res.ok) throw new Error(data.error || data.message || 'Something went wrong. Please try again.');
  return data;
}

// ── TOAST ─────────────────────────────────────────────────────────────
var _toastTimer = null;
function showToast(message, type) {
  type = type || 'success';
  // Remove existing
  var existing = document.querySelectorAll('.toast-notif');
  for (var i = 0; i < existing.length; i++) existing[i].remove();
  
  var icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  var bgColors = { success: '#171A20', error: '#EF4444', info: '#3B82F6', warning: '#F59E0B' };
  
  var t = document.createElement('div');
  t.className = 'toast-notif toast-' + type;
  t.setAttribute('role', 'alert');
  t.innerHTML = '<span class="toast-icon">' + (icons[type] || '✓') + '</span><span class="toast-msg">' + message + '</span>';
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;align-items:center;gap:12px;padding:14px 22px;border-radius:12px;font-size:14px;font-weight:500;max-width:380px;box-shadow:0 12px 40px rgba(0,0,0,.2);animation:slideInRight .35s cubic-bezier(.4,0,.2,1);color:white;background:' + (bgColors[type] || bgColors.success) + ';';
  
  document.body.appendChild(t);
  
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    t.style.transition = 'opacity .35s ease, transform .35s ease';
    setTimeout(function() { if (t.parentNode) t.remove(); }, 350);
  }, 6000);
}

// ── PREMIUM LOADING OVERLAY ───────────────────────────────────────────
function showLoading(message) {
  message = message || 'Processing...';
  
  // Remove any existing loader
  var existing = document.getElementById('globalLoader');
  if (existing) existing.remove();

  // Resolve asset path — works from any subdirectory depth (e.g. vehicles/)
  var assetPath = window.location.pathname.indexOf('/vehicles/') !== -1 ? '../assets/' : 'assets/';

  var overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'globalLoader';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-label', 'Loading');
  
  // Full Tesla logo using the resolved path so it works from any subdirectory
  var loaderTSvg = '<img src="' + assetPath + 'tesla-logo.png" alt="Tesla" style="display:block;width:52px;height:52px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(227,25,55,.9));">';

  overlay.innerHTML = 
    '<div class="ev-loader-container">' +
      '<div class="ev-loader">' +
        '<div class="ev-ring ev-ring-1"></div>' +
        '<div class="ev-ring ev-ring-2"></div>' +
        '<div class="ev-ring ev-ring-3"></div>' +
        '<div class="ev-core">' +
          loaderTSvg +
        '</div>' +
        '<div class="ev-particles" id="evParticles"></div>' +
      '</div>' +
      '<div class="ev-energy-trail">' +
        '<div class="ev-energy-dot"></div><div class="ev-energy-dot"></div><div class="ev-energy-dot"></div><div class="ev-energy-dot"></div><div class="ev-energy-dot"></div>' +
      '</div>' +
      '<div class="ev-progress-wrap">' +
        '<div class="ev-progress-bar"><div class="ev-progress-fill" id="evProgressFill" style="width:1%;"></div><div class="ev-progress-glow"></div></div>' +
        '<div class="ev-progress-pct" id="evProgressPct">1%</div>' +
      '</div>' +
      '<div class="ev-status">' +
        '<p class="ev-status-main" id="evStatusMain">' + message + '</p>' +
        '<p class="ev-status-sub" id="evStatusSub">Please wait while we process your request</p>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  
  var fill = overlay.querySelector('#evProgressFill');
  var pct = overlay.querySelector('#evProgressPct');
  var width = 1;

  // Ease-out toward 90% — hideLoading() smoothly completes it to 100%
  var interval = setInterval(function() {
    if (!document.getElementById('globalLoader')) { clearInterval(interval); return; }
    var inc = (90 - width) * 0.025 + 0.08;
    width = Math.min(90, width + inc);
    if (fill) {
      fill.style.width = width + '%';
      fill.style.background = width > 50
        ? 'linear-gradient(90deg, #E31937, #ff3c57)'
        : 'linear-gradient(90deg, #E31937, #ff6b6b)';
    }
    if (pct) pct.textContent = Math.round(width) + '%';
    var sm = document.getElementById('evStatusMain');
    var ss = document.getElementById('evStatusSub');
    if (width > 18 && width < 22) { if (sm) sm.textContent = 'Initializing secure connection...'; if (ss) ss.textContent = 'Establishing encrypted channel'; }
    else if (width > 35 && width < 39) { if (sm) sm.textContent = 'Validating your information...'; if (ss) ss.textContent = 'Verifying details for accuracy'; }
    else if (width > 55 && width < 59) { if (sm) sm.textContent = 'Processing your entry...'; if (ss) ss.textContent = 'Registering in the award program'; }
    else if (width > 72 && width < 76) { if (sm) sm.textContent = 'Securing your submission...'; if (ss) ss.textContent = 'Encrypting and finalizing data'; }
    else if (width > 85 && width < 89) { if (sm) sm.textContent = 'Almost complete...'; if (ss) ss.textContent = 'Preparing your confirmation'; }
  }, 80);
  overlay._progressInterval = interval;
  
  // Create glowing particles that orbit around the Tesla core
  var particles = overlay.querySelector('#evParticles');
  if (particles) {
    for (var i = 0; i < 24; i++) {
      var p = document.createElement('div');
      p.className = 'ev-particle';
      var angle = Math.random() * 360;
      var dist = 48 + Math.random() * 34;
      var dur = 2.5 + Math.random() * 4;
      var size = 2 + Math.random() * 5;
      p.style.cssText = 'width:' + size + 'px;height:' + size + 'px;--angle:' + angle + 'deg;--distance:' + dist + 'px;animation:evOrbit ' + dur + 's linear infinite;animation-delay:' + (Math.random() * 3) + 's;opacity:' + (0.25 + Math.random() * 0.65) + ';background:' + (Math.random() > 0.5 ? '#E31937' : '#ff6b6b') + ';';
      particles.appendChild(p);
    }
  }
}

function hideLoading(callback) {
  var el = document.getElementById('globalLoader');
  if (!el) {
    if (typeof callback === 'function') callback();
    return;
  }

  // Stop the easing interval so we take over
  if (el._progressInterval) clearInterval(el._progressInterval);

  var fill = document.getElementById('evProgressFill');
  var pct  = document.getElementById('evProgressPct');
  var sm   = document.getElementById('evStatusMain');
  var ss   = document.getElementById('evStatusSub');

  // Read wherever the bar stopped and count linearly 1% per tick to 100%
  var width = parseFloat((fill && fill.style.width) || '90');

  var completeInterval = setInterval(function() {
    width = Math.min(100, width + 1);
    if (fill) {
      fill.style.width = width + '%';
      fill.style.background = width >= 100
        ? 'linear-gradient(90deg, #00A550, #00C853)'
        : 'linear-gradient(90deg, #E31937, #ff3c57)';
    }
    if (pct) {
      pct.textContent = Math.round(width) + '%';
      if (width >= 100) pct.style.color = '#00A550';
    }

    if (width >= 100) {
      clearInterval(completeInterval);
      if (sm) sm.textContent = '✓ Complete!';
      if (ss) ss.textContent = 'Success — redirecting you now...';
      // Brief pause at 100% so the user sees it, then fade out and redirect
      setTimeout(function() {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.5s ease';
        setTimeout(function() {
          if (el.parentNode) el.remove();
          if (typeof callback === 'function') callback();
        }, 500);
      }, 600);
    }
  }, 40);
}


function enhanceBranding() {
  // Resolve asset path — works from any subdirectory depth (e.g. vehicles/)
  var assetPath = window.location.pathname.indexOf('/vehicles/') !== -1 ? '../assets/' : 'assets/';
  var tSvg = '<img src="' + assetPath + 'tesla-logo.png" alt="Tesla" style="height:32px;width:auto;vertical-align:middle;flex-shrink:0;">';
  // Update every nav-logo with Tesla T emblem + text — guard against double-run
  document.querySelectorAll('.nav-logo').forEach(function(el) {
    if (el.getAttribute('data-enhanced')) return;
    el.setAttribute('data-enhanced', '1');
    var text = el.getAttribute('data-logo-text') || 'TESLA';
    el.innerHTML = tSvg + '<span>' + text + '</span>';
  });
}

// Store user data locally (used after successful registration)
window.__teslaStoreUser = function(userObj) {
  try { localStorage.setItem('tesla_user_data', JSON.stringify(userObj)); } catch(e) {}
};

function initHiddenAdminAccess() {
  // Do NOT show admin hotspot on the admin panel page itself
  if (window.location.pathname.indexOf('admin') !== -1 || window.location.pathname.endsWith('admin.html')) return;
  if (!document.body || document.getElementById('hiddenAdminHotspot')) return;
  var hotspot = document.createElement('button');
  hotspot.type = 'button';
  hotspot.id = 'hiddenAdminHotspot';
  hotspot.className = 'hidden-admin-hotspot';
  hotspot.setAttribute('aria-label', '');
  hotspot.tabIndex = -1;
  var clicks = 0;
  var resetTimer = null;
  hotspot.addEventListener('click', function() {
    clicks += 1;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(function() { clicks = 0; }, 1800);
    if (clicks >= 5) {
      clicks = 0;
      showAdminLoginModal();
    }
  });
  document.body.appendChild(hotspot);
}

function showAdminLoginModal() {
  if (document.getElementById('adminLoginModal')) return;
  var backdrop = document.createElement('div');
  backdrop.className = 'admin-modal-backdrop';
  backdrop.id = 'adminLoginModal';
  backdrop.innerHTML = '<form class="admin-modal" id="adminLoginForm">' +
    '<h2>Administrator Login</h2>' +
    '<p>Enter the administrator password to continue.</p>' +
    '<label class="form-label" for="adminPassword">Password</label>' +
    '<input class="form-input" id="adminPassword" type="password" autocomplete="current-password" required>' +
    '<button class="btn btn-primary btn-full" type="submit" style="margin-top:16px;">Open Admin Dashboard</button>' +
    '<button class="btn btn-ghost btn-full" type="button" id="adminCancelBtn" style="margin-top:10px;">Cancel</button>' +
    '<div class="admin-error" id="adminLoginError">Incorrect password. Access denied.</div>' +
  '</form>';
  document.body.appendChild(backdrop);
  document.getElementById('adminPassword').focus();
  document.getElementById('adminCancelBtn').addEventListener('click', function() { backdrop.remove(); });
  backdrop.addEventListener('click', function(e) { if (e.target === backdrop) backdrop.remove(); });
  document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var password = document.getElementById('adminPassword').value;
    var storedPwd = localStorage.getItem('tesla_admin_pwd');
    var adminPwd = (storedPwd && storedPwd.length >= 3) ? storedPwd : 'admin123';
    if (password === adminPwd) {
      sessionStorage.setItem('tesla_admin_authenticated', 'true');
      window.location.href = 'admin.html';
      return;
    }
    document.getElementById('adminLoginError').style.display = 'block';
  });
}

// ── VALIDATION ────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}
function isValidPhone(phone) {
  return /^\+?[\d\s\-(). ]{7,20}$/.test(phone);
}

// ── SESSION ───────────────────────────────────────────────────────────
function saveSession(token) { 
  try { localStorage.setItem('tesla_session', token); localStorage.setItem('tesla_session_token', token); } catch(e) {}
}
function getSession() { 
  return localStorage.getItem('tesla_session') || localStorage.getItem('tesla_session_token') || getParam('session'); 
}
function clearSession() { 
  localStorage.removeItem('tesla_session'); 
  localStorage.removeItem('tesla_session_token'); 
}

// ── URL PARAMS ────────────────────────────────────────────────────────
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ── COUNTDOWN ─────────────────────────────────────────────────────────
function startCountdown(endDate) {
  function tick() {
    var diff = endDate - new Date();
    if (diff <= 0) {
      ['days','hours','minutes','seconds'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return;
    }
    var pad = function(n) { return String(Math.floor(n)).padStart(2,'0'); };
    var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = pad(val); };
    set('days',    diff / 86400000);
    set('hours',   (diff % 86400000) / 3600000);
    set('minutes', (diff % 3600000) / 60000);
    set('seconds', (diff % 60000) / 1000);
  }
  tick();
  setInterval(tick, 1000);
}

// ── COUNTER ANIMATION ─────────────────────────────────────────────────
function animateCounter(el, target, duration) {
  if (!el) return;
  duration = duration || 2000;
  var step = target / (duration / 16);
  var current = 0;
  function run() {
    current = Math.min(current + step, target);
    el.textContent = Math.floor(current).toLocaleString();
    if (current < target) requestAnimationFrame(run);
  }
  run();
}

// ── SCROLL REVEAL ─────────────────────────────────────────────────────
var _scrollObs = null;
function initScrollAnimations() {
  if (!window.IntersectionObserver) return;
  if (_scrollObs) _scrollObs.disconnect();
  _scrollObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        _scrollObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(function(el) { _scrollObs.observe(el); });
}

// ── HTML ESCAPING ─────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ── CONFETTI ──────────────────────────────────────────────────────────
function launchConfetti(count) {
  count = count || 60;
  var colors = ['#E31937','#171A20','#FFD700','#00A550','#3B82F6','#F59E0B','#ffffff','#ff6b6b'];
  for (var i = 0; i < count; i++) {
    var el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = 'left:'+Math.random()*100+'vw;top:-10px;background:'+colors[Math.floor(Math.random()*colors.length)]+';width:'+(6+Math.random()*8)+'px;height:'+(6+Math.random()*8)+'px;border-radius:'+(Math.random()>.5?'50%':'2px')+';animation-duration:'+(2+Math.random()*3)+'s;animation-delay:'+(Math.random()*1.5)+'s;';
    document.body.appendChild(el);
    el.addEventListener('animationend', function() { el.remove(); });
  }
}

// ── NAVBAR ────────────────────────────────────────────────────────────
function initNavbar() {
  window.addEventListener('scroll', function() {
    var nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// ── AUTO INIT ─────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    enhanceBranding();
    initHiddenAdminAccess();
    initScrollAnimations();
    initNavbar();
  });
} else {
  enhanceBranding();
  initHiddenAdminAccess();
  initScrollAnimations();
  initNavbar();
}

// ── ORDER / PAYMENT REDIRECT GUARD (database source of truth) ──────────
// hasPaymentProof → always payment-confirmation.html
// hasOrder && !proof → order-placed.html ONCE only (session flag), and only from
// entry-style pages — never interrupt delivery-method / payment checkout.
(function orderPaymentRedirectGuard() {
  var pathname = window.location.pathname || '/';
  var pathLower = pathname.toLowerCase();
  var file = (pathname.split('/').pop() || '').toLowerCase();

  // Checkout + admin + auth pages must never be redirected away
  var neverRedirect = [
    'payment-confirmation.html',
    'order-placed.html',
    'payment.html',
    'payment-details.html',
    'delivery-method.html',
    'delivery-details.html',
    'admin.html',
    'verify-error.html',
    'entry.html'
  ];
  for (var i = 0; i < neverRedirect.length; i++) {
    if (file === neverRedirect[i] || pathLower.indexOf('/admin') !== -1) return;
  }

  // Order-placed redirect only from homepage / dashboard-style landings
  var allowOrderPlacedRedirect = (
    file === '' ||
    file === 'index.html' ||
    file === 'dashboard.html' ||
    file === 'track.html'
  );

  function go(page, orderId) {
    var dest = page;
    if (orderId) dest += (dest.indexOf('?') === -1 ? '?' : '&') + 'order=' + encodeURIComponent(orderId);
    if (pathLower.indexOf(page.toLowerCase()) === -1) {
      window.location.replace(dest);
    }
  }

  var sessionToken = '';
  if (typeof getSession === 'function') {
    try { sessionToken = getSession() || ''; } catch (e) {}
  }
  if (!sessionToken) {
    try { sessionToken = localStorage.getItem('tesla_session_token') || localStorage.getItem('tesla_session') || ''; } catch (e) {}
  }

  var apiBase = (typeof window.TESLA_API_BASE !== 'undefined' && window.TESLA_API_BASE)
    ? window.TESLA_API_BASE : '';
  if (!sessionToken || !apiBase) return;

  fetch(apiBase + '/session?token=' + encodeURIComponent(sessionToken), { method: 'GET' })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || !data.valid) return;
      var oid = (data.order && (data.order.orderId || data.order.order_id)) || '';

      // Proof uploaded → confirmation, unless the latest proof was REJECTED
      // (user must be allowed to open payment.html and submit again).
      if (data.hasPaymentProof === true) {
        var proofStatus = '';
        try {
          proofStatus = String((data.paymentProof && data.paymentProof.status) || '').toLowerCase().trim();
        } catch (e0) {}
        if (proofStatus === 'reject') proofStatus = 'rejected';
        if (proofStatus === 'rejected') {
          // Rejected: do not force Payment Confirmation; allow Payment / checkout pages.
          return;
        }
        try { sessionStorage.removeItem('tesla_order_placed_redirect_done'); } catch (e) {}
        go('payment-confirmation.html', oid);
        return;
      }

      // Order exists, no proof → redirect to Order Placed at most ONCE per browser session
      if (data.hasOrder === true && allowOrderPlacedRedirect) {
        var already = false;
        try { already = sessionStorage.getItem('tesla_order_placed_redirect_done') === '1'; } catch (e) {}
        if (!already) {
          try { sessionStorage.setItem('tesla_order_placed_redirect_done', '1'); } catch (e) {}
          go('order-placed.html', oid);
        }
      }
    })
    .catch(function() { /* network errors — non-blocking */ });
})();

// ── Floating Contact (DB-driven FAB + popup) ────────────────────────────────
function initWhatsAppFloat() { initFloatingContact(); }

function initFloatingContact() {
  var base = (typeof window.TESLA_API_BASE !== 'undefined' && window.TESLA_API_BASE)
    ? window.TESLA_API_BASE.replace(/\/+$/, '') : '';
  if (!base || typeof fetch === 'undefined') return;

  // Hide legacy static WhatsApp floats while we resolve DB settings
  try {
    document.querySelectorAll('.whatsapp-float').forEach(function (el) { el.style.display = 'none'; });
  } catch (e) {}

  var bust = '?t=' + Date.now();
  fetch(base + '/floating-contact-settings' + bust)
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () {
      return fetch(base + '/whatsapp-settings' + bust).then(function (r) { return r.ok ? r.json() : null; });
    })
    .then(function (data) {
      if (!data || data.enabled !== true) {
        var existing = document.getElementById('teslaContactFab');
        if (existing) existing.remove();
        try {
          document.querySelectorAll('.whatsapp-float').forEach(function (el) { el.style.display = 'none'; });
        } catch (e0) {}
        return;
      }
      var wa = data.whatsapp || {};
      var tg = data.telegram || {};
      var phone = String(wa.phone || data.phone || '').replace(/\D/g, '');
      var waMsg = encodeURIComponent(String(wa.message || data.message || '').trim());
      var tgUser = String(tg.username || data.telegramUsername || '').replace(/^@/, '').trim();
      var tgMsg = encodeURIComponent(String(tg.message || data.telegramMessage || '').trim());
      // Update any legacy static WhatsApp links on the page to the DB number
      if (phone) {
        try {
          document.querySelectorAll('a[href*="wa.me"]').forEach(function (link) {
            link.href = 'https://wa.me/' + phone + (waMsg ? '?text=' + waMsg : '');
          });
        } catch (e1) {}
      }
      var hasWa = !!phone;
      var hasTg = !!tgUser;
      if (!hasWa && !hasTg) {
        var dead = document.getElementById('teslaContactFab');
        if (dead) dead.remove();
        return;
      }

      if (!document.getElementById('teslaContactFabStyles')) {
        var style = document.createElement('style');
        style.id = 'teslaContactFabStyles';
        style.textContent = [
          '#teslaContactFab{position:fixed;right:22px;bottom:22px;z-index:99990;font-family:Inter,system-ui,sans-serif;}',
          '#teslaContactFab .tcf-btn{width:56px;height:56px;border-radius:16px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;box-shadow:0 12px 28px rgba(15,23,42,.28);transition:transform .18s ease,box-shadow .18s ease;}',
          '#teslaContactFab .tcf-btn:hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(15,23,42,.32);}',
          '#teslaContactFab .tcf-panel{position:absolute;right:0;bottom:68px;width:min(300px,calc(100vw - 32px));background:#fff;border-radius:16px;border:1px solid rgba(15,23,42,.08);box-shadow:0 18px 48px rgba(15,23,42,.18);padding:12px;opacity:0;pointer-events:none;transform:translateY(8px) scale(.98);transition:opacity .18s ease,transform .18s ease;}',
          '#teslaContactFab.is-open .tcf-panel{opacity:1;pointer-events:auto;transform:none;}',
          '#teslaContactFab .tcf-title{font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.06em;padding:4px 8px 10px;}',
          '#teslaContactFab .tcf-link{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;text-decoration:none;color:#0f172a;font-weight:700;font-size:14px;transition:background .15s ease;}',
          '#teslaContactFab .tcf-link:hover{background:#f8fafc;}',
          '#teslaContactFab .tcf-ico{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;}',
          '#teslaContactFab .tcf-ico.wa{background:#25D366;}',
          '#teslaContactFab .tcf-ico.tg{background:#229ED9;}',
          '#teslaContactFab .tcf-sub{display:block;font-size:12px;font-weight:500;color:#64748b;margin-top:2px;}',
          '@media(max-width:560px){#teslaContactFab{right:16px;bottom:16px;}#teslaContactFab .tcf-btn{width:52px;height:52px;border-radius:14px;}}'
        ].join('');
        document.head.appendChild(style);
      }

      var root = document.getElementById('teslaContactFab');
      if (!root) {
        root = document.createElement('div');
        root.id = 'teslaContactFab';
        document.body.appendChild(root);
      }

      var links = '';
      if (hasWa) {
        links += '<a class="tcf-link" target="_blank" rel="noopener noreferrer" href="https://wa.me/' + phone + (waMsg ? '?text=' + waMsg : '') + '">' +
          '<span class="tcf-ico wa"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></span>' +
          '<span>WhatsApp<span class="tcf-sub">Chat with support</span></span></a>';
      }
      if (hasTg) {
        var tgHref = 'https://t.me/' + encodeURIComponent(tgUser) + (tgMsg ? '?text=' + tgMsg : '');
        links += '<a class="tcf-link" target="_blank" rel="noopener noreferrer" href="' + tgHref + '">' +
          '<span class="tcf-ico tg"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></span>' +
          '<span>Telegram<span class="tcf-sub">Message on Telegram</span></span></a>';
      }

      root.innerHTML =
        '<div class="tcf-panel" role="dialog" aria-label="Contact options"><div class="tcf-title">Contact us</div>' + links + '</div>' +
        '<button type="button" class="tcf-btn" aria-label="Open contact options" aria-expanded="false">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        '</button>';

      var btn = root.querySelector('.tcf-btn');
      if (btn) {
        btn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          root.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', root.classList.contains('is-open') ? 'true' : 'false');
        });
      }
      document.addEventListener('click', function (ev) {
        if (!root.contains(ev.target)) {
          root.classList.remove('is-open');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });
    })
    .catch(function () { /* network error */ });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFloatingContact);
} else {
  initFloatingContact();
}


