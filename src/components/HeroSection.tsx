import { Sparkles } from "lucide-react";

export const HeroSection = () => {
  const stats = [
    { value: "46+", label: "Anos de tradição" },
    { value: "+10 mil", label: "Alunos formados" },
    { value: "2.000m²", label: "Área total" },
    { value: "3", label: "Níveis de ensino" },
    { value: "Zona Sul", label: "São Paulo – SP" },
  ];

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="inicio" className="relative overflow-hidden bg-gradient-to-br from-zampieri-green-dark via-zampieri-green to-zampieri-green-light text-white">
      {/* Diagonal wine block - desktop only */}
      <div className="hidden md:block absolute top-0 right-0 h-full w-[42%] bg-zampieri-wine [clip-path:polygon(20%_0,100%_0,100%_100%,0%_100%)] opacity-95">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_30%,white_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>
      {/* Gold separator stripe */}
      <div className="hidden md:block absolute top-0 right-[42%] h-full w-1 bg-zampieri-gold translate-x-[-2px] [transform:skewX(-20deg)]" />

      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-28 relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-zampieri-gold/40 text-zampieri-gold-light px-4 py-1.5 rounded-full text-xs md:text-sm tracking-wider uppercase font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Tradição em Educação · Desde 1980
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6">
            Formando<br />
            <em className="not-italic md:italic text-zampieri-gold-light font-semibold">caráter</em> e<br />
            conhecimento
          </h1>

          <p className="text-base md:text-lg text-white/85 leading-relaxed mb-8 max-w-2xl font-light">
            Da Educação Infantil ao Ensino Médio, o Colégio Zampieri transforma vidas com educação de excelência, inovação e o acolhimento único de uma escola família.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => scrollTo("historia")}
              className="bg-zampieri-gold hover:bg-zampieri-gold-light text-white font-semibold px-6 py-3 rounded-md transition-colors shadow-lg"
            >
              Conheça a escola
            </button>
            <a
              href="https://espera.colegiozampieri.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white/70 hover:bg-white hover:text-zampieri-green-dark text-white font-semibold px-6 py-3 rounded-md transition-colors"
            >
              Matrículas 2027
            </a>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative z-10 bg-white shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.3)]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-zampieri-cream">
            {stats.map((s, i) => (
              <div key={i} className="py-5 md:py-6 px-3 text-center">
                <div className="font-serif text-xl md:text-2xl lg:text-3xl font-bold text-zampieri-green-dark">{s.value}</div>
                <div className="text-[11px] md:text-xs text-zampieri-green-light tracking-wide uppercase mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
