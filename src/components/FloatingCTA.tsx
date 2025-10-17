
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FloatingCTA = () => {
  const handleClick = () => {
    window.open("https://espera.colegiozampieri.com.br", "_blank");
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
      <Button
        onClick={handleClick}
        size="lg"
        className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-2xl rounded-full px-4 py-4 md:px-6 md:py-6 transition-all duration-300 text-sm md:text-base"
      >
        <MessageCircle className="h-5 w-5 md:h-6 md:w-6 md:mr-2" />
        <span className="hidden md:inline">Fale agora com a gente</span>
        <span className="md:hidden ml-2">Fale conosco</span>
      </Button>
    </div>
  );
};
