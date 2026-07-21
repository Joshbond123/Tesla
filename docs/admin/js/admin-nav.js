// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Navigation (Sidebar & Tabs)
// ╚══════════════════════════════════════════════════════════╝

// ---- TAB SWITCHING ----
function switchTab(tab) {
  if (!document.getElementById("app").classList.contains("active")) return;
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  var navBtn = document.querySelector(".nav-item[data-tab=\"" + tab + "\"]");
  if (navBtn) navBtn.classList.add("active");
  document.querySelectorAll(".tab-panel").forEach(function(p) { p.classList.remove("active"); });
  var panelId = "panel" + tab.charAt(0).toUpperCase() + tab.slice(1);
  var panel = document.getElementById(panelId);
  if (panel) panel.classList.add("active");
  var titleMap = { dashboard: "Dashboard", users: "Users", orders: "Orders", vehicles: "Vehicles", payments: "Payment Methods", proofs: "Payment Proofs", social: "Support & Social", settings: "Settings" };
  document.getElementById("pageTitle").textContent = titleMap[tab] || tab;
  document.getElementById("pageBreadcrumb").textContent = "Admin / " + (titleMap[tab] || tab);
  if (window.innerWidth <= 768) toggleSidebar("close");
  if (tab === "dashboard") { loadDashboard(); }
  if (tab === "users") { renderUsers(); }
  if (tab === "orders") { loadOrders(); }
  if (tab === "vehicles") { renderVehicles(); }
  if (tab === "payments") { loadPaymentMethods(); }
  if (tab === "proofs") { loadProofs(); }
  if (tab === "social") { loadSocialSettings(); }
  if (tab === "settings") { var fi = document.getElementById("feeInput"); if (fi) fi.value = deliveryFee; }
}

function toggleSidebar(force) {
  var sidebar = document.getElementById("sidebar"); var overlay = document.getElementById("sidebarOverlay");
  if (!sidebar || !overlay) return;
  if (force === "close") { sidebar.classList.remove("open"); overlay.classList.remove("open"); }
  else { sidebar.classList.toggle("open"); overlay.classList.toggle("open"); }
}
