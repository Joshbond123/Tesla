// Dashboard JavaScript
const cars = [
  {
    id: 'model3', name: 'Model 3', color: 'Pearl White', price: '$38,990',
    image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-3.png',
    specs: [['3.1s','0-60 mph'],['333 mi','Range'],['AWD','Dual Motor'],['5★','Safety']],
    badge: '⚡ Most Popular', fallback: '🚗'
  },
  {
    id: 'modely', name: 'Model Y', color: 'Midnight Silver', price: '$44,990',
    image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-Y.png',
    specs: [['3.5s','0-60 mph'],['330 mi','Range'],['76 cu ft','Cargo'],['7','Seats']],
    badge: '🔥 Best Seller', fallback: '🚙'
  },
  {
    id: 'models', name: 'Model S', color: 'Ultra Red', price: '$74,990',
    image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-S.png',
    specs: [['1.99s','0-60 mph'],['396 mi','Range'],['1,020 hp','Plaid'],['200mph','Top Speed']],
    badge: '🚀 Ludicrous', fallback: '🏎️'
  },
  {
    id: 'modelx', name: 'Model X', color: 'Deep Blue', price: '$79,990',
    image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-X.png',
    specs: [['2.5s','0-60 mph'],['333 mi','Range'],['Falcon','Wing Doors'],['7','Seats']],
    badge: '🦅 Iconic', fallback: '🚐'
  },
  {
    id: 'cybertruck', name: 'Cybertruck', color: 'Stainless Steel', price: '$60,990',
    image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Cybertruck.png',
    specs: [['2.6s','0-60 mph'],['340 mi','Range'],['11,000','Towing'],['Exo-','skeleton']],
    badge: '💪 Tough', fallback: '🛻'
  },
  {
    id: 'roadster', name: 'Roadster', color: 'Signature Red', price: '$200,000',
    image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/tesla-roadster.png',
    specs: [['1.1s','0-60 mph'],['620 mi','Range'],['250+','mph Top'],['4','Seats']],
    badge: '👑 Ultimate', fallback: '🏎️'
  }
];

let selectedCar = null;
let currentStep = 2;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Persist session token from URL param (set by /api/verify redirect)
  const urlSession = new URLSearchParams(window.location.search).get('session');
  if (urlSession) {
    saveSession(urlSession);
    // Clean URL without reloading
    history.replaceState(null, '', '/dashboard.html');
  }

  // Check session
  const session = getSession();
  if (!session) {
    window.location.href = '/entry.html';
    return;
  }

  // Validate session
  try {
    const data = await apiCall(`/session?token=${session}`);
    if (!data.valid) {
      clearSession();
      window.location.href = '/entry.html';
      return;
    }

    // Show success banner
    document.getElementById('successBanner').classList.remove('hidden');
    document.getElementById('userEmailDisplay').textContent = data.user.email;

    // User data for form pre-fill
    window._userData = data.user;

  } catch (err) {
    window.location.href = '/entry.html';
    return;
  }

  renderCarSelection();
});

function renderCarSelection() {
  const grid = document.getElementById('carSelectionGrid');
  grid.innerHTML = cars.map(car => `
    <div class="car-select-card glass rounded-2xl overflow-hidden relative" onclick="selectCar('${car.id}')" id="card-${car.id}">
      <div class="h-44 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-5">
        <img src="${car.image}" alt="${car.name}" class="h-full object-contain"
          onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'text-5xl\\'>${car.fallback || '🚗'}</div>'">
      </div>
      <div class="p-5">
        <h3 class="text-lg font-semibold mb-1">${car.name}</h3>
        <p class="text-gray-500 text-xs mb-3">${car.color} • ${car.price}</p>
        <div class="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
          ${car.specs.map(s => `<div><span class="text-white font-semibold">${s[0]}</span> ${s[1]}</div>`).join('')}
        </div>
        <span class="text-red-500 text-xs font-semibold">${car.badge}</span>
      </div>
    </div>
  `).join('');
}

function selectCar(carId) {
  // Remove all selections
  document.querySelectorAll('.car-select-card').forEach(el => el.classList.remove('selected'));
  // Add selection
  document.getElementById(`card-${carId}`).classList.add('selected');
  
  selectedCar = cars.find(c => c.id === carId);
  
  // Enable button
  const btn = document.getElementById('confirmCarBtn');
  btn.classList.remove('opacity-50', 'cursor-not-allowed');
  btn.disabled = false;

  // Scroll to button
  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function confirmCarSelection() {
  if (!selectedCar) return;

  document.getElementById('stepSelectCar').classList.add('hidden');
  document.getElementById('stepDelivery').classList.remove('hidden');
  document.getElementById('selectedCarSummary').textContent = 
    `Selected: Tesla ${selectedCar.name} (${selectedCar.color})`;
  
  currentStep = 3;
  updateStepIndicator();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Pre-fill name if available
  if (window._userData) {
    const nameInput = document.querySelector('[name="fullName"]');
    if (nameInput && window._userData.firstName) {
      nameInput.value = `${window._userData.firstName} ${window._userData.lastName || ''}`.trim();
    }
  }
}

function goBackToCarSelection() {
  document.getElementById('stepDelivery').classList.add('hidden');
  document.getElementById('stepSelectCar').classList.remove('hidden');
  currentStep = 2;
  updateStepIndicator();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStepIndicator() {
  const step2 = document.getElementById('step2indicator');
  const step3 = document.getElementById('step3indicator');
  const step4 = document.getElementById('step4indicator');

  [step2, step3, step4].forEach(el => {
    el.classList.remove('active', 'done');
    el.style.borderColor = '#333';
    el.style.color = '#666';
  });

  if (currentStep === 2) {
    step2.classList.add('active');
    step2.style.borderColor = '#E82127';
    step2.style.color = '#E82127';
  } else if (currentStep === 3) {
    step2.classList.add('done');
    step2.style.borderColor = '#00cc44';
    step2.style.color = '#00cc44';
    step2.textContent = '✓';
    step3.classList.add('active');
    step3.style.borderColor = '#E82127';
    step3.style.color = '#E82127';
  } else if (currentStep === 4) {
    step2.classList.add('done');
    step2.style.borderColor = '#00cc44';
    step2.style.color = '#00cc44';
    step2.textContent = '✓';
    step3.classList.add('done');
    step3.style.borderColor = '#00cc44';
    step3.style.color = '#00cc44';
    step3.textContent = '✓';
    step4.classList.add('active');
    step4.style.borderColor = '#E82127';
    step4.style.color = '#E82127';
  }
}

// Delivery form submission
document.addEventListener('submit', async function(e) {
  if (e.target.id !== 'deliveryForm') return;
  e.preventDefault();

  const form = e.target;
  const deliveryDetails = {
    fullName: form.fullName.value.trim(),
    address: form.address.value.trim(),
    city: form.city.value.trim(),
    state: form.state.value.trim(),
    zipCode: form.zipCode.value.trim(),
    country: form.country.value.trim(),
    phone: form.deliveryPhone.value.trim(),
    instructions: form.instructions.value.trim()
  };

  // Validate
  if (!deliveryDetails.fullName || !deliveryDetails.address || !deliveryDetails.city ||
      !deliveryDetails.state || !deliveryDetails.zipCode || !deliveryDetails.country) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  showLoading('Placing your order...');

  try {
    const result = await apiCall('/order', 'POST', {
      sessionToken: getSession(),
      selectedCar,
      deliveryDetails
    });

    hideLoading();

    // Show confirmation
    document.getElementById('stepDelivery').classList.add('hidden');
    document.getElementById('stepConfirm').classList.remove('hidden');
    currentStep = 4;
    updateStepIndicator();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Populate order details
    const order = result.order;
    document.getElementById('orderDetailsContent').innerHTML = `
      <div class="flex justify-between"><span class="text-gray-500">Order ID</span><span class="text-white font-mono">${order.orderId}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Tracking #</span><span class="text-red-400 font-mono">${order.trackingNumber}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Vehicle</span><span class="text-white">${order.selectedCar.name} (${order.selectedCar.color})</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Delivery To</span><span class="text-white">${order.deliveryDetails.fullName}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Address</span><span class="text-white text-right text-xs">${order.deliveryDetails.address}, ${order.deliveryDetails.city}, ${order.deliveryDetails.state} ${order.deliveryDetails.zipCode}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Est. Delivery</span><span class="text-white">${order.estimatedDelivery}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Status</span><span class="text-green-400">✅ Confirmed</span></div>
    `;

    // Set tracking link
    document.getElementById('trackOrderBtn').href = `/track.html?order=${order.orderId}&tracking=${order.trackingNumber}`;

    // Save order to localStorage
    localStorage.setItem('tesla_last_order', JSON.stringify(order));

  } catch (error) {
    hideLoading();
    showToast(error.message, 'error');
  }
});

function logout() {
  clearSession();
  window.location.href = '/';
}
