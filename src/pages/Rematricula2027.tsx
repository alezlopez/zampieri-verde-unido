import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoZampieri from "@/assets/logo-zampieri.png";
import { supabase } from "@/integrations/supabase/client";
import { StepBusca } from "@/components/rematricula/StepBusca";
import { StepCanal, type CanalOtp } from "@/components/rematricula/StepCanal";
import { StepCodigo } from "@/components/rematricula/StepCodigo";
import { StepAluno } from "@/components/rematricula/StepAluno";
import { StepResponsavel } from "@/components/rematricula/StepResponsavel";
import { StepCurso } from "@/components/rematricula/StepCurso";
import { StepSucesso } from "@/components/rematricula/StepSucesso";
import type { StatusRematricula } from "@/components/rematricula/StepPagamento";

import {
  AlunoCompleto,
  AlunoResumo,
  ResponsavelForm,
  emptyResponsavel,
} from "@/components/rematricula/types";
import { brToIso, isoToBr, maskCep, maskCpf, maskTelefone, onlyDigits, rematriculaLiberada } from "@/components/rematricula/utils";
import { RematriculaEmBreve } from "@/components/rematricula/EmBreve";

type Fase = "busca" | "bloqueado" | "canal" | "codigo" | "aluno" | "mae" | "pai" | "curso" | "sucesso";


const temResponsavel = (v?: string | null) => {
  const s = (v || "").trim().toLowerCase();
  return s !== "não" && s !== "nao" && s !== "0" && s !== "false";
};

const carregarResponsavel = (a: AlunoCompleto, tipo: "mae" | "pai"): ResponsavelForm => ({
  nome: (tipo === "mae" ? a.nome_mae : a.nome_pai) || "",
  cpf: maskCpf((tipo === "mae" ? a.cpf_mae : a.cpf_pai) || ""),
  rg: (tipo === "mae" ? a.rg_mae : a.rg_pai) || "",
  estado_civil: (tipo === "mae" ? a.estado_civil_mae : a.estado_civil_pai) || "",
  naturalidade: (tipo === "mae" ? a.naturalidade_mae : a.naturalidade_pai) || "",
  nacionalidade: (tipo === "mae" ? a.nacionalidade_mae : a.nacionalidade_pai) || "",
  cep: maskCep((tipo === "mae" ? a.cep_mae : a.cep_pai) || ""),
  logradouro: (tipo === "mae" ? a.logradouro_mae : a.logradouro_pai) || "",
  numero: (tipo === "mae" ? a.numero_mae : a.numero_pai) || "",
  complemento: (tipo === "mae" ? a.complemento_mae : a.complemento_pai) || "",
  bairro: (tipo === "mae" ? a.bairro_mae : a.bairro_pai) || "",
  cidade: (tipo === "mae" ? a.cidade_mae : a.cidade_pai) || "",
  estado: (tipo === "mae" ? a.estado_mae : a.estado_pai) || "",
  data_nascimento: isoToBr(tipo === "mae" ? a.data_nascimento_mae : a.data_nascimento_pai),
  celular: maskTelefone((tipo === "mae" ? a.celular_mae : a.celular_pai) || ""),
  email: (tipo === "mae" ? a.email_mae : a.email_pai) || "",
});

const travadosDe = (form: ResponsavelForm) =>
  Object.fromEntries(Object.entries(form).map(([k, v]) => [k, !!String(v || "").trim()])) as Partial<
    Record<keyof ResponsavelForm, boolean>
  >;

const Rematricula2027 = () => {
  const [liberada, setLiberada] = useState(rematriculaLiberada);
  const [fase, setFase] = useState<Fase>("busca");
  const [resumo, setResumo] = useState<AlunoResumo | null>(null);
  const [aluno, setAluno] = useState<AlunoCompleto | null>(null);
  const [dataIso, setDataIso] = useState("");
  const [canal, setCanal] = useState<CanalOtp | null>(null);


  const [cpfAluno, setCpfAluno] = useState("");
  const [semCpf, setSemCpf] = useState(false);
  const [mae, setMae] = useState<ResponsavelForm>(emptyResponsavel());
  const [pai, setPai] = useState<ResponsavelForm>(emptyResponsavel());
  const [travMae, setTravMae] = useState<Partial<Record<keyof ResponsavelForm, boolean>>>({});
  const [travPai, setTravPai] = useState<Partial<Record<keyof ResponsavelForm, boolean>>>({});

  const [turno, setTurno] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [linkContrato, setLinkContrato] = useState<string | null>(null);
  const [erroContrato, setErroContrato] = useState<string | null>(null);
  const [gerandoContrato, setGerandoContrato] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [jaAssinado, setJaAssinado] = useState(false);
  const [retomada, setRetomada] = useState(false);
  const [status, setStatus] = useState<StatusRematricula | null>(null);
  const [verificando, setVerificando] = useState(false);

  const aguardandoPagamento = new URLSearchParams(window.location.search).get("pagamento") === "sucesso";

  const carregarStatus = useCallback(
    async (idAluno: number, iso: string) => {
      setVerificando(true);
      // Sincroniza a assinatura direto na ZapSign (fallback caso o webhook não chegue)
      await supabase.functions
        .invoke("zapsign-verificar-assinatura", {
          body: { id_aluno: idAluno, data_nascimento: iso },
        })
        .catch(() => null);

      const { data } = await supabase.rpc("rematricula_2027_status", {
        p_id_aluno: idAluno,
        p_data_nascimento: iso,
      });
      const row = (data as StatusRematricula[] | null)?.[0] ?? null;
      setVerificando(false);
      if (row) {
        setStatus(row);
        if (row.contrato_assinado) setJaAssinado(true);
      }
      return row;
    },
    [],
  );


  // Polling enquanto o contrato não está assinado ou o pagamento não foi confirmado
  useEffect(() => {
    if (fase !== "sucesso" || !aluno || !dataIso) return;
    carregarStatus(aluno.id_aluno, dataIso);
    const t = setInterval(() => {
      setStatus((atual) => {
        if (atual?.rematricula_concluida) return atual;
        carregarStatus(aluno.id_aluno, dataIso);
        return atual;
      });
    }, 10000);
    return () => clearInterval(t);
  }, [fase, aluno, dataIso, carregarStatus]);




  const incluiMae = !!aluno && temResponsavel(aluno.tem_mae);
  const incluiPai = !!aluno && temResponsavel(aluno.tem_pai);

  const etapaAtual = useMemo(() => {
    if (fase === "aluno") return 1;
    if (fase === "mae") return 2;
    if (fase === "pai") return 3;
    if (fase === "curso") return 4;
    return 0;
  }, [fase]);

  const abrirAluno = (dados: AlunoCompleto, iso: string) => {
    setAluno(dados);
    setDataIso(iso);
    setCpfAluno(maskCpf(dados.cpf_aluno || ""));
    setSemCpf(false);
    const m = carregarResponsavel(dados, "mae");
    const p = carregarResponsavel(dados, "pai");
    setMae(m);
    setPai(p);
    setTravMae(travadosDe(m));
    setTravPai(travadosDe(p));
    setTurno(dados.turno_escolhido || "");
    setResponsavel(dados.responsavel_financeiro || "");

    // Contrato já gerado numa visita anterior: pula direto para a assinatura
    if (
      dados.rematricula_concluida ||
      (dados.contrato_gerado && (dados.link_contrato || dados.contrato_assinado))
    ) {

      setLinkContrato(dados.link_contrato ?? null);
      setJaAssinado(!!dados.contrato_assinado);
      setRetomada(true);
      setFase("sucesso");
      return;
    }

    setLinkContrato(null);
    setJaAssinado(false);
    setRetomada(false);
    setFase("aluno");
  };

  const abrirComData = async (iso: string) => {
    if (!resumo) return;
    const { data } = await supabase.rpc("rematricula_2027_abrir", {
      p_id_aluno: resumo.id_aluno,
      p_data_nascimento: iso,
    });
    const row = (data as AlunoCompleto[] | null)?.[0];
    if (row) abrirAluno(row, iso);
  };


  const proximaDepoisAluno = () => setFase(incluiMae ? "mae" : incluiPai ? "pai" : "curso");
  const proximaDepoisMae = () => setFase(incluiPai ? "pai" : "curso");
  const voltarDeCurso = () => setFase(incluiPai ? "pai" : incluiMae ? "mae" : "aluno");
  const voltarDePai = () => setFase(incluiMae ? "mae" : "aluno");

  const gerarContrato = async (idAluno: number, nascimento: string) => {
    setGerandoContrato(true);
    setErroContrato(null);
    const { data: contrato, error } = await supabase.functions.invoke("zapsign-gerar-contrato", {
      body: { id_aluno: idAluno, data_nascimento: nascimento },
    });
    setGerandoContrato(false);

    const resultado = contrato as {
      success?: boolean;
      sign_url?: string;
      error?: string;
      detalhe?: string;
    } | null;

    if (error || resultado?.success === false || !resultado?.sign_url) {
      setErroContrato(
        resultado?.detalhe || resultado?.error || "Não foi possível gerar o contrato agora. Tente novamente.",
      );
      return;
    }

    setLinkContrato(resultado.sign_url);
  };

  const finalizar = async () => {
    if (!aluno) return;
    setSalvando(true);
    setErroSalvar(null);

    const payloadResp = (f: ResponsavelForm, sufixo: "mae" | "pai") => ({
      [`nome_${sufixo}`]: f.nome,
      [`cpf_${sufixo}`]: onlyDigits(f.cpf),
      [`rg_${sufixo}`]: f.rg,
      [`estado_civil_${sufixo}`]: f.estado_civil,
      [`naturalidade_${sufixo}`]: f.naturalidade,
      [`nacionalidade_${sufixo}`]: f.nacionalidade,
      [`cep_${sufixo}`]: onlyDigits(f.cep),
      [`logradouro_${sufixo}`]: f.logradouro,
      [`numero_${sufixo}`]: f.numero,
      [`complemento_${sufixo}`]: f.complemento,
      [`bairro_${sufixo}`]: f.bairro,
      [`cidade_${sufixo}`]: f.cidade,
      [`estado_${sufixo}`]: f.estado,
      [`data_nascimento_${sufixo}`]: brToIso(f.data_nascimento) || "",
      [`celular_${sufixo}`]: onlyDigits(f.celular),
      [`email_${sufixo}`]: f.email,
    });

    const dados: Record<string, string> = {
      cpf_aluno: semCpf ? "" : onlyDigits(cpfAluno),
      turno_escolhido: turno,
      responsavel_financeiro: responsavel,
      ...(incluiMae ? payloadResp(mae, "mae") : {}),
      ...(incluiPai ? payloadResp(pai, "pai") : {}),
    };

    const { data, error } = await supabase.rpc("rematricula_2027_salvar", {
      p_id_aluno: aluno.id_aluno,
      p_data_nascimento: dataIso,
      p_dados: dados,
    });

    setSalvando(false);
    const res = (data as { success: boolean; message: string }[])?.[0];
    if (error || !res?.success) {
      const msg = res?.message ?? "";
      setErroSalvar(
        msg === "sem_vagas" || msg === "turno_indisponivel"
          ? "O turno escolhido não tem mais vagas. Selecione outro turno."
          : msg.startsWith("cpf_invalido")
          ? `CPF inválido em ${msg.split(":")[1]?.replace("cpf_", "").replace("_", " ") ?? "um dos campos"}. Confira os dados.`
          : msg.startsWith("email_invalido")
          ? `E-mail inválido em ${msg.split(":")[1]?.replace("email_", "").replace("_", " ") ?? "um dos campos"}. Confira os dados.`
          : "Não foi possível salvar agora. Tente novamente em instantes."
      );
      return;
    }
    setFase("sucesso");
    await gerarContrato(aluno.id_aluno, dataIso);
  };

  if (!liberada) return <RematriculaEmBreve onAbrir={() => setLiberada(true)} />;

  return (
    <div className="min-h-screen bg-zampieri-cream/30">
      <header className="bg-white border-b-[3px] border-zampieri-gold">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoZampieri} alt="Colégio Zampieri" className="h-11 w-auto" />
            <div>
              <h1 className="font-serif text-base md:text-lg font-bold text-zampieri-green-dark leading-tight">
                Colégio Zampieri
              </h1>
              <p className="text-[11px] md:text-xs text-zampieri-green-light">Rematrícula 2027</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {etapaAtual > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Etapa {etapaAtual} de 4</span>
              {aluno && <span className="truncate max-w-[60%] text-right">{aluno.nome_aluno}</span>}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-zampieri-green-dark transition-all"
                style={{ width: `${(etapaAtual / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        <section className="bg-white rounded-xl border border-border p-5 md:p-6 shadow-sm">
          {fase === "busca" && (
            <StepBusca
              onSelecionar={(a) => {
                setResumo(a);
                setCanal(null);
                setFase(a.rematricula_liberada === true ? "canal" : "bloqueado");
              }}
            />
          )}

          {fase === "bloqueado" && (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-destructive" />
                </span>
                <div>
                  <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">
                    Rematrícula bloqueada por pendências
                  </h2>
                  <p className="text-sm text-foreground mt-1">
                    Identificamos débitos em aberto. Regularize suas mensalidades para liberar a
                    rematrícula 2027 — se preferir, procure a secretaria da escola.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="bg-zampieri-green-dark hover:bg-zampieri-green">
                  <Link to="/renegociacao">Regularizar débitos</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResumo(null);
                    setFase("busca");
                  }}
                >
                  Fazer nova busca
                </Button>
                <Button asChild variant="ghost">
                  <a href="https://wa.me/5511939341503" target="_blank" rel="noopener noreferrer">
                    Falar com a secretaria
                  </a>
                </Button>
              </div>
            </div>
          )}

          {fase === "canal" && resumo && (
            <StepCanal
              aluno={resumo}
              onVoltar={() => setFase("busca")}
              onEnviado={(c) => {
                setCanal(c);
                setFase("codigo");
              }}
            />
          )}

          {fase === "codigo" && resumo && canal && (
            <StepCodigo
              aluno={resumo}
              canal={canal}
              onVoltar={() => setFase("canal")}
              onValidado={abrirComData}
            />
          )}

          {fase === "aluno" && aluno && (
            <StepAluno
              aluno={aluno}
              cpf={cpfAluno}
              semCpf={semCpf}
              onChange={({ cpf, semCpf: s }) => {
                setCpfAluno(cpf);
                setSemCpf(s);
              }}
              onVoltar={() => setFase("busca")}
              onAvancar={proximaDepoisAluno}
            />
          )}

          {fase === "mae" && (
            <StepResponsavel
              titulo="Dados da mãe"
              descricao="Complete os campos que estiverem em branco."
              form={mae}
              travados={travMae}
              idAluno={aluno?.id_aluno ?? 0}
              celularOriginal={maskTelefone(aluno?.celular_mae || "")}
              emailOriginal={aluno?.email_mae || ""}
              onChange={setMae}
              onVoltar={() => setFase("aluno")}
              onAvancar={proximaDepoisMae}
            />
          )}

          {fase === "pai" && (
            <StepResponsavel
              titulo="Dados do pai"
              descricao="Complete os campos que estiverem em branco."
              form={pai}
              travados={travPai}
              idAluno={aluno?.id_aluno ?? 0}
              celularOriginal={maskTelefone(aluno?.celular_pai || "")}
              emailOriginal={aluno?.email_pai || ""}
              onChange={setPai}
              onVoltar={voltarDePai}
              onAvancar={() => setFase("curso")}
            />
          )}



          {fase === "curso" && aluno && (
            <StepCurso
              aluno={aluno}
              turno={turno}
              responsavel={responsavel}
              salvando={salvando}
              erroSalvar={erroSalvar}
              onChange={({ turno: t, responsavel: r }) => {
                setTurno(t);
                setResponsavel(r);
              }}
              onVoltar={voltarDeCurso}
              onFinalizar={finalizar}
            />
          )}

          {fase === "sucesso" && aluno && (
            <StepSucesso
              nomeAluno={aluno.nome_aluno}
              curso={aluno.curso_2027}
              turno={turno}
              linkContrato={linkContrato}
              erroContrato={erroContrato}
              gerandoContrato={gerandoContrato}
              onTentarContrato={() => gerarContrato(aluno.id_aluno, dataIso)}
              jaAssinado={jaAssinado}
              retomada={retomada}
              idAluno={aluno.id_aluno}
              dataNascimento={dataIso}
              status={status}
              verificando={verificando}
              onVerificar={() => carregarStatus(aluno.id_aluno, dataIso)}
              aguardandoPagamento={aguardandoPagamento && !status?.rematricula_concluida}
            />

          )}


        </section>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Dúvidas? Fale com a secretaria pelo{" "}
          <a
            href="https://wa.me/5511939341503"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zampieri-green-dark underline"
          >
            WhatsApp
          </a>
          .
        </p>
      </main>
    </div>
  );
};

export default Rematricula2027;
