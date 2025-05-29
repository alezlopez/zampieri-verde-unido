
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  nome: string;
  whatsapp: string;
  email: string;
  curso: string;
  horario: string;
}

interface ContactFormProps {
  onSubmit: (data: UserData) => void;
}

export const ContactForm = ({ onSubmit }: ContactFormProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    curso: "",
    horario: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const formatWhatsApp = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, "");
    
    // Aplica a máscara: 11 99999-9999
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)} ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setFormData({ ...formData, whatsapp: formatted });
  };

  const validateForm = () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome completo é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.whatsapp.trim() || formData.whatsapp.replace(/\D/g, "").length !== 11) {
      toast({
        title: "Erro",
        description: "WhatsApp deve ter 11 dígitos (DD + 9 dígitos)",
        variant: "destructive",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      toast({
        title: "Erro",
        description: "E-mail válido é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.curso) {
      toast({
        title: "Erro",
        description: "Curso de interesse é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.horario) {
      toast({
        title: "Erro",
        description: "Horário de interesse é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Enviar dados iniciais para o webhook
      await fetch("https://n8n.colegiozampieri.com/webhook/chatSite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "contact_form",
          data: formData,
          timestamp: new Date().toISOString(),
        }),
      });

      onSubmit(formData);
    } catch (error) {
      console.error("Erro ao enviar formulário:", error);
      toast({
        title: "Erro",
        description: "Erro ao conectar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cursos = [
    "Pré (5 anos)",
    "1º Ano",
    "2º Ano", 
    "3º Ano",
    "4º Ano",
    "5º Ano",
    "6º Ano",
    "7º Ano",
    "8º Ano",
    "9º Ano",
    "1º Médio",
    "2º Médio",
    "3º Médio"
  ];

  const horarios = [
    "Manhã",
    "Tarde", 
    "Indiferente"
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2">
        <h4 className="font-semibold text-gray-800 mb-2">Olá! Para começarmos nossa conversa, preciso de algumas informações:</h4>
      </div>

      <ScrollArea className="flex-1 px-4">
        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
          <div>
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Digite seu nome completo"
              required
            />
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <Input
              id="whatsapp"
              type="text"
              value={formData.whatsapp}
              onChange={handleWhatsAppChange}
              placeholder="11 99999-9999"
              maxLength={14}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="curso">Curso de Interesse *</Label>
            <Select
              value={formData.curso}
              onValueChange={(value) => setFormData({ ...formData, curso: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o curso" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                {cursos.map((curso) => (
                  <SelectItem key={curso} value={curso}>
                    {curso}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="horario">Horário de Interesse *</Label>
            <Select
              value={formData.horario}
              onValueChange={(value) => setFormData({ ...formData, horario: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o horário" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                {horarios.map((horario) => (
                  <SelectItem key={horario} value={horario}>
                    {horario}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            {isLoading ? "Conectando..." : "Iniciar Conversa"}
          </Button>
        </form>
      </ScrollArea>
    </div>
  );
};
