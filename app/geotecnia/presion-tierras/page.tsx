"use client"
import { useState, useMemo } from "react"
import Sidebar from "../../components/Sidebar"
import { conversiones } from "../../lib/conversiones"
import {
  VarKey, Vars, Grupo, VarMeta, ALL_VARS, META, GRUPOS,
  resolverFases, Fracciones, calcularFracciones,
} from "../../lib/relacionesFases"

const CAT_PESO = "Fuerza"
const CAT_VOL = "Volumen"
const factorPeso = (u: string) => conversiones[CAT_PESO].factores[conversiones[CAT_PESO].unidades.indexOf(u)]
const factorVol  = (u: string) => conversiones[CAT_VOL].factores[conversiones[CAT_VOL].unidades.indexOf(u)]

// Subconjunto usado en el selector de "datos conocidos": solo índices/relaciones y pesos
// unitarios. Los pesos y volúmenes absolutos ya no se ingresan a mano — siempre se obtienen
// a partir del volumen de referencia (Vs=1 o V=1) que el usuario elige más abajo.
const GRUPOS_ENTRADA: { id: Grupo; titulo: string }[] = GRUPOS.filter(g => g.id === "indices" || g.id === "unitarios")

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
  meta, valor, esDato, esSupuesto, sufijo,
}: { meta: VarMeta; valor: number | undefined; esDato: boolean; esSupuesto?: boolean; sufijo: string }) {
  const tieneValor = valor !== undefined && Number.isFinite(valor)
  const mostrado = tieneValor
    ? meta.esPorcentaje
      ? `${(valor! * 100).toFixed(2)} %`
      : `${valor!.toFixed(meta.key === "Gs" || meta.key === "e" ? 3 : 4)} ${sufijo}`
    : "—"

  const color = esDato ? "blue" : esSupuesto ? "amber" : "green"

  return (
    <div className={`rounded-lg p-3 border
      ${tieneValor
        ? color === "blue" ? "bg-blue-50 border-blue-200" : color === "amber" ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
        : "bg-gray-50 border-gray-100"}`}>
      <div className="text-xs text-gray-500 mb-0.5" dangerouslySetInnerHTML={{ __html: meta.labelHtml }} />
      <div className={`text-sm font-semibold
        ${!tieneValor ? "text-gray-300" : color === "blue" ? "text-blue-800" : color === "amber" ? "text-amber-800" : "text-green-800"}`}>
        {mostrado}
      </div>
      {tieneValor && (
        <div className={`text-[10px] mt-0.5 font-medium
          ${color === "blue" ? "text-blue-400" : color === "amber" ? "text-amber-500" : "text-green-500"}`}>
          {esDato ? "DATO INGRESADO" : esSupuesto ? "SUPUESTO (V=1)" : "CALCULADO"}
        </div>
      )}
    </div>
  )
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
  const [unidadPeso, setUnidadPeso] = useState(conversiones[CAT_PESO].unidades[1])       // kN por defecto
  const [unidadVolumen, setUnidadVolumen] = useState(conversiones[CAT_VOL].unidades[1])   // m³ por defecto
  const [resultado, setResultado] = useState<Vars | null>(null)
  const [error, setError] = useState("")

  // γw fijo en la base interna (N/m³). Todo se resuelve internamente en N y m³;
  // la conversión a la unidad elegida por el usuario ocurre solo al mostrar/ingresar datos.
  const yw = 9810
  const aBase = (k: VarKey, valorMostrado: number): number => {
    const meta = META[k]
    if (meta.esPorcentaje) return valorMostrado / 100
    if (meta.esPeso) return valorMostrado * factorPeso(unidadPeso)
    if (meta.esVolumen) return valorMostrado * factorVol(unidadVolumen)
    if (meta.esUnitario) return (valorMostrado * factorPeso(unidadPeso)) / factorVol(unidadVolumen)
    return valorMostrado // Gs, e (adimensionales)
  }
  const aMostrar = (k: VarKey, valorBase: number): number => {
    const meta = META[k]
    if (meta.esPeso) return valorBase / factorPeso(unidadPeso)
    if (meta.esVolumen) return valorBase / factorVol(unidadVolumen)
    if (meta.esUnitario) return (valorBase * factorVol(unidadVolumen)) / factorPeso(unidadPeso)
    return valorBase // Gs, e, y los porcentuales (n, w, S) que ResultCard ya multiplica por 100
  }

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

  const [volumenRef, setVolumenRef] = useState<"Vs" | "V" | null>(null)

  const buildBase = (): Vars => {
    const base: Vars = {}
    for (const k of ALL_VARS) {
      if (!conocidos[k] || entradas[k] === "" || isNaN(parseFloat(entradas[k]))) continue
      base[k] = aBase(k, parseFloat(entradas[k]))
    }
    // Si el usuario ya conoce un peso o volumen absoluto real, se respeta tal cual.
    // Si no, se usa el volumen de referencia elegido (Vs=1 o V=1, en la unidad de volumen
    // seleccionada) únicamente como ancla para poder obtener valores absolutos de
    // pesos y volúmenes — los índices, relaciones y pesos unitarios no dependen de esto.
    if (volumenRef && base[volumenRef] === undefined) {
      base[volumenRef] = aBase(volumenRef, 1)
    }
    return base
  }

  // Cálculo en vivo: se recalcula en cada tecleo, sin necesidad de presionar el botón.
  // Alimenta la vista previa del diagrama de fases mientras se ingresan datos.
  const vivo = useMemo(() => resolverFases(buildBase(), yw), [entradas, conocidos, unidadPeso, unidadVolumen, volumenRef])
  const fraccionesVivo = useMemo(() => calcularFracciones(vivo), [vivo])

  type Inconsistencia = { clave: VarKey; ingresado: string; predicho: string }
  const [inconsistencias, setInconsistencias] = useState<Inconsistencia[]>([])

  const sufijo = (meta: VarMeta) =>
    meta.esUnitario ? `${unidadPeso}/${unidadVolumen}` : meta.esPeso ? unidadPeso : meta.esVolumen ? unidadVolumen : ""

  const formatearValor = (k: VarKey, valorBase: number): string => {
    const meta = META[k]
    if (meta.esPorcentaje) return `${(valorBase * 100).toFixed(2)} %`
    return `${aMostrar(k, valorBase).toFixed(k === "Gs" || k === "e" ? 3 : 4)} ${sufijo(meta)}`
  }

  const calcular = () => {
    setError("")
    setInconsistencias([])
    const datosReales = ALL_VARS.filter(k => conocidos[k] && entradas[k] !== "" && !isNaN(parseFloat(entradas[k])))
    if (datosReales.length < 2) {
      setError("Selecciona e ingresa al menos 2 datos conocidos (recomendado: 3, usualmente Gs + dos más).")
      setResultado(null)
      return
    }
    if (!volumenRef) {
      setError("Selecciona qué volumen asumir como unitario (Vs = 1 o V = 1) para poder obtener pesos y volúmenes absolutos.")
      setResultado(null)
      return
    }

    const base = buildBase()
    setResultado(resolverFases(base, yw))

    // Verificación de consistencia: por cada dato ingresado a mano, se vuelve a resolver
    // el sistema SIN ese dato (usando solo los demás) y se compara si el valor que se
    // obtiene por las otras relaciones coincide con lo que el usuario escribió.
    const TOLERANCIA = 0.01 // 1% de error relativo
    const encontradas: Inconsistencia[] = []
    for (const k of datosReales) {
      const parcial: Vars = {}
      for (const k2 of datosReales) {
        if (k2 !== k) parcial[k2] = aBase(k2, parseFloat(entradas[k2]))
      }
      if (volumenRef && parcial[volumenRef] === undefined) {
        parcial[volumenRef] = aBase(volumenRef, 1)
      }
      const chequeo = resolverFases(parcial, yw)
      const predicho = chequeo[k]
      if (predicho !== undefined && Number.isFinite(predicho)) {
        const ingresado = base[k]!
        const errorRel = Math.abs(predicho - ingresado) / (Math.abs(predicho) || 1e-9)
        if (errorRel > TOLERANCIA) {
          encontradas.push({
            clave: k,
            ingresado: formatearValor(k, ingresado),
            predicho: formatearValor(k, predicho),
          })
        }
      }
    }
    setInconsistencias(encontradas)
  }

  const limpiar = () => {
    setConocidos(Object.fromEntries(ALL_VARS.map(k => [k, false])) as Record<VarKey, boolean>)
    setEntradas(Object.fromEntries(ALL_VARS.map(k => [k, ""])) as Record<VarKey, string>)
    setVolumenRef(null)
    setResultado(null)
    setError("")
    setInconsistencias([])
  }

  const cargarEjemplo = () => {
    const nuevosConocidos = Object.fromEntries(ALL_VARS.map(k => [k, false])) as Record<VarKey, boolean>
    const nuevasEntradas = Object.fromEntries(ALL_VARS.map(k => [k, ""])) as Record<VarKey, string>
    nuevosConocidos.Gs = true; nuevasEntradas.Gs = "2.65"
    nuevosConocidos.w = true;  nuevasEntradas.w = "18"
    nuevosConocidos.e = true;  nuevasEntradas.e = "0.75"
    setConocidos(nuevosConocidos)
    setEntradas(nuevasEntradas)
    setVolumenRef("Vs")
    setResultado(null)
    setError("")
    setInconsistencias([])
  }

  const varsResueltas = resultado ? ALL_VARS.filter(k => resultado[k] !== undefined && Number.isFinite(resultado[k]!)).length : 0

  const fraccionesResultado = resultado ? calcularFracciones(resultado) : null

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
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Unidad de peso</div>
                  <select value={unidadPeso} onChange={e => setUnidadPeso(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                      focus:outline-none focus:border-blue-400">
                    {conversiones[CAT_PESO].unidades.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Unidad de volumen</div>
                  <select value={unidadVolumen} onChange={e => setUnidadVolumen(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                      focus:outline-none focus:border-blue-400">
                    {conversiones[CAT_VOL].unidades.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Los pesos unitarios se muestran como {unidadPeso}/{unidadVolumen}. Internamente todo se
                resuelve en N y m³ (γ<sub>w</sub> = 9810 N/m³) y se convierte automáticamente a las
                unidades elegidas al ingresar y al mostrar resultados.
              </p>
            </div>

            {/* ── VOLUMEN DE REFERENCIA (obligatorio) ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">
                VOLUMEN DE REFERENCIA <span className="text-red-400">*</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Los pesos y volúmenes absolutos se calculan asumiendo un tamaño de muestra unitario,
                como es habitual al resolver diagramas de fase. Elige cuál asumir:
              </p>
              <div className="flex gap-4 flex-wrap">
                <label className={`flex items-center gap-2 cursor-pointer select-none border rounded-lg px-4 py-2.5
                  ${volumenRef === "Vs" ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
                  <input type="radio" name="volumenRef" checked={volumenRef === "Vs"}
                    onChange={() => setVolumenRef("Vs")} className="w-4 h-4 accent-blue-700" />
                  <span className="text-sm text-gray-700">
                    Asumir V<sub>s</sub> = 1 {unidadVolumen} <span className="text-gray-400">(volumen de sólidos unitario)</span>
                  </span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer select-none border rounded-lg px-4 py-2.5
                  ${volumenRef === "V" ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
                  <input type="radio" name="volumenRef" checked={volumenRef === "V"}
                    onChange={() => setVolumenRef("V")} className="w-4 h-4 accent-blue-700" />
                  <span className="text-sm text-gray-700">
                    Asumir V = 1 {unidadVolumen} <span className="text-gray-400">(volumen total unitario)</span>
                  </span>
                </label>
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
                {GRUPOS_ENTRADA.map(g => (
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
                absolutos={{
                  V: vivo.V !== undefined ? aMostrar("V", vivo.V) : undefined,
                  Vs: vivo.Vs !== undefined ? aMostrar("Vs", vivo.Vs) : undefined,
                  Vw: vivo.Vw !== undefined ? aMostrar("Vw", vivo.Vw) : undefined,
                  Va: vivo.Va !== undefined ? aMostrar("Va", vivo.Va) : undefined,
                  Ws: vivo.Ws !== undefined ? aMostrar("Ws", vivo.Ws) : undefined,
                  Ww: vivo.Ww !== undefined ? aMostrar("Ww", vivo.Ww) : undefined,
                }}
                unidadPeso={unidadPeso} unidadVol={unidadVolumen}
              />
            </div>

            {/* ── ERROR ── */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            {/* ── INCONSISTENCIAS ── */}
            {inconsistencias.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <div className="text-sm font-semibold text-red-700 mb-1">
                  ⚠ Los datos ingresados no son consistentes entre sí
                </div>
                <p className="text-xs text-red-600 mb-2">
                  Al resolver el sistema solo con los demás datos, se obtienen valores distintos
                  a los que ingresaste manualmente. Revisa el ensayo o las mediciones:
                </p>
                <ul className="text-xs text-red-700 flex flex-col gap-1">
                  {inconsistencias.map(inc => (
                    <li key={inc.clave}>
                      <span dangerouslySetInnerHTML={{ __html: META[inc.clave].labelHtml }} />:
                      {" "}ingresaste <strong>{inc.ingresado}</strong>, pero los demás datos
                      implican <strong>{inc.predicho}</strong>.
                    </li>
                  ))}
                </ul>
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
                {volumenRef && !(conocidos[volumenRef] && entradas[volumenRef] !== "") && (
                  <p className="text-xs text-amber-700 mt-2 leading-relaxed">
                    Los pesos y volúmenes absolutos (en ámbar) se calcularon asumiendo{" "}
                    {volumenRef === "Vs" ? <>V<sub>s</sub></> : <>V</>} = 1 {unidadVolumen}. Los índices,
                    relaciones y pesos unitarios (en verde/azul) son independientes de esta suposición.
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
                        <ResultCard key={k} meta={META[k]}
                          valor={resultado[k] !== undefined ? aMostrar(k, resultado[k]!) : undefined}
                          esDato={conocidos[k] && entradas[k] !== ""}
                          esSupuesto={k === volumenRef && !(conocidos[k] && entradas[k] !== "")}
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
                  absolutos={{
                    V: resultado.V !== undefined ? aMostrar("V", resultado.V) : undefined,
                    Vs: resultado.Vs !== undefined ? aMostrar("Vs", resultado.Vs) : undefined,
                    Vw: resultado.Vw !== undefined ? aMostrar("Vw", resultado.Vw) : undefined,
                    Va: resultado.Va !== undefined ? aMostrar("Va", resultado.Va) : undefined,
                    Ws: resultado.Ws !== undefined ? aMostrar("Ws", resultado.Ws) : undefined,
                    Ww: resultado.Ww !== undefined ? aMostrar("Ww", resultado.Ww) : undefined,
                  }}
                  unidadPeso={unidadPeso} unidadVol={unidadVolumen}
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
