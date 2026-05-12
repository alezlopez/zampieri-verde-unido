import { ReactNode } from "react";
import { Link } from "react-router-dom";
import logoZampieri from "@/assets/logo-zampieri.png";

interface EventosHeaderProps {
  subtitle?: string;
  actions?: ReactNode;
}

export const EventosHeader = ({ subtitle = "Eventos", actions }: EventosHeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm shadow-sm border-b-[3px] border-zampieri-gold">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img
              src={logoZampieri}
              alt="Colégio Zampieri"
              className="h-11 md:h-12 w-auto shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-serif text-base md:text-lg font-bold text-zampieri-green-dark leading-tight truncate">
                Colégio Zampieri
              </h1>
              <p className="text-[11px] md:text-xs text-zampieri-green-light tracking-wide truncate">
                {subtitle}
              </p>
            </div>
          </Link>
          {actions && <div className="flex items-center gap-2 flex-wrap justify-end">{actions}</div>}
        </div>
      </div>
    </header>
  );
};
