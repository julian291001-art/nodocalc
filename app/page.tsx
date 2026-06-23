export default function Home() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-56 bg-blue-900 flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-blue-800">
          <div className="text-blue-100 font-medium text-base">◈ NodoCalc</div>
          <div className="text-blue-400 text-xs mt-1">Plataforma de cálculo para ingeniería civil</div>
        </div>
        <div className="p-2 flex-1 overflow-y-auto">
          <div className="text-blue-500 text-xs uppercase tracking-widest px-2 py-2">Principal</div>
          <NavItem icon="⊞" label="Dashboard" active />
          <NavItem icon="📁" label="Mis proyectos" />
          <NavItem icon="🕐" label="Recientes" />
          <div className="text-blue-500 text-xs uppercase tracking-widest px-2 py-2 mt-3">Módulos</div>
          <NavItem icon="⊛" label="Estática" />
          <NavItem icon="━" label="Vigas" />
          <NavItem icon="⬡" label="Pórticos" />
          <NavItem icon="△" label="Armaduras" />
          <NavItem icon="⊞" label="Método Matricial" />
          <NavItem icon="⊟" label="Pandeo" />
          <NavItem icon="〜" label="Dinámica Estructural" />
          <NavItem icon="◎" label="Análisis Modal" />
          <NavItem icon="◈" label="Section Builder" />
          <NavItem icon="▣" label="Building" />
          <NavItem icon="⊡" label="Geotecnia" />
          <NavItem icon="💧" label="Hidráulica" />
          <div className="text-blue-500 text-xs uppercase tracking-widest px-2 py-2 mt-3">Cuenta</div>
          <NavItem icon="⚙" label="Ajustes" />
        </div>
        <div className="p-2 border-t border-blue-800">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-blue-800 cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-blue-100 text-xs font-medium">JL</div>
            <span className="text-blue-300 text-xs">Julián León</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <span className="text-gray-800 font-medium text-base">Dashboard</span>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">Plan Pro</span>
            <button className="flex items-center gap-2 bg-blue-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-800">
              + Nuevo cálculo
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* Estática */}
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">FUNDAMENTOS</div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <ModuleCard color="bg-slate-50" iconColor="text-slate-700" icon="⊛" name="Estática" desc="Vectores, equilibrio 2D y 3D, cables, pares, centroides, momentos de inercia" tag="6 subtemas" />
          </div>

          {/* Estructuras */}
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ANÁLISIS ESTRUCTURAL</div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <a href="/vigas"><ModuleCard color="bg-blue-50" iconColor="text-blue-700" icon="━" name="Vigas" desc="Doble integración, Cross, Tres momentos, Slope-Deflection, Kani, Castigliano" tag="9 métodos" /></a>
            <ModuleCard color="bg-teal-50" iconColor="text-teal-700" icon="⬡" name="Pórticos" desc="Cross, Slope-Deflection, Kani — con y sin desplazamiento lateral" tag="5 métodos" />
            <ModuleCard color="bg-indigo-50" iconColor="text-indigo-700" icon="△" name="Armaduras" desc="Nodos, secciones, Maxwell-Cremona, trabajo virtual, Castigliano" tag="7 métodos" />
          </div>

          {/* Avanzado */}
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ANÁLISIS AVANZADO</div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <ModuleCard color="bg-violet-50" iconColor="text-violet-700" icon="⊞" name="Método Matricial" desc="Vigas, pórticos y armaduras planas y espaciales — casos paramétricos" tag="5 tipos" />
            <ModuleCard color="bg-orange-50" iconColor="text-orange-700" icon="⊟" name="Pandeo" desc="Euler, Johnson, Rankine, excentricidad, pandeo lateral torsional" tag="8 métodos" />
            <ModuleCard color="bg-rose-50" iconColor="text-rose-700" icon="〜" name="Dinámica Estructural" desc="1GDL con/sin amortiguamiento, respuesta sísmica, espectros" tag="5 métodos" />
          </div>

          {/* Herramientas */}
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">HERRAMIENTAS</div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <ModuleCard color="bg-cyan-50" iconColor="text-cyan-700" icon="◎" name="Análisis Modal" desc="Matriz de rigidez, frecuencias, modos, superposición modal" tag="Pórticos multinivel" />
            <ModuleCard color="bg-emerald-50" iconColor="text-emerald-700" icon="◈" name="Section Builder" desc="Propiedades geométricas de secciones — conectado a todos los módulos" tag="I, A, S, Z, r" />
            <ModuleCard color="bg-sky-50" iconColor="text-sky-700" icon="▣" name="Building" desc="Modelado de edificios por niveles, masas y rigideces por piso" tag="Multinivel" />
          </div>

          {/* Geotecnia e Hidráulica */}
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">GEOTECNIA E HIDRÁULICA</div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <ModuleCard color="bg-amber-50" iconColor="text-amber-700" icon="⊡" name="Geotecnia" desc="Relaciones de fase, esfuerzos, consolidación, cimentaciones, taludes" tag="10 subtemas" />
            <ModuleCard color="bg-blue-50" iconColor="text-blue-600" icon="💧" name="Hidráulica" desc="Fluidos, Bernoulli, tuberías, canales, hidrología" tag="7 subtemas" />
          </div>

          {/* Recientes */}
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CÁLCULOS RECIENTES</div>
          <div className="flex flex-col gap-2 mb-6">
            <RecentItem name="Pórtico de 2 pisos — método matricial" time="Hace 2 horas" badge="Pórticos" badgeColor="bg-teal-100 text-teal-800" />
            <RecentItem name="Viga continua 3 tramos — método Cross" time="Ayer" badge="Vigas" badgeColor="bg-blue-100 text-blue-800" />
            <RecentItem name="Análisis espectral — edificio 8 pisos" time="Hace 3 días" badge="Dinámica" badgeColor="bg-rose-100 text-rose-800" />
          </div>

          {/* Stats */}
          <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">RESUMEN</div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Cálculos realizados" value="24" sub="Este mes" />
            <StatCard label="Proyectos activos" value="5" sub="En progreso" />
            <StatCard label="PDFs exportados" value="12" sub="Memorias de cálculo" />
          </div>

        </div>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 ${active ? 'bg-blue-700 text-blue-100' : 'text-blue-300 hover:bg-blue-800'}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function ModuleCard({ color, iconColor, icon, name, desc, tag }: { color: string; iconColor: string; icon: string; name: string; desc: string; tag: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 transition-colors">
      <div className={`w-9 h-9 ${color} ${iconColor} rounded-lg flex items-center justify-center text-lg mb-3`}>{icon}</div>
      <div className="text-sm font-medium text-gray-800 mb-1">{name}</div>
      <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
      <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-medium text-gray-800">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}

function RecentItem({ name, time, badge, badgeColor }: { name: string; time: string; badge: string; badgeColor: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:border-gray-300">
      <div className="flex-1">
        <div className="text-sm text-gray-800">{name}</div>
        <div className="text-xs text-gray-400 mt-0.5">{time}</div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${badgeColor}`}>{badge}</span>
    </div>
  )
}