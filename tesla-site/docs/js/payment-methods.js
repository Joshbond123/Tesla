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

  // ── Default methods with realistic professional mock data ──
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
        instructions: 'Send the delivery fee via PayPal to our verified business account. Select "Friends & Family" and include your Order ID in the note so we can match your payment quickly. Screenshot the confirmation and upload it as proof.'
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
        phone: '+1 (888) 472-3001',
        qrCode: '',
        instructions: 'Open Cash App and send the delivery fee to our verified $Cashtag. Add your Order ID in the "For" field. Screenshot the payment confirmation and upload it as your proof.'
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
        instructions: 'Send the delivery fee to our official Venmo handle. Include your Order ID in the payment description. Screenshot the confirmation screen and upload it as your payment proof.'
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
        instructions: 'Open Zelle in your banking app and send the delivery fee to our registered email or phone number. Include your Order ID in the memo field. Take a screenshot of the confirmation and upload it as proof.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'bitcoin', name: 'Bitcoin (BTC)', type: 'crypto',
      description: 'Pay with Bitcoin on the Bitcoin network',
      logo: LOGO_DIR + 'bitcoin.svg', enabled: true, displayOrder: 5,
      config: {
        walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        network: 'Bitcoin (BTC) — Mainnet',
        confirmations: '3 confirmations required',
        qrCode: '',
        instructions: 'Send the exact delivery fee amount in BTC to the wallet address above. Use the BTC network only — do not send from other chains. After sending, upload a screenshot of the transaction confirmation showing the TX hash.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'ethereum', name: 'Ethereum (ETH)', type: 'crypto',
      description: 'Pay with Ethereum (ETH)',
      logo: LOGO_DIR + 'ethereum.svg', enabled: true, displayOrder: 6,
      config: {
        walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        network: 'Ethereum Mainnet (ERC-20)',
        confirmations: '12 confirmations required',
        qrCode: '',
        instructions: 'Send the exact ETH equivalent of the delivery fee to our wallet address. Ensure you are using the Ethereum Mainnet. Upload a screenshot of the confirmed transaction as your payment proof.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'usdt-erc20', name: 'USDT (ERC-20)', type: 'crypto',
      description: 'Tether USD on the Ethereum network',
      logo: LOGO_DIR + 'usdt-erc20.svg', enabled: true, displayOrder: 7,
      config: {
        walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        network: 'Ethereum Mainnet (ERC-20)',
        tokenContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        qrCode: '',
        instructions: 'Send USDT using the ERC-20 network to the wallet address above. Double-check you select the ERC-20 network in your wallet app. Upload the confirmed transaction screenshot as proof.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'usdt-trc20', name: 'USDT (TRC-20)', type: 'crypto',
      description: 'Tether USD on the TRON network — lower fees',
      logo: LOGO_DIR + 'usdt-trc20.svg', enabled: true, displayOrder: 8,
      config: {
        walletAddress: 'TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS',
        network: 'TRON Network (TRC-20)',
        qrCode: '',
        instructions: 'Send USDT via TRC-20 (TRON) to the wallet address above. Select TRC-20 as the network in your exchange or wallet. Upload the confirmed transaction receipt screenshot as proof.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'creditcard', name: 'Credit / Debit Card', type: 'card',
      description: 'Visa, Mastercard, Amex, and Discover accepted',
      logo: LOGO_DIR + 'creditcard.svg', enabled: true, displayOrder: 9,
      config: {
        acceptedCards: 'Visa, Mastercard, American Express, Discover',
        processorName: 'Tesla Awards Secure Payments',
        merchantAccount: 'TGAWARDS-US-9041',
        supportPhone: '+1 (888) 472-3001',
        instructions: 'Enter your card details securely in the form below. All transactions are encrypted with 256-bit SSL. You will receive an email confirmation after your payment is processed.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'applegift', name: 'Apple Gift Card', type: 'gift',
      description: 'Pay with an Apple Gift Card — instant and private',
      logo: LOGO_DIR + 'applegift.svg', enabled: true, displayOrder: 10,
      config: {
        instructions: 'Purchase an Apple Gift Card from any Apple Store, Apple.com, or retail location. Scratch off the back to reveal the redemption code. Upload clear photos of both the FRONT and BACK of the card. Make sure the card code is fully visible and legible in your photo.',
        denominationsAccepted: '$25, $50, $100, $200 denominations accepted',
        purchaseLocations: 'Apple Store, Apple.com, Walmart, Target, Best Buy, CVS, Walgreens'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    }
  ];

  // ── Internal storage ────────────────────────────────────────────
  function load() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch (e) { return null; }
  }

  function save(list) {
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function sortByOrder(a, b) {
    return (a.displayOrder || 999) - (b.displayOrder || 999);
  }

  // ── Normalize a raw record to the standard shape ───────────────
  function normalize(m) {
    if (!m) return null;
    // Handle DB flat format (from Supabase REST API or backend /payment-methods endpoint)
    var isDbFormat = m.display_name !== undefined || m.wallet_address !== undefined || m.payment_instructions !== undefined || m.logo_url !== undefined || m.sort_order !== undefined;

    if (isDbFormat) {
      var cfg = {};
      // Parse account_details JSON if it's a JSON string
      if (m.account_details) {
        try { cfg = JSON.parse(m.account_details); } catch (e) { cfg = {}; }
      }
      // Merge flat DB fields into config
      if (m.wallet_address && !cfg.walletAddress) cfg.walletAddress = m.wallet_address;
      if (m.payment_instructions && !cfg.instructions) cfg.instructions = m.payment_instructions;
      if (m.qr_code_url && !cfg.qrCode) cfg.qrCode = m.qr_code_url;

      return {
        id: String(m.slug || m.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') || m.id,
        _dbId: m.id,  // keep the DB UUID for updates
        name: String(m.display_name || m.name || '').trim(),
        type: String(m.type || 'wallet').trim(),
        description: String(m.description || '').trim(),
        logo: m.logo_url || '',
        enabled: m.enabled !== false,
        displayOrder: m.sort_order || 0,
        config: cfg,
        lastUpdated: m.updated_at || m.created_at || ''
      };
    }

    // Frontend format — normalize in place
    return {
      id: String(m.id || '').trim() || String(m.name || '').toLowerCase().replace(/\s+/g, '-'),
      _dbId: m._dbId || null,
      name: String(m.name || m.display_name || '').trim(),
      type: String(m.type || 'wallet').trim(),
      description: String(m.description || '').trim(),
      logo: m.logo || m.logo_url || '',
      enabled: m.enabled !== false,
      displayOrder: m.displayOrder || m.sort_order || 0,
      config: m.config || {},
      lastUpdated: m.lastUpdated || m.updated_at || ''
    };
  }

  function normalizeList(list) {
    if (!Array.isArray(list) || list.length === 0) return null;
    return list.map(normalize).filter(Boolean);
  }

  // ── Public API ──────────────────────────────────────────────────
  function getAll() {
    var stored = load();
    return (stored || DEFAULTS).slice().sort(sortByOrder);
  }

  function getEnabled() {
    return getAll().filter(function (m) { return m.enabled; });
  }

  function get(id) {
    return getAll().find(function (m) { return m.id === id || m._dbId === id; }) || null;
  }

  function add(method) {
    var list = getAll();
    var norm = normalize(method);
    if (!norm) return null;
    if (!norm.id) norm.id = String(Date.now());
    norm.displayOrder = norm.displayOrder || (list.length + 1);
    list.push(norm);
    save(list);
    pushMethodToApi(norm, true);
    return norm;
  }

  function update(id, changes) {
    var list = getAll();
    var idx = list.findIndex(function (m) { return m.id === id || m._dbId === id; });
    if (idx === -1) return null;
    var updated = Object.assign({}, list[idx], normalize(changes));
    updated.id = list[idx].id;
    updated._dbId = list[idx]._dbId;
    updated.lastUpdated = new Date().toISOString();
    list[idx] = updated;
    save(list);
    pushMethodToApi(updated, false);
    return updated;
  }

  function remove(id) {
    var list = getAll().filter(function (m) { return m.id !== id && m._dbId !== id; });
    save(list);
    // Best-effort delete via API
    var base = apiBase();
    if (!base || !global.fetch) return;
    var existing = get(id);
    var dbId = existing && existing._dbId;
    if (dbId) {
      fetch(base + '/admin/payment-methods/' + encodeURIComponent(dbId), { method: 'DELETE' }).catch(function () {});
    }
  }

  function reorder(ids) {
    var list = getAll();
    ids.forEach(function (id, i) {
      var m = list.find(function (m) { return m.id === id; });
      if (m) m.displayOrder = i + 1;
    });
    save(list);
    pushToApi();
  }

  function toggle(id) {
    var list = getAll();
    var m = list.find(function (x) { return x.id === id || x._dbId === id; });
    if (!m) return null;
    m.enabled = !m.enabled;
    m.lastUpdated = new Date().toISOString();
    save(list);
    pushMethodToApi(m, false);
    return m;
  }

  function reset() {
    save(DEFAULTS.slice());
    pushToApi();
  }

  // ── Logo helpers ───────────────────────────────────────────────
  function logoSrc(method) {
    var l = method.logo || method.logo_url;
    if (!l) {
      var key = LOGO_KEYS[method.id] || LOGO_KEYS[String(method.name || '').toLowerCase()];
      if (key) return LOGO_DIR + key + '.svg';
      return '';
    }
    if (/^(https?:|data:)/.test(l)) return l;
    if (/^assets\//.test(l)) return l;
    return LOGO_DIR + l + '.svg';
  }

  function logoImg(method, size) {
    size = size || 32;
    var src = logoSrc(method);
    var label = escapeHtml(method.name || 'Payment');
    if (src) {
      return '<img src="' + src + '" alt="' + label + '" width="' + size + '" height="' + size +
        '" style="object-fit:contain;display:block;" onerror="this.style.display=\'none\'">';
    }
    var ch = String(method.name || '?').charAt(0).toUpperCase();
    var colors = ['#4f46e5','#7c3aed','#0891b2','#059669','#d97706','#dc2626'];
    var bg = colors[ch.charCodeAt(0) % colors.length];
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:6px;background:' + bg +
      ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:' + Math.round(size * 0.44) + 'px;">' + ch + '</div>';
  }

  function escapeHtml(s) {
    return s == null ? '' : String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── API sync ───────────────────────────────────────────────────
  function apiBase() {
    var b = global.TESLA_API_BASE;
    return (b && typeof b === 'string') ? b.replace(/\/+$/, '') : '';
  }

  // Map frontend format → DB columns for API calls
  function toDbFormat(m) {
    var config = m.config || {};
    var primaryAddress = config.walletAddress || config.cashtag || config.username ||
      config.email || config.paypalMeLink || config.phone || config.recipientName || '';
    return {
      slug: String(m.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: m.name || m.id,
      display_name: m.name || m.id,
      type: m.type || 'wallet',
      enabled: m.enabled !== false,
      logo_url: m.logo || '',
      wallet_address: primaryAddress,
      account_details: JSON.stringify(config),
      payment_instructions: config.instructions || '',
      sort_order: m.displayOrder || 0,
      _db_id: m._dbId || null
    };
  }

  // Push a single method to the API (upsert by slug)
  function pushMethodToApi(method, isNew) {
    var base = apiBase();
    if (!base || !global.fetch) return;
    var dbMethod = toDbFormat(method);
    var dbId = method._dbId;
    try {
      if (!isNew && dbId) {
        // Update existing record
        fetch(base + '/admin/payment-methods/' + encodeURIComponent(dbId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbMethod)
        }).then(function(r) {
          return r.ok ? r.json() : null;
        }).then(function(data) {
          if (data && data._db_id) {
            // Store returned UUID for future updates
            var list = load() || [];
            var m = list.find(function(x) { return x.id === method.id; });
            if (m) { m._dbId = data._db_id; save(list); }
          }
        }).catch(function () {});
      } else {
        // Upsert by slug (create or update by name)
        fetch(base + '/admin/payment-methods/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbMethod)
        }).then(function(r) {
          return r.ok ? r.json() : null;
        }).then(function(data) {
          if (data && data._db_id) {
            // Store the UUID so future edits use PUT
            var list = load() || [];
            var m = list.find(function(x) { return x.id === method.id; });
            if (m) { m._dbId = data._db_id; save(list); }
          }
        }).catch(function () {});
      }
    } catch (e) { /* best-effort */ }
  }

  // Push all methods (used for reorder/reset)
  function pushToApi() {
    var list = getAll();
    list.forEach(function(m) { pushMethodToApi(m, !m._dbId); });
  }

  // Pull from API and merge into localStorage
  function syncFromApi(scope, cb) {
    var base = apiBase();
    if (!base || !global.fetch) { if (cb) cb(false); return; }
    var path = scope === 'admin' ? '/admin/payment-methods' : '/payment-methods';
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    fetch(base + path, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var list = data && (data.methods || data.payment_methods || data);
        if (Array.isArray(list) && list.length > 0) {
          var norm = normalizeList(list);
          if (norm && norm.length > 0) {
            save(norm);
            if (cb) cb(true);
          } else { if (cb) cb(false); }
        } else { if (cb) cb(false); }
      })
      .catch(function () { if (cb) cb(false); })
      .then(function () { clearTimeout(t); });
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
    pushToApi: pushToApi,
    pushMethodToApi: pushMethodToApi,
    toDbFormat: toDbFormat
  };
})(window);
