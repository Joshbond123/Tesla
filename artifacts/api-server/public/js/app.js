// Tesla Giveaway - Shared Utilities
const API_BASE = window.location.origin.includes('localhost') 
  ? 'http://localhost:3001/api' 
  : '/api';

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Show loading overlay
function showLoading(message = 'Processing...') {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loadingOverlay';
  overlay.innerHTML = `
    <div class="tesla-spinner"></div>
    <p style="color:#aaa;font-size:14px;">${message}</p>
    <div class="charging-bar"><div class="charging-fill"></div></div>
  `;
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.remove();
}

// API helpers
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();
  
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// Validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate phone
function isValidPhone(phone) {
  return /^\+?[\d\s\-()]{7,15}$/.test(phone);
}

// Countdown timer
function startCountdown(endDate) {
  function update() {
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) {
      ['days','hours','minutes','seconds'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return;
    }
    
    const d = Math.floor(diff / (1000*60*60*24));
    const h = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
    const m = Math.floor((diff % (1000*60*60)) / (1000*60));
    const s = Math.floor((diff % (1000*60)) / 1000);
    
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val).padStart(2,'0'); };
    setEl('days', d); setEl('hours', h); setEl('minutes', m); setEl('seconds', s);
  }
  update();
  setInterval(update, 1000);
}

// Intersection Observer for scroll animations
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Animate counter
function animateCounter(el, target, duration = 2000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;
  
  function step() {
    current += increment;
    if (current >= target) { el.textContent = target.toLocaleString(); return; }
    el.textContent = Math.floor(current).toLocaleString();
    requestAnimationFrame(step);
  }
  step();
}

// Get URL params
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Set session in localStorage
function saveSession(token) {
  localStorage.setItem('tesla_session', token);
}

function getSession() {
  return localStorage.getItem('tesla_session');
}

function clearSession() {
  localStorage.removeItem('tesla_session');
}

// Navbar scroll effect
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.style.background = window.scrollY > 50 ? 'rgba(0,0,0,0.95)' : 'transparent';
    navbar.style.backdropFilter = window.scrollY > 50 ? 'blur(10px)' : 'none';
  });
}

// Mobile menu toggle
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;
  menu.classList.toggle('hidden-menu');
  menu.classList.toggle('visible-menu');
}
