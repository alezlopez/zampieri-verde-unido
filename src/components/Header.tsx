
import { useState } from "react";
import { Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  activeSection: string;
}

export const Header = ({ activeSection }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { id: "historia", label: "Nossa História" },
    { id: "estrutura", label: "Nossa Estrutura" },
    { id: "cursos", label: "Nossos Cursos" },
    { id: "horarios", label: "Horários" },
    { id: "localizacao", label: "Localização" },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/be9056bb-e896-44a3-a954-c8d9a754bb4f.png" 
              alt="Colégio Zampieri" 
              className="h-12 w-12"
            />
            <div>
              <h1 className="text-xl font-bold text-green-800">Colégio Zampieri</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-700">Tradição em Educação</p>
                <div className="flex items-center gap-3 text-green-600">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span className="text-sm font-medium">5560-1473</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span className="text-sm font-medium">5560-0723</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Menu */}
          <nav className="hidden md:flex space-x-6">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-medium transition-colors hover:text-green-600 ${
                  activeSection === item.id ? "text-green-600" : "text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t pt-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`block w-full text-left py-2 text-sm font-medium transition-colors hover:text-green-600 ${
                  activeSection === item.id ? "text-green-600" : "text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
};
