import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  BarChart3,
  Package,
  ScanLine,
  GraduationCap,
  Sparkles,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface Atalho {
  titulo: string;
  descricao: string;
  href: string;
  icone: typeof CalendarDays;
}

interface Bloco {
  titulo: string;
  somenteAdmin: boolean;
  itens: Atalho[];
}

const blocos: Bloco[] = [
  {
    titulo: "Eventos",
    somenteAdmin: true,
    itens: [
      {
        titulo: "Gerenciar eventos",
        descricao: "Criar, editar e vincular produtos aos eventos.",
        href: "/eventos/admin",
        icone: CalendarDays,
      },
      {
        titulo: "Relatório de vendas",
        descricao: "Ingressos vendidos, taxas e valores líquidos.",
        href: "/eventos/admin/relatorio",
        icone: BarChart3,
      },
    ],
  },
  {
    titulo: "Produtos",
    somenteAdmin: true,
    itens: [
      {
        titulo: "Gerenciar produtos",
        descricao: "Produtos, variações, preços e estoque.",
        href: "/eventos/admin/produtos",
        icone: Package,
      },
      {
        titulo: "Relatório de produtos",
        descricao: "Pedidos, retiradas e conciliação financeira.",
        href: "/eventos/admin/produtos/relatorio",
        icone: BarChart3,
      },
    ],
  },
  {
    titulo: "Portaria",
    somenteAdmin: false,
    itens: [
      {
        titulo: "Scanner / Retirada",
        descricao: "Validar ingressos e registrar retirada de produtos.",
        href: "/eventos/admin/scanner",
        icone: ScanLine,
      },
    ],
  },
  {
    titulo: "Rematrícula 2027",
    somenteAdmin: true,
    itens: [
      {
        titulo: "Administração de rematrículas",
        descricao: "Contratos, pagamentos e situação por aluno.",
        href: "/rematricula2027/admin",
        icone: GraduationCap,
      },
      {
        titulo: "Follow-up de pendentes",
        descricao: "Quem parou antes do contrato, da assinatura ou do pagamento.",
        href: "/rematricula2027/followup",
        icone: GraduationCap,
      },
      {
        titulo: "Números da sorte",
        descricao: "Consultar os números gerados para o sorteio.",
        href: "/numerosdasorte",
        icone: Sparkles,
      },
      {
        titulo: "Pré-matrículas",
        descricao: "Aprovar CPF, acompanhar agendamentos e concluir entrevistas.",
        href: "/prematricula/admin",
        icone: GraduationCap,
      },
    ],
  },
];

const AdminHome = () => {
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    document.title = "Painel Administrativo — Colégio Zampieri";
  }, []);

  const visiveis = blocos.filter((b) => isAdmin || !b.somenteAdmin);

  return (
    <div className="min-h-screen bg-zampieri-cream/30">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-zampieri-green-dark">
              Painel Administrativo
            </h1>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {visiveis.map((bloco) => (
          <section key={bloco.titulo} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {bloco.titulo}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {bloco.itens.map((item) => {
                const Icone = item.icone;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="group rounded-lg border border-border bg-white p-4 transition-colors hover:border-zampieri-green-dark"
                  >
                    <div className="flex items-start gap-3">
                      <span className="rounded-md bg-zampieri-cream p-2 text-zampieri-green-dark">
                        <Icone className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-zampieri-green-dark flex items-center gap-1">
                          {item.titulo}
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                        </p>
                        <p className="text-sm text-muted-foreground">{item.descricao}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default AdminHome;
