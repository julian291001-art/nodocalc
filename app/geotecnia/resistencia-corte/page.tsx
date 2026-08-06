"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
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
  label: ReactNode
  value: string
  unit?: string
  color?: Color
}) {
  return (
    <div className={`rounded-xl border p-4 ${tileClasses[color]}`}>
      <p className="text-[11px] font-semibold tracking-wide opacity-80">{label}</p>
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
  const cMostrado = aMostrar(r.cBase, unidad)

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
        <ChartXY
          xLabel={`σ' (${unidad})`}
          yLabel={`τ (${unidad})`}
          series={[{ label: "Estado evaluado", color: "#f59e0b", mode: "scatter", points: [{ x: aMostrar(r.sigmaBase, unidad), y: tauMostrado }] }]}
          regressionLines={[{ color: "#2563eb", pendiente: Math.tan(r.phiRad), intercepto: cMostrado }]}
        />
        <p className="mt-2 text-center text-xs text-gray-500">Punto naranja: estado (σ', τ) evaluado</p>
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

  // --- datos para el gráfico (ChartXY) ---
  const sigmaPromM = aMostrar(r.sigmaProm, unidad)
  const RM = aMostrar(r.R, unidad)
  const circuloPuntos = Array.from({ length: 73 }, (_, i) => {
    const t = (i / 72) * 2 * Math.PI
    return { x: sigmaPromM + RM * Math.cos(t), y: RM * Math.sin(t) }
  })
  const seriesCirculo: { label: string; color: string; mode: "line" | "scatter"; points: { x: number; y: number }[] }[] = [
    { label: "Círculo de Mohr", color: "#2563eb", mode: "line", points: circuloPuntos },
    {
      label: "σ'₁, σ'₃",
      color: "#374151",
      mode: "scatter",
      points: [
        { x: aMostrar(r.s1, unidad), y: 0 },
        { x: aMostrar(r.s3, unidad), y: 0 },
      ],
    },
  ]
  if (incluirPlano && r.sigmaAlpha !== null && r.tauAlpha !== null) {
    seriesCirculo.push({
      label: `Plano α=${alpha}°`,
      color: "#f59e0b",
      mode: "scatter",
      points: [{ x: aMostrar(r.sigmaAlpha, unidad), y: aMostrar(r.tauAlpha, unidad) }],
    })
  }
  const regressionLinesCirculo = incluirEnvolvente
    ? [{ color: "#dc2626", pendiente: Math.tan(r.phiRad), intercepto: aMostrar(r.cBase, unidad) }]
    : []

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
            label={
              <>
                Esfuerzo promedio σ'<sub>prom</sub>
              </>
            }
            value={fmt(aMostrar(r.sigmaProm, unidad))}
            unit={unidad}
            color="gray"
          />
          <MetricTile
            label={
              <>
                Radio / τ<sub>max</sub>
              </>
            }
            value={fmt(aMostrar(r.R, unidad))}
            unit={unidad}
            color="blue"
          />
          {incluirEnvolvente && (
            <>
              <MetricTile
                label={
                  <>
                    Plano de falla teórico θ<sub>f</sub>
                  </>
                }
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
        <ChartXY
          xLabel={`σ' (${unidad})`}
          yLabel={`τ (${unidad})`}
          series={seriesCirculo}
          regressionLines={regressionLinesCirculo}
          escalaIgual
        />
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
  width = 700,
  height = 300,
  escalaIgual = false,
}: {
  series: { label: string; color: string; points: { x: number; y: number }[]; mode?: "line" | "scatter" }[]
  regressionLines?: { color: string; pendiente: number; intercepto: number }[]
  xLabel: string
  yLabel: string
  width?: number
  height?: number
  escalaIgual?: boolean
}) {
  const [hoverX, setHoverX] = useState<number | null>(null)

  const ML = 64,
    MB = 40,
    MT = 15,
    MR = 15
  const plotW = width - ML - MR
  const plotH = height - MB - MT

  const allPoints = series.flatMap((s) => s.points)
  const allX = allPoints.map((p) => p.x)
  const allY = allPoints.map((p) => p.y)

  const xMax = (allX.length ? Math.max(...allX, 0) : 1) * 1.1 || 1
  const xMin = Math.min(0, ...(allX.length ? allX : [0]))

  const yCandidates = allY.length ? [...allY] : [0, 1]
  regressionLines.forEach((r) => {
    yCandidates.push(r.pendiente * xMin + r.intercepto)
  })
  const yMax = Math.max(...yCandidates, 0) * 1.15 || 1
  const yMin = Math.min(0, ...yCandidates)

  // Escala independiente por defecto; escala uniforme (misma px/unidad en X e Y)
  // cuando escalaIgual=true, necesaria para que un círculo no se vea como elipse.
  const scaleXBase = plotW / (xMax - xMin || 1)
  const scaleYBase = plotH / (yMax - yMin || 1)
  const scaleUniforme = Math.min(scaleXBase, scaleYBase)
  const scaleX = escalaIgual ? scaleUniforme : scaleXBase
  const scaleY = escalaIgual ? scaleUniforme : scaleYBase

  const usedW = (xMax - xMin) * scaleX
  const usedH = (yMax - yMin) * scaleY
  const offsetLeft = ML + (escalaIgual ? (plotW - usedW) / 2 : 0)
  const offsetBottom = height - MB - (escalaIgual ? (plotH - usedH) / 2 : 0)

  const toX = (x: number) => offsetLeft + (x - xMin) * scaleX
  const toY = (y: number) => offsetBottom - (y - yMin) * scaleY
  const fromX = (px: number) => xMin + (px - offsetLeft) / scaleX

  const NTICKS = 5
  const xTicks = Array.from({ length: NTICKS + 1 }, (_, i) => xMin + ((xMax - xMin) * i) / NTICKS)
  const yTicks = Array.from({ length: NTICKS + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / NTICKS)

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    setHoverX(fromX(px))
  }

  // Para cada serie, el punto real de la curva más cercano (en X) al cursor —
  // no la posición libre del mouse.
  const coincidencias =
    hoverX === null
      ? []
      : series
          .filter((s) => s.points.length > 0)
          .map((s) => {
            let mejor = s.points[0]
            let mejorDist = Math.abs(mejor.x - hoverX)
            for (const p of s.points) {
              const d = Math.abs(p.x - hoverX)
              if (d < mejorDist) {
                mejorDist = d
                mejor = p
              }
            }
            return { color: s.color, label: s.label, punto: mejor }
          })

  const tooltipX = coincidencias.length ? toX(coincidencias[0].punto.x) : 0
  const tooltipAncho = 130
  const tooltipAlto = 16 + coincidencias.length * 14
  const tooltipPosX = Math.min(Math.max(tooltipX + 10, ML), width - MR - tooltipAncho)
  const tooltipPosY = MT + 6

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" onMouseLeave={() => setHoverX(null)}>
      {yTicks.map((t, i) => (
        <g key={`y-${i}`}>
          <line x1={ML} y1={toY(t)} x2={width - MR} y2={toY(t)} stroke="#f3f4f6" strokeWidth={1} />
          <text x={ML - 8} y={toY(t) + 3} textAnchor="end" fontSize="8" fill="#9ca3af">
            {fmt(t, Math.abs(t) < 10 ? 2 : 0)}
          </text>
        </g>
      ))}
      {xTicks.map((t, i) => (
        <g key={`x-${i}`}>
          <line x1={toX(t)} y1={MT} x2={toX(t)} y2={height - MB} stroke="#f3f4f6" strokeWidth={1} />
          <text x={toX(t)} y={height - MB + 14} textAnchor="middle" fontSize="8" fill="#9ca3af">
            {fmt(t, Math.abs(t) < 10 ? 2 : 0)}
          </text>
        </g>
      ))}

      <rect x={ML} y={MT} width={plotW} height={plotH} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      <line x1={ML} y1={toY(0)} x2={width - MR} y2={toY(0)} stroke="#9ca3af" strokeWidth={1.25} />
      <line x1={toX(0)} y1={MT} x2={toX(0)} y2={height - MB} stroke="#9ca3af" strokeWidth={1.25} />

      <text x={ML + plotW / 2} y={height - 6} textAnchor="middle" fontSize="9" fill="#6b7280">
        {xLabel}
      </text>
      <text
        x={16}
        y={MT + plotH / 2}
        textAnchor="middle"
        fontSize="9"
        fill="#6b7280"
        transform={`rotate(-90, 16, ${MT + plotH / 2})`}
      >
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
              <circle key={pi} cx={toX(p.x)} cy={toY(p.y)} r={4} fill={s.color} stroke="#fff" strokeWidth={1} />
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

      <rect
        x={ML}
        y={MT}
        width={plotW}
        height={plotH}
        fill="transparent"
        onMouseMove={handleMove}
        style={{ cursor: "crosshair" }}
      />

      {coincidencias.length > 0 && (
        <g pointerEvents="none">
          <line
            x1={toX(coincidencias[0].punto.x)}
            y1={MT}
            x2={toX(coincidencias[0].punto.x)}
            y2={height - MB}
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {coincidencias.map((c, i) => (
            <circle
              key={i}
              cx={toX(c.punto.x)}
              cy={toY(c.punto.y)}
              r={4.5}
              fill={c.color}
              stroke="#fff"
              strokeWidth={1.5}
            />
          ))}

          <rect
            x={tooltipPosX}
            y={tooltipPosY}
            width={tooltipAncho}
            height={tooltipAlto}
            rx={4}
            fill="#111827"
            opacity={0.9}
          />
          {coincidencias.map((c, i) => (
            <text key={i} x={tooltipPosX + 8} y={tooltipPosY + 14 + i * 14} fontSize="8.5" fill="#fff">
              <tspan fill={c.color}>● </tspan>
              {c.label}: {fmt(c.punto.x, 2)}, {fmt(c.punto.y, 2)}
            </text>
          ))}
        </g>
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

type MetodoCorreccion = "porLectura" | "picoFijo" | "sinCorreccion"

// Calcula el área corregida (traslape circular o rectángulo cuadrado) para un
// desplazamiento horizontal dado.
function calcularAreaCorregida(forma: Forma, dimBase: number, deltaBase: number, A0: number): number {
  if (forma === "circular") {
    const ratio = Math.min(Math.max(deltaBase / dimBase, -0.999), 0.999)
    const theta = Math.acos(ratio)
    return (dimBase * dimBase / 2) * (theta - ratio * Math.sin(theta))
  }
  return Math.max(dimBase * (dimBase - deltaBase), A0 * 0.001)
}

function calcularMuestra(m: Muestra, metodo: MetodoCorreccion) {
  const dimBase = convLongitud.aBase(m.dimension, m.unidadLongitud) // m
  const A0 = m.forma === "circular" ? (Math.PI * dimBase * dimBase) / 4 : dimBase * dimBase // m²
  const masaBase = convMasa.aBase(m.masa, m.unidadMasa) // kg
  const peso = masaBase * GRAVEDAD // N
  const P = peso * (m.usaBrazo ? m.relacionBrazo || 1 : 1) // N normal aplicado

  // Deformación en el punto de fuerza máxima (pico) — la usa el método "picoFijo"
  let filaPicoRaw: FilaEnsayo | null = null
  for (const f of m.datos) if (!filaPicoRaw || f.fuerza > filaPicoRaw.fuerza) filaPicoRaw = f
  const deformacionEnPico = filaPicoRaw ? filaPicoRaw.defHorizontal : 0
  const deltaPicoBase = convLongitud.aBase(deformacionEnPico, m.unidadLongitud)
  const AcPicoFijo = calcularAreaCorregida(m.forma, dimBase, deltaPicoBase, A0)

  const filas: FilaCalculada[] = m.datos.map((f) => {
    const deltaBase = convLongitud.aBase(f.defHorizontal, m.unidadLongitud)
    let Ac: number
    if (metodo === "sinCorreccion") Ac = A0
    else if (metodo === "picoFijo") Ac = AcPicoFijo
    else Ac = calcularAreaCorregida(m.forma, dimBase, deltaBase, A0) // porLectura

    const fuerzaBase = convFuerza.aBase(f.fuerza, m.unidadFuerza) // N
    const sigmaCorr = Ac > 0 ? P / Ac : 0
    const tauCorr = Ac > 0 ? fuerzaBase / Ac : 0
    return { ...f, Ac, sigmaCorr, tauCorr }
  })

  let pico: FilaCalculada | null = null
  for (const f of filas) if (!pico || f.tauCorr > pico.tauCorr) pico = f
  const residual: FilaCalculada | null = filas.length ? filas[filas.length - 1] : null

  return { A0, P, filas, deformacionEnPico, pico, residual }
}

function TabCorteDirecto() {
  const [muestras, setMuestras] = useState<Muestra[]>([nuevaMuestra()])
  const [unidadResultados, setUnidadResultados] = useState("kPa")
  const [metodoCorreccion, setMetodoCorreccion] = useState<MetodoCorreccion>("picoFijo")

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
    () =>
      muestras.map((m, i) => ({
        muestra: m,
        color: PALETA_MUESTRAS[i % PALETA_MUESTRAS.length],
        calc: calcularMuestra(m, metodoCorreccion),
      })),
    [muestras, metodoCorreccion]
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
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Método de corrección de área</label>
          <select
            value={metodoCorreccion}
            onChange={(e) => setMetodoCorreccion(e.target.value as MetodoCorreccion)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700"
          >
            <option value="porLectura">Por lectura (recomendado, ASTM/IS 2720)</option>
            <option value="picoFijo">Fija en el pico</option>
            <option value="sinCorreccion">Sin corrección (área inicial)</option>
          </select>
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
                    label="Deformación en el pico"
                    value={fmt(r.calc.deformacionEnPico, 2)}
                    unit={m.unidadLongitud}
                    color="amber"
                  />
                  <MetricTile
                    label="Área corregida Ac (en el pico)"
                    value={r.calc.pico ? fmt(r.calc.pico.Ac * 1e6, 1) : "—"}
                    unit="mm²"
                    color="amber"
                  />
                  <MetricTile
                    label="σ' corregido (en el pico)"
                    value={r.calc.pico ? fmt(convEsfuerzo.aMostrar(r.calc.pico.sigmaCorr, unidadResultados)) : "—"}
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
                  <th className="px-3 py-2">σ' pico ({unidadResultados})</th>
                  <th className="px-3 py-2">τ pico ({unidadResultados})</th>
                  <th className="px-3 py-2">σ' residual ({unidadResultados})</th>
                  <th className="px-3 py-2">τ residual ({unidadResultados})</th>
                </tr>
              </thead>
              <tbody>
                {conDatos.map((r) => (
                  <tr key={r.muestra.id} className="border-t border-gray-100 text-gray-700">
                    <td className="px-3 py-1.5 font-medium">{r.muestra.nombre}</td>
                    <td className="px-3 py-1.5">
                      {r.calc.pico ? fmt(convEsfuerzo.aMostrar(r.calc.pico.sigmaCorr, unidadResultados)) : "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.calc.pico ? fmt(convEsfuerzo.aMostrar(r.calc.pico.tauCorr, unidadResultados)) : "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.calc.residual ? fmt(convEsfuerzo.aMostrar(r.calc.residual.sigmaCorr, unidadResultados)) : "—"}
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

          <div className="mt-6 space-y-8">
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
              <h4 className="mb-2 text-center text-xs font-semibold text-gray-600">
                Def. horizontal vs Def. normal (%) — dilatancia
              </h4>
              <ChartXY
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
// PESTAÑA 4: Triaxial (UU, CU, CD)
// ---------------------------------------------------------------------------
type TipoTriaxial = "UU" | "CU" | "CD"

interface FilaTriaxial {
  defLectura: number // mm
  carga: number // kgf
  u?: number // kPa (solo CU)
  cambioVolumen?: number // cm³ (solo CD)
}

interface MuestraTriaxial {
  id: string
  nombre: string
  diametro: number // cm
  altura: number // cm
  masa: number // g
  p1: number // g (tara + suelo húmedo)
  p2: number // g (tara + suelo seco)
  p3: number // g (tara)
  presionCamara: number
  unidadPresion: string
  archivoNombre: string
  datos: FilaTriaxial[]
}

let contadorMuestrasTriaxial = 1
function nuevaMuestraTriaxial(): MuestraTriaxial {
  const n = contadorMuestrasTriaxial++
  return {
    id: `t${n}-${Date.now()}`,
    nombre: `M${n}`,
    diametro: 3.65,
    altura: 7.15,
    masa: 110,
    p1: 100,
    p2: 60,
    p3: 5,
    presionCamara: 1,
    unidadPresion: "kgf/cm²",
    archivoNombre: "",
    datos: [],
  }
}

interface FilaTriaxialCalculada extends FilaTriaxial {
  epsilonA: number
  Ac: number // cm²
  qKPa: number
  sigma1Total: number // kPa
  sigma3Total: number // kPa
  sigma1Efectivo: number // kPa
  sigma3Efectivo: number // kPa
}

function calcularMuestraTriaxial(m: MuestraTriaxial, tipo: TipoTriaxial) {
  const A0 = (Math.PI * m.diametro * m.diametro) / 4 // cm²
  const V0 = A0 * m.altura // cm³
  const alturaMm = m.altura * 10

  const w = ((m.p1 - m.p2) / (m.p2 - m.p3)) * 100
  const V0m3 = V0 / 1e6
  const masaKg = m.masa / 1000
  const gammaH = (masaKg * GRAVEDAD) / V0m3 / 1000 // kN/m³
  const gammaD = gammaH / (1 + w / 100)

  const sigma3KPa = convEsfuerzo.aBase(m.presionCamara, m.unidadPresion) / 1000

  const filas: FilaTriaxialCalculada[] = m.datos.map((f) => {
    const epsilonA = f.defLectura / alturaMm
    let Ac: number
    if (tipo === "CD" && f.cambioVolumen !== undefined) {
      const epsilonV = f.cambioVolumen / V0
      Ac = (A0 * (1 - epsilonV)) / (1 - epsilonA)
    } else {
      Ac = A0 / (1 - epsilonA) // volumen constante (UU y CU no drenan durante el corte)
    }
    const sigmaKgfCm2 = Ac > 0 ? f.carga / Ac : 0
    const qKPa = sigmaKgfCm2 * 98.0665
    const sigma1Total = sigma3KPa + qKPa
    const uKPa = tipo === "CU" ? f.u ?? 0 : 0
    return {
      ...f,
      epsilonA,
      Ac,
      qKPa,
      sigma1Total,
      sigma3Total: sigma3KPa,
      sigma1Efectivo: sigma1Total - uKPa,
      sigma3Efectivo: sigma3KPa - uKPa,
    }
  })

  let falla: FilaTriaxialCalculada | null = null
  for (const f of filas) if (!falla || f.qKPa > falla.qKPa) falla = f

  return { A0, V0, w, gammaH, gammaD, sigma3KPa, filas, falla }
}

// Línea Kf (p-q): sin φ = pendiente, c = intercepto / cos φ
function calcularEnvolventeKf(puntos: { p: number; q: number }[]) {
  const reg = regresionLineal(puntos.map((pt) => ({ x: pt.p, y: pt.q })))
  const phi = Math.asin(Math.max(-1, Math.min(1, reg.pendiente)))
  const c = reg.intercepto / Math.cos(phi)
  return { pendiente: reg.pendiente, intercepto: reg.intercepto, r2: reg.r2, phiGrados: (phi * 180) / Math.PI, c }
}

async function parsearExcelTriaxial(file: File, tipo: TipoTriaxial): Promise<FilaTriaxial[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  const idxEnc = rows.findIndex(
    (r) => Array.isArray(r) && r.some((c) => typeof c === "string" && c.toLowerCase().includes("lectura"))
  )
  if (idxEnc === -1) return []

  const datos: FilaTriaxial[] = []
  for (let i = idxEnc + 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r) continue
    const defLectura = parseFloat(r[0])
    if (!isFinite(defLectura)) continue
    const carga = parseFloat(r[1])
    const extra = parseFloat(r[2])
    datos.push({
      defLectura,
      carga: isFinite(carga) ? carga : 0,
      u: tipo === "CU" ? (isFinite(extra) ? extra : 0) : undefined,
      cambioVolumen: tipo === "CD" ? (isFinite(extra) ? extra : 0) : undefined,
    })
  }
  return datos
}

function columnasTriaxial(tipo: TipoTriaxial): string[] {
  if (tipo === "UU") return ["Def. lectura (mm)", "Carga (kgf)"]
  if (tipo === "CU") return ["Def. lectura (mm)", "Carga (kgf)", "Presión de poros u (kPa)"]
  return ["Def. lectura (mm)", "Carga (kgf)", "Cambio de volumen (cm³)"]
}

function descargarPlantillaTriaxial(tipo: TipoTriaxial) {
  const columnas = columnasTriaxial(tipo)
  const ejemploFila = tipo === "UU" ? [0.1, 12.4] : tipo === "CU" ? [0.1, 12.4, 8.2] : [0.1, 12.4, 0.15]

  const wb = XLSX.utils.book_new()
  const filas: (string | number)[][] = [
    [`Plantilla de datos - Ensayo Triaxial ${tipo} (NodoCalc)`],
    ["Instrucciones: complete una fila por cada lectura del ensayo. No modifique los encabezados."],
    [],
    columnas,
    ejemploFila,
  ]
  const ws = XLSX.utils.aoa_to_sheet(filas)
  ws["!cols"] = columnas.map(() => ({ wch: 22 }))
  XLSX.utils.book_append_sheet(wb, ws, `Triaxial ${tipo}`)
  XLSX.writeFile(wb, `plantilla_triaxial_${tipo.toLowerCase()}.xlsx`)
}

// Curva sintética (hipérbola de Kondner) — solo para el botón "Cargar ejemplo",
// no son datos reales de laboratorio.
function generarMuestrasEjemploTriaxial(tipo: TipoTriaxial): MuestraTriaxial[] {
  const sigma3Valores = [0.5, 1, 2]
  const D = 3.65
  const H = 7.15
  const V0 = ((Math.PI * D * D) / 4) * H

  return sigma3Valores.map((sigma3, index) => {
    const qUlt = 60 + sigma3 * 140 // kPa
    const Ei = qUlt / 0.01
    const nPuntos = 30
    const datos: FilaTriaxial[] = []
    for (let i = 1; i <= nPuntos; i++) {
      const epsilon = (i / nPuntos) * 0.18
      const q = epsilon / (1 / Ei + epsilon / qUlt)
      const Ac = (Math.PI * D * D) / 4 / (1 - epsilon)
      const carga = (q / 98.0665) * Ac
      const defLectura = epsilon * H * 10

      let u: number | undefined
      let cambioVolumen: number | undefined
      if (tipo === "CU") {
        const uUlt = sigma3 * 98.0665 * 0.55
        u = epsilon / (1 / (Ei * 0.6) + epsilon / uUlt)
      }
      if (tipo === "CD") {
        cambioVolumen = V0 * (0.03 * epsilon - 0.05 * epsilon * epsilon)
      }
      datos.push({ defLectura, carga, u, cambioVolumen })
    }
    return {
      ...nuevaMuestraTriaxial(),
      nombre: `M${index + 1}`,
      diametro: D,
      altura: H,
      masa: 110 + index * 3,
      p1: 105 + index,
      p2: 63 + index,
      p3: 5.4,
      presionCamara: sigma3,
      unidadPresion: "kgf/cm²",
      archivoNombre: "ejemplo_triaxial.xlsx",
      datos,
    }
  })
}

function TabTriaxial() {
  const [tipo, setTipo] = useState<TipoTriaxial>("UU")
  const [muestras, setMuestras] = useState<MuestraTriaxial[]>([nuevaMuestraTriaxial()])
  const [unidadResultados, setUnidadResultados] = useState("kPa")

  function cambiarTipo(nuevo: TipoTriaxial) {
    setTipo(nuevo)
    setMuestras([nuevaMuestraTriaxial()]) // las columnas de datos cambian según el tipo
  }
  function agregarMuestra() {
    setMuestras((prev) => [...prev, nuevaMuestraTriaxial()])
  }
  function eliminarMuestra(id: string) {
    setMuestras((prev) => prev.filter((m) => m.id !== id))
  }
  function actualizarMuestra(id: string, cambios: Partial<MuestraTriaxial>) {
    setMuestras((prev) => prev.map((m) => (m.id === id ? { ...m, ...cambios } : m)))
  }
  async function cargarExcel(id: string, file: File) {
    const datos = await parsearExcelTriaxial(file, tipo)
    actualizarMuestra(id, { datos, archivoNombre: file.name })
  }
  function cargarEjemplo() {
    setMuestras(generarMuestrasEjemploTriaxial(tipo))
  }

  const resultados = useMemo(
    () =>
      muestras.map((m, i) => ({
        muestra: m,
        color: PALETA_MUESTRAS[i % PALETA_MUESTRAS.length],
        calc: calcularMuestraTriaxial(m, tipo),
      })),
    [muestras, tipo]
  )
  const conDatos = resultados.filter((r) => r.calc.filas.length > 0 && r.calc.falla)

  const gruposEnvolvente: { clave: "total" | "efectivo"; titulo: string }[] =
    tipo === "UU"
      ? [{ clave: "total", titulo: "Esfuerzos totales (Cu, φ ≈ 0 esperado si está saturado)" }]
      : tipo === "CD"
      ? [{ clave: "efectivo", titulo: "Esfuerzos efectivos (u = 0, ensayo drenado)" }]
      : [
          { clave: "total", titulo: "Esfuerzos totales" },
          { clave: "efectivo", titulo: "Esfuerzos efectivos" },
        ]

  function puntosPQ(clave: "total" | "efectivo") {
    return conDatos.map((r) => {
      const f = r.calc.falla!
      const s1 = clave === "total" ? f.sigma1Total : f.sigma1Efectivo
      const s3 = clave === "total" ? f.sigma3Total : f.sigma3Efectivo
      return { muestra: r.muestra.nombre, color: r.color, p: (s1 + s3) / 2, q: (s1 - s3) / 2 }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Tipo de ensayo</label>
          <select
            value={tipo}
            onChange={(e) => cambiarTipo(e.target.value as TipoTriaxial)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
          >
            <option value="UU">UU — No consolidado, no drenado</option>
            <option value="CU">CU — Consolidado, no drenado</option>
            <option value="CD">CD — Consolidado, drenado</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => descargarPlantillaTriaxial(tipo)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600"
          >
            Descargar plantilla ({tipo})
          </button>
          <button
            onClick={cargarEjemplo}
            className="rounded-lg bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            Cargar ejemplo (3 muestras, sintético)
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Cambiar el tipo de ensayo reinicia las muestras cargadas, porque las columnas de datos requeridas son distintas.
      </p>

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

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <NumberInput label="Diámetro D (cm)" value={m.diametro} onChange={(v) => actualizarMuestra(m.id, { diametro: v })} />
              <NumberInput label="Altura H (cm)" value={m.altura} onChange={(v) => actualizarMuestra(m.id, { altura: v })} />
              <NumberInput label="Masa húmeda (g)" value={m.masa} onChange={(v) => actualizarMuestra(m.id, { masa: v })} />
              <NumberInput label="P1: tara + suelo húmedo (g)" value={m.p1} onChange={(v) => actualizarMuestra(m.id, { p1: v })} />
              <NumberInput label="P2: tara + suelo seco (g)" value={m.p2} onChange={(v) => actualizarMuestra(m.id, { p2: v })} />
              <NumberInput label="P3: tara (g)" value={m.p3} onChange={(v) => actualizarMuestra(m.id, { p3: v })} />
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Presión de cámara σ₃</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={m.presionCamara}
                    onChange={(e) => actualizarMuestra(m.id, { presionCamara: parseFloat(e.target.value) })}
                    className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                  />
                  <UnidadSelector value={m.unidadPresion} onChange={(v) => actualizarMuestra(m.id, { unidadPresion: v })} />
                </div>
              </div>

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
              {m.datos.length > 0 && <span className="text-xs text-gray-500">{m.datos.length} filas cargadas</span>}
            </div>

            {m.datos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MetricTile label="Contenido de agua w" value={fmt(r.calc.w)} unit="%" color="gray" />
                <MetricTile
                  label={
                    <>
                      γ<sub>húmedo</sub>
                    </>
                  }
                  value={fmt(r.calc.gammaH)}
                  unit="kN/m³"
                  color="gray"
                />
                <MetricTile
                  label={
                    <>
                      γ<sub>seco</sub>
                    </>
                  }
                  value={fmt(r.calc.gammaD)}
                  unit="kN/m³"
                  color="gray"
                />
                <MetricTile label="Área inicial A₀" value={fmt(r.calc.A0)} unit="cm²" color="gray" />
                <MetricTile
                  label={
                    <>
                      q<sub>max</sub> (falla)
                    </>
                  }
                  value={r.calc.falla ? fmt(convEsfuerzo.aMostrar(r.calc.falla.qKPa * 1000, unidadResultados)) : "—"}
                  unit={unidadResultados}
                  color="blue"
                />
                <MetricTile
                  label={
                    <>
                      ε<sub>a</sub> en la falla
                    </>
                  }
                  value={r.calc.falla ? fmt(r.calc.falla.epsilonA * 100) : "—"}
                  unit="%"
                  color="amber"
                />
              </div>
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

      {conDatos.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Curva esfuerzo-deformación</h3>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Unidad de resultados</label>
              <UnidadSelector value={unidadResultados} onChange={setUnidadResultados} />
            </div>
          </div>
          <ChartXY
            xLabel="Deformación unitaria εₐ (%)"
            yLabel={`q (${unidadResultados})`}
            series={conDatos.map((r) => ({
              label: r.muestra.nombre,
              color: r.color,
              mode: "line" as const,
              points: r.calc.filas.map((f) => ({
                x: f.epsilonA * 100,
                y: convEsfuerzo.aMostrar(f.qKPa * 1000, unidadResultados),
              })),
            }))}
          />
          <Leyenda items={conDatos.map((r) => ({ color: r.color, label: r.muestra.nombre }))} />
        </div>
      )}

      {conDatos.length >= 2 &&
        gruposEnvolvente.map((grupo) => {
          const puntos = puntosPQ(grupo.clave)
          const kf = calcularEnvolventeKf(puntos.map((pt) => ({ p: pt.p, q: pt.q })))
          const puntosMostrados = puntos.map((pt) => ({
            x: convEsfuerzo.aMostrar(pt.p * 1000, unidadResultados),
            y: convEsfuerzo.aMostrar(pt.q * 1000, unidadResultados),
          }))
          const pendienteMostrada = kf.pendiente // adimensional, no depende de la unidad
          const interceptoMostrado = convEsfuerzo.aMostrar(kf.intercepto * 1000, unidadResultados)
          const cMostrado = convEsfuerzo.aMostrar(kf.c * 1000, unidadResultados)

          return (
            <div key={grupo.clave} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">{grupo.titulo}</h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricTile
                  label={grupo.clave === "total" ? "c (cohesión)" : "c' (cohesión efectiva)"}
                  value={fmt(cMostrado)}
                  unit={unidadResultados}
                  color="blue"
                />
                <MetricTile
                  label={grupo.clave === "total" ? "φ" : "φ'"}
                  value={fmt(kf.phiGrados, 2)}
                  unit="°"
                  color="blue"
                />
                <MetricTile label="Pendiente línea Kf" value={fmt(pendienteMostrada, 4)} color="gray" />
                <MetricTile label="R²" value={fmt(kf.r2, 3)} color="gray" />
              </div>

              <div className="mt-6">
                <ChartXY
                  xLabel={`p = (σ₁+σ₃)/2  (${unidadResultados})`}
                  yLabel={`q = (σ₁−σ₃)/2  (${unidadResultados})`}
                  series={[{ label: "Falla", color: "#2563eb", mode: "scatter", points: puntosMostrados }]}
                  regressionLines={[{ color: "#2563eb", pendiente: pendienteMostrada, intercepto: interceptoMostrado }]}
                />
              </div>
            </div>
          )
        })}

      {conDatos.length === 1 && (
        <p className="text-center text-xs text-gray-400">
          Agrega al menos una segunda muestra con datos cargados (a otra σ₃) para calcular la envolvente.
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
        {tab === "triaxial" && <TabTriaxial />}
      </main>
    </div>
  )
}
