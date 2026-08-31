import { enviarTemplateWebhook } from "./whatsapp-webhook.ts";

/**
 * Conclui a rematrícula de um aluno isento do valor de rematrícula.
 * Só age quando: isentar_valor_rematricula = true, contrato_assinado = true
 * e rematricula_concluida ainda não é true (idempotente).
 */
export async function concluirRematriculaIsenta(admin: any, idAluno: number) {
  const { data: aluno } = await admin
    .from("alunos_rematricula_2027")
    .select("*")
    .eq("id_aluno", idAluno)
    .maybeSingle();

  if (!aluno) return { ok: false, motivo: "aluno_nao_encontrado" };
  if (!aluno.isentar_valor_rematricula) return { ok: false, motivo: "nao_isento" };
  if (!aluno.contrato_assinado) return { ok: false, motivo: "contrato_nao_assinado" };
  if (aluno.rematricula_concluida) return { ok: true, motivo: "ja_concluida" };

  const agora = new Date().toISOString();

  const { data: atualizado, error } = await admin
    .from("alunos_rematricula_2027")
    .update({
      rematricula_concluida: true,
      forma_pagamento: "isento",
      valor_pago: 0,
      data_pagamento: agora,
      updated_at: agora,
    })
    .eq("id_aluno", idAluno)
    .eq("rematricula_concluida", false)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[rematricula-isencao] falha ao concluir", error);
    return { ok: false, motivo: "update_falhou" };
  }
  if (!atualizado) return { ok: true, motivo: "ja_concluida" };

  try {
    await admin.functions.invoke("rematricula-2027-email-conclusao", {
      body: { id_aluno: idAluno },
    });
  } catch (e) {
    console.error("[rematricula-isencao] falha ao enviar e-mail de conclusão", e);
  }

  try {
    const a: any = atualizado;
    const { data: sorteRows } = await admin
      .from("rematricula_2027_numeros_sorte")
      .select("numero")
      .eq("id_aluno", idAluno)
      .order("numero");
    const numerosSorte = (sorteRows ?? []).map((r: { numero: string }) => r.numero);
    const usaPai = String(a.responsavel_financeiro || "").toLowerCase().includes("pai");
    const respNome = (usaPai ? a.nome_pai : a.nome_mae) || a.nome_mae || a.nome_pai || "";
    const respWhats = String(
      (usaPai ? a.celular_pai : a.celular_mae) || a.celular_mae || a.celular_pai || "",
    ).replace(/\D/g, "");
    const to = respWhats ? (respWhats.startsWith("55") ? respWhats : `55${respWhats}`) : "";
    const params = [respNome, a.nome_aluno || "", a.curso_2027 || "", a.turno_escolhido || ""];

    await enviarTemplateWebhook({
      evento: "rematricula_concluida",
      origem: "rematricula2027",
      template: "rematricula_concluida_u",
      template_utility: "rematricula_concluida_u",
      template_fallback: "rematricula_concluida",
      language: "pt_BR",
      to,
      telefone_original: (usaPai ? a.celular_pai : a.celular_mae) || "",
      params,
      body_params: Object.fromEntries(params.map((v, i) => [String(i + 1), v])),
      link: a.link_contrato || null,
      dados: {
        id_aluno: idAluno,
        aluno: a.nome_aluno || "",
        curso: a.curso_2027 || "",
        turno: a.turno_escolhido || "",
        responsavel_financeiro: a.responsavel_financeiro || "",
        responsavel_nome: respNome,
        responsavel_email: (usaPai ? a.email_pai : a.email_mae) || a.email_mae || a.email_pai || "",
        responsavel_whatsapp: to,
        forma_pagamento: "isento",
        parcelas: null,
        valor_pago: 0,
        isento: true,
        link_contrato: a.link_contrato || null,
        contrato_assinado: true,
        data_pagamento: agora,
        numeros_sorte: numerosSorte,
        numeros_sorte_texto: numerosSorte.join(", "),
        total_numeros_sorte: numerosSorte.length,
      },
      enviado_em: agora,
    });
  } catch (e) {
    console.error("[rematricula-isencao] falha no webhook de conclusão", e);
  }

  return { ok: true, concluida: true };
}
