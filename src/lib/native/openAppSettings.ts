// Opens the OS-level app settings page so the user can grant a permission
// that was previously denied (especially "Don't ask again" on Android).
// On web there's no programmatic way to open browser site settings.

export async function openAppSettings(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;

    // Try the dedicated NativeSettings plugin if installed at runtime.
    // Imported dynamically via a variable so TypeScript doesn't require
    // the package to be installed at build time.
    try {
      const pkg = 'capacitor-native-settings';
      const mod: unknown = await import(/* @vite-ignore */ pkg).catch(() => null);
      if (mod && typeof mod === 'object') {
        const m = mod as {
          NativeSettings?: { open?: (opts: { optionAndroid: string; optionIOS: string }) => Promise<unknown> };
          AndroidSettings?: { ApplicationDetails: string };
          IOSSettings?: { App: string };
        };
        if (m.NativeSettings?.open && m.AndroidSettings && m.IOSSettings) {
          await m.NativeSettings.open({
            optionAndroid: m.AndroidSettings.ApplicationDetails,
            optionIOS: m.IOSSettings.App,
          });
          return true;
        }
      }
    } catch {}

    // Fallback: use the Capacitor Browser plugin or window.open with a
    // package URL. This isn't perfect on all OEMs but is the best we can
    // do without an extra native plugin.
    try {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo().catch(() => null);
      const pkg = info?.id ?? 'app.lovable.quran.foundation.prime';
      // Last resort — opens a settings intent on most Android devices.
      window.open(`package:${pkg}`, '_system');
      return true;
    } catch {}

    return false;
  } catch {
    return false;
  }
}
