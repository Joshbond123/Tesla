/* Tesla Award Admin — Web Push Service Worker */
self.addEventListener('install', function (e) {
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = { title: 'Tesla Award Admin', body: 'You have a new alert.', url: './admin.html' };
  try {
    if (event.data) {
      var parsed = event.data.json();
      if (parsed) data = Object.assign(data, parsed);
    }
  } catch (err) {
    try {
      data.body = event.data ? event.data.text() : data.body;
    } catch (e2) {}
  }
  var title = data.title || 'Tesla Award Admin';
  var options = {
    body: data.body || '',
    icon: './assets/tesla-logo.png',
    badge: './assets/tesla-logo.png',
    data: { url: data.url || './admin.html', type: data.type || '' },
    requireInteraction: false,
    tag: data.tag || ('tesla-admin-' + (data.type || 'alert')),
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || './admin.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i];
        if (c.url && c.url.indexOf('admin') !== -1 && 'focus' in c) {
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
