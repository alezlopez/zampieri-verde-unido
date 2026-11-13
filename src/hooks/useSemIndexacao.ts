import { useEffect } from "react";

/**
 * Páginas de fotos são "link não listado": abertas a quem recebe o link,
 * fora do menu do site e fora do Google.
 */
export const useSemIndexacao = () => {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noimageindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
};
