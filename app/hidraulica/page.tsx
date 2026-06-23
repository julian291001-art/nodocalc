export default function Hidraulica() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div className="w-56 bg-blue-900 flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-blue-800">
          <a href="/" className="text-blue-100 font-medium text-base">◈ NodoCalc</a>
          <div className="text-blue-400 text-xs mt-1">Plataforma de cálculo para ingeniería civil</div>
        </div>
        <div className="p-2 flex-1 overflow-y-auto">
          <div className="text-blue-500 text-xs uppercase tracking-widest px-2 py-2">Principal</div>
          <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊞ Dashboard</a>
          <div className="text-blue-500 text-xs uppercase tracking-widest px-2 py-2 mt-3">Módulos</div>
          <a href="/estatica" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊛ Estática</a>
          <a href="/vigas" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">━ Vigas</a>
          <a href="/porticos" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⬡ Pórticos</a>
          <a href="/armaduras" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">△ Armaduras</a>
          <a href="/matricial" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊞ Método Matricial</a>
          <a href="/pandeo" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊟ Pandeo</a>
          <a href="/dinamica" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">〜 Dinámica Estructural</a>
          <a href="/modal" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">◎ Análisis Modal</a>
          <a href="/geotecnia" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊡ Geotecnia</a>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 bg-blue-700 text-blue-100">💧 Hidráulica</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">🏗 Diseño Estructural</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">🔧 Herramientas</div>
        </div>
        <div className="p-2 border-t border-blue-800">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-blue-800 cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-blue-100 text-xs font-medium">JL</div>
            <span className="text-blue-300 text-xs">Julián León</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Hidráulica y Mecánica de Fluidos</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MECÁNICA DE FLUIDOS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Propiedades de los fluidos" desc="Densidad, peso específico, viscosidad, tensión superficial, compresibilidad." metodos={["Densidad y peso específico", "Viscosidad cinemática y dinámica", "Tensión superficial", "Módulo de elasticidad volumétrica", "Presión de vapor"]} />
            <SubtemaCard nombre="Hidrostática" desc="Presión en un punto, fuerzas sobre superficies planas y curvas, flotación, manómetros." metodos={["Ley de Pascal", "Fuerzas en superficies planas", "Fuerzas en superficies curvas", "Flotación y estabilidad", "Manómetros"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">BERNOULLI Y APLICACIONES</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Ecuación de Bernoulli" desc="Bernoulli ideal y con pérdidas, aplicaciones a dispositivos de medición." metodos={["Bernoulli ideal", "Bernoulli con pérdidas", "Tubo de Pitot", "Venturímetro", "Orificio y tobera"]} />
            <SubtemaCard nombre="Vertederos y compuertas" desc="Vertederos rectangular, triangular y trapezoidal. Compuertas libre y sumergida." metodos={["Vertedero rectangular", "Vertedero triangular (V)", "Vertedero trapezoidal", "Compuerta libre", "Compuerta sumergida"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">HIDRÁULICA DE TUBERÍAS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Pérdidas y fricción" desc="Darcy-Weisbach, Hazen-Williams, Moody, Colebrook-White, pérdidas secundarias." metodos={["Darcy-Weisbach", "Hazen-Williams", "Factor de Moody", "Colebrook-White", "Swamee-Jain", "Pérdidas secundarias"]} />
            <SubtemaCard nombre="Redes de tuberías" desc="Tuberías en serie y paralelo, redes por Hardy-Cross, golpe de ariete, bombas." metodos={["Tuberías en serie", "Tuberías en paralelo", "Redes Hardy-Cross", "Golpe de ariete", "Curva sistema-bomba"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">HIDRÁULICA DE CANALES</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Flujo en canales" desc="Manning, Chezy, sección óptima, flujo crítico, número de Froude, resalto hidráulico." metodos={["Manning", "Chezy", "Sección hidráulica óptima", "Flujo crítico y Froude", "Resalto hidráulico"]} />
            <SubtemaCard nombre="Curvas de remanso" desc="Clasificación y cálculo de perfiles de flujo gradualmente variado." metodos={["Perfil M1, M2, M3", "Perfil S1, S2, S3", "Perfil C, H, A", "Método del paso directo", "Método estándar"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">HIDROLOGÍA</div>
          <div className="grid grid-cols-2 gap-4">
            <SubtemaCard nombre="Precipitación y escorrentía" desc="Hietogramas, isoyetas, Thiessen, método CN, hidrograma unitario." metodos={["Hietograma", "Polígonos de Thiessen", "Método CN (SCS)", "Hidrograma unitario", "Tránsito Muskingum"]} />
            <SubtemaCard nombre="Caudales de diseño" desc="Curvas IDF, método racional, tiempo de concentración." metodos={["Curvas IDF", "Método racional", "Tiempo de concentración", "Caudal pico"]} />
          </div>

        </div>
      </div>
    </div>
  )
}

function SubtemaCard({ nombre, desc, metodos }: { nombre: string; desc: string; metodos: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-blue-300 transition-colors">
      <div className="text-sm font-medium text-gray-800 mb-2">{nombre}</div>
      <div className="text-xs text-gray-500 leading-relaxed mb-3">{desc}</div>
      <div className="flex flex-wrap gap-1">
        {metodos.map((m) => (
          <span key={m} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{m}</span>
        ))}
      </div>
    </div>
  )
}