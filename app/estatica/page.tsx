import Sidebar from "../components/Sidebar"

export default function Estatica() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Estática</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">SELECCIONA UN SUBTEMA</div>
          <div className="grid grid-cols-2 gap-4">
            <a href="/estatica/fundamentos-vectoriales">
                <SubtemaCard icon="⊛" color="bg-slate-50" iconColor="text-slate-700" nombre="Fundamentos vectoriales" desc="Suma y descomposición de fuerzas en 2D y 3D, producto punto y cruz, momento de una fuerza respecto a un punto o eje." metodos={["Fuerzas en 2D y 3D", "Producto punto y cruz", "Momento respecto a punto", "Momento respecto a eje", "Par de fuerzas", "Reducción fuerza-par"]} />
                </a>
                <a href="/estatica/equilibrio-2d">
                <SubtemaCard icon="⊖" color="bg-blue-50" iconColor="text-blue-700" nombre="Equilibrio 2D" desc="Cuerpo rígido en equilibrio plano, diagramas de cuerpo libre, reacciones en apoyos, estructuras compuestas." metodos={["Cuerpo rígido plano", "Diagrama de cuerpo libre", "Reacciones en apoyos", "Estructuras compuestas", "Máquinas"]} />
                </a>
                <a href="/estatica/equilibrio-3d">
                <SubtemaCard icon="◉" color="bg-indigo-50" iconColor="text-indigo-700" nombre="Equilibrio 3D" desc="Equilibrio espacial vectorial, reacciones en apoyos 3D, momentos en el espacio." metodos={["Equilibrio espacial", "Apoyos en 3D", "Momentos en 3D"]} />
                </a>
                <a href="/estatica/cables">
                <SubtemaCard icon="〰" color="bg-cyan-50" iconColor="text-cyan-700" nombre="Cables" desc="Cable con cargas concentradas, distribuidas, catenaria. Tensión máxima y mínima, longitud del cable." metodos={["Cargas concentradas", "Carga distribuida (parábola)", "Catenaria", "Tensión máxima y mínima", "Longitud del cable"]} />
                </a>
                <a href="/estatica/pares-momentos">
                <SubtemaCard icon="⊕" color="bg-violet-50" iconColor="text-violet-700" nombre="Pares y momentos" desc="Par puro, equivalencia de sistemas de pares, momento resultante de un sistema de fuerzas." metodos={["Par puro", "Equivalencia de pares", "Momento resultante"]} />
                </a>
                <a href="/estatica/centroides-inercia">
                <SubtemaCard icon="◎" color="bg-emerald-50" iconColor="text-emerald-700" nombre="Centroides y momentos de inercia" desc="Centroide de áreas, momento de inercia, Steiner, ejes principales, círculo de Mohr para inercia." metodos={["Centroide de áreas", "Momento de inercia Ix, Iy", "Teorema de Steiner", "Ejes principales", "Círculo de Mohr (inercia)", "Radio de giro"]} />
                </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubtemaCard({ icon, color, iconColor, nombre, desc, metodos }: { icon: string; color: string; iconColor: string; nombre: string; desc: string; metodos: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-blue-300 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 ${color} ${iconColor} rounded-lg flex items-center justify-center text-lg`}>{icon}</div>
        <div className="text-sm font-medium text-gray-800">{nombre}</div>
      </div>
      <div className="text-xs text-gray-500 leading-relaxed mb-3">{desc}</div>
      <div className="flex flex-wrap gap-1">
        {metodos.map((m) => (
          <span key={m} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{m}</span>
        ))}
      </div>
    </div>
  )
}