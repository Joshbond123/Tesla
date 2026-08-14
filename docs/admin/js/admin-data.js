// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Data Loading (Users, Orders, Settings)
// ╚══════════════════════════════════════════════════════════╝

// ---- DATA LOADING ----
function loadUsers(cb) {
  if (!API_BASE) {
    allUsers = [];
    setApiStatus(false);
    if (typeof showToast === "function") showToast("API not configured — cannot load users from database", "error");
    if (cb) cb();
    return;
  }
  api("GET", "/admin/users").then(function(r) {
    allUsers = (r.users || []).sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    setApiStatus(true);
    if (cb) cb();
  }).catch(function(e) {
    console.warn("[Admin] loadUsers:", e && e.message);
    setApiStatus(false);
    allUsers = [];
    if (typeof showToast === "function") showToast("Failed to load users: " + ((e && e.message) || "unknown error"), "error");
    if (cb) cb();
  });
}
function loadUsersLocal(cb) {
  try { var local = JSON.parse(localStorage.getItem("tesla_registered_users") || "[]"); if (local.length === 0) local = JSON.parse(localStorage.getItem("tesla_entry_users") || "[]"); allUsers = (local || []).sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); }); } catch(ex) { allUsers = []; }
  if (cb) cb();
}
function loadSettings() {
  if (typeof window.loadDeliveryFees === "function") {
    window.loadDeliveryFees();
  } else if (typeof loadDeliveryFees === "function") {
    loadDeliveryFees();
  } else {
    loadSettingsLocal();
  }
}
function loadSettingsLocal() {
  var sfi = document.getElementById("standardFeeInput");
  var efi = document.getElementById("expressFeeInput");
  if (sfi) sfi.value = standardFee;
  if (efi) efi.value = expressFee;
}

// ── STATUS HELPERS ─────────────────────────────────────────────────────────
var ORDER_STATUS_CONFIG = {
  confirmed:        { label: "Order Confirmed",   bg: "#eff6ff", fg: "#1d4ed8", dot: "#3b82f6", border: "#bfdbfe" },
  processing:       { label: "Processing",        bg: "#fefce8", fg: "#a16207", dot: "#eab308", border: "#fde68a" },
  shipped:          { label: "Shipped",            bg: "#f0fdf4", fg: "#15803d", dot: "#22c55e", border: "#bbf7d0" },
  in_transit:       { label: "In Transit",         bg: "#fff7ed", fg: "#c2410c", dot: "#f97316", border: "#fed7aa" },
  out_for_delivery: { label: "Out for Delivery",   bg: "#faf5ff", fg: "#7e22ce", dot: "#a855f7", border: "#e9d5ff" },
  delivered:        { label: "Delivered",          bg: "#f0fdf4", fg: "#166534", dot: "#16a34a", border: "#bbf7d0" },
  pending:          { label: "Pending",            bg: "#fefce8", fg: "#a16207", dot: "#eab308", border: "#fde68a" }
};

function orderStatusBadge(status) {
  var s = String(status || "").toLowerCase().trim();
  var cfg = ORDER_STATUS_CONFIG[s] || ORDER_STATUS_CONFIG["pending"];
  return '<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background:' + cfg.bg + ';color:' + cfg.fg + ';border:1px solid ' + cfg.border + ';white-space:nowrap;"><span style="width:6px;height:6px;border-radius:50%;background:' + cfg.dot + ';flex-shrink:0;"></span>' + cfg.label + '</span>';
}

function proofBadge(hasProof, proofStatus) {
  if (!hasProof) return '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600;background:#f5f5f7;color:#aaa;border:1px solid #e5e5e5;">No Proof</span>';
  var s = String(proofStatus || "pending").toLowerCase();
  var colors = { pending: { bg: "#fff7ed", fg: "#9a3412", border: "#fed7aa" }, approved: { bg: "#f0fdf4", fg: "#166534", border: "#bbf7d0" }, rejected: { bg: "#fef2f2", fg: "#991b1b", border: "#fecaca" } };
  var c = colors[s] || colors.pending;
  var label = s.charAt(0).toUpperCase() + s.slice(1);
  return '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:' + c.bg + ';color:' + c.fg + ';border:1px solid ' + c.border + ';">✓ ' + label + '</span>';
}

// ── ORDERS ─────────────────────────────────────────────────────────────────
var _orderSearchTerm = "";
var _orderStatusFilter = "all";

function loadOrders() {
  var container = document.getElementById("ordersContainer");
  var empty = document.getElementById("ordersEmpty");
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--admin-text-muted);"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="animation:spin 1s linear infinite;display:block;margin:0 auto 12px"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Loading orders…</div>';
  if (empty) empty.style.display = "none";
  if (!API_BASE) { allOrders = []; renderOrders(); return; }
  api("GET", "/admin/orders")
    .then(function(r) { allOrders = r.orders || []; renderOrders(); })
    .catch(function(e) { console.warn(e.message); allOrders = []; renderOrders(); });
}

function filterOrders() {
  var sq = _orderSearchTerm.toLowerCase();
  var sf = _orderStatusFilter;
  return allOrders.filter(function(o) {
    if (sf !== "all" && o.status !== sf) return false;
    if (sq) {
      var haystack = [o.orderId, o.email, o.firstName, o.lastName, o.trackingNumber, (o.selectedCar && o.selectedCar.name) || ""].join(" ").toLowerCase();
      if (haystack.indexOf(sq) === -1) return false;
    }
    return true;
  });
}

function renderOrders() {
  var container = document.getElementById("ordersContainer");
  var empty = document.getElementById("ordersEmpty");
  var countEl = document.getElementById("ordersCount");
  if (!container) return;

  var orders = filterOrders();

  if (countEl) countEl.textContent = "Showing " + orders.length + " of " + allOrders.length + " orders";

  if (orders.length === 0) {
    container.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  container.innerHTML = orders.map(function(o) {
    var sc = o.selectedCar || {};
    var dm = o.deliveryMethod || {};
    var pp = o.paymentProof || {};
    var fullName = [o.firstName, o.lastName].filter(Boolean).join(" ") || "—";
    var carName = sc.name || sc.model || "—";
    var delivMethod = dm.name || dm.label || "—";
    var orderDate = o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
    var statusBadgeHtml = orderStatusBadge(o.status);
    var proofHtml = proofBadge(o.hasPaymentProof, pp.status);

    return '<div class="order-card" data-id="' + esc(o.orderId) + '">' +
      '<div class="order-card-top">' +
        '<div class="order-card-id">' +
          '<span style="font-family:monospace;font-weight:800;font-size:13px;color:#E31937;">' + esc(o.orderId) + '</span>' +
          '<span style="font-size:11px;color:#aaa;margin-left:8px;">#' + esc(o.trackingNumber || "") + '</span>' +
        '</div>' +
        '<div class="order-card-badges">' + statusBadgeHtml + ' ' + proofHtml + '</div>' +
      '</div>' +
      '<div class="order-card-body">' +
        '<div class="order-info-grid">' +
          '<div class="order-info-item"><div class="oii-label">Customer</div><div class="oii-val"><div class="user-cell"><div class="user-avatar" style="width:28px;height:28px;font-size:11px;">' + esc((fullName.charAt(0) || "?").toUpperCase()) + '</div><div><div style="font-weight:600;font-size:13px;">' + esc(fullName) + '</div><div style="font-size:12px;color:#888;">' + esc(o.email) + '</div></div></div></div></div>' +
          '<div class="order-info-item"><div class="oii-label">Vehicle</div><div class="oii-val" style="font-weight:600;">' + esc(carName) + '</div></div>' +
          '<div class="order-info-item"><div class="oii-label">Delivery Method</div><div class="oii-val">' + esc(delivMethod) + '</div></div>' +
          '<div class="order-info-item"><div class="oii-label">Est. Delivery</div><div class="oii-val" style="color:#00A550;font-weight:600;">' + esc(o.estimatedDelivery || "—") + '</div></div>' +
          '<div class="order-info-item"><div class="oii-label">Order Date</div><div class="oii-val">' + esc(orderDate) + '</div></div>' +
          '<div class="order-info-item"><div class="oii-label">Phone</div><div class="oii-val">' + esc(o.phone || "—") + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="order-card-footer">' +
        '<button class="btn btn-sm btn-primary-sm" onclick="viewOrderDetail(\'' + esc(o.orderId) + '\')" style="background:linear-gradient(135deg,#E31937,#c41030);color:white;border:none;padding:8px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
          'View Order Details' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join("");
}

window.loadOrders = loadOrders;
window.renderOrders = renderOrders;

// Expose order search/filter handlers
window.ordersSearch = function(v) { _orderSearchTerm = v || ""; renderOrders(); };
window.ordersFilter = function(v) { _orderStatusFilter = v || "all"; renderOrders(); };
