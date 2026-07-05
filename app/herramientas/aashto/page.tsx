"use client"
import { useState, useMemo } from "react"
import Sidebar from "../../components/Sidebar"

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
type TipoAASHTO = "granular" | "fino"

type ResultadoAASHTO = {
  grupo: string
  nombre: string
  tipo: TipoAASHTO
  descripcion: string
  materialTipico: string
  calificacionGeneral: string
  GI: number
  usoTipico: string
}

// ─────────────────────────────────────────────────────────────────────────────
// ÍNDICE DE GRUPO (GI) — AASHTO M145 / ASTM D3282
// GI = (F200 - 35)[0.2 + 0.005(LL - 40)] + 0.01(F200 - 15)(PI - 10)
// Cada término se acota individualmente antes de multiplicar.
// ─────────────────────────────────────────────────────────────────────────────
function calcularGI(P200: number, LL: number, PI: number): number {
  if (isNaN(P200) || isNaN(LL) || isNaN(PI)) return 0
  const a = Math.min(Math.max(P200 - 35, 0), 40)
  const b = Math.min(Math.max(LL - 40, 0), 20)
  const c = Math.min(Math.max(P200 - 15, 0), 40)
  const d = Math.min(Math.max(PI - 10, 0), 30)
  const GI = a * (0.2 + 0.005 * b) + 0.01 * c * d
  return Math.max(0, Math.round(GI))
}

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIPCIONES POR GRUPO
// ─────────────────────────────────────────────────────────────────────────────
function r(
  grupo: string, nombre: string, tipo: TipoAASHTO,
  descripcion: string, materialTipico: string,
  calificacionGeneral: string, GI: number, usoTipico: string
): ResultadoAASHTO {
  return { grupo, nombre, tipo, descripcion, materialTipico, calificacionGeneral, GI, usoTipico }
}

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DE CLASIFICACIÓN AASHTO (procedimiento de eliminación, de izquierda a derecha)
// P10, P40, P200: % que pasa por cada tamiz.
// LL, PI: limite liquido e indice de plasticidad de la fraccion que pasa el #40.
// esNP: suelo no plastico (PI se fuerza a 0, PL no aplica).
// ─────────────────────────────────────────────────────────────────────────────
function calcularAASHTO(
  P10: number, P40: number, P200: number,
  LL: number, PI: number, esNP: boolean
): ResultadoAASHTO | null {
  if (isNaN(P10) || isNaN(P40) || isNaN(P200)) return null

  const piEfectivo = esNP ? 0 : PI
  const tienePlasticidad = esNP || !isNaN(PI)
  const tieneLL = !isNaN(LL)

  // ── MATERIALES GRANULARES: P200 <= 35% ──────────────────────────────────
  if (P200 <= 35) {

    if (tienePlasticidad) {
      // A-1-a
      if (P10 <= 50 && P40 <= 30 && P200 <= 15 && piEfectivo <= 6) {
        const GI = calcularGI(P200, tieneLL ? LL : 0, piEfectivo)
        return r("A-1-a", "Fragmentos de roca, grava y arena", "granular",
          "Material granular grueso bien graduado con pocos finos no plasticos a poco plasticos.",
          "Fragmentos de roca, grava y arena",
          "Excelente a bueno", GI,
          "Bases, sub-bases y rellenos estructurales de alta calidad.")
      }
      // A-1-b
      if (P40 <= 50 && P200 <= 25 && piEfectivo <= 6) {
        const GI = calcularGI(P200, tieneLL ? LL : 0, piEfectivo)
        return r("A-1-b", "Arena gruesa a fina con grava", "granular",
          "Material granular con finos no plasticos a poco plasticos.",
          "Arena gruesa a fina, con o sin grava",
          "Excelente a bueno", GI,
          "Bases y sub-bases; calidad ligeramente menor que A-1-a.")
      }
      // A-3
      if (P200 <= 10 && P40 >= 51 && piEfectivo === 0) {
        return r("A-3", "Arena fina uniforme", "granular",
          "Arena fina de granulometria uniforme, no plastica.",
          "Arena fina de playa o duna",
          "Excelente a bueno", 0,
          "Rellenos y sub-bases; baja cohesion, requiere confinamiento.")
      }
    }

    // A-2: requiere LL y PI de la fraccion fina
    if (tieneLL && tienePlasticidad) {
      const GI = calcularGI(P200, LL, piEfectivo)
      if (LL <= 40 && piEfectivo <= 10) {
        return r("A-2-4", "Grava y arena limosa o arcillosa (LL bajo, IP bajo)", "granular",
          "Material granular con 5-35% de finos poco plasticos y limite liquido bajo.",
          "Grava y arena con limo o arcilla",
          "Aceptable a mala", GI,
          "Subrasante buena; base con control de finos.")
      }
      if (LL >= 41 && piEfectivo <= 10) {
        return r("A-2-5", "Grava y arena limosa o arcillosa (LL alto, IP bajo)", "granular",
          "Material granular con 5-35% de finos poco plasticos y limite liquido alto.",
          "Grava y arena con limo o arcilla",
          "Aceptable a mala", GI,
          "Subrasante buena; sensible a humedad por LL alto.")
      }
      if (LL <= 40 && piEfectivo >= 11) {
        return r("A-2-6", "Grava y arena arcillosa (LL bajo, IP alto)", "granular",
          "Material granular con 5-35% de finos plasticos y limite liquido bajo.",
          "Grava y arena con arcilla",
          "Aceptable a mala", GI,
          "Subrasante buena; vigilar plasticidad de los finos.")
      }
      if (LL >= 41 && piEfectivo >= 11) {
        return r("A-2-7", "Grava y arena arcillosa (LL alto, IP alto)", "granular",
          "Material granular con 5-35% de finos plasticos y limite liquido alto.",
          "Grava y arena con arcilla",
          "Aceptable a mala", GI,
          "Subrasante aceptable; el menos favorable del grupo A-2.")
      }
    }

    return null // faltan datos de LL/IP para decidir entre A-1, A-2 o A-3
  }

  // ── MATERIALES LIMO-ARCILLOSOS: P200 > 35% ──────────────────────────────
  if (!tieneLL || !tienePlasticidad) return null

  const GI = calcularGI(P200, LL, piEfectivo)

  if (LL <= 40 && piEfectivo <= 10) {
    return r("A-4", "Suelo limoso", "fino",
      "Suelo limoso de baja a media compresibilidad, mas de 35% pasa el tamiz #200.",
      "Suelos limosos",
      "Regular a malo", GI,
      "Subrasante regular; requiere drenaje y control de humedad.")
  }
  if (LL >= 41 && piEfectivo <= 10) {
    return r("A-5", "Suelo limoso elastico", "fino",
      "Suelo limoso de alta compresibilidad y limite liquido alto, baja plasticidad.",
      "Suelos limosos (a menudo con mica o diatomeas)",
      "Regular a malo", GI,
      "Subrasante pobre; alta compresibilidad, mal desempeno bajo carga.")
  }
  if (LL <= 40 && piEfectivo >= 11) {
    return r("A-6", "Suelo arcilloso", "fino",
      "Suelo arcilloso de plasticidad moderada, cambios volumetricos moderados con la humedad.",
      "Suelos arcillosos",
      "Regular a malo", GI,
      "Subrasante pobre; usualmente requiere estabilizacion.")
  }
  // A-7: LL >= 41 y PI >= 11 -> subdividir segun PI vs (LL - 30)
  if (piEfectivo <= LL - 30) {
    return r("A-7-5", "Suelo arcilloso de alta plasticidad (IP moderado)", "fino",
      "Suelo arcilloso de alta plasticidad con indice de plasticidad moderado respecto al limite liquido.",
      "Suelos arcillosos",
      "Regular a malo", GI,
      "Subrasante pobre; expansividad moderada a alta.")
  }
  return r("A-7-6", "Suelo arcilloso de alta plasticidad (IP alto)", "fino",
    "Suelo arcilloso de alta plasticidad con indice de plasticidad alto respecto al limite liquido; alta expansividad.",
    "Suelos arcillosos",
    "Regular a malo", GI,
    "Subrasante muy pobre; alta expansividad, usualmente requiere reemplazo o estabilizacion.")
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETA
// ─────────────────────────────────────────────────────────────────────────────
const C: Record<TipoAASHTO, { bg: string; border: string; text: string; badge: string }> = {
  granular: { bg: "bg-green-50",  border: "border-green-400",  text: "text-green-800",  badge: "bg-green-100 text-green-800"  },
  fino:     { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-800", badge: "bg-orange-100 text-orange-800" },
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLA DE CLASIFICACIÓN AASHTO (referencia visual con eliminación por columnas)
// ─────────────────────────────────────────────────────────────────────────────
type ColumnaAASHTO = {
  grupo: string
  tipo: TipoAASHTO
  p10: string
  p40: string
  p200: string
  ll: string
  pi: string
  giMax: string
  tipologia: string
  calidad: string
}

const COLUMNAS: ColumnaAASHTO[] = [
  { grupo: "A-1-a", tipo: "granular", p10: "≤ 50", p40: "≤ 30", p200: "≤ 15", ll: "—",     pi: "≤ 6",     giMax: "0",   tipologia: "Fragmentos de piedra, grava y arena", calidad: "Excelente a buena" },
  { grupo: "A-1-b", tipo: "granular", p10: "—",    p40: "≤ 50", p200: "≤ 25", ll: "—",     pi: "≤ 6",     giMax: "0",   tipologia: "Fragmentos de piedra, grava y arena", calidad: "Excelente a buena" },
  { grupo: "A-3",   tipo: "granular", p10: "—",    p40: "≥ 51", p200: "≤ 10", ll: "—",     pi: "0 (NP)",  giMax: "0",   tipologia: "Arena fina",                          calidad: "Excelente a buena" },
  { grupo: "A-2-4", tipo: "granular", p10: "—",    p40: "—",    p200: "≤ 35", ll: "≤ 40",  pi: "≤ 10",    giMax: "≤ 4", tipologia: "Gravas y arenas limosas o arcillosas", calidad: "Aceptable a mala"  },
  { grupo: "A-2-5", tipo: "granular", p10: "—",    p40: "—",    p200: "≤ 35", ll: "≥ 41",  pi: "≤ 10",    giMax: "≤ 4", tipologia: "Gravas y arenas limosas o arcillosas", calidad: "Aceptable a mala"  },
  { grupo: "A-2-6", tipo: "granular", p10: "—",    p40: "—",    p200: "≤ 35", ll: "≤ 40",  pi: "≥ 11",    giMax: "≤ 4", tipologia: "Gravas y arenas limosas o arcillosas", calidad: "Aceptable a mala"  },
  { grupo: "A-2-7", tipo: "granular", p10: "—",    p40: "—",    p200: "≤ 35", ll: "≥ 41",  pi: "≥ 11",    giMax: "≤ 4", tipologia: "Gravas y arenas limosas o arcillosas", calidad: "Aceptable a mala"  },
  { grupo: "A-4",   tipo: "fino",     p10: "—",    p40: "—",    p200: "≥ 36", ll: "≤ 40",  pi: "≤ 10",    giMax: "≤ 8", tipologia: "Suelos limosos",                      calidad: "Aceptable a mala"  },
  { grupo: "A-5",   tipo: "fino",     p10: "—",    p40: "—",    p200: "≥ 36", ll: "≥ 41",  pi: "≤ 10",    giMax: "≤ 12",tipologia: "Suelos limosos",                      calidad: "Aceptable a mala"  },
  { grupo: "A-6",   tipo: "fino",     p10: "—",    p40: "—",    p200: "≥ 36", ll: "≤ 40",  pi: "≥ 11",    giMax: "≤ 20",tipologia: "Suelos arcillosos",                   calidad: "Aceptable a mala"  },
  { grupo: "A-7-5", tipo: "fino",     p10: "—",    p40: "—",    p200: "≥ 36", ll: "≥ 41",  pi: "≥ 11 *",  giMax: "≤ 20",tipologia: "Suelos arcillosos",                   calidad: "Aceptable a mala"  },
  { grupo: "A-7-6", tipo: "fino",     p10: "—",    p40: "—",    p200: "≥ 36", ll: "≥ 41",  pi: "≥ 11 **", giMax: "≤ 20",tipologia: "Suelos arcillosos",                   calidad: "Aceptable a mala"  },
]

function TablaEliminacion({ grupoActivo }: { grupoActivo: string | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left text-gray-400 font-medium py-2 pr-3 whitespace-nowrap">Criterio</th>
            {COLUMNAS.map(c => (
              <th key={c.grupo}
                className={`py-2 px-2 text-center font-semibold whitespace-nowrap
                  ${grupoActivo === c.grupo
                    ? (c.tipo === "granular" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800")
                    : "text-gray-500"}`}>
                {c.grupo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { label: "% pasa #10",       key: "p10" as const },
            { label: "% pasa #40",       key: "p40" as const },
            { label: "% pasa #200",      key: "p200" as const },
            { label: "LL (%)",           key: "ll" as const },
            { label: "IP",               key: "pi" as const },
            { label: "Índice de grupo",  key: "giMax" as const },
            { label: "Tipología",        key: "tipologia" as const },
            { label: "Calidad",          key: "calidad" as const },
          ].map(row => (
            <tr key={row.key} className="border-t border-gray-100">
              <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{row.label}</td>
              {COLUMNAS.map(c => (
                <td key={c.grupo}
                  className={`py-2 px-2 text-center
                    ${row.key === "tipologia" || row.key === "calidad" ? "whitespace-normal" : "whitespace-nowrap"}
                    ${grupoActivo === c.grupo ? "font-bold text-gray-800" : "text-gray-400"}`}>
                  {c[row.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2 leading-relaxed">
        * A-7-5: IP ≤ LL − 30 &nbsp;&nbsp; ** A-7-6: IP &gt; LL − 30
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────
function Campo({
  labelHtml, value, onChange, placeholder, readOnly = false, disabled = false
}: {
  labelHtml: string; value: string; onChange?: (v: string) => void
  placeholder?: string; readOnly?: boolean; disabled?: boolean
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1" dangerouslySetInnerHTML={{ __html: labelHtml }} />
      <input type="number" value={value} readOnly={readOnly} disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400
          ${readOnly
            ? "bg-blue-50 border-blue-200 text-blue-800 font-semibold cursor-default"
            : disabled
              ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
              : "border-gray-300 bg-white"}`} />
    </div>
  )
}

function PropCard({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-white bg-opacity-60 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-800">{valor}</div>
    </div>
  )
}

const REF_AASHTO = [
  { s: "A-1-a", n: "Fragmentos de roca, grava y arena",         c: "bg-green-50 text-green-800"  },
  { s: "A-1-b", n: "Arena gruesa a fina con grava",              c: "bg-green-50 text-green-800"  },
  { s: "A-3",   n: "Arena fina uniforme",                        c: "bg-green-50 text-green-800"  },
  { s: "A-2-4", n: "Grava/arena limosa o arcillosa, LL bajo, IP bajo", c: "bg-green-50 text-green-800" },
  { s: "A-2-5", n: "Grava/arena limosa o arcillosa, LL alto, IP bajo", c: "bg-green-50 text-green-800" },
  { s: "A-2-6", n: "Grava/arena arcillosa, LL bajo, IP alto",    c: "bg-green-50 text-green-800"  },
  { s: "A-2-7", n: "Grava/arena arcillosa, LL alto, IP alto",    c: "bg-green-50 text-green-800"  },
  { s: "A-4",   n: "Suelo limoso",                                c: "bg-orange-50 text-orange-800" },
  { s: "A-5",   n: "Suelo limoso elastico",                       c: "bg-orange-50 text-orange-800" },
  { s: "A-6",   n: "Suelo arcilloso",                             c: "bg-orange-50 text-orange-800" },
  { s: "A-7-5", n: "Suelo arcilloso de alta plasticidad, IP moderado", c: "bg-orange-50 text-orange-800" },
  { s: "A-7-6", n: "Suelo arcilloso de alta plasticidad, IP alto",     c: "bg-orange-50 text-orange-800" },
]

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function ClasificacionAASHTO() {
  // Tamices #10, #40, #200
  const [P10Str, setP10Str] = useState("")
  const [P40Str, setP40Str] = useState("")
  const [P200Str, setP200Str] = useState("")

  // Límites de Atterberg
  const [LLStr, setLLStr] = useState("")
  const [PLStr, setPLStr] = useState("")
  const [esNP, setEsNP] = useState(false)

  // Resultado
  const [resultado, setResultado] = useState<ResultadoAASHTO | null>(null)
  const [error, setError] = useState("")
  const [intentoClasificar, setIntentoClasificar] = useState(false)

  const P10  = parseFloat(P10Str)
  const P40  = parseFloat(P40Str)
  const P200 = parseFloat(P200Str)
  const LL   = parseFloat(LLStr)
  const PL   = parseFloat(PLStr)
  const PI   = esNP ? 0 : (!isNaN(LL) && !isNaN(PL) ? LL - PL : NaN)

  const calcular = () => {
    setError("")
    setIntentoClasificar(true)

    if (isNaN(P10) || isNaN(P40) || isNaN(P200)) {
      setError("Ingresa los porcentajes que pasan los tamices #10, #40 y #200.")
      return
    }
    if (!esNP && !isNaN(LL) && !isNaN(PL) && LL <= PL) {
      setError("El limite liquido debe ser mayor que el limite plastico.")
      return
    }

    const res = calcularAASHTO(P10, P40, P200, LL, PI, esNP)
    setResultado(res)
  }

  const limpiar = () => {
    setP10Str(""); setP40Str(""); setP200Str("")
    setLLStr(""); setPLStr(""); setEsNP(false)
    setResultado(null); setError("")
    setIntentoClasificar(false)
  }

  const col = resultado ? C[resultado.tipo] : null

  // Mensaje cuando falta informacion para clasificar
  const mensajeFaltante = useMemo(() => {
    if (!intentoClasificar || resultado !== null || error) return null
    if (isNaN(P10) || isNaN(P40) || isNaN(P200)) return null // ya cubierto por error
    if (P200 <= 35) {
      return "Material granular (P200 ≤ 35%): se requieren el limite liquido y el indice de plasticidad (o marcar 'No plastico') de la fraccion que pasa el tamiz #40 para decidir entre los grupos A-1, A-2 y A-3."
    }
    return "Material limo-arcilloso (P200 > 35%): se requieren el limite liquido y el indice de plasticidad (o marcar 'No plastico') para clasificar entre A-4, A-5, A-6 y A-7."
  }, [intentoClasificar, resultado, error, P10, P40, P200])

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas / Suelos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Clasificación AASHTO</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">

            {/* ── ANÁLISIS GRANULOMÉTRICO ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">
                ANÁLISIS GRANULOMÉTRICO — % QUE PASA POR TAMIZ
              </div>
              <p className="text-xs text-gray-400 mb-4">
                AASHTO M145 / ASTM D3282 solo requiere los tamices #10, #40 y #200.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <Campo labelHtml="% pasa tamiz N.º 10"  value={P10Str}  onChange={setP10Str}  placeholder="ej: 95" />
                <Campo labelHtml="% pasa tamiz N.º 40"  value={P40Str}  onChange={setP40Str}  placeholder="ej: 60" />
                <Campo labelHtml="% pasa tamiz N.º 200" value={P200Str} onChange={setP200Str} placeholder="ej: 30" />
              </div>
            </div>

            {/* ── LÍMITES DE ATTERBERG ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-4">
                LÍMITES DE ATTERBERG (fracción que pasa el tamiz #40)
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Campo labelHtml="Límite líquido w<sub>L</sub> (%)" value={LLStr} onChange={setLLStr}
                  placeholder="ej: 35" disabled={esNP} />
                <Campo labelHtml="Límite plástico w<sub>P</sub> (%)" value={PLStr} onChange={setPLStr}
                  placeholder="ej: 20" disabled={esNP} />
                <div>
                  <div className="text-xs text-gray-500 mb-1">IP (%) — calculado</div>
                  <div className={`border rounded-lg px-3 py-2 text-sm font-semibold
                    ${!isNaN(PI)
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                    {!isNaN(PI) ? PI.toFixed(2) : "—"}
                  </div>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={esNP}
                      onChange={e => setEsNP(e.target.checked)}
                      className="w-4 h-4 accent-blue-700" />
                    <span className="text-xs text-gray-600 leading-tight">
                      Suelo no plástico (NP)<br />
                      <span className="text-gray-400">fuerza IP = 0</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── ERROR / MENSAJE FALTANTE ── */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}
            {mensajeFaltante && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 leading-relaxed">
                {mensajeFaltante}
              </div>
            )}

            {/* ── BOTONES ── */}
            <div className="flex gap-3">
              <button onClick={calcular}
                className="bg-blue-700 text-white text-sm px-6 py-2.5 rounded-lg
                  hover:bg-blue-800 transition-colors font-medium">
                Clasificar suelo
              </button>
              <button onClick={limpiar}
                className="text-sm text-gray-500 px-4 py-2.5 rounded-lg
                  border border-gray-300 hover:bg-gray-50 transition-colors">
                Limpiar todo
              </button>
            </div>

            {/* ── RESULTADO ── */}
            {resultado && col && (
              <div className={`${col.bg} border-2 ${col.border} rounded-xl p-6`}>
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Clasificación AASHTO / M 145 · ASTM D3282
                    </div>
                    <div className={`text-5xl font-bold ${col.text} mb-1`}>{resultado.grupo}</div>
                    <div className={`text-base font-semibold ${col.text}`}>{resultado.nombre}</div>
                  </div>
                  <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${col.badge}`}>
                    {resultado.tipo === "granular" ? "Granular" : "Limo-arcilloso"}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-4 leading-relaxed">{resultado.descripcion}</p>

                <div className="grid grid-cols-2 gap-3">
                  <PropCard label="Material típico"          valor={resultado.materialTipico} />
                  <PropCard label="Índice de grupo (GI)"       valor={resultado.GI.toString()} />
                  <PropCard label="Calificación como subrasante" valor={resultado.calificacionGeneral} />
                  <PropCard label="Uso típico"                 valor={resultado.usoTipico} />
                </div>
              </div>
            )}

            {/* ── TABLA DE ELIMINACIÓN (referencia visual) ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                TABLA DE CLASIFICACIÓN AASHTO — PROCEDIMIENTO DE ELIMINACIÓN
              </div>
              <TablaEliminacion grupoActivo={resultado?.grupo ?? null} />
            </div>

            {/* ── TABLA DE REFERENCIA ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                REFERENCIA — GRUPOS AASHTO (M 145 / ASTM D3282)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {REF_AASHTO.map(({ s, n, c }) => (
                  <div key={s}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${c}
                      ${resultado?.grupo === s ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}>
                    <span className="font-bold text-sm w-14 flex-shrink-0">{s}</span>
                    <span className="text-xs leading-snug">{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── NOTA NORMATIVA ── */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-600">Nota:</span>{" "}
              Clasificación según <span className="font-medium">AASHTO M 145</span> / <span className="font-medium">ASTM D3282</span>.
              El procedimiento avanza de izquierda a derecha en la tabla y se detiene en el primer grupo
              cuyos criterios se cumplen. El Índice de Grupo (GI) se calcula con
              GI = (F<sub>200</sub> − 35)[0.2 + 0.005(LL − 40)] + 0.01(F<sub>200</sub> − 15)(IP − 10),
              acotando cada término entre 0 y su máximo, y redondeando al entero más cercano
              (mínimo 0). Los grupos A-1, A-2-4, A-2-5 y A-3 suelen reportarse con GI = 0.
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
