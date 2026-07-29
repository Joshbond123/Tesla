// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: System Settings              ║
// ║  Standard + Express Fees · DB-first · snake_case API     ║
// ╚══════════════════════════════════════════════════════════╝

function saveDeliveryFee() {
  var stdInput = document.getElementById("standardFeeInput");
  var expInput = document.getElementById("expressFeeInput");
  var statusEl = document.getElementById("feeStatus");
  var saveBtn  = document.querySelector('[onclick="saveDeliveryFee()"]');

  var std = stdInput && stdInput.value.trim() !== "" ? parseInt(stdInput.value, 10) : NaN;
  var exp = expInput && expInput.value.trim() !== "" ? parseInt(expInput.value, 10) : NaN;

  // Clear previous status
  if (statusEl) { statusEl.textContent = ""; statusEl.style.color = ""; }

  // If blank, 0, or invalid (NaN), set random fee and update UI
  if (isNaN(std) || std <= 0) {
    std = Math.floor(Math.random() * 150) + 150; // random $150-$299
    if (stdInput) stdInput.value = std;
  }
  if (isNaN(exp) || exp <= 0) {
    exp = std + Math.floor(Math.random() * 100) + 50; // standard + $50-$149
    if (expInput) expInput.value = exp;
  }

  // Reset input borders
  if (stdInput) stdInput.style.borderColor = "";
  if (expInput) expInput.style.borderColor = "";

  // Saving state
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }

  if (typeof API_BASE !== "undefined" && API_BASE) {
    // Backend expects snake_case: standard_fee / express_fee
    api("POST", "/admin/settings", { standard_fee: std, express_fee: exp })
      .then(function() {
        standardFee = std;
        expressFee  = exp;
        deliveryFee = std;
        
        localStorage.setItem("tesla_standard_fee", std);
        localStorage.setItem("tesla_express_fee", exp);
        localStorage.setItem("tesla_delivery_fee", std);

        if (statusEl) {
          statusEl.textContent = "✓ Saved — Standard $" + std + " · Express $" + exp;
          statusEl.style.color = "#00A550";
        }
        showToast("Delivery fees updated: Standard $" + std + ", Express $" + exp);
        setTimeout(function() {
          if (statusEl) { statusEl.textContent = ""; statusEl.style.color = ""; }
        }, 6000);
      })
      .catch(function(e) {
        if (statusEl) {
          statusEl.textContent = "Failed: " + (e && e.message ? e.message : "Server error");
          statusEl.style.color = "#EF4444";
        }
        showToast("Failed to save fees", "error");
      })
      .finally(function() {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>'
            + '<polyline points="17,21 17,13 7,13 7,21"/>'
            + '<polyline points="7,3 7,8 15,8"/>'
            + '</svg> Save All Fees';
        }
      });
  } else {
    standardFee = std;
    expressFee  = exp;
    deliveryFee = std;
    
    localStorage.setItem("tesla_standard_fee", std);
    localStorage.setItem("tesla_express_fee", exp);
    localStorage.setItem("tesla_delivery_fee", std);

    if (statusEl) {
      statusEl.textContent = "✓ Saved Locally — Standard $" + std + " · Express $" + exp;
      statusEl.style.color = "#00A550";
    }
    showToast("Delivery fees updated locally: Standard $" + std + ", Express $" + exp);
    setTimeout(function() {
      if (statusEl) { statusEl.textContent = ""; statusEl.style.color = ""; }
    }, 6000);

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>'
        + '<polyline points="17,21 17,13 7,13 7,21"/>'
        + '<polyline points="7,3 7,8 15,8"/>'
        + '</svg> Save All Fees';
    }
  }
}

function loadDeliveryFees() {
  if (typeof API_BASE !== "undefined" && API_BASE) {
    api("GET", "/admin/settings")
      .then(function(r) {
        // Backend returns snake_case: standard_fee / express_fee
        if (typeof r.standard_fee === "number") { standardFee = r.standard_fee; deliveryFee = r.standard_fee; }
        if (typeof r.express_fee  === "number") expressFee = r.express_fee;
        var sfi = document.getElementById("standardFeeInput");
        var efi = document.getElementById("expressFeeInput");
        if (sfi) sfi.value = standardFee;
        if (efi) efi.value = expressFee;
      })
      .catch(function() {
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
  localStorage.removeItem("tesla_delivery_fee");
  localStorage.removeItem("tesla_payment_methods");
  localStorage.removeItem("tesla_payment_proofs");
  localStorage.removeItem("tesla_social_settings");
  renderUsers();
  loadDashboard();
  showToast("Local cache cleared");
}

window.loadDeliveryFees = loadDeliveryFees;

