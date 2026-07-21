// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Data Loading (Users, Orders, Settings)
// ╚══════════════════════════════════════════════════════════╝

// ---- DATA LOADING ----
function loadUsers(cb) {
  if (!API_BASE) { loadUsersLocal(cb); return; }
  api("GET", "/admin/users").then(function(r) {
    allUsers = (r.users || []).sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    setApiStatus(true); if (cb) cb();
  }).catch(function(e) { console.warn(e.message); setApiStatus(false); loadUsersLocal(cb); });
}
function loadUsersLocal(cb) {
  try { var local = JSON.parse(localStorage.getItem("tesla_registered_users") || "[]"); if (local.length === 0) local = JSON.parse(localStorage.getItem("tesla_entry_users") || "[]"); allUsers = (local || []).sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); }); } catch(ex) { allUsers = []; }
  if (cb) cb();
}
function loadSettings() {
  if (!API_BASE) { loadSettingsLocal(); return; }
  api("GET", "/admin/settings").then(function(r) { deliveryFee = r.deliveryFee || 299; var fi = document.getElementById("feeInput"); if (fi) fi.value = deliveryFee; localStorage.setItem("tesla_delivery_fee", deliveryFee); }).catch(function() { loadSettingsLocal(); });
}
function loadSettingsLocal() { deliveryFee = parseInt(localStorage.getItem("tesla_delivery_fee") || "299", 10); var fi = document.getElementById("feeInput"); if (fi) fi.value = deliveryFee; }

function loadOrders() {
  var tbody = document.getElementById("ordersTable"); var empty = document.getElementById("ordersEmpty");
  if (!tbody) return;
  tbody.innerHTML = "<tr><td colspan=\"6\" style=\"text-align:center;padding:32px;color:var(--admin-text-muted);\">Loading...</td></tr>";
  if (empty) empty.style.display = "none";
  if (!API_BASE) { allOrders = []; renderOrders(); return; }
  api("GET", "/admin/orders").then(function(r) { allOrders = r.orders || []; renderOrders(); }).catch(function() { allOrders = []; renderOrders(); });
}

function renderOrders() {
  var tbody = document.getElementById("ordersTable"); var empty = document.getElementById("ordersEmpty");
  if (!tbody) return;
  if (allOrders.length === 0) { tbody.innerHTML = ""; if (empty) empty.style.display = "block"; }
  else { if (empty) empty.style.display = "none"; tbody.innerHTML = allOrders.map(function(o) { var m = o.deliveryMethod || {}; return "<tr><td style=\"font-family:monospace;font-weight:700;font-size:12px;\">" + esc(o.orderId) + "</td><td>" + esc(o.email) + "</td><td><span class=\"badge badge-info\">" + esc(o.status) + "</span></td><td>" + esc(m.name || "\u2014") + "</td><td>" + esc(o.estimatedDelivery || "\u2014") + "</td><td>" + esc(o.orderDate ? new Date(o.orderDate).toLocaleDateString() : "\u2014") + "</td></tr>"; }).join(""); }
}
