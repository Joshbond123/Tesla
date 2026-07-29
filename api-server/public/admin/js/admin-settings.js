// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: System Settings              ║
// ║  Standard + Express Fees · DB-backed · validated input   ║
// ╚══════════════════════════════════════════════════════════╝

// Restore the Save button to its normal (icon + label) state.
function restoreSaveButton(saveBtn) {
  if (!saveBtn) return;
  saveBtn.disabled = false;
  saveBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>'
    + '<polyline points="17,21 17,13 7,13 7,21"/>'
    + '<polyline points="7,3 7,8 15,8"/>'
    + '</svg> Save All Fees';
}

function saveDeliveryFee() {
  var stdInput = document.getElementById("standardFeeInput");
  var expInput = document.getElementById("expressFeeInput");
  var statusEl = document.getElementById("feeStatus");
  var saveBtn  = document.querySelector('[onclick="saveDeliveryFee()"]');

  var stdRaw = stdInput ? stdInput.value : "";
  var expRaw = expInput ? expInput.value : "";

  // Clear previous status + borders
  if (statusEl) { statusEl.textContent = ""; statusEl.style.color = ""; }
  if (stdInput) stdInput.style.borderColor = "";
  if (expInput) expInput.style.borderColor = "";

  // Validate: only valid, non-negative numbers are accepted (no random fallback).
  var std = stdRaw.trim() === "" ? NaN : Number(stdRaw);
  var exp = expRaw.trim() === "" ? NaN : Number(expRaw);
  var invalid = [];
  if (!Number.isFinite(std) || std < 0) invalid.push("Standard");
  if (!Number.isFinite(exp) || exp < 0) invalid.push("Express");
  if (invalid.length) {
    if (invalid.indexOf("Standard") >= 0 && stdInput) stdInput.style.borderColor = "#EF4444";
    if (invalid.indexOf("Express")  >= 0 && expInput) expInput.style.borderColor = "#EF4444";
    var msg = "Enter a valid amount (0 or greater) for: " + invalid.join(", ");
    if (statusEl) { statusEl.textContent = "✗ " + msg; statusEl.style.color = "#EF4444"; }
    showToast(msg, "error");
    return;
  }
  std = Math.round(std * 100) / 100;
  exp = Math.round(exp * 100) / 100;

  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }

  if (typeof API_BASE !== "undefined" && API_BASE) {
    // Backend persists to the database (snake_case: standard_fee / express_fee).
    api("POST", "/admin/settings", { standard_fee: std, express_fee: exp })
      .then(function(r) {
        standardFee = (typeof r.standard_fee === "number") ? r.standard_fee : std;
        expressFee  = (typeof r.express_fee  === "number") ? r.express_fee  : exp;
        deliveryFee = standardFee;
        if (stdInput) stdInput.value = standardFee;
        if (expInput) expInput.value = expressFee;
        if (statusEl) {
          statusEl.textContent = "✓ Saved — Standard $" + standardFee + " · Express $" + expressFee;
          statusEl.style.color = "#00A550";
        }
        showToast("Delivery fees updated: Standard $" + standardFee + ", Express $" + expressFee);
        setTimeout(function() { if (statusEl) { statusEl.textContent = ""; statusEl.style.color = ""; } }, 6000);
      })
      .catch(function(e) {
        if (statusEl) {
          statusEl.textContent = "✗ Failed: " + (e && e.message ? e.message : "Server error");
          statusEl.style.color = "#EF4444";
        }
        showToast("Failed to save fees: " + (e && e.message ? e.message : "Server error"), "error");
      })
      .finally(function() { restoreSaveButton(saveBtn); });
  } else {
    // No backend configured — we cannot persist to the database.
    if (statusEl) {
      statusEl.textContent = "✗ API not configured — cannot save to database.";
      statusEl.style.color = "#EF4444";
    }
    showToast("API not configured — changes cannot be saved", "error");
    restoreSaveButton(saveBtn);
  }
}

// Return the first finite number found among the given keys, else null.
function pickFeeNum(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = obj ? obj[keys[i]] : undefined;
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function loadDeliveryFees() {
  var sfi = document.getElementById("standardFeeInput");
  var efi = document.getElementById("expressFeeInput");
  // Show current/default values immediately, then refresh from the database.
  if (sfi) sfi.value = standardFee;
  if (efi) efi.value = expressFee;
  if (typeof API_BASE === "undefined" || !API_BASE) return;

  api("GET", "/admin/settings")
    .then(function(r) {
      // snake_case is primary; legacy aliases kept for backward compatibility.
      var s = pickFeeNum(r, ["standard_fee", "deliveryFeeStandard", "deliveryFee", "standard"]);
      var e = pickFeeNum(r, ["express_fee", "deliveryFeeExpress", "express"]);
      if (s !== null) standardFee = s;
      if (e !== null) expressFee = e;
      deliveryFee = standardFee;
      if (sfi) sfi.value = standardFee;
      if (efi) efi.value = expressFee;
    })
    .catch(function() { /* keep current values in the inputs */ });
}

function changePassword() {
  var cur  = document.getElementById("currentPwd").value;
  var neu  = document.getElementById("newPwd").value;
  var conf = document.getElementById("confirmPwd").value;
  if (cur !== adminPassword) { showToast("Current password is incorrect", "error"); return; }
  if (!neu || neu.length < 3) { showToast("New password must be at least 3 characters", "error"); return; }
  if (neu !== conf)           { showToast("Passwords do not match", "error"); return; }
  adminPassword = neu;
  localStorage.setItem("tesla_admin_pwd", neu);
  document.getElementById("currentPwd").value = "";
  document.getElementById("newPwd").value     = "";
  document.getElementById("confirmPwd").value = "";
  showToast("Password changed successfully");
}

function clearLocalData() {
  if (!confirm("Clear all locally cached data? This does NOT affect the database.")) return;
  allUsers = [];
  localStorage.removeItem("tesla_registered_users");
  localStorage.removeItem("tesla_entry_users");
  localStorage.removeItem("tesla_standard_fee");
  localStorage.removeItem("tesla_express_fee");
  localStorage.removeItem("tesla_delivery_fee");
  localStorage.removeItem("tesla_payment_methods");
  localStorage.removeItem("tesla_payment_proofs");
  localStorage.removeItem("tesla_social_settings");
  renderUsers();
  loadDashboard();
  showToast("Local cache cleared");
}

window.loadDeliveryFees = loadDeliveryFees;
