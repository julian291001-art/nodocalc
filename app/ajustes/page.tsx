"use client"
import { useState } from "react"
import Sidebar from "../components/Sidebar"
import {
  useUnidadesStore, PRESETS, SistemaUnidades,
  UnidadLongitud, UnidadFuerza, UnidadMomento, UnidadEsfuerzo,
  UnidadDesplazamiento, UnidadGiro, UnidadTemperatura,
  UnidadResorte, UnidadResorteRot, UnidadSeccion, UnidadInercia, UnidadModulo,
  UnidadMasa, UnidadDensidad
} from "../store/useUnidadesStore"

const opcionesLongitud: UnidadLongitud[] = ["mm", "cm", "m", "in", "ft"]
const opcionesSeccion: UnidadSeccion[] = ["mm", "cm", "m", "in"]
const opcionesInercia: UnidadInercia[] = ["mm⁴", "cm⁴", "m⁴", "in⁴"]
const opcionesModulo: UnidadModulo[] = ["mm³", "cm³", "m³", "in³"]
const opcionesFuerza: UnidadFuerza[] = ["N", "kN", "kgf", "tf", "lbf", "kip"]
const opcionesMomento: UnidadMomento[] = ["N·m", "kN·m", "kgf·m", "tf·m", "lbf·ft", "kip·ft"]
const opcionesEsfuerzo: UnidadEsfuerzo[] = ["Pa", "kPa", "MPa", "kgf/cm²", "tf/m²", "psi", "ksi"]
const opcionesDesp: UnidadDesplazamiento[] = ["mm", "cm", "m", "in"]
const opcionesGiro: UnidadGiro[] = ["rad", "mrad", "°"]
const opcionesTemp: UnidadTemperatura[] = ["°C", "°F", "K"]
const opcionesResorte: UnidadResorte[] = ["N/m", "kN/m", "kgf/cm", "tf/m", "kip/in"]
const opcionesResorteRot: UnidadResorteRot[] = ["N·m/rad", "kN·m/rad", "kgf·m/rad", "tf·m/rad"]
const opcionesMasa: UnidadMasa[] = ["kg", "t", "lb", "kip"]
const opcionesDensidad: UnidadDensidad[] = ["kg/m³", "kN/m³", "kgf/m³", "lb/ft³"]

export default function Ajustes() {
  const { config, setConfig, aplicarPreset } = useUnidadesStore()
  const [guardado, setGuardado] = useState(false)

  const guardar = () => {
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  const handlePreset = (s: Exclude<SistemaUnidades, "personalizado">) => {
    aplicarPreset(s)
  }

  const upd = (key: string, val: string) => {
    setConfig({ ...config, sistema: "personalizado", [key]: val })
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Cuenta /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Ajustes</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">

            {/* Perfil */}
            <Section titulo="Perfil">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center text-white text-xl font-medium">JL</div>
                <div>
                  <div className="text-sm font-medium text-gray-800">Julián León</div>
                  <div className="text-xs text-gray-500 mt-0.5">julianesteban@ejemplo.com</div>
                  <button className="text-xs text-blue-600 mt-1 hover:underline">Cambiar foto</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Nombre completo" value="Julián Esteban León Flórez" />
                <Campo label="Correo electrónico" value="julianesteban@ejemplo.com" />
                <Campo label="Universidad / Empresa" value="Universidad Distrital FJC" />
                <Campo label="País" value="Colombia" />
              </div>
              <button className="mt-4 text-sm bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">Guardar cambios</button>
            </Section>

            {/* Sistema de unidades */}
            <Section titulo="Sistema de Unidades">
              <div className="text-xs text-gray-500 mb-4">
                Selecciona un preset o personaliza cada categoría. Estas unidades se aplican en todos los módulos y PDFs.
              </div>

              {/* Presets */}
              <div className="flex gap-3 mb-6">
                {(["SI", "metrico", "americano"] as const).map(s => (
                  <button key={s} onClick={() => handlePreset(s)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${config.sistema === s ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                    {s === "SI" ? "SI (kN, m)" : s === "metrico" ? "Métrico (tf, m)" : "Americano (kip, ft)"}
                  </button>
                ))}
                {config.sistema === "personalizado" && (
                  <div className="flex items-center px-3 text-xs text-blue-600 font-medium bg-blue-50 rounded-xl border-2 border-blue-200">
                    Personalizado
                  </div>
                )}
              </div>

              {/* Geometría y secciones */}
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">GEOMETRÍA Y SECCIONES</div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <SelectUnidad label="Longitud de miembros" value={config.longitud} onChange={v => upd("longitud", v)} opciones={opcionesLongitud} />
                <SelectUnidad label="Dimensiones de sección" value={config.seccion} onChange={v => upd("seccion", v)} opciones={opcionesSeccion} />
                <SelectUnidad label="Inercia (Ix, Iy, J)" value={config.inercia} onChange={v => upd("inercia", v)} opciones={opcionesInercia} />
                <SelectUnidad label="Módulo resistente (Sx, Sy)" value={config.modulo_resistente} onChange={v => upd("modulo_resistente", v)} opciones={opcionesModulo} />
              </div>

              {/* Cargas */}
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CARGAS Y ESFUERZOS</div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <SelectUnidad label="Fuerza (P, V, R)" value={config.fuerza} onChange={v => upd("fuerza", v)} opciones={opcionesFuerza} />
                <SelectUnidad label="Momento (M, T)" value={config.momento} onChange={v => upd("momento", v)} opciones={opcionesMomento} />
                <SelectUnidad label="Esfuerzo / Presión (σ, τ, E)" value={config.esfuerzo} onChange={v => upd("esfuerzo", v)} opciones={opcionesEsfuerzo} />
                <SelectUnidad label="Peso específico / Densidad" value={config.densidad} onChange={v => upd("densidad", v)} opciones={opcionesDensidad} />
                <SelectUnidad label="Masa" value={config.masa} onChange={v => upd("masa", v)} opciones={opcionesMasa} />
              </div>

              {/* Resultados */}
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">RESULTADOS</div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <SelectUnidad label="Desplazamiento (δ, u, v)" value={config.desplazamiento} onChange={v => upd("desplazamiento", v)} opciones={opcionesDesp} />
                <SelectUnidad label="Giro (θ, φ)" value={config.giro} onChange={v => upd("giro", v)} opciones={opcionesGiro} />
                <SelectUnidad label="Constante resorte lineal (k)" value={config.resorte_lineal} onChange={v => upd("resorte_lineal", v)} opciones={opcionesResorte} />
                <SelectUnidad label="Constante resorte rotacional (kr)" value={config.resorte_rotacional} onChange={v => upd("resorte_rotacional", v)} opciones={opcionesResorteRot} />
              </div>

              {/* Ambiente */}
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">AMBIENTE</div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <SelectUnidad label="Temperatura (ΔT)" value={config.temperatura} onChange={v => upd("temperatura", v)} opciones={opcionesTemp} />
              </div>

              {/* Resumen activo */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CONFIGURACIÓN ACTIVA</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    ["Longitud", config.longitud],
                    ["Sección", config.seccion],
                    ["Inercia", config.inercia],
                    ["Módulo", config.modulo_resistente],
                    ["Fuerza", config.fuerza],
                    ["Momento", config.momento],
                    ["Esfuerzo", config.esfuerzo],
                    ["Densidad", config.densidad],
                    ["Desplaz.", config.desplazamiento],
                    ["Giro", config.giro],
                    ["Resorte", config.resorte_lineal],
                    ["Temp.", config.temperatura],
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-blue-700">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={guardar}
                className={`w-full text-sm py-2.5 rounded-lg font-medium transition-colors ${guardado ? "bg-green-600 text-white" : "bg-blue-700 text-white hover:bg-blue-800"}`}>
                {guardado ? "✓ Unidades guardadas en todos los módulos" : "Guardar configuración de unidades"}
              </button>
            </Section>

            {/* Plan */}
            <Section titulo="Plan y facturación">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl mb-4">
                <div>
                  <div className="text-sm font-medium text-blue-800">Plan actual: Gratis</div>
                  <div className="text-xs text-blue-600 mt-0.5">3 módulos, 3 cálculos por día, sin PDF</div>
                </div>
                <a href="/precios" className="text-sm bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">Mejorar plan</a>
              </div>
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">Código de descuento</div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Ingresa tu código" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-blue-400" />
                  <button className="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900">Aplicar</button>
                </div>
              </div>
            </Section>

            {/* Seguridad */}
            <Section titulo="Seguridad">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-800">Contraseña</div>
                    <div className="text-xs text-gray-500 mt-0.5">Última actualización hace 30 días</div>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline">Cambiar</button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-800">Sesión activa</div>
                    <div className="text-xs text-gray-500 mt-0.5">MacBook — Bogotá, Colombia</div>
                  </div>
                  <button className="text-xs text-red-500 hover:underline">Cerrar sesión</button>
                </div>
              </div>
            </Section>

            {/* Notificaciones */}
            <Section titulo="Notificaciones">
              <div className="flex flex-col gap-3">
                <Toggle label="Avisos de nuevos módulos" desc="Recibe un correo cuando se lance un nuevo módulo" />
                <Toggle label="Recordatorios de proyectos" desc="Notificaciones sobre proyectos guardados sin terminar" />
                <Toggle label="Novedades y actualizaciones" desc="Boletín mensual con nuevas funciones de NodoCalc" />
              </div>
            </Section>

          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="text-sm font-medium text-gray-800 mb-4">{titulo}</div>
      {children}
    </div>
  )
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <input type="text" defaultValue={value} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
    </div>
  )
}

function SelectUnidad({ label, value, onChange, opciones }: {
  label: string; value: string; onChange: (v: string) => void; opciones: string[]
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
        {opciones.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function Toggle({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <div className="text-sm text-gray-800">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer flex-shrink-0">
        <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
      </div>
    </div>
  )
}