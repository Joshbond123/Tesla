// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Credit Card Configuration
// ╚══════════════════════════════════════════════════════════╝

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
  var saved = localStorage.getItem("tesla_cc_config");
  if (saved) {
    try { var cfg = JSON.parse(saved); document.getElementById("ccMerchantName").value = cfg.merchantName || ""; document.getElementById("ccMerchantId").value = cfg.merchantId || ""; document.getElementById("ccInstructions").value = cfg.instructions || ""; if (cfg.networks) selectedCCNetworks = cfg.networks; } catch(e) {}
  }
  loadCCConfig();
}

function loadCCConfig() {
  document.querySelectorAll(".cc-card").forEach(function(card) {
    if (selectedCCNetworks.indexOf(card.dataset.network) > -1) card.classList.add("selected");
    else card.classList.remove("selected");
  });
}

function saveCreditCardConfig() {
  var cfg = { networks: selectedCCNetworks, merchantName: document.getElementById("ccMerchantName").value, merchantId: document.getElementById("ccMerchantId").value, instructions: document.getElementById("ccInstructions").value };
  localStorage.setItem("tesla_cc_config", JSON.stringify(cfg));
  showToast("Credit card configuration saved");
}

function resetCCSelection() {
  selectedCCNetworks = ["visa", "mastercard", "amex", "discover"]; loadCCConfig(); showToast("Networks reset");
}
