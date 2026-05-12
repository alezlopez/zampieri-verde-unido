import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import logoZampieri from "@/assets/logo-zampieri.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <img src={logoZampieri} alt="Colégio Zampieri" className="h-20 w-auto mx-auto mb-6" />
        <p className="font-serif text-7xl md:text-8xl font-bold text-zampieri-gold mb-2">404</p>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-zampieri-green-dark mb-3">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground mb-8">
          A página que você procura não existe ou foi movida.
        </p>
        <Link to="/">
          <Button className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">
            <Home className="w-4 h-4 mr-2" />
            Voltar à página inicial
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
