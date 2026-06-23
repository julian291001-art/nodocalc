import Sidebar from "../components/Sidebar"

export default function Porticos() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Pórticos</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">SIN DESPLAZAMIENTO LATERAL</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Distribución de momentos (Cross)" desc="Método de Hardy Cross con nudos bloqueados, sin corrimiento de nudos." tag="Cross" />
            <MetodoCard nombre="Pendiente-Deflexión" desc="Slope-Deflection sin término de corrimiento ψ para pórticos intraslacionales." tag="Slope-Deflection" />
            <MetodoCard nombre="Método de Kani" desc="Iteración de Kani para pórticos sin desplazamiento lateral de nudos." tag="Kani" />
          </div>
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CON DESPLAZAMIENTO LATERAL</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Cross con desplazamiento lateral" desc="Dos estados: estructura bloqueada + momentos de corrección por desplazamiento." tag="Cross" />
            <MetodoCard nombre="Pendiente-Deflexión con corrimiento" desc="Slope-Deflection incluyendo el término de corrimiento ψ para pórticos traslacionales." tag="Slope-Deflection" />
          </div>
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MÉTODOS DE ENERGÍA</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Trabajo virtual" desc="Principio de trabajos virtuales para deflexiones y reacciones en pórticos." tag="Energía" />
            <MetodoCard nombre="Teorema de Castigliano" desc="Derivada de la energía de deformación para pórticos hiperestáticos." tag="Energía" />
          </div>
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CONDICIONES DE APOYO</div>
          <div className="grid grid-cols-2 gap-4">
            <InfoCard titulo="Apoyos disponibles" items={["Articulado (pin)", "Rodillo (roller)", "Empotrado (fixed)", "Empotrado-deslizante", "Resorte vertical (Kv)", "Resorte horizontal (Kh)", "Resorte rotacional (Kr)"]} />
            <InfoCard titulo="Asentamientos" items={["Asentamiento vertical prescrito (δv)", "Asentamiento horizontal prescrito (δh)", "Rotación prescrita (θ)", "Combinación de asentamientos"]} />
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
      <span className="inline-block text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{tag}</span>
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
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}