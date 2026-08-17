import { Link } from "react-router-dom";
import { BookOpen, ArrowLeft, GraduationCap, CheckCircle } from "lucide-react";

const LOGO =
  "https://lzdhrtcugqnqmyapgmbs.supabase.co/storage/v1/object/public/zampieri/fotos/Logotipo.png";

const MATERIAIS = [
  {
    etapa: "Educação Infantil",
    icone: "🧸",
    itens: [{ serie: "Pré", valor: 1055.0 }],
  },
  {
    etapa: "Ensino Fundamental I",
    icone: "📚",
    itens: [
      { serie: "1º Ano", valor: 1343.0 },
      { serie: "2º Ano", valor: 1388.0 },
      { serie: "3º Ano", valor: 1467.0 },
      { serie: "4º Ano", valor: 1612.0 },
      { serie: "5º Ano", valor: 1859.0 },
    ],
  },
  {
    etapa: "Ensino Fundamental II",
    icone: "📝",
    itens: [
      { serie: "6º Ano", valor: 2099.0 },
      { serie: "7º Ano", valor: 2099.0 },
      { serie: "8º Ano", valor: 2121.0 },
      { serie: "9º Ano", valor: 2188.0 },
    ],
  },
  {
    etapa: "Ensino Médio",
    icone: "🎓",
    itens: [
      { serie: "1º Médio", valor: 2518.0 },
      { serie: "2º Médio", valor: 2518.0 },
      { serie: "3º Médio", valor: 2518.0 },
    ],
  },
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export default function Materiai2027() {
  return (
    <div className="min-h-screen bg-zampieri-cream text-zampieri-green-dark">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b-[3px] border-zampieri-gold sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={LOGO}
              alt="Colégio Zampieri"
              className="h-12 md:h-14 w-auto"
            />
            <div>
              <h1 className="font-serif text-lg md:text-xl font-bold text-zampieri-green-dark leading-tight">
                Colégio Zampieri
              </h1>
              <p className="text-[11px] md:text-xs text-zampieri-green-light tracking-wide">
                Tradição em Educação · Desde 1980
              </p>
            </div>
          </Link>

          <Link
            to="/rematricula2027"
            className="hidden md:inline-flex items-center bg-zampieri-green-dark hover:bg-zampieri-green text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-colors shadow-sm"
          >
            Rematrícula 2027
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-zampieri-green-dark text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
              <BookOpen className="h-4 w-4" />
              Ano Letivo 2027
            </div>
            <h1 className="font-serif text-3xl md:text-5xl font-bold leading-tight mb-4">
              Valores de Material Didático 2027
            </h1>
            <p className="text-white/80 text-lg md:text-xl leading-relaxed">
              Invista no aprendizado do seu filho com materiais didáticos de
              qualidade, pensados para cada etapa da jornada educacional.
            </p>
          </div>
        </div>
      </section>

      {/* Tabela de valores */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-zampieri-gold/20 overflow-hidden">
              <div className="bg-zampieri-green-dark text-white px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6 text-zampieri-gold" />
                  <h2 className="font-serif text-xl font-bold">
                    Tabela de Valores
                  </h2>
                </div>
                <span className="text-sm text-white/70">2027</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zampieri-cream/50">
                    <tr>
                      <th className="px-6 py-4 font-serif text-zampieri-green-dark font-semibold text-sm uppercase tracking-wide">
                        Etapa de Ensino
                      </th>
                      <th className="px-6 py-4 font-serif text-zampieri-green-dark font-semibold text-sm uppercase tracking-wide">
                        Ano/Série
                      </th>
                      <th className="px-6 py-4 font-serif text-zampieri-green-dark font-semibold text-sm uppercase tracking-wide text-right">
                        Valor do Material
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zampieri-cream/50">
                    {MATERIAIS.map((grupo) =>
                      grupo.itens.map((item, idx) => (
                        <tr
                          key={`${grupo.etapa}-${item.serie}`}
                          className="hover:bg-zampieri-cream/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{grupo.icone}</span>
                              <span className="font-semibold text-zampieri-green-dark">
                                {idx === 0 ? grupo.etapa : " "}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zampieri-green-dark/80 font-medium">
                            {item.serie}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-block bg-zampieri-green-dark/5 text-zampieri-green-dark font-bold text-lg px-4 py-1.5 rounded-lg">
                              {brl(item.valor)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 bg-zampieri-cream/30 border-t border-zampieri-gold/10 text-sm text-zampieri-green-dark/70">
                Valores referentes ao material didático para o ano letivo de 2027.
              </div>
            </div>

            {/* Cards resumo */}
            <div className="grid md:grid-cols-3 gap-5 mt-8">
              <div className="bg-white rounded-xl p-6 shadow-md border border-zampieri-gold/20">
                <div className="text-3xl font-bold text-zampieri-green-dark mb-1">
                  R$ 1.055
                </div>
                <p className="text-sm text-zampieri-green-dark/70">
                  Material do Pré (Educação Infantil)
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-zampieri-gold/20">
                <div className="text-3xl font-bold text-zampieri-green-dark mb-1">
                  R$ 2.188
                </div>
                <p className="text-sm text-zampieri-green-dark/70">
                  Valor máximo do Fundamental II
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-zampieri-gold/20">
                <div className="text-3xl font-bold text-zampieri-green-dark mb-1">
                  R$ 2.518
                </div>
                <p className="text-sm text-zampieri-green-dark/70">
                  Valor do Ensino Médio
                </p>
              </div>
            </div>

            {/* Observações e CTA */}
            <div className="mt-10 bg-zampieri-green-dark rounded-2xl p-8 md:p-10 text-white shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-zampieri-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-serif text-xl font-bold mb-2">
                    Garanta a vaga e o material do seu filho
                  </h3>
                  <p className="text-white/80 leading-relaxed">
                    Faça a rematrícula ou matrícula 2027 e fique em dia com todos
                    os valores. O material didático será entregue no início do
                    ano letivo.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link
                  to="/rematricula2027"
                  className="inline-flex items-center justify-center bg-zampieri-gold hover:bg-zampieri-gold/90 text-white font-bold px-6 py-3.5 rounded-lg transition-colors shadow-md"
                >
                  Rematrícula 2027
                </Link>
                <Link
                  to="/prematricula"
                  className="inline-flex items-center justify-center bg-white hover:bg-white/90 text-zampieri-green-dark font-bold px-6 py-3.5 rounded-lg transition-colors shadow-md"
                >
                  Pré-matrícula 2027
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer simples */}
      <footer className="bg-zampieri-green-dark text-white border-t border-white/10">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a página inicial
          </Link>
          <p className="text-sm text-white/50">
            © 2026 Colégio Zampieri · Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
