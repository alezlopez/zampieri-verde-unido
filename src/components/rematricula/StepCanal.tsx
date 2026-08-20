import { useEffect, useState } from "react";
import { Loader2, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlunoResumo } from "./types";

export interface CanalOtp {
  chave: string;
  canal: "whatsapp" | "email";
  rotulo: string;
}

interface Props {
  aluno: AlunoResumo;
  onVoltar: () => void;
  onEnviado: (canal: CanalOtp) => void;
  /** "renegociacao" usa a RPC de canais que aceita alunos com débitos em aberto */
  finalidade?: "login" | "renegociacao";
}

export const StepCanal = ({ aluno, onVoltar, onEnviado, finalidade = "login" }: Props) => {
  const [canais, setCanais] = useState<CanalOtp[] | null>(null);
  const [selecionado, setSelecionado] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data, error } = finalidade === "renegociacao"
        ? await supabase.rpc("renegociacao_2027_canais", { p_id_aluno: aluno.id_aluno })
        : await supabase.rpc("rematricula_2027_canais", { p_id_aluno: aluno.id_aluno });
      if (!ativo) return;
      if (error) {
        setErro("Não foi possível carregar os canais agora. Tente novamente.");
        setCanais([]);
        return;
      }
      const lista = (data as CanalOtp[]) ?? [];
      setCanais(lista);
      setSelecionado(lista[0]?.chave ?? "");
    })();
    return () => {
      ativo = false;
    };
  }, [aluno.id_aluno, finalidade]);

  const enviar = async () => {
    const canal = canais?.find((c) => c.chave === selecionado);
    if (!canal) return;
    setEnviando(true);
    setErro(null);
    const { data, error } = await supabase.functions.invoke("rematricula-2027-otp-enviar", {
      body: { id_aluno: aluno.id_aluno, chave: canal.chave, finalidade },
    });
    setEnviando(false);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      setErro(
        res?.error === "muitas_tentativas"
          ? "Muitos códigos enviados. Aguarde alguns minutos e tente novamente."
          : "Não conseguimos enviar o código agora. Tente outro canal ou fale com a secretaria.",
      );
      return;
    }
    onEnviado(canal);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-zampieri-cream flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-zampieri-green-dark" />
        </span>
        <div>
          <h2 className="font-serif text-xl font-bold text-zampieri-green-dark">Confirme sua identidade</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Para proteger os dados de <strong>{aluno.nome_aluno}</strong>, enviaremos um código de 6 dígitos.
            Escolha onde quer receber.
          </p>
        </div>
      </div>

      {canais === null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando canais...
        </div>
      )}

      {canais?.length === 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium text-foreground">Não há contatos cadastrados para envio do código.</p>
          <p className="text-muted-foreground mt-1">
            Fale com a secretaria pelo{" "}
            <a
              href="https://wa.me/5511939341503"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zampieri-green-dark underline"
            >
              WhatsApp
            </a>{" "}
            para atualizar seus dados.
          </p>
        </div>
      )}

      {canais && canais.length > 0 && (
        <div className="space-y-2">
          {canais.map((c) => {
            const ativo = selecionado === c.chave;
            const Icone = c.canal === "whatsapp" ? MessageCircle : Mail;
            return (
              <button
                key={c.chave}
                type="button"
                onClick={() => setSelecionado(c.chave)}
                className={`w-full text-left rounded-lg border p-4 flex items-center gap-3 transition-colors ${
                  ativo
                    ? "border-zampieri-green-dark bg-zampieri-cream/60"
                    : "border-border hover:border-zampieri-green-dark"
                }`}
              >
                <span className="w-9 h-9 rounded-full bg-zampieri-cream flex items-center justify-center shrink-0">
                  <Icone className="w-4 h-4 text-zampieri-green-dark" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zampieri-green-dark">
                    {c.canal === "whatsapp" ? "WhatsApp" : "E-mail"}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">{c.rotulo}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onVoltar} className="flex-1">
          Voltar
        </Button>
        <Button
          onClick={enviar}
          disabled={enviando || !selecionado}
          className="flex-1 bg-zampieri-green-dark hover:bg-zampieri-green"
        >
          {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enviar código
        </Button>
      </div>
    </div>
  );
};
