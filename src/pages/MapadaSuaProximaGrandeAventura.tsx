import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface FormData {
  nomeCompleto: string;
  idade: string;
  serie: string;
  diaInteiro: string;
  personagemAdmira: string;
  materiaFavorita: string;
  onlinePreferencia: string;
  aplicativoIdeia: string;
  medoFuturo: string;
}

const MapadaSuaProximaGrandeAventura = () => {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('https://n8n.colegiozampieri.com/webhook/formulariograndeaventura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Formulário enviado!",
          description: "Suas respostas foram enviadas com sucesso.",
        });
        form.reset();
      } else {
        throw new Error('Erro ao enviar formulário');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar o formulário. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Mapa da Sua Próxima Grande Aventura
            </h1>
            <p className="text-muted-foreground">
              Descubra seu caminho através de perguntas que revelam seus interesses e aspirações
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-lg p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="nomeCompleto"
                  rules={{ required: "Nome completo é obrigatório" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>1. Nome completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite seu nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="idade"
                  rules={{ 
                    required: "Idade é obrigatória",
                    pattern: {
                      value: /^\d+$/,
                      message: "Digite apenas números"
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>2. Idade</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Digite sua idade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serie"
                  rules={{ required: "Série é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>3. Série</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione sua série" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1º Médio">1º Médio</SelectItem>
                          <SelectItem value="2º Médio">2º Médio</SelectItem>
                          <SelectItem value="3º Médio">3º Médio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diaInteiro"
                  rules={{ required: "Esta pergunta é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>4. Se você pudesse passar o dia inteiro fazendo uma única coisa (sem se preocupar com escola ou tarefas), o que seria?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva o que você faria..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personagemAdmira"
                  rules={{ required: "Esta pergunta é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>5. No mundo dos games ou filmes, qual tipo de personagem você mais admira? O herói, o inventor, o líder da equipe, o gênio da estratégia ou o(a) artista?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Conte-nos sobre o personagem que você admira..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="materiaFavorita"
                  rules={{ required: "Esta pergunta é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>6. Qual sua matéria favorita na escola e qual você acha mais útil para a vida real?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Fale sobre sua matéria favorita..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="onlinePreferencia"
                  rules={{ required: "Esta pergunta é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>7. Quando você está online, o que mais gosta de fazer? (Ex: Criar vídeos, jogar online, ver tutoriais, seguir contas de tecnologia ou arte, debater sobre temas polêmicos)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva suas atividades online favoritas..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aplicativoIdeia"
                  rules={{ required: "Esta pergunta é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>8. Se você pudesse criar um aplicativo ou projeto que resolvesse um problema, qual seria?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva sua ideia de aplicativo..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medoFuturo"
                  rules={{ required: "Esta pergunta é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>9. Qual é o seu maior medo em relação ao futuro?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Compartilhe seus receios sobre o futuro..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Formulário'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapadaSuaProximaGrandeAventura;