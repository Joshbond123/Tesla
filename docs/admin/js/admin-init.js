// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Init, Health & Window Exports
// ╚══════════════════════════════════════════════════════════╝

// ---- REFRESH ----
function refreshAll() { loadOrders(); loadSettings(); loadUsers(function() { try { loadDashboard(); } catch(e) {} try { renderUsers(); } catch(e) {} }); loadPaymentMethods(); loadProofs(); loadSocialSettings(); }
function healthCheck() { if (!API_BASE) { setApiStatus(false); return; } fetch(API_BASE + "/health").then(function(r) { return r.json(); }).then(function() { setApiStatus(true); }).catch(function(e) { console.warn(e.message); setApiStatus(false); }); }

// ---- INIT ----
function init() {
  // ── Restore admin password ───────────────────────────────────────────
  try {
    var saved = localStorage.getItem("tesla_admin_pwd");
    if (saved && saved.length >= 3) {
      adminPassword = saved;
    } else {
      adminPassword = "admin123";
      localStorage.removeItem("tesla_admin_pwd");
    }
  } catch(e) { adminPassword = "admin123"; }

  // ── Attach sidebar event listeners FIRST (before any async work) ─────
  // This ensures sidebar buttons always work even if refreshAll() throws.
  try {
    document.querySelectorAll(".nav-item").forEach(function(btn) {
      btn.addEventListener("click", function() { switchTab(this.dataset.tab); });
    });
    var fi = document.getElementById("feeInput");
    if (fi) fi.value = deliveryFee;
    initCCConfig();
  } catch(e) { console.error("[Init] setup error:", e); }

  // ── Auth check & initial data load ───────────────────────────────────
  try {
    if (sessionStorage.getItem("tesla_admin_authenticated") === "true") {
      document.getElementById("loginScreen").classList.add("hidden");
      document.getElementById("app").classList.add("active");
      refreshAll();
    } else {
      var li = document.getElementById("loginInput");
      if (li) li.focus();
    }
  } catch(e) { console.error("[Init] auth/load error:", e); }

  // ── Health check ─────────────────────────────────────────────────────
  try { healthCheck(); } catch(e) {}
}

// ---- EXPOSE ----
window.doLogin = doLogin; window.doLogout = doLogout; window.switchTab = switchTab; window.toggleSidebar = toggleSidebar;
window.refreshAll = refreshAll; window.renderUsers = renderUsers; window.deleteUser = deleteUser; window.loadOrders = loadOrders;
window.renderVehicles = renderVehicles; window.saveDeliveryFee = saveDeliveryFee; window.changePassword = changePassword; window.clearLocalData = clearLocalData;
window.loadPaymentMethods = loadPaymentMethods; window.togglePaymentMethod = togglePaymentMethod; window.editPaymentMethod = editPaymentMethod; window.deletePaymentMethod = deletePaymentMethod;
window.showAddPaymentMethod = showAddPaymentMethod; window.savePaymentMethod = savePaymentMethod;
window.renderPaymentMethods = renderPaymentMethods; // drawer fns self-exported by admin-payments.js
window.loadProofs = loadProofs; window.approveProof = approveProof; window.rejectProof = rejectProof; window.renderProofs = renderProofs;
window.loadSocialSettings = loadSocialSettings; window.saveSocialSettings = saveSocialSettings;
window.saveCreditCardConfig = saveCreditCardConfig; window.resetCCSelection = resetCCSelection;

if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }
