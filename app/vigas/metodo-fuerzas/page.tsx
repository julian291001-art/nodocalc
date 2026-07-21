"use client"
import { useState, useMemo, useRef, useEffect } from "react"
import katex from "katex"
// @ts-ignore: CSS declaration missing for katex styles
import "katex/dist/katex.min.css"
import Sidebar from "../../components/Sidebar"
import { Apoyo, Carga, Rotula, TipoApoyo, Termino } from "../../lib/vigas/motor"
import {
  Resorte,
  RedundanteApoyo,
  ResultadoFuerzas,
  gradoIndeterminacion,
  resolverPorFuerzas,
  tipoRebajado,
  calcularConstantesIntegracion,
} from "../../lib/vigas/motorFuerzas"
import { useUnidadesStore, SistemaUnidades } from "../../store/useUnidadesStore"
import { convertir, factorLongitud } from "../../lib/unidades"

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
  rodillo: "Rodillo (1: Fy)",
  articulado: "Articulado (2: Fx, Fy)",
  empotrado: "Empotrado (3: Fx, Fy, M)",
  libre: "Libre (voladizo)",
  guia: "Guía (restringe giro)",
}

type Poly = { power: number; coef: number }[]

function polinomioTramo(terminosM: Termino[], inicioTramo: number): Poly {
  const activos = terminosM.filter((t) => t.x0 <= inicioTramo + 1e-6)
  const acumulado: Record<number, number> = {}
  activos.forEach((t) => {
    const { coef, power, x0 } = t
    let partes: Poly
    if (power === 0) partes = [{ power: 0, coef }]
    else if (power === 1) partes = [{ power: 1, coef }, { power: 0, coef: -coef * x0 }]
    else if (power === 2)
      partes = [
        { power: 2, coef },
        { power: 1, coef: -2 * coef * x0 },
        { power: 0, coef: coef * x0 * x0 },
      ]
    else if (power === 3)
      partes = [
        { power: 3, coef },
        { power: 2, coef: -3 * coef * x0 },
        { power: 1, coef: 3 * coef * x0 * x0 },
        { power: 0, coef: -coef * x0 * x0 * x0 },
      ]
    else partes = []
    partes.forEach(({ power: p, coef: c }) => {
      acumulado[p] = (acumulado[p] || 0) + c
    })
  })
  return Object.entries(acumulado)
    .map(([power, coef]) => ({ power: Number(power), coef }))
    .filter((p) => Math.abs(p.coef) > 1e-9)
    .sort((a, b) => b.power - a.power)
}

function polyALatex(poly: Poly): string {
  const partes = poly.filter((p) => Math.abs(p.coef) > 1e-9)
  let expr = ""
  partes.forEach((p, i) => {
    const signo = p.coef >= 0 ? (i === 0 ? "" : "+") : "-"
    const abs = Math.abs(p.coef).toFixed(4)
    const termino = p.power === 0 ? abs : p.power === 1 ? `${abs}x` : `${abs}x^{${p.power}}`
    expr += ` ${signo} ${termino}`
  })
  expr = expr.trim()
  if (expr.startsWith("+")) expr = expr.slice(1).trim()
  return expr || "0"
}

function tramosDeTerminos(terminosM: Termino[], puntosCriticos: number[]): { inicio: number; fin: number; poly: Poly }[] {
  const out: { inicio: number; fin: number; poly: Poly }[] = []
  for (let i = 0; i < puntosCriticos.length - 1; i++) {
    const inicio = puntosCriticos[i]
    const fin = puntosCriticos[i + 1]
    out.push({ inicio, fin, poly: polinomioTramo(terminosM, inicio) })
  }
  return out
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
  datos, L, color, etiqueta, unidad, unidadLongitud = "m",
}: { datos: { x: number; y: number }[]; L: number; color: string; etiqueta: string; unidad: string; unidadLongitud?: string }) {
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
            <text x={0} y={9} fontSize={9.5} textAnchor="middle" fill="white">x = {puntoHover.x.toFixed(2)} {unidadLongitud}</text>
            <text x={0} y={20} fontSize={9.5} textAnchor="middle" fill="white">{puntoHover.y.toFixed(4)} {unidad}</text>
          </g>
        </>
      )}
      <text x={margenIzq + 2} y={14} fontSize={10} fill="#475569" fontWeight={500}>{etiqueta}</text>
    </svg>
  )
}

// Esquema simplificado: apoyos de la primaria + cargas de ese estado.
function EsquemaEstado({
  L, apoyosPrimaria, cargas, unidadLongitud, unidadFuerza, unidadMomento,
}: {
  L: number
  apoyosPrimaria: { id: string; x: number; tipo: TipoApoyo }[]
  cargas: { tipo: string; x?: number; xi?: number; xf?: number; P?: number; M?: number; wi?: number; wf?: number }[]
  unidadLongitud: string
  unidadFuerza: string
  unidadMomento: string
}) {
  const anchoSvg = 640
  const margen = 36
  const escala = (anchoSvg - 2 * margen) / L
  const yViga = 70
  function xSvg(xv: number) { return margen + xv * escala }

  return (
    <svg viewBox={`0 0 ${anchoSvg} 130`} className="w-full h-28">
      <line x1={xSvg(0)} y1={yViga} x2={xSvg(L)} y2={yViga} stroke="#1e3a8a" strokeWidth={3} />
      {apoyosPrimaria.map((a) => (
        <g key={a.id}>
          {a.tipo === "rodillo" && (
            <>
              <polygon points={`${xSvg(a.x)},${yViga} ${xSvg(a.x) - 8},${yViga + 14} ${xSvg(a.x) + 8},${yViga + 14}`} fill="#2563eb" />
              <circle cx={xSvg(a.x) - 5} cy={yViga + 17} r={2.4} fill="#2563eb" />
              <circle cx={xSvg(a.x) + 5} cy={yViga + 17} r={2.4} fill="#2563eb" />
            </>
          )}
          {a.tipo === "articulado" && (
            <>
              <polygon points={`${xSvg(a.x)},${yViga} ${xSvg(a.x) - 8},${yViga + 14} ${xSvg(a.x) + 8},${yViga + 14}`} fill="#7c3aed" />
              <circle cx={xSvg(a.x)} cy={yViga} r={2.4} fill="white" stroke="#7c3aed" strokeWidth={1.2} />
            </>
          )}
          {a.tipo === "empotrado" && <rect x={xSvg(a.x) - 3} y={yViga - 15} width={6} height={30} fill="#1e3a8a" />}
          {a.tipo === "guia" && (
            <>
              <rect x={xSvg(a.x) - 3} y={yViga - 12} width={6} height={24} fill="#94a3b8" />
              <line x1={xSvg(a.x) - 9} y1={yViga + 15} x2={xSvg(a.x) + 9} y2={yViga + 15} stroke="#94a3b8" strokeWidth={1.5} />
            </>
          )}
          <text x={xSvg(a.x)} y={yViga + 28} fontSize={9} textAnchor="middle" fill="#64748b">{a.id}</text>
        </g>
      ))}
      {cargas.map((c, i) => {
        if (c.tipo === "puntual" && c.x !== undefined && c.P !== undefined)
          return (
            <g key={i}>
              <line x1={xSvg(c.x)} y1={yViga - 30} x2={xSvg(c.x)} y2={yViga - 3} stroke="#dc2626" strokeWidth={1.6} markerEnd="url(#flechaMini)" />
              <text x={xSvg(c.x)} y={yViga - 34} fontSize={9} textAnchor="middle" fill="#dc2626">{c.P < 0 ? `${Math.abs(c.P)}${unidadFuerza}↑` : `${c.P}${unidadFuerza}`}</text>
            </g>
          )
        if (c.tipo === "momento" && c.x !== undefined && c.M !== undefined)
          return (
            <g key={i}>
              <text x={xSvg(c.x)} y={yViga - 10} fontSize={20} textAnchor="middle" fill="#dc2626">{c.M >= 0 ? "↺" : "↻"}</text>
              <text x={xSvg(c.x)} y={yViga - 28} fontSize={9} textAnchor="middle" fill="#dc2626">{Math.abs(c.M)}{unidadMomento}</text>
            </g>
          )
        if (c.tipo === "distribuida" && c.xi !== undefined && c.xf !== undefined && c.wi !== undefined && c.wf !== undefined) {
          const maxW = Math.max(c.wi, c.wf, 1)
          const alturaMax = 26
          const hi = (c.wi / maxW) * alturaMax
          const hf = (c.wf / maxW) * alturaMax
          return (
            <g key={i}>
              <polygon
                points={`${xSvg(c.xi)},${yViga - 6 - hi} ${xSvg(c.xf)},${yViga - 6 - hf} ${xSvg(c.xf)},${yViga - 6} ${xSvg(c.xi)},${yViga - 6}`}
                fill="#fecaca" opacity={0.5} stroke="#dc2626" strokeWidth={1}
              />
              <text x={xSvg(c.xi)} y={yViga - 6 - hi - 4} fontSize={8} textAnchor="middle" fill="#dc2626">{c.wi}</text>
              <text x={xSvg(c.xf)} y={yViga - 6 - hf - 4} fontSize={8} textAnchor="middle" fill="#dc2626">{c.wf}</text>
            </g>
          )
        }
        return null
      })}
      <defs>
        <marker id="flechaMini" markerWidth={7} markerHeight={7} refX={3.5} refY={3.5} orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#dc2626" /></marker>
      </defs>
    </svg>
  )
}

function TablaTramos({ terminosM, puntosCriticos, unidadLongitud, unidadMomento, factorK, factorValor }: {
  terminosM: Termino[]; puntosCriticos: number[]; unidadLongitud: string; unidadMomento: string; factorK: number; factorValor: number
}) {
  const tramos = tramosDeTerminos(terminosM, puntosCriticos)
  return (
    <div className="space-y-2">
      {tramos.map((t, i) => {
        const polyDisplay = t.poly.map((p) => ({ power: p.power, coef: p.coef * Math.pow(factorK, p.power) * factorValor }))
        return (
          <div key={i} className="text-xs bg-white rounded p-2 border border-gray-100">
            <div className="text-gray-400 mb-1">
              {(t.inicio * factorK).toFixed(2)} {unidadLongitud} ≤ x ≤ {(t.fin * factorK).toFixed(2)} {unidadLongitud}
            </div>
            <Formula tex={`M(x) = ${polyALatex(polyDisplay)} \\;\\; [${unidadMomento}]`} block />
          </div>
        )
      })}
    </div>
  )
}

export default function MetodoFuerzas() {
  const [L, setL] = useState(6)
  const [E, setE] = useState(200000)
  const [I, setI] = useState(50000)
  const config = useUnidadesStore((s) => s.config)
  const aplicarPreset = useUnidadesStore((s) => s.aplicarPreset)
  const setConfig = useUnidadesStore((s) => s.setConfig)

  function aBaseLongitud(v: number) { return convertir(v, config.longitud, "m", "longitud") }
  function deBaseLongitud(v: number) { return convertir(v, "m", config.longitud, "longitud") }
  function aBaseFuerza(v: number) { return convertir(v, config.fuerza, "kN", "fuerza") }
  function deBaseFuerza(v: number) { return convertir(v, "kN", config.fuerza, "fuerza") }
  function aBaseMomento(v: number) { return convertir(v, config.momento, "kN·m", "momento") }
  function deBaseMomento(v: number) { return convertir(v, "kN·m", config.momento, "momento") }
  function aBaseEsfuerzo(v: number) { return convertir(v, config.esfuerzo, "MPa", "esfuerzo") }
  function aBaseDesplazamiento(v: number) { return convertir(v, config.desplazamiento, "m", "desplazamiento") }
  function deBaseDesplazamiento(v: number) { return convertir(v, "m", config.desplazamiento, "desplazamiento") }
  function aBaseInercia(v: number) {
    const u = config.inercia.replace("⁴", "")
    const f = factorLongitud[u] ?? 1
    const fCm = factorLongitud["cm"]
    return (v * Math.pow(f, 4)) / Math.pow(fCm, 4)
  }
  function aBaseCargaDistribuida(v: number) { return (v * aBaseFuerza(1)) / aBaseLongitud(1) }
  function aBaseResorteLineal(v: number) { return (v * aBaseFuerza(1)) / aBaseDesplazamiento(1) }
  function aBaseResorteRotacional(v: number) { return (v * aBaseMomento(1)) / 1 } // rad ya es base

  const EI = useMemo(() => aBaseEsfuerzo(E) * aBaseInercia(I) * 1e-5, [E, I, config])

  const [apoyos, setApoyos] = useState<Apoyo[]>([
    { id: "A", x: 0, tipo: "empotrado" },
    { id: "B", x: 3, tipo: "rodillo" },
    { id: "C", x: 6, tipo: "rodillo" },
  ])
  const [cargas, setCargas] = useState<Carga[]>([{ id: "C1", tipo: "puntual", x: 3, P: 10 } as any])
  const [rotulas, setRotulas] = useState<Rotula[]>([])
  const [resortes, setResortes] = useState<Resorte[]>([])
  const [redundantesSel, setRedundantesSel] = useState<RedundanteApoyo[]>([])

  const n = useMemo(() => gradoIndeterminacion(apoyos, rotulas, resortes), [apoyos, rotulas, resortes])
  const requeridas = Math.max(0, n - resortes.length)

  function toggleRedundante(apoyoId: string, componente: "Fy" | "M") {
    setRedundantesSel((prev) => {
      const existe = prev.some((r) => r.apoyoId === apoyoId && r.componente === componente)
      if (existe) return prev.filter((r) => !(r.apoyoId === apoyoId && r.componente === componente))
      return [...prev, { origen: "apoyo", apoyoId, componente }]
    })
  }
  function esRedundante(apoyoId: string, componente: "Fy" | "M") {
    return redundantesSel.some((r) => r.apoyoId === apoyoId && r.componente === componente)
  }

  function agregarApoyo() { setApoyos([...apoyos, { id: nuevoId("Ap"), x: 0, tipo: "rodillo" }]) }
  function actualizarApoyo(id: string, cambios: Partial<Apoyo>) { setApoyos(apoyos.map((a) => (a.id === id ? { ...a, ...cambios } : a))) }
  function borrarApoyo(id: string) {
    setApoyos(apoyos.filter((a) => a.id !== id))
    setRedundantesSel((prev) => prev.filter((r) => r.apoyoId !== id))
  }

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

  function agregarResorte(tipo: "vertical" | "rotacional") {
    setResortes([...resortes, { id: nuevoId("Re"), x: 0, tipo, k: tipo === "vertical" ? 1000 : 1000 }])
  }
  function actualizarResorte(id: string, cambios: Partial<Resorte>) { setResortes(resortes.map((r) => (r.id === id ? { ...r, ...cambios } : r))) }
  function borrarResorte(id: string) { setResortes(resortes.filter((r) => r.id !== id)) }

  const [resultado, setResultado] = useState<ResultadoFuerzas | null>(null)
  const [error, setError] = useState<string | null>(null)

  function calcular() {
    try {
      setError(null)
      const Lb = aBaseLongitud(L)
      const apoyosB: Apoyo[] = apoyos.map((a) => ({
        ...a,
        x: aBaseLongitud(a.x),
        asentamiento: a.asentamiento !== undefined ? aBaseDesplazamiento(a.asentamiento) : undefined,
      }))
      const cargasB: Carga[] = cargas.map((c) => {
        if (c.tipo === "puntual") return { ...c, x: aBaseLongitud(c.x), P: aBaseFuerza(c.P) }
        if (c.tipo === "momento") return { ...c, x: aBaseLongitud(c.x), M: aBaseMomento(c.M) }
        return { ...c, xi: aBaseLongitud(c.xi), xf: aBaseLongitud(c.xf), wi: aBaseCargaDistribuida(c.wi), wf: aBaseCargaDistribuida(c.wf) }
      })
      const rotulasB: Rotula[] = rotulas.map((r) => ({ ...r, x: aBaseLongitud(r.x) }))
      const resortesB: Resorte[] = resortes.map((r) => ({
        ...r,
        x: aBaseLongitud(r.x),
        k: r.tipo === "vertical" ? aBaseResorteLineal(r.k) : aBaseResorteRotacional(r.k),
      }))
      const res = resolverPorFuerzas(Lb, apoyosB, cargasB, rotulasB, resortesB, redundantesSel, EI)
      setResultado(res)
    } catch (e: any) {
      setError(e.message || "Error al resolver por el método de fuerzas")
      setResultado(null)
    }
  }

  const anchoSvg = 700
  const margen = 40
  const escala = (anchoSvg - 2 * margen) / L
  const yViga = 90
  function xSvg(xv: number) { return margen + xv * escala }

  const constantesFinal = useMemo(() => {
    if (!resultado) return null
    const apoyosB = apoyos.map((a) => ({ ...a, x: aBaseLongitud(a.x), asentamiento: a.asentamiento !== undefined ? aBaseDesplazamiento(a.asentamiento) : undefined }))
    const rotulasB = rotulas.map((r) => ({ ...r, x: aBaseLongitud(r.x) }))
    return calcularConstantesIntegracion(resultado.L, apoyosB, rotulasB, resultado.terminosM, EI)
  }, [resultado, EI, config])

  const puntos = useMemo(() => {
    if (!resultado || !constantesFinal) return null
    const nMalla = 140
    const arr: { x: number; M: number; V: number; v: number; theta: number }[] = []
    const criticosDisplay = resultado.puntosCriticos.map((xc) => deBaseLongitud(xc))
    const mallaDisplay: number[] = []
    for (let i = 0; i <= nMalla; i++) mallaDisplay.push((L * i) / nMalla)
    const interiores = criticosDisplay.filter((xc) => xc > 1e-9 && xc < L - 1e-9)
    const criticosSet = new Set(interiores.map((xc) => Number(xc.toFixed(9))))
    interiores.forEach((xc) => mallaDisplay.push(xc))
    const xsOrdenados = Array.from(new Set(mallaDisplay.map((xv) => Number(xv.toFixed(9))))).sort((a, b) => a - b)
    xsOrdenados.forEach((xvDisplay) => {
      const xvBase = aBaseLongitud(xvDisplay)
      const esFinal = Math.abs(xvDisplay - L) < 1e-9
      const incluirBorde = !(criticosSet.has(xvDisplay) || esFinal) ? true : false
      if (criticosSet.has(xvDisplay)) {
        arr.push({ x: xvDisplay, M: deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, false)), V: deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, false)), v: deBaseDesplazamiento(constantesFinal.v(xvBase)), theta: constantesFinal.theta(xvBase) })
        arr.push({ x: xvDisplay, M: deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, true)), V: deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, true)), v: deBaseDesplazamiento(constantesFinal.v(xvBase)), theta: constantesFinal.theta(xvBase) })
      } else if (esFinal) {
        arr.push({ x: xvDisplay, M: deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, false)), V: deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, false)), v: deBaseDesplazamiento(constantesFinal.v(xvBase)), theta: constantesFinal.theta(xvBase) })
      } else {
        arr.push({ x: xvDisplay, M: deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, true)), V: deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, true)), v: deBaseDesplazamiento(constantesFinal.v(xvBase)), theta: constantesFinal.theta(xvBase) })
      }
    })
    return arr
  }, [resultado, constantesFinal, L, config])

  const factorK = aBaseLongitud(1)
  const factorM = deBaseMomento(1)

  function apoyosPrimariaDisplay() {
    if (!resultado) return []
    return apoyos.map((a) => {
      const tieneFyOriginal = a.tipo === "rodillo" || a.tipo === "articulado" || a.tipo === "empotrado"
      const tieneMOriginal = a.tipo === "empotrado" || a.tipo === "guia"
      const tieneFy = tieneFyOriginal && !esRedundante(a.id, "Fy")
      const tieneM = tieneMOriginal && !esRedundante(a.id, "M")
      return { id: a.id, x: a.x, tipo: tipoRebajado(a.tipo, tieneFy, tieneM) }
    })
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos / Vigas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Método de fuerzas (flexibilidad)</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">DATOS GENERALES</div>
              <div className="flex gap-1.5">
                {(["SI", "metrico", "americano"] as Exclude<SistemaUnidades, "personalizado">[]).map((s) => (
                  <button key={s} onClick={() => aplicarPreset(s)} className={`text-xs px-2.5 py-1 rounded-lg border ${config.sistema === s ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-300"}`}>
                    {s === "SI" ? "SI" : s === "metrico" ? "Métrico" : "Americano"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500">Longitud de la viga ({config.longitud})</label>
                <input type="number" value={L} onChange={(e) => setL(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">E ({config.esfuerzo})</label>
                <input type="number" value={E} onChange={(e) => setE(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">I ({config.inercia})</label>
                <input type="number" value={I} onChange={(e) => setI(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">EI = {EI.toFixed(2)} kN·m² (base interna)</div>
          </div>

          <div className={`rounded-xl p-4 text-sm font-medium border ${requeridas === redundantesSel.length ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
            Grado de indeterminación: {n} &nbsp;({resortes.length} resorte(s), automáticamente redundantes + {requeridas} a elegir tú) — llevas marcadas {redundantesSel.length}.
            {n < 0 && <div className="text-xs mt-1">La viga es un mecanismo (n negativo) — agrega apoyos.</div>}
            {n === 0 && <div className="text-xs mt-1">La viga ya es determinada — el método de fuerzas no aplica (no hay redundantes que elegir). Usa el módulo de Doble Integración.</div>}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">APOYOS — marca cuáles reacciones son redundantes</div>
              <button onClick={agregarApoyo} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Agregar apoyo</button>
            </div>
            <div className="space-y-2">
              {apoyos.map((a) => {
                const tieneFy = a.tipo === "rodillo" || a.tipo === "articulado" || a.tipo === "empotrado"
                const tieneM = a.tipo === "empotrado" || a.tipo === "guia"
                return (
                  <div key={a.id} className="grid grid-cols-8 gap-2 items-center bg-gray-50 rounded-lg p-2">
                    <span className="text-xs text-gray-500">{a.id}</span>
                    <input type="number" value={a.x} onChange={(e) => actualizarApoyo(a.id, { x: Number(e.target.value) })} placeholder={`x (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    <select value={a.tipo} onChange={(e) => actualizarApoyo(a.id, { tipo: e.target.value as TipoApoyo })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm col-span-2">
                      {Object.entries(nombresApoyo).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input type="number" value={a.asentamiento ?? 0} onChange={(e) => actualizarApoyo(a.id, { asentamiento: Number(e.target.value) })} placeholder={`asent. (${config.desplazamiento})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    <input type="number" value={a.giroImpuesto ?? 0} onChange={(e) => actualizarApoyo(a.id, { giroImpuesto: Number(e.target.value) })} placeholder="giro (rad)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    <div className="flex gap-2 text-xs">
                      {tieneFy && (
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={esRedundante(a.id, "Fy")} onChange={() => toggleRedundante(a.id, "Fy")} /> Fy
                        </label>
                      )}
                      {tieneM && (
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={esRedundante(a.id, "M")} onChange={() => toggleRedundante(a.id, "M")} /> M
                        </label>
                      )}
                    </div>
                    <button onClick={() => borrarApoyo(a.id)} className="text-red-500 text-xs hover:underline">Borrar</button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">RESORTES (siempre redundantes)</div>
              <div className="flex gap-2">
                <button onClick={() => agregarResorte("vertical")} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Vertical</button>
                <button onClick={() => agregarResorte("rotacional")} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Rotacional</button>
              </div>
            </div>
            <div className="space-y-2">
              {resortes.map((r) => (
                <div key={r.id} className="grid grid-cols-5 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <span className="text-xs text-gray-500">{r.id} ({r.tipo})</span>
                  <input type="number" value={r.x} onChange={(e) => actualizarResorte(r.id, { x: Number(e.target.value) })} placeholder={`x (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                  <input
                    type="number"
                    value={r.k}
                    onChange={(e) => actualizarResorte(r.id, { k: Number(e.target.value) })}
                    placeholder={r.tipo === "vertical" ? `k (${config.fuerza}/${config.desplazamiento})` : `k (${config.momento}/rad)`}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm col-span-2"
                  />
                  <button onClick={() => borrarResorte(r.id)} className="text-red-500 text-xs hover:underline">Borrar</button>
                </div>
              ))}
              {resortes.length === 0 && <div className="text-xs text-gray-400">Sin resortes.</div>}
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
                  <input type="number" value={r.x} onChange={(e) => actualizarRotula(r.id, Number(e.target.value))} placeholder={`x (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                  <button onClick={() => borrarRotula(r.id)} className="text-red-500 text-xs hover:underline">Borrar</button>
                </div>
              ))}
              {rotulas.length === 0 && <div className="text-xs text-gray-400">Sin rótulas.</div>}
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
                      <input type="number" value={c.x} onChange={(e) => actualizarCarga(c.id, { x: Number(e.target.value) })} placeholder={`x (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      <input type="number" value={c.P} onChange={(e) => actualizarCarga(c.id, { P: Number(e.target.value) })} placeholder={`P (${config.fuerza}, ↓+)`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-28" />
                    </>
                  )}
                  {c.tipo === "momento" && (
                    <>
                      <input type="number" value={c.x} onChange={(e) => actualizarCarga(c.id, { x: Number(e.target.value) })} placeholder={`x (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      <input type="number" value={c.M} onChange={(e) => actualizarCarga(c.id, { M: Number(e.target.value) })} placeholder={`M (${config.momento}, ↺+)`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-28" />
                    </>
                  )}
                  {c.tipo === "distribuida" && (
                    <>
                      <input type="number" value={c.xi} onChange={(e) => actualizarCarga(c.id, { xi: Number(e.target.value) })} placeholder={`xi (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20" />
                      <input type="number" value={c.xf} onChange={(e) => actualizarCarga(c.id, { xf: Number(e.target.value) })} placeholder={`xf (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20" />
                      <input type="number" value={c.wi} onChange={(e) => actualizarCarga(c.id, { wi: Number(e.target.value) })} placeholder={`wi (${config.fuerza}/${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      <input type="number" value={c.wf} onChange={(e) => actualizarCarga(c.id, { wf: Number(e.target.value) })} placeholder={`wf (${config.fuerza}/${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                    </>
                  )}
                  <button onClick={() => borrarCarga(c.id)} className="text-red-500 text-xs hover:underline ml-auto">Borrar</button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={calcular} className="bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-blue-800">Calcular por método de fuerzas</button>
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

          {resultado && (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESTADO 0 — VIGA PRIMARIA CON LAS CARGAS REALES (M₀)</div>
                <EsquemaEstado
                  L={L}
                  apoyosPrimaria={apoyosPrimariaDisplay()}
                  cargas={cargas as any}
                  unidadLongitud={config.longitud}
                  unidadFuerza={config.fuerza}
                  unidadMomento={config.momento}
                />
                <div className="mt-3">
                  <TablaTramos terminosM={resultado.estado0.terminosM} puntosCriticos={resultado.estado0.puntosCriticos} unidadLongitud={config.longitud} unidadMomento={config.momento} factorK={factorK} factorValor={factorM} />
                </div>
              </div>

              {resultado.estadosUnitarios.map((estado, i) => {
                const red = resultado.redundantes[i]
                let nombreRed = ""
                let xRed = 0
                let cargaUnit: any
                if (red.origen === "apoyo") {
                  const ap = apoyos.find((a) => a.id === red.apoyoId)!
                  nombreRed = `X${i + 1} = ${red.componente} en apoyo ${red.apoyoId}`
                  xRed = ap.x
                  cargaUnit = red.componente === "Fy" ? { tipo: "puntual", x: ap.x, P: -1 } : { tipo: "momento", x: ap.x, M: 1 }
                } else {
                  const res = resortes.find((r) => r.id === red.resorteId)!
                  nombreRed = `X${i + 1} = reacción del resorte ${red.resorteId}`
                  xRed = res.x
                  cargaUnit = res.tipo === "vertical" ? { tipo: "puntual", x: res.x, P: -1 } : { tipo: "momento", x: res.x, M: 1 }
                }
                return (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESTADO {i + 1} — VIGA PRIMARIA CON CARGA UNITARIA EN {nombreRed} (m{i + 1})</div>
                    <EsquemaEstado
                      L={L}
                      apoyosPrimaria={apoyosPrimariaDisplay()}
                      cargas={[cargaUnit]}
                      unidadLongitud={config.longitud}
                      unidadFuerza={config.fuerza}
                      unidadMomento={config.momento}
                    />
                    <div className="mt-3">
                      <TablaTramos terminosM={estado.terminosM} puntosCriticos={estado.puntosCriticos} unidadLongitud={config.longitud} unidadMomento="(unitario)" factorK={factorK} factorValor={1} />
                    </div>
                  </div>
                )
              })}

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MATRIZ DE FLEXIBILIDAD Y SOLUCIÓN</div>
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2"></th>
                        {resultado.redundantes.map((_, j) => <th key={j} className="p-2 text-gray-500">X{j + 1}</th>)}
                        <th className="p-2 text-gray-500">δᵢL</th>
                        <th className="p-2 text-gray-500">Δᵢ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.matrizFlexibilidad.map((fila, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="p-2 font-medium text-gray-600">δ{i + 1}ⱼ</td>
                          {fila.map((v, j) => <td key={j} className="p-2 text-center">{v.toExponential(3)}</td>)}
                          <td className="p-2 text-center">{resultado.vectorCarga[i].toExponential(3)}</td>
                          <td className="p-2 text-center">{resultado.vectorImpuesto[i].toExponential(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {resultado.X.map((x, i) => {
                    const red = resultado.redundantes[i]
                    const esFy = red.origen === "apoyo" ? red.componente === "Fy" : (resortes.find((r) => r.id === (red as any).resorteId)?.tipo === "vertical")
                    return (
                      <div key={i} className="p-3 rounded-lg bg-purple-50 border-l-4 border-purple-500">
                        <div className="text-xs text-purple-500">X{i + 1}</div>
                        <div className="text-sm font-bold text-purple-800">{esFy ? deBaseFuerza(x).toFixed(3) + " " + config.fuerza : deBaseMomento(x).toFixed(3) + " " + config.momento}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">REACCIONES FINALES (SUPERPUESTAS)</div>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(resultado.reacciones).map(([id, r]) => (
                    <div key={id} className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-600">
                      <div className="text-xs text-blue-500">{id}</div>
                      {r.Fy !== undefined && <div className="text-sm font-bold text-blue-800">Fy = {Math.abs(deBaseFuerza(r.Fy)).toFixed(3)} {config.fuerza} {r.Fy >= 0 ? "↑" : "↓"}</div>}
                      {r.M !== undefined && <div className="text-sm font-bold text-blue-800">M = {Math.abs(deBaseMomento(r.M)).toFixed(3)} {config.momento} {r.M >= 0 ? "↺" : "↻"}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {puntos && (
                <>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DIAGRAMA DE MOMENTO FLECTOR (SUPERPUESTO)</div>
                    <div className="text-xs text-gray-400 mb-2">Máximo: {Math.max(...puntos.map((p) => p.M)).toFixed(3)} {config.momento} — Mínimo: {Math.min(...puntos.map((p) => p.M)).toFixed(3)} {config.momento}</div>
                    <GraficoInteractivo datos={puntos.map((p) => ({ x: p.x, y: p.M }))} L={L} color="#2563eb" etiqueta="M(x)" unidad={config.momento} unidadLongitud={config.longitud} />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DIAGRAMA DE FUERZA CORTANTE</div>
                    <div className="text-xs text-gray-400 mb-2">Máximo: {Math.max(...puntos.map((p) => p.V)).toFixed(3)} {config.fuerza} — Mínimo: {Math.min(...puntos.map((p) => p.V)).toFixed(3)} {config.fuerza}</div>
                    <GraficoInteractivo datos={puntos.map((p) => ({ x: p.x, y: p.V }))} L={L} color="#f97316" etiqueta="V(x)" unidad={config.fuerza} unidadLongitud={config.longitud} />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DIAGRAMA DE GIRO</div>
                    <div className="text-xs text-gray-400 mb-2">Máximo: {Math.max(...puntos.map((p) => p.theta)).toFixed(6)} rad — Mínimo: {Math.min(...puntos.map((p) => p.theta)).toFixed(6)} rad</div>
                    <GraficoInteractivo datos={puntos.map((p) => ({ x: p.x, y: p.theta }))} L={L} color="#a855f7" etiqueta="θ(x)" unidad="rad" unidadLongitud={config.longitud} />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DEFLEXIÓN</div>
                    <div className="text-xs text-gray-400 mb-2">Máxima: {Math.max(...puntos.map((p) => p.v)).toFixed(5)} {config.desplazamiento} — Mínima: {Math.min(...puntos.map((p) => p.v)).toFixed(5)} {config.desplazamiento}</div>
                    <GraficoInteractivo datos={puntos.map((p) => ({ x: p.x, y: p.v }))} L={L} color="#64748b" etiqueta="v(x)" unidad={config.desplazamiento} unidadLongitud={config.longitud} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}