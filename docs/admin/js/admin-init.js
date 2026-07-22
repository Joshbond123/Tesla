// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Init, Health & Window Exports
// ╚══════════════════════════════════════════════════════════╝

// ---- REFRESH ----
function refreshAll() { loadOrders(); loadSettings(); loadUsers(function() { try { loadDashboard(); } catch(e) {} try { renderUsers(); } catch(e) {} }); loadPaymentMethods(); loadProofs(); loadSocialSettings(); }
function healthCheck() { if (!API_BASE) { setApiStatus(false); return; } fetch(API_BASE + "/health").then(function(r) { return r.json(); }).then(function() { setApiStatus(true); }).catch(function(e) { console.warn(e.message); setApiStatus(false); }); }

// ---- INIT ----
function init() {
  try {
    // Restore admin password from localStorage if previously set by the admin
    // Only override if the stored value is a non-empty, valid password (>= 3 chars)
    var saved = localStorage.getItem("tesla_admin_pwd");
    if (saved && saved.length >= 3) {
      adminPassword = saved;
    } else {
      // Ensure default password is set
      adminPassword = "admin123";
      localStorage.removeItem("tesla_admin_pwd"); // clear any invalid value
    }
    if (sessionStorage.getItem("tesla_admin_authenticated") === "true") {
      document.getElementById("loginScreen").classList.add("hidden");
      document.getElementById("app").classList.add("active");
      refreshAll();
    } else {
      var li = document.getElementById("loginInput"); if (li) li.focus();
    }
    document.querySelectorAll(".nav-item").forEach(function(btn) { btn.addEventListener("click", function() { switchTab(this.dataset.tab); }); });
    var fi = document.getElementById("feeInput"); if (fi) fi.value = deliveryFee;
    initCCConfig();
    healthCheck();
  } catch(e) { console.error(e); }
}

// ---- EXPOSE ----
window.doLogin = doLogin; window.doLogout = doLogout; window.switchTab = switchTab; window.toggleSidebar = toggleSidebar;
window.refreshAll = refreshAll; window.renderUsers = renderUsers; window.deleteUser = deleteUser; window.loadOrders = loadOrders;
window.renderVehicles = renderVehicles; window.saveDeliveryFee = saveDeliveryFee; window.changePassword = changePassword; window.clearLocalData = clearLocalData;
window.loadPaymentMethods = loadPaymentMethods; window.togglePaymentMethod = togglePaymentMethod; window.editPaymentMethod = editPaymentMethod; window.deletePaymentMethod = deletePaymentMethod;
window.deletePaymentMethod = deletePaymentMethod; window.showAddPaymentMethod = showAddPaymentMethod; window.savePaymentMethod = savePaymentMethod;
window.loadProofs = loadProofs; window.approveProof = approveProof; window.rejectProof = rejectProof; window.renderProofs = renderProofs;
window.loadSocialSettings = loadSocialSettings; window.saveSocialSettings = saveSocialSettings;
window.saveCreditCardConfig = saveCreditCardConfig; window.resetCCSelection = resetCCSelection;

if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }
