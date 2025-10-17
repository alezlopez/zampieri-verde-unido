
export const StructureSection = () => {
  return (
    <section id="estrutura" className="py-12 md:py-16 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 text-white">
            Nossa Estrutura
          </h2>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-8 border border-white/10">
            <div className="prose prose-base md:prose-lg mx-auto text-gray-100">
              <p className="text-base md:text-lg leading-relaxed mb-4 md:mb-6">
                O Colégio Zampieri conta com <span className="text-green-400 font-semibold">2.000 m²</span> de espaço planejado para proporcionar 
                conforto, segurança e excelência no aprendizado de alunos a partir dos 5 anos 
                de idade. São dois prédios com <span className="text-green-400 font-semibold">16 salas de aula por período</span>, equipadas com 
                ar-condicionado e ventiladores, sistema de som e projetores em todas as salas, 
                oferecendo um ambiente moderno e acolhedor.
              </p>
              
              <p className="text-lg leading-relaxed mb-6">
                Nossa estrutura educacional inclui <span className="text-green-400 font-semibold">sala multiuso, quadra coberta</span> para aulas 
                de Educação Física e eventos, <span className="text-green-400 font-semibold">teatro, parque infantil</span> exclusivo para crianças 
                até o 5º ano, pátios amplos, cantina e áreas de convivência que incentivam a 
                socialização e o bem-estar.
              </p>
              
              <p className="text-lg leading-relaxed">
                Além disso, valorizamos o contato com a natureza por meio de nosso <span className="text-green-400 font-semibold">núcleo 
                ambiental e áreas verdes</span>, que estimulam a consciência ecológica e enriquecem 
                a vivência escolar. Cada espaço foi pensado para apoiar o desenvolvimento 
                integral dos nossos alunos, unindo conforto, tecnologia e propósito pedagógico.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
