// Tesla Giveaway — shared browser configuration
(function (global) {
  'use strict';

  function normalize(v) { return String(v || '').trim().replace(/\/+$/, ''); }

  // 1) Explicit override
  // 2) Same-origin PHP API (InfinityFree / local Apache)
  // 3) Legacy Supabase edge (optional fallback during transition)
  var deployedApiBase = '__TESLA_API_BASE__';
  var injected = deployedApiBase.indexOf('__') !== 0;
  var supabaseFallback = 'https://puebwzumwqizgbmksrpq.supabase.co/functions/v1/tesla-api/api';

  var sameOriginApi = '';
  try {
    // Prefer /api when served from PHP-capable host
    if (global.location && /^https?:$/i.test(global.location.protocol)) {
      var path = global.location.pathname || '/';
      // If site lives in a subfolder, keep origin only; API is at /api
      sameOriginApi = global.location.origin + '/api';
      // GitHub Pages project sites: /Tesla/api won't exist — use fallback
      if (/github\.io$/i.test(global.location.hostname)) {
        sameOriginApi = '';
      }
    }
  } catch (e) {}

  global.TESLA_API_BASE = normalize(
    global.TESLA_API_BASE ||
    (injected ? deployedApiBase : '') ||
    sameOriginApi ||
    supabaseFallback
  );

  global.TESLA_CURRENCIES = [
    {code:'USD',symbol:'$',label:'US Dollar'},{code:'EUR',symbol:'€',label:'Euro'},
    {code:'GBP',symbol:'£',label:'British Pound'},{code:'CAD',symbol:'C$',label:'Canadian Dollar'},
    {code:'AUD',symbol:'A$',label:'Australian Dollar'},{code:'NGN',symbol:'₦',label:'Nigerian Naira'},
    {code:'GHS',symbol:'₵',label:'Ghanaian Cedi'},{code:'KES',symbol:'KSh',label:'Kenyan Shilling'},
    {code:'ZAR',symbol:'R',label:'South African Rand'},{code:'INR',symbol:'₹',label:'Indian Rupee'},
    {code:'JPY',symbol:'¥',label:'Japanese Yen'},{code:'CNY',symbol:'¥',label:'Chinese Yuan'},
    {code:'CHF',symbol:'Fr',label:'Swiss Franc'},{code:'AED',symbol:'AED',label:'UAE Dirham'},
    {code:'BRL',symbol:'R$',label:'Brazilian Real'}
  ];
  global.teslaCurrencySymbol = function(code) {
    var list = global.TESLA_CURRENCIES || [];
    for (var i=0;i<list.length;i++) if (list[i].code === code) return list[i].symbol;
    return code || '$';
  };
})(window);
