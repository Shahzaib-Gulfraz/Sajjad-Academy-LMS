import { useEffect, type RefObject } from "react";

const useOutsideClick = <T extends HTMLElement>(
  ref: RefObject<T>,
  onOutsideClick: () => void,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [enabled, onOutsideClick, ref]);
};

export default useOutsideClick;
