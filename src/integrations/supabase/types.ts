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
      codigos_verificacao: {
        Row: {
          codigo: string
          codigo_aluno: string
          created_at: string | null
          expires_at: string | null
          id: number
          novo_valor: string
          tipo: string
          verificado: boolean | null
        }
        Insert: {
          codigo: string
          codigo_aluno: string
          created_at?: string | null
          expires_at?: string | null
          id?: never
          novo_valor: string
          tipo: string
          verificado?: boolean | null
        }
        Update: {
          codigo?: string
          codigo_aluno?: string
          created_at?: string | null
          expires_at?: string | null
          id?: never
          novo_valor?: string
          tipo?: string
          verificado?: boolean | null
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
      comunicados_2026: {
        Row: {
          created_at: string
          id: number
          link: string | null
          mensagem: string | null
          nome_aluno: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          link?: string | null
          mensagem?: string | null
          nome_aluno?: string | null
        }
        Update: {
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
      pre_matricula: {
        Row: {
          atendimentoEducacional: string | null
          boletim: string | null
          codigo_aluno: string | null
          cpf: string | null
          created_at: string
          data_entrevista: string | null
          data_reavaliacao: string | null
          dataNascimento: string | null
          desconto: string | null
          diagnosticoTranstorno: string | null
          dificuldadeAprendizagem: string | null
          dificuldadeAtencao: string | null
          dificuldadeSocializacao: string | null
          email: string | null
          escolaAtual: string | null
          id: number
          laudoMedico: string | null
          link_contrato: string | null
          link_entrevista: string | null
          nome_terapeuta_ocupacional: string | null
          nomeAluno: string | null
          nomeResponsavel: string | null
          obs_entrevista: string | null
          possui_terapeuta_ocupacional: string | null
          repetente: string | null
          Rg_terapeuta_ocupacional: string | null
          serie_pretendida: string | null
          Status: string | null
          telefone_terapeuta_ocupacional: string | null
          tipoEscola: string | null
          turnoPreferencia: string | null
          usoMedicacao: string | null
          whatsapp: string | null
        }
        Insert: {
          atendimentoEducacional?: string | null
          boletim?: string | null
          codigo_aluno?: string | null
          cpf?: string | null
          created_at: string
          data_entrevista?: string | null
          data_reavaliacao?: string | null
          dataNascimento?: string | null
          desconto?: string | null
          diagnosticoTranstorno?: string | null
          dificuldadeAprendizagem?: string | null
          dificuldadeAtencao?: string | null
          dificuldadeSocializacao?: string | null
          email?: string | null
          escolaAtual?: string | null
          id?: number
          laudoMedico?: string | null
          link_contrato?: string | null
          link_entrevista?: string | null
          nome_terapeuta_ocupacional?: string | null
          nomeAluno?: string | null
          nomeResponsavel?: string | null
          obs_entrevista?: string | null
          possui_terapeuta_ocupacional?: string | null
          repetente?: string | null
          Rg_terapeuta_ocupacional?: string | null
          serie_pretendida?: string | null
          Status?: string | null
          telefone_terapeuta_ocupacional?: string | null
          tipoEscola?: string | null
          turnoPreferencia?: string | null
          usoMedicacao?: string | null
          whatsapp?: string | null
        }
        Update: {
          atendimentoEducacional?: string | null
          boletim?: string | null
          codigo_aluno?: string | null
          cpf?: string | null
          created_at?: string
          data_entrevista?: string | null
          data_reavaliacao?: string | null
          dataNascimento?: string | null
          desconto?: string | null
          diagnosticoTranstorno?: string | null
          dificuldadeAprendizagem?: string | null
          dificuldadeAtencao?: string | null
          dificuldadeSocializacao?: string | null
          email?: string | null
          escolaAtual?: string | null
          id?: number
          laudoMedico?: string | null
          link_contrato?: string | null
          link_entrevista?: string | null
          nome_terapeuta_ocupacional?: string | null
          nomeAluno?: string | null
          nomeResponsavel?: string | null
          obs_entrevista?: string | null
          possui_terapeuta_ocupacional?: string | null
          repetente?: string | null
          Rg_terapeuta_ocupacional?: string | null
          serie_pretendida?: string | null
          Status?: string | null
          telefone_terapeuta_ocupacional?: string | null
          tipoEscola?: string | null
          turnoPreferencia?: string | null
          usoMedicacao?: string | null
          whatsapp?: string | null
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
      [_ in never]: never
    }
    Functions: {
      authenticate_with_username: {
        Args: { p_password: string; p_username: string }
        Returns: {
          email: string
          message: string
          success: boolean
          user_id: string
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
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
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
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
