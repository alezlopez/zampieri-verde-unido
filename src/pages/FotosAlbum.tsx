import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Loader2, X } from "lucide-react";
import { FotosLayout } from "@/components/fotos/FotosLayout";
import {
  dataEventoBr,
  embedInstagram,
  FotoAlbum,
  FotoItem,
  tabelaAlbuns,
  tabelaItens,
  urlFoto,
} from "@/lib/fotos";
import { mensagemAmigavel } from "@/lib/mensagensErro";

const Lightbox = ({
  fotos,
  indice,
  titulo,
  aoMudar,
  aoFechar,
}: {
  fotos: FotoItem[];
  indice: number;
  titulo: string;
  aoMudar: (i: number) => void;
  aoFechar: () => void;
}) => {
  const foto = fotos[indice];
  const toqueX = useRef<number | null>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const anterior = useCallback(() => aoMudar((indice - 1 + fotos.length) % fotos.length), [indice, fotos.length, aoMudar]);
  const proxima = useCallback(() => aoMudar((indice + 1) % fotos.length), [indice, fotos.length, aoMudar]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
      else if (e.key === "ArrowLeft") anterior();
      else if (e.key === "ArrowRight") proxima();
    };
    window.addEventListener("keydown", tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
    };
  }, [anterior, proxima, aoFechar]);

  useEffect(() => fecharRef.current?.focus(), []);

  // Pré-carrega as vizinhas para a troca ser instantânea
  useEffect(() => {
    for (const d of [-1, 1]) {
      const v = fotos[(indice + d + fotos.length) % fotos.length];
      if (v?.caminho) new Image().src = urlFoto(v.caminho);
    }
  }, [indice, fotos]);

  if (!foto) return null;
  const botao = "rounded-full bg-white/10 hover:bg-white/20 text-white p-2.5 transition-colors";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${titulo} — foto ${indice + 1} de ${fotos.length}`}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onTouchStart={(e) => (toqueX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (toqueX.current === null) return;
        const dx = e.changedTouches[0].clientX - toqueX.current;
        toqueX.current = null;
        if (Math.abs(dx) > 50) (dx > 0 ? anterior : proxima)();
      }}
    >
      <div className="flex items-center justify-between p-3 text-white/80 text-sm">
        <span>
          {indice + 1} / {fotos.length}
        </span>
        <div className="flex items-center gap-2">
          <a href={urlFoto(foto.caminho, true)} className={botao} aria-label="Baixar foto" title="Baixar foto">
            <Download className="w-5 h-5" />
          </a>
          <button ref={fecharRef} type="button" onClick={aoFechar} className={botao} aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 relative flex items-center justify-center min-h-0 px-2 pb-4" onClick={aoFechar}>
        <img
          key={foto.id}
          src={urlFoto(foto.caminho)}
          alt={`Foto ${indice + 1} de ${fotos.length} do álbum ${titulo}`}
          className="max-h-full max-w-full object-contain select-none"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => (e.stopPropagation(), anterior())}
              className={`${botao} absolute left-2 md:left-4 top-1/2 -translate-y-1/2 hidden sm:block`}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={(e) => (e.stopPropagation(), proxima())}
              className={`${botao} absolute right-2 md:right-4 top-1/2 -translate-y-1/2 hidden sm:block`}
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const FotosAlbum = () => {
  const { slug = "" } = useParams();
  const [album, setAlbum] = useState<FotoAlbum | null>(null);
  const [itens, setItens] = useState<FotoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aberta, setAberta] = useState<number | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    (async () => {
      const { data, error } = await tabelaAlbuns().select("*").eq("slug", slug).maybeSingle();
      if (!ativo) return;
      if (error) {
        setErro(mensagemAmigavel(error));
        setCarregando(false);
        return;
      }
      const a = data as unknown as FotoAlbum | null;
      setAlbum(a);
      if (a) {
        document.title = `${a.titulo} | Fotos | Colégio Zampieri`;
        const { data: lista, error: e2 } = await tabelaItens()
          .select("*")
          .eq("album_id", a.id)
          .order("ordem")
          .order("created_at");
        if (!ativo) return;
        if (e2) setErro(mensagemAmigavel(e2));
        setItens((lista ?? []) as unknown as FotoItem[]);
      }
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [slug]);

  const fotos = itens.filter((i) => i.tipo === "foto");
  const videos = itens.filter((i) => i.tipo === "instagram");
  const fechar = useCallback(() => setAberta(null), []);

  if (carregando) {
    return (
      <FotosLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-zampieri-green-dark" aria-label="Carregando" />
        </div>
      </FotosLayout>
    );
  }

  if (!album) {
    return (
      <FotosLayout>
        <div className="text-center py-20">
          <p className="text-lg font-medium text-zampieri-green-dark">{erro || "Álbum não encontrado."}</p>
          <Link to="/fotos" className="inline-block mt-4 text-sm font-semibold text-zampieri-green-dark underline">
            Ver todos os álbuns
          </Link>
        </div>
      </FotosLayout>
    );
  }

  return (
    <FotosLayout>
      <Link to="/fotos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-zampieri-green-dark mb-4">
        <ArrowLeft className="w-4 h-4" /> Todos os álbuns
      </Link>
      <div className="mb-6">
        {!album.publicado && (
          <span className="inline-block mb-2 rounded-full bg-zampieri-gold/20 text-zampieri-green-dark text-xs font-semibold px-3 py-1">
            Rascunho — visível só para a equipe
          </span>
        )}
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-zampieri-green-dark">{album.titulo}</h1>
        {album.data_evento && <p className="text-muted-foreground mt-1">{dataEventoBr(album.data_evento)}</p>}
        {album.descricao && <p className="mt-3 max-w-3xl whitespace-pre-line">{album.descricao}</p>}
      </div>

      {erro && <p role="alert" className="text-destructive mb-4">{erro}</p>}

      {fotos.length > 0 && (
        <section aria-label="Fotos">
          <ul className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-1 md:gap-2">
            {fotos.map((f, i) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setAberta(i)}
                  className="block w-full aspect-square overflow-hidden rounded-md bg-zampieri-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-zampieri-gold"
                  aria-label={`Abrir foto ${i + 1} de ${fotos.length}`}
                >
                  <img
                    src={urlFoto(f.miniatura)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {videos.length > 0 && (
        <section aria-label="Vídeos" className="mt-10">
          <h2 className="font-serif text-2xl font-bold text-zampieri-green-dark mb-4">Vídeos</h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => {
              const src = embedInstagram(v.instagram_url);
              return src ? (
                <li key={v.id} className="rounded-xl overflow-hidden bg-white border border-border">
                  <iframe
                    src={src}
                    title="Vídeo do evento no Instagram"
                    loading="lazy"
                    allow="encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-[560px] border-0"
                  />
                </li>
              ) : null;
            })}
          </ul>
        </section>
      )}

      {itens.length === 0 && <p className="text-muted-foreground py-10 text-center">Este álbum ainda não tem fotos.</p>}

      {aberta !== null && (
        <Lightbox fotos={fotos} indice={aberta} titulo={album.titulo} aoMudar={setAberta} aoFechar={fechar} />
      )}
    </FotosLayout>
  );
};

export default FotosAlbum;
