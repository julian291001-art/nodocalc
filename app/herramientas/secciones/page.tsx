"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import { useSeccionStore } from "../../store/useSeccionStore"

type Plantilla = "rectangular" | "circular" | "tubo" | "I" | "T" | "L" | "C" | "cajon" | "Z" | "coordenadas"
type Params = Record<string, number>
type Poligono = { x: number; y: number }[]

type Elemento = {
  id: number
  plantilla: Plantilla
  params: Params
  x0: number
  y0: number
  signo: 1 | -1
  label: string
}

type ResultadoSeccion = {
  A: number; xc: number; yc: number; Icx: number; Icy: number; Ixy: number
  Sx_top: number; Sx_bot: number; Sy: number; rx: number; ry: number
  J: number; I1: number; I2: number; theta_p: number
}

// ── Geometría ──────────────────────────────────────────────────────────────
function circlePoints(cx: number, cy: number, r: number, n = 64): Poligono {
  return Array.from({ length: n }, (_, i) => ({
    x: cx + r * Math.cos(2 * Math.PI * i / n),
    y: cy + r * Math.sin(2 * Math.PI * i / n),
  }))
}

function getPoligonos(plantilla: Plantilla, p: Params): { pts: Poligono; signo: number }[] {
  const { b = 0, h = 0, t = 0, r = 0,
    bf_sup = 0, tf_sup = 0, bf_inf = 0, tf_inf = 0,
    hw = 0, tw = 0,
    t_sup = 0, t_inf = 0, t_izq = 0, t_der = 0,
    b_sup = 0, b_inf = 0,
    bf = 0, tf = 0 } = p

  switch (plantilla) {
    case "rectangular":
      return [{ pts: [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: h }, { x: 0, y: h }], signo: 1 }]

    case "circular":
      return [{ pts: circlePoints(r, r, r), signo: 1 }]

    case "tubo":
      return [
        { pts: circlePoints(r, r, r), signo: 1 },
        { pts: circlePoints(r, r, r - t), signo: -1 },
      ]

    case "I": {
      const maxBf = Math.max(bf_sup, bf_inf)
      const xInf = (maxBf - bf_inf) / 2
      const xSup = (maxBf - bf_sup) / 2
      const xAlma = (maxBf - tw) / 2
      const hTotal = tf_inf + hw + tf_sup
      return [
        { pts: [{ x: xInf, y: 0 }, { x: xInf + bf_inf, y: 0 }, { x: xInf + bf_inf, y: tf_inf }, { x: xInf, y: tf_inf }], signo: 1 },
        { pts: [{ x: xAlma, y: tf_inf }, { x: xAlma + tw, y: tf_inf }, { x: xAlma + tw, y: tf_inf + hw }, { x: xAlma, y: tf_inf + hw }], signo: 1 },
        { pts: [{ x: xSup, y: tf_inf + hw }, { x: xSup + bf_sup, y: tf_inf + hw }, { x: xSup + bf_sup, y: hTotal }, { x: xSup, y: hTotal }], signo: 1 },
      ]
    }

    case "T": {
      const xAlma = (bf - tw) / 2
      return [
        { pts: [{ x: xAlma, y: 0 }, { x: xAlma + tw, y: 0 }, { x: xAlma + tw, y: hw }, { x: xAlma, y: hw }], signo: 1 },
        { pts: [{ x: 0, y: hw }, { x: bf, y: hw }, { x: bf, y: hw + tf }, { x: 0, y: hw + tf }], signo: 1 },
      ]
    }

    case "C": {
      const maxBf = Math.max(bf_sup, bf_inf)
      const hTotal = tf_sup + hw + tf_inf
      return [{
        pts: [
          { x: 0, y: 0 }, { x: bf_inf, y: 0 }, { x: bf_inf, y: tf_inf },
          { x: tw, y: tf_inf }, { x: tw, y: tf_inf + hw },
          { x: bf_sup, y: tf_inf + hw }, { x: bf_sup, y: hTotal }, { x: 0, y: hTotal },
        ], signo: 1
      }]
    }

    case "L":
      return [{
        pts: [
          { x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: t },
          { x: t, y: t }, { x: t, y: h }, { x: 0, y: h },
        ], signo: 1
      }]

    case "cajon": {
      const bSup = b_sup || b
      const bInf = b_inf || b
      const tS = t_sup || t, tI = t_inf || t, tL = t_izq || t, tR = t_der || t
      const ext: Poligono = [{ x: 0, y: 0 }, { x: bInf, y: 0 }, { x: bSup, y: h }, { x: 0, y: h }]
      const int: Poligono = [
        { x: tL, y: tI },
        { x: bInf - tR, y: tI },
        { x: bSup - tR, y: h - tS },
        { x: tL, y: h - tS },
      ]
      return [{ pts: ext, signo: 1 }, { pts: int, signo: -1 }]
    }

    case "Z": {
      const hTotal = tf_sup + hw + tf_inf
      return [{
        pts: [
          { x: 0, y: 0 }, { x: bf_inf, y: 0 }, { x: bf_inf, y: tf_inf },
          { x: tw, y: tf_inf }, { x: tw, y: tf_inf + hw },
          { x: tw + bf_sup, y: tf_inf + hw }, { x: tw + bf_sup, y: hTotal },
          { x: tw, y: hTotal }, { x: tw, y: tf_inf + hw },
          // cierre Z
          { x: tw, y: tf_inf }, { x: bf_inf, y: tf_inf },
          { x: bf_inf, y: 0 },
        ], signo: 1
      }]
    }

    default: return []
  }
}

function offsetPoligonos(pols: { pts: Poligono; signo: number }[], x0: number, y0: number) {
  return pols.map(({ pts, signo }) => ({
    pts: pts.map(p => ({ x: p.x + x0, y: p.y + y0 })),
    signo,
  }))
}

// ── Cálculo ────────────────────────────────────────────────────────────────
function propiedadesPoligono(pts: Poligono) {
  const n = pts.length
  let A = 0, Cx = 0, Cy = 0, Ix = 0, Iy = 0, Ixy = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y
    const c = xi * yj - xj * yi
    A += c; Cx += (xi + xj) * c; Cy += (yi + yj) * c
    Ix += (yi * yi + yi * yj + yj * yj) * c
    Iy += (xi * xi + xi * xj + xj * xj) * c
    Ixy += (xi * yj + 2 * xi * yi + 2 * xj * yj + xj * yi) * c
  }
  A /= 2; Cx /= (6 * A); Cy /= (6 * A)
  return { A: Math.abs(A), Cx, Cy, Ix: Math.abs(Ix) / 12, Iy: Math.abs(Iy) / 12, Ixy: Ixy / 24 }
}

function calcularSeccion(poligonos: { pts: Poligono; signo: number }[]): ResultadoSeccion {
  let A = 0, AxC = 0, AyC = 0
  for (const { pts, signo } of poligonos) {
    const p = propiedadesPoligono(pts)
    A += signo * p.A; AxC += signo * p.A * p.Cx; AyC += signo * p.A * p.Cy
  }
  const xc = AxC / A, yc = AyC / A
  let Icx = 0, Icy = 0, Icxy = 0
  for (const { pts, signo } of poligonos) {
    const p = propiedadesPoligono(pts)
    Icx += signo * (p.Ix + p.A * (p.Cy - yc) ** 2)
    Icy += signo * (p.Iy + p.A * (p.Cx - xc) ** 2)
    Icxy += signo * (p.Ixy + p.A * (p.Cx - xc) * (p.Cy - yc))
  }
  let ymax = -Infinity, ymin = Infinity, xmaxD = -Infinity
  for (const { pts } of poligonos) for (const p of pts) {
    if (p.y > ymax) ymax = p.y; if (p.y < ymin) ymin = p.y
    if (Math.abs(p.x - xc) > xmaxD) xmaxD = Math.abs(p.x - xc)
  }
  const Sx_top = Icx / (ymax - yc), Sx_bot = Icx / (yc - ymin), Sy = Icy / xmaxD
  const rx = Math.sqrt(Math.abs(Icx / A)), ry = Math.sqrt(Math.abs(Icy / A)), J = Icx + Icy
  const theta_p = 0.5 * Math.atan2(-2 * Icxy, Icx - Icy) * 180 / Math.PI
  const R = Math.sqrt(((Icx - Icy) / 2) ** 2 + Icxy ** 2)
  return { A, xc, yc, Icx, Icy, Ixy: Icxy, Sx_top, Sx_bot, Sy, rx, ry, J, I1: (Icx + Icy) / 2 + R, I2: (Icx + Icy) / 2 - R, theta_p }
}

// ── Plantillas config ──────────────────────────────────────────────────────
const plantillasConfig: Record<Plantilla, { label: string; campos: { key: string; label: string; default: number }[] }> = {
  rectangular: { label: "Rectangular", campos: [{ key: "b", label: "Base b (cm)", default: 30 }, { key: "h", label: "Altura h (cm)", default: 50 }] },
  circular: { label: "Circular", campos: [{ key: "r", label: "Radio r (cm)", default: 20 }] },
  tubo: { label: "Tubo circular", campos: [{ key: "r", label: "Radio ext r (cm)", default: 20 }, { key: "t", label: "Espesor t (cm)", default: 2 }] },
  I: { label: "Perfil I asimétrico", campos: [{ key: "bf_sup", label: "Ancho ala sup (cm)", default: 20 }, { key: "tf_sup", label: "Espesor ala sup (cm)", default: 1.5 }, { key: "hw", label: "Alto alma (cm)", default: 30 }, { key: "tw", label: "Espesor alma (cm)", default: 1 }, { key: "bf_inf", label: "Ancho ala inf (cm)", default: 20 }, { key: "tf_inf", label: "Espesor ala inf (cm)", default: 1.5 }] },
  T: { label: "Perfil T", campos: [{ key: "bf", label: "Ancho ala (cm)", default: 20 }, { key: "tf", label: "Espesor ala (cm)", default: 2 }, { key: "hw", label: "Alto alma (cm)", default: 20 }, { key: "tw", label: "Espesor alma (cm)", default: 1.5 }] },
  L: { label: "Ángulo L", campos: [{ key: "b", label: "Ancho b (cm)", default: 10 }, { key: "h", label: "Alto h (cm)", default: 10 }, { key: "t", label: "Espesor t (cm)", default: 1 }] },
  C: { label: "Canal C asimétrico", campos: [{ key: "bf_sup", label: "Ancho ala sup (cm)", default: 10 }, { key: "tf_sup", label: "Espesor ala sup (cm)", default: 1 }, { key: "hw", label: "Alto alma (cm)", default: 20 }, { key: "tw", label: "Espesor alma (cm)", default: 1 }, { key: "bf_inf", label: "Ancho ala inf (cm)", default: 8 }, { key: "tf_inf", label: "Espesor ala inf (cm)", default: 1 }] },
  cajon: { label: "Cajón paramétrico", campos: [{ key: "b", label: "Base ref (cm)", default: 30 }, { key: "h", label: "Altura (cm)", default: 50 }, { key: "b_sup", label: "Ancho superior (cm)", default: 30 }, { key: "b_inf", label: "Ancho inferior (cm)", default: 30 }, { key: "t_sup", label: "Espesor sup (cm)", default: 2 }, { key: "t_inf", label: "Espesor inf (cm)", default: 2 }, { key: "t_izq", label: "Espesor izq (cm)", default: 2 }, { key: "t_der", label: "Espesor der (cm)", default: 2 }] },
  Z: { label: "Perfil Z", campos: [{ key: "bf_sup", label: "Ancho ala sup (cm)", default: 10 }, { key: "tf_sup", label: "Espesor ala sup (cm)", default: 1 }, { key: "hw", label: "Alto alma (cm)", default: 20 }, { key: "tw", label: "Espesor alma (cm)", default: 1 }, { key: "bf_inf", label: "Ancho ala inf (cm)", default: 10 }, { key: "tf_inf", label: "Espesor ala inf (cm)", default: 1 }] },
  coordenadas: { label: "Por coordenadas", campos: [] },
}

// ── Esquemas de referencia SVG acotados ───────────────────────────────────
function Cota({ x1, y1, x2, y2, label, offset = 12 }: { x1: number; y1: number; x2: number; y2: number; label: string; offset?: number }) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const horiz = Math.abs(y2 - y1) < 1
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1d4ed8" strokeWidth="0.8" markerStart="url(#cotaStart)" markerEnd="url(#cotaEnd)" />
      {horiz
        ? <><line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} stroke="#1d4ed8" strokeWidth="0.8" /><line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} stroke="#1d4ed8" strokeWidth="0.8" /></>
        : <><line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} stroke="#1d4ed8" strokeWidth="0.8" /><line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} stroke="#1d4ed8" strokeWidth="0.8" /></>
      }
      <text x={horiz ? mx : mx + offset} y={horiz ? my - offset / 2 : my} textAnchor="middle" fontSize="9" fill="#1d4ed8" fontWeight="500">{label}</text>
    </g>
  )
}

function EsquemaReferencia({ plantilla }: { plantilla: Plantilla }) {
  switch (plantilla) {
    case "rectangular": return (
      <svg viewBox="0 0 220 180" className="w-full h-40">
        <rect x="40" y="20" width="120" height="110" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={40} y1={148} x2={160} y2={148} label="b" />
        <Cota x1={175} y1={20} x2={175} y2={130} label="h" offset={14} />
      </svg>
    )
    case "circular": return (
      <svg viewBox="0 0 200 180" className="w-full h-40">
        <circle cx="100" cy="90" r="65" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <line x1="100" y1="90" x2="165" y2="90" stroke="#dc2626" strokeWidth="1" strokeDasharray="4,2" />
        <circle cx="100" cy="90" r="2.5" fill="#dc2626" />
        <text x="135" y="82" fontSize="11" fill="#dc2626" fontWeight="500">r</text>
      </svg>
    )
    case "tubo": return (
      <svg viewBox="0 0 200 180" className="w-full h-40">
        <circle cx="100" cy="90" r="65" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <circle cx="100" cy="90" r="48" fill="white" stroke="#1d4ed8" strokeWidth="1.5" />
        <line x1="100" y1="90" x2="165" y2="90" stroke="#dc2626" strokeWidth="1" strokeDasharray="4,2" />
        <circle cx="100" cy="90" r="2.5" fill="#dc2626" />
        <text x="135" y="82" fontSize="11" fill="#dc2626" fontWeight="500">r</text>
        <line x1="148" y1="90" x2="165" y2="90" stroke="#e11d48" strokeWidth="2" />
        <text x="157" y="104" fontSize="10" fill="#e11d48" fontWeight="500">t</text>
      </svg>
    )
    case "I": return (
      <svg viewBox="0 0 240 220" className="w-full h-44">
        {/* ala inf */}
        <rect x="20" y="170" width="120" height="18" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        {/* alma */}
        <rect x="57" y="55" width="20" height="115" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        {/* ala sup */}
        <rect x="30" y="37" width="100" height="18" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        {/* cotas */}
        <Cota x1={30} y1={25} x2={130} y2={25} label="bf_sup" />
        <Cota x1={20} y1={210} x2={140} y2={210} label="bf_inf" />
        <Cota x1={155} y1={37} x2={155} y2={55} label="tf_sup" offset={20} />
        <Cota x1={155} y1={170} x2={155} y2={188} label="tf_inf" offset={20} />
        <Cota x1={170} y1={55} x2={170} y2={170} label="hw" offset={12} />
        <Cota x1={57} y1={145} x2={77} y2={145} label="tw" />
      </svg>
    )
    case "T": return (
      <svg viewBox="0 0 220 200" className="w-full h-40">
        <rect x="20" y="20" width="140" height="20" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="72" y="40" width="26" height="120" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={20} y1={10} x2={160} y2={10} label="bf" />
        <Cota x1={170} y1={20} x2={170} y2={40} label="tf" offset={14} />
        <Cota x1={170} y1={40} x2={170} y2={160} label="hw" offset={14} />
        <Cota x1={72} y1={105} x2={98} y2={105} label="tw" />
      </svg>
    )
    case "L": return (
      <svg viewBox="0 0 200 200" className="w-full h-40">
        <polygon points="20,170 20,20 38,20 38,152 160,152 160,170" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={20} y1={185} x2={160} y2={185} label="b" />
        <Cota x1={175} y1={20} x2={175} y2={170} label="h" offset={12} />
        <Cota x1={20} y1={120} x2={38} y2={120} label="t" />
      </svg>
    )
    case "C": return (
      <svg viewBox="0 0 220 210" className="w-full h-44">
        <polygon points="20,190 20,15 100,15 100,32 38,32 38,168 120,168 120,185 20,185"
          fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={20} y1={5} x2={120} y2={5} label="bf_sup" />
        <Cota x1={20} y1={197} x2={100} y2={197} label="bf_inf" />
        <Cota x1={135} y1={15} x2={135} y2={32} label="tf_sup" offset={20} />
        <Cota x1={135} y1={168} x2={135} y2={185} label="tf_inf" offset={20} />
        <Cota x1={150} y1={32} x2={150} y2={168} label="hw" offset={12} />
        <Cota x1={20} y1={100} x2={38} y2={100} label="tw" />
      </svg>
    )
    case "cajon": return (
      <svg viewBox="0 0 240 210" className="w-full h-44">
        <polygon points="20,185 40,20 180,20 200,185" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <polygon points="38,168 55,38 165,38 182,168" fill="white" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={40} y1={10} x2={180} y2={10} label="b_sup" />
        <Cota x1={20} y1={197} x2={200} y2={197} label="b_inf" />
        <Cota x1={210} y1={20} x2={210} y2={185} label="h" offset={12} />
        <Cota x1={20} y1={100} x2={38} y2={100} label="t_izq" />
        <Cota x1={40} y1={20} x2={55} y2={38} label="t_sup" />
      </svg>
    )
    case "Z": return (
      <svg viewBox="0 0 220 210" className="w-full h-44">
        <polygon points="20,185 20,168 100,168 100,32 20,32 20,15 60,15 60,32 118,32 118,168 60,168 60,185"
          fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={20} y1={5} x2={60} y2={5} label="bf_sup" />
        <Cota x1={20} y1={197} x2={60} y2={197} label="bf_inf" />
        <Cota x1={130} y1={32} x2={130} y2={168} label="hw" offset={12} />
        <Cota x1={20} y1={100} x2={100} y2={100} label="tw" />
        <Cota x1={145} y1={15} x2={145} y2={32} label="tf_sup" offset={20} />
        <Cota x1={145} y1={168} x2={145} y2={185} label="tf_inf" offset={20} />
      </svg>
    )
    case "coordenadas": return (
      <svg viewBox="0 0 200 160" className="w-full h-32">
        <line x1="20" y1="140" x2="180" y2="140" stroke="#9ca3af" strokeWidth="1" />
        <line x1="20" y1="140" x2="20" y2="10" stroke="#9ca3af" strokeWidth="1" />
        <text x="183" y="143" fontSize="10" fill="#9ca3af">x</text>
        <text x="14" y="8" fontSize="10" fill="#9ca3af">y</text>
        <polygon points="55,120 140,120 155,60 75,45 40,80" fill="rgba(59,130,246,0.12)" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="5,3" />
        <text x="47" y="125" fontSize="8" fill="#1d4ed8">P1↻</text>
        <text x="138" y="125" fontSize="8" fill="#1d4ed8">P2</text>
        <text x="153" y="58" fontSize="8" fill="#1d4ed8">P3</text>
        <text x="70" y="42" fontSize="8" fill="#1d4ed8">P4</text>
        <text x="25" y="78" fontSize="8" fill="#1d4ed8">P5</text>
        <text x="75" y="100" fontSize="9" fill="#6b7280">↻ horario = área +</text>
        <text x="75" y="113" fontSize="9" fill="#6b7280">↺ antihorario = hueco</text>
      </svg>
    )
    default: return null
  }
}

// ── Dibujo canvas ──────────────────────────────────────────────────────────
function dibujarCanvas(
  canvas: HTMLCanvasElement,
  elementos: Elemento[],
  resultado: ResultadoSeccion | null,
  coordPts: Poligono
) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Recolectar todos los puntos
  const todosLosPts: { x: number; y: number }[] = []
  for (const el of elementos) {
    const pols = offsetPoligonos(getPoligonos(el.plantilla, el.params), el.x0, el.y0)
    for (const { pts } of pols) todosLosPts.push(...pts)
  }
  if (coordPts.length > 0) todosLosPts.push(...coordPts)
  if (todosLosPts.length === 0) return

  // Bounds — siempre incluir origen (0,0)
  let xmin = 0, xmax = 0, ymin = 0, ymax = 0
  for (const p of todosLosPts) {
    if (p.x < xmin) xmin = p.x; if (p.x > xmax) xmax = p.x
    if (p.y < ymin) ymin = p.y; if (p.y > ymax) ymax = p.y
  }

  const pad = 45
  const W = canvas.width - pad * 2
  const H = canvas.height - pad * 2
  const rangeX = xmax - xmin || 10
  const rangeY = ymax - ymin || 10
  const scale = Math.min(W / rangeX, H / rangeY) * 0.85

  // Origen del canvas = donde está (0,0) del plano
  const ox = pad + (-xmin) * scale
  const oy = canvas.height - pad - (-ymin) * scale

  const tx = (x: number) => ox + x * scale
  const ty = (y: number) => oy - y * scale

  // Cuadrícula real — espaciado en cm adaptativo
  const rawStep = rangeX / 8
  const exp = Math.floor(Math.log10(rawStep))
  const stepCm = Math.pow(10, exp) * (rawStep / Math.pow(10, exp) > 5 ? 5 : rawStep / Math.pow(10, exp) > 2 ? 2 : 1)

  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 0.5
  const xStart = Math.floor(xmin / stepCm) * stepCm
  const yStart = Math.floor(ymin / stepCm) * stepCm
  for (let gx = xStart; gx <= xmax + stepCm; gx += stepCm) {
    ctx.beginPath(); ctx.moveTo(tx(gx), 0); ctx.lineTo(tx(gx), canvas.height); ctx.stroke()
  }
  for (let gy = yStart; gy <= ymax + stepCm; gy += stepCm) {
    ctx.beginPath(); ctx.moveTo(0, ty(gy)); ctx.lineTo(canvas.width, ty(gy)); ctx.stroke()
  }

  // Etiquetas de cuadrícula
  ctx.fillStyle = "#9ca3af"; ctx.font = "9px sans-serif"; ctx.textAlign = "center"
  for (let gx = xStart; gx <= xmax + stepCm; gx += stepCm) {
    if (Math.abs(gx) < stepCm * 0.01) continue
    ctx.fillText(`${gx.toFixed(0)}`, tx(gx), canvas.height - 5)
  }
  ctx.textAlign = "right"
  for (let gy = yStart; gy <= ymax + stepCm; gy += stepCm) {
    if (Math.abs(gy) < stepCm * 0.01) continue
    ctx.fillText(`${gy.toFixed(0)}`, ox - 4, ty(gy) + 3)
  }

  // Ejes X e Y
  ctx.strokeStyle = "#6b7280"; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(canvas.width, oy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, canvas.height); ctx.stroke()
  ctx.fillStyle = "#374151"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left"
  ctx.fillText("x (cm)", canvas.width - 35, oy - 5)
  ctx.textAlign = "center"
  ctx.fillText("y (cm)", ox + 5, 12)

  // Dibujar elementos
  const colors = ["rgba(59,130,246,0.2)", "rgba(16,185,129,0.2)", "rgba(245,158,11,0.2)", "rgba(239,68,68,0.2)", "rgba(139,92,246,0.2)"]
  const strokes = ["#1d4ed8", "#059669", "#d97706", "#dc2626", "#7c3aed"]

  elementos.forEach((el, idx) => {
    const pols = offsetPoligonos(getPoligonos(el.plantilla, el.params), el.x0, el.y0)
    const color = colors[idx % colors.length]
    const stroke = strokes[idx % strokes.length]
    for (const { pts, signo } of pols) {
      ctx.beginPath()
      ctx.moveTo(tx(pts[0].x), ty(pts[0].y))
      for (const p of pts) ctx.lineTo(tx(p.x), ty(p.y))
      ctx.closePath()
      ctx.fillStyle = el.signo > 0 && signo > 0 ? color : "white"
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.8
      ctx.fill(); ctx.stroke()
    }
    // Label del elemento
    ctx.fillStyle = stroke; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"
    ctx.fillText(el.label, tx(el.x0 + 5), ty(el.y0 + 5))
  })

  // Puntos coordenadas
  if (coordPts.length > 1) {
    ctx.beginPath()
    ctx.moveTo(tx(coordPts[0].x), ty(coordPts[0].y))
    for (const p of coordPts) ctx.lineTo(tx(p.x), ty(p.y))
    ctx.closePath()
    ctx.fillStyle = "rgba(59,130,246,0.2)"; ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 1.8
    ctx.fill(); ctx.stroke()
  }

  // Centroide
  if (resultado) {
    const cx = tx(resultado.xc), cy = ty(resultado.yc)
    ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fillStyle = "#dc2626"; ctx.fill()
    ctx.fillStyle = "#dc2626"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
    ctx.fillText(`C(${resultado.xc.toFixed(1)}, ${resultado.yc.toFixed(1)})`, cx + 6, cy - 6)
  }
}

// ── Formato ────────────────────────────────────────────────────────────────
function fmt(n: number, dec = 4) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(dec)
}

// ── Componente principal ───────────────────────────────────────────────────
export default function SectionBuilder() {
  const [elementos, setElementos] = useState<Elemento[]>([])
  const [plantillaActual, setPlantillaActual] = useState<Plantilla>("rectangular")
  const [paramsActuales, setParamsActuales] = useState<Params>({ b: 30, h: 50 })
  const [x0, setX0] = useState("0")
  const [y0, setY0] = useState("0")
  const [signoActual, setSignoActual] = useState<1 | -1>(1)
  const [resultado, setResultado] = useState<ResultadoSeccion | null>(null)
  const [coordInput, setCoordInput] = useState("")
  const [coordPts, setCoordPts] = useState<Poligono>([])
  const [ptoX, setPtoX] = useState("")
  const [ptoY, setPtoY] = useState("")
  const [mostrarAgregar, setMostrarAgregar] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setSeccion = useSeccionStore((s) => s.setSeccion)
  const router = useRouter()
  let nextId = useRef(1)

  useEffect(() => {
    if (canvasRef.current) dibujarCanvas(canvasRef.current, elementos, resultado, coordPts)
  }, [elementos, resultado, coordPts])

  const handlePlantilla = (p: Plantilla) => {
    setPlantillaActual(p)
    const defaults: Params = {}
    plantillasConfig[p].campos.forEach(c => { defaults[c.key] = c.default })
    setParamsActuales(defaults)
  }

  const agregarElemento = () => {
    const el: Elemento = {
      id: nextId.current++,
      plantilla: plantillaActual,
      params: { ...paramsActuales },
      x0: parseFloat(x0) || 0,
      y0: parseFloat(y0) || 0,
      signo: signoActual,
      label: `E${nextId.current - 1}`,
    }
    const nuevos = [...elementos, el]
    setElementos(nuevos)
    calcularConElementos(nuevos)
    setMostrarAgregar(false)
  }

  const agregarCoordenadas = () => {
    try {
      const lineas = coordInput.trim().split("\n").filter(l => l.trim())
      const pts: Poligono = lineas.map(l => { const [x, y] = l.split(",").map(Number); return { x, y } })
      setCoordPts(pts)
      const el: Elemento = {
        id: nextId.current++,
        plantilla: "coordenadas",
        params: {},
        x0: 0, y0: 0, signo: 1,
        label: `Coord${nextId.current - 1}`,
      }
      const nuevos = [...elementos, el]
      setElementos(nuevos)
      const pols = [{ pts, signo: 1 }]
      const res = calcularSeccion(pols)
      setResultado(res)
    } catch {
      alert("Error en coordenadas. Formato: x,y por línea")
    }
  }

  const calcularConElementos = (els: Elemento[]) => {
    if (els.length === 0) { setResultado(null); return }
    const todosPoligonos: { pts: Poligono; signo: number }[] = []
    for (const el of els) {
      if (el.plantilla === "coordenadas") { todosPoligonos.push(...[{ pts: coordPts, signo: el.signo }]); continue }
      const pols = offsetPoligonos(getPoligonos(el.plantilla, el.params), el.x0, el.y0)
      todosPoligonos.push(...pols.map(p => ({ ...p, signo: p.signo * el.signo })))
    }
    if (todosPoligonos.length === 0) return
    const res = calcularSeccion(todosPoligonos)
    setResultado(res)
  }

  const eliminarElemento = (id: number) => {
    const nuevos = elementos.filter(e => e.id !== id)
    setElementos(nuevos)
    calcularConElementos(nuevos)
  }

  const calcularSteiner = () => {
    if (!resultado) return null
    const x = parseFloat(ptoX), y = parseFloat(ptoY)
    if (isNaN(x) || isNaN(y)) return null
    return {
      Ix: resultado.Icx + resultado.A * (y - resultado.yc) ** 2,
      Iy: resultado.Icy + resultado.A * (x - resultado.xc) ** 2,
    }
  }

  const cargarEnModulo = (modulo: string) => {
    if (!resultado) return
    setSeccion({
      nombre: `Sección compuesta (${elementos.length} elementos)`,
      A: resultado.A, Icx: resultado.Icx, Icy: resultado.Icy,
      Sx_top: resultado.Sx_top, Sx_bot: resultado.Sx_bot, Sy: resultado.Sy,
      rx: resultado.rx, ry: resultado.ry, J: resultado.J,
      E: null, fc: null, ft: null, fy: null,
    }, "secciones")
    router.push(`/${modulo}`)
  }

  const steiner = calcularSteiner()

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Section Builder</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">

            {/* Panel izquierdo */}
            <div className="flex flex-col gap-4">

              {/* Lista de elementos */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">ELEMENTOS DE LA SECCIÓN</div>
                  <button onClick={() => setMostrarAgregar(!mostrarAgregar)}
                    className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">
                    + Agregar elemento
                  </button>
                </div>

                {elementos.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-4">
                    Agrega elementos para componer la sección
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {elementos.map((el, idx) => {
                    const colors = ["#1d4ed8", "#059669", "#d97706", "#dc2626", "#7c3aed"]
                    return (
                      <div key={el.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: colors[idx % colors.length] }}></div>
                          <span className="text-sm text-gray-800 font-medium">{el.label}</span>
                          <span className="text-xs text-gray-500">{plantillasConfig[el.plantilla].label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${el.signo > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                            {el.signo > 0 ? "+ suma" : "− resta"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">({el.x0},{el.y0})</span>
                          <button onClick={() => eliminarElemento(el.id)} className="text-xs text-red-400 hover:underline">×</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Formulario agregar */}
                {mostrarAgregar && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-xs text-blue-700 font-medium mb-3">NUEVO ELEMENTO</div>

                    {/* Tipo */}
                    <div className="text-xs text-gray-500 mb-2">Tipo de sección</div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(Object.keys(plantillasConfig) as Plantilla[]).map(p => (
                        <button key={p} onClick={() => handlePlantilla(p)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${plantillaActual === p ? "bg-blue-700 text-white border-blue-700" : "text-gray-600 border-gray-300 hover:border-blue-300"}`}>
                          {plantillasConfig[p].label}
                        </button>
                      ))}
                    </div>

                    {/* Esquema */}
                    <div className="bg-white rounded-lg p-2 mb-3 border border-blue-100">
                      <div className="text-xs text-gray-400 mb-1">Referencia de dimensiones</div>
                      <EsquemaReferencia plantilla={plantillaActual} />
                    </div>

                    {/* Campos */}
                    {plantillaActual === "coordenadas" ? (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">Coordenadas (x,y) una por línea — horario = suma, antihorario = hueco</div>
                        <textarea value={coordInput} onChange={e => setCoordInput(e.target.value)}
                          placeholder={"0,0\n30,0\n30,50\n0,50"} rows={5}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-400" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {plantillasConfig[plantillaActual].campos.map(c => (
                          <div key={c.key}>
                            <div className="text-xs text-gray-500 mb-0.5">{c.label}</div>
                            <input type="number" value={paramsActuales[c.key] ?? ""}
                              onChange={e => setParamsActuales({ ...paramsActuales, [c.key]: parseFloat(e.target.value) })}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Posición y signo */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">x₀ (cm)</div>
                        <input type="number" value={x0} onChange={e => setX0(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">y₀ (cm)</div>
                        <input type="number" value={y0} onChange={e => setY0(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">Operación</div>
                        <select value={signoActual} onChange={e => setSignoActual(parseInt(e.target.value) as 1 | -1)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400">
                          <option value={1}>+ Suma</option>
                          <option value={-1}>− Resta</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={plantillaActual === "coordenadas" ? agregarCoordenadas : agregarElemento}
                        className="text-xs bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">
                        Agregar a la sección
                      </button>
                      <button onClick={() => setMostrarAgregar(false)}
                        className="text-xs text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Steiner */}
              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">INERCIA EN PUNTO SOLICITADO</div>
                  <div className="text-xs text-gray-500 mb-3">Inercia respecto a ejes paralelos que pasan por (x,y) — Teorema de Steiner.</div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">x (cm)</div>
                      <input type="number" value={ptoX} onChange={e => setPtoX(e.target.value)} placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">y (cm)</div>
                      <input type="number" value={ptoY} onChange={e => setPtoY(e.target.value)} placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    </div>
                  </div>
                  {steiner && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-500">Ix' (cm⁴)</div>
                        <div className="text-sm font-medium text-blue-900">{fmt(steiner.Ix)}</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-500">Iy' (cm⁴)</div>
                        <div className="text-sm font-medium text-blue-900">{fmt(steiner.Iy)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cargar en módulo */}
              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CARGAR EN MÓDULO</div>
                  <div className="flex flex-wrap gap-2">
                    {[{ key: "vigas", label: "Vigas" }, { key: "porticos", label: "Pórticos" }, { key: "armaduras", label: "Armaduras" }, { key: "matricial", label: "Método Matricial" }, { key: "pandeo", label: "Pandeo" }, { key: "diseno", label: "Diseño Estructural" }].map(mod => (
                      <button key={mod.key} onClick={() => cargarEnModulo(mod.key)}
                        className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">
                        → {mod.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Panel derecho */}
            <div className="flex flex-col gap-4">

              {/* Canvas */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PLANO CARTESIANO (cm)</div>
                <canvas ref={canvasRef} width={440} height={360}
                  className="w-full border border-gray-100 rounded-lg bg-white" />
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-200 border border-blue-700 inline-block rounded-sm"></span> Área positiva</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-white border border-blue-700 inline-block rounded-sm"></span> Área negativa (hueco)</span>
                  <span className="flex items-center gap-1"><span className="text-red-600 font-bold">⊕</span> Centroide C(x̄,ȳ)</span>
                </div>
              </div>

              {/* Resultados */}
              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-4">PROPIEDADES DE LA SECCIÓN COMPUESTA</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Prop s="A" n="Área total" v={`${fmt(resultado.A)} cm²`} />
                    <Prop s="x̄" n="Centroide x" v={`${fmt(resultado.xc)} cm`} />
                    <Prop s="ȳ" n="Centroide y" v={`${fmt(resultado.yc)} cm`} />
                    <Prop s="Icx" n="Inercia centroidal x" v={`${fmt(resultado.Icx)} cm⁴`} />
                    <Prop s="Icy" n="Inercia centroidal y" v={`${fmt(resultado.Icy)} cm⁴`} />
                    <Prop s="Ixy" n="Inercia producto" v={`${fmt(resultado.Ixy)} cm⁴`} />
                    <Prop s="Sx⁺" n="Módulo resistente sup." v={`${fmt(resultado.Sx_top)} cm³`} />
                    <Prop s="Sx⁻" n="Módulo resistente inf." v={`${fmt(resultado.Sx_bot)} cm³`} />
                    <Prop s="Sy" n="Módulo resistente y" v={`${fmt(resultado.Sy)} cm³`} />
                    <Prop s="rx" n="Radio de giro x" v={`${fmt(resultado.rx)} cm`} />
                    <Prop s="ry" n="Radio de giro y" v={`${fmt(resultado.ry)} cm`} />
                    <Prop s="J" n="Momento polar" v={`${fmt(resultado.J)} cm⁴`} />
                    <Prop s="I₁" n="Inercia principal máx." v={`${fmt(resultado.I1)} cm⁴`} />
                    <Prop s="I₂" n="Inercia principal mín." v={`${fmt(resultado.I2)} cm⁴`} />
                    <Prop s="θp" n="Ángulo ejes principales" v={`${fmt(resultado.theta_p, 2)}°`} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Prop({ s, n, v }: { s: string; n: string; v: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-blue-700 font-medium text-sm">{s}</span>
        <span className="text-xs text-gray-500">{n}</span>
      </div>
      <div className="text-sm font-medium text-gray-800">{v}</div>
    </div>
  )
}