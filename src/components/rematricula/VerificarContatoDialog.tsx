import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { mensagemErroOtp } from "./StepCodigo";

interface Props {
  aberto: boolean;
  idAluno: number;
  canal: "whatsapp" | "email";
  destino: string;
  onFechar: () => void;
  onVerificado: () => void;
}

export const VerificarContatoDialog = ({
  aberto,
  idAluno,
  canal,
  destino,
  onFechar,
  onVerificado,
}: Props) => {
  const [etapa, setEtapa] = useState<"envio" | "codigo">("envio");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (!aberto) {
      setEtapa("envio");
      setCodigo("");
      setErro(null);
      setSegundos(0);
    }
  }, [aberto]);

  useEffect(() => {
    if (segundos <= 0) return;
    const t = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos]);

  const enviar = async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase.functions.invoke("rematricula-2027-otp-enviar", {
      body: { id_aluno: idAluno, finalidade: "contato", canal, destino },
    });
    setLoading(false);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      setErro(
        res?.error === "destino_invalido"
          ? canal === "whatsapp"
            ? "Telefone inválido. Confira o número com DDD."
            : "E-mail inválido. Confira o endereço."
          : res?.error === "muitas_tentativas"
          ? "Muitos códigos enviados. Aguarde alguns minutos."
          : "Não conseguimos enviar o código agora. Tente novamente.",
      );
      return;
    }
    setEtapa("codigo");
    setSegundos(60);
  };

  const confirmar = async () => {
    if (codigo.length !== 6) {
      setErro("Digite os 6 dígitos do código.");
      return;
    }
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase.functions.invoke("rematricula-2027-otp-validar", {
      body: { id_aluno: idAluno, codigo, finalidade: "contato" },
    });
    setLoading(false);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      setErro(mensagemErroOtp(res?.error));
      return;
    }
    onVerificado();
    onFechar();
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zampieri-green-dark">
            <ShieldCheck className="w-5 h-5" />
            Verificar {canal === "whatsapp" ? "novo telefone" : "novo e-mail"}
          </DialogTitle>
          <DialogDescription>
            Enviaremos um código de 6 dígitos para <strong>{destino}</strong> para confirmar que o contato
            é válido.
          </DialogDescription>
        </DialogHeader>

        {etapa === "codigo" && (
          <div className="space-y-2">
            <Input
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-semibold"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && confirmar()}
            />
            <button
              type="button"
              onClick={enviar}
              disabled={segundos > 0 || loading}
              className="text-xs font-medium text-zampieri-green-dark underline disabled:no-underline disabled:text-muted-foreground"
            >
              {segundos > 0 ? `Reenviar em ${segundos}s` : "Reenviar código"}
            </button>
          </div>
        )}

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onFechar} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={etapa === "envio" ? enviar : confirmar}
            disabled={loading}
            className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {etapa === "envio" ? "Enviar código" : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
