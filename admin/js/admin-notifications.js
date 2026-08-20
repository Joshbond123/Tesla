// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Web Push Notifications
// ╚══════════════════════════════════════════════════════════╝

var PUSH_VAPID_PUBLIC = '';
var _pushStatus = {
  permission: (typeof Notification !== 'undefined') ? Notification.permission : 'denied',
  subscribed: false,
  prefs: { enabled: true, newOrder: true, paymentProof: true }
};

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var raw = atob(base64);
  var arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function pushSupported() {
  return !!(typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
}

function updatePushUI() {
  var permEl = document.getElementById('pushPermStatus');
  var subEl = document.getElementById('pushSubStatus');
  var master = document.getElementById('pushMasterEnabled');
  var orderT = document.getElementById('pushNewOrder');
  var proofT = document.getElementById('pushPaymentProof');
  var btnEnable = document.getElementById('pushEnableBtn');
  var btnDisable = document.getElementById('pushDisableBtn');
  var banner = document.getElementById('pushStatusBanner');

  var perm = _pushStatus.permission;
  var sub = _pushStatus.subscribed;
  var prefs = _pushStatus.prefs || {};

  if (permEl) {
    permEl.textContent = perm === 'granted' ? 'Granted' : (perm === 'denied' ? 'Blocked' : 'Not set');
    permEl.className = 'push-pill push-pill--' + (perm === 'granted' ? 'ok' : (perm === 'denied' ? 'bad' : 'muted'));
  }
  if (subEl) {
    subEl.textContent = sub ? 'Subscribed' : 'Not subscribed';
    subEl.className = 'push-pill push-pill--' + (sub ? 'ok' : 'muted');
  }
  if (master) master.checked = prefs.enabled !== false;
  if (orderT) orderT.checked = prefs.newOrder !== false;
  if (proofT) proofT.checked = prefs.paymentProof !== false;

  if (btnEnable) btnEnable.style.display = sub ? 'none' : 'inline-flex';
  if (btnDisable) btnDisable.style.display = sub ? 'inline-flex' : 'none';

  if (banner) {
    if (!pushSupported()) {
      banner.style.display = 'flex';
      banner.className = 'push-banner push-banner--warn';
      banner.innerHTML = '<strong>Not supported</strong><span>This browser does not support web push notifications.</span>';
    } else if (perm === 'denied') {
      banner.style.display = 'flex';
      banner.className = 'push-banner push-banner--warn';
      banner.innerHTML = '<strong>Permission blocked</strong><span>Enable notifications in your browser settings for this site, then click Re-enable.</span>';
    } else if (!sub) {
      banner.style.display = 'flex';
      banner.className = 'push-banner push-banner--info';
      banner.innerHTML = '<strong>Notifications off</strong><span>Subscribe to receive order and payment-proof alerts even when the admin panel is closed.</span>';
    } else {
      banner.style.display = 'flex';
      banner.className = 'push-banner push-banner--ok';
      banner.innerHTML = '<strong>Active</strong><span>You will receive push alerts for enabled event types.</span>';
    }
  }
}

function loadPushStatus() {
  if (!API_BASE) { updatePushUI(); return Promise.resolve(); }
  return api('GET', '/admin/push/status')
    .then(function (r) {
      if (r && r.prefs) _pushStatus.prefs = r.prefs;
      if (typeof r.subscribed === 'boolean') _pushStatus.subscribed = r.subscribed;
      if (r && r.vapidPublicKey) PUSH_VAPID_PUBLIC = r.vapidPublicKey;
      if (typeof Notification !== 'undefined') _pushStatus.permission = Notification.permission;
      updatePushUI();
      return r;
    })
    .catch(function () { updatePushUI(); });
}

function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.reject(new Error('Service workers not supported'));
  // Resolve SW next to admin.html (GitHub Pages project path: /Tesla/sw.js)
  var path = (location.pathname || '/').replace(/\/[^/]*$/, '/');
  if (path.indexOf('/admin') !== -1) path = path.replace(/\/admin\/?$/, '/');
  var swUrl = path + 'sw.js';
  return navigator.serviceWorker.register(swUrl, { scope: path }).then(function (reg) {
    return navigator.serviceWorker.ready.then(function () { return reg; });
  });
}

function subscribePush() {
  if (!pushSupported()) {
    showToast('Push notifications are not supported in this browser', 'error');
    return Promise.reject(new Error('unsupported'));
  }
  if (!API_BASE) {
    showToast('API not configured', 'error');
    return Promise.reject(new Error('no api'));
  }

  return loadPushStatus()
    .then(function () {
      if (!PUSH_VAPID_PUBLIC) return api('GET', '/admin/push/vapid-public-key').then(function (r) {
        PUSH_VAPID_PUBLIC = (r && r.publicKey) || '';
      });
    })
    .then(function () {
      return Notification.requestPermission();
    })
    .then(function (perm) {
      _pushStatus.permission = perm;
      if (perm !== 'granted') {
        showToast('Notification permission was not granted', 'error');
        updatePushUI();
        throw new Error('permission denied');
      }
      return ensureServiceWorker();
    })
    .then(function (reg) {
      return reg.pushManager.getSubscription().then(function (existing) {
        if (existing) return existing;
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUSH_VAPID_PUBLIC)
        });
      });
    })
    .then(function (sub) {
      var json = sub.toJSON();
      return api('POST', '/admin/push/subscribe', {
        endpoint: json.endpoint,
        keys: json.keys,
        expirationTime: json.expirationTime || null
      });
    })
    .then(function () {
      _pushStatus.subscribed = true;
      updatePushUI();
      hidePushModals();
      showToast('Notifications enabled');
      try { if (typeof refreshAll === 'function') refreshAll(); } catch (e) {}
    })
    .catch(function (err) {
      console.error('[Push] subscribe', err);
      if (err && err.message !== 'permission denied') {
        showToast('Could not enable notifications', 'error');
      }
      updatePushUI();
    });
}

function unsubscribePush() {
  if (!API_BASE) return;
  var endpoint = null;
  return ensureServiceWorker()
    .then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        if (sub) {
          endpoint = sub.endpoint;
          return sub.unsubscribe().then(function () { return sub; });
        }
        return null;
      });
    })
    .catch(function () { return null; })
    .then(function () {
      return api('POST', '/admin/push/unsubscribe', { endpoint: endpoint || '' });
    })
    .then(function () {
      _pushStatus.subscribed = false;
      updatePushUI();
      showToast('Notifications disabled');
    })
    .catch(function (err) {
      console.error('[Push] unsubscribe', err);
      showToast('Failed to disable notifications', 'error');
    });
}

function savePushPrefs() {
  var master = document.getElementById('pushMasterEnabled');
  var orderT = document.getElementById('pushNewOrder');
  var proofT = document.getElementById('pushPaymentProof');
  var prefs = {
    enabled: !!(master && master.checked),
    newOrder: !!(orderT && orderT.checked),
    paymentProof: !!(proofT && proofT.checked)
  };
  api('POST', '/admin/push/prefs', prefs)
    .then(function (r) {
      _pushStatus.prefs = (r && r.prefs) || prefs;
      updatePushUI();
      showToast('Notification settings saved');
    })
    .catch(function () {
      showToast('Failed to save notification settings', 'error');
    });
}

function syncPushTopbarBodyClass() {
  var a = document.getElementById('pushEnableModal');
  var b = document.getElementById('pushReenableModal');
  var visible = (a && a.style.display !== 'none' && a.style.display !== '') ||
    (b && b.style.display !== 'none' && b.style.display !== '');
  try {
    document.body.classList.toggle('has-push-topbar', !!visible);
  } catch (e) {}
}

function hidePushModals() {
  var a = document.getElementById('pushEnableModal');
  var b = document.getElementById('pushReenableModal');
  if (a) a.style.display = 'none';
  if (b) b.style.display = 'none';
  syncPushTopbarBodyClass();
}

function showPushEnableModal() {
  var b = document.getElementById('pushReenableModal');
  if (b) b.style.display = 'none';
  var m = document.getElementById('pushEnableModal');
  if (m) m.style.display = 'block';
  syncPushTopbarBodyClass();
}

function showPushReenableModal() {
  var a = document.getElementById('pushEnableModal');
  if (a) a.style.display = 'none';
  var m = document.getElementById('pushReenableModal');
  if (m) m.style.display = 'block';
  syncPushTopbarBodyClass();
}

function testPushNotification() {
  if (!API_BASE) { showToast('API not configured', 'error'); return; }
  api('POST', '/admin/push/test', {})
    .then(function (r) {
      if (r && r.ok) showToast('Test notification sent');
      else showToast((r && r.error) || 'Test failed — check subscription', 'error');
    })
    .catch(function (e) {
      showToast((e && e.message) || 'Test failed', 'error');
    });
}
window.testPushNotification = testPushNotification;

/** Validate existing subscription; only prompt Re-subscribe when invalid */
function validatePushSubscription() {
  if (!pushSupported() || !API_BASE) return Promise.resolve();
  if (typeof Notification === 'undefined') return Promise.resolve();
  _pushStatus.permission = Notification.permission;

  return loadPushStatus().then(function (status) {
    return ensureServiceWorker().then(function (reg) {
      if (!reg || !reg.pushManager) {
        updatePushUI();
        return;
      }
      return reg.pushManager.getSubscription().then(function (sub) {
        var localSub = !!sub;
        var serverSub = !!(status && status.subscribed);

        if (_pushStatus.permission === 'granted' && localSub && !serverSub) {
          // Browser has sub, server missing — re-sync to database
          var json = sub.toJSON();
          return api('POST', '/admin/push/subscribe', {
            endpoint: json.endpoint,
            keys: json.keys,
            expirationTime: json.expirationTime || null
          }).then(function () {
            _pushStatus.subscribed = true;
            updatePushUI();
          });
        }

        if (_pushStatus.permission === 'granted' && !localSub && serverSub) {
          // Server has stale subscription — clear DB and show Re-subscribe (not auto enable)
          showPushReenableModal();
          return api('POST', '/admin/push/unsubscribe', { endpoint: '', clearInvalid: true }).then(function () {
            _pushStatus.subscribed = false;
            updatePushUI();
          });
        }

        if (_pushStatus.permission === 'granted' && localSub && serverSub) {
          _pushStatus.subscribed = true;
        }

        // Never auto-open the first-time "Enable Notifications" popup
        updatePushUI();
      });
    }).catch(function () {
      updatePushUI();
    });
  }).catch(function () {
    updatePushUI();
  });
}

window.showPushEnableModal = showPushEnableModal;
