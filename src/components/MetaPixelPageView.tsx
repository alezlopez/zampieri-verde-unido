import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// O index.html já registra o PageView da primeira página; aqui contamos as navegações
// internas do React Router, que não recarregam a página.
export const MetaPixelPageView = () => {
  const { pathname } = useLocation();
  const primeira = useRef(true);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
};
