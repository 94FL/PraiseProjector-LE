import { useEffect, useRef, useState } from "react";
import { useSettings } from "./useSettings";

interface ScreenSizeBreakpoints {
  xs: number; // Extra small (mobile portrait)
  sm: number; // Small (mobile landscape)
  md: number; // Medium (tablet)
  lg: number; // Large (desktop)
  xl: number; // Extra large (large desktop)
}

const breakpoints: ScreenSizeBreakpoints = {
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1280,
  xl: 1920,
};

/** Fixed reference size used when auto-adjust is on — independent of user's manual setting */
const AUTO_BASE_SIZE = 16;

/** The discrete step values that match the font-size selector options in settings */
export const AUTO_FONT_SIZE_STEPS = [10, 12, 14, 16, 18, 20, 22];

/**
 * Calculate the auto font size for a given screen width.
 * Always uses AUTO_BASE_SIZE as input so the result is never influenced
 * by a previously-set manual font size. Snaps to the nearest available step.
 */
export const calculateAutoFontSize = (screenWidth: number): number => {
  const raw = calculateFontSize(screenWidth, AUTO_BASE_SIZE);
  return AUTO_FONT_SIZE_STEPS.reduce((prev, curr) => (Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev));
};

/**
 * Calculate optimal font size based on screen resolution (device, not window)
 * Uses device screen width which is static and doesn't change during runtime
 */
const calculateFontSize = (screenWidth: number, baseFontSize: number): number => {
  // Scale factor based on actual device screen width, not window size
  let scaleFactor = 1;

  if (screenWidth < breakpoints.xs) {
    // Extra small screens: scale down to 75%
    scaleFactor = 0.75;
  } else if (screenWidth < breakpoints.sm) {
    // Small screens: scale between 75% and 85%
    const progress = (screenWidth - breakpoints.xs) / (breakpoints.sm - breakpoints.xs);
    scaleFactor = 0.75 + progress * 0.1;
  } else if (screenWidth < breakpoints.md) {
    // Medium screens: scale between 85% and 95%
    const progress = (screenWidth - breakpoints.sm) / (breakpoints.md - breakpoints.sm);
    scaleFactor = 0.85 + progress * 0.1;
  } else if (screenWidth < breakpoints.lg) {
    // Large screens: scale between 95% and 100%
    const progress = (screenWidth - breakpoints.md) / (breakpoints.lg - breakpoints.md);
    scaleFactor = 0.95 + progress * 0.05;
  } else if (screenWidth < breakpoints.xl) {
    // Extra large screens: 100%
    scaleFactor = 1;
  } else {
    // Ultra large screens: scale up slightly to 105%
    scaleFactor = 1 + Math.min((screenWidth - breakpoints.xl) / 10000, 0.05);
  }

  return Math.round(baseFontSize * scaleFactor);
};

/**
 * Check if the main content is overflowing and needs font size reduction
 */
const checkOverflow = (): boolean => {
  const appElement = document.querySelector("#root") || document.body;
  const hasHorizontalOverflow = appElement.scrollWidth > window.innerWidth;
  const hasVerticalOverflow = appElement.scrollHeight > window.innerHeight;

  return hasHorizontalOverflow || hasVerticalOverflow;
};

/**
 * Hook to manage responsive base font size
 * Automatically adjusts based on viewport size and overflow detection
 */
export const useResponsiveFontSize = () => {
  const { settings } = useSettings();
  const [effectiveFontSize, setEffectiveFontSize] = useState<number>(16);
  const lastAppliedFontSizeRef = useRef<number | null>(null);
  const overflowCheckTimeoutRef = useRef<number | null>(null);
  const baseFontSize = settings?.baseFontSize || 16;
  const autoAdjustFontSize = settings?.autoAdjustFontSize ?? true;

  useEffect(() => {
    const updateFontSize = () => {
      if (overflowCheckTimeoutRef.current !== null) {
        window.clearTimeout(overflowCheckTimeoutRef.current);
        overflowCheckTimeoutRef.current = null;
      }

      if (autoAdjustFontSize) {
        // Use calculateAutoFontSize which always uses a fixed 16px reference base,
        // keeping auto-selected size completely independent of the user's manual setting.
        let calculatedSize = calculateAutoFontSize(window.screen.width);

        // Skip DOM writes when the computed font size is unchanged.
        if (lastAppliedFontSizeRef.current === calculatedSize) {
          return;
        }

        const scale = calculatedSize / 16;

        // Apply to document
        document.documentElement.style.fontSize = `${calculatedSize}px`;
        document.documentElement.style.setProperty("--pp-root-font-size", `${calculatedSize}px`);
        document.documentElement.style.setProperty("--pp-scale", scale.toString());
        lastAppliedFontSizeRef.current = calculatedSize;
        setEffectiveFontSize(calculatedSize);

        // After a short delay, check for overflow and reduce if necessary
        // This only runs on initial load and orientation changes, not on every resize
        overflowCheckTimeoutRef.current = window.setTimeout(() => {
          let attempts = 0;
          const maxAttempts = 5;

          while (checkOverflow() && attempts < maxAttempts && calculatedSize > 10) {
            calculatedSize -= 1;
            document.documentElement.style.fontSize = `${calculatedSize}px`;
            attempts++;
          }

          if (attempts > 0) {
            setEffectiveFontSize(calculatedSize);
            const overflowScale = calculatedSize / 16;
            document.documentElement.style.setProperty("--pp-root-font-size", `${calculatedSize}px`);
            document.documentElement.style.setProperty("--pp-scale", overflowScale.toString());
            lastAppliedFontSizeRef.current = calculatedSize;
            // console.debug(
            //   "General",
            //   `Font size adjusted from ${calculateAutoFontSize(window.screen.width)}px to ${calculatedSize}px to prevent overflow`
            // );
          }
          overflowCheckTimeoutRef.current = null;
        }, 100);
      } else {
        // Use manual font size setting
        if (lastAppliedFontSizeRef.current === baseFontSize) {
          return;
        }

        document.documentElement.style.fontSize = `${baseFontSize}px`;
        document.documentElement.style.setProperty("--pp-root-font-size", `${baseFontSize}px`);
        document.documentElement.style.setProperty("--pp-scale", (baseFontSize / 16).toString());
        lastAppliedFontSizeRef.current = baseFontSize;
        setEffectiveFontSize(baseFontSize);
      }
    };

    // Initial font size calculation
    updateFontSize();

    // For mobile devices: only recalculate on actual device orientation change
    // Do NOT listen to window resize events - those cause flickering when keyboard appears,
    // scrollbars change, or other temporary window size changes occur
    const handleOrientationChange = () => {
      setTimeout(updateFontSize, 100);
    };

    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      if (overflowCheckTimeoutRef.current !== null) {
        window.clearTimeout(overflowCheckTimeoutRef.current);
        overflowCheckTimeoutRef.current = null;
      }
    };
  }, [baseFontSize, autoAdjustFontSize]);

  return {
    effectiveFontSize,
    baseFontSize: settings?.baseFontSize || 16,
    autoAdjust: settings?.autoAdjustFontSize ?? true,
  };
};
