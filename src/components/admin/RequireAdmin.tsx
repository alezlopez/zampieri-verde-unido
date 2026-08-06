import { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";


interface Props {
  children: ReactNode;
  /** "admin" exige perfil admin; "scan" aceita admin ou conferente */
  allow?: "admin" | "scan";
}

export const RequireAdmin = ({ children, allow = "admin" }: Props) => {
  const { isAdmin, canScan, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zampieri-green-dark" />
      </div>
    );
  }

  const permitido = allow === "scan" ? canScan : isAdmin;

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
        <Link
          to="/admin"
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-zampieri-green-dark px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
        >
          <LayoutDashboard className="w-4 h-4" />
          Painel Admin
        </Link>
      )}
    </>
  );
};


export default RequireAdmin;
