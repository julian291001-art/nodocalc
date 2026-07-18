"use client"
import { useState, useMemo } from "react"
import katex from "katex"
// @ts-ignore: Allow importing CSS side-effect in this TSX file
import "katex/dist/katex.min.css"
import Sidebar from "../../components/Sidebar"
import { resolverViga, Apoyo, Carga, Rotula, ResultadoViga, TipoApoyo } from "../../lib/vigas/motor"

function Formula({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: block })
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

let contador = 0
function nuevoId(prefijo: string) {
  contador += 1
  return `${prefijo}${contador}`
}

const nombresApoyo: Record<TipoApoyo, string> = {
  simple: "Simple",
  empotrado: "Empotrado",
  libre: "Libre (voladizo)",
  guia: "Guía (deslizante)",
}

// ---------------------------------------------------------------------------
// Gráfico cartesiano interactivo (SVG puro, sin imágenes renderizadas)
// ---------------------------------------------------------------------------
function GraficoInteractivo({
  datos,
  L,
  color,
  etiqueta,
  unidad,
}: {
  datos: { x: number; y: number }[]
  L: number
  color: string
  etiqueta: string
  unidad: string
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const ancho = 700
  const alto = 230
  const margenIzq = 58
  const margenDer = 20
  const margenTop = 22
  const margenBot = 32
  const anchoGraf = ancho - margenIzq - margenDer
  const altoGraf = alto - margenTop - margenBot

  const yMinRaw = Math.min(0, ...datos.map((d) => d.y))
  const yMaxRaw = Math.max(0, ...datos.map((d) => d.y))
  const rango = yMaxRaw - yMinRaw || 1
  const yMin = yMinRaw - rango * 0.12
  const yMax = yMaxRaw + rango * 0.12
  const rangoY = yMax - yMin || 1

  function xPix(x: number) {
    return margenIzq + (x / L) * anchoGraf
  }
  function yPix(y: number) {
    return margenTop + altoGraf - ((y - yMin) / rangoY) * altoGraf
  }

  const y0Pix = yPix(0)

  const pathArea =
    `M ${xPix(datos[0].x)},${y0Pix} ` +
    datos.map((d) => `L ${xPix(d.x)},${yPix(d.y)}`).join(" ") +
    ` L ${xPix(datos[datos.length - 1].x)},${y0Pix} Z`

  const pathLine = datos.map((d, i) => `${i === 0 ? "M" : "L"} ${xPix(d.x)},${yPix(d.y)}`).join(" ")

  const numTicksX = 8
  const ticksX = Array.from({ length: numTicksX + 1 }, (_, i) => (L * i) / numTicksX)
  const numTicksY = 5
  const ticksY = Array.from({ length: numTicksY + 1 }, (_, i) => yMin + (rangoY * i) / numTicksY)

  const pasoMuestra = Math.max(1, Math.floor(datos.length / 18))
  const puntosVisibles = datos.filter((_, i) => i % pasoMuestra === 0 || i === datos.length - 1)

  function manejarMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const xPantalla = ((e.clientX - rect.left) / rect.width) * ancho
    const xData = ((xPantalla - margenIzq) / anchoGraf) * L
    let mejorIdx = 0
    let mejorDist = Infinity
    datos.forEach((d, i) => {
      const dist = Math.abs(d.x - xData)
      if (dist < mejorDist) {
        mejorDist = dist
        mejorIdx = i
      }
    })
    setHoverIdx(mejorIdx)
  }

  const puntoHover = hoverIdx !== null ? datos[hoverIdx] : null
  const tooltipX = puntoHover ? Math.min(Math.max(xPix(puntoHover.x), margenIzq + 58), ancho - margenDer - 58) : 0

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      className="w-full cursor-crosshair"
      style={{ height: alto }}
      onMouseMove={manejarMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {ticksY.map((ty, i) => (
        <g key={`y${i}`}>
          <line x1={margenIzq} y1={yPix(ty)} x2={ancho - margenDer} y2={yPix(ty)} stroke="#f1f5f9" strokeWidth={1} />
          <text x={margenIzq - 8} y={yPix(ty) + 3} fontSize={9} textAnchor="end" fill="#94a3b8">
            {ty.toFixed(2)}
          </text>
        </g>
      ))}
      {ticksX.map((tx, i) => (
        <g key={`x${i}`}>
          <line x1={xPix(tx)} y1={margenTop} x2={xPix(tx)} y2={alto - margenBot} stroke="#f8fafc" strokeWidth={1} />
          <text x={xPix(tx)} y={alto - margenBot + 14} fontSize={9} textAnchor="middle" fill="#94a3b8">
            {tx.toFixed(1)}
          </text>
        </g>
      ))}

      <line x1={margenIzq} y1={y0Pix} x2={ancho - margenDer} y2={y0Pix} stroke="#cbd5e1" strokeWidth={1.5} />
      <line x1={margenIzq} y1={margenTop} x2={margenIzq} y2={alto - margenBot} stroke="#cbd5e1" strokeWidth={1.5} />

      <path d={pathArea} fill={color} opacity={0.16} />
      <path d={pathLine} fill="none" stroke={color} strokeWidth={2} />

      {puntosVisibles.map((d, i) => (
        <circle key={i} cx={xPix(d.x)} cy={yPix(d.y)} r={2.6} fill={color} stroke="white" strokeWidth={0.8} />
      ))}

      {puntoHover && (
        <>
          <line
            x1={xPix(puntoHover.x)} y1={margenTop}
            x2={xPix(puntoHover.x)} y2={alto - margenBot}
            stroke="#64748b" strokeDasharray="3,3" strokeWidth={1}
          />
          <circle cx={xPix(puntoHover.x)} cy={yPix(puntoHover.y)} r={4.5} fill="white" stroke={color} strokeWidth={2} />
          <g transform={`translate(${tooltipX}, ${margenTop + 4})`}>
            <rect x={-58} y={-4} width={116} height={30} rx={5} fill="#1e293b" opacity={0.92} />
            <text x={0} y={9} fontSize={9.5} textAnchor="middle" fill="white">x = {puntoHover.x.toFixed(2)} m</text>
            <text x={0} y={20} fontSize={9.5} textAnchor="middle" fill="white">
              {puntoHover.y.toFixed(4)} {unidad}
            </text>
          </g>
        </>
      )}

      <text x={margenIzq + 2} y={14} fontSize={10} fill="#475569" fontWeight={500}>
        {etiqueta}
      </text>
    </svg>
  )
}

export default function DobleIntegracion() {
  const [L, setL] = useState(6)
  const [E, setE] = useState(200000) // MPa
  const [I, setI] = useState(50000) // cm4
  const EI = useMemo(() => E * 1000 * I * 1e-8, [E, I]) // kN*m2

  const [apoyos, setApoyos] = useState<Apoyo[]>([
    { id: "A", x: 0, tipo: "simple" },
    { id: "B", x: 6, tipo: "simple" },
  ])
  const [cargas, setCargas] = useState<Carga[]>([{ id: "C1", tipo: "puntual", x: 3, P: 10 }])
  const [rotulas, setRotulas] = useState<Rotula[]>([])

  const [resultado, setResultado] = useState<ResultadoViga | null>(null)
  const [error, setError] = useState<string | null>(null)

  function agregarApoyo() {
    setApoyos([...apoyos, { id: nuevoId("Ap"), x: 0, tipo: "simple" }])
  }
  function actualizarApoyo(id: string, cambios: Partial<Apoyo>) {
    setApoyos(apoyos.map((a) => (a.id === id ? { ...a, ...cambios } : a)))
  }
  function borrarApoyo(id: string) {
    setApoyos(apoyos.filter((a) => a.id !== id))
  }

  function agregarCarga(tipo: Carga["tipo"]) {
    if (tipo === "puntual") setCargas([...cargas, { id: nuevoId("Ca"), tipo: "puntual", x: 0, P: 0 }])
    if (tipo === "momento") setCargas([...cargas, { id: nuevoId("Ca"), tipo: "momento", x: 0, M: 0 }])
    if (tipo === "distribuida")
      setCargas([...cargas, { id: nuevoId("Ca"), tipo: "distribuida", xi: 0, xf: L, wi: 0, wf: 0 }])
  }
  function actualizarCarga(id: string, cambios: any) {
    setCargas(cargas.map((c) => (c.id === id ? { ...c, ...cambios } : c)) as Carga[])
  }
  function borrarCarga(id: string) {
    setCargas(cargas.filter((c) => c.id !== id))
  }

  function agregarRotula() {
    setRotulas([...rotulas, { id: nuevoId("R"), x: L / 2 }])
  }
  function actualizarRotula(id: string, x: number) {
    setRotulas(rotulas.map((r) => (r.id === id ? { ...r, x } : r)))
  }
  function borrarRotula(id: string) {
    setRotulas(rotulas.filter((r) => r.id !== id))
  }

  function calcular() {
    try {
      setError(null)
      const res = resolverViga(L, apoyos, cargas, rotulas)
      setResultado(res)
    } catch (e: any) {
      setError(e.message || "Error al resolver la viga")
      setResultado(null)
    }
  }

  const anchoSvg = 700
  const margen = 40
  const escala = (anchoSvg - 2 * margen) / L
  const yViga = 120
  function xSvg(x: number) {
    return margen + x * escala
  }

  const puntos = useMemo(() => {
    if (!resultado) return null
    const n = 120
    const arr = []
    for (let i = 0; i <= n; i++) {
      const x = (L * i) / n
      arr.push({
        x,
        M: resultado.M(x),
        V: resultado.V(x),
        v: resultado.v(x, EI),
      })
    }
    return arr
  }, [resultado, L, EI])

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos / Vigas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Doble integración clásica</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Datos generales */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DATOS GENERALES</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500">Longitud de la viga (m)</label>
                <input
                  type="number"
                  value={L}
                  onChange={(e) => setL(Number(e.target.value))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">E (MPa)</label>
                <input
                  type="number"
                  value={E}
                  onChange={(e) => setE(Number(e.target.value))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">I (cm⁴)</label>
                <input
                  type="number"
                  value={I}
                  onChange={(e) => setI(Number(e.target.value))}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">EI calculado = {EI.toFixed(2)} kN·m²</div>
            <button className="mt-3 text-xs text-blue-600 hover:underline">
              Importar sección desde Section Builder
            </button>
          </div>

          {/* Apoyos */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">APOYOS</div>
              <button onClick={agregarApoyo} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">
                + Agregar apoyo
              </button>
            </div>
            <div className="space-y-2">
              {apoyos.map((a) => (
                <div key={a.id} className="grid grid-cols-6 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <span className="text-xs text-gray-500">{a.id}</span>
                  <input
                    type="number"
                    value={a.x}
                    onChange={(e) => actualizarApoyo(a.id, { x: Number(e.target.value) })}
                    placeholder="x (m)"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <select
                    value={a.tipo}
                    onChange={(e) => actualizarApoyo(a.id, { tipo: e.target.value as TipoApoyo })}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm col-span-2"
                  >
                    {Object.entries(nombresApoyo).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={a.asentamiento ?? 0}
                    onChange={(e) => actualizarApoyo(a.id, { asentamiento: Number(e.target.value) })}
                    placeholder="asentamiento (m)"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <button onClick={() => borrarApoyo(a.id)} className="text-red-500 text-xs hover:underline">
                    Borrar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Rótulas */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">RÓTULAS INTERNAS</div>
              <button onClick={agregarRotula} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">
                + Agregar rótula
              </button>
            </div>
            <div className="space-y-2">
              {rotulas.map((r) => (
                <div key={r.id} className="grid grid-cols-6 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <span className="text-xs text-gray-500">{r.id}</span>
                  <input
                    type="number"
                    value={r.x}
                    onChange={(e) => actualizarRotula(r.id, Number(e.target.value))}
                    placeholder="x (m)"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <button onClick={() => borrarRotula(r.id)} className="text-red-500 text-xs hover:underline">
                    Borrar
                  </button>
                </div>
              ))}
              {rotulas.length === 0 && <div className="text-xs text-gray-400">Sin rótulas — viga continua.</div>}
            </div>
          </div>

          {/* Cargas */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">CARGAS</div>
              <div className="flex gap-2">
                <button onClick={() => agregarCarga("puntual")} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">
                  + Puntual
                </button>
                <button onClick={() => agregarCarga("momento")} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">
                  + Momento
                </button>
                <button onClick={() => agregarCarga("distribuida")} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">
                  + Distribuida
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {cargas.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-lg p-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 w-16">{c.id}</span>
                  {c.tipo === "puntual" && (
                    <>
                      <span className="text-xs">Puntual</span>
                      <input type="number" value={c.x} onChange={(e) => actualizarCarga(c.id, { x: Number(e.target.value) })} placeholder="x (m)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      <input type="number" value={c.P} onChange={(e) => actualizarCarga(c.id, { P: Number(e.target.value) })} placeholder="P (kN, ↓+)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-28" />
                    </>
                  )}
                  {c.tipo === "momento" && (
                    <>
                      <span className="text-xs">Momento</span>
                      <input type="number" value={c.x} onChange={(e) => actualizarCarga(c.id, { x: Number(e.target.value) })} placeholder="x (m)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      <input type="number" value={c.M} onChange={(e) => actualizarCarga(c.id, { M: Number(e.target.value) })} placeholder="M (kN·m, ↺+)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-28" />
                    </>
                  )}
                  {c.tipo === "distribuida" && (
                    <>
                      <span className="text-xs">Distribuida</span>
                      <input type="number" value={c.xi} onChange={(e) => actualizarCarga(c.id, { xi: Number(e.target.value) })} placeholder="xi (m)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20" />
                      <input type="number" value={c.xf} onChange={(e) => actualizarCarga(c.id, { xf: Number(e.target.value) })} placeholder="xf (m)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20" />
                      <input type="number" value={c.wi} onChange={(e) => actualizarCarga(c.id, { wi: Number(e.target.value) })} placeholder="wi (kN/m)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      <input type="number" value={c.wf} onChange={(e) => actualizarCarga(c.id, { wf: Number(e.target.value) })} placeholder="wf (kN/m)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                    </>
                  )}
                  <button onClick={() => borrarCarga(c.id)} className="text-red-500 text-xs hover:underline ml-auto">
                    Borrar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Esquema de la viga */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESQUEMA</div>
            <svg viewBox={`0 0 ${anchoSvg} 210`} className="w-full h-52">
              <line x1={xSvg(0)} y1={yViga} x2={xSvg(L)} y2={yViga} stroke="#1e3a8a" strokeWidth={4} />

              {apoyos.map((a) => (
                <g key={a.id}>
                  {a.tipo === "simple" && (
                    <polygon points={`${xSvg(a.x)},${yViga} ${xSvg(a.x) - 10},${yViga + 18} ${xSvg(a.x) + 10},${yViga + 18}`} fill="#2563eb" />
                  )}
                  {a.tipo === "empotrado" && <rect x={xSvg(a.x) - 4} y={yViga - 20} width={8} height={40} fill="#1e3a8a" />}
                  {a.tipo === "guia" && (
                    <>
                      <polygon points={`${xSvg(a.x)},${yViga} ${xSvg(a.x) - 10},${yViga + 18} ${xSvg(a.x) + 10},${yViga + 18}`} fill="#94a3b8" />
                      <line x1={xSvg(a.x) - 12} y1={yViga + 20} x2={xSvg(a.x) + 12} y2={yViga + 20} stroke="#94a3b8" strokeWidth={2} />
                    </>
                  )}
                  <text x={xSvg(a.x)} y={yViga + 34} fontSize={10} textAnchor="middle" fill="#64748b">
                    {a.id}
                  </text>
                </g>
              ))}

              {rotulas.map((r) => (
                <circle key={r.id} cx={xSvg(r.x)} cy={yViga} r={5} fill="white" stroke="#1e3a8a" strokeWidth={2} />
              ))}

              {cargas.map((c) => {
                if (c.tipo === "puntual")
                  return (
                    <g key={c.id}>
                      <line x1={xSvg(c.x)} y1={yViga - 40} x2={xSvg(c.x)} y2={yViga - 4} stroke="#dc2626" strokeWidth={2} markerEnd="url(#flecha)" />
                      <text x={xSvg(c.x)} y={yViga - 44} fontSize={10} textAnchor="middle" fill="#dc2626">
                        {c.P}kN
                      </text>
                    </g>
                  )
                if (c.tipo === "momento")
                  return (
                    <text key={c.id} x={xSvg(c.x)} y={yViga - 20} fontSize={16} textAnchor="middle" fill="#dc2626">
                      ↻
                    </text>
                  )
                if (c.tipo === "distribuida") {
                  const maxW = Math.max(
                    ...cargas.filter((cc) => cc.tipo === "distribuida").map((cc: any) => Math.max(cc.wi, cc.wf)),
                    1
                  )
                  const alturaMax = 45
                  const hi = (c.wi / maxW) * alturaMax
                  const hf = (c.wf / maxW) * alturaMax
                  const yTopoIzq = yViga - 8 - hi
                  const yTopoDer = yViga - 8 - hf
                  const numFlechas = Math.max(3, Math.round((xSvg(c.xf) - xSvg(c.xi)) / 30))
                  return (
                    <g key={c.id}>
                      <polygon
                        points={`${xSvg(c.xi)},${yTopoIzq} ${xSvg(c.xf)},${yTopoDer} ${xSvg(c.xf)},${yViga - 8} ${xSvg(c.xi)},${yViga - 8}`}
                        fill="#fecaca"
                        opacity={0.5}
                        stroke="#dc2626"
                        strokeWidth={1}
                      />
                      {Array.from({ length: numFlechas + 1 }).map((_, i) => {
                        const t = i / numFlechas
                        const x = xSvg(c.xi) + t * (xSvg(c.xf) - xSvg(c.xi))
                        const yTopo = yTopoIzq + t * (yTopoDer - yTopoIzq)
                        return (
                          <line
                            key={i}
                            x1={x} y1={yTopo}
                            x2={x} y2={yViga - 8}
                            stroke="#dc2626"
                            strokeWidth={1}
                            markerEnd="url(#flechaChica)"
                          />
                        )
                      })}
                      <text x={xSvg(c.xi)} y={yTopoIzq - 4} fontSize={9} textAnchor="middle" fill="#dc2626">
                        {c.wi}
                      </text>
                      <text x={xSvg(c.xf)} y={yTopoDer - 4} fontSize={9} textAnchor="middle" fill="#dc2626">
                        {c.wf}
                      </text>
                      <text x={(xSvg(c.xi) + xSvg(c.xf)) / 2} y={yViga - 8 - alturaMax - 10} fontSize={9} textAnchor="middle" fill="#dc2626">
                        kN/m
                      </text>
                    </g>
                  )
                }
                return null
              })}

              <defs>
                <marker id="flecha" markerWidth={8} markerHeight={8} refX={4} refY={4} orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#dc2626" />
                </marker>
                <marker id="flechaChica" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
                </marker>
              </defs>
            </svg>
          </div>

          <button onClick={calcular} className="bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-blue-800">
            Calcular
          </button>

          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

          {resultado && puntos && (
            <>
              {/* Reacciones */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">REACCIONES</div>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(resultado.reacciones).map(([id, r]) => (
                    <div key={id} className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-600">
                      <div className="text-xs text-blue-500">Apoyo {id}</div>
                      {r.Fy !== undefined && <div className="text-sm font-bold text-blue-800">Fy = {r.Fy.toFixed(3)} kN</div>}
                      {r.M !== undefined && <div className="text-sm font-bold text-blue-800">M = {r.M.toFixed(3)} kN·m</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Paso a paso */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PASO A PASO</div>
                <div className="text-sm mb-2">
                  <Formula tex={`EI \\cdot v''(x) = M(x)`} block />
                </div>
                <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                  {resultado.pasos.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                <div className="text-sm mt-3 space-y-1">
                  {Object.entries(resultado.constantes).map(([k, v]) => (
                    <div key={k}>
                      <Formula tex={`${k} = ${v.toFixed(4)}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagrama de Momento Flector */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DIAGRAMA DE MOMENTO FLECTOR</div>
                <div className="text-xs text-gray-400 mb-2">
                  Máximo: {Math.max(...puntos.map((p) => p.M)).toFixed(3)} kN·m — Mínimo: {Math.min(...puntos.map((p) => p.M)).toFixed(3)} kN·m
                </div>
                <GraficoInteractivo
                  datos={puntos.map((p) => ({ x: p.x, y: p.M }))}
                  L={L}
                  color="#2563eb"
                  etiqueta="M(x)"
                  unidad="kN·m"
                />
              </div>

              {/* Diagrama de Fuerza Cortante */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DIAGRAMA DE FUERZA CORTANTE</div>
                <div className="text-xs text-gray-400 mb-2">
                  Máximo: {Math.max(...puntos.map((p) => p.V)).toFixed(3)} kN — Mínimo: {Math.min(...puntos.map((p) => p.V)).toFixed(3)} kN
                </div>
                <GraficoInteractivo
                  datos={puntos.map((p) => ({ x: p.x, y: p.V }))}
                  L={L}
                  color="#f97316"
                  etiqueta="V(x)"
                  unidad="kN"
                />
              </div>

              {/* Diagrama de Deflexión */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DEFLEXIÓN</div>
                <div className="text-xs text-gray-400 mb-2">
                  Máxima: {Math.max(...puntos.map((p) => p.v)).toFixed(5)} m — Mínima: {Math.min(...puntos.map((p) => p.v)).toFixed(5)} m
                </div>
                <GraficoInteractivo
                  datos={puntos.map((p) => ({ x: p.x, y: p.v }))}
                  L={L}
                  color="#64748b"
                  etiqueta="v(x)"
                  unidad="m"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}