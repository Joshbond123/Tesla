// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Payment Methods CRUD
// ╚══════════════════════════════════════════════════════════╝

// ---- PAYMENT METHODS (REDESIGNED) ----
function loadPaymentMethods() {
  var saved = localStorage.getItem("tesla_payment_methods");
  if (saved) { try { paymentMethods = JSON.parse(saved); } catch(e) { paymentMethods = defaultPaymentMethods; } }
  else { paymentMethods = defaultPaymentMethods.slice(); }
  renderPaymentMethods();
  if (API_BASE) {
    api("GET", "/admin/payment-methods").then(function(r) { if (r.methods && r.methods.length > 0) { paymentMethods = r.methods; localStorage.setItem("tesla_payment_methods", JSON.stringify(paymentMethods)); } renderPaymentMethods(); }).catch(function() {});
  }
}

function getLogoHtml(logoId) {
  if (!logoId) return "";
  return "<svg class=\"pay-logo-svg\" width=\"100%\" height=\"100%\" viewBox=\"0 0 24 24\"><use href=\"assets/payment-logos.svg#" + logoId + "\"/></svg>";
}

function renderPaymentMethods() {
  var grid = document.getElementById("paymentMethodsGrid"); if (!grid) return;
  var enabled = paymentMethods.filter(function(p) { return p.enabled !== false; });
  var disabled = paymentMethods.filter(function(p) { return p.enabled === false; });
  document.getElementById("pmEnabledCount").textContent = enabled.length + " enabled";
  document.getElementById("pmDisabledCount").textContent = disabled.length + " disabled";

  if (!paymentMethods || paymentMethods.length === 0) {
    grid.innerHTML = "<div style=\"text-align:center;padding:40px;color:var(--admin-text-muted);grid-column:1/-1;\">No payment methods configured.</div>";
    return;
  }
  var all = paymentMethods.slice().sort(function(a, b) { return (a.sort_order || 99) - (b.sort_order || 99); });
  grid.innerHTML = all.map(function(pm) {
    var pn = pm.display_name || pm.displayName || pm.name || "Payment";
    var isEnabled = pm.enabled !== false;
    var logoId = pm.logo || "";
    var logoHtml = logoId ? getLogoHtml(logoId) : "";
    return "<div class=\"pm-card\">" +
      "<div class=\"pm-toggle\"><label class=\"toggle-switch\"><input type=\"checkbox\" " + (isEnabled ? "checked" : "") + " onchange=\"window.togglePaymentMethod(\'" + pm.id + "\',this.checked)\"><span class=\"toggle-slider\"></span></label></div>" +
      "<div class=\"pm-logo-wrap\" style=\"background:" + (isEnabled ? "rgba(227,25,55,0.08)" : "rgba(0,0,0,0.04)") + ";\">" + logoHtml + "</div>" +
      "<div class=\"pm-name\">" + esc(pn) + "</div>" +
      "<div class=\"pm-type\">" +
        (isEnabled ? "<svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--success)\" stroke-width=\"2\"><polyline points=\"20,6 9,17 4,12\"/></svg>" : "<svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--admin-text-muted)\" stroke-width=\"2\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg>") +
        " " + (isEnabled ? "Active" : "Disabled") +
      "</div>" +
      "<div class=\"pm-actions\">" +
        "<button class=\"btn btn-ghost btn-sm\" onclick=\"window.editPaymentMethod(\'" + pm.id + "\')\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg> Edit</button>" +
        "<button class=\"btn btn-ghost btn-sm\" onclick=\"window.deletePaymentMethod(\'" + pm.id + "\')\" style=\"color:var(--danger);\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><polyline points=\"3,6 5,6 21,6\"/><path d=\"M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6\"/><path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2\"/></svg></button>" +
      "</div></div>";
  }).join("");
  localStorage.setItem("tesla_payment_methods", JSON.stringify(paymentMethods));
}

function togglePaymentMethod(id, enabled) {
  var pm = paymentMethods.find(function(p) { return p.id === id; });
  if (pm) { pm.enabled = enabled; renderPaymentMethods(); showToast((pm.display_name || pm.displayName || pm.name) + " " + (enabled ? "enabled" : "disabled")); }
  if (API_BASE) { api("POST", "/admin/payment-methods/toggle", { id: id, enabled: enabled }).catch(function() {}); }
}
function deletePaymentMethod(id) {
  if (!confirm("Delete this payment method?")) return;
  paymentMethods = paymentMethods.filter(function(p) { return p.id !== id; }); renderPaymentMethods(); showToast("Payment method deleted");
  if (API_BASE) { api("POST", "/admin/payment-methods/delete", { id: id }).catch(function() {}); }
}
function showAddPaymentMethod() { showPaymentMethodModal(null); }
function editPaymentMethod(id) { var pm = paymentMethods.find(function(p) { return p.id === id; }); if (pm) showPaymentMethodModal(pm); }

function showPaymentMethodModal(pm) {
  var isEdit = pm !== null;
  var existing = document.querySelector(".modal-overlay"); if (existing) existing.remove();
  var overlay = document.createElement("div"); overlay.className = "modal-overlay";
  overlay.innerHTML = "<div class=\"modal-card wide\"><h3>" + (isEdit ? "Edit Payment Method" : "Add Payment Method") + "</h3><p>" + (isEdit ? "Update payment method details." : "Configure a new payment method.") + "</p>" +
    "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;\">" +
      "<div class=\"form-group\"><label class=\"form-label\">Display Name</label><input class=\"form-input\" id=\"pmDisplayName\" value=\"" + esc(isEdit ? (pm.display_name || pm.displayName || "") : "") + "\" placeholder=\"e.g. PayPal\"></div>" +
      "<div class=\"form-group\"><label class=\"form-label\">Type</label><select class=\"form-select\" id=\"pmType\"><option value=\"wallet\"" + (isEdit && pm.type === "wallet" ? " selected" : "") + ">Wallet</option><option value=\"crypto\"" + (isEdit && pm.type === "crypto" ? " selected" : "") + ">Crypto</option><option value=\"card\"" + (isEdit && pm.type === "card" ? " selected" : "") + ">Card</option><option value=\"gift\"" + (isEdit && pm.type === "gift" ? " selected" : "") + ">Gift Card</option></select></div>" +
      "<div class=\"form-group\" style=\"grid-column:1/-1;\"><label class=\"form-label\">Account Details / Wallet Address</label><input class=\"form-input\" id=\"pmWalletAddress\" value=\"" + esc(isEdit ? (pm.wallet_address || pm.account_details || "") : "") + "\" placeholder=\"Wallet address or account details\"></div>" +
      "<div class=\"form-group\" style=\"grid-column:1/-1;\"><label class=\"form-label\">Payment Instructions</label><textarea class=\"form-input\" id=\"pmInstructions\" placeholder=\"Instructions shown to customers\">" + esc(isEdit ? (pm.payment_instructions || "") : "") + "</textarea></div>" +
      "<div class=\"form-group\"><label class=\"form-label\">Sort Order</label><input class=\"form-input\" id=\"pmSortOrder\" type=\"number\" value=\"" + (isEdit ? (pm.sort_order || 0) : paymentMethods.length + 1) + "\"></div>" +
    "</div>" +
    "<div class=\"modal-actions\"><button class=\"btn btn-ghost\" onclick=\"this.closest(\\'.modal-overlay\\').remove()\">Cancel</button><button class=\"btn btn-primary\" onclick=\"window.savePaymentMethod(\\'" + (isEdit ? pm.id : "new") + "\\')\">" + (isEdit ? "Update" : "Add") + "</button></div></div>";
  overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  setTimeout(function() { var inp = document.getElementById("pmDisplayName"); if (inp) inp.focus(); }, 100);
}

function savePaymentMethod(id) {
  var displayName = document.getElementById("pmDisplayName").value.trim();
  var type = document.getElementById("pmType").value;
  var walletAddress = document.getElementById("pmWalletAddress").value.trim();
  var instructions = document.getElementById("pmInstructions").value.trim();
  var sortOrder = parseInt(document.getElementById("pmSortOrder").value, 10) || 0;
  if (!displayName) { showToast("Display name is required", "error"); return; }
  if (id === "new") {
    var newId = displayName.toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + Date.now();
    paymentMethods.push({ id: newId, name: displayName.toLowerCase().replace(/[^a-z0-9]/g, ""), display_name: displayName, type: type, wallet_address: walletAddress, account_details: walletAddress, payment_instructions: instructions, logo: "", sort_order: sortOrder, enabled: true });
  } else {
    var pm = paymentMethods.find(function(p) { return p.id === id; });
    if (pm) { pm.display_name = displayName; pm.type = type; pm.wallet_address = walletAddress; pm.account_details = walletAddress; pm.payment_instructions = instructions; pm.sort_order = sortOrder; }
  }
  var modal = document.querySelector(".modal-overlay"); if (modal) modal.remove();
  renderPaymentMethods(); showToast("Payment method " + (id === "new" ? "added" : "updated"));
  if (API_BASE) { api("POST", "/admin/payment-methods/save", { id: id, data: paymentMethods.find(function(p) { return id === "new" ? p.id === newId : p.id === id; }) }).catch(function() {}); }
}
