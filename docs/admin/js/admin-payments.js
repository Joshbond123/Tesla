// ╔══════════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Payment Methods (v4)            ║
// ║  Per-slug dedicated edit interfaces · Custom methods        ║
// ║  Supabase-first · Premium UI · No generic PayPal leakage   ║
// ╚══════════════════════════════════════════════════════════════╝
(function () {
  'use strict';

  var PM = window.TeslaPaymentMethods;
  var esc = (PM && PM.escapeHtml) ? PM.escapeHtml : function (s) {
    return s == null ? '' : String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // Upload buffers for open drawer
  var _logoUpload = null; // data URL or null
  var _qrUpload   = null; // data URL, '' (cleared), or null (untouched)
  var _editingId  = null; // id of method being edited, null = new

  // ── Utilities ──────────────────────────────────────────────────
  function $id(id)        { return document.getElementById(id); }
  function val(id)        { var e = $id(id); return e ? e.value : ''; }
  function setText(id, v) { var e = $id(id); if (e) e.textContent = v; }
  function _setVal(id, v) { var e = $id(id); if (e) e.value = (v == null ? '' : v); }

  function typeLabel(t) {
    return ({ wallet: 'Wallet / App', bank: 'Bank Transfer', crypto: 'Cryptocurrency', card: 'Card', gift: 'Gift Card' }[t]) || 'Other';
  }

  function typeColor(t) {
    return ({ wallet: '#3B82F6', bank: '#8B5CF6', crypto: '#F59E0B', card: '#10B981', gift: '#EC4899' }[t]) || '#94A3B8';
  }

  function typeIcon(t) {
    var icons = {
      wallet: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>',
      bank:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12,2 20,7 4,7"/></svg>',
      crypto: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.5 9H14a2 2 0 0 1 0 4H9.5V9z"/><path d="M9.5 13H15a2 2 0 0 1 0 4H9.5v-4z"/><line x1="9.5" y1="9" x2="9.5" y2="19"/><line x1="12" y1="7" x2="12" y2="9"/><line x1="12" y1="19" x2="12" y2="21"/></svg>',
      card:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
      gift:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>'
    };
    return icons[t] || icons.wallet;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getConfigSummary(m) {
    var c = m.config || {};
    if (c.walletAddress) return c.walletAddress;
    if (c.cashtag) return c.cashtag;
    if (c.email) return c.email;
    if (c.phone) return c.phone;
    if (c.username) return c.username;
    if (c.paypalMeLink) return c.paypalMeLink;
    if (c.recipientName) return c.recipientName;
    if (c.accountName) return c.accountName;
    if (c.network) return c.network;
    return '';
  }

  function showToast(msg, type) {
    var existing = $id('pm3Toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.id = 'pm3Toast';
    t.className = 'pm3-toast' + (type === 'error' ? ' pm3-toast--error' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('pm3-toast--show'); });
    setTimeout(function () {
      t.classList.remove('pm3-toast--show');
      setTimeout(function () { t.remove(); }, 300);
    }, 3000);
  }

  // ─────────────────────────────────────────────────────────────────
  // METHOD SCHEMAS — defines exact fields per payment method slug
  // This is the authoritative fix: each method has its own schema,
  // so editPaymentMethod always renders the correct dedicated fields.
  // ─────────────────────────────────────────────────────────────────
  var METHOD_SCHEMAS = {

    paypal: {
      label: 'PayPal',
      type: 'wallet',
      fields: [
        { id: 'drw_email',       key: 'email',       label: 'PayPal Email',                    inputType: 'email',    placeholder: 'payments@example.com',          required: true  },
        { id: 'drw_accountName', key: 'accountName', label: 'Account Holder Name (optional)',  inputType: 'text',     placeholder: 'Your Name or Business Name',    required: false },
        { id: 'drw_paypalMe',    key: 'paypalMeLink',label: 'PayPal.me Link (optional)',        inputType: 'text',     placeholder: 'https://paypal.me/yourname',    required: false },
        { id: 'drw_instructions',key: 'instructions',label: 'Payment Instructions',            inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
        { id: 'drw_qr',          key: 'qrCode',      label: 'QR Code (optional)',              inputType: 'qr' },
      ]
    },

    cashapp: {
      label: 'Cash App',
      type: 'wallet',
      fields: [
        { id: 'drw_cashtag',     key: 'cashtag',     label: 'Cashtag',                         inputType: 'text',     placeholder: '$YourCashtag',                 required: true  },
        { id: 'drw_accountName', key: 'accountName', label: 'Account Holder Name (optional)',  inputType: 'text',     placeholder: 'Your Name',                    required: false },
        { id: 'drw_qr',          key: 'qrCode',      label: 'QR Code (optional)',              inputType: 'qr' },
        { id: 'drw_instructions',key: 'instructions',label: 'Payment Instructions',            inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },

    venmo: {
      label: 'Venmo',
      type: 'wallet',
      fields: [
        { id: 'drw_username',    key: 'username',    label: 'Venmo Username (optional)',       inputType: 'text',     placeholder: '@YourVenmoUsername',            required: false },
        { id: 'drw_accountName', key: 'accountName', label: 'Account Holder Name (optional)',  inputType: 'text',     placeholder: 'Your Name',                    required: false },
        { id: 'drw_qr',          key: 'qrCode',      label: 'QR Code (optional)',              inputType: 'qr' },
        { id: 'drw_instructions',key: 'instructions',label: 'Payment Instructions',            inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },

    zelle: {
      label: 'Zelle',
      type: 'bank',
      fields: [
        { id: 'drw_recipientName',key: 'recipientName',label: 'Recipient Name',              inputType: 'text',     placeholder: 'Your Name or Business Name',    required: true  },
        { id: 'drw_email',        key: 'email',       label: 'Email (optional)',              inputType: 'email',    placeholder: 'zelle@example.com',            required: false },
        { id: 'drw_phone',        key: 'phone',       label: 'Phone Number (optional)',       inputType: 'tel',      placeholder: '+1 (555) 000-0000',            required: false },
        { id: 'drw_bankName',     key: 'bankName',    label: 'Bank Name (optional)',          inputType: 'text',     placeholder: 'Chase, Wells Fargo, etc.',     required: false },
        { id: 'drw_instructions', key: 'instructions',label: 'Payment Instructions',          inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },

    bitcoin: {
      label: 'Bitcoin (BTC)',
      type: 'crypto',
      fields: [
        { id: 'drw_walletAddress',key: 'walletAddress',label: 'Wallet Address',              inputType: 'text',     placeholder: 'bc1q...',                      required: true  },
        { id: 'drw_walletLabel',  key: 'walletLabel', label: 'Wallet Label',                 inputType: 'text',     placeholder: 'Bitcoin Mainnet Wallet',       required: false },
        { id: 'drw_network',      key: 'network',     label: 'Network',                      inputType: 'text',     placeholder: 'Bitcoin (BTC) — Mainnet',      required: false },
        { id: 'drw_qr',           key: 'qrCode',      label: 'QR Code (optional)',            inputType: 'qr' },
        { id: 'drw_instructions', key: 'instructions',label: 'Payment Instructions',          inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },

    ethereum: {
      label: 'Ethereum (ETH)',
      type: 'crypto',
      fields: [
        { id: 'drw_walletAddress',key: 'walletAddress',label: 'Wallet Address',              inputType: 'text',     placeholder: '0x...',                        required: true  },
        { id: 'drw_walletLabel',  key: 'walletLabel', label: 'Wallet Label',                 inputType: 'text',     placeholder: 'Ethereum Mainnet Wallet',      required: false },
        { id: 'drw_network',      key: 'network',     label: 'Network',                      inputType: 'text',     placeholder: 'Ethereum (ETH) — Mainnet',     required: false },
        { id: 'drw_qr',           key: 'qrCode',      label: 'QR Code (optional)',            inputType: 'qr' },
        { id: 'drw_instructions', key: 'instructions',label: 'Payment Instructions',          inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },

    'usdt-erc20': {
      label: 'USDT (ERC-20)',
      type: 'crypto',
      fields: [
        { id: 'drw_walletAddress',key: 'walletAddress',label: 'Wallet Address',              inputType: 'text',     placeholder: '0x...',                        required: true  },
        { id: 'drw_network',      key: 'network',     label: 'Network',                      inputType: 'text',     placeholder: 'ERC-20 (Ethereum)',             required: false },
        { id: 'drw_qr',           key: 'qrCode',      label: 'QR Code (optional)',            inputType: 'qr' },
        { id: 'drw_instructions', key: 'instructions',label: 'Payment Instructions',          inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },

    'usdt-trc20': {
      label: 'USDT (TRC-20)',
      type: 'crypto',
      fields: [
        { id: 'drw_walletAddress',key: 'walletAddress',label: 'Wallet Address',              inputType: 'text',     placeholder: 'T...',                         required: true  },
        { id: 'drw_network',      key: 'network',     label: 'Network',                      inputType: 'text',     placeholder: 'TRC-20 (TRON)',                required: false },
        { id: 'drw_qr',           key: 'qrCode',      label: 'QR Code (optional)',            inputType: 'qr' },
        { id: 'drw_instructions', key: 'instructions',label: 'Payment Instructions',          inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },

    creditcard: {
      label: 'Credit / Debit Card',
      type: 'card',
      fields: [
        // Customer card data is collected on the public payment form only — not configured here
        { id: 'drw_acceptedNetworks', key: 'acceptedNetworks', label: 'Accepted Networks', inputType: 'text', placeholder: 'Visa, Mastercard, Amex', required: false },
        { id: 'drw_supportPhone', key: 'supportPhone', label: 'Support Phone (optional)', inputType: 'tel', placeholder: '+1 (888) 000-0000', required: false },
        { id: 'drw_instructions', key: 'instructions', label: 'Payment Instructions', inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },

    applegift: {
      label: 'Apple Gift Card',
      type: 'gift',
      fields: [
        { id: 'drw_frontImageRequired', key: 'frontImageRequired', label: 'Front Image Required', inputType: 'toggle', defaultVal: true  },
        { id: 'drw_backImageRequired',  key: 'backImageRequired',  label: 'Back Image Required',  inputType: 'toggle', defaultVal: true  },
        { id: 'drw_instructions', key: 'instructions',label: 'Payment Instructions',          inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    }
  };

  // Fallback generic schemas by type (for custom methods)
  var GENERIC_SCHEMAS = {
    wallet: {
      fields: [
        { id: 'drw_email',       key: 'email',       label: 'Payment Email',                  inputType: 'email',    placeholder: 'payments@example.com',          required: false },
        { id: 'drw_username',    key: 'username',     label: 'Username / Handle (optional)',   inputType: 'text',     placeholder: '@username or $handle',         required: false },
        { id: 'drw_accountName', key: 'accountName', label: 'Account Name (optional)',        inputType: 'text',     placeholder: 'Your Name or Business',         required: false },
        { id: 'drw_phone',       key: 'phone',        label: 'Phone Number (optional)',        inputType: 'tel',      placeholder: '+1 (555) 000-0000',            required: false },
        { id: 'drw_qr',          key: 'qrCode',      label: 'QR Code (optional)',              inputType: 'qr' },
        { id: 'drw_instructions',key: 'instructions',label: 'Payment Instructions',            inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },
    bank: {
      fields: [
        { id: 'drw_recipientName',key: 'recipientName',label: 'Recipient / Account Name',    inputType: 'text',     placeholder: 'Business Legal Name',          required: false },
        { id: 'drw_email',        key: 'email',       label: 'Email Address (optional)',      inputType: 'email',    placeholder: 'bank@example.com',             required: false },
        { id: 'drw_phone',        key: 'phone',       label: 'Phone Number (optional)',       inputType: 'tel',      placeholder: '+1 (555) 000-0000',            required: false },
        { id: 'drw_bankName',     key: 'bankName',    label: 'Bank Name (optional)',          inputType: 'text',     placeholder: 'Chase, Wells Fargo, etc.',     required: false },
        { id: 'drw_accountNumber',key: 'accountNumber',label: 'Account Number (optional)',   inputType: 'text',     placeholder: '000000000000',                 required: false },
        { id: 'drw_routingNumber',key: 'routingNumber',label: 'Routing Number (optional)',   inputType: 'text',     placeholder: '000000000',                    required: false },
        { id: 'drw_qr',           key: 'qrCode',      label: 'QR Code (optional)',            inputType: 'qr' },
        { id: 'drw_instructions', key: 'instructions',label: 'Payment Instructions',          inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },
    crypto: {
      fields: [
        { id: 'drw_walletAddress',key: 'walletAddress',label: 'Wallet Address',              inputType: 'text',     placeholder: 'Wallet address',               required: false },
        { id: 'drw_network',      key: 'network',     label: 'Network / Chain',               inputType: 'text',     placeholder: 'Network name',                 required: false },
        { id: 'drw_memo',         key: 'memo',        label: 'Memo / Tag (optional)',         inputType: 'text',     placeholder: 'Leave blank if not required',  required: false },
        { id: 'drw_qr',           key: 'qrCode',      label: 'QR Code (optional)',            inputType: 'qr' },
        { id: 'drw_instructions', key: 'instructions',label: 'Payment Instructions',          inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },
    card: {
      fields: [
        { id: 'drw_merchantName', key: 'merchantName', label: 'Merchant Name',              inputType: 'text',     placeholder: 'Your Business Name',           required: false },
        { id: 'drw_acceptedNetworks',key:'acceptedNetworks',label:'Accepted Networks',      inputType: 'text',     placeholder: 'Visa, Mastercard, Amex',       required: false },
        { id: 'drw_supportPhone', key: 'supportPhone', label: 'Support Phone (optional)',   inputType: 'tel',      placeholder: '+1 (888) 000-0000',            required: false },
        { id: 'drw_instructions', key: 'instructions', label: 'Payment Instructions',        inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },
    gift: {
      fields: [
        { id: 'drw_frontImageRequired', key: 'frontImageRequired', label: 'Front Image Required', inputType: 'toggle', defaultVal: true  },
        { id: 'drw_backImageRequired',  key: 'backImageRequired',  label: 'Back Image Required',  inputType: 'toggle', defaultVal: false },
        { id: 'drw_denominations',key: 'denominationsAccepted',label: 'Accepted Denominations', inputType: 'text',   placeholder: '$25, $50, $100, $200',       required: false },
        { id: 'drw_purchaseLoc',  key: 'purchaseLocations',   label: 'Where to Purchase (optional)',inputType: 'text',placeholder: 'Apple Store, Walmart, etc.',required: false },
        { id: 'drw_instructions', key: 'instructions',label: 'Payment Instructions',              inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    },
    other: {
      fields: [
        { id: 'drw_accountName', key: 'accountName', label: 'Account Name (optional)',        inputType: 'text',     placeholder: 'Your Name or Business',         required: false },
        { id: 'drw_accountNumber',key:'accountNumber',label:'Account Number / Address (optional)',inputType:'text', placeholder: 'Account number or address',    required: false },
        { id: 'drw_bankName',     key: 'bankName',    label: 'Bank / Provider Name (optional)',inputType: 'text',   placeholder: 'Provider name',                required: false },
        { id: 'drw_network',      key: 'network',     label: 'Network (optional)',              inputType: 'text',   placeholder: 'Network or chain',             required: false },
        { id: 'drw_email',        key: 'email',       label: 'Payment Email (optional)',        inputType: 'email',  placeholder: 'payments@example.com',         required: false },
        { id: 'drw_qr',           key: 'qrCode',      label: 'QR Code (optional)',              inputType: 'qr' },
        { id: 'drw_instructions', key: 'instructions',label: 'Payment Instructions',            inputType: 'textarea', placeholder: 'Instructions shown to customers...', required: false },
      ]
    }
  };

  // ── Get schema for a method (by slug first, then type fallback) ──
  function _getSchema(slug, type) {
    return METHOD_SCHEMAS[slug] || GENERIC_SCHEMAS[type] || GENERIC_SCHEMAS.other;
  }

  // ── Loading placeholder ────────────────────────────────────────
  function _loadingHtml() {
    return '<div class="pm3-loading" style="grid-column:1/-1">' +
      '<div class="pm3-spinner"></div>' +
      '<p>Loading payment methods from database…</p>' +
      '</div>';
  }

  // ── Render payment method cards ────────────────────────────────
  function renderPaymentMethods() {
    var grid = $id('paymentMethodsGrid');
    if (!grid || !PM) return;
    var all = PM.getAll();

    var enabled  = all.filter(function (p) { return p.enabled; });
    var disabled = all.filter(function (p) { return !p.enabled; });
    var crypto   = all.filter(function (p) { return p.type === 'crypto'; });
    setText('pmTotalCount',    all.length);
    setText('pmEnabledCount',  enabled.length);
    setText('pmDisabledCount', disabled.length);
    setText('pmCryptoCount',   crypto.length);

    var q       = (val('pmSearch') || '').toLowerCase();
    var typeF   = val('pmTypeFilter') || 'all';
    var statusF = val('pmStatusFilter') || 'all';
    var sort    = val('pmSort') || 'order';

    var list = all.filter(function (p) {
      if (typeF !== 'all' && p.type !== typeF) return false;
      if (statusF === 'active' && !p.enabled) return false;
      if (statusF === 'inactive' && p.enabled) return false;
      if (q) {
        var hay = [p.name, p.description, p.type,
          p.config && p.config.walletAddress,
          p.config && p.config.email,
          p.config && p.config.cashtag].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    list.sort(function (a, b) {
      if (sort === 'name')    return String(a.name).localeCompare(String(b.name));
      if (sort === 'updated') return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
      if (sort === 'status')  return (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0);
      return (a.displayOrder || 999) - (b.displayOrder || 999);
    });

    var empty = $id('pmEmpty');

    if (list.length === 0 && all.length === 0) {
      // Finished loading with zero methods — show empty state, never spin forever
      grid.innerHTML = '';
      if (empty) {
        empty.style.display = 'flex';
        empty.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg><p>No payment methods in the database yet.<br><button class="btn btn-sm btn-primary" onclick="openPaymentMethodDrawer()">Add payment method</button></p>';
      }
      return;
    }

    if (list.length === 0) {
      grid.innerHTML = '';
      if (empty) {
        empty.style.display = 'flex';
        empty.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg><p>No payment methods match your filters.<br><button class="btn btn-sm btn-ghost" onclick="document.getElementById(\'pmSearch\').value=\'\';document.getElementById(\'pmTypeFilter\').value=\'all\';document.getElementById(\'pmStatusFilter\').value=\'all\';renderPaymentMethods();">Clear filters</button></p>';
      }
      return;
    }

    if (empty) empty.style.display = 'none';

    grid.innerHTML = list.map(function (p) {
      var logo = PM.logoSrc ? PM.logoSrc(p) : (p.logo || '');
      var color = typeColor(p.type);
      var summary = getConfigSummary(p);
      var isActive = p.enabled;
      var isBuiltIn = !!METHOD_SCHEMAS[p.id];

      return '<div class="pm3-card' + (isActive ? '' : ' pm3-card--inactive') + '" data-id="' + esc(p.id) + '" draggable="true" ondragstart="window.pmDragStart(event,\'' + esc(p.id) + '\')" ondragover="event.preventDefault()" ondrop="window.pmDrop(event,\'' + esc(p.id) + '\')">' +
        '<div class="pm3-card__accent" style="background:' + color + '"></div>' +
        '<div class="pm3-card__header">' +
          '<div class="pm3-card__logo">' +
            (logo
              ? '<img src="' + esc(logo) + '" alt="' + esc(p.name) + '" onerror="this.style.display=\'none\'">'
              : '<div class="pm3-card__logo-fallback" style="background:' + color + '22;color:' + color + '">' + typeIcon(p.type) + '</div>') +
          '</div>' +
          '<div class="pm3-card__header-right">' +
            (isBuiltIn ? '<span class="pm3-badge pm3-badge--builtin" title="Built-in method">Built-in</span>' : '<span class="pm3-badge pm3-badge--custom" title="Custom method">Custom</span>') +
            '<button class="pm3-toggle' + (isActive ? ' pm3-toggle--on' : '') + '" onclick="togglePaymentMethod(\'' + esc(p.id) + '\')" title="' + (isActive ? 'Disable' : 'Enable') + '">' +
              '<span class="pm3-toggle__thumb"></span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="pm3-card__body">' +
          '<div class="pm3-card__name">' + esc(p.name) + '</div>' +
          '<div class="pm3-card__type"><span class="pm3-badge pm3-badge--type" style="--badge-color:' + color + '">' + typeIcon(p.type) + typeLabel(p.type) + '</span></div>' +
          (summary ? '<div class="pm3-card__summary" title="' + esc(summary) + '">' + esc(summary) + '</div>' : '<div class="pm3-card__summary pm3-card__summary--empty">No account details configured</div>') +
          '<div class="pm3-card__meta">' +
            '<span class="pm3-badge pm3-badge--status' + (isActive ? ' pm3-badge--on' : ' pm3-badge--off') + '">' +
              '<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>' +
              (isActive ? 'Active' : 'Inactive') +
            '</span>' +
            (p.lastUpdated ? '<span class="pm3-card__updated">Updated ' + fmtDate(p.lastUpdated) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="pm3-card__footer">' +
          '<button class="pm3-btn pm3-btn--edit" onclick="editPaymentMethod(\'' + esc(p.id) + '\')">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            'Edit' +
          '</button>' +
          '<button class="pm3-btn pm3-btn--delete" onclick="deletePaymentMethod(\'' + esc(p.id) + '\')" title="Delete">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ── Drag & drop reorder ────────────────────────────────────────
  var _dragItem = null;
  window.pmDragStart = function (e, id) {
    _dragItem = id;
    e.dataTransfer.effectAllowed = 'move';
  };
  window.pmDrop = function (e, targetId) {
    e.preventDefault();
    if (!_dragItem || _dragItem === targetId || !PM) return;
    var ordered = PM.getAll().map(function (m) { return m.id; });
    var fromIdx = ordered.indexOf(_dragItem), toIdx = ordered.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, _dragItem);
    PM.reorder(ordered);
    _dragItem = null;
    renderPaymentMethods();
    showToast('Order saved');
  };

  // ── Public action callbacks ────────────────────────────────────
  window.togglePaymentMethod = function (id) {
    if (!PM) return;
    PM.toggle(id);
    renderPaymentMethods();
    var m = PM.get(id);
    showToast((m ? m.name : 'Method') + ' ' + (m && m.enabled ? 'enabled' : 'disabled'));
  };

  window.deletePaymentMethod = function (id) {
    var m = PM && PM.get(id);
    if (!m) return;
    if (!confirm('Delete "' + m.name + '"? This cannot be undone.')) return;
    PM.delete(id);
    renderPaymentMethods();
    showToast('"' + m.name + '" deleted');
  };

  window.editPaymentMethod = function (id) {
    var m = PM && PM.get(id);
    if (!m) return;
    openDrawer(m);
  };

  window.showAddPaymentMethod = function () {
    openDrawer(null);
  };

  // ── Drawer ─────────────────────────────────────────────────────
  function openDrawer(method) {
    _editingId   = method ? method.id : null;
    _logoUpload  = null;
    _qrUpload    = null;
    _pmSaving    = false;

    var drw = $id('pmDrawer');
    if (!drw) { buildDrawerHtml(); drw = $id('pmDrawer'); }
    // Ensure Save is interactive every time the modal opens
    resetSaveButton();

    var isNew = !method;
    setText('drwTitle', isNew ? 'Add Payment Method' : 'Edit — ' + (method.name || 'Payment Method'));
    setText('drwSubtitle', isNew
      ? 'Create a new payment method for your checkout'
      : 'Update settings for this payment method');

    // Populate basic fields
    _setVal('drw_id',          isNew ? '' : (method.id || ''));
    _setVal('drw_name',        isNew ? '' : (method.name || ''));
    _setVal('drw_description', isNew ? '' : (method.description || ''));
    _setVal('drw_order',       isNew ? '' : (method.displayOrder || ''));

    // Type selector — show/hide based on whether it's a named method
    var typeRow = $id('drwTypeRow');
    var idRow   = $id('drwIdRow');
    if (method && METHOD_SCHEMAS[method.id]) {
      // Built-in: hide type/id selectors, show schema label instead
      if (typeRow) typeRow.style.display = 'none';
      if (idRow)   idRow.style.display   = 'none';
    } else {
      if (typeRow) typeRow.style.display = '';
      if (idRow)   idRow.style.display   = '';
      _setVal('drw_type', isNew ? 'wallet' : (method && method.type) || 'wallet');
    }

    // Enabled toggle
    var enabledEl = $id('drw_enabled');
    var toggleEl  = document.querySelector('#pmDrawer .pm3-field-toggle');
    var checked   = isNew ? true : (method.enabled !== false);
    if (enabledEl) enabledEl.checked = checked;
    if (toggleEl)  toggleEl.classList.toggle('pm3-field-toggle--on', checked);

    // Logo preview
    var logoPreview = $id('drwLogoPreview');
    if (logoPreview) {
      var existingLogo = !isNew && (PM.logoSrc ? PM.logoSrc(method) : method.logo);
      if (existingLogo) {
        logoPreview.innerHTML = '<img src="' + esc(existingLogo) + '" alt="logo" onerror="this.style.display=\'none\'">';
        logoPreview.style.display = 'flex';
      } else {
        logoPreview.innerHTML = '';
        logoPreview.style.display = 'none';
      }
    }
    var logoFileName = $id('drwLogoFileName');
    if (logoFileName) logoFileName.textContent = (!isNew && method.logo) ? 'Current logo' : 'No file selected';

    // Config fields — dispatch on method ID (the core fix)
    var slug = method ? method.id : null;
    var type = method ? (method.type || 'wallet') : 'wallet';
    var cfg  = method ? (method.config || {}) : {};
    _renderConfigFields(slug, type, cfg);

    // Open overlay
    var overlay = $id('pmDrawerOverlay');
    if (overlay) {
      overlay.classList.add('pm3-drw-open');
      setTimeout(function () {
        var panel = $id('pmDrawerPanel');
        if (panel) panel.classList.add('pm3-drw-panel-open');
      }, 10);
    }

    setTimeout(function () { var n = $id('drw_name'); if (n) n.focus(); }, 200);
  }

  var _pmSaving = false;

  var SAVE_BTN_HTML =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>' +
      '<polyline points="17 21 17 13 7 13 7 21"/>' +
      '<polyline points="7 3 7 8 15 8"/>' +
    '</svg>' +
    '<span class="pm3-btn-label">Save Changes</span>';

  var SAVE_BTN_LOADING_HTML =
    '<svg class="pm3-btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
      '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>' +
    '</svg>' +
    '<span class="pm3-btn-label">Saving…</span>';

  function resetSaveButton() {
    _pmSaving = false;
    var saveBtn = document.querySelector('.pm3-btn-save');
    if (!saveBtn) return;
    saveBtn.disabled = false;
    saveBtn.classList.remove('is-loading');
    saveBtn.innerHTML = SAVE_BTN_HTML;
  }

  function setSaveButtonLoading() {
    _pmSaving = true;
    var saveBtn = document.querySelector('.pm3-btn-save');
    if (!saveBtn) return;
    saveBtn.disabled = true;
    saveBtn.classList.add('is-loading');
    saveBtn.innerHTML = SAVE_BTN_LOADING_HTML;
  }

  function closeDrawer() {
    var panel = $id('pmDrawerPanel');
    if (panel) panel.classList.remove('pm3-drw-panel-open');
    setTimeout(function () {
      var overlay = $id('pmDrawerOverlay');
      if (overlay) overlay.classList.remove('pm3-drw-open');
      // Always restore CTA after close so next open is not stuck
      resetSaveButton();
    }, 280);
    _editingId  = null;
    _logoUpload = null;
    _qrUpload   = null;
    _pmSaving   = false;
  }

  window.closePaymentDrawer = closeDrawer;

  // ── Build drawer HTML ──────────────────────────────────────────
  function buildDrawerHtml() {
    var div = document.createElement('div');
    div.id = 'pmDrawer';
    div.innerHTML =
      '<div id="pmDrawerOverlay" class="pm3-drw-overlay" onclick="closePaymentDrawer()">' +
        '<div id="pmDrawerPanel" class="pm3-drw-panel" onclick="event.stopPropagation()">' +
          '<div class="pm3-drw-head">' +
            '<div class="pm3-drw-head-text">' +
              '<div class="pm3-drw-icon">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' +
              '</div>' +
              '<div>' +
                '<div class="pm3-drw-title" id="drwTitle">Edit Payment Method</div>' +
                '<div class="pm3-drw-subtitle" id="drwSubtitle">Update payment details</div>' +
              '</div>' +
            '</div>' +
            '<button class="pm3-drw-close" onclick="closePaymentDrawer()" aria-label="Close">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="pm3-drw-body">' +
            '<div class="pm3-drw-section">' +
              '<div class="pm3-drw-section-title">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>' +
                'Basic Information' +
              '</div>' +
              '<div class="pm3-field">' +
                '<label class="pm3-label">Method Name <span class="pm3-req">*</span></label>' +
                '<input class="pm3-input" id="drw_name" type="text" placeholder="e.g. PayPal, Cash App, Bitcoin" autocomplete="off">' +
              '</div>' +
              '<div id="drwTypeRow" class="pm3-field">' +
                '<label class="pm3-label">Payment Type</label>' +
                '<select class="pm3-select" id="drw_type" onchange="window.updateConfigFields(this.value,{})">' +
                  '<option value="wallet">Wallet / Digital App</option>' +
                  '<option value="bank">Bank Transfer</option>' +
                  '<option value="crypto">Cryptocurrency</option>' +
                  '<option value="card">Credit / Debit Card</option>' +
                  '<option value="gift">Gift Card</option>' +
                  '<option value="other">Other</option>' +
                '</select>' +
              '</div>' +
              '<div class="pm3-field">' +
                '<label class="pm3-label">Description (optional)</label>' +
                '<input class="pm3-input" id="drw_description" type="text" placeholder="Brief description shown to customers" autocomplete="off">' +
              '</div>' +
              '<div class="pm3-drw-grid2">' +
                '<div id="drwIdRow" class="pm3-field">' +
                  '<label class="pm3-label">ID <span style="font-size:11px;font-weight:500;color:var(--admin-text-muted)">(auto-generated)</span></label>' +
                  '<input class="pm3-input pm3-input--mono" id="drw_id" type="text" placeholder="e.g. my-payment" autocomplete="off">' +
                '</div>' +
                '<div class="pm3-field">' +
                  '<label class="pm3-label">Display Order</label>' +
                  '<input class="pm3-input" id="drw_order" type="number" min="1" placeholder="1" autocomplete="off">' +
                '</div>' +
              '</div>' +
              '<div class="pm3-field">' +
                '<label class="pm3-label pm3-label--toggle">' +
                  '<input type="checkbox" id="drw_enabled" style="display:none">' +
                  '<span class="pm3-field-toggle-wrap">' +
                    '<span class="pm3-field-toggle" onclick="var cb=document.getElementById(\'drw_enabled\');cb.checked=!cb.checked;this.classList.toggle(\'pm3-field-toggle--on\',cb.checked)"></span>' +
                    'Active — visible on the Payment page' +
                  '</span>' +
                '</label>' +
              '</div>' +
            '</div>' +
            '<div class="pm3-drw-section">' +
              '<div class="pm3-drw-section-title">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>' +
                'Payment Logo' +
              '</div>' +
              '<div class="pm3-logo-upload-area">' +
                '<div class="pm3-logo-preview" id="drwLogoPreview" style="display:none"></div>' +
                '<div class="pm3-logo-upload-controls">' +
                  '<label class="pm3-upload-btn" for="drwLogoFile">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
                    'Upload Logo' +
                  '</label>' +
                  '<input type="file" id="drwLogoFile" accept="image/*" style="display:none" onchange="handleLogoUpload(this)">' +
                  '<span class="pm3-upload-filename" id="drwLogoFileName">No file selected</span>' +
                  '<button class="pm3-clear-btn" id="drwLogoClearBtn" style="display:none" onclick="clearLogoUpload()">Remove</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="pm3-drw-section">' +
              '<div class="pm3-drw-section-title">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
                'Account Configuration' +
              '</div>' +
              '<div id="drwConfigFields"></div>' +
            '</div>' +
          '</div>' +
          '<div class="pm3-drw-footer">' +
            '<button type="button" class="pm3-btn-cancel" onclick="closePaymentDrawer()">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
              '<span class="pm3-btn-label">Cancel</span>' +
            '</button>' +
            '<button type="button" class="pm3-btn-save" onclick="window._pmSave()">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>' +
                '<polyline points="17 21 17 13 7 13 7 21"/>' +
                '<polyline points="7 3 7 8 15 8"/>' +
              '</svg>' +
              '<span class="pm3-btn-label">Save Changes</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);
  }

  // ── Logo upload ────────────────────────────────────────────────
  window.handleLogoUpload = function (input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      _logoUpload = e.target.result;
      var preview = $id('drwLogoPreview');
      if (preview) { preview.innerHTML = '<img src="' + _logoUpload + '" alt="logo preview">'; preview.style.display = 'flex'; }
      var fname = $id('drwLogoFileName');
      if (fname) fname.textContent = file.name;
      var clearBtn = $id('drwLogoClearBtn');
      if (clearBtn) clearBtn.style.display = '';
    };
    reader.readAsDataURL(file);
  };

  window.clearLogoUpload = function () {
    _logoUpload = null;
    var preview = $id('drwLogoPreview');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
    var fname = $id('drwLogoFileName');
    if (fname) fname.textContent = 'No file selected';
    var clearBtn = $id('drwLogoClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    var fileInput = $id('drwLogoFile');
    if (fileInput) fileInput.value = '';
  };

  // ── QR upload ──────────────────────────────────────────────────
  window.handleQrUpload = function (input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      _qrUpload = e.target.result;
      var preview = $id('drwQrPreview');
      if (preview) {
        preview.className = 'pm3-qr-preview';
        preview.innerHTML = '<img src="' + _qrUpload + '" alt="QR code"><button type="button" class="pm3-clear-btn pm3-qr-remove" onclick="clearQrUpload()">Remove QR Code</button>';
      }
      var fname = $id('drwQrFileName');
      if (fname) fname.textContent = file.name;
    };
    reader.readAsDataURL(file);
  };

  window.clearQrUpload = function () {
    _qrUpload = '';
    var preview = $id('drwQrPreview');
    if (preview) { preview.className = 'pm3-qr-preview pm3-qr-preview--empty'; preview.innerHTML = ''; }
    var fname = $id('drwQrFileName');
    if (fname) fname.textContent = 'No file selected';
    var fileInput = $id('drwQrFile');
    if (fileInput) fileInput.value = '';
  };

  // ── Field renderers ────────────────────────────────────────────
  function _field(id, label, type, value, placeholder) {
    var v  = esc(value || '');
    var ph = esc(placeholder || '');
    if (type === 'textarea') {
      return '<div class="pm3-field">' +
        '<label class="pm3-label">' + label + '</label>' +
        '<textarea class="pm3-input pm3-textarea" id="' + id + '" placeholder="' + ph + '" rows="3">' + v + '</textarea>' +
        '</div>';
    }
    return '<div class="pm3-field">' +
      '<label class="pm3-label">' + label + '</label>' +
      '<input class="pm3-input" id="' + id + '" type="' + type + '" value="' + v + '" placeholder="' + ph + '" autocomplete="off">' +
      '</div>';
  }

  function _qrField(existingDataUrl) {
    var preview = existingDataUrl
      ? '<div class="pm3-qr-preview" id="drwQrPreview"><img src="' + existingDataUrl + '" alt="QR code"><button type="button" class="pm3-clear-btn pm3-qr-remove" onclick="clearQrUpload()">Remove QR Code</button></div>'
      : '<div class="pm3-qr-preview pm3-qr-preview--empty" id="drwQrPreview"></div>';
    return '<div class="pm3-field">' +
      '<label class="pm3-label">QR Code Image (optional)</label>' +
      preview +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:6px">' +
        '<label class="pm3-upload-btn pm3-upload-btn--sm" for="drwQrFile">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
          'Upload QR' +
        '</label>' +
        '<input type="file" id="drwQrFile" accept="image/*" style="display:none" onchange="handleQrUpload(this)">' +
        '<span class="pm3-upload-filename" id="drwQrFileName">' + (existingDataUrl ? 'QR code uploaded' : 'No file selected') + '</span>' +
      '</div>' +
    '</div>';
  }

  function _toggleField(id, label, checked) {
    return '<div class="pm3-field">' +
      '<label class="pm3-label pm3-label--toggle">' +
        '<input type="checkbox" id="' + id + '" ' + (checked ? 'checked' : '') + ' style="display:none">' +
        '<span class="pm3-field-toggle-wrap">' +
          '<span class="pm3-field-toggle' + (checked ? ' pm3-field-toggle--on' : '') + '" onclick="var cb=document.getElementById(\'' + id + '\');cb.checked=!cb.checked;this.classList.toggle(\'pm3-field-toggle--on\',cb.checked)"></span>' +
          label +
        '</span>' +
      '</label>' +
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────────
  // _renderConfigFields — THE CORE FIX
  // Dispatches on method slug first; falls back to generic type schema.
  // Called by openDrawer and by updateConfigFields (type dropdown change).
  // ─────────────────────────────────────────────────────────────────
  function _renderConfigFields(slug, type, cfg) {
    var container = $id('drwConfigFields');
    if (!container) return;

    var schema = _getSchema(slug, type);
    var html = '';

    schema.fields.forEach(function (fd) {
      var v = (cfg && cfg[fd.key] != null) ? cfg[fd.key] : (fd.defaultVal != null ? fd.defaultVal : '');
      if (fd.inputType === 'qr') {
        html += _qrField(v || '');
      } else if (fd.inputType === 'toggle') {
        var isOn = (v === true || v === 'true' || v === 1);
        if (v === '' || v === undefined || v === null) isOn = (fd.defaultVal !== false);
        html += _toggleField(fd.id, fd.label, isOn);
      } else {
        html += _field(fd.id, fd.label, fd.inputType, v, fd.placeholder || '');
      }
    });

    container.innerHTML = html;
  }

  // updateConfigFields — exposed globally for the type dropdown onchange
  // When building a NEW custom method and the type changes, re-render fields.
  window.updateConfigFields = function (typeOrSlug, existingConfig) {
    var cfg = existingConfig || {};
    // Only re-render if we're editing a custom (non-schema) method or adding new
    var slug = _editingId;
    if (slug && METHOD_SCHEMAS[slug]) {
      // Built-in named method — always use its schema, ignore type dropdown
      _renderConfigFields(slug, null, cfg);
    } else {
      // New or custom method — use type-based generic schema
      _renderConfigFields(null, typeOrSlug, cfg);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // _pmSave — collects config by method slug (the second part of fix)
  // ─────────────────────────────────────────────────────────────────
  window._pmSave = function () {
    if (_pmSaving) return; // prevent double-submit while request is in flight

    var isNew = !_editingId;
    var name  = (val('drw_name') || '').trim();
    if (!name) { showToast('Method name is required', 'error'); var n = $id('drw_name'); if (n) n.focus(); return; }

    var type = val('drw_type') || 'wallet';
    var id   = (val('drw_id') || '').trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (isNew && PM.get(id)) { showToast('A method with ID "' + id + '" already exists', 'error'); return; }

    var slug   = isNew ? id : _editingId;
    var schema = _getSchema(slug, type);
    if (!schema || !schema.fields) {
      showToast('Could not load method fields. Please close and try again.', 'error');
      return;
    }

    var config = {};
    try {
      schema.fields.forEach(function (fd) {
        if (fd.inputType === 'qr') {
          // handled separately below
        } else if (fd.inputType === 'toggle') {
          var el = $id(fd.id);
          config[fd.key] = el ? el.checked : (fd.defaultVal !== false);
        } else {
          var elVal = val(fd.id);
          if (elVal !== null && elVal !== undefined) {
            config[fd.key] = String(elVal).trim();
          }
        }
      });
    } catch (err) {
      console.error('[PM] config collect error:', err);
      showToast('Failed to read form fields', 'error');
      return;
    }

    if (METHOD_SCHEMAS[slug]) {
      type = METHOD_SCHEMAS[slug].type || type;
    }

    if (_qrUpload !== null) {
      config.qrCode = _qrUpload;
    } else if (!isNew) {
      var existingM = PM.get(_editingId);
      config.qrCode = (existingM && existingM.config && existingM.config.qrCode) || '';
    }

    var logo;
    if (_logoUpload) {
      logo = _logoUpload;
    } else if (!isNew) {
      logo = (PM.get(_editingId) || {}).logo || '';
    } else {
      logo = '';
    }

    var order     = parseInt(val('drw_order'), 10);
    var enabledEl = $id('drw_enabled');

    var payload = {
      name:        name,
      description: (val('drw_description') || '').trim(),
      type:        type,
      enabled:     enabledEl ? enabledEl.checked : true,
      logo:        logo,
      config:      config
    };
    if (!isNaN(order) && order > 0) payload.displayOrder = order;

    setSaveButtonLoading();

    try {
      if (isNew) {
        payload.id = id;
        PM.add(payload);
      } else {
        PM.update(_editingId, payload);
      }

      closeDrawer();
      renderPaymentMethods();
      showToast('Payment method ' + (isNew ? 'added' : 'saved') + ' successfully');

      setTimeout(function () {
        if (PM && PM.syncFromApi) {
          PM.syncFromApi('admin', function () {
            renderPaymentMethods();
          });
        }
      }, 1200);
    } catch (err) {
      console.error('[PM] save error:', err);
      showToast('Save failed. Please try again.', 'error');
      resetSaveButton();
    }
  };


  // ── Load payment methods from database (source of truth) ────────
  function loadPaymentMethods() {
    var grid = $id('paymentMethodsGrid');
    if (!PM) {
      console.error('[PM] TeslaPaymentMethods store not available');
      if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--admin-text-muted);">Payment methods store failed to load.</div>';
      return;
    }

    // Instant paint from cache
    var cached = PM.getAll();
    if (cached && cached.length > 0) {
      renderPaymentMethods();
    } else if (grid) {
      grid.innerHTML = _loadingHtml();
    }

    function finish(ok) {
      renderPaymentMethods();
      if (!ok && PM.getAll().length === 0 && grid) {
        grid.innerHTML =
          '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--admin-text-muted);">' +
          '<p style="margin:0 0 12px;font-weight:600;">Could not load payment methods from the database.</p>' +
          '<button class="btn btn-sm btn-primary" type="button" onclick="loadPaymentMethods()">Retry</button>' +
          '</div>';
      }
    }

    // Fast path: admin api() with bearer token
    if (typeof api === 'function' && typeof API_BASE !== 'undefined' && API_BASE) {
      api('GET', '/admin/payment-methods')
        .then(function (data) {
          var list = (data && (data.methods || data.payment_methods)) || [];
          if (!Array.isArray(list)) list = [];
          var norm = list.map(function (m) {
            return PM.normalize ? PM.normalize(m) : m;
          }).filter(Boolean);
          // Write into TeslaPaymentMethods cache via public save
          if (typeof PM.save === 'function') {
            // PM.save also pushes to API — avoid loop. Use internal path:
            try {
              // Seed cache without network push
              if (PM.syncFromApi) {
                // Manually set by calling normalizeList path: save through a no-push trick
              }
            } catch (e) {}
          }
          // Official write: temporary override push
          try {
            var _push = PM.pushToApi;
            var _pushOne = PM.pushMethodToApi;
            PM.pushToApi = function () {};
            PM.pushMethodToApi = function () {};
            if (typeof PM.save === 'function') PM.save(norm);
            PM.pushToApi = _push;
            PM.pushMethodToApi = _pushOne;
          } catch (e) {
            // fallback
            if (typeof PM.syncFromApi === 'function') {
              PM.syncFromApi('admin', finish);
              return;
            }
          }
          finish(true);
        })
        .catch(function (err) {
          console.warn('[PM] admin api load failed', err && err.message);
          if (typeof PM.syncFromApi === 'function') {
            PM.syncFromApi('admin', finish);
          } else {
            finish(false);
          }
        });
      return;
    }

    if (typeof PM.syncFromApi === 'function') {
      PM.syncFromApi('admin', finish);
    } else {
      finish(false);
    }
  }

  window.loadPaymentMethods = loadPaymentMethods;

  // ── Backward-compat aliases ────────────────────────────────────
  window.savePaymentMethod = window._pmSave;
  window.renderPaymentMethods = renderPaymentMethods;
  window.loadPaymentMethods = loadPaymentMethods;

}());
