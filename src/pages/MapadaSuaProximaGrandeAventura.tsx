import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Compass } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EnrollmentBanner } from '@/components/EnrollmentBanner';

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
    <div className="min-h-screen bg-white">
      <EnrollmentBanner />
      <Header activeSection="formulario" />
      
      <main className="pt-[120px] md:pt-[140px]">
        <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <div className="mb-4 md:mb-6">
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="text-green-700 hover:text-green-800 hover:bg-green-50 text-sm md:text-base"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>

            {/* Header Section */}
            <div className="text-center mb-6 md:mb-8 lg:mb-12">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-full mb-4 md:mb-6">
                <Compass className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-green-800 mb-3 md:mb-4 px-4">
                Mapa da Sua Próxima Grande Aventura
              </h1>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
                Descubra seu caminho através de perguntas que revelam seus interesses e aspirações para o futuro
              </p>
            </div>

            {/* Form Container */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-6 lg:p-8 xl:p-10">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <FormField
                    control={form.control}
                    name="nomeCompleto"
                    rules={{ required: "Nome completo é obrigatório" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-green-800 font-semibold text-sm md:text-base">1. Nome completo</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Digite seu nome completo" 
                            className="border-green-200 focus:border-green-500 focus:ring-green-500 text-sm md:text-base"
                            {...field} 
                          />
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
                        <FormLabel className="text-green-800 font-semibold text-sm md:text-base">2. Idade</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Digite sua idade"
                            className="border-green-200 focus:border-green-500 focus:ring-green-500 text-sm md:text-base"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="serie"
                  rules={{ required: "Série é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-800 font-semibold text-sm md:text-base">3. Série</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-green-200 focus:border-green-500 focus:ring-green-500 text-sm md:text-base">
                            <SelectValue placeholder="Selecione sua série" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white border-green-200">
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
                      <FormLabel className="text-green-800 font-semibold text-sm md:text-base">
                        4. Se você pudesse passar o dia inteiro fazendo uma única coisa (sem se preocupar com escola ou tarefas), o que seria?
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva o que você faria..."
                          className="min-h-[80px] md:min-h-[100px] border-green-200 focus:border-green-500 focus:ring-green-500 text-sm md:text-base"
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
                      <FormLabel className="text-green-800 font-semibold text-base">
                        5. No mundo dos games ou filmes, qual tipo de personagem você mais admira? O herói, o inventor, o líder da equipe, o gênio da estratégia ou o(a) artista?
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Conte-nos sobre o personagem que você admira..."
                          className="min-h-[100px] border-green-200 focus:border-green-500 focus:ring-green-500"
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
                      <FormLabel className="text-green-800 font-semibold text-base">
                        6. Qual sua matéria favorita na escola e qual você acha mais útil para a vida real?
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Fale sobre sua matéria favorita..."
                          className="min-h-[100px] border-green-200 focus:border-green-500 focus:ring-green-500"
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
                      <FormLabel className="text-green-800 font-semibold text-base">
                        7. Quando você está online, o que mais gosta de fazer? (Ex: Criar vídeos, jogar online, ver tutoriais, seguir contas de tecnologia ou arte, debater sobre temas polêmicos)
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva suas atividades online favoritas..."
                          className="min-h-[100px] border-green-200 focus:border-green-500 focus:ring-green-500"
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
                      <FormLabel className="text-green-800 font-semibold text-base">
                        8. Se você pudesse criar um aplicativo ou projeto que resolvesse um problema, qual seria?
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva sua ideia de aplicativo..."
                          className="min-h-[100px] border-green-200 focus:border-green-500 focus:ring-green-500"
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
                      <FormLabel className="text-green-800 font-semibold text-base">
                        9. Qual é o seu maior medo em relação ao futuro?
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Compartilhe seus receios sobre o futuro..."
                          className="min-h-[100px] border-green-200 focus:border-green-500 focus:ring-green-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-3 md:pt-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 rounded-lg transition-colors duration-200 text-base md:text-lg" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Formulário'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MapadaSuaProximaGrandeAventura;