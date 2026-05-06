import { Phone, Mail, MapPin, ExternalLink } from "lucide-react";

export const TopBar = () => {
  return (
    <div className="hidden lg:block bg-zampieri-green-dark text-white text-xs">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/90">
          <MapPin className="h-3.5 w-3.5 text-zampieri-gold" />
          <span>Rua dos Acarapévas, 80 — Balneário São Francisco, São Paulo</span>
        </div>
        <div className="flex items-center gap-5 text-white/90">
          <a href="tel:+551155601473" className="flex items-center gap-1.5 hover:text-zampieri-gold transition-colors">
            <Phone className="h-3.5 w-3.5" /> (11) 5560-1473
          </a>
          <a href="tel:+551155600723" className="flex items-center gap-1.5 hover:text-zampieri-gold transition-colors">
            <Phone className="h-3.5 w-3.5" /> (11) 5560-0723
          </a>
          <a href="mailto:secretaria@colegiozampieri.com.br" className="flex items-center gap-1.5 hover:text-zampieri-gold transition-colors">
            <Mail className="h-3.5 w-3.5" /> secretaria@colegiozampieri.com.br
          </a>
          <a href="https://espera.colegiozampieri.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-zampieri-gold hover:text-zampieri-gold-light transition-colors font-semibold">
            Portal do Aluno <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
