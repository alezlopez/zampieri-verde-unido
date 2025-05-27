
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const CoursesSection = () => {
  const courses = [
    {
      title: "Educação Infantil (5 anos)",
      subtitle: "Os Primeiros Passos no Colégio Zampieri a partir dos 5 anos.",
      description: "Acolhedor e Essencial para o desenvolvimento. A criança encontra carinho, entusiasmo, encantamento e aprende a alegria das descobertas.",
      color: "bg-green-50 border-green-200"
    },
    {
      title: "Ensino Fundamental I",
      subtitle: "Anos Iniciais, essencial para a formação!",
      description: "A aprendizagem precisa ter motivo e finalidade. O aluno encontra desafios, motivação, incentivo e descobre a emoção de aprender.",
      color: "bg-green-100 border-green-300"
    },
    {
      title: "Ensino Fundamental II",
      subtitle: "Anos finais, essencial para o aprendizado!",
      description: "O Aluno formula e constata hipóteses de seus pensamentos, apresenta atividades diversificadas e interdisciplinares.",
      color: "bg-green-50 border-green-200"
    },
    {
      title: "Ensino Médio",
      subtitle: "Anos finais, essencial para o aprendizado!",
      description: "O Aluno formula e constata hipóteses de seus pensamentos, apresenta atividades diversificadas e interdisciplinares.",
      color: "bg-green-100 border-green-300"
    }
  ];

  return (
    <section id="cursos" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-green-800">
            Nossos Cursos
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {courses.map((course, index) => (
              <Card key={index} className={course.color}>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-green-800">
                    {course.title}
                  </CardTitle>
                  <p className="text-green-700 font-medium">
                    {course.subtitle}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {course.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
