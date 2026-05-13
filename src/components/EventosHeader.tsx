import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Package, ShoppingBag } from "lucide-react";
import logoZampieri from "@/assets/logo-zampieri.png";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface EventosHeaderProps {
  subtitle?: string;
  actions?: ReactNode;
}

const navItems = [
  { to: "/eventos", label: "Eventos", icon: Calendar, requireAuth: false },
  { to: "/produtos", label: "Produtos", icon: Package, requireAuth: false },
  { to: "/eventos/meus-ingressos", label: "Minhas compras", icon: ShoppingBag, requireAuth: true },
];

export const EventosHeader = ({ subtitle = "Eventos", actions }: EventosHeaderProps) => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const visibleItems = navItems.filter((it) => !it.requireAuth || user);

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

          <nav className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors",
                    active
                      ? "bg-zampieri-green-dark text-white"
                      : "text-zampieri-green-dark hover:bg-zampieri-cream"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {actions && <div className="flex items-center gap-2 flex-wrap justify-end">{actions}</div>}
        </div>

        {/* Mobile nav */}
        <nav className="flex md:hidden items-center gap-1 mt-2 overflow-x-auto -mx-1 px-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors",
                  active
                    ? "bg-zampieri-green-dark text-white"
                    : "text-zampieri-green-dark bg-zampieri-cream/60"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
