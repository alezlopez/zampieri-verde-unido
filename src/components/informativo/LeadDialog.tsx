import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, MapPin, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { SERIES, SERIE_PRE, turnosPorSerie } from "@/components/prematricula/types";
import { erroDaFunction, mensagemDaFunction } from "@/lib/mensagensErro";
import { idsMeta, novoEventId, utmsGuardadas } from "@/lib/utm";

export type ModoLead = "visita" | "whatsapp" | "formulario";

export const WHATSAPP_ESCOLA = "5511939341503";
export const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Col%C3%A9gio+Zampieri+Rua+dos+Acarap%C3%A9vas+80+S%C3%A3o+Paulo";

export const linkWhatsApp = (mensagem: string) =>
  `https://wa.me/${WHATSAPP_ESCOLA}?text=${encodeURIComponent(mensagem)}`;

const segmentoDaSerie = (serie: string) => {
  if (serie.startsWith("Infantil")) return "infantil";
  if (serie.includes("Ensino Médio")) return "medio";
  const ano = Number(serie.match(/^(\d)º ano/)?.[1]);
  if (ano === 1) return "1ano";
  if (ano >= 2 && ano <= 5) return "fund1";
  if (ano >= 6 && ano <= 9) return "fund2";
  return "";
};

const pixel = (evento: string, params: Record<string, string>, eventId: string) => {
  try {
    window.fbq?.("track", evento, params, { eventID: eventId });
  } catch {
    // pixel bloqueado: o servidor envia o mesmo evento pela API de Conversões
  }
};

const mascaraTelefone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const TITULOS: Record<ModoLead, { t: string; d: string; botao: string }> = {
  visita: {
    t: "Agende uma visita",
    d: "Conheça a escola pessoalmente. Preencha e escolha o melhor dia e horário.",
    botao: "Escolher dia e horário",
  },
  whatsapp: {
    t: "Fale com a secretaria",
    d: "Preencha e continue a conversa no WhatsApp, com a mensagem já pronta.",
    botao: "Abrir o WhatsApp",
  },
  formulario: {
    t: "Descubra o desconto da sua família",
    d: "O percentual é definido na entrevista familiar. Deixe seu contato e a secretaria chama você no WhatsApp.",
    botao: "Quero ser chamado",
  },
};

type Slot = { inicio: string; texto: string };
type Etapa = "dados" | "horarios" | "agendado" | "recebido" | "whatsapp";

const diaDoSlot = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const horaDoSlot = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

interface Props {
  aberto: boolean;
  modo: ModoLead;
  serieInicial?: string;
  /** Família remarcando uma visita cancelada pela escola: não conta como Lead novo no Meta. */
  remarcar?: boolean;
  /** Contato que já está no WhatsApp com a secretaria: não envia Lead ao Meta. */
  semLead?: boolean;
  aoFechar: () => void;
}

export const LeadDialog = ({ aberto, modo, serieInicial, remarcar, semLead, aoFechar }: Props) => {
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [serie, setSerie] = useState("");
  const [turno, setTurno] = useState("Tarde");
  const [empresa, setEmpresa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [lead, setLead] = useState<{ id: string | null; ref: string | null }>({ id: null, ref: null });
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [escolhido, setEscolhido] = useState("");
  const [agendadoTexto, setAgendadoTexto] = useState("");

  // Cada abertura começa do formulário, mantendo o que a pessoa já digitou
  useEffect(() => {
    if (!aberto) return;
    setEtapa("dados");
    setErro("");
    setEscolhido("");
    if (serieInicial) setSerie(serieInicial);
  }, [aberto, serieInicial, modo]);

  const turnos = useMemo(() => turnosPorSerie(serie || null), [serie]);
  useEffect(() => {
    if (!turnos.includes(turno)) setTurno(turnos.includes("Tarde") ? "Tarde" : turnos[0]);
  }, [turnos, turno]);

  const primeiroNome = nome.trim().split(/\s+/)[0] || "";
  const mensagemWhats = (ref: string | null, extra = "") =>
    `Olá, sou ${nome.trim()} e gostaria de informações sobre ${serie}${turno ? ` (${turno.toLowerCase()})` : ""}.` +
    extra +
    (ref ? `\n\nref ${ref}` : "");

  const carregarHorarios = async () => {
    setSlots(null);
    const { data, error } = await supabase.functions.invoke("lead-site", { body: { acao: "horarios" } });
    if (error || !data?.ok) {
      setErro(await mensagemDaFunction(error, data));
      setSlots([]);
      return;
    }
    setSlots(data.slots as Slot[]);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    const digitos = whats.replace(/\D/g, "");
    if (nome.trim().length < 2) return setErro("Informe seu nome.");
    if (digitos.length < 10) return setErro("Informe o WhatsApp com DDD.");
    if (!serie) return setErro("Escolha a série pretendida.");

    // No WhatsApp, a janela é aberta no clique (antes da resposta) para o navegador não bloquear
    const janela = modo === "whatsapp" ? window.open("", "_blank") : null;

    setEnviando(true);
    const eventId = novoEventId();
    const { fbp, fbc } = idsMeta();
    const { data, error } = await supabase.functions.invoke("lead-site", {
      body: {
        acao: "criar",
        origem: modo,
        nome,
        whatsapp: digitos,
        serie,
        turno,
        empresa,
        remarcar: !!remarcar,
        sem_lead: !!semLead,
        utm: utmsGuardadas(),
        meta_event_id: eventId,
        fbp,
        fbc,
        page_url: window.location.href,
        pagina: window.location.pathname + window.location.hash,
        referrer: document.referrer ? document.referrer.slice(0, 300) : null,
      },
    });
    setEnviando(false);

    const ok = !error && data?.ok;
    if (ok && !data.repetido && !remarcar && !semLead) {
      pixel(modo === "whatsapp" ? "Contact" : "Lead", {
        content_name: modo === "whatsapp" ? "whatsapp" : modo === "visita" ? "agendar-visita" : "formulario-curto",
        segmento: segmentoDaSerie(serie),
      }, eventId);
    }
    const ref = ok ? (data.ref as string | null) : null;
    setLead({ id: ok ? (data.lead_id as string | null) : null, ref });

    if (modo === "whatsapp") {
      // Mesmo se o registro falhar, a família não perde o contato: o WhatsApp abre igual
      const link = linkWhatsApp(mensagemWhats(ref));
      if (janela) janela.location.href = link;
      else window.location.href = link;
      setEtapa("whatsapp");
      return;
    }

    if (!ok) {
      setErro(await mensagemDaFunction(error, data));
      return;
    }
    if (modo === "visita") {
      setEtapa("horarios");
      carregarHorarios();
    } else {
      setEtapa("recebido");
    }
  };

  const agendar = async () => {
    if (!escolhido || !lead.id) return;
    setErro("");
    setEnviando(true);
    const eventId = novoEventId();
    const { data, error } = await supabase.functions.invoke("lead-site", {
      body: { acao: "agendar", lead_id: lead.id, inicio: escolhido, meta_event_id: eventId, page_url: window.location.href },
    });
    setEnviando(false);
    if (error || !data?.ok) {
      const msg = await erroDaFunction(error, data);
      if (String(msg).includes("horario_indisponivel")) {
        setErro("Esse horário acabou de ser preenchido. Escolha outro.");
        setEscolhido("");
        carregarHorarios();
      } else setErro(await mensagemDaFunction(error, data));
      return;
    }
    pixel("Schedule", { content_name: "visita", segmento: segmentoDaSerie(serie) }, eventId);
    setAgendadoTexto(data.texto as string);
    setEtapa("agendado");
  };

  const porDia = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots ?? []) m.set(diaDoSlot(s.inicio), [...(m.get(diaDoSlot(s.inicio)) ?? []), s]);
    return [...m.entries()];
  }, [slots]);

  const cab =
    remarcar && modo === "visita"
      ? {
          ...TITULOS.visita,
          t: "Remarque sua visita",
          d: "Sua visita anterior foi cancelada pela escola. Preencha e escolha um novo dia e horário.",
        }
      : TITULOS[modo];
  const campo = "w-full rounded-lg border border-[#2D7A4E66] px-4 py-3 bg-white text-[#0F3D24] focus:outline-none focus:ring-2 focus:ring-[#D4A017]";
  const botaoPrincipal =
    "w-full inline-flex items-center justify-center gap-2 rounded-lg font-bold px-6 py-3.5 bg-[#D4A017] text-[#0F3D24] hover:brightness-105 disabled:opacity-60";
  const botaoWhats =
    "w-full inline-flex items-center justify-center gap-2 rounded-lg font-bold px-6 py-3.5 bg-[#1FA855] text-white hover:brightness-105";

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto bg-[#FAF8F4] text-[#0F3D24]">
        {etapa === "dados" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-['Playfair_Display',serif] text-2xl">{cab.t}</DialogTitle>
              <DialogDescription>{cab.d}</DialogDescription>
            </DialogHeader>
            <form onSubmit={enviar} className="space-y-4 mt-2" noValidate>
              <div>
                <label htmlFor="lead-nome" className="block text-sm font-bold mb-1">Nome do responsável</label>
                <input id="lead-nome" className={campo} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" maxLength={150} />
              </div>
              <div>
                <label htmlFor="lead-whats" className="block text-sm font-bold mb-1">WhatsApp</label>
                <input
                  id="lead-whats"
                  className={campo}
                  value={whats}
                  onChange={(e) => setWhats(mascaraTelefone(e.target.value))}
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(11) 90000-0000"
                />
              </div>
              <div>
                <label htmlFor="lead-serie" className="block text-sm font-bold mb-1">Série pretendida em 2027</label>
                <select id="lead-serie" className={campo} value={serie} onChange={(e) => setSerie(e.target.value)}>
                  <option value="">Selecione</option>
                  {SERIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend className="block text-sm font-bold mb-1">Turno</legend>
                <div className="flex gap-2">
                  {["Manhã", "Tarde"].map((t) => {
                    const disponivel = turnos.includes(t);
                    return (
                      <label
                        key={t}
                        className={`flex-1 text-center rounded-lg border px-3 py-2.5 text-sm font-bold cursor-pointer ${
                          turno === t ? "bg-[#0F3D24] text-white border-[#0F3D24]" : "bg-white border-[#2D7A4E66]"
                        } ${disponivel ? "" : "opacity-40 cursor-not-allowed"}`}
                      >
                        <input type="radio" name="turno" value={t} className="sr-only" checked={turno === t} disabled={!disponivel} onChange={() => setTurno(t)} />
                        {t}
                        <span className="block text-[10px] font-normal opacity-80">{t === "Tarde" ? "mais vagas" : "vagas limitadas"}</span>
                      </label>
                    );
                  })}
                </div>
                {serie === SERIE_PRE && <p className="text-xs opacity-70 mt-1">A Educação Infantil funciona à tarde.</p>}
              </fieldset>
              {/* Armadilha para robôs: invisível para pessoas */}
              <input
                type="text"
                name="empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />
              {erro && <p role="alert" className="text-sm text-[#8B1A1A] font-semibold">{erro}</p>}
              <button type="submit" disabled={enviando} className={modo === "whatsapp" ? botaoWhats : botaoPrincipal}>
                {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : modo === "whatsapp" ? <MessageCircle className="w-5 h-5" /> : modo === "visita" ? <CalendarCheck className="w-5 h-5" /> : null}
                {cab.botao}
              </button>
              <p className="text-[11px] opacity-60 text-center">
                Usamos seus dados só para falar sobre a matrícula. Veja a{" "}
                <a href="/privacidade" target="_blank" rel="noreferrer" className="underline">política de privacidade</a>.
              </p>
            </form>
          </>
        )}

        {etapa === "horarios" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-['Playfair_Display',serif] text-2xl">Escolha o dia e horário</DialogTitle>
              <DialogDescription>A visita dura cerca de 45 minutos. Rua dos Acarapévas, 80.</DialogDescription>
            </DialogHeader>
            {slots === null ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" aria-label="Carregando horários" /></div>
            ) : slots.length === 0 ? (
              <div className="space-y-4 py-2">
                <p className="text-sm">
                  {erro || "No momento não há horários abertos pelo site. A secretaria já recebeu seu contato e vai combinar a visita com você pelo WhatsApp."}
                </p>
                <a href={linkWhatsApp(mensagemWhats(lead.ref, " Quero agendar uma visita."))} target="_blank" rel="noreferrer" className={botaoWhats}>
                  <MessageCircle className="w-5 h-5" /> Combinar pelo WhatsApp
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {porDia.map(([dia, lista]) => (
                  <div key={dia}>
                    <p className="text-sm font-bold mb-2 first-letter:uppercase">{dia}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {lista.map((s) => (
                        <button
                          key={s.inicio}
                          type="button"
                          onClick={() => setEscolhido(s.inicio)}
                          aria-pressed={escolhido === s.inicio}
                          className={`rounded-lg border px-2 py-2.5 text-sm font-bold ${
                            escolhido === s.inicio ? "bg-[#0F3D24] text-white border-[#0F3D24]" : "bg-white border-[#2D7A4E66] hover:border-[#0F3D24]"
                          }`}
                        >
                          {horaDoSlot(s.inicio)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {erro && <p role="alert" className="text-sm text-[#8B1A1A] font-semibold">{erro}</p>}
                <div className="sticky bottom-0 bg-[#FAF8F4] pt-2 pb-1">
                  <button type="button" onClick={agendar} disabled={!escolhido || enviando} className={botaoPrincipal}>
                    {enviando && <Loader2 className="w-5 h-5 animate-spin" />}
                    Confirmar visita
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {etapa === "agendado" && (
          <div className="text-center space-y-4 py-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-[#2D7A4E]" />
            <DialogTitle className="font-['Playfair_Display',serif] text-2xl">Visita agendada!</DialogTitle>
            <DialogDescription className="text-base text-[#0F3D24]">
              {primeiroNome ? `${primeiroNome}, te esperamos` : "Te esperamos"} <strong>{agendadoTexto}</strong> na Rua dos Acarapévas, 80 — Balneário São Francisco.
            </DialogDescription>
            <p className="text-sm opacity-80">Confirme pelo WhatsApp para falar direto com a secretaria.</p>
            <a
              href={linkWhatsApp(mensagemWhats(lead.ref, ` Agendei uma visita para ${agendadoTexto}.`))}
              target="_blank"
              rel="noreferrer"
              className={botaoWhats}
            >
              <MessageCircle className="w-5 h-5" /> Confirmar pelo WhatsApp
            </a>
            <a href={MAPS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-bold underline">
              <MapPin className="w-4 h-4" /> Como chegar
            </a>
          </div>
        )}

        {etapa === "recebido" && (
          <div className="text-center space-y-4 py-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-[#2D7A4E]" />
            <DialogTitle className="font-['Playfair_Display',serif] text-2xl">Recebemos seu contato!</DialogTitle>
            <DialogDescription className="text-base text-[#0F3D24]">
              A secretaria vai chamar você no WhatsApp. Se preferir, adiante a conversa ou já agende a visita.
            </DialogDescription>
            <a href={linkWhatsApp(mensagemWhats(lead.ref, " Quero saber o desconto da minha família."))} target="_blank" rel="noreferrer" className={botaoWhats}>
              <MessageCircle className="w-5 h-5" /> Falar agora no WhatsApp
            </a>
            <button
              type="button"
              className={botaoPrincipal}
              onClick={() => {
                setEtapa("horarios");
                carregarHorarios();
              }}
            >
              <CalendarCheck className="w-5 h-5" /> Agendar uma visita
            </button>
          </div>
        )}

        {etapa === "whatsapp" && (
          <div className="text-center space-y-4 py-2">
            <MessageCircle className="w-12 h-12 mx-auto text-[#1FA855]" />
            <DialogTitle className="font-['Playfair_Display',serif] text-2xl">Abrimos o WhatsApp</DialogTitle>
            <DialogDescription className="text-base text-[#0F3D24]">
              É só enviar a mensagem que já está pronta. Se o WhatsApp não abriu, toque abaixo.
            </DialogDescription>
            <a href={linkWhatsApp(mensagemWhats(lead.ref))} target="_blank" rel="noreferrer" className={botaoWhats}>
              <MessageCircle className="w-5 h-5" /> Abrir o WhatsApp
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
