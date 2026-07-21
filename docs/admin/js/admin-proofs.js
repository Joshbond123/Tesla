// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Payment Proofs
// ╚══════════════════════════════════════════════════════════╝

// ---- PAYMENT PROOFS ----
function loadProofs() {
  var tbody = document.getElementById("proofsTable"); var empty = document.getElementById("proofsEmpty");
  if (!tbody) return;
  tbody.innerHTML = "<tr><td colspan=\"8\" style=\"text-align:center;padding:32px;color:var(--admin-text-muted);\">Loading...</td></tr>";
  if (empty) empty.style.display = "none";
  var saved = localStorage.getItem("tesla_payment_proofs");
  if (saved) { try { allProofs = JSON.parse(saved); } catch(e) { allProofs = []; } renderProofs(); } else { allProofs = []; renderProofs(); }
  if (API_BASE) { api("GET", "/admin/payment-proofs").then(function(r) { if (r.proofs && r.proofs.length > 0) { allProofs = r.proofs; localStorage.setItem("tesla_payment_proofs", JSON.stringify(allProofs)); } renderProofs(); }).catch(function() {}); }
}

function renderProofs() {
  var tbody = document.getElementById("proofsTable"); var empty = document.getElementById("proofsEmpty");
  if (!tbody) return;
  var query = (document.getElementById("proofSearch").value || "").toLowerCase();
  var filter = document.getElementById("proofFilter").value;
  var filtered = allProofs.filter(function(p) {
    if (filter !== "all" && p.status !== filter) return false;
    if (query) { var h = [p.user_id, p.order_id, p.payment_method, p.amount].join(" ").toLowerCase(); return h.indexOf(query) !== -1; }
    return true;
  });
  if (filtered.length === 0) { tbody.innerHTML = ""; if (empty) empty.style.display = "block"; }
  else {
    if (empty) empty.style.display = "none";
    tbody.innerHTML = filtered.map(function(p) {
      var ip = p.status === "pending", ia = p.status === "approved";
      var sb = ip ? "badge-warning" : ia ? "badge-success" : "badge-danger";
      var st = ip ? "Pending" : ia ? "Approved" : "Rejected";
      var pu = p.proof_url || "";
      return "<tr><td style=\"font-size:12px;\">" + esc(p.user_id || "\u2014").substring(0, 8) + "...</td><td style=\"font-family:monospace;font-size:12px;\">" + esc(p.order_id || "\u2014") + "</td><td>" + esc(p.payment_method || "\u2014") + "</td><td>" + esc(p.amount || "\u2014") + "</td><td>" + (pu ? "<a href=\"" + esc(pu) + "\" target=\"_blank\" style=\"color:var(--info);font-weight:600;\">View Proof</a>" : "\u2014") + "</td><td><span class=\"badge " + sb + "\">" + st + "</span></td><td>" + esc(p.created_at ? new Date(p.created_at).toLocaleDateString() : "\u2014") + "</td><td>" + (ip ? "<button class=\"btn btn-sm\" onclick=\"window.approveProof(\'" + p.id + "\')\" style=\"background:rgba(0,165,80,0.08);color:var(--success);margin-right:4px;\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\"><polyline points=\"20,6 9,17 4,12\"/></svg></button><button class=\"btn btn-sm\" onclick=\"window.rejectProof(\'" + p.id + "\')\" style=\"background:rgba(239,68,68,0.08);color:var(--danger);\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg></button>" : "<span style=\"font-size:11px;color:var(--admin-text-muted);\">\u2014</span>") + "</td></tr>";
    }).join("");
  }
}

function approveProof(id) { var p = allProofs.find(function(x) { return x.id === id; }); if (!p) return; p.status = "approved"; p.reviewed_at = new Date().toISOString(); localStorage.setItem("tesla_payment_proofs", JSON.stringify(allProofs)); renderProofs(); showToast("Payment proof approved"); if (API_BASE) { api("POST", "/admin/payment-proofs/approve", { id: id }).catch(function() {}); } }
function rejectProof(id) { var p = allProofs.find(function(x) { return x.id === id; }); if (!p) return; p.status = "rejected"; p.reviewed_at = new Date().toISOString(); localStorage.setItem("tesla_payment_proofs", JSON.stringify(allProofs)); renderProofs(); showToast("Payment proof rejected"); if (API_BASE) { api("POST", "/admin/payment-proofs/reject", { id: id }).catch(function() {}); } }
