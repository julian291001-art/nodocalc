export default function Herramientas() {
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
          <a href="/pandeo" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊟ Pandeo</a>
          <a href="/dinamica" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">〜 Dinámica Estructural</a>
          <a href="/modal" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">◎ Análisis Modal</a>
          <a href="/geotecnia" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">⊡ Geotecnia</a>
          <a href="/hidraulica" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">💧 Hidráulica</a>
          <a href="/diseno" className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">🏗 Diseño Estructural</a>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 bg-blue-700 text-blue-100">🔧 Herramientas</div>
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
          <span className="text-gray-800 font-medium text-base ml-1">Herramientas de apoyo</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">SUELOS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <HerramientaCard nombre="Clasificación SUCS" desc="Clasifica el suelo según el Sistema Unificado de Clasificación de Suelos." tag="Suelos" />
            <HerramientaCard nombre="Clasificación AASHTO" desc="Clasifica el suelo según el método AASHTO para uso en carreteras." tag="Suelos" />
            <HerramientaCard nombre="Carta de Casagrande" desc="Grafica el suelo en la carta de plasticidad para identificar arcillas y limos." tag="Suelos" />
            <HerramientaCard nombre="Relaciones de fase" desc="Diagrama de fases interactivo. Ingresa 2 parámetros y calcula todos los demás." tag="Suelos" />
            <HerramientaCard nombre="Correcciones SPT" desc="Aplica correcciones N60, (N1)60 por energía, sobrecarga y diámetro." tag="Suelos" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">FLUIDOS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <HerramientaCard nombre="Factor de fricción de Darcy" desc="Calcula f por Moody, Colebrook-White y Swamee-Jain dado Re y rugosidad." tag="Fluidos" />
            <HerramientaCard nombre="Propiedades del agua" desc="Densidad, viscosidad, tensión superficial y presión de vapor según temperatura." tag="Fluidos" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">SECCIONES TRANSVERSALES</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <HerramientaCard nombre="Section Builder" desc="Diseña secciones personalizadas (I, T, cajón, circular, compuesta) y calcula A, Ix, Iy, Sx, Sy, rx, ry." tag="Secciones" />
            <HerramientaCard nombre="Catálogo W (AISC)" desc="Perfiles W4 a W44. Busca por designación o por propiedades mínimas requeridas." tag="Catálogo" />
            <HerramientaCard nombre="Catálogo IPE (Europa)" desc="Perfiles IPE 80 a IPE 600 con todas sus propiedades geométricas." tag="Catálogo" />
            <HerramientaCard nombre="Catálogo HEA / HEB / HEM" desc="Perfiles de ala ancha europeos con propiedades completas." tag="Catálogo" />
            <HerramientaCard nombre="Catálogo C y L" desc="Perfiles canal (C) y ángulo simple y doble (L) según AISC." tag="Catálogo" />
            <HerramientaCard nombre="Catálogo HSS y CHS" desc="Tubos cuadrados, rectangulares y circulares huecos según AISC." tag="Catálogo" />
            <HerramientaCard nombre="Perfiles colombianos" desc="Catálogo de perfiles ACESCO y Diaco disponibles en Colombia." tag="Catálogo" />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CONVERSIONES Y MATERIALES</div>
          <div className="grid grid-cols-2 gap-4">
            <HerramientaCard nombre="Conversión de unidades" desc="Convierte entre sistemas SI, métrico y americano para fuerza, longitud, presión y momento." tag="Utilidades" />
            <HerramientaCard nombre="Propiedades de materiales" desc="Módulo de elasticidad, resistencia y peso específico para acero, concreto y madera." tag="Utilidades" />
          </div>

        </div>
      </div>
    </div>
  )
}

function HerramientaCard({ nombre, desc, tag }: { nombre: string; desc: string; tag: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-blue-300 transition-colors">
      <div className="text-sm font-medium text-gray-800 mb-2">{nombre}</div>
      <div className="text-xs text-gray-500 leading-relaxed mb-3">{desc}</div>
      <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
    </div>
  )
}