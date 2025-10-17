import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Sun, Moon } from "lucide-react";
export const ScheduleSection = () => {
  const schedules = [{
    title: "Educação Infantil",
    morning: "7h15 às 11h20",
    afternoon: "13h05 às 17h15",
    note: "",
    color: "bg-gradient-to-br from-blue-500 to-blue-600"
  }, {
    title: "Ensino Fundamental I e II",
    morning: "7h15 às 11h20*",
    afternoon: "13h05 às 17h15",
    note: "* turmas do 8º e 9º ano saem às 12h05 duas vezes na semana",
    color: "bg-gradient-to-br from-green-500 to-green-600"
  }, {
    title: "Ensino Médio",
    morning: "7h15 às 12h05",
    afternoon: "",
    note: "",
    color: "bg-gradient-to-br from-purple-500 to-purple-600"
  }];
  return <section id="horarios" className="py-12 md:py-16 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <Clock className="h-10 w-10 md:h-12 md:w-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Horários
            </h2>
            
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {schedules.map((schedule, index) => <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden">
                <div className={`${schedule.color} p-3 md:p-4`}>
                  <CardHeader className="p-0">
                    <CardTitle className="text-base md:text-lg font-bold text-white text-center flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4 md:h-5 md:w-5" />
                      {schedule.title}
                    </CardTitle>
                  </CardHeader>
                </div>
                <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 font-semibold text-yellow-400 mb-2">
                      <Sun className="h-4 w-4" />
                      Manhã
                    </div>
                    <div className="text-white font-mono text-base md:text-lg">{schedule.morning}</div>
                  </div>
                  
                  {schedule.afternoon && <div className="text-center">
                      <div className="flex items-center justify-center gap-2 font-semibold text-blue-400 mb-2">
                        <Moon className="h-4 w-4" />
                        Tarde
                      </div>
                      <div className="text-white font-mono text-base md:text-lg">{schedule.afternoon}</div>
                    </div>}
                  
                  {schedule.note && <div className="text-sm text-gray-300 text-center mt-4 italic bg-white/5 p-3 rounded-lg">
                      {schedule.note}
                    </div>}
                </CardContent>
              </Card>)}
          </div>
        </div>
      </div>
    </section>;
};