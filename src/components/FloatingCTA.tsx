
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FloatingCTA = () => {
  const handleClick = () => {
    window.open("https://wa.me/551193796214", "_blank");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleClick}
        size="lg"
        className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-2xl rounded-full px-6 py-6 animate-pulse hover:animate-none transition-all duration-300"
      >
        <MessageCircle className="h-6 w-6 mr-2" />
        Fale agora com a gente
      </Button>
    </div>
  );
};
