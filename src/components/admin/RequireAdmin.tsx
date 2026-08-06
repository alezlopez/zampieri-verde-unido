import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
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

  return <>{children}</>;
};

export default RequireAdmin;
