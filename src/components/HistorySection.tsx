
import { Card, CardContent } from "@/components/ui/card";

export const HistorySection = () => {
  const stats = [
    { value: "+ de 40 anos", label: "de tradição" },
    { value: "+ de 10 mil", label: "alunos matriculados" },
    { value: "Referência", label: "na região" },
  ];

  return (
    <section id="historia" className="py-16 bg-gradient-to-br from-green-800 via-green-700 to-green-600 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-white">
            Nossa História
          </h2>
          
          <div className="prose prose-lg mx-auto text-green-50 mb-12">
            <p className="text-lg leading-relaxed mb-6">
              Desde 1980, o Colégio Zampieri transforma vidas com educação de qualidade, 
              da Educação Infantil ao Ensino Médio. Nosso compromisso é evoluir junto com o mundo, 
              investindo constantemente em inovação, estrutura e ensino de excelência.
            </p>
            
            <p className="text-lg leading-relaxed mb-6">
              Aqui, o aluno aprende a pensar, questionar e agir. Nossa missão é formar cidadãos 
              conscientes, preparados para enfrentar os desafios da sociedade com conhecimento, 
              criatividade e atitude.
            </p>
            
            <p className="text-lg leading-relaxed mb-6">
              Com o sistema SAE Digital, garantimos um material didático dinâmico, crítico e 
              alinhado com a realidade.
            </p>
            
            <p className="text-lg leading-relaxed">
              Acreditamos que arte, cultura e vivência são parte essencial do aprendizado. 
              Promovemos atividades que despertam talentos, desenvolvem habilidades e enriquecem 
              a formação dos nossos alunos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-green-100 font-medium">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
