import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  CalendarDays,
  BarChart3,
  Package,
  ScanLine,
  GraduationCap,
  Sparkles,
  LogOut,
  ArrowRight,
  ClipboardList,
  CalendarClock,
  FileSignature,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import { useAuth, Setor } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface Atalho {
  titulo: string;
  descricao: string;
  href: string;
  icone: typeof CalendarDays;
}

interface Bloco {
  titulo: string;
  subtitulo: string;
  setor: Setor;
  icone: typeof CalendarDays;
  itens: Atalho[];
}

const blocos: Bloco[] = [
  {
    titulo: "Matrículas (novos alunos)",
    subtitulo: "Pré-matrícula, entrevista, documentos e contrato",
    setor: "matricula",
    icone: ClipboardList,
    itens: [
      {
        titulo: "Pré-matrículas",
        descricao: "Analisar cadastros, agendar e concluir entrevistas.",
        href: "/prematricula/admin",
        icone: ClipboardList,
      },
      {
        titulo: "Agenda da entrevista",
        descricao: "Horários por dia da semana e bloqueio de datas.",
        href: "/prematricula/agenda",
        icone: CalendarClock,
      },
      {
        titulo: "Matrículas em andamento",
        descricao: "Conferir documentos, valores, contrato e pagamento.",
        href: "/matricula/admin",
        icone: FileSignature,
      },
    ],
  },
  {
    titulo: "Rematrícula 2027",
    subtitulo: "Alunos que já estudam no colégio",
    setor: "rematricula",
    icone: GraduationCap,
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
        icone: BarChart3,
      },
      {
        titulo: "Renegociação de débitos",
        descricao: "Alunos bloqueados, débitos em aberto e baixas manuais.",
        href: "/renegociacao/admin",
        icone: BarChart3,
      },
      {
        titulo: "Números da sorte",
        descricao: "Consultar os números gerados para o sorteio.",
        href: "/numerosdasorte",
        icone: Sparkles,
      },
    ],
  },
  {
    titulo: "Eventos",
    subtitulo: "Ingressos e vendas de eventos",
    setor: "eventos",
    icone: CalendarDays,
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
    subtitulo: "Catálogo, estoque e pedidos",
    setor: "produtos",
    icone: ShoppingBag,
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
    subtitulo: "Entrada do evento e retirada de produtos",
    setor: "portaria",
    icone: ScanLine,
    itens: [
      {
        titulo: "Scanner / Retirada",
        descricao: "Validar ingressos e registrar retirada de produtos.",
        href: "/eventos/admin/scanner",
        icone: ScanLine,
      },
    ],
  },
];

const AdminHome = () => {
  const { user, isAdmin, setores, signOut } = useAuth();

  useEffect(() => {
    document.title = "Painel Administrativo — Colégio Zampieri";
  }, []);

  const visiveis = blocos.filter((b) => isAdmin || setores.includes(b.setor));

  // Operador com um único setor E uma única tela vai direto para ela
  if (!isAdmin && visiveis.length === 1 && visiveis[0].itens.length === 1) {
    return <Navigate to={visiveis[0].itens[0].href} replace />;
  }

  return (
    <div className="min-h-screen bg-zampieri-cream/30">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-bold text-zampieri-green-dark">
              Painel Administrativo
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
              {" · "}
              {isAdmin ? "Administrador" : visiveis.map((b) => b.titulo).join(", ") || "Sem acesso"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {visiveis.length === 0 && (
          <p className="rounded-lg border border-border bg-white p-6 text-sm text-muted-foreground">
            Sua conta ainda não tem nenhum setor liberado. Peça à secretaria para
            configurar seu nível de acesso.
          </p>
        )}

        {visiveis.map((bloco) => {
          const IconeBloco = bloco.icone;
          return (
            <section key={bloco.setor} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-2">
                <span className="rounded-lg bg-zampieri-green-dark p-2 text-white">
                  <IconeBloco className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-serif text-lg font-bold text-zampieri-green-dark leading-tight">
                    {bloco.titulo}
                  </h2>
                  <p className="text-xs text-muted-foreground">{bloco.subtitulo}</p>
                </div>
              </div>

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
          );
        })}
        {isAdmin && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-2">
              <span className="rounded-lg bg-zampieri-green-dark p-2 text-white">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-serif text-lg font-bold text-zampieri-green-dark leading-tight">
                  Configurações
                </h2>
                <p className="text-xs text-muted-foreground">Exclusivo para administradores</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to="/admin/usuarios"
                className="group rounded-lg border border-border bg-white p-4 transition-colors hover:border-zampieri-green-dark"
              >
                <div className="flex items-start gap-3">
                  <span className="rounded-md bg-zampieri-cream p-2 text-zampieri-green-dark">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-zampieri-green-dark flex items-center gap-1">
                      Usuários e Permissões
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Criar contas administrativas e definir os setores de acesso.
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>

  );
};

export default AdminHome;
