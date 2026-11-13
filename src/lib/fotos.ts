import { supabase } from "@/integrations/supabase/client";

export const BUCKET_FOTOS = "fotos-eventos";

export interface FotoAlbum {
  id: string;
  slug: string;
  titulo: string;
  descricao: string | null;
  data_evento: string | null;
  capa_item_id: string | null;
  publicado: boolean;
  created_at: string;
}

export interface FotoItem {
  id: string;
  album_id: string;
  tipo: "foto" | "instagram";
  caminho: string | null;
  miniatura: string | null;
  largura: number | null;
  altura: number | null;
  instagram_url: string | null;
  ordem: number;
}

/** Tabelas novas ainda não estão nos tipos gerados do Supabase. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tabelaAlbuns = () => supabase.from("fotos_albuns" as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tabelaItens = () => supabase.from("fotos_itens" as any);

export const urlFoto = (caminho: string | null | undefined, baixar = false) =>
  caminho
    ? supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho, baixar ? { download: true } : undefined).data.publicUrl
    : "";

export const dataEventoBr = (iso: string | null) => {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

/** "Festa Junina 2026!" -> "festa-junina-2026" (mesmo formato exigido pelo banco). */
export const gerarSlug = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");

export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const INSTAGRAM = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:[A-Za-z0-9._]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;

/** Normaliza um link de post/reel do Instagram para o formato aceito pelo banco, ou null. */
export const normalizarInstagram = (url: string): string | null => {
  const m = url.trim().match(INSTAGRAM);
  if (!m) return null;
  const tipo = m[1].toLowerCase() === "reels" ? "reel" : m[1].toLowerCase();
  return `https://www.instagram.com/${tipo}/${m[2]}/`;
};

export const embedInstagram = (url: string | null) => {
  const n = url ? normalizarInstagram(url) : null;
  return n ? `${n}embed` : null;
};

const carregarImagem = async (arquivo: File): Promise<ImageBitmap | HTMLImageElement> => {
  try {
    return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    // Navegadores sem createImageBitmap para o formato: tenta pela tag <img>
    const url = URL.createObjectURL(arquivo);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
};

const reduzir = (fonte: ImageBitmap | HTMLImageElement, ladoMax: number, qualidade: number) => {
  const w0 = "naturalWidth" in fonte ? fonte.naturalWidth : fonte.width;
  const h0 = "naturalHeight" in fonte ? fonte.naturalHeight : fonte.height;
  const escala = Math.min(1, ladoMax / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * escala));
  const h = Math.max(1, Math.round(h0 * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_indisponivel");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(fonte, 0, 0, w, h);
  return new Promise<{ blob: Blob; largura: number; altura: number }>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, largura: w, altura: h }) : reject(new Error("falha_compressao"))),
      "image/jpeg",
      qualidade,
    ),
  );
};

/**
 * Gera a versão para visualização (lado maior 2048px) e a miniatura (600px), ambas JPEG.
 * Fotos de celular chegam com 5–15 MB; assim a galeria abre rápido e cabe no limite do bucket.
 */
export const prepararFoto = async (arquivo: File) => {
  const fonte = await carregarImagem(arquivo);
  try {
    const grande = await reduzir(fonte, 2048, 0.85);
    const mini = await reduzir(fonte, 600, 0.75);
    return { grande, mini };
  } finally {
    if ("close" in fonte) fonte.close();
  }
};
