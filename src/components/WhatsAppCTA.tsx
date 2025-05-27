
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppCTAProps {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export const WhatsAppCTA = ({ variant = "default", size = "default", className = "" }: WhatsAppCTAProps) => {
  const handleClick = () => {
    window.open("https://wa.me/551193796214", "_blank");
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={`bg-green-600 hover:bg-green-700 text-white font-semibold ${className}`}
    >
      <MessageCircle className="h-5 w-5 mr-2" />
      Fale agora com a gente
    </Button>
  );
};
