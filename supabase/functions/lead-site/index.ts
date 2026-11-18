/**
 * Leads da página /informativomatricula.
 *  - criar: formulário curto (Agende uma visita / WhatsApp). Grava o lead com a origem de
 *    campanha, avisa a secretaria no painel, envia o evento ao Meta (Lead ou Contact) e
 *    marca o contato no WhatsZampieri quando a família já tem conversa lá.
 *  - horarios: horários livres de visita.
 *  - agendar: reserva a visita do lead recém-criado.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { sendMetaEvent } from "../_shared/metaCapi.ts";
import { gerarSlotsVisita } from "../_shared/visita-slots.ts";
import { avisarAgendaInterna, origemDoLead } from "../_shared/aviso-agenda.ts";

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const opt = (v: unknown, max: number) => txt(v, max) || null;

const SERIES = [
  "Infantil 5 (Pré-Escola)",
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
  "1ª série do Ensino Médio", "2ª série do Ensino Médio", "3ª série do Ensino Médio",
];

const segmentoDaSerie = (serie: string) => {
  if (serie.startsWith("Infantil")) return "infantil";
  if (serie.includes("Ensino Médio")) return "medio";
  const ano = Number(serie.match(/^(\d)º ano/)?.[1]);
  if (ano === 1) return "1ano";
  if (ano >= 2 && ano <= 5) return "fund1";
  if (ano >= 6 && ano <= 9) return "fund2";
  return "";
};

// Código curto para a família citar no WhatsApp (sem letras que se confundem)
const gerarRef = () => {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "ZP" + Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
};

// Tarefas que não podem atrasar nem derrubar a resposta. O rpc() do Supabase não lança:
// devolve { error }, que também é registrado.
const espera = (p: PromiseLike<unknown>) => {
  const seguro = Promise.resolve(p)
    .then((r) => {
      const erro = (r as { error?: { message?: string } } | undefined)?.error;
      if (erro) console.error("tarefa em segundo plano falhou:", erro.message ?? erro);
    })
    .catch((e) => console.error("tarefa em segundo plano falhou:", (e as Error)?.message ?? e));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(seguro);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "metodo_invalido" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const acao = txt(body?.acao, 20);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    if (acao === "horarios") {
      const slots = await gerarSlotsVisita(admin);
      return json({ ok: true, slots: slots.map(({ inicio, texto }) => ({ inicio, texto })) });
    }

    if (acao === "criar") {
      // Campo invisível: robôs preenchem, pessoas não
      if (txt(body?.empresa, 100)) return json({ ok: true, lead_id: null, ref: null });

      const origem = txt(body?.origem, 20);
      const nome = txt(body?.nome, 150).replace(/\s+/g, " ");
      const whatsapp = txt(body?.whatsapp, 30).replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
      const serie = txt(body?.serie, 100);
      const turno = opt(body?.turno, 10);

      if (!["visita", "whatsapp", "formulario"].includes(origem)) return json({ error: "origem_invalida" }, 400);
      if (nome.length < 2) return json({ error: "nome_obrigatorio" }, 400);
      if (!/^\d{10,11}$/.test(whatsapp)) return json({ error: "whatsapp_invalido" }, 400);
      if (!SERIES.includes(serie)) return json({ error: "serie_invalida" }, 400);
      if (turno && !["Manhã", "Tarde"].includes(turno)) return json({ error: "turno_invalido" }, 400);
      if (turno === "Manhã" && serie === SERIES[0]) return json({ error: "turno_indisponivel" }, 400);

      // Mesmo telefone e mesma origem em 30 minutos (clique duplo, voltar e reenviar): reaproveita
      const { data: recente } = await admin
        .from("leads_site")
        .select("id, ref")
        .eq("whatsapp", whatsapp)
        .eq("origem", origem)
        .gte("created_at", new Date(Date.now() - 30 * 60000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recente) return json({ ok: true, lead_id: recente.id, ref: recente.ref, repetido: true });

      const utm = (body?.utm ?? {}) as Record<string, unknown>;
      const registro = {
        origem,
        nome,
        whatsapp,
        serie,
        turno,
        utm_source: opt(utm.utm_source, 200),
        utm_medium: opt(utm.utm_medium, 200),
        utm_campaign: opt(utm.utm_campaign, 200),
        utm_content: opt(utm.utm_content, 200),
        utm_term: opt(utm.utm_term, 200),
        fbclid: opt(utm.fbclid, 500),
        gclid: opt(utm.gclid, 500),
        pagina: opt(body?.pagina, 300),
        referrer: opt(body?.referrer, 300),
        meta_event_id: opt(body?.meta_event_id, 100),
        fbp: opt(body?.fbp, 200),
        fbc: opt(body?.fbc, 500),
      };

      let inserido: { id: string; ref: string } | null = null;
      for (let tentativa = 0; tentativa < 3 && !inserido; tentativa++) {
        const { data, error } = await admin.from("leads_site").insert({ ...registro, ref: gerarRef() }).select("id, ref").single();
        if (!error) inserido = data;
        else if (error.code !== "23505") throw error;
      }
      if (!inserido) throw new Error("falha_ref");

      const rotulo = { visita: "quer agendar uma visita", whatsapp: "abriu o WhatsApp", formulario: "pediu contato" }[origem];
      const campanha = registro.utm_campaign || registro.utm_source;
      espera(
        admin.rpc("notificar_admin", {
          _setor: "matricula",
          _tipo: "lead_site",
          _titulo: `Novo contato: ${nome} ${rotulo}`,
          _descricao: `${serie}${turno ? ` · ${turno}` : ""}${campanha ? ` · anúncio: ${campanha}` : ""}`,
          _link: "/matricula/leads",
          _ref_id: inserido.id,
        }),
      );

      // Etapa "Qualificado" no WhatsZampieri; se a família ainda não tem conversa lá, é ignorado
      espera(
        admin.rpc("whatszampieri_lead_update", {
          p_phone: whatsapp,
          p_stage: "qualified",
          p_note: `Site (${origem === "whatsapp" ? "WhatsApp" : origem === "visita" ? "agendar visita" : "formulário"}): ${serie}${turno ? `, ${turno}` : ""}. Ref ${inserido.ref}`,
        }),
      );

      espera(
        sendMetaEvent(req, origem === "whatsapp" ? "Contact" : "Lead", {
          eventId: registro.meta_event_id,
          telefone: whatsapp,
          fbp: registro.fbp,
          fbc: registro.fbc,
          pageUrl: opt(body?.page_url, 2000),
          contentName: origem === "whatsapp" ? "whatsapp" : origem === "visita" ? "agendar-visita" : "formulario-curto",
          segmento: segmentoDaSerie(serie),
        }),
      );

      return json({ ok: true, lead_id: inserido.id, ref: inserido.ref });
    }

    if (acao === "agendar") {
      const leadId = txt(body?.lead_id, 40);
      const inicio = txt(body?.inicio, 40);
      if (!/^[0-9a-f-]{36}$/.test(leadId)) return json({ error: "lead_invalido" }, 400);

      const { data: lead } = await admin
        .from("leads_site")
        .select("id, nome, whatsapp, serie, turno, ref, created_at, fbp, fbc, fbclid, gclid, utm_source, utm_campaign")
        .eq("id", leadId)
        .maybeSingle();
      // Só o lead recém-criado nesta visita à página pode agendar (o id não fica exposto depois)
      if (!lead || Date.now() - new Date(lead.created_at).getTime() > 6 * 3600000) {
        return json({ error: "lead_invalido" }, 400);
      }

      const { data: atual } = await admin
        .from("visitas")
        .select("id, inicio")
        .eq("lead_id", lead.id)
        .eq("status", "agendada")
        .maybeSingle();

      const slots = await gerarSlotsVisita(admin);
      const escolhido = slots.find((s) => s.inicio === new Date(inicio).toISOString());
      if (!escolhido) return json({ error: "horario_indisponivel" }, 409);

      // Reagendar: libera o horário anterior antes de reservar o novo
      if (atual) await admin.from("visitas").update({ status: "cancelada" }).eq("id", atual.id);
      const { error } = await admin.rpc("visita_reservar", {
        p_lead: lead.id,
        p_inicio: escolhido.inicio,
        p_fim: escolhido.fim,
        p_capacidade: escolhido.capacidade,
      });
      if (error) {
        if (atual) await admin.from("visitas").update({ status: "agendada" }).eq("id", atual.id);
        if (String(error.message).includes("horario_indisponivel")) return json({ error: "horario_indisponivel" }, 409);
        throw error;
      }

      espera(
        admin.rpc("notificar_admin", {
          _setor: "matricula",
          _tipo: "visita_agendada",
          _titulo: `Visita agendada: ${lead.nome}`,
          _descricao: `${escolhido.texto} · ${lead.serie}`,
          _link: "/matricula/leads",
          _ref_id: lead.id,
        }),
      );
      espera(
        admin.rpc("whatszampieri_lead_update", {
          p_phone: lead.whatsapp,
          p_stage: "qualified",
          p_note: `Visita à escola agendada pelo site: ${escolhido.texto} (${lead.serie}). Ref ${lead.ref}`,
        }),
      );

      avisarAgendaInterna({
        tipo: "visita",
        reagendada: !!atual,
        inicio: escolhido.inicio,
        responsavel: lead.nome,
        telefone: lead.whatsapp,
        serie: lead.serie,
        turno: lead.turno,
        origem: origemDoLead(lead),
        painel: "/matricula/leads",
      });

      espera(
        sendMetaEvent(req, "Schedule", {
          eventId: opt(body?.meta_event_id, 100),
          telefone: lead.whatsapp,
          fbp: lead.fbp,
          fbc: lead.fbc,
          pageUrl: opt(body?.page_url, 2000),
          contentName: "visita",
          segmento: segmentoDaSerie(lead.serie),
        }),
      );

      return json({ ok: true, inicio: escolhido.inicio, texto: escolhido.texto });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("lead-site erro:", (e as Error)?.message ?? e);
    return json({ error: "erro_interno" }, 500);
  }
});
