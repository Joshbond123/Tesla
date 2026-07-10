// Tesla Giveaway — Order Tracking

let map = null;
let truckInterval = null;

// Auto-load from URL params
document.addEventListener('DOMContentLoaded', () => {
  const orderId  = getParam('order');
  const tracking = getParam('tracking');
  if (orderId || tracking) {
    const input = document.getElementById('trackInput');
    if (input) input.value = orderId || tracking;
    lookupOrder();
  }
});

// Track input — Enter key
document.getElementById?.('trackInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') lookupOrder();
});

// ── LOOKUP ────────────────────────────────────────────────────────────
async function lookupOrder() {
  const input = document.getElementById('trackInput')?.value.trim();
  if (!input) { showToast('Please enter an Order ID or Tracking Number.', 'error'); return; }

  showLoading('Looking up your order...');

  try {
    let result;
    if (input.startsWith('TRK-')) {
      result = await apiCall(`/order/tracking/${input}`);
    } else {
      result = await apiCall(`/order/${input}`);
    }
    hideLoading();
    displayTracking(result.order);
  } catch (err) {
    hideLoading();
    // Try localStorage fallback
    const saved = localStorage.getItem('tesla_last_order');
    if (saved) {
      try {
        const o = JSON.parse(saved);
        if (o.orderId === input || o.trackingNumber === input) { displayTracking(o); return; }
      } catch(_) {}
    }
    showToast('Order not found. Please check your Order ID or Tracking Number.', 'error');
  }
}

// ── DISPLAY ───────────────────────────────────────────────────────────
function displayTracking(order) {
  document.getElementById('lookupSection').style.display = 'none';
  const section = document.getElementById('trackingSection');
  section.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Header
  document.getElementById('orderIdDisplay').textContent  = order.orderId;
  document.getElementById('trackingDisplay').textContent = order.trackingNumber;

  const statusMap = {
    confirmed: 'Order Confirmed', processing: 'Processing',
    shipped: 'Shipped', in_transit: 'In Transit',
    out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
  };
  document.getElementById('statusChip').textContent = statusMap[order.status] || 'Processing';

  // Progress
  const timeline = order.timeline || [];
  const done = timeline.filter(t => t.completed).length;
  const pct  = Math.max(8, Math.min(Math.round((done / Math.max(timeline.length,1))*100), 100));
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent  = pct + '%';

  // Timeline
  const tlIcons = ['📋','⚙️','📦','🚚','🏠','✅'];
  document.getElementById('timeline').innerHTML = timeline.map((s,i) => `
    <div class="tl-item ${s.completed?'done':i===done?'current':''}">
      <div class="tl-dot">${s.completed?'✓':(i===done?'<span style="width:8px;height:8px;background:var(--red);border-radius:50%;display:inline-block;"></span>':tlIcons[i]||'○')}</div>
      <div class="tl-info">
        <div class="tl-stage">${s.stage}</div>
        <div class="tl-time">${s.timestamp ? new Date(s.timestamp).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : (i===done?'In progress...':'Upcoming')}</div>
      </div>
    </div>
  `).join('');

  // Vehicle details — all user-supplied values escaped to prevent XSS
  const car  = order.selectedCar || {};
  const addr = order.deliveryDetails || {};

  function detRow(label, value, style='') {
    return `<div class="det-row"><span class="det-key">${label}</span><span class="det-val"${style?` style="${style}"`:''}>${escapeHtml(value)||'—'}</span></div>`;
  }

  const orderDateStr = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
    : '—';

  document.getElementById('vehicleDetails').innerHTML =
    detRow('Vehicle', `Tesla ${car.name||''}`.trim()) +
    detRow('Colour', car.color) +
    detRow('Order Date', orderDateStr) +
    detRow('Est. Delivery', order.estimatedDelivery, 'color:var(--success);') +
    (order.deliveryMethod?.name ? detRow('Shipping', order.deliveryMethod.name) : '');

  document.getElementById('addressDetails').innerHTML =
    detRow('Recipient', addr.fullName) +
    detRow('Address',   addr.address) +
    detRow('City',      addr.city) +
    detRow('State',     addr.state) +
    detRow('Country',   addr.country) +
    (addr.instructions ? detRow('Instructions', addr.instructions) : '');

  // Map
  setTimeout(() => initMap(addr), 300);
}

// ── MAP ───────────────────────────────────────────────────────────────
async function initMap(address) {
  if (map) {
    if (truckInterval) { clearInterval(truckInterval); truckInterval = null; }
    map.remove(); map = null;
  }

  const mapEl = document.getElementById('trackMap');
  if (!mapEl) return;

  const origin = [37.4936, -121.9448]; // Tesla Fremont factory
  let dest = [40.7128, -74.0060]; // Default NYC

  // Geocode address
  const city    = address?.city || '';
  const state   = address?.state || '';
  const country = address?.country || '';
  if (city) {
    try {
      const q = `${city}, ${state}, ${country}`;
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      const d = await r.json();
      if (d.length) dest = [parseFloat(d[0].lat), parseFloat(d[0].lon)];
    } catch(_) {}
  }

  map = L.map('trackMap');

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO', maxZoom: 19,
  }).addTo(map);

  const redIcon   = L.divIcon({ html:'<div style="width:14px;height:14px;background:#E31937;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(227,25,55,.5)"></div>', className:'', iconSize:[14,14], iconAnchor:[7,7] });
  const greenIcon = L.divIcon({ html:'<div style="width:14px;height:14px;background:#00A550;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,165,80,.5)"></div>', className:'', iconSize:[14,14], iconAnchor:[7,7] });
  const truckIcon = L.divIcon({ html:'<div style="font-size:20px;line-height:1;">🚚</div>', className:'', iconSize:[24,24], iconAnchor:[12,12] });

  L.marker(origin, { icon: redIcon }).addTo(map)
    .bindPopup('<strong>Tesla Factory</strong><br>Fremont, CA — Origin');
  L.marker(dest, { icon: greenIcon }).addTo(map)
    .bindPopup(`<strong>Delivery Destination</strong><br>${city}, ${country}`);

  const mid = [(origin[0]+dest[0])/2, (origin[1]+dest[1])/2];
  const truck = L.marker(mid, { icon: truckIcon }).addTo(map);
  truck.bindPopup('<strong>Your Tesla</strong><br>🚚 In Transit');

  L.polyline([origin, dest], { color:'#E31937', weight:2.5, opacity:.5, dashArray:'8,8' }).addTo(map);
  map.fitBounds(L.latLngBounds([origin, dest]), { padding:[50,50] });

  let p = 0.3;
  truckInterval = setInterval(() => {
    p = (p + 0.004) % 1;
    truck.setLatLng([
      origin[0] + (dest[0]-origin[0])*p + Math.sin(p*10)*.04,
      origin[1] + (dest[1]-origin[1])*p + Math.cos(p*10)*.04,
    ]);
  }, 100);
}

// ── RESET ─────────────────────────────────────────────────────────────
function resetLookup() {
  if (truckInterval) { clearInterval(truckInterval); truckInterval = null; }
  if (map) { map.remove(); map = null; }
  document.getElementById('trackingSection').style.display = 'none';
  document.getElementById('lookupSection').style.display   = 'block';
  const input = document.getElementById('trackInput');
  if (input) { input.value = ''; input.focus(); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
