import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Mail, MessageCircle, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LinhaFollowup {
  id_aluno: number;
  nome_aluno: string;
  curso_atual: string | null;
  curso_2027: string | null;
  turno_escolhido: string | null;
  responsavel_financeiro: string | null;
  contrato_gerado: boolean;
  contrato_assinado: boolean;
  rematricula_concluida: boolean;
  link_contrato: string | null;
  checkout_url: string | null;
  checkout_criado_em: string | null;
  updated_at: string | null;
  qtd_alteracoes: number;
  nome_pai: string | null;
  celular_pai: string | null;
  email_pai: string | null;
  nome_mae: string | null;
  celular_mae: string | null;
  email_mae: string | null;
}

type Etapa = "nao_iniciou" | "preenchendo" | "nao_assinou" | "nao_pagou";

const ETAPAS: { id: Etapa; titulo: string; descricao: string; cor: string }[] = [
  {
    id: "nao_iniciou",
    titulo: "Não iniciou",
    descricao: "Nenhum acesso ou dado atualizado até agora",
    cor: "bg-muted text-muted-foreground",
  },
  {
    id: "preenchendo",
    titulo: "Começou e parou",
    descricao: "Atualizou dados, mas não chegou a gerar o contrato",
    cor: "bg-amber-100 text-amber-900",
  },
  {
    id: "nao_assinou",
    titulo: "Contrato não assinado",
    descricao: "Contrato gerado, aguardando assinatura",
    cor: "bg-orange-100 text-orange-900",
  },
  {
    id: "nao_pagou",
    titulo: "Assinou e não pagou",
    descricao: "Contrato assinado, pagamento pendente",
    cor: "bg-red-100 text-red-900",
  },
];

const etapaDe = (l: LinhaFollowup): Etapa | null => {
  if (l.rematricula_concluida) return null;
  if (l.contrato_assinado) return "nao_pagou";
  if (l.contrato_gerado) return "nao_assinou";
  if (l.qtd_alteracoes > 0 || l.turno_escolhido) return "preenchendo";
  return "nao_iniciou";
};

const diasDesde = (iso: string | null) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

const wa = (tel: string | null) => {
  const d = (tel || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
};

const Contato = ({
  nome,
  celular,
  email,
  papel,
}: {
  nome: string | null;
  celular: string | null;
  email: string | null;
  papel: string;
}) => {
  if (!nome && !celular && !email) return null;
  const link = wa(celular);
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{papel}: </span>
      <span className="font-medium">{nome || "—"}</span>
      <span className="ml-2 inline-flex items-center gap-2">
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-zampieri-green-dark underline"
          >
            <MessageCircle className="w-3 h-3" />
            {celular}
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1 text-muted-foreground underline"
          >
            <Mail className="w-3 h-3" />
            {email}
          </a>
        )}
      </span>
    </div>
  );
};

const Rematricula2027Followup = () => {
  const { , loading: authLoading , podeAcessar } = useAuth();
  const [linhas, setLinhas] = useState<LinhaFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("nao_pagou");

  useEffect(() => {
    document.title = "Follow-up — Rematrícula 2027";
  }, []);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("rematricula_2027_admin_listagem");
    setLinhas((data as unknown as LinhaFollowup[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (podeAcessar("rematricula")) carregar();
  }, [podeAcessar("rematricula")]);

  const porEtapa = useMemo(() => {
    const mapa: Record<Etapa, LinhaFollowup[]> = {
      nao_iniciou: [],
      preenchendo: [],
      nao_assinou: [],
      nao_pagou: [],
    };
    linhas.forEach((l) => {
      const e = etapaDe(l);
      if (e) mapa[e].push(l);
    });
    return mapa;
  }, [linhas]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return porEtapa[etapa]
      .filter(
        (l) =>
          !termo ||
          l.nome_aluno.toLowerCase().includes(termo) ||
          String(l.id_aluno).includes(termo),
      )
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  }, [porEtapa, etapa, busca]);

  if (authLoading || !podeAcessar("rematricula")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
      </div>
    );
  }

  const etapaAtual = ETAPAS.find((e) => e.id === etapa)!;

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/rematricula2027/admin"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-zampieri-green-dark"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar ao painel
            </Link>
            <h1 className="font-serif text-2xl font-bold text-zampieri-green-dark">
              Follow-up da Rematrícula 2027
            </h1>
            <p className="text-sm text-muted-foreground">
              Quem parou no meio do processo, por etapa, com os contatos para acompanhamento.
            </p>
          </div>
          <Button variant="outline" onClick={carregar} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Atualizar
          </Button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ETAPAS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEtapa(e.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                etapa === e.id
                  ? "border-zampieri-green-dark bg-white ring-1 ring-zampieri-green-dark"
                  : "border-border bg-white hover:border-zampieri-green-dark"
              }`}
            >
              <p className="text-xs text-muted-foreground">{e.titulo}</p>
              <p className="text-2xl font-bold text-zampieri-green-dark">
                {porEtapa[e.id].length}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-zampieri-green-dark">{etapaAtual.titulo}</h2>
              <p className="text-xs text-muted-foreground">{etapaAtual.descricao}</p>
            </div>
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou ID"
                className="pl-9"
              />
            </div>
          </div>

          {loading && (
            <p className="py-8 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline" />
            </p>
          )}

          {!loading && lista.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum aluno nesta etapa.
            </p>
          )}

          <div className="space-y-3">
            {lista.map((l) => {
              const dias = diasDesde(l.updated_at);
              const diasCheckout = diasDesde(l.checkout_criado_em);
              return (
                <div
                  key={l.id_aluno}
                  className="rounded-lg border border-border p-3 md:flex md:items-start md:justify-between md:gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zampieri-green-dark">{l.nome_aluno}</p>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${etapaAtual.cor}`}>
                        {etapaAtual.titulo}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ID {l.id_aluno} · {l.curso_atual || "—"} → {l.curso_2027 || "—"}
                      {l.turno_escolhido ? ` · ${l.turno_escolhido}` : ""}
                    </p>
                    <Contato
                      papel="Mãe"
                      nome={l.nome_mae}
                      celular={l.celular_mae}
                      email={l.email_mae}
                    />
                    <Contato
                      papel="Pai"
                      nome={l.nome_pai}
                      celular={l.celular_pai}
                      email={l.email_pai}
                    />
                  </div>

                  <div className="mt-3 md:mt-0 md:text-right space-y-1 shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {dias === null
                        ? "Sem atividade registrada"
                        : dias === 0
                        ? "Atualizado hoje"
                        : `Última atividade há ${dias} dia${dias > 1 ? "s" : ""}`}
                    </p>
                    {etapa === "nao_pagou" && l.checkout_criado_em && (
                      <p className="text-xs text-muted-foreground">
                        Checkout criado há {diasCheckout} dia{diasCheckout === 1 ? "" : "s"}
                      </p>
                    )}
                    <div className="flex md:justify-end gap-3">
                      {l.link_contrato && (
                        <a
                          href={l.link_contrato}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-zampieri-green-dark underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Contrato
                        </a>
                      )}
                      {etapa === "nao_pagou" && l.checkout_url && (
                        <a
                          href={l.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-zampieri-green-dark underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Checkout
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Rematricula2027Followup;
