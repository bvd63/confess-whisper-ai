import { useEffect, useState } from "react";

/**
 * Hook to track safe area insets (for devices with notches, rounded corners, etc.)
 * Automatically updates on resize
 */
export function useSafeArea() {
  const [insets, setInsets] = useState({
    top: 0,
    bottom: 0,
  });

  useEffect(() => {
    const updateInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(style.getPropertyValue("--safe-area-top").replace("px", "")) || 0,
        bottom: parseInt(style.getPropertyValue("--safe-area-bottom").replace("px", "")) || 0,
      });
    };

    // Initial update
    updateInsets();

    // Update on resize
    window.addEventListener("resize", updateInsets);
    return () => window.removeEventListener("resize", updateInsets);
  }, []);

  return insets;
}
