import { ArrowDown } from "lucide-react";

// Último instante em que o banner aparece (horário de Brasília). Depois disso ele some sozinho.
// O desconto em si vem dos valores importados em devedores_2027, não desta data.
export const FIM_BLACK_FRIDAY = new Date("2026-11-27T23:59:59-03:00");

export const blackFridayAtiva = (agora = new Date()) => agora <= FIM_BLACK_FRIDAY;

export const BannerBlackFriday = () => (
  <section
    aria-label="Condições de Black Friday para quitar débitos"
    className="rounded-xl overflow-hidden bg-zampieri-green-dark text-white shadow-sm mb-4"
  >
    <div className="p-6 md:p-8">
      <span className="inline-block rounded-full bg-zampieri-gold px-4 py-1.5 text-[11px] font-bold tracking-[0.2em] uppercase text-zampieri-green-dark">
        Black Friday
      </span>
      <h2 className="font-serif text-2xl md:text-[32px] font-bold leading-tight mt-5">
        Coloque tudo em dia e <em className="text-zampieri-gold-light">garanta a rematrícula</em>
      </h2>
      <p className="text-sm md:text-base text-white/90 mt-3 max-w-md">
        Condições exclusivas para quitar seus débitos, válidas só durante a Black Friday.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-6">
        {[
          { rotulo: "À vista", texto: "Desconto especial" },
          { rotulo: "Parcelado", texto: "Em até 12x" },
        ].map((o) => (
          <div key={o.rotulo} className="rounded-xl border border-zampieri-gold/70 p-4">
            <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-zampieri-gold-light">{o.rotulo}</p>
            <p className="font-serif text-lg md:text-2xl font-bold mt-1">{o.texto}</p>
          </div>
        ))}
      </div>
    </div>
    <p className="bg-zampieri-green flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-center">
      Busque pelo telefone ou CPF do responsável e veja suas condições
      <ArrowDown className="w-4 h-4 shrink-0 text-zampieri-gold-light" aria-hidden="true" />
    </p>
  </section>
);
