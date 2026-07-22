// ╔══════════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Credit Card Configuration
// ║  Includes toggle for requiring CC image uploads on payment page
// ╚══════════════════════════════════════════════════════════════╝

var selectedCCNetworks = ["visa", "mastercard", "amex", "discover"];

var CC_IMAGE_REQUIRED_KEY = 'tesla_cc_image_upload_required';

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

  // Restore saved config
  var saved = localStorage.getItem("tesla_cc_config");
  if (saved) {
    try {
      var cfg = JSON.parse(saved);
      var merchantEl = document.getElementById("ccMerchantName");
      var merchantIdEl = document.getElementById("ccMerchantId");
      var instrEl = document.getElementById("ccInstructions");
      if (merchantEl) merchantEl.value = cfg.merchantName || "";
      if (merchantIdEl) merchantIdEl.value = cfg.merchantId || "";
      if (instrEl) instrEl.value = cfg.instructions || "";
      if (cfg.networks) selectedCCNetworks = cfg.networks;
    } catch(e) {}
  }

  // Restore CC image upload required toggle
  var toggleEl = document.getElementById("ccImageUploadToggle");
  if (toggleEl) {
    var isRequired = localStorage.getItem(CC_IMAGE_REQUIRED_KEY) === 'true';
    toggleEl.checked = isRequired;
    updateCCToggleLabel(isRequired);
    toggleEl.addEventListener('change', function() {
      var val = this.checked;
      localStorage.setItem(CC_IMAGE_REQUIRED_KEY, val ? 'true' : 'false');
      updateCCToggleLabel(val);
      showToast(val
        ? 'Credit card image upload is now required for customers'
        : 'Credit card image upload is now optional (hidden)');
    });
  }

  loadCCConfig();
}

function updateCCToggleLabel(isEnabled) {
  var labelEl = document.getElementById("ccImageUploadLabel");
  if (!labelEl) return;
  if (isEnabled) {
    labelEl.textContent = "Enabled — customers must upload front and back card images";
    labelEl.style.color = "var(--success, #00A550)";
  } else {
    labelEl.textContent = "Disabled — card image upload section is hidden from customers";
    labelEl.style.color = "var(--gray, #5C5E62)";
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
    networks: selectedCCNetworks,
    merchantName: (document.getElementById("ccMerchantName") || {}).value || "",
    merchantId: (document.getElementById("ccMerchantId") || {}).value || "",
    instructions: (document.getElementById("ccInstructions") || {}).value || ""
  };
  localStorage.setItem("tesla_cc_config", JSON.stringify(cfg));

  // Also persist the image upload toggle value
  var toggleEl = document.getElementById("ccImageUploadToggle");
  if (toggleEl) {
    localStorage.setItem(CC_IMAGE_REQUIRED_KEY, toggleEl.checked ? 'true' : 'false');
  }

  showToast("Credit card configuration saved");
}

function resetCCSelection() {
  selectedCCNetworks = ["visa", "mastercard", "amex", "discover"];
  loadCCConfig();
  showToast("Networks reset");
}
