"use client"
import { useState } from "react"
import Sidebar from "../../components/Sidebar"

const materialesBase: Record<string, Material[]> = {
  "Acero": [
    { nombre: "Acero A36", E: 200, G: 77, fy: 250, fu: 400, gamma: 78.5, nu: 0.3, alpha: 12e-6 },
    { nombre: "Acero A572 Gr50", E: 200, G: 77, fy: 345, fu: 450, gamma: 78.5, nu: 0.3, alpha: 12e-6 },
    { nombre: "Acero A992", E: 200, G: 77, fy: 345, fu: 450, gamma: 78.5, nu: 0.3, alpha: 12e-6 },
    { nombre: "Acero inoxidable 304", E: 193, G: 74, fy: 207, fu: 517, gamma: 79.3, nu: 0.3, alpha: 17e-6 },
  ],
  "Concreto": [
    { nombre: "Concreto f'c = 21 MPa", E: 21.5, G: 8.9, fy: null, fu: null, gamma: 24, nu: 0.2, alpha: 10e-6 },
    { nombre: "Concreto f'c = 28 MPa", E: 24.8, G: 10.3, fy: null, fu: null, gamma: 24, nu: 0.2, alpha: 10e-6 },
    { nombre: "Concreto f'c = 35 MPa", E: 27.8, G: 11.6, fy: null, fu: null, gamma: 24, nu: 0.2, alpha: 10e-6 },
    { nombre: "Concreto f'c = 42 MPa", E: 30.4, G: 12.7, fy: null, fu: null, gamma: 24, nu: 0.2, alpha: 10e-6 },
  ],
  "Madera": [
    { nombre: "Pino (paralelo a la fibra)", E: 11, G: 0.69, fy: null, fu: 40, gamma: 5.5, nu: 0.3, alpha: 5e-6 },
    { nombre: "Roble (paralelo a la fibra)", E: 12.5, G: 1.5, fy: null, fu: 50, gamma: 7.5, nu: 0.3, alpha: 5e-6 },
    { nombre: "Eucalipto", E: 14, G: 1.2, fy: null, fu: 55, gamma: 8, nu: 0.3, alpha: 5e-6 },
  ],
  "Aluminio": [
    { nombre: "Aluminio 6061-T6", E: 68.9, G: 26, fy: 276, fu: 310, gamma: 27, nu: 0.33, alpha: 23.6e-6 },
    { nombre: "Aluminio 2024-T3", E: 73.1, G: 28, fy: 345, fu: 483, gamma: 27.7, nu: 0.33, alpha: 23.2e-6 },
  ],
  "Otros": [
    { nombre: "Vidrio", E: 70, G: 28, fy: null, fu: 50, gamma: 25, nu: 0.22, alpha: 9e-6 },
    { nombre: "Caucho", E: 0.01, G: 0.003, fy: null, fu: 15, gamma: 9.5, nu: 0.49, alpha: 220e-6 },
    { nombre: "Cobre", E: 120, G: 45, fy: 70, fu: 220, gamma: 89, nu: 0.34, alpha: 17e-6 },
  ],
}

type Material = {
  nombre: string
  E: number
  G: number
  fy: number | null
  fu: number | null
  gamma: number
  nu: number
  alpha: number
  personalizado?: boolean
}

export default function Materiales() {
  const [categoria, setCategoria] = useState("Acero")
  const [seleccionado, setSeleccionado] = useState<Material | null>(null)
  const [personalizados, setPersonalizados] = useState<Material[]>([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevo, setNuevo] = useState({ nombre: "", E: "", G: "", fy: "", fu: "", gamma: "", nu: "", alpha: "" })

  const materialesCategoria = [
    ...(materialesBase[categoria as keyof typeof materialesBase] || []),
    ...personalizados.filter((m) => m.personalizado),
  ]

  const agregarMaterial = () => {
    if (!nuevo.nombre || !nuevo.E || !nuevo.G || !nuevo.gamma || !nuevo.nu || !nuevo.alpha) return
    const mat: Material = {
      nombre: nuevo.nombre,
      E: parseFloat(nuevo.E),
      G: parseFloat(nuevo.G),
      fy: nuevo.fy ? parseFloat(nuevo.fy) : null,
      fu: nuevo.fu ? parseFloat(nuevo.fu) : null,
      gamma: parseFloat(nuevo.gamma),
      nu: parseFloat(nuevo.nu),
      alpha: parseFloat(nuevo.alpha) * 1e-6,
      personalizado: true,
    }
    setPersonalizados([...personalizados, mat])
    setSeleccionado(mat)
    setMostrarFormulario(false)
    setNuevo({ nombre: "", E: "", G: "", fy: "", fu: "", gamma: "", nu: "", alpha: "" })
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Propiedades de materiales</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">

            {/* Categorías */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CATEGORÍA</div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(materialesBase).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategoria(cat); setSeleccionado(null) }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${categoria === cat ? "bg-blue-700 text-white border-blue-700" : "text-gray-600 border-gray-300 hover:border-blue-300"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de materiales */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-400 font-medium tracking-wider">MATERIALES</div>
                <button
                  onClick={() => setMostrarFormulario(!mostrarFormulario)}
                  className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800"
                >
                  + Material personalizado
                </button>
              </div>

              {/* Formulario material personalizado */}
              {mostrarFormulario && (
                <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-xs text-blue-700 font-medium mb-3">NUEVO MATERIAL</div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500 mb-1">Nombre del material</div>
                      <input type="text" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Ej: Acero especial XYZ" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    </div>
                    <Campo2 label="E (GPa)" placeholder="200" value={nuevo.E} onChange={(v) => setNuevo({ ...nuevo, E: v })} />
                    <Campo2 label="G (GPa)" placeholder="77" value={nuevo.G} onChange={(v) => setNuevo({ ...nuevo, G: v })} />
                    <Campo2 label="ν (Poisson)" placeholder="0.3" value={nuevo.nu} onChange={(v) => setNuevo({ ...nuevo, nu: v })} />
                    <Campo2 label="γ (kN/m³)" placeholder="78.5" value={nuevo.gamma} onChange={(v) => setNuevo({ ...nuevo, gamma: v })} />
                    <Campo2 label="α (×10⁻⁶ /°C)" placeholder="12" value={nuevo.alpha} onChange={(v) => setNuevo({ ...nuevo, alpha: v })} />
                    <Campo2 label="fy (MPa) — opcional" placeholder="250" value={nuevo.fy} onChange={(v) => setNuevo({ ...nuevo, fy: v })} />
                    <Campo2 label="fu (MPa) — opcional" placeholder="400" value={nuevo.fu} onChange={(v) => setNuevo({ ...nuevo, fu: v })} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={agregarMaterial} className="text-xs bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">Agregar material</button>
                    <button onClick={() => setMostrarFormulario(false)} className="text-xs text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100">Cancelar</button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {materialesCategoria.map((mat) => (
                  <div
                    key={mat.nombre}
                    onClick={() => setSeleccionado(mat)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-colors ${seleccionado?.nombre === mat.nombre ? "border-blue-400 bg-blue-50" : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">{mat.nombre}</span>
                      {mat.personalizado && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Personalizado</span>}
                    </div>
                    <span className="text-xs text-gray-400">E = {mat.E} GPa</span>
                  </div>
                ))}
                {personalizados.filter(m => m.personalizado).length === 0 && materialesCategoria.length === materialesBase[categoria as keyof typeof materialesBase]?.length && (
                  <div className="text-xs text-gray-400 text-center py-2">No hay materiales personalizados. Crea uno con el botón de arriba.</div>
                )}
              </div>
            </div>

            {/* Propiedades */}
            {seleccionado && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-4">PROPIEDADES — {seleccionado.nombre}</div>
                <div className="grid grid-cols-2 gap-4">
                  <Propiedad simbolo="E" nombre="Módulo de elasticidad" valor={`${seleccionado.E} GPa`} desc="Módulo de Young" />
                  <Propiedad simbolo="G" nombre="Módulo de corte" valor={`${seleccionado.G} GPa`} desc="Módulo de rigidez" />
                  <Propiedad simbolo="ν" nombre="Módulo de Poisson" valor={`${seleccionado.nu}`} desc="Relación de deformación transversal" />
                  <Propiedad simbolo="γ" nombre="Peso específico" valor={`${seleccionado.gamma} kN/m³`} desc="Peso por unidad de volumen" />
                  <Propiedad simbolo="α" nombre="Coef. de expansión térmica" valor={`${seleccionado.alpha.toExponential(2)} /°C`} desc="Dilatación térmica lineal" />
                  {seleccionado.fy && <Propiedad simbolo="fy" nombre="Resistencia a la fluencia" valor={`${seleccionado.fy} MPa`} desc="Límite elástico" />}
                  {seleccionado.fu && <Propiedad simbolo="fu" nombre="Resistencia última" valor={`${seleccionado.fu} MPa`} desc="Resistencia a la rotura" />}
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-2">Relaciones derivadas</div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
                    <div>E/G = <span className="font-medium">{(seleccionado.E / seleccionado.G).toFixed(2)}</span></div>
                    <div>2(1+ν) = <span className="font-medium">{(2 * (1 + seleccionado.nu)).toFixed(2)}</span></div>
                    <div>ρ = <span className="font-medium">{(seleccionado.gamma / 9.81 * 1000).toFixed(0)} kg/m³</span></div>
                  </div>
                </div>
                <button className="mt-4 text-xs bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">
                  Usar estos valores en un módulo
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

function Campo2({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
    </div>
  )
}

function Propiedad({ simbolo, nombre, valor, desc }: { simbolo: string; nombre: string; valor: string; desc: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-blue-700 font-medium text-sm">{simbolo}</span>
        <span className="text-xs text-gray-500">{nombre}</span>
      </div>
      <div className="text-base font-medium text-gray-800">{valor}</div>
      <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
    </div>
  )
}