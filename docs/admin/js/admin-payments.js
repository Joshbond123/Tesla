// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Payment Methods CRUD
// ║  Uses the shared TeslaPaymentMethods module as the single
// ║  source of truth — changes here are immediately reflected
// ║  on the customer Payment page.
// ╚══════════════════════════════════════════════════════════╝

"use strict";

// Helper: get the shared PM module (loaded from js/payment-methods.js)
function getPM() { return window.TeslaPaymentMethods || null; }

// ---- LOAD ----
function loadPaymentMethods() {
  var PM = getPM();
  try {
    if (PM) {
      paymentMethods = PM.load();
    } else {
      var saved = localStorage.getItem("tesla_payment_methods");
      paymentMethods = saved ? JSON.parse(saved) : defaultPaymentMethods.slice();
    }
  } catch(e) {
    paymentMethods = defaultPaymentMethods.slice();
  }
  renderPaymentMethods();
}

// ---- HELPERS ----
function _pmSave() {
  var PM = getPM();
  if (PM) PM.save(paymentMethods);
  else localStorage.setItem("tesla_payment_methods", JSON.stringify(paymentMethods));
}

function _pmDisplayName(pm) {
  return pm.display_name || pm.name || "Payment";
}

function _pmAddress(pm) {
  var cfg = pm.config || {};
  return cfg.walletAddress || cfg.email || cfg.cashtag || cfg.username || cfg.phone
      || pm.wallet_address || pm.account_details || "";
}

function _pmInstructions(pm) {
  var cfg = pm.config || {};
  return cfg.instructions || pm.payment_instructions || "";
}

function _pmCategory(pm) {
  return pm.category || pm.type || "digital";
}

function _pmOrder(pm) {
  return pm.displayOrder || pm.sort_order || 99;
}

function _renderLogo(pm) {
  if (!pm || !pm.logo) return "";
  var lg = pm.logo;
  // New format: inline SVG string
  if (lg.indexOf("<svg") !== -1 || lg.indexOf("<SVG") !== -1) {
    return '<div style="height:30px;display:flex;align-items:center;overflow:hidden;">' + lg + "</div>";
  }
  // Old format: SVG sprite id (e.g. "pay-paypal")
  return '<svg class="pay-logo-svg" width="100%" height="32" viewBox="0 0 24 24"><use href="assets/payment-logos.svg#' + lg + '"/></svg>';
}

// ---- RENDER ----
function renderPaymentMethods() {
  var grid = document.getElementById("paymentMethodsGrid");
  if (!grid) return;
  try {
    var enabled  = paymentMethods.filter(function(p) { return p.enabled !== false; });
    var disabled = paymentMethods.filter(function(p) { return p.enabled === false; });
    var ec = document.getElementById("pmEnabledCount");  if (ec) ec.textContent  = enabled.length  + " enabled";
    var dc = document.getElementById("pmDisabledCount"); if (dc) dc.textContent = disabled.length + " disabled";

    if (!paymentMethods || paymentMethods.length === 0) {
      grid.innerHTML = "<div style=\"text-align:center;padding:40px;color:var(--admin-text-muted);grid-column:1/-1;\">No payment methods configured.</div>";
      return;
    }

    var all = paymentMethods.slice().sort(function(a, b) { return _pmOrder(a) - _pmOrder(b); });

    grid.innerHTML = all.map(function(pm) {
      var safeId    = String(pm.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      var pn        = _pmDisplayName(pm);
      var isEnabled = pm.enabled !== false;
      var logoHtml  = _renderLogo(pm);
      var checkIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>';
      var xIcon     = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      return "<div class=\"pm-card\">" +
        "<div class=\"pm-toggle\"><label class=\"toggle-switch\"><input type=\"checkbox\" " + (isEnabled ? "checked" : "") + " onchange=\"window.togglePaymentMethod('" + safeId + "',this.checked)\"><span class=\"toggle-slider\"></span></label></div>" +
        "<div class=\"pm-logo-wrap\" style=\"background:" + (isEnabled ? "rgba(227,25,55,0.08)" : "rgba(0,0,0,0.04)") + ";\">" + logoHtml + "</div>" +
        "<div class=\"pm-name\">" + esc(pn) + "</div>" +
        "<div class=\"pm-type\">" + (isEnabled ? checkIcon : xIcon) + " " + (isEnabled ? "Active" : "Disabled") + "</div>" +
        "<div class=\"pm-actions\">" +
          "<button class=\"btn btn-ghost btn-sm\" onclick=\"window.editPaymentMethod('" + safeId + "')\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg> Edit</button>" +
          "<button class=\"btn btn-ghost btn-sm\" onclick=\"window.deletePaymentMethod('" + safeId + "')\" style=\"color:var(--danger);\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><polyline points=\"3,6 5,6 21,6\"/><path d=\"M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6\"/><path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2\"/></svg></button>" +
        "</div>" +
      "</div>";
    }).join("");
  } catch(e) {
    console.error("[Admin] renderPaymentMethods error:", e);
    grid.innerHTML = "<div style=\"text-align:center;padding:40px;color:var(--admin-text-muted);grid-column:1/-1;\">Error rendering payment methods. <button class=\"btn btn-sm btn-primary\" style=\"margin-left:8px;\" onclick=\"loadPaymentMethods()\">Retry</button></div>";
  }
}

// ---- TOGGLE ----
function togglePaymentMethod(id, enabled) {
  var pm = paymentMethods.find(function(p) { return p.id === id; });
  if (!pm) return;
  pm.enabled = enabled;
  _pmSave();
  renderPaymentMethods();
  showToast(_pmDisplayName(pm) + " " + (enabled ? "enabled" : "disabled"));
}

// ---- DELETE ----
function deletePaymentMethod(id) {
  var pm = paymentMethods.find(function(p) { return p.id === id; });
  var pn = pm ? _pmDisplayName(pm) : id;
  if (!confirm("Delete payment method \"" + pn + "\"?")) return;
  paymentMethods = paymentMethods.filter(function(p) { return p.id !== id; });
  _pmSave();
  renderPaymentMethods();
  showToast("Payment method deleted");
}

// ---- ADD / EDIT MODAL ----
function showAddPaymentMethod() { showPaymentMethodModal(null); }
function editPaymentMethod(id) {
  var pm = paymentMethods.find(function(p) { return p.id === id; });
  if (pm) showPaymentMethodModal(pm);
}

function showPaymentMethodModal(pm) {
  var isEdit   = !!pm;
  var dispName = isEdit ? _pmDisplayName(pm) : "";
  var cat      = isEdit ? _pmCategory(pm) : "digital";
  var addr     = isEdit ? _pmAddress(pm) : "";
  var instr    = isEdit ? _pmInstructions(pm) : "";
  var order    = isEdit ? _pmOrder(pm) : (paymentMethods.length + 1);
  var safeId   = isEdit ? String(pm.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'") : "";

  var catOptions = [
    ["digital",  "Wallet / Digital"],
    ["crypto",   "Crypto"],
    ["card",     "Card"],
    ["giftcard", "Gift Card"],
    ["bank",     "Bank Transfer"]
  ].map(function(o) {
    return "<option value=\"" + o[0] + "\"" + (cat === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
  }).join("");

  var overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML =
    "<div class=\"modal-content\" style=\"max-width:520px;width:100%;\">" +
      "<div class=\"modal-header\"><h3>" + (isEdit ? "Edit Payment Method" : "Add Payment Method") + "</h3></div>" +
      "<div class=\"modal-body\">" +
        "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;\">" +
          "<div class=\"form-group\"><label class=\"form-label\">Display Name</label><input class=\"form-input\" id=\"pmDisplayName\" value=\"" + esc(dispName) + "\" placeholder=\"e.g. PayPal\"></div>" +
          "<div class=\"form-group\"><label class=\"form-label\">Category</label><select class=\"form-select\" id=\"pmType\">" + catOptions + "</select></div>" +
          "<div class=\"form-group\" style=\"grid-column:1/-1;\"><label class=\"form-label\">Wallet Address / Account / Email</label><input class=\"form-input\" id=\"pmWalletAddress\" value=\"" + esc(addr) + "\" placeholder=\"Wallet address, email, $cashtag, or phone\"></div>" +
          "<div class=\"form-group\" style=\"grid-column:1/-1;\"><label class=\"form-label\">Payment Instructions <span style=\"font-size:11px;color:var(--admin-text-muted);\">(shown to customers)</span></label><textarea class=\"form-input\" id=\"pmInstructions\" rows=\"3\" placeholder=\"Step-by-step instructions for customers\">" + esc(instr) + "</textarea></div>" +
          "<div class=\"form-group\"><label class=\"form-label\">Display Order</label><input class=\"form-input\" id=\"pmSortOrder\" type=\"number\" min=\"1\" value=\"" + order + "\"></div>" +
        "</div>" +
      "</div>" +
      "<div class=\"modal-actions\">" +
        "<button class=\"btn btn-ghost\" onclick=\"this.closest('.modal-overlay').remove()\">Cancel</button>" +
        "<button class=\"btn btn-primary\" onclick=\"window.savePaymentMethod('" + (isEdit ? safeId : "new") + "')\">" + (isEdit ? "Update" : "Add") + "</button>" +
      "</div>" +
    "</div>";

  overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  setTimeout(function() { var inp = document.getElementById("pmDisplayName"); if (inp) inp.focus(); }, 100);
}

// ---- SAVE ----
function savePaymentMethod(id) {
  var PM          = getPM();
  var displayName = (document.getElementById("pmDisplayName")  || {}).value;
  var type        = (document.getElementById("pmType")          || {}).value || "digital";
  var walletAddr  = (document.getElementById("pmWalletAddress") || {}).value;
  var instructions= (document.getElementById("pmInstructions")  || {}).value;
  var sortOrder   = parseInt((document.getElementById("pmSortOrder") || {}).value, 10) || 1;

  displayName  = (displayName  || "").trim();
  walletAddr   = (walletAddr   || "").trim();
  instructions = (instructions || "").trim();

  if (!displayName) { showToast("Display name is required", "error"); return; }

  if (id === "new") {
    var newId = displayName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_") + "_" + Date.now();
    var newPm = {
      id: newId,
      name: displayName,
      display_name: displayName,
      description: "",
      category: type,
      type: type,
      logo: "",
      enabled: true,
      displayOrder: sortOrder,
      sort_order: sortOrder,
      config: { walletAddress: walletAddr, instructions: instructions },
      wallet_address: walletAddr,
      payment_instructions: instructions,
      lastUpdated: new Date().toISOString()
    };
    if (PM) {
      PM.add(newPm);
      paymentMethods = PM.load();
    } else {
      paymentMethods.push(newPm);
      localStorage.setItem("tesla_payment_methods", JSON.stringify(paymentMethods));
    }
  } else {
    var pm = paymentMethods.find(function(p) { return p.id === id; });
    if (pm) {
      pm.name          = displayName;
      pm.display_name  = displayName;
      pm.category      = type;
      pm.type          = type;
      pm.displayOrder  = sortOrder;
      pm.sort_order    = sortOrder;
      pm.config        = pm.config || {};
      pm.config.walletAddress  = walletAddr;
      pm.config.instructions   = instructions;
      pm.wallet_address        = walletAddr;
      pm.payment_instructions  = instructions;
      pm.lastUpdated   = new Date().toISOString();
    }
    _pmSave();
  }

  var modal = document.querySelector(".modal-overlay");
  if (modal) modal.remove();
  renderPaymentMethods();
  showToast("Payment method " + (id === "new" ? "added" : "updated"));
}
