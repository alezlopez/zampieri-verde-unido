import { useState } from "react";
import { Menu, X } from "lucide-react";
import logoZampieri from "@/assets/logo-zampieri.png";

interface HeaderProps {
  activeSection: string;
}

export const Header = ({ activeSection }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { id: "historia", label: "A Escola" },
    { id: "cursos", label: "Ensino" },
    { id: "horarios", label: "Horários" },
    { id: "depoimentos", label: "Depoimentos" },
    { id: "estrutura", label: "Estrutura" },
    { id: "localizacao", label: "Localização" },
  ];

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50 border-b-[3px] border-zampieri-gold">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoZampieri} alt="Colégio Zampieri" className="h-12 md:h-14 w-auto" />
            <div>
              <h1 className="font-serif text-lg md:text-xl font-bold text-zampieri-green-dark leading-tight">Colégio Zampieri</h1>
              <p className="text-[11px] md:text-xs text-zampieri-green-light tracking-wide">Tradição em Educação · Desde 1980</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-semibold transition-colors hover:text-zampieri-gold ${
                  activeSection === item.id ? "text-zampieri-gold" : "text-zampieri-green-dark"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <a
            href="https://espera.colegiozampieri.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center bg-zampieri-green-dark hover:bg-zampieri-green text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-colors shadow-sm"
          >
            Matrículas 2027
          </a>

          <button
            className="lg:hidden p-2 text-zampieri-green-dark"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 border-t border-zampieri-cream pt-3 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`block w-full text-left py-2 text-sm font-semibold ${
                  activeSection === item.id ? "text-zampieri-gold" : "text-zampieri-green-dark"
                }`}
              >
                {item.label}
              </button>
            ))}
            <a
              href="https://espera.colegiozampieri.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-center bg-zampieri-green-dark text-white font-semibold px-4 py-2.5 rounded-md"
            >
              Matrículas 2027
            </a>
          </nav>
        )}
      </div>
    </header>
  );
};
