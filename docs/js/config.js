// Tesla Giveaway — Backend API Configuration
// =============================================
//
// This file is the single source of truth for browser API discovery.
// GitHub Actions replaces __TESLA_API_BASE__ during deployment using the
// TESLA_API_BASE repository/environment variable or secret. The deployed value
// must be an HTTPS URL ending in /api, for example a Supabase Edge Function API
// endpoint such as https://<project-ref>.supabase.co/functions/v1/tesla-api/api.
//
// Local debugging may still override the deployed value with either:
//   ?api_url=http://localhost:10000/api
//   localStorage.setItem('tesla_api_base', 'http://localhost:10000/api')

(function configureTeslaApiBase(global) {
  'use strict';

  var deployedApiBase = '__TESLA_API_BASE__';
  var hasInjectedApiBase = deployedApiBase.indexOf('__') !== 0;

  // Built-in production fallback — used when CI injection did not run
  // (e.g. the repo variable was not set at deploy time). Keeps the site
  // functional even without a fresh re-deploy.
  var supabaseApiBase = 'https://puebwzumwqizgbmksrpq.supabase.co/functions/v1/tesla-api/api';

  function normalizeApiBase(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  global.TESLA_API_BASE = normalizeApiBase(
    global.TESLA_API_BASE || (hasInjectedApiBase ? deployedApiBase : supabaseApiBase)
  );

  // ── CURRENCY CATALOG (shared by admin + customer pages) ─────────────────────
  // Single source of truth for the currency dropdown and for rendering money.
  global.TESLA_CURRENCIES = [
    { code: "USD", symbol: "$",   label: "US Dollar" },
    { code: "EUR", symbol: "€",   label: "Euro" },
    { code: "GBP", symbol: "£",   label: "British Pound" },
    { code: "CAD", symbol: "C$",  label: "Canadian Dollar" },
    { code: "AUD", symbol: "A$",  label: "Australian Dollar" },
    { code: "NGN", symbol: "₦",   label: "Nigerian Naira" },
    { code: "GHS", symbol: "₵",   label: "Ghanaian Cedi" },
    { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
    { code: "ZAR", symbol: "R",   label: "South African Rand" },
    { code: "INR", symbol: "₹",   label: "Indian Rupee" },
    { code: "JPY", symbol: "¥",   label: "Japanese Yen" },
    { code: "CNY", symbol: "¥",   label: "Chinese Yuan" },
    { code: "CHF", symbol: "Fr",  label: "Swiss Franc" },
    { code: "AED", symbol: "AED", label: "UAE Dirham" },
    { code: "BRL", symbol: "R$",  label: "Brazilian Real" }
  ];
  // Resolve a currency code to its display symbol (falls back to the code/$).
  global.teslaCurrencySymbol = function (code) {
    var list = global.TESLA_CURRENCIES || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].code === code) return list[i].symbol;
    }
    return code || "$";
  };

  // ── PAYMENT CONFIRMATION VEHICLE IMAGE FIX ────────────────────────────────
  // payment-confirmation.html historically used a separate Tesla CDN image map.
  // Keep the displayed vehicle image tied to the model name rendered from the
  // actual order, so a stale/wrong CDN mapping cannot show another Tesla model.
  if (/payment-confirmation\.html$/i.test(global.location.pathname)) {
    var vehicleImages = {
      cybertruck: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/cybertruck-main.png',
      modely: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/modely-main.png',
      models: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/models-main.png',
      model3: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/model3-main.png',
      modelx: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/modelx-main.png'
    };

    function syncPaymentVehicleImage() {
      var image = document.getElementById('vehicleImg');
      var nameEl = document.getElementById('vehicleName');
      if (!image || !nameEl) return;

      var key = String(nameEl.textContent || '')
        .toLowerCase()
        .replace(/^tesla\s+/, '')
        .replace(/\s+/g, '');
      var expected = vehicleImages[key];
      if (expected && image.src !== expected) image.src = expected;
    }

    function observePaymentVehicleImage() {
      syncPaymentVehicleImage();
      var root = document.body || document.documentElement;
      if (!root || !global.MutationObserver) return;
      var observer = new MutationObserver(function () {
        syncPaymentVehicleImage();
      });
      observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src'] });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observePaymentVehicleImage, { once: true });
    } else {
      observePaymentVehicleImage();
    }
  }
})(window);
