/**
 * Painel admin: dados dos responsáveis (alunos_26) e acesso das famílias.
 *  - buscar: aluno pelo código, com irmãos e a situação da conta de acesso de mãe e pai.
 *  - salvar: altera nome, CPF, e-mail e telefone de um responsável em todas as linhas da
 *    família (irmãos) e acompanha a conta de acesso (o login por CPF busca o e-mail aqui).
 *  - acesso_temporario: cria ou redefine a conta com senha temporária; a família troca a
 *    senha no primeiro acesso.
 * Exclusivo para administradores. Toda alteração fica em alunos_26_alteracoes.
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { FROM_EMAIL } from "../_shared/prematricula-mensagens.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Resp = "mae" | "pai";
const CAMPOS = {
  mae: { nome: "nome_mae", cpf: "cpf_mae", email: "email_mae", telefone: "telefone_mae" },
  pai: { nome: "nome_pai", cpf: "cpf_pai", email: "email_pai", telefone: "celular_pai" },
} as const;

const digitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

const cpfValido = (cpf: string) => {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(cpf[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10]);
};
// Mesmo formato usado na tabela: 000000000-00
const cpfTabela = (cpf: string) => (cpf ? `${cpf.slice(0, 9)}-${cpf.slice(9)}` : "");

// Senha temporária fácil de ditar por telefone (sem letras e números que se confundem)
const senhaTemporaria = () => {
  const letras = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const nums = "23456789";
  const b = crypto.getRandomValues(new Uint8Array(8));
  const l = (i: number) => letras[b[i] % letras.length];
  const n = (i: number) => nums[b[i] % nums.length];
  // Atende à política de senha do projeto: minúscula, maiúscula, número e caractere especial
  return `Zp${l(0)}${l(1)}${l(2)}@${n(3)}${n(4)}${n(5)}${n(6)}`;
};

/** E-mail com a senha temporária (template "acesso-temporario" publicado no Resend). */
const enviarEmailAcesso = async (para: string, nome: string, cpf: string, senha: string) => {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return "sem_resend";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [para],
      subject: "Seu acesso ao site do Colégio Zampieri",
      template: {
        id: "acesso-temporario",
        variables: {
          NOME: nome.split(/\s+/)[0] || "família",
          CPF_FINAL: `${cpf.slice(6, 9)}-${cpf.slice(9)}`,
          SENHA: senha,
        },
      },
    }),
  });
  if (res.ok) return null;
  // Nunca registra a senha: só o status e a resposta do Resend
  console.error(`email acesso temporario status=${res.status} resposta=${(await res.text()).slice(0, 300)}`);
  return "falha_envio";
};

interface Linha {
  id: number;
  codigo_aluno: string | null;
  nome_aluno: string | null;
  curso: string | null;
  [k: string]: unknown;
}

const contas = async (admin: SupabaseClient, emails: string[]) => {
  const { data, error } = await admin.rpc("admin_contas_por_email", { p_emails: emails.filter(Boolean) });
  if (error) throw error;
  return (data ?? []) as { id: string; email: string; criado_em: string; ultimo_acesso: string | null; confirmado: boolean; trocar_senha: boolean }[];
};

/** Linhas da mesma família: o próprio aluno e os irmãos com o mesmo CPF de responsável. */
const familia = async (admin: SupabaseClient, base: Linha, resp: Resp) => {
  const cpf = digitos(base[CAMPOS[resp].cpf]);
  if (cpf.length !== 11) return [base];
  const { data, error } = await admin.from("alunos_26").select("*").or(`${CAMPOS[resp].cpf}.eq.${cpfTabela(cpf)},${CAMPOS[resp].cpf}.eq.${cpf}`);
  if (error) throw error;
  const linhas = ((data ?? []) as Linha[]).filter((l) => digitos(l[CAMPOS[resp].cpf]) === cpf);
  return linhas.some((l) => l.id === base.id) ? linhas : [base, ...linhas];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "nao_autenticado" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: userRes } = await admin.auth.getUser(jwt);
    const solicitante = userRes?.user;
    if (!solicitante) return json({ error: "nao_autenticado" }, 401);
    const { data: ehAdmin } = await admin.rpc("has_role", { _user_id: solicitante.id, _role: "admin" });
    if (!ehAdmin) return json({ error: "sem_permissao" }, 403);

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao || "");

    const carregarAluno = async (id: number) => {
      const { data, error } = await admin.from("alunos_26").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Linha | null;
    };

    if (acao === "buscar") {
      const termo = String(body?.codigo || "").trim();
      if (!termo) return json({ error: "codigo_obrigatorio" }, 400);
      const { data, error } = await admin.from("alunos_26").select("*").eq("codigo_aluno", termo).order("id");
      if (error) throw error;
      const alunos = (data ?? []) as Linha[];
      if (!alunos.length) return json({ error: "aluno_nao_encontrado" }, 404);

      const resultado = [];
      for (const a of alunos) {
        const emails = [String(a.email_mae || ""), String(a.email_pai || "")];
        const lista = await contas(admin, emails);
        const conta = (email: unknown) => lista.find((c) => c.email.toLowerCase() === String(email || "").trim().toLowerCase()) ?? null;
        const irmaos = async (resp: Resp) =>
          (await familia(admin, a, resp)).filter((l) => l.id !== a.id).map((l) => ({ codigo: l.codigo_aluno, nome: l.nome_aluno }));
        resultado.push({
          aluno: a,
          contas: { mae: conta(a.email_mae), pai: conta(a.email_pai) },
          irmaos: { mae: await irmaos("mae"), pai: await irmaos("pai") },
        });
      }
      const { data: historico } = await admin
        .from("alunos_26_alteracoes")
        .select("created_at, acao, responsavel, antes, depois, alterado_por")
        .eq("codigo_aluno", termo)
        .order("created_at", { ascending: false })
        .limit(20);
      return json({ ok: true, resultado, historico: historico ?? [] });
    }

    if (acao === "salvar") {
      const id = Number(body?.id);
      const resp = String(body?.responsavel) as Resp;
      if (!Number.isFinite(id) || !(resp in CAMPOS)) return json({ error: "parametros_invalidos" }, 400);
      const base = await carregarAluno(id);
      if (!base) return json({ error: "aluno_nao_encontrado" }, 404);
      const c = CAMPOS[resp];

      const nome = String(body?.nome ?? "").trim().replace(/\s+/g, " ").slice(0, 150);
      const cpf = digitos(body?.cpf);
      const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);
      const telefone = digitos(body?.telefone).replace(/^55(?=\d{10,11}$)/, "");
      if (cpf && !cpfValido(cpf)) return json({ error: "cpf_invalido" }, 400);
      if (email && !emailValido(email)) return json({ error: "email_invalido" }, 400);
      if (telefone && !/^\d{10,11}$/.test(telefone)) return json({ error: "telefone_invalido" }, 400);

      const linhas = await familia(admin, base, resp);
      const idsFamilia = new Set(linhas.map((l) => l.id));

      // CPF novo não pode pertencer a outra família
      const cpfAntigo = digitos(base[c.cpf]);
      if (cpf && cpf !== cpfAntigo) {
        const { data: outros } = await admin
          .from("alunos_26")
          .select("id, codigo_aluno, cpf_mae, cpf_pai")
          .or(`cpf_mae.eq.${cpfTabela(cpf)},cpf_pai.eq.${cpfTabela(cpf)},cpf_mae.eq.${cpf},cpf_pai.eq.${cpf}`);
        const conflito = (outros ?? []).find(
          (o) => !idsFamilia.has(o.id) && (digitos(o.cpf_mae) === cpf || digitos(o.cpf_pai) === cpf),
        );
        if (conflito) return json({ error: "cpf_em_uso", codigo: conflito.codigo_aluno }, 409);
      }

      const antes = { nome: base[c.nome], cpf: base[c.cpf], email: base[c.email], telefone: base[c.telefone] };
      const novo = { [c.nome]: nome || null, [c.cpf]: cpf ? cpfTabela(cpf) : null, [c.email]: email || null, [c.telefone]: telefone || null };

      // Conta de acesso: acompanha a troca de e-mail e CPF
      const emailAntigo = String(base[c.email] || "").trim().toLowerCase();
      const avisos: string[] = [];
      if (email && email !== emailAntigo) {
        const [contaNova] = await contas(admin, [email]);
        const [contaAntiga] = emailAntigo ? await contas(admin, [emailAntigo]) : [];
        if (contaNova && contaAntiga && contaNova.id !== contaAntiga.id) {
          return json({ error: "email_em_uso" }, 409);
        }
        const outro = CAMPOS[resp === "mae" ? "pai" : "mae"];
        const compartilhado = String(base[outro.email] || "").trim().toLowerCase() === emailAntigo;
        if (contaAntiga && !contaNova && compartilhado) {
          avisos.push("A conta de login antiga também é usada pelo outro responsável e não foi alterada. Gere um acesso temporário para o novo e-mail.");
        } else if (contaAntiga && !contaNova) {
          const { error } = await admin.auth.admin.updateUserById(contaAntiga.id, { email, email_confirm: true });
          if (error) return json({ error: "falha_conta", detalhe: error.message }, 400);
          avisos.push("O e-mail de login foi trocado junto. A senha continua a mesma.");
        }
      }
      if (cpf && cpf !== cpfAntigo) {
        const [conta] = await contas(admin, [email || emailAntigo]);
        if (conta) {
          const { data: u } = await admin.auth.admin.getUserById(conta.id);
          await admin.auth.admin.updateUserById(conta.id, { user_metadata: { ...(u?.user?.user_metadata ?? {}), cpf } });
        }
      }

      const ids = linhas.map((l) => l.id);
      const { error: upErr } = await admin.from("alunos_26").update(novo).in("id", ids);
      if (upErr) throw upErr;

      await admin.from("alunos_26_alteracoes").insert({
        alterado_por: solicitante.id,
        codigo_aluno: base.codigo_aluno,
        acao: "editar",
        responsavel: resp,
        antes,
        depois: { nome: novo[c.nome], cpf: novo[c.cpf], email: novo[c.email], telefone: novo[c.telefone] },
        alunos_afetados: linhas.map((l) => String(l.codigo_aluno)),
      });

      return json({ ok: true, alunos_afetados: linhas.map((l) => ({ codigo: l.codigo_aluno, nome: l.nome_aluno })), avisos });
    }

    if (acao === "acesso_temporario") {
      const id = Number(body?.id);
      const resp = String(body?.responsavel) as Resp;
      if (!Number.isFinite(id) || !(resp in CAMPOS)) return json({ error: "parametros_invalidos" }, 400);
      const base = await carregarAluno(id);
      if (!base) return json({ error: "aluno_nao_encontrado" }, 404);
      const c = CAMPOS[resp];
      const email = String(base[c.email] || "").trim().toLowerCase();
      const cpf = digitos(base[c.cpf]);
      const nome = String(base[c.nome] || "").trim();
      if (!emailValido(email)) return json({ error: "sem_email" }, 400);
      if (cpf.length !== 11) return json({ error: "sem_cpf" }, 400);

      const senha = senhaTemporaria();
      const [conta] = await contas(admin, [email]);
      let criada = false;
      if (conta) {
        const { data: u } = await admin.auth.admin.getUserById(conta.id);
        const { error } = await admin.auth.admin.updateUserById(conta.id, {
          password: senha,
          email_confirm: true,
          user_metadata: { ...(u?.user?.user_metadata ?? {}), cpf, nome: nome || undefined, trocar_senha: true },
        });
        if (error) return json({ error: "falha_conta", detalhe: error.message }, 400);
      } else {
        const { error } = await admin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
          user_metadata: { cpf, nome: nome || undefined, trocar_senha: true },
        });
        if (error) return json({ error: "falha_conta", detalhe: error.message }, 400);
        criada = true;
      }

      await admin.from("alunos_26_alteracoes").insert({
        alterado_por: solicitante.id,
        codigo_aluno: base.codigo_aluno,
        acao: "acesso_temporario",
        responsavel: resp,
        depois: { email, conta_criada: criada },
      });

      const erroEmail = await enviarEmailAcesso(email, nome, cpf, senha).catch(() => "falha_envio");

      // A senha só volta nesta resposta e no e-mail da família: não é gravada em lugar nenhum
      return json({ ok: true, senha, email, cpf, criada, email_enviado: !erroEmail });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("admin-responsaveis erro:", (e as Error)?.message ?? e);
    return json({ error: "erro_interno" }, 500);
  }
});
