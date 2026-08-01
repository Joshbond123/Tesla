// Homepage JavaScript
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollAnimations();
  renderCars();
  startCountdownTimer();
  animateEntrantCount();
  animateWinnerCount();
});

// Car data
const cars = [
  {
    id: 'model3', name: 'Model 3', price: '$38,990', image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-3.png',
    specs: [['3.1s','0-60 mph'],['333 mi','Range (EPA)'],['AWD','Dual Motor'],['5★','Safety Rating']],
    badge: '⚡ Most Popular'
  },
  {
    id: 'modely', name: 'Model Y', price: '$44,990', image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-Y.png',
    specs: [['3.5s','0-60 mph'],['330 mi','Range (EPA)'],['76 cu ft','Cargo Space'],['7','Seats']],
    badge: '🔥 Best Seller'
  },
  {
    id: 'models', name: 'Model S', price: '$74,990', image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-S.png',
    specs: [['1.99s','0-60 mph'],['396 mi','Range (EPA)'],['1,020 hp','Plaid'],['200mph','Top Speed']],
    badge: '🚀 Ludicrous Speed'
  },
  {
    id: 'modelx', name: 'Model X', price: '$79,990', image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-X.png',
    specs: [['2.5s','0-60 mph'],['333 mi','Range (EPA)'],['Falcon','Wing Doors'],['7','Seats']],
    badge: '🦅 Iconic Design'
  },
  {
    id: 'cybertruck', name: 'Cybertruck', price: '$60,990', image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Cybertruck.png',
    specs: [['2.6s','0-60 mph'],['340 mi','Range (EPA)'],['11,000','Towing lbs'],['Exo-','skeleton']],
    badge: '💪 Built Tough'
  },
  {
    id: 'roadster', name: 'Roadster', price: '$200,000', image: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/tesla-roadster.png',
    specs: [['1.1s','0-60 mph'],['620 mi','Range (EPA)'],['250+','mph Top Speed'],['4','Seats']],
    badge: '👑 Ultimate Prize', fallback: '🏎️'
  }
];

function renderCars() {
  const grid = document.getElementById('carGrid');
  if (!grid) return;

  grid.innerHTML = cars.map(car => `
    <div class="glass rounded-2xl overflow-hidden group hover:border-red-500/30 transition-all duration-300">
      <div class="h-48 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-6">
        <img src="${car.image}" alt="${car.name}" class="h-full object-contain group-hover:scale-110 transition-transform duration-500"
          onerror="this.style.display='none'">
      </div>
      <div class="p-6">
        <h3 class="text-xl font-semibold mb-1">${car.name}</h3>
        <p class="text-gray-500 text-sm mb-4">Starting at ${car.price}</p>
        <div class="grid grid-cols-2 gap-3 text-xs text-gray-400 mb-4">
          ${car.specs.map(s => `<div><span class="text-white font-semibold">${s[0]}</span><br>${s[1]}</div>`).join('')}
        </div>
        <span class="text-red-500 text-sm font-semibold">${car.badge}</span>
      </div>
    </div>
  `).join('');
}

function startCountdownTimer() {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 3);
  endDate.setHours(endDate.getHours() + 14);
  endDate.setMinutes(endDate.getMinutes() + 27);
  endDate.setSeconds(endDate.getSeconds() + 41);
  startCountdown(endDate);
}

function animateEntrantCount() {
  const el = document.getElementById('entrantCount');
  if (!el) return;
  const base = 12847;
  setInterval(() => {
    const newVal = base + Math.floor(Math.random() * 50);
    el.textContent = newVal.toLocaleString();
  }, 5000);
}

function animateWinnerCount() {
  const el = document.getElementById('winnerCount');
  if (!el) return;
  animateCounter(el, 247, 2000);
}
