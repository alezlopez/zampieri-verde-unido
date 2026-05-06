export const TestimonialsSection = () => {
  const testimonials = [
    { family: "Família Menegussi", videoId: "n4cfXDJ4b_s" },
    { family: "Família Neris", videoId: "DQlQ3pcJZAc" },
    { family: "Família Viana", videoId: "A_hdlb7wxmw" },
    { family: "Família Gonçalves", videoId: "AOhDOFI05ZA" },
  ];

  return (
    <section id="depoimentos" className="py-16 md:py-24 bg-zampieri-cream">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-zampieri-gold font-bold">Quem faz o Zampieri</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-zampieri-green-dark mt-3">
              O que as famílias dizem
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {testimonials.map((t) => (
              <div key={t.videoId} className="bg-white rounded-2xl overflow-hidden shadow-md border-t-[3px] border-zampieri-gold">
                <div className="relative aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${t.videoId}`}
                    title={`Depoimento ${t.family}`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <div className="p-5 text-center">
                  <h3 className="font-serif text-xl font-bold text-zampieri-green-dark">{t.family}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
