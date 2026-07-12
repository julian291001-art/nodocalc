import Sidebar from "../components/Sidebar"

export default function Herramientas() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Herramientas de apoyo</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">SUELOS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <a href="/herramientas/sucs"><HerramientaCard nombre="Clasificación SUCS" desc="Clasifica el suelo según el Sistema Unificado de Clasificación de Suelos." tag="Suelos" /></a>
            <a href="/herramientas/aashto"><HerramientaCard nombre="Clasificación AASHTO" desc="Clasifica el suelo según el método AASHTO para uso en carreteras." tag="Suelos" /></a>
            <HerramientaCard nombre="Carta de Casagrande" desc="Grafica el suelo en la carta de plasticidad para identificar arcillas y limos." tag="Suelos" />
            <a href="/herramientas/fases"><HerramientaCard nombre="Relaciones de fase" desc="Diagrama de fases interactivo. Ingresa 2 parámetros y calcula todos los demás." tag="Suelos" />
            <HerramientaCard nombre="Correcciones SPT" desc="Aplica correcciones N60, (N1)60 por energía, sobrecarga y diámetro." tag="Suelos" />
          </div>
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">FLUIDOS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <HerramientaCard nombre="Factor de fricción de Darcy" desc="Calcula f por Moody, Colebrook-White y Swamee-Jain dado Re y rugosidad." tag="Fluidos" />
            <HerramientaCard nombre="Propiedades del agua" desc="Densidad, viscosidad, tensión superficial y presión de vapor según temperatura." tag="Fluidos" />
          </div>
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">SECCIONES TRANSVERSALES</div>
            <div className="grid grid-cols-2 gap-4 mb-6">
            <a href="/herramientas/secciones"><HerramientaCard nombre="Section Builder" desc="Diseña secciones personalizadas (I, T, cajón, circular, compuesta) y calcula A, Ix, Iy, Sx, Sy, rx, ry." tag="Secciones" /></a>
            <a href="/herramientas/catalogo-w"><HerramientaCard nombre="Catálogo W (AISC)" desc="Perfiles W4 a W44. Busca por designación o por propiedades mínimas requeridas." tag="Catálogo" /></a>
            <a href="/herramientas/catalogo-ipe"><HerramientaCard nombre="Catálogo IPE (Europa)" desc="Perfiles IPE 80 a IPE 600 con todas sus propiedades geométricas." tag="Catálogo" /></a>
            <a href="/herramientas/catalogo-hea"><HerramientaCard nombre="Catálogo HEA / HEB / HEM" desc="Perfiles de ala ancha europeos con propiedades completas." tag="Catálogo" /></a>
            <a href="/herramientas/catalogo-cl"><HerramientaCard nombre="Catálogo C y L" desc="Perfiles canal (C) y ángulo simple y doble (L) según AISC." tag="Catálogo" /></a>
            <a href="/herramientas/catalogo-hss"><HerramientaCard nombre="Catálogo HSS y CHS" desc="Tubos cuadrados, rectangulares y circulares huecos según AISC." tag="Catálogo" /></a>
            <a href="/herramientas/catalogo-col"><HerramientaCard nombre="Perfiles colombianos" desc="Catálogo de perfiles ACESCO y Diaco disponibles en Colombia." tag="Catálogo" /></a>
        </div>
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CONVERSIONES Y MATERIALES</div>
          <div className="grid grid-cols-2 gap-4">
            <a href="/herramientas/unidades"><HerramientaCard nombre="Conversión de unidades" desc="Convierte entre sistemas SI, métrico y americano para fuerza, longitud, presión y momento." tag="Utilidades" /></a>
            <a href="/herramientas/materiales"><HerramientaCard nombre="Propiedades de materiales" desc="Módulo de elasticidad, resistencia y peso específico para acero, concreto y madera." tag="Utilidades" /></a>
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