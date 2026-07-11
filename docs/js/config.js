// Tesla Giveaway — Backend API Configuration
// =============================================
//
// This file is the single source of truth for browser API discovery.
// GitHub Actions replaces __TESLA_API_BASE__ during deployment using the
// TESLA_API_BASE repository/environment variable or secret.
//
// The production API is hosted as a Supabase Edge Function at:
//   https://puebwzumwqizgbmksrpq.supabase.co/functions/v1/tesla-api/api
//
// Local debugging may override the deployed value with:
//   ?api_url=http://localhost:10000/api
//   localStorage.setItem('tesla_api_base', 'http://localhost:10000/api')

(function configureTeslaApiBase(global) {
  'use strict';

  // The built-in production fallback URL — used when GitHub Actions
  // hasn't injected a custom value via __TESLA_API_BASE__ replacement.
  var PRODUCTION_API_BASE = 'https://puebwzumwqizgbmksrpq.supabase.co/functions/v1/tesla-api/api';

  var deployedApiBase = '__TESLA_API_BASE__';
  var hasInjectedApiBase = deployedApiBase.indexOf('__') !== 0;

  function normalizeApiBase(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function isValidApiBase(value) {
    if (!value) return false;
    try {
      var url = new URL(value, global.location.origin);
      return url.pathname.replace(/\/+$/, '').endsWith('/api');
    } catch (err) {
      return false;
    }
  }

  // Priority: 1) window.TESLA_API_BASE (set by URL param or external script)
  //           2) Injected value from GitHub Actions (__TESLA_API_BASE__ replacement)
  //           3) Production fallback (Supabase Edge Function)
  var resolved = normalizeApiBase(
    global.TESLA_API_BASE || (hasInjectedApiBase ? deployedApiBase : PRODUCTION_API_BASE)
  );

  // Validate and fall back to production URL if the resolved value is invalid
  if (!isValidApiBase(resolved)) {
    console.warn('[Tesla Config] Resolved API base is invalid, using production fallback:', resolved);
    resolved = PRODUCTION_API_BASE;
  }

  global.TESLA_API_BASE = resolved;
  console.log('[Tesla Config] API base initialized:', resolved);
})(window);
