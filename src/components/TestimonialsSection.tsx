
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
    <section id="depoimentos" className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-green-200/30 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-purple-200/20 rounded-full blur-2xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Depoimentos
            </div>
            <h2 className="text-5xl font-bold text-gray-800 mb-6">
              O que as famílias 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600"> dizem sobre nós</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Conheça a experiência real de famílias que confiam na nossa educação e veja como transformamos vidas através do aprendizado
            </p>
          </div>
          
          {/* Video Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden border border-white/50"
                onClick={() => openVideo(testimonial.videoId)}
              >
                {/* Video thumbnail container */}
                <div className="relative overflow-hidden rounded-t-3xl">
                  <img 
                    src={testimonial.thumbnail}
                    alt={`Depoimento ${testimonial.family}`}
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/40 transition-all duration-300"></div>
                  
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 border-2 border-white/30">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:bg-red-500 transition-colors duration-300">
                          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                      {/* Pulse effect */}
                      <div className="absolute inset-0 w-20 h-20 bg-white/20 rounded-full animate-ping opacity-75 group-hover:opacity-50"></div>
                    </div>
                  </div>

                  {/* Video duration badge */}
                  <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                    <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15 8v8H9V8h6m2-2H7v12h10V6z"/>
                    </svg>
                    Vídeo
                  </div>
                </div>

                {/* Content */}
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {testimonial.family.split(' ')[1][0]}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
                        {testimonial.family}
                      </h3>
                      <p className="text-gray-500 text-sm">Depoimento em vídeo</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600 font-medium">
                      Clique para assistir
                    </p>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all duration-300">
                      <span className="text-sm">Assistir</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Hover effect border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>

          {/* Call to action */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-full font-semibold hover:from-blue-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v3.982a2 2 0 0 1-.648 1.467L12 18.781 3.648 10.45A2 2 0 0 1 3 8.982V5a2 2 0 0 1 2-2h14zM9 7v6l3-2 3 2V7H9z"/>
              </svg>
              Faça parte da nossa família também
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
