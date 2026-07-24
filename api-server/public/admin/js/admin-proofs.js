// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award - Admin Panel: Payment Proofs (Redesigned)
// ║  DB-first . Premium UI . Search . Filter . Approve/Reject
// ╚══════════════════════════════════════════════════════════╝

function loadProofs() {
  var tbody = document.getElementById("proofsTable");
  var empty = document.getElementById("proofsEmpty");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--admin-text-muted);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:8px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><br>Loading proofs...</td></tr>';
  if (empty) empty.style.display = "none";
  if (API_BASE) {
    api("GET", "/admin/payment-proofs").then(function(r) {
      allProofs = (r.proofs || []).map(function(p) {
        return {
          id: p.id || p._id || "p_" + Date.now(),
          user_id: p.user_id || p.userId || "-",
          user_name: p.user_name || p.userName || p.full_name || "-",
          order_id: p.order_id || p.orderId || "-",
          payment_method: p.payment_method || p.paymentMethod || "-",
          car_model: p.car_model || p.carModel || "-",
          proof_url: p.proof_url || p.proofUrl || p.proof || "",
          proof_type: p.proof_type || p.proofType || "file",
          amount: p.amount || "-",
          status: p.status || "pending",
          created_at: p.created_at || p.createdAt || p.submitted_at || new Date().toISOString()
        };
      });
      renderProofs();
    }).catch(function() {
      allProofs = [];
      renderProofs();
      showToast("Could not load payment proofs from database", "warning");
    });
  } else {
    allProofs = [];
    renderProofs();
    showToast("API unavailable - proofs cannot be loaded", "warning");
  }
}

function renderProofs() {
  var tbody = document.getElementById("proofsTable");
  var empty = document.getElementById("proofsEmpty");
  if (!tbody) return;
  var query = (document.getElementById("proofSearch") ? document.getElementById("proofSearch").value : "").toLowerCase();
  var filter = document.getElementById("proofFilter") ? document.getElementById("proofFilter").value : "all";
  var filtered = allProofs.filter(function(p) {
    if (filter !== "all" && p.status !== filter) return false;
    if (query) {
      var h = [p.user_id, p.user_name, p.order_id, p.payment_method, p.car_model, p.amount].join(" ").toLowerCase();
      return h.indexOf(query) !== -1;
    }
    return true;
  });
  if (filtered.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.style.display = "block";
  } else {
    if (empty) empty.style.display = "none";
    tbody.innerHTML = filtered.map(function(p) {
      var isPending = p.status === "pending";
      var isApproved = p.status === "approved";
      var badgeClass = isPending ? "badge-warning" : isApproved ? "badge-success" : "badge-danger";
      var statusLabel = isPending ? "Pending" : isApproved ? "Approved" : "Rejected";
      var proofUrl = p.proof_url || "";
      var submitDate = p.created_at ? new Date(p.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
      var userName = p.user_name && p.user_name !== "-" ? p.user_name : (p.user_id ? p.user_id.substring(0, 8) + "..." : "-");
      var orderDisplay = p.order_id || "-";
      if (orderDisplay.length > 12) orderDisplay = orderDisplay.substring(0, 12) + "...";
      return '<tr>' +
        '<td style="font-size:13px;font-weight:600;">' + esc(userName) + '</td>' +
        '<td style="font-family:monospace;font-size:12px;color:var(--admin-text-secondary);">' + esc(orderDisplay) + '</td>' +
        '<td>' + esc(p.car_model || "-") + '</td>' +
        '<td>' + esc(p.payment_method || "-") + '</td>' +
        '<td>' + esc(p.amount || "-") + '</td>' +
        '<td>' + (proofUrl ? '<a href="' + esc(proofUrl) + '" target="_blank" class="btn btn-sm" style="background:rgba(59,130,246,.08);color:var(--info);border:none;padding:4px 12px;">View</a>' : '-') + '</td>' +
        '<td style="font-size:12px;">' + submitDate + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + statusLabel + '</span></td>' +
        '<td style="white-space:nowrap;">' +
          (isPending
            ? '<button class="btn btn-sm" onclick="window.approveProof(\'' + p.id + '\')" style="background:rgba(0,165,80,.1);color:var(--success);border:none;padding:5px 10px;margin-right:4px;" title="Approve"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg></button>' +
              '<button class="btn btn-sm" onclick="window.rejectProof(\'' + p.id + '\')" style="background:rgba(239,68,68,.1);color:var(--danger);border:none;padding:5px 10px;" title="Reject"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
            : '<span style="font-size:11px;color:var(--admin-text-muted);">-</span>') +
        '</td></tr>';
    }).join("");
  }
}

function approveProof(id) {
  var p = allProofs.find(function(x) { return x.id === id; });
  if (!p) return;
  if (API_BASE) {
    if (typeof showLoading === "function") showLoading("Approving payment proof...");
    api("POST", "/admin/payment-proofs/approve", { id: id }).then(function() {
      p.status = "approved";
      renderProofs();
      if (typeof hideLoading === "function") hideLoading();
      showToast("Payment proof approved - customer notified");
    }).catch(function(e) {
      if (typeof hideLoading === "function") hideLoading();
      showToast("Failed to approve: " + e.message, "error");
    });
  } else {
    p.status = "approved";
    renderProofs();
    showToast("Approved locally only (API unavailable)", "warning");
  }
}

function rejectProof(id) {
  var p = allProofs.find(function(x) { return x.id === id; });
  if (!p) return;
  var reason = prompt("Enter rejection reason (optional):");
  if (reason === null) return;
  if (API_BASE) {
    if (typeof showLoading === "function") showLoading("Rejecting payment proof...");
    api("POST", "/admin/payment-proofs/reject", { id: id, reason: reason || "" }).then(function() {
      p.status = "rejected";
      renderProofs();
      if (typeof hideLoading === "function") hideLoading();
      showToast("Payment proof rejected");
    }).catch(function(e) {
      if (typeof hideLoading === "function") hideLoading();
      showToast("Failed to reject: " + e.message, "error");
    });
  } else {
    p.status = "rejected";
    renderProofs();
    showToast("Rejected locally only (API unavailable)", "warning");
  }
}

// Expose to window for onclick handlers
window.approveProof = window.approveProof || approveProof;
window.rejectProof = window.rejectProof || rejectProof;
window.loadProofs = window.loadProofs || loadProofs;
window.renderProofs = window.renderProofs || renderProofs;