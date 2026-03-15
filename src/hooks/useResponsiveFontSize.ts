import { useEffect, useState } from "react";
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

/**
 * Calculate optimal font size based on viewport width
 * Uses a formula that scales smoothly between breakpoints
 */
const calculateFontSize = (viewportWidth: number, baseFontSize: number): number => {
  // Scale factor based on viewport width
  let scaleFactor = 1;

  if (viewportWidth < breakpoints.xs) {
    // Extra small screens: scale down to 75%
    scaleFactor = 0.75;
  } else if (viewportWidth < breakpoints.sm) {
    // Small screens: scale between 75% and 85%
    const progress = (viewportWidth - breakpoints.xs) / (breakpoints.sm - breakpoints.xs);
    scaleFactor = 0.75 + progress * 0.1;
  } else if (viewportWidth < breakpoints.md) {
    // Medium screens: scale between 85% and 95%
    const progress = (viewportWidth - breakpoints.sm) / (breakpoints.md - breakpoints.sm);
    scaleFactor = 0.85 + progress * 0.1;
  } else if (viewportWidth < breakpoints.lg) {
    // Large screens: scale between 95% and 100%
    const progress = (viewportWidth - breakpoints.md) / (breakpoints.lg - breakpoints.md);
    scaleFactor = 0.95 + progress * 0.05;
  } else if (viewportWidth < breakpoints.xl) {
    // Extra large screens: 100%
    scaleFactor = 1;
  } else {
    // Ultra large screens: scale up slightly to 105%
    scaleFactor = 1 + Math.min((viewportWidth - breakpoints.xl) / 10000, 0.05);
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

  useEffect(() => {
    if (!settings) return;

    const updateFontSize = () => {
      const baseFontSize = settings.baseFontSize || 16;

      if (settings.autoAdjustFontSize) {
        // Calculate font size based on viewport width
        let calculatedSize = calculateFontSize(window.innerWidth, baseFontSize);
        const scale = calculatedSize / 16;

        // Apply to document
        document.documentElement.style.fontSize = `${calculatedSize}px`;
        document.documentElement.style.setProperty("--pp-root-font-size", `${calculatedSize}px`);
        document.documentElement.style.setProperty("--pp-scale", scale.toString());
        setEffectiveFontSize(calculatedSize);

        // After a short delay, check for overflow and reduce if necessary
        setTimeout(() => {
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
            // console.debug(
            //   "General",
            //   `Font size adjusted from ${calculateFontSize(window.innerWidth, baseFontSize)}px to ${calculatedSize}px to prevent overflow`
            // );
          }
        }, 100);
      } else {
        // Use manual font size setting
        document.documentElement.style.fontSize = `${baseFontSize}px`;
        document.documentElement.style.setProperty("--pp-root-font-size", `${baseFontSize}px`);
        document.documentElement.style.setProperty("--pp-scale", (baseFontSize / 16).toString());
        setEffectiveFontSize(baseFontSize);
      }
    };

    // Initial font size calculation
    updateFontSize();

    // Update on window resize
    const handleResize = () => {
      updateFontSize();
    };

    window.addEventListener("resize", handleResize);

    // Update on orientation change (mobile)
    const handleOrientationChange = () => {
      setTimeout(updateFontSize, 100);
    };

    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [settings, settings?.baseFontSize, settings?.autoAdjustFontSize]);

  return {
    effectiveFontSize,
    baseFontSize: settings?.baseFontSize || 16,
    autoAdjust: settings?.autoAdjustFontSize ?? true,
  };
};
