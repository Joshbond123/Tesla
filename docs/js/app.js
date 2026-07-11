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

const configuredApiBase = normalizeApiBase(
  window.TESLA_API_BASE ||
  localStorage.getItem('tesla_api_base') ||
  ''
);

const isGitHubPages = window.location.hostname.endsWith('github.io');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if (configuredApiBase && !isValidApiBase(configuredApiBase)) {
  console.error('[Tesla] Invalid API base URL. It must end in /api:', configuredApiBase);
}

const API_BASE = isValidApiBase(configuredApiBase)
  ? configuredApiBase
  : (isLocalhost ? '/api' : (isGitHubPages ? '' : '/api'));

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
  
  const configError = getApiConfigurationError();
  if (configError) throw new Error(configError);

  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(API_BASE + endpoint, options);
  } catch (err) {
    throw new Error('Unable to reach the backend API. Please check your connection and try again.\n\nMake sure the API server is running at: ' + API_BASE);
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

  var overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'globalLoader';
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-label', 'Loading');
  
  overlay.innerHTML = 
    '<div class="ev-loader-container">' +
      '<div class="ev-loader">' +
        '<div class="ev-ring ev-ring-1"></div>' +
        '<div class="ev-ring ev-ring-2"></div>' +
        '<div class="ev-ring ev-ring-3"></div>' +
        '<div class="ev-core">' +
          '<svg class="ev-tesla-logo" viewBox="0 0 24 24" fill="none">' +
            '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3l7 4v2h-3v6h-2v-6H8V9H5l7-4z" fill="#E31937" stroke="#E31937" stroke-width="0.5"/>' +
          '</svg>' +
        '</div>' +
        '<div class="ev-particles" id="evParticles"></div>' +
      '</div>' +
      '<div class="ev-energy-trail">' +
        '<div class="ev-energy-dot"></div><div class="ev-energy-dot"></div><div class="ev-energy-dot"></div><div class="ev-energy-dot"></div><div class="ev-energy-dot"></div>' +
      '</div>' +
      '<div class="ev-progress-wrap">' +
        '<div class="ev-progress-bar"><div class="ev-progress-fill" id="evProgressFill"></div><div class="ev-progress-glow"></div></div>' +
        '<div class="ev-progress-pct" id="evProgressPct">0%</div>' +
      '</div>' +
      '<div class="ev-status">' +
        '<p class="ev-status-main" id="evStatusMain">' + message + '</p>' +
        '<p class="ev-status-sub" id="evStatusSub">Please wait while we process your request</p>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  
  // Animate progress bar with realistic charging curve
  var fill = overlay.querySelector('#evProgressFill');
  var pct = overlay.querySelector('#evProgressPct');
  var width = 0;
  var speed = 0.8;
  var interval = setInterval(function() {
    if (!document.getElementById('globalLoader')) { clearInterval(interval); return; }
    // Simulate a charging curve that slows down near 90%
    var target = Math.min(92, 92 * (1 - Math.exp(-width / 30)));
    width += (target - width) * 0.04 + 0.15;
    if (width > 91) width = 91;
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

function hideLoading() {
  var el = document.getElementById('globalLoader');
  if (!el) return;
  
  var fill = document.getElementById('evProgressFill');
  var pct = document.getElementById('evProgressPct');
  var sm = document.getElementById('evStatusMain');
  var ss = document.getElementById('evStatusSub');
  
  // Complete the progress bar
  if (fill) {
    fill.style.width = '100%';
    fill.style.background = 'linear-gradient(90deg, #00A550, #00C853)';
  }
  if (pct) {
    pct.textContent = '100%';
    pct.style.color = '#00A550';
  }
  if (sm) sm.textContent = '✓ Complete!';
  if (ss) ss.textContent = 'Success — redirecting you now...';
  
  if (el._progressInterval) clearInterval(el._progressInterval);
  
  // Fade out with a slight delay for the success animation
  setTimeout(function() {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s ease';
    setTimeout(function() { if (el.parentNode) el.remove(); }, 500);
  }, 600);
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
    initScrollAnimations();
    initNavbar();
  });
} else {
  initScrollAnimations();
  initNavbar();
}
