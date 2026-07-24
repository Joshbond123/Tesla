// ╔══════════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Payment Proofs (Premium Redesign)
// ║  Card layout · Full customer profile · Search/Filter/Sort
// ╚══════════════════════════════════════════════════════════════╝

// ---- LOAD ----
function loadProofs() {
  var container = document.getElementById("proofsContainer");
  var empty = document.getElementById("proofsEmpty");
  if (!container) return;

  container.innerHTML =
    '<div style="text-align:center;padding:48px 24px;color:var(--admin-text-muted);">' +
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px;opacity:.5;display:block;margin-left:auto;margin-right:auto;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
    '<div style="font-size:14px;">Loading payment proofs...</div></div>';

  if (empty) empty.style.display = "none";

  if (API_BASE) {
    api("GET", "/admin/payment-proofs").then(function (r) {
      allProofs = (r.proofs || []).map(function (p) {
        return {
          id:              p.id || "p_" + Date.now(),
          user_id:         p.user_id || null,
          user_name:       p.user_name || p.customer_name || p.full_name || "-",
          user_email:      p.user_email || p.customer_email || p.email || "-",
          user_phone:      p.user_phone || p.customer_phone || p.phone || "-",
          order_id:        p.order_id || "-",
          payment_method:  p.payment_method || "-",
          car_model:       p.car_model || "-",
          delivery_method: p.delivery_method || "-",
          proof_url:       p.proof_url || p.proofUrl || "",
          proof_back_url:  p.proof_back_url || "",
          amount:          p.amount || "-",
          status:          p.status || "pending",
          created_at:      p.created_at || new Date().toISOString()
        };
      });
      renderProofs();
      if (typeof updateProofsBadge === "function") updateProofsBadge();
    }).catch(function () {
      allProofs = [];
      renderProofs();
      showToast("Could not load payment proofs from database", "warning");
    });
  } else {
    allProofs = [];
    renderProofs();
    showToast("API unavailable — proofs cannot be loaded", "warning");
  }
}

// ---- RENDER ----
function renderProofs() {
  var container = document.getElementById("proofsContainer");
  var empty = document.getElementById("proofsEmpty");
  if (!container) return;

  var query  = ((document.getElementById("proofSearch")  || {}).value || "").toLowerCase();
  var filter = (document.getElementById("proofFilter") || {}).value || "all";
  var sort   = (document.getElementById("proofSort")   || {}).value || "newest";

  var filtered = (allProofs || []).filter(function (p) {
    if (filter !== "all" && p.status !== filter) return false;
    if (query) {
      var haystack = [p.user_name, p.user_email, p.user_phone, p.order_id,
                      p.payment_method, p.car_model, p.delivery_method, p.amount]
                     .join(" ").toLowerCase();
      return haystack.indexOf(query) !== -1;
    }
    return true;
  });

  filtered.sort(function (a, b) {
    if (sort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
    if (sort === "pending_first") {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return  1;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";
  container.innerHTML = filtered.map(renderProofCard).join("");
}

// ---- CARD RENDER ----
function renderProofCard(p) {
  var isPending  = p.status === "pending";
  var isApproved = p.status === "approved";

  var badgeStyle = isPending
    ? "background:rgba(245,158,11,.12);color:#92400E;border:1px solid rgba(245,158,11,.25);"
    : isApproved
    ? "background:rgba(0,165,80,.12);color:#065F46;border:1px solid rgba(0,165,80,.25);"
    : "background:rgba(239,68,68,.12);color:#991B1B;border:1px solid rgba(239,68,68,.25);";
  var statusLabel = isPending ? "⏳ Pending" : isApproved ? "✓ Approved" : "✗ Rejected";

  var initials = (p.user_name && p.user_name !== "-")
    ? p.user_name.split(" ").slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase()
    : "?";

  var dateStr = p.created_at
    ? new Date(p.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";

  var proofThumb = p.proof_url
    ? '<img src="' + esc(p.proof_url) + '" alt="Proof" ' +
      'onclick="window.viewProof(\'' + esc(p.proof_url) + '\')" ' +
      'style="width:84px;height:84px;object-fit:cover;border-radius:8px;cursor:pointer;' +
      'border:1px solid var(--admin-border);transition:transform .15s;display:block;" ' +
      'onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'\';" ' +
      'onerror="this.outerHTML=\'<div style=&quot;width:84px;height:84px;background:var(--admin-bg);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--admin-text-muted);font-size:10px;text-align:center;border:1px solid var(--admin-border);&quot;>No<br>Image</div>\'">'
    : '<div style="width:84px;height:84px;background:var(--admin-bg);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--admin-text-muted);font-size:10px;text-align:center;border:1px dashed var(--admin-border);">No<br>Proof</div>';

  var actions = isPending
    ? '<button onclick="window.approveProof(\'' + esc(p.id) + '\')" ' +
      'style="background:rgba(0,165,80,.1);color:var(--success);border:1px solid rgba(0,165,80,.2);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;" ' +
      'onmouseover="this.style.background=\'rgba(0,165,80,.2)\'" onmouseout="this.style.background=\'rgba(0,165,80,.1)\'">' +
      '✓ Approve</button>' +
      '<button onclick="window.rejectProof(\'' + esc(p.id) + '\')" ' +
      'style="background:rgba(239,68,68,.08);color:var(--danger);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;" ' +
      'onmouseover="this.style.background=\'rgba(239,68,68,.18)\'" onmouseout="this.style.background=\'rgba(239,68,68,.08)\'">' +
      '✗ Reject</button>'
    : '<span style="font-size:12px;color:var(--admin-text-muted);">' + (isApproved ? "Payment Approved" : "Payment Rejected") + '</span>';

  var viewBtn = p.proof_url
    ? '<button onclick="window.viewProof(\'' + esc(p.proof_url) + '\')" ' +
      'style="background:rgba(59,130,246,.08);color:var(--info);border:1px solid rgba(59,130,246,.18);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:8px;width:84px;transition:all .15s;" ' +
      'onmouseover="this.style.background=\'rgba(59,130,246,.18)\'" onmouseout="this.style.background=\'rgba(59,130,246,.08)\'">' +
      'View Full</button>'
    : "";

  return '<div style="background:white;border:1px solid var(--admin-border);border-radius:14px;padding:20px 24px;margin-bottom:14px;' +
    'display:flex;gap:20px;align-items:flex-start;transition:box-shadow .2s;box-shadow:var(--admin-shadow);" ' +
    'onmouseover="this.style.boxShadow=\'var(--admin-shadow-md)\'" onmouseout="this.style.boxShadow=\'var(--admin-shadow)\'">' +

    // Avatar
    '<div style="flex-shrink:0;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#E31937,#c41030);' +
    'display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:white;letter-spacing:-.5px;box-shadow:0 4px 12px rgba(227,25,55,.25);">' +
    esc(initials) + '</div>' +

    // Main body
    '<div style="flex:1;min-width:0;">' +

      // Header row: name + status badge
      '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">' +
        '<div>' +
          '<div style="font-size:16px;font-weight:700;color:var(--admin-text);line-height:1.2;">' + esc(p.user_name) + '</div>' +
          '<div style="font-size:12px;color:var(--admin-text-muted);margin-top:2px;">' +
            (p.user_email !== "-" ? esc(p.user_email) : "") +
            (p.user_email !== "-" && p.user_phone !== "-" ? ' &nbsp;·&nbsp; ' : '') +
            (p.user_phone !== "-" ? esc(p.user_phone) : "") +
          '</div>' +
        '</div>' +
        '<span style="margin-left:auto;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;' + badgeStyle + '">' + statusLabel + '</span>' +
      '</div>' +

      // Details grid
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px 18px;margin-bottom:14px;">' +
        detailCell("Order ID",       p.order_id,       true) +
        detailCell("Tesla Model",    p.car_model,       false) +
        detailCell("Payment Method", p.payment_method,  false) +
        detailCell("Delivery",       p.delivery_method, false) +
        detailCell("Amount",         p.amount !== "-" ? "$" + p.amount : "-", false) +
        detailCell("Submitted",      dateStr,           false) +
      '</div>' +

      // Actions row
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
        actions +
      '</div>' +
    '</div>' +

    // Right column: proof thumbnail + view button
    '<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:8px;">' +
      viewBtn +
      proofThumb +
    '</div>' +

  '</div>';
}

function detailCell(label, value, mono) {
  return '<div>' +
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--admin-text-muted);font-weight:700;margin-bottom:3px;">' + label + '</div>' +
    '<div style="font-size:13px;font-weight:600;color:var(--admin-text);' + (mono ? 'font-family:monospace;font-size:12px;' : '') + '">' + esc(value || '-') + '</div>' +
  '</div>';
}

// ---- APPROVE / REJECT ----
function approveProof(id) {
  var p = (allProofs || []).find(function (x) { return x.id === id; });
  if (!p) return;
  if (!confirm("Approve this payment proof? The customer will be notified.")) return;
  if (API_BASE) {
    if (typeof showLoading === "function") showLoading("Approving payment...");
    api("POST", "/admin/payment-proofs/approve", { id: id }).then(function () {
      p.status = "approved";
      renderProofs();
      if (typeof updateProofsBadge === "function") updateProofsBadge();
      if (typeof hideLoading === "function") hideLoading();
      showToast("Payment proof approved — customer notified");
    }).catch(function (e) {
      if (typeof hideLoading === "function") hideLoading();
      showToast("Failed to approve: " + e.message, "error");
    });
  } else {
    p.status = "approved";
    renderProofs();
    showToast("Approved locally (API unavailable)", "warning");
  }
}

function rejectProof(id) {
  var p = (allProofs || []).find(function (x) { return x.id === id; });
  if (!p) return;
  var reason = prompt("Enter rejection reason (optional):");
  if (reason === null) return;
  if (API_BASE) {
    if (typeof showLoading === "function") showLoading("Rejecting payment...");
    api("POST", "/admin/payment-proofs/reject", { id: id, reason: reason || "" }).then(function () {
      p.status = "rejected";
      renderProofs();
      if (typeof updateProofsBadge === "function") updateProofsBadge();
      if (typeof hideLoading === "function") hideLoading();
      showToast("Payment proof rejected");
    }).catch(function (e) {
      if (typeof hideLoading === "function") hideLoading();
      showToast("Failed to reject: " + e.message, "error");
    });
  } else {
    p.status = "rejected";
    renderProofs();
    showToast("Rejected locally (API unavailable)", "warning");
  }
}

// ---- FULL PROOF MODAL ----
function viewProof(url) {
  var modal = document.getElementById("proofModal");
  var img   = document.getElementById("proofModalImg");
  if (!modal || !img || !url) return;
  img.src = url;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeProofModal() {
  var modal = document.getElementById("proofModal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

// Close modal on Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeProofModal();
});

// Expose to window
window.approveProof   = window.approveProof   || approveProof;
window.rejectProof    = window.rejectProof    || rejectProof;
window.loadProofs     = window.loadProofs     || loadProofs;
window.renderProofs   = window.renderProofs   || renderProofs;
window.viewProof      = window.viewProof      || viewProof;
window.closeProofModal = window.closeProofModal || closeProofModal;
