export default function Diseno() {
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 bg-blue-700 text-blue-100">🏗 Diseño Estructural</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">🔧 Herramientas</div>
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
          <span className="text-gray-800 font-medium text-base ml-1">Diseño Estructural — Concreto Reforzado</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">VIGAS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Viga simplemente reforzada" desc="Diseño a flexión de sección rectangular con refuerzo en tensión únicamente." metodos={["Diseño por flexión", "Verificación por cortante", "Diseño de estribos", "Deflexiones inmediata y diferida"]} />
            <SubtemaCard nombre="Viga doblemente reforzada" desc="Sección rectangular con refuerzo en tensión y compresión para momentos altos." metodos={["Diseño por flexión", "Acero en compresión", "Verificación por cortante", "Deflexiones"]} />
            <SubtemaCard nombre="Viga sección T" desc="Viga T y T invertida considerando el ancho efectivo del ala según ACI/NSR-10." metodos={["Ancho efectivo del ala", "Diseño por flexión", "Verificación por cortante", "Sección T invertida"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">LOSAS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Losa maciza en una dirección" desc="Diseño de losa con relación de lados mayor a 2, franjas de 1m de ancho." metodos={["Diseño por flexión", "Refuerzo por temperatura", "Verificación por cortante", "Deflexiones"]} />
            <SubtemaCard nombre="Losa aligerada en una dirección" desc="Losa con viguetas y bloques de alivianamiento, diseño de viguetas y losa superior." metodos={["Diseño de viguetas", "Losa superior", "Verificación por cortante", "Deflexiones"]} />
            <SubtemaCard nombre="Losa en dos direcciones" desc="Método directo y coeficientes ACI para losas con relación de lados menor a 2." metodos={["Método directo ACI", "Coeficientes de momento", "Verificación por punzonamiento", "Franjas de columna y central"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">COLUMNAS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Columna con carga axial" desc="Columna con carga axial pura, diseño de refuerzo longitudinal y transversal." metodos={["Carga axial pura", "Refuerzo longitudinal", "Estribos y flejes", "Columna circular y rectangular"]} />
            <SubtemaCard nombre="Columna con flexión uniaxial" desc="Diagrama de interacción P-M para columna con momento en un eje." metodos={["Diagrama P-M completo", "Puntos de control", "Verificación de combinaciones", "Excentricidad mínima"]} />
            <SubtemaCard nombre="Columna con flexión biaxial" desc="Método de Bresler para columnas con momento en los dos ejes simultáneamente." metodos={["Método de Bresler", "Diagrama P-Mx-My", "Verificación biaxial", "Columnas esbeltas"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CIMENTACIONES</div>
          <div className="grid grid-cols-2 gap-4">
            <SubtemaCard nombre="Zapata aislada" desc="Diseño de zapata cuadrada y rectangular por flexión, cortante y punzonamiento." metodos={["Diseño por flexión", "Cortante en una dirección", "Punzonamiento", "Refuerzo por temperatura"]} />
            <SubtemaCard nombre="Zapata combinada" desc="Zapata que soporta dos columnas, diseño como viga invertida." metodos={["Diseño como viga invertida", "Diagrama M y V", "Refuerzo longitudinal y transversal"]} />
            <SubtemaCard nombre="Zapata con momento" desc="Zapata con carga excéntrica, verificación de presiones trapezoidales y triangulares." metodos={["Excentricidad", "Presión trapezoidal", "Presión triangular", "Verificación de volteo"]} />
          </div>

        </div>
      </div>
    </div>
  )
}

function SubtemaCard({ nombre, desc, metodos }: { nombre: string; desc: string; metodos: string[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-blue-300 transition-colors">
      <div className="text-sm font-medium text-gray-800 mb-2">{nombre}</div>
      <div className="text-xs text-gray-500 leading-relaxed mb-3">{desc}</div>
      <div className="flex flex-wrap gap-1">
        {metodos.map((m) => (
          <span key={m} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{m}</span>
        ))}
      </div>
    </div>
  )
}