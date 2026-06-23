import Sidebar from "../components/Sidebar"

export default function Vigas() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Vigas</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">INTEGRACIÓN DIRECTA</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Doble integración clásica" desc="Integración directa de la ecuación diferencial de la elástica con constantes C1 y C2." tag="Deflexiones" />
            <MetodoCard nombre="Ecuaciones de singularidad" desc="Funciones de Macaulay para cargas discontinuas a lo largo de la viga." tag="Deflexiones" />
            <MetodoCard nombre="Compatibilidad de tramos" desc="C1, C2, C3, C4 por tramo para vigas con condiciones de borde complejas." tag="Deflexiones" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MÉTODOS DE LA FUERZA</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Tres Momentos (Clapeyron)" desc="Análisis de vigas continuas con apoyos simples mediante la ecuación de tres momentos." tag="Fuerzas" />
            <MetodoCard nombre="Método de las fuerzas" desc="Compatibilidad de deformaciones para estructuras hiperestáticas." tag="Fuerzas" />
            <MetodoCard nombre="Trabajo virtual" desc="Principio de trabajos virtuales para cálculo de deflexiones y reacciones." tag="Energía" />
            <MetodoCard nombre="Teorema de Castigliano" desc="Derivada de la energía de deformación respecto a una fuerza generalizada." tag="Energía" />
            <MetodoCard nombre="Trabajo real de deformación" desc="Energía de deformación total almacenada en la viga bajo carga." tag="Energía" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MÉTODOS DE LA DEFORMACIÓN</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Pendiente-Deflexión" desc="Método de Slope-Deflection para vigas continuas e hiperestáticas." tag="Deformación" />
            <MetodoCard nombre="Distribución de momentos (Cross)" desc="Método iterativo de Hardy Cross para vigas continuas con nudos bloqueados." tag="Deformación" />
            <MetodoCard nombre="Método de Kani" desc="Iteración de Kani para vigas continuas sin desplazamiento lateral." tag="Deformación" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CONDICIONES DE APOYO</div>
          <div className="grid grid-cols-2 gap-4">
            <InfoCard titulo="Apoyos disponibles" items={["Articulado (pin)", "Rodillo (roller)", "Empotrado (fixed)", "Empotrado-deslizante", "Resorte vertical (Kv)", "Resorte rotacional (Kr)"]} />
            <InfoCard titulo="Asentamientos" items={["Asentamiento vertical prescrito (δv)", "Rotación prescrita (θ)", "Combinación de asentamientos"]} />
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

function InfoCard({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-sm font-medium text-gray-800 mb-3">{titulo}</div>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}