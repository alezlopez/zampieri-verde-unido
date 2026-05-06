export const StructureSection = () => {
  const items = [
    { icon: "🏫", title: "16 salas por período", desc: "Salas climatizadas com ar-condicionado, sistema de som e projetores em todas as dependências." },
    { icon: "⚽", title: "Quadra coberta", desc: "Quadra poliesportiva coberta para Educação Física, campeonatos e eventos." },
    { icon: "🔧", title: "Laboratório Maker", desc: "Espaço de criação e prototipagem com tecnologia, robótica e pensamento criativo." },
    { icon: "🌳", title: "Núcleo ambiental", desc: "Áreas verdes que estimulam a consciência ecológica e enriquecem a vivência escolar." },
    { icon: "🛝", title: "Parque infantil", desc: "Exclusivo para crianças até o 5º ano, com equipamentos seguros." },
    { icon: "☕", title: "Pátios e cantina", desc: "Pátios amplos que incentivam a socialização e o bem-estar." },
  ];

  return (
    <section id="estrutura" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <span className="text-xs uppercase tracking-[0.2em] text-zampieri-gold font-bold">Nossa estrutura</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-zampieri-green-dark mt-3 mb-5">
              2.000 m² planejados para o seu filho
            </h2>
            <p className="text-zampieri-green-dark/75 leading-relaxed">
              Dois prédios com 16 salas de aula por período, todos equipados com ar-condicionado, sistema de som e projetores — um ambiente moderno, acolhedor e seguro para alunos a partir dos 5 anos de idade.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((it) => (
              <div key={it.title} className="bg-zampieri-cream hover:bg-white border border-zampieri-cream-light hover:border-zampieri-gold/40 rounded-2xl p-6 transition-all hover:shadow-lg">
                <div className="text-3xl mb-3">{it.icon}</div>
                <h3 className="font-serif text-lg font-bold text-zampieri-green-dark mb-2">{it.title}</h3>
                <p className="text-sm text-zampieri-green-dark/70 leading-relaxed">{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
