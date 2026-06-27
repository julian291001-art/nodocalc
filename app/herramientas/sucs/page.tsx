"use client"
import { useState, useMemo } from "react"
import Sidebar from "../../components/Sidebar"

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
type TipoSuelo = "grava" | "arena" | "limo" | "arcilla" | "organico"

type ResultadoSUCS = {
  simbolo: string
  nombre: string
  tipo: TipoSuelo | null
  descripcion: string
  permeabilidad: string
  compresibilidad: string
  resistencia: string
  uso: string
}

type FilaTamiz = {
  nombre: string
  mm: number
  obligatorio: boolean
  activo: boolean
  pasa: string // valor ingresado por el usuario
}

// ─────────────────────────────────────────────────────────────────────────────
// TAMICES ASTM ESTÁNDAR
// ─────────────────────────────────────────────────────────────────────────────
const TAMICES_INIT: FilaTamiz[] = [
  { nombre: '3"',    mm: 75.000, obligatorio: false, activo: false, pasa: "" },
  { nombre: '2"',    mm: 50.000, obligatorio: false, activo: false, pasa: "" },
  { nombre: '1½"',   mm: 38.100, obligatorio: false, activo: false, pasa: "" },
  { nombre: '1"',    mm: 25.400, obligatorio: false, activo: false, pasa: "" },
  { nombre: '¾"',    mm: 19.050, obligatorio: false, activo: false, pasa: "" },
  { nombre: '½"',    mm: 12.700, obligatorio: false, activo: false, pasa: "" },
  { nombre: '3/8"',  mm:  9.525, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#4',    mm:  4.750, obligatorio: true,  activo: true,  pasa: "" },
  { nombre: '#8',    mm:  2.360, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#10',   mm:  2.000, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#16',   mm:  1.180, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#20',   mm:  0.850, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#30',   mm:  0.600, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#40',   mm:  0.425, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#50',   mm:  0.300, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#60',   mm:  0.250, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#100',  mm:  0.150, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#140',  mm:  0.106, obligatorio: false, activo: false, pasa: "" },
  { nombre: '#200',  mm:  0.075, obligatorio: true,  activo: true,  pasa: "" },
]

// ─────────────────────────────────────────────────────────────────────────────
// INTERPOLACIÓN LOGARÍTMICA
// ─────────────────────────────────────────────────────────────────────────────
function interpolarD(
  puntos: { mm: number; pasa: number }[],
  porcentaje: number
): number | null {
  const sorted = [...puntos].sort((a, b) => a.pasa - b.pasa)
  for (let i = 1; i < sorted.length; i++) {
    const p1 = sorted[i - 1], p2 = sorted[i]
    if (porcentaje >= p1.pasa && porcentaje <= p2.pasa) {
      const t = (porcentaje - p1.pasa) / (p2.pasa - p1.pasa)
      const logD = Math.log10(p1.mm) + t * (Math.log10(p2.mm) - Math.log10(p1.mm))
      return Math.pow(10, logD)
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA SUCS (ASTM D2487)
// ─────────────────────────────────────────────────────────────────────────────
function calcularSUCS(
  P200: number, P4: number, wL: number, wP: number,
  Cu: number, Cc: number, organico: boolean
): ResultadoSUCS | null {
  if (isNaN(P200) || isNaN(P4)) return null

  const IP       = wL - wP
  const lineaA   = 0.73 * (wL - 20)
  const sobreA   = IP >= lineaA

  // ── FINOS ────────────────────────────────────────────────────────────────
  if (P200 > 50) {
    if (isNaN(wL) || isNaN(wP)) return null

    if (organico) {
      if (wL < 50) return r("OL", "Arcilla orgánica / Limo orgánico de baja plasticidad",     "organico", "Suelo orgánico de baja plasticidad. Se identifica cuando wL(horno)/wL(orig) < 0.75.",  "Baja a muy baja", "Media a alta",   "Baja",      "No recomendado para cimentaciones. Requiere tratamiento o sustitución.")
      return             r("OH", "Arcilla orgánica / Limo orgánico de alta plasticidad",        "organico", "Suelo orgánico de alta plasticidad. Alta compresibilidad y baja resistencia.",           "Muy baja",        "Muy alta",       "Muy baja",  "No apto para construcción sin mejoramiento significativo.")
    }
    if (wL < 50) {
      if (sobreA && IP > 7) return r("CL",    "Arcilla inorgánica de baja plasticidad",         "arcilla", "Arcilla de baja plasticidad. Buena resistencia en seco, sensible al agua.",             "Baja",            "Media",          "Media a alta","Aceptable para subrasante, terraplenes y núcleos de presas con control de humedad.")
      if (!sobreA && IP < 4) return r("ML",   "Limo inorgánico de baja plasticidad",            "limo",    "Limo de baja plasticidad. Sensible a cambios de humedad.",                              "Media a baja",    "Media a alta",   "Baja a media","Subrasante con control estricto de compactación y drenaje.")
      return                        r("CL-ML","Arcilla limosa (frontera CL-ML)",                 "arcilla", "Suelo en la frontera CL/ML. Clasificación dual, requiere juicio ingenieril.",            "Baja",            "Media",          "Media",      "Evaluar caso por caso. Se recomienda ensayos adicionales.")
    }
    if (sobreA) return r("CH", "Arcilla inorgánica de alta plasticidad", "arcilla", "Arcilla gorda de alta plasticidad. Alta expansión con cambios de humedad.",     "Muy baja", "Alta a muy alta", "Baja",     "Problemático para cimentaciones. Requiere mejoramiento o sustitución.")
    return             r("MH", "Limo inorgánico de alta plasticidad",    "limo",    "Limo elástico de alta plasticidad. Comportamiento similar a arcilla gorda.",    "Muy baja", "Alta",            "Baja",     "No recomendado sin mejoramiento. Sensible a variaciones de humedad.")
  }

  // ── GRUESOS ──────────────────────────────────────────────────────────────
  const pGrava       = 100 - P4
  const pArena       = P4 - P200
  const fracGruesa   = pGrava + pArena
  const esGrava      = fracGruesa > 0 && pGrava > fracGruesa / 2
  const finos        = P200
  const cuOk         = esGrava ? Cu >= 4 : Cu >= 6
  const ccOk         = Cc >= 1 && Cc <= 3
  const bienSurtido  = cuOk && ccOk
  const hasCuCc      = !isNaN(Cu) && !isNaN(Cc) && Cu > 0

  if (esGrava) {
    if (finos < 5) {
      if (!hasCuCc) return r("G?",  "Grava (Cu/Cc requeridos)",         "grava", "Ingresa Cu y Cc para distinguir GW de GP.",                                       "—","—","—","—")
      if (bienSurtido) return r("GW","Grava bien gradada",              "grava", "Grava limpia bien gradada con mezcla de tamaños.",                                 "Alta",          "Muy baja","Alta",         "Excelente para bases, sub-bases, drenajes y rellenos estructurales.")
      return                  r("GP","Grava mal gradada",               "grava", "Grava limpia mal gradada o de tamaño uniforme.",                                   "Alta",          "Muy baja","Alta",         "Buena para drenajes y rellenos. Menos adecuada para bases sin tratamiento.")
    }
    if (finos > 12) {
      if (isNaN(wL) || isNaN(wP)) return r("G?","Grava (Atterberg requeridos)","grava","Ingresa wL y wP para distinguir GC de GM.","—","—","—","—")
      if (sobreA && IP > 7) return r("GC","Grava arcillosa",            "grava", "Grava con finos plásticos (arcilla).",                                             "Baja a media",  "Baja",    "Media a alta", "Núcleos impermeables de presas, subrasante.")
      return                  r("GM","Grava limosa",                    "grava", "Grava con finos no plásticos (limo).",                                             "Baja a media",  "Baja",    "Media a alta", "Terraplenes, subrasante. Susceptible a helada.")
    }
    // 5 ≤ finos ≤ 12 → doble símbolo
    if (!hasCuCc) return r("G??","Grava doble símbolo (Cu/Cc requeridos)","grava","Ingresa Cu y Cc para determinar símbolo doble.","—","—","—","—")
    if (!isNaN(wL) && !isNaN(wP)) {
      if (bienSurtido && sobreA)  return r("GW-GC","Grava bien gradada con arcilla","grava","Grava bien gradada con 5–12 % finos plásticos.","Media","Baja","Alta",  "Bases y sub-bases con control de compactación.")
      if (bienSurtido && !sobreA) return r("GW-GM","Grava bien gradada con limo",  "grava","Grava bien gradada con 5–12 % finos no plásticos.","Media a alta","Baja","Alta","Bases y sub-bases.")
      if (!bienSurtido && sobreA) return r("GP-GC","Grava mal gradada con arcilla","grava","Grava mal gradada con 5–12 % finos plásticos.","Media","Baja","Media a alta","Rellenos con control.")
      return                             r("GP-GM","Grava mal gradada con limo",   "grava","Grava mal gradada con 5–12 % finos no plásticos.","Media a alta","Baja","Media a alta","Rellenos y bases con tratamiento.")
    }
    if (bienSurtido) return r("GW-GM","Grava bien gradada con limo","grava","Grava bien gradada con 5–12 % finos (Atterberg no ingresados).","Media a alta","Baja","Alta","Bases y sub-bases.")
    return                  r("GP-GM","Grava mal gradada con limo", "grava","Grava mal gradada con 5–12 % finos (Atterberg no ingresados).","Media a alta","Baja","Media a alta","Rellenos y bases.")
  }

  // Arenas
  if (finos < 5) {
    if (!hasCuCc) return r("S?",  "Arena (Cu/Cc requeridos)",          "arena", "Ingresa Cu y Cc para distinguir SW de SP.",                                       "—","—","—","—")
    if (bienSurtido) return r("SW","Arena bien gradada",               "arena", "Arena limpia bien gradada. Buena distribución de tamaños.",                        "Alta",          "Muy baja",    "Media a alta","Excelente para bases, rellenos estructurales y concreto.")
    return                  r("SP","Arena mal gradada",                "arena", "Arena limpia mal gradada o uniforme. Susceptible a licuación.",                    "Alta",          "Baja",        "Media",      "Rellenos no estructurales. Evaluar licuación en zonas sísmicas (NSR-10).")
  }
  if (finos > 12) {
    if (isNaN(wL) || isNaN(wP)) return r("S?","Arena (Atterberg requeridos)","arena","Ingresa wL y wP para distinguir SC de SM.","—","—","—","—")
    if (sobreA && IP > 7) return r("SC","Arena arcillosa",             "arena", "Arena con finos plásticos. Buena cohesión aparente.",                              "Baja a media",  "Media",       "Media",      "Subrasante y terraplenes con control de humedad.")
    return                  r("SM","Arena limosa",                     "arena", "Arena con finos no plásticos. Susceptible a cambios de humedad.",                  "Media",         "Baja a media","Media",      "Subrasante. Evaluar compactación y drenaje.")
  }
  // 5 ≤ finos ≤ 12 → doble símbolo
  if (!hasCuCc) return r("S??","Arena doble símbolo (Cu/Cc requeridos)","arena","Ingresa Cu y Cc para determinar símbolo doble.","—","—","—","—")
  if (!isNaN(wL) && !isNaN(wP)) {
    if (bienSurtido && sobreA)  return r("SW-SC","Arena bien gradada con arcilla","arena","Arena bien gradada con 5–12 % finos plásticos.","Media","Baja a media","Media a alta","Bases y rellenos con compactación controlada.")
    if (bienSurtido && !sobreA) return r("SW-SM","Arena bien gradada con limo",  "arena","Arena bien gradada con 5–12 % finos no plásticos.","Media a alta","Baja","Media a alta","Rellenos y bases.")
    if (!bienSurtido && sobreA) return r("SP-SC","Arena mal gradada con arcilla","arena","Arena mal gradada con 5–12 % finos plásticos.","Media","Media","Media","Rellenos con control.")
    return                             r("SP-SM","Arena mal gradada con limo",   "arena","Arena mal gradada con 5–12 % finos no plásticos.","Media a alta","Baja","Media","Rellenos. Evaluar licuación.")
  }
  if (bienSurtido) return r("SW-SM","Arena bien gradada con limo","arena","Arena bien gradada 5–12 % finos (Atterberg no ingresados).","Media a alta","Baja","Media a alta","Rellenos y bases.")
  return                  r("SP-SM","Arena mal gradada con limo", "arena","Arena mal gradada 5–12 % finos (Atterberg no ingresados).","Media a alta","Baja","Media","Rellenos. Evaluar licuación.")
}

function r(
  simbolo: string, nombre: string, tipo: TipoSuelo,
  descripcion: string, permeabilidad: string,
  compresibilidad: string, resistencia: string, uso: string
): ResultadoSUCS {
  return { simbolo, nombre, tipo, descripcion, permeabilidad, compresibilidad, resistencia, uso }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function esFino(simbolo: string) {
  return /^(CL|ML|CH|MH|OL|OH|CL-ML)/.test(simbolo)
}
function esGranular(simbolo: string) {
  return /^(G|S)/.test(simbolo)
}
function esDoble(simbolo: string) {
  return simbolo.includes("-")
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETA
// ─────────────────────────────────────────────────────────────────────────────
const C: Record<TipoSuelo, { bg: string; border: string; text: string; badge: string }> = {
  grava:    { bg:"bg-green-50",  border:"border-green-400",  text:"text-green-800",  badge:"bg-green-100 text-green-800"   },
  arena:    { bg:"bg-amber-50",  border:"border-amber-400",  text:"text-amber-800",  badge:"bg-amber-100 text-amber-800"   },
  limo:     { bg:"bg-blue-50",   border:"border-blue-400",   text:"text-blue-800",   badge:"bg-blue-100 text-blue-800"     },
  arcilla:  { bg:"bg-orange-50", border:"border-orange-400", text:"text-orange-800", badge:"bg-orange-100 text-orange-800" },
  organico: { bg:"bg-yellow-50", border:"border-yellow-600", text:"text-yellow-900", badge:"bg-yellow-100 text-yellow-900" },
}

// ─────────────────────────────────────────────────────────────────────────────
// CURVA GRANULOMÉTRICA SVG
// ─────────────────────────────────────────────────────────────────────────────
type PuntoCurva = { mm: number; pasa: number }

function CurvaGranulometrica({
  puntos, D10, D30, D60, Cu, Cc
}: {
  puntos: PuntoCurva[]
  D10: number | null
  D30: number | null
  D60: number | null
  Cu: number | null
  Cc: number | null
}) {
  const W = 460, H = 300
  const padL = 52, padR = 20, padT = 20, padB = 40

  // Escala log para eje X (diámetro): de 0.01 mm a 100 mm
  const xMin = Math.log10(100), xMax = Math.log10(0.01)
  const yMin = 0, yMax = 100

  const sx = (W - padL - padR) / (xMax - xMin)
  const sy = (H - padT - padB) / (yMax - yMin)

  const px = (mm: number) => padL + (Math.log10(mm) - xMin) * sx
  const py = (p: number)  => H - padB - (p - yMin) * sy

  const marcasX = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]
  const marcasY = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

  const puntosOrdenados = [...puntos].sort((a, b) => a.mm - b.mm)
  const path = puntosOrdenados.map((p, i) =>
    `${i === 0 ? "M" : "L"} ${px(p.mm).toFixed(1)} ${py(p.pasa).toFixed(1)}`
  ).join(" ")

  // Líneas de referencia para D10, D30, D60
  const dRefs = [
    { d: D10, label: "D₁₀", color: "#10b981" },
    { d: D30, label: "D₃₀", color: "#f59e0b" },
    { d: D60, label: "D₆₀", color: "#ef4444" },
  ]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%"
        className="border border-gray-100 rounded-lg bg-white" style={{ maxHeight: 300 }}>

        {/* Cuadrícula Y */}
        {marcasY.map(p => (
          <line key={`gy${p}`} x1={padL} y1={py(p)} x2={W - padR} y2={py(p)}
            stroke="#f0f0f0" strokeWidth="1" />
        ))}

        {/* Cuadrícula X */}
        {marcasX.map(mm => (
          <line key={`gx${mm}`} x1={px(mm)} y1={padT} x2={px(mm)} y2={H - padB}
            stroke="#f0f0f0" strokeWidth="1" />
        ))}

        {/* Líneas de referencia Dx */}
        {dRefs.map(({ d, color }) => d && (
          <g key={color}>
            <line x1={px(d)} y1={padT} x2={px(d)} y2={H - padB}
              stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          </g>
        ))}

        {/* Ejes */}
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#6b7280" strokeWidth="1.2" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#6b7280" strokeWidth="1.2" />

        {/* Labels X */}
        {marcasX.map(mm => {
          const label = mm < 1 ? mm.toString() : mm >= 1 ? mm.toString() : mm.toString()
          return (
            <text key={`lx${mm}`} x={px(mm)} y={H - padB + 13}
              textAnchor="middle" fontSize="7.5" fill="#9ca3af">{label}</text>
          )
        })}

        {/* Labels Y */}
        {marcasY.map(p => (
          <text key={`ly${p}`} x={padL - 5} y={py(p) + 3}
            textAnchor="end" fontSize="8" fill="#9ca3af">{p}</text>
        ))}

        {/* Título eje X */}
        <text x={padL + (W - padL - padR) / 2} y={H - 4}
          textAnchor="middle" fontSize="9" fill="#6b7280">Diámetro de partícula (mm)</text>

        {/* Título eje Y */}
        <text x={12} y={H / 2} textAnchor="middle" fontSize="9" fill="#6b7280"
          transform={`rotate(-90, 12, ${H / 2})`}>% que pasa</text>

        {/* Zonas textuales */}
        <text x={px(0.075) - 4} y={padT + 12} textAnchor="end"   fontSize="8" fill="#9ca3af">Finos</text>
        <text x={px(4.75)  - 4} y={padT + 12} textAnchor="end"   fontSize="8" fill="#9ca3af">Arena</text>
        <text x={px(20)}        y={padT + 12} textAnchor="middle" fontSize="8" fill="#9ca3af">Grava</text>
        <line x1={px(0.075)} y1={padT} x2={px(0.075)} y2={H - padB} stroke="#d1d5db" strokeWidth="1" strokeDasharray="2,3" />
        <line x1={px(4.75)}  y1={padT} x2={px(4.75)}  y2={H - padB} stroke="#d1d5db" strokeWidth="1" strokeDasharray="2,3" />

        {/* Curva granulométrica */}
        {puntosOrdenados.length > 1 && (
          <path d={path} fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinejoin="round" />
        )}

        {/* Puntos */}
        {puntosOrdenados.map((p, i) => (
          <circle key={i} cx={px(p.mm)} cy={py(p.pasa)} r="3.5"
            fill="#1d4ed8" stroke="white" strokeWidth="1.2" />
        ))}
        {/* Labels Dx */}
        {dRefs.map(({ d, label, color }) => {
          const xPos = px(d as number) - 3
          const yPos = H - padB - 5
          return (
            <text
              key={`lbl-${label}`}
              x={xPos}
              y={yPos}
              fontSize="8"
              fill={color}
              fontWeight="600"
              textAnchor="end"
              transform={`rotate(-90, ${xPos}, ${yPos})`}
            >
              {label}
            </text>
          )
        })}
      </svg>

      {/* Tabla D10 D30 D60 Cu Cc */}
      {(D10 || D30 || D60) && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {[
            { label: "D₁₀ (mm)", val: D10, color: "text-emerald-700" },
            { label: "D₃₀ (mm)", val: D30, color: "text-amber-600" },
            { label: "D₆₀ (mm)", val: D60, color: "text-red-600" },
            { label: "Cᵤ",      val: Cu,  color: "text-gray-700" },
            { label: "C꜀",      val: Cc,  color: "text-gray-700" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400 mb-0.5">{label}</div>
              <div className={`text-sm font-bold ${color}`}>
                {val != null ? val.toFixed(3) : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTA DE CASAGRANDE SVG
// ─────────────────────────────────────────────────────────────────────────────
function CartaCasagrande({
  wL, IP, resultado
}: {
  wL: number; IP: number; resultado: ResultadoSUCS | null
}) {
  const W = 440, H = 300
  const padL = 46, padR = 20, padT = 22, padB = 36
  const xMin = 0, xMax = 100, yMin = 0, yMax = 60
  const sx = (W - padL - padR) / (xMax - xMin)
  const sy = (H - padT - padB) / (yMax - yMin)
  const px = (w: number) => padL + (w - xMin) * sx
  const py = (ip: number) => H - padB - (ip - yMin) * sy

  const ptA: [number, number][] = []
  for (let w = 25.5; w <= 100; w += 1.5) {
    const ip = 0.73 * (w - 20)
    if (ip >= 0 && ip <= yMax) ptA.push([w, ip])
  }
  const ptU: [number, number][] = []
  for (let w = 16; w <= 100; w += 1.5) {
    const ip = 0.9 * (w - 8)
    if (ip >= 0 && ip <= yMax) ptU.push([w, ip])
  }
  const toPath = (pts: [number, number][]) =>
    pts.map(([w, ip], i) => `${i === 0 ? "M" : "L"} ${px(w).toFixed(1)} ${py(ip).toFixed(1)}`).join(" ")

  const validPunto = !isNaN(wL) && !isNaN(IP)
  const ptX = validPunto ? Math.min(Math.max(px(wL), padL), W - padR) : null
  const ptY = validPunto ? Math.min(Math.max(py(IP), padT), H - padB) : null
  const dotColors: Record<TipoSuelo, string> = {
    grava:"#4ade80", arena:"#fbbf24", limo:"#60a5fa", arcilla:"#fb923c", organico:"#ca8a04"
  }
  const dotColor = resultado?.tipo ? dotColors[resultado.tipo] : "#dc2626"

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%"
      className="border border-gray-100 rounded-lg bg-white" style={{ maxHeight: 300 }}>
      {[10,20,30,40,50,60,70,80,90].map(w => (
        <line key={`gx${w}`} x1={px(w)} y1={padT} x2={px(w)} y2={H-padB} stroke="#f0f0f0" strokeWidth="1" />
      ))}
      {[10,20,30,40,50].map(ip => (
        <line key={`gy${ip}`} x1={padL} y1={py(ip)} x2={W-padR} y2={py(ip)} stroke="#f0f0f0" strokeWidth="1" />
      ))}
      <line x1={padL} y1={padT} x2={padL} y2={H-padB} stroke="#6b7280" strokeWidth="1.2" />
      <line x1={padL} y1={H-padB} x2={W-padR} y2={H-padB} stroke="#6b7280" strokeWidth="1.2" />
      {[0,10,20,30,40,50,60,70,80,90,100].map(w => (
        <text key={`lx${w}`} x={px(w)} y={H-padB+13} textAnchor="middle" fontSize="8" fill="#9ca3af">{w}</text>
      ))}
      {[0,10,20,30,40,50].map(ip => (
        <text key={`ly${ip}`} x={padL-5} y={py(ip)+3} textAnchor="end" fontSize="8" fill="#9ca3af">{ip}</text>
      ))}
      <text x={padL+(W-padL-padR)/2} y={H-4} textAnchor="middle" fontSize="9" fill="#6b7280">
        Límite líquido wL (%)
      </text>
      <text x={11} y={H/2} textAnchor="middle" fontSize="9" fill="#6b7280"
        transform={`rotate(-90, 11, ${H/2})`}>IP (%)</text>
      <line x1={px(50)} y1={padT} x2={px(50)} y2={H-padB}
        stroke="#9ca3af" strokeWidth="1" strokeDasharray="3,3" />
      <text x={px(50)+3} y={padT+9} fontSize="7.5" fill="#9ca3af">wL=50</text>
      <path d={toPath(ptU)} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />
      <text x={px(30)} y={py(0.9*(30-8))-5} fontSize="8" fill="#94a3b8">Línea U</text>
      <path d={toPath(ptA)} fill="none" stroke="#1d4ed8" strokeWidth="1.6" />
      <text x={px(68)} y={py(0.73*(68-20))-5} fontSize="8" fill="#1d4ed8" fontWeight="600">Línea A</text>
      <text x={px(28)} y={py(3)}  textAnchor="middle" fontSize="9" fill="#6b7280"  fontWeight="600">ML</text>
      <text x={px(35)} y={py(22)} textAnchor="middle" fontSize="9" fill="#f97316" fontWeight="600">CL</text>
      <text x={px(70)} y={py(8)}  textAnchor="middle" fontSize="9" fill="#6b7280"  fontWeight="600">MH</text>
      <text x={px(72)} y={py(42)} textAnchor="middle" fontSize="9" fill="#f97316" fontWeight="600">CH</text>
      <text x={px(25)} y={py(9)}  textAnchor="middle" fontSize="7.5" fill="#9ca3af">CL-ML</text>
      {ptX !== null && ptY !== null && (
        <g>
          <circle cx={ptX} cy={ptY} r="7" fill={dotColor} opacity="0.25" />
          <circle cx={ptX} cy={ptY} r="4" fill="#dc2626" />
          <text x={ptX+8} y={ptY-5} fontSize="9" fill="#dc2626" fontWeight="700">
            {resultado?.simbolo ?? "•"}
          </text>
        </g>
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────
function Campo({
  labelHtml, value, onChange, placeholder, readOnly = false, compact = false
}: {
  labelHtml: string; value: string; onChange?: (v: string) => void
  placeholder?: string; readOnly?: boolean; compact?: boolean
}) {
  return (
    <div>
      <div className={`text-xs text-gray-500 ${compact ? "mb-0.5" : "mb-1"}`}
        dangerouslySetInnerHTML={{ __html: labelHtml }} />
      <input type="number" value={value} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400
          ${readOnly
            ? "bg-blue-50 border-blue-200 text-blue-800 font-semibold cursor-default"
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

const REF_SUCS = [
  {s:"GW",    n:"Grava bien gradada",                  c:"bg-green-50 text-green-800"   },
  {s:"GP",    n:"Grava mal gradada",                   c:"bg-green-50 text-green-800"   },
  {s:"GM",    n:"Grava limosa",                        c:"bg-green-50 text-green-800"   },
  {s:"GC",    n:"Grava arcillosa",                     c:"bg-green-50 text-green-800"   },
  {s:"SW",    n:"Arena bien gradada",                  c:"bg-amber-50 text-amber-800"   },
  {s:"SP",    n:"Arena mal gradada",                   c:"bg-amber-50 text-amber-800"   },
  {s:"SM",    n:"Arena limosa",                        c:"bg-amber-50 text-amber-800"   },
  {s:"SC",    n:"Arena arcillosa",                     c:"bg-amber-50 text-amber-800"   },
  {s:"ML",    n:"Limo inorgánico baja plasticidad",    c:"bg-blue-50 text-blue-800"     },
  {s:"CL",    n:"Arcilla inorgánica baja plasticidad", c:"bg-orange-50 text-orange-800" },
  {s:"OL",    n:"Orgánico baja plasticidad",           c:"bg-yellow-50 text-yellow-900" },
  {s:"MH",    n:"Limo inorgánico alta plasticidad",    c:"bg-blue-50 text-blue-800"     },
  {s:"CH",    n:"Arcilla inorgánica alta plasticidad", c:"bg-orange-50 text-orange-800" },
  {s:"OH",    n:"Orgánico alta plasticidad",           c:"bg-yellow-50 text-yellow-900" },
  {s:"CL-ML", n:"Frontera arcilla-limo",               c:"bg-orange-50 text-orange-800" },
  {s:"Pt",    n:"Turba y suelos altamente orgánicos",  c:"bg-yellow-50 text-yellow-900" },
]

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function ClasificacionSUCS() {
  // Tamices
  const [tamices, setTamices] = useState<FilaTamiz[]>(TAMICES_INIT)

  // Límites de Atterberg
  const [wL, setWL] = useState("")
  const [wP, setWP] = useState("")

  // Orgánico
  const [organico, setOrganico] = useState(false)

  // Resultado
  const [resultado, setResultado] = useState<ResultadoSUCS | null>(null)
  const [error, setError] = useState("")

  // ── Derivados de tamices ──────────────────────────────────────────────────
  const puntosActivos: PuntoCurva[] = useMemo(() =>
    tamices
      .filter(t => t.activo && t.pasa !== "" && !isNaN(parseFloat(t.pasa)))
      .map(t => ({ mm: t.mm, pasa: parseFloat(t.pasa) })),
    [tamices]
  )

  const { P200, P4, D10, D30, D60, CuCalc, CcCalc } = useMemo(() => {
    const t200 = tamices.find(t => t.nombre === "#200")
    const t4   = tamices.find(t => t.nombre === "#4")
    const P200 = t200 && t200.pasa !== "" ? parseFloat(t200.pasa) : NaN
    const P4   = t4   && t4.pasa   !== "" ? parseFloat(t4.pasa)   : NaN

    const puntos = puntosActivos
    const D10 = puntos.length >= 2 ? interpolarD(puntos, 10) : null
    const D30 = puntos.length >= 2 ? interpolarD(puntos, 30) : null
    const D60 = puntos.length >= 2 ? interpolarD(puntos, 60) : null
    const Cu  = D60 && D10 ? D60 / D10 : null
    const Cc  = D60 && D30 && D10 ? (D30 * D30) / (D60 * D10) : null
    return { P200, P4, D10, D30, D60, CuCalc: Cu, CcCalc: Cc }
  }, [tamices, puntosActivos])

  const IP = !isNaN(parseFloat(wL)) && !isNaN(parseFloat(wP))
    ? parseFloat(wL) - parseFloat(wP)
    : NaN

  // ── Manejadores de tamices ────────────────────────────────────────────────
  const toggleTamiz = (idx: number) => {
    setTamices(prev => prev.map((t, i) =>
      i === idx && !t.obligatorio
        ? { ...t, activo: !t.activo, pasa: !t.activo ? t.pasa : "" }
        : t
    ))
  }

  const setPasa = (idx: number, val: string) => {
    setTamices(prev => prev.map((t, i) =>
      i === idx ? { ...t, pasa: val } : t
    ))
  }

  // ── Clasificar ────────────────────────────────────────────────────────────
  const calcular = () => {
    setError("")
    if (isNaN(P200) || isNaN(P4)) {
      setError("Ingresa los valores de % pasa #200 y #4 en la tabla de tamices.")
      return
    }
    const wl = parseFloat(wL), wp = parseFloat(wP)
    if (P200 > 50 && (isNaN(wl) || isNaN(wp))) {
      setError("El suelo es fino (P₂₀₀ > 50%). Ingresa los límites de Atterberg.")
      return
    }
    if (!isNaN(wl) && !isNaN(wp) && wl <= wp) {
      setError("El límite líquido debe ser mayor que el límite plástico.")
      return
    }
    const res = calcularSUCS(
      P200, P4,
      isNaN(wl) ? NaN : wl,
      isNaN(wp) ? NaN : wp,
      CuCalc ?? NaN,
      CcCalc ?? NaN,
      organico
    )
    setResultado(res)
  }

  const limpiar = () => {
    setTamices(TAMICES_INIT)
    setWL(""); setWP(""); setOrganico(false)
    setResultado(null); setError("")
  }

  const col = resultado?.tipo ? C[resultado.tipo] : null

  // ── Qué mostrar ───────────────────────────────────────────────────────────
  const mostrarCurva    = resultado !== null && (esGranular(resultado.simbolo) || esDoble(resultado.simbolo))
  const mostrarCarta    = resultado !== null && (esFino(resultado.simbolo)     || esDoble(resultado.simbolo))

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas / Suelos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Clasificación SUCS</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">

            {/* ── TABLA DE TAMICES ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">
                ANÁLISIS GRANULOMÉTRICO — % QUE PASA POR TAMIZ
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Activa los tamices usados en el ensayo. #4 y #200 son obligatorios.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs text-gray-400 font-medium py-2 pr-4 w-8">Usar</th>
                      <th className="text-left text-xs text-gray-400 font-medium py-2 pr-4">Tamiz</th>
                      <th className="text-left text-xs text-gray-400 font-medium py-2 pr-4">Abertura (mm)</th>
                      <th className="text-left text-xs text-gray-400 font-medium py-2">% que pasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tamices.map((t, idx) => (
                      <tr
                        key={t.nombre}
                        className={`border-b border-gray-50 transition-colors
                          ${t.activo ? "" : "opacity-40"}
                          ${t.obligatorio ? "bg-blue-50/30" : ""}`}
                      >
                        {/* Check */}
                        <td className="py-1.5 pr-4">
                          {t.obligatorio ? (
                            <span className="text-blue-400 text-xs font-medium pl-1">✓</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={t.activo}
                              onChange={() => toggleTamiz(idx)}
                              className="w-4 h-4 accent-blue-700 cursor-pointer"
                            />
                          )}
                        </td>

                        {/* Nombre */}
                        <td className="py-1.5 pr-4">
                          <span className={`font-medium text-sm
                            ${t.obligatorio ? "text-blue-700" : "text-gray-700"}`}>
                            {t.nombre}
                          </span>
                        </td>

                        {/* mm */}
                        <td className="py-1.5 pr-4 text-xs text-gray-400">{t.mm}</td>

                        {/* % pasa */}
                        <td className="py-1.5">
                          <input
                            type="number"
                            min={0} max={100}
                            disabled={!t.activo}
                            value={t.pasa}
                            onChange={e => setPasa(idx, e.target.value)}
                            placeholder={t.activo ? "0 – 100" : "—"}
                            className={`w-36 border rounded-lg px-3 py-1.5 text-sm
                              focus:outline-none focus:border-blue-400
                              ${!t.activo
                                ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                                : "border-gray-300 bg-white"}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumen rápido P200 / P4 */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className={`rounded-lg px-4 py-2.5 text-sm
                  ${!isNaN(P200) ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"}`}>
                  <span className="text-gray-400 text-xs" dangerouslySetInnerHTML={{ __html: "P<sub>200</sub> (% pasa #200) =" }} />
                  <span className={`ml-2 font-bold ${!isNaN(P200) ? "text-blue-700" : "text-gray-400"}`}>
                    {!isNaN(P200) ? `${P200} %` : "—"}
                  </span>
                </div>
                <div className={`rounded-lg px-4 py-2.5 text-sm
                  ${!isNaN(P4) ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"}`}>
                  <span className="text-gray-400 text-xs" dangerouslySetInnerHTML={{ __html: "P<sub>4</sub> (% pasa #4) =" }} />
                  <span className={`ml-2 font-bold ${!isNaN(P4) ? "text-blue-700" : "text-gray-400"}`}>
                    {!isNaN(P4) ? `${P4} %` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── LÍMITES DE ATTERBERG ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-4">
                LÍMITES DE ATTERBERG
                <span className="ml-2 text-gray-300 normal-case font-normal">
                  (requerido para suelos finos o con finos &gt; 12 %)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Campo
                  labelHtml="Límite líquido w<sub>L</sub> (%)"
                  value={wL} onChange={setWL} placeholder="ej: 40"
                />
                <Campo
                  labelHtml="Límite plástico w<sub>P</sub> (%)"
                  value={wP} onChange={setWP} placeholder="ej: 20"
                />
                <div>
                  <div className="text-xs text-gray-500 mb-1">IP (%) — calculado</div>
                  <div className={`border rounded-lg px-3 py-2 text-sm font-semibold
                    ${!isNaN(IP)
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                    {!isNaN(IP) ? IP.toFixed(2) : "—"}
                  </div>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={organico}
                      onChange={e => setOrganico(e.target.checked)}
                      className="w-4 h-4 accent-blue-700" />
                    <span className="text-xs text-gray-600 leading-tight">
                      Suelo orgánico<br />
                      <span className="text-gray-400">(w<sub>L</sub>horno/orig &lt; 0.75)</span>
                    </span>
                  </label>
                </div>
              </div>
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
                      Clasificación SUCS / ASTM D2487
                    </div>
                    <div className={`text-5xl font-bold ${col.text} mb-1`}>{resultado.simbolo}</div>
                    <div className={`text-base font-semibold ${col.text}`}>{resultado.nombre}</div>
                  </div>
                  <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${col.badge}`}>
                    {resultado.tipo
                      ? resultado.tipo.charAt(0).toUpperCase() + resultado.tipo.slice(1)
                      : ""}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-4 leading-relaxed">{resultado.descripcion}</p>
                <div className="grid grid-cols-2 gap-3">
                  <PropCard label="Permeabilidad típica"  valor={resultado.permeabilidad}  />
                  <PropCard label="Compresibilidad"        valor={resultado.compresibilidad} />
                  <PropCard label="Resistencia al corte"  valor={resultado.resistencia}     />
                  <PropCard label="Uso en construcción"   valor={resultado.uso}             />
                </div>
              </div>
            )}

            {/* ── CURVA GRANULOMÉTRICA (solo suelos granulares o doble símbolo) ── */}
            {mostrarCurva && puntosActivos.length >= 2 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                  CURVA GRANULOMÉTRICA
                  {CuCalc && CcCalc && (
                    <span className="ml-2 text-blue-600 normal-case font-normal">
                      — Cᵤ = {CuCalc.toFixed(2)}, C꜀ = {CcCalc.toFixed(2)}
                    </span>
                  )}
                </div>
                <CurvaGranulometrica
                  puntos={puntosActivos}
                  D10={D10} D30={D30} D60={D60}
                  Cu={CuCalc} Cc={CcCalc}
                />
              </div>
            )}

            {/* ── CARTA DE CASAGRANDE (solo suelos finos o doble símbolo) ── */}
            {mostrarCarta && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                  CARTA DE PLASTICIDAD (CASAGRANDE)
                </div>
                <CartaCasagrande
                  wL={parseFloat(wL)} IP={IP} resultado={resultado}
                />
                <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-7 border-t-2 border-blue-700" />
                    Línea A — IP = 0.73·(w<sub>L</sub> − 20)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-7 border-t border-gray-400 border-dashed" />
                    Línea U — IP = 0.9·(w<sub>L</sub> − 8)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                    Punto del suelo
                  </span>
                </div>
              </div>
            )}

            {/* ── TABLA DE REFERENCIA ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                REFERENCIA — SÍMBOLOS SUCS (ASTM D2487)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {REF_SUCS.map(({ s, n, c }) => (
                  <div key={s}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${c}
                      ${resultado?.simbolo === s || resultado?.simbolo.includes(s)
                        ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}>
                    <span className="font-bold text-sm w-14 flex-shrink-0">{s}</span>
                    <span className="text-xs leading-snug">{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── NOTA NORMATIVA ── */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-600">Nota:</span>{" "}
              Clasificación según <span className="font-medium">ASTM D2487</span> e{" "}
              <span className="font-medium">INVIAS</span>. La curva granulométrica y los
              diámetros D₁₀, D₃₀, D₆₀ se obtienen por interpolación logarítmica a partir
              de los tamices activos. Los símbolos dobles aplican cuando los finos están
              entre 5 % y 12 %. La carta de Casagrande se muestra únicamente para suelos
              finos (P₂₀₀ &gt; 50 %) o suelos de doble símbolo con finos plásticos.
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
