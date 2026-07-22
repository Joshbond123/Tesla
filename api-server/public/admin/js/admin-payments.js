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
    var logoId = pm.logo || pm.logo_id || "";
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

// ---- REDESIGNED EDIT PAYMENT METHOD MODAL (Premium White + Logo Upload) ----
function showPaymentMethodModal(pm) {
  var isEdit = pm !== null;
  var existing = document.querySelector(".modal-overlay"); if (existing) existing.remove();
  var overlay = document.createElement("div"); overlay.className = "modal-overlay";
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);animation:fadeIn .15s ease;';
  var logoId = isEdit ? (pm.logo || pm.logo_id || '') : '';
  var logoPreview = logoId ? ('<div style="width:72px;height:72px;border-radius:14px;background:rgba(227,25,55,.08);display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid rgba(227,25,55,.12);"><svg width="48" height="48" viewBox="0 0 24 24"><use href="assets/payment-logos.svg#' + logoId + '"/></svg></div>') : '<div style="width:72px;height:72px;border-radius:14px;background:#f5f5f7;display:flex;align-items:center;justify-content:center;border:2px dashed #ddd;color:#bbb;font-size:28px;">💳</div>';
  overlay.innerHTML = '<div style="background:#fff;border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.25);padding:0;max-width:580px;width:100%;animation:modalIn .25s ease;overflow:hidden;">' +
    '<div style="padding:28px 32px 20px;border-bottom:1px solid #eee;">' +
      '<div style="display:flex;align-items:center;gap:18px;">' +
        logoPreview +
        '<div><h3 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#111;">' + (isEdit ? 'Edit Payment Method' : 'Add Payment Method') + '</h3>' +
        '<p style="margin:0;font-size:14px;color:#666;">' + (isEdit ? 'Update the details for <strong>' + esc(pm.display_name || pm.displayName || pm.name || '') + '</strong>' : 'Configure a new payment method for customers.') + '</p></div>' +
      '</div>' +
    '</div>' +
    '<div style="padding:24px 32px;">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
        '<div class="form-group" style="grid-column:1/-1;"><label style="display:block;font-size:12px;font-weight:700;color:#444;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;">Payment Method Name</label><input style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;transition:border-color .2s;outline:none;" id="pmDisplayName" value="' + esc(isEdit ? (pm.display_name || pm.displayName || '') : '') + '" placeholder="e.g. PayPal" onfocus="this.style.borderColor=\'#E31937\'" onblur="this.style.borderColor=\'#e0e0e0\'"></div>' +
        '<div class="form-group" style="grid-column:1/-1;">' +
          '<label style="display:block;font-size:12px;font-weight:700;color:#444;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;">Payment Logo / Icon</label>' +
          '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
            '<div id="pmLogoPreview" style="width:64px;height:64px;border-radius:12px;background:#f5f5f7;display:flex;align-items:center;justify-content:center;border:2px dashed #ddd;overflow:hidden;">' +
              (logoId ? '<svg width="40" height="40" viewBox="0 0 24 24"><use href="assets/payment-logos.svg#' + logoId + '"/></svg>' : '<span style="color:#bbb;font-size:24px;">+</span>') +
            '</div>' +
            '<div style="flex:1;">' +
              '<label style="display:block;font-size:12px;font-weight:600;color:#888;margin-bottom:4px;">Select logo from existing set</label>' +
              '<select id="pmLogoSelect" style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:13px;font-family:inherit;background:#fff;outline:none;" onchange="updatePmLogoPreview()">' +
                '<option value="">No logo</option>' +
                '<option value="pay-paypal"' + (logoId === 'pay-paypal' ? ' selected' : '') + '>PayPal</option>' +
                '<option value="pay-cashapp"' + (logoId === 'pay-cashapp' ? ' selected' : '') + '>Cash App</option>' +
                '<option value="pay-venmo"' + (logoId === 'pay-venmo' ? ' selected' : '') + '>Venmo</option>' +
                '<option value="pay-zelle"' + (logoId === 'pay-zelle' ? ' selected' : '') + '>Zelle</option>' +
                '<option value="pay-bitcoin"' + (logoId === 'pay-bitcoin' ? ' selected' : '') + '>Bitcoin (BTC)</option>' +
                '<option value="pay-ethereum"' + (logoId === 'pay-ethereum' ? ' selected' : '') + '>Ethereum (ETH)</option>' +
                '<option value="pay-usdt"' + (logoId === 'pay-usdt' ? ' selected' : '') + '>USDT (ERC-20)</option>' +
                '<option value="pay-usdt-trc20"' + (logoId === 'pay-usdt-trc20' ? ' selected' : '') + '>USDT (TRC-20)</option>' +
                '<option value="pay-creditcard"' + (logoId === 'pay-creditcard' ? ' selected' : '') + '>Credit Card</option>' +
                '<option value="pay-applegift"' + (logoId === 'pay-applegift' ? ' selected' : '') + '>Apple Gift Card</option>' +
              '</select>' +
              '<div style="margin-top:8px;font-size:11px;color:#999;">Logo is pulled from the brand logo sprite. Upload custom logos coming soon.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="form-group"><label style="display:block;font-size:12px;font-weight:700;color:#444;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;">Type</label><select style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:13px;font-family:inherit;background:#fff;outline:none;" id="pmType"><option value="wallet"' + (isEdit && pm.type === 'wallet' ? ' selected' : '') + '>Wallet / App</option><option value="crypto"' + (isEdit && pm.type === 'crypto' ? ' selected' : '') + '>Cryptocurrency</option><option value="card"' + (isEdit && pm.type === 'card' ? ' selected' : '') + '>Credit / Debit Card</option><option value="gift"' + (isEdit && pm.type === 'gift' ? ' selected' : '') + '>Gift Card</option></select></div>' +
        '<div class="form-group"><label style="display:block;font-size:12px;font-weight:700;color:#444;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;">Sort Order</label><input style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;outline:none;" id="pmSortOrder" type="number" value="' + (isEdit ? (pm.sort_order || 0) : (paymentMethods.length + 1)) + '" onfocus="this.style.borderColor=\'#E31937\'" onblur="this.style.borderColor=\'#e0e0e0\'"></div>' +
        '<div class="form-group" style="grid-column:1/-1;"><label style="display:block;font-size:12px;font-weight:700;color:#444;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;">Account Details / Wallet Address</label><input style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;outline:none;" id="pmWalletAddress" value="' + esc(isEdit ? (pm.wallet_address || pm.account_details || '') : '') + '" placeholder="Wallet address or account details" onfocus="this.style.borderColor=\'#E31937\'" onblur="this.style.borderColor=\'#e0e0e0\'"></div>' +
        '<div class="form-group" style="grid-column:1/-1;"><label style="display:block;font-size:12px;font-weight:700;color:#444;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em;">Payment Instructions</label><textarea style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;outline:none;min-height:80px;resize:vertical;" id="pmInstructions" placeholder="Instructions shown to customers" onfocus="this.style.borderColor=\'#E31937\'" onblur="this.style.borderColor=\'#e0e0e0\'">' + esc(isEdit ? (pm.payment_instructions || '') : '') + '</textarea></div>' +
      '</div>' +
    '</div>' +
    '<div style="padding:16px 32px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #f0f0f0;">' +
      '<button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()" style="padding:10px 24px;border-radius:10px;font-size:14px;font-weight:600;border:1.5px solid #ddd;background:white;color:#555;cursor:pointer;">Cancel</button>' +
      '<button class="btn btn-primary" onclick="window.savePaymentMethod(\'' + (isEdit ? pm.id : 'new') + '\')" style="padding:10px 28px;border-radius:10px;font-size:14px;font-weight:700;border:none;background:#E31937;color:white;cursor:pointer;transition:all .2s;" onmouseover="this.style.background=\'#c41030\'" onmouseout="this.style.background=\'#E31937\'">' + (isEdit ? '✓ Update Method' : '+ Add Method') + '</button>' +
    '</div></div>';
  overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  setTimeout(function() { var inp = document.getElementById("pmDisplayName"); if (inp) inp.focus(); }, 100);
}

function updatePmLogoPreview() {
  var sel = document.getElementById("pmLogoSelect");
  var preview = document.getElementById("pmLogoPreview");
  if (!sel || !preview) return;
  var val = sel.value;
  if (val) {
    preview.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24"><use href="assets/payment-logos.svg#' + val + '"/></svg>';
    preview.style.background = 'rgba(227,25,55,.08)';
    preview.style.border = '2px solid rgba(227,25,55,.12)';
  } else {
    preview.innerHTML = '<span style="color:#bbb;font-size:24px;">+</span>';
    preview.style.background = '#f5f5f7';
    preview.style.border = '2px dashed #ddd';
  }
}

function savePaymentMethod(id) {
  var displayName = (document.getElementById("pmDisplayName") || {}).value;
  if (displayName) displayName = displayName.trim();
  var type = (document.getElementById("pmType") || {}).value || "wallet";
  var walletAddress = (document.getElementById("pmWalletAddress") || {}).value || "";
  walletAddress = walletAddress.trim();
  var instructions = (document.getElementById("pmInstructions") || {}).value || "";
  instructions = instructions.trim();
  var sortOrder = parseInt((document.getElementById("pmSortOrder") || {}).value, 10) || 0;
  var logo = (document.getElementById("pmLogoSelect") || {}).value || "";
  if (!displayName) { showToast("Payment method name is required", "error"); return; }
  if (id === "new") {
    var nameKey = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
    var newId = nameKey + "_" + Date.now();
    paymentMethods.push({ id: newId, name: nameKey, display_name: displayName, displayName: displayName, type: type, wallet_address: walletAddress, account_details: walletAddress, payment_instructions: instructions, instructions: instructions, logo: logo, logo_id: logo, sort_order: sortOrder, enabled: true });
  } else {
    var pm = paymentMethods.find(function(p) { return p.id === id; });
    if (pm) { pm.display_name = displayName; pm.displayName = displayName; pm.type = type; pm.wallet_address = walletAddress; pm.account_details = walletAddress; pm.payment_instructions = instructions; pm.instructions = instructions; pm.sort_order = sortOrder; pm.logo = logo; pm.logo_id = logo; }
  }
  var modal = document.querySelector(".modal-overlay"); if (modal) modal.remove();
  renderPaymentMethods(); showToast("Payment method " + (id === "new" ? "added" : "updated"));
  if (API_BASE) { api("POST", "/admin/payment-methods/save", { id: id, data: (id === "new" ? paymentMethods[paymentMethods.length - 1] : paymentMethods.find(function(p) { return p.id === id; })) }).catch(function() {}); }
}
