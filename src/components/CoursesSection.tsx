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
  return <section id="cursos" className="py-16 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-green-800">
            Nossos Cursos
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {courses.map((course, index) => <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-0">
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
              </Card>)}
          </div>

          <div className="text-center">
            
            
          </div>
        </div>
      </div>
    </section>;
};