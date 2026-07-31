// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Order Details & Status Mgmt
// ╚══════════════════════════════════════════════════════════╝

var _currentOrderId = null;

var DELIVERY_STAGES = [
  { key: "confirmed",        label: "Order Confirmed",   icon: "📋" },
  { key: "processing",       label: "Processing",        icon: "⚙️" },
  { key: "shipped",          label: "Shipped",           icon: "📦" },
  { key: "in_transit",       label: "In Transit",        icon: "🚚" },
  { key: "out_for_delivery", label: "Out for Delivery",  icon: "🏠" },
  { key: "delivered",        label: "Delivered",         icon: "✅" }
];

function viewOrderDetail(orderId) {
  _currentOrderId = orderId;
  var modal = document.getElementById("orderDetailModal");
  if (!modal) { createOrderDetailModal(); modal = document.getElementById("orderDetailModal"); }
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  loadOrderDetail(orderId);
}

function closeOrderDetail() {
  var modal = document.getElementById("orderDetailModal");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
  _currentOrderId = null;
}

function createOrderDetailModal() {
  var overlay = document.createElement("div");
  overlay.id = "orderDetailModal";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;";
  overlay.innerHTML = [
    '<div style="position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);" onclick="closeOrderDetail()"></div>',
    '<div id="orderDetailPanel" style="position:relative;width:100%;max-width:760px;background:white;border-radius:20px;box-shadow:0 32px 80px rgba(0,0,0,.25);overflow:hidden;margin:auto;">',
      '<div style="height:4px;background:linear-gradient(90deg,#E31937,#ff6b6b);"></div>',
      '<div style="padding:28px 32px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(0,0,0,.07);">',
        '<div>',
          '<h2 id="odTitle" style="margin:0;font-size:20px;font-weight:800;color:#111;">Order Details</h2>',
          '<p id="odSubtitle" style="margin:4px 0 0;font-size:13px;color:#888;"></p>',
        '</div>',
        '<button onclick="closeOrderDetail()" style="background:rgba(0,0,0,.06);border:none;cursor:pointer;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:#555;">×</button>',
      '</div>',
      '<div id="odBody" style="padding:28px 32px 32px;max-height:80vh;overflow-y:auto;">',
        '<div style="text-align:center;padding:40px;color:#aaa;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="animation:spin 1s linear infinite;display:block;margin:0 auto 10px"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Loading order…</div>',
      '</div>',
    '</div>'
  ].join("");
  document.body.appendChild(overlay);
  overlay.addEventListener("keydown", function(e) { if (e.key === "Escape") closeOrderDetail(); });
}

function loadOrderDetail(orderId) {
  if (!API_BASE) { document.getElementById("odBody").innerHTML = '<p style="color:#888;text-align:center;padding:40px;">API not configured.</p>'; return; }
  api("GET", "/admin/orders/" + encodeURIComponent(orderId))
    .then(function(r) { renderOrderDetail(r.order); })
    .catch(function(e) {
      document.getElementById("odBody").innerHTML = '<p style="color:#EF4444;text-align:center;padding:40px;">Failed to load order: ' + esc(e.message) + '</p>';
    });
}

function renderOrderDetail(o) {
  if (!o) return;
  var title = document.getElementById("odTitle");
  var sub   = document.getElementById("odSubtitle");
  if (title) title.textContent = "Order " + (o.orderId || "");
  if (sub)   sub.textContent   = "Placed on " + (o.orderDate ? new Date(o.orderDate).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

  var sc  = o.selectedCar     || {};
  var dd  = o.deliveryDetails || {};
  var dm  = o.deliveryMethod  || {};
  var pm  = o.paymentMethod   || {};
  var pp  = o.paymentProof    || null;
  var tl  = o.timeline        || [];
  var fullName = [o.firstName, o.lastName].filter(Boolean).join(" ") || "—";

  // Current status index
  var statusMap = { confirmed: 0, processing: 1, shipped: 2, in_transit: 3, out_for_delivery: 4, delivered: 5 };
  var curIdx = statusMap[o.status] ?? 0;

  // Proof section
  var proofHtml = "";
  if (pp) {
    var proofStatus = String(pp.status || "pending");
    var proofColors = { pending: { bg: "#fff7ed", fg: "#9a3412", border: "#fed7aa" }, approved: { bg: "#f0fdf4", fg: "#166534", border: "#bbf7d0" }, rejected: { bg: "#fef2f2", fg: "#991b1b", border: "#fecaca" } };
    var pc = proofColors[proofStatus] || proofColors.pending;
    proofHtml = '<div class="od-section">' +
      '<div class="od-section-title">Payment Proof</div>' +
      '<div class="od-grid od-grid-2">' +
        odItem("Status", '<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;background:' + pc.bg + ';color:' + pc.fg + ';border:1px solid ' + pc.border + ';">' + proofStatus.charAt(0).toUpperCase() + proofStatus.slice(1) + '</span>') +
        odItem("Submitted", pp.created_at ? new Date(pp.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—") +
        odItem("Amount", pp.amount ? "$" + pp.amount : "—") +
        odItem("Method", pp.payment_method || (typeof pm === "string" ? pm : (pm.name || "—"))) +
      '</div>' +
      (pp.proofUrl || pp.proof_url ? '<div style="margin-top:14px;"><img src="' + esc(pp.proofUrl || pp.proof_url) + '" alt="Payment Proof" style="max-width:100%;max-height:260px;object-fit:contain;border-radius:10px;border:1px solid rgba(0,0,0,.08);"></div>' : "") +
    '</div>';
  }

  // Timeline rows
  var tlHtml = DELIVERY_STAGES.map(function(stage, i) {
    var row = tl.find(function(t) { return t.stage_order === i || (String(t.stage || "").toLowerCase().replace(/\s/g,"_") === stage.key); }) || {};
    var isDone = row.completed || curIdx > i;
    var isCurrent = (curIdx === i);
    var ts = row.timestamp ? new Date(row.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    return '<div class="od-tl-step ' + (isDone ? "done" : isCurrent ? "current" : "upcoming") + '">' +
      '<div class="od-tl-dot">' + (isDone ? "✓" : stage.icon) + '</div>' +
      '<div class="od-tl-info"><div class="od-tl-label">' + stage.label + '</div>' +
        (ts ? '<div class="od-tl-ts">' + ts + '</div>' : (isCurrent ? '<div class="od-tl-ts" style="color:#E31937;">In progress…</div>' : '<div class="od-tl-ts">Upcoming</div>')) +
      '</div>' +
    '</div>';
  }).join("");

  var body = document.getElementById("odBody");
  body.innerHTML = [
    // Customer
    '<div class="od-section">',
      '<div class="od-section-title">Customer Information</div>',
      '<div class="od-grid od-grid-3">',
        odItem("Full Name", fullName),
        odItem("Email", o.email || "—"),
        odItem("Phone", o.phone || "—"),
      '</div>',
    '</div>',
    // Vehicle
    '<div class="od-section">',
      '<div class="od-section-title">Vehicle & Order</div>',
      '<div class="od-grid od-grid-3">',
        odItem("Tesla Model", "Tesla " + (sc.name || sc.model || "—")),
        odItem("Order ID", '<span style="font-family:monospace;font-size:12px;color:#E31937;font-weight:800;">' + esc(o.orderId || "—") + '</span>'),
        odItem("Tracking #", '<span style="font-family:monospace;font-size:12px;font-weight:700;">' + esc(o.trackingNumber || "—") + '</span>'),
        odItem("Order Date", o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"),
        odItem("Order Time", o.orderDate ? new Date(o.orderDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"),
        odItem("Est. Delivery", '<span style="color:#00A550;font-weight:700;">' + esc(o.estimatedDelivery || "—") + '</span>'),
        odItem("Delivery Method", (dm.name || dm.label || "—")),
        odItem("Payment Method", (typeof pm === "string" ? pm : (pm.name || pm.label || "—"))),
      '</div>',
    '</div>',
    // Delivery address
    '<div class="od-section">',
      '<div class="od-section-title">Delivery Address</div>',
      '<div class="od-grid od-grid-3">',
        odItem("Recipient", dd.fullName || dd.name || fullName),
        odItem("Address", dd.address || dd.street || "—"),
        odItem("City", dd.city || "—"),
        odItem("State", dd.state || "—"),
        odItem("ZIP Code", dd.zipCode || dd.zip || "—"),
        odItem("Country", dd.country || "—"),
        odItem("Phone", dd.phone || o.phone || "—"),
      '</div>',
    '</div>',
    // Payment proof
    proofHtml,
    // Delivery progress timeline
    '<div class="od-section">',
      '<div class="od-section-title">Delivery Progress</div>',
      '<div class="od-timeline">',
        tlHtml,
      '</div>',
    '</div>',
    // Update status
    '<div class="od-section od-update-section">',
      '<div class="od-section-title">Update Delivery Status</div>',
      '<p style="font-size:13px;color:#888;margin:0 0 16px;">Changes are saved to the database immediately and reflected on the customer\'s confirmation page.</p>',
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">',
        '<select id="odStatusSelect" style="flex:1;min-width:200px;padding:10px 14px;border-radius:12px;border:1.5px solid rgba(0,0,0,.12);font-size:14px;font-weight:600;background:white;cursor:pointer;">',
          DELIVERY_STAGES.map(function(s) {
            return '<option value="' + s.key + '"' + (s.key === o.status ? ' selected' : '') + '>' + s.icon + ' ' + s.label + '</option>';
          }).join(""),
        '</select>',
        '<button onclick="saveOrderStatus()" style="background:linear-gradient(135deg,#E31937,#c41030);color:white;border:none;cursor:pointer;padding:10px 22px;border-radius:12px;font-size:14px;font-weight:700;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;">',
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>',
          'Save Status',
        '</button>',
      '</div>',
      '<div id="odStatusMsg" style="margin-top:12px;display:none;"></div>',
    '</div>'
  ].join("");
}

function odItem(label, value) {
  return '<div class="od-grid-item"><div class="od-item-label">' + esc(label) + '</div><div class="od-item-val">' + (value == null ? '—' : value) + '</div></div>';
}

function saveOrderStatus() {
  if (!_currentOrderId || !API_BASE) return;
  var sel = document.getElementById("odStatusSelect");
  if (!sel) return;
  var status = sel.value;
  var msg = document.getElementById("odStatusMsg");
  if (msg) { msg.style.display = "none"; }

  api("PUT", "/admin/orders/" + encodeURIComponent(_currentOrderId) + "/status", { status: status })
    .then(function() {
      // Update allOrders in memory
      var idx = allOrders.findIndex(function(o) { return o.orderId === _currentOrderId; });
      if (idx !== -1) { allOrders[idx].status = status; }
      showToast("Delivery status updated to: " + DELIVERY_STAGES.find(function(s) { return s.key === status; })?.label, "success");
      if (msg) {
        msg.style.display = "block";
        msg.style.cssText = "display:block;padding:10px 14px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:13px;font-weight:600;";
        msg.textContent = "✓ Status updated successfully. Customer page will reflect this change immediately.";
      }
      // Re-render the detail panel with updated data
      loadOrderDetail(_currentOrderId);
      // Refresh the orders list too
      setTimeout(function() { renderOrders(); }, 300);
    })
    .catch(function(e) {
      showToast("Failed to update status: " + e.message, "error");
      if (msg) {
        msg.style.display = "block";
        msg.style.cssText = "display:block;padding:10px 14px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:13px;font-weight:600;";
        msg.textContent = "✗ Failed: " + e.message;
      }
    });
}

// ── MODAL CSS ─────────────────────────────────────────────────────────────
(function injectModalStyles() {
  if (document.getElementById("odStyles")) return;
  var s = document.createElement("style");
  s.id = "odStyles";
  s.textContent = [
    "#orderDetailModal { display:none; }",
    "#orderDetailModal.open { display:flex; }",
    "@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }",
    ".od-section { margin-bottom:28px; }",
    ".od-section-title { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid rgba(0,0,0,.06); }",
    ".od-grid { display:grid;gap:12px; }",
    ".od-grid-2 { grid-template-columns:repeat(2,1fr); }",
    ".od-grid-3 { grid-template-columns:repeat(3,1fr); }",
    "@media(max-width:600px) { .od-grid-2,.od-grid-3 { grid-template-columns:1fr 1fr; } }",
    "@media(max-width:400px) { .od-grid-2,.od-grid-3 { grid-template-columns:1fr; } }",
    ".od-grid-item { background:#f8f9fa;border-radius:10px;padding:12px 14px;border:1px solid rgba(0,0,0,.05); }",
    ".od-item-label { font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#aaa;margin-bottom:5px; }",
    ".od-item-val { font-size:13px;font-weight:600;color:#111;word-break:break-word; }",
    ".od-update-section { background:rgba(227,25,55,.03);border:1.5px solid rgba(227,25,55,.1);border-radius:14px;padding:20px; }",
    ".od-timeline { display:flex;flex-direction:column;gap:0; }",
    ".od-tl-step { display:flex;gap:16px;padding:10px 0;position:relative; }",
    ".od-tl-step:not(:last-child)::after { content:'';position:absolute;left:19px;top:44px;width:2px;bottom:-2px;background:rgba(0,0,0,.08); }",
    ".od-tl-step.done::after { background:#00A550; }",
    ".od-tl-step.current::after { background:linear-gradient(to bottom,#E31937,rgba(0,0,0,.08)); }",
    ".od-tl-dot { width:38px;height:38px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid rgba(0,0,0,.1);background:white;z-index:1;position:relative; }",
    ".od-tl-step.done .od-tl-dot { background:#00A550;border-color:#00A550;color:white; }",
    ".od-tl-step.current .od-tl-dot { background:#E31937;border-color:#E31937;color:white; }",
    ".od-tl-step.upcoming .od-tl-dot { background:#f5f5f7;border-color:rgba(0,0,0,.08);color:#ccc; }",
    ".od-tl-info { flex:1;padding-top:6px; }",
    ".od-tl-label { font-size:14px;font-weight:700;color:#111; }",
    ".od-tl-step.current .od-tl-label { color:#E31937; }",
    ".od-tl-step.upcoming .od-tl-label { color:#aaa; }",
    ".od-tl-ts { font-size:12px;color:#888;margin-top:2px; }"
  ].join("\n");
  document.head.appendChild(s);
})();

// ── EXPORTS ───────────────────────────────────────────────────────────────
window.viewOrderDetail  = viewOrderDetail;
window.closeOrderDetail = closeOrderDetail;
window.saveOrderStatus  = saveOrderStatus;
