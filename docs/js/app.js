// Tesla Giveaway — Shared Utilities & Premium Loading System
// ===========================================================

// ── API CONFIGURATION ──────────────────────────────────────────────────
const configuredApiBase = (window.TESLA_API_BASE || localStorage.getItem('tesla_api_base') || '').replace(/\/$/, '');
const isGitHubPages = window.location.hostname.endsWith('github.io');
const API_BASE = configuredApiBase || (isGitHubPages ? '' : '/api');

function getApiConfigurationError() {
  if (!API_BASE && isGitHubPages) {
    return 'The secure backend API is not configured for this GitHub Pages deployment. Set window.TESLA_API_BASE in docs/js/config.js to your hosted API URL ending in /api.';
  }
  return '';
}

// ── API CALLS ──────────────────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  const configError = getApiConfigurationError();
  if (configError) throw new Error(configError);

  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, options);
  } catch (err) {
    throw new Error(`Unable to reach the secure backend API. Confirm the API is deployed, CORS is enabled, and TESLA_API_BASE points to it. ${err?.message || ''}`.trim());
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : { error: await res.text() };
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

// ── TOAST NOTIFICATIONS ────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  t.innerHTML = `<span style="font-weight:700;font-size:16px;">${icons[type] || '✓'}</span> ${message}`;
  document.body.appendChild(t);

  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    t.style.transition = 'opacity .3s ease, transform .3s ease';
    setTimeout(() => t.remove(), 300);
  }, 6500);
}

// ── PREMIUM LOADING SYSTEM ─────────────────────────────────────────────
// Multi-phase loading with Tesla-inspired premium design

const loadingPhases = [
  { pct: 10,  step: 'Initializing Secure Connection',      sub: 'Establishing encrypted channel' },
  { pct: 25,  step: 'Validating Your Information',        sub: 'Verifying entry credentials' },
  { pct: 40,  step: 'Securing Your Entry',                sub: 'Checking for duplicate submissions' },
  { pct: 55,  step: 'Processing Your Request',            sub: 'Encrypting your personal data' },
  { pct: 70,  step: 'Preparing Verification',             sub: 'Generating secure verification token' },
  { pct: 85,  step: 'Sending Confirmation Email',         sub: 'Delivering to your inbox' },
  { pct: 100, step: 'Entry Confirmed Successfully',       sub: 'Redirecting to your dashboard' },
];

let loadingPhaseIndex = 0;
let loadingInterval = null;

function showLoading(message = 'Processing...') {
  // Remove any existing loader
  hideLoading();

  const overlay = document.createElement('div');
  overlay.className = 'premium-loader-overlay';
  overlay.id = 'globalLoader';
  overlay.innerHTML = `
    <div class="premium-loader-container">
      <!-- Central Energy Ring -->
      <div class="energy-ring-wrapper">
        <div class="energy-ring">
          <div class="energy-ring-inner"></div>
          <svg class="energy-ring-svg" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" class="ring-track"/>
            <circle cx="100" cy="100" r="88" class="ring-progress" id="ringProgress"/>
          </svg>
        </div>
        <div class="energy-core">
          <div class="tesla-icon">⚡</div>
          <div class="energy-particles">
            <span class="particle p1"></span>
            <span class="particle p2"></span>
            <span class="particle p3"></span>
            <span class="particle p4"></span>
            <span class="particle p5"></span>
            <span class="particle p6"></span>
          </div>
        </div>
      </div>

      <!-- Status Text -->
      <div class="loader-status">
        <h3 class="loader-step-text" id="loaderStepText">${message}</h3>
        <p class="loader-sub-text" id="loaderSubText">Securing your Tesla Award session</p>
      </div>

      <!-- Progress Bar -->
      <div class="premium-progress-wrap">
        <div class="premium-progress-bar">
          <div class="premium-progress-fill" id="premiumProgressFill"></div>
          <div class="premium-progress-glow"></div>
        </div>
        <span class="premium-progress-pct" id="premiumProgressPct">0%</span>
      </div>

      <!-- Sequential dots -->
      <div class="loader-dots">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="dot"></span><span class="dot"></span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Reset phase
  loadingPhaseIndex = 0;
  updateLoaderPhase(0);

  // Auto-advance phases
  loadingInterval = setInterval(() => {
    if (loadingPhaseIndex < loadingPhases.length - 1) {
      loadingPhaseIndex++;
      updateLoaderPhase(loadingPhaseIndex);
    }
  }, 1500);
}

function updateLoaderPhase(index) {
  const phase = loadingPhases[Math.min(index, loadingPhases.length - 1)];
  const stepEl = document.getElementById('loaderStepText');
  const subEl = document.getElementById('loaderSubText');
  const progressFill = document.getElementById('premiumProgressFill');
  const progressPct = document.getElementById('premiumProgressPct');
  const ring = document.getElementById('ringProgress');

  if (stepEl) stepEl.textContent = phase.step;
  if (subEl) subEl.textContent = phase.sub;

  const pct = phase.pct;
  if (progressFill) {
    progressFill.style.width = pct + '%';
    progressFill.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
  }
  if (progressPct) {
    progressPct.textContent = pct + '%';
    progressPct.style.transition = 'color 0.5s ease';
  }

  // Animate SVG ring
  if (ring) {
    const circumference = 2 * Math.PI * 88; // r=88
    const offset = circumference - (pct / 100) * circumference;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = offset;
    ring.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
  }
}

function hideLoading() {
  if (loadingInterval) { clearInterval(loadingInterval); loadingInterval = null; }
  const el = document.getElementById('globalLoader');
  if (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s ease';
    setTimeout(() => el.remove(), 400);
  }
}

// ── VALIDATION ─────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}
function isValidPhone(phone) {
  return /^\+?[\d\s\-(). ]{7,20}$/.test(phone);
}

// ── SESSION MANAGEMENT ─────────────────────────────────────────────────
function saveSession(token) {
  localStorage.setItem('tesla_session', token);
  localStorage.setItem('tesla_session_token', token);
}
function getSession() {
  return localStorage.getItem('tesla_session') || localStorage.getItem('tesla_session_token') || getParam('session');
}
function clearSession() {
  localStorage.removeItem('tesla_session');
  localStorage.removeItem('tesla_session_token');
}

// ── URL PARAMS ─────────────────────────────────────────────────────────
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ── COUNTDOWN ──────────────────────────────────────────────────────────
function startCountdown(endDate) {
  function tick() {
    const diff = endDate - new Date();
    if (diff <= 0) {
      ['days', 'hours', 'minutes', 'seconds'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return;
    }
    const pad = n => String(Math.floor(n)).padStart(2, '0');
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = pad(val); };
    set('days', diff / 86400000);
    set('hours', (diff % 86400000) / 3600000);
    set('minutes', (diff % 3600000) / 60000);
    set('seconds', (diff % 60000) / 1000);
  }
  tick();
  setInterval(tick, 1000);
}

// ── COUNTER ANIMATION ──────────────────────────────────────────────────
function animateCounter(el, target, duration = 2000) {
  if (!el) return;
  const step = target / (duration / 16);
  let current = 0;
  const run = () => {
    current = Math.min(current + step, target);
    el.textContent = Math.floor(current).toLocaleString();
    if (current < target) requestAnimationFrame(run);
  };
  run();
}

// ── SCROLL REVEAL ──────────────────────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── HTML ESCAPING ──────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── CONFETTI ───────────────────────────────────────────────────────────
function launchConfetti(count = 60) {
  const colors = ['#E31937', '#171A20', '#FFD700', '#00A550', '#3B82F6', '#F59E0B', '#ffffff'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left:${Math.random() * 100}vw; top:-10px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      width:${6 + Math.random() * 8}px; height:${6 + Math.random() * 8}px;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration:${2 + Math.random() * 3}s;
      animation-delay:${Math.random() * 1.5}s;
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ── NAVIGATION ─────────────────────────────────────────────────────────
function initNavbar() {
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initScrollAnimations();
  });
} else {
  initNavbar();
  initScrollAnimations();
}
