// ╔══════════════════════════════════════════════════════════╗
// ║     Tesla Vehicle Award Program — Shared Utilities       ║
// ║     Production v2.0 — Premium Experience                 ║
// ╚══════════════════════════════════════════════════════════╝

// ── API CONFIGURATION ──────────────────────────────────────────────────
const configuredApiBase = (window.TESLA_API_BASE || localStorage.getItem('tesla_api_base') || '').replace(/\/$/, '');
const isGitHubPages = window.location.hostname.endsWith('github.io');
const API_BASE = configuredApiBase || (isGitHubPages ? '' : '/api');

function getApiConfigurationError() {
  if (!API_BASE && isGitHubPages) {
    return 'The secure backend API is not configured for this GitHub Pages deployment.\n\n👉 Deploy the API server (see render.yaml in repo) and update docs/js/config.js with your API URL ending in /api.\n\nNeed help? Check the repo for one-click deploy instructions.';
  }
  if (!API_BASE) {
    return 'API base URL is not configured. Please set window.TESLA_API_BASE or deploy the backend server.';
  }
  return '';
}

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
    throw new Error('Unable to reach the backend API. Please check your connection and try again.');
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : { error: await res.text() };
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
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
  
  var existing = document.getElementById('globalLoader');
  if (existing) existing.remove();

  var el = document.createElement('div');
  el.className = 'loading-overlay';
  el.id = 'globalLoader';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-label', 'Loading');
  
  el.innerHTML = 
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

  document.body.appendChild(el);
  
  // Animate progress
  var fill = el.querySelector('#evProgressFill');
  var pct = el.querySelector('#evProgressPct');
  var width = 0;
  var interval = setInterval(function() {
    if (!document.getElementById('globalLoader')) { clearInterval(interval); return; }
    width += (94 - width) * 0.03;
    if (width > 93) width = 93;
    if (fill) fill.style.width = width + '%';
    if (pct) pct.textContent = Math.round(width) + '%';
    
    var sm = document.getElementById('evStatusMain');
    var ss = document.getElementById('evStatusSub');
    if (width > 25 && width < 28) { if (sm) sm.textContent = 'Validating information...'; if (ss) ss.textContent = 'Checking your details'; }
    else if (width > 50 && width < 54) { if (sm) sm.textContent = 'Securing your entry...'; if (ss) ss.textContent = 'Encrypting connection'; }
    else if (width > 75 && width < 78) { if (sm) sm.textContent = 'Almost there...'; if (ss) ss.textContent = 'Finalizing your request'; }
  }, 150);
  el._progressInterval = interval;
  
  // Create particles
  var particles = el.querySelector('#evParticles');
  if (particles) {
    for (var i = 0; i < 20; i++) {
      var p = document.createElement('div');
      p.className = 'ev-particle';
      var angle = Math.random() * 360;
      var dist = 50 + Math.random() * 30;
      var dur = 2 + Math.random() * 3;
      p.style.cssText = 'width:' + (2+Math.random()*4) + 'px;height:' + (2+Math.random()*4) + 'px;--angle:' + angle + 'deg;--distance:' + dist + 'px;animation:evOrbit ' + dur + 's linear infinite;animation-delay:' + Math.random()*2 + 's;opacity:' + (0.3+Math.random()*0.7) + ';';
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
  
  if (fill) fill.style.width = '100%';
  if (pct) pct.textContent = '100%';
  if (sm) sm.textContent = '✓ Complete!';
  if (ss) ss.textContent = 'Redirecting...';
  
  if (el._progressInterval) clearInterval(el._progressInterval);
  
  el.style.opacity = '0';
  el.style.transition = 'opacity 0.4s ease';
  setTimeout(function() { if (el.parentNode) el.remove(); }, 400);
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
    const diff = endDate - new Date();
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

// ── AUTO INIT ─────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollAnimations);
} else {
  initScrollAnimations();
}
