"use client"
import { useState } from "react"
import Sidebar from "../../components/Sidebar"

type ResultadoSUCS = {
  simbolo: string
  nombre: string
  tipo: "grava" | "arena" | "limo" | "arcilla" | "organico" | null
  descripcion: string
  permeabilidad: string
  compresibilidad: string
  resistencia: string
  uso: string
}

function calcularSUCS(
  P200: number, P4: number, wL: number, wP: number,
  Cu: number, Cc: number, organico: boolean
): ResultadoSUCS | null {
  if (isNaN(P200) || isNaN(P4) || isNaN(wL) || isNaN(wP)) return null

  const IP = wL - wP
  const lineaA = 0.73 * (wL - 20)
  const enLineaA = IP >= lineaA

  // ── SUELOS FINOS (P200 > 50%) ──────────────────────────────────────────
  if (P200 > 50) {
    if (organico) {
      if (wL < 50) return { simbolo: "OL", nombre: "Arcilla orgánica / Limo orgánico de baja plasticidad", tipo: "organico", descripcion: "Suelo orgánico de baja plasticidad con materia orgánica detectable.", permeabilidad: "Baja a muy baja", compresibilidad: "Media a alta", resistencia: "Baja", uso: "No recomendado para cimentaciones. Requiere tratamiento." }
      return { simbolo: "OH", nombre: "Arcilla orgánica / Limo orgánico de alta plasticidad", tipo: "organico", descripcion: "Suelo orgánico de alta plasticidad. Alta compresibilidad.", permeabilidad: "Muy baja", compresibilidad: "Muy alta", resistencia: "Muy baja", uso: "No apto para construcción sin mejoramiento." }
    }

    if (wL < 50) {
      if (enLineaA && IP > 7) return { simbolo: "CL", nombre: "Arcilla inorgánica de baja plasticidad", tipo: "arcilla", descripcion: "Arcilla de baja plasticidad. Buena resistencia en estado seco, sensible al agua.", permeabilidad: "Baja", compresibilidad: "Media", resistencia: "Media a alta", uso: "Aceptable para subrasante, terraplenes y núcleos de presas con control de humedad." }
      if (!enLineaA && IP < 4) return { simbolo: "ML", nombre: "Limo inorgánico de baja plasticidad", tipo: "limo", descripcion: "Limo de baja plasticidad. Sensible a cambios de humedad y ciclaje hielo-deshielo.", permeabilidad: "Media a baja", compresibilidad: "Media a alta", resistencia: "Baja a media", uso: "Subrasante con control estricto de compactación y drenaje." }
      return { simbolo: "CL-ML", nombre: "Arcilla limosa (frontera CL-ML)", tipo: "arcilla", descripcion: "Suelo en la frontera entre arcilla y limo de baja plasticidad.", permeabilidad: "Baja", compresibilidad: "Media", resistencia: "Media", uso: "Evaluar caso por caso. Requiere ensayos adicionales." }
    }

    if (enLineaA) return { simbolo: "CH", nombre: "Arcilla inorgánica de alta plasticidad", tipo: "arcilla", descripcion: "Arcilla gorda de alta plasticidad. Alta expansión y contracción con cambios de humedad.", permeabilidad: "Muy baja", compresibilidad: "Alta a muy alta", resistencia: "Baja", uso: "Problemático para cimentaciones. Requiere mejoramiento o sustitución." }
    return { simbolo: "MH", nombre: "Limo inorgánico de alta plasticidad", tipo: "limo", descripcion: "Limo elástico de alta plasticidad. Comportamiento similar a arcilla gorda.", permeabilidad: "Muy baja", compresibilidad: "Alta", resistencia: "Baja", uso: "No recomendado sin mejoramiento. Sensible a variaciones de humedad." }
  }

  // ── SUELOS GRUESOS (P200 ≤ 50%) ────────────────────────────────────────
  const fraccionGruesa = 100 - P200
  const pGrava = 100 - P4
  const esGrava = pGrava > fraccionGruesa / 2

  const finos = P200
  const biensurtido = esGrava ? (Cu >= 4 && Cc >= 1 && Cc <= 3) : (Cu >= 6 && Cc >= 1 && Cc <= 3)

  if (esGrava) {
    if (finos < 5) {
      if (biensurtido) return { simbolo: "GW", nombre: "Grava bien gradada", tipo: "grava", descripcion: "Grava limpia bien gradada con mezcla de tamaños. Excelente material de construcción.", permeabilidad: "Alta", compresibilidad: "Muy baja", resistencia: "Alta", uso: "Excelente para bases, sub-bases, drenajes y rellenos estructurales." }
      return { simbolo: "GP", nombre: "Grava mal gradada", tipo: "grava", descripcion: "Grava limpia mal gradada o de tamaño uniforme. Buenas propiedades de drenaje.", permeabilidad: "Alta", compresibilidad: "Muy baja", resistencia: "Alta", uso: "Buena para drenajes y rellenos. Menos adecuada para bases sin tratamiento." }
    }
    if (finos > 12) {
      if (enLineaA && IP > 7) return { simbolo: "GC", nombre: "Grava arcillosa", tipo: "grava", descripcion: "Grava con finos plásticos (arcilla). Menor permeabilidad que gravas limpias.", permeabilidad: "Baja a media", compresibilidad: "Baja", resistencia: "Media a alta", uso: "Núcleos impermeables de presas, subrasante. Control de compactación." }
      return { simbolo: "GM", nombre: "Grava limosa", tipo: "grava", descripcion: "Grava con finos no plásticos (limo). Propiedades intermedias.", permeabilidad: "Baja a media", compresibilidad: "Baja", resistencia: "Media a alta", uso: "Terraplenes, subrasante. Susceptible a helada en climas fríos." }
    }
    if (biensurtido) return { simbolo: "GW-GC", nombre: "Grava bien gradada con arcilla", tipo: "grava", descripcion: "Símbolo doble: grava bien gradada con finos plásticos entre 5% y 12%.", permeabilidad: "Media", compresibilidad: "Baja", resistencia: "Alta", uso: "Bases y sub-bases con control de compactación." }
    return { simbolo: "GP-GM", nombre: "Grava mal gradada con limo", tipo: "grava", descripcion: "Símbolo doble: grava mal gradada con finos entre 5% y 12%.", permeabilidad: "Media a alta", compresibilidad: "Baja", resistencia: "Media a alta", uso: "Rellenos y bases con tratamiento adecuado." }
  }

  // Arenas
  if (finos < 5) {
    if (biensurtido) return { simbolo: "SW", nombre: "Arena bien gradada", tipo: "arena", descripcion: "Arena limpia bien gradada. Buena distribución de tamaños.", permeabilidad: "Alta", compresibilidad: "Muy baja", resistencia: "Media a alta", uso: "Excelente para bases, rellenos estructurales y concreto." }
    return { simbolo: "SP", nombre: "Arena mal gradada", tipo: "arena", descripcion: "Arena limpia mal gradada o uniforme. Susceptible a licuación.", permeabilidad: "Alta", compresibilidad: "Baja", resistencia: "Media", uso: "Rellenos no estructurales. Evaluar licuación en zonas sísmicas." }
  }
  if (finos > 12) {
    if (enLineaA && IP > 7) return { simbolo: "SC", nombre: "Arena arcillosa", tipo: "arena", descripcion: "Arena con finos plásticos. Menor permeabilidad que arenas limpias.", permeabilidad: "Baja a media", compresibilidad: "Media", resistencia: "Media", uso: "Subrasante y terraplenes con control de humedad." }
    return { simbolo: "SM", nombre: "Arena limosa", tipo: "arena", descripcion: "Arena con finos no plásticos. Susceptible a cambios de humedad.", permeabilidad: "Media", compresibilidad: "Baja a media", resistencia: "Media", uso: "Subrasante. Susceptible a helada. Evaluar compactación." }
  }
  if (biensurtido) return { simbolo: "SW-SC", nombre: "Arena bien gradada con arcilla", tipo: "arena", descripcion: "Símbolo doble: arena bien gradada con finos plásticos entre 5% y 12%.", permeabilidad: "Media", compresibilidad: "Baja a media", resistencia: "Media a alta", uso: "Bases y rellenos con compactación controlada." }
  return { simbolo: "SP-SM", nombre: "Arena mal gradada con limo", tipo: "arena", descripcion: "Símbolo doble: arena mal gradada con finos entre 5% y 12%.", permeabilidad: "Media a alta", compresibilidad: "Baja", resistencia: "Media", uso: "Rellenos. Evaluar licuación en zonas sísmicas." }
}

const coloresTipo = {
  grava: { bg: "bg-green-50", border: "border-green-400", text: "text-green-800", badge: "bg-green-100 text-green-800" },
  arena: { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-800", badge: "bg-amber-100 text-amber-800" },
  limo: { bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-800", badge: "bg-blue-100 text-blue-800" },
  arcilla: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-800", badge: "bg-orange-100 text-orange-800" },
  organico: { bg: "bg-yellow-50", border: "border-yellow-600", text: "text-yellow-900", badge: "bg-yellow-100 text-yellow-900" },
}

function CartaCasagrande({ wL, IP, resultado }: { wL: number; IP: number; resultado: ResultadoSUCS | null }) {
  const W = 420, H = 300
  const padL = 45, padR = 20, padT = 20, padB = 35

  const xMin = 0, xMax = 100, yMin = 0, yMax = 60
  const sx = (W - padL - padR) / (xMax - xMin)
  const sy = (H - padT - padB) / (yMax - yMin)

  const px = (w: number) => padL + (w - xMin) * sx
  const py = (ip: number) => H - padB - (ip - yMin) * sy

  // Línea A: IP = 0.73*(wL - 20), válida para wL > 25.5
  const lineaApts: [number, number][] = []
  for (let w = 25.5; w <= 100; w += 2) {
    const ip = 0.73 * (w - 20)
    if (ip >= 0 && ip <= yMax) lineaApts.push([w, ip])
  }

  // Línea U: IP = 0.9*(wL - 8), válida para wL > 16
  const lineaUpts: [number, number][] = []
  for (let w = 16; w <= 100; w += 2) {
    const ip = 0.9 * (w - 8)
    if (ip >= 0 && ip <= yMax) lineaUpts.push([w, ip])
  }

  const toPath = (pts: [number, number][]) =>
    pts.map(([w, ip], i) => `${i === 0 ? "M" : "L"} ${px(w)} ${py(ip)}`).join(" ")

  const puntoX = !isNaN(wL) ? px(Math.min(Math.max(wL, xMin), xMax)) : null
  const puntoY = !isNaN(IP) ? py(Math.min(Math.max(IP, yMin), yMax)) : null

  return (
    <svg width={W} height={H} className="w-full border border-gray-100 rounded-lg bg-white">
      {/* Cuadrícula */}
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(w => (
        <line key={w} x1={px(w)} y1={padT} x2={px(w)} y2={H - padB} stroke="#f0f0f0" strokeWidth="1" />
      ))}
      {[10, 20, 30, 40, 50].map(ip => (
        <line key={ip} x1={padL} y1={py(ip)} x2={W - padR} y2={py(ip)} stroke="#f0f0f0" strokeWidth="1" />
      ))}

      {/* Ejes */}
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#6b7280" strokeWidth="1.2" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#6b7280" strokeWidth="1.2" />

      {/* Labels ejes X */}
      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(w => (
        <text key={w} x={px(w)} y={H - padB + 14} textAnchor="middle" fontSize="8" fill="#9ca3af">{w}</text>
      ))}
      {/* Labels ejes Y */}
      {[0, 10, 20, 30, 40, 50].map(ip => (
        <text key={ip} x={padL - 6} y={py(ip) + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{ip}</text>
      ))}

      {/* Títulos ejes */}
      <text x={padL + (W - padL - padR) / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#6b7280">Límite líquido wL (%)</text>
      <text x={10} y={H / 2} textAnchor="middle" fontSize="9" fill="#6b7280" transform={`rotate(-90, 10, ${H / 2})`}>IP (%)</text>

      {/* Línea U */}
      <path d={toPath(lineaUpts)} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />
      <text x={px(35)} y={py(0.9 * (35 - 8)) - 5} fontSize="8" fill="#94a3b8">Línea U</text>

      {/* Línea A */}
      <path d={toPath(lineaApts)} fill="none" stroke="#1d4ed8" strokeWidth="1.5" />
      <text x={px(70)} y={py(0.73 * (70 - 20)) - 5} fontSize="8" fill="#1d4ed8" fontWeight="600">Línea A</text>

      {/* Línea vertical wL=50 */}
      <line x1={px(50)} y1={padT} x2={px(50)} y2={H - padB} stroke="#6b7280" strokeWidth="1" strokeDasharray="3,3" />
      <text x={px(50) + 3} y={padT + 10} fontSize="8" fill="#6b7280">wL=50</text>

      {/* Etiquetas zonas */}
      <text x={px(30)} y={py(5)} textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="600">ML</text>
      <text x={px(35)} y={py(20)} textAnchor="middle" fontSize="9" fill="#f97316" fontWeight="600">CL</text>
      <text x={px(70)} y={py(10)} textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="600">MH</text>
      <text x={px(70)} y={py(40)} textAnchor="middle" fontSize="9" fill="#f97316" fontWeight="600">CH</text>
      <text x={px(26)} y={py(8)} textAnchor="middle" fontSize="8" fill="#9ca3af">CL-ML</text>

      {/* Punto del suelo */}
      {puntoX !== null && puntoY !== null && !isNaN(puntoX) && !isNaN(puntoY) && (
        <g>
          <circle cx={puntoX} cy={puntoY} r="6" fill={resultado?.tipo ? coloresTipo[resultado.tipo].border.replace("border-", "#").replace("green-400", "#4ade80").replace("amber-400", "#fbbf24").replace("blue-400", "#60a5fa").replace("orange-400", "#fb923c").replace("yellow-600", "#ca8a04") : "#dc2626"} opacity="0.3" />
          <circle cx={puntoX} cy={puntoY} r="4" fill="#dc2626" />
          <text x={puntoX + 7} y={puntoY - 5} fontSize="9" fill="#dc2626" fontWeight="600">
            {resultado?.simbolo || "•"}
          </text>
        </g>
      )}
    </svg>
  )
}

export default function ClasificacionSUCS() {
  const [P200, setP200] = useState("")
  const [P4, setP4] = useState("")
  const [wL, setWL] = useState("")
  const [wP, setWP] = useState("")
  const [Cu, setCu] = useState("")
  const [Cc, setCc] = useState("")
  const [organico, setOrganico] = useState(false)
  const [resultado, setResultado] = useState<ResultadoSUCS | null>(null)

  const IP = !isNaN(parseFloat(wL)) && !isNaN(parseFloat(wP))
    ? parseFloat(wL) - parseFloat(wP)
    : NaN

  const calcular = () => {
    const res = calcularSUCS(
      parseFloat(P200), parseFloat(P4),
      parseFloat(wL), parseFloat(wP),
      parseFloat(Cu) || 0, parseFloat(Cc) || 0,
      organico
    )
    setResultado(res)
  }

  const limpiar = () => {
    setP200(""); setP4(""); setWL(""); setWP("")
    setCu(""); setCc(""); setOrganico(false); setResultado(null)
  }

  const col = resultado?.tipo ? coloresTipo[resultado.tipo] : null

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas / Suelos /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Clasificación SUCS</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">

            {/* Datos de entrada */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-4">DATOS DE ENTRADA</div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Campo
                  labelHtml="Pasa tamiz #200 — P<sub>200</sub> (%)"
                  value={P200} onChange={setP200} placeholder="ej: 65"
                />
                <Campo
                  labelHtml="Pasa tamiz #4 — P<sub>4</sub> (%)"
                  value={P4} onChange={setP4} placeholder="ej: 80"
                />
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={organico} onChange={e => setOrganico(e.target.checked)}
                      className="w-4 h-4 accent-blue-700" />
                    <span className="text-xs text-gray-600">¿Suelo orgánico?</span>
                  </label>
                </div>
              </div>

              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3 mt-2">LÍMITES DE ATTERBERG</div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Campo labelHtml="Límite líquido w<sub>L</sub> (%)" value={wL} onChange={setWL} placeholder="ej: 40" />
                <Campo labelHtml="Límite plástico w<sub>P</sub> (%)" value={wP} onChange={setWP} placeholder="ej: 20" />
                <div>
                  <div className="text-xs text-gray-500 mb-1">Índice de plasticidad IP (%)</div>
                  <div className={`border rounded-lg px-3 py-2 text-sm font-medium ${!isNaN(IP) ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                    {!isNaN(IP) ? IP.toFixed(1) : "—"}
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3 mt-2">GRANULOMETRÍA (opcional — para suelos gruesos)</div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Campo labelHtml="Coeficiente de uniformidad C<sub>u</sub>" value={Cu} onChange={setCu} placeholder="ej: 6.5" />
                <Campo labelHtml="Coeficiente de curvatura C<sub>c</sub>" value={Cc} onChange={setCc} placeholder="ej: 1.8" />
              </div>

              <div className="flex gap-3">
                <button onClick={calcular}
                  className="bg-blue-700 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-blue-800">
                  Clasificar suelo
                </button>
                <button onClick={limpiar}
                  className="text-sm text-gray-500 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50">
                  Limpiar
                </button>
              </div>
            </div>

            {/* Resultado */}
            {resultado && col && (
              <div className={`${col.bg} border-2 ${col.border} rounded-xl p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Clasificación SUCS</div>
                    <div className={`text-5xl font-bold ${col.text} mb-1`}>{resultado.simbolo}</div>
                    <div className={`text-base font-medium ${col.text}`}>{resultado.nombre}</div>
                  </div>
                  <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${col.badge}`}>
                    {resultado.tipo ? resultado.tipo.charAt(0).toUpperCase() + resultado.tipo.slice(1) : ""}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-4">{resultado.descripcion}</p>
                <div className="grid grid-cols-2 gap-3">
                  <PropRes label="Permeabilidad típica" valor={resultado.permeabilidad} />
                  <PropRes label="Compresibilidad" valor={resultado.compresibilidad} />
                  <PropRes label="Resistencia al corte" valor={resultado.resistencia} />
                  <PropRes label="Uso en construcción" valor={resultado.uso} />
                </div>
              </div>
            )}

            {/* Carta de Casagrande */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CARTA DE PLASTICIDAD (CASAGRANDE)</div>
              <CartaCasagrande
                wL={parseFloat(wL)}
                IP={IP}
                resultado={resultado}
              />
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-6 border-t-2 border-blue-700" /> Línea A (IP = 0.73·(w<sub>L</sub>−20))
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-6 border-t border-gray-400 border-dashed" /> Línea U
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Punto del suelo
                </span>
              </div>
            </div>

            {/* Tabla de referencia */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">REFERENCIA — SÍMBOLOS SUCS</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { s: "GW", n: "Grava bien gradada", c: "bg-green-50 text-green-800" },
                  { s: "GP", n: "Grava mal gradada", c: "bg-green-50 text-green-800" },
                  { s: "GM", n: "Grava limosa", c: "bg-green-50 text-green-800" },
                  { s: "GC", n: "Grava arcillosa", c: "bg-green-50 text-green-800" },
                  { s: "SW", n: "Arena bien gradada", c: "bg-amber-50 text-amber-800" },
                  { s: "SP", n: "Arena mal gradada", c: "bg-amber-50 text-amber-800" },
                  { s: "SM", n: "Arena limosa", c: "bg-amber-50 text-amber-800" },
                  { s: "SC", n: "Arena arcillosa", c: "bg-amber-50 text-amber-800" },
                  { s: "ML", n: "Limo inorgánico baja plasticidad", c: "bg-blue-50 text-blue-800" },
                  { s: "CL", n: "Arcilla inorgánica baja plasticidad", c: "bg-orange-50 text-orange-800" },
                  { s: "OL", n: "Arcilla/limo orgánico baja plasticidad", c: "bg-yellow-50 text-yellow-900" },
                  { s: "MH", n: "Limo inorgánico alta plasticidad", c: "bg-blue-50 text-blue-800" },
                  { s: "CH", n: "Arcilla inorgánica alta plasticidad", c: "bg-orange-50 text-orange-800" },
                  { s: "OH", n: "Arcilla/limo orgánico alta plasticidad", c: "bg-yellow-50 text-yellow-900" },
                  { s: "CL-ML", n: "Frontera arcilla-limo", c: "bg-orange-50 text-orange-800" },
                  { s: "Pt", n: "Turba y suelos altamente orgánicos", c: "bg-yellow-50 text-yellow-900" },
                ].map(({ s, n, c }) => (
                  <div key={s} className={`flex items-center gap-3 p-2.5 rounded-lg ${c}`}>
                    <span className="font-bold text-sm w-14 flex-shrink-0">{s}</span>
                    <span className="text-xs">{n}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function Campo({ labelHtml, value, onChange, placeholder }: {
  labelHtml: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1" dangerouslySetInnerHTML={{ __html: labelHtml }} />
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
    </div>
  )
}

function PropRes({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-white bg-opacity-60 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-800">{valor}</div>
    </div>
  )
}