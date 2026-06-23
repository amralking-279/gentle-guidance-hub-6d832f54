import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Handles the Android hardware back button:
 *  - If there's history, go back.
 *  - If we're at the root with no history, exit the app.
 */
export function NativeBackHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | undefined;

    (async () => {
      const handle = await App.addListener('backButton', () => {
        const canGoBack =
          typeof window !== 'undefined' && window.history.length > 1;
        if (canGoBack && window.location.pathname !== '/') {
          router.history.back();
        } else if (canGoBack) {
          router.history.back();
        } else {
          App.exitApp();
        }
      });
      cleanup = () => handle.remove();
    })();

    return () => {
      cleanup?.();
    };
  }, [router]);

  return null;
}
