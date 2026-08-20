// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Order Details & Status Mgmt
// ╚══════════════════════════════════════════════════════════╝

"use strict";

var _currentOrderId = null;

var DELIVERY_STAGES = [
  { key: "confirmed",        label: "Order Confirmed",   icon: "1" },
  { key: "processing",       label: "Processing",        icon: "2" },
  { key: "shipped",          label: "Shipped",           icon: "3" },
  { key: "in_transit",       label: "In Transit",        icon: "4" },
  { key: "out_for_delivery", label: "Out for Delivery",  icon: "5" },
  { key: "delivered",        label: "Delivered",         icon: "6" }
];

function viewOrderDetail(orderId) {
  _currentOrderId = orderId;
  var modal = document.getElementById("orderDetailModal");
  if (!modal) {
    createOrderDetailModal();
    modal = document.getElementById("orderDetailModal");
  }
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
  if (document.getElementById("orderDetailModal")) return;
  var overlay = document.createElement("div");
  overlay.id = "orderDetailModal";
  overlay.innerHTML = [
    '<div class="od-backdrop" onclick="closeOrderDetail()"></div>',
    '<div id="orderDetailPanel" class="od-panel" role="dialog" aria-modal="true">',
      '<div class="od-accent"></div>',
      '<div class="od-header">',
        '<div>',
          '<h2 id="odTitle" class="od-title">Order Details</h2>',
          '<p id="odSubtitle" class="od-sub"></p>',
        '</div>',
        '<button type="button" class="od-close" onclick="closeOrderDetail()" aria-label="Close">&times;</button>',
      '</div>',
      '<div id="odBody" class="od-body"><div class="od-loading">Loading order from database…</div></div>',
    '</div>'
  ].join("");
  document.body.appendChild(overlay);
  injectModalStyles();
}

function injectModalStyles() {
  var oldStyles = document.getElementById("odStyles");
  if (oldStyles) oldStyles.remove();
  var s = document.createElement("style");
  s.id = "odStyles"; // v2-clickable-progress
  s.textContent = [
    "#orderDetailModal{display:none;position:fixed;inset:0;z-index:9999;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;}",
    "#orderDetailModal.open{display:flex;}",
    ".od-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);}",
    ".od-panel{position:relative;width:100%;max-width:800px;background:#fff;border-radius:18px;box-shadow:0 32px 80px rgba(0,0,0,.28);overflow:hidden;margin:auto;}",
    ".od-accent{height:4px;background:linear-gradient(90deg,#E31937,#ff6b6b);}",
    ".od-header{padding:22px 28px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(0,0,0,.07);}",
    ".od-title{margin:0;font-size:20px;font-weight:800;color:#111;letter-spacing:-.02em;}",
    ".od-sub{margin:4px 0 0;font-size:13px;color:#888;}",
    ".od-close{background:rgba(0,0,0,.06);border:none;cursor:pointer;width:36px;height:36px;border-radius:50%;font-size:22px;line-height:1;color:#444;}",
    ".od-close:hover{background:rgba(0,0,0,.1);}",
    ".od-body{padding:22px 28px 28px;}",
    ".od-loading{text-align:center;padding:48px 20px;color:#888;font-size:14px;}",
    ".od-section{margin-bottom:26px;}",
    ".od-section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(0,0,0,.06);}",
    ".od-grid{display:grid;gap:10px;}",
    ".od-grid-2{grid-template-columns:repeat(2,1fr);}",
    ".od-grid-3{grid-template-columns:repeat(3,1fr);}",
    "@media(max-width:640px){.od-grid-2,.od-grid-3{grid-template-columns:1fr 1fr;}.od-body{padding:18px;}}",
    "@media(max-width:420px){.od-grid-2,.od-grid-3{grid-template-columns:1fr;}}",
    ".od-grid-item{background:#f8f9fb;border-radius:10px;padding:12px 14px;border:1px solid rgba(0,0,0,.05);}",
    ".od-item-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#aaa;margin-bottom:5px;}",
    ".od-item-val{font-size:13px;font-weight:600;color:#111;word-break:break-word;}",
    ".od-progress-hint{font-size:12px;color:#888;margin:0 0 14px;line-height:1.45;}",
    ".od-tl-step{cursor:pointer;border-radius:12px;padding:10px 10px;margin:0 -10px;transition:background .15s ease,box-shadow .15s ease,transform .12s ease;}",
    ".od-tl-step:hover{background:rgba(227,25,55,.04);}",
    ".od-tl-step.is-saving{opacity:.6;pointer-events:none;}",
    ".od-tl-step.current{background:rgba(227,25,55,.06);}",
    ".od-timeline.is-locked .od-tl-step{cursor:not-allowed;}",
    ".od-timeline.is-locked .od-tl-step:hover{background:transparent;}",
    ".od-lock-banner{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;font-weight:600;line-height:1.45;margin-bottom:14px;}",
    ".od-lock-banner svg{flex-shrink:0;margin-top:1px;}",
    ".od-progress-msg{margin-top:12px;display:none;padding:10px 14px;border-radius:10px;font-size:13px;font-weight:600;}",
    ".od-panel{animation:odSlideIn .28s cubic-bezier(.22,1,.36,1);}",
    "@keyframes odSlideIn{from{opacity:0;transform:translateY(12px) scale(.98);}to{opacity:1;transform:none;}}",
    ".od-timeline{display:flex;flex-direction:column;}",
    ".od-tl-step{display:flex;gap:14px;padding:10px 0;position:relative;}",
    ".od-tl-step:not(:last-child)::after{content:'';position:absolute;left:17px;top:42px;width:2px;bottom:0;background:rgba(0,0,0,.08);}",
    ".od-tl-step.done::after{background:#00A550;}",
    ".od-tl-step.current::after{background:linear-gradient(to bottom,#E31937,rgba(0,0,0,.08));}",
    ".od-tl-dot{width:36px;height:36px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;border:2px solid rgba(0,0,0,.1);background:#fff;z-index:1;color:#888;}",
    ".od-tl-step.done .od-tl-dot{background:#00A550;border-color:#00A550;color:#fff;}",
    ".od-tl-step.current .od-tl-dot{background:#E31937;border-color:#E31937;color:#fff;box-shadow:0 0 0 4px rgba(227,25,55,.15);}",
    ".od-tl-step.upcoming .od-tl-dot{background:#f5f5f7;border-color:rgba(0,0,0,.08);color:#bbb;}",
    ".od-tl-info{flex:1;padding-top:6px;}",
    ".od-tl-label{font-size:14px;font-weight:700;color:#111;}",
    ".od-tl-step.current .od-tl-label{color:#E31937;}",
    ".od-tl-step.upcoming .od-tl-label{color:#aaa;}",
    ".od-tl-ts{font-size:12px;color:#888;margin-top:2px;}",
    ".od-status-row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;}",
    ".od-field{flex:1;min-width:160px;}",
    ".od-field label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:6px;}",
    ".od-field select,.od-field input{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;}",
    ".od-save-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;background:linear-gradient(135deg,#E31937,#c41030);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 6px 16px rgba(227,25,55,.25);}",
    ".od-save-btn:disabled{opacity:.7;cursor:not-allowed;}",
    ".od-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;}",
    ".od-badge-current{background:rgba(227,25,55,.1);color:#E31937;border:1px solid rgba(227,25,55,.2);}"
  ].join("\n");
  document.head.appendChild(s);
}

function loadOrderDetail(orderId) {
  var body = document.getElementById("odBody");
  if (body) body.innerHTML = '<div class="od-loading">Loading order from database…</div>';
  if (!API_BASE) {
    if (body) body.innerHTML = '<p style="color:#888;text-align:center;padding:40px;">API not configured.</p>';
    return;
  }
  api("GET", "/admin/orders/" + encodeURIComponent(orderId))
    .then(function (r) {
      if (!r || !r.order) throw new Error("Order payload missing from API");
      renderOrderDetail(r.order);
    })
    .catch(function (e) {
      if (body) {
        body.innerHTML = '<p style="color:#EF4444;text-align:center;padding:40px;">Failed to load order: ' + esc(e.message) + '</p>';
      }
    });
}

function valOrDash(v) {
  if (v == null) return "—";
  var s = String(v).trim();
  return s ? s : "—";
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return String(iso);
  }
}

function renderOrderDetail(o) {
  if (!o) return;
  injectModalStyles();

  var title = document.getElementById("odTitle");
  var sub = document.getElementById("odSubtitle");
  if (title) title.textContent = "Order " + (o.orderId || "");
  if (sub) sub.textContent = "Placed " + formatDateTime(o.orderDate);

  var sc = o.selectedCar || {};
  var dd = o.deliveryDetails || {};
  var dm = o.deliveryMethod || {};
  var pm = o.paymentMethod || {};
  var pp = o.paymentProof || null;
  var tl = Array.isArray(o.timeline) ? o.timeline : [];

  // Customer fields — prefer registered user, fall back to delivery form data
  var fullName = [o.firstName, o.lastName].filter(Boolean).join(" ")
    || dd.fullName || dd.name || "—";
  var email = o.email || dd.email || "—";
  var phone = o.phone || dd.phone || "—";
  var address = dd.address || dd.street || "—";
  var city = dd.city || "—";
  var state = dd.state || "—";
  var zip = dd.zipCode || dd.zip || "—";
  var country = dd.country || "—";

  var statusMap = { confirmed: 0, processing: 1, shipped: 2, in_transit: 3, out_for_delivery: 4, delivered: 5 };
  var statusKey = String(o.status || "confirmed").toLowerCase().replace(/\s+/g, "_");
  var statusIdx = statusMap[statusKey];
  if (typeof statusIdx !== "number") statusIdx = 0;

  // Also derive from tracking_data so Admin never lags customer if status column is stale
  var timelineIdx = 0;
  (tl || []).forEach(function (t) {
    var ord = Number(t.stage_order);
    if (isNaN(ord)) {
      var lab = String(t.stage || "").toLowerCase().replace(/\s+/g, "_");
      if (lab in statusMap) ord = statusMap[lab];
      else {
        var byLabel = DELIVERY_STAGES.findIndex(function (s) { return s.label.toLowerCase() === String(t.stage || "").toLowerCase(); });
        ord = byLabel >= 0 ? byLabel : 0;
      }
    }
    if (t.completed && ord >= timelineIdx) timelineIdx = ord;
  });
  // Current stage = furthest of DB status and completed timeline stages
  var curIdx = Math.max(statusIdx, timelineIdx);
  if (curIdx > DELIVERY_STAGES.length - 1) curIdx = DELIVERY_STAGES.length - 1;
  statusKey = DELIVERY_STAGES[curIdx].key;

  var statusLabel = (DELIVERY_STAGES[curIdx] && DELIVERY_STAGES[curIdx].label) || statusKey;

  // Payment proof block
  var proofHtml = "";
  if (pp) {
    var proofStatus = String(pp.status || "pending");
    var proofColors = {
      pending: { bg: "#fff7ed", fg: "#9a3412", border: "#fed7aa" },
      approved: { bg: "#f0fdf4", fg: "#166534", border: "#bbf7d0" },
      rejected: { bg: "#fef2f2", fg: "#991b1b", border: "#fecaca" }
    };
    var pc = proofColors[proofStatus] || proofColors.pending;
    var pmProof = pp.payment_method;
    if (pmProof && typeof pmProof === "object") pmProof = pmProof.name || pmProof.id || "—";
    proofHtml = [
      '<div class="od-section">',
        '<div class="od-section-title">Payment Proof</div>',
        '<div class="od-grid od-grid-2">',
          odItem("Status", '<span class="od-badge" style="background:' + pc.bg + ';color:' + pc.fg + ';border:1px solid ' + pc.border + ';">' + esc(proofStatus) + '</span>'),
          odItem("Submitted", formatDateTime(pp.created_at)),
          odItem("Amount", pp.amount != null && pp.amount !== "" ? ("$" + pp.amount) : "—"),
          odItem("Method", valOrDash(pmProof || (typeof pm === "object" ? (pm.name || pm.label) : pm))),
        '</div>',
      '</div>'
    ].join("");
  }

  // Delivery progress — editable only after payment proof exists in DB
  var proofStatus = pp ? String(pp.status || "pending").toLowerCase() : "";
  var canEditProgress = !!(pp && proofStatus !== "rejected");
  var lockReason = !pp
    ? "Delivery progress is locked until the customer uploads payment proof."
    : (proofStatus === "rejected"
      ? "Delivery progress is locked because the payment proof was rejected."
      : "");

  var tlHtml = DELIVERY_STAGES.map(function (stage, i) {
    var row = tl.find(function (t) {
      return Number(t.stage_order) === i ||
        String(t.stage || "").toLowerCase().replace(/\s+/g, "_") === stage.key ||
        String(t.stage || "").toLowerCase() === stage.label.toLowerCase();
    }) || {};
    var isDone = i < curIdx;
    var isCurrent = i === curIdx;
    var cls = isDone ? "done" : (isCurrent ? "current" : "upcoming");
    var ts = row.timestamp ? formatDateTime(row.timestamp) : "";
    var tsHtml;
    if (ts && ts !== "—") tsHtml = ts;
    else if (isCurrent) tsHtml = "In progress…";
    else if (isDone) tsHtml = "Completed";
    else tsHtml = "Upcoming";
    var title = canEditProgress
      ? ("Set status to " + stage.label)
      : "Editing locked until payment proof is uploaded";
    return [
      '<div class="od-tl-step ' + cls + '" data-stage="' + stage.key + '" role="button" tabindex="' + (canEditProgress ? "0" : "-1") + '" title="' + title + '">',
        '<div class="od-tl-dot">' + (isDone ? "✓" : stage.icon) + '</div>',
        '<div class="od-tl-info">',
          '<div class="od-tl-label">' + stage.label + (isCurrent ? ' <span class="od-badge od-badge-current">Current</span>' : "") + '</div>',
          '<div class="od-tl-ts">' + tsHtml + '</div>',
        '</div>',
      '</div>'
    ].join("");
  }).join("");

  var carName = sc.name ? ("Tesla " + sc.name) : "—";
  var dmName = (dm && (dm.name || dm.label)) || "—";
  var pmName = typeof pm === "string" ? pm : ((pm && (pm.name || pm.label)) || "—");
  var payStatus = pp ? String(pp.status || "pending") : (pmName && pmName !== "—" && pmName !== "Not specified" ? "Selected" : "Not submitted");

  var body = document.getElementById("odBody");
  if (!body) return;
  body.innerHTML = [
    '<div class="od-section">',
      '<div class="od-section-title">Customer Information</div>',
      '<div class="od-grid od-grid-3">',
        odItem("Customer Name", fullName),
        odItem("Email", email),
        odItem("Phone", phone),
      '</div>',
    '</div>',
    '<div class="od-section">',
      '<div class="od-section-title">Vehicle & Order</div>',
      '<div class="od-grid od-grid-3">',
        odItem("Order ID", o.orderId || "—"),
        odItem("Tracking #", o.trackingNumber || "—"),
        odItem("Tesla Model", carName),
        odItem("Order Date", formatDateTime(o.orderDate)),
        odItem("Est. Delivery", o.estimatedDelivery || "—"),
        odItem("Current Status", '<span class="od-badge od-badge-current">' + esc(statusLabel) + '</span>'),
        odItem("Delivery Method", dmName),
        odItem("Payment Method", pmName),
        odItem("Payment Status", payStatus),
      '</div>',
    '</div>',
    '<div class="od-section">',
      '<div class="od-section-title">Delivery Address</div>',
      '<div class="od-grid od-grid-3">',
        odItem("Recipient", dd.fullName || dd.name || fullName),
        odItem("Address", address),
        odItem("City", city),
        odItem("State", state),
        odItem("ZIP / Postal", zip),
        odItem("Country", country),
      '</div>',
    '</div>',
    proofHtml,
    '<div class="od-section">',
      '<div class="od-section-title">Delivery Progress</div>',
      (canEditProgress
        ? '<p class="od-progress-hint">Click a delivery stage to update this order\'s progress. Changes save to the database and sync to customer pages.</p>'
        : '<div class="od-lock-banner"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>' + esc(lockReason) + '</span></div>'),
      '<div class="od-timeline' + (canEditProgress ? '' : ' is-locked') + '" id="odTimeline">' + tlHtml + '</div>',
      '<div class="od-progress-msg" id="odStatusMsg"></div>',
    '</div>'
  ].join("");

  // Store last order payload for in-place updates (no page reload)
  window._odLastOrder = o;
  window._odCanEditProgress = canEditProgress;

  var timelineEl = document.getElementById("odTimeline");
  if (timelineEl && canEditProgress) {
    timelineEl.querySelectorAll(".od-tl-step").forEach(function (stepEl) {
      stepEl.addEventListener("click", function () {
        var stage = stepEl.getAttribute("data-stage");
        if (!stage || !_currentOrderId) return;
        if (stage === statusKey) {
          showToast("Already at this stage", "info");
          return;
        }
        saveOrderStatus(stage, stepEl);
      });
      stepEl.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          stepEl.click();
        }
      });
    });
  }
}

function odItem(label, value) {
  var display = value == null || value === "" ? "—" : value;
  // Allow trusted HTML only for our own badge spans; escape plain text
  var isHtml = typeof display === "string" && display.indexOf("<") !== -1;
  return '<div class="od-grid-item"><div class="od-item-label">' + esc(label) + '</div><div class="od-item-val">' +
    (isHtml ? display : esc(String(display))) +
    '</div></div>';
}

function saveOrderStatus(status, stepEl) {
  if (!_currentOrderId || !API_BASE) return;
  if (!status) return;
  if (!window._odCanEditProgress) {
    showToast("Delivery progress is locked until payment proof is uploaded", "warning");
    return;
  }
  var msg = document.getElementById("odStatusMsg");
  if (msg) {
    msg.style.display = "none";
    msg.textContent = "";
  }
  if (stepEl) stepEl.classList.add("is-saving");
  var timelineEl = document.getElementById("odTimeline");
  if (timelineEl) timelineEl.style.pointerEvents = "none";

  api("PUT", "/admin/orders/" + encodeURIComponent(_currentOrderId) + "/status", { status: status })
    .then(function (res) {
      var idx = allOrders.findIndex(function (o) { return o.orderId === _currentOrderId; });
      if (idx !== -1) allOrders[idx].status = status;
      var label = (DELIVERY_STAGES.find(function (s) { return s.key === status; }) || {}).label || status;
      showToast("Delivery progress updated: " + label, "success");
      if (msg) {
        msg.style.display = "block";
        msg.style.background = "#f0fdf4";
        msg.style.border = "1px solid #bbf7d0";
        msg.style.color = "#166534";
        msg.textContent = "Saved. Customer pages will show this status on next load.";
      }
      // In-place UI update from cached order + new status (no page reload, modal stays open)
      var cached = window._odLastOrder || {};
      var stageIdx = DELIVERY_STAGES.findIndex(function (s) { return s.key === status; });
      if (stageIdx < 0) stageIdx = 0;
      var nowIso = (res && res.timestamp) || new Date().toISOString();
      var newTl = DELIVERY_STAGES.map(function (s, i) {
        var prev = (cached.timeline || []).find(function (t) {
          return Number(t.stage_order) === i || String(t.stage || "").toLowerCase() === s.label.toLowerCase();
        }) || {};
        return {
          stage_order: i,
          stage: s.label,
          completed: i <= stageIdx,
          timestamp: i < stageIdx ? (prev.timestamp || nowIso) : (i === stageIdx ? nowIso : null)
        };
      });
      cached.status = status;
      cached.timeline = newTl;
      window._odLastOrder = cached;
      renderOrderDetail(cached);
      // Soft-refresh list badges only
      setTimeout(function () { if (typeof renderOrders === "function") renderOrders(); }, 150);
      // Background revalidate from DB without clearing the modal first
      api("GET", "/admin/orders/" + encodeURIComponent(_currentOrderId))
        .then(function (r) {
          if (r && r.order && _currentOrderId === (r.order.orderId || _currentOrderId)) {
            window._odLastOrder = r.order;
            renderOrderDetail(r.order);
          }
        })
        .catch(function () { /* keep optimistic UI */ });
    })
    .catch(function (e) {
      showToast("Failed to update status: " + e.message, "error");
      if (msg) {
        msg.style.display = "block";
        msg.style.background = "#fef2f2";
        msg.style.border = "1px solid #fecaca";
        msg.style.color = "#991b1b";
        msg.textContent = "Failed: " + e.message;
      }
      if (stepEl) stepEl.classList.remove("is-saving");
      if (timelineEl) timelineEl.style.pointerEvents = "";
    });
}

// Auto-inject styles when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectModalStyles);
} else {
  injectModalStyles();
}

window.viewOrderDetail = viewOrderDetail;
window.closeOrderDetail = closeOrderDetail;
window.saveOrderStatus = saveOrderStatus;
