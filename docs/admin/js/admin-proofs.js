// ════════════════════════════════════════════════════════════════
//  Tesla Admin · Payment Proofs — Full Redesign v4
//  Responsive cards · All customer fields · Multi-image gallery
//  Base64 + Storage URL images · Mobile-first layout
// ════════════════════════════════════════════════════════════════

var allProofs = [];

// ── Utilities ────────────────────────────────────────────────────
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function hasVal(v) {
  var s = String(v == null ? "" : v).trim();
  return s !== "" && s !== "-" && s !== "—" && s !== "null" && s !== "undefined";
}
function fmtDate(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtTime(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
         " at " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function initials(name) {
  if (!hasVal(name)) return "?";
  return String(name).split(/\s+/).slice(0, 2).map(function(w) { return w.charAt(0).toUpperCase(); }).join("");
}
function normaliseStatus(raw) {
  var s = String(raw || "").toLowerCase().trim();
  if (s === "approved" || s === "approve") return "approved";
  if (s === "rejected" || s === "reject" || s === "declined") return "rejected";
  return "pending";
}
function statusBadge(rawStatus, large) {
  var status = normaliseStatus(rawStatus);
  var cfg = {
    pending:  { label: "Pending",  bg: "#fff7ed", fg: "#9a3412", dot: "#f97316", border: "#fed7aa" },
    approved: { label: "Approved", bg: "#f0fdf4", fg: "#166534", dot: "#22c55e", border: "#bbf7d0" },
    rejected: { label: "Rejected", bg: "#fef2f2", fg: "#991b1b", dot: "#ef4444", border: "#fecaca" }
  };
  var c = cfg[status];
  var pad = large ? "6px 14px" : "4px 10px";
  var fs  = large ? "13px" : "11px";
  return '<span style="display:inline-flex;align-items:center;gap:5px;padding:' + pad +
    ';border-radius:999px;font-size:' + fs + ';font-weight:700;background:' + c.bg +
    ';color:' + c.fg + ';border:1px solid ' + c.border + ';white-space:nowrap;">' +
    '<span style="width:6px;height:6px;border-radius:50%;background:' + c.dot + ';flex-shrink:0;"></span>' +
    c.label + '</span>';
}

// ── Proof image URLs ─────────────────────────────────────────────
function getProofImages(p) {
  var imgs = [];
  if (hasVal(p.proof_url))      imgs.push({ url: p.proof_url,      label: "Front" });
  if (hasVal(p.proof_back_url)) imgs.push({ url: p.proof_back_url, label: "Back"  });
  if (imgs.length === 1) imgs[0].label = "Proof Image";
  return imgs;
}

// ── Load data ────────────────────────────────────────────────────
function loadProofs() {
  var container = document.getElementById("proofsContainer");
  if (container) {
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:60px 20px;color:#94a3b8;">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite;flex-shrink:0"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.59"/></svg>' +
      '<span style="font-size:14px;font-weight:500;">Loading payment proofs…</span></div>';
  }
  api("GET", "/admin/payment-proofs").then(function(r) {
    allProofs = (r.proofs || []).map(function(p) {
      return {
        id:             p.id             || "",
        order_id:       p.order_id       || "",
        user_name:      p.user_name      || p.customer_name  || "",
        user_email:     p.user_email     || p.customer_email || "",
        user_phone:     p.user_phone     || p.customer_phone || "",
        car_model:      p.car_model      || "",
        delivery_method:p.delivery_method|| "",
        payment_method: p.payment_method || "",
        amount:         p.amount         || "",
        status:         normaliseStatus(p.status),
        admin_notes:    p.admin_notes    || "",
        proof_url:      p.proof_url      || "",
        proof_back_url: p.proof_back_url || "",
        proof_type:     p.proof_type     || "",
        reviewed_at:    p.reviewed_at    || "",
        reviewed_by:    p.reviewed_by    || "",
        created_at:     p.created_at     || ""
      };
    });
    var pending = allProofs.filter(function(p) { return p.status === "pending"; }).length;
    var badge = document.getElementById("proofsNavBadge");
    if (badge) { badge.style.display = pending ? "inline-flex" : "none"; badge.textContent = String(pending); }
    if (typeof setApiStatus === "function") setApiStatus(true);
    renderProofs();
  }).catch(function(err) {
    if (container) {
      container.innerHTML =
        '<div style="text-align:center;padding:60px 20px;">' +
        '<div style="font-size:40px;margin-bottom:12px;">⚠️</div>' +
        '<div style="font-size:15px;font-weight:600;color:#dc2626;margin-bottom:6px;">Unable to load proofs</div>' +
        '<div style="font-size:13px;color:#94a3b8;">Check the API connection and try again</div>' +
        '<button onclick="loadProofs()" style="margin-top:16px;padding:8px 20px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Retry</button>' +
        '</div>';
    }
    if (typeof setApiStatus === "function") setApiStatus(false);
  });
}

// ── Render list ──────────────────────────────────────────────────
function renderProofs() {
  var container  = document.getElementById("proofsContainer");
  var empty      = document.getElementById("proofsEmpty");
  var countLabel = document.getElementById("proofsCountLabel");
  if (!container) return;

  var q      = ((document.getElementById("proofSearch") || {}).value || "").trim().toLowerCase();
  var filter = (document.getElementById("proofFilter") || {}).value || "all";
  var sort   = (document.getElementById("proofSort")   || {}).value || "newest";

  var list = allProofs.filter(function(p) {
    if (filter !== "all" && p.status !== filter) return false;
    if (!q) return true;
    return [p.user_name, p.user_email, p.order_id, p.payment_method, p.car_model]
      .some(function(f) { return String(f || "").toLowerCase().indexOf(q) !== -1; });
  });

  if (sort === "oldest")       list.sort(function(a,b){ return new Date(a.created_at||0) - new Date(b.created_at||0); });
  else if (sort === "pending_first") list.sort(function(a,b){ return (a.status==="pending"?0:1)-(b.status==="pending"?0:1); });
  else                         list.sort(function(a,b){ return new Date(b.created_at||0) - new Date(a.created_at||0); });

  if (countLabel) countLabel.textContent = list.length + (list.length === 1 ? " proof" : " proofs");

  if (!list.length) {
    container.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";
  container.innerHTML = '<div style="padding:16px 20px 8px;">' + list.map(renderProofCard).join("") + '</div>';
}

// ── Card ─────────────────────────────────────────────────────────
function renderProofCard(p) {
  var status      = normaliseStatus(p.status);
  var isPending   = status === "pending";
  var imgs        = getProofImages(p);
  var hasImg      = imgs.length > 0;
  var borderLeft  = status === "approved" ? "#22c55e" : status === "rejected" ? "#ef4444" : "#f97316";
  var customerLabel = hasVal(p.user_name) ? esc(p.user_name) : '<span style="color:#94a3b8;font-style:italic;">Customer details loading…</span>';

  // Thumbnail — works for both base64 data URLs and https:// storage URLs
  var thumbHtml = hasImg
    ? '<img src="' + esc(imgs[0].url) + '" alt="Proof" ' +
        'style="width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in;" ' +
        'onclick="event.stopPropagation();window.openImageZoom(\'' + encodeURIComponent(imgs[0].url).replace(/'/g,"\\'",'g') + '\',0,[' + imgs.map(function(im){ return "'" + encodeURIComponent(im.url) + "'"; }).join(",") + '])" ' +
        'onerror="this.parentElement.innerHTML=\'<div style=&quot;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#cbd5e1;font-size:11px;gap:4px;&quot;><svg width=&quot;24&quot; height=&quot;24&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;1.5&quot;><rect x=&quot;3&quot; y=&quot;3&quot; width=&quot;18&quot; height=&quot;18&quot; rx=&quot;2&quot;/><circle cx=&quot;8.5&quot; cy=&quot;8.5&quot; r=&quot;1.5&quot;/><polyline points=&quot;21,15 16,10 5,21&quot;/></svg><span>Image</span></div>\'">'
    : '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#cbd5e1;font-size:11px;gap:4px;">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>' +
        '<span>No image</span>' +
      '</div>';

  // Image count badge
  var imgBadge = imgs.length > 1
    ? '<div style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.65);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;">' + imgs.length + ' imgs</div>'
    : "";

  // Info chips
  function chip(icon, val, mono) {
    if (!hasVal(val)) return "";
    return '<div style="display:flex;align-items:flex-start;gap:6px;min-width:0;">' +
      '<span style="font-size:13px;flex-shrink:0;line-height:1.4;">' + icon + '</span>' +
      '<span style="font-size:12px;color:#374151;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + (mono ? 'font-family:ui-monospace,monospace;font-size:11px;' : '') + '">' + esc(val) + '</span>' +
      '</div>';
  }

  return '<div style="background:#fff;border:1px solid #e5e7eb;border-left:3px solid ' + borderLeft + ';border-radius:12px;overflow:hidden;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.05);transition:box-shadow .2s,transform .15s;" ' +
    'onmouseenter="this.style.boxShadow=\'0 6px 20px rgba(0,0,0,.1)\';this.style.transform=\'translateY(-1px)\'" ' +
    'onmouseleave="this.style.boxShadow=\'0 1px 4px rgba(0,0,0,.05)\';this.style.transform=\'none\'">' +

    '<div style="display:flex;align-items:stretch;">' +

    // ── Thumbnail column ────────────────────────────────────────
    '<div style="width:90px;min-width:90px;background:#f8fafc;position:relative;overflow:hidden;border-right:1px solid #f1f5f9;">' +
      thumbHtml +
      imgBadge +
    '</div>' +

    // ── Content column ──────────────────────────────────────────
    '<div style="flex:1;padding:14px 16px;min-width:0;">' +

      // Row 1: Name + status
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">' +
        '<div style="min-width:0;">' +
          '<div style="font-weight:700;font-size:14px;color:#111827;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + customerLabel + '</div>' +
          (hasVal(p.user_email) ? '<div style="font-size:11.5px;color:#6b7280;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(p.user_email) + '</div>' : '') +
        '</div>' +
        statusBadge(p.status) +
      '</div>' +

      // Row 2: info chips grid
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px 16px;margin-bottom:12px;">' +
        chip("📱", p.user_phone) +
        chip("🚗", hasVal(p.car_model)  ? "Tesla " + p.car_model : "") +
        chip("📋", p.order_id, true) +
        chip("💳", p.payment_method) +
        chip("🚚", p.delivery_method) +
        chip("🕒", fmtDateTime(p.created_at)) +
      '</div>' +

      // Row 3: action buttons
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
        '<button onclick="window.openProofDetail(\'' + esc(p.id) + '\')" ' +
          'style="display:inline-flex;align-items:center;gap:5px;padding:7px 14px;background:#4f46e5;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;transition:background .15s;" ' +
          'onmouseenter="this.style.background=\'#4338ca\'" onmouseleave="this.style.background=\'#4f46e5\'">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View Details' +
        '</button>' +
        (isPending
          ? '<button onclick="window.quickApproveProof(\'' + esc(p.id) + '\')" ' +
              'style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;" ' +
              'onmouseenter="this.style.background=\'#dcfce7\'" onmouseleave="this.style.background=\'#f0fdf4\'">✓ Approve</button>'
          : '') +
        (isPending
          ? '<button onclick="window.quickRejectProof(\'' + esc(p.id) + '\')" ' +
              'style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;background:#fff;color:#991b1b;border:1px solid #fecaca;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;" ' +
              'onmouseenter="this.style.background=\'#fef2f2\'" onmouseleave="this.style.background=\'#fff\'">✕ Reject</button>'
          : '') +
        (!isPending && hasVal(p.reviewed_at)
          ? '<span style="font-size:11px;color:#9ca3af;">Reviewed ' + fmtDate(p.reviewed_at) + '</span>'
          : '') +
      '</div>' +

    '</div>' + // content col
    '</div>' + // flex row
    '</div>';  // card
}

// ── Detail Modal ─────────────────────────────────────────────────
function openProofDetail(id) {
  var p = (allProofs || []).find(function(x) { return x.id === id; });
  if (!p) return;
  var modal = document.getElementById("proofDetailModal");
  var body  = document.getElementById("proofDetailBody");
  if (!modal || !body) return;

  var imgs     = getProofImages(p);
  var status   = normaliseStatus(p.status);
  var imgCount = imgs.length;

  // ── Image gallery ──────────────────────────────────────────────
  var galleryHtml;
  if (imgCount === 0) {
    galleryHtml =
      '<div style="padding:32px;text-align:center;background:#f8fafc;border-radius:12px;border:1.5px dashed #e2e8f0;color:#94a3b8;font-size:13px;">' +
      '<div style="font-size:28px;margin-bottom:8px;">🖼️</div>No proof images uploaded</div>';
  } else {
    var cols = imgCount === 1 ? "1fr" : "1fr 1fr";
    galleryHtml = '<div style="display:grid;grid-template-columns:' + cols + ';gap:12px;">';
    imgs.forEach(function(img, i) {
      var encodedUrl = encodeURIComponent(img.url);
      var allEncoded = imgs.map(function(im) { return "'" + encodeURIComponent(im.url) + "'"; }).join(",");
      galleryHtml +=
        '<div>' +
          '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:6px;">' + esc(img.label) + '</div>' +
          '<div style="position:relative;background:#f8fafc;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">' +
            '<img src="' + esc(img.url) + '" alt="' + esc(img.label) + '" ' +
              'style="width:100%;max-height:220px;object-fit:contain;display:block;cursor:zoom-in;" ' +
              'onclick="window.openImageZoom(\'' + encodedUrl + '\',' + i + ',[' + allEncoded + '])" ' +
              'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
            '<div style="display:none;flex-direction:column;align-items:center;justify-content:center;min-height:120px;color:#94a3b8;font-size:12px;gap:6px;padding:20px;">' +
              '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>' +
              '<span>Image could not be loaded</span>' +
            '</div>' +
            '<button onclick="window.openImageZoom(\'' + encodedUrl + '\',' + i + ',[' + allEncoded + '])" ' +
              'style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.6);border:none;border-radius:6px;color:#fff;font-size:10px;font-weight:600;padding:4px 8px;cursor:pointer;">⤢ Expand</button>' +
          '</div>' +
        '</div>';
    });
    galleryHtml += '</div>';
  }

  // ── Info section helper ────────────────────────────────────────
  function infoSection(title, icon, rows) {
    var content = rows.map(function(r) {
      if (!hasVal(r[1])) return "";
      return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:7px 0;border-bottom:1px solid #f1f5f9;">' +
        '<span style="font-size:12px;color:#6b7280;white-space:nowrap;flex-shrink:0;">' + esc(r[0]) + '</span>' +
        '<span style="font-size:12px;font-weight:600;color:#111827;text-align:right;' + (r[2] ? 'font-family:ui-monospace,monospace;font-size:11px;' : '') + '">' + esc(r[1]) + '</span>' +
        '</div>';
    }).join("");
    if (!content) return "";
    return '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">' +
      '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;margin-bottom:10px;">' + icon + '&nbsp; ' + esc(title) + '</div>' +
      content +
      '</div>';
  }

  // ── Approve / Reject buttons ───────────────────────────────────
  var approveBtn = status !== "approved"
    ? '<button onclick="window.approveProof(\'' + esc(p.id) + '\')" ' +
        'style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 16px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .15s;" ' +
        'onmouseenter="this.style.opacity=\'.85\'" onmouseleave="this.style.opacity=\'1\'">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>Approve Payment</button>'
    : "";
  var rejectBtn = status !== "rejected"
    ? '<button onclick="window.rejectProof(\'' + esc(p.id) + '\')" ' +
        'style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 16px;background:#fff;color:#dc2626;border:2px solid #fecaca;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s;" ' +
        'onmouseenter="this.style.background=\'#fef2f2\'" onmouseleave="this.style.background=\'#fff\'">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Reject Payment</button>'
    : "";

  body.innerHTML =
    // ── Customer header ──────────────────────────────────────────
    '<div style="display:flex;align-items:center;gap:14px;padding-bottom:20px;margin-bottom:20px;border-bottom:1.5px solid #f1f5f9;">' +
      '<div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;flex-shrink:0;box-shadow:0 4px 12px rgba(99,102,241,.3);">' + initials(p.user_name) + '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:800;font-size:18px;color:#111827;line-height:1.2;margin-bottom:4px;">' +
          (hasVal(p.user_name) ? esc(p.user_name) : '<span style="color:#9ca3af;font-style:italic;font-weight:400;">Name not available</span>') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          statusBadge(p.status, true) +
          (p.created_at ? '<span style="font-size:11.5px;color:#9ca3af;">Submitted ' + fmtDateTime(p.created_at) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>' +

    // ── Images ───────────────────────────────────────────────────
    '<div style="margin-bottom:6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;">Payment Proof' + (imgCount > 1 ? 's (' + imgCount + ')' : '') + '</div>' +
    '<div style="margin-bottom:20px;">' + galleryHtml + '</div>' +

    // ── Info grid ────────────────────────────────────────────────
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:20px;">' +
      infoSection("Customer", "👤", [
        ["Full Name",  p.user_name],
        ["Email",      p.user_email],
        ["Phone",      p.user_phone]
      ]) +
      infoSection("Order", "📦", [
        ["Order ID",       p.order_id,        true],
        ["Tesla Model",    hasVal(p.car_model) ? "Tesla " + p.car_model : ""],
        ["Delivery Method",p.delivery_method]
      ]) +
      infoSection("Payment", "💳", [
        ["Method",    p.payment_method],
        ["Date",      fmtDate(p.created_at)],
        ["Time",      fmtTime(p.created_at)],
        ["Proof Type",p.proof_type]
      ]) +
      infoSection("Status", "📊", [
        ["Current Status", normaliseStatus(p.status).charAt(0).toUpperCase() + normaliseStatus(p.status).slice(1)],
        ["Reviewed By",    p.reviewed_by],
        ["Reviewed At",    fmtDateTime(p.reviewed_at)],
        ["Admin Notes",    p.admin_notes]
      ]) +
    '</div>' +

    // ── Review banner ────────────────────────────────────────────
    (hasVal(p.reviewed_at) && hasVal(p.admin_notes)
      ? '<div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#92400e;">' +
          '<strong>Admin note:</strong> ' + esc(p.admin_notes) +
        '</div>'
      : '') +

    // ── Action buttons ───────────────────────────────────────────
    (approveBtn || rejectBtn
      ? '<div style="display:flex;gap:10px;flex-wrap:wrap;">' + (approveBtn || '') + (rejectBtn || '') + '</div>'
      : '<div style="text-align:center;padding:12px;font-size:13px;color:#94a3b8;font-style:italic;">This proof has already been ' + normaliseStatus(p.status) + '.</div>');

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeProofDetail() {
  var m = document.getElementById("proofDetailModal");
  if (m) m.style.display = "none";
  document.body.style.overflow = "";
}

// ── Image lightbox (supports navigation between images) ──────────
var _zoomImages = [];
var _zoomIndex  = 0;

function openImageZoom(encodedUrl, index, encodedAll) {
  _zoomIndex  = index || 0;
  _zoomImages = encodedAll ? encodedAll.map(decodeURIComponent) : [decodeURIComponent(encodedUrl)];
  renderZoomImage();
  var z = document.getElementById("imageZoomOverlay");
  if (z) z.style.display = "flex";
}

function renderZoomImage() {
  var img = document.getElementById("imageZoomImg");
  var ctr = document.getElementById("imageZoomCounter");
  var prv = document.getElementById("imageZoomPrev");
  var nxt = document.getElementById("imageZoomNext");
  if (!img) return;
  img.src = _zoomImages[_zoomIndex] || "";
  if (ctr) ctr.textContent = _zoomImages.length > 1 ? (_zoomIndex + 1) + " / " + _zoomImages.length : "";
  if (prv) prv.style.display = _zoomImages.length > 1 ? "flex" : "none";
  if (nxt) nxt.style.display = _zoomImages.length > 1 ? "flex" : "none";
}

function zoomPrev() {
  if (_zoomImages.length > 1) { _zoomIndex = (_zoomIndex - 1 + _zoomImages.length) % _zoomImages.length; renderZoomImage(); }
}
function zoomNext() {
  if (_zoomImages.length > 1) { _zoomIndex = (_zoomIndex + 1) % _zoomImages.length; renderZoomImage(); }
}

function closeImageZoom() {
  var z = document.getElementById("imageZoomOverlay");
  if (z) z.style.display = "none";
}

// ── Actions ──────────────────────────────────────────────────────
function approveProof(id) {
  var btn = event && event.currentTarget;
  var orig = btn ? btn.innerHTML : "";
  if (btn) { btn.disabled = true; btn.textContent = "Approving…"; }
  api("POST", "/admin/payment-proofs/approve", { id: id }).then(function() {
    if (typeof showToast === "function") showToast("Payment approved ✓", "success");
    closeProofDetail();
    loadProofs();
  }).catch(function(e) {
    if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    if (typeof showToast === "function") showToast("Approve failed: " + ((e && e.message) || "Server error"), "error");
  });
}

function rejectProof(id) {
  var reason = prompt("Reason for rejecting (optional):", "");
  if (reason === null) return;
  api("POST", "/admin/payment-proofs/reject", { id: id, reason: reason || "" }).then(function() {
    if (typeof showToast === "function") showToast("Payment rejected", "success");
    closeProofDetail();
    loadProofs();
  }).catch(function(e) {
    if (typeof showToast === "function") showToast("Reject failed: " + ((e && e.message) || "Server error"), "error");
  });
}

function quickApproveProof(id) {
  var p = (allProofs || []).find(function(x) { return x.id === id; });
  if (!p) return;
  var who = hasVal(p.user_name) ? p.user_name : (hasVal(p.user_email) ? p.user_email : "this customer");
  if (!confirm("Approve payment from " + who + "?")) return;
  api("POST", "/admin/payment-proofs/approve", { id: id }).then(function() {
    if (typeof showToast === "function") showToast("Payment approved ✓", "success");
    loadProofs();
  }).catch(function(e) {
    if (typeof showToast === "function") showToast("Approve failed: " + ((e && e.message) || "error"), "error");
  });
}

function quickRejectProof(id) {
  var p = (allProofs || []).find(function(x) { return x.id === id; });
  if (!p) return;
  var reason = prompt("Reason for rejecting (optional):", "");
  if (reason === null) return;
  api("POST", "/admin/payment-proofs/reject", { id: id, reason: reason || "" }).then(function() {
    if (typeof showToast === "function") showToast("Payment rejected", "success");
    loadProofs();
  }).catch(function(e) {
    if (typeof showToast === "function") showToast("Reject failed: " + ((e && e.message) || "error"), "error");
  });
}

// Legacy aliases
function viewProof(url) { if (hasVal(url)) openImageZoom(encodeURIComponent(url), 0, null); }
function closeProofModal() { closeProofDetail(); }

// ── Globals ──────────────────────────────────────────────────────
window.loadProofs        = loadProofs;
window.renderProofs      = renderProofs;
window.openProofDetail   = openProofDetail;
window.closeProofDetail  = closeProofDetail;
window.approveProof      = approveProof;
window.rejectProof       = rejectProof;
window.quickApproveProof = quickApproveProof;
window.quickRejectProof  = quickRejectProof;
window.openImageZoom     = openImageZoom;
window.closeImageZoom    = closeImageZoom;
window.zoomPrev          = zoomPrev;
window.zoomNext          = zoomNext;
window.viewProof         = viewProof;
window.closeProofModal   = closeProofModal;
