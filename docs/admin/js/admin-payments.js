// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Payment Methods (Enterprise)   ║
// ║  Backed by the unified TeslaPaymentMethods store so every  ║
// ║  change is instantly reflected on the customer page.       ║
// ╚══════════════════════════════════════════════════════════╝

var PM = window.TeslaPaymentMethods;
var pmEsc = (PM && PM.escapeHtml) ? PM.escapeHtml : function (s) { return s == null ? "" : String(s); };

// Transient upload buffers for the open modal.
var _pmLogoUpload = null; // data URL
var _pmQrUpload = null;   // data URL

function loadPaymentMethods() {
  renderPaymentMethods();
  if (PM && PM.syncFromApi) {
    PM.syncFromApi("admin", function () { renderPaymentMethods(); });
  }
}

// ── Rendering ──────────────────────────────────────────────────
function pmTypeLabel(t) {
  return ({ wallet: "Wallet / App", bank: "Bank Transfer", crypto: "Cryptocurrency", card: "Card", gift: "Gift Card" }[t]) || "Wallet / App";
}

function pmFormatDate(iso) {
  if (!iso) return "—";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderPaymentMethods() {
  var grid = document.getElementById("paymentMethodsGrid");
  if (!grid || !PM) return;
  var all = PM.getAll();

  // Stat tiles
  var enabled = all.filter(function (p) { return p.enabled; });
  var crypto = all.filter(function (p) { return p.type === "crypto"; });
  setText("pmTotalCount", all.length);
  setText("pmEnabledCount", enabled.length);
  setText("pmDisabledCount", all.length - enabled.length);
  setText("pmCryptoCount", crypto.length);

  // Filters
  var q = (val("pmSearch") || "").toLowerCase();
  var typeF = val("pmTypeFilter") || "all";
  var statusF = val("pmStatusFilter") || "all";
  var sort = val("pmSort") || "order";

  var list = all.filter(function (p) {
    if (typeF !== "all" && p.type !== typeF) return false;
    if (statusF === "active" && !p.enabled) return false;
    if (statusF === "inactive" && p.enabled) return false;
    if (q) {
      var hay = [p.name, p.description, p.type, (p.config && p.config.walletAddress),
        (p.config && p.config.email)].join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });

  list.sort(function (a, b) {
    if (sort === "name") return String(a.name).localeCompare(String(b.name));
    if (sort === "updated") return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
    if (sort === "status") return (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0);
    return (a.displayOrder || 999) - (b.displayOrder || 999);
  });

  var empty = document.getElementById("pmEmpty");
  if (list.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  grid.innerHTML = list.map(function (pm) {
    var isOn = pm.enabled;
    return '' +
      '<div class="pm-card' + (isOn ? "" : " pm-card-off") + '">' +
        '<div class="pm-card-top">' +
          '<div class="pm-logo-wrap">' + PM.logoImg(pm, 44) + '</div>' +
          '<label class="toggle-switch" title="' + (isOn ? "Disable" : "Enable") + '">' +
            '<input type="checkbox" ' + (isOn ? "checked" : "") + ' onchange="window.togglePaymentMethod(\'' + pm.id + '\')">' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
        '</div>' +
        '<div class="pm-name">' + pmEsc(pm.name) + '</div>' +
        '<div class="pm-desc">' + pmEsc(pm.description || pmTypeLabel(pm.type)) + '</div>' +
        '<div class="pm-badges">' +
          '<span class="pm-badge pm-badge-type">' + pmEsc(pmTypeLabel(pm.type)) + '</span>' +
          '<span class="pm-badge ' + (isOn ? "pm-badge-active" : "pm-badge-inactive") + '">' +
            (isOn ? "Active" : "Inactive") + '</span>' +
        '</div>' +
        '<div class="pm-meta">Updated ' + pmFormatDate(pm.lastUpdated) + '</div>' +
        '<div class="pm-actions">' +
          '<button class="btn btn-ghost btn-sm" onclick="window.editPaymentMethod(\'' + pm.id + '\')">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Configure</button>' +
          '<button class="btn btn-ghost btn-sm pm-del" onclick="window.deletePaymentMethod(\'' + pm.id + '\')" title="Delete">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>' +
        '</div>' +
      '</div>';
  }).join("");
}

function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }

// ── Toggle / delete ────────────────────────────────────────────
function togglePaymentMethod(id) {
  if (!PM) return;
  var pm = PM.toggle(id);
  renderPaymentMethods();
  if (pm) showToast(pm.name + " " + (pm.enabled ? "enabled" : "disabled"));
}

function deletePaymentMethod(id) {
  if (!PM) return;
  var pm = PM.get(id);
  if (!pm) return;
  if (!confirm('Delete "' + pm.name + '"? This removes it from the customer payment page.')) return;
  PM.delete(id);
  renderPaymentMethods();
  showToast("Payment method deleted");
}

function showAddPaymentMethod() { showPaymentMethodModal(null); }
function editPaymentMethod(id) { var pm = PM && PM.get(id); showPaymentMethodModal(pm || null); }

// ── Config modal (dedicated per-method configuration) ──────────
function pmField(label, id, value, opts) {
  opts = opts || {};
  var ph = opts.placeholder || "";
  var span = opts.full ? "grid-column:1/-1;" : "";
  var hint = opts.hint ? '<div class="pmf-hint">' + pmEsc(opts.hint) + '</div>' : '';
  return '<div class="pmf" style="' + span + '">' +
    '<label>' + pmEsc(label) + (opts.optional ? ' <span class="pmf-opt">(optional)</span>' : '') + '</label>' +
    '<input id="' + id + '" value="' + pmEsc(value || "") + '" placeholder="' + pmEsc(ph) + '">' + hint +
  '</div>';
}

function pmToggleField(label, id, checked, hint) {
  return '<div class="pmf pmf-toggle" style="grid-column:1/-1;">' +
    '<div><label style="margin:0;">' + pmEsc(label) + '</label>' +
    (hint ? '<div class="pmf-hint">' + pmEsc(hint) + '</div>' : '') + '</div>' +
    '<label class="toggle-switch"><input type="checkbox" id="' + id + '" ' + (checked ? "checked" : "") + '><span class="toggle-slider"></span></label>' +
  '</div>';
}

// Which config fields to show per type.
function pmTypeFields(type, c) {
  c = c || {};
  var f = "";
  if (type === "wallet") {
    f += pmField("Business / Account Name", "cfg_businessName", c.businessName || c.accountName, { optional: true, placeholder: "Tesla Global Awards LLC" });
    f += pmField("Payment Email", "cfg_email", c.email, { optional: true, placeholder: "payments@company.com" });
    f += pmField("Cash Tag", "cfg_cashtag", c.cashtag, { optional: true, placeholder: "$YourCashtag" });
    f += pmField("Username / Handle", "cfg_username", c.username, { optional: true, placeholder: "@YourHandle" });
    f += pmField("Merchant ID", "cfg_merchantId", c.merchantId, { optional: true });
    f += pmField("PayPal.Me Link", "cfg_paypalMeLink", c.paypalMeLink, { optional: true, placeholder: "https://paypal.me/…" });
  } else if (type === "bank") {
    f += pmField("Recipient Name", "cfg_recipientName", c.recipientName || c.accountName, { placeholder: "Full recipient name" });
    f += pmField("Email", "cfg_email", c.email, { optional: true, placeholder: "zelle@company.com" });
    f += pmField("Phone Number", "cfg_phone", c.phone, { optional: true, placeholder: "+1 (555) 123-4567" });
    f += pmField("Account Number", "cfg_accountNumber", c.accountNumber, { optional: true });
  } else if (type === "crypto") {
    f += pmField("Wallet Address", "cfg_walletAddress", c.walletAddress, { full: true, placeholder: "Public wallet address" });
    f += pmField("Network", "cfg_network", c.network, { placeholder: "e.g. Bitcoin Mainnet / ERC-20 / TRC-20" });
  } else if (type === "gift") {
    f += pmToggleField("Require Front Image", "cfg_requireFrontImage", c.requireFrontImage !== false, "Customer must upload the front of the card");
    f += pmToggleField("Require Back Image", "cfg_requireBackImage", c.requireBackImage !== false, "Customer must upload the back of the card");
    f += pmToggleField("Allow Camera Capture", "cfg_allowCameraCapture", c.allowCameraCapture !== false, "Let customers photograph the card with their device camera");
  }
  // card: no destination fields (instructions + status only)
  return f;
}

function showPaymentMethodModal(pm) {
  var isEdit = !!pm;
  _pmLogoUpload = null;
  _pmQrUpload = null;
  var c = (pm && pm.config) || {};
  var type = (pm && pm.type) || "wallet";
  var existing = document.querySelector(".modal-overlay");
  if (existing) existing.remove();

  var overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  var logoPreview = pm ? PM.logoImg(pm, 56) : PM.logoImg({ name: "New" }, 56);
  var showQr = (type === "wallet" || type === "crypto" || type === "bank");

  overlay.innerHTML =
  '<div class="pm-modal">' +
    '<div class="pm-modal-head">' +
      '<div class="pm-modal-logo" id="pmModalLogo">' + logoPreview + '</div>' +
      '<div><h3>' + (isEdit ? "Configure Payment Method" : "Add Payment Method") + '</h3>' +
      '<p>' + (isEdit ? pmEsc(pm.name) + " · " + pmTypeLabel(type) : "Create a new payment method — it appears on the customer page when enabled.") + '</p></div>' +
      '<button class="pm-modal-x" onclick="this.closest(\'.modal-overlay\').remove()" aria-label="Close">&times;</button>' +
    '</div>' +
    '<div class="pm-modal-body">' +
      '<div class="pmf-section">Basics</div>' +
      '<div class="pmf-grid">' +
        pmField("Payment Method Name", "cfg_name", pm ? pm.name : "", { placeholder: "e.g. PayPal", full: true }) +
        pmField("Short Description", "cfg_description", pm ? pm.description : "", { placeholder: "Shown under the name", full: true }) +
        '<div class="pmf"><label>Type</label><select id="cfg_type" onchange="window.pmRerenderTypeFields()">' +
          ["wallet", "bank", "crypto", "card", "gift"].map(function (t) {
            return '<option value="' + t + '"' + (t === type ? " selected" : "") + '>' + pmTypeLabel(t) + '</option>';
          }).join("") +
        '</select></div>' +
        pmField("Display Order", "cfg_displayOrder", pm ? pm.displayOrder : "", { placeholder: "1" }) +
        pmToggleField("Enabled (visible to customers)", "cfg_enabled", pm ? pm.enabled : true) +
      '</div>' +

      '<div class="pmf-section">Branding</div>' +
      '<div class="pmf-grid">' +
        '<div class="pmf" style="grid-column:1/-1;">' +
          '<label>Logo</label>' +
          '<div class="pm-logo-row">' +
            '<div class="pm-logo-thumb" id="pmLogoThumb">' + logoPreview + '</div>' +
            '<div style="flex:1;min-width:160px;">' +
              '<select id="cfg_logoKey" onchange="window.pmUpdateLogoPreview()">' +
                '<option value="">— Use uploaded / brand logo —</option>' +
                Object.keys(PM.LOGO_KEYS).map(function (k) {
                  var sel = (pm && pm.logo && pm.logo.indexOf(k + ".svg") !== -1) ? " selected" : "";
                  return '<option value="' + k + '"' + sel + '>' + k + '</option>';
                }).join("") +
              '</select>' +
              '<div class="pmf-hint">Pick a built-in brand logo, or upload your own below.</div>' +
              '<label class="pm-upload-btn">Upload logo<input type="file" accept="image/*" style="display:none" onchange="window.pmHandleLogoUpload(this)"></label>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="pmf-section" id="pmDestSection">Account &amp; Destination</div>' +
      '<div class="pmf-grid" id="pmTypeFields">' + pmTypeFields(type, c) + '</div>' +

      (showQr ?
      '<div class="pmf-grid" id="pmQrGrid">' +
        '<div class="pmf" style="grid-column:1/-1;"><label>QR Code <span class="pmf-opt">(optional)</span></label>' +
          '<div class="pm-logo-row">' +
            '<div class="pm-qr-thumb" id="pmQrThumb">' + (c.qrCode ? '<img src="' + pmEsc(c.qrCode) + '" alt="QR">' : '<span>No QR</span>') + '</div>' +
            '<label class="pm-upload-btn">Upload QR image<input type="file" accept="image/*" style="display:none" onchange="window.pmHandleQrUpload(this)"></label>' +
          '</div>' +
        '</div>' +
      '</div>' : '') +

      '<div class="pmf-section">Payment Instructions</div>' +
      '<div class="pmf-grid">' +
        '<div class="pmf" style="grid-column:1/-1;"><label>Instructions shown to the customer</label>' +
          '<textarea id="cfg_instructions" rows="4" placeholder="Explain exactly how to pay…">' + pmEsc(c.instructions || "") + '</textarea></div>' +
      '</div>' +
    '</div>' +
    '<div class="pm-modal-foot">' +
      '<button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="window.savePaymentMethod(\'' + (isEdit ? pm.id : "new") + '\')">' +
        (isEdit ? "Save Changes" : "Add Method") + '</button>' +
    '</div>' +
  '</div>';

  overlay.addEventListener("click", function (e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  pmUpdateDestVisibility(type);
  setTimeout(function () { var i = document.getElementById("cfg_name"); if (i) i.focus(); }, 80);
}

function pmRerenderTypeFields() {
  var type = val("cfg_type");
  var container = document.getElementById("pmTypeFields");
  if (container) container.innerHTML = pmTypeFields(type, pmCollectConfigSafe());
  pmUpdateDestVisibility(type);
}

function pmUpdateDestVisibility(type) {
  var sec = document.getElementById("pmDestSection");
  var fields = document.getElementById("pmTypeFields");
  var qr = document.getElementById("pmQrGrid");
  var hasDest = (type !== "card");
  if (sec) sec.style.display = hasDest ? "" : "none";
  if (fields) fields.style.display = hasDest ? "" : "none";
  if (qr) qr.style.display = (type === "wallet" || type === "crypto" || type === "bank") ? "" : "none";
}

// Collect current config inputs without throwing if some are absent.
function pmCollectConfigSafe() {
  var c = {};
  ["businessName", "accountName", "email", "cashtag", "username", "merchantId",
   "paypalMeLink", "recipientName", "phone", "accountNumber", "walletAddress", "network"].forEach(function (k) {
    var el = document.getElementById("cfg_" + k);
    if (el) c[k] = el.value;
  });
  return c;
}

function pmUpdateLogoPreview() {
  var key = val("cfg_logoKey");
  var thumb = document.getElementById("pmLogoThumb");
  var head = document.getElementById("pmModalLogo");
  var html;
  if (_pmLogoUpload) html = '<img src="' + _pmLogoUpload + '" alt="logo" style="width:56px;height:56px;object-fit:contain;border-radius:11px;">';
  else if (key) html = PM.logoImg({ id: key, logo: "assets/payment-logos/" + PM.LOGO_KEYS[key] + ".svg", name: key }, 56);
  else html = PM.logoImg({ name: val("cfg_name") || "New" }, 56);
  if (thumb) thumb.innerHTML = html;
  if (head) head.innerHTML = html;
}

function pmHandleLogoUpload(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 400 * 1024) { showToast("Logo too large (max 400KB)", "error"); return; }
  var reader = new FileReader();
  reader.onload = function (e) {
    _pmLogoUpload = e.target.result;
    var sel = document.getElementById("cfg_logoKey"); if (sel) sel.value = "";
    pmUpdateLogoPreview();
  };
  reader.readAsDataURL(file);
  input.value = "";
}

function pmHandleQrUpload(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 800 * 1024) { showToast("QR image too large (max 800KB)", "error"); return; }
  var reader = new FileReader();
  reader.onload = function (e) {
    _pmQrUpload = e.target.result;
    var thumb = document.getElementById("pmQrThumb");
    if (thumb) thumb.innerHTML = '<img src="' + _pmQrUpload + '" alt="QR">';
  };
  reader.readAsDataURL(file);
  input.value = "";
}

function savePaymentMethod(id) {
  if (!PM) return;
  var name = (val("cfg_name") || "").trim();
  if (!name) { showToast("Payment method name is required", "error"); return; }
  var type = val("cfg_type") || "wallet";

  // Build config from the visible fields.
  var config = {};
  var map = {
    businessName: "cfg_businessName", accountName: "cfg_accountName", email: "cfg_email",
    cashtag: "cfg_cashtag", username: "cfg_username", merchantId: "cfg_merchantId",
    paypalMeLink: "cfg_paypalMeLink", recipientName: "cfg_recipientName", phone: "cfg_phone",
    accountNumber: "cfg_accountNumber", walletAddress: "cfg_walletAddress", network: "cfg_network"
  };
  Object.keys(map).forEach(function (k) {
    var el = document.getElementById(map[k]);
    if (el && el.value.trim() !== "") config[k] = el.value.trim();
  });
  ["requireFrontImage", "requireBackImage", "allowCameraCapture"].forEach(function (k) {
    var el = document.getElementById("cfg_" + k);
    if (el) config[k] = el.checked;
  });
  var instr = document.getElementById("cfg_instructions");
  config.instructions = instr ? instr.value.trim() : "";
  var existingQr = id !== "new" ? ((PM.get(id) || {}).config || {}).qrCode : "";
  config.qrCode = _pmQrUpload || existingQr || "";

  // Logo: uploaded data URL > selected brand key > keep existing
  var logo;
  var logoKey = val("cfg_logoKey");
  if (_pmLogoUpload) logo = _pmLogoUpload;
  else if (logoKey && PM.LOGO_KEYS[logoKey]) logo = "assets/payment-logos/" + PM.LOGO_KEYS[logoKey] + ".svg";
  else logo = id !== "new" ? (PM.get(id) || {}).logo : "";

  var payload = {
    name: name,
    description: (val("cfg_description") || "").trim(),
    type: type,
    displayOrder: parseInt(val("cfg_displayOrder"), 10) || undefined,
    enabled: (document.getElementById("cfg_enabled") || {}).checked !== false,
    logo: logo,
    config: config
  };

  if (id === "new") PM.add(payload);
  else PM.update(id, payload);

  var modal = document.querySelector(".modal-overlay");
  if (modal) modal.remove();
  renderPaymentMethods();
  showToast("Payment method " + (id === "new" ? "added" : "saved"));
}
