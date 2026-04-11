import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MapadaSuaProximaGrandeAventura from "./pages/MapadaSuaProximaGrandeAventura";
import Privacidade from "./pages/Privacidade";
import TermosDeUso from "./pages/TermosDeUso";
import Eventos from "./pages/Eventos";
import EventosLogin from "./pages/EventosLogin";
import EventoCompra from "./pages/EventoCompra";
import EventosAdmin from "./pages/EventosAdmin";
import MeusIngressos from "./pages/MeusIngressos";
import IngressoDetalhe from "./pages/IngressoDetalhe";
import ScannerIngressos from "./pages/ScannerIngressos";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/MapadaSuaProximaGrandeAventura" element={<MapadaSuaProximaGrandeAventura />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/termos" element={<TermosDeUso />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/eventos/login" element={<EventosLogin />} />
            <Route path="/eventos/comprar/:id" element={<EventoCompra />} />
            <Route path="/eventos/admin" element={<EventosAdmin />} />
            <Route path="/eventos/meus-ingressos" element={<MeusIngressos />} />
            <Route path="/eventos/ingresso/:id" element={<IngressoDetalhe />} />
            <Route path="/eventos/admin/scanner" element={<ScannerIngressos />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
