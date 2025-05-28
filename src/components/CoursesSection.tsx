
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Trophy, GraduationCap } from "lucide-react";
import { WhatsAppCTA } from "./WhatsAppCTA";

export const CoursesSection = () => {
  const courses = [{
    title: "Educação Infantil (5 anos)",
    subtitle: "Os Primeiros Passos no Colégio Zampieri a partir dos 5 anos.",
    description: "Acolhedor e Essencial para o desenvolvimento. A criança encontra carinho, entusiasmo, encantamento e aprende a alegria das descobertas.",
    color: "bg-gradient-to-br from-green-400 to-green-500",
    icon: BookOpen
  }, {
    title: "Ensino Fundamental I",
    subtitle: "Anos Iniciais, essencial para a formação!",
    description: "A aprendizagem precisa ter motivo e finalidade. O aluno encontra desafios, motivação, incentivo e descobre a emoção de aprender.",
    color: "bg-gradient-to-br from-green-500 to-green-600",
    icon: Users
  }, {
    title: "Ensino Fundamental II",
    subtitle: "Anos finais, essencial para o aprendizado!",
    description: "O Aluno formula e constata hipóteses de seus pensamentos, apresenta atividades diversificadas e interdisciplinares.",
    color: "bg-gradient-to-br from-green-600 to-green-700",
    icon: Trophy
  }, {
    title: "Ensino Médio",
    subtitle: "Anos finais, essencial para o aprendizado!",
    description: "O Aluno formula e constata hipóteses de seus pensamentos, apresenta atividades diversificadas e interdisciplinares.",
    color: "bg-gradient-to-br from-green-700 to-green-800",
    icon: GraduationCap
  }];

  return (
    <section id="cursos" className="py-20 bg-gradient-to-br from-green-50 via-green-100 to-green-200 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-10 left-10 w-32 h-32 bg-green-200/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-green-300/30 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-green-200/20 rounded-full blur-2xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-green-800">
            Nossos Cursos
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {courses.map((course, index) => (
              <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-0">
                <div className={`${course.color} p-6 text-white h-48 flex flex-col justify-center`}>
                  <CardHeader className="p-0 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <course.icon className="h-8 w-8 text-white" />
                      <CardTitle className="text-xl font-bold text-white">
                        {course.title}
                      </CardTitle>
                    </div>
                    <p className="text-green-100 font-medium">
                      {course.subtitle}
                    </p>
                  </CardHeader>
                </div>
                <CardContent className="p-6 bg-white">
                  <p className="text-gray-700 leading-relaxed">
                    {course.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            
            
          </div>
        </div>
      </div>
    </section>
  );
};
