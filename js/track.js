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

  // Timeline (Premium Redesign)
  var stageIcons = {
    'Order Confirmed': '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    'Processing': '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></svg>',
    'Shipped': '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>',
    'In Transit': '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="15" cy="17" r="2"></circle><path d="M13 17h-4"></path><path d="M13 11h-4"></path></svg>',
    'Out for Delivery': '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"/></svg>',
    'Delivered': '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'
  };
  var sl = {confirmed:'Order Confirmed', processing:'Processing', shipped:'Shipped', in_transit:'In Transit', out_for_delivery:'Out for Delivery', delivered:'Delivered'};
  document.getElementById('statusLabel').textContent = sl[order.status] || 'Processing';
  document.getElementById('timeline').innerHTML = timeline.map(function(s,i) {
    var cls = s.completed ? 'done' : (i === done ? 'current' : 'upcoming');
    var icon = stageIcons[s.stage] || '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
    var timeText;
    if (s.completed && s.timestamp) {
      try {
        var d = new Date(s.timestamp);
        if (!isNaN(d.getTime())) {
          timeText = d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
        } else { timeText = s.timestamp.split('T')[0] || s.timestamp; }
      } catch(e) { timeText = s.timestamp; }
    } else if (s.completed) {
      timeText = 'Completed';
    } else if (i === done) {
      timeText = 'In progress';
    } else {
      timeText = 'Upcoming';
    }
    var statusBadge = '';
    if (i === done && !s.completed) {
      statusBadge = ' <span class="active-pulse-badge"><span class="active-pulse-dot"></span> Active</span>';
    }
    var timeHtml = '<div class="premium-tl-time">' + 
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;margin-right:4px;vertical-align:middle;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' + 
      timeText + '</div>';
    return '<div class="premium-tl-item ' + cls + '">' +
      '<div class="premium-tl-dot">' + icon + '</div>' +
      '<div class="premium-tl-content">' +
        '<div class="premium-tl-stage">' + s.stage + statusBadge + '</div>' +
        timeHtml +
      '</div>' +
    '</div>';
  }).join('');

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
