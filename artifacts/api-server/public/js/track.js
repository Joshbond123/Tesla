// Track Order JavaScript
let map = null;
let markerInterval = null;

// Auto-load from URL params
document.addEventListener('DOMContentLoaded', () => {
  const orderId = getParam('order');
  const tracking = getParam('tracking');
  
  if (orderId || tracking) {
    if (orderId) document.getElementById('trackInput').value = orderId;
    else if (tracking) document.getElementById('trackInput').value = tracking;
    lookupOrder();
  }
});

async function lookupOrder() {
  const input = document.getElementById('trackInput').value.trim();
  if (!input) {
    showToast('Please enter an Order ID or Tracking Number.', 'error');
    return;
  }

  showLoading('Looking up your order...');

  try {
    let result;
    if (input.startsWith('TSLA-')) {
      result = await apiCall(`/order/${input}`);
    } else if (input.startsWith('TRK-')) {
      result = await apiCall(`/order/tracking/${input}`);
    } else {
      result = await apiCall(`/order/${input}`);
    }

    hideLoading();
    displayTracking(result.order);

  } catch (error) {
    hideLoading();
    // Try localStorage fallback
    const saved = localStorage.getItem('tesla_last_order');
    if (saved) {
      const order = JSON.parse(saved);
      if (order.orderId === input || order.trackingNumber === input) {
        displayTracking(order);
        return;
      }
    }
    showToast('Order not found. Please check your Order ID.', 'error');
  }
}

function displayTracking(order) {
  document.getElementById('lookupSection').classList.add('hidden');
  document.getElementById('trackingSection').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Header
  document.getElementById('orderIdDisplay').textContent = order.orderId;
  document.getElementById('trackingDisplay').textContent = order.trackingNumber;

  // Status
  const statusMap = {
    'confirmed': 'Order Confirmed',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'in_transit': 'In Transit',
    'out_for_delivery': 'Out for Delivery',
    'delivered': 'Delivered'
  };
  document.getElementById('statusText').textContent = statusMap[order.status] || 'Processing';

  // Progress
  const timeline = order.timeline || [];
  const completedCount = timeline.filter(t => t.completed).length;
  const progressPercent = Math.min((completedCount / timeline.length) * 100, 100);
  document.getElementById('progressFill').style.width = progressPercent + '%';

  // Timeline
  const timelineEl = document.getElementById('timeline');
  timelineEl.innerHTML = timeline.map((stage, i) => {
    const cls = stage.completed ? 'completed' : (i === completedCount ? 'active' : '');
    return `
      <div class="timeline-stage ${cls} py-2">
        <div class="timeline-dot"></div>
        <div class="flex justify-between items-center">
          <span class="text-sm ${stage.completed ? 'text-white' : (i === completedCount ? 'text-red-400' : 'text-gray-600')} font-medium">
            ${stage.stage}
          </span>
          <span class="text-xs text-gray-600">${stage.timestamp ? new Date(stage.timestamp).toLocaleString() : '—'}</span>
        </div>
      </div>
    `;
  }).join('');

  // Order Details
  const addr = order.deliveryDetails || {};
  document.getElementById('orderDetails').innerHTML = `
    <div><span class="text-gray-600 block text-xs uppercase mb-1">Vehicle</span><span class="text-white">${order.selectedCar?.name || 'Tesla'} (${order.selectedCar?.color || ''})</span></div>
    <div><span class="text-gray-600 block text-xs uppercase mb-1">Order Date</span><span class="text-white">${new Date(order.orderDate).toLocaleDateString()}</span></div>
    <div><span class="text-gray-600 block text-xs uppercase mb-1">Est. Delivery</span><span class="text-white">${order.estimatedDelivery}</span></div>
    <div><span class="text-gray-600 block text-xs uppercase mb-1">Recipient</span><span class="text-white">${addr.fullName || '—'}</span></div>
    <div class="sm:col-span-2"><span class="text-gray-600 block text-xs uppercase mb-1">Delivery Address</span><span class="text-white text-sm">${addr.address || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}, ${addr.country || ''}</span></div>
    ${addr.instructions ? `<div class="sm:col-span-2"><span class="text-gray-600 block text-xs uppercase mb-1">Special Instructions</span><span class="text-white text-sm">${addr.instructions}</span></div>` : ''}
  `;

  // Map
  setTimeout(() => initMap(addr), 300);
}

function initMap(address) {
  // Destroy existing map
  if (map) {
    if (markerInterval) clearInterval(markerInterval);
    map.remove();
    map = null;
  }

  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  // Default to San Francisco if no address
  const city = address?.city || 'San Francisco';
  const state = address?.state || 'CA';
  const country = address?.country || 'US';

  // Geocode the address (simple approach: use coordinates for the location)
  const locations = {
    'San Francisco': [37.7749, -122.4194],
    'Los Angeles': [34.0522, -118.2437],
    'New York': [40.7128, -74.0060],
    'Chicago': [41.8781, -87.6298],
    'Houston': [29.7604, -95.3698],
    'Miami': [25.7617, -80.1918],
    'Seattle': [47.6062, -122.3321],
    'Austin': [30.2672, -97.7431],
    'Dallas': [32.7767, -96.7970],
    'Denver': [39.7392, -104.9903],
    'Atlanta': [33.7490, -84.3880],
    'London': [51.5074, -0.1278],
    'Toronto': [43.6532, -79.3832],
    'Lagos': [6.5244, 3.3792],
    'Dubai': [25.2048, 55.2708],
    'Sydney': [-33.8688, 151.2093],
  };

  // Use Tesla Fremont factory as origin
  const origin = [37.4936, -121.9448]; // Fremont, CA - Tesla Factory
  let dest = locations[city] || [37.7749, -122.4194];

  map = L.map('map').setView(origin, 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Tesla Factory marker
  const factoryIcon = L.divIcon({
    html: '<div style="background:#E82127;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px rgba(232,33,39,0.6)"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  L.marker(origin, { icon: factoryIcon }).addTo(map)
    .bindPopup('<b>Tesla Factory</b><br>Fremont, CA<br><span style="color:#00cc44">● Origin</span>');

  // Destination marker
  const destIcon = L.divIcon({
    html: '<div style="background:#00cc44;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px rgba(0,204,68,0.6)"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  L.marker(dest, { icon: destIcon }).addTo(map)
    .bindPopup(`<b>Delivery Location</b><br>${city}, ${state}, ${country}<br><span style="color:#00cc44">● Destination</span>`);

  // Delivery truck marker (moving)
  const truckIcon = L.divIcon({
    html: '<div style="font-size:24px">🚚</div>',
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  // Calculate midpoint
  const midLat = (origin[0] + dest[0]) / 2;
  const midLng = (origin[1] + dest[1]) / 2;

  const truckMarker = L.marker([midLat, midLng], { icon: truckIcon }).addTo(map);
  truckMarker.bindPopup('<b>Your Tesla</b><br>🚚 In Transit');

  // Draw route line
  const routeLine = L.polyline([origin, [midLat, midLng], dest], {
    color: '#E82127',
    weight: 3,
    opacity: 0.6,
    dashArray: '10, 10'
  }).addTo(map);

  // Fit bounds
  const bounds = L.latLngBounds([origin, dest]);
  map.fitBounds(bounds, { padding: [50, 50] });

  // Animate truck
  let progress = 0;
  markerInterval = setInterval(() => {
    progress += 0.005;
    if (progress > 1) progress = 0;
    
    const lat = origin[0] + (dest[0] - origin[0]) * progress + (Math.sin(progress * 10) * 0.1);
    const lng = origin[1] + (dest[1] - origin[1]) * progress + (Math.cos(progress * 10) * 0.1);
    truckMarker.setLatLng([lat, lng]);
  }, 100);
}

function resetTracking() {
  if (markerInterval) clearInterval(markerInterval);
  if (map) { map.remove(); map = null; }
  document.getElementById('trackingSection').classList.add('hidden');
  document.getElementById('lookupSection').classList.remove('hidden');
  document.getElementById('trackInput').value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle Enter key
document.getElementById('trackInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') lookupOrder();
});
