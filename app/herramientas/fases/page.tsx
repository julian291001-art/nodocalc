"use client"
import { useState, useMemo } from "react"
import Sidebar from "../../components/Sidebar"

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
type VarKey =
  | "Gs" | "e" | "n" | "w" | "S"
  | "gamma" | "gammad" | "gammasat" | "gammap"
  | "Ws" | "Ww" | "W"
  | "Vs" | "Vw" | "Va" | "Vv" | "V"

type Vars = Partial<Record<VarKey, number>>

type Grupo = "indices" | "unitarios" | "pesos" | "volumenes"

type VarMeta = {
  key: VarKey
  labelHtml: string
  grupo: Grupo
  esPorcentaje: boolean
  esUnitario: boolean   // usa unidad de peso unitario (γw)
  esPeso: boolean
  esVolumen: boolean
}

const ALL_VARS: VarKey[] = [
  "Gs", "e", "n", "w", "S",
  "gamma", "gammad", "gammasat", "gammap",
  "Ws", "Ww", "W",
  "Vs", "Vw", "Va", "Vv", "V",
]

const META: Record<VarKey, VarMeta> = {
  Gs:       { key: "Gs",       labelHtml: "Gravedad específica de sólidos G<sub>s</sub>",   grupo: "indices",   esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: false },
  e:        { key: "e",        labelHtml: "Relación de vacíos e",                            grupo: "indices",   esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: false },
  n:        { key: "n",        labelHtml: "Porosidad n (%)",                                 grupo: "indices",   esPorcentaje: true,  esUnitario: false, esPeso: false, esVolumen: false },
  w:        { key: "w",        labelHtml: "Contenido de agua w (%)",                          grupo: "indices",   esPorcentaje: true,  esUnitario: false, esPeso: false, esVolumen: false },
  S:        { key: "S",        labelHtml: "Grado de saturación S (%)",                       grupo: "indices",   esPorcentaje: true,  esUnitario: false, esPeso: false, esVolumen: false },
  gamma:    { key: "gamma",    labelHtml: "Peso unitario total γ",                           grupo: "unitarios", esPorcentaje: false, esUnitario: true,  esPeso: false, esVolumen: false },
  gammad:   { key: "gammad",   labelHtml: "Peso unitario seco γ<sub>d</sub>",                 grupo: "unitarios", esPorcentaje: false, esUnitario: true,  esPeso: false, esVolumen: false },
  gammasat: { key: "gammasat", labelHtml: "Peso unitario saturado γ<sub>sat</sub>",           grupo: "unitarios", esPorcentaje: false, esUnitario: true,  esPeso: false, esVolumen: false },
  gammap:   { key: "gammap",   labelHtml: "Peso unitario sumergido γ'",                       grupo: "unitarios", esPorcentaje: false, esUnitario: true,  esPeso: false, esVolumen: false },
  Ws:       { key: "Ws",       labelHtml: "Peso de sólidos W<sub>s</sub>",                    grupo: "pesos",     esPorcentaje: false, esUnitario: false, esPeso: true,  esVolumen: false },
  Ww:       { key: "Ww",       labelHtml: "Peso de agua W<sub>w</sub>",                       grupo: "pesos",     esPorcentaje: false, esUnitario: false, esPeso: true,  esVolumen: false },
  W:        { key: "W",        labelHtml: "Peso total W",                                     grupo: "pesos",     esPorcentaje: false, esUnitario: false, esPeso: true,  esVolumen: false },
  Vs:       { key: "Vs",       labelHtml: "Volumen de sólidos V<sub>s</sub>",                 grupo: "volumenes", esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: true  },
  Vw:       { key: "Vw",       labelHtml: "Volumen de agua V<sub>w</sub>",                    grupo: "volumenes", esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: true  },
  Va:       { key: "Va",       labelHtml: "Volumen de aire V<sub>a</sub>",                    grupo: "volumenes", esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: true  },
  Vv:       { key: "Vv",       labelHtml: "Volumen de vacíos V<sub>v</sub>",                  grupo: "volumenes", esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: true  },
  V:        { key: "V",        labelHtml: "Volumen total V",                                  grupo: "volumenes", esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: true  },
}

const GRUPOS: { id: Grupo; titulo: string }[] = [
  { id: "indices",   titulo: "Índices y relaciones" },
  { id: "unitarios", titulo: "Pesos unitarios" },
  { id: "pesos",     titulo: "Pesos" },
  { id: "volumenes", titulo: "Volúmenes" },
]

// ─────────────────────────────────────────────────────────────────────────────
// UNIDADES (según γw seleccionado)
// ─────────────────────────────────────────────────────────────────────────────
type PresetId = "kNm3" | "gcm3" | "kgm3"

const PRESETS: Record<PresetId, { yw: number; label: string; peso: string; volumen: string; unitario: string }> = {
  kNm3: { yw: 9.81, label: "kN/m³  (γw = 9.81)", peso: "kN", volumen: "m³", unitario: "kN/m³" },
  gcm3: { yw: 1,    label: "g/cm³  (γw = 1)",     peso: "g",  volumen: "cm³", unitario: "g/cm³" },
  kgm3: { yw: 1000, label: "kg/m³  (γw = 1000)",  peso: "kg", volumen: "m³", unitario: "kg/m³" },
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE RESOLUCIÓN (reglas + punto fijo)
// ─────────────────────────────────────────────────────────────────────────────
type Regla = { out: VarKey; inputs: VarKey[]; f: (v: Vars) => number }

function construirReglas(yw: number): Regla[] {
  return [
    // Volúmenes / índices
    { out: "e",  inputs: ["Vv", "Vs"], f: v => v.Vv! / v.Vs! },
    { out: "Vv", inputs: ["e", "Vs"],  f: v => v.e! * v.Vs! },
    { out: "Vs", inputs: ["Vv", "e"],  f: v => v.Vv! / v.e! },
    { out: "V",  inputs: ["Vs", "Vv"], f: v => v.Vs! + v.Vv! },
    { out: "Vs", inputs: ["V", "Vv"],  f: v => v.V! - v.Vv! },
    { out: "Vv", inputs: ["V", "Vs"],  f: v => v.V! - v.Vs! },
    { out: "n",  inputs: ["Vv", "V"],  f: v => v.Vv! / v.V! },
    { out: "Vv", inputs: ["n", "V"],   f: v => v.n! * v.V! },
    { out: "V",  inputs: ["Vv", "n"],  f: v => v.Vv! / v.n! },
    { out: "n",  inputs: ["e"],        f: v => v.e! / (1 + v.e!) },
    { out: "e",  inputs: ["n"],        f: v => v.n! / (1 - v.n!) },
    { out: "Vv", inputs: ["Vw", "Va"], f: v => v.Vw! + v.Va! },
    { out: "Vw", inputs: ["Vv", "Va"], f: v => v.Vv! - v.Va! },
    { out: "Va", inputs: ["Vv", "Vw"], f: v => v.Vv! - v.Vw! },
    { out: "V",  inputs: ["Vs", "Vw", "Va"], f: v => v.Vs! + v.Vw! + v.Va! },
    { out: "Vs", inputs: ["V", "Vw", "Va"],  f: v => v.V! - v.Vw! - v.Va! },
    { out: "Vw", inputs: ["V", "Vs", "Va"],  f: v => v.V! - v.Vs! - v.Va! },
    { out: "Va", inputs: ["V", "Vs", "Vw"],  f: v => v.V! - v.Vs! - v.Vw! },

    // Saturación
    { out: "S",  inputs: ["Vw", "Vv"], f: v => v.Vw! / v.Vv! },
    { out: "Vw", inputs: ["S", "Vv"],  f: v => v.S! * v.Vv! },
    { out: "Vv", inputs: ["Vw", "S"],  f: v => (v.S! !== 0 ? v.Vw! / v.S! : NaN) },

    // Humedad y pesos
    { out: "w",  inputs: ["Ww", "Ws"], f: v => v.Ww! / v.Ws! },
    { out: "Ww", inputs: ["w", "Ws"],  f: v => v.w! * v.Ws! },
    { out: "Ws", inputs: ["Ww", "w"],  f: v => (v.w! !== 0 ? v.Ww! / v.w! : NaN) },
    { out: "W",  inputs: ["Ws", "Ww"], f: v => v.Ws! + v.Ww! },
    { out: "Ws", inputs: ["W", "Ww"],  f: v => v.W! - v.Ww! },
    { out: "Ww", inputs: ["W", "Ws"],  f: v => v.W! - v.Ws! },
    { out: "Ww", inputs: ["Vw"],       f: v => v.Vw! * yw },
    { out: "Vw", inputs: ["Ww"],       f: v => v.Ww! / yw },

    // Gravedad específica
    { out: "Gs", inputs: ["Ws", "Vs"], f: v => v.Ws! / (v.Vs! * yw) },
    { out: "Ws", inputs: ["Gs", "Vs"], f: v => v.Gs! * v.Vs! * yw },
    { out: "Vs", inputs: ["Ws", "Gs"], f: v => v.Ws! / (v.Gs! * yw) },

    // Pesos unitarios
    { out: "gamma",  inputs: ["W", "V"],       f: v => v.W! / v.V! },
    { out: "W",      inputs: ["gamma", "V"],   f: v => v.gamma! * v.V! },
    { out: "V",      inputs: ["W", "gamma"],   f: v => v.W! / v.gamma! },
    { out: "gammad", inputs: ["Ws", "V"],      f: v => v.Ws! / v.V! },
    { out: "Ws",     inputs: ["gammad", "V"],  f: v => v.gammad! * v.V! },
    { out: "V",      inputs: ["Ws", "gammad"], f: v => v.Ws! / v.gammad! },
    { out: "gammad", inputs: ["gamma", "w"],   f: v => v.gamma! / (1 + v.w!) },
    { out: "gamma",  inputs: ["gammad", "w"],  f: v => v.gammad! * (1 + v.w!) },
    { out: "w",      inputs: ["gamma", "gammad"], f: v => v.gamma! / v.gammad! - 1 },
    { out: "gammad", inputs: ["Gs", "e"],      f: v => (v.Gs! * yw) / (1 + v.e!) },
    { out: "e",      inputs: ["Gs", "gammad"], f: v => (v.Gs! * yw) / v.gammad! - 1 },
    { out: "Gs",     inputs: ["gammad", "e"],  f: v => (v.gammad! * (1 + v.e!)) / yw },
    { out: "gammasat", inputs: ["Gs", "e"],    f: v => ((v.Gs! + v.e!) * yw) / (1 + v.e!) },
    { out: "gammasat", inputs: ["gammad", "n"], f: v => v.gammad! + v.n! * yw },
    { out: "gammap", inputs: ["gammasat"],     f: v => v.gammasat! - yw },
    { out: "gammasat", inputs: ["gammap"],     f: v => v.gammap! + yw },
    { out: "gammap", inputs: ["Gs", "e"],      f: v => ((v.Gs! - 1) * yw) / (1 + v.e!) },
    { out: "Gs",     inputs: ["gammap", "e"],  f: v => (v.gammap! * (1 + v.e!)) / yw + 1 },
    { out: "gamma",  inputs: ["Gs", "S", "e"], f: v => ((v.Gs! + v.S! * v.e!) * yw) / (1 + v.e!) },

    // Relación fundamental S·e = w·Gs
    { out: "e",  inputs: ["S", "w", "Gs"], f: v => (v.w! * v.Gs!) / v.S! },
    { out: "S",  inputs: ["e", "w", "Gs"], f: v => (v.w! * v.Gs!) / v.e! },
    { out: "w",  inputs: ["S", "e", "Gs"], f: v => (v.S! * v.e!) / v.Gs! },
    { out: "Gs", inputs: ["S", "e", "w"],  f: v => (v.S! * v.e!) / v.w! },
  ]
}

function resolverFases(conocidos: Vars, yw: number): Vars {
  const vars: Vars = { ...conocidos }
  const reglas = construirReglas(yw)
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
          vars[reg.out] = val < 0 && val > -1e-9 ? 0 : val
          cambio = true
        }
      }
    }
  }
  return vars
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────
function Campo({
  labelHtml, value, onChange, placeholder, sufijo,
}: {
  labelHtml: string; value: string; onChange: (v: string) => void
  placeholder?: string; sufijo?: string
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1" dangerouslySetInnerHTML={{ __html: labelHtml }} />
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

function ResultCard({
  meta, valor, esDato, sufijo,
}: { meta: VarMeta; valor: number | undefined; esDato: boolean; sufijo: string }) {
  const tieneValor = valor !== undefined && Number.isFinite(valor)
  const mostrado = tieneValor
    ? meta.esPorcentaje
      ? `${(valor! * 100).toFixed(2)} %`
      : `${valor!.toFixed(meta.key === "Gs" || meta.key === "e" ? 3 : 4)} ${sufijo}`
    : "—"

  return (
    <div className={`rounded-lg p-3 border
      ${tieneValor
        ? esDato ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"
        : "bg-gray-50 border-gray-100"}`}>
      <div className="text-xs text-gray-500 mb-0.5" dangerouslySetInnerHTML={{ __html: meta.labelHtml }} />
      <div className={`text-sm font-semibold
        ${tieneValor ? (esDato ? "text-blue-800" : "text-green-800") : "text-gray-300"}`}>
        {mostrado}
      </div>
      {tieneValor && (
        <div className={`text-[10px] mt-0.5 font-medium ${esDato ? "text-blue-400" : "text-green-500"}`}>
          {esDato ? "DATO INGRESADO" : "CALCULADO"}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FRACCIONES DE FASE (a partir de e/n y S — no requiere valores absolutos)
// ─────────────────────────────────────────────────────────────────────────────
type Fracciones =
  | { modo: "sin_datos" }
  | { modo: "indiferenciado"; solido: number; vacios: number }
  | { modo: "seco"; solido: number; aire: number }
  | { modo: "saturado"; solido: number; agua: number }
  | { modo: "completo"; solido: number; agua: number; aire: number }

function calcularFracciones(v: Vars): Fracciones {
  let n = v.n
  if (n === undefined && v.e !== undefined && Number.isFinite(v.e)) n = v.e / (1 + v.e)
  if (n === undefined || !Number.isFinite(n) || n < 0 || n > 1) return { modo: "sin_datos" }

  const solido = 1 - n
  const S = v.S

  if (S === undefined || !Number.isFinite(S)) return { modo: "indiferenciado", solido, vacios: n }
  if (S <= 1e-6) return { modo: "seco", solido, aire: n }
  if (S >= 1 - 1e-6) return { modo: "saturado", solido, agua: n }
  return { modo: "completo", solido, agua: S * n, aire: n - S * n }
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGRAMA DE FASES (SVG) — volúmenes a la izquierda, pesos a la derecha
// ─────────────────────────────────────────────────────────────────────────────
function DiagramaFases({
  fracciones, absolutos, unidadPeso, unidadVol, titulo,
}: {
  fracciones: Fracciones
  absolutos?: { V?: number; Vs?: number; Vw?: number; Va?: number; Ws?: number; Ww?: number }
  unidadPeso: string; unidadVol: string
  titulo?: string
}) {
  if (fracciones.modo === "sin_datos") {
    return (
      <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-6 text-center">
        Ingresa al menos e (o n) para ver el diagrama de fases. Agrega S para diferenciar agua y aire.
      </div>
    )
  }

  const fracAire   = fracciones.modo === "completo" ? fracciones.aire   : fracciones.modo === "seco" ? fracciones.aire : 0
  const fracAgua   = fracciones.modo === "completo" ? fracciones.agua   : fracciones.modo === "saturado" ? fracciones.agua : 0
  const fracVacios = fracciones.modo === "indiferenciado" ? fracciones.vacios : 0
  const fracSolido = fracciones.solido

  const w = 460, h = 320
  const colVolX = 150, colPesoX = 300, colAncho = 90
  const topY = 25, alturaTotal = 230

  const hAire    = fracAire * alturaTotal
  const hAgua    = fracAgua * alturaTotal
  const hVacios  = fracVacios * alturaTotal
  const hSolido  = fracSolido * alturaTotal

  const yTop = topY
  const yVaciosTop = topY
  const yAguaTop = topY + hAire
  const ySolidoTop = topY + hAire + hAgua + hVacios
  const yBase = topY + alturaTotal

  const fmtV = (x?: number) => (x !== undefined && Number.isFinite(x) ? `${x.toFixed(4)} ${unidadVol}` : null)
  const fmtP = (x?: number) => (x !== undefined && Number.isFinite(x) ? `${x.toFixed(4)} ${unidadPeso}` : null)

  const Va = absolutos?.Va, Vw = absolutos?.Vw, Vs = absolutos?.Vs, V = absolutos?.V
  const Ws = absolutos?.Ws, Ww = absolutos?.Ww

  return (
    <div>
      {titulo && <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">{titulo}</div>}
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" className="border border-gray-100 rounded-lg bg-white" style={{ maxHeight: 360 }}>
        <defs>
          <pattern id="hatchVacios" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#93c5fd" strokeWidth="2" />
          </pattern>
        </defs>

        {/* ── Columna de volúmenes ── */}
        {fracciones.modo === "completo" && (
          <>
            <rect x={colVolX} y={yTop} width={colAncho} height={hAire} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
            <rect x={colVolX} y={yTop + hAire} width={colAncho} height={hAgua} fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1" />
          </>
        )}
        {fracciones.modo === "seco" && (
          <rect x={colVolX} y={yTop} width={colAncho} height={hAire} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
        )}
        {fracciones.modo === "saturado" && (
          <rect x={colVolX} y={yTop} width={colAncho} height={hAgua} fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1" />
        )}
        {fracciones.modo === "indiferenciado" && (
          <rect x={colVolX} y={yTop} width={colAncho} height={hVacios} fill="url(#hatchVacios)" stroke="#93c5fd" strokeWidth="1" />
        )}
        <rect x={colVolX} y={ySolidoTop} width={colAncho} height={hSolido} fill="#d6d3d1" stroke="#78716c" strokeWidth="1" />

        {/* ── Columna de pesos (mismas alturas, lectura pareada) ── */}
        {fracciones.modo === "completo" && (
          <>
            <rect x={colPesoX} y={yTop} width={colAncho} height={hAire} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" />
            <rect x={colPesoX} y={yTop + hAire} width={colAncho} height={hAgua} fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1" />
          </>
        )}
        {fracciones.modo === "seco" && (
          <rect x={colPesoX} y={yTop} width={colAncho} height={hAire} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" />
        )}
        {fracciones.modo === "saturado" && (
          <rect x={colPesoX} y={yTop} width={colAncho} height={hAgua} fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1" />
        )}
        {fracciones.modo === "indiferenciado" && (
          <rect x={colPesoX} y={yTop} width={colAncho} height={hVacios} fill="url(#hatchVacios)" stroke="#93c5fd" strokeWidth="1" />
        )}
        <rect x={colPesoX} y={ySolidoTop} width={colAncho} height={hSolido} fill="#d6d3d1" stroke="#78716c" strokeWidth="1" />

        {/* Encabezados */}
        <text x={colVolX + colAncho / 2} y={16} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">VOLUMEN</text>
        <text x={colPesoX + colAncho / 2} y={16} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">PESO</text>

        {/* Etiquetas de fase (izquierda) y valores dentro de bloques */}
        {fracciones.modo === "completo" && (
          <>
            {hAire > 12 && <text x={colVolX - 8} y={yTop + hAire / 2 + 3} textAnchor="end" fontSize="9" fill="#0ea5e9">Aire</text>}
            <text x={colVolX - 8} y={yTop + hAire + hAgua / 2 + 3} textAnchor="end" fontSize="9" fill="#2563eb">Agua</text>
            {hAire > 12 && <text x={colVolX + colAncho / 2} y={yTop + hAire / 2 + 3} textAnchor="middle" fontSize="8" fill="#0369a1">{fmtV(Va) ?? "Va"}</text>}
            <text x={colVolX + colAncho / 2} y={yTop + hAire + hAgua / 2 + 3} textAnchor="middle" fontSize="8" fill="#1d4ed8">{fmtV(Vw) ?? "Vw"}</text>
            {hAire > 12 && <text x={colPesoX + colAncho / 2} y={yTop + hAire / 2 + 3} textAnchor="middle" fontSize="8" fill="#94a3b8">≈ 0</text>}
            <text x={colPesoX + colAncho / 2} y={yTop + hAire + hAgua / 2 + 3} textAnchor="middle" fontSize="8" fill="#1d4ed8">{fmtP(Ww) ?? "Ww"}</text>
          </>
        )}
        {fracciones.modo === "seco" && (
          <>
            <text x={colVolX - 8} y={yTop + hAire / 2 + 3} textAnchor="end" fontSize="9" fill="#0ea5e9">Aire</text>
            <text x={colVolX + colAncho / 2} y={yTop + hAire / 2 + 3} textAnchor="middle" fontSize="8" fill="#0369a1">{fmtV(Va) ?? "Va"}</text>
            <text x={colPesoX + colAncho / 2} y={yTop + hAire / 2 + 3} textAnchor="middle" fontSize="8" fill="#94a3b8">≈ 0</text>
            <text x={colVolX + colAncho / 2 + 130} y={yTop + 14} fontSize="8" fill="#0ea5e9">Suelo seco (S = 0): solo 2 fases</text>
          </>
        )}
        {fracciones.modo === "saturado" && (
          <>
            <text x={colVolX - 8} y={yTop + hAgua / 2 + 3} textAnchor="end" fontSize="9" fill="#2563eb">Agua</text>
            <text x={colVolX + colAncho / 2} y={yTop + hAgua / 2 + 3} textAnchor="middle" fontSize="8" fill="#1d4ed8">{fmtV(Vw) ?? "Vw"}</text>
            <text x={colPesoX + colAncho / 2} y={yTop + hAgua / 2 + 3} textAnchor="middle" fontSize="8" fill="#1d4ed8">{fmtP(Ww) ?? "Ww"}</text>
            <text x={colVolX + colAncho / 2 + 130} y={yTop + 14} fontSize="8" fill="#2563eb">Suelo saturado (S = 100%): solo 2 fases</text>
          </>
        )}
        {fracciones.modo === "indiferenciado" && (
          <>
            <text x={colVolX - 8} y={yTop + hVacios / 2 + 3} textAnchor="end" fontSize="9" fill="#3b82f6">Vacíos</text>
            <text x={colVolX + colAncho / 2} y={yTop + hVacios / 2 + 3} textAnchor="middle" fontSize="8" fill="#1d4ed8">agua + aire</text>
            <text x={colPesoX + colAncho / 2} y={yTop + hVacios / 2 + 3} textAnchor="middle" fontSize="8" fill="#1d4ed8">agua + ≈0</text>
            <text x={colVolX + colAncho / 2 + 130} y={yTop + 14} fontSize="8" fill="#3b82f6">Falta S para separar agua y aire</text>
          </>
        )}
        <text x={colVolX - 8} y={ySolidoTop + hSolido / 2 + 3} textAnchor="end" fontSize="9" fill="#57534e">Sólidos</text>
        <text x={colVolX + colAncho / 2} y={ySolidoTop + hSolido / 2 + 3} textAnchor="middle" fontSize="8" fill="#44403c">{fmtV(Vs) ?? "Vs"}</text>
        <text x={colPesoX + colAncho / 2} y={ySolidoTop + hSolido / 2 + 3} textAnchor="middle" fontSize="8" fill="#44403c">{fmtP(Ws) ?? "Ws"}</text>

        {/* Corchete de vacíos (Va+Vw o Vv) a la izquierda, solo si hay 3 fases o indiferenciado */}
        {(fracciones.modo === "completo" || fracciones.modo === "indiferenciado") && (
          <>
            <line x1={colVolX - 30} y1={yTop} x2={colVolX - 30} y2={ySolidoTop} stroke="#9ca3af" strokeWidth="1" />
            <line x1={colVolX - 34} y1={yTop} x2={colVolX - 30} y2={yTop} stroke="#9ca3af" strokeWidth="1" />
            <line x1={colVolX - 34} y1={ySolidoTop} x2={colVolX - 30} y2={ySolidoTop} stroke="#9ca3af" strokeWidth="1" />
            <text x={colVolX - 38} y={(yTop + ySolidoTop) / 2 + 3} textAnchor="end" fontSize="8" fill="#9ca3af">Vv</text>
          </>
        )}

        {/* Totales V y W debajo */}
        <text x={colVolX + colAncho / 2} y={yBase + 18} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">
          V {fmtV(V) ? `= ${fmtV(V)}` : ""}
        </text>
        <text x={colPesoX + colAncho / 2} y={yBase + 18} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">
          W {fmtP(Ws !== undefined && Ww !== undefined ? Ws + Ww : undefined) ? `= ${fmtP(Ws! + Ww!)}` : ""}
        </text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function RelacionesFases() {
  const [conocidos, setConocidos] = useState<Record<VarKey, boolean>>(
    Object.fromEntries(ALL_VARS.map(k => [k, false])) as Record<VarKey, boolean>
  )
  const [entradas, setEntradas] = useState<Record<VarKey, string>>(
    Object.fromEntries(ALL_VARS.map(k => [k, ""])) as Record<VarKey, string>
  )
  const [preset, setPreset] = useState<PresetId>("kNm3")
  const [resultado, setResultado] = useState<Vars | null>(null)
  const [error, setError] = useState("")

  const yw = PRESETS[preset].yw
  const uni = PRESETS[preset]

  const toggleConocido = (k: VarKey) => {
    setConocidos(prev => ({ ...prev, [k]: !prev[k] }))
    if (conocidos[k]) setEntradas(prev => ({ ...prev, [k]: "" }))
  }

  const setEntrada = (k: VarKey, v: string) => {
    setEntradas(prev => ({ ...prev, [k]: v }))
  }

  const cantidadConocidos = useMemo(
    () => ALL_VARS.filter(k => conocidos[k] && entradas[k] !== "").length,
    [conocidos, entradas]
  )

  const buildBase = (): Vars => {
    const base: Vars = {}
    for (const k of ALL_VARS) {
      if (!conocidos[k] || entradas[k] === "" || isNaN(parseFloat(entradas[k]))) continue
      const raw = parseFloat(entradas[k])
      base[k] = META[k].esPorcentaje ? raw / 100 : raw
    }
    return base
  }

  // Cálculo en vivo: se recalcula en cada tecleo, sin necesidad de presionar el botón.
  // Alimenta la vista previa del diagrama de fases mientras se ingresan datos.
  const vivo = useMemo(() => resolverFases(buildBase(), yw), [entradas, conocidos, yw])
  const fraccionesVivo = useMemo(() => calcularFracciones(vivo), [vivo])

  const calcular = () => {
    setError("")
    const base = buildBase()
    if (Object.keys(base).length < 2) {
      setError("Selecciona e ingresa al menos 2 datos conocidos (recomendado: 3, usualmente Gs + dos más).")
      setResultado(null)
      return
    }
    setResultado(resolverFases(base, yw))
  }

  const limpiar = () => {
    setConocidos(Object.fromEntries(ALL_VARS.map(k => [k, false])) as Record<VarKey, boolean>)
    setEntradas(Object.fromEntries(ALL_VARS.map(k => [k, ""])) as Record<VarKey, string>)
    setResultado(null)
    setError("")
  }

  const cargarEjemplo = () => {
    const nuevosConocidos = Object.fromEntries(ALL_VARS.map(k => [k, false])) as Record<VarKey, boolean>
    const nuevasEntradas = Object.fromEntries(ALL_VARS.map(k => [k, ""])) as Record<VarKey, string>
    nuevosConocidos.Gs = true; nuevasEntradas.Gs = "2.65"
    nuevosConocidos.w = true;  nuevasEntradas.w = "18"
    nuevosConocidos.e = true;  nuevasEntradas.e = "0.75"
    setConocidos(nuevosConocidos)
    setEntradas(nuevasEntradas)
    setResultado(null)
    setError("")
  }

  const varsResueltas = resultado ? ALL_VARS.filter(k => resultado[k] !== undefined && Number.isFinite(resultado[k]!)).length : 0

  const fraccionesResultado = resultado ? calcularFracciones(resultado) : null

  const sufijo = (meta: VarMeta) =>
    meta.esUnitario ? uni.unitario : meta.esPeso ? uni.peso : meta.esVolumen ? uni.volumen : ""

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas / Suelos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Relaciones de fase</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* ── UNIDADES ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                SISTEMA DE UNIDADES
              </div>
              <div className="flex gap-3 flex-wrap">
                {(Object.keys(PRESETS) as PresetId[]).map(p => (
                  <button key={p} onClick={() => setPreset(p)}
                    className={`text-sm px-4 py-2 rounded-lg border transition-colors
                      ${preset === p
                        ? "bg-blue-700 text-white border-blue-700"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                    {PRESETS[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── SELECTOR DE DATOS CONOCIDOS ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">
                DATOS CONOCIDOS
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Marca las variables que conoces e ingresa su valor. Con 3 datos independientes
                (por ejemplo G<sub>s</sub>, w y e) usualmente se resuelve todo el sistema.
              </p>

              <div className="flex flex-col gap-5">
                {GRUPOS.map(g => (
                  <div key={g.id}>
                    <div className="text-xs text-gray-500 font-medium mb-2">{g.titulo}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {ALL_VARS.filter(k => META[k].grupo === g.id).map(k => {
                        const meta = META[k]
                        return (
                          <div key={k}
                            className={`border rounded-lg p-3 transition-colors
                              ${conocidos[k] ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
                            <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                              <input type="checkbox" checked={conocidos[k]}
                                onChange={() => toggleConocido(k)}
                                className="w-4 h-4 accent-blue-700" />
                              <span className="text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: meta.labelHtml }} />
                            </label>
                            {conocidos[k] && (
                              <Campo
                                labelHtml=""
                                value={entradas[k]}
                                onChange={v => setEntrada(k, v)}
                                placeholder={meta.esPorcentaje ? "ej: 18" : "valor"}
                                sufijo={meta.esPorcentaje ? "%" : sufijo(meta)}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── VISTA PREVIA EN VIVO DEL DIAGRAMA DE FASES ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <DiagramaFases
                titulo="VISTA PREVIA EN VIVO — se actualiza mientras ingresas datos"
                fracciones={fraccionesVivo}
                absolutos={{ V: vivo.V, Vs: vivo.Vs, Vw: vivo.Vw, Va: vivo.Va, Ws: vivo.Ws, Ww: vivo.Ww }}
                unidadPeso={uni.peso} unidadVol={uni.volumen}
              />
            </div>

            {/* ── ERROR ── */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            {/* ── BOTONES ── */}
            <div className="flex gap-3">
              <button onClick={calcular}
                className="bg-blue-700 text-white text-sm px-6 py-2.5 rounded-lg
                  hover:bg-blue-800 transition-colors font-medium">
                Calcular relaciones de fase
              </button>
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

            {/* ── RESUMEN ── */}
            {resultado && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">
                    Resultado del sistema de fases
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-white text-blue-700 font-medium border border-blue-200">
                    {varsResueltas} de {ALL_VARS.length} variables calculadas
                  </span>
                </div>
                {varsResueltas < ALL_VARS.length && (
                  <p className="text-xs text-blue-700 mt-2 leading-relaxed">
                    Con los datos ingresados no fue posible resolver todas las variables.
                    Agrega un dato conocido adicional (por ejemplo G<sub>s</sub>, w, e o S) para completar el sistema.
                  </p>
                )}
              </div>
            )}

            {/* ── TABLA DE RESULTADOS ── */}
            {resultado && (
              <div className="flex flex-col gap-5">
                {GRUPOS.map(g => (
                  <div key={g.id} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                      {g.titulo.toUpperCase()}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {ALL_VARS.filter(k => META[k].grupo === g.id).map(k => (
                        <ResultCard key={k} meta={META[k]} valor={resultado[k]}
                          esDato={conocidos[k] && entradas[k] !== ""}
                          sufijo={sufijo(META[k])} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── DIAGRAMA DE FASES (resultado final) ── */}
            {resultado && fraccionesResultado && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <DiagramaFases
                  titulo="DIAGRAMA DE FASES — RESULTADO"
                  fracciones={fraccionesResultado}
                  absolutos={{ V: resultado.V, Vs: resultado.Vs, Vw: resultado.Vw, Va: resultado.Va, Ws: resultado.Ws, Ww: resultado.Ww }}
                  unidadPeso={uni.peso} unidadVol={uni.volumen}
                />
              </div>
            )}

            {/* ── NOTA NORMATIVA / FÓRMULAS ── */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-600">Relaciones utilizadas:</span>{" "}
              e = V<sub>v</sub>/V<sub>s</sub>, n = V<sub>v</sub>/V, S = V<sub>w</sub>/V<sub>v</sub>,
              w = W<sub>w</sub>/W<sub>s</sub>, G<sub>s</sub> = W<sub>s</sub>/(V<sub>s</sub>·γ<sub>w</sub>),
              S·e = w·G<sub>s</sub>, γ<sub>d</sub> = G<sub>s</sub>·γ<sub>w</sub>/(1+e),
              γ<sub>sat</sub> = (G<sub>s</sub>+e)·γ<sub>w</sub>/(1+e), γ' = γ<sub>sat</sub> − γ<sub>w</sub>,
              γ = γ<sub>d</sub>·(1+w). El motor resuelve el sistema iterativamente a partir de los
              datos marcados como conocidos, propagando cada relación hasta alcanzar un punto fijo.
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
