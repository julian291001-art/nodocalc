"use client"
import { useState, useMemo, useRef } from "react"
import * as XLSX from "xlsx"
import Sidebar from "../../components/Sidebar"
import { conversiones } from "../../lib/conversiones"

// ─────────────────────────────────────────────────────────────────────────────
// UNIDADES (desde app/lib/conversiones.ts)
// ─────────────────────────────────────────────────────────────────────────────
const CAT_LONG = "Longitud"
const CAT_ESF = "Presión / Esfuerzo"

const factorLongitud = (u: string) => conversiones[CAT_LONG].factores[conversiones[CAT_LONG].unidades.indexOf(u)]
const factorEsfuerzo = (u: string) => conversiones[CAT_ESF].factores[conversiones[CAT_ESF].unidades.indexOf(u)]

// Presión atmosférica de referencia ≈ 1 kgf/cm² (González, 1999), tomada del factor ya
// definido en conversiones.ts para no duplicar el valor.
const PA_REF_PA = factorEsfuerzo("kgf/cm²")

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))
const fmt = (x: number | undefined, dec = 2): string =>
  x !== undefined && Number.isFinite(x) ? x.toFixed(dec) : "—"

// ─────────────────────────────────────────────────────────────────────────────
// FACTORES DE CAMPO (η) — Skempton (1986), citados en Bowles (1988)
// ─────────────────────────────────────────────────────────────────────────────
type HammerPresetId = string
const CUSTOM_ID = "custom"

// Tabla 2.5 (1. Variación de ηH) — Braja Das, Fundamentos de Ingeniería Geotécnica
const HAMMER_PRESETS: { id: HammerPresetId; label: string; value: number }[] = [
  { id: "colombia45", label: "Colombia (recomendado — González, 1999) · 45%", value: 45 },
  { id: "jp_toroide_libre", label: "Japón — Toroide, caída libre · 78%", value: 78 },
  { id: "jp_toroide_cuerda", label: "Japón — Toroide, cuerda y polea · 67%", value: 67 },
  { id: "us_seguridad_cuerda", label: "Estados Unidos — De seguridad, cuerda y polea · 60%", value: 60 },
  { id: "us_toroide_cuerda", label: "Estados Unidos — Toroide, cuerda y polea · 45%", value: 45 },
  { id: "ar_toroide_cuerda", label: "Argentina — Toroide, cuerda y polea · 45%", value: 45 },
  { id: "cn_toroide_libre", label: "China — Toroide, caída libre · 60%", value: 60 },
  { id: "cn_toroide_cuerda", label: "China — Toroide, cuerda y polea · 50%", value: 50 },
  { id: CUSTOM_ID, label: "Personalizado (calibrado en campo)", value: NaN },
]

// Tabla 2.5 (2. Variación de ηB) — Braja Das
const DIAMETRO_OPCIONES = [
  { label: "60 – 120 mm (usual)", value: 1.00 },
  { label: "150 mm", value: 1.05 },
  { label: "200 mm", value: 1.15 },
]

// Tabla 2.5 (3. Variación de ηS) — Braja Das
const MUESTREADOR_OPCIONES = [
  { label: "Muestreador estándar", value: 1.00 },
  { label: "Con recubrimiento para arena y arcilla densas", value: 0.80 },
  { label: "Con recubrimiento para arena suelta", value: 0.90 },
]

// Tabla 2.5 (4. Variación de ηR) — Braja Das. Depende de la profundidad, se calcula
// automáticamente por capa (no es un input manual).
function etaRDeLongitud(Lm: number): number {
  if (!Number.isFinite(Lm) || Lm <= 0) return 0.75
  if (Lm <= 4) return 0.75
  if (Lm <= 6) return 0.85
  if (Lm <= 10) return 0.95
  return 1.00
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIÓN POR SOBRECARGA (Cn) — Fig. 2, González (1999)
// ─────────────────────────────────────────────────────────────────────────────
type CnId = "peck" | "seed" | "meyerhofIshihara" | "liaoWhitman" | "skempton" | "seedIdriss" | "gonzalez" | "schmertmann"

const CN_FORMULAS: { id: CnId; nombre: string; formula: (Rs: number) => number }[] = [
  { id: "peck", nombre: "Peck", formula: Rs => Math.log10(20 / Rs) / Math.log10(20) },
  { id: "seed", nombre: "Seed", formula: Rs => 1 - 1.25 * Math.log10(Rs) },
  { id: "meyerhofIshihara", nombre: "Meyerhof–Ishihara", formula: Rs => 1.7 / (0.7 + Rs) },
  { id: "liaoWhitman", nombre: "Liao–Whitman", formula: Rs => Math.sqrt(1 / Rs) },
  { id: "skempton", nombre: "Skempton", formula: Rs => 2 / (1 + Rs) },
  {
    id: "seedIdriss", nombre: "Seed–Idriss (Marcuson)",
    formula: Rs => { const K = Rs < 1 ? 1.41 : 0.92; return 1 - K * Math.log10(Rs) },
  },
  { id: "gonzalez", nombre: "González (logaritmo)", formula: Rs => Math.log10(10 / Rs) },
  { id: "schmertmann", nombre: "Schmertmann", formula: Rs => 32.5 / (10.2 + 20.3 * Rs) },
]

function calcularCn(id: CnId, Rs: number): number {
  const f = CN_FORMULAS.find(c => c.id === id)!
  return clamp(f.formula(Rs), 0, 2)
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRELACIONES N1)45 → φ'eq (Tabla 8a-8f, ajustadas a e=45% — González, 1999)
// ─────────────────────────────────────────────────────────────────────────────
function correlacionesPhiEq(N145: number) {
  if (!Number.isFinite(N145) || N145 < 0) return null
  const peck = 28.5 + 0.25 * N145
  const peckHT = 26.25 * (2 - Math.exp(-N145 / 62))
  const kishida = 15 + Math.sqrt(12.5 * N145)
  const schmertmann = Math.atan(Math.pow(N145 / 43.3, 0.34)) * (180 / Math.PI)
  const jnr = 27 + 0.1875 * N145
  const jrb = 15 + Math.sqrt(9.375 * N145)
  const promedio = (peck + peckHT + kishida + schmertmann + jnr + jrb) / 6
  return { peck, peckHT, kishida, schmertmann, jnr, jrb, promedio }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRELACIONES GENERALES N60 / N1)60 → Dr, φ, Cu, Es (literatura estándar,
// p.ej. Braja Das — Principles of Geotechnical Engineering)
// ─────────────────────────────────────────────────────────────────────────────
function claseDensidad(N160: number): { clase: string; dr: string } {
  if (N160 < 4) return { clase: "Muy suelta", dr: "< 15%" }
  if (N160 < 10) return { clase: "Suelta", dr: "15 – 35%" }
  if (N160 < 30) return { clase: "Media", dr: "35 – 65%" }
  if (N160 < 50) return { clase: "Densa", dr: "65 – 85%" }
  return { clase: "Muy densa", dr: "> 85%" }
}

function claseConsistencia(N60: number): { clase: string; cu: string } {
  if (N60 < 2) return { clase: "Muy blanda", cu: "< 12 kPa" }
  if (N60 < 4) return { clase: "Blanda", cu: "12 – 25 kPa" }
  if (N60 < 8) return { clase: "Media", cu: "25 – 50 kPa" }
  if (N60 < 15) return { clase: "Firme", cu: "50 – 100 kPa" }
  if (N60 < 30) return { clase: "Muy firme", cu: "100 – 200 kPa" }
  return { clase: "Dura", cu: "> 200 kPa" }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGRESIÓN LINEAL τ vs σ' (por nombre de capa), forzando c'≥0 (González, 1999, paso j)
// ─────────────────────────────────────────────────────────────────────────────
type PuntoTauSigma = { sigmaKPa: number; tauKPa: number }

function regresion(puntos: PuntoTauSigma[]): { cPrima: number; tanPhi: number; phiPrima: number } | null {
  const n = puntos.length
  if (n === 0) return null
  if (n === 1) {
    const p = puntos[0]
    const tanPhi = p.sigmaKPa > 0 ? p.tauKPa / p.sigmaKPa : 0
    return { cPrima: 0, tanPhi, phiPrima: Math.atan(tanPhi) * (180 / Math.PI) }
  }
  const sumX = puntos.reduce((s, p) => s + p.sigmaKPa, 0)
  const sumY = puntos.reduce((s, p) => s + p.tauKPa, 0)
  const sumXY = puntos.reduce((s, p) => s + p.sigmaKPa * p.tauKPa, 0)
  const sumXX = puntos.reduce((s, p) => s + p.sigmaKPa * p.sigmaKPa, 0)
  const den = n * sumXX - sumX * sumX
  let slope = den !== 0 ? (n * sumXY - sumX * sumY) / den : 0
  let intercept = (sumY - slope * sumX) / n
  if (intercept < 0) {
    slope = sumXX !== 0 ? sumXY / sumXX : 0
    intercept = 0
  }
  return { cPrima: intercept, tanPhi: slope, phiPrima: Math.atan(slope) * (180 / Math.PI) }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE CAPA Y CÁLCULO POR CAPA
// ─────────────────────────────────────────────────────────────────────────────
type TipoSuelo = "granular" | "cohesivo" | "intermedio"
const TIPO_SUELO_OPCIONES: { label: string; value: TipoSuelo }[] = [
  { label: "Intermedio / sin definir", value: "intermedio" },
  { label: "Granular (c' ≈ 0)", value: "granular" },
  { label: "Cohesivo", value: "cohesivo" },
]

type Capa = { id: string; nombre: string; espesor: string; N: string; sigma: string; tipo: TipoSuelo }

type CapaCalculada = {
  capa: Capa
  profundidadMediaM: number
  etaH: number
  etaB: number
  etaS: number
  etaR: number
  Ncorr: number
  N60: number
  N45: number
  sigmaPa: number
  Rs: number
  Cn: number
  N160: number
  N145: number
  phiEq: ReturnType<typeof correlacionesPhiEq>
  densidad: { clase: string; dr: string }
  consistencia: { clase: string; cu: string }
  wolff: number
  hatanakaUchida: number
  cuHara: number
  esArenas: number
  esArcillas: number
} | null

function calcularCapa(
  capa: Capa, profundidadMediaM: number,
  etaH: number, etaB: number, etaS: number,
  cnId: CnId, unidadEsfuerzo: string,
): CapaCalculada {
  const N = parseFloat(capa.N)
  const sigma = parseFloat(capa.sigma)
  if (!Number.isFinite(N) || N <= 0 || !Number.isFinite(sigma) || sigma <= 0 || !Number.isFinite(etaH) || etaH <= 0) return null

  const etaR = etaRDeLongitud(profundidadMediaM)
  const Ncorr = N * etaB * etaS * etaR
  const N60 = Ncorr * (etaH / 60)
  const N45 = Ncorr * (etaH / 45)
  const sigmaPa = sigma * factorEsfuerzo(unidadEsfuerzo)
  const Rs = sigmaPa / PA_REF_PA
  const Cn = calcularCn(cnId, Rs)
  const N160 = clamp(Cn * N60, 0, N60 * 2)
  const N145 = clamp(Cn * N45, 0, N45 * 2)
  const phiEq = correlacionesPhiEq(N145)

  return {
    capa, profundidadMediaM, etaH, etaB, etaS, etaR, Ncorr, N60, N45, sigmaPa, Rs, Cn, N160, N145, phiEq,
    densidad: claseDensidad(N160),
    consistencia: claseConsistencia(N60),
    wolff: 27.1 + 0.3 * N160 - 0.00054 * N160 * N160,
    hatanakaUchida: Math.sqrt(20 * N160) + 20,
    cuHara: 29 * Math.pow(N60, 0.72),
    esArenas: N60 + 15,
    esArcillas: 0.3 * (29 * Math.pow(N60, 0.72)),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────
function CampoNum({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="number" step="any" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-300 bg-white rounded-md px-2 py-1.5 text-sm
        focus:outline-none focus:border-blue-500" />
  )
}

function CampoTexto({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-300 bg-white rounded-md px-2 py-1.5 text-sm
        focus:outline-none focus:border-blue-500" />
  )
}

function Selector<T extends string | number>({
  labelHtml, value, onChange, opciones,
}: { labelHtml?: string; value: T; onChange: (v: T) => void; opciones: { label: string; value: T }[] }) {
  return (
    <div>
      {labelHtml && <div className="text-xs text-gray-500 mb-1" dangerouslySetInnerHTML={{ __html: labelHtml }} />}
      <select value={String(value)} onChange={e => {
        const found = opciones.find(o => String(o.value) === e.target.value)
        if (found) onChange(found.value)
      }}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
          focus:outline-none focus:border-blue-400">
        {opciones.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Metric({
  labelHtml, valor, sufijo, color = "gray", nota,
}: { labelHtml: string; valor: string; sufijo?: string; color?: "blue" | "green" | "amber" | "gray"; nota?: string }) {
  const bg = color === "blue" ? "bg-blue-50 border-blue-200"
    : color === "green" ? "bg-green-50 border-green-200"
    : color === "amber" ? "bg-amber-50 border-amber-200"
    : "bg-gray-50 border-gray-200"
  const text = color === "blue" ? "text-blue-800"
    : color === "green" ? "text-green-800"
    : color === "amber" ? "text-amber-800"
    : "text-gray-700"
  return (
    <div className={`rounded-lg p-3 border ${bg}`}>
      <div className="text-xs text-gray-500 mb-0.5" dangerouslySetInnerHTML={{ __html: labelHtml }} />
      <div className={`text-sm font-semibold ${text}`}>
        {valor}{sufijo && <span className="text-xs font-normal text-gray-400 ml-1">{sufijo}</span>}
      </div>
      {nota && <div className="text-[10px] text-gray-400 mt-0.5">{nota}</div>}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{children}</th>
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1.5 whitespace-nowrap ${className ?? ""}`}>{children}</td>
}

// ─────────────────────────────────────────────────────────────────────────────
// GRÁFICO τ vs σ' (SVG) — análogo a las Figuras 8a-8d de González (1999)
// ─────────────────────────────────────────────────────────────────────────────
function GraficoTauSigma({
  nombre, puntos, reg,
}: { nombre: string; puntos: PuntoTauSigma[]; reg: { cPrima: number; tanPhi: number; phiPrima: number } }) {
  const w = 380, h = 260
  const padL = 46, padB = 30, padT = 18, padR = 16
  const plotW = w - padL - padR, plotH = h - padT - padB

  const maxX = Math.max(1, ...puntos.map(p => p.sigmaKPa)) * 1.15
  const maxY = Math.max(1, ...puntos.map(p => p.tauKPa), reg.cPrima + reg.tanPhi * maxX) * 1.15

  const sx = (x: number) => padL + (x / maxX) * plotW
  const sy = (y: number) => padT + plotH - (y / maxY) * plotH

  const x1 = 0, y1 = reg.cPrima
  const x2 = maxX, y2 = reg.cPrima + reg.tanPhi * maxX

  return (
    <div>
      <div className="text-xs text-gray-600 font-medium mb-2">{nombre}</div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" className="border border-gray-100 rounded-lg bg-white" style={{ maxHeight: 220 }}>
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#d1d5db" strokeWidth="1" />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#d1d5db" strokeWidth="1" />
        <text x={padL + plotW / 2} y={h - 4} textAnchor="middle" fontSize="9" fill="#6b7280">σ' (kPa)</text>
        <text x={12} y={padT + plotH / 2} textAnchor="middle" fontSize="9" fill="#6b7280" transform={`rotate(-90 12 ${padT + plotH / 2})`}>τ (kPa)</text>
        <line x1={sx(x1)} y1={sy(y1)} x2={sx(x2)} y2={sy(y2)} stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4,3" />
        {puntos.map((p, i) => <circle key={i} cx={sx(p.sigmaKPa)} cy={sy(p.tauKPa)} r="3.5" fill="#1d4ed8" />)}
        <text x={padL + 6} y={padT + 12} fontSize="9" fill="#374151" fontWeight="600">
          c' = {fmt(reg.cPrima, 2)} kPa · φ' = {fmt(reg.phiPrima, 1)}°
        </text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLA / LECTURA DE EXCEL
// ─────────────────────────────────────────────────────────────────────────────
function descargarPlantilla(unidadLongitud: string, unidadEsfuerzo: string) {
  const encabezados = ["Nombre Capa", `Espesor (${unidadLongitud})`, "N (golpes/pie)", `σ'v (${unidadEsfuerzo})`, "Tipo de suelo (granular/cohesivo/intermedio)"]
  const filaEjemplo = ["Limo arenoso", 3, 12, 0.8, "intermedio"]
  const hoja = XLSX.utils.aoa_to_sheet([encabezados, filaEjemplo])
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, "Capas SPT")
  XLSX.writeFile(libro, "plantilla_spt_capas.xlsx")
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function CorreccionSPT() {
  // Unidades
  const [unidadLongitud, setUnidadLongitud] = useState(conversiones[CAT_LONG].unidades[2]) // m
  const [unidadEsfuerzo, setUnidadEsfuerzo] = useState(conversiones[CAT_ESF].unidades[4])  // kgf/cm²

  // Configuración del sondeo (aplica a todas las capas)
  const [hammerPreset, setHammerPreset] = useState<HammerPresetId>("colombia45")
  const [customEtaH, setCustomEtaH] = useState("")
  const [etaB, setEtaB] = useState(1.00)
  const [etaS, setEtaS] = useState(1.00)
  const [cnSeleccionado, setCnSeleccionado] = useState<CnId>("seedIdriss")

  const etaH = hammerPreset === "custom"
    ? (parseFloat(customEtaH) || 0)
    : (HAMMER_PRESETS.find(p => p.id === hammerPreset)?.value ?? 45)

  // Tabla de capas
  const [capas, setCapas] = useState<Capa[]>([])
  const [contadorId, setContadorId] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const agregarCapa = () => {
    setCapas(prev => [...prev, { id: `c${contadorId}`, nombre: "", espesor: "", N: "", sigma: "", tipo: "intermedio" }])
    setContadorId(c => c + 1)
  }
  const quitarCapa = (id: string) => setCapas(prev => prev.filter(c => c.id !== id))
  const actualizarCapa = <K extends keyof Capa>(id: string, campo: K, valor: Capa[K]) => {
    setCapas(prev => prev.map(c => c.id === id ? { ...c, [campo]: valor } : c))
  }

  const subirExcel = (file: File) => {
    const reader = new FileReader()
    reader.onload = evento => {
      const data = new Uint8Array(evento.target?.result as ArrayBuffer)
      const libro = XLSX.read(data, { type: "array" })
      const hoja = libro.Sheets[libro.SheetNames[0]]
      const filas: unknown[][] = XLSX.utils.sheet_to_json(hoja, { header: 1 })
      const nuevas: Capa[] = []
      let idc = contadorId
      // Se salta la primera fila (encabezados) y omite filas vacías
      for (let i = 1; i < filas.length; i++) {
        const fila = filas[i]
        if (!fila || fila.length === 0) continue
        const [nombre, espesor, N, sigma, tipoRaw] = fila
        if (nombre === undefined && espesor === undefined && N === undefined && sigma === undefined) continue
        const tipoTxt = String(tipoRaw ?? "").trim().toLowerCase()
        const tipo: TipoSuelo = tipoTxt.startsWith("gran") ? "granular" : tipoTxt.startsWith("coh") ? "cohesivo" : "intermedio"
        nuevas.push({
          id: `c${idc}`,
          nombre: String(nombre ?? ""),
          espesor: espesor !== undefined ? String(espesor) : "",
          N: N !== undefined ? String(N) : "",
          sigma: sigma !== undefined ? String(sigma) : "",
          tipo,
        })
        idc++
      }
      setCapas(prev => [...prev, ...nuevas])
      setContadorId(idc)
    }
    reader.readAsArrayBuffer(file)
  }

  // Profundidad media de cada capa (acumulando espesores desde la superficie)
  const capasCalculadas = useMemo(() => {
    let acumuladoM = 0
    const resultado: CapaCalculada[] = []
    for (const c of capas) {
      const espesorM = (parseFloat(c.espesor) || 0) * factorLongitud(unidadLongitud)
      const profundidadMediaM = acumuladoM + espesorM / 2
      acumuladoM += espesorM
      resultado.push(calcularCapa(c, profundidadMediaM, etaH, etaB, etaS, cnSeleccionado, unidadEsfuerzo))
    }
    return resultado
  }, [capas, unidadLongitud, unidadEsfuerzo, etaH, etaB, etaS, cnSeleccionado])

  const capasValidas = capasCalculadas.filter((c): c is NonNullable<CapaCalculada> => c !== null)

  // Detalle de una capa seleccionada (breakdown completo de correlaciones)
  const [capaDetalleId, setCapaDetalleId] = useState<string | null>(null)
  const capaDetalle = capasValidas.find(c => c.capa.id === capaDetalleId) ?? capasValidas[0] ?? null

  // Regresión τ vs σ' agrupando por nombre de capa
  const gruposPorNombre = useMemo(() => {
    const grupos: Record<string, { puntos: PuntoTauSigma[]; tieneCohesivo: boolean }> = {}
    for (const c of capasValidas) {
      if (!c.phiEq) continue
      const sigmaKPa = c.sigmaPa / 1000
      const tauKPa = sigmaKPa * Math.tan(c.phiEq.promedio * Math.PI / 180)
      const nombre = c.capa.nombre.trim() || "Sin nombre"
      if (!grupos[nombre]) grupos[nombre] = { puntos: [], tieneCohesivo: false }
      grupos[nombre].puntos.push({ sigmaKPa, tauKPa })
      if (c.capa.tipo === "cohesivo") grupos[nombre].tieneCohesivo = true
    }
    return grupos
  }, [capasValidas])

  const cargarEjemplo = () => {
    setHammerPreset("colombia45")
    setEtaB(1.00); setEtaS(1.00)
    setCnSeleccionado("seedIdriss")
    setCapas([
      { id: "ex1", nombre: "Relleno heterogéneo", espesor: "1.5", N: "8", sigma: "0.3", tipo: "intermedio" },
      { id: "ex2", nombre: "Limo arenoso", espesor: "3", N: "10", sigma: "0.8", tipo: "intermedio" },
      { id: "ex3", nombre: "Limo arenoso", espesor: "3", N: "18", sigma: "1.5", tipo: "intermedio" },
      { id: "ex4", nombre: "Limo arenoso", espesor: "3", N: "24", sigma: "2.1", tipo: "intermedio" },
      { id: "ex5", nombre: "Arena con gravas", espesor: "2.5", N: "30", sigma: "2.7", tipo: "granular" },
      { id: "ex6", nombre: "Arena con gravas", espesor: "2.5", N: "42", sigma: "3.4", tipo: "granular" },
    ])
    setContadorId(6)
  }

  const limpiar = () => {
    setCapas([]); setContadorId(0); setCapaDetalleId(null)
    setHammerPreset("colombia45"); setCustomEtaH("")
    setEtaB(1.00); setEtaS(1.00); setCnSeleccionado("seedIdriss")
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas / Suelos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Corrección SPT</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">

            {/* ── CONFIGURACIÓN DEL SONDEO ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                CONFIGURACIÓN DEL SONDEO (aplica a todas las capas)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Selector labelHtml="Unidad de longitud" value={unidadLongitud} onChange={setUnidadLongitud}
                  opciones={conversiones[CAT_LONG].unidades.map(u => ({ label: u, value: u }))} />
                <Selector labelHtml="Unidad de esfuerzo (σ'ᵥ)" value={unidadEsfuerzo} onChange={setUnidadEsfuerzo}
                  opciones={conversiones[CAT_ESF].unidades.map(u => ({ label: u, value: u }))} />
                <Selector labelHtml="Energía del martillo (η<sub>H</sub>)" value={hammerPreset}
                  onChange={setHammerPreset}
                  opciones={HAMMER_PRESETS.map(p => ({ label: p.label, value: p.id }))} />
                {hammerPreset === "custom" && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">η<sub>H</sub> calibrado (%)</div>
                    <CampoNum value={customEtaH} onChange={setCustomEtaH} placeholder="ej: 65" />
                  </div>
                )}
                <Selector labelHtml="Diámetro de perforación (η<sub>B</sub>)" value={etaB}
                  onChange={setEtaB} opciones={DIAMETRO_OPCIONES} />
                <Selector labelHtml="Muestreador (η<sub>S</sub>)" value={etaS}
                  onChange={setEtaS} opciones={MUESTREADOR_OPCIONES} />
                <Selector labelHtml="Formulación de C<sub>n</sub> (sobrecarga)" value={cnSeleccionado}
                  onChange={setCnSeleccionado}
                  opciones={CN_FORMULAS.map(f => ({ label: f.nombre, value: f.id }))} />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                η<sub>R</sub> (longitud de varilla) se calcula automáticamente por capa, según la
                profundidad media acumulada a partir de los espesores. p<sub>a</sub> = {fmt(PA_REF_PA / 1000, 1)} kPa ≈ 1 kgf/cm².
              </p>
            </div>

            {/* ── TABLA DE CAPAS ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
                <div className="text-xs text-gray-400 font-medium tracking-wider">
                  TABLA DE CAPAS
                </div>
                <div className="flex gap-2">
                  <button onClick={() => descargarPlantilla(unidadLongitud, unidadEsfuerzo)}
                    className="text-xs text-gray-600 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                    Descargar plantilla Excel
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                    Subir Excel
                  </button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) subirExcel(f); e.target.value = "" }} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Escribí las filas directamente o subí un Excel con las mismas columnas de la plantilla:
                Nombre Capa, Espesor, N (golpes/pie) y σ'ᵥ. Los espesores se acumulan desde la superficie
                para estimar la profundidad media de cada capa (usada en η<sub>R</sub>).
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <Th>Nombre capa</Th>
                      <Th>Espesor ({unidadLongitud})</Th>
                      <Th>N (golpes/pie)</Th>
                      <Th>σ'ᵥ ({unidadEsfuerzo})</Th>
                      <Th>Tipo de suelo</Th>
                      <Th> </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {capas.map(c => (
                      <tr key={c.id} className="border-b border-gray-100">
                        <Td><CampoTexto value={c.nombre} onChange={v => actualizarCapa(c.id, "nombre", v)} placeholder="ej: Limo arenoso" /></Td>
                        <Td><CampoNum value={c.espesor} onChange={v => actualizarCapa(c.id, "espesor", v)} placeholder="ej: 3" /></Td>
                        <Td><CampoNum value={c.N} onChange={v => actualizarCapa(c.id, "N", v)} placeholder="ej: 15" /></Td>
                        <Td><CampoNum value={c.sigma} onChange={v => actualizarCapa(c.id, "sigma", v)} placeholder="ej: 1.2" /></Td>
                        <Td>
                          <Selector value={c.tipo} onChange={v => actualizarCapa(c.id, "tipo", v)}
                            opciones={TIPO_SUELO_OPCIONES} />
                        </Td>
                        <Td>
                          <button onClick={() => quitarCapa(c.id)}
                            className="text-xs text-red-500 border border-red-200 rounded-md px-2 py-1 hover:bg-red-50 transition-colors">
                            Quitar
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={agregarCapa}
                className="text-sm text-blue-700 px-4 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors mt-3">
                + Agregar capa
              </button>
            </div>

            {/* ── TABLA DE RESULTADOS ── */}
            {capasValidas.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                  RESULTADOS — CORRECCIÓN POR ENERGÍA Y SOBRECARGA POR CAPA
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1080px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <Th>Capa</Th>
                        <Th>Prof. media</Th>
                        <Th>N</Th>
                        <Th>η<sub>H</sub></Th>
                        <Th>η<sub>B</sub></Th>
                        <Th>η<sub>S</sub></Th>
                        <Th>η<sub>R</sub></Th>
                        <Th>N<sub>60</sub></Th>
                        <Th>N<sub>45</sub></Th>
                        <Th>R<sub>s</sub></Th>
                        <Th>C<sub>n</sub></Th>
                        <Th>N₁)<sub>60</sub></Th>
                        <Th>N₁)<sub>45</sub></Th>
                        <Th>φ'<sub>eq</sub> (prom.)</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {capasValidas.map(c => (
                        <tr key={c.capa.id}
                          className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50/40 ${capaDetalle?.capa.id === c.capa.id ? "bg-blue-50/60" : ""}`}
                          onClick={() => setCapaDetalleId(c.capa.id)}>
                          <Td>{c.capa.nombre.trim() || "Sin nombre"}</Td>
                          <Td>{fmt(c.profundidadMediaM / factorLongitud(unidadLongitud), 2)} {unidadLongitud}</Td>
                          <Td>{fmt(parseFloat(c.capa.N), 0)}</Td>
                          <Td>{fmt(c.etaH, 0)}%</Td>
                          <Td>{fmt(c.etaB, 2)}</Td>
                          <Td>{fmt(c.etaS, 2)}</Td>
                          <Td>{fmt(c.etaR, 2)}</Td>
                          <Td>{fmt(c.N60)}</Td>
                          <Td>{fmt(c.N45)}</Td>
                          <Td>{fmt(c.Rs, 3)}</Td>
                          <Td>{fmt(c.Cn, 3)}</Td>
                          <Td className="font-medium">{fmt(c.N160)}</Td>
                          <Td className="font-medium">{fmt(c.N145)}</Td>
                          <Td className="font-medium">{c.phiEq ? `${fmt(c.phiEq.promedio, 1)}°` : "—"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-3">Clic en una fila para ver el detalle completo abajo.</p>
              </div>
            )}

            {/* ── DETALLE DE CAPA SELECCIONADA ── */}
            {capaDetalle && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                  DETALLE — {capaDetalle.capa.nombre.trim() || "Sin nombre"}
                </div>

                <div className="text-xs text-gray-500 font-medium mb-2">Correlaciones N₁)<sub>45</sub> → φ'<sub>eq</sub> (González, 1999)</div>
                {capaDetalle.phiEq && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                    <Metric labelHtml="Peck" valor={fmt(capaDetalle.phiEq.peck, 1)} sufijo="°" />
                    <Metric labelHtml="Peck, Hanson y Thornburn" valor={fmt(capaDetalle.phiEq.peckHT, 1)} sufijo="°" />
                    <Metric labelHtml="Kishida" valor={fmt(capaDetalle.phiEq.kishida, 1)} sufijo="°" />
                    <Metric labelHtml="Schmertmann" valor={fmt(capaDetalle.phiEq.schmertmann, 1)} sufijo="°" />
                    <Metric labelHtml="JNR" valor={fmt(capaDetalle.phiEq.jnr, 1)} sufijo="°" />
                    <Metric labelHtml="JRB" valor={fmt(capaDetalle.phiEq.jrb, 1)} sufijo="°" />
                    <Metric labelHtml="Promedio" valor={fmt(capaDetalle.phiEq.promedio, 1)} sufijo="°" color="blue" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-2">Suelos granulares</div>
                    <div className="flex flex-col gap-2">
                      <Metric labelHtml="Densidad relativa (por N₁)<sub>60</sub>)"
                        valor={capaDetalle.densidad.clase} sufijo={`D_r ${capaDetalle.densidad.dr}`} />
                      <Metric labelHtml="φ' — Wolff (1989)" valor={fmt(capaDetalle.wolff, 1)} sufijo="°" />
                      <Metric labelHtml="φ' — Hatanaka y Uchida (1996)" valor={fmt(capaDetalle.hatanakaUchida, 1)} sufijo="°" />
                      <Metric labelHtml="Módulo de elasticidad E (arenas)" valor={fmt(capaDetalle.esArenas, 1)} sufijo="MPa"
                        nota="orden de magnitud, Kulhawy & Mayne (1990)" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-2">Suelos cohesivos</div>
                    <div className="flex flex-col gap-2">
                      <Metric labelHtml="Consistencia (por N₆₀)"
                        valor={capaDetalle.consistencia.clase} sufijo={capaDetalle.consistencia.cu} />
                      <Metric labelHtml="C<sub>u</sub> — Hara et al. (1971)" valor={fmt(capaDetalle.cuHara)} sufijo="kPa" />
                      <Metric labelHtml="Módulo de elasticidad E (arcillas)" valor={fmt(capaDetalle.esArcillas, 1)} sufijo="MPa"
                        nota="orden de magnitud, E ≈ 300·Cu" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Correlaciones generales de uso extendido en la práctica geotécnica (Terzaghi & Peck;
                  Braja Das; Kulhawy & Mayne, 1990; Hara et al., 1971) — estimativos iniciales, verificar
                  con ensayos de laboratorio cuando sea posible.
                </p>
              </div>
            )}

            {/* ── REGRESIÓN τ vs σ' POR NOMBRE DE CAPA ── */}
            {Object.keys(gruposPorNombre).length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">
                  REGRESIÓN τ vs σ' POR TIPO DE MATERIAL
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Agrupa las capas con el mismo nombre y obtiene c' y φ' promedio por regresión lineal
                  (forzando c' ≥ 0), igual que la Tabla 1 y las Figuras 8a-8d de González (1999).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.entries(gruposPorNombre).map(([nombre, grupo]) => {
                    const reg = regresion(grupo.puntos)
                    if (!reg) return null
                    const advertencia = grupo.tieneCohesivo && grupo.puntos.length < 2
                    return (
                      <div key={nombre} className="border border-gray-200 rounded-lg p-3">
                        <GraficoTauSigma nombre={nombre} puntos={grupo.puntos} reg={reg} />
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <Metric labelHtml="c'" valor={fmt(reg.cPrima, 2)} sufijo="kPa" color="amber" />
                          <Metric labelHtml="φ'" valor={fmt(reg.phiPrima, 1)} sufijo="°" color="green" />
                          <Metric labelHtml="n puntos" valor={String(grupo.puntos.length)} />
                        </div>
                        {advertencia && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-2 leading-snug">
                            ⚠ c' forzado a 0 por falta de datos (solo 1 punto) — no representativo para
                            un material marcado como cohesivo. Agregá más profundidades de este material
                            o apoyate en C<sub>u</sub> (Hara) del detalle por capa.
                          </p>
                        )}
                        {grupo.tieneCohesivo && !advertencia && (
                          <p className="text-[11px] text-gray-400 mt-2 leading-snug">
                            Material cohesivo — contrastá c' de la regresión con C<sub>u</sub> (Hara) del
                            detalle por capa antes de usarlo en diseño.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── BOTONES ── */}
            <div className="flex gap-3">
              <button onClick={cargarEjemplo}
                className="text-sm text-blue-700 px-4 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                Cargar ejemplo
              </button>
              <button onClick={limpiar}
                className="text-sm text-gray-500 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                Limpiar todo
              </button>
            </div>

            {/* ── NOTA / LIMITACIONES ── */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-600">Limitaciones:</span>{" "}
              El método tiende a ser conservativo y a subestimar c', especialmente en materiales
              cohesivos. Los resultados dependen fuertemente de σ'ᵥ ingresado por capa. Se recomienda
              comprobar con ensayos de laboratorio (corte directo, triaxial) cuando sea posible.
              <br /><br />
              <span className="font-semibold text-gray-600">Fuente:</span>{" "}
              González G., A.J. (1999). "Estimativos de Parámetros Efectivos de Resistencia con el
              SPT". X Jornadas Geotécnicas de la Ingeniería Colombiana, SCI-SCG.
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
