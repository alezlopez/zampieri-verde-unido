import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Doc {
  tipo: string;
  label: string;
  status: string;
  obrigatorio?: boolean;
  nome_arquivo: string | null;
  motivo: string | null;
}


interface Matricula {
  id: string;
  prematricula_id: string;
  status: string;
  contrato_gerado: boolean;
  contrato_assinado: boolean;
  link_contrato: string | null;
  valor_matricula: number | null;
  matricula_gratuita?: boolean;
  data_pagamento: string | null;
  documentos: Doc[];
  prematricula: {
    protocolo: string;
    resp_nome: string;
    resp_cpf: string;
    aluno_nome: string;
    serie_pretendida: string;
    turno_preferencia: string;
    desconto_percentual: number | null;
  } | null;
  [k: string]: unknown;
}

const STATUS_LABEL: Record<string, string> = {
  documentos_pendentes: "Documentos pendentes",
  documentos_em_analise: "Documentos em análise",
  documentos_aprovados: "Documentos aprovados",
  contrato_gerado: "Contrato aguardando assinatura",
  contrato_assinado: "Aguardando pagamento",
  concluida: "Matrícula concluída",
};

const CORES: Record<string, string> = {
  documentos_pendentes: "bg-amber-100 text-amber-800",
  documentos_em_analise: "bg-blue-100 text-blue-800",
  documentos_aprovados: "bg-teal-100 text-teal-800",
  contrato_gerado: "bg-violet-100 text-violet-800",
  contrato_assinado: "bg-indigo-100 text-indigo-800",
  concluida: "bg-emerald-100 text-emerald-800",
};

const CORES_DOC: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  enviado: "bg-blue-100 text-blue-800",
  aprovado: "bg-emerald-100 text-emerald-800",
  rejeitado: "bg-red-100 text-red-700",
};

/** Dados preenchidos pela família — exibidos apenas para conferência. */
const CAMPOS_LEITURA: { campo: string; label: string }[] = [
  { campo: "resp_fin_quem", label: "Responsável financeiro" },
  { campo: "resp_fin_nome", label: "Nome" },
  { campo: "resp_fin_cpf", label: "CPF" },
  { campo: "resp_fin_rg", label: "RG" },
  { campo: "resp_fin_estado_civil", label: "Estado civil" },
  { campo: "resp_fin_profissao", label: "Profissão" },
  { campo: "resp_fin_celular", label: "Celular" },
  { campo: "resp_fin_email", label: "E-mail" },
  { campo: "cep", label: "CEP" },
  { campo: "logradouro", label: "Logradouro" },
  { campo: "numero", label: "Número" },
  { campo: "bairro", label: "Bairro" },
  { campo: "cidade", label: "Cidade" },
  { campo: "estado", label: "UF" },
  { campo: "nome_pai", label: "Pai" },
  { campo: "nome_mae", label: "Mãe" },
];


const CAMPOS_VALORES: { campo: string; label: string }[] = [
  { campo: "anuidade_total", label: "Anuidade total" },
  { campo: "anuidade_total_ext", label: "Anuidade total por extenso" },
  { campo: "percentual_desconto", label: "Percentual de desconto (número)" },
  { campo: "percentual_desconto_ext", label: "Percentual por extenso" },
  { campo: "valor_com_desconto", label: "Mensalidade com desconto (número)" },
  { campo: "valor_com_desconto_ext", label: "Mensalidade com desconto por extenso" },
  { campo: "valor_pri_parcela", label: "Valor da 1ª parcela" },
  { campo: "valor_pri_parcela_ext", label: "1ª parcela por extenso" },
  { campo: "dia_vencimento", label: "Dia de vencimento" },
  { campo: "valor_matricula", label: "Valor da matrícula (número)" },
  { campo: "max_parcelas", label: "Máximo de parcelas no cartão" },
];

const MatriculaAdmin = () => {
  const { toast } = useToast();
  const [lista, setLista] = useState<Matricula[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [aberta, setAberta] = useState<Matricula | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [avista, setAvista] = useState(true);
  const [parcelado, setParcelado] = useState(true);
  const [gratuita, setGratuita] = useState(false);
  const [acaoEmCurso, setAcaoEmCurso] = useState(false);

  useEffect(() => {
    document.title = "Matrículas — Painel Administrativo";
  }, []);

  const chamar = async (acao: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("matricula-admin", {
      body: { acao, ...extra },
    });
    if (error || data?.error) return { erro: (data?.error as string) || "erro", data };
    return { data };
  };

  const carregar = async () => {
    setCarregando(true);
    const { erro, data } = await chamar("listar");
    setCarregando(false);
    if (erro) {
      toast({ title: "Não foi possível carregar", variant: "destructive" });
      return;
    }
    setLista((data?.lista as Matricula[]) ?? []);
  };

  useEffect(() => {
    carregar();
  }, []);

  // Mantém o registro aberto em sincronia com a lista recarregada após cada ação.
  useEffect(() => {
    setAberta((atual) => (atual ? lista.find((m) => m.id === atual.id) ?? atual : atual));
  }, [lista]);

  const abrir = (m: Matricula) => {
    setAberta(m);
    const f: Record<string, string> = {};
    CAMPOS_VALORES.forEach(({ campo }) => {
      const v = m[campo];
      f[campo] = v == null ? "" : String(v);
    });
    setForm(f);
    setAvista(m.permite_avista !== false);
    setParcelado(m.permite_parcelado !== false);
    setGratuita(m.matricula_gratuita === true);
  };

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return lista.filter((m) => {
      if (filtro !== "todos" && m.status !== filtro) return false;
      if (!t) return true;
      const p = m.prematricula;
      return (
        (p?.aluno_nome ?? "").toLowerCase().includes(t) ||
        (p?.resp_nome ?? "").toLowerCase().includes(t) ||
        (p?.protocolo ?? "").toLowerCase().includes(t)
      );
    });
  }, [lista, busca, filtro]);

  /** Espelha a validação do backend: valores mínimos salvos para gerar o contrato. */
  const valoresProntos = useMemo(() => {
    if (!aberta) return false;
    const txt = (v: unknown) => String(v ?? "").trim().length > 0;
    return (
      txt(aberta.anuidade_total) &&
      txt(aberta.valor_com_desconto) &&
      (aberta.matricula_gratuita === true || Number(aberta.valor_matricula) > 0) &&
      Number(aberta.dia_vencimento) > 0
    );
  }, [aberta]);


  /** Só os documentos obrigatórios precisam estar aprovados (ou aguardando escola). */
  const docsConferidos = useMemo(() => {
    if (!aberta) return false;
    return (aberta.documentos ?? [])
      .filter((d) => d.obrigatorio !== false)
      .every((d) => d.status === "aprovado" || d.status === "aguardando_escola");
  }, [aberta]);


  const executar = async (acao: string, extra: Record<string, unknown> = {}, fechar = false) => {
    if (!aberta) return;
    setAcaoEmCurso(true);
    const { erro } = await chamar(acao, { id: aberta.id, ...extra });
    setAcaoEmCurso(false);
    if (erro) {
      toast({ title: "Não foi possível concluir", description: erro, variant: "destructive" });
      return;
    }
    toast({ title: "Pronto!" });
    if (fechar) setAberta(null);
    carregar();
  };

  const verDoc = async (tipo: string) => {
    if (!aberta) return;
    const { erro, data } = await chamar("doc_url", { id: aberta.id, tipo });
    if (erro || !data?.url) {
      toast({ title: "Arquivo indisponível", variant: "destructive" });
      return;
    }
    window.open(data.url as string, "_blank", "noopener");
  };

  const salvar = async () => {
    await executar("salvar", {
      dados: {
        ...form,
        ...(gratuita ? { valor_matricula: "0" } : {}),
        permite_avista: gratuita ? false : avista,
        permite_parcelado: gratuita ? false : parcelado,
        matricula_gratuita: gratuita,
      },
    });
  };

  return (
    <div className="min-h-screen bg-zampieri-cream/30">
      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-zampieri-green-dark">Matrículas</h1>
            <p className="text-xs text-muted-foreground">
              Documentação, contrato e pagamento das famílias aprovadas na entrevista.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={carregar}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por aluno, responsável ou protocolo"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {carregando ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
          </div>
        ) : (
          <div className="grid gap-3">
            {filtradas.map((m) => (
              <button
                key={m.id}
                onClick={() => abrir(m)}
                className="text-left rounded-lg border border-border bg-white p-4 transition-colors hover:border-zampieri-green-dark"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-zampieri-green-dark truncate">
                      {m.prematricula?.aluno_nome ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.prematricula?.serie_pretendida} · resp. {m.prematricula?.resp_nome}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.matricula_gratuita && (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-medium">
                        Isenta
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES[m.status] ?? "bg-muted"}`}
                    >
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Protocolo {m.prematricula?.protocolo} ·{" "}
                  {m.documentos.filter((d) => d.status === "aprovado").length}/
                  {m.documentos.length} documentos aprovados
                </p>
              </button>
            ))}
            {filtradas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                Nenhuma matrícula encontrada.
              </p>
            )}
          </div>
        )}
      </main>

      <Dialog open={!!aberta} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-background">
          {aberta && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-zampieri-green-dark">
                  {aberta.prematricula?.aluno_nome}
                </DialogTitle>
                <DialogDescription>
                  Protocolo {aberta.prematricula?.protocolo} ·{" "}
                  {STATUS_LABEL[aberta.status] ?? aberta.status}
                  {aberta.prematricula?.desconto_percentual != null &&
                    ` · desconto ${aberta.prematricula.desconto_percentual}%`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Documentos
                  </p>
                  {aberta.documentos.map((d) => (
                    <div
                      key={d.tipo}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{d.label}</p>
                        {d.nome_arquivo && (
                          <p className="text-xs text-muted-foreground truncate">{d.nome_arquivo}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES_DOC[d.status]}`}
                        >
                          {d.status}
                        </span>
                        {d.status !== "pendente" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => verDoc(d.tipo)}>
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acaoEmCurso}
                              onClick={() =>
                                executar("doc_status", { tipo: d.tipo, status: "aprovado" })
                              }
                            >
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={acaoEmCurso}
                              onClick={() =>
                                executar("doc_status", {
                                  tipo: d.tipo,
                                  status: "rejeitado",
                                  motivo: "Documento ilegível ou incorreto. Reenvie, por favor.",
                                })
                              }
                            >
                              Rejeitar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      className="bg-zampieri-green-dark hover:bg-zampieri-green"
                      disabled={acaoEmCurso}
                      onClick={() => executar("aprovar_documentos")}
                    >
                      Aprovar toda a documentação
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={acaoEmCurso || !docsConferidos || !valoresProntos}
                      onClick={() => executar("liberar_dados")}
                    >
                      Liberar contrato (preenchimento dos dados)
                    </Button>

                    <Button
                      variant="outline"
                      disabled={acaoEmCurso}
                      onClick={() => executar("solicitar_reenvio")}
                    >
                      Solicitar reenvio
                    </Button>
                  </div>
                  {!docsConferidos && (
                    <p className="text-xs text-amber-700">
                      Aprove todos os documentos obrigatórios antes de liberar o preenchimento dos
                      dados.
                    </p>
                  )}
                  {docsConferidos && !valoresProntos && (
                    <p className="text-xs text-amber-700">
                      Preencha e salve os valores (anuidade, mensalidade com desconto, dia de
                      vencimento e valor da matrícula) para liberar o preenchimento dos dados.
                    </p>
                  )}

                </section>

                <section className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Dados enviados pela família
                  </p>
                  {aberta.dados_preenchidos_em ? (
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-border p-3 text-sm">
                      {CAMPOS_LEITURA.map(({ campo, label }) => (
                        <p key={campo} className="truncate">
                          <span className="text-muted-foreground">{label}: </span>
                          {String(aberta[campo] ?? "") || "—"}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      A família ainda não preencheu os dados do contrato.
                    </p>
                  )}
                </section>


                <section className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Valores e pagamento
                  </p>
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-zampieri-cream/40 p-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={gratuita}
                      onChange={(e) => setGratuita(e.target.checked)}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    Matrícula gratuita (isenta de cobrança)
                  </label>
                  {gratuita && (
                    <p className="text-xs text-muted-foreground">
                      Sem cobrança: assim que o contrato for assinado, a matrícula é concluída
                      automaticamente.
                    </p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {CAMPOS_VALORES.filter(
                      ({ campo }) =>
                        !gratuita || !["valor_matricula", "max_parcelas"].includes(campo),
                    ).map(({ campo, label }) => (
                      <div key={campo} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          value={form[campo] ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  {!gratuita && (
                    <div className="flex flex-wrap gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={avista}
                          onChange={(e) => setAvista(e.target.checked)}
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                        />
                        Permitir à vista (PIX)
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={parcelado}
                          onChange={(e) => setParcelado(e.target.checked)}
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                        />
                        Permitir parcelado (cartão)
                      </label>
                    </div>
                  )}
                  <Button
                    className="bg-zampieri-green-dark hover:bg-zampieri-green"
                    disabled={acaoEmCurso}
                    onClick={salvar}
                  >
                    Salvar dados
                  </Button>
                </section>

                <section className="space-y-2 rounded-lg border border-border p-4">
                  <p className="text-sm font-medium">Contrato</p>
                  {aberta.contrato_assinado ? (
                    <p className="text-sm text-emerald-700">Contrato assinado pelo responsável.</p>
                  ) : aberta.contrato_gerado && aberta.link_contrato ? (
                    <div className="space-y-2">
                      <a
                        href={aberta.link_contrato}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-zampieri-green-dark underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" /> Link de assinatura
                      </a>
                      <div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={acaoEmCurso}
                          onClick={() => executar("verificar_assinatura")}
                        >
                          <FileText className="w-4 h-4 mr-2" /> Verificar assinatura
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      O contrato é gerado automaticamente quando a família preenche os dados no
                      portal.
                    </p>
                  )}
                  {aberta.data_pagamento && (
                    <p className="text-sm text-emerald-700">
                      Pagamento confirmado em{" "}
                      {new Date(aberta.data_pagamento).toLocaleString("pt-BR")}
                    </p>
                  )}
                </section>

              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatriculaAdmin;
