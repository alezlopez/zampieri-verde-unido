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
import EventoDetalhe from "./pages/EventoDetalhe";
import EventosAdmin from "./pages/EventosAdmin";
import EventosRelatorio from "./pages/EventosRelatorio";
import MeusIngressos from "./pages/MeusIngressos";
import IngressoDetalhe from "./pages/IngressoDetalhe";
import ScannerIngressos from "./pages/ScannerIngressos";
import ResetPassword from "./pages/ResetPassword";
import ProdutosAdmin from "./pages/ProdutosAdmin";
import ProdutosRelatorio from "./pages/ProdutosRelatorio";
import Produtos from "./pages/Produtos";
import ComprovanteProduto from "./pages/ComprovanteProduto";
import CompraSucesso from "./pages/CompraSucesso";
import Rematricula2027 from "./pages/Rematricula2027";
import ManualDaFamilia from "./pages/ManualDaFamilia";
import AdminLogin from "./pages/AdminLogin";
import AdminHome from "./pages/AdminHome";
import RequireAdmin from "./components/admin/RequireAdmin";
import NumerosDaSorte from "./pages/NumerosDaSorte";
import Rematricula2027Admin from "./pages/Rematricula2027Admin";
import Rematricula2027Followup from "./pages/Rematricula2027Followup";
import PreMatricula from "./pages/PreMatricula";
import PreMatriculaAgendar from "./pages/PreMatriculaAgendar";
import PreMatriculaAdmin from "./pages/PreMatriculaAdmin";
import PreMatriculaAgenda from "./pages/PreMatriculaAgenda";
import Matricula from "./pages/Matricula";
import MatriculaAdmin from "./pages/MatriculaAdmin";


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
            <Route path="/eventos/:id" element={<EventoDetalhe />} />
            <Route path="/eventos/admin" element={<RequireAdmin><EventosAdmin /></RequireAdmin>} />
            <Route path="/eventos/meus-ingressos" element={<MeusIngressos />} />
            <Route path="/eventos/ingresso/:id" element={<IngressoDetalhe />} />
            <Route path="/eventos/admin/scanner" element={<RequireAdmin allow="scan"><ScannerIngressos /></RequireAdmin>} />
            <Route path="/eventos/admin/relatorio" element={<RequireAdmin><EventosRelatorio /></RequireAdmin>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/eventos/admin/produtos" element={<RequireAdmin><ProdutosAdmin /></RequireAdmin>} />
            <Route path="/eventos/admin/produtos/relatorio" element={<RequireAdmin><ProdutosRelatorio /></RequireAdmin>} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/eventos/:eventoId/produtos" element={<Produtos />} />
            <Route path="/comprovante/:token" element={<ComprovanteProduto />} />
            <Route path="/eventos/sucesso" element={<CompraSucesso />} />
            <Route path="/eventos/minhas-compras" element={<MeusIngressos />} />
            <Route path="/rematricula2027" element={<Rematricula2027 />} />
            <Route path="/manualdafamilia" element={<ManualDaFamilia />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<RequireAdmin allow="scan"><AdminHome /></RequireAdmin>} />
            <Route path="/numerosdasorte" element={<NumerosDaSorte />} />
            <Route path="/rematricula2027/admin" element={<RequireAdmin><Rematricula2027Admin /></RequireAdmin>} />
            <Route path="/rematricula2027/followup" element={<RequireAdmin><Rematricula2027Followup /></RequireAdmin>} />
            <Route path="/prematricula" element={<PreMatricula />} />
            <Route path="/prematricula/agendar" element={<PreMatriculaAgendar />} />
            <Route path="/prematricula/admin" element={<RequireAdmin><PreMatriculaAdmin /></RequireAdmin>} />
            <Route path="/prematricula/agenda" element={<RequireAdmin><PreMatriculaAgenda /></RequireAdmin>} />


            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
