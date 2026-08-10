// Tesla Giveaway — shared browser configuration
(function (global) {
  'use strict';

  var deployedApiBase = '__TESLA_API_BASE__';
  var fallbackApiBase = 'https://puebwzumwqizgbmksrpq.supabase.co/functions/v1/tesla-api/api';
  var injected = deployedApiBase.indexOf('__') !== 0;
  function normalize(v) { return String(v || '').trim().replace(/\/+$/, ''); }
  global.TESLA_API_BASE = normalize(global.TESLA_API_BASE || (injected ? deployedApiBase : fallbackApiBase));

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

