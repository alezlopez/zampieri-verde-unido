import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logoZampieri from "@/assets/logo-zampieri.png";
import { supabase } from "@/integrations/supabase/client";
import { StepBusca } from "@/components/rematricula/StepBusca";
import { StepIdentidade } from "@/components/rematricula/StepIdentidade";
import { StepAluno } from "@/components/rematricula/StepAluno";
import { StepResponsavel } from "@/components/rematricula/StepResponsavel";
import { StepCurso } from "@/components/rematricula/StepCurso";
import { StepSucesso } from "@/components/rematricula/StepSucesso";
import {
  AlunoCompleto,
  AlunoResumo,
  ResponsavelForm,
  emptyResponsavel,
} from "@/components/rematricula/types";
import { brToIso, isoToBr, maskCep, maskCpf, maskTelefone, onlyDigits } from "@/components/rematricula/utils";

type Fase = "busca" | "identidade" | "aluno" | "mae" | "pai" | "curso" | "sucesso";

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
  const [fase, setFase] = useState<Fase>("busca");
  const [resumo, setResumo] = useState<AlunoResumo | null>(null);
  const [aluno, setAluno] = useState<AlunoCompleto | null>(null);
  const [dataIso, setDataIso] = useState("");

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
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);


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
    setFase("aluno");
  };

  const proximaDepoisAluno = () => setFase(incluiMae ? "mae" : incluiPai ? "pai" : "curso");
  const proximaDepoisMae = () => setFase(incluiPai ? "pai" : "curso");
  const voltarDeCurso = () => setFase(incluiPai ? "pai" : incluiMae ? "mae" : "aluno");
  const voltarDePai = () => setFase(incluiMae ? "mae" : "aluno");

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
      const msg = res?.message;
      setErroSalvar(
        msg === "sem_vagas" || msg === "turno_indisponivel"
          ? "O turno escolhido não tem mais vagas. Selecione outro turno."
          : "Não foi possível salvar agora. Tente novamente em instantes."
      );
      return;
    }
    setFase("sucesso");

    const { data: contrato } = await supabase.functions.invoke("zapsign-gerar-contrato", {
      body: { id_aluno: aluno.id_aluno, data_nascimento: dataIso },
    });
    setLinkContrato((contrato as { sign_url?: string } | null)?.sign_url ?? null);
  };


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
                setFase("identidade");
              }}
            />
          )}

          {fase === "identidade" && resumo && (
            <StepIdentidade aluno={resumo} onVoltar={() => setFase("busca")} onLiberado={abrirAluno} />
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
              onVoltar={() => setFase("identidade")}
              onAvancar={proximaDepoisAluno}
            />
          )}

          {fase === "mae" && (
            <StepResponsavel
              titulo="Dados da mãe"
              descricao="Complete os campos que estiverem em branco."
              form={mae}
              travados={travMae}
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
