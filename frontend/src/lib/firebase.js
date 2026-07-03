import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

let messaging = null;
let configCache = null;

export async function fetchFirebaseConfig() {
  if (configCache) return configCache;
  const res = await fetch('/api/notifications/firebase-config');
  configCache = await res.json();
  return configCache;
}

export async function initFirebaseMessaging() {
  const supported = await isSupported();
  if (!supported) return null;

  const config = await fetchFirebaseConfig();
  if (!config?.apiKey || !config?.projectId) return null;

  const app = getApps().length ? getApps()[0] : initializeApp(config);
  messaging = getMessaging(app);
  return { messaging, vapidKey: config.vapidKey };
}

export async function requestFcmToken() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;

  const ctx = await initFirebaseMessaging();
  if (!ctx) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  await navigator.serviceWorker.register('/firebase-messaging-sw.js', { updateViaCache: 'none' });
  const swReg = await navigator.serviceWorker.ready;
  const token = await getToken(ctx.messaging, {
    vapidKey: ctx.vapidKey,
    serviceWorkerRegistration: swReg,
  });
  return token || null;
}

export async function subscribeForegroundMessages(callback) {
  const ctx = await initFirebaseMessaging();
  if (!ctx) return () => {};
  return onMessage(ctx.messaging, callback);
}
