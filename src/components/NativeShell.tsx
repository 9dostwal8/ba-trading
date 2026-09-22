import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

/**
 * Native-app niceties for the Capacitor Android build. All of it is optional:
 * on the plain web the Capacitor plugin is simply absent and this renders
 * nothing. Handles the hardware back button (go back in history, exit the app
 * on the home screen), registers the service worker early so push works, and
 * monitors online/offline connection state.
 */
export function NativeShell() {
  const router = useRouter();

  useEffect(() => {
    let dispose: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          const atRoot = router.state.location.pathname === "/";
          if (canGoBack && !atRoot) router.history.back();
          else void App.exitApp();
        });
        dispose = () => void handle.remove();
      } catch {
        /* not running inside the native shell */
      }
    })();
    return () => dispose?.();
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Keep an already-granted subscription alive across app launches.
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => {
      toast.warning("أنت غير متصل بالإنترنت / هێڵ پچڕاوە", {
        description: "يرجى التحقق من اتصال شبكة الإنترنت الخاصة بك.",
        duration: 5000,
      });
    };

    const handleOnline = () => {
      toast.success("تم استعادة الاتصال بالإنترنت / هێڵ گەڕایەوە", {
        duration: 3000,
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}

