// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: System Settings              ║
// ║  Currency + Standard/Express Fees · DB-backed · validated║
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
    + '</svg> Save Settings';
}

// Populate the currency dropdown from the shared catalog (config.js).
function populateCurrencySelect() {
  var sel = document.getElementById("currencySelect");
  if (!sel || sel.options.length) return;
  var list = (typeof window.TESLA_CURRENCIES !== "undefined") ? window.TESLA_CURRENCIES : [];
  var html = "";
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    html += '<option value="' + c.code + '">' + c.code + " \u2014 " + c.label + " (" + c.symbol + ")</option>";
  }
  sel.innerHTML = html || '<option value="USD">USD \u2014 US Dollar ($)</option>';
}

function setCurrencySelect(code) {
  var sel = document.getElementById("currencySelect");
  if (sel && code) sel.value = code;
}

function saveDeliveryFee() {
  var stdInput = document.getElementById("standardFeeInput");
  var expInput = document.getElementById("expressFeeInput");
  var curSel   = document.getElementById("currencySelect");
  var statusEl = document.getElementById("feeStatus");
  var saveBtn  = document.querySelector('[onclick="saveDeliveryFee()"]');

  var stdRaw = stdInput ? stdInput.value : "";
  var expRaw = expInput ? expInput.value : "";
  var currency = curSel ? (curSel.value || "USD") : selectedCurrency || "USD";

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
    if (statusEl) { statusEl.textContent = "\u2717 " + msg; statusEl.style.color = "#EF4444"; }
    showToast(msg, "error");
    return;
  }
  std = Math.round(std * 100) / 100;
  exp = Math.round(exp * 100) / 100;

  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving\u2026"; }

  var saveWatchdog = setTimeout(function () {
    restoreSaveButton(saveBtn);
  }, 16000);

  if (typeof API_BASE !== "undefined" && API_BASE) {
    // Backend persists currency + fees to the database.
    api("POST", "/admin/settings", { standard_fee: std, express_fee: exp, currency: currency })
      .then(function(r) {
        standardFee = (typeof r.standard_fee === "number") ? r.standard_fee : std;
        expressFee  = (typeof r.express_fee  === "number") ? r.express_fee  : exp;
        deliveryFee = standardFee;
        if (typeof r.currency === "string") { selectedCurrency = r.currency; setCurrencySelect(selectedCurrency); }
        var sym = (typeof window.teslaCurrencySymbol === "function") ? window.teslaCurrencySymbol(selectedCurrency) : "$";
        if (stdInput) stdInput.value = standardFee;
        if (expInput) expInput.value = expressFee;
        if (statusEl) {
          statusEl.textContent = "\u2713 Saved \u2014 " + selectedCurrency + " \u00b7 Standard " + sym + standardFee + " \u00b7 Express " + sym + expressFee;
          statusEl.style.color = "#00A550";
        }
        showToast("Settings updated: " + selectedCurrency + " \u00b7 Standard " + sym + standardFee + ", Express " + sym + expressFee);
        setTimeout(function() { if (statusEl) { statusEl.textContent = ""; statusEl.style.color = ""; } }, 6000);
      })
      .catch(function(e) {
        if (statusEl) {
          statusEl.textContent = "\u2717 Failed: " + (e && e.message ? e.message : "Server error");
          statusEl.style.color = "#EF4444";
        }
        showToast("Failed to save: " + (e && e.message ? e.message : "Server error"), "error");
      })
      .then(function () {
        clearTimeout(saveWatchdog);
        restoreSaveButton(saveBtn);
      });
  } else {
    clearTimeout(saveWatchdog);
    // No backend configured — we cannot persist to the database.
    if (statusEl) {
      statusEl.textContent = "\u2717 API not configured \u2014 cannot save to database.";
      statusEl.style.color = "#EF4444";
    }
    showToast("API not configured \u2014 changes cannot be saved", "error");
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
  populateCurrencySelect();
  // Show current/default values immediately, then refresh from the database.
  if (sfi) sfi.value = standardFee;
  if (efi) efi.value = expressFee;
  setCurrencySelect(selectedCurrency);
  if (typeof API_BASE === "undefined" || !API_BASE) return;

  api("GET", "/admin/settings")
    .then(function(r) {
      // snake_case is primary; legacy aliases kept for backward compatibility.
      var s = pickFeeNum(r, ["standard_fee", "deliveryFeeStandard", "deliveryFee", "standard"]);
      var e = pickFeeNum(r, ["express_fee", "deliveryFeeExpress", "express"]);
      if (s !== null) standardFee = s;
      if (e !== null) expressFee = e;
      deliveryFee = standardFee;
      if (typeof r.currency === "string") selectedCurrency = r.currency;
      if (sfi) sfi.value = standardFee;
      if (efi) efi.value = expressFee;
      setCurrencySelect(selectedCurrency);
    })
    .catch(function() { /* keep current values */ });
}

function changePassword() {
  var curEl = document.getElementById("currentPwd");
  var neuEl = document.getElementById("newPwd");
  var confEl = document.getElementById("confirmPwd");
  var status = document.getElementById("pwdStatus");
  var btn = document.getElementById("changePwdBtn");
  var cur = curEl ? curEl.value : "";
  var neu = neuEl ? neuEl.value : "";
  var conf = confEl ? confEl.value : "";
  function setPwdStatus(msg, ok) {
    if (!status) return;
    status.textContent = msg || "";
    status.className = "ss-status" + (msg ? (ok ? " is-ok" : " is-err") : "");
  }
  if (!cur) { setPwdStatus("Enter your current password.", false); showToast("Enter current password", "error"); return; }
  if (!neu || neu.length < 8) { setPwdStatus("New password must be at least 8 characters.", false); showToast("New password must be at least 8 characters", "error"); return; }
  if (neu !== conf) { setPwdStatus("New passwords do not match.", false); showToast("Passwords do not match", "error"); return; }
  if (!API_BASE) { setPwdStatus("API not configured.", false); showToast("API not configured", "error"); return; }
  if (btn) { btn.disabled = true; }
  setPwdStatus("Saving…", true);
  api("POST", "/admin/change-password", { current: cur, new: neu })
    .then(function () {
      if (curEl) curEl.value = "";
      if (neuEl) neuEl.value = "";
      if (confEl) confEl.value = "";
      setPwdStatus("Password updated successfully.", true);
      showToast("Password changed successfully");
    })
    .catch(function (e) {
      var msg = (e && e.message) ? e.message : "Server error";
      setPwdStatus(msg, false);
      showToast("Failed: " + msg, "error");
    })
    .then(function () { if (btn) btn.disabled = false; });
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



// ── Floating Contact Settings (DB-backed) ───────────────────────────────────
function loadFloatingContact() {
  if (typeof API_BASE === "undefined" || !API_BASE) return;
  api("GET", "/admin/settings/floating-contact")
    .then(function (r) {
      var enabled = document.getElementById("fcEnabled");
      var waPhone = document.getElementById("fcWaPhone");
      var waMsg = document.getElementById("fcWaMessage");
      var tgUser = document.getElementById("fcTgUser");
      var tgMsg = document.getElementById("fcTgMessage");
      if (enabled) enabled.checked = r.enabled === true;
      var wa = r.whatsapp || {};
      var tg = r.telegram || {};
      if (waPhone) waPhone.value = wa.phone || r.phone || "";
      if (waMsg) waMsg.value = wa.message || r.message || "";
      if (tgUser) tgUser.value = (tg.username || r.telegramUsername || "").replace(/^@/, "");
      if (tgMsg) tgMsg.value = tg.message || r.telegramMessage || "";
    })
    .catch(function () {});
}

function saveFloatingContact() {
  if (typeof API_BASE === "undefined" || !API_BASE) return;
  var enabled = document.getElementById("fcEnabled");
  var waPhone = document.getElementById("fcWaPhone");
  var waMsg = document.getElementById("fcWaMessage");
  var tgUser = document.getElementById("fcTgUser");
  var tgMsg = document.getElementById("fcTgMessage");
  var status = document.getElementById("fcStatus");
  var btn = document.getElementById("fcSaveBtn");
  var payload = {
    enabled: !!(enabled && enabled.checked),
    whatsapp: {
      phone: waPhone ? waPhone.value.trim() : "",
      message: waMsg ? waMsg.value.trim() : ""
    },
    telegram: {
      username: tgUser ? tgUser.value.trim().replace(/^@/, "") : "",
      message: tgMsg ? tgMsg.value.trim() : ""
    }
  };
  if (btn) btn.disabled = true;
  if (status) { status.textContent = "Saving…"; status.className = "ss-status"; }
  api("POST", "/admin/settings/floating-contact", payload)
    .then(function () {
      if (status) { status.textContent = "Saved to database."; status.className = "ss-status is-ok"; }
      if (typeof showToast === "function") showToast("Floating contact settings saved");
      setTimeout(function () { if (status) status.textContent = ""; }, 3500);
    })
    .catch(function (e) {
      var msg = (e && e.message) ? e.message : "error";
      if (status) { status.textContent = "Failed: " + msg; status.className = "ss-status is-err"; }
      if (typeof showToast === "function") showToast("Failed to save: " + msg, "error");
    })
    .then(function () { if (btn) btn.disabled = false; });
}

// Backward-compatible aliases
function loadWhatsAppSetting() { loadFloatingContact(); }
function saveWhatsAppSetting() { saveFloatingContact(); }

window.loadFloatingContact = loadFloatingContact;
window.saveFloatingContact = saveFloatingContact;
window.loadWhatsAppSetting = loadWhatsAppSetting;
window.saveWhatsAppSetting = saveWhatsAppSetting;
window.loadDeliveryFees = loadDeliveryFees;
