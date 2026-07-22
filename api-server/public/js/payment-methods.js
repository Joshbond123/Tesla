/**
 * Payment Methods Store — Single Source of Truth
 * ==============================================================
 * Used by BOTH the Admin Panel (admin.html) and the Customer
 * Payment Page (payment.html). There is exactly ONE data shape
 * and ONE storage key, so any change an admin makes is reflected
 * on the customer page.
 *
 * Sync model:
 *   - localStorage ("tesla_payment_methods") is the instant, same-
 *     browser source of truth.
 *   - When a backend API is configured (window.TESLA_API_BASE),
 *     the store hydrates from it and pushes admin changes to it,
 *     giving cross-device sync once the edge function is deployed.
 *
 * Logos are local SVG files committed to the repo under
 * assets/payment-logos/ — no emoji, no third-party image URLs.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'tesla_payment_methods';
  var LOGO_DIR = 'assets/payment-logos/';

  // Known brand logo files (local). Custom methods may store an
  // uploaded data-URL directly in `logo` instead of a key here.
  var LOGO_KEYS = {
    paypal: 'paypal',
    cashapp: 'cashapp',
    venmo: 'venmo',
    zelle: 'zelle',
    bitcoin: 'bitcoin',
    ethereum: 'ethereum',
    'usdt-erc20': 'usdt-erc20',
    'usdt-trc20': 'usdt-trc20',
    creditcard: 'creditcard',
    applegift: 'applegift'
  };

  // ── Default methods with realistic (non-placeholder) demo data ──
  var DEFAULTS = [
    {
      id: 'paypal', name: 'PayPal', type: 'wallet',
      description: 'Pay securely with your PayPal account or linked card',
      logo: LOGO_DIR + 'paypal.svg', enabled: true, displayOrder: 1,
      config: {
        businessName: 'Tesla Global Awards LLC',
        email: 'payments@teslaglobalawards.com',
        merchantId: 'TM8XK2R9Q4ZPA',
        paypalMeLink: 'https://paypal.me/teslaglobalawards',
        instructions: 'Send the delivery fee via PayPal to our verified business account. Choose "Friends & Family" and include your Order ID in the note so we can match your payment quickly.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'cashapp', name: 'Cash App', type: 'wallet',
      description: 'Instant payment with your Cash App balance or debit card',
      logo: LOGO_DIR + 'cashapp.svg', enabled: true, displayOrder: 2,
      config: {
        cashtag: '$TeslaGlobalAwards',
        accountName: 'Tesla Global Awards',
        qrCode: '',
        instructions: 'Send the delivery fee to our $Cashtag above. Take a screenshot of the confirmation and upload it below as your payment proof.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'venmo', name: 'Venmo', type: 'wallet',
      description: 'Fast, secure payments with Venmo',
      logo: LOGO_DIR + 'venmo.svg', enabled: true, displayOrder: 3,
      config: {
        username: '@TeslaGlobalAwards',
        accountName: 'Tesla Global Awards LLC',
        qrCode: '',
        instructions: 'Send the delivery fee to our Venmo handle above and include your Order ID in the payment description.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'zelle', name: 'Zelle', type: 'bank',
      description: 'Send directly from your bank account with Zelle',
      logo: LOGO_DIR + 'zelle.svg', enabled: true, displayOrder: 4,
      config: {
        recipientName: 'Tesla Global Awards LLC',
        email: 'zelle@teslaglobalawards.com',
        phone: '+1 (415) 892-3401',
        instructions: 'Open Zelle in your banking app and send the delivery fee to our registered email or phone number above. Include your Order ID in the memo.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'bitcoin', name: 'Bitcoin (BTC)', type: 'crypto',
      description: 'Pay with Bitcoin on the Bitcoin network',
      logo: LOGO_DIR + 'bitcoin.svg', enabled: true, displayOrder: 5,
      config: {
        walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        network: 'Bitcoin Mainnet',
        qrCode: '',
        instructions: 'Send the delivery fee in BTC to the wallet address above. Always verify the address before sending. Use the Bitcoin network only.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'ethereum', name: 'Ethereum (ETH)', type: 'crypto',
      description: 'Pay with Ethereum on the ERC-20 network',
      logo: LOGO_DIR + 'ethereum.svg', enabled: true, displayOrder: 6,
      config: {
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        network: 'Ethereum Mainnet (ERC-20)',
        qrCode: '',
        instructions: 'Send the delivery fee in ETH to the wallet address above using the Ethereum Mainnet only. Transactions on other networks cannot be recovered.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'usdt-erc20', name: 'USDT (ERC-20)', type: 'crypto',
      description: 'Tether USDT on the Ethereum network',
      logo: LOGO_DIR + 'usdt-erc20.svg', enabled: true, displayOrder: 7,
      config: {
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        network: 'Ethereum Mainnet (ERC-20)',
        qrCode: '',
        instructions: 'Send the delivery fee in USDT to the wallet address above. Select the Ethereum / ERC-20 network. Gas fees apply.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'usdt-trc20', name: 'USDT (TRC-20)', type: 'crypto',
      description: 'Tether USDT on the TRON network — low fees',
      logo: LOGO_DIR + 'usdt-trc20.svg', enabled: true, displayOrder: 8,
      config: {
        walletAddress: 'TXfKzRsvHQhXGxXgCCqBkGYVEkmoZ6RXgN',
        network: 'TRON Mainnet (TRC-20)',
        qrCode: '',
        instructions: 'Send the delivery fee in USDT to the wallet address above using the TRON / TRC-20 network for low fees and fast confirmation.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'creditcard', name: 'Credit Card', type: 'card',
      description: 'Visa, Mastercard, American Express & Discover',
      logo: LOGO_DIR + 'creditcard.svg', enabled: true, displayOrder: 9,
      config: {
        instructions: 'We accept all major credit and debit cards. After placing your order you will receive a secure payment link to complete your transaction. Card details are processed with enterprise-grade encryption.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'applegift', name: 'Apple Gift Card', type: 'gift',
      description: 'Pay with an Apple Gift Card — upload front & back',
      logo: LOGO_DIR + 'applegift.svg', enabled: true, displayOrder: 10,
      config: {
        instructions: 'Upload clear photos of the front and back of your Apple Gift Card. The card must be valid and unscratched with the back code visible. We verify the balance and process your order within 24 hours.',
        requireFrontImage: true,
        requireBackImage: true,
        allowCameraCapture: true
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    }
  ];

  // ── Normalization ─────────────────────────────────────────────
  // Upgrades any legacy/flat records into the unified shape so old
  // localStorage payloads never break the UI.
  function normalize(m, index) {
    if (!m || typeof m !== 'object') return null;
    var out = {};
    out.id = m.id || ('pm-' + (Date.now() + (index || 0)));
    out.name = m.name || m.display_name || m.displayName || 'Payment Method';
    out.type = m.type || m.category || 'wallet';
    out.description = m.description || '';
    out.enabled = m.enabled !== false;
    out.displayOrder = m.displayOrder || m.sort_order || (index != null ? index + 1 : 999);
    out.lastUpdated = m.lastUpdated || m.updated_at || new Date().toISOString();

    // Logo: prefer an explicit path/data-URL; else map from a known key.
    var logo = m.logo || m.logo_url || '';
    if (logo && (logo.indexOf('/') !== -1 || logo.indexOf('data:') === 0 || logo.indexOf('.svg') !== -1)) {
      out.logo = logo;
    } else {
      var key = m.logoKey || (m.logo_id ? m.logo_id.replace(/^pay-/, '') : '') ||
                (LOGO_KEYS[out.id] ? out.id : '');
      out.logo = key && LOGO_KEYS[key] ? (LOGO_DIR + LOGO_KEYS[key] + '.svg') : (logo || '');
    }

    // Config: merge a nested config with any flat legacy fields.
    var c = {};
    var src = m.config && typeof m.config === 'object' ? m.config : {};
    ['accountName', 'email', 'walletAddress', 'accountNumber', 'qrCode',
     'instructions', 'cashtag', 'username', 'recipientName', 'phone',
     'merchantId', 'paypalMeLink', 'businessName', 'network',
     'requireFrontImage', 'requireBackImage', 'allowCameraCapture'].forEach(function (k) {
      if (src[k] !== undefined) c[k] = src[k];
    });
    // Legacy flat aliases
    if (c.walletAddress === undefined && m.wallet_address) c.walletAddress = m.wallet_address;
    if (c.instructions === undefined) c.instructions = m.payment_instructions || m.instructions || '';
    if (c.accountName === undefined && m.account_details) c.accountName = m.account_details;
    if (c.email === undefined && m.account_email) c.email = m.account_email;
    if (c.cashtag === undefined && m.cash_tag) c.cashtag = m.cash_tag;
    if (c.username === undefined && m.username) c.username = m.username;
    out.config = c;
    return out;
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) return null;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var n = normalize(list[i], i);
      if (n) out.push(n);
    }
    return out;
  }

  // ── Storage ───────────────────────────────────────────────────
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        var norm = normalizeList(parsed);
        if (norm && norm.length > 0) return norm;
      }
    } catch (e) {
      if (global.console) console.warn('[PaymentMethods] parse failed, using defaults');
    }
    var defaults = clone(DEFAULTS);
    save(defaults);
    return defaults;
  }

  function save(methods) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
    } catch (e) {
      if (global.console) console.error('[PaymentMethods] save failed:', e.message);
    }
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function sortByOrder(a, b) { return (a.displayOrder || 999) - (b.displayOrder || 999); }

  // ── Queries ───────────────────────────────────────────────────
  function getAll() { return load().sort(sortByOrder); }
  function getEnabled() { return load().filter(function (m) { return m.enabled; }).sort(sortByOrder); }
  function get(id) {
    var all = load();
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) return all[i]; }
    return null;
  }

  // ── Mutations (also push to backend, best-effort) ─────────────
  function add(method) {
    var methods = load();
    var n = normalize(method, methods.length);
    if (!n.id || get(n.id)) {
      n.id = (n.name || 'method').toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now();
    }
    n.lastUpdated = new Date().toISOString();
    if (!method.displayOrder) n.displayOrder = methods.length + 1;
    methods.push(n);
    save(methods);
    pushToApi();
    return n;
  }

  function update(id, updates) {
    var methods = load();
    for (var i = 0; i < methods.length; i++) {
      if (methods[i].id === id) {
        var merged = methods[i];
        Object.keys(updates).forEach(function (k) {
          if (k === 'config') {
            merged.config = merged.config || {};
            Object.keys(updates.config || {}).forEach(function (ck) { merged.config[ck] = updates.config[ck]; });
          } else {
            merged[k] = updates[k];
          }
        });
        merged.lastUpdated = new Date().toISOString();
        methods[i] = normalize(merged, i);
        save(methods);
        pushToApi();
        return methods[i];
      }
    }
    return null;
  }

  function remove(id) {
    var methods = load();
    var filtered = methods.filter(function (m) { return m.id !== id; });
    if (filtered.length === methods.length) return false;
    save(filtered);
    pushToApi();
    return true;
  }

  function reorder(orderedIds) {
    var methods = load();
    for (var i = 0; i < orderedIds.length; i++) {
      var m = methods.find(function (x) { return x.id === orderedIds[i]; });
      if (m) m.displayOrder = i + 1;
    }
    save(methods);
    pushToApi();
    return methods.sort(sortByOrder);
  }

  function toggle(id) {
    var m = get(id);
    if (!m) return null;
    return update(id, { enabled: !m.enabled });
  }

  function reset() {
    var defaults = clone(DEFAULTS);
    save(defaults);
    pushToApi();
    return defaults;
  }

  // ── Logo rendering ────────────────────────────────────────────
  function logoSrc(method) {
    if (!method) return '';
    if (method.logo) return method.logo;
    if (LOGO_KEYS[method.id]) return LOGO_DIR + LOGO_KEYS[method.id] + '.svg';
    return '';
  }

  function logoImg(method, size) {
    var src = logoSrc(method);
    var s = size || 40;
    var alt = (method && method.name ? String(method.name) : 'Payment') + ' logo';
    if (!src) {
      return '<span style="width:' + s + 'px;height:' + s + 'px;display:inline-flex;align-items:center;justify-content:center;' +
        'border-radius:11px;background:#eef1f6;color:#9aa4b2;font-weight:800;font-size:' + Math.round(s * 0.4) + 'px;">' +
        (method && method.name ? escapeHtml(method.name.charAt(0).toUpperCase()) : '?') + '</span>';
    }
    return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" width="' + s + '" height="' + s +
      '" style="width:' + s + 'px;height:' + s + 'px;object-fit:contain;border-radius:11px;display:block;" ' +
      'onerror="this.style.display=\'none\'">';
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Backend sync (best-effort) ────────────────────────────────
  function apiBase() {
    var b = global.TESLA_API_BASE;
    return b ? String(b).replace(/\/+$/, '') : '';
  }

  // Hydrate from backend. `scope` = 'admin' (all) or 'public' (enabled).
  // Calls cb() after attempting; UI can re-render regardless.
  function syncFromApi(scope, cb) {
    var base = apiBase();
    if (!base || !global.fetch) { if (cb) cb(false); return; }
    var path = scope === 'admin' ? '/admin/payment-methods' : '/payment-methods';
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    fetch(base + path, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var list = data && (data.methods || data.payment_methods);
        var norm = normalizeList(list);
        if (norm && norm.length > 0) save(norm);
        if (cb) cb(!!(norm && norm.length));
      })
      .catch(function () { if (cb) cb(false); })
      .then(function () { clearTimeout(t); });
  }

  // Push the full current set to the backend (bulk replace).
  function pushToApi() {
    var base = apiBase();
    if (!base || !global.fetch) return;
    try {
      fetch(base + '/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methods: load() })
      }).catch(function () {});
    } catch (e) { /* best-effort */ }
  }

  global.TeslaPaymentMethods = {
    STORAGE_KEY: STORAGE_KEY,
    LOGO_KEYS: LOGO_KEYS,
    defaults: DEFAULTS,
    normalize: normalize,
    load: load,
    save: function (m) { save(m); pushToApi(); },
    getAll: getAll,
    getEnabled: getEnabled,
    get: get,
    add: add,
    update: update,
    delete: remove,
    reorder: reorder,
    toggle: toggle,
    reset: reset,
    logoSrc: logoSrc,
    logoImg: logoImg,
    escapeHtml: escapeHtml,
    syncFromApi: syncFromApi,
    pushToApi: pushToApi
  };
})(window);
