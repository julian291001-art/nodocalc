export default function Armaduras() {
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 bg-blue-700 text-blue-100">△ Armaduras</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊞ Método Matricial</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊟ Pandeo</div>
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
          <span className="text-gray-800 font-medium text-base ml-1">Armaduras</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MÉTODOS CLÁSICOS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Método de nodos" desc="Equilibrio de fuerzas en cada nodo para determinar fuerzas en todos los elementos." tag="Clásico" />
            <MetodoCard nombre="Método de secciones (Ritter)" desc="Corte de la armadura para encontrar fuerzas en elementos específicos sin analizar toda la estructura." tag="Clásico" />
            <MetodoCard nombre="Método gráfico (Maxwell-Cremona)" desc="Diagrama vectorial de fuerzas para armaduras simples mediante construcción gráfica." tag="Gráfico" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MÉTODOS DE ENERGÍA</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Trabajo virtual" desc="Principio de trabajos virtuales para calcular deflexiones y desplazamientos en armaduras." tag="Energía" />
            <MetodoCard nombre="Teorema de Castigliano" desc="Derivada de la energía de deformación axial para obtener desplazamientos en nodos." tag="Energía" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MÉTODO MATRICIAL</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Rigidez directa 2D" desc="Método matricial para armaduras planas con n-nodos y n-elementos, casos paramétricos." tag="Matricial" />
            <MetodoCard nombre="Rigidez directa 3D" desc="Método matricial para armaduras espaciales con elementos en las tres dimensiones." tag="Matricial" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CONDICIONES DE APOYO</div>
          <div className="grid grid-cols-2 gap-4">
            <InfoCard titulo="Apoyos disponibles" items={["Articulado (pin) 2D", "Rodillo (roller) 2D", "Articulado espacial 3D", "Resorte axial (Ka)", "Resorte vertical (Kv)", "Resorte horizontal (Kh)"]} />
            <InfoCard titulo="Condiciones especiales" items={["Asentamiento vertical prescrito (δv)", "Asentamiento horizontal prescrito (δh)", "Elementos con temperatura (ΔT)", "Elementos con imperfección de longitud"]} />
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
      <span className="inline-block text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{tag}</span>
    </div>
  )
}

function InfoCard({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-sm font-medium text-gray-800 mb-3">{titulo}</div>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}