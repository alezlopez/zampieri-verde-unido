export const TestimonialsSection = () => {
  const testimonials = [
    {
      family: "Família Gonçalves",
      videoId: "AOhDOFI05ZA",
      thumbnail: `https://img.youtube.com/vi/AOhDOFI05ZA/maxresdefault.jpg`
    },
    {
      family: "Família Viana", 
      videoId: "A_hdlb7wxmw",
      thumbnail: `https://img.youtube.com/vi/A_hdlb7wxmw/maxresdefault.jpg`
    },
    {
      family: "Família Neris",
      videoId: "DQlQ3pcJZAc", 
      thumbnail: `https://img.youtube.com/vi/DQlQ3pcJZAc/maxresdefault.jpg`
    },
    {
      family: "Família Menegussi",
      videoId: "n4cfXDJ4b_s",
      thumbnail: `https://img.youtube.com/vi/n4cfXDJ4b_s/maxresdefault.jpg`
    }
  ];

  const openVideo = (videoId: string) => {
    window.open(`https://youtu.be/${videoId}`, '_blank');
  };

  return (
    <section id="depoimentos" className="py-16 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-800">
            Depoimentos das Famílias
          </h2>
          <p className="text-lg text-center text-gray-600 mb-12">
            Conheça a experiência de famílias que confiam na nossa educação
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={() => openVideo(testimonial.videoId)}
              >
                <div className="relative">
                  <img 
                    src={testimonial.thumbnail}
                    alt={`Depoimento ${testimonial.family}`}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {testimonial.family}
                  </h3>
                  <p className="text-gray-600">
                    Clique para assistir o depoimento
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
