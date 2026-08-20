import { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { useAuth, Setor } from "@/contexts/AuthContext";
import NotificacoesBell from "@/components/admin/NotificacoesBell";


interface Props {
  children: ReactNode;
  /** "admin" exige perfil admin; "scan" aceita admin, conferente ou portaria */
  allow?: "admin" | "scan";
  /** Setor exigido — admin sempre passa */
  setor?: Setor;
}

export const RequireAdmin = ({ children, allow = "admin", setor }: Props) => {
  const { isAdmin, canScan, setores, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
      </div>
    );
  }

  const permitido = setor
    ? isAdmin || setores.includes(setor)
    : allow === "scan"
      ? canScan || setores.length > 0
      : isAdmin;


  if (!permitido) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ redirectTo: location.pathname + location.search }}
      />
    );
  }

  const naHome = location.pathname === "/admin";

  return (
    <>
      {children}
      {!naHome && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
          <NotificacoesBell className="bg-white shadow-lg rounded-full h-10 w-10" />
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-full bg-zampieri-green-dark px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
          >
            <LayoutDashboard className="w-4 h-4" />
            Painel Admin
          </Link>
        </div>
      )}
    </>
  );
};


export default RequireAdmin;
