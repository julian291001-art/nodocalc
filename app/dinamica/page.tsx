import Sidebar from "../components/Sidebar"

export default function Dinamica() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
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
            <MetodoCard nombre="Método de Wilson-θ" desc="Variante incondicionalmente estable del método de Newmark para sistemas no lineales." tag="Numérico" />
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