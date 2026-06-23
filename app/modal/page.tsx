import Sidebar from "../components/Sidebar"

export default function Modal() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Análisis Modal</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MATRIZ DE RIGIDEZ</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Matriz de rigidez de pórtico plano" desc="Ensamblaje de la matriz de rigidez global de un pórtico plano multinivel por método matricial." tag="Rigidez" />
            <MetodoCard nombre="Matriz de masas" desc="Matriz de masas concentradas y consistentes para pórticos multinivel." tag="Masas" />
          </div>
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ANÁLISIS DE FRECUENCIAS Y MODOS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetodoCard nombre="Frecuencias naturales" desc="Determinación de frecuencias naturales ωi resolviendo el problema de valores propios." tag="Frecuencias" />
            <MetodoCard nombre="Modos de vibración" desc="Vectores propios normalizados para cada modo de vibración de la estructura." tag="Modos" />
            <MetodoCard nombre="Método de la potencia" desc="Iteración para obtener la frecuencia fundamental y el modo dominante." tag="Numérico" />
            <MetodoCard nombre="Método de Jacobi" desc="Rotaciones de Jacobi para obtener todos los valores y vectores propios simultáneamente." tag="Numérico" />
          </div>
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">RESPUESTA DINÁMICA</div>
          <div className="grid grid-cols-2 gap-4">
            <MetodoCard nombre="Superposición modal" desc="Descomposición de la respuesta en contribuciones modales independientes." tag="Respuesta" />
            <MetodoCard nombre="Espectro de diseño modal" desc="Combinación modal CQC y SRSS para respuesta espectral sísmica." tag="Sísmica" />
            <MetodoCard nombre="Participación de masas" desc="Factor de participación modal y masa participativa por modo." tag="Respuesta" />
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
      <span className="inline-block text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full">{tag}</span>
    </div>
  )
}