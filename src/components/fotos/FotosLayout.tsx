import { ReactNode } from "react";
import { useSemIndexacao } from "@/hooks/useSemIndexacao";
import { Link } from "react-router-dom";
import logoZampieri from "@/assets/logo-zampieri.png";
import { Footer } from "@/components/Footer";

export const FotosLayout = ({ children }: { children: ReactNode }) => {
  useSemIndexacao();
  return (
    <div className="min-h-screen flex flex-col bg-zampieri-cream/40">
      <header className="bg-white border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" aria-label="Colégio Zampieri — página inicial">
            <img src={logoZampieri} alt="Colégio Zampieri" className="h-10 w-auto" />
          </Link>
          <Link to="/fotos" className="text-sm font-semibold text-zampieri-green-dark hover:underline">
            Álbuns de fotos
          </Link>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6 md:py-10">{children}</main>
      <Footer />
    </div>
  );
};
