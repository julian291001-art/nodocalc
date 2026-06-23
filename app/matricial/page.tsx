import Sidebar from "../components/Sidebar"

export default function Matricial() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Método Matricial de Rigidez</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESTRUCTURAS 2D</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Armadura plana" desc="Elementos biarticulados con rigidez solo axial. n-nodos, n-elementos, casos paramétricos." tag="2D" />
            <MetodoCard nombre="Viga continua" desc="Elementos con rigidez a flexión. Incluye cargas distribuidas y asentamientos." tag="2D" />
            <MetodoCard nombre="Pórtico plano" desc="Elementos con rigidez axial y flexional. Con y sin carga distribuida en elementos." tag="2D" />
          </div>
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESTRUCTURAS 3D</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Armadura espacial" desc="Elementos biarticulados en las tres dimensiones. Rigidez axial en coordenadas globales 3D." tag="3D" />
            <MetodoCard nombre="Pórtico espacial" desc="Elementos con 6 grados de libertad por nodo. Flexión, torsión y axial en 3D." tag="3D" />
          </div>
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CONDICIONES GENERALES</div>
          <div className="grid grid-cols-2 gap-4">
            <InfoCard titulo="Apoyos y resortes" items={["Articulado, rodillo, empotrado", "Resorte vertical (Kv)", "Resorte horizontal (Kh)", "Resorte rotacional (Kr)", "Empotrado-deslizante"]} />
            <InfoCard titulo="Condiciones especiales" items={["Asentamientos prescritos", "Cargas distribuidas en elementos", "Cargas nodales (Fx, Fy, M)", "Cambios de temperatura (ΔT)", "Imperfecciones de longitud"]} />
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
      <span className="inline-block text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{tag}</span>
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
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0"></span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}