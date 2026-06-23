import Sidebar from "../components/Sidebar"

export default function Pandeo() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
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