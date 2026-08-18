export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      alunos_26: {
        Row: {
          celular_pai: string | null
          cod_mae: number | null
          cod_pai: number | null
          codigo_aluno: string | null
          cpf_mae: string | null
          cpf_pai: string | null
          created_at: string
          curso: string | null
          email_mae: string | null
          email_pai: string | null
          id: number
          nome_aluno: string | null
          nome_mae: string | null
          nome_pai: string | null
          telefone_mae: string | null
        }
        Insert: {
          celular_pai?: string | null
          cod_mae?: number | null
          cod_pai?: number | null
          codigo_aluno?: string | null
          cpf_mae?: string | null
          cpf_pai?: string | null
          created_at?: string
          curso?: string | null
          email_mae?: string | null
          email_pai?: string | null
          id?: number
          nome_aluno?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          telefone_mae?: string | null
        }
        Update: {
          celular_pai?: string | null
          cod_mae?: number | null
          cod_pai?: number | null
          codigo_aluno?: string | null
          cpf_mae?: string | null
          cpf_pai?: string | null
          created_at?: string
          curso?: string | null
          email_mae?: string | null
          email_pai?: string | null
          id?: number
          nome_aluno?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          telefone_mae?: string | null
        }
        Relationships: []
      }
      alunos_rematricula_2027: {
        Row: {
          anuidade_total: string | null
          anuidade_total_ext: string | null
          asaas_checkout_id: string | null
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          bairro_mae: string | null
          bairro_pai: string | null
          celular_mae: string | null
          celular_pai: string | null
          cep_mae: string | null
          cep_pai: string | null
          checkout_criado_em: string | null
          checkout_url: string | null
          cidade_mae: string | null
          cidade_pai: string | null
          complemento_mae: string | null
          complemento_pai: string | null
          conferida: boolean
          conferida_em: string | null
          conferida_por: string | null
          contrato_assinado: boolean | null
          contrato_gerado: boolean | null
          cpf_aluno: string | null
          cpf_mae: string | null
          cpf_pai: string | null
          created_at: string | null
          curso_2027: string
          curso_atual: string
          data_nascimento_aluno: string
          data_nascimento_mae: string | null
          data_nascimento_pai: string | null
          data_pagamento: string | null
          dia_vencimento: number
          email_conclusao_enviado_em: string | null
          email_mae: string | null
          email_pai: string | null
          estado_civil_mae: string | null
          estado_civil_pai: string | null
          estado_mae: string | null
          estado_pai: string | null
          forma_pagamento: string | null
          id_aluno: number
          link_contrato: string | null
          logradouro_mae: string | null
          logradouro_pai: string | null
          nacionalidade_mae: string | null
          nacionalidade_pai: string | null
          naturalidade_mae: string | null
          naturalidade_pai: string | null
          nome_aluno: string
          nome_mae: string | null
          nome_pai: string | null
          numero_mae: string | null
          numero_pai: string | null
          parcelas: number | null
          percentual_desconto: number
          percentual_desconto_ext: string | null
          rematricula_concluida: boolean | null
          rematricula_liberada: boolean | null
          responsavel_financeiro: string | null
          rg_mae: string | null
          rg_pai: string | null
          telefone_mae: string | null
          telefone_pai: string | null
          tem_mae: string
          tem_pai: string
          turno_escolhido: string | null
          updated_at: string | null
          valor_cheio: number | null
          valor_com_desconto: number
          valor_com_desconto_ext: string | null
          valor_pago: number | null
          valor_pri_parcela: string | null
          valor_pri_parcela_ext: string | null
          zapsign_token: string | null
        }
        Insert: {
          anuidade_total?: string | null
          anuidade_total_ext?: string | null
          asaas_checkout_id?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          bairro_mae?: string | null
          bairro_pai?: string | null
          celular_mae?: string | null
          celular_pai?: string | null
          cep_mae?: string | null
          cep_pai?: string | null
          checkout_criado_em?: string | null
          checkout_url?: string | null
          cidade_mae?: string | null
          cidade_pai?: string | null
          complemento_mae?: string | null
          complemento_pai?: string | null
          conferida?: boolean
          conferida_em?: string | null
          conferida_por?: string | null
          contrato_assinado?: boolean | null
          contrato_gerado?: boolean | null
          cpf_aluno?: string | null
          cpf_mae?: string | null
          cpf_pai?: string | null
          created_at?: string | null
          curso_2027: string
          curso_atual: string
          data_nascimento_aluno: string
          data_nascimento_mae?: string | null
          data_nascimento_pai?: string | null
          data_pagamento?: string | null
          dia_vencimento: number
          email_conclusao_enviado_em?: string | null
          email_mae?: string | null
          email_pai?: string | null
          estado_civil_mae?: string | null
          estado_civil_pai?: string | null
          estado_mae?: string | null
          estado_pai?: string | null
          forma_pagamento?: string | null
          id_aluno: number
          link_contrato?: string | null
          logradouro_mae?: string | null
          logradouro_pai?: string | null
          nacionalidade_mae?: string | null
          nacionalidade_pai?: string | null
          naturalidade_mae?: string | null
          naturalidade_pai?: string | null
          nome_aluno: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero_mae?: string | null
          numero_pai?: string | null
          parcelas?: number | null
          percentual_desconto: number
          percentual_desconto_ext?: string | null
          rematricula_concluida?: boolean | null
          rematricula_liberada?: boolean | null
          responsavel_financeiro?: string | null
          rg_mae?: string | null
          rg_pai?: string | null
          telefone_mae?: string | null
          telefone_pai?: string | null
          tem_mae?: string
          tem_pai?: string
          turno_escolhido?: string | null
          updated_at?: string | null
          valor_cheio?: number | null
          valor_com_desconto: number
          valor_com_desconto_ext?: string | null
          valor_pago?: number | null
          valor_pri_parcela?: string | null
          valor_pri_parcela_ext?: string | null
          zapsign_token?: string | null
        }
        Update: {
          anuidade_total?: string | null
          anuidade_total_ext?: string | null
          asaas_checkout_id?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          bairro_mae?: string | null
          bairro_pai?: string | null
          celular_mae?: string | null
          celular_pai?: string | null
          cep_mae?: string | null
          cep_pai?: string | null
          checkout_criado_em?: string | null
          checkout_url?: string | null
          cidade_mae?: string | null
          cidade_pai?: string | null
          complemento_mae?: string | null
          complemento_pai?: string | null
          conferida?: boolean
          conferida_em?: string | null
          conferida_por?: string | null
          contrato_assinado?: boolean | null
          contrato_gerado?: boolean | null
          cpf_aluno?: string | null
          cpf_mae?: string | null
          cpf_pai?: string | null
          created_at?: string | null
          curso_2027?: string
          curso_atual?: string
          data_nascimento_aluno?: string
          data_nascimento_mae?: string | null
          data_nascimento_pai?: string | null
          data_pagamento?: string | null
          dia_vencimento?: number
          email_conclusao_enviado_em?: string | null
          email_mae?: string | null
          email_pai?: string | null
          estado_civil_mae?: string | null
          estado_civil_pai?: string | null
          estado_mae?: string | null
          estado_pai?: string | null
          forma_pagamento?: string | null
          id_aluno?: number
          link_contrato?: string | null
          logradouro_mae?: string | null
          logradouro_pai?: string | null
          nacionalidade_mae?: string | null
          nacionalidade_pai?: string | null
          naturalidade_mae?: string | null
          naturalidade_pai?: string | null
          nome_aluno?: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero_mae?: string | null
          numero_pai?: string | null
          parcelas?: number | null
          percentual_desconto?: number
          percentual_desconto_ext?: string | null
          rematricula_concluida?: boolean | null
          rematricula_liberada?: boolean | null
          responsavel_financeiro?: string | null
          rg_mae?: string | null
          rg_pai?: string | null
          telefone_mae?: string | null
          telefone_pai?: string | null
          tem_mae?: string
          tem_pai?: string
          turno_escolhido?: string | null
          updated_at?: string | null
          valor_cheio?: number | null
          valor_com_desconto?: number
          valor_com_desconto_ext?: string | null
          valor_pago?: number | null
          valor_pri_parcela?: string | null
          valor_pri_parcela_ext?: string | null
          zapsign_token?: string | null
        }
        Relationships: []
      }
      alunosIntegraSae: {
        Row: {
          aluno: string | null
          boleto: string | null
          codigo_aluno: number | null
          codigo_mae: number | null
          codigo_pai: number | null
          codigo_resp_fin: number | null
          CPF_resp_fin: string | null
          curso_aluno: string | null
          curso_completo: string | null
          email_resp: string | null
          enviado: boolean | null
          id: number
          id_curso: number | null
          nome_responsavel: string | null
          pago: boolean | null
          valor: string | null
          vencimento: string | null
          whatsapp_fin: string | null
        }
        Insert: {
          aluno?: string | null
          boleto?: string | null
          codigo_aluno?: number | null
          codigo_mae?: number | null
          codigo_pai?: number | null
          codigo_resp_fin?: number | null
          CPF_resp_fin?: string | null
          curso_aluno?: string | null
          curso_completo?: string | null
          email_resp?: string | null
          enviado?: boolean | null
          id: number
          id_curso?: number | null
          nome_responsavel?: string | null
          pago?: boolean | null
          valor?: string | null
          vencimento?: string | null
          whatsapp_fin?: string | null
        }
        Update: {
          aluno?: string | null
          boleto?: string | null
          codigo_aluno?: number | null
          codigo_mae?: number | null
          codigo_pai?: number | null
          codigo_resp_fin?: number | null
          CPF_resp_fin?: string | null
          curso_aluno?: string | null
          curso_completo?: string | null
          email_resp?: string | null
          enviado?: boolean | null
          id?: number
          id_curso?: number | null
          nome_responsavel?: string | null
          pago?: boolean | null
          valor?: string | null
          vencimento?: string | null
          whatsapp_fin?: string | null
        }
        Relationships: []
      }
      asaas_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          payment_id: string | null
          processed: boolean
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          payment_id?: string | null
          processed?: boolean
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          payment_id?: string | null
          processed?: boolean
        }
        Relationships: []
      }
      boletim_mensal_26: {
        Row: {
          codigo_aluno: string | null
          curso: string | null
          hash: string | null
          id: number
          link_boletim: string | null
          nome_aluno: string | null
        }
        Insert: {
          codigo_aluno?: string | null
          curso?: string | null
          hash?: string | null
          id?: number
          link_boletim?: string | null
          nome_aluno?: string | null
        }
        Update: {
          codigo_aluno?: string | null
          curso?: string | null
          hash?: string | null
          id?: number
          link_boletim?: string | null
          nome_aluno?: string | null
        }
        Relationships: []
      }
      boletos_26: {
        Row: {
          codigo_aluno: string | null
          codigo_barras: string | null
          created_at: string
          curso: string | null
          data_pagamento_boleto: string | null
          id: number
          link_boleto: string | null
          mes_boleto: string | null
          nome_aluno: string | null
          status_boleto: string | null
          valor_boleto: string | null
          vencimento_boleto: string | null
        }
        Insert: {
          codigo_aluno?: string | null
          codigo_barras?: string | null
          created_at?: string
          curso?: string | null
          data_pagamento_boleto?: string | null
          id?: number
          link_boleto?: string | null
          mes_boleto?: string | null
          nome_aluno?: string | null
          status_boleto?: string | null
          valor_boleto?: string | null
          vencimento_boleto?: string | null
        }
        Update: {
          codigo_aluno?: string | null
          codigo_barras?: string | null
          created_at?: string
          curso?: string | null
          data_pagamento_boleto?: string | null
          id?: number
          link_boleto?: string | null
          mes_boleto?: string | null
          nome_aluno?: string | null
          status_boleto?: string | null
          valor_boleto?: string | null
          vencimento_boleto?: string | null
        }
        Relationships: []
      }
      codigosCurso: {
        Row: {
          codigo: number | null
          descricao: string | null
          id: number
        }
        Insert: {
          codigo?: number | null
          descricao?: string | null
          id?: number
        }
        Update: {
          codigo?: number | null
          descricao?: string | null
          id?: number
        }
        Relationships: []
      }
      compradores_externos: {
        Row: {
          celular: string | null
          cpf: string
          created_at: string
          data_nascimento: string | null
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          celular?: string | null
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          celular?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comunicados_2026: {
        Row: {
          codigo_aluno: string | null
          created_at: string
          id: number
          link: string | null
          mensagem: string | null
          nome_aluno: string | null
        }
        Insert: {
          codigo_aluno?: string | null
          created_at?: string
          id?: number
          link?: string | null
          mensagem?: string | null
          nome_aluno?: string | null
        }
        Update: {
          codigo_aluno?: string | null
          created_at?: string
          id?: number
          link?: string | null
          mensagem?: string | null
          nome_aluno?: string | null
        }
        Relationships: []
      }
      conteudos_taredas: {
        Row: {
          Conteudo: string | null
          created_at: string
          Curso: string | null
          data_de_lancamento: string | null
          Disciplina: string | null
          id: number
          "Tarefa de casa": string | null
        }
        Insert: {
          Conteudo?: string | null
          created_at?: string
          Curso?: string | null
          data_de_lancamento?: string | null
          Disciplina?: string | null
          id?: number
          "Tarefa de casa"?: string | null
        }
        Update: {
          Conteudo?: string | null
          created_at?: string
          Curso?: string | null
          data_de_lancamento?: string | null
          Disciplina?: string | null
          id?: number
          "Tarefa de casa"?: string | null
        }
        Relationships: []
      }
      disciplinas_alunos: {
        Row: {
          cod_discplina: number | null
          disciplina: string
          id: number
        }
        Insert: {
          cod_discplina?: number | null
          disciplina: string
          id?: number
        }
        Update: {
          cod_discplina?: number | null
          disciplina?: string
          id?: number
        }
        Relationships: []
      }
      evento_produtos: {
        Row: {
          ativo: boolean
          created_at: string
          destaque_label: string | null
          escassez_template: string | null
          escassez_variacoes: Json | null
          evento_id: string
          id: string
          nome_override: string | null
          nomes_override_variacoes: Json | null
          ordem: number
          pre_selecionado: boolean
          preco_evento: Json | null
          preco_override: Json | null
          preco_riscado: Json | null
          produto_id: string
          qtd_padrao: number
          variacao_padrao_id: string | null
          variacoes_ids: string[] | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          destaque_label?: string | null
          escassez_template?: string | null
          escassez_variacoes?: Json | null
          evento_id: string
          id?: string
          nome_override?: string | null
          nomes_override_variacoes?: Json | null
          ordem?: number
          pre_selecionado?: boolean
          preco_evento?: Json | null
          preco_override?: Json | null
          preco_riscado?: Json | null
          produto_id: string
          qtd_padrao?: number
          variacao_padrao_id?: string | null
          variacoes_ids?: string[] | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          destaque_label?: string | null
          escassez_template?: string | null
          escassez_variacoes?: Json | null
          evento_id?: string
          id?: string
          nome_override?: string | null
          nomes_override_variacoes?: Json | null
          ordem?: number
          pre_selecionado?: boolean
          preco_evento?: Json | null
          preco_override?: Json | null
          preco_riscado?: Json | null
          produto_id?: string
          qtd_padrao?: number
          variacao_padrao_id?: string | null
          variacoes_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "evento_produtos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          aluno_cortesia: boolean
          ativo: boolean
          categorias_meia: string[]
          created_at: string
          data_evento: string
          descricao: string | null
          horario: string | null
          id: string
          imagem_url: string | null
          is_excursao: boolean
          local: string | null
          max_parcelas: number
          meia_entrada_habilitada: boolean
          percentual_meia: number
          preco: number
          preco_meia: number
          preco_meia_parcelado: number
          preco_parcelado: number
          publico_alvo: string
          requer_autorizacao: boolean
          sucesso_upsell_ativo: boolean
          sucesso_upsell_badge: string | null
          sucesso_upsell_subtitulo: string | null
          sucesso_upsell_titulo: string | null
          sucesso_upsell_variacao_id: string | null
          tipo_evento: string
          titulo: string
          updated_at: string
          vagas_disponiveis: number
          vagas_total: number
        }
        Insert: {
          aluno_cortesia?: boolean
          ativo?: boolean
          categorias_meia?: string[]
          created_at?: string
          data_evento: string
          descricao?: string | null
          horario?: string | null
          id?: string
          imagem_url?: string | null
          is_excursao?: boolean
          local?: string | null
          max_parcelas?: number
          meia_entrada_habilitada?: boolean
          percentual_meia?: number
          preco?: number
          preco_meia?: number
          preco_meia_parcelado?: number
          preco_parcelado?: number
          publico_alvo?: string
          requer_autorizacao?: boolean
          sucesso_upsell_ativo?: boolean
          sucesso_upsell_badge?: string | null
          sucesso_upsell_subtitulo?: string | null
          sucesso_upsell_titulo?: string | null
          sucesso_upsell_variacao_id?: string | null
          tipo_evento?: string
          titulo: string
          updated_at?: string
          vagas_disponiveis?: number
          vagas_total?: number
        }
        Update: {
          aluno_cortesia?: boolean
          ativo?: boolean
          categorias_meia?: string[]
          created_at?: string
          data_evento?: string
          descricao?: string | null
          horario?: string | null
          id?: string
          imagem_url?: string | null
          is_excursao?: boolean
          local?: string | null
          max_parcelas?: number
          meia_entrada_habilitada?: boolean
          percentual_meia?: number
          preco?: number
          preco_meia?: number
          preco_meia_parcelado?: number
          preco_parcelado?: number
          publico_alvo?: string
          requer_autorizacao?: boolean
          sucesso_upsell_ativo?: boolean
          sucesso_upsell_badge?: string | null
          sucesso_upsell_subtitulo?: string | null
          sucesso_upsell_titulo?: string | null
          sucesso_upsell_variacao_id?: string | null
          tipo_evento?: string
          titulo?: string
          updated_at?: string
          vagas_disponiveis?: number
          vagas_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "eventos_sucesso_upsell_variacao_id_fkey"
            columns: ["sucesso_upsell_variacao_id"]
            isOneToOne: false
            referencedRelation: "produto_variacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ingressos: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          cancelado_em: string | null
          cancelado_por: string | null
          categoria_meia: string | null
          celular_participante: string | null
          checkout_criado_em: string | null
          checkout_id: string | null
          checkout_url: string | null
          codigo_aluno: string | null
          comprovante_estorno_url: string | null
          cortesia: boolean
          cpf_participante: string | null
          created_at: string
          data_credito: string | null
          data_nascimento_participante: string | null
          data_pagamento: string | null
          declaracao_meia_aceita: boolean
          declaracao_meia_aceita_em: string | null
          email_confirmacao_enviado_em: string | null
          email_participante: string | null
          evento_id: string
          forma_pagamento: string | null
          id: string
          meia_validada_em: string | null
          meia_validada_por: string | null
          meia_validada_portaria: boolean
          motivo_cancelamento: string | null
          nome_comprador: string
          nome_participante: string | null
          parcelas: number
          quantidade: number
          status: string
          taxa_manual: number | null
          taxa_manual_em: string | null
          taxa_manual_por: string | null
          taxa_total: number | null
          tipo_comprador: string
          tipo_ingresso: string
          tipo_participante: string
          upsell_bingo: boolean | null
          user_id: string
          utilizado: boolean
          utilizado_em: string | null
          utilizado_por: string | null
          valor_bruto: number | null
          valor_liquido: number | null
          valor_total: number
          webhook_payment_id: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          categoria_meia?: string | null
          celular_participante?: string | null
          checkout_criado_em?: string | null
          checkout_id?: string | null
          checkout_url?: string | null
          codigo_aluno?: string | null
          comprovante_estorno_url?: string | null
          cortesia?: boolean
          cpf_participante?: string | null
          created_at?: string
          data_credito?: string | null
          data_nascimento_participante?: string | null
          data_pagamento?: string | null
          declaracao_meia_aceita?: boolean
          declaracao_meia_aceita_em?: string | null
          email_confirmacao_enviado_em?: string | null
          email_participante?: string | null
          evento_id: string
          forma_pagamento?: string | null
          id?: string
          meia_validada_em?: string | null
          meia_validada_por?: string | null
          meia_validada_portaria?: boolean
          motivo_cancelamento?: string | null
          nome_comprador: string
          nome_participante?: string | null
          parcelas?: number
          quantidade?: number
          status?: string
          taxa_manual?: number | null
          taxa_manual_em?: string | null
          taxa_manual_por?: string | null
          taxa_total?: number | null
          tipo_comprador?: string
          tipo_ingresso?: string
          tipo_participante?: string
          upsell_bingo?: boolean | null
          user_id: string
          utilizado?: boolean
          utilizado_em?: string | null
          utilizado_por?: string | null
          valor_bruto?: number | null
          valor_liquido?: number | null
          valor_total?: number
          webhook_payment_id?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          categoria_meia?: string | null
          celular_participante?: string | null
          checkout_criado_em?: string | null
          checkout_id?: string | null
          checkout_url?: string | null
          codigo_aluno?: string | null
          comprovante_estorno_url?: string | null
          cortesia?: boolean
          cpf_participante?: string | null
          created_at?: string
          data_credito?: string | null
          data_nascimento_participante?: string | null
          data_pagamento?: string | null
          declaracao_meia_aceita?: boolean
          declaracao_meia_aceita_em?: string | null
          email_confirmacao_enviado_em?: string | null
          email_participante?: string | null
          evento_id?: string
          forma_pagamento?: string | null
          id?: string
          meia_validada_em?: string | null
          meia_validada_por?: string | null
          meia_validada_portaria?: boolean
          motivo_cancelamento?: string | null
          nome_comprador?: string
          nome_participante?: string | null
          parcelas?: number
          quantidade?: number
          status?: string
          taxa_manual?: number | null
          taxa_manual_em?: string | null
          taxa_manual_por?: string | null
          taxa_total?: number | null
          tipo_comprador?: string
          tipo_ingresso?: string
          tipo_participante?: string
          upsell_bingo?: boolean | null
          user_id?: string
          utilizado?: boolean
          utilizado_em?: string | null
          utilizado_por?: string | null
          valor_bruto?: number | null
          valor_liquido?: number | null
          valor_total?: number
          webhook_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingressos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      matricula_documentos: {
        Row: {
          created_at: string
          id: string
          matricula_id: string
          motivo: string | null
          nome_arquivo: string | null
          status: string
          storage_path: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          matricula_id: string
          motivo?: string | null
          nome_arquivo?: string | null
          status?: string
          storage_path: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          matricula_id?: string
          motivo?: string | null
          nome_arquivo?: string | null
          status?: string
          storage_path?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matricula_documentos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          anuidade_total: string | null
          anuidade_total_ext: string | null
          asaas_checkout_id: string | null
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          bairro: string | null
          celular_mae: string | null
          celular_pai: string | null
          cep: string | null
          checkout_criado_em: string | null
          checkout_url: string | null
          cidade: string | null
          complemento: string | null
          concluida_em: string | null
          contrato_assinado: boolean
          contrato_assinado_em: string | null
          contrato_gerado: boolean
          contrato_gerado_em: string | null
          cpf_mae: string | null
          cpf_pai: string | null
          created_at: string
          curso: string | null
          dados_preenchidos_em: string | null
          data_nascimento_aluno: string | null
          data_nascimento_mae: string | null
          data_nascimento_pai: string | null
          data_pagamento: string | null
          dia_vencimento: number | null
          documentos_aprovados_em: string | null
          email_conclusao_enviado_em: string | null
          email_mae: string | null
          email_pai: string | null
          estado: string | null
          estado_civil_mae: string | null
          estado_civil_pai: string | null
          forma_pagamento: string | null
          id: string
          link_contrato: string | null
          logradouro: string | null
          matricula_gratuita: boolean
          max_parcelas: number
          nacionalidade_mae: string | null
          nacionalidade_pai: string | null
          naturalidade_mae: string | null
          naturalidade_pai: string | null
          nome_aluno: string | null
          nome_mae: string | null
          nome_pai: string | null
          numero: string | null
          parcelas: number | null
          percentual_desconto: number | null
          percentual_desconto_ext: string | null
          permite_avista: boolean
          permite_parcelado: boolean
          prematricula_id: string
          profissao_mae: string | null
          profissao_pai: string | null
          resp_fin_celular: string | null
          resp_fin_cpf: string | null
          resp_fin_data_nascimento: string | null
          resp_fin_email: string | null
          resp_fin_estado_civil: string | null
          resp_fin_nacionalidade: string | null
          resp_fin_naturalidade: string | null
          resp_fin_nome: string | null
          resp_fin_profissao: string | null
          resp_fin_quem: string | null
          resp_fin_rg: string | null
          rg_mae: string | null
          rg_pai: string | null
          status: string
          turno: string | null
          updated_at: string
          valor_com_desconto: number | null
          valor_com_desconto_ext: string | null
          valor_matricula: number | null
          valor_pago: number | null
          valor_pri_parcela: string | null
          valor_pri_parcela_ext: string | null
          zapsign_token: string | null
        }
        Insert: {
          anuidade_total?: string | null
          anuidade_total_ext?: string | null
          asaas_checkout_id?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          bairro?: string | null
          celular_mae?: string | null
          celular_pai?: string | null
          cep?: string | null
          checkout_criado_em?: string | null
          checkout_url?: string | null
          cidade?: string | null
          complemento?: string | null
          concluida_em?: string | null
          contrato_assinado?: boolean
          contrato_assinado_em?: string | null
          contrato_gerado?: boolean
          contrato_gerado_em?: string | null
          cpf_mae?: string | null
          cpf_pai?: string | null
          created_at?: string
          curso?: string | null
          dados_preenchidos_em?: string | null
          data_nascimento_aluno?: string | null
          data_nascimento_mae?: string | null
          data_nascimento_pai?: string | null
          data_pagamento?: string | null
          dia_vencimento?: number | null
          documentos_aprovados_em?: string | null
          email_conclusao_enviado_em?: string | null
          email_mae?: string | null
          email_pai?: string | null
          estado?: string | null
          estado_civil_mae?: string | null
          estado_civil_pai?: string | null
          forma_pagamento?: string | null
          id?: string
          link_contrato?: string | null
          logradouro?: string | null
          matricula_gratuita?: boolean
          max_parcelas?: number
          nacionalidade_mae?: string | null
          nacionalidade_pai?: string | null
          naturalidade_mae?: string | null
          naturalidade_pai?: string | null
          nome_aluno?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          parcelas?: number | null
          percentual_desconto?: number | null
          percentual_desconto_ext?: string | null
          permite_avista?: boolean
          permite_parcelado?: boolean
          prematricula_id: string
          profissao_mae?: string | null
          profissao_pai?: string | null
          resp_fin_celular?: string | null
          resp_fin_cpf?: string | null
          resp_fin_data_nascimento?: string | null
          resp_fin_email?: string | null
          resp_fin_estado_civil?: string | null
          resp_fin_nacionalidade?: string | null
          resp_fin_naturalidade?: string | null
          resp_fin_nome?: string | null
          resp_fin_profissao?: string | null
          resp_fin_quem?: string | null
          resp_fin_rg?: string | null
          rg_mae?: string | null
          rg_pai?: string | null
          status?: string
          turno?: string | null
          updated_at?: string
          valor_com_desconto?: number | null
          valor_com_desconto_ext?: string | null
          valor_matricula?: number | null
          valor_pago?: number | null
          valor_pri_parcela?: string | null
          valor_pri_parcela_ext?: string | null
          zapsign_token?: string | null
        }
        Update: {
          anuidade_total?: string | null
          anuidade_total_ext?: string | null
          asaas_checkout_id?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          bairro?: string | null
          celular_mae?: string | null
          celular_pai?: string | null
          cep?: string | null
          checkout_criado_em?: string | null
          checkout_url?: string | null
          cidade?: string | null
          complemento?: string | null
          concluida_em?: string | null
          contrato_assinado?: boolean
          contrato_assinado_em?: string | null
          contrato_gerado?: boolean
          contrato_gerado_em?: string | null
          cpf_mae?: string | null
          cpf_pai?: string | null
          created_at?: string
          curso?: string | null
          dados_preenchidos_em?: string | null
          data_nascimento_aluno?: string | null
          data_nascimento_mae?: string | null
          data_nascimento_pai?: string | null
          data_pagamento?: string | null
          dia_vencimento?: number | null
          documentos_aprovados_em?: string | null
          email_conclusao_enviado_em?: string | null
          email_mae?: string | null
          email_pai?: string | null
          estado?: string | null
          estado_civil_mae?: string | null
          estado_civil_pai?: string | null
          forma_pagamento?: string | null
          id?: string
          link_contrato?: string | null
          logradouro?: string | null
          matricula_gratuita?: boolean
          max_parcelas?: number
          nacionalidade_mae?: string | null
          nacionalidade_pai?: string | null
          naturalidade_mae?: string | null
          naturalidade_pai?: string | null
          nome_aluno?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          parcelas?: number | null
          percentual_desconto?: number | null
          percentual_desconto_ext?: string | null
          permite_avista?: boolean
          permite_parcelado?: boolean
          prematricula_id?: string
          profissao_mae?: string | null
          profissao_pai?: string | null
          resp_fin_celular?: string | null
          resp_fin_cpf?: string | null
          resp_fin_data_nascimento?: string | null
          resp_fin_email?: string | null
          resp_fin_estado_civil?: string | null
          resp_fin_nacionalidade?: string | null
          resp_fin_naturalidade?: string | null
          resp_fin_nome?: string | null
          resp_fin_profissao?: string | null
          resp_fin_quem?: string | null
          resp_fin_rg?: string | null
          rg_mae?: string | null
          rg_pai?: string | null
          status?: string
          turno?: string | null
          updated_at?: string
          valor_com_desconto?: number | null
          valor_com_desconto_ext?: string | null
          valor_matricula?: number | null
          valor_pago?: number | null
          valor_pri_parcela?: string | null
          valor_pri_parcela_ext?: string | null
          zapsign_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_prematricula_id_fkey"
            columns: ["prematricula_id"]
            isOneToOne: true
            referencedRelation: "prematriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      message_usage: {
        Row: {
          created_at: string | null
          id: string
          max_messages: number
          messages_sent: number
          period_end: string
          period_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_messages?: number
          messages_sent?: number
          period_end: string
          period_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          max_messages?: number
          messages_sent?: number
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      ocorrencias_mhund: {
        Row: {
          codigo_aluno: number | null
          codigo_curso: number | null
          codigo_discplina: number | null
          curso: string | null
          data_ocorrencia: string | null
          descicao_ocorrencia: string | null
          disciplina: string | null
          id: number
          nome_aluno: string | null
          titulo_ocorrencia: string | null
        }
        Insert: {
          codigo_aluno?: number | null
          codigo_curso?: number | null
          codigo_discplina?: number | null
          curso?: string | null
          data_ocorrencia?: string | null
          descicao_ocorrencia?: string | null
          disciplina?: string | null
          id?: number
          nome_aluno?: string | null
          titulo_ocorrencia?: string | null
        }
        Update: {
          codigo_aluno?: number | null
          codigo_curso?: number | null
          codigo_discplina?: number | null
          curso?: string | null
          data_ocorrencia?: string | null
          descicao_ocorrencia?: string | null
          disciplina?: string | null
          id?: number
          nome_aluno?: string | null
          titulo_ocorrencia?: string | null
        }
        Relationships: []
      }
      pedidos_produtos: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          cancelado_em: string | null
          cancelado_por: string | null
          celular_comprador: string | null
          checkout_criado_em: string | null
          checkout_id: string | null
          checkout_url: string | null
          cpf_comprador: string | null
          created_at: string
          data_credito: string | null
          data_pagamento: string | null
          email_comprador: string | null
          evento_id: string | null
          forma_pagamento: string | null
          id: string
          motivo_cancelamento: string | null
          nome_comprador: string
          parcelas: number
          produto_id: string
          qr_token: string
          quantidade: number
          retirado_em: string | null
          retirado_por: string | null
          status: string
          taxa_manual: number | null
          taxa_manual_em: string | null
          taxa_manual_por: string | null
          taxa_total: number | null
          updated_at: string
          user_id: string
          valor_bruto: number | null
          valor_liquido: number | null
          valor_total: number
          valor_unitario: number
          variacao_id: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          celular_comprador?: string | null
          checkout_criado_em?: string | null
          checkout_id?: string | null
          checkout_url?: string | null
          cpf_comprador?: string | null
          created_at?: string
          data_credito?: string | null
          data_pagamento?: string | null
          email_comprador?: string | null
          evento_id?: string | null
          forma_pagamento?: string | null
          id?: string
          motivo_cancelamento?: string | null
          nome_comprador: string
          parcelas?: number
          produto_id: string
          qr_token?: string
          quantidade?: number
          retirado_em?: string | null
          retirado_por?: string | null
          status?: string
          taxa_manual?: number | null
          taxa_manual_em?: string | null
          taxa_manual_por?: string | null
          taxa_total?: number | null
          updated_at?: string
          user_id: string
          valor_bruto?: number | null
          valor_liquido?: number | null
          valor_total?: number
          valor_unitario?: number
          variacao_id: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          celular_comprador?: string | null
          checkout_criado_em?: string | null
          checkout_id?: string | null
          checkout_url?: string | null
          cpf_comprador?: string | null
          created_at?: string
          data_credito?: string | null
          data_pagamento?: string | null
          email_comprador?: string | null
          evento_id?: string | null
          forma_pagamento?: string | null
          id?: string
          motivo_cancelamento?: string | null
          nome_comprador?: string
          parcelas?: number
          produto_id?: string
          qr_token?: string
          quantidade?: number
          retirado_em?: string | null
          retirado_por?: string | null
          status?: string
          taxa_manual?: number | null
          taxa_manual_em?: string | null
          taxa_manual_por?: string | null
          taxa_total?: number | null
          updated_at?: string
          user_id?: string
          valor_bruto?: number | null
          valor_liquido?: number | null
          valor_total?: number
          valor_unitario?: number
          variacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_produtos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_produtos_variacao_id_fkey"
            columns: ["variacao_id"]
            isOneToOne: false
            referencedRelation: "produto_variacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      prematricula_agenda_bloqueios: {
        Row: {
          created_at: string
          data: string
          id: string
          motivo: string | null
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          motivo?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          motivo?: string | null
        }
        Relationships: []
      }
      prematricula_agenda_regras: {
        Row: {
          ativo: boolean
          capacidade: number
          created_at: string
          dia_semana: number
          duracao_min: number
          hora_fim: string
          hora_inicio: string
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade?: number
          created_at?: string
          dia_semana: number
          duracao_min?: number
          hora_fim: string
          hora_inicio: string
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade?: number
          created_at?: string
          dia_semana?: number
          duracao_min?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prematricula_agendamentos: {
        Row: {
          created_at: string
          fim: string
          id: string
          inicio: string
          prematricula_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fim: string
          id?: string
          inicio: string
          prematricula_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          prematricula_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prematricula_agendamentos_prematricula_id_fkey"
            columns: ["prematricula_id"]
            isOneToOne: false
            referencedRelation: "prematriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      prematricula_otp: {
        Row: {
          canal: string
          codigo_hash: string
          consumido_em: string | null
          created_at: string
          destino: string | null
          expira_em: string
          id: string
          ip: string | null
          telefone: string | null
          tentativas: number
          verificado_em: string | null
        }
        Insert: {
          canal?: string
          codigo_hash: string
          consumido_em?: string | null
          created_at?: string
          destino?: string | null
          expira_em: string
          id?: string
          ip?: string | null
          telefone?: string | null
          tentativas?: number
          verificado_em?: string | null
        }
        Update: {
          canal?: string
          codigo_hash?: string
          consumido_em?: string | null
          created_at?: string
          destino?: string | null
          expira_em?: string
          id?: string
          ip?: string | null
          telefone?: string | null
          tentativas?: number
          verificado_em?: string | null
        }
        Relationships: []
      }
      prematriculas: {
        Row: {
          agendado_em: string | null
          alergias: string | null
          aluno_chave: string | null
          aluno_nascimento: string
          aluno_nome: string
          aprovado_em: string | null
          atendimento_complementar: string | null
          boletim_path: string | null
          consentimento_privacidade: boolean
          consentimento_veracidade: boolean
          created_at: string
          desconto_percentual: number | null
          diagnostico: string | null
          diagnostico_detalhe: string | null
          dificuldade_aprendizagem: string | null
          dificuldade_atencao: string | null
          dificuldade_socializacao: string | null
          entrevista_concluida_em: string | null
          escola_atual: string | null
          id: string
          laudo_path: string | null
          medicacao_detalhe: string | null
          motivo_reprovacao: string | null
          observacoes_entrevista: string | null
          observacoes_saude: string | null
          protocolo: string
          repetiu_ano: string | null
          reprovado_em: string | null
          resp_cpf: string
          resp_email: string
          resp_nome: string
          resp_tipo: string | null
          resp_whatsapp: string
          serie_pretendida: string
          status: string
          tipo_escola: string | null
          token: string | null
          token_hash: string | null
          turno_preferencia: string
          updated_at: string
          usa_medicacao: string | null
        }
        Insert: {
          agendado_em?: string | null
          alergias?: string | null
          aluno_chave?: string | null
          aluno_nascimento: string
          aluno_nome: string
          aprovado_em?: string | null
          atendimento_complementar?: string | null
          boletim_path?: string | null
          consentimento_privacidade?: boolean
          consentimento_veracidade?: boolean
          created_at?: string
          desconto_percentual?: number | null
          diagnostico?: string | null
          diagnostico_detalhe?: string | null
          dificuldade_aprendizagem?: string | null
          dificuldade_atencao?: string | null
          dificuldade_socializacao?: string | null
          entrevista_concluida_em?: string | null
          escola_atual?: string | null
          id?: string
          laudo_path?: string | null
          medicacao_detalhe?: string | null
          motivo_reprovacao?: string | null
          observacoes_entrevista?: string | null
          observacoes_saude?: string | null
          protocolo?: string
          repetiu_ano?: string | null
          reprovado_em?: string | null
          resp_cpf: string
          resp_email: string
          resp_nome: string
          resp_tipo?: string | null
          resp_whatsapp: string
          serie_pretendida: string
          status?: string
          tipo_escola?: string | null
          token?: string | null
          token_hash?: string | null
          turno_preferencia: string
          updated_at?: string
          usa_medicacao?: string | null
        }
        Update: {
          agendado_em?: string | null
          alergias?: string | null
          aluno_chave?: string | null
          aluno_nascimento?: string
          aluno_nome?: string
          aprovado_em?: string | null
          atendimento_complementar?: string | null
          boletim_path?: string | null
          consentimento_privacidade?: boolean
          consentimento_veracidade?: boolean
          created_at?: string
          desconto_percentual?: number | null
          diagnostico?: string | null
          diagnostico_detalhe?: string | null
          dificuldade_aprendizagem?: string | null
          dificuldade_atencao?: string | null
          dificuldade_socializacao?: string | null
          entrevista_concluida_em?: string | null
          escola_atual?: string | null
          id?: string
          laudo_path?: string | null
          medicacao_detalhe?: string | null
          motivo_reprovacao?: string | null
          observacoes_entrevista?: string | null
          observacoes_saude?: string | null
          protocolo?: string
          repetiu_ano?: string | null
          reprovado_em?: string | null
          resp_cpf?: string
          resp_email?: string
          resp_nome?: string
          resp_tipo?: string | null
          resp_whatsapp?: string
          serie_pretendida?: string
          status?: string
          tipo_escola?: string | null
          token?: string | null
          token_hash?: string | null
          turno_preferencia?: string
          updated_at?: string
          usa_medicacao?: string | null
        }
        Relationships: []
      }
      produto_variacoes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          destaque_label: string | null
          estoque_total: number | null
          id: string
          max_parcelas: number
          nome: string
          ordem: number
          preco: number
          preco_parcelado: number
          produto_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          destaque_label?: string | null
          estoque_total?: number | null
          id?: string
          max_parcelas?: number
          nome: string
          ordem?: number
          preco?: number
          preco_parcelado?: number
          produto_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          destaque_label?: string | null
          estoque_total?: number | null
          id?: string
          max_parcelas?: number
          nome?: string
          ordem?: number
          preco?: number
          preco_parcelado?: number
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_variacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          estoque_controlado: boolean
          estoque_total: number | null
          id: string
          imagem_url: string | null
          is_global: boolean
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estoque_controlado?: boolean
          estoque_total?: number | null
          id?: string
          imagem_url?: string | null
          is_global?: boolean
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          estoque_controlado?: boolean
          estoque_total?: number | null
          id?: string
          imagem_url?: string | null
          is_global?: boolean
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          atualizado_em: string | null
          codigo_aluno: string
          criado_em: string | null
          id: number
          nome_aluno: string
          plataforma: string | null
          push_token: string
        }
        Insert: {
          atualizado_em?: string | null
          codigo_aluno: string
          criado_em?: string | null
          id?: number
          nome_aluno: string
          plataforma?: string | null
          push_token: string
        }
        Update: {
          atualizado_em?: string | null
          codigo_aluno?: string
          criado_em?: string | null
          id?: number
          nome_aluno?: string
          plataforma?: string | null
          push_token?: string
        }
        Relationships: []
      }
      reativacao_cartela_log: {
        Row: {
          canal: string
          enviado_em: string | null
          id: string
          mensagem: string
          user_id: string
        }
        Insert: {
          canal: string
          enviado_em?: string | null
          id?: string
          mensagem: string
          user_id: string
        }
        Update: {
          canal?: string
          enviado_em?: string | null
          id?: string
          mensagem?: string
          user_id?: string
        }
        Relationships: []
      }
      rematricula: {
        Row: {
          Anuidade: string | null
          "Atualizou dados Mãe": string | null
          "Atualizou dados Pai": string | null
          "Atualizou Endereço": string | null
          Bairro: string | null
          CEP: string | null
          Ciclo: string | null
          Cidade: string | null
          "Cod Aluno": number
          "CPF da mãe": string | null
          "CPF do Pai": string | null
          "Curso 2025": string | null
          "Curso 2026": string | null
          "Data Nascimento Aluno": string | null
          "Data Nascimento Resp. Financeiro": string | null
          data_rematricula: string | null
          Desconto: string | null
          "Email da Mãe": string | null
          "Email do Pai": string | null
          Endereço: string | null
          Estado: string | null
          "Estado Civil Resp. Financeiro": string | null
          forma_de_pagamento: string | null
          "Id Checkout": string | null
          "Liberado para rematrícula": boolean | null
          "Link Checkout": string | null
          "Link Contrato": string | null
          "mensalidade 2026 com desconto": string | null
          "mensalidade 2026 sem desconto": string | null
          "Naturalidade do Responsável Financeiro": string | null
          "Nome da mãe": string | null
          "Nome do Aluno": string | null
          "Nome do Pai": string | null
          Número: number | null
          "Profissão Resp. Financeiro": string | null
          "Rematrícula a vista": string | null
          "Rematrícula Parcelada": string | null
          "Resp. Financeiro": string | null
          "RG Resp. Financeiro": string | null
          Status: string | null
          "Telefone da Mãe": string | null
          "Telefone do Pai": string | null
          "token contrato": string | null
          "Turno 2026": string | null
        }
        Insert: {
          Anuidade?: string | null
          "Atualizou dados Mãe"?: string | null
          "Atualizou dados Pai"?: string | null
          "Atualizou Endereço"?: string | null
          Bairro?: string | null
          CEP?: string | null
          Ciclo?: string | null
          Cidade?: string | null
          "Cod Aluno": number
          "CPF da mãe"?: string | null
          "CPF do Pai"?: string | null
          "Curso 2025"?: string | null
          "Curso 2026"?: string | null
          "Data Nascimento Aluno"?: string | null
          "Data Nascimento Resp. Financeiro"?: string | null
          data_rematricula?: string | null
          Desconto?: string | null
          "Email da Mãe"?: string | null
          "Email do Pai"?: string | null
          Endereço?: string | null
          Estado?: string | null
          "Estado Civil Resp. Financeiro"?: string | null
          forma_de_pagamento?: string | null
          "Id Checkout"?: string | null
          "Liberado para rematrícula"?: boolean | null
          "Link Checkout"?: string | null
          "Link Contrato"?: string | null
          "mensalidade 2026 com desconto"?: string | null
          "mensalidade 2026 sem desconto"?: string | null
          "Naturalidade do Responsável Financeiro"?: string | null
          "Nome da mãe"?: string | null
          "Nome do Aluno"?: string | null
          "Nome do Pai"?: string | null
          Número?: number | null
          "Profissão Resp. Financeiro"?: string | null
          "Rematrícula a vista"?: string | null
          "Rematrícula Parcelada"?: string | null
          "Resp. Financeiro"?: string | null
          "RG Resp. Financeiro"?: string | null
          Status?: string | null
          "Telefone da Mãe"?: string | null
          "Telefone do Pai"?: string | null
          "token contrato"?: string | null
          "Turno 2026"?: string | null
        }
        Update: {
          Anuidade?: string | null
          "Atualizou dados Mãe"?: string | null
          "Atualizou dados Pai"?: string | null
          "Atualizou Endereço"?: string | null
          Bairro?: string | null
          CEP?: string | null
          Ciclo?: string | null
          Cidade?: string | null
          "Cod Aluno"?: number
          "CPF da mãe"?: string | null
          "CPF do Pai"?: string | null
          "Curso 2025"?: string | null
          "Curso 2026"?: string | null
          "Data Nascimento Aluno"?: string | null
          "Data Nascimento Resp. Financeiro"?: string | null
          data_rematricula?: string | null
          Desconto?: string | null
          "Email da Mãe"?: string | null
          "Email do Pai"?: string | null
          Endereço?: string | null
          Estado?: string | null
          "Estado Civil Resp. Financeiro"?: string | null
          forma_de_pagamento?: string | null
          "Id Checkout"?: string | null
          "Liberado para rematrícula"?: boolean | null
          "Link Checkout"?: string | null
          "Link Contrato"?: string | null
          "mensalidade 2026 com desconto"?: string | null
          "mensalidade 2026 sem desconto"?: string | null
          "Naturalidade do Responsável Financeiro"?: string | null
          "Nome da mãe"?: string | null
          "Nome do Aluno"?: string | null
          "Nome do Pai"?: string | null
          Número?: number | null
          "Profissão Resp. Financeiro"?: string | null
          "Rematrícula a vista"?: string | null
          "Rematrícula Parcelada"?: string | null
          "Resp. Financeiro"?: string | null
          "RG Resp. Financeiro"?: string | null
          Status?: string | null
          "Telefone da Mãe"?: string | null
          "Telefone do Pai"?: string | null
          "token contrato"?: string | null
          "Turno 2026"?: string | null
        }
        Relationships: []
      }
      rematricula_2027_alteracoes: {
        Row: {
          campo: string
          created_at: string
          id: string
          id_aluno: number
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo: string
          created_at?: string
          id?: string
          id_aluno: number
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string
          created_at?: string
          id?: string
          id_aluno?: number
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rematricula_2027_alteracoes_id_aluno_fkey"
            columns: ["id_aluno"]
            isOneToOne: false
            referencedRelation: "alunos_rematricula_2027"
            referencedColumns: ["id_aluno"]
          },
        ]
      }
      rematricula_2027_numeros_sorte: {
        Row: {
          created_at: string
          faixa: string
          id: string
          id_aluno: number
          numero: string
        }
        Insert: {
          created_at?: string
          faixa: string
          id?: string
          id_aluno: number
          numero: string
        }
        Update: {
          created_at?: string
          faixa?: string
          id?: string
          id_aluno?: number
          numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "rematricula_2027_numeros_sorte_id_aluno_fkey"
            columns: ["id_aluno"]
            isOneToOne: false
            referencedRelation: "alunos_rematricula_2027"
            referencedColumns: ["id_aluno"]
          },
        ]
      }
      rematricula_2027_otp: {
        Row: {
          canal: string
          chave: string | null
          codigo_hash: string
          consumido_em: string | null
          created_at: string
          destino_mascarado: string
          expira_em: string
          finalidade: string
          id: string
          id_aluno: number
          ip: string | null
          tentativas: number
        }
        Insert: {
          canal: string
          chave?: string | null
          codigo_hash: string
          consumido_em?: string | null
          created_at?: string
          destino_mascarado: string
          expira_em: string
          finalidade?: string
          id?: string
          id_aluno: number
          ip?: string | null
          tentativas?: number
        }
        Update: {
          canal?: string
          chave?: string | null
          codigo_hash?: string
          consumido_em?: string | null
          created_at?: string
          destino_mascarado?: string
          expira_em?: string
          finalidade?: string
          id?: string
          id_aluno?: number
          ip?: string | null
          tentativas?: number
        }
        Relationships: []
      }
      rematricula_2027_rate_limit: {
        Row: {
          bucket: string
          ip: string
          janela: string
          tentativas: number
        }
        Insert: {
          bucket: string
          ip: string
          janela: string
          tentativas?: number
        }
        Update: {
          bucket?: string
          ip?: string
          janela?: string
          tentativas?: number
        }
        Relationships: []
      }
      rematricula_valores_2027: {
        Row: {
          ativo: boolean
          created_at: string
          curso_2027: string
          id: string
          promocao_ate: string | null
          updated_at: string
          valor_promocional: number | null
          valor_promocional_pacelado: number | null
          valor_rematricula: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          curso_2027: string
          id?: string
          promocao_ate?: string | null
          updated_at?: string
          valor_promocional?: number | null
          valor_promocional_pacelado?: number | null
          valor_rematricula?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          curso_2027?: string
          id?: string
          promocao_ate?: string | null
          updated_at?: string
          valor_promocional?: number | null
          valor_promocional_pacelado?: number | null
          valor_rematricula?: number
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vagas_2027: {
        Row: {
          ativo: boolean
          created_at: string
          curso_2027: string
          id: string
          max_vagas: number
          turno: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          curso_2027: string
          id?: string
          max_vagas?: number
          turno: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          curso_2027?: string
          id?: string
          max_vagas?: number
          turno?: string
          updated_at?: string
        }
        Relationships: []
      }
      vagas_turmas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          curso: string
          id: number
          max_vagas: number
          turno: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          curso: string
          id?: number
          max_vagas: number
          turno: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          curso?: string
          id?: number
          max_vagas?: number
          turno?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      compradores_sem_cartela: {
        Row: {
          celular: string | null
          email: string | null
          nome_comprador: string | null
          status_envio: string | null
          ultimo_envio: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_user_exists_by_email: { Args: { p_email: string }; Returns: boolean }
      authenticate_with_username: {
        Args: { p_password: string; p_username: string }
        Returns: {
          email: string
          message: string
          success: boolean
          user_id: string
        }[]
      }
      buscar_ingresso_scan: {
        Args: { p_id: string }
        Returns: {
          categoria_meia: string
          codigo_aluno: string
          evento_data: string
          evento_titulo: string
          id: string
          meia_validada_em: string
          meia_validada_por: string
          meia_validada_portaria: boolean
          nome_comprador: string
          nome_participante: string
          status: string
          tipo_ingresso: string
          tipo_participante: string
          utilizado: boolean
          utilizado_em: string
          utilizado_por: string
        }[]
      }
      calcular_vagas_disponiveis: {
        Args: { p_curso: string; p_turno: string }
        Returns: {
          curso: string
          disponivel: boolean
          matriculados: number
          max_vagas: number
          turno: string
          vagas_disponiveis: number
        }[]
      }
      contar_estoque_produto: {
        Args: { p_variacao_id: string }
        Returns: {
          disponivel: number
          estoque_total: number
          vendidos: number
        }[]
      }
      contar_meias_evento: {
        Args: { p_evento_id: string }
        Returns: {
          meias_disponiveis: number
          meias_vendidas: number
          percentual_meia: number
          vagas_meia_total: number
          vagas_total: number
        }[]
      }
      find_alunos_by_cpf: {
        Args: { p_cpf: string }
        Returns: {
          codigo_aluno: string
          curso: string
          nome_aluno: string
        }[]
      }
      find_alunos_by_email: {
        Args: { p_email: string }
        Returns: {
          codigo_aluno: string
          curso: string
          nome_aluno: string
        }[]
      }
      find_email_by_cpf: {
        Args: { p_cpf: string }
        Returns: {
          email: string
          nome: string
        }[]
      }
      find_user_context_by_cpf: {
        Args: { p_cpf: string }
        Returns: {
          email: string
          nome: string
          origem: string
        }[]
      }
      find_user_id_by_cpf: { Args: { p_cpf: string }; Returns: string }
      gerar_numeros_sorte_2027: {
        Args: { p_id_aluno: number }
        Returns: number
      }
      get_comprador_dados: {
        Args: { p_user_id: string }
        Returns: {
          celular: string
          cpf: string
          email: string
          nome: string
          origem: string
        }[]
      }
      get_comprovante_produto: {
        Args: { p_qr_token: string }
        Returns: {
          evento_data: string
          evento_local: string
          evento_titulo: string
          nome_comprador: string
          pedido_id: string
          produto: string
          quantidade: number
          retirado_em: string
          status: string
          variacao: string
        }[]
      }
      get_current_message_period: {
        Args: never
        Returns: {
          max_messages: number
          messages_sent: number
          period_end: string
          period_start: string
        }[]
      }
      get_vagas_disponiveis: {
        Args: never
        Returns: {
          curso: string
          disponivel: boolean
          matriculados: number
          max_vagas: number
          turno: string
          vagas_disponiveis: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_setor: {
        Args: { _setor: string; _user_id: string }
        Returns: boolean
      }
      increment_message_count: { Args: { count: number }; Returns: undefined }
      marcar_ingresso_utilizado: {
        Args: { p_id: string }
        Returns: {
          evento_titulo: string
          ingresso_id: string
          message: string
          nome_participante: string
          success: boolean
          tipo_ingresso: string
          utilizado_em: string
          utilizado_por: string
        }[]
      }
      marcar_produto_retirado: {
        Args: { p_qr_token: string }
        Returns: {
          message: string
          ok: boolean
          pedido_id: string
          produto: string
          quantidade: number
          retirado_em: string
          variacao: string
        }[]
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      prematricula_norm_nome: { Args: { p_nome: string }; Returns: string }
      purgar_asaas_webhook_events: { Args: never; Returns: undefined }
      rematricula_2027_abrir: {
        Args: { p_data_nascimento: string; p_id_aluno: number }
        Returns: {
          bairro_mae: string
          bairro_pai: string
          celular_mae: string
          celular_pai: string
          cep_mae: string
          cep_pai: string
          checkout_url: string
          cidade_mae: string
          cidade_pai: string
          complemento_mae: string
          complemento_pai: string
          contrato_assinado: boolean
          contrato_gerado: boolean
          cpf_aluno: string
          cpf_mae: string
          cpf_pai: string
          curso_2027: string
          curso_atual: string
          data_nascimento_aluno: string
          data_nascimento_mae: string
          data_nascimento_pai: string
          dia_vencimento: number
          email_mae: string
          email_pai: string
          estado_civil_mae: string
          estado_civil_pai: string
          estado_mae: string
          estado_pai: string
          forma_pagamento: string
          id_aluno: number
          link_contrato: string
          logradouro_mae: string
          logradouro_pai: string
          nacionalidade_mae: string
          nacionalidade_pai: string
          naturalidade_mae: string
          naturalidade_pai: string
          nome_aluno: string
          nome_mae: string
          nome_pai: string
          numero_mae: string
          numero_pai: string
          percentual_desconto: number
          rematricula_concluida: boolean
          responsavel_financeiro: string
          rg_mae: string
          rg_pai: string
          tem_mae: string
          tem_pai: string
          turno_escolhido: string
          valor_cheio: number
          valor_com_desconto: number
          valor_rematricula: number
        }[]
      }
      rematricula_2027_admin_conferir: {
        Args: { p_conferida: boolean; p_id_aluno: number }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      rematricula_2027_admin_editar_contatos: {
        Args: {
          p_celular_mae?: string
          p_celular_pai?: string
          p_cpf_mae?: string
          p_cpf_pai?: string
          p_id_aluno: number
          p_telefone_mae?: string
          p_telefone_pai?: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      rematricula_2027_admin_listagem: {
        Args: never
        Returns: {
          alteracoes: Json
          celular_mae: string
          celular_pai: string
          checkout_criado_em: string
          checkout_url: string
          conferida: boolean
          conferida_em: string
          contrato_assinado: boolean
          contrato_gerado: boolean
          cpf_mae: string
          cpf_pai: string
          curso_2027: string
          curso_atual: string
          data_pagamento: string
          email_mae: string
          email_pai: string
          forma_pagamento: string
          id_aluno: number
          link_contrato: string
          nome_aluno: string
          nome_mae: string
          nome_pai: string
          numeros: string[]
          parcelas: number
          percentual_desconto: number
          qtd_alteracoes: number
          rematricula_concluida: boolean
          responsavel_financeiro: string
          telefone_mae: string
          telefone_pai: string
          turno_escolhido: string
          updated_at: string
          valor_cheio: number
          valor_com_desconto: number
          valor_pago: number
        }[]
      }
      rematricula_2027_buscar: {
        Args: { p_termo: string }
        Returns: {
          curso_2027: string
          curso_atual: string
          id_aluno: number
          nome_aluno: string
        }[]
      }
      rematricula_2027_canais: {
        Args: { p_id_aluno: number }
        Returns: {
          canal: string
          chave: string
          rotulo: string
        }[]
      }
      rematricula_2027_numeros_consultar: {
        Args: { p_data_nascimento: string; p_termo: string }
        Returns: {
          curso_2027: string
          faixa: string
          id_aluno: number
          nome_aluno: string
          numero: string
        }[]
      }
      rematricula_2027_numeros_do_aluno: {
        Args: { p_data_nascimento: string; p_id_aluno: number }
        Returns: {
          faixa: string
          numero: string
        }[]
      }
      rematricula_2027_numeros_publicos: {
        Args: never
        Returns: {
          nome_mascarado: string
          numero: string
        }[]
      }
      rematricula_2027_rate_hit: {
        Args: { p_bucket: string; p_janela_seg: number; p_limite: number }
        Returns: boolean
      }
      rematricula_2027_salvar: {
        Args: { p_dados: Json; p_data_nascimento: string; p_id_aluno: number }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      rematricula_2027_status: {
        Args: { p_data_nascimento: string; p_id_aluno: number }
        Returns: {
          checkout_url: string
          contrato_assinado: boolean
          contrato_gerado: boolean
          forma_pagamento: string
          link_contrato: string
          max_parcelas: number
          parcelas: number
          rematricula_concluida: boolean
          valor_avista: number
          valor_parcelado: number
        }[]
      }
      rematricula_2027_turnos: {
        Args: { p_curso_2027: string }
        Returns: {
          disponiveis: number
          disponivel: boolean
          max_vagas: number
          ocupadas: number
          turno: string
        }[]
      }
      rematricula_by_codigo_aluno: {
        Args: { p_cod_aluno: number }
        Returns: {
          "Cod Aluno": number
          "CPF da mãe": string
          "CPF do Pai": string
          "Email da Mãe": string
          "Email do Pai": string
          "Nome da mãe": string
          "Nome do Aluno": string
          "Nome do Pai": string
          "Telefone da Mãe": string
          "Telefone do Pai": string
        }[]
      }
      rematricula_by_cpf: {
        Args: { p_cpf: string }
        Returns: {
          Bairro: string
          CEP: string
          Ciclo: string
          Cidade: string
          "Cod Aluno": number
          "CPF da mãe": string
          "CPF do Pai": string
          "Curso 2025": string
          "Curso 2026": string
          Desconto: string
          "Email da Mãe": string
          "Email do Pai": string
          Endereço: string
          "Id Checkout": string
          "Liberado para rematrícula": boolean
          "Link Checkout": string
          "Link Contrato": string
          "mensalidade 2026 com desconto": string
          "mensalidade 2026 sem desconto": string
          "Nome da mãe": string
          "Nome do Aluno": string
          "Nome do Pai": string
          Número: number
          "Rematrícula a vista": string
          "Rematrícula Parcelada": string
          "Resp. Financeiro": string
          Status: string
          "Telefone da Mãe": string
          "Telefone do Pai": string
          "token contrato": string
          "Turno 2026": string
        }[]
      }
      update_rematricula_fields: {
        Args: {
          p_bairro?: string
          p_cep?: string
          p_cidade?: string
          p_cod_aluno: number
          p_data_nascimento_aluno?: string
          p_data_nascimento_resp_financeiro?: string
          p_email_mae?: string
          p_email_pai?: string
          p_endereco?: string
          p_estado?: string
          p_estado_civil_resp_financeiro?: string
          p_naturalidade_resp_financeiro?: string
          p_numero?: number
          p_profissao_resp_financeiro?: string
          p_resp_financeiro?: string
          p_rg_resp_financeiro?: string
          p_telefone_mae?: string
          p_telefone_pai?: string
          p_turno_2026?: string
        }
        Returns: {
          Anuidade: string | null
          "Atualizou dados Mãe": string | null
          "Atualizou dados Pai": string | null
          "Atualizou Endereço": string | null
          Bairro: string | null
          CEP: string | null
          Ciclo: string | null
          Cidade: string | null
          "Cod Aluno": number
          "CPF da mãe": string | null
          "CPF do Pai": string | null
          "Curso 2025": string | null
          "Curso 2026": string | null
          "Data Nascimento Aluno": string | null
          "Data Nascimento Resp. Financeiro": string | null
          data_rematricula: string | null
          Desconto: string | null
          "Email da Mãe": string | null
          "Email do Pai": string | null
          Endereço: string | null
          Estado: string | null
          "Estado Civil Resp. Financeiro": string | null
          forma_de_pagamento: string | null
          "Id Checkout": string | null
          "Liberado para rematrícula": boolean | null
          "Link Checkout": string | null
          "Link Contrato": string | null
          "mensalidade 2026 com desconto": string | null
          "mensalidade 2026 sem desconto": string | null
          "Naturalidade do Responsável Financeiro": string | null
          "Nome da mãe": string | null
          "Nome do Aluno": string | null
          "Nome do Pai": string | null
          Número: number | null
          "Profissão Resp. Financeiro": string | null
          "Rematrícula a vista": string | null
          "Rematrícula Parcelada": string | null
          "Resp. Financeiro": string | null
          "RG Resp. Financeiro": string | null
          Status: string | null
          "Telefone da Mãe": string | null
          "Telefone do Pai": string | null
          "token contrato": string | null
          "Turno 2026": string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "rematricula"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      valida_cpf: { Args: { p_cpf: string }; Returns: boolean }
      validar_meia_ingresso: {
        Args: { p_id: string }
        Returns: {
          ingresso_id: string
          meia_validada_em: string
          meia_validada_por: string
          message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "conferente"
        | "rematricula"
        | "matricula"
        | "eventos"
        | "portaria"
        | "produtos"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "user",
        "conferente",
        "rematricula",
        "matricula",
        "eventos",
        "portaria",
        "produtos",
      ],
    },
  },
} as const
