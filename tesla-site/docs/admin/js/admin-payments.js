// ╔══════════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Payment Methods (Redesigned)     ║
// ║  Drawer-based config with per-method-type field sets.        ║
// ║  No hard-coded payment methods required.                     ║
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

  // ── Utilities ──────────────────────────────────────────────────
  function $id(id)        { return document.getElementById(id); }
  function val(id)        { var e = $id(id); return e ? e.value : ''; }
  function setText(id, v) { var e = $id(id); if (e) e.textContent = v; }

  function typeLabel(t) {
    return ({ wallet: 'Wallet / App', bank: 'Bank Transfer', crypto: 'Cryptocurrency', card: 'Card', gift: 'Gift Card' }[t]) || 'Wallet / App';
  }

  function typeColor(t) {
    return ({ wallet: '#3B82F6', bank: '#8B5CF6', crypto: '#F59E0B', card: '#10B981', gift: '#EC4899' }[t]) || '#6B7280';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ── Load & render ───────────────────────────────────────────────
  window.loadPaymentMethods = function () {
    renderPaymentMethods();
    if (PM && PM.syncFromApi) {
      PM.syncFromApi('admin', function () { renderPaymentMethods(); });
    }
  };

  function renderPaymentMethods() {
    var grid = $id('paymentMethodsGrid');
    if (!grid || !PM) return;
    var all = PM.getAll();

    var enabled = all.filter(function (p) { return p.enabled; });
    var crypto  = all.filter(function (p) { return p.type === 'crypto'; });
    setText('pmTotalCount',    all.length);
    setText('pmEnabledCount',  enabled.length);
    setText('pmDisabledCount', all.length - enabled.length);
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
          p.config && p.config.email].join(' ').toLowerCase();
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
    if (list.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      return;
    }
    if (empty) empty.style.display = 'none';

    grid.innerHTML = list.map(function (pm) {
      var on = pm.enabled;
      var c  = pm.config || {};
      var detail = '';
      if      (pm.type === 'wallet') detail = c.cashtag || c.username || c.email || c.paypalMeLink || '';
      else if (pm.type === 'bank')   detail = c.email || c.phone || '';
      else if (pm.type === 'crypto') detail = c.walletAddress ? c.walletAddress.slice(0, 16) + '…' : '';
      else if (pm.type === 'card')   detail = 'Visa · Mastercard · Amex · Discover';
      else if (pm.type === 'gift')   detail = 'Front + Back card upload';

      var col = typeColor(pm.type);

      return [
        '<div class="pm2-card' + (on ? '' : ' pm2-card-off') + '">',
          '<div class="pm2-header">',
            '<div class="pm2-logo-box">' + PM.logoImg(pm, 42) + '</div>',
            '<label class="toggle-switch" title="' + (on ? 'Disable' : 'Enable') + '">',
              '<input type="checkbox"' + (on ? ' checked' : '') + ' onchange="window.togglePaymentMethod(\'' + esc(pm.id) + '\')">',
              '<span class="toggle-slider"></span>',
            '</label>',
          '</div>',
          '<div class="pm2-name">' + esc(pm.name) + '</div>',
          detail ? '<div class="pm2-detail">' + esc(detail) + '</div>' : '<div class="pm2-detail" style="opacity:0;height:18px;"></div>',
          '<div class="pm2-badges">',
            '<span class="pm2-badge" style="background:' + col + '18;color:' + col + ';">' + esc(typeLabel(pm.type)) + '</span>',
            '<span class="pm2-badge ' + (on ? 'pm2-badge-on' : 'pm2-badge-off') + '">' + (on ? '● Active' : '○ Inactive') + '</span>',
          '</div>',
          '<div class="pm2-meta">',
            '<span>#' + (pm.displayOrder || '—') + '</span>',
            '<span>Updated ' + fmtDate(pm.lastUpdated) + '</span>',
          '</div>',
          '<div class="pm2-actions">',
            '<button class="btn btn-ghost btn-sm pm2-cfg-btn" onclick="window.editPaymentMethod(\'' + esc(pm.id) + '\')">',
              ICON_SETTINGS + ' Configure',
            '</button>',
            '<button class="btn btn-ghost btn-sm pm2-del-btn" onclick="window.deletePaymentMethod(\'' + esc(pm.id) + '\')" title="Delete">',
              ICON_TRASH,
            '</button>',
          '</div>',
        '</div>'
      ].join('');
    }).join('');
  }
  window.renderPaymentMethods = renderPaymentMethods;

  // ── Inline SVG icons ────────────────────────────────────────────
  var ICON_SETTINGS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  var ICON_TRASH    = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
  var ICON_UPLOAD   = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';

  // ── Toggle / delete ─────────────────────────────────────────────
  window.togglePaymentMethod = function (id) {
    if (!PM) return;
    var pm = PM.toggle(id);
    renderPaymentMethods();
    if (pm) showToast(pm.name + ' ' + (pm.enabled ? 'enabled' : 'disabled'));
  };

  window.deletePaymentMethod = function (id) {
    if (!PM) return;
    var pm = PM.get(id);
    if (!pm) return;
    if (!confirm('Delete "' + pm.name + '"?\nThis removes it from the customer payment page immediately.')) return;
    PM.delete(id);
    renderPaymentMethods();
    showToast('Payment method deleted');
  };

  window.showAddPaymentMethod = function () { openDrawer(null); };
  window.editPaymentMethod    = function (id) { openDrawer(PM && PM.get(id) || null); };

  // ── Per-type field definitions ──────────────────────────────────
  // Keys must match config property names used in payment-methods.js
  var TYPE_FIELDS = {
    paypal: [
      { id: 'businessName', label: 'Business Name',   optional: true,  ph: 'Tesla Global Awards LLC' },
      { id: 'email',        label: 'Business Email',  optional: false, ph: 'payments@teslaglobalawards.com' },
      { id: 'merchantId',   label: 'Merchant ID',     optional: true,  ph: 'TM8XK2R9Q4ZPA' },
      { id: 'paypalMeLink', label: 'PayPal.Me Link',  optional: true,  ph: 'https://paypal.me/teslaglobalawards' }
    ],
    cashapp: [
      { id: 'cashtag',     label: 'Cash Tag',     optional: false, ph: '$TeslaGlobalAwards' },
      { id: 'accountName', label: 'Account Name', optional: true,  ph: 'Tesla Global Awards' }
    ],
    venmo: [
      { id: 'username',    label: 'Username',     optional: false, ph: '@TeslaGlobalAwards' },
      { id: 'accountName', label: 'Account Name', optional: true,  ph: 'Tesla Global Awards LLC' }
    ],
    zelle: [
      { id: 'recipientName', label: 'Recipient Name', optional: false, ph: 'Tesla Global Awards LLC' },
      { id: 'email',         label: 'Email',          optional: false, ph: 'zelle@teslaglobalawards.com' },
      { id: 'phone',         label: 'Phone Number',   optional: true,  ph: '+1 (415) 892-3401' }
    ],
    bitcoin: [
      { id: 'walletAddress', label: 'Wallet Address', optional: false, ph: 'bc1q…', full: true },
      { id: 'network',       label: 'Network',        optional: false, ph: 'Bitcoin Mainnet' }
    ],
    ethereum: [
      { id: 'walletAddress', label: 'Wallet Address', optional: false, ph: '0x742d35Cc…', full: true },
      { id: 'network',       label: 'Network',        optional: false, ph: 'Ethereum Mainnet (ERC-20)' }
    ],
    'usdt-erc20': [
      { id: 'walletAddress', label: 'Wallet Address', optional: false, ph: '0x742d35Cc…', full: true },
      { id: 'network',       label: 'Network',        optional: false, ph: 'Ethereum Mainnet (ERC-20)' }
    ],
    'usdt-trc20': [
      { id: 'walletAddress', label: 'Wallet Address', optional: false, ph: 'TXfKzRsv…', full: true },
      { id: 'network',       label: 'Network',        optional: false, ph: 'TRON Mainnet (TRC-20)' }
    ]
  };

  var GENERIC_WALLET_FIELDS = [
    { id: 'accountName',   label: 'Account / Business Name', optional: true, ph: 'Your business name' },
    { id: 'email',         label: 'Payment Email',           optional: true, ph: 'payments@company.com' },
    { id: 'cashtag',       label: 'Cash Tag / Handle',       optional: true, ph: '$YourHandle' },
    { id: 'username',      label: 'Username',                optional: true, ph: '@YourUsername' },
    { id: 'walletAddress', label: 'Wallet Address',          optional: true, ph: 'Address or payment link', full: true }
  ];

  var BANK_FIELDS = [
    { id: 'recipientName', label: 'Recipient Name',  optional: false, ph: 'Full recipient name' },
    { id: 'email',         label: 'Email',           optional: true,  ph: 'bank@company.com' },
    { id: 'phone',         label: 'Phone Number',    optional: true,  ph: '+1 (555) 000-0000' },
    { id: 'accountNumber', label: 'Account Number',  optional: true,  ph: '—' }
  ];

  var CRYPTO_FIELDS = [
    { id: 'walletAddress', label: 'Wallet Address', optional: false, ph: 'Public wallet address', full: true },
    { id: 'network',       label: 'Network',        optional: false, ph: 'e.g. Bitcoin Mainnet / ERC-20 / TRC-20' }
  ];

  function getTypeFields(type, pmId) {
    if (pmId && TYPE_FIELDS[pmId]) return TYPE_FIELDS[pmId];
    if (type === 'wallet') return GENERIC_WALLET_FIELDS;
    if (type === 'bank')   return BANK_FIELDS;
    if (type === 'crypto') return CRYPTO_FIELDS;
    return [];
  }

  // ── Drawer ──────────────────────────────────────────────────────
  function closeDrawer() {
    ['pmDrwOverlay', 'pmDrwPanel'].forEach(function (id) {
      var el = $id(id);
      if (!el) return;
      el.classList.remove('drw-open');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 340);
    });
    _logoUpload = null;
    _qrUpload   = null;
  }
  window._pmClose = closeDrawer;

  function openDrawer(pm) {
    _logoUpload = null;
    _qrUpload   = null;

    var isEdit = !!pm;
    var c      = (pm && pm.config) || {};
    var type   = (pm && pm.type) || 'wallet';
    var pmId   = pm ? pm.id : 'new';

    // Remove stale instances
    ['pmDrwOverlay', 'pmDrwPanel'].forEach(function (id) {
      var el = $id(id); if (el && el.parentNode) el.parentNode.removeChild(el);
    });

    // Overlay
    var ov = document.createElement('div');
    ov.id = 'pmDrwOverlay';
    ov.className = 'pm-drw-overlay';
    ov.addEventListener('click', function (e) { if (e.target === ov) closeDrawer(); });
    document.body.appendChild(ov);

    // Panel
    var panel = document.createElement('div');
    panel.id = 'pmDrwPanel';
    panel.className = 'pm-drw-panel';

    var logoHtml  = pm ? PM.logoImg(pm, 52) : PM.logoImg({ name: 'New' }, 52);
    var qrHtml    = c.qrCode ? '<img src="' + esc(c.qrCode) + '" alt="QR Code">' : '<span>No QR</span>';
    var hasQr     = !!c.qrCode;

    var logoOpts = Object.keys(PM.LOGO_KEYS).map(function (k) {
      var selected = pm && pm.logo && pm.logo.indexOf(k + '.svg') !== -1 ? ' selected' : '';
      return '<option value="' + k + '"' + selected + '>' + k + '</option>';
    }).join('');

    var typeOpts = ['wallet', 'bank', 'crypto', 'card', 'gift'].map(function (t) {
      return '<option value="' + t + '"' + (t === type ? ' selected' : '') + '>' + typeLabel(t) + '</option>';
    }).join('');

    panel.innerHTML = [
      '<!-- DRAWER HEADER -->',
      '<div class="drw-head">',
        '<div class="drw-head-logo" id="drwHeadLogo">' + logoHtml + '</div>',
        '<div class="drw-head-text">',
          '<h3>' + (isEdit ? 'Configure Payment Method' : 'Add Payment Method') + '</h3>',
          '<p>' + (isEdit ? esc(pm.name) + ' &middot; ' + typeLabel(type) : 'Create a new method — appears on customer page when enabled.') + '</p>',
        '</div>',
        '<button class="drw-close-btn" onclick="window._pmClose()" aria-label="Close">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        '</button>',
      '</div>',

      '<!-- DRAWER BODY -->',
      '<div class="drw-body">',

        '<div class="drw-sec-label">Basics</div>',
        '<div class="drw-grid">',
          '<div class="drw-field drw-full">',
            '<label>Payment Method Name <span class="drw-req">*</span></label>',
            '<input id="drw_name" type="text" value="' + esc(pm ? pm.name : '') + '" placeholder="e.g. PayPal, Cash App, Bitcoin" autocomplete="off">',
          '</div>',
          '<div class="drw-field">',
            '<label>Type</label>',
            '<select id="drw_type" onchange="window._pmTypeChange()">' + typeOpts + '</select>',
          '</div>',
          '<div class="drw-field">',
            '<label>Display Order</label>',
            '<input id="drw_order" type="number" min="1" value="' + esc(pm ? String(pm.displayOrder || '') : '') + '" placeholder="1">',
          '</div>',
          '<div class="drw-field drw-full">',
            '<label>Short Description <span class="drw-opt">(optional)</span></label>',
            '<input id="drw_description" type="text" value="' + esc(pm ? pm.description || '' : '') + '" placeholder="Brief description shown under the name">',
          '</div>',
          '<div class="drw-field drw-full drw-toggle-field">',
            '<div class="drw-toggle-text">',
              '<span class="drw-toggle-label">Enabled</span>',
              '<span class="drw-toggle-hint">Visible to customers on the payment page</span>',
            '</div>',
            '<label class="toggle-switch">',
              '<input type="checkbox" id="drw_enabled"' + (pm ? (pm.enabled ? ' checked' : '') : ' checked') + '>',
              '<span class="toggle-slider"></span>',
            '</label>',
          '</div>',
        '</div>',

        '<div class="drw-sec-label">Branding</div>',
        '<div class="drw-grid">',
          '<div class="drw-field drw-full">',
            '<label>Logo / Icon</label>',
            '<div class="drw-logo-row">',
              '<div class="drw-logo-preview" id="drwLogoThumb">' + logoHtml + '</div>',
              '<div class="drw-logo-opts">',
                '<select id="drw_logoKey" onchange="window._pmLogoKeyChange()">',
                  '<option value="">— Upload your own —</option>',
                  logoOpts,
                '</select>',
                '<div class="drw-hint">Choose a built-in brand logo, or upload a custom image.</div>',
                '<label class="drw-upload-label">',
                  ICON_UPLOAD + ' Upload logo',
                  '<input type="file" accept="image/*" style="display:none" onchange="window._pmLogoFile(this)">',
                '</label>',
              '</div>',
            '</div>',
          '</div>',
        '</div>',

        '<!-- TYPE-SPECIFIC SECTION -->',
        '<div id="drwAccSection">',
          '<div class="drw-sec-label" id="drwAccLabel">Account &amp; Destination</div>',
          '<div class="drw-grid" id="drwTypeFields"></div>',
          '<div class="drw-grid" id="drwQrGrid" style="display:none;">',
            '<div class="drw-field drw-full">',
              '<label>QR Code <span class="drw-opt">(optional)</span></label>',
              '<div class="drw-logo-row">',
                '<div class="drw-qr-preview" id="drwQrPreview">' + qrHtml + '</div>',
                '<div class="drw-logo-opts">',
                  '<label class="drw-upload-label">',
                    ICON_UPLOAD + ' Upload QR image',
                    '<input type="file" accept="image/*" style="display:none" onchange="window._pmQrFile(this)">',
                  '</label>',
                  '<div class="drw-hint">PNG, JPG or SVG &middot; max 1 MB</div>',
                  '<button type="button" class="drw-clear-btn" id="drwQrClear" onclick="window._pmClearQr()" style="display:' + (hasQr ? 'inline-flex' : 'none') + ';">',
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Remove QR',
                  '</button>',
                '</div>',
              '</div>',
            '</div>',
          '</div>',
        '</div>',

        '<div class="drw-sec-label">Payment Instructions</div>',
        '<div class="drw-grid">',
          '<div class="drw-field drw-full">',
            '<label>Instructions shown to the customer</label>',
            '<textarea id="drw_instructions" rows="4" placeholder="Explain exactly how to pay, what to include in the reference, and anything specific to this payment method.">' + esc(c.instructions || '') + '</textarea>',
          '</div>',
        '</div>',

      '</div>',
      '<!-- DRAWER FOOTER -->',
      '<div class="drw-foot">',
        '<button class="btn btn-ghost" onclick="window._pmClose()">Cancel</button>',
        '<button class="btn btn-primary" onclick="window._pmSave(\'' + esc(pmId) + '\')">',
          isEdit ? 'Save Changes' : 'Add Payment Method',
        '</button>',
      '</div>'
    ].join('');

    document.body.appendChild(panel);

    requestAnimationFrame(function () {
      ov.classList.add('drw-open');
      panel.classList.add('drw-open');
    });

    // Render per-type fields with existing config values
    _renderTypeFields(type, c, pmId);
    setTimeout(function () { var i = $id('drw_name'); if (i) i.focus(); }, 240);
  }

  // Render type-specific fields into #drwTypeFields
  function _renderTypeFields(type, c, pmId) {
    c = c || {};
    var section  = $id('drwAccSection');
    var fields   = $id('drwTypeFields');
    var qrGrid   = $id('drwQrGrid');
    var accLabel = $id('drwAccLabel');
    if (!fields) return;

    // Card: no account destination fields
    if (type === 'card') {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';

    // Gift card: upload toggle fields
    if (type === 'gift') {
      if (accLabel) accLabel.textContent = 'Upload Requirements';
      if (qrGrid)   qrGrid.style.display = 'none';
      fields.innerHTML = _buildGiftToggles(c);
      return;
    }

    if (accLabel) accLabel.textContent = 'Account & Destination';

    var defs = getTypeFields(type, pmId);
    fields.innerHTML = defs.map(function (f) {
      return [
        '<div class="drw-field' + (f.full ? ' drw-full' : '') + '">',
          '<label>' + esc(f.label) + (f.optional ? ' <span class="drw-opt">(optional)</span>' : '') + '</label>',
          '<input id="drw_' + f.id + '" type="text" value="' + esc(c[f.id] || '') + '" placeholder="' + esc(f.ph || '') + '" autocomplete="off">',
        '</div>'
      ].join('');
    }).join('');

    if (qrGrid) qrGrid.style.display = (type === 'wallet' || type === 'bank' || type === 'crypto') ? '' : 'none';
  }
  window._renderTypeFields = _renderTypeFields;

  function _buildGiftToggles(c) {
    function row(id, label, checked, hint) {
      return [
        '<div class="drw-field drw-full drw-toggle-field">',
          '<div class="drw-toggle-text">',
            '<span class="drw-toggle-label">' + label + '</span>',
            '<span class="drw-toggle-hint">' + hint + '</span>',
          '</div>',
          '<label class="toggle-switch">',
            '<input type="checkbox" id="drw_' + id + '"' + (checked ? ' checked' : '') + '>',
            '<span class="toggle-slider"></span>',
          '</label>',
        '</div>'
      ].join('');
    }
    return [
      row('requireFrontImage',  'Require Front Image',  c.requireFrontImage  !== false, 'Customer must upload the front of the card'),
      row('requireBackImage',   'Require Back Image',   c.requireBackImage   !== false, 'Customer must upload the back of the card'),
      row('allowCameraCapture', 'Allow Camera Capture', c.allowCameraCapture !== false, 'Let customers photograph the card with their device camera')
    ].join('');
  }

  // ── Drawer event handlers ───────────────────────────────────────
  window._pmTypeChange = function () {
    var type = val('drw_type');
    // Try to infer a specific method id from the name for smart field selection
    var name = (val('drw_name') || '').toLowerCase().trim().replace(/\s+/g, '');
    var nameMap = { paypal: 'paypal', cashapp: 'cashapp', 'cashapp': 'cashapp', venmo: 'venmo', zelle: 'zelle', bitcoin: 'bitcoin', btc: 'bitcoin', ethereum: 'ethereum', eth: 'ethereum' };
    var mappedId = nameMap[name] || '';
    // Preserve existing config values already typed
    var c = _collectConfig();
    _renderTypeFields(type, c, mappedId);
  };

  window._pmLogoKeyChange = function () {
    _logoUpload = null; // user picked a built-in, clear any upload
    _updateLogoPreview();
  };

  window._pmLogoFile = function (input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    if (file.size > 700 * 1024) { showToast('Logo too large (max 700 KB)', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      _logoUpload = e.target.result;
      var sel = $id('drw_logoKey'); if (sel) sel.value = '';
      _updateLogoPreview();
    };
    reader.readAsDataURL(file);
    if (input) input.value = '';
  };

  window._pmQrFile = function (input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    if (file.size > 1200 * 1024) { showToast('QR image too large (max 1.2 MB)', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      _qrUpload = e.target.result;
      var thumb = $id('drwQrPreview');
      if (thumb) thumb.innerHTML = '<img src="' + _qrUpload + '" alt="QR code">';
      var clr = $id('drwQrClear'); if (clr) clr.style.display = 'inline-flex';
    };
    reader.readAsDataURL(file);
    if (input) input.value = '';
  };

  window._pmClearQr = function () {
    _qrUpload = ''; // empty string = "clear on save"
    var thumb = $id('drwQrPreview'); if (thumb) thumb.innerHTML = '<span>No QR</span>';
    var clr   = $id('drwQrClear');   if (clr)   clr.style.display = 'none';
  };

  function _updateLogoPreview() {
    var key   = val('drw_logoKey');
    var thumb = $id('drwLogoThumb');
    var head  = $id('drwHeadLogo');
    var html;
    if (_logoUpload) {
      html = '<img src="' + _logoUpload + '" alt="logo" style="width:52px;height:52px;object-fit:contain;border-radius:12px;">';
    } else if (key && PM.LOGO_KEYS[key]) {
      html = PM.logoImg({ id: key, logo: 'assets/payment-logos/' + PM.LOGO_KEYS[key] + '.svg', name: key }, 52);
    } else {
      html = PM.logoImg({ name: val('drw_name') || 'New' }, 52);
    }
    if (thumb) thumb.innerHTML = html;
    if (head)  head.innerHTML  = html;
  }

  function _collectConfig() {
    var c = {};
    var ALL_IDS = ['businessName', 'email', 'cashtag', 'username', 'merchantId',
      'paypalMeLink', 'recipientName', 'phone', 'accountNumber', 'walletAddress',
      'network', 'accountName'];
    ALL_IDS.forEach(function (k) {
      var el = $id('drw_' + k);
      if (el && el.value.trim()) c[k] = el.value.trim();
    });
    return c;
  }

  // ── Save ────────────────────────────────────────────────────────
  window._pmSave = function (id) {
    if (!PM) return;
    var name = (val('drw_name') || '').trim();
    if (!name) { showToast('Payment method name is required', 'error'); return; }
    var type  = val('drw_type') || 'wallet';
    var isNew = (id === 'new');

    var config = _collectConfig();

    // Gift card toggles
    ['requireFrontImage', 'requireBackImage', 'allowCameraCapture'].forEach(function (k) {
      var el = $id('drw_' + k);
      if (el) config[k] = el.checked;
    });

    // Instructions
    var instrEl = $id('drw_instructions');
    config.instructions = instrEl ? instrEl.value.trim() : '';

    // QR: new upload OR cleared OR keep existing
    if (_qrUpload !== null) {
      config.qrCode = _qrUpload;
    } else if (!isNew) {
      var existing = PM.get(id);
      config.qrCode = (existing && existing.config && existing.config.qrCode) || '';
    }

    // Logo
    var logo;
    var logoKey = val('drw_logoKey');
    if (_logoUpload) {
      logo = _logoUpload;
    } else if (logoKey && PM.LOGO_KEYS[logoKey]) {
      logo = 'assets/payment-logos/' + PM.LOGO_KEYS[logoKey] + '.svg';
    } else if (!isNew) {
      logo = (PM.get(id) || {}).logo || '';
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

    if (isNew) PM.add(payload);
    else       PM.update(id, payload);

    closeDrawer();
    renderPaymentMethods();
    showToast('Payment method ' + (isNew ? 'added successfully' : 'saved'));
  };

  // ── Backward-compat aliases (used by other modules / HTML) ──────
  window.savePaymentMethod = window._pmSave;

}());
