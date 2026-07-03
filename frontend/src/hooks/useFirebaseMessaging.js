import { useEffect, useRef } from 'react';
import { api } from '../api/client';
import { requestFcmToken, subscribeForegroundMessages } from '../lib/firebase';

export function useFirebaseMessaging(user, desktopNotificationsEnabled) {
  const registered = useRef(false);

  useEffect(() => {
    if (!user || !desktopNotificationsEnabled) return undefined;

    let cancelled = false;
    let unsub = () => {};

    const setup = async () => {
      try {
        const token = await requestFcmToken();
        if (cancelled || !token || registered.current === token) return;
        await api.registerDeviceToken(token);
        registered.current = token;

        unsub = await subscribeForegroundMessages((payload) => {
          window.dispatchEvent(new CustomEvent('managex:notifications-refresh'));
          if (document.hidden && Notification.permission === 'granted') {
            const title = payload.notification?.title || 'ManageX';
            const body = payload.notification?.body || '';
            const data = payload.data || {};
            const n = new Notification(title, {
              body,
              icon: '/managex_logo.png',
              tag: data.entity_id ? `managex-${data.entity_type}-${data.entity_id}` : 'managex',
              data,
            });
            n.onclick = () => {
              window.focus();
              if (data.entity_type === 'task' && data.entity_id) {
                window.location.href = `/tasks/${data.entity_id}`;
              } else if (data.path) {
                window.location.href = data.path;
              }
            };
          }
        });
      } catch (err) {
        console.warn('FCM setup skipped:', err.message);
      }
    };

    setup();

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user?.id, desktopNotificationsEnabled]);
}
