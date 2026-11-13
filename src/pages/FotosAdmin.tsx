import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Film,
  ImagePlus,
  Images,
  Loader2,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSemIndexacao } from "@/hooks/useSemIndexacao";
import {
  BUCKET_FOTOS,
  dataEventoBr,
  FotoAlbum,
  FotoItem,
  gerarSlug,
  normalizarInstagram,
  prepararFoto,
  SLUG_VALIDO,
  tabelaAlbuns,
  tabelaItens,
  urlFoto,
} from "@/lib/fotos";
import { mensagemAmigavel } from "@/lib/mensagensErro";

type Form = { titulo: string; slug: string; descricao: string; data_evento: string; publicado: boolean };
const FORM_VAZIO: Form = { titulo: "", slug: "", descricao: "", data_evento: "", publicado: false };

const erroAlbum = (e: { code?: string; message?: string }) =>
  e.code === "23505"
    ? "Já existe um álbum com este endereço. Altere o endereço do link."
    : e.code === "23514"
    ? "Endereço do link inválido: use só letras minúsculas, números e hífens (mínimo 3 caracteres)."
    : mensagemAmigavel(e);

const removerArquivos = async (itens: Pick<FotoItem, "caminho" | "miniatura">[]) => {
  const caminhos = itens.flatMap((i) => [i.caminho, i.miniatura]).filter((c): c is string => !!c);
  for (let i = 0; i < caminhos.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET_FOTOS).remove(caminhos.slice(i, i + 100));
    if (error) throw error;
  }
};

const FotosAdmin = () => {
  useSemIndexacao();
  const [albuns, setAlbuns] = useState<FotoAlbum[]>([]);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [atual, setAtual] = useState<FotoAlbum | "novo" | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [slugManual, setSlugManual] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [itens, setItens] = useState<FotoItem[]>([]);
  const [envio, setEnvio] = useState<{ feitas: number; total: number; falhas: number } | null>(null);
  const [linkInsta, setLinkInsta] = useState("");
  const inputArquivos = useRef<HTMLInputElement>(null);

  const carregarAlbuns = useCallback(async () => {
    const [{ data, error }, { data: its }] = await Promise.all([
      tabelaAlbuns().select("*").order("data_evento", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
      tabelaItens().select("album_id"),
    ]);
    if (error) toast.error(mensagemAmigavel(error));
    setAlbuns((data ?? []) as unknown as FotoAlbum[]);
    const c: Record<string, number> = {};
    for (const i of (its ?? []) as unknown as { album_id: string }[]) c[i.album_id] = (c[i.album_id] ?? 0) + 1;
    setContagem(c);
    setCarregando(false);
  }, []);

  const carregarItens = useCallback(async (albumId: string) => {
    const { data, error } = await tabelaItens().select("*").eq("album_id", albumId).order("ordem").order("created_at");
    if (error) toast.error(mensagemAmigavel(error));
    setItens((data ?? []) as unknown as FotoItem[]);
  }, []);

  useEffect(() => {
    carregarAlbuns();
  }, [carregarAlbuns]);

  const abrir = (a: FotoAlbum | "novo") => {
    setAtual(a);
    setLinkInsta("");
    setItens([]);
    if (a === "novo") {
      setForm(FORM_VAZIO);
      setSlugManual(false);
    } else {
      setForm({
        titulo: a.titulo,
        slug: a.slug,
        descricao: a.descricao ?? "",
        data_evento: a.data_evento ?? "",
        publicado: a.publicado,
      });
      setSlugManual(true);
      carregarItens(a.id);
    }
  };

  const voltar = () => {
    if (envio) return;
    setAtual(null);
    carregarAlbuns();
  };

  const salvar = async () => {
    const titulo = form.titulo.trim();
    const slug = form.slug.trim();
    if (!titulo) return toast.error("Informe o nome do álbum.");
    if (slug.length < 3 || !SLUG_VALIDO.test(slug)) {
      return toast.error("Endereço do link inválido: use só letras minúsculas, números e hífens (mínimo 3 caracteres).");
    }
    if (slug === "admin") return toast.error("Este endereço é reservado. Escolha outro.");
    setSalvando(true);
    const dados = {
      titulo,
      slug,
      descricao: form.descricao.trim() || null,
      data_evento: form.data_evento || null,
      publicado: form.publicado,
    };
    if (atual === "novo") {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await tabelaAlbuns().insert({ ...dados, criado_por: u.user?.id ?? null }).select("*").single();
      setSalvando(false);
      if (error) return toast.error(erroAlbum(error));
      toast.success("Álbum criado. Agora envie as fotos.");
      setAtual(data as unknown as FotoAlbum);
      setSlugManual(true);
    } else if (atual) {
      const { data, error } = await tabelaAlbuns().update(dados).eq("id", atual.id).select("*").single();
      setSalvando(false);
      if (error) return toast.error(erroAlbum(error));
      toast.success("Álbum salvo.");
      setAtual(data as unknown as FotoAlbum);
    }
  };

  const enviarFotos = async (arquivos: File[]) => {
    if (!atual || atual === "novo" || arquivos.length === 0) return;
    const albumId = atual.id;
    let proxOrdem = itens.reduce((m, i) => Math.max(m, i.ordem), 0) + 1;
    const fila = arquivos.map((arquivo) => ({ arquivo, ordem: proxOrdem++ }));
    let feitas = 0;
    let falhas = 0;
    setEnvio({ feitas, total: fila.length, falhas });

    const enviarUma = async ({ arquivo, ordem }: { arquivo: File; ordem: number }) => {
      const id = crypto.randomUUID();
      const caminho = `${albumId}/${id}.jpg`;
      const miniatura = `${albumId}/${id}_m.jpg`;
      try {
        const { grande, mini } = await prepararFoto(arquivo);
        const opcoes = { contentType: "image/jpeg", cacheControl: "31536000", upsert: false };
        const [r1, r2] = await Promise.all([
          supabase.storage.from(BUCKET_FOTOS).upload(caminho, grande.blob, opcoes),
          supabase.storage.from(BUCKET_FOTOS).upload(miniatura, mini.blob, opcoes),
        ]);
        if (r1.error || r2.error) throw r1.error || r2.error;
        const { error } = await tabelaItens().insert({
          album_id: albumId,
          tipo: "foto",
          caminho,
          miniatura,
          largura: grande.largura,
          altura: grande.altura,
          ordem,
        });
        if (error) throw error;
      } catch (e) {
        falhas++;
        await supabase.storage.from(BUCKET_FOTOS).remove([caminho, miniatura]).catch(() => undefined);
        console.error("falha ao enviar foto", arquivo.name, e);
      } finally {
        feitas++;
        setEnvio({ feitas, total: fila.length, falhas });
      }
    };

    // Três envios por vez: rápido sem travar celulares mais simples
    const trabalhadores = Array.from({ length: Math.min(3, fila.length) }, async () => {
      while (fila.length) await enviarUma(fila.shift()!);
    });
    await Promise.all(trabalhadores);
    setEnvio(null);
    await carregarItens(albumId);
    if (falhas) {
      toast.error(
        `${falhas} de ${arquivos.length} ${arquivos.length === 1 ? "foto não foi enviada" : "fotos não foram enviadas"}. ` +
          "Use fotos JPG, PNG ou WEBP; fotos HEIC do iPhone só abrem no Safari.",
      );
    } else {
      toast.success(`${arquivos.length} ${arquivos.length === 1 ? "foto enviada" : "fotos enviadas"}.`);
    }
  };

  const adicionarInstagram = async () => {
    if (!atual || atual === "novo") return;
    const url = normalizarInstagram(linkInsta);
    if (!url) return toast.error("Cole o link de um post ou reel do Instagram (ex.: instagram.com/reel/...).");
    if (itens.some((i) => i.instagram_url === url)) return toast.error("Este vídeo já está no álbum.");
    const ordem = itens.reduce((m, i) => Math.max(m, i.ordem), 0) + 1;
    const { error } = await tabelaItens().insert({ album_id: atual.id, tipo: "instagram", instagram_url: url, ordem });
    if (error) return toast.error(mensagemAmigavel(error));
    setLinkInsta("");
    toast.success("Vídeo adicionado.");
    carregarItens(atual.id);
  };

  const definirCapa = async (item: FotoItem) => {
    if (!atual || atual === "novo") return;
    const { data, error } = await tabelaAlbuns().update({ capa_item_id: item.id }).eq("id", atual.id).select("*").single();
    if (error) return toast.error(mensagemAmigavel(error));
    setAtual(data as unknown as FotoAlbum);
    toast.success("Capa do álbum definida.");
  };

  const removerItem = async (item: FotoItem) => {
    if (!confirm(item.tipo === "foto" ? "Remover esta foto do álbum?" : "Remover este vídeo do álbum?")) return;
    try {
      await removerArquivos([item]);
      const { error } = await tabelaItens().delete().eq("id", item.id);
      if (error) throw error;
      setItens((l) => l.filter((i) => i.id !== item.id));
    } catch (e) {
      toast.error(mensagemAmigavel(e as Error));
    }
  };

  const excluirAlbum = async () => {
    if (!atual || atual === "novo") return;
    if (!confirm(`Excluir o álbum "${atual.titulo}" e todas as ${itens.length} mídias? Não dá para desfazer.`)) return;
    try {
      await removerArquivos(itens);
      const { error } = await tabelaAlbuns().delete().eq("id", atual.id);
      if (error) throw error;
      toast.success("Álbum excluído.");
      setAtual(null);
      carregarAlbuns();
    } catch (e) {
      toast.error(mensagemAmigavel(e as Error));
    }
  };

  const linkPublico = atual && atual !== "novo" ? `${window.location.origin}/fotos/${atual.slug}` : "";
  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkPublico);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  };

  // ===== Lista de álbuns =====
  if (!atual) {
    return (
      <div className="min-h-screen bg-zampieri-cream/40">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="font-serif text-3xl font-bold text-zampieri-green-dark">Álbuns de fotos</h1>
              <p className="text-sm text-muted-foreground">
                Página pública:{" "}
                <a href="/fotos" target="_blank" rel="noreferrer" className="underline">
                  {window.location.origin}/fotos
                </a>{" "}
                (fora do menu e do Google)
              </p>
            </div>
            <Button onClick={() => abrir("novo")} className="bg-zampieri-green-dark hover:bg-zampieri-green-dark/90">
              <Plus className="w-4 h-4 mr-1" /> Novo álbum
            </Button>
          </div>
          {carregando ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-zampieri-green-dark" aria-label="Carregando" />
          ) : albuns.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">Nenhum álbum criado ainda.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-white">
              {albuns.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => abrir(a)} className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/40">
                    <Images className="w-5 h-5 text-zampieri-green-dark shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-zampieri-green-dark truncate">{a.titulo}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[dataEventoBr(a.data_evento), `${contagem[a.id] ?? 0} mídias`, `/fotos/${a.slug}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span
                      className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
                        a.publicado ? "bg-zampieri-green-dark/10 text-zampieri-green-dark" : "bg-zampieri-gold/20 text-foreground"
                      }`}
                    >
                      {a.publicado ? "Publicado" : "Rascunho"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ===== Edição de um álbum =====
  const fotos = itens.filter((i) => i.tipo === "foto");
  const videos = itens.filter((i) => i.tipo === "instagram");
  const salvo = atual !== "novo";

  return (
    <div className="min-h-screen bg-zampieri-cream/40">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <button
          type="button"
          onClick={voltar}
          disabled={!!envio}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-zampieri-green-dark disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> Todos os álbuns
        </button>

        <section className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h1 className="font-serif text-2xl font-bold text-zampieri-green-dark">{salvo ? "Editar álbum" : "Novo álbum"}</h1>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Nome do álbum</Label>
              <Input
                id="titulo"
                value={form.titulo}
                maxLength={150}
                placeholder="Festa Junina 2026"
                onChange={(e) => {
                  const titulo = e.target.value;
                  setForm((f) => ({ ...f, titulo, slug: slugManual ? f.slug : gerarSlug(titulo) }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data">Data do evento</Label>
              <Input id="data" type="date" value={form.data_evento} onChange={(e) => setForm((f) => ({ ...f, data_evento: e.target.value }))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="slug">Endereço do link</Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground shrink-0">/fotos/</span>
                <Input
                  id="slug"
                  value={form.slug}
                  maxLength={100}
                  onChange={(e) => {
                    setSlugManual(true);
                    setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }));
                  }}
                />
              </div>
              {salvo && form.publicado && (
                <p className="text-xs text-muted-foreground">Mudar o endereço quebra o link que já foi compartilhado.</p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea id="descricao" rows={2} maxLength={1000} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
            </div>
            <label className="flex items-center gap-3 md:col-span-2 cursor-pointer">
              <Switch checked={form.publicado} onCheckedChange={(v) => setForm((f) => ({ ...f, publicado: v }))} />
              <span className="text-sm">
                <strong>{form.publicado ? "Publicado" : "Rascunho"}</strong>
                <span className="text-muted-foreground">
                  {form.publicado ? " — qualquer pessoa com o link vê o álbum." : " — só a equipe com o setor Fotos vê."}
                </span>
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={salvar} disabled={salvando} className="bg-zampieri-green-dark hover:bg-zampieri-green-dark/90">
              {salvando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {salvo ? "Salvar alterações" : "Criar álbum"}
            </Button>
            {salvo && (
              <>
                <Button variant="outline" onClick={copiarLink}>
                  <Copy className="w-4 h-4 mr-1" /> Copiar link
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/fotos/${atual.slug}`} target="_blank">
                    <ExternalLink className="w-4 h-4 mr-1" /> Ver página
                  </Link>
                </Button>
                <Button variant="ghost" onClick={excluirAlbum} disabled={!!envio} className="text-destructive hover:text-destructive ml-auto">
                  <Trash2 className="w-4 h-4 mr-1" /> Excluir álbum
                </Button>
              </>
            )}
          </div>
        </section>

        {salvo && (
          <>
            <section className="rounded-xl border border-border bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-lg text-zampieri-green-dark">Fotos ({fotos.length})</h2>
                <input
                  ref={inputArquivos}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const lista = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    enviarFotos(lista);
                  }}
                />
                <Button onClick={() => inputArquivos.current?.click()} disabled={!!envio} className="bg-zampieri-green-dark hover:bg-zampieri-green-dark/90">
                  {envio ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-1" />}
                  {envio ? `Enviando ${envio.feitas} de ${envio.total}…` : "Enviar fotos"}
                </Button>
              </div>
              {envio && (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-zampieri-green-dark transition-all" style={{ width: `${(envio.feitas / envio.total) * 100}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Não feche esta página até terminar. As fotos são reduzidas antes do envio.</p>
                </div>
              )}
              {fotos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Selecione várias fotos de uma vez. Elas aparecem na ordem do envio.</p>
              ) : (
                <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {fotos.map((f) => {
                    const capa = atual.capa_item_id === f.id;
                    return (
                      <li key={f.id} className="relative group aspect-square rounded-md overflow-hidden bg-muted">
                        <img src={urlFoto(f.miniatura)} alt="" loading="lazy" className="w-full h-full object-cover" />
                        {capa && (
                          <span className="absolute top-1 left-1 rounded bg-zampieri-gold text-[10px] font-bold px-1.5 py-0.5">CAPA</span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-gradient-to-t from-black/60 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => definirCapa(f)}
                            disabled={capa}
                            className="rounded bg-white/90 p-1.5 disabled:opacity-40"
                            aria-label="Usar como capa do álbum"
                            title="Usar como capa"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removerItem(f)}
                            className="rounded bg-white/90 p-1.5 text-destructive"
                            aria-label="Remover foto"
                            title="Remover foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-border bg-white p-5 space-y-4">
              <h2 className="font-semibold text-lg text-zampieri-green-dark">Vídeos do Instagram ({videos.length})</h2>
              <form
                className="flex flex-col sm:flex-row gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  adicionarInstagram();
                }}
              >
                <Input
                  value={linkInsta}
                  onChange={(e) => setLinkInsta(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                  aria-label="Link do post ou reel do Instagram"
                  inputMode="url"
                />
                <Button type="submit" variant="outline" className="shrink-0">
                  <Film className="w-4 h-4 mr-1" /> Adicionar vídeo
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                No Instagram, toque em ··· no reel ou post → Copiar link. O post precisa ser público.
              </p>
              {videos.length > 0 && (
                <ul className="divide-y divide-border">
                  {videos.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 py-2 text-sm">
                      <Film className="w-4 h-4 text-zampieri-green-dark shrink-0" aria-hidden="true" />
                      <a href={v.instagram_url ?? "#"} target="_blank" rel="noreferrer" className="flex-1 truncate underline">
                        {v.instagram_url}
                      </a>
                      <button type="button" onClick={() => removerItem(v)} className="p-1.5 text-destructive" aria-label="Remover vídeo">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default FotosAdmin;
