import { useEffect, useState } from "react";

/** Breakpoint below which the sidebar becomes an overlay drawer. */
export const COMPACT_BREAKPOINT = 1024;

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const handleChange = (event) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener("change", handleChange);
    return () => list.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
};

/**
 * True when the viewport is narrow enough to want the drawer layout. Replaces
 * the old user-agent sniff, which missed narrow desktop windows and tablets
 * entirely and could not respond to a resize.
 */
export const useIsCompactLayout = () =>
  useMediaQuery(`(max-width: ${COMPACT_BREAKPOINT - 1}px)`);

/** True on genuinely touch-first devices, for swipe-to-close behaviour. */
export const useIsTouchDevice = () => useMediaQuery("(pointer: coarse)");

export default useMediaQuery;
