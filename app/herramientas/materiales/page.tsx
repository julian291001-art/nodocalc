"use client"
import { useState } from "react"
import Sidebar from "../../components/Sidebar"

type Material = {
  nombre: string
  E: number
  G: number
  fy: number | null
  fu: number | null
  fc: number | null
  ft: number | null
  gamma: number
  nu: number
  alpha: number
  personalizado?: boolean
}

const materialesBase: Record<string, Material[]> = {
  "Acero": [
    { nombre: "Acero A36", E: 200, G: 77, fy: 250, fu: 400, fc: 250, ft: 250, gamma: 78.5, nu: 0.3, alpha: 12e-6 },
    { nombre: "Acero A572 Gr50", E: 200, G: 77, fy: 345, fu: 450, fc: 345, ft: 345, gamma: 78.5, nu: 0.3, alpha: 12e-6 },
    { nombre: "Acero A992", E: 200, G: 77, fy: 345, fu: 450, fc: 345, ft: 345, gamma: 78.5, nu: 0.3, alpha: 12e-6 },
    { nombre: "Acero inoxidable 304", E: 193, G: 74, fy: 207, fu: 517, fc: 207, ft: 207, gamma: 79.3, nu: 0.3, alpha: 17e-6 },
  ],
  "Concreto": [
    { nombre: "Concreto f'c = 21 MPa", E: 21.5, G: 8.9, fy: null, fu: null, fc: 21, ft: 2.1, gamma: 24, nu: 0.2, alpha: 10e-6 },
    { nombre: "Concreto f'c = 28 MPa", E: 24.8, G: 10.3, fy: null, fu: null, fc: 28, ft: 2.8, gamma: 24, nu: 0.2, alpha: 10e-6 },
    { nombre: "Concreto f'c = 35 MPa", E: 27.8, G: 11.6, fy: null, fu: null, fc: 35, ft: 3.5, gamma: 24, nu: 0.2, alpha: 10e-6 },
    { nombre: "Concreto f'c = 42 MPa", E: 30.4, G: 12.7, fy: null, fu: null, fc: 42, ft: 4.2, gamma: 24, nu: 0.2, alpha: 10e-6 },
  ],
  "Madera": [
    { nombre: "Pino (paralelo a la fibra)", E: 11, G: 0.69, fy: null, fu: 40, fc: 35, ft: 40, gamma: 5.5, nu: 0.3, alpha: 5e-6 },
    { nombre: "Roble (paralelo a la fibra)", E: 12.5, G: 1.5, fy: null, fu: 50, fc: 45, ft: 50, gamma: 7.5, nu: 0.3, alpha: 5e-6 },
    { nombre: "Eucalipto", E: 14, G: 1.2, fy: null, fu: 55, fc: 50, ft: 55, gamma: 8, nu: 0.3, alpha: 5e-6 },
  ],
  "Aluminio": [
    { nombre: "Aluminio 6061-T6", E: 68.9, G: 26, fy: 276, fu: 310, fc: 276, ft: 276, gamma: 27, nu: 0.33, alpha: 23.6e-6 },
    { nombre: "Aluminio 2024-T3", E: 73.1, G: 28, fy: 345, fu: 483, fc: 345, ft: 345, gamma: 27.7, nu: 0.33, alpha: 23.2e-6 },
  ],
  "Otros": [
    { nombre: "Vidrio", E: 70, G: 28, fy: null, fu: 50, fc: 50, ft: 10, gamma: 25, nu: 0.22, alpha: 9e-6 },
    { nombre: "Caucho", E: 0.01, G: 0.003, fy: null, fu: 15, fc: 15, ft: 15, gamma: 9.5, nu: 0.49, alpha: 220e-6 },
    { nombre: "Cobre", E: 120, G: 45, fy: 70, fu: 220, fc: 70, ft: 70, gamma: 89, nu: 0.34, alpha: 17e-6 },
  ],
}

type FormMat = { nombre: string; E: string; G: string; fy: string; fu: string; fc: string; ft: string; gamma: string; nu: string; alpha: string }

const matToForm = (m: Material): FormMat => ({
  nombre: m.nombre,
  E: String(m.E),
  G: String(m.G),
  fy: m.fy ? String(m.fy) : "",
  fu: m.fu ? String(m.fu) : "",
  fc: m.fc ? String(m.fc) : "",
  ft: m.ft ? String(m.ft) : "",
  gamma: String(m.gamma),
  nu: String(m.nu),
  alpha: String(m.alpha * 1e6),
})

const formToMat = (f: FormMat, personalizado = true): Material => ({
  nombre: f.nombre,
  E: parseFloat(f.E),
  G: parseFloat(f.G),
  fy: f.fy ? parseFloat(f.fy) : null,
  fu: f.fu ? parseFloat(f.fu) : null,
  fc: f.fc ? parseFloat(f.fc) : null,
  ft: f.ft ? parseFloat(f.ft) : null,
  gamma: parseFloat(f.gamma),
  nu: parseFloat(f.nu),
  alpha: parseFloat(f.alpha) * 1e-6,
  personalizado,
})

const emptyForm: FormMat = { nombre: "", E: "", G: "", fy: "", fu: "", fc: "", ft: "", gamma: "", nu: "", alpha: "" }

export default function Materiales() {
  const [categoria, setCategoria] = useState("Acero")
  const [seleccionado, setSeleccionado] = useState<Material | null>(null)
  const [personalizados, setPersonalizados] = useState<Material[]>([])
  const [modo, setModo] = useState<"ver" | "nuevo" | "editar">("ver")
  const [form, setForm] = useState<FormMat>(emptyForm)

  const materialesCategoria = [
    ...(materialesBase[categoria] || []),
    ...personalizados,
  ]

  const validar = () => {
    if (!form.nombre || !form.E || !form.G || !form.gamma || !form.nu || !form.alpha) {
      alert("Completa los campos obligatorios: Nombre, E, G, ν, γ y α")
      return false
    }
    return true
  }

  const agregarMaterial = () => {
    if (!validar()) return
    setPersonalizados([...personalizados, formToMat(form)])
    setSeleccionado(formToMat(form))
    setModo("ver")
    setForm(emptyForm)
  }

  const guardarEdicion = () => {
    if (!validar()) return
    if (!seleccionado) return
    const esPersonalizado = seleccionado.personalizado === true
    if (esPersonalizado) {
      setPersonalizados(personalizados.map(m => m.nombre === seleccionado.nombre ? formToMat(form) : m))
      setSeleccionado(formToMat(form))
    } else {
      // Si edita un material base lo guarda como personalizado
      setPersonalizados([...personalizados, formToMat(form, true)])
      setSeleccionado(formToMat(form, true))
    }
    setModo("ver")
  }

  const eliminarPersonalizado = (nombre: string) => {
    setPersonalizados(personalizados.filter(m => m.nombre !== nombre))
    if (seleccionado?.nombre === nombre) setSeleccionado(null)
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
                  <button key={cat} onClick={() => { setCategoria(cat); setSeleccionado(null); setModo("ver") }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${categoria === cat ? "bg-blue-700 text-white border-blue-700" : "text-gray-600 border-gray-300 hover:border-blue-300"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-400 font-medium tracking-wider">MATERIALES</div>
                <button onClick={() => { setModo("nuevo"); setForm(emptyForm); setSeleccionado(null) }}
                  className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">
                  + Material personalizado
                </button>
              </div>

              {/* Formulario nuevo / editar */}
              {(modo === "nuevo" || modo === "editar") && (
                <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-xs text-blue-700 font-medium mb-3">
                    {modo === "nuevo" ? "NUEVO MATERIAL" : `EDITANDO — ${seleccionado?.nombre}`}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500 mb-1">Nombre *</div>
                      <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        placeholder="Ej: Acero especial XYZ"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    </div>
                    <Campo2 label="E (GPa) *" placeholder="200" value={form.E} onChange={(v) => setForm({ ...form, E: v })} />
                    <Campo2 label="G (GPa) *" placeholder="77" value={form.G} onChange={(v) => setForm({ ...form, G: v })} />
                    <Campo2 label="ν (Poisson) *" placeholder="0.3" value={form.nu} onChange={(v) => setForm({ ...form, nu: v })} />
                    <Campo2 label="γ (kN/m³) *" placeholder="78.5" value={form.gamma} onChange={(v) => setForm({ ...form, gamma: v })} />
                    <Campo2 label="α (×10⁻⁶ /°C) *" placeholder="12" value={form.alpha} onChange={(v) => setForm({ ...form, alpha: v })} />
                    <Campo2 label="fy — opcional (MPa)" placeholder="250" value={form.fy} onChange={(v) => setForm({ ...form, fy: v })} />
                    <Campo2 label="fu — opcional (MPa)" placeholder="400" value={form.fu} onChange={(v) => setForm({ ...form, fu: v })} />
                    <Campo2 label="fc máx compresión — opcional (MPa)" placeholder="250" value={form.fc} onChange={(v) => setForm({ ...form, fc: v })} />
                    <Campo2 label="ft máx tensión — opcional (MPa)" placeholder="250" value={form.ft} onChange={(v) => setForm({ ...form, ft: v })} />
                  </div>
                  <div className="text-xs text-gray-400 mb-3">* Campos obligatorios</div>
                  <div className="flex gap-2">
                    <button onClick={modo === "nuevo" ? agregarMaterial : guardarEdicion}
                      className="text-xs bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">
                      {modo === "nuevo" ? "Agregar material" : "Guardar cambios"}
                    </button>
                    <button onClick={() => setModo("ver")}
                      className="text-xs text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {materialesCategoria.map((mat) => (
                  <div key={mat.nombre}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${seleccionado?.nombre === mat.nombre ? "border-blue-400 bg-blue-50" : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"}`}>
                    <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => { setSeleccionado(mat); setModo("ver") }}>
                      <span className="text-sm text-gray-800">{mat.nombre}</span>
                      {mat.personalizado === true && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Personalizado</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">E = {mat.E} GPa</span>
                      <button onClick={() => { setSeleccionado(mat); setForm(matToForm(mat)); setModo("editar") }}
                        className="text-xs text-blue-500 hover:underline">Editar</button>
                      {mat.personalizado === true && (
                        <button onClick={() => eliminarPersonalizado(mat.nombre)}
                          className="text-xs text-red-400 hover:underline">Eliminar</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Propiedades */}
            {seleccionado && modo === "ver" && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">PROPIEDADES — {seleccionado.nombre}</div>
                  <button onClick={() => { setForm(matToForm(seleccionado)); setModo("editar") }}
                    className="text-xs text-blue-600 hover:underline">Editar propiedades</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Propiedad simbolo="E" nombre="Módulo de elasticidad" valor={`${seleccionado.E} GPa`} desc="Módulo de Young" />
                  <Propiedad simbolo="G" nombre="Módulo de corte" valor={`${seleccionado.G} GPa`} desc="Módulo de rigidez" />
                  <Propiedad simbolo="ν" nombre="Módulo de Poisson" valor={`${seleccionado.nu}`} desc="Relación de deformación transversal" />
                  <Propiedad simbolo="γ" nombre="Peso específico" valor={`${seleccionado.gamma} kN/m³`} desc="Peso por unidad de volumen" />
                  <Propiedad simbolo="α" nombre="Coef. expansión térmica" valor={`${seleccionado.alpha.toExponential(2)} /°C`} desc="Dilatación térmica lineal" />
                  {seleccionado.fy && <Propiedad simbolo="fy" nombre="Resistencia a la fluencia" valor={`${seleccionado.fy} MPa`} desc="Límite elástico" />}
                  {seleccionado.fu && <Propiedad simbolo="fu" nombre="Resistencia última" valor={`${seleccionado.fu} MPa`} desc="Resistencia a la rotura" />}
                  {seleccionado.fc && <Propiedad simbolo="fc" nombre="Resistencia máx. compresión" valor={`${seleccionado.fc} MPa`} desc="Esfuerzo máximo a compresión" />}
                  {seleccionado.ft && <Propiedad simbolo="ft" nombre="Resistencia máx. tensión" valor={`${seleccionado.ft} MPa`} desc="Esfuerzo máximo a tensión" />}
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
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
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