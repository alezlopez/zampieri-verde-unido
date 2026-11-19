import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, ChevronDown, MapPin, MessageCircle, Phone } from "lucide-react";
import fotoOntem from "@/assets/foto_ontem.jpg";
import fotoHoje from "@/assets/foto_hoje.jpg";
import fotoPlayground from "@/assets/foto_playground.jpg";
import fotoLab from "@/assets/foto_lab.jpg";
import fotoRecreio from "@/assets/foto_recreio.jpg";
import fotoLanche from "@/assets/foto_lanche.jpg";
import { LeadDialog, MAPS_URL, ModoLead } from "@/components/informativo/LeadDialog";
import { capturarUtms } from "@/lib/utm";

const LOGO =
  "https://lzdhrtcugqnqmyapgmbs.supabase.co/storage/v1/object/public/zampieri/fotos/Logotipo.png";

const C = {
  verdeEscuro: "#0F3D24",
  verdeMedio: "#1A5C38",
  verdeClaro: "#2D7A4E",
  vinho: "#8B1A1A",
  dourado: "#B8860B",
  douradoClaro: "#D4A017",
  creme: "#F5F0E8",
  branco: "#FAF8F4",
  whats: "#1FA855",
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const brl0 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type Etapa = { id: string; nome: string; mensalidade: number; descontoMax: number; taxa: number; serie: string };

const ETAPAS: Etapa[] = [
  { id: "pre", nome: "Pré (Educação Infantil)", mensalidade: 1500, descontoMax: 60, taxa: 1500, serie: "Infantil 5 (Pré-Escola)" },
  { id: "1", nome: "1º Ano", mensalidade: 890, descontoMax: 30, taxa: 890, serie: "1º ano" },
  { id: "2a5", nome: "2º ao 5º Ano", mensalidade: 1000, descontoMax: 30, taxa: 1000, serie: "2º ano" },
  { id: "6a9", nome: "6º ao 9º Ano", mensalidade: 1110, descontoMax: 30, taxa: 1110, serie: "6º ano" },
  { id: "em", nome: "Ensino Médio", mensalidade: 1150, descontoMax: 30, taxa: 1150, serie: "1ª série do Ensino Médio" },
];

/** Cards por segmento. O id é a âncora usada nos anúncios (#infantil, #1ano, #fund1, #fund2, #medio). */
const SEGMENTOS = [
  {
    id: "infantil",
    nome: "Educação Infantil",
    series: "Pré (Infantil 5)",
    turno: "Tarde",
    taxa: [1500],
    desconto: 60,
    mensalidade: 1500,
    serie: "Infantil 5 (Pré-Escola)",
  },
  {
    id: "1ano",
    nome: "1º ano",
    series: "Fundamental I",
    turno: "Tarde ou manhã",
    taxa: [890],
    desconto: 30,
    mensalidade: 890,
    serie: "1º ano",
  },
  {
    id: "fund1",
    nome: "Fundamental I",
    series: "2º ao 5º ano",
    turno: "Tarde ou manhã",
    taxa: [1000],
    desconto: 30,
    mensalidade: 1000,
    serie: "2º ano",
  },
  {
    id: "fund2",
    nome: "Fundamental II",
    series: "6º ao 9º ano",
    turno: "Tarde ou manhã",
    taxa: [1110],
    desconto: 30,
    mensalidade: 1110,
    serie: "6º ano",
  },
  {
    id: "medio",
    nome: "Ensino Médio",
    series: "1ª à 3ª série",
    turno: "Tarde ou manhã",
    taxa: [1150],
    desconto: 30,
    mensalidade: 1150,
    serie: "1ª série do Ensino Médio",
  },
];

const MENSALIDADES: [string, number][] = [
  ["Pré", 1500],
  ["1º Ano", 890],
  ["2º ao 5º Ano", 1000],
  ["6º ao 9º Ano", 1110],
  ["1ª a 3ª série EM", 1150],
];

const MATERIAIS: [string, number][] = [
  ["Pré", 1055],
  ["1º Ano", 1343],
  ["2º Ano", 1388],
  ["3º Ano", 1467],
  ["4º Ano", 1612],
  ["5º Ano", 1859],
  ["6º Ano", 2099],
  ["7º Ano", 2099],
  ["8º Ano", 2121],
  ["9º Ano", 2188],
  ["1ª série EM", 2518],
  ["2ª série EM", 2518],
  ["3ª série EM", 2518],
];

const PROVAS = [
  ["750", "famílias em 2026"],
  ["46", "anos de tradição"],
  ["10.000+", "alunos formados"],
  ["3ª", "geração de famílias"],
];

const CONQUISTAS = ["Salas modernizadas", "Laboratório Maker", "Parque e quadra renovados"];
const FUTURO = ["Energia solar", "Reforma da fachada", "Água de reuso"];

const PASSOS = [
  {
    t: "Conversa ou visita",
    d: "Fale com a secretaria pelo WhatsApp ou agende uma visita para conhecer a escola pessoalmente.",
  },
  {
    t: "Entrevista familiar",
    d: "Um encontro para conhecermos sua família e o aluno. É nela que definimos o desconto de admissão.",
  },
  {
    t: "Pré-matrícula online",
    d: "A secretaria envia o link do formulário com os dados da família e do aluno. Leva poucos minutos.",
  },
  {
    t: "Documentos e contrato digital",
    d: "Envio dos documentos pelo portal da família e assinatura digital do contrato. Matrícula concluída.",
  },
];

const FAQ = [
  {
    q: "O que exatamente é gratuito?",
    a: "A taxa de matrícula 2027, que normalmente equivale a uma mensalidade da série. Mensalidades e material didático seguem a tabela de valores desta página.",
  },
  {
    q: "Como é definido o desconto na mensalidade?",
    a: "Na entrevista familiar, conforme a série e a disponibilidade de vagas na turma. O desconto de admissão vai até 60% na Educação Infantil e até 30% do 1º ano ao Ensino Médio.",
  },
  {
    q: "Quais turnos vocês oferecem?",
    a: "Manhã e tarde do 1º ano ao Ensino Médio. A Educação Infantil funciona à tarde. As turmas da tarde têm mais vagas para 2027.",
  },
  {
    q: "Quando a vaga fica garantida?",
    a: "Depois da entrevista familiar, com a pré-matrícula enviada e o contrato assinado. Até lá, a vaga depende da disponibilidade da turma.",
  },
  {
    q: "O material didático está incluído na mensalidade?",
    a: "Não. O material é um valor à parte, por série, como mostra a tabela de valores.",
  },
  {
    q: "Onde fica a escola?",
    a: "Na Rua dos Acarapévas, 80, Balneário São Francisco, Zona Sul de São Paulo. O mapa está no fim desta página.",
  },
];

const Tricolor = () => (
  <div className="flex h-[3px] w-full">
    <div className="flex-1" style={{ background: C.verdeClaro }} />
    <div className="flex-1 bg-white" />
    <div className="flex-1" style={{ background: C.vinho }} />
  </div>
);

const Moldura = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl overflow-hidden ${className}`} style={{ border: `3px solid ${C.dourado}` }}>
    {children}
  </div>
);

const BotaoVisita = ({ onClick, className = "", children = "Agende uma visita" }: { onClick: () => void; className?: string; children?: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-2 rounded-lg font-bold shadow-lg transition-transform hover:scale-[1.02] ${className}`}
    style={{ background: C.douradoClaro, color: C.verdeEscuro }}
  >
    <CalendarCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
    {children}
  </button>
);

const BotaoWhats = ({ onClick, className = "" }: { onClick: () => void; className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-2 rounded-lg font-bold shadow-lg transition-transform hover:scale-[1.02] text-white ${className}`}
    style={{ background: C.whats }}
  >
    <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
    WhatsApp
  </button>
);

const Recolhivel = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <details className="group bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: `${C.dourado}33` }}>
    <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-5 py-4 font-bold [&::-webkit-details-marker]:hidden">
      {titulo}
      <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
    </summary>
    {children}
  </details>
);

export default function InformativoMatricula() {
  const titulo = "font-['Playfair_Display',serif]";
  const [dialogo, setDialogo] = useState<{ modo: ModoLead; serie?: string; remarcar?: boolean; semLead?: boolean } | null>(null);
  const abrir = (modo: ModoLead, serie?: string) => setDialogo({ modo, serie });

  useEffect(() => {
    document.title = "Matrículas 2027 · Colégio Zampieri — taxa de matrícula grátis";
    const desc =
      "Matrículas 2027 abertas no Colégio Zampieri, Zona Sul de SP: taxa de matrícula grátis e desconto de admissão. Da Educação Infantil ao Ensino Médio. Agende uma visita.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    // Âncoras dos anúncios (#infantil, #1ano, #fund1, #fund2, #medio): a página é montada depois do
    // carregamento, então o navegador não rola sozinho até a seção.
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));

    // Link "remarcar" da mensagem de visita cancelada: abre o agendamento direto
    const params = new URLSearchParams(window.location.search);
    if (params.get("remarcar") === "1") setDialogo({ modo: "visita", remarcar: true });
    // Link da secretaria (colegiozampieri.com.br/visita) para quem já está conversando no WhatsApp:
    // abre o agendamento direto e não conta como Lead novo no Meta (a conversa já foi contada)
    else if (params.get("agendar") === "1") {
      capturarUtms();
      setDialogo({ modo: "visita", semLead: params.get("utm_medium") === "secretaria" });
    }
  }, []);

  const [etapaId, setEtapaId] = useState(ETAPAS[3].id);
  const etapa = useMemo(() => ETAPAS.find((e) => e.id === etapaId)!, [etapaId]);
  const [desconto, setDesconto] = useState(etapa.descontoMax);
  useEffect(() => setDesconto(etapa.descontoMax), [etapa]);

  const comDesconto = etapa.mensalidade * (1 - desconto / 100);
  const economiaAno = (etapa.mensalidade - comDesconto) * 12;
  const economiaTotal = economiaAno + etapa.taxa;

  return (
    <div className="min-h-screen" style={{ background: C.branco, color: C.verdeEscuro }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Lato:wght@400;700;900&display=swap"
        rel="stylesheet"
      />
      <Tricolor />

      {/* Cabeçalho */}
      <header className="sticky top-0 z-40 shadow-md" style={{ background: C.verdeEscuro }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={LOGO} alt="Colégio Zampieri" className="h-11 md:h-12 w-auto" />
            <div className="text-white leading-tight hidden min-[380px]:block">
              <p className={`${titulo} text-base md:text-lg font-bold`}>Colégio Zampieri</p>
              <p className="text-[11px] md:text-xs" style={{ color: C.douradoClaro }}>
                Matrículas 2027
              </p>
            </div>
          </div>
          <BotaoVisita onClick={() => abrir("visita")} className="text-xs md:text-sm px-4 py-2.5 md:px-6 md:py-3" />
        </div>
      </header>

      {/* Topo */}
      <section
        className="relative overflow-hidden text-white py-14 md:py-24"
        style={{ background: `radial-gradient(circle at 20% 0%, ${C.verdeMedio} 0%, ${C.verdeEscuro} 60%)` }}
      >
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <p className="text-xs md:text-sm tracking-wide mb-5" style={{ color: C.douradoClaro }}>
            46 anos de tradição · Zona Sul de São Paulo
          </p>
          <h1 className={`${titulo} text-3xl md:text-5xl font-bold leading-tight mb-5`}>
            Matrículas 2027 abertas.{" "}
            <span style={{ color: C.douradoClaro }}>Taxa de matrícula grátis.</span>
          </h1>
          <p className="text-white/85 text-base md:text-xl leading-relaxed mb-8">
            Da Educação Infantil ao Médio · vagas no período da tarde
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <BotaoVisita onClick={() => abrir("visita")} className="text-base md:text-lg px-8 py-4" />
            <BotaoWhats onClick={() => abrir("whatsapp")} className="text-base md:text-lg px-8 py-4" />
          </div>
        </div>
      </section>

      {/* Cards por segmento */}
      <section id="segmentos" className="py-14 md:py-20 scroll-mt-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-3`}>Escolha a etapa do seu filho</h2>
          <p className="text-center text-sm md:text-base opacity-80 mb-10">
            Condições para novos alunos em 2027.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {SEGMENTOS.map((s) => (
              <article
                key={s.id}
                id={s.id}
                className="scroll-mt-24 bg-white rounded-2xl shadow-md border flex flex-col overflow-hidden"
                style={{ borderColor: `${C.dourado}44` }}
              >
                <div className="px-5 py-4 text-white" style={{ background: C.verdeEscuro }}>
                  <h3 className={`${titulo} text-xl font-bold`}>{s.nome}</h3>
                  <p className="text-xs" style={{ color: C.douradoClaro }}>{s.series}</p>
                </div>
                <ul className="px-5 py-4 space-y-3 text-sm flex-1">
                  <li>
                    <span className="block text-[11px] font-black tracking-widest opacity-60">TURNO</span>
                    <span className="font-bold">{s.turno}</span>
                    {s.turno !== "Tarde" && <span className="block text-xs opacity-70">mais vagas à tarde</span>}
                  </li>
                  <li>
                    <span className="block text-[11px] font-black tracking-widest opacity-60">TAXA DE MATRÍCULA</span>
                    <span className="line-through opacity-60">{s.taxa.map(brl0).join(" a ")}</span>{" "}
                    <span className="font-black text-base" style={{ color: C.vinho }}>por R$ 0</span>
                  </li>
                  <li>
                    <span className="block text-[11px] font-black tracking-widest opacity-60">MENSALIDADE</span>
                    <span className="font-bold">com até {s.desconto}% de desconto</span>
                    <span className="block text-xs opacity-70">valor de tabela: {brl0(s.mensalidade)}</span>
                  </li>
                </ul>
                <div className="px-5 pb-5">
                  <BotaoVisita onClick={() => abrir("visita", s.serie)} className="w-full text-sm px-4 py-3">
                    Agendar visita
                  </BotaoVisita>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Ontem e hoje */}
      <section className="pb-14 md:pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {[
              { src: fotoOntem, tag: "ONTEM", alt: "Alunos do Colégio Zampieri de uniforme vermelho, em foto antiga no parque" },
              { src: fotoHoje, tag: "HOJE", alt: "Alunos do Colégio Zampieri em sala de aula atualmente" },
            ].map((f) => (
              <div key={f.tag} className="relative">
                <Moldura>
                  <img src={f.src} alt={f.alt} loading="lazy" className="w-full aspect-[4/5] object-cover" />
                </Moldura>
                <span
                  className="absolute top-3 left-3 text-[11px] font-black tracking-widest px-3 py-1 rounded"
                  style={{ background: C.douradoClaro, color: C.verdeEscuro }}
                >
                  {f.tag}
                </span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8 md:mt-10">
            <p className={`${titulo} text-2xl md:text-3xl font-bold`}>Desde 1980, famílias confiam em nós.</p>
            <p className="text-lg md:text-xl mt-1" style={{ color: C.verdeClaro }}>Em 2027, você vem com a gente?</p>
          </div>
        </div>
      </section>

      {/* Números */}
      <section style={{ background: C.verdeEscuro }} className="py-10 md:py-14 text-white">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-5xl">
          {PROVAS.map(([n, l]) => (
            <div key={l}>
              <div className={`${titulo} text-3xl md:text-4xl font-bold`} style={{ color: C.douradoClaro }}>{n}</div>
              <p className="text-white/70 text-xs md:text-sm mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Estrutura */}
      <section style={{ background: C.creme }} className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-3`}>Uma escola que não para de evoluir</h2>
          <p className="text-center text-sm md:text-base opacity-80 max-w-2xl mx-auto mb-8">
            Todo ano reinvestimos na estrutura. Venha ver de perto.
          </p>
          <Moldura className="mb-10">
            <div className="grid grid-cols-2 gap-[3px]" style={{ background: C.dourado }}>
              {[
                { src: fotoPlayground, alt: "Parque do colégio" },
                { src: fotoLab, alt: "Laboratório Maker" },
                { src: fotoRecreio, alt: "Área de recreio" },
                { src: fotoLanche, alt: "Espaço de lanche" },
              ].map((f) => (
                <img key={f.alt} src={f.src} alt={f.alt} loading="lazy" className="w-full aspect-square object-cover" />
              ))}
            </div>
          </Moldura>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONQUISTAS.map((c) => (
              <div key={c} className="bg-white rounded-xl p-5 shadow-sm border" style={{ borderColor: `${C.dourado}33` }}>
                <span className="font-black mr-2" style={{ color: C.dourado }}>✓</span>
                <span className="font-bold">{c}</span>
              </div>
            ))}
            {FUTURO.map((c) => (
              <div key={c} className="rounded-xl p-5 border border-dashed" style={{ borderColor: C.verdeClaro, background: "#ffffff80" }}>
                <span className="text-[10px] font-black tracking-widest mr-2" style={{ color: C.verdeClaro }}>EM BREVE</span>
                <span className="font-bold block mt-1">{c}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl p-6 md:p-8 text-white" style={{ background: C.verdeMedio }}>
            <h3 className={`${titulo} text-xl font-bold mb-2`}>Por que as vagas são limitadas?</h3>
            <p className="text-white/85 leading-relaxed text-sm md:text-base">
              Cada turma tem um número máximo de alunos definido pelo projeto pedagógico. Turmas pequenas permitem
              acompanhamento próximo, professor presente e comunicação direta com a família.
            </p>
          </div>
        </div>
      </section>

      {/* Simulador */}
      <section id="simulador" className="py-14 md:py-20 scroll-mt-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-3`}>Simule a economia da sua família</h2>
          <p className="text-center text-sm md:text-base opacity-80 max-w-2xl mx-auto mb-8">
            Além da taxa de matrícula grátis, novos alunos podem ter desconto de admissão na mensalidade: até 60% na
            Educação Infantil e até 30% do 1º ano ao Ensino Médio. O percentual da sua família é definido na entrevista
            familiar, conforme a série e a disponibilidade de vagas na turma.
          </p>

          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border" style={{ borderColor: `${C.dourado}33` }}>
            <label className="block text-sm font-bold mb-2" htmlFor="etapa">Etapa de ensino</label>
            <select
              id="etapa"
              value={etapaId}
              onChange={(e) => setEtapaId(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 mb-6 bg-white"
              style={{ borderColor: `${C.verdeClaro}66` }}
            >
              {ETAPAS.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>

            <div className="flex items-center justify-between text-sm font-bold mb-2">
              <label htmlFor="desc">Desconto de admissão</label>
              <span style={{ color: C.vinho }}>{desconto}%</span>
            </div>
            <input
              id="desc"
              type="range"
              min={0}
              max={etapa.descontoMax}
              step={5}
              value={desconto}
              onChange={(e) => setDesconto(Number(e.target.value))}
              className="w-full accent-[#8B1A1A] mb-6"
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl p-5" style={{ background: C.creme }}>
                <p className="text-xs font-bold opacity-70 mb-1">Mensalidade</p>
                <p className="line-through opacity-60">{brl(etapa.mensalidade)}</p>
                <p className={`${titulo} text-2xl font-bold`} style={{ color: C.verdeMedio }}>{brl(comDesconto)}</p>
              </div>
              <div className="rounded-xl p-5" style={{ background: C.creme }}>
                <p className="text-xs font-bold opacity-70 mb-1">Taxa de matrícula</p>
                <p className="line-through opacity-60">{brl(etapa.taxa)}</p>
                <p className={`${titulo} text-2xl font-bold`} style={{ color: C.verdeMedio }}>R$ 0,00</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl p-6 text-center" style={{ background: `${C.vinho}0f` }}>
              <p className="text-xs font-black tracking-widest mb-1" style={{ color: C.vinho }}>ECONOMIA NO PRIMEIRO ANO</p>
              <p className={`${titulo} text-3xl md:text-5xl font-bold`} style={{ color: C.vinho }}>{brl(economiaTotal)}</p>
              <p className="text-xs opacity-70 mt-2">
                {brl(economiaAno)} nas 12 mensalidades + {brl(etapa.taxa)} da taxa de matrícula
              </p>
            </div>

            <p className="text-xs opacity-70 mt-4">
              Simulação. O desconto da sua família é definido na entrevista familiar.
            </p>
          </div>

          <div className="text-center mt-8">
            <BotaoVisita onClick={() => abrir("formulario", etapa.serie)} className="text-base px-8 py-4">
              Quero saber o desconto da minha família
            </BotaoVisita>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section style={{ background: C.creme }} className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-10`}>Como funciona</h2>
          <ol className="grid sm:grid-cols-2 gap-5">
            {PASSOS.map((p, i) => (
              <li key={p.t} className="rounded-xl p-6 shadow-sm bg-white border" style={{ borderColor: `${C.dourado}22` }}>
                <div
                  className={`${titulo} w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mb-3`}
                  style={{ background: C.verdeMedio }}
                  aria-hidden="true"
                >
                  {i + 1}
                </div>
                <h3 className={`${titulo} text-lg font-bold mb-1`}>{p.t}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{p.d}</p>
              </li>
            ))}
          </ol>
          <div className="text-center mt-8">
            <BotaoVisita onClick={() => abrir("visita")} className="text-base px-8 py-4" />
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-8`}>Valores 2027</h2>
          <div className="space-y-4">
            {[
              { t: "Mensalidades (tabela, sem desconto)", dados: MENSALIDADES },
              { t: "Material didático", dados: MATERIAIS },
            ].map((tab) => (
              <Recolhivel key={tab.t} titulo={tab.t}>
                <table className="w-full text-sm">
                  <tbody>
                    {tab.dados.map(([s, v]) => (
                      <tr key={s} className="border-t" style={{ borderColor: C.creme }}>
                        <td className="px-5 py-3">{s}</td>
                        <td className="px-5 py-3 text-right font-bold">{brl(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Recolhivel>
            ))}
          </div>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section style={{ background: C.creme }} className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-8`}>Perguntas frequentes</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <Recolhivel key={f.q} titulo={f.q}>
                <p className="px-5 pb-5 text-sm opacity-80 leading-relaxed">{f.a}</p>
              </Recolhivel>
            ))}
          </div>
        </div>
      </section>

      {/* Final */}
      <section
        className="text-white py-16 md:py-20"
        style={{ background: `linear-gradient(135deg, ${C.verdeMedio}, ${C.verdeEscuro})` }}
      >
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className={`${titulo} text-2xl md:text-4xl font-bold mb-4`}>Venha conhecer o Zampieri</h2>
            <p className="text-white/80 mb-8 leading-relaxed">
              As vagas por turma são limitadas. Agende uma visita ou fale agora com a secretaria.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <BotaoVisita onClick={() => abrir("visita")} className="text-base md:text-lg px-8 py-4" />
              <BotaoWhats onClick={() => abrir("whatsapp")} className="text-base md:text-lg px-8 py-4" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12 items-stretch">
            <div className="rounded-2xl overflow-hidden border border-white/20 min-h-[260px] bg-white/5">
              <iframe
                title="Mapa: Colégio Zampieri, Rua dos Acarapévas, 80"
                src="https://www.google.com/maps?q=Col%C3%A9gio%20Zampieri%2C%20Rua%20dos%20Acarap%C3%A9vas%2C%2080%2C%20S%C3%A3o%20Paulo&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full min-h-[260px] border-0"
              />
            </div>
            <div className="space-y-4 text-sm md:text-base self-center">
              <p className="flex gap-3">
                <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.douradoClaro }} aria-hidden="true" />
                <span>
                  Rua dos Acarapévas, 80 — Balneário São Francisco, São Paulo/SP
                  <a href={MAPS_URL} target="_blank" rel="noreferrer" className="block font-bold underline mt-1">Como chegar</a>
                </span>
              </p>
              <p className="flex gap-3">
                <Phone className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.douradoClaro }} aria-hidden="true" />
                <a href="tel:+551155601473" className="hover:underline">(11) 5560-1473</a>
              </p>
              <p className="flex gap-3">
                <MessageCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.douradoClaro }} aria-hidden="true" />
                <button type="button" onClick={() => abrir("whatsapp")} className="hover:underline text-left">
                  (11) 93934-1503 (WhatsApp)
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer style={{ background: C.verdeEscuro }} className="text-white">
        <Tricolor />
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Colégio Zampieri" className="h-12 w-auto" />
            <div>
              <p className={`${titulo} font-bold`}>Colégio Zampieri</p>
              <p className="text-xs" style={{ color: C.douradoClaro }}>Tradição em Educação · Desde 1980</p>
            </div>
          </div>
          <a href="mailto:secretaria@colegiozampieri.com.br" className="text-sm text-white/75 hover:text-white">
            secretaria@colegiozampieri.com.br
          </a>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
          © 2026 Colégio Zampieri · <a href="/privacidade" className="underline">Política de privacidade</a>
        </div>
      </footer>

      <LeadDialog
        aberto={!!dialogo}
        modo={dialogo?.modo ?? "visita"}
        serieInicial={dialogo?.serie}
        remarcar={dialogo?.remarcar}
        semLead={dialogo?.semLead}
        aoFechar={() => setDialogo(null)}
      />
    </div>
  );
}
