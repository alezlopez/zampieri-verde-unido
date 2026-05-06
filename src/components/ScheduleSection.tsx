import { Sun, Moon } from "lucide-react";

export const ScheduleSection = () => {
  const schedules = [
    {
      title: "Educação Infantil",
      headerClass: "bg-zampieri-green-dark",
      blocks: [{ icon: "tarde" as const, label: "Tarde (único turno)", time: "13h05 – 17h15" }],
    },
    {
      title: "Ensino Fundamental I e II",
      headerClass: "bg-zampieri-wine",
      blocks: [
        { icon: "manha" as const, label: "Manhã", time: "7h15 – 11h20" },
        { icon: "tarde" as const, label: "Tarde", time: "13h05 – 17h15" },
      ],
      note: "* Turmas do 5º, 8º e 9º ano podem ter aulas até 12h05 em um ou dois dias da semana.",
    },
    {
      title: "Ensino Médio",
      headerClass: "bg-zampieri-gold",
      blocks: [{ icon: "manha" as const, label: "Manhã (único turno)", time: "7h15 – 12h05" }],
    },
  ];

  return (
    <section id="horarios" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-zampieri-gold font-bold">Organização escolar</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-zampieri-green-dark mt-3">Horários de aula</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {schedules.map((s) => (
              <div key={s.title} className="rounded-2xl overflow-hidden border border-zampieri-cream shadow-sm">
                <div className={`${s.headerClass} text-white p-5`}>
                  <h3 className="font-serif text-lg md:text-xl font-bold text-center">{s.title}</h3>
                </div>
                <div className="p-6 bg-zampieri-cream-light space-y-5">
                  {s.blocks.map((b, i) => (
                    <div key={i} className="text-center">
                      <div className="flex items-center justify-center gap-2 text-zampieri-green-light font-semibold text-sm mb-1">
                        {b.icon === "manha" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        {b.label}
                      </div>
                      <div className="font-serif text-xl text-zampieri-green-dark font-bold">{b.time}</div>
                    </div>
                  ))}
                  {s.note && (
                    <p className="text-xs italic text-zampieri-green-dark/65 text-center bg-white p-3 rounded-md border border-zampieri-cream">
                      {s.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
