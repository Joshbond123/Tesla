// ════════════════════════════════════════════════════════════════
//  Tesla Award — Admin Panel · Payment Proofs (Full Redesign v2)
//  Modern cards · Full detail modal · Multi-image · Proper actions
// ════════════════════════════════════════════════════════════════

var allProofs = [];

// ── Helpers ─────────────────────────────────────────────────────
function hasVal(v) { return v != null && v !== "" && v !== "-" && v !== "—"; }
function display(v) { return hasVal(v) ? esc(v) : ""; }
function fmtAmount(amount) {
  var raw = String(amount || "").replace(/[^0-9.]/g, "");
  var n = parseFloat(raw);
  if (!n || isNaN(n)) return hasVal(amount) ? String(amount) : "";
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtDate(iso) {
  if (!hasVal(iso)) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(iso) {
  if (!hasVal(iso)) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
    " at " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function initials(name) {
  if (!hasVal(name)) return "?";
  return String(name).split(" ").slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
}
function statusBadge(status, large) {
  var map = {
    pending:  { label: "Pending",  bg: "#fef3c7", fg: "#92400e", dot: "#f59e0b" },
    approved: { label: "Approved", bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
    rejected: { label: "Rejected", bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" }
  };
  var s = map[String(status || "").toLowerCase()] || { label: status || "Unknown", bg: "#f1f5f9", fg: "#475569", dot: "#94a3b8" };
  var pad = large ? "5px 14px" : "3px 10px";
  var fs = large ? "13px" : "11px";
  return '<span style="display:inline-flex;align-items:center;gap:5px;padding:' + pad + ';border-radius:999px;font-size:' + fs + ';font-weight:600;background:' + s.bg + ';color:' + s.fg + ';">' +
    '<span style="width:6px;height:6px;border-radius:50%;background:' + s.dot + ';display:inline-block;"></span>' + esc(s.label) + '</span>';
}

// ── Data ─────────────────────────────────────────────────────────
function loadProofs() {
  var container = document.getElementById("proofsContainer");
  if (container) container.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8;"><div style="font-size:32px;margin-bottom:12px;">⏳</div><div style="font-size:14px;">Loading payment proofs…</div></div>';
  api("GET", "/admin/payment-proofs").then(function (r) {
    allProofs = (r.proofs || []).map(function (p) {
      return {
        id: p.id,
        order_id: p.order_id,
        user_name: p.user_name || p.customer_name || "",
        user_email: p.user_email || p.customer_email || "",
        user_phone: p.user_phone || p.customer_phone || "",
        car_model: p.car_model || "",
        delivery_method: p.delivery_method || "",
        delivery_address: p.delivery_address || "",
        payment_method: p.payment_method || "",
        amount: p.amount || "",
        status: p.status || "pending",
        admin_notes: p.admin_notes || "",
        proof_url: p.proof_url || "",
        proof_back_url: p.proof_back_url || "",
        proof_type: p.proof_type || "",
        reviewed_at: p.reviewed_at || "",
        reviewed_by: p.reviewed_by || "",
        created_at: p.created_at || ""
      };
    });
    var badge = document.getElementById("proofsNavBadge");
    var pending = allProofs.filter(function (p) { return p.status === "pending"; }).length;
    if (badge) { badge.style.display = pending ? "inline-flex" : "none"; badge.textContent = String(pending); }
    setApiStatus(true);
    renderProofs();
  }).catch(function () {
    if (container) container.innerHTML = '<div style="padding:60px;text-align:center;color:#ef4444;"><div style="font-size:32px;margin-bottom:12px;">⚠️</div><div style="font-size:14px;font-weight:500;">Unable to load proofs</div><div style="font-size:12px;color:#94a3b8;margin-top:4px;">Check your API connection and try again</div></div>';
    setApiStatus(false);
  });
}

// ── Render list ──────────────────────────────────────────────────
function renderProofs() {
  var container = document.getElementById("proofsContainer");
  var empty = document.getElementById("proofsEmpty");
  var countLabel = document.getElementById("proofsCountLabel");
  if (!container) return;

  var q = (document.getElementById("proofSearch") || {}).value || "";
  var filter = (document.getElementById("proofFilter") || {}).value || "all";
  var sort = (document.getElementById("proofSort") || {}).value || "newest";
  var needle = q.trim().toLowerCase();

  var filtered = allProofs.filter(function (p) {
    if (filter !== "all" && p.status !== filter) return false;
    if (!needle) return true;
    return [p.user_name, p.user_email, p.order_id, p.car_model, p.payment_method]
      .some(function (f) { return String(f || "").toLowerCase().indexOf(needle) !== -1; });
  });

  if (sort === "oldest") filtered.sort(function (a, b) { return new Date(a.created_at || 0) - new Date(b.created_at || 0); });
  else if (sort === "pending_first") filtered.sort(function (a, b) { return (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1); });
  else filtered.sort(function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });

  if (countLabel) countLabel.textContent = filtered.length ? (filtered.length + (filtered.length === 1 ? " proof" : " proofs")) : "";

  if (!filtered.length) {
    container.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";
  container.innerHTML = filtered.map(renderProofCard).join("");
}

// ── Card ─────────────────────────────────────────────────────────
function renderProofCard(p) {
  var name = hasVal(p.user_name) ? esc(p.user_name) : "Unknown Customer";
  var isPending = p.status === "pending";
  var hasImg = hasVal(p.proof_url);
  var hasBack = hasVal(p.proof_back_url);
  var imgCount = (hasImg ? 1 : 0) + (hasBack ? 1 : 0);

  var statusColor = { pending: "#f59e0b", approved: "#16a34a", rejected: "#ef4444" }[p.status] || "#94a3b8";
  var borderAccent = isPending ? "3px solid #f59e0b" : (p.status === "approved" ? "3px solid #16a34a" : "3px solid #ef4444");

  return '<div style="background:#fff;border:1px solid #e2e8f0;border-left:' + borderAccent + ';border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.05);transition:box-shadow .2s;" ' +
    'onmouseenter="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.1)\'" onmouseleave="this.style.boxShadow=\'0 1px 3px rgba(0,0,0,.05)\'">' +
    '<div style="display:flex;gap:16px;align-items:flex-start;">' +

    // Avatar
    '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0;box-shadow:0 2px 8px rgba(79,70,229,.25);">' + initials(p.user_name) + '</div>' +

    '<div style="flex:1;min-width:0;">' +

      // Top row: name + status
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:12px;">' +
        '<div style="min-width:0;">' +
          '<div style="font-weight:700;font-size:15px;color:#0f172a;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + name + '</div>' +
          (hasVal(p.user_email) ? '<div style="font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(p.user_email) + '</div>' : '') +
        '</div>' +
        statusBadge(p.status) +
      '</div>' +

      // Info grid
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px;">' +
        infoChip("📋 Order ID", p.order_id, true) +
        infoChip("🚗 Tesla Model", p.car_model) +
        infoChip("💳 Payment", p.payment_method) +
        (hasVal(p.amount) ? infoChip("💰 Amount", fmtAmount(p.amount)) : "") +
        infoChip("🕒 Submitted", fmtDateTime(p.created_at)) +
        (imgCount > 1 ? infoChip("📎 Images", imgCount + " files attached") : "") +
      '</div>' +

      // Actions
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
        '<button onclick="window.openProofDetail(\'' + esc(p.id) + '\')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;" onmouseenter="this.style.background=\'#4338ca\'" onmouseleave="this.style.background=\'#4f46e5\'">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
          'View Proof' +
        '</button>' +
        (isPending ? '<button onclick="window.quickApproveProof(\'' + esc(p.id) + '\')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;" onmouseenter="this.style.background=\'#bbf7d0\'" onmouseleave="this.style.background=\'#dcfce7\'">✓ Approve</button>' : '') +
        (isPending ? '<button onclick="window.quickRejectProof(\'' + esc(p.id) + '\')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#fff;color:#991b1b;border:1px solid #fecaca;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;" onmouseenter="this.style.background=\'#fee2e2\'" onmouseleave="this.style.background=\'#fff\'">✕ Reject</button>' : '') +
        (p.status !== "pending" && hasVal(p.reviewed_at) ? '<span style="font-size:11px;color:#94a3b8;margin-left:4px;">Reviewed ' + fmtDate(p.reviewed_at) + '</span>' : '') +
      '</div>' +

    '</div>' + // flex inner
    '</div>' + // flex outer
    '</div>';
}

function infoChip(label, value, mono) {
  if (!hasVal(value)) return "";
  return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;min-width:0;">' +
    '<div style="font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">' + esc(label) + '</div>' +
    '<div style="font-size:12px;font-weight:600;color:#1e293b;' + (mono ? 'font-family:ui-monospace,monospace;' : '') + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + display(value) + '</div>' +
    '</div>';
}

// ── Detail Modal ─────────────────────────────────────────────────
function openProofDetail(id) {
  var p = (allProofs || []).find(function (x) { return x.id === id; });
  if (!p) return;

  var modal = document.getElementById("proofDetailModal");
  if (!modal) return;

  var images = [];
  if (hasVal(p.proof_url)) images.push(p.proof_url);
  if (hasVal(p.proof_back_url)) images.push(p.proof_back_url);
  var imageLabels = images.length > 1 ? ["Front / Main", "Back"] : ["Proof Image"];

  var imgHtml = images.length > 0
    ? '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">' +
        images.map(function(url, i) {
          return '<div style="flex:1;min-width:200px;max-width:100%;">' +
            (imageLabels[i] ? '<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">' + imageLabels[i] + '</div>' : '') +
            '<img src="' + esc(url) + '" alt="Payment proof ' + (i+1) + '" ' +
            'style="width:100%;max-height:280px;object-fit:contain;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;cursor:zoom-in;" ' +
            'onclick="window.openImageZoom(\'' + esc(url) + '\')" ' +
            'onerror="this.style.display=\'none\'"/>' +
          '</div>';
        }).join('') +
      '</div>'
    : '<div style="padding:32px;text-align:center;background:#f8fafc;border-radius:10px;border:1px dashed #e2e8f0;margin-bottom:24px;color:#94a3b8;font-size:13px;">No proof images uploaded</div>';

  var approveBtn = p.status !== "approved"
    ? '<button onclick="window.approveProof(\'' + esc(p.id) + '\')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .15s;" onmouseenter="this.style.opacity=\'.9\'" onmouseleave="this.style.opacity=\'1\'">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>Approve Payment</button>'
    : '';

  var rejectBtn = p.status !== "rejected"
    ? '<button onclick="window.rejectProof(\'' + esc(p.id) + '\')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:#fff;color:#dc2626;border:2px solid #fecaca;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:all .15s;" onmouseenter="this.style.background=\'#fee2e2\'" onmouseleave="this.style.background=\'#fff\'">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Reject Payment</button>'
    : '';

  var modalBody = document.getElementById("proofDetailBody");
  if (!modalBody) return;

  modalBody.innerHTML =
    // Header
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;">' +
      '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px;flex-shrink:0;">' + initials(p.user_name) + '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:700;font-size:18px;color:#0f172a;margin-bottom:4px;">' + (hasVal(p.user_name) ? esc(p.user_name) : "Unknown Customer") + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          statusBadge(p.status, true) +
          (hasVal(p.created_at) ? '<span style="font-size:12px;color:#94a3b8;">Submitted ' + fmtDateTime(p.created_at) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>' +

    // Proof images
    '<div style="margin-bottom:8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;">Payment Proof Images</div>' +
    imgHtml +

    // Two-column info grid
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">' +

      // Customer info
      '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:12px;">👤 Customer Information</div>' +
        detailRow("Full Name", p.user_name) +
        detailRow("Email Address", p.user_email) +
        detailRow("Phone Number", p.user_phone) +
      '</div>' +

      // Order details
      '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:12px;">📦 Order Details</div>' +
        detailRow("Order ID", p.order_id, true) +
        detailRow("Tesla Model", p.car_model) +
        detailRow("Amount", fmtAmount(p.amount)) +
        detailRow("Proof Type", p.proof_type) +
      '</div>' +

    '</div>' +

    // Second row
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">' +

      // Payment info
      '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:12px;">💳 Payment Information</div>' +
        detailRow("Payment Method", p.payment_method) +
        detailRow("Submission Date", fmtDate(p.created_at)) +
        detailRow("Submission Time", hasVal(p.created_at) ? new Date(p.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "") +
      '</div>' +

      // Delivery info
      '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:12px;">🚚 Delivery Details</div>' +
        detailRow("Delivery Method", p.delivery_method) +
        detailRow("Delivery Address", p.delivery_address) +
      '</div>' +

    '</div>' +

    // Review info (if already reviewed)
    (hasVal(p.reviewed_at) ? '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin-bottom:20px;display:flex;align-items:center;gap:10px;">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>' +
      '<div style="font-size:13px;color:#166534;"><strong>Reviewed</strong> by ' + esc(p.reviewed_by || "admin") + ' on ' + fmtDateTime(p.reviewed_at) + (hasVal(p.admin_notes) ? '<br><span style="color:#14532d;">' + esc(p.admin_notes) + '</span>' : '') + '</div>' +
    '</div>' : '') +

    // Action buttons
    (approveBtn || rejectBtn ? '<div style="display:flex;gap:12px;margin-top:4px;">' + (approveBtn || '') + (rejectBtn || '') + '</div>' : '');

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function detailRow(label, value, mono) {
  if (!hasVal(value)) return "";
  return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.04);last-child:border-bottom:none;">' +
    '<span style="font-size:12px;color:#64748b;white-space:nowrap;">' + esc(label) + '</span>' +
    '<span style="font-size:12px;font-weight:600;color:#1e293b;text-align:right;' + (mono ? 'font-family:ui-monospace,monospace;font-size:11px;' : '') + '">' + display(value) + '</span>' +
  '</div>';
}

function closeProofDetail() {
  var modal = document.getElementById("proofDetailModal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

// ── Image zoom (simple overlay) ──────────────────────────────────
function openImageZoom(url) {
  var z = document.getElementById("imageZoomOverlay");
  var img = document.getElementById("imageZoomImg");
  if (z) z.style.display = "flex";
  if (img) img.src = url;
}
function closeImageZoom() {
  var z = document.getElementById("imageZoomOverlay");
  if (z) z.style.display = "none";
}

// ── Actions ──────────────────────────────────────────────────────
function approveProof(id) {
  var p = (allProofs || []).find(function (x) { return x.id === id; });
  if (!p) return;
  var btn = event && event.target;
  if (btn) { btn.disabled = true; btn.textContent = "Approving…"; }
  api("POST", "/admin/payment-proofs/approve", { id: id }).then(function () {
    showToast("Payment approved successfully!", "success");
    closeProofDetail();
    loadProofs();
  }).catch(function (e) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>Approve Payment'; }
    showToast("Approve failed: " + (e && e.message ? e.message : "unknown error"), "error");
  });
}

function rejectProof(id) {
  var reason = prompt("Reason for rejecting this payment proof (optional):", "");
  if (reason === null) return;
  var p = (allProofs || []).find(function (x) { return x.id === id; });
  if (!p) return;
  api("POST", "/admin/payment-proofs/reject", { id: id, reason: reason || "" }).then(function () {
    showToast("Payment rejected.", "success");
    closeProofDetail();
    loadProofs();
  }).catch(function (e) {
    showToast("Reject failed: " + (e && e.message ? e.message : "unknown error"), "error");
  });
}

// Quick actions directly from list (without opening detail modal)
function quickApproveProof(id) {
  var p = (allProofs || []).find(function (x) { return x.id === id; });
  if (!p) return;
  if (!confirm("Approve payment from " + (hasVal(p.user_name) ? p.user_name : "this customer") + "?")) return;
  api("POST", "/admin/payment-proofs/approve", { id: id }).then(function () {
    showToast("Payment approved!", "success");
    loadProofs();
  }).catch(function (e) {
    showToast("Approve failed: " + (e && e.message ? e.message : "error"), "error");
  });
}

function quickRejectProof(id) {
  var p = (allProofs || []).find(function (x) { return x.id === id; });
  if (!p) return;
  var reason = prompt("Reason for rejecting (optional):", "");
  if (reason === null) return;
  api("POST", "/admin/payment-proofs/reject", { id: id, reason: reason || "" }).then(function () {
    showToast("Payment rejected.", "success");
    loadProofs();
  }).catch(function (e) {
    showToast("Reject failed: " + (e && e.message ? e.message : "error"), "error");
  });
}

// Legacy alias (backward compat — modal now handled by openProofDetail)
function viewProof(url) {
  if (!hasVal(url)) return;
  openImageZoom(url);
}
function closeProofModal() { closeProofDetail(); }

// ── Expose globals ──────────────────────────────────────────────
window.approveProof      = approveProof;
window.rejectProof       = rejectProof;
window.quickApproveProof = quickApproveProof;
window.quickRejectProof  = quickRejectProof;
window.loadProofs        = loadProofs;
window.renderProofs      = renderProofs;
window.openProofDetail   = openProofDetail;
window.closeProofDetail  = closeProofDetail;
window.viewProof         = viewProof;
window.closeProofModal   = closeProofModal;
window.openImageZoom     = openImageZoom;
window.closeImageZoom    = closeImageZoom;
