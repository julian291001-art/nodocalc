export default function Pandeo() {
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 bg-blue-700 text-blue-100">⊟ Pandeo</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">〜 Dinámica Estructural</div>
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
          <span className="text-gray-800 font-medium text-base ml-1">Pandeo</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PANDEO DE COLUMNAS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Euler" desc="Carga crítica de pandeo para columnas esbeltas elásticas según longitud efectiva." tag="Columnas" />
            <MetodoCard nombre="Johnson (columnas intermedias)" desc="Fórmula parabólica para columnas intermedias donde Euler sobreestima la carga crítica." tag="Columnas" />
            <MetodoCard nombre="Rankine-Gordon" desc="Fórmula empírica que combina falla por pandeo y por aplastamiento." tag="Columnas" />
            <MetodoCard nombre="Columna con excentricidad" desc="Fórmula de la secante para columnas con carga excéntrica, incluye deflexión máxima." tag="Columnas" />
            <MetodoCard nombre="Columna con carga lateral" desc="Columna-viga sometida a carga axial y lateral simultáneamente." tag="Columnas" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CONDICIONES DE FRONTERA</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Empotrado-libre (K=2.0)" desc="Columna en voladizo, longitud efectiva doble de la longitud real." tag="Condición de borde" />
            <MetodoCard nombre="Articulado-articulado (K=1.0)" desc="Columna con ambos extremos articulados, caso base de Euler." tag="Condición de borde" />
            <MetodoCard nombre="Empotrado-articulado (K=0.7)" desc="Columna con un extremo empotrado y otro articulado." tag="Condición de borde" />
            <MetodoCard nombre="Empotrado-empotrado (K=0.5)" desc="Columna con ambos extremos empotrados, mayor rigidez." tag="Condición de borde" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PANDEO EN MARCOS Y PLACAS</div>
          <div className="grid grid-cols-2 gap-4">
            <MetodoCard nombre="Carga crítica de pórticos" desc="Determinación de la carga crítica de pandeo en pórticos por método matricial." tag="Marcos" />
            <MetodoCard nombre="Factor K por alineamiento (nomograma G)" desc="Determinación del factor de longitud efectiva usando nomogramas de alineamiento." tag="Marcos" />
            <MetodoCard nombre="Pandeo lateral torsional" desc="Pandeo de vigas por flexión lateral acoplada con torsión bajo carga transversal." tag="Vigas" />
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
      <span className="inline-block text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{tag}</span>
    </div>
  )
}