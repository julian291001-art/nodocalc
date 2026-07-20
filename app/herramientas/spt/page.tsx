"use client"
import { useState, useMemo } from "react"
import Sidebar from "../../components/Sidebar"
import { conversiones } from "../../lib/conversiones"

// ─────────────────────────────────────────────────────────────────────────────
// UNIDADES (desde app/lib/conversiones.ts — mismo patrón que Relaciones de Fase)
// ─────────────────────────────────────────────────────────────────────────────
const CAT_LONG = "Longitud"
const CAT_ESF = "Presión / Esfuerzo"
const CAT_PESOUNIT = "Peso unitario"

const factorLongitud = (u: string) => conversiones[CAT_LONG].factores[conversiones[CAT_LONG].unidades.indexOf(u)]
const factorEsfuerzo = (u: string) => conversiones[CAT_ESF].factores[conversiones[CAT_ESF].unidades.indexOf(u)]
const factorPesoUnitario = (u: string) => conversiones[CAT_PESOUNIT].factores[conversiones[CAT_PESOUNIT].unidades.indexOf(u)]

// Presión atmosférica de referencia ≈ 1 kgf/cm² (González, 1999) — se toma directamente
// del factor ya definido en conversiones.ts para no duplicar el valor.
const PA_REF_PA = factorEsfuerzo("kgf/cm²")
const GAMMA_W_NM3 = 9810 // N/m³ — mismo valor base usado en Relaciones de Fase

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))
const fmt = (x: number | undefined, dec = 2): string =>
  x !== undefined && Number.isFinite(x) ? x.toFixed(dec) : "—"

// ─────────────────────────────────────────────────────────────────────────────
// FACTORES DE CAMPO (η) — Skempton (1986), citados en Bowles (1988)
// ─────────────────────────────────────────────────────────────────────────────
type HammerPresetId = "colombia45" | "donut45" | "safety60" | "auto75" | "custom"

const HAMMER_PRESETS: { id: HammerPresetId; label: string; value: number }[] = [
  { id: "colombia45", label: "Colombia (recomendado — González, 1999) · 45%", value: 45 },
  { id: "donut45", label: 'Martillo "dona" (donut), cuerda y polea · 45%', value: 45 },
  { id: "safety60", label: "Martillo de seguridad, cuerda y polea · 60%", value: 60 },
  { id: "auto75", label: "Martillo automático / trip · 75%", value: 75 },
  { id: "custom", label: "Personalizado (calibrado en campo)", value: NaN },
]

const DIAMETRO_OPCIONES = [
  { label: "60 – 120 mm (usual)", value: 1.00 },
  { label: "150 mm", value: 1.05 },
  { label: "200 mm", value: 1.15 },
]

const MUESTREADOR_OPCIONES = [
  { label: "Estándar, sin revestimiento", value: 1.00 },
  { label: "Con revestimiento — arena densa / arcilla", value: 0.90 },
  { label: "Con revestimiento — arena suelta", value: 0.80 },
]

function etaRDeLongitud(Lm: number): number {
  if (!Number.isFinite(Lm) || Lm <= 0) return 1.0
  if (Lm < 3) return 0.75
  if (Lm < 4) return 0.80
  if (Lm < 6) return 0.85
  if (Lm < 10) return 0.95
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
// REGRESIÓN LINEAL τ vs σ' (por material), forzando c'≥0 (González, 1999, paso j)
// ─────────────────────────────────────────────────────────────────────────────
type PuntoTauSigma = { sigmaKPa: number; tauKPa: number; phiEq: number }

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
    // Se fuerza la regresión a pasar por el origen (c' = 0)
    slope = sumXX !== 0 ? sumXY / sumXX : 0
    intercept = 0
  }
  return { cPrima: intercept, tanPhi: slope, phiPrima: Math.atan(slope) * (180 / Math.PI) }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────
function CampoNum({
  labelHtml, value, onChange, placeholder, sufijo,
}: { labelHtml: string; value: string; onChange: (v: string) => void; placeholder?: string; sufijo?: string }) {
  return (
    <div>
      {labelHtml && <div className="text-xs text-gray-500 mb-1" dangerouslySetInnerHTML={{ __html: labelHtml }} />}
      <div className="relative">
        <input type="number" step="any" value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-blue-300 bg-white rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:border-blue-500 pr-14" />
        {sufijo && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{sufijo}</span>
        )}
      </div>
    </div>
  )
}

function CampoTexto({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-blue-300 bg-white rounded-lg px-3 py-2 text-sm
        focus:outline-none focus:border-blue-500" />
  )
}

function Selector<T extends string | number>({
  labelHtml, value, onChange, opciones,
}: { labelHtml: string; value: T; onChange: (v: T) => void; opciones: { label: string; value: T }[] }) {
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

// ─────────────────────────────────────────────────────────────────────────────
// GRÁFICO τ vs σ' (SVG) — análogo a las Figuras 8a-8d de González (1999)
// ─────────────────────────────────────────────────────────────────────────────
function GraficoTauSigma({
  material, puntos, reg,
}: { material: string; puntos: PuntoTauSigma[]; reg: { cPrima: number; tanPhi: number; phiPrima: number } }) {
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
      <div className="text-xs text-gray-600 font-medium mb-2">{material}</div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" className="border border-gray-100 rounded-lg bg-white" style={{ maxHeight: 220 }}>
        {/* ejes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#d1d5db" strokeWidth="1" />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#d1d5db" strokeWidth="1" />
        <text x={padL + plotW / 2} y={h - 4} textAnchor="middle" fontSize="9" fill="#6b7280">σ' (kPa)</text>
        <text x={12} y={padT + plotH / 2} textAnchor="middle" fontSize="9" fill="#6b7280" transform={`rotate(-90 12 ${padT + plotH / 2})`}>τ (kPa)</text>

        {/* línea de regresión */}
        <line x1={sx(x1)} y1={sy(y1)} x2={sx(x2)} y2={sy(y2)} stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4,3" />

        {/* puntos */}
        {puntos.map((p, i) => (
          <circle key={i} cx={sx(p.sigmaKPa)} cy={sy(p.tauKPa)} r="3.5" fill="#1d4ed8" />
        ))}

        {/* resultado */}
        <text x={padL + 6} y={padT + 12} fontSize="9" fill="#374151" fontWeight="600">
          c' = {fmt(reg.cPrima, 2)} kPa · φ' = {fmt(reg.phiPrima, 1)}°
        </text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function CorreccionSPT() {
  // Unidades globales
  const [unidadLongitud, setUnidadLongitud] = useState(conversiones[CAT_LONG].unidades[2]) // m
  const [unidadEsfuerzo, setUnidadEsfuerzo] = useState(conversiones[CAT_ESF].unidades[4])  // kgf/cm²
  const [unidadPesoUnit, setUnidadPesoUnit] = useState(conversiones[CAT_PESOUNIT].unidades[0]) // kN/m³

  // Datos de campo
  const [nCampo, setNCampo] = useState("")
  const [hammerPreset, setHammerPreset] = useState<HammerPresetId>("colombia45")
  const [customEtaH, setCustomEtaH] = useState("")
  const [longitud, setLongitud] = useState("")
  const [etaB, setEtaB] = useState(1.00)
  const [etaS, setEtaS] = useState(1.00)

  // Esfuerzo vertical efectivo
  const [modoSigma, setModoSigma] = useState<"directo" | "profundidad">("directo")
  const [sigmaDirecto, setSigmaDirecto] = useState("")
  const [profundidad, setProfundidad] = useState("")
  const [gammaTotal, setGammaTotal] = useState("")
  const [nivelFreatico, setNivelFreatico] = useState("")
  const [sinNivelFreatico, setSinNivelFreatico] = useState(true)

  // Corrección por sobrecarga
  const [cnSeleccionado, setCnSeleccionado] = useState<CnId>("seedIdriss")

  const etaH = hammerPreset === "custom"
    ? (parseFloat(customEtaH) || 0)
    : (HAMMER_PRESETS.find(p => p.id === hammerPreset)?.value ?? 45)

  // ── N corregido por factores de campo, normalizado a 60% y 45% de energía ──
  const { Ncorr, N60, N45 } = useMemo(() => {
    const N = parseFloat(nCampo)
    if (!Number.isFinite(N) || N <= 0 || !Number.isFinite(etaH) || etaH <= 0) {
      return { Ncorr: undefined, N60: undefined, N45: undefined }
    }
    const Lm = (parseFloat(longitud) || 0) * factorLongitud(unidadLongitud)
    const etaR = etaRDeLongitud(Lm)
    const Ncorr = N * etaB * etaS * etaR
    return { Ncorr, N60: Ncorr * (etaH / 60), N45: Ncorr * (etaH / 45) }
  }, [nCampo, etaH, longitud, etaB, etaS, unidadLongitud])

  // ── Esfuerzo vertical efectivo (Pa) ──
  const sigmaVPrimePa = useMemo(() => {
    if (modoSigma === "directo") {
      const v = parseFloat(sigmaDirecto)
      if (!Number.isFinite(v) || v <= 0) return undefined
      return v * factorEsfuerzo(unidadEsfuerzo)
    }
    const zm = parseFloat(profundidad) * factorLongitud(unidadLongitud)
    const gamma = parseFloat(gammaTotal)
    if (!Number.isFinite(zm) || zm <= 0 || !Number.isFinite(gamma) || gamma <= 0) return undefined
    const gammaNm3 = gamma * factorPesoUnitario(unidadPesoUnit) * 1000 // kN/m³ → N/m³
    const sigmaTotal = gammaNm3 * zm // Pa
    let u = 0
    if (!sinNivelFreatico) {
      const zwM = parseFloat(nivelFreatico) * factorLongitud(unidadLongitud)
      if (Number.isFinite(zwM) && zm > zwM) u = GAMMA_W_NM3 * (zm - zwM)
    }
    return sigmaTotal - u
  }, [modoSigma, sigmaDirecto, unidadEsfuerzo, profundidad, gammaTotal, unidadPesoUnit, nivelFreatico, sinNivelFreatico, unidadLongitud])

  const Rs = sigmaVPrimePa !== undefined && sigmaVPrimePa > 0 ? sigmaVPrimePa / PA_REF_PA : undefined

  const tablaCn = useMemo(() => {
    if (Rs === undefined) return null
    return CN_FORMULAS.map(f => ({ ...f, valor: clamp(f.formula(Rs), 0, 2) }))
  }, [Rs])

  const cnValor = tablaCn?.find(f => f.id === cnSeleccionado)?.valor

  const N160 = cnValor !== undefined && N60 !== undefined ? clamp(cnValor * N60, 0, N60 * 2) : undefined
  const N145 = cnValor !== undefined && N45 !== undefined ? clamp(cnValor * N45, 0, N45 * 2) : undefined

  const phiEq = N145 !== undefined ? correlacionesPhiEq(N145) : null
  const densidad = N160 !== undefined ? claseDensidad(N160) : null
  const consistencia = N60 !== undefined ? claseConsistencia(N60) : null

  const wolff = N160 !== undefined ? 27.1 + 0.3 * N160 - 0.00054 * N160 * N160 : undefined
  const hatanakaUchida = N160 !== undefined && N160 >= 0 ? Math.sqrt(20 * N160) + 20 : undefined
  const cuHara = N60 !== undefined && N60 > 0 ? 29 * Math.pow(N60, 0.72) : undefined
  const esArenas = N60 !== undefined ? N60 + 15 : undefined
  const esArcillas = cuHara !== undefined ? 0.3 * cuHara : undefined

  // ── Ensayos múltiples para regresión τ vs σ' por material ──
  type Ensayo = { id: string; material: string; N: string; longitud: string; sigma: string }
  const [ensayos, setEnsayos] = useState<Ensayo[]>([])
  const [contadorId, setContadorId] = useState(0)

  const agregarEnsayo = () => {
    setEnsayos(prev => [...prev, { id: `e${contadorId}`, material: "", N: "", longitud: "", sigma: "" }])
    setContadorId(c => c + 1)
  }
  const quitarEnsayo = (id: string) => setEnsayos(prev => prev.filter(e => e.id !== id))
  const actualizarEnsayo = (id: string, campo: keyof Ensayo, valor: string) => {
    setEnsayos(prev => prev.map(e => e.id === id ? { ...e, [campo]: valor } : e))
  }

  const gruposPorMaterial = useMemo(() => {
    if (Rs === undefined) return {}
    const grupos: Record<string, PuntoTauSigma[]> = {}
    for (const e of ensayos) {
      const N = parseFloat(e.N)
      const sigma = parseFloat(e.sigma)
      if (!Number.isFinite(N) || N <= 0 || !Number.isFinite(sigma) || sigma <= 0) continue
      const Lm = (parseFloat(e.longitud) || 0) * factorLongitud(unidadLongitud)
      const etaR = etaRDeLongitud(Lm)
      const NcorrE = N * etaB * etaS * etaR
      const N45E = NcorrE * (etaH / 45)
      const sigmaPa = sigma * factorEsfuerzo(unidadEsfuerzo)
      const RsE = sigmaPa / PA_REF_PA
      const CnE = calcularCn(cnSeleccionado, RsE)
      const N145E = clamp(CnE * N45E, 0, N45E * 2)
      const corr = correlacionesPhiEq(N145E)
      if (!corr) continue
      const sigmaKPa = sigmaPa / 1000
      const tauKPa = sigmaKPa * Math.tan(corr.promedio * Math.PI / 180)
      const nombre = e.material.trim() || "Sin nombre"
      if (!grupos[nombre]) grupos[nombre] = []
      grupos[nombre].push({ sigmaKPa, tauKPa, phiEq: corr.promedio })
    }
    return grupos
  }, [ensayos, unidadLongitud, unidadEsfuerzo, etaB, etaS, etaH, cnSeleccionado, Rs])

  const cargarEjemplo = () => {
    setNCampo("12")
    setHammerPreset("colombia45")
    setLongitud("6")
    setEtaB(1.00)
    setEtaS(1.00)
    setModoSigma("directo")
    setSigmaDirecto("1.2")
    setUnidadEsfuerzo("kgf/cm²")
    setCnSeleccionado("seedIdriss")
    setEnsayos([
      { id: "ex1", material: "Limo arenoso", N: "10", longitud: "3", sigma: "0.8" },
      { id: "ex2", material: "Limo arenoso", N: "18", longitud: "6", sigma: "1.5" },
      { id: "ex3", material: "Limo arenoso", N: "24", longitud: "9", sigma: "2.1" },
      { id: "ex4", material: "Arena con gravas", N: "30", longitud: "5", sigma: "1.3" },
      { id: "ex5", material: "Arena con gravas", N: "42", longitud: "10", sigma: "2.4" },
    ])
    setContadorId(5)
  }

  const limpiar = () => {
    setNCampo(""); setHammerPreset("colombia45"); setCustomEtaH("")
    setLongitud(""); setEtaB(1.00); setEtaS(1.00)
    setModoSigma("directo"); setSigmaDirecto("")
    setProfundidad(""); setGammaTotal("")
    setNivelFreatico(""); setSinNivelFreatico(true)
    setCnSeleccionado("seedIdriss")
    setEnsayos([]); setContadorId(0)
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas / Suelos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Corrección SPT</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* ── UNIDADES ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                SISTEMA DE UNIDADES
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Selector labelHtml="Longitud / profundidad" value={unidadLongitud} onChange={setUnidadLongitud}
                  opciones={conversiones[CAT_LONG].unidades.map(u => ({ label: u, value: u }))} />
                <Selector labelHtml="Esfuerzo / presión" value={unidadEsfuerzo} onChange={setUnidadEsfuerzo}
                  opciones={conversiones[CAT_ESF].unidades.map(u => ({ label: u, value: u }))} />
                <Selector labelHtml="Peso unitario" value={unidadPesoUnit} onChange={setUnidadPesoUnit}
                  opciones={conversiones[CAT_PESOUNIT].unidades.map(u => ({ label: u, value: u }))} />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Internamente todo se resuelve en Pa, N y m (γ<sub>w</sub> = 9810 N/m³,
                p<sub>a</sub> = {fmt(PA_REF_PA, 1)} Pa ≈ 1 kgf/cm²).
              </p>
            </div>

            {/* ── DATOS DE CAMPO ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                DATOS DE CAMPO DEL ENSAYO SPT
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <CampoNum labelHtml="N de campo" value={nCampo} onChange={setNCampo}
                  placeholder="ej: 15" sufijo="golpes/pie" />

                <Selector labelHtml="Energía del martillo (η<sub>H</sub>)" value={hammerPreset}
                  onChange={setHammerPreset}
                  opciones={HAMMER_PRESETS.map(p => ({ label: p.label, value: p.id }))} />

                {hammerPreset === "custom" && (
                  <CampoNum labelHtml="η<sub>H</sub> calibrado" value={customEtaH} onChange={setCustomEtaH}
                    placeholder="ej: 65" sufijo="%" />
                )}

                <CampoNum labelHtml="Longitud de varilla / profundidad del ensayo"
                  value={longitud} onChange={setLongitud} placeholder="ej: 6" sufijo={unidadLongitud} />

                <Selector labelHtml="Diámetro de perforación (η<sub>B</sub>)" value={etaB}
                  onChange={setEtaB} opciones={DIAMETRO_OPCIONES} />

                <Selector labelHtml="Muestreador (η<sub>S</sub>)" value={etaS}
                  onChange={setEtaS} opciones={MUESTREADOR_OPCIONES} />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Factores η<sub>B</sub>, η<sub>S</sub> y η<sub>R</sub> según Skempton (1986), citados en
                Bowles (1988). Para Colombia, salvo calibración específica del equipo, se recomienda
                asumir η<sub>H</sub> = 45% (González, 1999).
              </p>
            </div>

            {/* ── ESFUERZO VERTICAL EFECTIVO ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                ESFUERZO VERTICAL EFECTIVO (σ'ᵥ)
              </div>
              <div className="flex gap-4 mb-4">
                <label className={`flex items-center gap-2 cursor-pointer select-none border rounded-lg px-4 py-2.5
                  ${modoSigma === "directo" ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
                  <input type="radio" checked={modoSigma === "directo"}
                    onChange={() => setModoSigma("directo")} className="w-4 h-4 accent-blue-700" />
                  <span className="text-sm text-gray-700">Ingresar σ'ᵥ directamente</span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer select-none border rounded-lg px-4 py-2.5
                  ${modoSigma === "profundidad" ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
                  <input type="radio" checked={modoSigma === "profundidad"}
                    onChange={() => setModoSigma("profundidad")} className="w-4 h-4 accent-blue-700" />
                  <span className="text-sm text-gray-700">Calcular desde profundidad, γ y nivel freático</span>
                </label>
              </div>

              {modoSigma === "directo" ? (
                <div className="max-w-xs">
                  <CampoNum labelHtml={`σ'ᵥ (${unidadEsfuerzo})`} value={sigmaDirecto} onChange={setSigmaDirecto} placeholder="ej: 1.2" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <CampoNum labelHtml="Profundidad z" value={profundidad} onChange={setProfundidad}
                    placeholder="ej: 6" sufijo={unidadLongitud} />
                  <CampoNum labelHtml={`Peso unitario total γ (${unidadPesoUnit})`}
                    value={gammaTotal} onChange={setGammaTotal} placeholder="ej: 18" />
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none mb-1">
                      <input type="checkbox" checked={sinNivelFreatico}
                        onChange={() => setSinNivelFreatico(!sinNivelFreatico)}
                        className="w-4 h-4 accent-blue-700" />
                      <span className="text-xs text-gray-600">Sin nivel freático (suelo seco)</span>
                    </label>
                    {!sinNivelFreatico && (
                      <CampoNum labelHtml="Profundidad del nivel freático" value={nivelFreatico}
                        onChange={setNivelFreatico} placeholder="ej: 2" sufijo={unidadLongitud} />
                    )}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Cálculo aproximado con γ uniforme sobre toda la columna. Para perfiles estratificados,
                ingresa σ'ᵥ ya calculado directamente.
              </p>
            </div>

            {/* ── CORRECCIÓN POR ENERGÍA ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                CORRECCIÓN POR ENERGÍA
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Metric labelHtml="N campo" valor={fmt(parseFloat(nCampo) || undefined, 0)} sufijo="golpes/pie" />
                <Metric labelHtml="N corregido (η<sub>B</sub>·η<sub>S</sub>·η<sub>R</sub>)" valor={fmt(Ncorr)} color="gray" />
                <Metric labelHtml="N<sub>60</sub>" valor={fmt(N60)} color="blue" nota="normalizado a e = 60%" />
                <Metric labelHtml="N<sub>45</sub>" valor={fmt(N45)} color="blue" nota="normalizado a e = 45% (uso en Colombia)" />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                N<sub>e</sub> = N<sub>corr</sub> × (η<sub>H</sub> / e), según N<sub>e1</sub> = N<sub>e2</sub>×(e2/e1) (González, 1999, ec. 2).
              </p>
            </div>

            {/* ── CORRECCIÓN POR SOBRECARGA ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                CORRECCIÓN POR SOBRECARGA (C<sub>n</sub> en N₁ = C<sub>n</sub>·N)
              </div>

              {Rs === undefined ? (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Ingresa σ'ᵥ arriba para calcular Rs = σ'ᵥ / pₐ y las correcciones por sobrecarga.
                </p>
              ) : (
                <>
                  <div className="text-xs text-gray-500 mb-3">
                    R<sub>s</sub> = σ'ᵥ / pₐ = {fmt(sigmaVPrimePa! / 1000)} kPa / {fmt(PA_REF_PA / 1000)} kPa = <strong>{fmt(Rs, 3)}</strong>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {tablaCn?.map(f => (
                      <label key={f.id}
                        className={`flex items-center justify-between gap-2 cursor-pointer select-none border rounded-lg px-3 py-2
                          ${cnSeleccionado === f.id ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
                        <span className="flex items-center gap-2">
                          <input type="radio" checked={cnSeleccionado === f.id}
                            onChange={() => setCnSeleccionado(f.id)} className="w-4 h-4 accent-blue-700" />
                          <span className="text-sm text-gray-700">{f.nombre}</span>
                        </span>
                        <span className="text-xs font-semibold text-gray-500">Cₙ = {fmt(f.valor, 3)}</span>
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Metric labelHtml="C<sub>n</sub> seleccionado" valor={fmt(cnValor, 3)} color="blue" />
                    <Metric labelHtml="N₁)<sub>60</sub>" valor={fmt(N160)} color="green" />
                    <Metric labelHtml="N₁)<sub>45</sub>" valor={fmt(N145)} color="green" />
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Formulación recomendada por defecto para Colombia: Seed–Idriss (Marcuson), con
                    C<sub>n</sub> ≤ 2.0 (González, 1999, sección 3.1).
                  </p>
                </>
              )}
            </div>

            {/* ── CORRELACIONES N1)45 → φ'eq ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                CORRELACIONES N₁)<sub>45</sub> → φ'<sub>eq</sub> (González, 1999)
              </div>
              {!phiEq ? (
                <p className="text-xs text-gray-400">Completa N de campo y σ'ᵥ para ver las correlaciones.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Metric labelHtml="Peck" valor={fmt(phiEq.peck, 1)} sufijo="°" />
                  <Metric labelHtml="Peck, Hanson y Thornburn" valor={fmt(phiEq.peckHT, 1)} sufijo="°" />
                  <Metric labelHtml="Kishida" valor={fmt(phiEq.kishida, 1)} sufijo="°" />
                  <Metric labelHtml="Schmertmann" valor={fmt(phiEq.schmertmann, 1)} sufijo="°" />
                  <Metric labelHtml="JNR" valor={fmt(phiEq.jnr, 1)} sufijo="°" />
                  <Metric labelHtml="JRB" valor={fmt(phiEq.jrb, 1)} sufijo="°" />
                  <Metric labelHtml="Promedio" valor={fmt(phiEq.promedio, 1)} sufijo="°" color="blue" />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">
                φ'<sub>eq</sub> = arctan(τ/σ'), representativo para materiales granulares o intermedios
                (c' ≈ 0). Menos confiable para suelos cohesivos.
              </p>
            </div>

            {/* ── CORRELACIONES GENERALES ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                CORRELACIONES GENERALES N₆₀ / N₁)₆₀ → φ, D<sub>r</sub>, C<sub>u</sub>, E
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-2">Suelos granulares</div>
                  <div className="flex flex-col gap-2">
                    <Metric labelHtml="Densidad relativa (clasificación por N₁)<sub>60</sub>)"
                      valor={densidad ? densidad.clase : "—"} sufijo={densidad ? `D_r ${densidad.dr}` : ""} />
                    <Metric labelHtml="φ' — Wolff (1989)" valor={fmt(wolff, 1)} sufijo="°" />
                    <Metric labelHtml="φ' — Hatanaka y Uchida (1996)" valor={fmt(hatanakaUchida, 1)} sufijo="°" />
                    <Metric labelHtml="Módulo de elasticidad E (arenas)" valor={fmt(esArenas, 1)} sufijo="MPa"
                      nota="orden de magnitud, Kulhawy & Mayne (1990)" />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-2">Suelos cohesivos</div>
                  <div className="flex flex-col gap-2">
                    <Metric labelHtml="Consistencia (clasificación por N₆₀)"
                      valor={consistencia ? consistencia.clase : "—"} sufijo={consistencia ? consistencia.cu : ""} />
                    <Metric labelHtml="C<sub>u</sub> — Hara et al. (1971)" valor={fmt(cuHara)} sufijo="kPa" />
                    <Metric labelHtml="Módulo de elasticidad E (arcillas)" valor={fmt(esArcillas, 1)} sufijo="MPa"
                      nota="orden de magnitud, E ≈ 300·Cu" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Correlaciones aproximadas de uso extendido en la práctica geotécnica (Terzaghi & Peck;
                Braja Das, Principles of Geotechnical Engineering; Kulhawy & Mayne, 1990; Hara et al., 1971).
                Son estimativos iniciales — deben verificarse con ensayos de laboratorio cuando sea posible.
              </p>
            </div>

            {/* ── REGRESIÓN τ vs σ' POR MATERIAL (múltiples ensayos) ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">
                REGRESIÓN τ vs σ' POR MATERIAL
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Agrupa varios ensayos (N, profundidad y σ'ᵥ) por tipo de material para obtener c' y φ'
                promedio por regresión lineal, igual que la Tabla 1 y las Figuras 8a-8d de González (1999).
                Usa los mismos η<sub>H</sub>, η<sub>B</sub>, η<sub>S</sub> y la formulación de C<sub>n</sub> seleccionados arriba.
              </p>

              <div className="flex flex-col gap-2 mb-4">
                {ensayos.map(e => (
                  <div key={e.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end
                    border border-gray-200 rounded-lg p-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Material</div>
                      <CampoTexto value={e.material} onChange={v => actualizarEnsayo(e.id, "material", v)} placeholder="ej: Limo arenoso" />
                    </div>
                    <CampoNum labelHtml="N" value={e.N} onChange={v => actualizarEnsayo(e.id, "N", v)} placeholder="golpes/pie" />
                    <CampoNum labelHtml={`Long. (${unidadLongitud})`} value={e.longitud} onChange={v => actualizarEnsayo(e.id, "longitud", v)} placeholder="ej: 6" />
                    <CampoNum labelHtml={`σ'ᵥ (${unidadEsfuerzo})`} value={e.sigma} onChange={v => actualizarEnsayo(e.id, "sigma", v)} placeholder="ej: 1.2" />
                    <button onClick={() => quitarEnsayo(e.id)}
                      className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors h-fit">
                      Quitar
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={agregarEnsayo}
                className="text-sm text-blue-700 px-4 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                + Agregar ensayo
              </button>

              {Rs === undefined && ensayos.length > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                  Define σ'ᵥ en la sección de arriba (o cualquier valor válido) para habilitar el cálculo
                  de R<sub>s</sub> y C<sub>n</sub> usados en esta regresión.
                </p>
              )}

              {Object.keys(gruposPorMaterial).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  {Object.entries(gruposPorMaterial).map(([material, puntos]) => {
                    const reg = regresion(puntos)
                    if (!reg) return null
                    return (
                      <div key={material} className="border border-gray-200 rounded-lg p-3">
                        <GraficoTauSigma material={material} puntos={puntos} reg={reg} />
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <Metric labelHtml="c'" valor={fmt(reg.cPrima, 2)} sufijo="kPa" color="amber" />
                          <Metric labelHtml="φ'" valor={fmt(reg.phiPrima, 1)} sufijo="°" color="green" />
                          <Metric labelHtml="n puntos" valor={String(puntos.length)} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── BOTONES ── */}
            <div className="flex gap-3">
              <button onClick={cargarEjemplo}
                className="text-sm text-blue-700 px-4 py-2.5 rounded-lg
                  border border-blue-200 hover:bg-blue-50 transition-colors">
                Cargar ejemplo
              </button>
              <button onClick={limpiar}
                className="text-sm text-gray-500 px-4 py-2.5 rounded-lg
                  border border-gray-300 hover:bg-gray-50 transition-colors">
                Limpiar todo
              </button>
            </div>

            {/* ── NOTA / LIMITACIONES ── */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-600">Limitaciones:</span>{" "}
              El método tiende a ser conservativo y a subestimar c', especialmente en materiales
              cohesivos. Los resultados dependen fuertemente de σ'ᵥ (pesos unitarios, profundidades y
              presión de poros usados). Se recomienda comprobar con ensayos de laboratorio (corte
              directo, triaxial) cuando sea posible.
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
