"use client"
import { useState, useMemo, useRef, useEffect } from "react"
import katex from "katex"
// @ts-ignore: CSS import without type declarations
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
  integrarProducto,
} from "../../lib/vigas/motorFuerzas"
import { resolverViga, evalTerminos } from "../../lib/vigas/motor"
import { useUnidadesStore, SistemaUnidades } from "../../store/useUnidadesStore"
import { useSeccionStore } from "../../store/useSeccionStore"
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

// Redondea a 6 decimales para eliminar ruido de punto flotante (valores
// que deberian ser exactamente cero, o iguales entre si, pero terminan
// siendo 1e-13/1e-14 por acumulacion de error numerico en la integracion
// y la eliminacion gaussiana).
function limpiar(v: number): number {
  const r = Math.round(v * 1e6) / 1e6
  return Object.is(r, -0) ? 0 : r
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
        if (c.tipo === "puntual" && c.x !== undefined && c.P !== undefined) {
          const haciaArriba = c.P < 0 // P negativo = carga unitaria hacia arriba (sentido asumido de la reaccion liberada)
          return (
            <g key={i}>
              <line
                x1={xSvg(c.x)}
                y1={haciaArriba ? yViga - 3 : yViga - 30}
                x2={xSvg(c.x)}
                y2={haciaArriba ? yViga - 30 : yViga - 3}
                stroke="#dc2626" strokeWidth={1.6} markerEnd="url(#flechaMini)"
              />
              <text x={xSvg(c.x)} y={yViga - 34} fontSize={9} textAnchor="middle" fill="#dc2626">{haciaArriba ? `${Math.abs(c.P)}${unidadFuerza}↑` : `${c.P}${unidadFuerza}`}</text>
            </g>
          )
        }
        if (c.tipo === "momento" && c.x !== undefined && c.M !== undefined)
          return (
            <g key={i}>
              <text x={xSvg(c.x)} y={yViga - 10} fontSize={20} textAnchor="middle" fill="#dc2626">{c.M >= 0 ? "↺" : "↻"}</text>
              <text x={xSvg(c.x)} y={yViga - 28} fontSize={9} textAnchor="middle" fill="#dc2626">{Math.abs(c.M)}{unidadMomento}</text>
            </g>
          )
        if (c.tipo === "distribuida" && c.xi !== undefined && c.xf !== undefined && c.wi !== undefined && c.wf !== undefined) {
          const xSvgCxi = xSvg(c.xi)
          const xSvgCxf = xSvg(c.xf)
          if (xSvgCxi === undefined || xSvgCxf === undefined) return null
          const maxW = Math.max(c.wi, c.wf, 1)
          const alturaMax = 26
          const hi = (c.wi / maxW) * alturaMax
          const hf = (c.wf / maxW) * alturaMax
          const yTopoIzq = yViga - 6 - hi
          const yTopoDer = yViga - 6 - hf
          const numFlechas = Math.max(3, Math.round((xSvgCxf - xSvgCxi) / 28))
          return (
            <g key={i}>
              <polygon
                points={`${xSvgCxi},${yTopoIzq} ${xSvgCxf},${yTopoDer} ${xSvgCxf},${yViga - 6} ${xSvgCxi},${yViga - 6}`}
                fill="#fecaca" opacity={0.5} stroke="#dc2626" strokeWidth={1}
              />
              {Array.from({ length: numFlechas + 1 }).map((_, j) => {
                const t = j / numFlechas
                const xf2 = xSvgCxi + t * (xSvgCxf - xSvgCxi)
                const yTopo = yTopoIzq + t * (yTopoDer - yTopoIzq)
                return <line key={j} x1={xf2} y1={yTopo} x2={xf2} y2={yViga - 6} stroke="#dc2626" strokeWidth={0.8} markerEnd="url(#flechaMini)" />
              })}
              <text x={xSvgCxi} y={yTopoIzq - 4} fontSize={8} textAnchor="middle" fill="#dc2626">{c.wi}</text>
              <text x={xSvgCxf} y={yTopoDer - 4} fontSize={8} textAnchor="middle" fill="#dc2626">{c.wf}</text>
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

function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-[9px] text-gray-400 block mb-0.5 whitespace-nowrap">{label}</label>
      {children}
    </div>
  )
}

export default function TrabajoVirtual() {
  const [L, setL] = useState(6)
  const [E, setE] = useState(200000)
  const [I, setI] = useState(50000)
  const config = useUnidadesStore((s) => s.config)
  const aplicarPreset = useUnidadesStore((s) => s.aplicarPreset)
  const setConfig = useUnidadesStore((s) => s.setConfig)
  const seccionImportada = useSeccionStore((s) => s.seccion)
  const limpiarSeccion = useSeccionStore((s) => s.limpiarSeccion)
  const [mensajeImportacion, setMensajeImportacion] = useState<string | null>(null)
  const [alertaLongitud, setAlertaLongitud] = useState<string | null>(null)
  const [sigmaAdmisible, setSigmaAdmisible] = useState(0)
  const [tauAdmisible, setTauAdmisible] = useState(0)
  const [moduloSeccion, setModuloSeccion] = useState(0)
  const [areaSeccion, setAreaSeccion] = useState(0)
  const [deflexionDenominador, setDeflexionDenominador] = useState(360)

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

  // Factores propios para las unidades de rigidez de resortes (no vienen en
  // la tabla "convertir" general porque son unidades compuestas propias).
  // Base interna: N/m para resorte lineal, N·m/rad para resorte rotacional.
  const factorResorteLineal: Record<string, number> = {
    "N/m": 1, "kN/m": 1000, "kgf/cm": 980.665, "tf/m": 9806.65, "kip/in": 175126.835,
  }
  const factorResorteRotacional: Record<string, number> = {
    "N·m/rad": 1, "kN·m/rad": 1000, "kgf·m/rad": 9.80665, "tf·m/rad": 9806.65,
  }
  function aBaseResorteLineal(v: number) {
    const factor = factorResorteLineal[config.resorte_lineal] ?? 1000
    return (v * factor) / 1000 // -> kN/m (base interna del motor)
  }
  function deBaseResorteLineal(v: number) {
    const factor = factorResorteLineal[config.resorte_lineal] ?? 1000
    return (v * 1000) / factor // kN/m -> unidad elegida
  }
  function aBaseResorteRotacional(v: number) {
    const factor = factorResorteRotacional[config.resorte_rotacional] ?? 1000
    return (v * factor) / 1000 // -> kN·m/rad (base interna del motor)
  }
  function deBaseResorteRotacional(v: number) {
    const factor = factorResorteRotacional[config.resorte_rotacional] ?? 1000
    return (v * 1000) / factor // kN·m/rad -> unidad elegida
  }
  function deBaseEsfuerzo(v: number) { return convertir(v, "MPa", config.esfuerzo, "esfuerzo") }
  function aBaseModulo(v: number) {
    const u = config.modulo_resistente.replace("³", "")
    const f = factorLongitud[u] ?? 1
    const fCm = factorLongitud["cm"]
    return (v * Math.pow(f, 3)) / Math.pow(fCm, 3)
  }
  function aBaseArea(v: number) {
    const f = factorLongitud[config.seccion] ?? 1
    const fCm = factorLongitud["cm"]
    return (v * Math.pow(f, 2)) / Math.pow(fCm, 2)
  }

  const EI = useMemo(() => aBaseEsfuerzo(E) * aBaseInercia(I) * 1e-5, [E, I, config])

  useEffect(() => {
    if (seccionImportada) {
      setI(seccionImportada.Icx)
      setAreaSeccion(seccionImportada.A)
      setModuloSeccion(seccionImportada.Sx_bot)
      setMensajeImportacion(
        `Sección importada desde Section Builder: "${seccionImportada.nombre}" — I = ${seccionImportada.Icx.toFixed(2)} ${config.inercia}, A = ${seccionImportada.A.toFixed(2)} ${config.seccion}², S = ${seccionImportada.Sx_bot.toFixed(2)} ${config.modulo_resistente}. E no se modificó — ajústalo manualmente si corresponde.`
      )
      limpiarSeccion()
    }
  }, [seccionImportada])

  function validarX(v: number, etiqueta: string): number {
    if (v > L) {
      setAlertaLongitud(`${etiqueta} no puede ser mayor que la longitud de la viga (${L} ${config.longitud}). Se ajustó a ${L}.`)
      setTimeout(() => setAlertaLongitud(null), 4000)
      return L
    }
    if (v < 0) {
      setAlertaLongitud(`${etiqueta} no puede ser negativo. Se ajustó a 0.`)
      setTimeout(() => setAlertaLongitud(null), 4000)
      return 0
    }
    return v
  }

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

  const prevConfigRef = useRef(config)
  useEffect(() => {
    const prev = prevConfigRef.current
    const cambio =
      prev.longitud !== config.longitud ||
      prev.fuerza !== config.fuerza ||
      prev.momento !== config.momento ||
      prev.esfuerzo !== config.esfuerzo ||
      prev.desplazamiento !== config.desplazamiento ||
      prev.inercia !== config.inercia ||
      prev.resorte_lineal !== config.resorte_lineal ||
      prev.resorte_rotacional !== config.resorte_rotacional
    if (cambio) {
      setL((v) => convertir(v, prev.longitud, config.longitud, "longitud"))
      setE((v) => convertir(v, prev.esfuerzo, config.esfuerzo, "esfuerzo"))
      setI((v) => {
        const uPrev = prev.inercia.replace("⁴", "")
        const uNew = config.inercia.replace("⁴", "")
        const fPrev = factorLongitud[uPrev] ?? 1
        const fNew = factorLongitud[uNew] ?? 1
        return v * Math.pow(fPrev / fNew, 4)
      })
      setApoyos((arr) =>
        arr.map((a) => ({
          ...a,
          x: convertir(a.x, prev.longitud, config.longitud, "longitud"),
          asentamiento: a.asentamiento !== undefined ? convertir(a.asentamiento, prev.desplazamiento, config.desplazamiento, "desplazamiento") : undefined,
        }))
      )
      setCargas((arr) =>
        arr.map((c) => {
          if (c.tipo === "puntual") return { ...c, x: convertir(c.x, prev.longitud, config.longitud, "longitud"), P: convertir(c.P, prev.fuerza, config.fuerza, "fuerza") }
          if (c.tipo === "momento") return { ...c, x: convertir(c.x, prev.longitud, config.longitud, "longitud"), M: convertir(c.M, prev.momento, config.momento, "momento") }
          const kLong = convertir(1, prev.longitud, config.longitud, "longitud")
          const kFuerza = convertir(1, prev.fuerza, config.fuerza, "fuerza")
          return {
            ...c,
            xi: convertir(c.xi, prev.longitud, config.longitud, "longitud"),
            xf: convertir(c.xf, prev.longitud, config.longitud, "longitud"),
            wi: (c.wi * kFuerza) / kLong,
            wf: (c.wf * kFuerza) / kLong,
          }
        })
      )
      setRotulas((arr) => arr.map((r) => ({ ...r, x: convertir(r.x, prev.longitud, config.longitud, "longitud") })))
      setResortes((arr) =>
        arr.map((r) => {
          const xNueva = convertir(r.x, prev.longitud, config.longitud, "longitud")
          if (r.tipo === "vertical") {
            const fPrev = factorResorteLineal[prev.resorte_lineal] ?? 1000
            const fNew = factorResorteLineal[config.resorte_lineal] ?? 1000
            return { ...r, x: xNueva, k: (r.k * fPrev) / fNew }
          }
          const fPrev = factorResorteRotacional[prev.resorte_rotacional] ?? 1000
          const fNew = factorResorteRotacional[config.resorte_rotacional] ?? 1000
          return { ...r, x: xNueva, k: (r.k * fPrev) / fNew }
        })
      )
      setModuloSeccion((v) => {
        const uPrev = prev.modulo_resistente.replace("³", "")
        const uNew = config.modulo_resistente.replace("³", "")
        const fPrev = factorLongitud[uPrev] ?? 1
        const fNew = factorLongitud[uNew] ?? 1
        return v * Math.pow(fPrev / fNew, 3)
      })
      setAreaSeccion((v) => {
        const fPrev = factorLongitud[prev.seccion] ?? 1
        const fNew = factorLongitud[config.seccion] ?? 1
        return v * Math.pow(fPrev / fNew, 2)
      })
      setSigmaAdmisible((v) => convertir(v, prev.esfuerzo, config.esfuerzo, "esfuerzo"))
      setTauAdmisible((v) => convertir(v, prev.esfuerzo, config.esfuerzo, "esfuerzo"))
    }
    prevConfigRef.current = config
  }, [config])

  const [modo, setModo] = useState<"reacciones" | "deformacion">("reacciones")
  const [xPunto, setXPunto] = useState(3)
  const [tipoDeformacion, setTipoDeformacion] = useState<"deflexion" | "giro">("deflexion")

  const [resultado, setResultado] = useState<ResultadoFuerzas | null>(null)
  const [error, setError] = useState<string | null>(null)

  interface ResultadoDeformacion {
    terminosMReal: Termino[]
    puntosCriticosReal: number[]
    terminosMVirtual: Termino[]
    puntosCriticosVirtual: number[]
    delta: number // unidades base (m si deflexion, rad si giro)
    xPuntoBase: number
    apoyosPrimariaBase: { id: string; x: number; tipo: TipoApoyo }[]
  }
  const [resultadoDef, setResultadoDef] = useState<ResultadoDeformacion | null>(null)

  function construirBase() {
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
    return { Lb, apoyosB, cargasB, rotulasB, resortesB }
  }

  function calcular() {
    try {
      setError(null)
      setResultadoDef(null)
      const { Lb, apoyosB, cargasB, rotulasB, resortesB } = construirBase()
      const res = resolverPorFuerzas(Lb, apoyosB, cargasB, rotulasB, resortesB, redundantesSel, EI)
      setResultado(res)
    } catch (e: any) {
      setError(e.message || "Error al resolver por trabajo virtual")
      setResultado(null)
    }
  }

  function calcularDeformacion() {
    try {
      setError(null)
      setResultado(null)
      const { Lb, apoyosB, cargasB, rotulasB, resortesB } = construirBase()
      const xPuntoBase = aBaseLongitud(xPunto)

      let terminosMReal: Termino[]
      let puntosCriticosReal: number[]
      let apoyosPrimariaBase: { id: string; x: number; tipo: TipoApoyo }[]

      if (n === 0) {
        // Viga determinada: el estado real se resuelve directo, sin redundantes.
        const real = resolverViga(Lb, apoyosB, cargasB, rotulasB)
        terminosMReal = real.terminosM
        puntosCriticosReal = real.puntosCriticos
        apoyosPrimariaBase = apoyosB.map((a) => ({ id: a.id, x: a.x, tipo: a.tipo }))
      } else {
        // Viga indeterminada: se resuelve igual que en modo "reacciones" (mismas
        // redundantes elegidas) para obtener el M(x) real ya superpuesto, y la
        // MISMA primaria se reutiliza para el estado virtual (teorema valido:
        // el trabajo virtual de las redundantes contra desplazamientos
        // compatibles es cero, asi que cualquier primaria estable sirve).
        const res = resolverPorFuerzas(Lb, apoyosB, cargasB, rotulasB, resortesB, redundantesSel, EI)
        terminosMReal = res.terminosM
        puntosCriticosReal = res.puntosCriticos
        apoyosPrimariaBase = apoyosB.map((a) => {
          const tieneFyOriginal = a.tipo === "rodillo" || a.tipo === "articulado" || a.tipo === "empotrado"
          const tieneMOriginal = a.tipo === "empotrado" || a.tipo === "guia"
          const tieneFy = tieneFyOriginal && !esRedundante(a.id, "Fy")
          const tieneM = tieneMOriginal && !esRedundante(a.id, "M")
          return { id: a.id, x: a.x, tipo: tipoRebajado(a.tipo, tieneFy, tieneM) }
        })
      }

      // Estado virtual: carga unitaria en el punto de interes, sobre la primaria.
      const cargaVirtual: Carga =
        tipoDeformacion === "deflexion"
          ? { id: "virtual", tipo: "puntual", x: xPuntoBase, P: -1 }
          : { id: "virtual", tipo: "momento", x: xPuntoBase, M: 1 }
      const apoyosPrimariaCompletos: Apoyo[] = apoyosPrimariaBase.map((a) => ({ id: a.id, x: a.x, tipo: a.tipo }))
      const virtual = resolverViga(Lb, apoyosPrimariaCompletos, [cargaVirtual], rotulasB)

      const mReal = (x: number) => evalTerminos(terminosMReal, x)
      const mVirtual = (x: number) => evalTerminos(virtual.terminosM, x)
      const delta = integrarProducto(mReal, mVirtual, Lb) / EI

      setResultadoDef({
        terminosMReal,
        puntosCriticosReal,
        terminosMVirtual: virtual.terminosM,
        puntosCriticosVirtual: virtual.puntosCriticos,
        delta,
        xPuntoBase,
        apoyosPrimariaBase,
      })
    } catch (e: any) {
      setError(e.message || "Error al resolver la deformación por trabajo virtual")
      setResultadoDef(null)
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
        arr.push({ x: xvDisplay, M: limpiar(deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, false))), V: limpiar(deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, false))), v: limpiar(deBaseDesplazamiento(constantesFinal.v(xvBase))), theta: limpiar(constantesFinal.theta(xvBase)) })
        arr.push({ x: xvDisplay, M: limpiar(deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, true))), V: limpiar(deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, true))), v: limpiar(deBaseDesplazamiento(constantesFinal.v(xvBase))), theta: limpiar(constantesFinal.theta(xvBase)) })
      } else if (esFinal) {
        arr.push({ x: xvDisplay, M: limpiar(deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, false))), V: limpiar(deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, false))), v: limpiar(deBaseDesplazamiento(constantesFinal.v(xvBase))), theta: limpiar(constantesFinal.theta(xvBase)) })
      } else {
        arr.push({ x: xvDisplay, M: limpiar(deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, true))), V: limpiar(deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, true))), v: limpiar(deBaseDesplazamiento(constantesFinal.v(xvBase))), theta: limpiar(constantesFinal.theta(xvBase)) })
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
          <span className="text-gray-800 font-medium text-base ml-1">Trabajo virtual</span>
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

            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-400 mb-2">Personalizar unidades de este sistema:</div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400">Longitud</label>
                  <select value={config.longitud} onChange={(e) => setConfig({ ...config, sistema: "personalizado", longitud: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-1.5 py-1 text-xs">
                    {["mm", "cm", "m", "in", "ft"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">Fuerza</label>
                  <select value={config.fuerza} onChange={(e) => setConfig({ ...config, sistema: "personalizado", fuerza: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-1.5 py-1 text-xs">
                    {["N", "kN", "kgf", "tf", "lbf", "kip"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">Momento</label>
                  <select value={config.momento} onChange={(e) => setConfig({ ...config, sistema: "personalizado", momento: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-1.5 py-1 text-xs">
                    {["N·m", "kN·m", "kgf·m", "tf·m", "lbf·ft", "kip·ft"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">Esfuerzo</label>
                  <select value={config.esfuerzo} onChange={(e) => setConfig({ ...config, sistema: "personalizado", esfuerzo: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-1.5 py-1 text-xs">
                    {["Pa", "kPa", "MPa", "kgf/cm²", "tf/m²", "psi", "ksi"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">Inercia</label>
                  <select value={config.inercia} onChange={(e) => setConfig({ ...config, sistema: "personalizado", inercia: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-1.5 py-1 text-xs">
                    {["mm⁴", "cm⁴", "m⁴", "in⁴"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">Desplazamiento</label>
                  <select value={config.desplazamiento} onChange={(e) => setConfig({ ...config, sistema: "personalizado", desplazamiento: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-1.5 py-1 text-xs">
                    {["mm", "cm", "m", "in"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">Rigidez resorte lineal</label>
                  <select value={config.resorte_lineal} onChange={(e) => setConfig({ ...config, sistema: "personalizado", resorte_lineal: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-1.5 py-1 text-xs">
                    {["N/m", "kN/m", "kgf/cm", "tf/m", "kip/in"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">Rigidez resorte rotacional</label>
                  <select value={config.resorte_rotacional} onChange={(e) => setConfig({ ...config, sistema: "personalizado", resorte_rotacional: e.target.value as any })} className="w-full border border-gray-300 rounded-lg px-1.5 py-1 text-xs">
                    {["N·m/rad", "kN·m/rad", "kgf·m/rad", "tf·m/rad"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-3">
              <a href="/herramientas/secciones" className="text-xs text-blue-600 hover:underline">
                Ir a Section Builder para importar una sección →
              </a>
            </div>
            {mensajeImportacion && <div className="text-xs text-gray-500 mt-1">{mensajeImportacion}</div>}
          </div>

          {alertaLongitud && (
            <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl p-3 text-sm font-medium">
              ⚠ {alertaLongitud}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">¿QUÉ QUIERES CALCULAR CON TRABAJO VIRTUAL?</div>
            <div className="flex gap-3">
              <button
                onClick={() => { setModo("reacciones"); setResultado(null); setResultadoDef(null); setError(null) }}
                className={`flex-1 text-left p-3 rounded-lg border-2 ${modo === "reacciones" ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}
              >
                <div className="text-sm font-semibold text-gray-800">Resolver reacciones hiperestáticas</div>
                <div className="text-xs text-gray-500 mt-1">Encuentra las redundantes de una viga indeterminada mediante compatibilidad de trabajo virtual.</div>
              </button>
              <button
                onClick={() => { setModo("deformacion"); setResultado(null); setResultadoDef(null); setError(null) }}
                className={`flex-1 text-left p-3 rounded-lg border-2 ${modo === "deformacion" ? "border-purple-600 bg-purple-50" : "border-gray-200"}`}
              >
                <div className="text-sm font-semibold text-gray-800">Calcular deflexión o giro en un punto</div>
                <div className="text-xs text-gray-500 mt-1">Aplica una carga virtual unitaria en el punto de interés y evalúa ∫M·m/EI dx.</div>
              </button>
            </div>
          </div>

          {(modo === "reacciones" || n > 0) && (
            <div className={`rounded-xl p-4 text-sm font-medium border ${requeridas === redundantesSel.length ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
              Grado de indeterminación: {n} &nbsp;({resortes.length} resorte(s), automáticamente redundantes + {requeridas} a elegir tú) — llevas marcadas {redundantesSel.length}.
              {n < 0 && <div className="text-xs mt-1">La viga es un mecanismo (n negativo) — agrega apoyos.</div>}
              {n === 0 && modo === "reacciones" && <div className="text-xs mt-1">La viga ya es determinada — no hay redundantes que elegir. Usa el módulo de Doble Integración, o cambia a "Calcular deflexión o giro" arriba.</div>}
              {n > 0 && <div className="text-xs mt-1">{modo === "deformacion" ? "Como la viga es indeterminada, primero hay que resolverla: marca las redundantes igual que en el modo de reacciones." : ""}</div>}
            </div>
          )}
          {modo === "deformacion" && n === 0 && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm font-medium">
              La viga es determinada — no se necesita elegir redundantes, se resuelve directo.
            </div>
          )}

          {modo === "deformacion" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PUNTO DE INTERÉS</div>
              <div className="grid grid-cols-2 gap-4">
                <Campo label={`Posición x (${config.longitud})`}>
                  <input type="number" value={xPunto} onChange={(e) => setXPunto(validarX(Number(e.target.value), "El punto de interés"))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </Campo>
                <Campo label="¿Qué quieres calcular ahí?">
                  <select value={tipoDeformacion} onChange={(e) => setTipoDeformacion(e.target.value as "deflexion" | "giro")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="deflexion">Deflexión (desplazamiento vertical)</option>
                    <option value="giro">Giro (rotación)</option>
                  </select>
                </Campo>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">APOYOS — marca cuáles reacciones son redundantes</div>
              <button onClick={agregarApoyo} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Agregar apoyo</button>
            </div>
            <div className="grid grid-cols-8 gap-2 px-2 mb-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">ID</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Posición x ({config.longitud})</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide col-span-2">Tipo de apoyo</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Asentamiento ({config.desplazamiento})</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Giro impuesto (rad)</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">¿Redundante?</span>
              <span></span>
            </div>
            <div className="space-y-2">
              {apoyos.map((a) => {
                const tieneFy = a.tipo === "rodillo" || a.tipo === "articulado" || a.tipo === "empotrado"
                const tieneM = a.tipo === "empotrado" || a.tipo === "guia"
                return (
                  <div key={a.id} className="grid grid-cols-8 gap-2 items-center bg-gray-50 rounded-lg p-2">
                    <span className="text-xs text-gray-500">{a.id}</span>
                    <input type="number" value={a.x} onChange={(e) => actualizarApoyo(a.id, { x: validarX(Number(e.target.value), `La posición del apoyo ${a.id}`) })} placeholder={`x (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
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
                  <Campo label={`Posición x (${config.longitud})`}>
                    <input type="number" value={r.x} onChange={(e) => actualizarResorte(r.id, { x: validarX(Number(e.target.value), `La posición del resorte ${r.id}`) })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-full" />
                  </Campo>
                  <Campo label={r.tipo === "vertical" ? `Rigidez k (${config.resorte_lineal})` : `Rigidez k (${config.resorte_rotacional})`} className="col-span-2">
                    <input type="number" value={r.k} onChange={(e) => actualizarResorte(r.id, { k: Number(e.target.value) })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-full" />
                  </Campo>
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
                  <Campo label={`Posición x (${config.longitud})`}>
                    <input type="number" value={r.x} onChange={(e) => actualizarRotula(r.id, validarX(Number(e.target.value), `La posición de la rótula ${r.id}`))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-full" />
                  </Campo>
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
                  <span className="text-xs text-gray-500 w-16">{c.id}<br /><span className="text-[9px] text-gray-400">({c.tipo})</span></span>
                  {c.tipo === "puntual" && (
                    <>
                      <Campo label={`Posición x (${config.longitud})`}>
                        <input type="number" value={c.x} onChange={(e) => actualizarCarga(c.id, { x: validarX(Number(e.target.value), `La posición de la carga ${c.id}`) })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      </Campo>
                      <Campo label={`Fuerza P (${config.fuerza}, ↓ positivo)`}>
                        <input type="number" value={c.P} onChange={(e) => actualizarCarga(c.id, { P: Number(e.target.value) })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-28" />
                      </Campo>
                    </>
                  )}
                  {c.tipo === "momento" && (
                    <>
                      <Campo label={`Posición x (${config.longitud})`}>
                        <input type="number" value={c.x} onChange={(e) => actualizarCarga(c.id, { x: validarX(Number(e.target.value), `La posición de la carga ${c.id}`) })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      </Campo>
                      <Campo label={`Momento M (${config.momento}, ↺ positivo)`}>
                        <input type="number" value={c.M} onChange={(e) => actualizarCarga(c.id, { M: Number(e.target.value) })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-28" />
                      </Campo>
                    </>
                  )}
                  {c.tipo === "distribuida" && (
                    <>
                      <Campo label={`Inicio xi (${config.longitud})`}>
                        <input type="number" value={c.xi} onChange={(e) => actualizarCarga(c.id, { xi: validarX(Number(e.target.value), `xi de la carga ${c.id}`) })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20" />
                      </Campo>
                      <Campo label={`Fin xf (${config.longitud})`}>
                        <input type="number" value={c.xf} onChange={(e) => actualizarCarga(c.id, { xf: validarX(Number(e.target.value), `xf de la carga ${c.id}`) })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20" />
                      </Campo>
                      <Campo label={`Carga inicial wi (${config.fuerza}/${config.longitud})`}>
                        <input type="number" value={c.wi} onChange={(e) => actualizarCarga(c.id, { wi: Number(e.target.value) })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      </Campo>
                      <Campo label={`Carga final wf (${config.fuerza}/${config.longitud})`}>
                        <input type="number" value={c.wf} onChange={(e) => actualizarCarga(c.id, { wf: Number(e.target.value) })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      </Campo>
                    </>
                  )}
                  <button onClick={() => borrarCarga(c.id)} className="text-red-500 text-xs hover:underline ml-auto">Borrar</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESQUEMA (viga completa, en vivo)</div>
            <svg viewBox={`0 0 ${anchoSvg} 260`} className="w-full h-64">
              <line x1={xSvg(0)} y1={yViga} x2={xSvg(L)} y2={yViga} stroke="#1e3a8a" strokeWidth={4} />
              {apoyos.map((a) => (
                <g key={a.id}>
                  {a.tipo === "rodillo" && (
                    <>
                      <polygon points={`${xSvg(a.x)},${yViga} ${xSvg(a.x) - 10},${yViga + 18} ${xSvg(a.x) + 10},${yViga + 18}`} fill="#2563eb" />
                      <circle cx={xSvg(a.x) - 6} cy={yViga + 22} r={3} fill="#2563eb" />
                      <circle cx={xSvg(a.x) + 6} cy={yViga + 22} r={3} fill="#2563eb" />
                    </>
                  )}
                  {a.tipo === "articulado" && (
                    <>
                      <polygon points={`${xSvg(a.x)},${yViga} ${xSvg(a.x) - 10},${yViga + 18} ${xSvg(a.x) + 10},${yViga + 18}`} fill="#7c3aed" />
                      <circle cx={xSvg(a.x)} cy={yViga} r={3} fill="white" stroke="#7c3aed" strokeWidth={1.5} />
                    </>
                  )}
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
              {resortes.map((r) => {
                const puntas = 5
                const alto = r.tipo === "vertical" ? 34 : 26
                const yTope = yViga + alto
                let path = `M ${xSvg(r.x)} ${yViga}`
                for (let i = 1; i <= puntas; i++) {
                  const yI = yViga + (alto / puntas) * i
                  const xOff = i % 2 === 0 ? -6 : 6
                  path += ` L ${xSvg(r.x) + xOff} ${yI}`
                }
                return (
                  <g key={r.id}>
                    {r.tipo === "vertical" ? (
                      <path d={path} fill="none" stroke="#0891b2" strokeWidth={1.6} />
                    ) : (
                      <circle cx={xSvg(r.x)} cy={yViga + 14} r={10} fill="none" stroke="#0891b2" strokeWidth={1.6} strokeDasharray="3,2" />
                    )}
                    <text x={xSvg(r.x)} y={yTope + 14} fontSize={9} textAnchor="middle" fill="#0891b2">{r.id} (k)</text>
                  </g>
                )
              })}
              {rotulas.map((r) => (
                <g key={r.id}>
                  <circle cx={xSvg(r.x)} cy={yViga} r={6} fill="white" stroke="#1e3a8a" strokeWidth={2.5} />
                  <text x={xSvg(r.x)} y={yViga + 22} fontSize={9} textAnchor="middle" fill="#1e3a8a" fontWeight={700}>{r.id} (M=0)</text>
                </g>
              ))}
              {cargas.map((c) => {
                if (c.tipo === "puntual")
                  return (
                    <g key={c.id}>
                      <line x1={xSvg(c.x)} y1={yViga - 40} x2={xSvg(c.x)} y2={yViga - 4} stroke="#dc2626" strokeWidth={2} markerEnd="url(#flecha)" />
                      <text x={xSvg(c.x)} y={yViga - 44} fontSize={10} textAnchor="middle" fill="#dc2626">{c.P}{config.fuerza}</text>
                    </g>
                  )
                if (c.tipo === "momento")
                  return (
                    <g key={c.id}>
                      <text x={xSvg(c.x)} y={yViga - 14} fontSize={26} textAnchor="middle" fill="#dc2626">{c.M >= 0 ? "↺" : "↻"}</text>
                      <text x={xSvg(c.x)} y={yViga - 36} fontSize={10} textAnchor="middle" fill="#dc2626" fontWeight={700}>{Math.abs(c.M)}{config.momento}</text>
                    </g>
                  )
                if (c.tipo === "distribuida") {
                  const maxW = Math.max(...cargas.filter((cc) => cc.tipo === "distribuida").map((cc: any) => Math.max(cc.wi, cc.wf)), 1)
                  const alturaMax = 40
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

              {resultado && Object.entries(resultado.reacciones).map(([id, r]) => {
                const apoyo = apoyos.find((a) => a.id === id)
                if (!apoyo) return null
                const xPos = xSvg(apoyo.x)
                return (
                  <g key={`reac-${id}`}>
                    {r.Fy !== undefined && Math.abs(r.Fy) > 1e-6 && (
                      <>
                        <line
                          x1={xPos}
                          y1={r.Fy >= 0 ? yViga + 64 : yViga + 34}
                          x2={xPos}
                          y2={r.Fy >= 0 ? yViga + 34 : yViga + 64}
                          stroke="#16a34a" strokeWidth={2.6} markerEnd="url(#flechaVerde)"
                        />
                        <text x={xPos} y={yViga + 78} fontSize={10} textAnchor="middle" fill="#16a34a" fontWeight={700}>
                          {Math.abs(deBaseFuerza(r.Fy)).toFixed(1)}{config.fuerza}
                        </text>
                      </>
                    )}
                    {r.M !== undefined && Math.abs(r.M) > 1e-6 && (
                      <>
                        <text x={xPos} y={yViga - 20} fontSize={26} textAnchor="middle" fill="#16a34a">
                          {r.M >= 0 ? "↺" : "↻"}
                        </text>
                        <text x={xPos} y={yViga - 42} fontSize={10} textAnchor="middle" fill="#16a34a" fontWeight={700}>
                          {Math.abs(deBaseMomento(r.M)).toFixed(1)}{config.momento}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}

              {(() => {
                const puntosDim = Array.from(
                  new Set(
                    [
                      0, L,
                      ...apoyos.map((a) => a.x),
                      ...rotulas.map((r) => r.x),
                      ...resortes.map((r) => r.x),
                      ...cargas.flatMap((c) => (c.tipo === "distribuida" ? [c.xi, c.xf] : [c.x])),
                    ].map((v) => Number(v.toFixed(6)))
                  )
                ).sort((a, b) => a - b)
                const yCotaLinea = 200
                const yCotaTexto = 214
                return (
                  <g>
                    <line x1={xSvg(0)} y1={yCotaLinea} x2={xSvg(L)} y2={yCotaLinea} stroke="#cbd5e1" strokeWidth={1} />
                    {puntosDim.map((p, i) => (
                      <line key={`tick-${i}`} x1={xSvg(p)} y1={yCotaLinea - 5} x2={xSvg(p)} y2={yCotaLinea + 5} stroke="#94a3b8" strokeWidth={1} />
                    ))}
                    {puntosDim.slice(0, -1).map((p, i) => {
                      const siguiente = puntosDim[i + 1]
                      const dist = siguiente - p
                      if (dist < 1e-6) return null
                      const xMedio = (xSvg(p) + xSvg(siguiente)) / 2
                      return (
                        <text key={`cota-${i}`} x={xMedio} y={yCotaTexto} fontSize={9} textAnchor="middle" fill="#64748b">
                          {dist.toFixed(2)}{config.longitud}
                        </text>
                      )
                    })}
                    <text x={(xSvg(0) + xSvg(L)) / 2} y={yCotaTexto + 16} fontSize={9} textAnchor="middle" fill="#94a3b8" fontWeight={600}>
                      L = {L.toFixed(2)}{config.longitud}
                    </text>
                  </g>
                )
              })()}
              <defs>
                <marker id="flecha" markerWidth={8} markerHeight={8} refX={4} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#dc2626" /></marker>
                <marker id="flechaChica" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" /></marker>
                <marker id="flechaVerde" markerWidth={8} markerHeight={8} refX={4} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#16a34a" /></marker>
              </defs>
            </svg>
          </div>

          <button
            onClick={modo === "reacciones" ? calcular : calcularDeformacion}
            className={`text-white px-5 py-2.5 rounded-lg text-sm ${modo === "reacciones" ? "bg-blue-700 hover:bg-blue-800" : "bg-purple-700 hover:bg-purple-800"}`}
          >
            {modo === "reacciones" ? "Calcular reacciones por trabajo virtual" : "Calcular deflexión/giro por trabajo virtual"}
          </button>
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

          {modo === "reacciones" && resultado && (
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
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ECUACIONES DE COMPATIBILIDAD (TRABAJO VIRTUAL)</div>
                <div className="text-xs text-gray-500 mb-3 space-y-1">
                  <div>Para cada redundante Xᵢ, el desplazamiento real en ese punto liberado debe coincidir con la condición real de apoyo (0, o el asentamiento/giro impuesto):</div>
                  <Formula tex={`\Delta_i = \int_0^L \frac{M(x)\, m_i(x)}{EI}\,dx \qquad \text{con} \quad M(x) = M_0(x) + \sum_j X_j\, m_j(x)`} block />
                  <div>Sustituyendo y separando la integral (M₀ no depende de las Xⱼ):</div>
                  <Formula tex={`\\underbrace{\\int_0^L \\frac{M_0(x)\\, m_i(x)}{EI}dx}_{\\delta_{iL}} + \\sum_j X_j \\underbrace{\\int_0^L \\frac{m_i(x)\\, m_j(x)}{EI}dx}_{\\delta_{ij}} = \\Delta_i`} block />
                  <div>Cada δᵢⱼ y δᵢL se evalúa numéricamente (Simpson) sobre los M₀(x)/mᵢ(x) de los estados de arriba. Resolviendo el sistema resultante:</div>
                </div>
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
                        <div className="text-sm font-bold text-purple-800">{esFy ? limpiar(deBaseFuerza(x)).toFixed(3) + " " + config.fuerza : limpiar(deBaseMomento(x)).toFixed(3) + " " + config.momento}</div>
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
                      {r.Fy !== undefined && <div className="text-sm font-bold text-blue-800">Fy = {Math.abs(limpiar(deBaseFuerza(r.Fy))).toFixed(3)} {config.fuerza} {limpiar(r.Fy) >= 0 ? "↑" : "↓"}</div>}
                      {r.M !== undefined && <div className="text-sm font-bold text-blue-800">M = {Math.abs(limpiar(deBaseMomento(r.M))).toFixed(3)} {config.momento} {limpiar(r.M) >= 0 ? "↺" : "↻"}</div>}
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

                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CONDICIONES DE DISEÑO</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                      <div>
                        <label className="text-xs text-gray-500">σ admisible tracción/compresión ({config.esfuerzo})</label>
                        <input type="number" value={sigmaAdmisible} onChange={(e) => setSigmaAdmisible(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">τ admisible corte ({config.esfuerzo})</label>
                        <input type="number" value={tauAdmisible} onChange={(e) => setTauAdmisible(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">S, módulo de sección ({config.modulo_resistente})</label>
                        <input type="number" value={moduloSeccion} onChange={(e) => setModuloSeccion(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">A, área de la sección ({config.seccion}²)</label>
                        <input type="number" value={areaSeccion} onChange={(e) => setAreaSeccion(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Deflexión máx. permitida: L /</label>
                        <input type="number" value={deflexionDenominador} onChange={(e) => setDeflexionDenominador(Number(e.target.value))} className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(() => {
                        const MmaxBase = aBaseMomento(Math.max(...puntos.map((p) => Math.abs(p.M))))
                        const VmaxBase = aBaseFuerza(Math.max(...puntos.map((p) => Math.abs(p.V))))
                        const vmaxBase = aBaseDesplazamiento(Math.max(...puntos.map((p) => Math.abs(p.v))))
                        const Sbase = aBaseModulo(moduloSeccion)
                        const Abase = aBaseArea(areaSeccion)
                        const sigmaAdmBase = aBaseEsfuerzo(sigmaAdmisible)
                        const tauAdmBase = aBaseEsfuerzo(tauAdmisible)

                        const sigmaCalcMPa = Sbase > 0 ? (MmaxBase / Sbase) * 1000 : null
                        const tauCalcMPa = Abase > 0 ? (VmaxBase / Abase) * 10 : null
                        const deflexionPermitidaBase = deflexionDenominador > 0 ? aBaseLongitud(L) / deflexionDenominador : null

                        const chequeoSigma = sigmaCalcMPa !== null && sigmaAdmBase > 0 ? sigmaCalcMPa <= sigmaAdmBase : null
                        const chequeoTau = tauCalcMPa !== null && tauAdmBase > 0 ? tauCalcMPa <= tauAdmBase : null
                        const chequeoDefl = deflexionPermitidaBase !== null ? vmaxBase <= deflexionPermitidaBase : null

                        function Tarjeta({ titulo, ok, detalle }: { titulo: string; ok: boolean | null; detalle: string }) {
                          return (
                            <div className={`p-3 rounded-lg border-l-4 ${ok === null ? "bg-gray-50 border-gray-300" : ok ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"}`}>
                              <div className="text-xs text-gray-500">{titulo}</div>
                              <div className={`text-sm font-bold ${ok === null ? "text-gray-500" : ok ? "text-green-700" : "text-red-700"}`}>
                                {ok === null ? "Sin datos" : ok ? "✓ Cumple" : "✗ No cumple"}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">{detalle}</div>
                            </div>
                          )
                        }

                        return (
                          <>
                            <Tarjeta
                              titulo="Esfuerzo por flexión"
                              ok={chequeoSigma}
                              detalle={sigmaCalcMPa !== null ? `σ = ${deBaseEsfuerzo(sigmaCalcMPa).toFixed(2)} ${config.esfuerzo} (adm. ${sigmaAdmisible} ${config.esfuerzo})` : "Ingresa S para calcular"}
                            />
                            <Tarjeta
                              titulo="Esfuerzo cortante"
                              ok={chequeoTau}
                              detalle={tauCalcMPa !== null ? `τ = ${deBaseEsfuerzo(tauCalcMPa).toFixed(2)} ${config.esfuerzo} (adm. ${tauAdmisible} ${config.esfuerzo})` : "Ingresa A para calcular"}
                            />
                            <Tarjeta
                              titulo="Deflexión máxima"
                              ok={chequeoDefl}
                              detalle={
                                deflexionPermitidaBase !== null
                                  ? `δ = ${deBaseDesplazamiento(vmaxBase).toFixed(4)} ${config.desplazamiento} (límite L/${deflexionDenominador} = ${deBaseDesplazamiento(deflexionPermitidaBase).toFixed(4)} ${config.desplazamiento})`
                                  : "Ingresa denominador"
                              }
                            />
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {modo === "deformacion" && resultadoDef && (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESTADO REAL — M(x) BAJO LAS CARGAS VERDADERAS</div>
                <EsquemaEstado
                  L={L}
                  apoyosPrimaria={resultadoDef.apoyosPrimariaBase.map((a) => ({ ...a, x: deBaseLongitud(a.x) }))}
                  cargas={cargas as any}
                  unidadLongitud={config.longitud}
                  unidadFuerza={config.fuerza}
                  unidadMomento={config.momento}
                />
                <div className="mt-3">
                  <TablaTramos terminosM={resultadoDef.terminosMReal} puntosCriticos={resultadoDef.puntosCriticosReal} unidadLongitud={config.longitud} unidadMomento={config.momento} factorK={factorK} factorValor={factorM} />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">
                  ESTADO VIRTUAL — m(x) POR {tipoDeformacion === "deflexion" ? "FUERZA" : "MOMENTO"} UNITARIO EN x = {xPunto} {config.longitud}
                </div>
                <EsquemaEstado
                  L={L}
                  apoyosPrimaria={resultadoDef.apoyosPrimariaBase.map((a) => ({ ...a, x: deBaseLongitud(a.x) }))}
                  cargas={[
                    tipoDeformacion === "deflexion"
                      ? { tipo: "puntual", x: xPunto, P: -1 }
                      : { tipo: "momento", x: xPunto, M: 1 },
                  ] as any}
                  unidadLongitud={config.longitud}
                  unidadFuerza={config.fuerza}
                  unidadMomento={config.momento}
                />
                <div className="mt-3">
                  <TablaTramos terminosM={resultadoDef.terminosMVirtual} puntosCriticos={resultadoDef.puntosCriticosVirtual} unidadLongitud={config.longitud} unidadMomento="(unitario)" factorK={factorK} factorValor={1} />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">TRABAJO VIRTUAL — RESULTADO</div>
                <div className="text-sm mb-2">
                  <Formula tex={`1 \cdot ${tipoDeformacion === "deflexion" ? "\delta" : "\theta"} = \int_0^L \frac{M(x)\, m(x)}{EI}\,dx`} block />
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  EI = {(EI * deBaseMomento(1) * deBaseLongitud(1)).toFixed(3)} {config.momento}·{config.longitud} — integral evaluada numéricamente (Simpson) usando M(x) y m(x) de arriba.
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border-l-4 border-purple-500">
                  <div className="text-xs text-purple-500">{tipoDeformacion === "deflexion" ? "Deflexión" : "Giro"} en x = {xPunto} {config.longitud}</div>
                  <div className="text-lg font-bold text-purple-800">
                    {tipoDeformacion === "deflexion"
                      ? `${limpiar(deBaseDesplazamiento(resultadoDef.delta)).toFixed(5)} ${config.desplazamiento}`
                      : `${limpiar(resultadoDef.delta).toFixed(6)} rad`}
                  </div>
                  <div className="text-xs text-purple-400 mt-1">
                    Signo positivo = en el mismo sentido de la carga virtual aplicada ({tipoDeformacion === "deflexion" ? "hacia abajo" : "antihorario"}).
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}