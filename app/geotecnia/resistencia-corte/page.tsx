"use client"

import { useMemo, useState } from "react"
import * as XLSX from "xlsx"
import Sidebar from "../../components/Sidebar"
import { conversiones } from "../../lib/conversiones"

// ---------------------------------------------------------------------------
// Utilidades de conversión (categoría "Presión / Esfuerzo", base Pa)
// ---------------------------------------------------------------------------
const CATEGORIA_ESFUERZO = "Presión / Esfuerzo"

function factorUnidad(unidad: string): number {
  const cat = conversiones[CATEGORIA_ESFUERZO]
  const idx = cat.unidades.indexOf(unidad)
  return idx >= 0 ? cat.factores[idx] : 1
}

function aBase(valor: number, unidad: string): number {
  return valor * factorUnidad(unidad)
}

function aMostrar(valorBase: number, unidad: string): number {
  return valorBase / factorUnidad(unidad)
}

function fmt(n: number, dec = 2): string {
  if (!isFinite(n)) return "—"
  return n.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

// Fábrica genérica de conversores para cualquier categoría de conversiones.ts
function crearConversor(categoria: string) {
  return {
    aBase: (valor: number, unidad: string): number => {
      const cat = conversiones[categoria]
      const idx = cat.unidades.indexOf(unidad)
      return (valor || 0) * (idx >= 0 ? cat.factores[idx] : 1)
    },
    aMostrar: (valorBase: number, unidad: string): number => {
      const cat = conversiones[categoria]
      const idx = cat.unidades.indexOf(unidad)
      return valorBase / (idx >= 0 ? cat.factores[idx] : 1)
    },
    unidades: conversiones[categoria].unidades,
  }
}

const convLongitud = crearConversor("Longitud")
const convMasa = crearConversor("Masa")
const convFuerza = crearConversor("Fuerza")
const convEsfuerzo = crearConversor("Presión / Esfuerzo")
const GRAVEDAD = 9.81 // m/s²

const PALETA_MUESTRAS = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2", "#ca8a04", "#db2777"]

function regresionLineal(puntos: { x: number; y: number }[]) {
  const n = puntos.length
  if (n < 2) return { pendiente: 0, intercepto: 0, r2: 0 }
  const sumX = puntos.reduce((a, p) => a + p.x, 0)
  const sumY = puntos.reduce((a, p) => a + p.y, 0)
  const sumXY = puntos.reduce((a, p) => a + p.x * p.y, 0)
  const sumX2 = puntos.reduce((a, p) => a + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  const pendiente = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0
  const intercepto = (sumY - pendiente * sumX) / n
  const meanY = sumY / n
  const ssTot = puntos.reduce((a, p) => a + (p.y - meanY) ** 2, 0)
  const ssRes = puntos.reduce((a, p) => a + (p.y - (pendiente * p.x + intercepto)) ** 2, 0)
  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 1
  return { pendiente, intercepto, r2 }
}

// ---------------------------------------------------------------------------
// Componentes UI compartidos
// ---------------------------------------------------------------------------
type Color = "blue" | "green" | "amber" | "gray"

const tileClasses: Record<Color, string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  green: "bg-green-50 border-green-200 text-green-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  gray: "bg-gray-50 border-gray-200 text-gray-700",
}

function MetricTile({
  label,
  value,
  unit,
  color = "blue",
}: {
  label: string
  value: string
  unit?: string
  color?: Color
}) {
  return (
    <div className={`rounded-xl border p-4 ${tileClasses[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal opacity-70">{unit}</span> : null}
      </p>
    </div>
  )
}

function UnidadSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
    >
      {conversiones[CATEGORIA_ESFUERZO].unidades.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  step = "any",
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:outline-none"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// PESTAÑA 1: Mohr-Coulomb
// ---------------------------------------------------------------------------
function TabMohrCoulomb() {
  const [unidad, setUnidad] = useState("kPa")
  const [c, setC] = useState(10)
  const [phi, setPhi] = useState(28)
  const [sigma, setSigma] = useState(100)

  const r = useMemo(() => {
    const cBase = aBase(c || 0, unidad)
    const phiRad = ((phi || 0) * Math.PI) / 180
    const sigmaBase = aBase(sigma || 0, unidad)
    const tauBase = cBase + sigmaBase * Math.tan(phiRad)
    return { cBase, phiRad, sigmaBase, tauBase }
  }, [c, phi, sigma, unidad])

  const tauMostrado = aMostrar(r.tauBase, unidad)

  // --- gráfico envolvente ---
  const W = 340,
    H = 230,
    ML = 55,
    MB = 32,
    MT = 15,
    MR = 15
  const plotW = W - ML - MR
  const plotH = H - MB - MT

  const xMaxBase = Math.max(r.sigmaBase * 1.4, r.cBase * 2, 1)
  const yAtXMax = r.cBase + xMaxBase * Math.tan(r.phiRad)
  const yMaxBase = Math.max(yAtXMax, r.tauBase, r.cBase) * 1.15 || 1

  const toX = (s: number) => ML + (s / xMaxBase) * plotW
  const toY = (t: number) => H - MB - (t / yMaxBase) * plotH

  const envY0 = toY(r.cBase)
  const envY1 = toY(r.cBase + xMaxBase * Math.tan(r.phiRad))
  const px = toX(r.sigmaBase)
  const py = toY(r.tauBase)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Parámetros de entrada</h3>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">Unidad de esfuerzo</label>
          <UnidadSelector value={unidad} onChange={setUnidad} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberInput label={`Cohesión efectiva, c' (${unidad})`} value={c} onChange={setC} />
          <NumberInput label="Ángulo de fricción efectivo, φ' (°)" value={phi} onChange={setPhi} />
          <NumberInput
            label={`Esfuerzo normal efectivo, σ' (${unidad})`}
            value={sigma}
            onChange={setSigma}
          />
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Criterio de falla: <span className="font-mono">τ = c' + σ'·tan(φ')</span>
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetricTile
            label="Resistencia al corte τ"
            value={fmt(tauMostrado)}
            unit={unidad}
            color="blue"
          />
          <MetricTile label="tan(φ')" value={fmt(Math.tan(r.phiRad), 4)} color="gray" />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Envolvente de falla</h3>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* ejes */}
          <line x1={ML} y1={H - MB} x2={W - MR} y2={H - MB} stroke="#9ca3af" strokeWidth={1} />
          <line x1={ML} y1={H - MB} x2={ML} y2={MT} stroke="#9ca3af" strokeWidth={1} />
          <text x={ML + plotW / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="#6b7280">
            σ' ({unidad})
          </text>
          <text x={ML - 8} y={MT + 4} textAnchor="end" fontSize="9" fill="#6b7280">
            τ ({unidad})
          </text>

          {/* envolvente */}
          <line
            x1={toX(0)}
            y1={envY0}
            x2={toX(xMaxBase)}
            y2={envY1}
            stroke="#2563eb"
            strokeWidth={2}
          />

          {/* guías punteadas hasta el punto */}
          <line x1={px} y1={H - MB} x2={px} y2={py} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" />
          <line x1={ML} y1={py} x2={px} y2={py} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" />

          {/* punto (σ', τ) */}
          <circle cx={px} cy={py} r={4.5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />

          {/* etiquetas de ejes numéricas */}
          <text x={ML} y={H - MB + 18} textAnchor="middle" fontSize="9" fill="#6b7280">
            0
          </text>
          <text x={W - MR} y={H - MB + 18} textAnchor="end" fontSize="9" fill="#6b7280">
            {fmt(aMostrar(xMaxBase, unidad), 0)}
          </text>
        </svg>
        <p className="mt-2 text-center text-xs text-gray-500">
          Punto naranja: estado (σ', τ) evaluado
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PESTAÑA 2: Círculo de Mohr
// ---------------------------------------------------------------------------
function TabCirculoMohr() {
  const [unidad, setUnidad] = useState("kPa")
  const [sigma1, setSigma1] = useState(300)
  const [sigma3, setSigma3] = useState(100)
  const [incluirEnvolvente, setIncluirEnvolvente] = useState(true)
  const [c, setC] = useState(10)
  const [phi, setPhi] = useState(28)
  const [incluirPlano, setIncluirPlano] = useState(false)
  const [alpha, setAlpha] = useState(45)

  const r = useMemo(() => {
    const s1 = aBase(sigma1 || 0, unidad)
    const s3 = aBase(sigma3 || 0, unidad)
    const sigmaProm = (s1 + s3) / 2
    const R = Math.max((s1 - s3) / 2, 0)

    let distancia: number | null = null
    let thetaF: number | null = null
    let estado = "Envolvente no incluida"
    let cBase = 0
    let phiRad = 0

    if (incluirEnvolvente) {
      cBase = aBase(c || 0, unidad)
      phiRad = ((phi || 0) * Math.PI) / 180
      distancia = sigmaProm * Math.sin(phiRad) + cBase * Math.cos(phiRad)
      thetaF = 45 + (phi || 0) / 2
      const tol = Math.max(R * 0.01, 1e-6)
      if (Math.abs(distancia - R) <= tol) estado = "En falla (círculo tangente a la envolvente)"
      else if (distancia > R) estado = "Estable (el círculo no alcanza la envolvente)"
      else estado = "Datos incompatibles: el círculo cruza la envolvente"
    }

    let sigmaAlpha: number | null = null
    let tauAlpha: number | null = null
    if (incluirPlano) {
      const alphaRad = ((alpha || 0) * Math.PI) / 180
      sigmaAlpha = sigmaProm + R * Math.cos(2 * alphaRad)
      tauAlpha = R * Math.sin(2 * alphaRad)
    }

    return { s1, s3, sigmaProm, R, distancia, thetaF, estado, cBase, phiRad, sigmaAlpha, tauAlpha }
  }, [sigma1, sigma3, unidad, incluirEnvolvente, c, phi, incluirPlano, alpha])

  // --- gráfico círculo ---
  const W = 360,
    H = 280,
    ML = 60,
    MB = 34,
    MT = 15,
    MR = 15
  const plotW = W - ML - MR
  const plotH = H - MB - MT

  const xMin = 0
  const xMax = Math.max(r.s1 * 1.25, r.sigmaProm + r.R * 1.3, 1)
  const yHalf = Math.max(r.R * 1.35, 1)

  const scale = Math.min(plotW / (xMax - xMin), plotH / (2 * yHalf))
  const originX = ML
  const centerY = MT + plotH / 2

  const toX = (s: number) => originX + (s - xMin) * scale
  const toY = (t: number) => centerY - t * scale

  const cx = toX(r.sigmaProm)
  const cy = toY(0)
  const rPix = r.R * scale

  // envolvente: τ = c + σ tan(φ), dibujada dentro del rango visible
  const envX0 = 0
  const envY0Base = r.cBase
  const envX1 = xMax
  const envY1Base = r.cBase + xMax * Math.tan(r.phiRad)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Parámetros de entrada</h3>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">Unidad de esfuerzo</label>
          <UnidadSelector value={unidad} onChange={setUnidad} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberInput
            label={`Esfuerzo principal mayor, σ'₁ (${unidad})`}
            value={sigma1}
            onChange={setSigma1}
          />
          <NumberInput
            label={`Esfuerzo principal menor, σ'₃ (${unidad})`}
            value={sigma3}
            onChange={setSigma3}
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            id="chk-env"
            type="checkbox"
            checked={incluirEnvolvente}
            onChange={(e) => setIncluirEnvolvente(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="chk-env" className="text-xs font-medium text-gray-600">
            Incluir envolvente de falla (c', φ') para evaluar estabilidad
          </label>
        </div>
        {incluirEnvolvente && (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberInput label={`Cohesión efectiva, c' (${unidad})`} value={c} onChange={setC} />
            <NumberInput label="Ángulo de fricción efectivo, φ' (°)" value={phi} onChange={setPhi} />
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <input
            id="chk-plano"
            type="checkbox"
            checked={incluirPlano}
            onChange={(e) => setIncluirPlano(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="chk-plano" className="text-xs font-medium text-gray-600">
            Calcular esfuerzos en un plano arbitrario (α, medido desde el plano de σ'₁)
          </label>
        </div>
        {incluirPlano && (
          <div className="mt-3">
            <NumberInput label="Ángulo del plano, α (°)" value={alpha} onChange={setAlpha} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <MetricTile
            label="Esfuerzo promedio σ'_prom"
            value={fmt(aMostrar(r.sigmaProm, unidad))}
            unit={unidad}
            color="gray"
          />
          <MetricTile label="Radio / τ_max" value={fmt(aMostrar(r.R, unidad))} unit={unidad} color="blue" />
          {incluirEnvolvente && (
            <>
              <MetricTile
                label="Plano de falla teórico θf"
                value={fmt(r.thetaF ?? 0, 1)}
                unit="°"
                color="amber"
              />
              <MetricTile
                label="Estado"
                value={r.estado}
                color={
                  r.estado.startsWith("Estable")
                    ? "green"
                    : r.estado.startsWith("En falla")
                    ? "amber"
                    : "gray"
                }
              />
            </>
          )}
          {incluirPlano && r.sigmaAlpha !== null && r.tauAlpha !== null && (
            <>
              <MetricTile
                label={`σ' en plano α=${alpha}°`}
                value={fmt(aMostrar(r.sigmaAlpha, unidad))}
                unit={unidad}
                color="blue"
              />
              <MetricTile
                label={`τ en plano α=${alpha}°`}
                value={fmt(aMostrar(r.tauAlpha, unidad))}
                unit={unidad}
                color="blue"
              />
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Diagrama σ' - τ</h3>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* ejes */}
          <line x1={ML} y1={centerY} x2={W - MR} y2={centerY} stroke="#9ca3af" strokeWidth={1} />
          <line x1={originX} y1={MT} x2={originX} y2={H - MB} stroke="#9ca3af" strokeWidth={1} />
          <text x={W - MR} y={centerY + 16} textAnchor="end" fontSize="9" fill="#6b7280">
            σ' ({unidad})
          </text>
          <text x={originX - 8} y={MT + 4} textAnchor="end" fontSize="9" fill="#6b7280">
            τ ({unidad})
          </text>

          {/* círculo de Mohr */}
          <circle cx={cx} cy={cy} r={rPix} fill="none" stroke="#2563eb" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={2.5} fill="#2563eb" />

          {/* puntos σ1, σ3 en el eje */}
          <circle cx={toX(r.s1)} cy={toY(0)} r={3.5} fill="#374151" />
          <text x={toX(r.s1)} y={toY(0) + 16} textAnchor="middle" fontSize="8" fill="#374151">
            σ'₁
          </text>
          <circle cx={toX(r.s3)} cy={toY(0)} r={3.5} fill="#374151" />
          <text x={toX(r.s3)} y={toY(0) + 16} textAnchor="middle" fontSize="8" fill="#374151">
            σ'₃
          </text>

          {/* envolvente de falla */}
          {incluirEnvolvente && (
            <line
              x1={toX(envX0)}
              y1={toY(envY0Base)}
              x2={toX(envX1)}
              y2={toY(envY1Base)}
              stroke="#dc2626"
              strokeWidth={1.75}
            />
          )}

          {/* punto en plano arbitrario */}
          {incluirPlano && r.sigmaAlpha !== null && r.tauAlpha !== null && (
            <circle
              cx={toX(r.sigmaAlpha)}
              cy={toY(r.tauAlpha)}
              r={4}
              fill="#f59e0b"
              stroke="#fff"
              strokeWidth={1.3}
            />
          )}
        </svg>
        <p className="mt-2 text-center text-xs text-gray-500">
          Azul: círculo de Mohr · Rojo: envolvente de falla · Naranja: plano evaluado
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gráfico XY genérico (series de línea/dispersión + rectas de regresión)
// ---------------------------------------------------------------------------
function ChartXY({
  series,
  regressionLines = [],
  xLabel,
  yLabel,
  width = 380,
  height = 260,
}: {
  series: { label: string; color: string; points: { x: number; y: number }[]; mode?: "line" | "scatter" }[]
  regressionLines?: { color: string; pendiente: number; intercepto: number }[]
  xLabel: string
  yLabel: string
  width?: number
  height?: number
}) {
  const ML = 58,
    MB = 34,
    MT = 15,
    MR = 15
  const plotW = width - ML - MR
  const plotH = height - MB - MT

  const allPoints = series.flatMap((s) => s.points)
  const allX = allPoints.map((p) => p.x)
  const allY = allPoints.map((p) => p.y)

  const xMax = (allX.length ? Math.max(...allX, 0) : 1) * 1.15 || 1
  const xMin = Math.min(0, ...(allX.length ? allX : [0]))

  const yCandidates = allY.length ? [...allY] : [0, 1]
  regressionLines.forEach((r) => {
    yCandidates.push(r.pendiente * xMin + r.intercepto, r.pendiente * xMax + r.intercepto)
  })
  const yMax = Math.max(...yCandidates, 0) * 1.15 || 1
  const yMin = Math.min(0, ...yCandidates)

  const toX = (x: number) => ML + ((x - xMin) / (xMax - xMin || 1)) * plotW
  const toY = (y: number) => height - MB - ((y - yMin) / (yMax - yMin || 1)) * plotH

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <line x1={ML} y1={height - MB} x2={width - MR} y2={height - MB} stroke="#9ca3af" strokeWidth={1} />
      <line x1={ML} y1={height - MB} x2={ML} y2={MT} stroke="#9ca3af" strokeWidth={1} />
      <text x={ML + plotW / 2} y={height - 6} textAnchor="middle" fontSize="9" fill="#6b7280">
        {xLabel}
      </text>
      <text x={14} y={MT + 4} fontSize="9" fill="#6b7280">
        {yLabel}
      </text>

      {regressionLines.map((r, i) => (
        <line
          key={`reg-${i}`}
          x1={toX(xMin)}
          y1={toY(r.pendiente * xMin + r.intercepto)}
          x2={toX(xMax)}
          y2={toY(r.pendiente * xMax + r.intercepto)}
          stroke={r.color}
          strokeWidth={1.75}
          strokeDasharray="5 3"
        />
      ))}

      {series.map((s, si) =>
        s.mode === "scatter" ? (
          <g key={si}>
            {s.points.map((p, pi) => (
              <circle
                key={pi}
                cx={toX(p.x)}
                cy={toY(p.y)}
                r={4}
                fill={s.color}
                stroke="#fff"
                strokeWidth={1}
              />
            ))}
          </g>
        ) : (
          <polyline
            key={si}
            points={s.points.map((p) => `${toX(p.x)},${toY(p.y)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={1.75}
          />
        )
      )}
    </svg>
  )
}

function Leyenda({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PESTAÑA 3: Corte Directo (NC y SC)
// ---------------------------------------------------------------------------
type Forma = "cuadrada" | "circular"

interface FilaEnsayo {
  defHorizontal: number
  defNormalPct: number
  fuerza: number
  esfuerzoMedido: number
}

interface Muestra {
  id: string
  nombre: string
  forma: Forma
  dimension: number // lado (cuadrada) o diámetro (circular)
  unidadLongitud: string
  masa: number
  unidadMasa: string
  usaBrazo: boolean
  relacionBrazo: number
  unidadFuerza: string
  unidadEsfuerzoMedido: string
  archivoNombre: string
  datos: FilaEnsayo[]
}

let contadorMuestras = 1
function nuevaMuestra(): Muestra {
  const n = contadorMuestras++
  return {
    id: `m${n}-${Date.now()}`,
    nombre: `M${n}`,
    forma: "circular",
    dimension: 50.75,
    unidadLongitud: "mm",
    masa: 2,
    unidadMasa: "kg",
    usaBrazo: true,
    relacionBrazo: 10,
    unidadFuerza: "N",
    unidadEsfuerzoMedido: "kPa",
    archivoNombre: "",
    datos: [],
  }
}

interface BloqueMuestra {
  nombre: string
  masaDetectada: number | null
  unidadMasaDetectada: string | null
  datos: FilaEnsayo[]
}

const EJEMPLO_CORTE_DIRECTO: { nombre: string; diametroMm: number; masaKg: number; datos: FilaEnsayo[] }[] = [
  {
    nombre: "M1",
    diametroMm: 50.75,
    masaKg: 2,
    datos: [
      { defHorizontal: 0, defNormalPct: 0, fuerza: 0, esfuerzoMedido: 0 },
      { defHorizontal: 0.4, defNormalPct: -0.024, fuerza: 113.7, esfuerzoMedido: 56.208 },
      { defHorizontal: 0.8, defNormalPct: -0.022, fuerza: 144.7, esfuerzoMedido: 71.533 },
      { defHorizontal: 1.2, defNormalPct: 0.005, fuerza: 162.2, esfuerzoMedido: 80.184 },
      { defHorizontal: 1.6, defNormalPct: 0.048, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 2, defNormalPct: 0.092, fuerza: 173.4, esfuerzoMedido: 85.721 },
      { defHorizontal: 2.4, defNormalPct: 0.136, fuerza: 181.3, esfuerzoMedido: 89.626 },
      { defHorizontal: 2.8, defNormalPct: 0.172, fuerza: 184.1, esfuerzoMedido: 91.011 },
      { defHorizontal: 3.2, defNormalPct: 0.2, fuerza: 184.8, esfuerzoMedido: 91.357 },
      { defHorizontal: 3.25, defNormalPct: 0.204, fuerza: 185.2, esfuerzoMedido: 91.554 },
      { defHorizontal: 3.6, defNormalPct: 0.222, fuerza: 177.7, esfuerzoMedido: 87.847 },
      { defHorizontal: 4, defNormalPct: 0.227, fuerza: 176.6, esfuerzoMedido: 87.303 },
      { defHorizontal: 4.4, defNormalPct: 0.245, fuerza: 177.3, esfuerzoMedido: 87.649 },
      { defHorizontal: 4.8, defNormalPct: 0.249, fuerza: 174, esfuerzoMedido: 86.018 },
      { defHorizontal: 5.2, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 5.6, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 6, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 6.4, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 6.8, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 7.2, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 7.6, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 8, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 8.4, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 8.8, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 9.2, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 9.6, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 10, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 10.4, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 10.8, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 11.2, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 11.6, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 12.0, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 12.4, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 12.8, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 13.2, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 13.6, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 14.0, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 14.4, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 14.8, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 15.2, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 15.6, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 16.0, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 16.4, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 16.8, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 17.2, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 17.6, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 18.0, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 18.4, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 18.8, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 19.2, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 19.6, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
      { defHorizontal: 20.0, defNormalPct: 0.249, fuerza: 171.1, esfuerzoMedido: 84.584 },
    ],
  },
  {
    nombre: "M2",
    diametroMm: 50.65,
    masaKg: 4,
    datos: [
      { defHorizontal: 0, defNormalPct: 0, fuerza: 0, esfuerzoMedido: 0 },
      { defHorizontal: 0.4, defNormalPct: -0.046, fuerza: 176.4, esfuerzoMedido: 87.549 },
      { defHorizontal: 0.8, defNormalPct: -0.059, fuerza: 242.6, esfuerzoMedido: 120.404 },
      { defHorizontal: 1.2, defNormalPct: -0.059, fuerza: 285.6, esfuerzoMedido: 141.746 },
      { defHorizontal: 1.6, defNormalPct: -0.058, fuerza: 316.9, esfuerzoMedido: 157.28 },
      { defHorizontal: 2, defNormalPct: -0.045, fuerza: 337.2, esfuerzoMedido: 167.355 },
      { defHorizontal: 2.4, defNormalPct: -0.001, fuerza: 337.7, esfuerzoMedido: 167.603 },
      { defHorizontal: 2.6, defNormalPct: 0.02, fuerza: 341.1, esfuerzoMedido: 169.291 },
      { defHorizontal: 2.8, defNormalPct: 0.042, fuerza: 331.8, esfuerzoMedido: 164.675 },
      { defHorizontal: 3.2, defNormalPct: 0.075, fuerza: 333.2, esfuerzoMedido: 165.37 },
      { defHorizontal: 3.6, defNormalPct: 0.111, fuerza: 326, esfuerzoMedido: 161.797 },
      { defHorizontal: 4, defNormalPct: 0.138, fuerza: 329.4, esfuerzoMedido: 163.484 },
      { defHorizontal: 4.4, defNormalPct: 0.153, fuerza: 321, esfuerzoMedido: 159.315 },
      { defHorizontal: 4.8, defNormalPct: 0.166, fuerza: 309.3, esfuerzoMedido: 153.508 },
      { defHorizontal: 5.2, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 5.6, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 6, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 6.4, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 6.8, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 7.2, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 7.6, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 8, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 8.4, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 8.8, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 9.2, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 9.6, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 10, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 10.4, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 10.8, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 11.2, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 11.6, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 12.0, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 12.4, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 12.8, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 13.2, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 13.6, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 14.0, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 14.4, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 14.8, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 15.2, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 15.6, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 16.0, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 16.4, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 16.8, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 17.2, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 17.6, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 18.0, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 18.4, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 18.8, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 19.2, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 19.6, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
      { defHorizontal: 20.0, defNormalPct: 0.169, fuerza: 297.9, esfuerzoMedido: 147.85 },
    ],
  },
  {
    nombre: "M3",
    diametroMm: 50.55,
    masaKg: 8,
    datos: [
      { defHorizontal: 0, defNormalPct: 0, fuerza: 0, esfuerzoMedido: 0 },
      { defHorizontal: 0.4, defNormalPct: -0.023, fuerza: 298, esfuerzoMedido: 148.486 },
      { defHorizontal: 0.8, defNormalPct: -0.05, fuerza: 431, esfuerzoMedido: 214.756 },
      { defHorizontal: 1.2, defNormalPct: -0.06, fuerza: 534.1, esfuerzoMedido: 266.128 },
      { defHorizontal: 1.6, defNormalPct: -0.06, fuerza: 600, esfuerzoMedido: 298.964 },
      { defHorizontal: 2, defNormalPct: -0.06, fuerza: 641.7, esfuerzoMedido: 319.742 },
      { defHorizontal: 2.2, defNormalPct: -0.051, fuerza: 655, esfuerzoMedido: 326.369 },
      { defHorizontal: 2.4, defNormalPct: -0.048, fuerza: 648.7, esfuerzoMedido: 323.23 },
      { defHorizontal: 2.8, defNormalPct: -0.041, fuerza: 646.5, esfuerzoMedido: 322.134 },
      { defHorizontal: 3.2, defNormalPct: -0.033, fuerza: 635.1, esfuerzoMedido: 316.454 },
      { defHorizontal: 3.6, defNormalPct: -0.027, fuerza: 620, esfuerzoMedido: 308.93 },
      { defHorizontal: 4, defNormalPct: -0.025, fuerza: 599.7, esfuerzoMedido: 298.815 },
      { defHorizontal: 4.4, defNormalPct: -0.025, fuerza: 596.9, esfuerzoMedido: 297.42 },
      { defHorizontal: 4.8, defNormalPct: -0.025, fuerza: 622.4, esfuerzoMedido: 310.126 },
      { defHorizontal: 5.2, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 5.6, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 6, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 6.4, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 6.8, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 7.2, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 7.6, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 8, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 8.4, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 8.8, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 9.2, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 9.6, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 10, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 10.4, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 10.8, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 11.2, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 11.6, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 12.0, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 12.4, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 12.8, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 13.2, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 13.6, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 14.0, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 14.4, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 14.8, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 15.2, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 15.6, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 16.0, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 16.4, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 16.8, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 17.2, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 17.6, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 18.0, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 18.4, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 18.8, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 19.2, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 19.6, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
      { defHorizontal: 20.0, defNormalPct: -0.025, fuerza: 621.9, esfuerzoMedido: 309.877 },
    ],
  },
]

// ---------------------------------------------------------------------------
// Plantilla y datos de ejemplo
// ---------------------------------------------------------------------------
function descargarPlantilla() {
  const wb = XLSX.utils.book_new()
  const filas: (string | number)[][] = [
    ["Plantilla de datos - Ensayo de Corte Directo (NodoCalc)"],
    ["Instrucciones: complete una fila por cada lectura del ensayo. No modifique los encabezados."],
    ["Las unidades de Fuerza y Esfuerzo Cortante se definen en NodoCalc despues de cargar el archivo."],
    [],
    ["Def horizontal", "Def normal (%)", "Fuerza", "Esfuerzo cortante"],
    [0.5, 0.1, 45.2, 12.6],
  ]
  const ws = XLSX.utils.aoa_to_sheet(filas)
  ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws, "Corte Directo")
  XLSX.writeFile(wb, "plantilla_corte_directo.xlsx")
}

function crearMuestrasDeEjemplo(): Muestra[] {
  return EJEMPLO_CORTE_DIRECTO.map((e) => ({
    ...nuevaMuestra(),
    nombre: e.nombre,
    forma: "circular" as Forma,
    dimension: e.diametroMm,
    unidadLongitud: "mm",
    masa: e.masaKg,
    unidadMasa: "kg",
    usaBrazo: true,
    relacionBrazo: 10,
    unidadFuerza: "N",
    unidadEsfuerzoMedido: "kPa",
    archivoNombre: "ejemplo_corte_directo.xlsx",
    datos: e.datos,
  }))
}

async function parsearExcelEnsayo(file: File): Promise<BloqueMuestra[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  // Fila de encabezados de columna: la que tenga alguna celda "...horizontal..."
  const idxEncabezados = rows.findIndex(
    (r) =>
      Array.isArray(r) &&
      r.some((c) => typeof c === "string" && c.toLowerCase().includes("horizontal"))
  )
  if (idxEncabezados === -1) return []

  const filaEncabezados = rows[idxEncabezados]
  const filaNombres = idxEncabezados > 0 ? rows[idxEncabezados - 1] : []

  // Cada columna que contenga "horizontal" marca el inicio de un bloque de 4 columnas
  // (Def horizontal, Def normal, Fuerza, Esfuerzo cortante) para una muestra.
  const inicios: number[] = []
  filaEncabezados.forEach((c, i) => {
    if (typeof c === "string" && c.toLowerCase().includes("horizontal")) inicios.push(i)
  })
  if (inicios.length === 0) return []

  return inicios.map((colInicio, bi) => {
    const datos: FilaEnsayo[] = []
    for (let i = idxEncabezados + 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r) continue
      const defH = parseFloat(r[colInicio])
      if (!isFinite(defH)) continue
      const defN = parseFloat(r[colInicio + 1])
      const fuerza = parseFloat(r[colInicio + 2])
      const esfuerzo = parseFloat(r[colInicio + 3])
      datos.push({
        defHorizontal: defH,
        defNormalPct: isFinite(defN) ? defN : 0,
        fuerza: isFinite(fuerza) ? fuerza : 0,
        esfuerzoMedido: isFinite(esfuerzo) ? esfuerzo : 0,
      })
    }
    const crudo = (filaNombres?.[colInicio] as string) || ""
    const matchMasa = crudo.match(/([\d.]+)\s*(kg|g|ton|lb)/i)
    const nombre = crudo.replace(/\s*\(.*\)\s*/, "").trim() || `M${bi + 1}`
    return {
      nombre,
      masaDetectada: matchMasa ? parseFloat(matchMasa[1]) : null,
      unidadMasaDetectada: matchMasa ? matchMasa[2].toLowerCase() : null,
      datos,
    }
  })
}

interface FilaCalculada extends FilaEnsayo {
  Ac: number // m²
  sigmaCorr: number // Pa
  tauCorr: number // Pa
}

function calcularMuestra(m: Muestra) {
  const dimBase = convLongitud.aBase(m.dimension, m.unidadLongitud) // m
  const A0 = m.forma === "circular" ? (Math.PI * dimBase * dimBase) / 4 : dimBase * dimBase // m²
  const masaBase = convMasa.aBase(m.masa, m.unidadMasa) // kg
  const peso = masaBase * GRAVEDAD // N
  const P = peso * (m.usaBrazo ? m.relacionBrazo || 1 : 1) // N normal aplicado

  // Ac se calcula UNA sola vez por muestra, con la deformación horizontal en el
  // punto de FUERZA MÁXIMA (pico) — no con la deformación máxima/última del ensayo,
  // que suele continuar registrando bastante más allá de la falla hasta el tramo
  // residual. Esa misma Ac se aplica luego a todas las filas de la curva
  // (metodología validada contra datos reales de laboratorio).
  let filaPicoRaw: FilaEnsayo | null = null
  for (const f of m.datos) if (!filaPicoRaw || f.fuerza > filaPicoRaw.fuerza) filaPicoRaw = f
  const deformacionEnPico = filaPicoRaw ? filaPicoRaw.defHorizontal : 0
  const deltaPicoBase = convLongitud.aBase(deformacionEnPico, m.unidadLongitud)

  let Ac = A0
  if (filaPicoRaw) {
    if (m.forma === "circular") {
      const ratio = Math.min(Math.max(deltaPicoBase / dimBase, -0.999), 0.999)
      const theta = Math.acos(ratio)
      Ac = (dimBase * dimBase / 2) * (theta - ratio * Math.sin(theta))
    } else {
      Ac = Math.max(dimBase * (dimBase - deltaPicoBase), A0 * 0.001)
    }
  }

  const sigmaCorr = Ac > 0 ? P / Ac : 0 // Pa, constante para toda la muestra

  const filas: FilaCalculada[] = m.datos.map((f) => {
    const fuerzaBase = convFuerza.aBase(f.fuerza, m.unidadFuerza) // N
    const tauCorr = Ac > 0 ? fuerzaBase / Ac : 0
    return { ...f, Ac, sigmaCorr, tauCorr }
  })

  let pico: FilaCalculada | null = null
  for (const f of filas) if (!pico || f.tauCorr > pico.tauCorr) pico = f
  const residual: FilaCalculada | null = filas.length ? filas[filas.length - 1] : null

  return { A0, Ac, P, sigmaCorr, filas, deformacionEnPico, pico, residual }
}

function TabCorteDirecto() {
  const [muestras, setMuestras] = useState<Muestra[]>([nuevaMuestra()])
  const [unidadResultados, setUnidadResultados] = useState("kPa")

  function agregarMuestra() {
    setMuestras((prev) => [...prev, nuevaMuestra()])
  }
  function eliminarMuestra(id: string) {
    setMuestras((prev) => prev.filter((m) => m.id !== id))
  }
  function actualizarMuestra(id: string, cambios: Partial<Muestra>) {
    setMuestras((prev) => prev.map((m) => (m.id === id ? { ...m, ...cambios } : m)))
  }
  function cargarEjemplo() {
    setMuestras(crearMuestrasDeEjemplo())
  }
  async function cargarExcel(id: string, file: File) {
    const bloques = await parsearExcelEnsayo(file)
    if (bloques.length === 0) return

    if (bloques.length === 1) {
      actualizarMuestra(id, { datos: bloques[0].datos, archivoNombre: file.name })
      return
    }

    // El archivo trae varias muestras en bloques de columnas (formato de laboratorio):
    // la primera llena la tarjeta actual, las demás se agregan como tarjetas nuevas.
    setMuestras((prev) => {
      const idx = prev.findIndex((m) => m.id === id)
      if (idx === -1) return prev
      const resultado = [...prev]
      bloques.forEach((b, bi) => {
        const cambios: Partial<Muestra> = {
          nombre: b.nombre,
          datos: b.datos,
          archivoNombre: file.name,
          ...(b.masaDetectada
            ? { masa: b.masaDetectada, unidadMasa: b.unidadMasaDetectada === "kg" ? "kg" : b.unidadMasaDetectada || "kg" }
            : {}),
        }
        if (bi === 0) {
          resultado[idx] = { ...resultado[idx], ...cambios }
        } else {
          resultado.splice(idx + bi, 0, { ...nuevaMuestra(), ...cambios })
        }
      })
      return resultado
    })
  }

  const resultados = useMemo(
    () => muestras.map((m, i) => ({ muestra: m, color: PALETA_MUESTRAS[i % PALETA_MUESTRAS.length], calc: calcularMuestra(m) })),
    [muestras]
  )

  const conDatos = resultados.filter((r) => r.calc.filas.length > 0)

  const puntosPico = conDatos
    .filter((r) => r.calc.pico)
    .map((r) => ({
      x: convEsfuerzo.aMostrar(r.calc.pico!.sigmaCorr, unidadResultados),
      y: convEsfuerzo.aMostrar(r.calc.pico!.tauCorr, unidadResultados),
    }))
  const puntosResidual = conDatos
    .filter((r) => r.calc.residual)
    .map((r) => ({
      x: convEsfuerzo.aMostrar(r.calc.residual!.sigmaCorr, unidadResultados),
      y: convEsfuerzo.aMostrar(r.calc.residual!.tauCorr, unidadResultados),
    }))

  const regPico = regresionLineal(puntosPico)
  const regResidual = regresionLineal(puntosResidual)
  const phiPico = (Math.atan(regPico.pendiente) * 180) / Math.PI
  const phiResidual = (Math.atan(regResidual.pendiente) * 180) / Math.PI

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-500">
          Descarga la plantilla para saber qué columnas debe traer tu Excel, o carga un ejemplo con datos reales de
          laboratorio para ver el módulo en funcionamiento.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={descargarPlantilla}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600"
          >
            Descargar plantilla de Excel
          </button>
          <button
            onClick={cargarEjemplo}
            className="rounded-lg bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            Cargar ejemplo (3 muestras)
          </button>
        </div>
      </div>

      {resultados.map((r) => {
        const m = r.muestra
        return (
          <div key={m.id} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color }} />
                <input
                  value={m.nombre}
                  onChange={(e) => actualizarMuestra(m.id, { nombre: e.target.value })}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-800"
                />
              </div>
              {muestras.length > 1 && (
                <button
                  onClick={() => eliminarMuestra(m.id)}
                  className="text-xs font-medium text-red-500 hover:text-red-700"
                >
                  Eliminar muestra
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Forma de la probeta</label>
                <select
                  value={m.forma}
                  onChange={(e) => actualizarMuestra(m.id, { forma: e.target.value as Forma })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                >
                  <option value="circular">Circular</option>
                  <option value="cuadrada">Cuadrada</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  {m.forma === "circular" ? "Diámetro D" : "Lado L"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={m.dimension}
                    onChange={(e) => actualizarMuestra(m.id, { dimension: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                  />
                  <select
                    value={m.unidadLongitud}
                    onChange={(e) => actualizarMuestra(m.id, { unidadLongitud: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-700"
                  >
                    {convLongitud.unidades.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-gray-400">Esta unidad también se usa para la columna Def horizontal del Excel</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Masa</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={m.masa}
                    onChange={(e) => actualizarMuestra(m.id, { masa: parseFloat(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                  />
                  <select
                    value={m.unidadMasa}
                    onChange={(e) => actualizarMuestra(m.id, { unidadMasa: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-700"
                  >
                    {convMasa.unidades.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Unidad de Fuerza (Excel)</label>
                <select
                  value={m.unidadFuerza}
                  onChange={(e) => actualizarMuestra(m.id, { unidadFuerza: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                >
                  {convFuerza.unidades.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={m.usaBrazo}
                  onChange={(e) => actualizarMuestra(m.id, { usaBrazo: e.target.checked })}
                  className="h-4 w-4"
                />
                Usa brazo de palanca
              </label>
              {m.usaBrazo && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600">Relación de brazo</label>
                  <input
                    type="number"
                    value={m.relacionBrazo}
                    onChange={(e) => actualizarMuestra(m.id, { relacionBrazo: parseFloat(e.target.value) })}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">Unidad esfuerzo medido (Excel)</label>
                <select
                  value={m.unidadEsfuerzoMedido}
                  onChange={(e) => actualizarMuestra(m.id, { unidadEsfuerzoMedido: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                >
                  {convEsfuerzo.unidades.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600">
                {m.archivoNombre ? `Archivo: ${m.archivoNombre}` : "Cargar Excel de ensayo"}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) cargarExcel(m.id, file)
                  }}
                />
              </label>
              {m.datos.length > 0 && (
                <span className="text-xs text-gray-500">{m.datos.length} filas cargadas</span>
              )}
            </div>

            {m.datos.length > 0 && (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <MetricTile label="Área inicial A₀" value={fmt(r.calc.A0 * 1e6, 1)} unit="mm²" color="gray" />
                  <MetricTile label="Fuerza normal P" value={fmt(r.calc.P, 1)} unit="N" color="gray" />
                  <MetricTile
                    label="Deformación en el pico (define Ac)"
                    value={fmt(r.calc.deformacionEnPico, 2)}
                    unit={m.unidadLongitud}
                    color="amber"
                  />
                  <MetricTile label="Área corregida Ac" value={fmt(r.calc.Ac * 1e6, 1)} unit="mm²" color="amber" />
                  <MetricTile
                    label="σ' corregido"
                    value={fmt(convEsfuerzo.aMostrar(r.calc.sigmaCorr, unidadResultados))}
                    unit={unidadResultados}
                    color="green"
                  />
                  <MetricTile
                    label="τ pico"
                    value={r.calc.pico ? fmt(convEsfuerzo.aMostrar(r.calc.pico.tauCorr, unidadResultados)) : "—"}
                    unit={unidadResultados}
                    color="blue"
                  />
                </div>

                <div className="mt-4 max-h-52 overflow-y-auto rounded-lg border border-gray-100">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Def horiz. ({m.unidadLongitud})</th>
                        <th className="px-3 py-2">Def normal (%)</th>
                        <th className="px-3 py-2">τ corregido ({unidadResultados})</th>
                        <th className="px-3 py-2">τ medido ({m.unidadEsfuerzoMedido})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.calc.filas.map((f, i) => (
                        <tr key={i} className="border-t border-gray-100 text-gray-700">
                          <td className="px-3 py-1.5">{fmt(f.defHorizontal, 2)}</td>
                          <td className="px-3 py-1.5">{fmt(f.defNormalPct, 2)}</td>
                          <td className="px-3 py-1.5">{fmt(convEsfuerzo.aMostrar(f.tauCorr, unidadResultados))}</td>
                          <td className="px-3 py-1.5 text-gray-400">{fmt(f.esfuerzoMedido, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )
      })}

      <button
        onClick={agregarMuestra}
        className="w-full rounded-2xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600"
      >
        + Agregar muestra
      </button>

      {conDatos.length >= 2 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Resultados combinados</h3>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Unidad de resultados</label>
              <UnidadSelector value={unidadResultados} onChange={setUnidadResultados} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="px-3 py-2">Muestra</th>
                  <th className="px-3 py-2">σ' corregido ({unidadResultados})</th>
                  <th className="px-3 py-2">τ pico ({unidadResultados})</th>
                  <th className="px-3 py-2">τ residual ({unidadResultados})</th>
                </tr>
              </thead>
              <tbody>
                {conDatos.map((r) => (
                  <tr key={r.muestra.id} className="border-t border-gray-100 text-gray-700">
                    <td className="px-3 py-1.5 font-medium">{r.muestra.nombre}</td>
                    <td className="px-3 py-1.5">{fmt(convEsfuerzo.aMostrar(r.calc.sigmaCorr, unidadResultados))}</td>
                    <td className="px-3 py-1.5">
                      {r.calc.pico ? fmt(convEsfuerzo.aMostrar(r.calc.pico.tauCorr, unidadResultados)) : "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.calc.residual ? fmt(convEsfuerzo.aMostrar(r.calc.residual.tauCorr, unidadResultados)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="c' pico" value={fmt(regPico.intercepto)} unit={unidadResultados} color="blue" />
            <MetricTile label="tan(φ') pico" value={fmt(regPico.pendiente, 4)} color="blue" />
            <MetricTile label="φ' pico" value={fmt(phiPico, 2)} unit="°" color="blue" />
            <MetricTile label="R² pico" value={fmt(regPico.r2, 3)} color="gray" />
            <MetricTile label="c' residual" value={fmt(regResidual.intercepto)} unit={unidadResultados} color="green" />
            <MetricTile label="tan(φ') residual" value={fmt(regResidual.pendiente, 4)} color="green" />
            <MetricTile label="φ' residual" value={fmt(phiResidual, 2)} unit="°" color="green" />
            <MetricTile label="R² residual" value={fmt(regResidual.r2, 3)} color="gray" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-center text-xs font-semibold text-gray-600">Envolvente de Coulomb</h4>
              <ChartXY
                xLabel={`σ' (${unidadResultados})`}
                yLabel={`τ (${unidadResultados})`}
                series={[
                  { label: "Pico", color: "#2563eb", mode: "scatter", points: puntosPico },
                  { label: "Residual", color: "#16a34a", mode: "scatter", points: puntosResidual },
                ]}
                regressionLines={[
                  { color: "#2563eb", pendiente: regPico.pendiente, intercepto: regPico.intercepto },
                  { color: "#16a34a", pendiente: regResidual.pendiente, intercepto: regResidual.intercepto },
                ]}
              />
              <Leyenda
                items={[
                  { color: "#2563eb", label: "Pico" },
                  { color: "#16a34a", label: "Residual" },
                ]}
              />
            </div>

            <div>
              <h4 className="mb-2 text-center text-xs font-semibold text-gray-600">Def. horizontal vs τ corregido</h4>
              <ChartXY
                xLabel="Def. horizontal"
                yLabel={`τ (${unidadResultados})`}
                series={conDatos.map((r) => ({
                  label: r.muestra.nombre,
                  color: r.color,
                  mode: "line" as const,
                  points: r.calc.filas.map((f) => ({
                    x: f.defHorizontal,
                    y: convEsfuerzo.aMostrar(f.tauCorr, unidadResultados),
                  })),
                }))}
              />
              <Leyenda items={conDatos.map((r) => ({ color: r.color, label: r.muestra.nombre }))} />
            </div>

            <div className="lg:col-span-2">
              <h4 className="mb-2 text-center text-xs font-semibold text-gray-600">Def. horizontal vs Def. normal (%) — dilatancia</h4>
              <ChartXY
                width={780}
                xLabel="Def. horizontal"
                yLabel="Def. normal (%)"
                series={conDatos.map((r) => ({
                  label: r.muestra.nombre,
                  color: r.color,
                  mode: "line" as const,
                  points: r.calc.filas.map((f) => ({ x: f.defHorizontal, y: f.defNormalPct })),
                }))}
              />
              <Leyenda items={conDatos.map((r) => ({ color: r.color, label: r.muestra.nombre }))} />
            </div>
          </div>
        </div>
      )}

      {conDatos.length === 1 && (
        <p className="text-center text-xs text-gray-400">
          Agrega al menos una segunda muestra con datos cargados para calcular la envolvente de Coulomb.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Placeholder para pestañas aún no construidas
// ---------------------------------------------------------------------------
function TabProximamente({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
      <h3 className="text-base font-semibold text-gray-700">{titulo}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{descripcion}</p>
      <span className="mt-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
        Próximamente
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
type TabId = "mc" | "circulo" | "directo" | "triaxial"

const TABS: { id: TabId; label: string }[] = [
  { id: "mc", label: "Mohr-Coulomb" },
  { id: "circulo", label: "Círculo de Mohr" },
  { id: "directo", label: "Corte directo" },
  { id: "triaxial", label: "Triaxial" },
]

export default function ResistenciaCortePage() {
  const [tab, setTab] = useState<TabId>("mc")

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <p className="mb-1 text-xs font-medium text-gray-400">Herramientas / Suelos / Resistencia al Corte</p>
        <h1 className="mb-6 text-2xl font-bold text-gray-800">Resistencia al Corte</h1>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "mc" && <TabMohrCoulomb />}
        {tab === "circulo" && <TabCirculoMohr />}
        {tab === "directo" && <TabCorteDirecto />}
        {tab === "triaxial" && (
          <TabProximamente
            titulo="Ensayo Triaxial (UU, CU, CD)"
            descripcion="Cálculo de parámetros de resistencia a partir de ensayos triaxiales no consolidado-no drenado (UU), consolidado-no drenado (CU) y consolidado-drenado (CD)."
          />
        )}
      </main>
    </div>
  )
}
