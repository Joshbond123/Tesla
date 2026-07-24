// ════════════════════════════════════════════════════════════════
//  Tesla Award — Admin Panel · Payment Proofs (Redesigned)
//  Clean card layout · full customer profile · search/filter/sort
//  Empty fields are hidden (no more "_" placeholders)
// ════════════════════════════════════════════════════════════════

var allProofs = [];

// ── Helpers ─────────────────────────────────────────────────────
function hasVal(v) {
  return v != null && v !== "" && v !== "-" && v !== "—";
}
function display(v) {
  return hasVal(v) ? esc(v) : "";
}
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
function initials(name) {
  if (!hasVal(name)) return "?";
  return String(name).split(" ").slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
}
function statusBadge(status) {
  var map = {
    pending:  { label: "Pending",  bg: "#fef3c7", fg: "#92400e" },
    approved: { label: "Approved", bg: "#dcfce7", fg: "#166534" },
    rejected: { label: "Rejected", bg: "#fee2e2", fg: "#991b1b" }
  };
  var s = map[String(status || "").toLowerCase()] || { label: status || "—", bg: "#f1f5f9", fg: "#475569" };
  return '<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:' + s.bg + ';color:' + s.fg + ';">' + esc(s.label) + '</span>';
}

// ── Data ─────────────────────────────────────────────────────────
function loadProofs() {
  var container = document.getElementById("proofsContainer");
  if (container) container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Loading proofs…</div>';
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
        payment_method: p.payment_method || "",
        amount: p.amount || "",
        status: p.status || "pending",
        proof_url: p.proof_url || "",
        proof_back_url: p.proof_back_url || "",
        proof_type: p.proof_type || "",
        created_at: p.created_at || ""
      };
    });
    var badge = document.getElementById("proofsNavBadge");
    var pending = allProofs.filter(function (p) { return p.status === "pending"; }).length;
    if (badge) { badge.style.display = pending ? "inline-flex" : "none"; badge.textContent = String(pending); }
    setApiStatus(true);
    renderProofs();
  }).catch(function () {
    if (container) container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Unable to load proofs.</div>';
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

  filtered.sort(function (a, b) {
    if (sort === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  if (sort === "pending_first") {
    filtered.sort(function (a, b) {
      return (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1);
    });
  }

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
  var name = hasVal(p.user_name) ? esc(p.user_name) : "Unknown customer";
  var detailRows = [
    detailCell("Order ID", p.order_id, true),
    detailCell("Tesla Model", p.car_model),
    detailCell("Delivery", p.delivery_method),
    detailCell("Payment Method", p.payment_method),
    detailCell("Amount", fmtAmount(p.amount)),
    detailCell("Email", p.user_email),
    detailCell("Phone", p.user_phone),
    detailCell("Submitted", fmtDate(p.created_at))
  ].filter(Boolean).join("");

  var thumb = hasVal(p.proof_url)
    ? '<img src="' + esc(p.proof_url) + '" alt="Proof" ' +
      'style="width:96px;height:96px;object-fit:cover;border-radius:10px;cursor:pointer;border:1px solid #e2e8f0;" ' +
      'onclick="window.viewProof(\'' + esc(p.proof_url) + '\')">'
    : '<div style="width:96px;height:96px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">No image</div>';

  var actions = "";
  if (p.status === "pending") {
    actions =
      '<button class="btn btn-sm" style="background:#16a34a;color:#fff;" onclick="window.approveProof(\'' + esc(p.id) + '\')">Approve</button>' +
      '<button class="btn btn-ghost btn-sm" style="border:1px solid #e2e8f0;" onclick="window.rejectProof(\'' + esc(p.id) + '\')">Reject</button>';
  } else if (hasVal(p.proof_url)) {
    actions = '<button class="btn btn-ghost btn-sm" onclick="window.viewProof(\'' + esc(p.proof_url) + '\')">View proof</button>';
  }

  return '' +
  '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(0,0,0,.04);">' +
    '<div style="display:flex;gap:14px;align-items:flex-start;">' +
      thumb +
      '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:4px;">' +
          '<div style="display:flex;align-items:center;gap:10px;min-width:0;">' +
            '<div style="width:38px;height:38px;border-radius:50%;background:#eef2ff;color:#4f46e5;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">' + initials(p.user_name) + '</div>' +
            '<div style="min-width:0;">' +
              '<div style="font-weight:600;font-size:15px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + name + '</div>' +
              '<div style="font-size:12px;color:#64748b;">Proof #' + esc(p.id) + '</div>' +
            '</div>' +
          '</div>' +
          statusBadge(p.status) +
        '</div>' +
        (detailRows ? '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px;margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9;">' + detailRows + '</div>' : '') +
        (actions ? '<div style="display:flex;gap:8px;margin-top:14px;">' + actions + '</div>' : '') +
      '</div>' +
    '</div>' +
  '</div>';
}

// ── Detail row (hidden when empty — fixes the "_" placeholder bug) ──
function detailCell(label, value, mono) {
  if (!hasVal(value)) return "";
  return '' +
    '<div style="min-width:0;">' +
      '<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">' + esc(label) + '</div>' +
      '<div style="font-size:13px;font-weight:500;color:#334155;' + (mono ? 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;' : '') + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + display(value) + '</div>' +
    '</div>';
}

// ── Actions ──────────────────────────────────────────────────────
function approveProof(id) {
  var p = (allProofs || []).find(function (x) { return x.id === id; });
  if (!p) return;
  if (!confirm("Approve this proof from " + (hasVal(p.user_name) ? p.user_name : "this customer") + "?")) return;
  api("POST", "/admin/payment-proofs/approve", { id: id }).then(function () {
    showToast("Proof approved", "success");
    loadProofs();
  }).catch(function (e) {
    showToast("Approve failed: " + (e && e.message ? e.message : "error"), "error");
  });
}
function rejectProof(id) {
  var p = (allProofs || []).find(function (x) { return x.id === id; });
  if (!p) return;
  var reason = prompt("Reason for rejecting this proof?", "");
  if (reason === null) return;
  api("POST", "/admin/payment-proofs/reject", { id: id, reason: reason || "" }).then(function () {
    showToast("Proof rejected", "success");
    loadProofs();
  }).catch(function (e) {
    showToast("Reject failed: " + (e && e.message ? e.message : "error"), "error");
  });
}

// ── Proof image modal ────────────────────────────────────────────
function viewProof(url) {
  if (!hasVal(url)) return;
  var modal = document.getElementById("proofModal");
  var img = document.getElementById("proofModalImg");
  if (modal) modal.style.display = "flex";
  if (img) img.src = url;
}
function closeProofModal() {
  var modal = document.getElementById("proofModal");
  var img = document.getElementById("proofModalImg");
  if (modal) modal.style.display = "none";
  if (img) img.src = "";
}

// ── Expose globals ──────────────────────────────────────────────
window.approveProof    = window.approveProof    || approveProof;
window.rejectProof     = window.rejectProof     || rejectProof;
window.loadProofs      = window.loadProofs      || loadProofs;
window.renderProofs    = window.renderProofs    || renderProofs;
window.viewProof       = window.viewProof       || viewProof;
window.closeProofModal = window.closeProofModal || closeProofModal;
