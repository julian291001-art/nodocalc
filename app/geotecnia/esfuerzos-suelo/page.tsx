"use client"
import { useState, useMemo } from "react"
import Sidebar from "../../components/Sidebar"
import { conversiones } from "../../lib/conversiones"

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES Y UNIDADES
// ─────────────────────────────────────────────────────────────────────────────
const GAMMA_W = 9.81 // kN/m³ — convención del proyecto (g = 9.81 m/s²)

const CAT_LONG = "Longitud"
const CAT_PESOU = "Peso unitario"
const CAT_PRES = "Presión / Esfuerzo"
const CAT_FUERZA = "Fuerza"

function factorDe(categoria: string, unidad: string): number {
  const i = conversiones[categoria].unidades.indexOf(unidad)
  return conversiones[categoria].factores[i]
}
// Longitud y Peso unitario: bases m y kN/m³ respectivamente (factor 1 en conversiones.ts)
const aBaseLong = (v: number, u: string) => v * factorDe(CAT_LONG, u)
const aMostrarLong = (v: number, u: string) => v / factorDe(CAT_LONG, u)
const aBasePesoU = (v: number, u: string) => v * factorDe(CAT_PESOU, u)
const aMostrarPesoU = (v: number, u: string) => v / factorDe(CAT_PESOU, u)
// Presión: base Pa en conversiones.ts, pero internamente trabajamos en kPa (kN/m³ · m = kPa),
// así que kPa_base = valor_kPa; para mostrar en la unidad elegida convertimos kPa -> Pa (×1000) -> unidad
const aMostrarPresDesdeKPa = (vKPa: number, u: string) => (vKPa * 1000) / factorDe(CAT_PRES, u)
const aBasePresAKPa = (v: number, u: string) => (v * factorDe(CAT_PRES, u)) / 1000
// Fuerza: base N
const aBaseFuerza = (v: number, u: string) => v * factorDe(CAT_FUERZA, u)

const fmt = (x: number | undefined, dec = 3) =>
  x !== undefined && Number.isFinite(x) ? x.toFixed(dec) : "—"

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE RELACIONES DE FASE (subconjunto reducido, reutilizado de Herramientas → Fases)
// Solo variables índice y pesos unitarios: lo necesario para obtener γd y γsat por estrato.
// ─────────────────────────────────────────────────────────────────────────────
type VarKey = "Gs" | "e" | "n" | "w" | "S" | "gamma" | "gammad" | "gammasat" | "gammap"
type Vars = Partial<Record<VarKey, number>>

const VARS_FASES: { key: VarKey; labelHtml: string; esPorcentaje: boolean }[] = [
  { key: "Gs", labelHtml: "G<sub>s</sub>", esPorcentaje: false },
  { key: "e", labelHtml: "e", esPorcentaje: false },
  { key: "n", labelHtml: "n (%)", esPorcentaje: true },
  { key: "w", labelHtml: "w (%)", esPorcentaje: true },
  { key: "S", labelHtml: "S (%)", esPorcentaje: true },
]

function construirReglasSuelo(yw: number): { out: VarKey; inputs: VarKey[]; f: (v: Vars) => number }[] {
  return [
    { out: "n", inputs: ["e"], f: v => v.e! / (1 + v.e!) },
    { out: "e", inputs: ["n"], f: v => v.n! / (1 - v.n!) },
    { out: "e", inputs: ["S", "w", "Gs"], f: v => (v.w! * v.Gs!) / v.S! },
    { out: "S", inputs: ["e", "w", "Gs"], f: v => (v.w! * v.Gs!) / v.e! },
    { out: "w", inputs: ["S", "e", "Gs"], f: v => (v.S! * v.e!) / v.Gs! },
    { out: "Gs", inputs: ["S", "e", "w"], f: v => (v.S! * v.e!) / v.w! },
    { out: "gammad", inputs: ["Gs", "e"], f: v => (v.Gs! * yw) / (1 + v.e!) },
    { out: "e", inputs: ["Gs", "gammad"], f: v => (v.Gs! * yw) / v.gammad! - 1 },
    { out: "Gs", inputs: ["gammad", "e"], f: v => (v.gammad! * (1 + v.e!)) / yw },
    { out: "gammad", inputs: ["gamma", "w"], f: v => v.gamma! / (1 + v.w!) },
    { out: "gamma", inputs: ["gammad", "w"], f: v => v.gammad! * (1 + v.w!) },
    { out: "w", inputs: ["gamma", "gammad"], f: v => v.gamma! / v.gammad! - 1 },
    { out: "gammasat", inputs: ["Gs", "e"], f: v => ((v.Gs! + v.e!) * yw) / (1 + v.e!) },
    { out: "gammasat", inputs: ["gammad", "n"], f: v => v.gammad! + v.n! * yw },
    { out: "gammap", inputs: ["gammasat"], f: v => v.gammasat! - yw },
    { out: "gammasat", inputs: ["gammap"], f: v => v.gammap! + yw },
    { out: "gammap", inputs: ["Gs", "e"], f: v => ((v.Gs! - 1) * yw) / (1 + v.e!) },
    { out: "Gs", inputs: ["gammap", "e"], f: v => (v.gammap! * (1 + v.e!)) / yw + 1 },
    { out: "gamma", inputs: ["Gs", "S", "e"], f: v => ((v.Gs! + v.S! * v.e!) * yw) / (1 + v.e!) },
  ]
}

function resolverFasesSuelo(conocidos: Vars, yw: number): Vars {
  const vars: Vars = { ...conocidos }
  const reglas = construirReglasSuelo(yw)
  let cambio = true
  let iter = 0
  while (cambio && iter < 30) {
    cambio = false
    iter++
    for (const reg of reglas) {
      if (vars[reg.out] !== undefined) continue
      if (reg.inputs.every(k => vars[k] !== undefined && Number.isFinite(vars[k]!))) {
        const val = reg.f(vars)
        if (Number.isFinite(val)) {
          vars[reg.out] = val
          cambio = true
        }
      }
    }
  }
  return vars
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR NUMÉRICO — Boussinesq (1885) y Westergaard (1938, μ' = 0)
// Todas las cargas de área / línea / franja se obtienen integrando (superponiendo)
// numéricamente el núcleo de carga puntual — el mismo método con el que se deducen
// las soluciones cerradas clásicas (Newmark, etc.), lo que evita transcribir de
// memoria fórmulas cerradas distintas para cada geometría y cada teoría.
// ─────────────────────────────────────────────────────────────────────────────
type Kernel = (rho: number, z: number) => number

// Δσz por unidad de carga puntual (Q = 1), rho = distancia horizontal al punto de cálculo
const kernelBoussinesq: Kernel = (rho, z) => (3 * z ** 3) / (2 * Math.PI * (rho * rho + z * z) ** 2.5)
const kernelWestergaard: Kernel = (rho, z) => z / (Math.PI * (z * z + 2 * rho * rho) ** 1.5)

function kernelDe(teoria: Teoria): Kernel {
  return teoria === "boussinesq" ? kernelBoussinesq : kernelWestergaard
}

// Regla de Simpson compuesta
function simpson(f: (t: number) => number, a: number, b: number, N: number): number {
  if (N % 2 !== 0) N++
  const h = (b - a) / N
  let s = f(a) + f(b)
  for (let i = 1; i < N; i++) s += f(a + i * h) * (i % 2 === 0 ? 2 : 4)
  return (s * h) / 3
}

// Integral de una línea de carga infinita (dirección y), evaluada a distancia horizontal dx
// del punto de cálculo, a profundidad z. Sustitución y = z·tan(θ) para dominio infinito → finito.
function integralLineaInfinita(dx: number, z: number, kernel: Kernel): number {
  const thetaMax = Math.PI / 2 - 1e-4
  return simpson(theta => {
    const y = z * Math.tan(theta)
    const rho = Math.sqrt(dx * dx + y * y)
    const jac = z / Math.cos(theta) ** 2
    return kernel(rho, z) * jac
  }, -thetaMax, thetaMax, 220)
}

// Δσz para carga puntual Q a distancia horizontal r
function deltaSigmaPuntual(Q: number, r: number, z: number, kernel: Kernel): number {
  if (z <= 0) return NaN
  return Q * kernel(r, z)
}

// Δσz para carga lineal infinita q (fuerza/longitud), a distancia horizontal x
function deltaSigmaLinea(q: number, x: number, z: number, kernel: Kernel): number {
  if (z <= 0) return NaN
  return q * integralLineaInfinita(x, z, kernel)
}

// Δσz para franja de ancho B (infinita en y), centrada en x=0, evaluada a distancia x
// del eje de la franja. Sustitución arctan también en la integral externa (robusta para
// franjas muy anchas respecto a z).
function deltaSigmaFranja(q: number, x: number, B: number, z: number, kernel: Kernel): number {
  if (z <= 0) return NaN
  const sLow = -B / 2, sHigh = B / 2
  const uLow = Math.atan((sLow - x) / z), uHigh = Math.atan((sHigh - x) / z)
  const integral = simpson(u => {
    const s = x + z * Math.tan(u)
    const jac = z / Math.cos(u) ** 2
    return integralLineaInfinita(x - s, z, kernel) * jac
  }, uLow, uHigh, 200)
  return q * integral
}

// Integral 1D con sustitución arctan sobre un eje acotado [lo,hi], evaluada respecto a pCampo
function integralEjeSust(pCampo: number, lo: number, hi: number, z: number, f: (s: number) => number): number {
  const uLo = Math.atan((lo - pCampo) / z), uHi = Math.atan((hi - pCampo) / z)
  return simpson(u => {
    const s = pCampo + z * Math.tan(u)
    const jac = z / Math.cos(u) ** 2
    return f(s) * jac
  }, uLo, uHi, 90)
}

// Δσz para área circular de radio R, centrada en el origen, evaluada a distancia horizontal d
// del centro (por simetría circular, la respuesta solo depende de d, no del azimut).
function deltaSigmaCircular(q: number, d: number, R: number, z: number, kernel: Kernel): number {
  if (z <= 0) return NaN
  const integralRadial = (theta: number) => {
    const phiMax = Math.atan(R / z)
    return simpson(phi => {
      const r = z * Math.tan(phi)
      const rho = Math.sqrt(Math.max(0, d * d - 2 * d * r * Math.cos(theta) + r * r))
      const jac = z / Math.cos(phi) ** 2
      return kernel(rho, z) * r * jac
    }, 0, phiMax, 90)
  }
  const integral = simpson(theta => integralRadial(theta), 0, 2 * Math.PI, 90)
  return q * integral
}

// Δσz para área rectangular B×L (esquina en el origen), evaluada en el punto (xp,yp) del
// plano — puede estar dentro, en el borde o fuera del rectángulo (superposición automática
// vía la sustitución arctan, sin necesidad de dividir en subrectángulos a mano).
function deltaSigmaRectangular(q: number, xp: number, yp: number, B: number, L: number, z: number, kernel: Kernel): number {
  if (z <= 0) return NaN
  const integral = integralEjeSust(yp, 0, L, z, y =>
    integralEjeSust(xp, 0, B, z, x => kernel(Math.sqrt((xp - x) ** 2 + (yp - y) ** 2), z))
  )
  return q * integral
}

type Teoria = "boussinesq" | "westergaard"
type TipoCarga = "puntual" | "linea" | "circular" | "rectangular" | "franja"

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE ESTRATO Y PERFIL GEOSTÁTICO
// ─────────────────────────────────────────────────────────────────────────────
type Estrato = {
  id: string
  nombre: string
  espesor: string
  modoGamma: "directo" | "fases"
  gammaArriba: string // γ sobre el NF (o único, si no hay NF) — modo directo
  gammaAbajo: string // γsat bajo el NF — modo directo
  conocidos: Partial<Record<VarKey, boolean>>
  entradas: Partial<Record<VarKey, string>>
}

let contadorId = 0
function nuevoEstrato(nombre: string): Estrato {
  contadorId++
  return {
    id: `estrato-${contadorId}-${Date.now()}`,
    nombre,
    espesor: "",
    modoGamma: "directo",
    gammaArriba: "",
    gammaAbajo: "",
    conocidos: {},
    entradas: {},
  }
}

type EstratoResuelto = {
  id: string
  nombre: string
  zTop: number // m
  zBottom: number // m
  gammaArriba: number | undefined // kN/m³
  gammaAbajo: number | undefined // kN/m³
  fasesResueltas?: Vars
}

type PuntoPerfil = { z: number; sigmaV: number; u: number; sigmaEf: number; nota?: string }

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES DE UI
// ─────────────────────────────────────────────────────────────────────────────
function Campo({
  label, value, onChange, sufijo, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; sufijo?: string; placeholder?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="relative">
        <input type="number" step="any" value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-blue-300 bg-white rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:border-blue-500 pr-14" />
        {sufijo && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{sufijo}</span>}
      </div>
    </div>
  )
}

function Selector({ label, value, onChange, opciones }: { label: string; value: string; onChange: (v: string) => void; opciones: string[] }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-blue-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
        {opciones.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-700" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

function Tabs({ tabs, activo, onChange }: { tabs: { id: string; label: string }[]; activo: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-5">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
            ${activo === t.id ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GRÁFICO DE PERFIL (profundidad en eje Y, hacia abajo — convención geotécnica)
// ─────────────────────────────────────────────────────────────────────────────
function ChartPerfil({
  series, zMax, xLabel, width = 700, height = 380,
}: {
  series: { label: string; color: string; puntos: { z: number; v: number }[]; dash?: boolean }[]
  zMax: number
  xLabel: string
  width?: number
  height?: number
}) {
  const [hoverZ, setHoverZ] = useState<number | null>(null)
  const ML = 60, MB = 30, MT = 22, MR = 20
  const plotW = width - ML - MR
  const plotH = height - MB - MT

  const allV = series.flatMap(s => s.puntos.map(p => p.v))
  const vMaxRaw = allV.length ? Math.max(...allV, 0) : 1
  const vMinRaw = allV.length ? Math.min(...allV, 0) : 0
  const pad = (vMaxRaw - vMinRaw) * 0.1 || 1
  const vMax = vMaxRaw + pad
  const vMin = vMinRaw - pad

  const toX = (v: number) => ML + ((v - vMin) / (vMax - vMin || 1)) * plotW
  const toY = (z: number) => MT + (z / (zMax || 1)) * plotH
  const fromZ = (py: number) => ((py - MT) / plotH) * zMax

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const py = ((e.clientY - rect.top) / rect.height) * height
    setHoverZ(Math.max(0, Math.min(zMax, fromZ(py))))
  }

  const NTICKS = 5
  const vTicks = Array.from({ length: NTICKS + 1 }, (_, i) => vMin + ((vMax - vMin) * i) / NTICKS)
  const zTicks = Array.from({ length: NTICKS + 1 }, (_, i) => (zMax * i) / NTICKS)

  const coincidencias = hoverZ === null ? [] : series
    .filter(s => s.puntos.length > 0)
    .map(s => {
      // interpolación lineal exacta entre los puntos de quiebre (piecewise-lineal)
      const pts = [...s.puntos].sort((a, b) => a.z - b.z)
      let val = pts[0].v
      for (let i = 0; i < pts.length - 1; i++) {
        if (hoverZ >= pts[i].z && hoverZ <= pts[i + 1].z) {
          const t = (hoverZ - pts[i].z) / (pts[i + 1].z - pts[i].z || 1)
          val = pts[i].v + t * (pts[i + 1].v - pts[i].v)
          break
        }
        val = pts[pts.length - 1].v
      }
      return { color: s.color, label: s.label, val }
    })

  const tooltipY = hoverZ !== null ? toY(hoverZ) : 0
  const tooltipAncho = 150
  const tooltipAlto = 16 + coincidencias.length * 14
  const tooltipPosX = width - MR - tooltipAncho - 4
  const tooltipPosY = Math.min(Math.max(tooltipY - tooltipAlto / 2, MT), height - MB - tooltipAlto)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" onMouseLeave={() => setHoverZ(null)}>
      {vTicks.map((t, i) => (
        <g key={`v-${i}`}>
          <line x1={toX(t)} y1={MT} x2={toX(t)} y2={height - MB} stroke="#f3f4f6" strokeWidth={1} />
          <text x={toX(t)} y={MT - 8} textAnchor="middle" fontSize="8" fill="#9ca3af">{fmt(t, Math.abs(t) < 10 ? 2 : 0)}</text>
        </g>
      ))}
      {zTicks.map((t, i) => (
        <g key={`z-${i}`}>
          <line x1={ML} y1={toY(t)} x2={width - MR} y2={toY(t)} stroke="#f3f4f6" strokeWidth={1} />
          <text x={ML - 8} y={toY(t) + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{fmt(t, 2)}</text>
        </g>
      ))}
      <rect x={ML} y={MT} width={plotW} height={plotH} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      <line x1={toX(0)} y1={MT} x2={toX(0)} y2={height - MB} stroke="#9ca3af" strokeWidth={1.25} />

      <text x={width / 2} y={height - 4} textAnchor="middle" fontSize="9" fill="#6b7280">{xLabel}</text>
      <text x={14} y={MT + plotH / 2} textAnchor="middle" fontSize="9" fill="#6b7280" transform={`rotate(-90 14 ${MT + plotH / 2})`}>Profundidad</text>

      {series.map((s, si) => {
        const pts = [...s.puntos].sort((a, b) => a.z - b.z)
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.v)} ${toY(p.z)}`).join(" ")
        return (
          <path key={si} d={d} fill="none" stroke={s.color} strokeWidth={1.75}
            strokeDasharray={s.dash ? "4,3" : undefined} />
        )
      })}

      {hoverZ !== null && (
        <>
          <line x1={ML} y1={toY(hoverZ)} x2={width - MR} y2={toY(hoverZ)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,2" />
          {coincidencias.map((c, i) => (
            <circle key={i} cx={toX(c.val)} cy={toY(hoverZ)} r={3} fill={c.color} stroke="white" strokeWidth={1} />
          ))}
          <rect x={tooltipPosX} y={tooltipPosY} width={tooltipAncho} height={tooltipAlto} rx={4} fill="white" stroke="#e5e7eb" />
          <text x={tooltipPosX + 8} y={tooltipPosY + 12} fontSize="8" fill="#374151" fontWeight="600">z = {fmt(hoverZ, 2)} m</text>
          {coincidencias.map((c, i) => (
            <text key={i} x={tooltipPosX + 8} y={tooltipPosY + 26 + i * 14} fontSize="8" fill={c.color}>
              {c.label}: {fmt(c.val, 2)}
            </text>
          ))}
        </>
      )}

      <rect x={ML} y={MT} width={plotW} height={plotH} fill="transparent" onMouseMove={handleMove} />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GRÁFICO Δσz vs z (carga superficial)
// ─────────────────────────────────────────────────────────────────────────────
function ChartDeltaSigma({ puntos, width = 700, height = 320 }: { puntos: { z: number; v: number }[]; width?: number; height?: number }) {
  const [hoverZ, setHoverZ] = useState<number | null>(null)
  const ML = 64, MB = 34, MT = 15, MR = 15
  const plotW = width - ML - MR
  const plotH = height - MB - MT
  if (puntos.length === 0) return null
  const zMax = Math.max(...puntos.map(p => p.z))
  const vMax = Math.max(...puntos.map(p => p.v), 0) * 1.1 || 1

  const toX = (z: number) => ML + (z / (zMax || 1)) * plotW
  const toY = (v: number) => height - MB - (v / (vMax || 1)) * plotH
  const fromX = (px: number) => ((px - ML) / plotW) * zMax

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    setHoverZ(Math.max(0, Math.min(zMax, fromX(px))))
  }

  let mejor = puntos[0]
  if (hoverZ !== null) {
    let mejorDist = Math.abs(mejor.z - hoverZ)
    for (const p of puntos) {
      const d = Math.abs(p.z - hoverZ)
      if (d < mejorDist) { mejorDist = d; mejor = p }
    }
  }

  const NTICKS = 5
  const xTicks = Array.from({ length: NTICKS + 1 }, (_, i) => (zMax * i) / NTICKS)
  const yTicks = Array.from({ length: NTICKS + 1 }, (_, i) => (vMax * i) / NTICKS)

  const d = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.z)} ${toY(p.v)}`).join(" ")

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" onMouseLeave={() => setHoverZ(null)}>
      {yTicks.map((t, i) => (
        <g key={`y-${i}`}>
          <line x1={ML} y1={toY(t)} x2={width - MR} y2={toY(t)} stroke="#f3f4f6" strokeWidth={1} />
          <text x={ML - 8} y={toY(t) + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{fmt(t, 2)}</text>
        </g>
      ))}
      {xTicks.map((t, i) => (
        <g key={`x-${i}`}>
          <line x1={toX(t)} y1={MT} x2={toX(t)} y2={height - MB} stroke="#f3f4f6" strokeWidth={1} />
          <text x={toX(t)} y={height - MB + 14} textAnchor="middle" fontSize="8" fill="#9ca3af">{fmt(t, 2)}</text>
        </g>
      ))}
      <rect x={ML} y={MT} width={plotW} height={plotH} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      <text x={width / 2} y={height - 4} textAnchor="middle" fontSize="9" fill="#6b7280">Profundidad z (m)</text>
      <text x={14} y={MT + plotH / 2} textAnchor="middle" fontSize="9" fill="#6b7280" transform={`rotate(-90 14 ${MT + plotH / 2})`}>Δσz</text>

      <path d={d} fill="none" stroke="#7c3aed" strokeWidth={1.75} />

      {hoverZ !== null && (
        <>
          <line x1={toX(mejor.z)} y1={MT} x2={toX(mejor.z)} y2={height - MB} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,2" />
          <circle cx={toX(mejor.z)} cy={toY(mejor.v)} r={3.5} fill="#7c3aed" stroke="white" strokeWidth={1} />
          <rect x={Math.min(Math.max(toX(mejor.z) + 8, ML), width - MR - 110)} y={MT + 4} width={110} height={30} rx={4} fill="white" stroke="#e5e7eb" />
          <text x={Math.min(Math.max(toX(mejor.z) + 8, ML), width - MR - 110) + 6} y={MT + 16} fontSize="8" fill="#374151">z = {fmt(mejor.z, 2)} m</text>
          <text x={Math.min(Math.max(toX(mejor.z) + 8, ML), width - MR - 110) + 6} y={MT + 28} fontSize="8" fill="#7c3aed" fontWeight="600">Δσz = {fmt(mejor.v, 2)}</text>
        </>
      )}
      <rect x={ML} y={MT} width={plotW} height={plotH} fill="transparent" onMouseMove={handleMove} />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TARJETA DE ESTRATO
// ─────────────────────────────────────────────────────────────────────────────
function TarjetaEstrato({
  estrato, index, unidadLong, unidadPesoU, zTop, zBottom, nfActivo, nfDepth,
  onChange, onEliminar,
}: {
  estrato: Estrato; index: number; unidadLong: string; unidadPesoU: string
  zTop: number; zBottom: number // m, ya calculados (para saber si el NF corta la capa)
  nfActivo: boolean; nfDepth: number | null
  onChange: (e: Estrato) => void; onEliminar: () => void
}) {
  const set = (patch: Partial<Estrato>) => onChange({ ...estrato, ...patch })

  const nfCorta = nfActivo && nfDepth !== null && nfDepth > zTop && nfDepth < zBottom
  const todaSeca = !nfActivo || nfDepth === null || nfDepth >= zBottom
  const todaSaturada = nfActivo && nfDepth !== null && nfDepth <= zTop

  const fasesResueltas = useMemo(() => {
    if (estrato.modoGamma !== "fases") return undefined
    const conocidos: Vars = {}
    for (const v of VARS_FASES) {
      if (estrato.conocidos[v.key] && estrato.entradas[v.key]) {
        const num = parseFloat(estrato.entradas[v.key]!)
        if (Number.isFinite(num)) conocidos[v.key] = v.esPorcentaje ? num / 100 : num
      }
    }
    return resolverFasesSuelo(conocidos, GAMMA_W)
  }, [estrato.modoGamma, estrato.conocidos, estrato.entradas])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 rounded-full w-5 h-5 flex items-center justify-center">{index + 1}</span>
          <input value={estrato.nombre} onChange={e => set({ nombre: e.target.value })}
            className="text-sm font-medium text-gray-800 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none px-1" />
        </div>
        <button onClick={onEliminar} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Eliminar</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <Campo label="Espesor" value={estrato.espesor} onChange={v => set({ espesor: v })} sufijo={unidadLong} />
        <div className="col-span-2 sm:col-span-2">
          <div className="text-xs text-gray-500 mb-1">Profundidad (calculada)</div>
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            {fmt(aMostrarLong(zTop, unidadLong), 2)} — {fmt(aMostrarLong(zBottom, unidadLong), 2)} {unidadLong}
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input type="radio" checked={estrato.modoGamma === "directo"} onChange={() => set({ modoGamma: "directo" })} className="accent-blue-700" />
          Peso unitario directo
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input type="radio" checked={estrato.modoGamma === "fases"} onChange={() => set({ modoGamma: "fases" })} className="accent-blue-700" />
          Resolver por relaciones de fase
        </label>
      </div>

      {estrato.modoGamma === "directo" && (
        <div className="grid grid-cols-2 gap-3">
          {(todaSeca || nfCorta) && (
            <Campo label={nfCorta ? "γ sobre el NF" : "γ (peso unitario)"} value={estrato.gammaArriba}
              onChange={v => set({ gammaArriba: v })} sufijo={unidadPesoU} />
          )}
          {(todaSaturada || nfCorta) && (
            <Campo label="γsat (bajo el NF)" value={estrato.gammaAbajo}
              onChange={v => set({ gammaAbajo: v })} sufijo={unidadPesoU} />
          )}
        </div>
      )}

      {estrato.modoGamma === "fases" && (
        <div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
            {VARS_FASES.map(v => (
              <div key={v.key} className={`rounded-lg border px-2 py-1.5 ${estrato.conocidos[v.key] ? "border-blue-300 bg-blue-50" : "border-gray-200"}`}>
                <label className="flex items-center gap-1 text-[10px] text-gray-500 mb-1 cursor-pointer">
                  <input type="checkbox" checked={!!estrato.conocidos[v.key]}
                    onChange={e => set({ conocidos: { ...estrato.conocidos, [v.key]: e.target.checked } })}
                    className="w-3 h-3 accent-blue-700" />
                  <span dangerouslySetInnerHTML={{ __html: v.labelHtml }} />
                </label>
                <input type="number" step="any" disabled={!estrato.conocidos[v.key]}
                  value={estrato.entradas[v.key] ?? ""}
                  onChange={e => set({ entradas: { ...estrato.entradas, [v.key]: e.target.value } })}
                  className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs disabled:bg-gray-50 focus:outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500">
              γd = {fasesResueltas?.gammad !== undefined ? fmt(aMostrarPesoU(fasesResueltas.gammad, unidadPesoU), 2) + " " + unidadPesoU : "—"}
            </span>
            <span className="px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500">
              γ (si S conocido) = {fasesResueltas?.gamma !== undefined ? fmt(aMostrarPesoU(fasesResueltas.gamma, unidadPesoU), 2) + " " + unidadPesoU : "—"}
            </span>
            <span className="px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
              γsat = {fasesResueltas?.gammasat !== undefined ? fmt(aMostrarPesoU(fasesResueltas.gammasat, unidadPesoU), 2) + " " + unidadPesoU : "—"}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
            Sobre el NF se usa γ (si diste S) o γd (si no). Bajo el NF siempre se usa γsat.
            Con G<sub>s</sub> y e (o n) alcanza para resolver γd y γsat.
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function EsfuerzosSuelo() {
  const [tab, setTab] = useState("perfil")

  // ── unidades globales ──
  const [unidadLong, setUnidadLong] = useState("m")
  const [unidadPesoU, setUnidadPesoU] = useState("kN/m³")
  const [unidadPres, setUnidadPres] = useState("kPa")
  const [unidadFuerza, setUnidadFuerza] = useState("kN")

  // ── PESTAÑA 1: perfil geostático ──
  const [estratos, setEstratos] = useState<Estrato[]>([nuevoEstrato("Estrato 1")])
  const [nfActivo, setNfActivo] = useState(false)
  const [nfProfundidad, setNfProfundidad] = useState("")
  const [succionActiva, setSuccionActiva] = useState(false)
  const [alturaSuccion, setAlturaSuccion] = useState("")

  const estratosResueltos: EstratoResuelto[] = useMemo(() => {
    let z = 0
    return estratos.map(e => {
      const espesor = aBaseLong(parseFloat(e.espesor) || 0, unidadLong)
      const zTop = z
      const zBottom = z + espesor
      z = zBottom

      let gammaArriba: number | undefined
      let gammaAbajo: number | undefined
      let fasesResueltas: Vars | undefined

      if (e.modoGamma === "directo") {
        const ga = parseFloat(e.gammaArriba)
        const gs = parseFloat(e.gammaAbajo)
        gammaArriba = Number.isFinite(ga) ? aBasePesoU(ga, unidadPesoU) : undefined
        gammaAbajo = Number.isFinite(gs) ? aBasePesoU(gs, unidadPesoU) : undefined
      } else {
        const conocidos: Vars = {}
        for (const v of VARS_FASES) {
          if (e.conocidos[v.key] && e.entradas[v.key]) {
            const num = parseFloat(e.entradas[v.key]!)
            if (Number.isFinite(num)) conocidos[v.key] = v.esPorcentaje ? num / 100 : num
          }
        }
        fasesResueltas = resolverFasesSuelo(conocidos, GAMMA_W)
        gammaArriba = fasesResueltas.gamma ?? fasesResueltas.gammad
        gammaAbajo = fasesResueltas.gammasat
      }

      return { id: e.id, nombre: e.nombre, zTop, zBottom, gammaArriba, gammaAbajo, fasesResueltas }
    })
  }, [estratos, unidadLong, unidadPesoU])

  const zMaxPerfil = estratosResueltos.length ? estratosResueltos[estratosResueltos.length - 1].zBottom : 0
  const nfDepthBase = nfActivo && nfProfundidad !== "" ? aBaseLong(parseFloat(nfProfundidad) || 0, unidadLong) : null
  const alturaSuccionBase = succionActiva && alturaSuccion !== "" ? aBaseLong(parseFloat(alturaSuccion) || 0, unidadLong) : 0

  const errorPerfil = useMemo(() => {
    if (estratosResueltos.some(e => !(e.zBottom > e.zTop))) return "Todos los estratos deben tener un espesor mayor a cero."
    for (const e of estratosResueltos) {
      const nfCorta = nfDepthBase !== null && nfDepthBase > e.zTop && nfDepthBase < e.zBottom
      const todaSeca = nfDepthBase === null || nfDepthBase >= e.zBottom
      const todaSaturada = nfDepthBase !== null && nfDepthBase <= e.zTop
      if ((todaSeca || nfCorta) && e.gammaArriba === undefined) return `Falta γ (sobre el NF) en "${e.nombre}".`
      if ((todaSaturada || nfCorta) && e.gammaAbajo === undefined) return `Falta γsat (bajo el NF) en "${e.nombre}".`
    }
    if (nfActivo && nfProfundidad === "") return "Ingresa la profundidad del nivel freático."
    if (succionActiva && (!nfActivo || alturaSuccion === "")) return "Para succión mátrica, activa el NF e ingresa la altura a considerar."
    return null
  }, [estratosResueltos, nfDepthBase, nfActivo, nfProfundidad, succionActiva, alturaSuccion])

  const perfil: PuntoPerfil[] = useMemo(() => {
    if (errorPerfil || estratosResueltos.length === 0) return []

    const breakpoints = new Set<number>([0, zMaxPerfil])
    for (const e of estratosResueltos) { breakpoints.add(e.zTop); breakpoints.add(e.zBottom) }
    if (nfDepthBase !== null && nfDepthBase >= 0 && nfDepthBase <= zMaxPerfil) breakpoints.add(nfDepthBase)
    if (succionActiva && nfDepthBase !== null) {
      const zTopeSuccion = nfDepthBase - alturaSuccionBase
      if (zTopeSuccion >= 0 && zTopeSuccion <= zMaxPerfil) breakpoints.add(zTopeSuccion)
    }
    const zs = [...breakpoints].filter(z => z >= 0 && z <= zMaxPerfil + 1e-9).sort((a, b) => a - b)

    const gammaEn = (zMid: number): number => {
      const capa = estratosResueltos.find(e => zMid >= e.zTop - 1e-9 && zMid <= e.zBottom + 1e-9) ?? estratosResueltos[estratosResueltos.length - 1]
      if (nfDepthBase === null) return capa.gammaArriba ?? 0
      return zMid <= nfDepthBase ? (capa.gammaArriba ?? 0) : (capa.gammaAbajo ?? 0)
    }
    const uEn = (zVal: number): number => {
      if (nfDepthBase === null) return 0
      if (zVal >= nfDepthBase) return GAMMA_W * (zVal - nfDepthBase)
      const alturaSobreNF = nfDepthBase - zVal
      if (succionActiva && alturaSobreNF <= alturaSuccionBase + 1e-9) return -GAMMA_W * alturaSobreNF
      return 0
    }

    let sigmaV = 0
    const puntos: PuntoPerfil[] = []
    for (let i = 0; i < zs.length; i++) {
      if (i > 0) {
        const zA = zs[i - 1], zB = zs[i]
        sigmaV += gammaEn((zA + zB) / 2) * (zB - zA)
      }
      const zVal = zs[i]
      const u = uEn(zVal)
      puntos.push({ z: zVal, sigmaV, u, sigmaEf: sigmaV - u })
    }
    return puntos
  }, [estratosResueltos, nfDepthBase, succionActiva, alturaSuccionBase, zMaxPerfil, errorPerfil])

  // ── PESTAÑA 2: cargas superficiales ──
  const [teoria, setTeoria] = useState<Teoria>("boussinesq")
  const [tipoCarga, setTipoCarga] = useState<TipoCarga>("puntual")
  const [Q, setQ] = useState("")
  const [r, setR] = useState("")
  const [qLineaF, setQLineaF] = useState("")
  const [x, setX] = useState("")
  const [qArea, setQArea] = useState("")
  const [radioR, setRadioR] = useState("")
  const [d, setD] = useState("")
  const [anchoB, setAnchoB] = useState("")
  const [largoL, setLargoL] = useState("")
  const [xp, setXp] = useState("")
  const [yp, setYp] = useState("")
  const [anchoFranja, setAnchoFranja] = useState("")
  const [xFranja, setXFranja] = useState("")
  const [zCalculo, setZCalculo] = useState("")
  const [zMaxChart, setZMaxChart] = useState("")

  const kernel = kernelDe(teoria)

  function evaluarDeltaSigma(zBaseM: number): number {
    switch (tipoCarga) {
      case "puntual": {
        const Qn = aBaseFuerza(parseFloat(Q) || 0, unidadFuerza) / 1000 // N -> kN
        const rn = aBaseLong(parseFloat(r) || 0, unidadLong)
        return deltaSigmaPuntual(Qn, rn, zBaseM, kernel)
      }
      case "linea": {
        const qn = aBaseFuerza(parseFloat(qLineaF) || 0, unidadFuerza) / 1000 / aBaseLong(1, unidadLong) // kN/m
        const xn = aBaseLong(parseFloat(x) || 0, unidadLong)
        return deltaSigmaLinea(qn, xn, zBaseM, kernel)
      }
      case "circular": {
        const qn = aBasePresAKPa(parseFloat(qArea) || 0, unidadPres)
        const Rn = aBaseLong(parseFloat(radioR) || 0, unidadLong)
        const dn = aBaseLong(parseFloat(d) || 0, unidadLong)
        return deltaSigmaCircular(qn, dn, Rn, zBaseM, kernel)
      }
      case "rectangular": {
        const qn = aBasePresAKPa(parseFloat(qArea) || 0, unidadPres)
        const Bn = aBaseLong(parseFloat(anchoB) || 0, unidadLong)
        const Ln = aBaseLong(parseFloat(largoL) || 0, unidadLong)
        const xpn = aBaseLong(parseFloat(xp) || 0, unidadLong)
        const ypn = aBaseLong(parseFloat(yp) || 0, unidadLong)
        return deltaSigmaRectangular(qn, xpn, ypn, Bn, Ln, zBaseM, kernel)
      }
      case "franja": {
        const qn = aBasePresAKPa(parseFloat(qArea) || 0, unidadPres)
        const Bn = aBaseLong(parseFloat(anchoFranja) || 0, unidadLong)
        const xn = aBaseLong(parseFloat(xFranja) || 0, unidadLong)
        return deltaSigmaFranja(qn, xn, Bn, zBaseM, kernel)
      }
    }
  }

  const camposCompletos = useMemo(() => {
    switch (tipoCarga) {
      case "puntual": return Q !== "" && r !== ""
      case "linea": return qLineaF !== "" && x !== ""
      case "circular": return qArea !== "" && radioR !== "" && d !== ""
      case "rectangular": return qArea !== "" && anchoB !== "" && largoL !== "" && xp !== "" && yp !== ""
      case "franja": return qArea !== "" && anchoFranja !== "" && xFranja !== ""
    }
  }, [tipoCarga, Q, r, qLineaF, x, qArea, radioR, d, anchoB, largoL, xp, yp, anchoFranja, xFranja])

  const zCalculoBase = zCalculo !== "" ? aBaseLong(parseFloat(zCalculo) || 0, unidadLong) : null
  const resultadoPuntual = useMemo(() => {
    if (!camposCompletos || zCalculoBase === null || zCalculoBase <= 0) return null
    return evaluarDeltaSigma(zCalculoBase)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camposCompletos, zCalculoBase, teoria, tipoCarga, Q, r, qLineaF, x, qArea, radioR, d, anchoB, largoL, xp, yp, anchoFranja, xFranja, unidadLong, unidadFuerza, unidadPres])

  const zMaxChartBase = zMaxChart !== "" ? aBaseLong(parseFloat(zMaxChart) || 0, unidadLong) : (zCalculoBase ? zCalculoBase * 2 : 0)
  const perfilDeltaSigma = useMemo(() => {
    if (!camposCompletos || !zMaxChartBase || zMaxChartBase <= 0) return []
    const N = 40
    const pts: { z: number; v: number }[] = []
    for (let i = 1; i <= N; i++) {
      const zM = (zMaxChartBase * i) / N
      const v = evaluarDeltaSigma(zM)
      pts.push({ z: aMostrarLong(zM, unidadLong), v: aMostrarPresDesdeKPa(v, unidadPres) })
    }
    return pts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camposCompletos, zMaxChartBase, teoria, tipoCarga, Q, r, qLineaF, x, qArea, radioR, d, anchoB, largoL, xp, yp, anchoFranja, xFranja, unidadLong, unidadFuerza, unidadPres])

  const [sumarPerfil, setSumarPerfil] = useState(false)
  const combinado = useMemo(() => {
    if (!sumarPerfil || !camposCompletos || perfil.length === 0) return []
    return perfil.map(p => {
      const dSigma = p.z > 0 ? evaluarDeltaSigma(p.z) : 0
      return { z: p.z, sigmaV0: p.sigmaV, deltaSigma: dSigma, sigmaVTotal: p.sigmaV + dSigma, u: p.u, sigmaEfTotal: p.sigmaV + dSigma - p.u }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sumarPerfil, camposCompletos, perfil, teoria, tipoCarga, Q, r, qLineaF, x, qArea, radioR, d, anchoB, largoL, xp, yp, anchoFranja, xFranja])

  function agregarEstrato() {
    setEstratos([...estratos, nuevoEstrato(`Estrato ${estratos.length + 1}`)])
  }
  function actualizarEstrato(id: string, e: Estrato) {
    setEstratos(estratos.map(es => es.id === id ? e : es))
  }
  function eliminarEstrato(id: string) {
    setEstratos(estratos.filter(es => es.id !== id))
  }
  function cargarEjemplo() {
    const e1 = nuevoEstrato("Arena limosa")
    e1.espesor = "3"; e1.modoGamma = "directo"; e1.gammaArriba = "17.5"; e1.gammaAbajo = "19.2"
    const e2 = nuevoEstrato("Arcilla firme")
    e2.espesor = "4"; e2.modoGamma = "fases"
    e2.conocidos = { Gs: true, e: true }
    e2.entradas = { Gs: "2.70", e: "0.75" }
    const e3 = nuevoEstrato("Arena densa")
    e3.espesor = "5"; e3.modoGamma = "directo"; e3.gammaAbajo = "20.1"
    setEstratos([e1, e2, e3])
    setNfActivo(true); setNfProfundidad("2")
    setSuccionActiva(true); setAlturaSuccion("1")
  }
  function limpiarPerfil() {
    setEstratos([nuevoEstrato("Estrato 1")])
    setNfActivo(false); setNfProfundidad(""); setSuccionActiva(false); setAlturaSuccion("")
  }

  const seriesPerfil = [
    { label: "σv (total)", color: "#1d4ed8", puntos: perfil.map(p => ({ z: aMostrarLong(p.z, unidadLong), v: aMostrarPresDesdeKPa(p.sigmaV, unidadPres) })) },
    { label: "u (poros)", color: "#059669", puntos: perfil.map(p => ({ z: aMostrarLong(p.z, unidadLong), v: aMostrarPresDesdeKPa(p.u, unidadPres) })), dash: true },
    { label: "σ' (efectivo)", color: "#d97706", puntos: perfil.map(p => ({ z: aMostrarLong(p.z, unidadLong), v: aMostrarPresDesdeKPa(p.sigmaEf, unidadPres) })) },
  ]

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos / Geotecnia /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Esfuerzos en el suelo</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-5">

            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 items-end">
              <div className="w-32"><Selector label="Longitud" value={unidadLong} onChange={setUnidadLong} opciones={conversiones[CAT_LONG].unidades} /></div>
              <div className="w-32"><Selector label="Peso unitario" value={unidadPesoU} onChange={setUnidadPesoU} opciones={conversiones[CAT_PESOU].unidades} /></div>
              <div className="w-32"><Selector label="Presión" value={unidadPres} onChange={setUnidadPres} opciones={conversiones[CAT_PRES].unidades} /></div>
              <div className="w-32"><Selector label="Fuerza" value={unidadFuerza} onChange={setUnidadFuerza} opciones={conversiones[CAT_FUERZA].unidades} /></div>
              <div className="text-xs text-gray-400 ml-auto">γw = {GAMMA_W} kN/m³</div>
            </div>

            <Tabs activo={tab} onChange={setTab} tabs={[
              { id: "perfil", label: "Perfil por estratos" },
              { id: "cargas", label: "Cargas superficiales (Boussinesq / Westergaard)" },
            ]} />

            {tab === "perfil" && (
              <div className="flex flex-col gap-5">
                <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap gap-6 items-start">
                  <div className="flex flex-col gap-2">
                    <Toggle label="Considerar nivel freático" checked={nfActivo} onChange={setNfActivo} />
                    {nfActivo && (
                      <div className="w-40"><Campo label="Profundidad del NF" value={nfProfundidad} onChange={setNfProfundidad} sufijo={unidadLong} /></div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Toggle label="Considerar succión mátrica" checked={succionActiva} onChange={v => { setSuccionActiva(v); if (v) setNfActivo(true) }} />
                    {succionActiva && (
                      <div className="w-52">
                        <Campo label="Altura sobre el NF a considerar" value={alturaSuccion} onChange={setAlturaSuccion} sufijo={unidadLong} />
                      </div>
                    )}
                  </div>
                  {succionActiva && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-xs leading-relaxed">
                      Simplificación: u varía linealmente de 0 (en el NF) a −γw·h en la altura h definida.
                      Por encima de esa altura se asume u = 0 (sin efecto de succión).
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {estratos.map((e, i) => {
                    const resuelto = estratosResueltos[i]
                    return (
                      <TarjetaEstrato key={e.id} estrato={e} index={i} unidadLong={unidadLong} unidadPesoU={unidadPesoU}
                        zTop={resuelto?.zTop ?? 0} zBottom={resuelto?.zBottom ?? 0}
                        nfActivo={nfActivo} nfDepth={nfDepthBase}
                        onChange={ne => actualizarEstrato(e.id, ne)} onEliminar={() => eliminarEstrato(e.id)} />
                    )
                  })}
                </div>

                <div className="flex gap-3">
                  <button onClick={agregarEstrato} className="bg-blue-700 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-blue-800 transition-colors font-medium">
                    + Agregar estrato
                  </button>
                  <button onClick={cargarEjemplo} className="text-sm text-blue-700 px-4 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                    Cargar ejemplo
                  </button>
                  <button onClick={limpiarPerfil} className="text-sm text-gray-500 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                    Limpiar todo
                  </button>
                </div>

                {errorPerfil && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{errorPerfil}</div>
                )}

                {!errorPerfil && perfil.length > 0 && (
                  <>
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PERFIL DE ESFUERZOS σv, u, σ' vs PROFUNDIDAD</div>
                      <ChartPerfil series={seriesPerfil} zMax={aMostrarLong(zMaxPerfil, unidadLong)} xLabel={`Esfuerzo (${unidadPres})`} />
                      <div className="flex gap-4 mt-2 text-[11px]">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-700 inline-block" /> σv (total)</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-600 inline-block" style={{ borderTop: "1px dashed" }} /> u (poros)</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-600 inline-block" /> σ' (efectivo)</span>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-x-auto">
                      <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">TABLA DE RESULTADOS (PUNTOS DE QUIEBRE)</div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-100">
                            <th className="text-left py-1.5 font-medium">Profundidad ({unidadLong})</th>
                            <th className="text-right py-1.5 font-medium">σv ({unidadPres})</th>
                            <th className="text-right py-1.5 font-medium">u ({unidadPres})</th>
                            <th className="text-right py-1.5 font-medium">σ' ({unidadPres})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {perfil.map((p, i) => (
                            <tr key={i} className="border-b border-gray-50">
                              <td className="py-1.5">{fmt(aMostrarLong(p.z, unidadLong), 2)}</td>
                              <td className="text-right py-1.5 text-blue-700">{fmt(aMostrarPresDesdeKPa(p.sigmaV, unidadPres), 2)}</td>
                              <td className={`text-right py-1.5 ${p.u < 0 ? "text-red-500" : "text-green-700"}`}>{fmt(aMostrarPresDesdeKPa(p.u, unidadPres), 2)}</td>
                              <td className="text-right py-1.5 text-amber-700 font-medium">{fmt(aMostrarPresDesdeKPa(p.sigmaEf, unidadPres), 2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[10px] text-gray-400 mt-3">σ' = σv − u (principio de esfuerzos efectivos de Terzaghi). u negativo indica succión mátrica.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "cargas" && (
              <div className="flex flex-col gap-5">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex gap-4 mb-4">
                    <div className="w-56"><Selector label="Teoría" value={teoria === "boussinesq" ? "Boussinesq (1885)" : "Westergaard (1938, μ'=0)"}
                      onChange={v => setTeoria(v.startsWith("Boussinesq") ? "boussinesq" : "westergaard")}
                      opciones={["Boussinesq (1885)", "Westergaard (1938, μ'=0)"]} /></div>
                    <div className="w-56"><Selector label="Tipo de carga" value={
                      tipoCarga === "puntual" ? "Puntual" : tipoCarga === "linea" ? "Línea (infinita)" :
                      tipoCarga === "circular" ? "Circular" : tipoCarga === "rectangular" ? "Rectangular" : "Franja"
                    } onChange={v => setTipoCarga(
                      v === "Puntual" ? "puntual" : v === "Línea (infinita)" ? "linea" :
                      v === "Circular" ? "circular" : v === "Rectangular" ? "rectangular" : "franja"
                    )} opciones={["Puntual", "Línea (infinita)", "Circular", "Rectangular", "Franja"]} /></div>
                  </div>

                  {tipoCarga === "puntual" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Campo label="Carga puntual Q" value={Q} onChange={setQ} sufijo={unidadFuerza} />
                      <Campo label="Distancia horizontal r" value={r} onChange={setR} sufijo={unidadLong} />
                    </div>
                  )}
                  {tipoCarga === "linea" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Campo label={`Carga lineal q`} value={qLineaF} onChange={setQLineaF} sufijo={`${unidadFuerza}/${unidadLong}`} />
                      <Campo label="Distancia horizontal x (a la línea)" value={x} onChange={setX} sufijo={unidadLong} />
                    </div>
                  )}
                  {tipoCarga === "circular" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Campo label="Presión q" value={qArea} onChange={setQArea} sufijo={unidadPres} />
                      <Campo label="Radio R" value={radioR} onChange={setRadioR} sufijo={unidadLong} />
                      <Campo label="Distancia al centro d" value={d} onChange={setD} sufijo={unidadLong} placeholder="0 = bajo el centro" />
                    </div>
                  )}
                  {tipoCarga === "rectangular" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Campo label="Presión q" value={qArea} onChange={setQArea} sufijo={unidadPres} />
                      <Campo label="Ancho B (dirección x)" value={anchoB} onChange={setAnchoB} sufijo={unidadLong} />
                      <Campo label="Largo L (dirección y)" value={largoL} onChange={setLargoL} sufijo={unidadLong} />
                      <div />
                      <Campo label="xp (desde una esquina)" value={xp} onChange={setXp} sufijo={unidadLong} />
                      <Campo label="yp (desde la misma esquina)" value={yp} onChange={setYp} sufijo={unidadLong} />
                      <button onClick={() => { setXp(String((parseFloat(anchoB) || 0) / 2)); setYp(String((parseFloat(largoL) || 0) / 2)) }}
                        className="text-xs text-blue-700 border border-blue-200 rounded-lg px-3 hover:bg-blue-50 self-end h-[38px]">
                        Bajo el centro
                      </button>
                      <button onClick={() => { setXp("0"); setYp("0") }}
                        className="text-xs text-blue-700 border border-blue-200 rounded-lg px-3 hover:bg-blue-50 self-end h-[38px]">
                        Bajo la esquina
                      </button>
                    </div>
                  )}
                  {tipoCarga === "franja" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Campo label="Presión q" value={qArea} onChange={setQArea} sufijo={unidadPres} />
                      <Campo label="Ancho B" value={anchoFranja} onChange={setAnchoFranja} sufijo={unidadLong} />
                      <Campo label="Distancia al eje x" value={xFranja} onChange={setXFranja} sufijo={unidadLong} placeholder="0 = bajo el eje" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
                    <Campo label="Profundidad de cálculo z" value={zCalculo} onChange={setZCalculo} sufijo={unidadLong} />
                    <Campo label="z máx. para el gráfico" value={zMaxChart} onChange={setZMaxChart} sufijo={unidadLong} placeholder="auto: 2×z" />
                  </div>
                </div>

                {tipoCarga === "circular" && (
                  <p className="text-[11px] text-gray-400 -mt-2">La respuesta depende solo de la distancia horizontal d al centro (simetría circular).</p>
                )}

                {camposCompletos && resultadoPuntual !== null && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Δσz en z = {zCalculo} {unidadLong}</div>
                      <div className="text-2xl font-semibold text-blue-800">{fmt(aMostrarPresDesdeKPa(resultadoPuntual, unidadPres), 3)} {unidadPres}</div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-white text-blue-700 font-medium border border-blue-200">
                      {teoria === "boussinesq" ? "Boussinesq (1885)" : "Westergaard (1938, μ'=0)"}
                    </span>
                  </div>
                )}

                {camposCompletos && perfilDeltaSigma.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">Δσz vs PROFUNDIDAD</div>
                    <ChartDeltaSigma puntos={perfilDeltaSigma} />
                  </div>
                )}

                {perfil.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <Toggle label="Sumar esta carga al perfil geostático (pestaña «Perfil por estratos»)" checked={sumarPerfil} onChange={setSumarPerfil} />
                    {sumarPerfil && !camposCompletos && (
                      <p className="text-xs text-amber-600 mt-2">Completa los datos de la carga para calcular la suma.</p>
                    )}
                    {sumarPerfil && camposCompletos && combinado.length > 0 && (
                      <div className="overflow-x-auto mt-4">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b border-gray-100">
                              <th className="text-left py-1.5 font-medium">Profundidad ({unidadLong})</th>
                              <th className="text-right py-1.5 font-medium">σv₀ ({unidadPres})</th>
                              <th className="text-right py-1.5 font-medium">Δσz ({unidadPres})</th>
                              <th className="text-right py-1.5 font-medium">σv total ({unidadPres})</th>
                              <th className="text-right py-1.5 font-medium">σ' total ({unidadPres})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {combinado.map((c, i) => (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="py-1.5">{fmt(aMostrarLong(c.z, unidadLong), 2)}</td>
                                <td className="text-right py-1.5 text-gray-500">{fmt(aMostrarPresDesdeKPa(c.sigmaV0, unidadPres), 2)}</td>
                                <td className="text-right py-1.5 text-purple-700">{fmt(aMostrarPresDesdeKPa(c.deltaSigma, unidadPres), 2)}</td>
                                <td className="text-right py-1.5 text-blue-700 font-medium">{fmt(aMostrarPresDesdeKPa(c.sigmaVTotal, unidadPres), 2)}</td>
                                <td className="text-right py-1.5 text-amber-700 font-medium">{fmt(aMostrarPresDesdeKPa(c.sigmaEfTotal, unidadPres), 2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
                  <span className="font-semibold text-gray-600">Metodología:</span>{" "}
                  las cargas de línea, franja, circulares y rectangulares se obtienen integrando numéricamente
                  el núcleo de carga puntual de Boussinesq o de Westergaard (μ' = 0) sobre la geometría cargada
                  — el mismo principio de superposición con el que se deducen las soluciones cerradas clásicas
                  (Newmark, entre otras), verificado contra ellas. El área circular se evalúa respecto a la
                  distancia horizontal al centro (simetría); el área rectangular admite el punto de cálculo en
                  cualquier posición del plano (esquina, centro o fuera del área).
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}