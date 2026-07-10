// Tesla Giveaway — Shared Utilities

// API base (same origin, always /api)
const API_BASE = '/api';

// ── API ──────────────────────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

// ── TOAST ─────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  t.innerHTML = `<span style="font-weight:700;font-size:16px;">${icons[type]||'✓'}</span> ${message}`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    t.style.transition = 'opacity .3s ease, transform .3s ease';
    setTimeout(() => t.remove(), 300);
  }, 4000);
}

// ── LOADING ───────────────────────────────────────────────────────────
function showLoading(message = 'Processing...') {
  if (document.getElementById('globalLoader')) return;
  const el = document.createElement('div');
  el.className = 'loading-overlay';
  el.id = 'globalLoader';
  el.innerHTML = `
    <div class="spinner"></div>
    <p style="color:rgba(255,255,255,.8);font-size:15px;font-weight:500;margin-top:8px;">${message}</p>
    <div class="charging-bar" style="margin-top:12px;"><div class="charging-fill"></div></div>
  `;
  document.body.appendChild(el);
}
function hideLoading() {
  const el = document.getElementById('globalLoader');
  if (el) el.remove();
}

// ── VALIDATION ────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}
function isValidPhone(phone) {
  return /^\+?[\d\s\-(). ]{7,20}$/.test(phone);
}

// ── SESSION ───────────────────────────────────────────────────────────
function saveSession(token) { localStorage.setItem('tesla_session', token); }
function getSession() { return localStorage.getItem('tesla_session'); }
function clearSession() { localStorage.removeItem('tesla_session'); }

// ── URL PARAMS ────────────────────────────────────────────────────────
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ── COUNTDOWN ─────────────────────────────────────────────────────────
function startCountdown(endDate) {
  function tick() {
    const diff = endDate - new Date();
    if (diff <= 0) {
      ['days','hours','minutes','seconds'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return;
    }
    const pad = n => String(Math.floor(n)).padStart(2,'0');
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = pad(val); };
    set('days',    diff / 86400000);
    set('hours',   (diff % 86400000) / 3600000);
    set('minutes', (diff % 3600000) / 60000);
    set('seconds', (diff % 60000) / 1000);
  }
  tick();
  setInterval(tick, 1000);
}

// ── COUNTER ANIMATION ─────────────────────────────────────────────────
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

// ── SCROLL REVEAL ─────────────────────────────────────────────────────
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

// Auto-init scroll animations
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollAnimations);
} else {
  initScrollAnimations();
}
