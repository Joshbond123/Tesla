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
function proofIcon(name, size) {
  var s = size || 16;
  var paths = {
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.7-3.2 3.2-5 7.5-5s6.8 1.8 7.5 5"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10 5h4M11 18.5h2"/>',
    car: '<path d="m5 16-1-5 2-5h12l2 5-1 5"/><path d="M4 16v3h3v-2h10v2h3v-3M7 11h10"/><circle cx="7.5" cy="15" r="1"/><circle cx="16.5" cy="15" r="1"/>',
    order: '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.7"/><circle cx="18" cy="18" r="1.7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    expand: '<path d="M8 4H4v4M16 4h4v4M8 20H4v-4M20 16v4h-4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    imageOff: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 3 18 18M8.5 8.5h.01M21 15l-5-5L5 21"/>',
    refresh: '<path d="M20 11a8.1 8.1 0 0 0-14.8-4L3 10"/><path d="M3 4v6h6M4 13a8.1 8.1 0 0 0 14.8 4L21 14"/><path d="M21 20v-6h-6"/>',
    document: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/>'
  };
  return '<svg class="proof-icon" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.document) + '</svg>';
}
// URL of a proof image served as a real binary response (img-friendly).
// Token is passed via ?t= so <img> tags can authenticate.
function proofImgUrl(id, n) {
  var base = (typeof API_BASE !== "undefined" && API_BASE) ? API_BASE : "";
  var tok = "";
  try { tok = localStorage.getItem("tesla_admin_token") || ""; } catch (e) {}
  var url = base + "/admin/payment-proofs/" + encodeURIComponent(id) + "/image";
  var q = tok ? ("?t=" + encodeURIComponent(tok)) : "";
  if (n) q += (q ? "&" : "?") + "n=" + n;
  return url + q;
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
    pending:  { label: "Pending" },
    approved: { label: "Approved" },
    rejected: { label: "Rejected" }
  };
  var c = cfg[status];
  return '<span class="proof-status proof-status--' + status + (large ? ' proof-status--large' : '') + '">' +
    '<span class="proof-status-dot"></span><span>' + c.label + '</span></span>';
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
      '<div class="proofs-loading">' +
      '<span class="proofs-loading-spinner">' + proofIcon("refresh", 19) + '</span>' +
      '<span>Loading payment proofs</span></div>';
  }
  if (!API_BASE) {
    if (container) container.innerHTML = '<div class="proofs-error"><strong>Payment proofs are unavailable</strong><span>API not configured.</span></div>';
    return;
  }
  api("GET", "/admin/payment-proofs").then(function (r) {
    allProofs = ((r && r.proofs) || []).map(function (p) {
      return {
        id: p.id || "",
        order_id: p.order_id || "",
        user_name: p.user_name || p.customer_name || "",
        user_email: p.user_email || p.customer_email || "",
        user_phone: p.user_phone || p.customer_phone || "",
        car_model: p.car_model || "",
        delivery_method: p.delivery_method || "",
        payment_method: p.payment_method || "",
        amount: p.amount || "",
        status: normaliseStatus(p.status),
        admin_notes: p.admin_notes || "",
        proof_url: p.proof_url || "",
        proof_back_url: p.proof_back_url || "",
        proof_type: p.proof_type || "",
        reviewed_at: p.reviewed_at || "",
        reviewed_by: p.reviewed_by || "",
        created_at: p.created_at || ""
      };
    });
    var pending = allProofs.filter(function (p) { return p.status === "pending"; }).length;
    var badge = document.getElementById("proofsNavBadge");
    if (badge) {
      badge.style.display = pending ? "inline-flex" : "none";
      badge.textContent = String(pending);
    }
    if (typeof setApiStatus === "function") setApiStatus(true);
    try {
      renderProofs();
    } catch (err) {
      console.error("[Admin] renderProofs:", err);
      if (container) {
        container.innerHTML = '<div class="proofs-error"><strong>Payment proofs could not be displayed</strong><span>Please refresh and try again.</span></div>';
      }
    }
  }).catch(function (err) {
    if (typeof setApiStatus === "function") setApiStatus(false);
    if (container) {
      container.innerHTML =
        '<div class="proofs-error">' +
        '<span class="proofs-error-icon">' + proofIcon("close", 18) + '</span>' +
        '<strong>Unable to load payment proofs</strong>' +
        '<span>' + esc((err && err.message) || "Request failed") + '</span>' +
        '<button type="button" class="proof-button proof-button--primary" onclick="loadProofs()">' + proofIcon("refresh", 15) + 'Retry</button>' +
        '</div>';
    }
  });
}


// ── Render list ──────────────────────────────────────────────────
// ── Lazy thumbnail loading (keeps the proofs list lean) ────────────────────────
var _thumbCache = {};
var _thumbLoading = {};
function applyProofThumb(node, url) {
  if (!node) return;
  if (url) {
    node.innerHTML = '<img src="' + esc(url) + '" alt="Proof" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display=\'none\'">';
  } else {
    node.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#cbd5e1;font-size:11px;gap:4px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg><span>No image</span></div>';
  }
}
function loadProofThumbnails() {
  // BUG FIX: resolve thumbnail URL directly from allProofs (proof_url field).
  // GET /admin/payment-proofs/:id/thumb never existed — this avoids 404 requests.
  Array.prototype.forEach.call(document.querySelectorAll('[data-proof-thumb]'), function (node) {
    var id = node.getAttribute('data-proof-thumb');
    if (id in _thumbCache) { applyProofThumb(node, _thumbCache[id]); return; }
    var proof = (allProofs || []).find(function(x) { return x.id === id; });
    var url = (proof && hasVal(proof.proof_url)) ? proof.proof_url : "";
    _thumbCache[id] = url;
    applyProofThumb(node, url);
  });
}

function renderProofs() {
  var container  = document.getElementById("proofsContainer");
  var empty      = document.getElementById("proofsEmpty");
  var countLabel = document.getElementById("proofsCountLabel");
  if (!container) return;

  var q      = ((document.getElementById("proofSearch") || {}).value || "").trim().toLowerCase();
  var filter = (document.getElementById("proofFilter") || {}).value || "all";
  var sort   = (document.getElementById("proofSort")   || {}).value || "newest";

  var list = allProofs.filter(function (p) {
    if (filter !== "all" && p.status !== filter) return false;
    if (!q) return true;
    return [p.user_name, p.user_email, p.order_id, p.payment_method, p.car_model]
      .some(function (f) { return String(f || "").toLowerCase().indexOf(q) !== -1; });
  });

  if (sort === "oldest") {
    list.sort(function (a, b) { return new Date(a.created_at || 0) - new Date(b.created_at || 0); });
  } else if (sort === "pending_first") {
    list.sort(function (a, b) { return (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1); });
  } else {
    list.sort(function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
  }

  if (countLabel) countLabel.textContent = list.length + (list.length === 1 ? " proof" : " proofs");

  if (!list.length) {
    container.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";
  container.innerHTML = '<div class="pp-list">' + list.map(renderProofCard).join("") + '</div>';
}

function renderProofCard(p) {
  var status = normaliseStatus(p.status);
  var isPending = status === "pending";
  var imgs = getProofImages(p);
  var name = hasVal(p.user_name) ? p.user_name : (hasVal(p.user_email) ? p.user_email : "Unknown customer");
  var contact = [];
  if (hasVal(p.user_email) && hasVal(p.user_name)) contact.push(p.user_email);
  if (hasVal(p.user_phone)) contact.push(p.user_phone);
  var contactLine = contact.length ? contact.join(" · ") : "—";

  var thumbSrc = imgs.length ? imgs[0].url : "";
  var thumbInner;
  if (thumbSrc) {
    var zoomUrls = imgs.map(function (im) { return "'" + encodeURIComponent(im.url) + "'"; }).join(",");
    thumbInner =
      '<img class="pp-card-thumb-img" src="' + esc(thumbSrc) + '" alt="Payment proof" loading="lazy" ' +
      'onclick="event.stopPropagation();window.openImageZoom && window.openImageZoom(\'' + encodeURIComponent(thumbSrc) + '\',0,[' + zoomUrls + '])" ' +
      'onerror="this.classList.add(\'is-broken\');this.nextElementSibling.style.display=\'flex\'">' +
      '<div class="pp-card-thumb-fallback" style="display:none">' + proofIcon("imageOff", 22) + '<span>Unavailable</span></div>';
  } else {
    thumbInner = '<div class="pp-card-thumb-fallback">' + proofIcon("imageOff", 22) + '<span>No image</span></div>';
  }

  var countBadge = imgs.length > 1
    ? '<span class="pp-card-count">' + proofIcon("image", 12) + " " + imgs.length + "</span>"
    : "";

  function metaRow(label, value, mono) {
    if (!hasVal(value)) value = "—";
    return (
      '<div class="pp-meta-row">' +
        '<span class="pp-meta-label">' + esc(label) + "</span>" +
        '<span class="pp-meta-value' + (mono ? " is-mono" : "") + '">' + esc(value) + "</span>" +
      "</div>"
    );
  }

  var actions =
    '<div class="pp-card-actions">' +
      '<button type="button" class="pp-btn pp-btn-view" onclick="window.openProofDetail(\'' + esc(p.id) + '\')">' +
        proofIcon("eye", 15) + " View" +
      "</button>" +
      (isPending
        ? '<button type="button" class="pp-btn pp-btn-approve" onclick="window.approveProof(\'' + esc(p.id) + '\')">' +
            proofIcon("check", 15) + " Approve" +
          "</button>" +
          '<button type="button" class="pp-btn pp-btn-reject" onclick="window.rejectProof(\'' + esc(p.id) + '\')">' +
            proofIcon("close", 15) + " Reject" +
          "</button>"
        : "") +
    "</div>";

  return (
    '<article class="pp-card pp-card--' + status + '" data-proof-id="' + esc(p.id) + '">' +
      '<div class="pp-card-main">' +
        '<div class="pp-card-thumb">' + thumbInner + countBadge + "</div>" +
        '<div class="pp-card-body">' +
          '<div class="pp-card-top">' +
            '<div class="pp-card-identity">' +
              '<div class="pp-avatar">' + esc(initials(name)) + "</div>" +
              '<div class="pp-id-text">' +
                '<div class="pp-name">' + esc(name) + "</div>" +
                '<div class="pp-contact">' + esc(contactLine) + "</div>" +
              "</div>" +
            "</div>" +
            statusBadge(status) +
          "</div>" +
          '<div class="pp-card-meta">' +
            metaRow("Order ID", p.order_id, true) +
            metaRow("Tesla model", p.car_model) +
            metaRow("Payment method", p.payment_method) +
            metaRow("Submitted", p.created_at ? fmtDateTime(p.created_at) : "") +
            (hasVal(p.amount) ? metaRow("Amount", p.amount) : "") +
          "</div>" +
          actions +
        "</div>" +
      "</div>" +
    "</article>"
  );
}

function openProofDetail(id) {
  var modal = document.getElementById("proofDetailModal");
  var body  = document.getElementById("proofDetailBody");
  if (!modal || !body) return;
  modal.style.display = "flex";
  // Try local allProofs first (proof_url is now included in the list response).
  // Fall back to API call for any proof not yet in memory.
  var local = (allProofs || []).find(function(x) { return x.id === id; });
  if (local && (local.proof_url || local.proof_back_url || !local.has_image)) {
    renderProofDetail(local);
    return;
  }
  body.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8;font-size:14px;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite;vertical-align:middle;margin-right:8px"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Loading proof…</div>';
  api("GET", "/admin/payment-proofs/" + encodeURIComponent(id)).then(function(r) {
    var p = r && r.proof;
    if (!p) { body.innerHTML = '<div style="padding:50px;text-align:center;color:#dc2626;">Proof not found.</div>'; return; }
    renderProofDetail(p);
  }).catch(function() {
    // Final fallback: use local data even without image URLs
    if (local) { renderProofDetail(local); return; }
    body.innerHTML = '<div style="padding:50px;text-align:center;color:#dc2626;">Failed to load proof.</div>';
  });
}

function renderProofDetail(p) {
  var modal = document.getElementById("proofDetailModal");
  var body  = document.getElementById("proofDetailBody");
  if (!modal || !body) return;

  // BUG FIX: use proof_url / proof_back_url stored in the proof record directly.
  // proofImgUrl() pointed to GET /admin/payment-proofs/:id/image which never existed,
  // so images were always broken in the detail modal.
  var imgs = getProofImages(p);
  var status   = normaliseStatus(p.status);
  var imgCount = imgs.length;

  // ── Image gallery ──────────────────────────────────────────────
  var galleryHtml;
  if (imgCount === 0) {
    galleryHtml =
      '<div class="proof-gallery-empty">' +
      '<div class="proof-gallery-empty-icon">' + proofIcon("imageOff", 28) + '</div>No proof images uploaded</div>';
  } else {
    galleryHtml = '<div class="proof-gallery' + (imgCount === 1 ? ' proof-gallery--single' : '') + '">';
    imgs.forEach(function(img, i) {
      var encodedUrl = encodeURIComponent(img.url);
      var allEncoded = imgs.map(function(im) { return "'" + encodeURIComponent(im.url) + "'"; }).join(",");
      galleryHtml +=
        '<div class="proof-gallery-item">' +
          '<div class="proof-gallery-label">' + esc(img.label) + '</div>' +
          '<div class="proof-gallery-frame">' +
            '<img src="' + esc(img.url) + '" alt="' + esc(img.label) + '" ' +
              'class="proof-gallery-image" ' +
              'onclick="window.openImageZoom(\'' + encodedUrl + '\',' + i + ',[' + allEncoded + '])" ' +
              'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
            '<div class="proof-gallery-error">' +
              proofIcon("imageOff", 28) +
              '<span>Image could not be loaded</span>' +
            '</div>' +
            '<button onclick="window.openImageZoom(\'' + encodedUrl + '\',' + i + ',[' + allEncoded + '])" ' +
              'class="proof-gallery-expand">' + proofIcon("expand", 13) + 'Expand</button>' +
          '</div>' +
        '</div>';
    });
    galleryHtml += '</div>';
  }

  // ── Info section helper ────────────────────────────────────────
  function infoSection(title, iconName, rows) {
    var content = rows.map(function(r) {
      if (!hasVal(r[1])) return "";
      return '<div class="proof-info-row">' +
        '<span class="proof-info-label">' + esc(r[0]) + '</span>' +
        '<span class="proof-info-value' + (r[2] ? ' proof-info-value--mono' : '') + '">' + esc(r[1]) + '</span>' +
        '</div>';
    }).join("");
    if (!content) return "";
    return '<section class="proof-info-section">' +
      '<div class="proof-info-heading">' + proofIcon(iconName, 14) + '<span>' + esc(title) + '</span></div>' +
      content +
      '</div>';
  }

  // ── Approve / Reject buttons ───────────────────────────────────
  var approveBtn = status !== "approved"
    ? '<button onclick="window.approveProof(\'' + esc(p.id) + '\')" ' +
        'class="proof-detail-action proof-detail-action--approve">' +
        proofIcon("check", 16) + 'Approve payment</button>'
    : "";
  var rejectBtn = status !== "rejected"
    ? '<button onclick="window.rejectProof(\'' + esc(p.id) + '\')" ' +
        'class="proof-detail-action proof-detail-action--reject">' +
        proofIcon("close", 16) + 'Reject payment</button>'
    : "";
  var deleteBtn = '<button onclick="window.deleteProof(\'' + esc(p.id) + '\')" ' +
    'class="proof-detail-action proof-detail-action--delete">' +
    proofIcon("trash", 16) + 'Delete proof</button>';

  body.innerHTML =
    // ── Customer header ──────────────────────────────────────────
    '<div class="proof-detail-customer">' +
      '<div class="proof-detail-avatar">' + initials(hasVal(p.user_name) ? p.user_name : p.user_email) + '</div>' +
      '<div class="proof-detail-customer-copy">' +
        '<div class="proof-detail-customer-name">' +
          (hasVal(p.user_name) ? esc(p.user_name) : hasVal(p.user_email) ? esc(p.user_email) : '<span style="color:#9ca3af;font-style:italic;font-weight:400;">Customer ' + esc(p.order_id || p.id || '—') + '</span>') +
        '</div>' +
        (hasVal(p.user_name) && hasVal(p.user_email) ? '<div class="proof-detail-customer-meta">' + esc(p.user_email) + (hasVal(p.user_phone) ? ' · ' + esc(p.user_phone) : '') + '</div>' : '') +
        '<div class="proof-detail-customer-tags">' +
          statusBadge(p.status, true) +
          (hasVal(p.car_model) ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#0f172a;color:#e2e8f0;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;letter-spacing:.02em;">' + esc(p.car_model) + '</span>' : '') +
           (p.created_at ? '<span class="proof-detail-submitted">Submitted ' + fmtDateTime(p.created_at) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>' +

    // ── Images ───────────────────────────────────────────────────
    '<div class="proof-detail-section-label">Payment proof' + (imgCount > 1 ? 's (' + imgCount + ')' : '') + '</div>' +
    '<div class="proof-detail-gallery-wrap">' + galleryHtml + '</div>' +

    // ── Info grid ────────────────────────────────────────────────
    '<div class="proof-info-grid">' +
      infoSection("Customer", "user", [
        ["Full Name",  p.user_name],
        ["Email",      p.user_email],
        ["Phone",      p.user_phone]
      ]) +
      infoSection("Order", "order", [
        ["Order ID",       p.order_id,        true],
        ["Tesla Model", hasVal(p.car_model) ? p.car_model : "Not specified"],
        ["Delivery Method",p.delivery_method]
      ]) +
      infoSection("Payment", "card", [
        ["Method",    p.payment_method],
        ["Date",      fmtDate(p.created_at)],
        ["Time",      fmtTime(p.created_at)],
        ["Proof Type",p.proof_type],["Phone",p.user_phone]
      ]) +
      infoSection("Status", "document", [
        ["Current Status", normaliseStatus(p.status).charAt(0).toUpperCase() + normaliseStatus(p.status).slice(1)],
        ["Reviewed By",    p.reviewed_by],
        ["Reviewed At",    fmtDateTime(p.reviewed_at)],
        ["Admin Notes",    p.admin_notes]
      ]) +
    '</div>' +

    // ── Review banner ────────────────────────────────────────────
    (hasVal(p.reviewed_at) && hasVal(p.admin_notes)
      ? '<div class="proof-review-note">' +
          '<strong>Admin note</strong><span>' + esc(p.admin_notes) + '</span>' +
        '</div>'
      : '') +

    // ── Action buttons ───────────────────────────────────────────
    '<div class="proof-detail-actions">' + (approveBtn || '') + (rejectBtn || '') + deleteBtn + '</div>';

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
    if (typeof showToast === "function") showToast("Payment approved", "success");
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
    if (typeof showToast === "function") showToast("Payment approved", "success");
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

// ── DELETE PROOF (permanent) ────────────────────────────────────────────────
function deleteProof(id) {
  var p = (allProofs || []).find(function (x) { return x.id === id; });
  if (!p) return;
  var who = hasVal(p.user_name) ? p.user_name : (hasVal(p.user_email) ? p.user_email : "this customer");
  if (!confirm("Permanently DELETE this payment proof from " + who + " (" + (p.order_id || p.id) + ")?\nThis removes the record and cannot be undone.")) return;
  api("POST", "/admin/payment-proofs/delete", { id: id }).then(function () {
    if (typeof showToast === "function") showToast("Payment proof deleted", "success");
    closeProofDetail();
    loadProofs();
  }).catch(function (e) {
    if (typeof showToast === "function") showToast("Delete failed: " + ((e && e.message) || "Server error"), "error");
  });
}

// ── Globals ──────────────────────────────────────────────────────
window.loadProofs        = loadProofs;
window.renderProofs      = renderProofs;
window.openProofDetail   = openProofDetail;
window.closeProofDetail  = closeProofDetail;
window.approveProof      = approveProof;
window.rejectProof       = rejectProof;
window.quickApproveProof = quickApproveProof;
window.quickRejectProof  = quickRejectProof;
window.deleteProof       = deleteProof;
window.openImageZoom     = openImageZoom;
window.closeImageZoom    = closeImageZoom;
window.zoomPrev          = zoomPrev;
window.zoomNext          = zoomNext;
window.viewProof         = viewProof;
window.closeProofModal   = closeProofModal;
