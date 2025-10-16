import { useState, useEffect } from "react";

interface UseHideOnScrollOptions {
  threshold?: number;
  disabled?: boolean;
}

export const useHideOnScroll = ({
  threshold = 10,
  disabled = false,
}: UseHideOnScrollOptions = {}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (disabled) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < threshold) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [disabled, lastScrollY, threshold]);

  return isVisible;
};
