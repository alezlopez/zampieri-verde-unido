import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { DOCUMENTOS, TIPOS_VALIDOS, labelDoc, docObrigatorio } from "../_shared/matricula-docs.ts";
import { SITE_URL, notificar } from "../_shared/prematricula-mensagens.ts";
import { valoresProntos, verificarAssinatura, concluirMatriculaGratuita } from "../_shared/matricula-contrato.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** O admin cuida apenas dos valores; os demais dados a família preenche no portal. */
const CAMPOS_EDITAVEIS = [
  "anuidade_total", "anuidade_total_ext", "percentual_desconto", "percentual_desconto_ext",
  "valor_com_desconto", "valor_com_desconto_ext", "valor_pri_parcela", "valor_pri_parcela_ext",
  "dia_vencimento", "valor_matricula", "permite_avista", "permite_parcelado", "max_parcelas",
  "matricula_gratuita",
];

const NUMERICOS = ["percentual_desconto", "valor_com_desconto", "valor_matricula"];
const INTEIROS = ["dia_vencimento", "max_parcelas"];
const BOOLEANOS = ["permite_avista", "permite_parcelado", "matricula_gratuita"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "nao_autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userRes } = await admin.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return json({ error: "nao_autenticado" }, 401);
    const { data: ehAdmin } = await admin.rpc("has_setor", { _user_id: user.id, _setor: "matricula" });
    if (!ehAdmin) return json({ error: "sem_permissao" }, 403);

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao || "listar");

    if (acao === "listar") {
      const { data: mats } = await admin
        .from("matriculas")
        .select("*")
        .order("created_at", { ascending: false });
      const ids = (mats ?? []).map((m) => m.prematricula_id);
      const { data: pms } = await admin
        .from("prematriculas")
        .select("id, protocolo, resp_nome, resp_email, resp_cpf, resp_whatsapp, resp_tipo, aluno_nome, aluno_nascimento, serie_pretendida, turno_preferencia, desconto_percentual, token")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const { data: docs } = await admin
        .from("matricula_documentos")
        .select("matricula_id, tipo, nome_arquivo, status, motivo");

      const lista = (mats ?? []).map((m) => {
        const pmDoAluno = (pms ?? []).find((p) => p.id === m.prematricula_id) ?? null;
        return {
          ...m,
          prematricula: pmDoAluno,
          documentos: DOCUMENTOS.map((d) => {
            const found = (docs ?? []).find((x) => x.matricula_id === m.id && x.tipo === d.tipo);
            return {
              tipo: d.tipo,
              label: d.label,
              obrigatorio: docObrigatorio(d.tipo, pmDoAluno?.resp_tipo),
              status: found?.status ?? "pendente",
              nome_arquivo: found?.nome_arquivo ?? null,
              motivo: found?.motivo ?? null,
            };
          }),
        };
      });

      return json({ ok: true, lista });
    }

    const id = String(body?.id || "");
    if (!id) return json({ error: "id_invalido" }, 400);

    const { data: mat } = await admin.from("matriculas").select("*").eq("id", id).maybeSingle();
    if (!mat) return json({ error: "nao_encontrada" }, 404);

    const { data: pm } = await admin
      .from("prematriculas")
      .select("*")
      .eq("id", mat.prematricula_id)
      .maybeSingle();

    const base = {
      respNome: mat.resp_fin_nome || pm?.resp_nome || "",
      respEmail: mat.resp_fin_email || pm?.resp_email || "",
      respWhatsapp: mat.resp_fin_celular || pm?.resp_whatsapp || "",
      alunoNome: mat.nome_aluno || pm?.aluno_nome || "",
      protocolo: pm?.protocolo || "",
      linkMatricula: `${SITE_URL}/matricula?t=${pm?.token ?? ""}`,
    };

    if (acao === "doc_url") {
      const tipo = String(body?.tipo || "");
      if (!TIPOS_VALIDOS.includes(tipo)) return json({ error: "tipo_invalido" }, 400);
      const { data: doc } = await admin
        .from("matricula_documentos")
        .select("storage_path")
        .eq("matricula_id", id)
        .eq("tipo", tipo)
        .maybeSingle();
      if (!doc?.storage_path) return json({ error: "sem_arquivo" }, 404);
      const { data, error } = await admin.storage
        .from("matricula-docs")
        .createSignedUrl(doc.storage_path, 300);
      if (error) throw error;
      return json({ ok: true, url: data.signedUrl });
    }

    if (acao === "doc_status") {
      const tipo = String(body?.tipo || "");
      const novo = String(body?.status || "");
      if (!TIPOS_VALIDOS.includes(tipo)) return json({ error: "tipo_invalido" }, 400);
      if (!["aprovado", "rejeitado"].includes(novo)) return json({ error: "status_invalido" }, 400);
      const { error } = await admin
        .from("matricula_documentos")
        .update({
          status: novo,
          motivo: novo === "rejeitado" ? String(body?.motivo || "").slice(0, 300) || null : null,
          updated_at: new Date().toISOString(),
        })
        .eq("matricula_id", id)
        .eq("tipo", tipo);
      if (error) throw error;
      return json({ ok: true });
    }

    /** Documentos obrigatórios já conferidos (aprovados ou aguardando a escola anterior). */
    const documentosOk = async () => {
      const { data: docs } = await admin
        .from("matricula_documentos")
        .select("tipo, status")
        .eq("matricula_id", id);
      const pendentes = DOCUMENTOS.filter((d) => {
        if (!docObrigatorio(d.tipo, pm?.resp_tipo)) return false;
        const st = (docs ?? []).find((x) => x.tipo === d.tipo)?.status;
        return st !== "aprovado" && st !== "aguardando_escola";
      }).map((d) => d.label);
      return { ok: pendentes.length === 0, pendentes };
    };

    if (acao === "solicitar_reenvio") {
      const { data: docs } = await admin
        .from("matricula_documentos")
        .select("tipo, status")
        .eq("matricula_id", id);
      const rejeitados = (docs ?? []).filter((d) => d.status === "rejeitado").map((d) => labelDoc(d.tipo));
      const faltando = DOCUMENTOS.filter((d) => !(docs ?? []).some((x) => x.tipo === d.tipo)).map((d) => d.label);
      // Libera o reenvio dos itens que não foram aprovados.
      await admin
        .from("matricula_documentos")
        .update({ status: "rejeitado", updated_at: new Date().toISOString() })
        .eq("matricula_id", id)
        .in("status", ["enviado", "em_analise"]);
      await admin
        .from("matriculas")
        .update({ status: "documentos_pendentes", updated_at: new Date().toISOString() })
        .eq("id", id);
      await notificar("documentos_reenvio", {
        ...base,
        documentosPendentes: [...rejeitados, ...faltando],
      });
      return json({ ok: true });
    }

    if (acao === "aprovar_documentos") {
      await admin
        .from("matricula_documentos")
        .update({ status: "aprovado", motivo: null, updated_at: new Date().toISOString() })
        .eq("matricula_id", id)
        .not("status", "in", "(aprovado,aguardando_escola)");
      await admin
        .from("matriculas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id);
      return json({ ok: true });
    }

    if (acao === "liberar_dados") {
      const docs = await documentosOk();
      if (!docs.ok) return json({ error: "documentos_pendentes", faltando: docs.pendentes }, 400);
      if (!valoresProntos(mat)) return json({ error: "valores_pendentes" }, 400);
      await admin
        .from("matriculas")
        .update({
          status: "documentos_aprovados",
          documentos_aprovados_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      await notificar("documentos_aprovados", base);
      return json({ ok: true });
    }

    if (acao === "salvar") {
      const dados = (body?.dados ?? {}) as Record<string, unknown>;
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const campo of CAMPOS_EDITAVEIS) {
        if (!(campo in dados)) continue;
        const valor = dados[campo];
        if (BOOLEANOS.includes(campo)) update[campo] = !!valor;
        else if (NUMERICOS.includes(campo)) update[campo] = valor === "" || valor == null ? null : Number(valor);
        else if (INTEIROS.includes(campo)) update[campo] = valor === "" || valor == null ? null : parseInt(String(valor), 10);
        else update[campo] = valor === "" ? null : String(valor);
      }
      // Matrícula isenta não tem cobrança: valor zerado e sem formas de pagamento.
      if (update.matricula_gratuita === true) {
        update.valor_matricula = 0;
        update.permite_avista = false;
        update.permite_parcelado = false;
      }
      const { error } = await admin.from("matriculas").update(update).eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (acao === "verificar_assinatura") {
      const r = await verificarAssinatura(admin, mat);
      if (mat.contrato_assinado && mat.matricula_gratuita) {
        await concluirMatriculaGratuita(admin, mat, notificar);
      }
      return json({ ok: true, ...r });
    }


    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("matricula-admin erro:", e);
    return json({ error: "erro_interno" }, 500);
  }
});
