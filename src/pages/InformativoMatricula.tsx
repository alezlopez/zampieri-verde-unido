import { useEffect, useMemo, useState } from "react";
import fotoOntem from "@/assets/foto_ontem.jpg.asset.json";
import fotoHoje from "@/assets/foto_hoje.jpg.asset.json";

const LOGO =
  "https://lzdhrtcugqnqmyapgmbs.supabase.co/storage/v1/object/public/zampieri/fotos/Logotipo.png";

const CTA = "https://colegiozampieri.com.br/prematricula";

// Fotos enviadas manualmente — basta substituir os arquivos em /public/fotos/
const FOTOS = {
  ontem: fotoOntem.url,
  hoje: fotoHoje.url,
  playground: "/fotos/foto_playground.jpg",
  lab: "/fotos/foto_lab.jpg",
  recreio: "/fotos/foto_recreio.jpg",
  lanche: "/fotos/foto_lanche.jpg",
};


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

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

type Etapa = { id: string; nome: string; mensalidade: number; descontoMax: number; taxa: number };

const ETAPAS: Etapa[] = [
  { id: "pre", nome: "Pré (Educação Infantil)", mensalidade: 1500, descontoMax: 60, taxa: 1500 },
  { id: "1", nome: "1º Ano", mensalidade: 890, descontoMax: 30, taxa: 890 },
  { id: "2a5", nome: "2º ao 5º Ano", mensalidade: 1000, descontoMax: 30, taxa: 1000 },
  { id: "6a9", nome: "6º ao 9º Ano", mensalidade: 1110, descontoMax: 30, taxa: 1110 },
  { id: "em", nome: "Ensino Médio", mensalidade: 1150, descontoMax: 30, taxa: 1150 },
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

const CONQUISTAS = [
  "Salas modernizadas",
  "Laboratório Maker",
  "Parque e quadra renovados",
];
const FUTURO = ["Energia solar", "Reforma da fachada", "Água de reuso"];

const PASSOS = [
  {
    t: "Pré-matrícula",
    d: "Você preenche o formulário online com os dados da família e do aluno. Leva poucos minutos.",
  },
  {
    t: "Análise e aprovação",
    d: "A secretaria faz a análise e define o desconto de admissão da sua família.",
  },
  {
    t: "Documentação",
    d: "Envio e aprovação dos documentos, tudo online, pelo portal da família.",
  },
  {
    t: "Contrato assinado",
    d: "Assinatura digital do contrato e matrícula concluída. Sem visita obrigatória.",
  },
];

const FAQ = [
  {
    q: "A matrícula é confirmada na hora?",
    a: "Não. A pré-matrícula é o primeiro passo: depois dela, a secretaria faz a análise da família e do aluno antes da confirmação da vaga.",
  },
  {
    q: "O que exatamente é gratuito?",
    a: "A taxa de matrícula 2027 — que normalmente equivale ao valor de uma mensalidade da série. As mensalidades e o material didático seguem a tabela oficial.",
  },
  {
    q: "Essa condição vale para qualquer série?",
    a: "Sim, vale para novos alunos da Educação Infantil ao Ensino Médio, enquanto houver vaga na turma escolhida.",
  },
  {
    q: "Preciso morar perto da escola?",
    a: "Não. O colégio fica na Zona Sul de São Paulo e recebe famílias de vários bairros da região.",
  },
  {
    q: "Por que as vagas são limitadas?",
    a: "Porque trabalhamos com turmas pequenas de propósito, para garantir acompanhamento próximo de cada aluno. Não é escassez artificial: é limite pedagógico.",
  },
];

const Tricolor = () => (
  <div className="flex h-[3px] w-full">
    <div className="flex-1" style={{ background: C.verdeClaro }} />
    <div className="flex-1 bg-white" />
    <div className="flex-1" style={{ background: C.vinho }} />
  </div>
);

const Botao = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <a
    href={CTA}
    className={`inline-flex items-center justify-center rounded-lg font-bold shadow-lg transition-transform hover:scale-[1.02] ${className}`}
    style={{ background: C.douradoClaro, color: C.verdeEscuro }}
  >
    {children}
  </a>
);

const Moldura = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-xl overflow-hidden ${className}`}
    style={{ border: `3px solid ${C.dourado}` }}
  >
    {children}
  </div>
);

export default function InformativoMatricula() {
  const titulo = "font-['Playfair_Display',serif]";

  useEffect(() => {
    document.title = "Matrículas 2027 · Colégio Zampieri — sem taxa de matrícula";
    const desc =
      "Matrículas 2027 no Colégio Zampieri: 46 anos de tradição na Zona Sul de SP, taxa de matrícula grátis e desconto de admissão. Simule sua economia.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  const [etapaId, setEtapaId] = useState(ETAPAS[3].id);
  const etapa = useMemo(() => ETAPAS.find((e) => e.id === etapaId)!, [etapaId]);
  const [desconto, setDesconto] = useState(etapa.descontoMax);

  useEffect(() => {
    setDesconto(etapa.descontoMax);
  }, [etapa]);

  const comDesconto = etapa.mensalidade * (1 - desconto / 100);
  const economiaMensal = etapa.mensalidade - comDesconto;
  const economiaAno = economiaMensal * 12;
  const economiaTotal = economiaAno + etapa.taxa;

  return (
    <div className="min-h-screen" style={{ background: C.branco, color: C.verdeEscuro }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Lato:wght@400;700;900&display=swap"
        rel="stylesheet"
      />
      <Tricolor />

      {/* 1. Header */}
      <header className="sticky top-0 z-50 shadow-md" style={{ background: C.verdeEscuro }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Colégio Zampieri" className="h-11 md:h-12 w-auto" />
            <div className="text-white leading-tight">
              <p className={`${titulo} text-base md:text-lg font-bold`}>Colégio Zampieri</p>
              <p className="text-[11px] md:text-xs" style={{ color: C.douradoClaro }}>
                Matrículas 2027
              </p>
            </div>
          </div>
          <Botao className="text-xs md:text-sm px-4 py-2.5 md:px-6 md:py-3">
            Iniciar pré-matrícula
          </Botao>
        </div>
      </header>

      {/* 2. Barra de urgência */}
      <div style={{ background: C.vinho }} className="text-white text-center text-xs md:text-sm px-4 py-2.5 font-semibold">
        ⏳ Vagas limitadas por turma em 2027 — famílias já aguardam em lista de espera
      </div>

      {/* 3. Hero */}
      <section
        className="relative overflow-hidden text-white py-16 md:py-24"
        style={{
          background: `radial-gradient(circle at 20% 0%, ${C.verdeMedio} 0%, ${C.verdeEscuro} 60%)`,
        }}
      >
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <p className="text-xs md:text-sm tracking-wide mb-5" style={{ color: C.douradoClaro }}>
            46 anos de tradição · Educação Infantil ao Ensino Médio · Zona Sul de São Paulo
          </p>
          <h1 className={`${titulo} text-3xl md:text-5xl font-bold leading-tight mb-5`}>
            46 anos formando famílias. Agora, sem taxa de matrícula para 2027.
          </h1>
          <p className="text-white/80 text-base md:text-xl leading-relaxed mb-8">
            Desde 1980 na Zona Sul de São Paulo. Conheça o Colégio Zampieri e veja quanto sua
            família economiza no primeiro ano.
          </p>
          <Botao className="text-base md:text-lg px-8 py-4">Iniciar pré-matrícula 2027</Botao>
          <p className="text-white/60 text-xs md:text-sm mt-4">
            Sem compromisso · Nossa equipe entra em contato após o envio
          </p>
        </div>
      </section>

      {/* 4. Ontem e Hoje */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {[
              { src: FOTOS.ontem, tag: "ONTEM", alt: "foto_ontem.jpg — aluno de uniforme vermelho, arquivo histórico" },
              { src: FOTOS.hoje, tag: "HOJE", alt: "foto_hoje.jpg — alunos com moletom Zampieri atualmente" },
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
            <p className={`${titulo} text-2xl md:text-3xl font-bold`}>
              Desde 1980, famílias confiam em nós.
            </p>
            <p className="text-lg md:text-xl mt-1" style={{ color: C.verdeClaro }}>
              Em 2027, você vem com a gente?
            </p>
          </div>
        </div>
      </section>

      {/* 5. Prova social */}
      <section style={{ background: C.verdeEscuro }} className="py-10 md:py-14 text-white">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-5xl">
          {PROVAS.map(([n, l]) => (
            <div key={l}>
              <div className={`${titulo} text-3xl md:text-4xl font-bold`} style={{ color: C.douradoClaro }}>
                {n}
              </div>
              <p className="text-white/70 text-xs md:text-sm mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Investimento contínuo */}
      <section style={{ background: C.creme }} className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-3`}>
            Uma escola que não para de evoluir
          </h2>
          <p className="text-center text-sm md:text-base opacity-80 max-w-2xl mx-auto mb-8">
            Todo ano reinvestimos na estrutura para que cada aluno estude num espaço melhor do que
            no ano anterior. Veja parte do que já entregamos — e o que vem por aí.
          </p>

          <Moldura className="mb-10">
            <div className="grid grid-cols-2 gap-[3px]" style={{ background: C.dourado }}>
              {[
                { src: FOTOS.playground, alt: "foto_playground.jpg — parque do colégio" },
                { src: FOTOS.lab, alt: "foto_lab.jpg — laboratório maker" },
                { src: FOTOS.recreio, alt: "foto_recreio.jpg — área de recreio" },
                { src: FOTOS.lanche, alt: "foto_lanche.jpg — espaço de lanche" },
              ].map((f) => (
                <img key={f.src} src={f.src} alt={f.alt} loading="lazy" className="w-full aspect-square object-cover" />
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
                <span className="text-[10px] font-black tracking-widest mr-2" style={{ color: C.verdeClaro }}>
                  EM BREVE
                </span>
                <span className="font-bold block mt-1">{c}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl p-6 md:p-8 text-white" style={{ background: C.verdeMedio }}>
            <h3 className={`${titulo} text-xl font-bold mb-2`}>Por que as vagas são limitadas?</h3>
            <p className="text-white/85 leading-relaxed text-sm md:text-base">
              Porque cada turma tem um número máximo de alunos definido pelo projeto pedagógico.
              Turmas pequenas permitem acompanhamento próximo, professor presente e comunicação
              direta com a família. Não é escassez artificial — é o limite que garante a qualidade
              que nos trouxe até aqui.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Matrícula grátis */}
      <section
        className="text-white py-14 md:py-20"
        style={{
          background: C.verdeEscuro,
          borderTop: `6px solid ${C.dourado}`,
          borderBottom: `6px solid ${C.dourado}`,
        }}
      >
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <span
            className="inline-block text-[11px] font-black tracking-widest px-4 py-1.5 rounded-full mb-5"
            style={{ background: C.vinho }}
          >
            CONDIÇÃO EXCLUSIVA 2027
          </span>
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold mb-4`}>
            Taxa de matrícula:{" "}
            <span className="line-through opacity-60 font-normal">de R$ 890 a R$ 1.500</span>{" "}
            <span style={{ color: C.douradoClaro }}>R$ 0</span>
          </h2>
          <p className="text-white/80 leading-relaxed">
            A taxa de matrícula normalmente equivale ao valor de uma mensalidade da série. Para
            novos alunos em 2027, ela é zero. Além disso, sua família ainda pode receber o desconto
            de admissão na mensalidade — simule abaixo quanto isso representa no ano.
          </p>
        </div>
      </section>

      {/* 8. Simulador */}
      <section style={{ background: C.creme }} className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-8`}>
            Simule a economia da sua família
          </h2>

          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border" style={{ borderColor: `${C.dourado}33` }}>
            <label className="block text-sm font-bold mb-2" htmlFor="etapa">
              Etapa de ensino
            </label>
            <select
              id="etapa"
              value={etapaId}
              onChange={(e) => setEtapaId(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 mb-6 bg-white"
              style={{ borderColor: `${C.verdeClaro}66` }}
            >
              {ETAPAS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
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
                <p className={`${titulo} text-2xl font-bold`} style={{ color: C.verdeMedio }}>
                  {brl(comDesconto)}
                </p>
              </div>
              <div className="rounded-xl p-5" style={{ background: C.creme }}>
                <p className="text-xs font-bold opacity-70 mb-1">Taxa de matrícula</p>
                <p className="line-through opacity-60">{brl(etapa.taxa)}</p>
                <p className={`${titulo} text-2xl font-bold`} style={{ color: C.verdeMedio }}>
                  R$ 0,00
                </p>
              </div>
              <div className="rounded-xl p-5 border" style={{ borderColor: `${C.dourado}55` }}>
                <p className="text-xs font-bold opacity-70 mb-1">Economia na mensalidade (12 meses)</p>
                <p className="text-xl font-bold">{brl(economiaAno)}</p>
              </div>
              <div className="rounded-xl p-5 border" style={{ borderColor: `${C.dourado}55` }}>
                <p className="text-xs font-bold opacity-70 mb-1">Economia da taxa de matrícula</p>
                <p className="text-xl font-bold">{brl(etapa.taxa)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl p-6 text-center" style={{ background: `${C.vinho}0f` }}>
              <p className="text-xs font-black tracking-widest mb-1" style={{ color: C.vinho }}>
                ECONOMIA TOTAL NO PRIMEIRO ANO
              </p>
              <p className={`${titulo} text-3xl md:text-5xl font-bold`} style={{ color: C.vinho }}>
                {brl(economiaTotal)}
              </p>
            </div>

            <p className="text-xs opacity-70 mt-4">
              Simulação com o desconto máximo possível. O percentual final depende da análise de
              crédito (passo 2 do processo).
            </p>
          </div>

          <div className="text-center mt-8">
            <Botao className="text-base px-8 py-4">Quero garantir essa condição</Botao>
          </div>
        </div>
      </section>

      {/* 9. Como funciona */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-3`}>
            Como funciona
          </h2>
          <p className="text-center text-sm opacity-75 mb-10">
            Todo o processo é 100% online, sem visita obrigatória.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {PASSOS.map((p, i) => (
              <div key={p.t} className="rounded-xl p-6 shadow-sm bg-white border" style={{ borderColor: `${C.dourado}22` }}>
                <div
                  className={`${titulo} w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mb-3`}
                  style={{ background: C.verdeMedio }}
                >
                  {i + 1}
                </div>
                <h3 className={`${titulo} text-lg font-bold mb-1`}>{p.t}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Valores 2027 */}
      <section style={{ background: C.creme }} className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-8`}>
            Valores 2027
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { t: "Mensalidades", dados: MENSALIDADES },
              { t: "Material didático", dados: MATERIAIS },
            ].map((tab) => (
              <div key={tab.t} className="bg-white rounded-2xl shadow-md overflow-hidden border" style={{ borderColor: `${C.dourado}22` }}>
                <div className="px-5 py-4 text-white" style={{ background: C.verdeEscuro }}>
                  <h3 className={`${titulo} font-bold`}>{tab.t}</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {tab.dados.map(([s, v]) => (
                      <tr key={s} className="border-t" style={{ borderColor: `${C.creme}` }}>
                        <td className="px-5 py-3">{s}</td>
                        <td className="px-5 py-3 text-right font-bold">{brl(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <p className="text-xs opacity-70 mt-4 text-center">
            Tabela completa de referência — os mesmos valores usados na simulação acima.
          </p>
        </div>
      </section>

      {/* 11. FAQ */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold text-center mb-8`}>
            Perguntas frequentes
          </h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-xl p-5 bg-white shadow-sm border" style={{ borderColor: `${C.dourado}22` }}>
                <h3 className="font-bold mb-1">{f.q}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. CTA final */}
      <section
        className="text-white py-16 md:py-20 text-center"
        style={{ background: `linear-gradient(135deg, ${C.verdeMedio}, ${C.verdeEscuro})` }}
      >
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className={`${titulo} text-2xl md:text-4xl font-bold mb-4`}>
            Comece a conhecer o Zampieri hoje
          </h2>
          <p className="text-white/80 mb-8 leading-relaxed">
            As vagas por turma são limitadas e já existem famílias na lista de espera. Envie sua
            pré-matrícula e garanta a análise da sua família para 2027.
          </p>
          <Botao className="text-base md:text-lg px-10 py-4">Iniciar pré-matrícula 2027</Botao>
        </div>
      </section>

      {/* 13. Footer */}
      <footer style={{ background: C.verdeEscuro }} className="text-white">
        <Tricolor />
        <div className="container mx-auto px-4 py-10 grid md:grid-cols-2 gap-6 items-center">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Colégio Zampieri" className="h-12 w-auto" />
            <div>
              <p className={`${titulo} font-bold`}>Colégio Zampieri</p>
              <p className="text-xs" style={{ color: C.douradoClaro }}>
                Tradição em Educação · Desde 1980
              </p>
            </div>
          </div>
          <div className="text-sm text-white/75 space-y-1 md:text-right">
            <p>Rua dos Acarapévas, 80 — Balneário São Francisco, São Paulo/SP</p>
            <p>
              <a href="tel:+551155601473" className="hover:text-white">(11) 5560-1473</a>
            </p>
            <p>
              <a href="mailto:secretaria@colegiozampieri.com.br" className="hover:text-white">
                secretaria@colegiozampieri.com.br
              </a>
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
          © 2026 Colégio Zampieri · Todos os direitos reservados
        </div>
      </footer>
    </div>
  );
}
