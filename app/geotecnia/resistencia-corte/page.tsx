"use client"

import { useMemo, useState } from "react"
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
          <text x={W - MR} y={H - MB + 18} textAnchor="end" fontSize="9" fill="#6b7280">
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
        {tab === "directo" && (
          <TabProximamente
            titulo="Corte directo (NC y SC)"
            descripcion="Cálculo punto a punto y regresión lineal τ vs σ' a partir de varios ensayos de corte directo, para condiciones normalmente consolidada (NC) y sobreconsolidada (SC)."
          />
        )}
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
