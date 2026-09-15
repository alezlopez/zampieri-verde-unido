import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { SITE_URL, formatarDataHora, notificar } from "../_shared/prematricula-mensagens.ts";
import { gerarSlots } from "../_shared/prematricula-slots.ts";
import { acharMotivo } from "../_shared/prematricula-motivos.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SERIE_PRE = "Infantil 5 (Pré-Escola)";
const descontosPorSerie = (serie?: string | null) =>
  Array.from({ length: (serie === SERIE_PRE ? 60 : 30) / 5 + 1 }, (_, i) => i * 5);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "nao_autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes, error: erroUser } = await admin.auth.getUser(jwt);
    const user = userRes?.user;
    if (erroUser || !user) return json({ error: "nao_autenticado" }, 401);

    const { data: ehAdmin } = await admin.rpc("has_setor", { _user_id: user.id, _setor: "matricula" });
    if (!ehAdmin) return json({ error: "sem_permissao" }, 403);

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao || "");
    const id = String(body?.id || "");
    if (!id) return json({ error: "id_invalido" }, 400);

    // ---- Lista de espera (id = registro da fila) ----
    if (acao === "lista_espera_convocar" || acao === "lista_espera_remover") {
      const { data: fila, error: erroFila } = await admin
        .from("lista_espera_2027")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (erroFila) throw erroFila;
      if (!fila) return json({ error: "nao_encontrado" }, 404);

      if (acao === "lista_espera_remover") {
        const motivo = String(body?.motivo || "").trim();
        if (!motivo) return json({ error: "motivo_obrigatorio" }, 400);
        const { error } = await admin
          .from("lista_espera_2027")
          .update({ status: "desistente", motivo })
          .eq("id", id);
        if (error) throw error;
        return json({ ok: true, status: "desistente" });
      }

      const { error } = await admin
        .from("lista_espera_2027")
        .update({
          status: "convocado",
          convocado_em: new Date().toISOString(),
          convocado_por: user.id,
        })
        .eq("id", id);
      if (error) throw error;

      await notificar("lista_espera_convocada", {
        respNome: fila.resp_nome ?? "",
        respEmail: fila.resp_email ?? "",
        respWhatsapp: fila.resp_whatsapp ?? "",
        alunoNome: fila.aluno_nome,
        protocolo: "",
        curso: fila.curso_2027,
        turno: fila.turno,
      });
      return json({ ok: true, status: "convocado" });
    }

    const { data: pm, error: erroPm } = await admin
      .from("prematriculas")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (erroPm) throw erroPm;
    if (!pm) return json({ error: "nao_encontrado" }, 404);

    const base = {
      respNome: pm.resp_nome,
      respEmail: pm.resp_email,
      respWhatsapp: pm.resp_whatsapp,
      alunoNome: pm.aluno_nome,
      protocolo: pm.protocolo,
    };

    const EM_ANALISE = ["pendente", "reenviado_aguardando_analise"];

    if (acao === "aprovar") {
      if (!EM_ANALISE.includes(pm.status)) return json({ error: "status_invalido" }, 400);
      const token =
        pm.token ||
        crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const { error } = await admin
        .from("prematriculas")
        .update({
          status: "aprovado_aguardando_agendamento",
          aprovado_em: new Date().toISOString(),
          motivo_reprovacao: null,
          motivo_codigo: null,
          motivo_texto: null,
          solucao_texto: null,
          ressalva_documento: null,
          token,
        })
        .eq("id", id);
      if (error) throw error;

      await notificar("aprovada", {
        ...base,
        linkAgendamento: `${SITE_URL}/prematricula/agendar?t=${token}`,
      });
      return json({ ok: true, status: "aprovado_aguardando_agendamento" });
    }

    if (acao === "reprovar" || acao === "aprovar_com_ressalvas") {
      if (!EM_ANALISE.includes(pm.status)) return json({ error: "status_invalido" }, 400);
      const motivo = acharMotivo(String(body?.motivo_codigo || ""));
      if (!motivo) return json({ error: "motivo_obrigatorio" }, 400);

      const tokenRessalva =
        pm.token ||
        crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const linkReenvioDireto = motivo.documento
        ? `${SITE_URL}/prematricula/reenvio?t=${tokenRessalva}`
        : `${SITE_URL}/prematricula`;

      if (acao === "reprovar") {
        if (!motivo.decisoes.includes("reprovar")) return json({ error: "motivo_invalido" }, 400);
        const { error } = await admin
          .from("prematriculas")
          .update({
            status: "reprovado",
            reprovado_em: new Date().toISOString(),
            motivo_reprovacao: motivo.texto,
            motivo_codigo: motivo.codigo,
            motivo_texto: motivo.texto,
            solucao_texto: motivo.solucao,
            ressalva_documento: null,
          })
          .eq("id", id);
        if (error) throw error;

        await notificar("reprovada", {
          ...base,
          motivoReprovacao: motivo.texto,
          motivoCodigo: motivo.codigo,
          motivoTitulo: motivo.titulo,
          motivoTexto: motivo.texto,
          solucaoTexto: motivo.solucao,
          linkReenvio: `${SITE_URL}/prematricula`,
        });
        return json({ ok: true, status: "reprovado" });
      }

      if (!motivo.decisoes.includes("ressalvas") || !motivo.documento) {
        return json({ error: "motivo_invalido" }, 400);
      }
      const { error } = await admin
        .from("prematriculas")
        .update({
          status: "aprovado_com_ressalvas",
          motivo_reprovacao: null,
          motivo_codigo: motivo.codigo,
          motivo_texto: motivo.texto,
          solucao_texto: motivo.solucao,
          ressalva_documento: motivo.documento,
          ressalva_em: new Date().toISOString(),
          token: tokenRessalva,
        })
        .eq("id", id);
      if (error) throw error;

      await notificar("aprovada_com_ressalvas", {
        ...base,
        motivoCodigo: motivo.codigo,
        motivoTitulo: motivo.titulo,
        motivoTexto: motivo.texto,
        solucaoTexto: motivo.solucao,
        documentoPendente: motivo.documento,
        linkReenvio: linkReenvioDireto,
      });
      return json({ ok: true, status: "aprovado_com_ressalvas" });
    }

    if (acao === "concluir_entrevista") {
      if (pm.status !== "entrevista_agendada") return json({ error: "status_invalido" }, 400);
      const desconto = Number(body?.desconto);
      if (!descontosPorSerie(pm.serie_pretendida).includes(desconto)) return json({ error: "desconto_invalido" }, 400);
      const observacoes = String(body?.observacoes || "").trim().slice(0, 2000);

      const token =
        pm.token ||
        crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

      const { error } = await admin
        .from("prematriculas")
        .update({
          status: "entrevista_concluida",
          desconto_percentual: desconto,
          observacoes_entrevista: observacoes || null,
          entrevista_concluida_em: new Date().toISOString(),
          token,
        })
        .eq("id", id);
      if (error) throw error;

      await admin
        .from("prematricula_agendamentos")
        .update({ status: "concluido" })
        .eq("prematricula_id", id)
        .eq("status", "agendado");

      // Abre a etapa de matrícula (upload de documentos) para a família
      const { error: erroMat } = await admin.from("matriculas").upsert(
        {
          prematricula_id: id,
          nome_aluno: pm.aluno_nome,
          data_nascimento_aluno: pm.aluno_nascimento,
          curso: pm.serie_pretendida,
          turno: pm.turno_preferencia,
          percentual_desconto: desconto,
          resp_fin_nome: pm.resp_nome,
          resp_fin_cpf: pm.resp_cpf,
          resp_fin_celular: pm.resp_whatsapp,
          resp_fin_email: pm.resp_email,
        },
        { onConflict: "prematricula_id" },
      );
      if (erroMat) console.error("falha ao criar matrícula:", erroMat);

      // Se estava na lista de espera, sai da fila como convertido
      await admin
        .from("lista_espera_2027")
        .update({ status: "convertido" })
        .eq("prematricula_id", id)
        .in("status", ["aguardando", "convocado"]);

      await notificar("concluida", {
        ...base,
        descontoPercentual: desconto,
        linkMatricula: `${SITE_URL}/matricula?t=${token}`,
      });
      return json({ ok: true, status: "entrevista_concluida" });
    }

    if (acao === "reenviar_link") {
      if (pm.status !== "aprovado_aguardando_agendamento") {
        return json({ error: "status_invalido" }, 400);
      }
      const token =
        pm.token ||
        crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      if (!pm.token) await admin.from("prematriculas").update({ token }).eq("id", id);
      await notificar("aprovada", {
        ...base,
        linkAgendamento: `${SITE_URL}/prematricula/agendar?t=${token}`,
      });
      return json({ ok: true });
    }

    if (acao === "arquivo_url") {
      const campo = body?.campo === "laudo" ? "laudo_path" : "boletim_path";
      const path = pm[campo];
      if (!path) return json({ error: "sem_arquivo" }, 404);
      const { data, error } = await admin.storage
        .from("prematricula-docs")
        .createSignedUrl(path, 300);
      if (error) throw error;
      return json({ ok: true, url: data.signedUrl });
    }

    if (acao === "cancelar_agendamento") {
      const { data: ag } = await admin
        .from("prematricula_agendamentos")
        .select("inicio")
        .eq("prematricula_id", id)
        .eq("status", "agendado")
        .maybeSingle();
      await admin
        .from("prematricula_agendamentos")
        .update({ status: "cancelado" })
        .eq("prematricula_id", id)
        .eq("status", "agendado");
      await admin
        .from("prematriculas")
        .update({ status: "aprovado_aguardando_agendamento", agendado_em: null })
        .eq("id", id);
      console.log(
        `Agendamento cancelado para ${id}`,
        ag?.inicio ? formatarDataHora(ag.inicio) : "",
      );
      return json({ ok: true, status: "aprovado_aguardando_agendamento" });
    }

    if (acao === "slots") {
      const slots = await gerarSlots(admin, id);
      const { data: agAtual } = await admin
        .from("prematricula_agendamentos")
        .select("inicio")
        .eq("prematricula_id", id)
        .eq("status", "agendado")
        .maybeSingle();
      return json({
        ok: true,
        slots,
        agendamento: agAtual
          ? { inicio: agAtual.inicio, texto: formatarDataHora(agAtual.inicio) }
          : null,
      });
    }

    if (acao === "reagendar") {
      if (pm.status !== "entrevista_agendada" && pm.status !== "aprovado_aguardando_agendamento") {
        return json({ error: "status_invalido" }, 400);
      }
      const slots = await gerarSlots(admin, id);
      const inicio = String(body?.inicio || "");
      const escolhido = slots.find((s) => s.inicio === inicio);
      if (!escolhido) return json({ error: "horario_indisponivel" }, 409);

      await admin
        .from("prematricula_agendamentos")
        .update({ status: "cancelado" })
        .eq("prematricula_id", id)
        .eq("status", "agendado");

      const { error: erroIns } = await admin.from("prematricula_agendamentos").insert({
        prematricula_id: id,
        inicio: escolhido.inicio,
        fim: escolhido.fim,
      });
      if (erroIns) throw erroIns;

      const { error: erroUp } = await admin
        .from("prematriculas")
        .update({ status: "entrevista_agendada", agendado_em: new Date().toISOString() })
        .eq("id", id);
      if (erroUp) throw erroUp;

      await notificar("agendada", { ...base, dataEntrevista: escolhido.texto });
      return json({ ok: true, status: "entrevista_agendada" });
    }

    // Marcador interno de acompanhamento (ativo / desistente / cancelado).
    if (acao === "acompanhamento") {
      const estado = String(body?.estado || "");
      if (!["ativo", "desistente", "cancelado"].includes(estado)) {
        return json({ error: "estado_invalido" }, 400);
      }
      const motivo = String(body?.motivo || "").trim().slice(0, 500);
      if (estado !== "ativo" && !motivo) return json({ error: "motivo_obrigatorio" }, 400);
      const { error } = await admin
        .from("prematriculas")
        .update({
          acompanhamento: estado,
          acompanhamento_motivo: estado === "ativo" ? null : motivo,
          acompanhamento_em: estado === "ativo" ? null : new Date().toISOString(),
          acompanhamento_por: estado === "ativo" ? null : user.id,
        })
        .eq("id", id);
      if (error) throw error;
      return json({ ok: true, acompanhamento: estado });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("prematricula-admin-acao erro:", e);
    return json({ error: "erro_interno" }, 500);
  }
});
