export const CoursesSection = () => {
  const courses = [
    {
      icon: "🌱",
      title: "Educação Infantil",
      subtitle: "Maternal ao Jardim II",
      description: "Ambiente seguro e estimulante para os primeiros anos de descoberta. Aprendizado por meio do afeto, da brincadeira e da curiosidade natural da criança.",
      tags: ["Desenvolvimento", "Socialização", "Letramento"],
      headerClass: "bg-zampieri-green-dark",
      tagClass: "bg-zampieri-green-dark/10 text-zampieri-green-dark",
    },
    {
      icon: "📚",
      title: "Ensino Fundamental",
      subtitle: "1º ao 9º ano · I e II",
      description: "Base sólida em todas as disciplinas com metodologia que estimula o raciocínio crítico, a criatividade e o protagonismo do aluno em cada etapa.",
      tags: ["Raciocínio crítico", "Projetos", "Esportes"],
      headerClass: "bg-zampieri-wine",
      tagClass: "bg-zampieri-wine/10 text-zampieri-wine",
    },
    {
      icon: "🎓",
      title: "Ensino Médio",
      subtitle: "1ª à 3ª série",
      description: "Preparação completa para vestibulares e ENEM com acompanhamento próximo, orientação vocacional e foco no sucesso de cada aluno.",
      tags: ["Vestibular", "ENEM", "Orientação"],
      headerClass: "bg-zampieri-gold",
      tagClass: "bg-zampieri-gold/15 text-zampieri-gold",
    },
  ];

  return (
    <section id="cursos" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-zampieri-gold font-bold">Nossos segmentos</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-zampieri-green-dark mt-3">
              Do primeiro passo ao vestibular
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {courses.map((c) => (
              <div key={c.title} className="rounded-2xl overflow-hidden border border-zampieri-cream shadow-sm hover:shadow-xl transition-shadow flex flex-col">
                <div className={`${c.headerClass} text-white p-6 h-48 flex flex-col justify-center`}>
                  <div className="text-4xl mb-3">{c.icon}</div>
                  <h3 className="font-serif text-2xl font-bold leading-tight">{c.title}</h3>
                  <p className="text-white/85 text-sm mt-1">{c.subtitle}</p>
                </div>
                <div className="p-6 bg-white flex-1 flex flex-col">
                  <p className="text-zampieri-green-dark/80 leading-relaxed mb-5 flex-1">{c.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {c.tags.map((t) => (
                      <span key={t} className={`${c.tagClass} text-xs font-semibold px-3 py-1.5 rounded-full`}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
