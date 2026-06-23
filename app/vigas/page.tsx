export default function Vigas() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-56 bg-blue-900 flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-blue-800">
          <a href="/" className="text-blue-100 font-medium text-base">⬡ NodoCalc</a>
          <div className="text-blue-400 text-xs mt-1">Plataforma de cálculo para ingeniería civil</div>
        </div>
        <div className="p-2 flex-1">
          <div className="text-blue-500 text-xs uppercase tracking-widest px-2 py-2">Principal</div>
          <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊞ Dashboard</a>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">📁 Mis proyectos</div>
          <div className="text-blue-500 text-xs uppercase tracking-widest px-2 py-2 mt-3">Módulos</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 bg-blue-700 text-blue-100">— Vigas y pórticos</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊡ Geotecnia</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">〜 Sísmica NSR-10</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">💧 Hidráulica</div>
        </div>
        <div className="p-2 border-t border-blue-800">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-blue-800 cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-blue-100 text-xs font-medium">JL</div>
            <span className="text-blue-300 text-xs">Julián León</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-gray-400 text-sm">Módulos /</span>
            <span className="text-gray-800 font-medium text-base ml-1">Vigas y pórticos</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">SELECCIONA UN MÉTODO</div>
          <div className="grid grid-cols-2 gap-4">
            <MetodoCard nombre="Método de Cross" desc="Distribución de momentos para vigas continuas y pórticos con nudos rígidos." tag="Vigas continuas" />
            <MetodoCard nombre="Tres Momentos" desc="Análisis de vigas continuas con apoyos simples mediante la ecuación de Clapeyron." tag="Vigas continuas" />
            <MetodoCard nombre="Slope-Deflection" desc="Método de pendiente-deflexión para análisis de marcos y vigas hiperestáticas." tag="Pórticos" />
            <MetodoCard nombre="Método Matricial" desc="Rigidez directa para estructuras de n-nodos y n-elementos, casos paramétricos." tag="Pórticos" />
            <MetodoCard nombre="Método de Kani" desc="Iteración de Kani para pórticos con cargas laterales y verticales." tag="Pórticos" />
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
      <span className="inline-block text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{tag}</span>
    </div>
  )
}
