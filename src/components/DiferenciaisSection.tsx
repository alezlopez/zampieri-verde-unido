export const DiferenciaisSection = () => {
  const items = [
    { value: "46+", label: "Anos de tradição", desc: "Uma história de dedicação e amor à educação, construída família por família." },
    { value: "+10 mil", label: "Alunos formados", desc: "Gerações que saíram prontas para transformar a sociedade com conhecimento e atitude." },
    { value: "2.000m²", label: "Área estruturada", desc: "Espaços planejados para o desenvolvimento completo — intelectual, físico e cultural." },
    { value: "SAE", label: "Sistema digital", desc: "Material didático dinâmico e alinhado com a realidade do século XXI." },
  ];

  return (
    <section className="py-16 md:py-24 bg-zampieri-green-dark text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-[0.2em] text-zampieri-gold-light font-bold">Por que o Zampieri</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold mt-3 mb-4">Nossos diferenciais</h2>
            <p className="text-white/80 leading-relaxed">
              Mais de quatro décadas de compromisso com a formação integral de alunos que pensam, questionam e transformam o mundo ao redor.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {items.map((it) => (
              <div key={it.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 hover:bg-white/10 transition-colors">
                <div className="font-serif text-3xl md:text-4xl font-bold text-zampieri-gold-light">{it.value}</div>
                <div className="text-sm font-semibold mt-1 mb-3">{it.label}</div>
                <p className="text-white/70 text-xs md:text-sm leading-relaxed">{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
