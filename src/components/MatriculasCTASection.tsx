import { Phone, Mail } from "lucide-react";

export const MatriculasCTASection = () => {
  return (
    <section className="py-16 md:py-24 bg-zampieri-green-dark text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs uppercase tracking-[0.2em] text-zampieri-gold-light font-bold">Faça parte da família Zampieri</span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold mt-3 mb-6">Matrículas 2027</h2>
          <p className="text-base md:text-lg text-white/85 leading-relaxed mb-8 max-w-2xl mx-auto">
            As matrículas para 2027 serão abertas em <strong className="text-zampieri-gold-light">agosto de 2026</strong>. Enquanto isso, agende uma visita, conheça nossa estrutura e proposta pedagógica — e garanta que seu filho esteja na nossa lista de espera.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="tel:+551155601473"
              className="inline-flex items-center gap-2 bg-zampieri-gold hover:bg-zampieri-gold-light text-white font-semibold px-6 py-3 rounded-md transition-colors shadow-lg"
            >
              <Phone className="h-4 w-4" /> 5560-1473
            </a>
            <a
              href="https://wa.me/5511993796214"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-2 border-white/70 hover:bg-white hover:text-zampieri-green-dark text-white font-semibold px-6 py-3 rounded-md transition-colors"
            >
              WhatsApp
            </a>
            <a
              href="mailto:secretaria@colegiozampieri.com.br"
              className="inline-flex items-center gap-2 border-2 border-white/70 hover:bg-white hover:text-zampieri-green-dark text-white font-semibold px-6 py-3 rounded-md transition-colors"
            >
              <Mail className="h-4 w-4" /> Enviar e-mail
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
