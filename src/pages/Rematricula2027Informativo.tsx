import { useEffect, useMemo, useState } from "react";

const LOGO =
  "https://lzdhrtcugqnqmyapgmbs.supabase.co/storage/v1/object/public/zampieri/fotos/Logotipo.png";
const CTA = "https://colegiozampieri.com.br/rematricula2027";

const C = {
  verdeEscuro: "#0F3D24",
  verdeMedio: "#1A5C38",
  verdeClaro: "#2D7A4E",
  vinho: "#8B1A1A",
  dourado: "#B8860B",
  douradoClaro: "#D4A017",
  creme: "#F5F0E8",
  branco: "#FAF8F4",
};

type Fase = {
  n: number;
  inicio: Date;
  fim: Date;
  desconto: number;
  premio: string;
  numeros: number;
  sorteio: string;
};

const FASES: Fase[] = [
  {
    n: 1,
    inicio: new Date(2026, 7, 24),
    fim: new Date(2026, 8, 9, 23, 59, 59),
    desconto: 50,
    premio: "Bolsa Integral de 100% para 2027 (sorteio)",
    numeros: 6,
    sorteio: "10/09/2026",
  },
  {
    n: 2,
    inicio: new Date(2026, 8, 10),
    fim: new Date(2026, 8, 30, 23, 59, 59),
    desconto: 40,
    premio: "Material SAE/Maker (sorteio)",
    numeros: 3,
    sorteio: "01/10/2026",
  },
  {
    n: 3,
    inicio: new Date(2026, 9, 1),
    fim: new Date(2026, 9, 14, 23, 59, 59),
    desconto: 30,
    premio: "Kit uniforme (sorteio)",
    numeros: 2,
    sorteio: "15/10/2026",
  },
  {
    n: 4,
    inicio: new Date(2026, 9, 15),
    fim: new Date(2026, 9, 28, 23, 59, 59),
    desconto: 20,
    premio: "Vale-excursão (sorteio)",
    numeros: 1,
    sorteio: "29/10/2026",
  },
];

const fmtData = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TAXAS = [
  { etapa: "Pré", base: 730, f: [[365, 438], [438, 525.6], [511, 613.2], [584, 700.8]] },
  { etapa: "1º Ano", base: 810, f: [[405, 486], [486, 583.2], [567, 680.4], [648, 777.6]] },
  { etapa: "2º ao 5º Ano", base: 910, f: [[455, 546], [546, 655.2], [637, 764.4], [728, 873.6]] },
  { etapa: "6º ao 9º Ano", base: 1010, f: [[505, 606], [606, 727.2], [707, 848.4], [808, 969.6]] },
  { etapa: "Ensino Médio", base: 1050, f: [[525, 630], [630, 756], [735, 882], [840, 1008]] },
];

const MENSALIDADES = [
  ["Pré", 1500],
  ["1º Ano", 890],
  ["2º ao 5º Ano", 1000],
  ["6º ao 9º Ano", 1110],
  ["1ª a 3ª série EM", 1150],
] as const;

const MATERIAIS = [
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
] as const;

const CONQUISTAS = [
  ["Salas modernizadas", "Ambientes climatizados e equipados para o dia a dia das turmas."],
  ["Laboratório Maker", "Espaço dedicado a robótica, projetos e cultura mão na massa."],
  ["Parque e quadra renovados", "Áreas de convivência e esporte reformadas para os alunos."],
  ["Matrícula 100% digital", "Todo o processo online, do contrato ao pagamento."],
  ["Ampliação do pátio — Prédio 1", "Mais espaço livre para intervalos e atividades."],
  ["Mobiliário renovado", "Carteiras, cadeiras e armários novos nas salas."],
];

const FUTURO = [
  "Reforma da fachada",
  "Energia solar",
  "Água de reuso",
  "Reforma da cantina",
  "Novo piso da quadra",
  "Reforma do pátio — Prédio 2",
];

const FAQ = [
  {
    q: "Quem rematricula antes concorre nos sorteios seguintes?",
    a: "Sim. Famílias rematriculadas em fases anteriores seguem concorrendo aos sorteios das fases seguintes, com os números da sorte já emitidos.",
  },
  {
    q: "O desconto vale para o ano todo?",
    a: "O desconto de fase é aplicado uma única vez, sobre a taxa de rematrícula 2027. Ele não altera o valor da mensalidade 2027, que segue a tabela oficial (com o desconto individual da sua família, se houver).",
  },
  {
    q: "Como consulto meu número da sorte?",
    a: "Pelo portal de consulta em colegiozampieri.com.br/numerosdasorte, com os dados do responsável. Os números também aparecem no portal de transparência.",
  },
  {
    q: "Onde está o regulamento?",
    a: "O regulamento completo da promoção está disponível em colegiozampieri.com.br/rematricula2027/regulamento.",
  },
];

function useFaseAtual() {
  const [hoje, setHoje] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setHoje(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const fase = useMemo(
    () => FASES.find((f) => hoje >= f.inicio && hoje <= f.fim) ?? null,
    [hoje]
  );
  return { hoje, fase };
}

function Contador({ alvo }: { alvo: Date }) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, alvo.getTime() - agora.getTime());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const box = (v: number, l: string) => (
    <div className="flex flex-col items-center rounded-lg bg-[#0F3D24] px-3 py-2 min-w-[62px]">
      <span className="text-2xl font-bold tabular-nums text-[#D4A017]">
        {String(v).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-[#F5F0E8]/80">{l}</span>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {box(d, "dias")}
      {box(h, "hrs")}
      {box(m, "min")}
      {box(s, "seg")}
    </div>
  );
}

const Tricolor = () => (
  <div className="flex h-1.5 w-full">
    <div className="flex-1" style={{ background: C.verdeMedio }} />
    <div className="flex-1 bg-white" />
    <div className="flex-1" style={{ background: C.vinho }} />
  </div>
);

const BotaoCTA = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <a
    href={CTA}
    className={`inline-flex items-center justify-center rounded-full px-8 py-4 font-bold uppercase tracking-wide text-[#0F3D24] shadow-lg transition-transform hover:scale-[1.03] ${className}`}
    style={{ background: `linear-gradient(135deg, ${C.douradoClaro}, ${C.dourado})` }}
  >
    {children}
  </a>
);

export default function Rematricula2027Informativo() {
  const { hoje, fase } = useFaseAtual();
  const proxima = FASES.find((f) => hoje < f.inicio) ?? null;
  const sorteioFase1 = new Date(2026, 8, 9, 23, 59, 59);

  useEffect(() => {
    document.title = "Rematrícula 2027 | Colégio Zampieri";
    const meta = document.querySelector('meta[name="description"]');
    const desc =
      "Rematrícula 2027 do Colégio Zampieri: descontos por fase na taxa, números da sorte e tabela de valores por série.";
    if (meta) meta.setAttribute("content", desc);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Lato:wght@400;700;900&display=swap";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const titulo = "font-['Playfair_Display',serif]";

  return (
    <div
      className="min-h-screen font-['Lato',sans-serif]"
      style={{ background: C.branco, color: C.verdeEscuro }}
    >
      <Tricolor />

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: C.verdeEscuro, borderColor: `${C.dourado}66` }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={LOGO}
              alt="Logotipo do Colégio Zampieri"
              className="h-10 w-auto"
              style={{ aspectRatio: 0.7472 }}
            />
            <div className="leading-tight">
              <p className={`${titulo} text-base text-[#F5F0E8] sm:text-lg`}>Colégio Zampieri</p>
              <p className="text-[11px] uppercase tracking-widest text-[#D4A017]">
                Rematrícula 2027
              </p>
            </div>
          </div>
          <a
            href={CTA}
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0F3D24] sm:px-6 sm:text-sm"
            style={{ background: `linear-gradient(135deg, ${C.douradoClaro}, ${C.dourado})` }}
          >
            Rematricular agora
          </a>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 py-16 text-center sm:py-24"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${C.verdeMedio} 0%, ${C.verdeEscuro} 65%)`,
        }}
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4A017] sm:text-sm">
            45 anos de tradição · 3ª geração de famílias Zampieri
          </p>
          <h1
            className={`${titulo} mt-5 text-3xl font-bold leading-tight text-[#F5F0E8] sm:text-5xl`}
          >
            Sua família já faz parte da história. Não deixe a Fase 1 passar sem garantir seu
            desconto.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-[#F5F0E8]/85 sm:text-lg">
            Quanto antes você rematricula, maior o desconto na taxa de rematrícula 2027 — e mais
            números da sorte sua família recebe.
          </p>

          <div
            className="mx-auto mt-8 inline-flex flex-col items-center gap-1 rounded-2xl border-2 px-6 py-4"
            style={{ borderColor: C.dourado, background: "rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-baseline gap-3">
              <span className="text-lg text-[#F5F0E8]/60 line-through">De R$ 910,00</span>
              <span className={`${titulo} text-3xl font-bold text-[#D4A017] sm:text-4xl`}>
                por R$ 455,00
              </span>
            </div>
            <span className="text-[11px] uppercase tracking-widest text-[#F5F0E8]/70">
              na taxa de rematrícula · 2º ao 5º Ano · Fase 1
            </span>
          </div>

          <div className="mt-9">
            <BotaoCTA className="text-base sm:text-lg">Rematricular agora</BotaoCTA>
            <p className="mt-3 text-xs uppercase tracking-widest text-[#F5F0E8]/70">
              Rematrícula 100% online
            </p>
          </div>
        </div>
      </section>

      {/* Prêmio em destaque */}
      <section
        className="px-4 py-14 text-center"
        style={{
          background: `linear-gradient(160deg, #FFF6DC 0%, ${C.douradoClaro}55 100%)`,
          borderTop: `6px solid ${C.dourado}`,
          borderBottom: `6px solid ${C.dourado}`,
        }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full text-3xl" style={{ background: C.verdeEscuro }}>
            🏆
          </div>
          <span
            className="inline-block rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-white"
            style={{ background: C.vinho }}
          >
            Exclusivo Fase 1
          </span>
          <h2 className={`${titulo} mt-4 text-2xl font-bold sm:text-4xl`}>
            Concorra a 1 Bolsa Integral de 100% para 2027
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed">
            Ao rematricular na Fase 1, sua família recebe <strong>6 números da sorte</strong> para o
            sorteio realizado com base na extração da Loteria Federal de{" "}
            <strong>10/09/2026</strong>.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-xs opacity-70">
            Sorteio entre todas as famílias rematriculadas na Fase 1. As chances variam conforme o
            total de participantes e o total de números emitidos.
          </p>

          <div className="mt-7">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest opacity-70">
              Tempo restante para participar da Fase 1
            </p>
            <Contador alvo={sorteioFase1} />
          </div>

          <div className="mt-8">
            <BotaoCTA>Rematricular agora</BotaoCTA>
          </div>
        </div>
      </section>

      {/* Barra de urgência */}
      <section className="px-4 py-6 text-center text-white" style={{ background: C.vinho }}>
        {fase ? (
          <p className="text-sm font-bold uppercase tracking-wide sm:text-base">
            Fase {fase.n} ativa · {fase.desconto}% off na taxa de rematrícula · {fase.numeros}{" "}
            {fase.numeros === 1 ? "número" : "números"} da sorte ·{" "}
            <span className="text-[#D4A017]">Termina em {fmtData(fase.fim)}</span>
          </p>
        ) : proxima ? (
          <p className="text-sm font-bold uppercase tracking-wide sm:text-base">
            Fase {proxima.n} começa em {fmtData(proxima.inicio)} · {proxima.desconto}% off na taxa de
            rematrícula
          </p>
        ) : (
          <p className="text-sm font-bold uppercase tracking-wide sm:text-base">
            Período promocional de rematrícula encerrado · fale com a secretaria
          </p>
        )}
      </section>

      {/* Nos últimos 5 anos */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className={`${titulo} text-center text-2xl font-bold sm:text-4xl`}>
            Nos últimos 5 anos
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center opacity-75">
            O que já entregamos para as famílias Zampieri.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CONQUISTAS.map(([t, d]) => (
              <div
                key={t}
                className="rounded-xl bg-white p-6 shadow-sm"
                style={{ borderTop: `4px solid ${C.dourado}` }}
              >
                <h3 className={`${titulo} text-lg font-bold`}>{t}</h3>
                <p className="mt-2 text-sm opacity-75">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O que vem por aí */}
      <section className="px-4 py-16" style={{ background: C.creme }}>
        <div className="mx-auto max-w-6xl">
          <h2 className={`${titulo} text-center text-2xl font-bold sm:text-4xl`}>
            O que vem por aí
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FUTURO.map((t) => (
              <div
                key={t}
                className="rounded-xl border bg-white/70 px-5 py-4 text-sm font-bold"
                style={{ borderColor: `${C.verdeClaro}55` }}
              >
                <span style={{ color: C.verdeClaro }}>▸</span> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className={`${titulo} text-center text-2xl font-bold sm:text-4xl`}>Como funciona</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {FASES.map((f) => {
              const ativa = fase?.n === f.n;
              return (
                <div
                  key={f.n}
                  className={`rounded-2xl p-6 transition-all ${ativa ? "-translate-y-1 shadow-xl" : "shadow-sm"}`}
                  style={{
                    background: ativa ? C.verdeEscuro : "#fff",
                    color: ativa ? C.creme : C.verdeEscuro,
                    border: `2px solid ${ativa ? C.dourado : "#0F3D2422"}`,
                  }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: ativa ? C.douradoClaro : C.vinho }}>
                    Fase {f.n} {ativa && "· ativa"}
                  </p>
                  <p className="mt-1 text-sm opacity-80">
                    {fmtData(f.inicio)} a {fmtData(f.fim)}
                  </p>
                  <p className={`${titulo} mt-3 text-4xl font-bold`} style={{ color: ativa ? C.douradoClaro : C.verdeMedio }}>
                    {f.desconto}%
                  </p>
                  <p className="text-xs uppercase tracking-widest opacity-70">off na taxa</p>
                  <p className="mt-4 text-sm font-bold">{f.premio}</p>
                  <p className="mt-1 text-sm opacity-80">
                    {f.numeros} {f.numeros === 1 ? "número" : "números"} da sorte
                  </p>
                  <p className="mt-3 text-xs opacity-70">Sorteio: Loteria Federal {f.sorteio}</p>
                </div>
              );
            })}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-sm opacity-75">
            O desconto é aplicado sobre a taxa de rematrícula 2027 (não sobre a mensalidade).
            Rematriculados em fases anteriores concorrem também aos sorteios das fases seguintes.
          </p>
        </div>
      </section>

      {/* Tabela taxa */}
      <section className="px-4 py-16" style={{ background: C.creme }}>
        <div className="mx-auto max-w-6xl">
          <h2 className={`${titulo} text-center text-2xl font-bold sm:text-4xl`}>
            Taxa de rematrícula 2027, por etapa e por fase
          </h2>
          <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr style={{ background: C.verdeEscuro, color: C.creme }}>
                  <th className="p-3 text-left">Etapa</th>
                  <th className="p-3 text-left">Base 2026</th>
                  {FASES.map((f) => (
                    <th key={f.n} className="p-3 text-left">
                      Fase {f.n} ({f.desconto}%)
                      <span className="block text-[10px] font-normal opacity-70">
                        à vista / parcelado
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TAXAS.map((row, i) => (
                  <tr key={row.etapa} style={{ background: i % 2 ? "#FAF8F4" : "#fff" }}>
                    <td className="p-3 font-bold">{row.etapa}</td>
                    <td className="p-3 opacity-70">R$ {brl(row.base)}</td>
                    {row.f.map(([av, par], idx) => {
                      const ativa = fase?.n === idx + 1;
                      return (
                        <td
                          key={idx}
                          className="p-3"
                          style={{
                            background: ativa ? `${C.douradoClaro}22` : undefined,
                            fontWeight: ativa ? 700 : 400,
                          }}
                        >
                          <span className="mr-2 text-xs opacity-50 line-through">
                            R$ {brl(row.base)}
                          </span>
                          <span style={{ color: C.verdeMedio }}>R$ {brl(av)}</span>
                          <span className="opacity-60"> / R$ {brl(par)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs opacity-70">
            Pagamento à vista tem desconto adicional por antecipação; parcelado é o valor cheio da
            fase dividido em até 12x, sem juros.
          </p>
        </div>
      </section>

      {/* Valores 2027 */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className={`${titulo} text-center text-2xl font-bold sm:text-4xl`}>Valores 2027</h2>
          <p className="mt-3 text-center text-sm opacity-70">
            Mensalidade e material por série, sem o desconto de fase (que vale só para a taxa).
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm" style={{ borderTop: `4px solid ${C.dourado}` }}>
              <h3 className={`${titulo} text-xl font-bold`}>Mensalidade 2027</h3>
              <ul className="mt-4 divide-y">
                {MENSALIDADES.map(([s, v]) => (
                  <li key={s} className="flex justify-between py-2 text-sm">
                    <span>{s}</span>
                    <span className="font-bold">R$ {brl(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm" style={{ borderTop: `4px solid ${C.dourado}` }}>
              <h3 className={`${titulo} text-xl font-bold`}>Material 2027</h3>
              <ul className="mt-4 divide-y">
                {MATERIAIS.map(([s, v]) => (
                  <li key={s} className="flex justify-between py-2 text-sm">
                    <span>{s}</span>
                    <span className="font-bold">R$ {brl(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-center text-sm opacity-75">
            Se sua família já possui desconto especial, o percentual é aplicado sobre esta tabela
            normalmente.
          </p>
        </div>
      </section>

      {/* Pagamento */}
      <section className="px-4 py-16" style={{ background: C.creme }}>
        <div className="mx-auto max-w-4xl">
          <h2 className={`${titulo} text-center text-2xl font-bold sm:text-4xl`}>Pagamento</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm" style={{ border: `2px solid ${C.dourado}` }}>
              <h3 className={`${titulo} text-xl font-bold`}>À vista</h3>
              <p className="mt-2 text-sm opacity-80">
                Desconto adicional por antecipação sobre a taxa de rematrícula da fase vigente.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm" style={{ border: `2px solid ${C.verdeClaro}55` }}>
              <h3 className={`${titulo} text-xl font-bold`}>Parcelado</h3>
              <p className="mt-2 text-sm opacity-80">
                Até 12x sem juros no valor cheio da fase, também referente à taxa de rematrícula.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className={`${titulo} text-center text-2xl font-bold sm:text-4xl`}>
            Perguntas frequentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl bg-white p-5 shadow-sm"
                style={{ borderLeft: `4px solid ${C.verdeMedio}` }}
              >
                <summary className="cursor-pointer list-none font-bold">{f.q}</summary>
                <p className="mt-3 text-sm opacity-80">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section
        className="px-4 py-16 text-center"
        style={{ background: `linear-gradient(135deg, ${C.verdeMedio}, ${C.verdeEscuro})` }}
      >
        <div className="mx-auto max-w-3xl">
          <h2 className={`${titulo} text-2xl font-bold text-[#F5F0E8] sm:text-4xl`}>
            {fase
              ? `A Fase ${fase.n} termina em ${fmtData(fase.fim)} — depois disso, o desconto de ${fase.desconto}% não volta.`
              : proxima
              ? `A Fase ${proxima.n} abre em ${fmtData(proxima.inicio)} com ${proxima.desconto}% off na taxa.`
              : "Fale com a secretaria para garantir a rematrícula do seu filho."}
          </h2>
          <div className="mt-8">
            <BotaoCTA className="text-base sm:text-lg">Rematricular agora</BotaoCTA>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#D4A017] underline">
            <a href="https://colegiozampieri.com.br/rematricula2027/regulamento">
              Regulamento completo
            </a>
            <a href="https://colegiozampieri.com.br/numerosdasorte">Consultar número da sorte</a>
            <a href="https://colegiozampieri.com.br/numerosdasorte/transparencia">
              Transparência dos sorteios
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: C.verdeEscuro }}>
        <Tricolor />
        <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-[#F5F0E8]/85">
          <img src={LOGO} alt="Colégio Zampieri" className="mx-auto h-14 w-auto" />
          <p className="mt-4">Rua dos Acarapévas, 80 · Balneário São Francisco · São Paulo/SP</p>
          <p className="mt-1">(11) 5560-1473 · secretaria@colegiozampieri.com.br</p>
          <p className="mt-4 text-xs opacity-60">
            © {new Date().getFullYear()} Colégio Zampieri · Tradição em educação desde 1980
          </p>
        </div>
        <Tricolor />
      </footer>
    </div>
  );
}
