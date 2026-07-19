"use client"
import { useState, useMemo } from "react"
import katex from "katex"
// @ts-ignore: CSS import for KaTeX styles
import "katex/dist/katex.min.css"
import Sidebar from "../../components/Sidebar"
import { resolverViga, Apoyo, Carga, Rotula, ResultadoViga, TipoApoyo, Termino } from "../../lib/vigas/motor"

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
  guia: "Guía (restringe giro)",
}

type Poly = { power: number; coef: number }[]

function expandirTermino(t: Termino): Poly {
  const { coef, power, x0 } = t
  if (power === 0) return [{ power: 0, coef }]
  if (power === 1) return [{ power: 1, coef }, { power: 0, coef: -coef * x0 }]
  if (power === 2)
    return [
      { power: 2, coef },
      { power: 1, coef: -2 * coef * x0 },
      { power: 0, coef: coef * x0 * x0 },
    ]
  if (power === 3)
    return [
      { power: 3, coef },
      { power: 2, coef: -3 * coef * x0 },
      { power: 1, coef: 3 * coef * x0 * x0 },
      { power: 0, coef: -coef * x0 * x0 * x0 },
    ]
  return []
}

function polinomioTramo(terminosM: Termino[], inicioTramo: number): Poly {
  const activos = terminosM.filter((t) => t.x0 <= inicioTramo + 1e-6)
  const acumulado: Record<number, number> = {}
  activos.forEach((t) => {
    expandirTermino(t).forEach(({ power, coef }) => {
      acumulado[power] = (acumulado[power] || 0) + coef
    })
  })
  return Object.entries(acumulado)
    .map(([power, coef]) => ({ power: Number(power), coef }))
    .filter((p) => Math.abs(p.coef) > 1e-9)
    .sort((a, b) => b.power - a.power)
}

function integrarPoly(poly: Poly): Poly {
  return poly.map((p) => ({ power: p.power + 1, coef: p.coef / (p.power + 1) }))
}

function evaluarPoly(poly: Poly, x: number): number {
  return poly.reduce((acc, p) => acc + p.coef * Math.pow(x, p.power), 0)
}

function polyALatex(poly: Poly, constante?: { nombre: string; valor: number }): string {
  const partes = poly.filter((p) => Math.abs(p.coef) > 1e-9)
  let expr = ""
  partes.forEach((p, i) => {
    const signo = p.coef >= 0 ? (i === 0 ? "" : "+") : "-"
    const abs = Math.abs(p.coef).toFixed(4)
    const termino = p.power === 0 ? abs : p.power === 1 ? `${abs}x` : `${abs}x^{${p.power}}`
    expr += ` ${signo} ${termino}`
  })
  if (constante) {
    const signo = constante.valor >= 0 ? "+" : "-"
    expr += ` ${signo} ${constante.nombre}`
  }
  expr = expr.trim()
  if (expr.startsWith("+")) expr = expr.slice(1).trim()
  return expr || "0"
}

interface DatosTramo {
  inicio: number
  fin: number
  polyM: Poly
  polyTheta: Poly
  polyV: Poly
  cTheta: number
  cV: number
  nombreCTheta: string
  nombreCV: string
}

function calcularTramos(resultado: ResultadoViga, EI: number): DatosTramo[] {
  const puntos = resultado.puntosCriticos
  const tramos: DatosTramo[] = []
  let contadorC = 1
  for (let i = 0; i < puntos.length - 1; i++) {
    const inicio = puntos[i]
    const fin = puntos[i + 1]
    const polyM = polinomioTramo(resultado.terminosM, inicio)
    const polyTheta = integrarPoly(polyM)
    const polyV = integrarPoly(polyTheta)

    const thetaTrueEI = resultado.theta(inicio, EI) * EI
    const vTrueEI = resultado.v(inicio, EI) * EI

    const cTheta = thetaTrueEI - evaluarPoly(polyTheta, inicio)
    const cV = vTrueEI - evaluarPoly(polyV, inicio) - cTheta * inicio

    const nombreCTheta = `C_{${contadorC}}`
    const nombreCV = `C_{${contadorC + 1}}`
    contadorC += 2

    tramos.push({ inicio, fin, polyM, polyTheta, polyV, cTheta, cV, nombreCTheta, nombreCV })
  }
  return tramos
}

function evaluarMConLado(terminos: Termino[], x: number, incluirBorde: boolean): number {
  return terminos.reduce((acc, t) => {
    const d = x - t.x0
    if (d < 0) return acc
    if (d === 0 && !incluirBorde) return acc
    if (t.power === 0) return acc + t.coef
    return acc + t.coef * Math.pow(d, t.power)
  }, 0)
}
function evaluarVConLado(terminos: Termino[], x: number, incluirBorde: boolean): number {
  return terminos.reduce((acc, t) => {
    if (t.power === 0) return acc
    const d = x - t.x0
    if (d < 0) return acc
    if (d === 0 && !incluirBorde) return acc
    const nuevaPower = t.power - 1
    if (nuevaPower === 0) return acc + t.coef * t.power
    return acc + t.coef * t.power * Math.pow(d, nuevaPower)
  }, 0)
}

function GraficoInteractivo({
  datos, L, color, etiqueta, unidad,
}: { datos: { x: number; y: number }[]; L: number; color: string; etiqueta: string; unidad: string }) {
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

  function xPix(x: number) { return margenIzq + (x / L) * anchoGraf }
  function yPix(y: number) { return margenTop + altoGraf - ((y - yMin) / rangoY) * altoGraf }
  const y0Pix = yPix(0)

  const pathArea = `M ${xPix(datos[0].x)},${y0Pix} ` + datos.map((d) => `L ${xPix(d.x)},${yPix(d.y)}`).join(" ") + ` L ${xPix(datos[datos.length - 1].x)},${y0Pix} Z`
  const pathLine = datos.map((d, i) => `${i === 0 ? "M" : "L"} ${xPix(d.x)},${yPix(d.y)}`).join(" ")

  const ticksX = Array.from({ length: 9 }, (_, i) => (L * i) / 8)
  const ticksY = Array.from({ length: 6 }, (_, i) => yMin + (rangoY * i) / 5)
  const pasoMuestra = Math.max(1, Math.floor(datos.length / 22))
  const puntosVisibles = datos.filter((_, i) => i % pasoMuestra === 0 || i === datos.length - 1)

  function manejarMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const xPantalla = ((e.clientX - rect.left) / rect.width) * ancho
    const xData = ((xPantalla - margenIzq) / anchoGraf) * L
    let mejorIdx = 0, mejorDist = Infinity
    datos.forEach((d, i) => { const dist = Math.abs(d.x - xData); if (dist < mejorDist) { mejorDist = dist; mejorIdx = i } })
    setHoverIdx(mejorIdx)
  }

  const puntoHover = hoverIdx !== null ? datos[hoverIdx] : null
  const tooltipX = puntoHover ? Math.min(Math.max(xPix(puntoHover.x), margenIzq + 58), ancho - margenDer - 58) : 0

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full cursor-crosshair block" style={{ aspectRatio: `${ancho} / ${alto}` }} onMouseMove={manejarMouseMove} onMouseLeave={() => setHoverIdx(null)}>
      {ticksY.map((ty, i) => (
        <g key={`y${i}`}>
          <line x1={margenIzq} y1={yPix(ty)} x2={ancho - margenDer} y2={yPix(ty)} stroke="#f1f5f9" strokeWidth={1} />
          <text x={margenIzq - 8} y={yPix(ty) + 3} fontSize={9} textAnchor="end" fill="#94a3b8">{ty.toFixed(2)}</text>
        </g>
      ))}
      {ticksX.map((tx, i) => (
        <g key={`x${i}`}>
          <line x1={xPix(tx)} y1={margenTop} x2={xPix(tx)} y2={alto - margenBot} stroke="#f8fafc" strokeWidth={1} />
          <text x={xPix(tx)} y={alto - margenBot + 14} fontSize={9} textAnchor="middle" fill="#94a3b8">{tx.toFixed(1)}</text>
        </g>
      ))}
      <line x1={margenIzq} y1={y0Pix} x2={ancho - margenDer} y2={y0Pix} stroke="#cbd5e1" strokeWidth={1.5} />
      <line x1={margenIzq} y1={margenTop} x2={margenIzq} y2={alto - margenBot} stroke="#cbd5e1" strokeWidth={1.5} />
      <path d={pathArea} fill={color} opacity={0.16} />
      <path d={pathLine} fill="none" stroke={color} strokeWidth={2} />
      {puntosVisibles.map((d, i) => <circle key={i} cx={xPix(d.x)} cy={yPix(d.y)} r={2.6} fill={color} stroke="white" strokeWidth={0.8} />)}
      {puntoHover && (
        <>
          <line x1={xPix(puntoHover.x)} y1={margenTop} x2={xPix(puntoHover.x)} y2={alto - margenBot} stroke="#64748b" strokeDasharray="3,3" strokeWidth={1} />
          <circle cx={xPix(puntoHover.x)} cy={yPix(puntoHover.y)} r={4.5} fill="white" stroke={color} strokeWidth={2} />
          <g transform={`translate(${tooltipX}, ${margenTop + 4})`}>
            <rect x={-58} y={-4} width={116} height={30} rx={5} fill="#1e293b" opacity={0.92} />
            <text x={0} y={9} fontSize={9.5} textAnchor="middle" fill="white">x = {puntoHover.x.toFixed(2)} m</text>
            <text x={0} y={20} fontSize={9.5} textAnchor="middle" fill="white">{puntoHover.y.toFixed(4)} {unidad}</text>
          </g>
        </>
      )}
      <text x={margenIzq + 2} y={14} fontSize={10} fill="#475569" fontWeight={500}>{etiqueta}</text>
    </svg>
  )
}

function PanelReacciones({ reacciones, titulo }: { reacciones: ResultadoViga["reacciones"] | null; titulo: string }) {
  if (!reacciones || Object.keys(reacciones).length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">{titulo}</div>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(reacciones).map(([id, r]) => (
          <div key={id} className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-600">
            <div className="text-xs text-blue-500">Apoyo {id}</div>
            {r.Fy !== undefined && (
              <div className="text-sm font-bold text-blue-800">
                Fy = {Math.abs(r.Fy).toFixed(3)} kN {r.Fy >= 0 ? "↑" : "↓"}
              </div>
            )}
            {r.M !== undefined && (
              <div className="text-sm font-bold text-blue-800">
                M = {Math.abs(r.M).toFixed(3)} kN·m {r.M >= 0 ? "↺" : "↻"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DobleIntegracion() {
  const [L, setL] = useState(6)
  const [E, setE] = useState(200000)
  const [I, setI] = useState(50000)
  const EI = useMemo(() => E * 1000 * I * 1e-8, [E, I])

  const [apoyos, setApoyos] = useState<Apoyo[]>([
    { id: "A", x: 0, tipo: "simple" },
    { id: "B", x: 6, tipo: "simple" },
  ])
  const [cargas, setCargas] = useState<Carga[]>([{ id: "C1", tipo: "puntual", x: 3, P: 10 }])
  const [rotulas, setRotulas] = useState<Rotula[]>([])

  const [resultado, setResultado] = useState<ResultadoViga | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resultadoLive = useMemo(() => {
    try {
      return resolverViga(L, apoyos, cargas, rotulas)
    } catch {
      return null
    }
  }, [L, apoyos, cargas, rotulas])

  function agregarApoyo() { setApoyos([...apoyos, { id: nuevoId("Ap"), x: 0, tipo: "simple" }]) }
  function actualizarApoyo(id: string, cambios: Partial<Apoyo>) { setApoyos(apoyos.map((a) => (a.id === id ? { ...a, ...cambios } : a))) }
  function borrarApoyo(id: string) { setApoyos(apoyos.filter((a) => a.id !== id)) }

  function agregarCarga(tipo: Carga["tipo"]) {
    if (tipo === "puntual") setCargas([...cargas, { id: nuevoId("Ca"), tipo: "puntual", x: 0, P: 0 }])
    if (tipo === "momento") setCargas([...cargas, { id: nuevoId("Ca"), tipo: "momento", x: 0, M: 0 }])
    if (tipo === "distribuida") setCargas([...cargas, { id: nuevoId("Ca"), tipo: "distribuida", xi: 0, xf: L, wi: 0, wf: 0 }])
  }
  function actualizarCarga(id: string, cambios: any) { setCargas(cargas.map((c) => (c.id === id ? { ...c, ...cambios } : c)) as Carga[]) }
  function borrarCarga(id: string) { setCargas(cargas.filter((c) => c.id !== id)) }

  function agregarRotula() { setRotulas([...rotulas, { id: nuevoId("R"), x: L / 2 }]) }
  function actualizarRotula(id: string, x: number) { setRotulas(rotulas.map((r) => (r.id === id ? { ...r, x } : r))) }
  function borrarRotula(id: string) { setRotulas(rotulas.filter((r) => r.id !== id)) }

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
  function xSvg(xv: number) { return margen + xv * escala }

  const puntos = useMemo(() => {
    if (!resultado) return null
    const n = 140
    const malla: number[] = []
    for (let i = 0; i <= n; i++) malla.push((L * i) / n)
    const criticosInteriores = resultado.puntosCriticos.filter((xc) => xc > 1e-9 && xc < L - 1e-9)
    const criticosSet = new Set(criticosInteriores.map((xc) => Number(xc.toFixed(9))))
    criticosInteriores.forEach((xc) => malla.push(xc))
    const xsOrdenados = Array.from(new Set(malla.map((xv) => Number(xv.toFixed(9))))).sort((a, b) => a - b)
    const arr: { x: number; M: number; V: number; v: number }[] = []
    xsOrdenados.forEach((xv) => {
      const esFinal = Math.abs(xv - L) < 1e-9
      if (criticosSet.has(xv)) {
        arr.push({ x: xv, M: evaluarMConLado(resultado.terminosM, xv, false), V: evaluarVConLado(resultado.terminosM, xv, false), v: resultado.v(xv, EI) })
        arr.push({ x: xv, M: evaluarMConLado(resultado.terminosM, xv, true), V: evaluarVConLado(resultado.terminosM, xv, true), v: resultado.v(xv, EI) })
      } else if (esFinal) {
        arr.push({ x: xv, M: evaluarMConLado(resultado.terminosM, xv, false), V: evaluarVConLado(resultado.terminosM, xv, false), v: resultado.v(xv, EI) })
      } else {
        arr.push({ x: xv, M: evaluarMConLado(resultado.terminosM, xv, true), V: evaluarVConLado(resultado.terminosM, xv, true), v: resultado.v(xv, EI) })
      }
    })
    return arr
  }, [resultado, L, EI])

  const tramos = useMemo(() => (resultado ? calcularTramos(resultado, EI) : null), [resultado, EI])

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos / Vigas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Doble integración clásica</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DATOS GENERALES</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500">Longitud de la viga (m)</label>
                <input type="number" value={L} onChange={(e) => setL(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">E (MPa)</label>
                <input type="number" value={E} onChange={(e) => setE(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">I (cm⁴)</label>
                <input type="number" value={I} onChange={(e) => setI(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">EI calculado = {EI.toFixed(2)} kN·m²</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">APOYOS</div>
              <button onClick={agregarApoyo} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Agregar apoyo</button>
            </div>
            <div className="space-y-2">
              {apoyos.map((a) => (
                <div key={a.id} className="grid grid-cols-6 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <span className="text-xs text-gray-500">{a.id}</span>
                  <input type="number" value={a.x} onChange={(e) => actualizarApoyo(a.id, { x: Number(e.target.value) })} placeholder="x (m)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                  <select value={a.tipo} onChange={(e) => actualizarApoyo(a.id, { tipo: e.target.value as TipoApoyo })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm col-span-2">
                    {Object.entries(nombresApoyo).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input type="number" value={a.asentamiento ?? 0} onChange={(e) => actualizarApoyo(a.id, { asentamiento: Number(e.target.value) })} placeholder="asentamiento (m)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                  <button onClick={() => borrarApoyo(a.id)} className="text-red-500 text-xs hover:underline">Borrar</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">RÓTULAS INTERNAS</div>
              <button onClick={agregarRotula} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Agregar rótula</button>
            </div>
            <div className="space-y-2">
              {rotulas.map((r) => (
                <div key={r.id} className="grid grid-cols-6 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <span className="text-xs text-gray-500">{r.id}</span>
                  <input type="number" value={r.x} onChange={(e) => actualizarRotula(r.id, Number(e.target.value))} placeholder="x (m)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                  <button onClick={() => borrarRotula(r.id)} className="text-red-500 text-xs hover:underline">Borrar</button>
                </div>
              ))}
              {rotulas.length === 0 && <div className="text-xs text-gray-400">Sin rótulas — viga continua.</div>}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">CARGAS</div>
              <div className="flex gap-2">
                <button onClick={() => agregarCarga("puntual")} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Puntual</button>
                <button onClick={() => agregarCarga("momento")} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Momento</button>
                <button onClick={() => agregarCarga("distribuida")} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Distribuida</button>
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
                  <button onClick={() => borrarCarga(c.id)} className="text-red-500 text-xs hover:underline ml-auto">Borrar</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESQUEMA (con reacciones en vivo)</div>
            <svg viewBox={`0 0 ${anchoSvg} 260`} className="w-full h-64">
              <line x1={xSvg(0)} y1={yViga} x2={xSvg(L)} y2={yViga} stroke="#1e3a8a" strokeWidth={4} />
              {apoyos.map((a) => (
                <g key={a.id}>
                  {a.tipo === "simple" && <polygon points={`${xSvg(a.x)},${yViga} ${xSvg(a.x) - 10},${yViga + 18} ${xSvg(a.x) + 10},${yViga + 18}`} fill="#2563eb" />}
                  {a.tipo === "empotrado" && <rect x={xSvg(a.x) - 4} y={yViga - 20} width={8} height={40} fill="#1e3a8a" />}
                  {a.tipo === "guia" && (
                    <>
                      <rect x={xSvg(a.x) - 4} y={yViga - 16} width={8} height={32} fill="#94a3b8" />
                      <line x1={xSvg(a.x) - 12} y1={yViga + 20} x2={xSvg(a.x) + 12} y2={yViga + 20} stroke="#94a3b8" strokeWidth={2} />
                    </>
                  )}
                  <text x={xSvg(a.x)} y={yViga + 34} fontSize={10} textAnchor="middle" fill="#64748b">{a.id}</text>
                </g>
              ))}
              {rotulas.map((r) => <circle key={r.id} cx={xSvg(r.x)} cy={yViga} r={5} fill="white" stroke="#1e3a8a" strokeWidth={2} />)}
              {cargas.map((c) => {
                if (c.tipo === "puntual")
                  return (
                    <g key={c.id}>
                      <line x1={xSvg(c.x)} y1={yViga - 40} x2={xSvg(c.x)} y2={yViga - 4} stroke="#dc2626" strokeWidth={2} markerEnd="url(#flecha)" />
                      <text x={xSvg(c.x)} y={yViga - 44} fontSize={10} textAnchor="middle" fill="#dc2626">{c.P}kN</text>
                    </g>
                  )
                if (c.tipo === "momento")
                  return (
                    <text key={c.id} x={xSvg(c.x)} y={yViga - 20} fontSize={18} textAnchor="middle" fill="#dc2626">
                      {c.M >= 0 ? "↺" : "↻"}
                    </text>
                  )
                if (c.tipo === "distribuida") {
                  const maxW = Math.max(...cargas.filter((cc) => cc.tipo === "distribuida").map((cc: any) => Math.max(cc.wi, cc.wf)), 1)
                  const alturaMax = 45
                  const hi = (c.wi / maxW) * alturaMax
                  const hf = (c.wf / maxW) * alturaMax
                  const yTopoIzq = yViga - 8 - hi
                  const yTopoDer = yViga - 8 - hf
                  const numFlechas = Math.max(3, Math.round((xSvg(c.xf) - xSvg(c.xi)) / 30))
                  return (
                    <g key={c.id}>
                      <polygon points={`${xSvg(c.xi)},${yTopoIzq} ${xSvg(c.xf)},${yTopoDer} ${xSvg(c.xf)},${yViga - 8} ${xSvg(c.xi)},${yViga - 8}`} fill="#fecaca" opacity={0.5} stroke="#dc2626" strokeWidth={1} />
                      {Array.from({ length: numFlechas + 1 }).map((_, i) => {
                        const t = i / numFlechas
                        const xf2 = xSvg(c.xi) + t * (xSvg(c.xf) - xSvg(c.xi))
                        const yTopo = yTopoIzq + t * (yTopoDer - yTopoIzq)
                        return <line key={i} x1={xf2} y1={yTopo} x2={xf2} y2={yViga - 8} stroke="#dc2626" strokeWidth={1} markerEnd="url(#flechaChica)" />
                      })}
                      <text x={xSvg(c.xi)} y={yTopoIzq - 4} fontSize={9} textAnchor="middle" fill="#dc2626">{c.wi}</text>
                      <text x={xSvg(c.xf)} y={yTopoDer - 4} fontSize={9} textAnchor="middle" fill="#dc2626">{c.wf}</text>
                    </g>
                  )
                }
                return null
              })}

              {resultadoLive && Object.entries(resultadoLive.reacciones).map(([id, r]) => {
                const apoyo = apoyos.find((a) => a.id === id)
                if (!apoyo) return null
                const xPos = xSvg(apoyo.x)
                return (
                  <g key={`reac-${id}`}>
                    {r.Fy !== undefined && Math.abs(r.Fy) > 1e-6 && (
                      <>
                        <line
                          x1={xPos}
                          y1={r.Fy >= 0 ? yViga + 72 : yViga + 32}
                          x2={xPos}
                          y2={r.Fy >= 0 ? yViga + 32 : yViga + 72}
                          stroke="#16a34a" strokeWidth={3.5} markerEnd="url(#flechaVerde)"
                        />
                        <text x={xPos} y={yViga + 86} fontSize={11} textAnchor="middle" fill="#16a34a" fontWeight={700}>
                          {Math.abs(r.Fy).toFixed(1)}kN
                        </text>
                      </>
                    )}
                    {r.M !== undefined && Math.abs(r.M) > 1e-6 && (
                      <>
                        <text x={xPos} y={yViga - 60} fontSize={28} textAnchor="middle" fill="#16a34a">
                          {r.M >= 0 ? "↺" : "↻"}
                        </text>
                        <text x={xPos} y={yViga - 40} fontSize={11} textAnchor="middle" fill="#16a34a" fontWeight={700}>
                          {Math.abs(r.M).toFixed(1)}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}

              <defs>
                <marker id="flecha" markerWidth={8} markerHeight={8} refX={4} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#dc2626" /></marker>
                <marker id="flechaChica" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" /></marker>
                <marker id="flechaVerde" markerWidth={8} markerHeight={8} refX={4} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#16a34a" /></marker>
              </defs>
            </svg>
          </div>

          <PanelReacciones reacciones={resultadoLive?.reacciones ?? null} titulo="REACCIONES (EN VIVO)" />

          <button onClick={calcular} className="bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-blue-800">Calcular desarrollo completo</button>

          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

          {resultado && puntos && tramos && (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DESARROLLO POR TRAMOS — COMPATIBILIDAD COMPLETA</div>
                <div className="text-sm mb-3"><Formula tex={`EI \\cdot v''(x) = M(x)`} block /></div>
                <div className="space-y-4">
                  {tramos.map((t, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <div className="text-xs font-semibold text-gray-500">
                        Tramo {i + 1}: {t.inicio.toFixed(2)} m ≤ x ≤ {t.fin.toFixed(2)} m
                      </div>
                      <div className="text-sm"><Formula tex={`M(x) = ${polyALatex(t.polyM)}`} block /></div>
                      <div className="text-sm"><Formula tex={`EI \\cdot \\theta(x) = ${polyALatex(t.polyTheta, { nombre: t.nombreCTheta, valor: t.cTheta })}`} block /></div>
                      <div className="text-sm"><Formula tex={`EI \\cdot v(x) = ${polyALatex(t.polyV.concat([{ power: 1, coef: t.cTheta }]), { nombre: t.nombreCV, valor: t.cV })}`} block /></div>
                      <div className="text-xs text-gray-400">
                        <Formula tex={`${t.nombreCTheta} = ${t.cTheta.toFixed(4)} \\qquad ${t.nombreCV} = ${t.cV.toFixed(4)}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DIAGRAMA DE MOMENTO FLECTOR</div>
                <div className="text-xs text-gray-400 mb-2">Máximo: {Math.max(...puntos.map((p) => p.M)).toFixed(3)} kN·m — Mínimo: {Math.min(...puntos.map((p) => p.M)).toFixed(3)} kN·m</div>
                <GraficoInteractivo datos={puntos.map((p) => ({ x: p.x, y: p.M }))} L={L} color="#2563eb" etiqueta="M(x)" unidad="kN·m" />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DIAGRAMA DE FUERZA CORTANTE</div>
                <div className="text-xs text-gray-400 mb-2">Máximo: {Math.max(...puntos.map((p) => p.V)).toFixed(3)} kN — Mínimo: {Math.min(...puntos.map((p) => p.V)).toFixed(3)} kN</div>
                <GraficoInteractivo datos={puntos.map((p) => ({ x: p.x, y: p.V }))} L={L} color="#f97316" etiqueta="V(x)" unidad="kN" />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DEFLEXIÓN</div>
                <div className="text-xs text-gray-400 mb-2">Máxima: {Math.max(...puntos.map((p) => p.v)).toFixed(5)} m — Mínima: {Math.min(...puntos.map((p) => p.v)).toFixed(5)} m</div>
                <GraficoInteractivo datos={puntos.map((p) => ({ x: p.x, y: p.v }))} L={L} color="#64748b" etiqueta="v(x)" unidad="m" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}