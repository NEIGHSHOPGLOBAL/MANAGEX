/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCEYlHId5RZIam5743WhnpnGYRGJo8T07I',
  authDomain: 'managex-41b99.firebaseapp.com',
  projectId: 'managex-41b99',
  storageBucket: 'managex-41b99.firebasestorage.app',
  messagingSenderId: '300615798034',
  appId: '1:300615798034:web:eb7543fd47e0d1114677cb',
});

firebase.messaging().onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'ManageX';
  const body = payload.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/managex_logo.png',
    badge: '/managex_logo.png',
    data: payload.data || {},
    tag: payload.data?.entity_id ? `managex-${payload.data.entity_type}-${payload.data.entity_id}` : 'managex',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let path = '/';
  if (data.entity_type === 'task' && data.entity_id) path = `/tasks/${data.entity_id}`;
  else if (data.entity_type === 'meeting' && data.entity_id) path = '/meetings';
  else if (data.path) path = data.path;

  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
