import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Images, Loader2 } from "lucide-react";
import { FotosLayout } from "@/components/fotos/FotosLayout";
import { dataEventoBr, FotoAlbum, FotoItem, tabelaAlbuns, tabelaItens, urlFoto } from "@/lib/fotos";
import { mensagemAmigavel } from "@/lib/mensagensErro";

interface AlbumCard extends FotoAlbum {
  capa: string;
  totalFotos: number;
  totalVideos: number;
}

const Fotos = () => {
  const [albuns, setAlbuns] = useState<AlbumCard[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    document.title = "Álbuns de fotos | Colégio Zampieri";
    (async () => {
      const { data, error } = await tabelaAlbuns()
        .select("*")
        .eq("publicado", true)
        .order("data_evento", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) {
        setErro(mensagemAmigavel(error));
        setCarregando(false);
        return;
      }
      const lista = (data ?? []) as unknown as FotoAlbum[];
      const { data: itens } = lista.length
        ? await tabelaItens()
            .select("id, album_id, tipo, miniatura, ordem")
            .in("album_id", lista.map((a) => a.id))
            .order("ordem")
        : { data: [] };
      const porAlbum = new Map<string, FotoItem[]>();
      for (const it of (itens ?? []) as unknown as FotoItem[]) {
        porAlbum.set(it.album_id, [...(porAlbum.get(it.album_id) ?? []), it]);
      }
      setAlbuns(
        lista.map((a) => {
          const doAlbum = porAlbum.get(a.id) ?? [];
          const fotos = doAlbum.filter((i) => i.tipo === "foto");
          const capa = fotos.find((i) => i.id === a.capa_item_id) ?? fotos[0];
          return {
            ...a,
            capa: urlFoto(capa?.miniatura),
            totalFotos: fotos.length,
            totalVideos: doAlbum.length - fotos.length,
          };
        }),
      );
      setCarregando(false);
    })();
  }, []);

  return (
    <FotosLayout>
      <h1 className="font-serif text-3xl md:text-4xl font-bold text-zampieri-green-dark">Álbuns de fotos</h1>
      <p className="text-muted-foreground mt-2 mb-8">Os momentos dos nossos eventos, separados por álbum.</p>

      {carregando ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-zampieri-green-dark" aria-label="Carregando" />
        </div>
      ) : erro ? (
        <p role="alert" className="text-destructive">{erro}</p>
      ) : albuns.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Camera className="w-10 h-10 mx-auto mb-3 opacity-50" aria-hidden="true" />
          Nenhum álbum publicado ainda.
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {albuns.map((a) => (
            <li key={a.id}>
              <Link
                to={`/fotos/${a.slug}`}
                className="group block rounded-xl overflow-hidden bg-white shadow-sm border border-border hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] bg-zampieri-cream flex items-center justify-center overflow-hidden">
                  {a.capa ? (
                    <img
                      src={a.capa}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Images className="w-10 h-10 text-zampieri-green-dark/40" aria-hidden="true" />
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-lg text-zampieri-green-dark leading-tight">{a.titulo}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {[
                      dataEventoBr(a.data_evento),
                      a.totalFotos ? `${a.totalFotos} ${a.totalFotos === 1 ? "foto" : "fotos"}` : "",
                      a.totalVideos ? `${a.totalVideos} ${a.totalVideos === 1 ? "vídeo" : "vídeos"}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </FotosLayout>
  );
};

export default Fotos;
