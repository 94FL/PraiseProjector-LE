import { useEffect, useRef } from "react";

/**
 * Uses the Screen Wake Lock API to prevent the screen from turning off.
 * Works in modern browsers (Chrome, Edge, Safari) for webapp mode.
 * In Electron, the main process uses powerSaveBlocker instead,
 * but this hook also works there as a fallback.
 *
 * @param enabled Whether to keep the screen awake.
 */
export function useWakeLock(enabled: boolean): void {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!("wakeLock" in navigator)) {
      // Wake Lock API not supported in this browser
      return;
    }

    let released = false;

    const requestWakeLock = async () => {
      try {
        if (!released && document.visibilityState === "visible") {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          console.log("[WakeLock] acquired");
          wakeLockRef.current.addEventListener("release", () => {
            console.log("[WakeLock] released");
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        console.warn("[WakeLock] request failed:", err);
      }
    };

    const handleVisibilityChange = () => {
      // Re-acquire wake lock when tab becomes visible again
      if (document.visibilityState === "visible" && !released) {
        requestWakeLock();
      }
    };

    if (enabled) {
      requestWakeLock();
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
}
