import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CanalOtp } from "./StepCanal";
import { AlunoResumo } from "./types";

interface Props {
  aluno: AlunoResumo;
  canal: CanalOtp;
  onVoltar: () => void;
  onValidado: (dataNascimentoIso: string) => void;
}

export const mensagemErroOtp = (codigo?: string) => {
  switch (codigo) {
    case "codigo_incorreto":
      return "Código incorreto. Confira e tente novamente.";
    case "codigo_expirado":
      return "Este código expirou. Peça um novo.";
    case "muitas_tentativas":
      return "Muitas tentativas. Aguarde alguns minutos.";
    case "codigo_nao_encontrado":
      return "Nenhum código pendente. Peça um novo envio.";
    default:
      return "Não foi possível validar agora. Tente novamente.";
  }
};

export const StepCodigo = ({ aluno, canal, onVoltar, onValidado }: Props) => {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [segundos, setSegundos] = useState(60);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (segundos <= 0) return;
    const t = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos]);

  const confirmar = async () => {
    if (codigo.length !== 6) {
      setErro("Digite os 6 dígitos do código.");
      return;
    }
    setErro(null);
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("rematricula-2027-otp-validar", {
      body: { id_aluno: aluno.id_aluno, codigo, finalidade: "login" },
    });
    setLoading(false);
    const res = data as { success?: boolean; error?: string; data_nascimento?: string } | null;
    if (error || !res?.success || !res?.data_nascimento) {
      setErro(mensagemErroOtp(res?.error));
      return;
    }
    onValidado(res.data_nascimento);
  };

  const reenviar = async () => {
    setReenviando(true);
    setErro(null);
    setAviso(null);
    const { data, error } = await supabase.functions.invoke("rematricula-2027-otp-enviar", {
      body: { id_aluno: aluno.id_aluno, chave: canal.chave, finalidade: "login" },
    });
    setReenviando(false);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      setErro(mensagemErroOtp(res?.error));
      return;
    }
    setCodigo("");
    setSegundos(60);
    setAviso("Novo código enviado.");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-zampieri-cream flex items-center justify-center shrink-0">
          <KeyRound className="w-5 h-5 text-zampieri-green-dark" />
        </span>
        <div>
          <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">Digite o código</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enviamos um código de 6 dígitos por{" "}
            <strong>{canal.canal === "whatsapp" ? "WhatsApp" : "e-mail"}</strong> para{" "}
            <strong>{canal.rotulo}</strong>.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="codigo">Código de verificação</Label>
        <Input
          id="codigo"
          inputMode="numeric"
          autoFocus
          maxLength={6}
          placeholder="000000"
          className="text-center text-2xl tracking-[0.5em] font-semibold"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && confirmar()}
        />
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {aviso && <p className="text-sm text-zampieri-green-dark">{aviso}</p>}
        <button
          type="button"
          onClick={reenviar}
          disabled={segundos > 0 || reenviando}
          className="text-xs font-medium text-zampieri-green-dark underline disabled:no-underline disabled:text-muted-foreground"
        >
          {reenviando
            ? "Reenviando..."
            : segundos > 0
            ? `Reenviar código em ${segundos}s`
            : "Não recebi, reenviar código"}
        </button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onVoltar} className="flex-1">
          Voltar
        </Button>
        <Button
          onClick={confirmar}
          disabled={loading}
          className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Confirmar
        </Button>
      </div>
    </div>
  );
};
