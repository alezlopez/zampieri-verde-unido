import { Bell, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificacoes, Notificacao } from "@/hooks/useNotificacoes";
import { cn } from "@/lib/utils";

const tempoRelativo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

export const NotificacoesBell = ({ className }: { className?: string }) => {
  const { notificacoes, naoLidas, loading, ativo, marcarLida, marcarTodasLidas } =
    useNotificacoes();
  const navigate = useNavigate();

  if (!ativo) return null;

  const abrir = (n: Notificacao) => {
    marcarLida(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Notificações"
          className={cn("relative", className)}
        >
          <Bell className="w-4 h-4" />
          {naoLidas > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold flex items-center justify-center">
              {naoLidas > 99 ? "99+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold text-zampieri-green-dark">Notificações</p>
          {naoLidas > 0 && (
            <button
              onClick={() => marcarTodasLidas()}
              className="text-xs text-muted-foreground hover:text-zampieri-green-dark"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-zampieri-green-dark" />
            </div>
          )}

          {!loading && notificacoes.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação por enquanto.
            </p>
          )}

          {!loading &&
            notificacoes.map((n) => (
              <button
                key={n.id}
                onClick={() => abrir(n)}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b border-border/60 transition-colors hover:bg-zampieri-cream/50",
                  !n.lida && "bg-zampieri-cream/40"
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-1.5 w-2 h-2 rounded-full shrink-0",
                      n.lida ? "bg-transparent" : "bg-zampieri-green-dark"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zampieri-green-dark leading-tight">
                      {n.titulo}
                    </p>
                    {n.descricao && (
                      <p className="text-xs text-muted-foreground truncate">{n.descricao}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {tempoRelativo(n.created_at)}
                  </span>
                </div>
              </button>
            ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificacoesBell;
