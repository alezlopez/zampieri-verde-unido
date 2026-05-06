import { Check } from "lucide-react";

export const HistorySection = () => {
  const values = [
    "Inovação constante",
    "Ambiente acolhedor",
    "Pensamento crítico",
    "Arte e cultura",
    "Formação cidadã",
    "Excelência acadêmica",
  ];

  return (
    <section id="historia" className="py-16 md:py-24 bg-zampieri-cream">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs uppercase tracking-[0.2em] text-zampieri-gold font-bold">Nossa história</span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-zampieri-green-dark mt-3 mb-8 leading-tight">
            46 anos formando gerações
          </h2>

          <div className="space-y-5 text-zampieri-green-dark/85 text-base md:text-lg leading-relaxed">
            <p>
              Desde 1980, o Colégio Zampieri transforma vidas com educação de qualidade. Nosso compromisso é evoluir junto com o mundo, investindo constantemente em inovação, estrutura e ensino de excelência.
            </p>
            <p>
              Aqui, o aluno aprende a pensar, questionar e agir. Nossa missão é formar cidadãos conscientes, preparados para enfrentar os desafios da sociedade com conhecimento, criatividade e atitude.
            </p>
            <p>
              Acreditamos que arte, cultura e vivência são parte essencial do aprendizado. Promovemos atividades que despertam talentos, desenvolvem habilidades e enriquecem a formação dos nossos alunos.
            </p>
          </div>

          <div className="inline-flex items-center gap-3 bg-zampieri-wine text-white px-5 py-2.5 rounded-full mt-8 text-sm font-semibold">
            <span className="font-serif text-base">1980</span>
            <span className="opacity-50">·</span>
            <span>Fundação — 46 anos de história</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10">
            {values.map((v) => (
              <div key={v} className="flex items-center gap-3 bg-white rounded-md px-4 py-3 border border-zampieri-cream-light shadow-sm">
                <div className="h-7 w-7 rounded-full bg-zampieri-green-dark text-zampieri-gold-light flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4" />
                </div>
                <span className="font-semibold text-zampieri-green-dark">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
