export default function Precios() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-blue-900 font-medium text-base">◈ NodoCalc</a>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-800">Volver al dashboard</a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Título */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">Elige tu plan</h1>
          <p className="text-gray-500 text-sm">Planes flexibles para estudiantes, profesionales e instituciones. Cancela cuando quieras.</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs text-gray-500">¿Tienes un código de descuento?</span>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="CODIGO" className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-28 focus:outline-none focus:border-blue-400" />
              <button className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">Aplicar</button>
            </div>
          </div>
        </div>

        {/* Planes */}
        <div className="grid grid-cols-4 gap-5 mb-16">

          {/* Gratis */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <div className="mb-6">
              <div className="text-sm font-medium text-gray-500 mb-1">Gratis</div>
              <div className="text-3xl font-semibold text-gray-900">$0</div>
              <div className="text-xs text-gray-400 mt-1">siempre gratis</div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">Para explorar la plataforma y hacer cálculos básicos.</p>
            </div>
            <button className="w-full border border-gray-300 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 mb-6">Registrarse</button>
            <div className="flex flex-col gap-3 flex-1">
              <Feature text="3 módulos disponibles (Estática, Vigas, Armaduras)" />
              <Feature text="Métodos básicos únicamente" />
              <Feature text="Máximo 3 cálculos por día" />
              <Feature text="Resultados en pantalla" />
              <Feature text="1 dispositivo simultáneo" />
              <FeatureNo text="Sin guardar proyectos" />
              <FeatureNo text="Sin exportar PDF" />
              <FeatureNo text="Sin memoria de cálculo" />
            </div>
          </div>

          {/* Básico */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <div className="mb-6">
              <div className="text-sm font-medium text-gray-500 mb-1">Básico</div>
              <div className="text-3xl font-semibold text-gray-900">$30.000</div>
              <div className="text-xs text-gray-400 mt-1">COP / mes</div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">Para estudiantes que necesitan todos los módulos.</p>
            </div>
            <button className="w-full border border-blue-300 text-blue-700 text-sm py-2.5 rounded-lg hover:bg-blue-50 mb-6">Comenzar</button>
            <div className="flex flex-col gap-3 flex-1">
              <Feature text="Todos los módulos disponibles" />
              <Feature text="Cálculos ilimitados" />
              <Feature text="Resultados completos en pantalla" />
              <Feature text="Memoria de cálculo resumida" />
              <Feature text="5 PDFs por mes (resumen)" />
              <Feature text="10 proyectos guardados" />
              <Feature text="1 dispositivo simultáneo" />
              <FeatureNo text="Sin PDF paso a paso completo" />
              <FeatureNo text="Sin exportar Excel" />
            </div>
          </div>

          {/* Pro */}
          <div className="bg-white border-2 border-blue-600 rounded-2xl p-6 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full">Más popular</div>
            <div className="mb-6">
              <div className="text-sm font-medium text-blue-600 mb-1">Pro</div>
              <div className="text-3xl font-semibold text-gray-900">$90.000</div>
              <div className="text-xs text-gray-400 mt-1">COP / mes</div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">Para profesionales que necesitan memorias de cálculo detalladas.</p>
            </div>
            <button className="w-full bg-blue-700 text-white text-sm py-2.5 rounded-lg hover:bg-blue-800 mb-6">Comenzar</button>
            <div className="flex flex-col gap-3 flex-1">
              <Feature text="Todo lo del plan Básico" />
              <Feature text="Memoria de cálculo paso a paso completa" />
              <Feature text="20 PDFs por mes con desarrollo completo" />
              <Feature text="Proyectos ilimitados" />
              <Feature text="Exportar en Excel" />
              <Feature text="Catálogos de perfiles completos" />
              <Feature text="Conexión entre módulos" />
              <Feature text="1 dispositivo simultáneo" />
              <Feature text="Soporte prioritario" />
            </div>
          </div>

          {/* Premium */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <div className="mb-6">
              <div className="text-sm font-medium text-gray-500 mb-1">Premium</div>
              <div className="text-3xl font-semibold text-gray-900">$180.000</div>
              <div className="text-xs text-gray-400 mt-1">COP / mes</div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">Para profesionales que necesitan todo sin límites.</p>
            </div>
            <button className="w-full border border-gray-300 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 mb-6">Comenzar</button>
            <div className="flex flex-col gap-3 flex-1">
              <Feature text="Todo lo del plan Pro" />
              <Feature text="PDFs ilimitados paso a paso en todos los módulos" />
              <Feature text="Logo propio en reportes" />
              <Feature text="Historial completo de cálculos" />
              <Feature text="1 dispositivo simultáneo" />
              <Feature text="Soporte con ingenieros" />
            </div>
          </div>

        </div>

        {/* Institucional */}
        <div className="bg-blue-900 rounded-2xl p-8 flex items-center justify-between">
          <div>
            <div className="text-white font-medium text-lg mb-1">Plan Institucional</div>
            <div className="text-blue-300 text-sm mb-3">Para empresas consultoras y universidades — hasta 10 usuarios</div>
            <div className="flex flex-wrap gap-4">
              {["Todo lo del plan Premium", "Hasta 10 usuarios", "Hasta 3 dispositivos por usuario", "Logo empresa en reportes", "Carpeta compartida", "Soporte dedicado", "Acceso anticipado a nuevos módulos"].map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-blue-200">
                  <span className="text-green-400">✓</span>{f}
                </div>
              ))}
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-8">
            <div className="text-white text-3xl font-semibold">$400.000</div>
            <div className="text-blue-300 text-xs mb-4">COP / mes</div>
            <button className="bg-white text-blue-900 text-sm px-6 py-2.5 rounded-lg hover:bg-blue-50 font-medium">Contactar</button>
          </div>
        </div>

      </div>
    </div>
  )
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-gray-600">
      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
      {text}
    </div>
  )
}

function FeatureNo({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-gray-400">
      <span className="mt-0.5 flex-shrink-0">✗</span>
      {text}
    </div>
  )
}