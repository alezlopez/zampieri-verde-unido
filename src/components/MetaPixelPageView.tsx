import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    // Definida no index.html: bloqueia admin e URLs com token ou código de aluno
    zampieriPixelPodeRastrear?: (loc: { pathname: string; search: string; hash: string }) => boolean;
  }
}

// O index.html já registra o PageView da primeira página; aqui contamos as navegações
// internas do React Router, que não recarregam a página.
export const MetaPixelPageView = () => {
  const location = useLocation();
  const primeira = useRef(true);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    if (window.zampieriPixelPodeRastrear?.(window.location)) {
      window.fbq?.("track", "PageView");
    }
    // Só a troca de rota conta como nova página; mudar a query na mesma tela não.
  }, [location.pathname]);

  return null;
};
