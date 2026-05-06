import { MapPin, Phone, Mail, Clock, ArrowUpRight } from "lucide-react";

export const LocationSection = () => {
  return (
    <section id="localizacao" className="py-16 md:py-24 bg-zampieri-cream">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-zampieri-gold font-bold">Onde estamos</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-zampieri-green-dark mt-3">Venha nos conhecer</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6 border border-zampieri-cream-light">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-zampieri-green-dark text-zampieri-gold-light flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-zampieri-gold font-bold mb-1">Endereço</div>
                    <p className="text-zampieri-green-dark font-medium">
                      Rua dos Acarapévas, 80<br />
                      Balneário São Francisco · São Paulo – SP
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-zampieri-cream-light">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-zampieri-green-dark text-zampieri-gold-light flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-zampieri-gold font-bold mb-1">Telefones</div>
                    <a href="tel:+551155601473" className="block text-zampieri-green-dark font-medium hover:text-zampieri-gold">(11) 5560-1473</a>
                    <a href="tel:+551155600723" className="block text-zampieri-green-dark font-medium hover:text-zampieri-gold">(11) 5560-0723</a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-zampieri-cream-light">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-zampieri-green-dark text-zampieri-gold-light flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-zampieri-gold font-bold mb-1">E-mail</div>
                    <a href="mailto:secretaria@colegiozampieri.com.br" className="text-zampieri-green-dark font-medium hover:text-zampieri-gold break-all">
                      secretaria@colegiozampieri.com.br
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-zampieri-cream-light">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-zampieri-green-dark text-zampieri-gold-light flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-zampieri-gold font-bold mb-1">Horário</div>
                    <p className="text-zampieri-green-dark font-medium">Segunda a sexta · 7h30 às 17h30</p>
                  </div>
                </div>
              </div>

              <a
                href="https://www.google.com/maps/search/Rua+dos+Acarapevas+80+Balneario+Sao+Francisco+Sao+Paulo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-zampieri-gold hover:bg-zampieri-gold-light text-white font-semibold px-5 py-3 rounded-md transition-colors"
              >
                Ver rotas no Google Maps <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="rounded-2xl overflow-hidden shadow-lg border border-zampieri-cream-light min-h-[400px]">
              <iframe
                src="https://www.google.com/maps?q=Rua+dos+Acarapevas+80+Balneario+Sao+Francisco+Sao+Paulo&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 400 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização Colégio Zampieri"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
