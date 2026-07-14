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

  function normalizeApiBase(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  global.TESLA_API_BASE = normalizeApiBase(
    global.TESLA_API_BASE || (hasInjectedApiBase ? deployedApiBase : '')
  );
})(window);
