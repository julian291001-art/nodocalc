export default function Geotecnia() {
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 bg-blue-700 text-blue-100">⊡ Geotecnia</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">💧 Hidráulica</div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">🏗 Diseño Estructural</div>
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
          <span className="text-gray-800 font-medium text-base ml-1">Geotecnia</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PROPIEDADES DEL SUELO</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Relaciones de fase" desc="Diagrama de fases, peso específico, relación de vacíos, porosidad, saturación, humedad." metodos={["γ, γd, γsat, γ'", "Relación de vacíos (e)", "Porosidad (n)", "Grado de saturación (Sr)", "Contenido de humedad (w)"]} />
            <SubtemaCard nombre="Clasificación de suelos" desc="Clasificación SUCS y AASHTO, carta de Casagrande, límites de Atterberg." metodos={["Clasificación SUCS", "Clasificación AASHTO", "Carta de Casagrande", "Límites de Atterberg"]} />
            <SubtemaCard nombre="Correcciones SPT" desc="Correcciones por energía, sobrecarga, diámetro y longitud de varillaje." metodos={["Corrección Liao-Whitman", "Corrección Skempton", "Corrección por energía", "Correlaciones SPT → φ, Cu, E, Dr"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">RESISTENCIA Y ESFUERZOS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Resistencia al corte" desc="Criterio de Mohr-Coulomb, círculo de Mohr, ensayos de corte directo y triaxial." metodos={["Mohr-Coulomb", "Círculo de Mohr", "Corte directo (NC y SC)", "Triaxial (UU, CU, CD)"]} />
            <SubtemaCard nombre="Esfuerzos en el suelo" desc="Esfuerzo vertical, presión de poros, esfuerzo efectivo, distribución de cargas." metodos={["Esfuerzo por estratos", "Presión de poros", "Esfuerzo efectivo", "Boussinesq", "Westergaard", "Bulbo de esfuerzos"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CONSOLIDACIÓN Y ASENTAMIENTOS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Consolidación" desc="Consolidación unidimensional de Terzaghi, grado de consolidación, Cv." metodos={["Terzaghi 1D", "Asentamiento primario NC y SC", "Asentamiento secundario", "Grado de consolidación", "Cv por raíz y logaritmo"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PRESIÓN LATERAL Y MUROS</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Presión lateral de tierras" desc="Rankine y Coulomb para presión activa, pasiva y en reposo." metodos={["Rankine activo y pasivo", "Coulomb activo y pasivo", "Presión en reposo (K0)", "Muros de contención", "Muros en suelo blando"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CIMENTACIONES</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SubtemaCard nombre="Cimentaciones superficiales" desc="Capacidad portante por Terzaghi, Meyerhof, Hansen y Vesic. Zapatas y losas." metodos={["Terzaghi", "Meyerhof", "Hansen", "Vesic", "Zapata aislada, corrida, combinada", "Placa de cimentación"]} />
            <SubtemaCard nombre="Cimentaciones profundas" desc="Pilotes en arcilla y arena, capacidad por punta y fuste, grupos de pilotes." metodos={["Método α y λ (arcilla)", "Método β (arena)", "Capacidad por punta y fuste", "Grupos de pilotes", "Eficiencia de grupo"]} />
          </div>

          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESTABILIDAD Y LICUACIÓN</div>
          <div className="grid grid-cols-2 gap-4">
            <SubtemaCard nombre="Estabilidad de taludes" desc="Fellenius, Bishop, Janbu y cartas de Taylor para análisis de estabilidad." metodos={["Talud infinito", "Fellenius", "Bishop simplificado", "Janbu", "Cartas de Taylor"]} />
            <SubtemaCard nombre="Licuación" desc="Método de Seed e Idriss, CSR vs CRR, factor de seguridad a licuación." metodos={["CSR vs CRR", "Factor de seguridad", "Corrección por profundidad", "Corrección por magnitud"]} />
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
          <span key={m} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{m}</span>
        ))}
      </div>
    </div>
  )
}