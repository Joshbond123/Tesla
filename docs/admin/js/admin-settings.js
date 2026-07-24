// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award - Admin Panel: System Settings (Redesigned)
// ║  Standard + Express Fees . DB-first . Card-based UI
// ╚══════════════════════════════════════════════════════════╝

function saveDeliveryFee() {
  var std = parseInt(document.getElementById("standardFeeInput").value, 10) || 0;
  var exp = parseInt(document.getElementById("expressFeeInput").value, 10) || 0;
  if (std < 0) std = 0;
  if (exp < 0) exp = 0;
  if (std === 0) std = 299;
  if (exp === 0) exp = 399;
  var data = { deliveryFeeStandard: std, deliveryFeeExpress: exp };
  if (API_BASE) {
    api("POST", "/admin/settings", data).then(function() {
      standardFee = std; expressFee = exp; deliveryFee = std;
      var st = document.getElementById("feeStatus");
      if (st) { st.textContent = "Fees saved! Standard $" + std + " / Express $" + exp; st.style.color = "#00A550"; }
      showToast("Delivery fees saved: Standard $" + std + ", Express $" + exp);
    }).catch(function(e) {
      var st = document.getElementById("feeStatus");
      if (st) { st.textContent = "Failed to save: " + e.message; st.style.color = "#EF4444"; }
      showToast("Failed to save fees: " + e.message, "error");
    });
  } else {
    showToast("Cannot save - API unavailable", "error");
  }
}

function loadDeliveryFees() {
  if (API_BASE) {
    api("GET", "/admin/settings").then(function(r) {
      if (r.deliveryFeeStandard) { standardFee = r.deliveryFeeStandard; deliveryFee = r.deliveryFeeStandard; }
      if (r.deliveryFeeExpress) expressFee = r.deliveryFeeExpress;
      var sfi = document.getElementById("standardFeeInput");
      var efi = document.getElementById("expressFeeInput");
      if (sfi) sfi.value = standardFee;
      if (efi) efi.value = expressFee;
    }).catch(function() {
      var sfi = document.getElementById("standardFeeInput");
      var efi = document.getElementById("expressFeeInput");
      if (sfi) sfi.value = standardFee;
      if (efi) efi.value = expressFee;
    });
  } else {
    var sfi = document.getElementById("standardFeeInput");
    var efi = document.getElementById("expressFeeInput");
    if (sfi) sfi.value = standardFee;
    if (efi) efi.value = expressFee;
  }
}

function changePassword() {
  var cur = document.getElementById("currentPwd").value, neu = document.getElementById("newPwd").value, conf = document.getElementById("confirmPwd").value;
  if (cur !== adminPassword) { showToast("Current password is incorrect", "error"); return; }
  if (!neu || neu.length < 3) { showToast("New password must be at least 3 characters", "error"); return; }
  if (neu !== conf) { showToast("Passwords do not match", "error"); return; }
  adminPassword = neu; localStorage.setItem("tesla_admin_pwd", neu);
  document.getElementById("currentPwd").value = ""; document.getElementById("newPwd").value = ""; document.getElementById("confirmPwd").value = "";
  showToast("Password changed!");
}

function clearLocalData() {
  if (!confirm("Clear all locally cached data? Does NOT affect the database.")) return;
  allUsers = [];
  localStorage.removeItem("tesla_registered_users"); localStorage.removeItem("tesla_entry_users");
  localStorage.removeItem("tesla_delivery_fee"); localStorage.removeItem("tesla_payment_methods");
  localStorage.removeItem("tesla_payment_proofs"); localStorage.removeItem("tesla_social_settings");
  renderUsers(); loadDashboard(); showToast("Local cache cleared");
}