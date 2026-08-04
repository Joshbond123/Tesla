// ╔══════════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Payment Methods (v3 Redesign)   ║
// ║  Premium UI · Supabase-first persistence · No hard-coded    ║
// ║  mock data shown in the admin panel.                         ║
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

  function typeLabel(t) {
    return ({ wallet: 'Wallet / App', bank: 'Bank Transfer', crypto: 'Cryptocurrency', card: 'Card', gift: 'Gift Card' }[t]) || 'Wallet / App';
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

  // ── Load & render ───────────────────────────────────────────────
  window.loadPaymentMethods = function () {
    renderPaymentMethods();
    if (PM && PM.syncFromApi) {
      // Show loading indicator while syncing
      var grid = $id('paymentMethodsGrid');
      if (grid && (!PM.getAll || PM.getAll().length === 0)) {
        grid.innerHTML = _loadingHtml();
      }
      PM.syncFromApi('admin', function (synced) {
        renderPaymentMethods();
      });
    }
  };

  function _loadingHtml() {
    return '<div class="pm3-loading" style="grid-column:1/-1">' +
      '<div class="pm3-spinner"></div>' +
      '<p>Loading payment methods from database…</p>' +
      '</div>';
  }

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
      // Still loading or truly empty DB
      grid.innerHTML = _loadingHtml();
      if (empty) empty.style.display = 'none';
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

      return '<div class="pm3-card' + (isActive ? '' : ' pm3-card--inactive') + '" data-id="' + esc(p.id) + '">' +
        // Top accent bar
        '<div class="pm3-card__accent" style="background:' + color + '"></div>' +

        // Header row
        '<div class="pm3-card__header">' +
          '<div class="pm3-card__logo">' +
            (logo
              ? '<img src="' + esc(logo) + '" alt="' + esc(p.name) + '" onerror="this.style.display=\'none\'">'
              : '<div class="pm3-card__logo-fallback" style="background:' + color + '22;color:' + color + '">' + typeIcon(p.type) + '</div>') +
          '</div>' +
          '<div class="pm3-card__status">' +
            '<button class="pm3-toggle' + (isActive ? ' pm3-toggle--on' : '') + '" onclick="togglePaymentMethod(\'' + esc(p.id) + '\')" title="' + (isActive ? 'Disable' : 'Enable') + '">' +
              '<span class="pm3-toggle__thumb"></span>' +
            '</button>' +
          '</div>' +
        '</div>' +

        // Body
        '<div class="pm3-card__body">' +
          '<div class="pm3-card__name">' + esc(p.name) + '</div>' +
          '<div class="pm3-card__type"><span class="pm3-badge pm3-badge--type" style="--badge-color:' + color + '">' + typeIcon(p.type) + typeLabel(p.type) + '</span></div>' +
          (summary ? '<div class="pm3-card__summary" title="' + esc(summary) + '">' + esc(summary) + '</div>' : '<div class="pm3-card__summary pm3-card__summary--empty">No account details configured</div>') +
          '<div class="pm3-card__meta">' +
            '<span class="pm3-badge pm3-badge--status' + (isActive ? ' pm3-badge--on' : ' pm3-badge--off') + '">' +
              (isActive
                ? '<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>Active'
                : '<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>Inactive') +
            '</span>' +
            (p.lastUpdated ? '<span class="pm3-card__updated">Updated ' + fmtDate(p.lastUpdated) + '</span>' : '') +
          '</div>' +
        '</div>' +

        // Footer actions
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

  // ── Public action callbacks ─────────────────────────────────────
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

  // ── Drawer ──────────────────────────────────────────────────────
  function openDrawer(method) {
    _editingId   = method ? method.id : null;
    _logoUpload  = null;
    _qrUpload    = null;

    // Ensure drawer exists
    var drw = $id('pmDrawer');
    if (!drw) { buildDrawerHtml(); drw = $id('pmDrawer'); }

    // Populate fields
    var isNew = !method;
    setText('drwTitle', isNew ? 'Add Payment Method' : 'Edit Payment Method');
    setText('drwSubtitle', isNew ? 'Add a new payment method to your checkout' : 'Update the payment method details and configuration');

    _setVal('drw_id',          isNew ? '' : (method.id || ''));
    _setVal('drw_name',        isNew ? '' : (method.name || ''));
    _setVal('drw_description', isNew ? '' : (method.description || ''));
    _setVal('drw_type',        isNew ? 'wallet' : (method.type || 'wallet'));
    _setVal('drw_order',       isNew ? '' : (method.displayOrder || ''));

    var enabledEl = $id('drw_enabled');
    if (enabledEl) enabledEl.checked = isNew ? true : (method.enabled !== false);

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
    if (logoFileName) logoFileName.textContent = !isNew && method.logo ? 'Current logo' : 'No file selected';

    // Config fields
    updateConfigFields(isNew ? 'wallet' : (method.type || 'wallet'), isNew ? {} : (method.config || {}));

    // Open overlay + panel
    var overlay = $id('pmDrawerOverlay');
    if (overlay) {
      overlay.classList.add('pm3-drw-open');
      setTimeout(function () { var panel = $id('pmDrawerPanel'); if (panel) panel.classList.add('pm3-drw-panel-open'); }, 10);
    }

    // Focus first input
    setTimeout(function () { var n = $id('drw_name'); if (n) n.focus(); }, 200);
  }

  function closeDrawer() {
    var panel = $id('pmDrawerPanel');
    if (panel) panel.classList.remove('pm3-drw-panel-open');
    setTimeout(function () {
      var overlay = $id('pmDrawerOverlay');
      if (overlay) overlay.classList.remove('pm3-drw-open');
    }, 300);
    _editingId  = null;
    _logoUpload = null;
    _qrUpload   = null;
  }

  window.closePaymentDrawer = closeDrawer;

  // ── Build drawer HTML ──────────────────────────────────────────
  function buildDrawerHtml() {
    var div = document.createElement('div');
    div.id = 'pmDrawer';
    div.innerHTML = '' +
      '<div id="pmDrawerOverlay" class="pm3-drw-overlay" onclick="closePaymentDrawer()">' +
        '<div id="pmDrawerPanel" class="pm3-drw-panel" onclick="event.stopPropagation()">' +
          // Header
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
          // Body
          '<div class="pm3-drw-body">' +
            // Basic info section
            '<div class="pm3-drw-section">' +
              '<div class="pm3-drw-section-title">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>' +
                'Basic Information' +
              '</div>' +
              '<div class="pm3-drw-grid2">' +
                '<div class="pm3-field">' +
                  '<label class="pm3-label">Method Name <span class="pm3-req">*</span></label>' +
                  '<input class="pm3-input" id="drw_name" type="text" placeholder="e.g. PayPal, Cash App, Bitcoin" autocomplete="off">' +
                '</div>' +
                '<div class="pm3-field">' +
                  '<label class="pm3-label">Type <span class="pm3-req">*</span></label>' +
                  '<select class="pm3-select" id="drw_type" onchange="updateConfigFields(this.value, {})">' +
                    '<option value="wallet">Wallet / App</option>' +
                    '<option value="bank">Bank Transfer</option>' +
                    '<option value="crypto">Cryptocurrency</option>' +
                    '<option value="card">Card</option>' +
                    '<option value="gift">Gift Card</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="pm3-field">' +
                '<label class="pm3-label">Description</label>' +
                '<input class="pm3-input" id="drw_description" type="text" placeholder="Brief description shown to customers" autocomplete="off">' +
              '</div>' +
              '<div class="pm3-drw-grid2">' +
                '<div class="pm3-field">' +
                  '<label class="pm3-label">ID <span style="font-size:11px;font-weight:500;color:var(--admin-text-muted)">(auto-generated for new)</span></label>' +
                  '<input class="pm3-input pm3-input--mono" id="drw_id" type="text" placeholder="e.g. paypal, cashapp" autocomplete="off">' +
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

            // Logo section
            '<div class="pm3-drw-section">' +
              '<div class="pm3-drw-section-title">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>' +
                'Payment Logo' +
              '</div>' +
              '<div class="pm3-logo-upload-area">' +
                '<div class="pm3-logo-preview" id="drwLogoPreview" style="display:none"></div>' +
                '<div class="pm3-logo-upload-controls">' +
                  '<label class="pm3-upload-btn" for="drwLogoFile">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
                    'Upload Logo' +
                  '</label>' +
                  '<input type="file" id="drwLogoFile" accept="image/*" style="display:none" onchange="handleLogoUpload(this)">' +
                  '<span class="pm3-upload-filename" id="drwLogoFileName">No file selected</span>' +
                  '<button class="pm3-clear-btn" id="drwLogoClearBtn" onclick="clearLogoUpload()" style="display:none">Remove</button>' +
                '</div>' +
                '<p class="pm3-upload-hint">PNG, SVG, JPG or WebP. Logo appears on the customer payment page.</p>' +
              '</div>' +
            '</div>' +

            // Config fields (type-dependent)
            '<div class="pm3-drw-section" id="drwConfigSection">' +
              '<div class="pm3-drw-section-title">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M16.24 7.76a6 6 0 0 1 0 8.49"/></svg>' +
                'Payment Details' +
              '</div>' +
              '<div id="drwConfigFields"></div>' +
            '</div>' +

          '</div>' + // end body
          // Footer
          '<div class="pm3-drw-foot">' +
            '<button class="pm3-btn-ghost" onclick="closePaymentDrawer()">Cancel</button>' +
            '<button class="pm3-btn-save" onclick="window._pmSave()">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13"/><polyline points="7,3 7,8 15,8"/></svg>' +
              'Save Changes' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);
  }

  // ── Logo upload handling ──────────────────────────────────────
  window.handleLogoUpload = function (input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      _logoUpload = e.target.result;
      var preview = $id('drwLogoPreview');
      if (preview) {
        preview.innerHTML = '<img src="' + _logoUpload + '" alt="logo preview">';
        preview.style.display = 'flex';
      }
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

  // ── Config fields (per payment type) ──────────────────────────
  window.updateConfigFields = function (type, existingConfig) {
    var cfg = existingConfig || {};
    // If existingConfig not passed, check if we're editing
    if (!existingConfig && _editingId) {
      var m = PM && PM.get(_editingId);
      cfg = m ? (m.config || {}) : {};
    }

    var container = $id('drwConfigFields');
    if (!container) return;

    var fields = '';

    if (type === 'wallet') {
      fields += _field('drw_email',       'Email / PayPal Address',    'text',     cfg.email     || cfg.paypalEmail || '', 'payments@yourdomain.com');
      fields += _field('drw_cashtag',     'Cashtag / Username / Handle','text',    cfg.cashtag   || cfg.username   || '', '$YourHandle or @username');
      fields += _field('drw_accountName', 'Account / Business Name',   'text',     cfg.accountName || cfg.businessName || '', 'Your Business Name');
      fields += _field('drw_paypalMe',    'PayPal.me Link',            'text',     cfg.paypalMeLink || '', 'https://paypal.me/yourname');
      fields += _field('drw_phone',       'Phone Number',              'tel',      cfg.phone     || '', '+1 (555) 000-0000');
      fields += _qrField(cfg.qrCode || '');
      fields += _field('drw_instructions','Payment Instructions',      'textarea', cfg.instructions || '', 'Instructions shown to customers…');
    } else if (type === 'bank') {
      fields += _field('drw_recipientName','Recipient / Account Name', 'text',     cfg.recipientName || cfg.accountName || '', 'Business Legal Name');
      fields += _field('drw_email',        'Email Address',            'email',    cfg.email     || '', 'bank@yourdomain.com');
      fields += _field('drw_phone',        'Phone / Zelle Number',     'tel',      cfg.phone     || '', '+1 (555) 000-0000');
      fields += _field('drw_bankName',     'Bank Name',                'text',     cfg.bankName  || '', 'Chase, Wells Fargo, etc.');
      fields += _field('drw_accountNumber','Account Number',           'text',     cfg.accountNumber || '', '000000000000');
      fields += _field('drw_routingNumber','Routing Number',           'text',     cfg.routingNumber || '', '000000000');
      fields += _field('drw_swiftCode',    'SWIFT / IBAN (optional)',  'text',     cfg.swiftCode || cfg.iban || '', 'CHASUS33 or GB00XXXX…');
      fields += _qrField(cfg.qrCode || '');
      fields += _field('drw_instructions','Payment Instructions',      'textarea', cfg.instructions || '', 'Instructions for customers…');
    } else if (type === 'crypto') {
      fields += _field('drw_walletAddress','Wallet Address',           'text',     cfg.walletAddress || '', 'bc1q…, 0x…, T…');
      fields += _field('drw_network',      'Network / Chain',          'text',     cfg.network   || '', 'Bitcoin Mainnet, Ethereum, TRON…');
      fields += _field('drw_memo',         'Memo / Tag (if required)', 'text',     cfg.memo      || '', 'Leave blank if not required');
      fields += _qrField(cfg.qrCode || '');
      fields += _field('drw_instructions','Payment Instructions',      'textarea', cfg.instructions || '', 'Send the exact amount in ' + (cfg.network || 'this currency') + '…');
    } else if (type === 'card') {
      fields += _field('drw_merchantName', 'Merchant Name',            'text',     cfg.merchantName  || '', 'Your Business Name');
      fields += _field('drw_merchantId',   'Merchant ID / Account',    'text',     cfg.merchantId || cfg.merchantAccount || '', 'MRC-0000000');
      fields += _field('drw_acceptedNetworks','Accepted Networks',     'text',     cfg.acceptedNetworks || '', 'Visa, Mastercard, Amex, Discover');
      fields += _field('drw_supportPhone', 'Support Phone',            'tel',      cfg.supportPhone  || cfg.phone || '', '+1 (888) 000-0000');
      fields += _field('drw_instructions','Payment Instructions',      'textarea', cfg.instructions || '', 'Enter your card details…');
    } else if (type === 'gift') {
      fields += _field('drw_instructions','Redemption Instructions',   'textarea', cfg.instructions || '', 'How to purchase and redeem the gift card…');
      fields += _field('drw_denominations','Accepted Denominations',   'text',     cfg.denominationsAccepted || '', '$25, $50, $100, $200');
      fields += _field('drw_purchaseLoc',  'Where to Purchase',        'text',     cfg.purchaseLocations || '', 'Apple Store, Amazon, Walmart…');
    }

    container.innerHTML = fields;
    _attachToggle();
  };

  function _field(id, label, type, value, placeholder) {
    var val = esc(value || '');
    var ph  = esc(placeholder || '');
    if (type === 'textarea') {
      return '<div class="pm3-field">' +
        '<label class="pm3-label">' + label + '</label>' +
        '<textarea class="pm3-input pm3-textarea" id="' + id + '" placeholder="' + ph + '" rows="3">' + val + '</textarea>' +
        '</div>';
    }
    return '<div class="pm3-field">' +
      '<label class="pm3-label">' + label + '</label>' +
      '<input class="pm3-input" id="' + id + '" type="' + type + '" value="' + val + '" placeholder="' + ph + '" autocomplete="off">' +
      '</div>';
  }

  function _qrField(existingDataUrl) {
    var preview = existingDataUrl
      ? '<div class="pm3-qr-preview" id="drwQrPreview"><img src="' + existingDataUrl + '" alt="QR code"><button class="pm3-clear-btn" onclick="clearQrUpload()">Remove</button></div>'
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

  function _attachToggle() {
    // Sync toggle visual state
    var enabledEl = $id('drw_enabled');
    var toggleEl = document.querySelector('.pm3-field-toggle');
    if (enabledEl && toggleEl) {
      toggleEl.classList.toggle('pm3-field-toggle--on', enabledEl.checked);
    }
  }

  window.handleQrUpload = function (input) {
    if (!input.files || !input.files[0]) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      _qrUpload = e.target.result;
      var preview = $id('drwQrPreview');
      if (preview) {
        preview.innerHTML = '<img src="' + _qrUpload + '" alt="QR preview"><button class="pm3-clear-btn" onclick="clearQrUpload()">Remove</button>';
        preview.classList.remove('pm3-qr-preview--empty');
      }
      var fname = $id('drwQrFileName');
      if (fname) fname.textContent = input.files[0].name;
    };
    reader.readAsDataURL(input.files[0]);
  };

  window.clearQrUpload = function () {
    _qrUpload = '';
    var preview = $id('drwQrPreview');
    if (preview) { preview.innerHTML = ''; preview.classList.add('pm3-qr-preview--empty'); }
    var fname = $id('drwQrFileName');
    if (fname) fname.textContent = 'No file selected';
    var fileInput = $id('drwQrFile');
    if (fileInput) fileInput.value = '';
  };

  // ── Helper ────────────────────────────────────────────────────
  function _setVal(id, v) { var e = $id(id); if (e) { if (e.tagName === 'TEXTAREA' || e.tagName === 'INPUT' || e.tagName === 'SELECT') e.value = v || ''; } }

  // ── Save handler ───────────────────────────────────────────────
  window._pmSave = function () {
    var isNew = !_editingId;
    var name  = (val('drw_name') || '').trim();
    if (!name) { showToast('Method name is required', 'error'); $id('drw_name').focus(); return; }

    var type  = val('drw_type') || 'wallet';
    var id    = (val('drw_id') || '').trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (isNew && PM.get(id)) { showToast('A method with ID "' + id + '" already exists', 'error'); return; }

    // Build config from type-specific fields
    var config = {};
    if (type === 'wallet') {
      config.email        = val('drw_email').trim();
      config.cashtag      = val('drw_cashtag').trim();
      config.accountName  = val('drw_accountName').trim();
      config.paypalMeLink = val('drw_paypalMe').trim();
      config.phone        = val('drw_phone').trim();
      config.instructions = val('drw_instructions').trim();
    } else if (type === 'bank') {
      config.recipientName  = val('drw_recipientName').trim();
      config.email          = val('drw_email').trim();
      config.phone          = val('drw_phone').trim();
      config.bankName       = val('drw_bankName').trim();
      config.accountNumber  = val('drw_accountNumber').trim();
      config.routingNumber  = val('drw_routingNumber').trim();
      config.swiftCode      = val('drw_swiftCode').trim();
      config.instructions   = val('drw_instructions').trim();
    } else if (type === 'crypto') {
      config.walletAddress = val('drw_walletAddress').trim();
      config.network       = val('drw_network').trim();
      config.memo          = val('drw_memo').trim();
      config.instructions  = val('drw_instructions').trim();
    } else if (type === 'card') {
      config.merchantName     = val('drw_merchantName').trim();
      config.merchantId       = val('drw_merchantId').trim();
      config.acceptedNetworks = val('drw_acceptedNetworks').trim();
      config.supportPhone     = val('drw_supportPhone').trim();
      config.instructions     = val('drw_instructions').trim();
    } else if (type === 'gift') {
      config.instructions         = val('drw_instructions').trim();
      config.denominationsAccepted= val('drw_denominations').trim();
      config.purchaseLocations    = val('drw_purchaseLoc').trim();
    }

    // QR upload
    if (_qrUpload !== null) {
      config.qrCode = _qrUpload;
    } else if (!isNew) {
      var existingM = PM.get(_editingId);
      config.qrCode = (existingM && existingM.config && existingM.config.qrCode) || '';
    }

    // Logo
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

    // Disable save button during async push
    var saveBtn = document.querySelector('.pm3-btn-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    if (isNew) {
      payload.id = id;
      PM.add(payload);
    } else {
      PM.update(_editingId, payload);
    }

    closeDrawer();
    renderPaymentMethods();
    showToast('Payment method ' + (isNew ? 'added' : 'saved') + ' successfully');

    // Re-sync from API after a short delay to confirm DB state
    setTimeout(function () {
      if (PM && PM.syncFromApi) {
        PM.syncFromApi('admin', function () {
          renderPaymentMethods();
        });
      }
    }, 1200);
  };

  // ── Backward-compat aliases ────────────────────────────────────
  window.savePaymentMethod = window._pmSave;

  // Expose renderPaymentMethods globally for search/filter handlers
  window.renderPaymentMethods = renderPaymentMethods;

}());
