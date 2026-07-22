"use client"
import { useState, useMemo, useRef, useEffect } from "react"
import katex from "katex"
// @ts-ignore: allow side-effect CSS import without type declarations
import "katex/dist/katex.min.css"
import Sidebar from "../../components/Sidebar"
import { resolverViga, Apoyo, Carga, Rotula, ResultadoViga, TipoApoyo, Termino } from "../../lib/vigas/motor"
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

// Redondea a 6 decimales para eliminar ruido de punto flotante (valores
// que deberian ser exactamente cero o iguales entre si, pero terminan
// siendo 1e-13/1e-14 por acumulacion de error numerico).
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

// ── Notación de Macaulay (ecuaciones de singularidad) ──────────────────────
// A diferencia de doble integración (que expande cada tramo a un polinomio
// distinto), aquí se mantiene CADA término con su propio x0, mostrando
// ⟨x - x0⟩ⁿ tal cual — una sola ecuación valida para toda la viga.

function integrarTerminoBracket(t: Termino): Termino {
  return { coef: t.coef / (t.power + 1), power: t.power + 1, x0: t.x0 }
}

function terminosMacaulayDisplay(
  terminos: Termino[],
  factorK: number,
  factorValor: number,
  deBaseLongitud: (v: number) => number
): Termino[] {
  return terminos
    .map((t) => ({
      coef: t.coef * Math.pow(factorK, t.power) * factorValor,
      power: t.power,
      x0: deBaseLongitud(t.x0),
    }))
    .filter((t) => Math.abs(t.coef) > 1e-9)
}

function macaulayALatex(terminos: Termino[]): string {
  if (terminos.length === 0) return "0"
  let expr = ""
  terminos.forEach((t, i) => {
    const signo = t.coef >= 0 ? (i === 0 ? "" : "+") : "-"
    const abs = Math.abs(t.coef).toFixed(4)
    const bracket = Math.abs(t.x0) < 1e-9 ? `\\langle x \\rangle^{${t.power}}` : `\\langle x - ${t.x0.toFixed(2)} \\rangle^{${t.power}}`
    expr += ` ${signo} ${abs}${bracket}`
  })
  expr = expr.trim()
  if (expr.startsWith("+")) expr = expr.slice(1).trim()
  return expr || "0"
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

function PanelReacciones({
  reacciones, titulo, unidadFuerza, unidadMomento,
}: { reacciones: ResultadoViga["reacciones"] | null; titulo: string; unidadFuerza: string; unidadMomento: string }) {
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
                Fy = {Math.abs(r.Fy).toFixed(3)} {unidadFuerza} {r.Fy >= 0 ? "↑" : "↓"}
              </div>
            )}
            {r.M !== undefined && (
              <div className="text-sm font-bold text-blue-800">
                M = {Math.abs(r.M).toFixed(3)} {unidadMomento} {r.M >= 0 ? "↺" : "↻"}
              </div>
            )}
            {r.Rx !== undefined && (
              <div className="text-sm font-bold text-cyan-700">
                Rx = {Math.abs(r.Rx).toFixed(3)} {unidadFuerza} {r.Rx >= 0 ? "→" : "←"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SuperposicionCarga({
  c, L, unidadLongitud, unidadCarga,
}: { c: { id: string; xi: number; xf: number; wi: number; wf: number }; L: number; unidadLongitud: string; unidadCarga: string }) {
  const ancho = 700
  const margen = 50
  const escala = (ancho - 2 * margen) / L
  function xSvg(v: number) { return margen + v * escala }

  const maxW = Math.max(c.wi, c.wf, 1)
  const altura = 40
  function ySvg(w: number, baseY: number) { return baseY - (w / maxW) * altura }

  const filas = [
    { titulo: `Carga real "${c.id}" (solo entre xi y xf)`, xIni: c.xi, xFin: c.xf, wIni: c.wi, wFin: c.wf, color: "#0f6e56", signo: "" },
    { titulo: "+ Misma carga, extendida hasta L (ficticia)", xIni: c.xi, xFin: L, wIni: c.wi, wFin: c.wi + ((c.wf - c.wi) / (c.xf - c.xi || 1)) * (L - c.xi), color: "#185fa5", signo: "+" },
    { titulo: "− Carga igual, desde xf hasta L (resta lo de más)", xIni: c.xf, xFin: L, wIni: c.wf, wFin: c.wi + ((c.wf - c.wi) / (c.xf - c.xi || 1)) * (L - c.xi), color: "#a32d2d", signo: "−" },
  ]

  const filaAltura = 90
  const alturaTotal = filas.length * filaAltura + 30

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <svg viewBox={`0 0 ${ancho} ${alturaTotal}`} className="w-full">
        {filas.map((fila, idx) => {
          const baseY = 55 + idx * filaAltura
          return (
            <g key={idx}>
              <text x={margen} y={baseY - altura - 14} fontSize={11} fontWeight={600} fill={fila.color}>{fila.titulo}</text>
              <line x1={xSvg(0)} y1={baseY} x2={xSvg(L)} y2={baseY} stroke="#94a3b8" strokeWidth={2} />
              {fila.xFin > fila.xIni && (
                <polygon
                  points={`${xSvg(fila.xIni)},${ySvg(fila.wIni, baseY)} ${xSvg(fila.xFin)},${ySvg(fila.wFin, baseY)} ${xSvg(fila.xFin)},${baseY} ${xSvg(fila.xIni)},${baseY}`}
                  fill={fila.color}
                  opacity={0.18}
                  stroke={fila.color}
                  strokeWidth={1}
                />
              )}
              <line x1={xSvg(fila.xIni)} y1={baseY + 6} x2={xSvg(fila.xIni)} y2={baseY - 6} stroke={fila.color} strokeWidth={1} />
              <line x1={xSvg(fila.xFin)} y1={baseY + 6} x2={xSvg(fila.xFin)} y2={baseY - 6} stroke={fila.color} strokeWidth={1} />
              <text x={xSvg(fila.xIni)} y={baseY + 18} fontSize={9} textAnchor="middle" fill="#64748b">{fila.xIni.toFixed(2)}{unidadLongitud}</text>
              <text x={xSvg(fila.xFin)} y={baseY + 18} fontSize={9} textAnchor="middle" fill="#64748b">{fila.xFin.toFixed(2)}{unidadLongitud}</text>
            </g>
          )
        })}
      </svg>
      <div className="text-xs text-gray-400 mt-2">
        wi = {c.wi} {unidadCarga}, wf = {c.wf} {unidadCarga}. Entre xi y xf la fila 2 y 3 se cancelan parcialmente dejando exactamente la carga real; más allá de xf, se cancelan por completo.
        {Math.abs(c.wf - c.wi) > 1e-9 && " Como esta carga tiene pendiente (trapezoidal), el motor agrega además un término de cierre en xf que aplana la rampa exactamente en ese punto — no se dibuja aquí para no sobrecargar el esquema, pero ya está incluido en la ecuación general de arriba."}
      </div>
    </div>
  )
}

export default function EcuacionesSingularidad() {
  const [L, setL] = useState(6)
  const [E, setE] = useState(200000)
  const [I, setI] = useState(50000)
  const config = useUnidadesStore((s) => s.config)
  const aplicarPreset = useUnidadesStore((s) => s.aplicarPreset)
  const setConfig = useUnidadesStore((s) => s.setConfig)
  const seccionImportada = useSeccionStore((s) => s.seccion)
  const limpiarSeccion = useSeccionStore((s) => s.limpiarSeccion)

  // Conversion entre las unidades elegidas por el usuario y las unidades
  // base internas del motor (m, kN, kN/m, kN·m, MPa, cm4) -- el motor
  // siempre calcula en esta base fija; solo se convierte en la entrada/salida.
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
  function deBaseCargaDistribuida(v: number) { return (v * aBaseLongitud(1)) / aBaseFuerza(1) }
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
  const [mensajeImportacion, setMensajeImportacion] = useState<string | null>(null)

  // Al volver de Section Builder, si hay una seccion esperando en el store
  // compartido, se aplica automaticamente a I. Como ambas paginas leen el
  // mismo useUnidadesStore, Icx ya viene expresado en las unidades de
  // "config.inercia" actuales -- no hace falta convertir.
  useEffect(() => {
    if (seccionImportada) {
      setI(seccionImportada.Icx)
      setAreaSeccion(seccionImportada.A)
      // Para el chequeo de esfuerzo se usa el modulo resistente inferior
      // (Sx_bot), tipicamente el mas critico en flexion positiva. Si Sx_top
      // es menor (seccion asimetrica), se podria preferir ese; se deja
      // Sx_bot por ser el mas comun de reportar.
      setModuloSeccion(seccionImportada.Sx_bot)
      setMensajeImportacion(
        `Sección importada desde Section Builder: "${seccionImportada.nombre}" — I = ${seccionImportada.Icx.toFixed(2)} ${config.inercia}, A = ${seccionImportada.A.toFixed(2)} ${config.seccion}², S = ${seccionImportada.Sx_bot.toFixed(2)} ${config.modulo_resistente}. E no se modificó (Section Builder no calcula material) — ajústalo manualmente si corresponde.`
      )
      limpiarSeccion()
    }
  }, [seccionImportada])

  // Condiciones de diseño (opcional): el usuario define admisibles y se comparan en vivo.
  const [sigmaAdmisible, setSigmaAdmisible] = useState(0)
  const [tauAdmisible, setTauAdmisible] = useState(0)
  const [moduloSeccion, setModuloSeccion] = useState(0)
  const [areaSeccion, setAreaSeccion] = useState(0)
  const [deflexionDenominador, setDeflexionDenominador] = useState(360)
  const [alertaLongitud, setAlertaLongitud] = useState<string | null>(null)

  // Valida que una posicion x este dentro de [0, L]; si no, la recorta y
  // muestra una alerta temporal.
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
    { id: "A", x: 0, tipo: "articulado" },
    { id: "B", x: 6, tipo: "rodillo" },
  ])
  const [cargas, setCargas] = useState<Carga[]>([{ id: "C1", tipo: "puntual", x: 3, P: 10 }])
  const [rotulas, setRotulas] = useState<Rotula[]>([])

  const [resultado, setResultado] = useState<ResultadoViga | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Datos convertidos a unidades base internas (m, kN, kN/m, kN·m) para el motor.
  const datosBase = useMemo(() => {
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
    return { Lb, apoyosB, cargasB, rotulasB }
  }, [L, apoyos, cargas, rotulas, config])

  const [resultadoLive, errorLive] = useMemo((): [ResultadoViga | null, string | null] => {
    try {
      return [resolverViga(datosBase.Lb, datosBase.apoyosB, datosBase.cargasB, datosBase.rotulasB), null]
    } catch (e: any) {
      return [null, e.message || "Error al calcular"]
    }
  }, [datosBase])
  const resultadoLiveInfo = resultadoLive

  // Reacciones convertidas a las unidades elegidas por el usuario, para mostrar.
  const reaccionesDisplay = useMemo(() => {
    if (!resultadoLive) return null
    const out: ResultadoViga["reacciones"] = {}
    Object.entries(resultadoLive.reacciones).forEach(([id, r]) => {
      out[id] = {
        Fy: r.Fy !== undefined ? limpiar(deBaseFuerza(r.Fy)) : undefined,
        M: r.M !== undefined ? limpiar(deBaseMomento(r.M)) : undefined,
        Rx: r.Rx !== undefined ? limpiar(deBaseFuerza(r.Rx)) : undefined,
      }
    })
    return out
  }, [resultadoLive, config])

  // Reconversion real de los valores ya ingresados cuando el usuario cambia
  // de sistema de unidades (o de una unidad individual): en vez de re-
  // interpretar el mismo numero bajo la nueva unidad, se convierte el
  // valor fisico real.
  const prevConfigRef = useRef(config)
  useEffect(() => {
    const prev = prevConfigRef.current
    const cambio =
      prev.longitud !== config.longitud ||
      prev.fuerza !== config.fuerza ||
      prev.momento !== config.momento ||
      prev.esfuerzo !== config.esfuerzo ||
      prev.desplazamiento !== config.desplazamiento ||
      prev.inercia !== config.inercia
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

  function agregarApoyo() { setApoyos([...apoyos, { id: nuevoId("Ap"), x: 0, tipo: "rodillo" }]) }
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
      const res = resolverViga(datosBase.Lb, datosBase.apoyosB, datosBase.cargasB, datosBase.rotulasB)
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

  // Muestreo: puntos críticos INTERIORES reciben doble muestra (izq/der).
  // En x=L usamos SOLO el valor "izquierda" (el que se aproxima desde
  // dentro de la viga) — es el único físicamente significativo y coincide
  // exactamente con la ecuación del último tramo. El valor "derecha" en L
  // mezclaría el salto de la reacción con términos de cierre de cargas que
  // terminan justo ahí, dando un número sin sentido físico.
  // Malla en unidades de DISPLAY (lo que el usuario eligio), convirtiendo a
  // base solo al evaluar M(x)/V(x)/v(x), y el resultado de vuelta a display.
  const puntos = useMemo(() => {
    if (!resultado) return null
    const n = 140
    const mallaDisplay: number[] = []
    for (let i = 0; i <= n; i++) mallaDisplay.push((L * i) / n)
    const criticosDisplay = resultado.puntosCriticos.map((xc) => deBaseLongitud(xc))
    const criticosInterioresDisplay = criticosDisplay.filter((xc) => xc > 1e-9 && xc < L - 1e-9)
    const criticosSet = new Set(criticosInterioresDisplay.map((xc) => Number(xc.toFixed(9))))
    criticosInterioresDisplay.forEach((xc) => mallaDisplay.push(xc))
    const xsOrdenados = Array.from(new Set(mallaDisplay.map((xv) => Number(xv.toFixed(9))))).sort((a, b) => a - b)
    const arr: { x: number; M: number; V: number; v: number; theta: number }[] = []
    xsOrdenados.forEach((xvDisplay) => {
      const xvBase = aBaseLongitud(xvDisplay)
      const esFinal = Math.abs(xvDisplay - L) < 1e-9
      if (criticosSet.has(xvDisplay)) {
        arr.push({
          x: xvDisplay,
          M: limpiar(deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, false))),
          V: limpiar(deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, false))),
          v: limpiar(deBaseDesplazamiento(resultado.v(xvBase, EI))),
          theta: limpiar(resultado.theta(xvBase, EI)),
        })
        arr.push({
          x: xvDisplay,
          M: limpiar(deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, true))),
          V: limpiar(deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, true))),
          v: limpiar(deBaseDesplazamiento(resultado.v(xvBase, EI))),
          theta: limpiar(resultado.theta(xvBase, EI)),
        })
      } else if (esFinal) {
        arr.push({
          x: xvDisplay,
          M: limpiar(deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, false))),
          V: limpiar(deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, false))),
          v: limpiar(deBaseDesplazamiento(resultado.v(xvBase, EI))),
          theta: limpiar(resultado.theta(xvBase, EI)),
        })
      } else {
        arr.push({
          x: xvDisplay,
          M: limpiar(deBaseMomento(evaluarMConLado(resultado.terminosM, xvBase, true))),
          V: limpiar(deBaseFuerza(evaluarVConLado(resultado.terminosM, xvBase, true))),
          v: limpiar(deBaseDesplazamiento(resultado.v(xvBase, EI))),
          theta: limpiar(resultado.theta(xvBase, EI)),
        })
      }
    })
    return arr
  }, [resultado, L, EI, config])



  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Módulos / Vigas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Ecuaciones de singularidad</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">DATOS GENERALES</div>
              <div className="flex gap-1.5">
                {(["SI", "metrico", "americano"] as Exclude<SistemaUnidades, "personalizado">[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => aplicarPreset(s)}
                    className={`text-xs px-2.5 py-1 rounded-lg border ${config.sistema === s ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-300"}`}
                  >
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
            <div className="mt-2 text-xs text-gray-400">EI calculado = {EI.toFixed(2)} kN·m² (base interna)</div>

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
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-400 font-medium tracking-wider">APOYOS</div>
              <button onClick={agregarApoyo} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Agregar apoyo</button>
            </div>
            <div className="space-y-2">
              {apoyos.map((a) => (
                <div key={a.id} className="grid grid-cols-6 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <span className="text-xs text-gray-500">{a.id}</span>
                  <input type="number" value={a.x} onChange={(e) => actualizarApoyo(a.id, { x: validarX(Number(e.target.value), `La posición del apoyo ${a.id}`) })} placeholder={`x (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                  <select value={a.tipo} onChange={(e) => actualizarApoyo(a.id, { tipo: e.target.value as TipoApoyo })} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm col-span-2">
                    {Object.entries(nombresApoyo).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input type="number" value={a.asentamiento ?? 0} onChange={(e) => actualizarApoyo(a.id, { asentamiento: Number(e.target.value) })} placeholder={`asentamiento (${config.desplazamiento})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
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
                  <input type="number" value={r.x} onChange={(e) => actualizarRotula(r.id, validarX(Number(e.target.value), `La posición de la rótula ${r.id}`))} placeholder={`x (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
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
                      <input type="number" value={c.x} onChange={(e) => actualizarCarga(c.id, { x: validarX(Number(e.target.value), `La posición de la carga ${c.id}`) })} placeholder={`x (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      <input type="number" value={c.P} onChange={(e) => actualizarCarga(c.id, { P: Number(e.target.value) })} placeholder={`P (${config.fuerza}, ↓+)`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-28" />
                      <input type="number" value={c.angulo ?? 0} onChange={(e) => actualizarCarga(c.id, { angulo: Number(e.target.value) })} placeholder="ángulo (°, 0=vertical)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-32" />
                    </>
                  )}
                  {c.tipo === "momento" && (
                    <>
                      <span className="text-xs">Momento</span>
                      <input type="number" value={c.x} onChange={(e) => actualizarCarga(c.id, { x: validarX(Number(e.target.value), `La posición de la carga ${c.id}`) })} placeholder={`x (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      <input type="number" value={c.M} onChange={(e) => actualizarCarga(c.id, { M: Number(e.target.value) })} placeholder={`M (${config.momento}, ↺+)`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-28" />
                    </>
                  )}
                  {c.tipo === "distribuida" && (
                    <>
                      <span className="text-xs">Distribuida</span>
                      <input type="number" value={c.xi} onChange={(e) => actualizarCarga(c.id, { xi: validarX(Number(e.target.value), `xi de la carga ${c.id}`) })} placeholder={`xi (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20" />
                      <input type="number" value={c.xf} onChange={(e) => actualizarCarga(c.id, { xf: validarX(Number(e.target.value), `xf de la carga ${c.id}`) })} placeholder={`xf (${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20" />
                      <input type="number" value={c.wi} onChange={(e) => actualizarCarga(c.id, { wi: Number(e.target.value) })} placeholder={`wi (${config.fuerza}/${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                      <input type="number" value={c.wf} onChange={(e) => actualizarCarga(c.id, { wf: Number(e.target.value) })} placeholder={`wf (${config.fuerza}/${config.longitud})`} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24" />
                    </>
                  )}
                  <button onClick={() => borrarCarga(c.id)} className="text-red-500 text-xs hover:underline ml-auto">Borrar</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ESQUEMA (con reacciones en vivo)</div>
            <svg viewBox={`0 0 ${anchoSvg} 300`} className="w-full h-72">
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
              {rotulas.map((r) => (
                <g key={r.id}>
                  <circle cx={xSvg(r.x)} cy={yViga} r={6} fill="white" stroke="#1e3a8a" strokeWidth={2.5} />
                  <text x={xSvg(r.x)} y={yViga + 22} fontSize={9} textAnchor="middle" fill="#1e3a8a" fontWeight={700}>
                    {r.id} (M=0)
                  </text>
                </g>
              ))}
              {cargas.map((c) => {
                if (c.tipo === "puntual") {
                  const angRad = ((c.angulo ?? 0) * Math.PI) / 180
                  const largo = 36
                  const dx = Math.sin(angRad) * largo
                  const dy = Math.cos(angRad) * largo
                  const xPunta = xSvg(c.x)
                  const yPunta = yViga - 4
                  return (
                    <g key={c.id}>
                      <line x1={xPunta - dx} y1={yPunta - dy} x2={xPunta} y2={yPunta} stroke="#dc2626" strokeWidth={2} markerEnd="url(#flecha)" />
                      <text x={xPunta - dx} y={yPunta - dy - 6} fontSize={10} textAnchor="middle" fill="#dc2626">
                        {c.P}{config.fuerza}{c.angulo ? ` (${c.angulo}°)` : ""}
                      </text>
                    </g>
                  )
                }
                if (c.tipo === "momento")
                  return (
                    <g key={c.id}>
                      <text x={xSvg(c.x)} y={yViga - 14} fontSize={30} textAnchor="middle" fill="#dc2626">
                        {c.M >= 0 ? "↺" : "↻"}
                      </text>
                      <text x={xSvg(c.x)} y={yViga - 40} fontSize={11} textAnchor="middle" fill="#dc2626" fontWeight={700}>
                        {Math.abs(c.M)}{config.momento}
                      </text>
                    </g>
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

              {/* Flechas de reacción en vivo: verde, debajo de la viga */}
              {reaccionesDisplay && Object.entries(reaccionesDisplay).map(([id, r]) => {
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
                          {Math.abs(r.Fy).toFixed(1)}{config.fuerza}
                        </text>
                      </>
                    )}
                    {r.M !== undefined && Math.abs(r.M) > 1e-6 && (
                      <>
                        <text x={xPos} y={yViga - 20} fontSize={30} textAnchor="middle" fill="#16a34a">
                          {r.M >= 0 ? "↺" : "↻"}
                        </text>
                        <text x={xPos} y={yViga - 44} fontSize={11} textAnchor="middle" fill="#16a34a" fontWeight={700}>
                          {Math.abs(r.M).toFixed(1)}{config.momento}
                        </text>
                      </>
                    )}
                    {r.Rx !== undefined && Math.abs(r.Rx) > 1e-6 && (
                      <>
                        <line
                          x1={r.Rx >= 0 ? xPos - 34 : xPos + 34}
                          y1={yViga}
                          x2={r.Rx >= 0 ? xPos - 10 : xPos + 10}
                          y2={yViga}
                          stroke="#0891b2" strokeWidth={2.6} markerEnd="url(#flechaCyan)"
                        />
                        <text x={r.Rx >= 0 ? xPos - 22 : xPos + 22} y={yViga - 8} fontSize={10} textAnchor="middle" fill="#0891b2" fontWeight={700}>
                          {Math.abs(r.Rx).toFixed(1)}{config.fuerza}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}

              {/* Cotas: lineas de acotacion con distancias entre puntos clave */}
              {(() => {
                const puntosDim = Array.from(
                  new Set(
                    [
                      0,
                      L,
                      ...apoyos.map((a) => a.x),
                      ...rotulas.map((r) => r.x),
                      ...cargas.flatMap((c) => (c.tipo === "distribuida" ? [c.xi, c.xf] : [c.x])),
                    ].map((v) => Number(v.toFixed(6)))
                  )
                ).sort((a, b) => a - b)
                const yCotaLinea = 220
                const yCotaTexto = 234
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
                <marker id="flechaCyan" markerWidth={8} markerHeight={8} refX={4} refY={4} orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#0891b2" /></marker>
              </defs>
            </svg>
          </div>

          {resultadoLiveInfo && (
            <div className={`rounded-xl p-4 text-sm font-medium border ${resultadoLiveInfo.estabilidad.esEstable ? (resultadoLiveInfo.estabilidad.dsi === 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800") : "bg-red-50 border-red-200 text-red-800"}`}>
              <div>Estabilidad: {resultadoLiveInfo.estabilidad.mensaje}</div>
              <div className="text-xs font-normal mt-1 opacity-80">
                Reacciones totales r={resultadoLiveInfo.estabilidad.r} (Fy={resultadoLiveInfo.estabilidad.numFy}, Fx={resultadoLiveInfo.estabilidad.numFx}, M={resultadoLiveInfo.estabilidad.numM}) — ecuaciones = 3 + {resultadoLiveInfo.estabilidad.c} rótula(s) — grado = {resultadoLiveInfo.estabilidad.dsi}
              </div>
              {resultadoLiveInfo.estabilidad.advertencias.map((a, i) => (
                <div key={i} className="text-xs font-normal mt-1">⚠ {a}</div>
              ))}
            </div>
          )}
          {errorLive && !resultadoLiveInfo && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm font-medium">
              ⚠ {errorLive}
            </div>
          )}

          <PanelReacciones reacciones={reaccionesDisplay} titulo="REACCIONES (EN VIVO)" unidadFuerza={config.fuerza} unidadMomento={config.momento} />

          {resultadoLive && rotulas.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">REACCIONES INTERNAS EN RÓTULAS</div>
              <div className="grid grid-cols-3 gap-3">
                {rotulas.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-indigo-50 border-l-4 border-indigo-500">
                    <div className="text-xs text-indigo-500">Rótula {r.id} (x = {r.x} {config.longitud})</div>
                    <div className="text-sm font-bold text-indigo-800">M = 0 {config.momento} (por definición)</div>
                    <div className="text-sm font-bold text-indigo-800">V interno = {deBaseFuerza(resultadoLive.V(aBaseLongitud(r.x))).toFixed(3)} {config.fuerza}</div>
                    <div className="text-xs text-indigo-400 mt-1">Fuerza axial (horizontal) interna: no calculada — este módulo resuelve solo flexión, no fuerza axial distribuida.</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={calcular} className="bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-blue-800">Calcular desarrollo completo</button>

          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

          {resultado && puntos && (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">ECUACIÓN GENERAL — NOTACIÓN DE MACAULAY</div>
                <div className="text-sm mb-1"><Formula tex={`EI \\cdot v''(x) = M(x)`} block /></div>
                <div className="text-xs text-gray-400 mb-4">
                  EI = {(EI * deBaseMomento(1) * deBaseLongitud(1)).toFixed(3)} {config.momento}·{config.longitud} — una sola ecuación, válida para 0 ≤ x ≤ {L} {config.longitud}
                </div>
                {(() => {
                  const k = aBaseLongitud(1)
                  const factorM = deBaseMomento(1)
                  const factorEITheta = deBaseMomento(1) * deBaseLongitud(1)
                  const factorEIv = deBaseMomento(1) * Math.pow(deBaseLongitud(1), 2)

                  const terminosThetaBase: Termino[] = resultado.terminosM
                    .map(integrarTerminoBracket)
                    .concat([{ coef: resultado.constantes["C1"] ?? 0, power: 0, x0: 0 }])
                    .concat(
                      rotulas.map((r, idx) => {
                        const rBase = datosBase.rotulasB[idx]
                        return { coef: resultado.constantes[`dC1_${r.id}`] ?? 0, power: 0, x0: rBase.x }
                      })
                    )
                  const terminosVBase: Termino[] = terminosThetaBase
                    .map(integrarTerminoBracket)
                    .concat([{ coef: resultado.constantes["C2"] ?? 0, power: 0, x0: 0 }])

                  const mDisplay = terminosMacaulayDisplay(resultado.terminosM, k, factorM, deBaseLongitud)
                  const thetaDisplay = terminosMacaulayDisplay(terminosThetaBase, k, factorEITheta, deBaseLongitud)
                  const vDisplay = terminosMacaulayDisplay(terminosVBase, k, factorEIv, deBaseLongitud)

                  return (
                    <div className="space-y-3">
                      <div className="text-sm overflow-x-auto"><Formula tex={`M(x) = ${macaulayALatex(mDisplay)}`} block /></div>
                      <div className="text-sm overflow-x-auto"><Formula tex={`EI \\cdot \\theta(x) = ${macaulayALatex(thetaDisplay)}`} block /></div>
                      <div className="text-sm overflow-x-auto"><Formula tex={`EI \\cdot v(x) = ${macaulayALatex(vDisplay)}`} block /></div>
                      <div className="text-xs text-gray-400">
                        Cada término ⟨x−a⟩ⁿ vale 0 automáticamente mientras x sea menor que a — por eso una sola expresión cubre toda la viga sin partirla en tramos.
                      </div>
                    </div>
                  )
                })()}
              </div>

              {cargas.some((c) => c.tipo === "distribuida") && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">SUPERPOSICIÓN DE CARGAS DISTRIBUIDAS</div>
                  <div className="text-xs text-gray-400 mb-4">
                    Cada carga distribuida que no llega hasta el final de la viga se descompone en: la carga extendida (ficticia) hasta x=L, menos la misma carga empezando donde termina la real — así ambos términos quedan escritos con Macaulay en toda la viga.
                  </div>
                  <div className="space-y-6">
                    {cargas.filter((c) => c.tipo === "distribuida").map((c: any) => (
                      <SuperposicionCarga key={c.id} c={c} L={L} unidadLongitud={config.longitud} unidadCarga={`${config.fuerza}/${config.longitud}`} />
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-1">DIAGRAMA DE MOMENTO FLECTOR</div>
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

                    const sigmaCalcMPa = Sbase > 0 ? (MmaxBase / Sbase) * 1000 : null // kN·m / cm³ -> MPa
                    const tauCalcMPa = Abase > 0 ? (VmaxBase / Abase) * 10 : null // kN/cm² -> MPa
                    const deflexionPermitidaBase = deflexionDenominador > 0 ? datosBase.Lb / deflexionDenominador : null

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
        </div>
      </div>
    </div>
  )
}