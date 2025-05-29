
import { useState, useEffect } from "react";
import { GraduationCap, ArrowRight } from "lucide-react";

export const EnrollmentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      // Mostra a faixa após rolar 200px
      setIsVisible(scrollPosition > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    // Dispara o evento para abrir o chat
    window.dispatchEvent(new CustomEvent('openChat'));
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white shadow-lg cursor-pointer transform transition-all duration-300 hover:shadow-xl"
      onClick={handleClick}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center space-x-3 animate-pulse">
          <GraduationCap className="h-5 w-5" />
          <span className="font-bold text-sm md:text-base tracking-wide">
            MATRÍCULAS ABERTAS, APROVEITE!
          </span>
          <ArrowRight className="h-4 w-4 animate-bounce" />
        </div>
      </div>
      
      {/* Efeito de brilho */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full animate-[shimmer_2s_infinite]" />
    </div>
  );
};
