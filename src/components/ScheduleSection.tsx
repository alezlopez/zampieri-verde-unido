
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ScheduleSection = () => {
  const schedules = [
    {
      title: "Educação Infantil",
      morning: "7h15 às 11h20",
      afternoon: "13h05 às 17h15",
      note: ""
    },
    {
      title: "Ensino Fundamental I e II",
      morning: "7h15 às 11h20*",
      afternoon: "13h05 às 17h15",
      note: "* turmas do 8º e 9º ano saem às 12h05 duas vezes na semana"
    },
    {
      title: "Ensino Médio",
      morning: "7h15 às 12h05",
      afternoon: "",
      note: ""
    }
  ];

  return (
    <section id="horarios" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-8 text-green-800">
            Horários
          </h2>
          
          <p className="text-center text-lg text-gray-600 mb-16">
            Não temos período integral.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {schedules.map((schedule, index) => (
              <Card key={index} className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-green-800 text-center">
                    {schedule.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="font-semibold text-green-700 mb-1">Manhã</div>
                    <div className="text-gray-700">{schedule.morning}</div>
                  </div>
                  
                  {schedule.afternoon && (
                    <div className="text-center">
                      <div className="font-semibold text-green-700 mb-1">Tarde</div>
                      <div className="text-gray-700">{schedule.afternoon}</div>
                    </div>
                  )}
                  
                  {schedule.note && (
                    <div className="text-sm text-gray-600 text-center mt-4 italic">
                      {schedule.note}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
