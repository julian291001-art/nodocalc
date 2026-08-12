"use client"
import { useState, useMemo } from "react"
import Sidebar from "../../components/Sidebar"
import { conversiones } from "../../lib/conversiones"
import { VarKey, Vars, resolverFases } from "../../lib/relacionesFases"
import { GAMMA_W, resolverPerfilGeostatico, CapaGeostatica, PuntoGeostatico } from "../../lib/perfilGeostatico"
import {
  TeoriaEmpuje, EstadoEmpuje, resolverPerfilLateral, resultanteLateral, resultantesDesglosadas,
  resumenKPorCapa, profundidadGrieta, kaRankine, kaCoulomb, PuntoLateral,
  validezRankine, validezCoulomb, Validez,
} from "../../lib/presionTierras"

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES Y UNIDADES
// ─────────────────────────────────────────────────────────────────────────────
const CAT_LONG = "Longitud"
const CAT_PESOU = "Peso unitario"
const CAT_PRES = "Presión / Esfuerzo"
const CAT_FUERZA = "Fuerza"

function factorDe(categoria: string, unidad: string): number {
  const i = conversiones[categoria].unidades.indexOf(unidad)
  return conversiones[categoria].factores[i]
}
const aBaseLong = (v: number, u: string) => v * factorDe(CAT_LONG, u)
const aMostrarLong = (v: number, u: string) => v / factorDe(CAT_LONG, u)
const aBasePesoU = (v: number, u: string) => v * factorDe(CAT_PESOU, u)
const aMostrarPresDesdeKPa = (vKPa: number, u: string) => (vKPa * 1000) / factorDe(CAT_PRES, u)
const aBasePresAKPa = (v: number, u: string) => (v * factorDe(CAT_PRES, u)) / 1000

// E_base está en kN por metro (base) de muro — kPa · m. Para mostrarlo en
// {unidadFuerza}/{unidadLong} hay que multiplicar por el factor de longitud (m → unidad,
// porque "por metro" se vuelve un número más grande al pasar a una unidad de longitud más
// pequeña) y dividir por el factor de fuerza (kN → unidad, análogo a aMostrarLong).
// (La versión anterior tenía esta conversión invertida en ambos factores.)
const aMostrarFuerzaPorLong = (eBaseKNporM: number, unidadFuerza: string, unidadLong: string) =>
  (eBaseKNporM * factorDe(CAT_LONG, unidadLong)) / factorDe(CAT_FUERZA, unidadFuerza)

const fmt = (x: number | undefined, dec = 3) =>
  x !== undefined && Number.isFinite(x) ? x.toFixed(dec) : "—"

const VARS_FASES: { key: VarKey; labelHtml: string; esPorcentaje: boolean }[] = [
  { key: "Gs", labelHtml: "G<sub>s</sub>", esPorcentaje: false },
  { key: "e", labelHtml: "e", esPorcentaje: false },
  { key: "n", labelHtml: "n (%)", esPorcentaje: true },
  { key: "w", labelHtml: "w (%)", esPorcentaje: true },
  { key: "S", labelHtml: "S (%)", esPorcentaje: true },
]

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
type Capa = {
  id: string
  nombre: string
  espesor: string
  modoGamma: "directo" | "fases"
  gammaArriba: string
  gammaAbajo: string
  conocidos: Partial<Record<VarKey, boolean>>
  entradas: Partial<Record<VarKey, string>>
  phi: string
  c: string
  ocr: string
  betaPropio: boolean
  betaLocal: string
}

let contadorId = 0
function nuevaCapa(nombre: string): Capa {
  contadorId++
  return {
    id: `capa-${contadorId}-${Date.now()}`,
    nombre, espesor: "",
    modoGamma: "directo", gammaArriba: "", gammaAbajo: "",
    conocidos: {}, entradas: {},
    phi: "", c: "0", ocr: "1",
    betaPropio: false, betaLocal: "0",
  }
}

type CapaResuelta = {
  id: string; nombre: string
  zTop: number; zBottom: number
  gammaArriba?: number; gammaAbajo?: number
  phi: number; c: number; ocr: number; betaLocal?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// UI AUXILIAR
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

function AvisoValidez({ validez }: { validez: Validez }) {
  if (validez.valido) return null
  return (
    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
      <span className="font-semibold">Combinación de ángulos no válida — </span>{validez.mensaje}
      <span className="block text-red-500 text-xs mt-1">No se calcula el perfil hasta corregir esto (evita coeficientes K sin sentido).</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GRÁFICO — presión lateral vs profundidad
// ─────────────────────────────────────────────────────────────────────────────
function ChartPresionLateral({
  series, zMax, xLabel, width = 900, height = 340,
}: {
  series: { label: string; color: string; puntos: { z: number; v: number }[]; dash?: boolean }[]
  zMax: number; xLabel: string; width?: number; height?: number
}) {
  const [hoverZ, setHoverZ] = useState<number | null>(null)
  const ML = 60, MB = 30, MT = 22, MR = 20
  const plotW = width - ML - MR, plotH = height - MB - MT

  const allV = series.flatMap(s => s.puntos.map(p => p.v))
  const vMaxRaw = allV.length ? Math.max(...allV, 0) : 1
  const vMinRaw = allV.length ? Math.min(...allV, 0) : 0
  const pad = (vMaxRaw - vMinRaw) * 0.1 || 1
  const vMax = vMaxRaw + pad, vMin = vMinRaw - pad

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
  const tooltipAncho = 150, tooltipAlto = 16 + coincidencias.length * 14
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
        return <path key={si} d={d} fill="none" stroke={s.color} strokeWidth={1.75} strokeDasharray={s.dash ? "4,3" : undefined} />
      })}

      {hoverZ !== null && (
        <>
          <line x1={ML} y1={toY(hoverZ)} x2={width - MR} y2={toY(hoverZ)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,2" />
          {coincidencias.map((c, i) => <circle key={i} cx={toX(c.val)} cy={toY(hoverZ)} r={3} fill={c.color} stroke="white" strokeWidth={1} />)}
          <rect x={tooltipPosX} y={tooltipPosY} width={tooltipAncho} height={tooltipAlto} rx={4} fill="white" stroke="#e5e7eb" />
          <text x={tooltipPosX + 8} y={tooltipPosY + 12} fontSize="8" fill="#374151" fontWeight="600">z = {fmt(hoverZ, 2)} m</text>
          {coincidencias.map((c, i) => (
            <text key={i} x={tooltipPosX + 8} y={tooltipPosY + 26 + i * 14} fontSize="8" fill={c.color}>{c.label}: {fmt(c.val, 2)}</text>
          ))}
        </>
      )}
      <rect x={ML} y={MT} width={plotW} height={plotH} fill="transparent" onMouseMove={handleMove} />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ESQUEMA — columna de suelo sola (pestaña "sin muro")
// ─────────────────────────────────────────────────────────────────────────────
function DiagramaCapasLateral({
  capas, nfActivo, nfDepth, unidadLong, unidadPesoU, width = 260, height = 380,
}: {
  capas: CapaResuelta[]
  nfActivo: boolean
  nfDepth: number | null
  unidadLong: string
  unidadPesoU: string
  width?: number
  height?: number
}) {
  const zMax = capas.length ? capas[capas.length - 1].zBottom : 0
  if (zMax <= 0) {
    return (
      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-6 text-center">
        Ingresa el espesor de al menos una capa para ver el esquema.
      </div>
    )
  }

  const ML = 10, MT = 15, MB = 15, MR = 78
  const colX = ML, colW = width - ML - MR
  const plotH = height - MT - MB
  const toY = (z: number) => MT + (z / zMax) * plotH

  const paleta = ["#fde3c7", "#e3ded6", "#cfe3d9", "#d9e0f0", "#f0d9e6", "#e6ecd9"]

  const breakpoints = Array.from(
    new Set([0, ...capas.map(c => c.zBottom), ...(nfActivo && nfDepth !== null ? [nfDepth] : [])])
  ).filter(z => z >= 0 && z <= zMax + 1e-9).sort((a, b) => a - b)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="border border-gray-100 rounded-lg bg-white" style={{ maxHeight: height }}>
      {capas.map((c, i) => {
        const yTop = toY(c.zTop), yBottom = toY(c.zBottom)
        const h = yBottom - yTop
        const nfCorta = nfActivo && nfDepth !== null && nfDepth > c.zTop && nfDepth < c.zBottom
        const yNF = nfCorta ? toY(nfDepth!) : null

        return (
          <g key={c.id}>
            <rect x={colX} y={yTop} width={colW} height={h} fill={paleta[i % paleta.length]} stroke="#9ca3af" strokeWidth={1} />
            <text x={colX + 8} y={yTop + 13} fontSize="9" fill="#374151" fontWeight="600">{c.nombre}</text>

            {!nfCorta ? (
              <text x={colX + 8} y={yTop + h / 2 + 4} fontSize="8" fill="#4b5563">
                {nfActivo && nfDepth !== null && nfDepth <= c.zTop ? "γsat" : "γ"} = {fmt(
                  nfActivo && nfDepth !== null && nfDepth <= c.zTop ? c.gammaAbajo : c.gammaArriba, 2
                )} {unidadPesoU}
              </text>
            ) : (
              <>
                <line x1={colX} y1={yNF!} x2={colX + colW} y2={yNF!} stroke="#2563eb" strokeWidth={1} strokeDasharray="3,2" />
                <polygon points={`${colX + colW - 10},${yNF! - 5} ${colX + colW},${yNF!} ${colX + colW - 10},${yNF! + 5}`} fill="#2563eb" />
                <text x={colX + 8} y={(yTop + yNF!) / 2 + 4} fontSize="8" fill="#4b5563">γ = {fmt(c.gammaArriba, 2)} {unidadPesoU}</text>
                <text x={colX + 8} y={(yNF! + yBottom) / 2 + 4} fontSize="8" fill="#4b5563">γsat = {fmt(c.gammaAbajo, 2)} {unidadPesoU}</text>
              </>
            )}
          </g>
        )
      })}

      {capas.slice(0, -1).map(c => (
        <line key={`sep-${c.id}`} x1={colX} y1={toY(c.zBottom)} x2={colX + colW} y2={toY(c.zBottom)} stroke="#6b7280" strokeWidth={1.25} />
      ))}
      <rect x={colX} y={MT} width={colW} height={plotH} fill="none" stroke="#374151" strokeWidth={1.25} />

      {breakpoints.map((t, i) => (
        <g key={i}>
          <line x1={colX + colW} y1={toY(t)} x2={colX + colW + 6} y2={toY(t)} stroke="#9ca3af" strokeWidth={1} />
          <text x={colX + colW + 10} y={toY(t) + 3} fontSize="8" fill="#6b7280">{fmt(aMostrarLong(t, unidadLong), t < 1 ? 2 : 1)}</text>
        </g>
      ))}
      <text x={colX + colW + 10} y={MT - 6} fontSize="8" fill="#9ca3af">z ({unidadLong})</text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESETS Y DIMENSIONES DE MURO
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS_MURO: Record<string, { nombre: string; theta: number; deltaFactor: number; teoria: TeoriaEmpuje; nota: string }> = {
  gravedad: {
    nombre: "Muro de gravedad",
    theta: 10, deltaFactor: 2 / 3, teoria: "coulomb",
    nota: "Trasdós inclinado (típico 5°–20°) con fricción muro-suelo — se recomienda Coulomb. Si δ es grande en el caso pasivo, Coulomb puede sobrestimar Kp; considera reducir δ o validar con Caquot–Kerisel.",
  },
  voladizo: {
    nombre: "Voladizo en 'L' (zapata)",
    theta: 0, deltaFactor: 0, teoria: "rankine",
    nota: "Se analiza sobre el plano vertical virtual que pasa por el talón de la zapata (empuje suelo-suelo, δ≈0) — método de Rankine, el estándar para este caso.",
  },
  pantalla: {
    nombre: "Pantalla / muro plano",
    theta: 0, deltaFactor: 2 / 3, teoria: "coulomb",
    nota: "Trasdós vertical de concreto en contacto con el suelo — incluye fricción muro-suelo (δ ≈ 2/3·φ). Con δ = 0, Coulomb coincide con Rankine.",
  },
}

type DimsVoladizo = { espesorPantalla: string; espesorZapata: string; longitudPunta: string; longitudTalon: string }
type DimsGravedad = { anchoCorona: string }
type DimsPantalla = { espesor: string }

const DIMS_VOLADIZO_DEFAULT: DimsVoladizo = { espesorPantalla: "0.3", espesorZapata: "0.4", longitudPunta: "0.6", longitudTalon: "1.8" }
const DIMS_GRAVEDAD_DEFAULT: DimsGravedad = { anchoCorona: "0.4" }
const DIMS_PANTALLA_DEFAULT: DimsPantalla = { espesor: "0.3" }

// ─────────────────────────────────────────────────────────────────────────────
// ESQUEMA DEL MURO A ESCALA + DIAGRAMA DE PRESIONES DESGLOSADO
// (dimensiones reales ingresadas por el usuario; el suelo queda pegado al trasdós del
// muro/plano virtual; el talud β sí se refleja en la línea superior del relleno;
// se dibuja un trapecio/triángulo de presión por cada capa y otro para el agua, cada uno
// con su propia resultante, y al final la resultante total.)
// ─────────────────────────────────────────────────────────────────────────────
// Colores fijos para las capas (coinciden con la paleta usada en DiagramaCapasLateral)
// y para el agua, reutilizados tanto en el relleno del suelo como en el diagrama de presiones.
const PALETA_CAPAS = ["#fde3c7", "#e3ded6", "#cfe3d9", "#d9e0f0", "#f0d9e6", "#e6ecd9"]
const PALETA_PRESION = ["#f59e0b", "#6b7280", "#0d9488", "#7c3aed", "#db2777", "#65a30d"]
const COLOR_AGUA = "#2563eb"

function DiagramaMuroYPresiones({
  capas, nfActivo, nfDepth, tipoMuro, thetaDeg, betaDeg, perfil, desglose, estado, unidadLong, unidadFuerza,
  dimsVoladizo, dimsGravedad, dimsPantalla,
}: {
  capas: CapaResuelta[]
  nfActivo: boolean
  nfDepth: number | null
  tipoMuro: keyof typeof PRESETS_MURO
  thetaDeg: number
  betaDeg: number
  perfil: PuntoLateral[]
  desglose: ReturnType<typeof resultantesDesglosadas>
  estado: EstadoEmpuje
  unidadLong: string
  unidadFuerza: string
  dimsVoladizo: DimsVoladizo
  dimsGravedad: DimsGravedad
  dimsPantalla: DimsPantalla
}) {
  const zMax = capas.length ? capas[capas.length - 1].zBottom : 0
  if (zMax <= 0) {
    return (
      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-10 text-center">
        Ingresa el espesor de al menos una capa para ver el esquema del muro.
      </div>
    )
  }

  // ── dimensiones reales en metros (base) ──
  const espesorPantalla = aBaseLong(parseFloat(dimsVoladizo.espesorPantalla) || 0.3, unidadLong)
  const espesorZapata = aBaseLong(parseFloat(dimsVoladizo.espesorZapata) || 0.4, unidadLong)
  const longitudPunta = aBaseLong(parseFloat(dimsVoladizo.longitudPunta) || 0.6, unidadLong)
  const longitudTalon = aBaseLong(parseFloat(dimsVoladizo.longitudTalon) || 1.8, unidadLong)
  const anchoCorona = aBaseLong(parseFloat(dimsGravedad.anchoCorona) || 0.4, unidadLong)
  const espesorPantallaPlana = aBaseLong(parseFloat(dimsPantalla.espesor) || 0.3, unidadLong)

  const thetaRad = (thetaDeg || 0) * Math.PI / 180
  const betaRad = (betaDeg || 0) * Math.PI / 180
  const desplazTotal = zMax * Math.tan(thetaRad) // desplazamiento horizontal de la corona respecto a la base, por la inclinación θ

  // ── geometría del muro en metros, medida desde x=0 (borde izquierdo del dibujo) ──
  // xInterfaz = posición (en la BASE del muro) del plano donde el suelo queda en contacto
  // directo con el muro (trasdós real, o plano virtual del talón en el caso del voladizo).
  let anchoMuro: number, xInterfaz: number
  if (tipoMuro === "voladizo") {
    anchoMuro = longitudPunta + espesorPantalla + longitudTalon
    xInterfaz = anchoMuro // borde derecho de la zapata = plano virtual (vertical, no seincluye la inclinación θ aquí porque el análisis de Rankine es sobre un plano vertical)
  } else if (tipoMuro === "gravedad") {
    anchoMuro = anchoCorona + Math.max(0, desplazTotal) + anchoCorona * 0.15 // base ≈ corona + lo que se abre el trasdós con θ (+ un margen para la puntera)
    xInterfaz = anchoMuro // el trasdós real coincide con el borde derecho en la base
  } else {
    anchoMuro = espesorPantallaPlana + Math.max(0, desplazTotal)
    xInterfaz = anchoMuro
  }

  // ── escala: mismo px/metro en x e y para que el dibujo sea proporcional (no distorsionado) ──
  const plotHDeseado = 460
  const escala = Math.min(160, Math.max(18, plotHDeseado / zMax))
  const MT = 26, MB = 34
  const plotH = zMax * escala
  const height = plotH + MT + MB

  // ancho necesario: muro + zona de suelo/presiones + margen para etiquetas
  const anchoSueloPx = 230
  const anchoCunaBeta = Math.abs(betaDeg) > 0.1 ? Math.min(90, plotH * Math.tan(Math.abs(betaRad)) * 0.6) : 0
  const ML = 14
  const widthPx = ML + anchoMuro * escala + anchoSueloPx + anchoCunaBeta + 40
  const MR = widthPx - ML - anchoMuro * escala - anchoSueloPx - anchoCunaBeta

  const toY = (z: number) => MT + z * escala
  const toXm = (xMetros: number) => ML + xMetros * escala // convierte una coordenada horizontal en metros a px
  const yTope = toY(0), yBase = toY(zMax)
  const xInterfazPx = toXm(xInterfaz)

  // ── silueta del muro ──
  let wallPath = ""
  if (tipoMuro === "voladizo") {
    const yZapataTop = yBase - espesorZapata * escala
    const xStemIzq = toXm(longitudPunta)
    const xStemDer = toXm(longitudPunta + espesorPantalla)
    wallPath = `M ${toXm(0)} ${yBase} L ${toXm(anchoMuro)} ${yBase} L ${toXm(anchoMuro)} ${yZapataTop} `
      + `L ${xStemDer} ${yZapataTop} L ${xStemDer} ${yTope} L ${xStemIzq} ${yTope} L ${xStemIzq} ${yZapataTop} `
      + `L ${toXm(0)} ${yZapataTop} Z`
  } else if (tipoMuro === "gravedad") {
    const xBaseDer = toXm(anchoMuro)
    const xBaseIzq = toXm(0)
    const xCoronaDer = xInterfazPx - desplazTotal * escala // el trasdós sube inclinado θ desde la base
    const xCoronaIzq = xCoronaDer - anchoCorona * escala
    wallPath = `M ${xBaseIzq} ${yBase} L ${xBaseDer} ${yBase} L ${xCoronaDer} ${yTope} L ${xCoronaIzq} ${yTope} Z`
  } else {
    const xDer = xInterfazPx
    const xDerTope = xDer - desplazTotal * escala
    const xIzqBase = xDer - espesorPantallaPlana * escala
    const xIzqTope = xDerTope - espesorPantallaPlana * escala
    wallPath = `M ${xIzqBase} ${yBase} L ${xDer} ${yBase} L ${xDerTope} ${yTope} L ${xIzqTope} ${yTope} Z`
  }

  // en la base, el trasdós real (o plano virtual) está siempre en xInterfazPx;
  // en la corona sube desplazado por θ
  const xInterfazTopePx = xInterfazPx - desplazTotal * escala

  // ── relleno de suelo, pegado al trasdós/plano virtual, con la corona siguiendo β ──
  // borde superior del relleno: desde (xInterfazTopePx, yTope) sube con pendiente β hacia la derecha
  const runBeta = anchoSueloPx + anchoCunaBeta
  const xFinSuelo = xInterfazTopePx + runBeta
  const yFinSueloTope = yTope - runBeta * Math.tan(betaRad)

  const capasConTope = capas.map(c => {
    // altura del borde superior de la capa considerando el talud (se interpola sobre la línea de β
    // en la franja horizontal que le corresponde a esta profundidad de capa, solo para el dibujo)
    return c
  })

  const maxSigma = Math.max(1e-6, ...perfil.map(p => Math.abs(p.sigmaHTotal)))
  const escalaPresion = Math.min(anchoSueloPx * 0.85 / maxSigma, 999)

  function pathPresion(valores: { z: number; v: number }[], zTop: number, zBottom: number, colorRef: string) {
    const sub = valores.filter(p => p.z >= zTop - 1e-9 && p.z <= zBottom + 1e-9).sort((a, b) => a.z - b.z)
    if (sub.length < 2) return null
    const puntosArriba = sub.map(p => `${xInterfazPx + Math.max(0, p.v) * escalaPresion},${toY(p.z)}`)
    const puntosAbajo = [...sub].reverse().map(p => `${xInterfazPx},${toY(p.z)}`)
    return `M ${puntosArriba.join(" L ")} L ${puntosAbajo.join(" L ")} Z`
  }

  const NFy = nfActivo && nfDepth !== null ? toY(nfDepth) : null

  const breakpoints = Array.from(
    new Set([0, ...capas.map(c => c.zBottom), ...(nfActivo && nfDepth !== null ? [nfDepth] : [])])
  ).filter(z => z >= 0 && z <= zMax + 1e-9).sort((a, b) => a - b)

  return (
    <div>
      <svg viewBox={`0 0 ${widthPx} ${height}`} width="100%" className="border border-gray-100 rounded-lg bg-white" style={{ maxHeight: height + 20 }}>
        {/* relleno de suelo por capa, pegado al muro, con la corona siguiendo el talud β */}
        {capas.map((c, i) => {
          const yT = toY(c.zTop), yB = toY(c.zBottom)
          // borde superior de esta franja: si la capa empieza en superficie (zTop=0) sigue la línea β,
          // si no, es simplemente horizontal a esa profundidad (el talud solo afecta la superficie libre)
          const sigueBeta = c.zTop <= 1e-9
          const puntosSuelo = sigueBeta
            ? `${xInterfazTopePx},${yT} ${xFinSuelo},${yFinSueloTope} ${xFinSuelo},${yB} ${xInterfazPx},${yB}`
            : `${xInterfazPx},${yT} ${xFinSuelo},${yT} ${xFinSuelo},${yB} ${xInterfazPx},${yB}`
          const nfCorta = nfActivo && nfDepth !== null && nfDepth > c.zTop && nfDepth < c.zBottom
          return (
            <g key={c.id}>
              <polygon points={puntosSuelo} fill={PALETA_CAPAS[i % PALETA_CAPAS.length]} stroke="#9ca3af" strokeWidth={1} />
              <text x={xInterfazPx + 8} y={(yT + yB) / 2} fontSize="9" fill="#374151" fontWeight="600">{c.nombre}</text>
              {nfCorta && NFy !== null && (
                <line x1={xInterfazPx} y1={NFy} x2={xFinSuelo} y2={NFy} stroke={COLOR_AGUA} strokeWidth={1} strokeDasharray="3,2" />
              )}
            </g>
          )
        })}
        {capas.slice(0, -1).map(c => (
          <line key={`sep-${c.id}`} x1={xInterfazPx} y1={toY(c.zBottom)} x2={xFinSuelo} y2={toY(c.zBottom)} stroke="#6b7280" strokeWidth={1} />
        ))}
        {Math.abs(betaDeg) > 0.1 && (
          <text x={(xInterfazTopePx + xFinSuelo) / 2} y={Math.min(yFinSueloTope, yTope) - 6} fontSize="9" fill="#6b7280" textAnchor="middle">β = {fmt(betaDeg, 1)}°</text>
        )}

        {/* muro (encima del relleno para que no se vea el suelo "adentro" del muro) */}
        <path d={wallPath} fill="#d1d5db" stroke="#4b5563" strokeWidth={1.25} />
        <text x={toXm(0)} y={yTope - 8} fontSize="9" fill="#6b7280">{PRESETS_MURO[tipoMuro].nombre}</text>
        {tipoMuro === "voladizo" && (
          <>
            <line x1={xInterfazPx} y1={yTope} x2={xInterfazPx} y2={yBase} stroke="#4b5563" strokeWidth={1} strokeDasharray="4,3" />
            <text x={xInterfazPx + 3} y={yTope + 11} fontSize="7.5" fill="#6b7280">plano virtual</text>
          </>
        )}

        {/* diagrama de presiones: un trapecio por capa (efectivo) + uno para el agua, semitransparentes */}
        {capas.map((c, i) => {
          const d = pathPresion(perfil.map(p => ({ z: p.z, v: p.sigmaHEf })), c.zTop, c.zBottom, PALETA_PRESION[i])
          if (!d) return null
          return <path key={`pres-${c.id}`} d={d} fill={PALETA_PRESION[i % PALETA_PRESION.length]} fillOpacity={0.55} stroke={PALETA_PRESION[i % PALETA_PRESION.length]} strokeWidth={1} />
        })}
        {nfActivo && nfDepth !== null && (() => {
          const d = pathPresion(perfil.map(p => ({ z: p.z, v: p.u })), 0, zMax, COLOR_AGUA)
          return d ? <path d={d} fill={COLOR_AGUA} fillOpacity={0.35} stroke={COLOR_AGUA} strokeWidth={1} strokeDasharray="2,2" /> : null
        })()}

        {/* flechas de resultante por capa */}
        {desglose.porCapa.map((r, i) => {
          if (r.E <= 0) return null
          const y = toY(r.zApp)
          const xPunta = xInterfazPx
          const xIni = xInterfazPx + Math.min(anchoSueloPx * 0.5, 60)
          return (
            <g key={`res-${r.id}`}>
              <line x1={xIni} y1={y} x2={xPunta} y2={y} stroke={PALETA_PRESION[i % PALETA_PRESION.length]} strokeWidth={1.5} />
              <polygon points={`${xPunta},${y} ${xPunta + 5},${y - 3} ${xPunta + 5},${y + 3}`} fill={PALETA_PRESION[i % PALETA_PRESION.length]} />
              <text x={xIni + 4} y={y - 4} fontSize="8" fill={PALETA_PRESION[i % PALETA_PRESION.length]} fontWeight="600">
                E = {fmt(aMostrarFuerzaPorLong(r.E, unidadFuerza, unidadLong), 1)} {unidadFuerza}/{unidadLong}
              </text>
            </g>
          )
        })}
        {desglose.agua.E > 0 && (() => {
          const y = toY(desglose.agua.zApp)
          const xPunta = xInterfazPx
          const xIni = xInterfazPx + Math.min(anchoSueloPx * 0.5, 60)
          return (
            <g>
              <line x1={xIni} y1={y} x2={xPunta} y2={y} stroke={COLOR_AGUA} strokeWidth={1.5} strokeDasharray="3,2" />
              <polygon points={`${xPunta},${y} ${xPunta + 5},${y - 3} ${xPunta + 5},${y + 3}`} fill={COLOR_AGUA} />
              <text x={xIni + 4} y={y + 12} fontSize="8" fill={COLOR_AGUA} fontWeight="600">
                Ew = {fmt(aMostrarFuerzaPorLong(desglose.agua.E, unidadFuerza, unidadLong), 1)} {unidadFuerza}/{unidadLong}
              </text>
            </g>
          )
        })()}

        {/* marcas de profundidad */}
        {breakpoints.map((t, i) => (
          <g key={i}>
            <line x1={xFinSuelo} y1={toY(t)} x2={xFinSuelo + 6} y2={toY(t)} stroke="#9ca3af" strokeWidth={1} />
            <text x={xFinSuelo + 10} y={toY(t) + 3} fontSize="8" fill="#6b7280">{fmt(aMostrarLong(t, unidadLong), t < 1 ? 2 : 1)}</text>
          </g>
        ))}
        <text x={xFinSuelo + 10} y={MT - 8} fontSize="8" fill="#9ca3af">z ({unidadLong})</text>
      </svg>
      <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
        Esquema a escala según las dimensiones ingresadas (mismo px/m en ambos ejes). El plano de contacto suelo-muro
        (trasdós real, o plano virtual del talón en el voladizo) queda directamente pegado al relleno. Los trapecios
        semitransparentes son el diagrama de presión efectiva de cada capa y, en azul punteado, el de presión de poros —
        cada uno con su propia resultante. No es un plano constructivo: no incluye armado ni chequeos de estabilidad.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TARJETA DE RESULTANTES DESGLOSADAS
// ─────────────────────────────────────────────────────────────────────────────
function TarjetaResultantes({
  desglose, unidadFuerza, unidadLong, estado,
}: { desglose: ReturnType<typeof resultantesDesglosadas>; unidadFuerza: string; unidadLong: string; estado: EstadoEmpuje }) {
  const etiqueta = estado === "activo" ? "Ea" : estado === "pasivo" ? "Ep" : "E0"
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">RESULTANTES POR CAPA Y POR AGUA</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left py-1.5 font-medium">Componente</th>
            <th className="text-right py-1.5 font-medium">Fuerza</th>
            <th className="text-right py-1.5 font-medium">Punto de aplicación (sobre la base)</th>
          </tr>
        </thead>
        <tbody>
          {desglose.porCapa.map((r, i) => (
            <tr key={r.id} className="border-b border-gray-50">
              <td className="py-1.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: PALETA_PRESION[i % PALETA_PRESION.length] }} />
                {r.nombre} (efectivo)
              </td>
              <td className="text-right py-1.5">{fmt(aMostrarFuerzaPorLong(r.E, unidadFuerza, unidadLong), 2)} {unidadFuerza}/{unidadLong}</td>
              <td className="text-right py-1.5 text-gray-500">{r.E > 0 ? `${fmt(aMostrarLong(r.zApp, unidadLong), 2)} ${unidadLong}` : "—"}</td>
            </tr>
          ))}
          {desglose.agua.E > 0 && (
            <tr className="border-b border-gray-50">
              <td className="py-1.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLOR_AGUA }} />
                Agua (presión de poros)
              </td>
              <td className="text-right py-1.5">{fmt(aMostrarFuerzaPorLong(desglose.agua.E, unidadFuerza, unidadLong), 2)} {unidadFuerza}/{unidadLong}</td>
              <td className="text-right py-1.5 text-gray-500">{fmt(aMostrarLong(desglose.agua.zApp, unidadLong), 2)} {unidadLong}</td>
            </tr>
          )}
          <tr className="font-semibold text-blue-800">
            <td className="py-2">Total ({etiqueta})</td>
            <td className="text-right py-2">{fmt(aMostrarFuerzaPorLong(desglose.total.E, unidadFuerza, unidadLong), 2)} {unidadFuerza}/{unidadLong}</td>
            <td className="text-right py-2">{desglose.total.E > 0 ? `${fmt(aMostrarLong(desglose.total.zApp, unidadLong), 2)} ${unidadLong}` : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-gray-400 mt-2">
        El total se calcula integrando directamente la presión total (efectiva + agua) — no es la simple suma de las filas
        de arriba cuando hay grieta de tracción coincidiendo con zona bajo el nivel freático (caso poco común).
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TARJETA DE CAPA
// ─────────────────────────────────────────────────────────────────────────────
function TarjetaCapa({
  capa, index, unidadLong, unidadPesoU, unidadPres, zTop, zBottom, betaGlobal,
  onChange, onEliminar,
}: {
  capa: Capa; index: number; unidadLong: string; unidadPesoU: string; unidadPres: string
  zTop: number; zBottom: number; betaGlobal: string
  onChange: (c: Capa) => void; onEliminar: () => void
}) {
  const set = (patch: Partial<Capa>) => onChange({ ...capa, ...patch })

  const fasesResueltas = useMemo(() => {
    if (capa.modoGamma !== "fases") return undefined
    const conocidos: Vars = {}
    for (const v of VARS_FASES) {
      if (capa.conocidos[v.key] && capa.entradas[v.key]) {
        const num = parseFloat(capa.entradas[v.key]!)
        if (Number.isFinite(num)) conocidos[v.key] = v.esPorcentaje ? num / 100 : num
      }
    }
    return resolverFases(conocidos, GAMMA_W)
  }, [capa.modoGamma, capa.conocidos, capa.entradas])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 rounded-full w-5 h-5 flex items-center justify-center">{index + 1}</span>
          <input value={capa.nombre} onChange={e => set({ nombre: e.target.value })}
            className="text-sm font-medium text-gray-800 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none px-1" />
        </div>
        <button onClick={onEliminar} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Eliminar</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <Campo label="Espesor" value={capa.espesor} onChange={v => set({ espesor: v })} sufijo={unidadLong} />
        <div className="col-span-2 sm:col-span-2">
          <div className="text-xs text-gray-500 mb-1">Profundidad (calculada)</div>
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            {fmt(aMostrarLong(zTop, unidadLong), 2)} — {fmt(aMostrarLong(zBottom, unidadLong), 2)} {unidadLong}
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input type="radio" checked={capa.modoGamma === "directo"} onChange={() => set({ modoGamma: "directo" })} className="accent-blue-700" />
          Peso unitario directo
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input type="radio" checked={capa.modoGamma === "fases"} onChange={() => set({ modoGamma: "fases" })} className="accent-blue-700" />
          Resolver por relaciones de fase
        </label>
      </div>

      {capa.modoGamma === "directo" ? (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Campo label="γ (o γsat si hay NF)" value={capa.gammaArriba} onChange={v => set({ gammaArriba: v })} sufijo={unidadPesoU} />
          <Campo label="γsat (bajo el NF)" value={capa.gammaAbajo} onChange={v => set({ gammaAbajo: v })} sufijo={unidadPesoU} placeholder="opcional" />
        </div>
      ) : (
        <div className="mb-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
            {VARS_FASES.map(v => (
              <div key={v.key} className={`rounded-lg border px-2 py-1.5 ${capa.conocidos[v.key] ? "border-blue-300 bg-blue-50" : "border-gray-200"}`}>
                <label className="flex items-center gap-1 text-[10px] text-gray-500 mb-1 cursor-pointer">
                  <input type="checkbox" checked={!!capa.conocidos[v.key]}
                    onChange={e => set({ conocidos: { ...capa.conocidos, [v.key]: e.target.checked } })}
                    className="w-3 h-3 accent-blue-700" />
                  <span dangerouslySetInnerHTML={{ __html: v.labelHtml }} />
                </label>
                <input type="number" step="any" disabled={!capa.conocidos[v.key]}
                  value={capa.entradas[v.key] ?? ""}
                  onChange={e => set({ entradas: { ...capa.entradas, [v.key]: e.target.value } })}
                  className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs disabled:bg-gray-50 focus:outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
          <span className="text-[11px] px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
            γsat = {fasesResueltas?.gammasat !== undefined ? fmt(fasesResueltas.gammasat, 2) + " " + unidadPesoU : "—"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
        <Campo label="φ' (ángulo de fricción)" value={capa.phi} onChange={v => set({ phi: v })} sufijo="°" />
        <Campo label="c' (cohesión)" value={capa.c} onChange={v => set({ c: v })} sufijo={unidadPres} placeholder="0 = friccionante" />
        <Campo label="OCR" value={capa.ocr} onChange={v => set({ ocr: v })} placeholder="1 = NC" />
        <div>
          <Toggle label="β propio (talud)" checked={capa.betaPropio} onChange={v => set({ betaPropio: v })} />
          {capa.betaPropio ? (
            <div className="mt-1"><Campo label="" value={capa.betaLocal} onChange={v => set({ betaLocal: v })} sufijo="°" /></div>
          ) : (
            <div className="text-xs text-gray-400 mt-2">Usa el β global ({betaGlobal || "0"}°)</div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
        K0 (reposo) = (1 − sen φ') · OCR<sup>sen φ'</sup> (Jaky / Mayne &amp; Kulhawy, 1982) — usa el mismo φ' y OCR de esta capa, sin distinción por tipo de suelo.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TARJETA DE RESULTADOS — coeficientes K por capa
// ─────────────────────────────────────────────────────────────────────────────
function TarjetaK({
  capasResueltas, Ks, estado,
}: { capasResueltas: CapaResuelta[]; Ks: number[]; estado: EstadoEmpuje }) {
  const etiquetaK = estado === "activo" ? "Ka" : estado === "pasivo" ? "Kp" : "K0"
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">COEFICIENTES DE EMPUJE ({etiquetaK}) POR CAPA</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="text-left py-1.5 font-medium">Capa</th>
              <th className="text-right py-1.5 font-medium">φ' (°)</th>
              {estado === "reposo" && <th className="text-right py-1.5 font-medium">OCR</th>}
              <th className="text-right py-1.5 font-medium">{etiquetaK}</th>
            </tr>
          </thead>
          <tbody>
            {capasResueltas.map((c, i) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="py-1.5">{c.nombre}</td>
                <td className="text-right py-1.5">{fmt(c.phi, 1)}</td>
                {estado === "reposo" && <td className="text-right py-1.5 text-gray-500">{fmt(c.ocr, 2)}</td>}
                <td className="text-right py-1.5 text-blue-700 font-semibold">{fmt(Ks[i], 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function PresionTierras() {
  const [tab, setTab] = useState("sinmuro")

  const [unidadLong, setUnidadLong] = useState("m")
  const [unidadPesoU, setUnidadPesoU] = useState("kN/m³")
  const [unidadPres, setUnidadPres] = useState("kPa")
  const [unidadFuerza, setUnidadFuerza] = useState("kN")

  // ── capas compartidas (suelo detrás del muro / del talud) ──
  const [capas, setCapas] = useState<Capa[]>([nuevaCapa("Capa 1")])
  const [nfActivo, setNfActivo] = useState(false)
  const [nfProfundidad, setNfProfundidad] = useState("")

  const capasResueltas: CapaResuelta[] = useMemo(() => {
    let z = 0
    return capas.map(c => {
      const espesor = aBaseLong(parseFloat(c.espesor) || 0, unidadLong)
      const zTop = z, zBottom = z + espesor
      z = zBottom

      let gammaArriba: number | undefined
      let gammaAbajo: number | undefined

      if (c.modoGamma === "directo") {
        const ga = parseFloat(c.gammaArriba), gs = parseFloat(c.gammaAbajo)
        gammaArriba = Number.isFinite(ga) ? aBasePesoU(ga, unidadPesoU) : undefined
        gammaAbajo = Number.isFinite(gs) ? aBasePesoU(gs, unidadPesoU) : gammaArriba
      } else {
        const conocidos: Vars = {}
        for (const v of VARS_FASES) {
          if (c.conocidos[v.key] && c.entradas[v.key]) {
            const num = parseFloat(c.entradas[v.key]!)
            if (Number.isFinite(num)) conocidos[v.key] = v.esPorcentaje ? num / 100 : num
          }
        }
        const res = resolverFases(conocidos, GAMMA_W)
        gammaArriba = res.gamma ?? res.gammad
        gammaAbajo = res.gammasat ?? gammaArriba
      }

      return {
        id: c.id, nombre: c.nombre, zTop, zBottom, gammaArriba, gammaAbajo,
        phi: parseFloat(c.phi) || 0,
        c: aBasePresAKPa(parseFloat(c.c) || 0, unidadPres),
        ocr: parseFloat(c.ocr) || 1,
        betaLocal: c.betaPropio ? (parseFloat(c.betaLocal) || 0) : undefined,
      }
    })
  }, [capas, unidadLong, unidadPesoU, unidadPres])

  const zMax = capasResueltas.length ? capasResueltas[capasResueltas.length - 1].zBottom : 0
  const nfDepthBase = nfActivo && nfProfundidad !== "" ? aBaseLong(parseFloat(nfProfundidad) || 0, unidadLong) : null

  const errorPerfil = useMemo(() => {
    if (capasResueltas.some(c => !(c.zBottom > c.zTop))) return "Todas las capas deben tener un espesor mayor a cero."
    for (const c of capasResueltas) {
      if (c.gammaArriba === undefined) return `Falta γ en "${c.nombre}".`
      if (c.phi <= 0 && c.c <= 0) return `Define φ' o c' (mayor a cero) en "${c.nombre}".`
    }
    if (nfActivo && nfProfundidad === "") return "Ingresa la profundidad del nivel freático."
    return null
  }, [capasResueltas, nfActivo, nfProfundidad])

  const perfilGeostatico: PuntoGeostatico[] = useMemo(() => {
    if (errorPerfil) return []
    const capasG: CapaGeostatica[] = capasResueltas.map(c => ({
      zTop: c.zTop, zBottom: c.zBottom, gammaArriba: c.gammaArriba, gammaAbajo: c.gammaAbajo,
    }))
    return resolverPerfilGeostatico(capasG, nfDepthBase, false, 0)
  }, [capasResueltas, nfDepthBase, errorPerfil])

  function agregarCapa() { setCapas([...capas, nuevaCapa(`Capa ${capas.length + 1}`)]) }
  function actualizarCapa(id: string, c: Capa) { setCapas(capas.map(x => x.id === id ? c : x)) }
  function eliminarCapa(id: string) { setCapas(capas.filter(x => x.id !== id)) }
  function cargarEjemplo() {
    const c1 = nuevaCapa("Arena limosa")
    c1.espesor = "4"; c1.gammaArriba = "18"; c1.gammaAbajo = "20"; c1.phi = "30"; c1.c = "0"
    const c2 = nuevaCapa("Arcilla firme (NC)")
    c2.espesor = "3"; c2.gammaArriba = "17"; c2.gammaAbajo = "18.5"; c2.phi = "22"; c2.c = "35"; c2.ocr = "1"
    setCapas([c1, c2])
    setNfActivo(true); setNfProfundidad("2")
  }
  function limpiar() {
    setCapas([nuevaCapa("Capa 1")]); setNfActivo(false); setNfProfundidad("")
  }

  // ── PESTAÑA 1: sin muro ──
  const [teoria1, setTeoria1] = useState<TeoriaEmpuje>("rankine")
  const [estado1, setEstado1] = useState<EstadoEmpuje>("activo")
  const [beta1, setBeta1] = useState("0")
  const [delta1, setDelta1] = useState("0")

  const capasLat1 = capasResueltas.map(c => ({
    zTop: c.zTop, zBottom: c.zBottom, phi: c.phi, c: c.c, ocr: c.ocr, betaLocal: c.betaLocal,
  }))

  const validez1 = useMemo(() => {
    if (capasResueltas.length === 0) return { valido: true } as Validez
    // se valida con la primera capa (representativa) — cada capa se valida internamente igual
    for (const c of capasResueltas) {
      const beta = c.betaLocal ?? (parseFloat(beta1) || 0)
      const v = estado1 === "reposo"
        ? { valido: true }
        : teoria1 === "rankine" ? validezRankine(c.phi, beta) : validezCoulomb(c.phi, parseFloat(delta1) || 0, beta, 0, estado1)
      if (!v.valido) return v
    }
    return { valido: true } as Validez
  }, [capasResueltas, teoria1, estado1, beta1, delta1])

  const perfilLateral1: PuntoLateral[] = useMemo(() => {
    if (errorPerfil || !validez1.valido || perfilGeostatico.length === 0) return []
    return resolverPerfilLateral(perfilGeostatico, capasLat1, teoria1, estado1, parseFloat(beta1) || 0, parseFloat(delta1) || 0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilGeostatico, capasResueltas, teoria1, estado1, beta1, delta1, errorPerfil, validez1])

  const resultante1 = useMemo(() => resultanteLateral(perfilLateral1), [perfilLateral1])

  const Ks1 = useMemo(() => {
    if (errorPerfil) return []
    return resumenKPorCapa(capasLat1, teoria1, estado1, parseFloat(beta1) || 0, parseFloat(delta1) || 0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capasResueltas, teoria1, estado1, beta1, delta1, errorPerfil])

  const grietaInfo1 = useMemo(() => {
    if (estado1 !== "activo" || capasResueltas.length === 0) return null
    const c0 = capasResueltas[0]
    if (c0.c <= 0) return null
    const Ka0 = teoria1 === "rankine" ? kaRankine(c0.phi, c0.betaLocal ?? (parseFloat(beta1) || 0))
      : kaCoulomb(c0.phi, parseFloat(delta1) || 0, c0.betaLocal ?? (parseFloat(beta1) || 0), 0)
    return profundidadGrieta(c0.c, c0.gammaArriba ?? GAMMA_W, Ka0)
  }, [estado1, capasResueltas, teoria1, beta1, delta1])

  // ── PESTAÑA 2: muros ──
  const [tipoMuro, setTipoMuro] = useState<keyof typeof PRESETS_MURO>("voladizo")
  const [teoria2, setTeoria2] = useState<TeoriaEmpuje>("rankine")
  const [estado2, setEstado2] = useState<EstadoEmpuje>("activo")
  const [beta2, setBeta2] = useState("0")
  const [delta2, setDelta2] = useState("0")
  const [theta2, setTheta2] = useState("0")

  const [dimsVoladizo, setDimsVoladizo] = useState<DimsVoladizo>(DIMS_VOLADIZO_DEFAULT)
  const [dimsGravedad, setDimsGravedad] = useState<DimsGravedad>(DIMS_GRAVEDAD_DEFAULT)
  const [dimsPantalla, setDimsPantalla] = useState<DimsPantalla>(DIMS_PANTALLA_DEFAULT)

  function aplicarPreset() {
    const p = PRESETS_MURO[tipoMuro]
    setTeoria2(p.teoria)
    setTheta2(String(p.theta))
    const phi0 = capasResueltas[0]?.phi ?? 30
    setDelta2(String(Math.round(p.deltaFactor * phi0 * 10) / 10))
  }

  const validez2 = useMemo(() => {
    for (const c of capasResueltas) {
      const beta = c.betaLocal ?? (parseFloat(beta2) || 0)
      const v = estado2 === "reposo"
        ? { valido: true }
        : teoria2 === "rankine" ? validezRankine(c.phi, beta) : validezCoulomb(c.phi, parseFloat(delta2) || 0, beta, parseFloat(theta2) || 0, estado2)
      if (!v.valido) return v
    }
    return { valido: true } as Validez
  }, [capasResueltas, teoria2, estado2, beta2, delta2, theta2])

  const perfilLateral2: PuntoLateral[] = useMemo(() => {
    if (errorPerfil || !validez2.valido || perfilGeostatico.length === 0) return []
    return resolverPerfilLateral(perfilGeostatico, capasLat1, teoria2, estado2, parseFloat(beta2) || 0, parseFloat(delta2) || 0, parseFloat(theta2) || 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilGeostatico, capasResueltas, teoria2, estado2, beta2, delta2, theta2, errorPerfil, validez2])

  const resultante2 = useMemo(() => resultanteLateral(perfilLateral2), [perfilLateral2])
  const desglose2 = useMemo(
    () => resultantesDesglosadas(perfilLateral2, capasResueltas.map(c => ({ id: c.id, nombre: c.nombre, zTop: c.zTop, zBottom: c.zBottom }))),
    [perfilLateral2, capasResueltas]
  )

  const Ks2 = useMemo(() => {
    if (errorPerfil) return []
    return resumenKPorCapa(capasLat1, teoria2, estado2, parseFloat(beta2) || 0, parseFloat(delta2) || 0, parseFloat(theta2) || 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capasResueltas, teoria2, estado2, beta2, delta2, theta2, errorPerfil])

  const deltaRad2 = (parseFloat(delta2) || 0) * Math.PI / 180
  const Eh2 = resultante2.E * Math.cos(deltaRad2)
  const Ev2 = resultante2.E * Math.sin(deltaRad2)
  const alturaAplicacion2 = zMax - resultante2.zApp

  const seriesFactory = (perfil: PuntoLateral[]) => [
    { label: "σ'v (vertical efectivo)", color: "#9ca3af", puntos: perfil.map(p => ({ z: aMostrarLong(p.z, unidadLong), v: aMostrarPresDesdeKPa(p.sigmaEf, unidadPres) })), dash: true },
    { label: "σ'h (efectivo)", color: "#1d4ed8", puntos: perfil.map(p => ({ z: aMostrarLong(p.z, unidadLong), v: aMostrarPresDesdeKPa(p.sigmaHEf, unidadPres) })) },
    { label: "u (poros)", color: "#059669", puntos: perfil.map(p => ({ z: aMostrarLong(p.z, unidadLong), v: aMostrarPresDesdeKPa(p.u, unidadPres) })), dash: true },
    { label: "σh total", color: "#dc2626", puntos: perfil.map(p => ({ z: aMostrarLong(p.z, unidadLong), v: aMostrarPresDesdeKPa(p.sigmaHTotal, unidadPres) })) },
  ]

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos / Geotecnia /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Presión lateral de tierras</span>
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

            {/* ── Capas de suelo (compartidas por las dos pestañas) ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap gap-6 items-start">
              <div className="flex flex-col gap-2">
                <Toggle label="Considerar nivel freático" checked={nfActivo} onChange={setNfActivo} />
                {nfActivo && <div className="w-40"><Campo label="Profundidad del NF" value={nfProfundidad} onChange={setNfProfundidad} sufijo={unidadLong} /></div>}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {capas.map((c, i) => {
                const r = capasResueltas[i]
                return (
                  <TarjetaCapa key={c.id} capa={c} index={i} unidadLong={unidadLong} unidadPesoU={unidadPesoU} unidadPres={unidadPres}
                    zTop={r?.zTop ?? 0} zBottom={r?.zBottom ?? 0} betaGlobal={tab === "sinmuro" ? beta1 : beta2}
                    onChange={nc => actualizarCapa(c.id, nc)} onEliminar={() => eliminarCapa(c.id)} />
                )
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={agregarCapa} className="bg-blue-700 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-blue-800 transition-colors font-medium">+ Agregar capa</button>
              <button onClick={cargarEjemplo} className="text-sm text-blue-700 px-4 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">Cargar ejemplo</button>
              <button onClick={limpiar} className="text-sm text-gray-500 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">Limpiar todo</button>
            </div>

            {errorPerfil && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{errorPerfil}</div>}

            <Tabs activo={tab} onChange={setTab} tabs={[
              { id: "sinmuro", label: "Reposo / Activa / Pasiva (sin muro)" },
              { id: "muros", label: "Muros de contención" },
            ]} />

            {tab === "sinmuro" && !errorPerfil && perfilGeostatico.length > 0 && (
              <div className="flex flex-col gap-5">
                <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap gap-4 items-end">
                  <div className="w-52">
                    <Selector label="Estado" value={estado1 === "activo" ? "Activo" : estado1 === "pasivo" ? "Pasivo" : "Reposo (K0)"}
                      onChange={v => setEstado1(v === "Activo" ? "activo" : v === "Pasivo" ? "pasivo" : "reposo")}
                      opciones={["Activo", "Pasivo", "Reposo (K0)"]} />
                  </div>
                  {estado1 !== "reposo" && (
                    <div className="w-52">
                      <Selector label="Teoría" value={teoria1 === "rankine" ? "Rankine" : "Coulomb"}
                        onChange={v => setTeoria1(v === "Rankine" ? "rankine" : "coulomb")} opciones={["Rankine", "Coulomb"]} />
                    </div>
                  )}
                  <div className="w-32"><Campo label="β talud (global)" value={beta1} onChange={setBeta1} sufijo="°" /></div>
                  {estado1 !== "reposo" && teoria1 === "coulomb" && (
                    <div className="w-32"><Campo label="δ (fricción)" value={delta1} onChange={setDelta1} sufijo="°" /></div>
                  )}
                </div>

                <AvisoValidez validez={validez1} />

                {grietaInfo1 !== null && grietaInfo1 > 0 && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Suelo cohesivo en estado activo: grieta de tracción teórica hasta z ≈ {fmt(aMostrarLong(grietaInfo1, unidadLong), 2)} {unidadLong}
                    (σ'h negativo por encima de esa profundidad — se ignora en el cálculo de la resultante, práctica estándar).
                  </p>
                )}

                {validez1.valido && (
                  <>
                    <TarjetaK capasResueltas={capasResueltas} Ks={Ks1} estado={estado1} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
                        <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PRESIÓN LATERAL vs PROFUNDIDAD</div>
                        <ChartPresionLateral series={seriesFactory(perfilLateral1)} zMax={aMostrarLong(zMax, unidadLong)} xLabel={`Presión (${unidadPres})`} />
                        <div className="flex gap-4 mt-2 text-[11px] flex-wrap">
                          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-gray-400 inline-block" /> σ'v</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-700 inline-block" /> σ'h efectivo</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-600 inline-block" /> u</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-600 inline-block" /> σh total</span>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESQUEMA DEL PERFIL</div>
                        <DiagramaCapasLateral capas={capasResueltas} nfActivo={nfActivo} nfDepth={nfDepthBase} unidadLong={unidadLong} unidadPesoU={unidadPesoU} />
                      </div>
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="text-xs text-gray-500 tracking-wider mb-1">Resultante ({estado1 === "activo" ? "Ea" : estado1 === "pasivo" ? "Ep" : "E0"})</div>
                        <div className="text-2xl font-semibold text-blue-800">{fmt(aMostrarFuerzaPorLong(resultante1.E, unidadFuerza, unidadLong), 2)} {unidadFuerza}/{unidadLong}</div>
                        <div className="text-xs text-gray-500 mt-1">Punto de aplicación: {fmt(aMostrarLong(zMax - resultante1.zApp, unidadLong), 2)} {unidadLong} sobre la base</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "muros" && !errorPerfil && perfilGeostatico.length > 0 && (
              <div className="flex flex-col gap-5">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex flex-wrap gap-4 items-end mb-3">
                    <div className="w-64">
                      <Selector label="Tipo de muro" value={PRESETS_MURO[tipoMuro].nombre}
                        onChange={v => setTipoMuro(Object.keys(PRESETS_MURO).find(k => PRESETS_MURO[k].nombre === v) as keyof typeof PRESETS_MURO)}
                        opciones={Object.values(PRESETS_MURO).map(p => p.nombre)} />
                    </div>
                    <button onClick={aplicarPreset} className="text-xs text-blue-700 border border-blue-200 rounded-lg px-3 py-2.5 hover:bg-blue-50">
                      Aplicar valores típicos
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">{PRESETS_MURO[tipoMuro].nota}</p>

                  <div className="flex flex-wrap gap-4 items-end mb-4">
                    <div className="w-52">
                      <Selector label="Estado" value={estado2 === "activo" ? "Activo" : estado2 === "pasivo" ? "Pasivo" : "Reposo (K0)"}
                        onChange={v => setEstado2(v === "Activo" ? "activo" : v === "Pasivo" ? "pasivo" : "reposo")}
                        opciones={["Activo", "Pasivo", "Reposo (K0)"]} />
                    </div>
                    {estado2 !== "reposo" && (
                      <div className="w-52">
                        <Selector label="Teoría" value={teoria2 === "rankine" ? "Rankine" : "Coulomb"}
                          onChange={v => setTeoria2(v === "Rankine" ? "rankine" : "coulomb")} opciones={["Rankine", "Coulomb"]} />
                      </div>
                    )}
                    <div className="w-32"><Campo label="β talud" value={beta2} onChange={setBeta2} sufijo="°" /></div>
                    <div className="w-32"><Campo label="θ trasdós" value={theta2} onChange={setTheta2} sufijo="°" /></div>
                    {estado2 !== "reposo" && teoria2 === "coulomb" && (
                      <div className="w-32"><Campo label="δ (fricción muro-suelo)" value={delta2} onChange={setDelta2} sufijo="°" /></div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-[11px] text-gray-400 font-medium tracking-wide mb-3">DIMENSIONES DEL MURO (para el esquema a escala)</div>
                    {tipoMuro === "voladizo" && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Campo label="Espesor de pantalla" value={dimsVoladizo.espesorPantalla} sufijo={unidadLong}
                          onChange={v => setDimsVoladizo({ ...dimsVoladizo, espesorPantalla: v })} />
                        <Campo label="Espesor de zapata" value={dimsVoladizo.espesorZapata} sufijo={unidadLong}
                          onChange={v => setDimsVoladizo({ ...dimsVoladizo, espesorZapata: v })} />
                        <Campo label="Longitud de puntera" value={dimsVoladizo.longitudPunta} sufijo={unidadLong}
                          onChange={v => setDimsVoladizo({ ...dimsVoladizo, longitudPunta: v })} />
                        <Campo label="Longitud de talón" value={dimsVoladizo.longitudTalon} sufijo={unidadLong}
                          onChange={v => setDimsVoladizo({ ...dimsVoladizo, longitudTalon: v })} />
                      </div>
                    )}
                    {tipoMuro === "gravedad" && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Campo label="Ancho de corona" value={dimsGravedad.anchoCorona} sufijo={unidadLong}
                          onChange={v => setDimsGravedad({ ...dimsGravedad, anchoCorona: v })} />
                        <div className="col-span-3 text-[11px] text-gray-400 flex items-end pb-2">
                          El ancho en la base se deriva de la corona y de θ (trasdós), para no duplicar la inclinación con dos fuentes distintas.
                        </div>
                      </div>
                    )}
                    {tipoMuro === "pantalla" && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Campo label="Espesor de pantalla" value={dimsPantalla.espesor} sufijo={unidadLong}
                          onChange={v => setDimsPantalla({ ...dimsPantalla, espesor: v })} />
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2">La altura del muro se toma automáticamente igual a la profundidad total del perfil de suelo ({fmt(aMostrarLong(zMax, unidadLong), 2)} {unidadLong}).</p>
                  </div>
                </div>

                <AvisoValidez validez={validez2} />

                {validez2.valido && (
                  <>
                    <TarjetaK capasResueltas={capasResueltas} Ks={Ks2} estado={estado2} />

                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PRESIÓN LATERAL SOBRE EL MURO vs PROFUNDIDAD</div>
                      <ChartPresionLateral series={seriesFactory(perfilLateral2)} zMax={aMostrarLong(zMax, unidadLong)} xLabel={`Presión (${unidadPres})`} />
                      <div className="flex gap-4 mt-2 text-[11px] flex-wrap">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-gray-400 inline-block" /> σ'v</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-700 inline-block" /> σ'h efectivo</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-600 inline-block" /> u</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-600 inline-block" /> σh total</span>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESQUEMA DEL MURO Y DIAGRAMA DE PRESIONES</div>
                      <DiagramaMuroYPresiones
                        capas={capasResueltas} nfActivo={nfActivo} nfDepth={nfDepthBase}
                        tipoMuro={tipoMuro} thetaDeg={parseFloat(theta2) || 0} betaDeg={parseFloat(beta2) || 0}
                        perfil={perfilLateral2} desglose={desglose2} estado={estado2}
                        unidadLong={unidadLong} unidadFuerza={unidadFuerza}
                        dimsVoladizo={dimsVoladizo} dimsGravedad={dimsGravedad} dimsPantalla={dimsPantalla}
                      />
                    </div>

                    <TarjetaResultantes desglose={desglose2} unidadFuerza={unidadFuerza} unidadLong={unidadLong} estado={estado2} />

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex flex-col gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <div className="text-xs text-gray-500 tracking-wider mb-1">Resultante total ({estado2 === "activo" ? "Ea" : estado2 === "pasivo" ? "Ep" : "E0"})</div>
                          <div className="text-2xl font-semibold text-blue-800">{fmt(aMostrarFuerzaPorLong(resultante2.E, unidadFuerza, unidadLong), 2)} {unidadFuerza}/{unidadLong}</div>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-full bg-white text-blue-700 font-medium border border-blue-200">
                          {teoria2 === "rankine" ? "Rankine" : "Coulomb"} · δ = {delta2 || "0"}°
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                          <div className="text-[11px] text-gray-400">Componente horizontal</div>
                          <div className="font-medium text-blue-800">{fmt(aMostrarFuerzaPorLong(Eh2, unidadFuerza, unidadLong), 2)} {unidadFuerza}/{unidadLong}</div>
                        </div>
                        <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                          <div className="text-[11px] text-gray-400">Componente vertical</div>
                          <div className="font-medium text-blue-800">{fmt(aMostrarFuerzaPorLong(Ev2, unidadFuerza, unidadLong), 2)} {unidadFuerza}/{unidadLong}</div>
                        </div>
                        <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                          <div className="text-[11px] text-gray-400">Altura de aplicación (desde la base)</div>
                          <div className="font-medium text-blue-800">{fmt(aMostrarLong(alturaAplicacion2, unidadLong), 2)} {unidadLong}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
                      <span className="font-semibold text-gray-600">Alcance de esta pestaña:</span>{" "}
                      se entrega el diagrama de presión lateral, el desglose por capa y por agua, la fuerza resultante
                      (con su descomposición y punto de aplicación) y un esquema a escala del muro sobre el trasdós/plano
                      virtual. No incluye chequeos de estabilidad (volcamiento, deslizamiento, capacidad portante,
                      excentricidad) — eso puede agregarse como un módulo de verificación posterior que reciba esta misma
                      resultante como dato de entrada.
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
