// ╔══════════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Credit Card Configuration
// ║  Persists to DB via /admin/settings/cc (not localStorage)
// ╚══════════════════════════════════════════════════════════════╝

// ---- CREDIT CARD CONFIG ----
function initCCConfig() {
  document.querySelectorAll(".cc-card").forEach(function(card) {
    card.addEventListener("click", function() {
      this.classList.toggle("selected");
      var network = this.dataset.network;
      var idx = selectedCCNetworks.indexOf(network);
      if (idx > -1) { selectedCCNetworks.splice(idx, 1); } else { selectedCCNetworks.push(network); }
      loadCCConfig();
    });
  });

  // Load CC config from DB first, fall back to localStorage for instant display
  var saved = localStorage.getItem("tesla_cc_config");
  if (saved) {
    try {
      var cfg = JSON.parse(saved);
      if (cfg.networks) selectedCCNetworks = cfg.networks;
      if (document.getElementById("ccMerchantName")) document.getElementById("ccMerchantName").value = cfg.merchantName || "";
      if (document.getElementById("ccMerchantId"))   document.getElementById("ccMerchantId").value   = cfg.merchantId   || "";
      if (document.getElementById("ccInstructions")) document.getElementById("ccInstructions").value = cfg.instructions || "";
    } catch(e) {}
  }
  loadCCConfig();

  // Async: load from DB and update UI
  var apiBase = (typeof window.TESLA_API_BASE !== "undefined" && window.TESLA_API_BASE) ? window.TESLA_API_BASE.replace(/\/+$/, "") : "";
  if (apiBase) {
    fetch(apiBase + "/admin/settings/cc")
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data) return;
        if (data.networks && Array.isArray(data.networks)) selectedCCNetworks = data.networks;
        if (document.getElementById("ccMerchantName")) document.getElementById("ccMerchantName").value = data.merchantName || "";
        if (document.getElementById("ccMerchantId"))   document.getElementById("ccMerchantId").value   = data.merchantId   || "";
        if (document.getElementById("ccInstructions")) document.getElementById("ccInstructions").value = data.instructions || "";
        // Sync to localStorage so other tabs get instant fallback
        localStorage.setItem("tesla_cc_config", JSON.stringify({
          networks: data.networks, merchantName: data.merchantName,
          merchantId: data.merchantId, instructions: data.instructions
        }));
        loadCCConfig();
      })
      .catch(function(e) { console.warn("CC config load failed:", e); });
  }
}

function loadCCConfig() {
  document.querySelectorAll(".cc-card").forEach(function(card) {
    if (selectedCCNetworks.indexOf(card.dataset.network) > -1) card.classList.add("selected");
    else card.classList.remove("selected");
  });
}

function saveCreditCardConfig() {
  var cfg = {
    networks:     selectedCCNetworks,
    merchantName: (document.getElementById("ccMerchantName") || {}).value || "",
    merchantId:   (document.getElementById("ccMerchantId")   || {}).value || "",
    instructions: (document.getElementById("ccInstructions") || {}).value || ""
  };

  // Save to localStorage for instant cross-tab fallback
  localStorage.setItem("tesla_cc_config", JSON.stringify(cfg));

  // Persist to DB
  var apiBase = (typeof window.TESLA_API_BASE !== "undefined" && window.TESLA_API_BASE) ? window.TESLA_API_BASE.replace(/\/+$/, "") : "";
  if (!apiBase) {
    if (typeof showToast === "function") showToast("Credit card configuration saved (local only — API not configured)", "warning");
    return;
  }
  fetch(apiBase + "/admin/settings/cc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cfg)
  })
    .then(function(r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
    .then(function() {
      if (typeof showToast === "function") showToast("Credit card configuration saved", "success");
    })
    .catch(function(e) {
      if (typeof showToast === "function") showToast("Save failed: " + (e.message || "error"), "error");
    });
}

function resetCCSelection() {
  selectedCCNetworks = ["visa", "mastercard", "amex", "discover"];
  loadCCConfig();
  if (typeof showToast === "function") showToast("Networks reset", "success");
}
