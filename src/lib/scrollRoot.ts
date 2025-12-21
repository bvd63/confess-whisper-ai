export type ScrollRoot = Window | HTMLElement;

export const resolveScrollRoot = (): ScrollRoot => {
  const el = typeof document !== "undefined"
    ? (document.querySelector('[data-app-scroll]') as HTMLElement | null)
    : null;
  return el ?? window;
};

export const getScrollTop = (root: ScrollRoot): number => {
  return root instanceof Window
    ? root.scrollY || root.pageYOffset || 0
    : root.scrollTop;
};

export const scrollToTop = (root: ScrollRoot, behavior: ScrollBehavior = "smooth") => {
  if (root instanceof Window) {
    root.scrollTo({ top: 0, behavior });
  } else {
    root.scrollTo({ top: 0, behavior });
  }
};
