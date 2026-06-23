export default function Dinamica() {
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 bg-blue-700 text-blue-100">〜 Dinámica Estructural</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">◎ Análisis Modal</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊡ Geotecnia</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">💧 Hidráulica</div>
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
          <span className="text-gray-800 font-medium text-base ml-1">Dinámica Estructural</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">1 GRADO DE LIBERTAD — SIN AMORTIGUAMIENTO</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Vibración libre" desc="Respuesta libre de un sistema de 1GDL sin amortiguamiento. Frecuencia natural, período y amplitud." tag="1GDL" />
            <MetodoCard nombre="Respuesta a carga armónica" desc="Respuesta en estado estacionario y transitorio a carga sinusoidal. Factor de amplificación dinámica." tag="1GDL" />
            <MetodoCard nombre="Respuesta a carga general (Duhamel)" desc="Integral de Duhamel para respuesta a cargas arbitrarias no periódicas." tag="1GDL" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">1 GRADO DE LIBERTAD — CON AMORTIGUAMIENTO</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Vibración libre amortiguada" desc="Respuesta libre con amortiguamiento subcrítico, crítico y supercrítico. Razón de amortiguamiento ξ." tag="1GDL" />
            <MetodoCard nombre="Respuesta armónica amortiguada" desc="Amplificación dinámica y ángulo de fase con amortiguamiento. Resonancia y frecuencia de resonancia." tag="1GDL" />
            <MetodoCard nombre="Espectro de respuesta" desc="Construcción del espectro de respuesta sísmica (Sa, Sv, Sd) para un registro de aceleración." tag="Sísmica" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">INTEGRACIÓN NUMÉRICA</div>
          <div className="grid grid-cols-2 gap-4">
            <MetodoCard nombre="Método de Newmark-β" desc="Integración paso a paso de la ecuación de movimiento con parámetros β y γ." tag="Numérico" />
            <MetodoCard nombre="Método de Wilson-θ" desc="Variante incondicionalemente estable del método de Newmark para sistemas no lineales." tag="Numérico" />
          </div>

        </div>
      </div>
    </div>
  )
}

function MetodoCard({ nombre, desc, tag }: { nombre: string; desc: string; tag: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-blue-300 transition-colors">
      <div className="text-sm font-medium text-gray-800 mb-2">{nombre}</div>
      <div className="text-xs text-gray-500 leading-relaxed mb-3">{desc}</div>
      <span className="inline-block text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">{tag}</span>
    </div>
  )
}
