import { Instagram, ArrowUpRight } from "lucide-react";

export const InstagramSection = () => {
  return (
    <section id="instagram" className="py-16 md:py-20 bg-gradient-to-br from-zampieri-cream-light via-background to-zampieri-cream">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zampieri-green-dark via-zampieri-green to-zampieri-green-light p-8 md:p-12 shadow-xl">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-zampieri-gold/15 blur-2xl" />
            <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-zampieri-wine/20 blur-3xl" />

            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-10 text-center md:text-left">
              <div className="shrink-0">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] p-[3px] shadow-lg">
                  <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Instagram className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={1.5} />
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-zampieri-gold-light text-xs font-semibold tracking-widest uppercase mb-2">
                  Acompanhe nosso dia a dia
                </p>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-white mb-3">
                  Siga o Colégio Zampieri no Instagram
                </h2>
                <p className="text-white/80 text-sm md:text-base mb-6 max-w-xl">
                  Veja os bastidores das aulas, eventos, projetos pedagógicos e os melhores momentos dos nossos alunos.
                </p>

                <a
                  href="https://www.instagram.com/colegio_zampieri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-zampieri-green-dark hover:bg-zampieri-gold-light hover:text-zampieri-green-dark transition-colors px-6 py-3 rounded-full font-semibold shadow-md group"
                >
                  <Instagram className="w-5 h-5" />
                  <span>@colegio_zampieri</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
