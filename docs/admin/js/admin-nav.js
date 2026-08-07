// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Navigation (Sidebar & Tabs)
// ╚══════════════════════════════════════════════════════════╝

// ---- TAB SWITCHING ----
function switchTab(tab) {
  // Guard: don't navigate if the login screen is still visible
  var loginScreen = document.getElementById("loginScreen");
  if (loginScreen && !loginScreen.classList.contains("hidden") && loginScreen.style.display !== "none") return;

  // Normalize alias tabs to their backing panel (support → social only)
  // Delivery has its own panel (panelDelivery); do NOT alias it to settings.
  var aliasMap = { support: "social" };
  var resolvedTab = aliasMap[tab] || tab;

  // Mark the clicked nav item active (by original tab name)
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  var navBtn = document.querySelector('.nav-item[data-tab="' + tab + '"]');
  if (navBtn) navBtn.classList.add("active");

  // Show the matching panel (by resolved tab name)
  document.querySelectorAll(".tab-panel").forEach(function(p) { p.classList.remove("active"); });
  var panelId = "panel" + resolvedTab.charAt(0).toUpperCase() + resolvedTab.slice(1);
  var panel = document.getElementById(panelId);
  if (panel) panel.classList.add("active");

  // Update topbar breadcrumb
  var titleMap = {
    dashboard:     "Dashboard",
    users:         "Users",
    orders:        "Orders",
    vehicles:      "Vehicles",
    payments:      "Payment Methods",
    proofs:        "Payment Proofs",
    social:        "Social Media Settings",
    settings:      "System Settings",
    delivery:      "Delivery Fee Settings",
    support:       "Support",
    notifications: "Notifications",
    website:       "Website Settings"
  };
  var title = titleMap[tab] || tab;
  var pageTitleEl = document.getElementById("pageTitle");
  var breadcrumbEl = document.getElementById("pageBreadcrumb");
  if (pageTitleEl) pageTitleEl.textContent = title;
  if (breadcrumbEl) breadcrumbEl.textContent = "Admin / " + title;

  // Close mobile sidebar
  if (window.innerWidth <= 768) toggleSidebar("close");

  // Trigger data loading for the resolved panel
  if (resolvedTab === "dashboard")  { try { loadDashboard(); } catch(e) {} }
  if (resolvedTab === "users")      { try { renderUsers(); } catch(e) {} }
  if (resolvedTab === "orders")     { try { loadOrders(); } catch(e) {} }
  if (resolvedTab === "vehicles")   { try { renderVehicles(); } catch(e) {} }
  if (resolvedTab === "payments")   { try { loadPaymentMethods(); } catch(e) {} }
  if (resolvedTab === "proofs")     { try { loadProofs(); } catch(e) {} }
  if (resolvedTab === "social")     { try { loadSocialSettings(); } catch(e) {} }

  // Delivery Fee Settings — only load delivery fees
  if (resolvedTab === "delivery") {
    try {
      if (typeof window.loadDeliveryFees === "function") {
        window.loadDeliveryFees();
      } else if (typeof loadDeliveryFees === "function") {
        loadDeliveryFees();
      } else {
        var sfi = document.getElementById("standardFeeInput");
        var efi = document.getElementById("expressFeeInput");
        if (sfi) sfi.value = typeof standardFee !== "undefined" ? standardFee : 299;
        if (efi) efi.value = typeof expressFee !== "undefined" ? expressFee : 399;
      }
    } catch(e) {}
  }

  // System Settings — only load WhatsApp (password form is static)
  if (resolvedTab === "settings") {
    try {
      if (typeof window.loadWhatsAppSetting === "function") {
        window.loadWhatsAppSetting();
      }
    } catch(e) {}
  }
}

function toggleSidebar(force) {
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("sidebarOverlay");
  if (!sidebar || !overlay) return;
  if (force === "close") {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  } else {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  }
}
