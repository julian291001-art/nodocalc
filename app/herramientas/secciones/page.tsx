"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import { useSeccionStore } from "../../store/useSeccionStore"

type Plantilla = "rectangular" | "circular" | "tubo" | "I" | "T" | "L" | "C" | "cajon" | "coordenadas"
type Params = Record<string, number>
type Poligono = { x: number; y: number }[]

type Elemento = {
  id: number; plantilla: Plantilla; params: Params
  x0: number; y0: number; signo: 1 | -1; label: string
  coordPts?: Poligono
}

type ResultadoSeccion = {
  A: number; xc: number; yc: number; Icx: number; Icy: number; Ixy: number
  Sx_top: number; Sx_bot: number; Sy: number; rx: number; ry: number
  J: number; I1: number; I2: number; theta_p: number
}

function circlePoints(cx: number, cy: number, r: number, n = 512): Poligono {
  return Array.from({ length: n }, (_, i) => ({
    x: cx + r * Math.cos(2 * Math.PI * i / n),
    y: cy + r * Math.sin(2 * Math.PI * i / n),
  }))
}

function getPoligonos(plantilla: Plantilla, p: Params): { pts: Poligono; signo: number }[] {
  const { b = 0, h = 0, t = 0, r = 0, bf_sup = 0, tf_sup = 0, bf_inf = 0, tf_inf = 0, hw = 0, tw = 0, t_sup = 0, t_inf = 0, t_izq = 0, t_der = 0, b_sup = 0, b_inf = 0, bf = 0, tf = 0, x_alma = 0, x_sup = 0 } = p

  switch (plantilla) {
    case "rectangular":
      return [{ pts: [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: h }, { x: 0, y: h }], signo: 1 }]
    case "circular":
      return [{ pts: circlePoints(r, r, r), signo: 1 }]
    case "tubo":
      return [{ pts: circlePoints(r, r, r), signo: 1 }, { pts: circlePoints(r, r, r - t), signo: -1 }]
    case "I": {
      const hTotal = tf_inf + hw + tf_sup
      return [
        { pts: [{ x: 0, y: 0 }, { x: bf_inf, y: 0 }, { x: bf_inf, y: tf_inf }, { x: 0, y: tf_inf }], signo: 1 },
        { pts: [{ x: x_alma, y: tf_inf }, { x: x_alma + tw, y: tf_inf }, { x: x_alma + tw, y: tf_inf + hw }, { x: x_alma, y: tf_inf + hw }], signo: 1 },
        { pts: [{ x: x_sup, y: tf_inf + hw }, { x: x_sup + bf_sup, y: tf_inf + hw }, { x: x_sup + bf_sup, y: hTotal }, { x: x_sup, y: hTotal }], signo: 1 },
      ]
    }
    case "T": {
      const xA = (bf - tw) / 2
      return [
        { pts: [{ x: xA, y: 0 }, { x: xA + tw, y: 0 }, { x: xA + tw, y: hw }, { x: xA, y: hw }], signo: 1 },
        { pts: [{ x: 0, y: hw }, { x: bf, y: hw }, { x: bf, y: hw + tf }, { x: 0, y: hw + tf }], signo: 1 },
      ]
    }
    case "C": {
      const hTotal = tf_inf + hw + tf_sup
      return [{
        pts: [
          { x: 0, y: 0 }, { x: bf_inf, y: 0 }, { x: bf_inf, y: tf_inf },
          { x: tw, y: tf_inf }, { x: tw, y: tf_inf + hw },
          { x: bf_sup, y: tf_inf + hw }, { x: bf_sup, y: hTotal }, { x: 0, y: hTotal },
        ], signo: 1
      }]
    }
    case "L":
      return [{ pts: [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: t }, { x: t, y: t }, { x: t, y: h }, { x: 0, y: h }], signo: 1 }]
    case "cajon": {
      const bS = b_sup || b, bI = b_inf || b
      const tS = t_sup || t, tI = t_inf || t, tL = t_izq || t, tR = t_der || t
      return [
        { pts: [{ x: 0, y: 0 }, { x: bI, y: 0 }, { x: bS, y: h }, { x: 0, y: h }], signo: 1 },
        { pts: [{ x: tL, y: tI }, { x: bI - tR, y: tI }, { x: bS - tR, y: h - tS }, { x: tL, y: h - tS }], signo: -1 },
      ]
    }
    default: return []
  }
}

function offsetPoligonos(pols: { pts: Poligono; signo: number }[], x0: number, y0: number) {
  return pols.map(({ pts, signo }) => ({ pts: pts.map(p => ({ x: p.x + x0, y: p.y + y0 })), signo }))
}

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
    const Icx_propio = p.Ix - p.A * p.Cy * p.Cy
    const Icy_propio = p.Iy - p.A * p.Cx * p.Cx
    const Icxy_propio = p.Ixy - p.A * p.Cx * p.Cy
    Icx += signo * (Icx_propio + p.A * (p.Cy - yc) ** 2)
    Icy += signo * (Icy_propio + p.A * (p.Cx - xc) ** 2)
    Icxy += signo * (Icxy_propio + p.A * (p.Cx - xc) * (p.Cy - yc))
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

const plantillasConfig: Record<Plantilla, { label: string; campos: { key: string; labelHtml: string; default: number }[] }> = {
  rectangular: { label: "Rectangular", campos: [{ key: "b", labelHtml: "Base <i>b</i> (cm)", default: 30 }, { key: "h", labelHtml: "Altura <i>h</i> (cm)", default: 50 }] },
  circular: { label: "Circular", campos: [{ key: "r", labelHtml: "Radio <i>r</i> (cm)", default: 20 }] },
  tubo: { label: "Tubo circular", campos: [{ key: "r", labelHtml: "Radio exterior <i>r</i> (cm)", default: 20 }, { key: "t", labelHtml: "Espesor <i>t</i> (cm)", default: 2 }] },
  I: { label: "Perfil I asimétrico", campos: [
    { key: "bf_inf", labelHtml: "Ancho ala inferior b<sub>f,inf</sub> (cm)", default: 20 },
    { key: "tf_inf", labelHtml: "Espesor ala inferior t<sub>f,inf</sub> (cm)", default: 1.5 },
    { key: "x_alma", labelHtml: "Posición alma x<sub>alma</sub> desde borde izq. ala inf (cm)", default: 9.5 },
    { key: "tw", labelHtml: "Espesor alma t<sub>w</sub> (cm)", default: 1 },
    { key: "hw", labelHtml: "Alto alma h<sub>w</sub> (cm)", default: 30 },
    { key: "x_sup", labelHtml: "Posición ala sup x<sub>sup</sub> desde borde izq. ala inf (cm)", default: 2 },
    { key: "bf_sup", labelHtml: "Ancho ala superior b<sub>f,sup</sub> (cm)", default: 16 },
    { key: "tf_sup", labelHtml: "Espesor ala superior t<sub>f,sup</sub> (cm)", default: 1.5 },
  ]},
  T: { label: "Perfil T", campos: [
    { key: "bf", labelHtml: "Ancho ala b<sub>f</sub> (cm)", default: 20 },
    { key: "tf", labelHtml: "Espesor ala t<sub>f</sub> (cm)", default: 2 },
    { key: "hw", labelHtml: "Alto alma h<sub>w</sub> (cm)", default: 20 },
    { key: "tw", labelHtml: "Espesor alma t<sub>w</sub> (cm)", default: 1.5 },
  ]},
  L: { label: "Ángulo L", campos: [
    { key: "b", labelHtml: "Ancho <i>b</i> (cm)", default: 10 },
    { key: "h", labelHtml: "Alto <i>h</i> (cm)", default: 10 },
    { key: "t", labelHtml: "Espesor <i>t</i> (cm)", default: 1 },
  ]},
  C: { label: "Canal C asimétrico", campos: [
    { key: "bf_sup", labelHtml: "Ancho ala superior b<sub>f,sup</sub> (cm)", default: 10 },
    { key: "tf_sup", labelHtml: "Espesor ala superior t<sub>f,sup</sub> (cm)", default: 1 },
    { key: "tw", labelHtml: "Espesor alma t<sub>w</sub> (cm)", default: 1 },
    { key: "hw", labelHtml: "Alto alma h<sub>w</sub> (cm)", default: 20 },
    { key: "bf_inf", labelHtml: "Ancho ala inferior b<sub>f,inf</sub> (cm)", default: 8 },
    { key: "tf_inf", labelHtml: "Espesor ala inferior t<sub>f,inf</sub> (cm)", default: 1 },
  ]},
  cajon: { label: "Cajón paramétrico", campos: [
    { key: "b_sup", labelHtml: "Ancho superior b<sub>sup</sub> (cm)", default: 30 },
    { key: "b_inf", labelHtml: "Ancho inferior b<sub>inf</sub> (cm)", default: 30 },
    { key: "h", labelHtml: "Altura <i>h</i> (cm)", default: 50 },
    { key: "t_sup", labelHtml: "Espesor superior t<sub>sup</sub> (cm)", default: 2 },
    { key: "t_inf", labelHtml: "Espesor inferior t<sub>inf</sub> (cm)", default: 2 },
    { key: "t_izq", labelHtml: "Espesor izquierdo t<sub>izq</sub> (cm)", default: 2 },
    { key: "t_der", labelHtml: "Espesor derecho t<sub>der</sub> (cm)", default: 2 },
  ]},
  coordenadas: { label: "Por coordenadas", campos: [] },
}

type LabelPart = { text: string; sub?: boolean }

function SvgLabel({ x, y, parts }: { x: number; y: number; parts: LabelPart[] }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="9" fill="#1d4ed8" fontWeight="600">
      {parts.map((p, i) =>
        p.sub
          ? <tspan key={i} fontSize="7" dy="2">{p.text}<tspan dy="-2"> </tspan></tspan>
          : <tspan key={i}>{p.text}</tspan>
      )}
    </text>
  )
}

function Cota({ x1, y1, x2, y2, parts, off = 14 }: {
  x1: number; y1: number; x2: number; y2: number; parts: LabelPart[]; off?: number
}) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const horiz = Math.abs(y2 - y1) < 2
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1d4ed8" strokeWidth="0.8" />
      {horiz
        ? <><line x1={x1} y1={y1 - 5} x2={x1} y2={y1 + 5} stroke="#1d4ed8" strokeWidth="0.8" /><line x1={x2} y1={y2 - 5} x2={x2} y2={y2 + 5} stroke="#1d4ed8" strokeWidth="0.8" /></>
        : <><line x1={x1 - 5} y1={y1} x2={x1 + 5} y2={y1} stroke="#1d4ed8" strokeWidth="0.8" /><line x1={x2 - 5} y1={y2} x2={x2 + 5} y2={y2} stroke="#1d4ed8" strokeWidth="0.8" /></>
      }
      <SvgLabel x={horiz ? mx : mx + off} y={horiz ? my - off / 2 : my + 4} parts={parts} />
    </g>
  )
}

function lbl(main: string, sub?: string): LabelPart[] {
  if (!sub) return [{ text: main }]
  return [{ text: main }, { text: sub, sub: true }]
}

function EsquemaReferencia({ plantilla }: { plantilla: Plantilla }) {
  switch (plantilla) {
    case "rectangular": return (
      <svg viewBox="0 0 220 180" className="w-full h-40">
        <rect x="40" y="20" width="120" height="110" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={40} y1={148} x2={160} y2={148} parts={lbl("b")} />
        <Cota x1={178} y1={20} x2={178} y2={130} parts={lbl("h")} off={12} />
      </svg>
    )
    case "circular": return (
      <svg viewBox="0 0 200 180" className="w-full h-40">
        <circle cx="100" cy="90" r="65" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <line x1="100" y1="90" x2="165" y2="90" stroke="#dc2626" strokeWidth="1.2" strokeDasharray="4,2" />
        <circle cx="100" cy="90" r="3" fill="#dc2626" />
        <text x="132" y="82" fontSize="11" fill="#dc2626" fontStyle="italic" fontWeight="600">r</text>
      </svg>
    )
    case "tubo": return (
      <svg viewBox="0 0 200 180" className="w-full h-40">
        <circle cx="100" cy="90" r="65" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <circle cx="100" cy="90" r="48" fill="white" stroke="#1d4ed8" strokeWidth="1.5" />
        <line x1="100" y1="90" x2="165" y2="90" stroke="#dc2626" strokeWidth="1.2" strokeDasharray="4,2" />
        <circle cx="100" cy="90" r="3" fill="#dc2626" />
        <text x="128" y="82" fontSize="10" fill="#dc2626" fontStyle="italic">r</text>
        <line x1="148" y1="90" x2="165" y2="90" stroke="#e11d48" strokeWidth="1.5" />
        <line x1="148" y1="86" x2="148" y2="94" stroke="#e11d48" strokeWidth="1" />
        <line x1="165" y1="86" x2="165" y2="94" stroke="#e11d48" strokeWidth="1" />
        <text x="157" y="104" fontSize="9" fill="#e11d48" fontStyle="italic">t</text>
      </svg>
    )
    case "I": return (
      <svg viewBox="0 0 300 290" className="w-full h-56">
        <rect x="20" y="230" width="130" height="18" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="60" y="95" width="16" height="135" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="40" y="77" width="100" height="18" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={20} y1={262} x2={150} y2={262} parts={lbl("b", "f,inf")} />
        <Cota x1={170} y1={230} x2={170} y2={248} parts={lbl("t", "f,inf")} off={26} />
        <Cota x1={20} y1={220} x2={60} y2={220} parts={lbl("x", "alma")} />
        <Cota x1={60} y1={162} x2={76} y2={162} parts={lbl("t", "w")} />
        <Cota x1={190} y1={95} x2={190} y2={230} parts={lbl("h", "w")} off={14} />
        <Cota x1={20} y1={87} x2={40} y2={87} parts={lbl("x", "sup")} />
        <Cota x1={40} y1={65} x2={140} y2={65} parts={lbl("b", "f,sup")} />
        <Cota x1={170} y1={77} x2={170} y2={95} parts={lbl("t", "f,sup")} off={26} />
      </svg>
    )
    case "T": return (
      <svg viewBox="0 0 230 210" className="w-full h-44">
        <rect x="20" y="20" width="150" height="18" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="82" y="38" width="26" height="130" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={20} y1={8} x2={170} y2={8} parts={lbl("b", "f")} />
        <Cota x1={185} y1={20} x2={185} y2={38} parts={lbl("t", "f")} off={16} />
        <Cota x1={185} y1={38} x2={185} y2={168} parts={lbl("h", "w")} off={14} />
        <Cota x1={82} y1={120} x2={108} y2={120} parts={lbl("t", "w")} />
      </svg>
    )
    case "L": return (
      <svg viewBox="0 0 210 210" className="w-full h-44">
        <polygon points="20,180 20,20 38,20 38,162 170,162 170,180" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={20} y1={196} x2={170} y2={196} parts={lbl("b")} />
        <Cota x1={185} y1={20} x2={185} y2={180} parts={lbl("h")} off={12} />
        <Cota x1={20} y1={115} x2={38} y2={115} parts={lbl("t")} />
      </svg>
    )
    case "C": return (
      <svg viewBox="0 0 270 270" className="w-full h-56">
        <rect x="20" y="20" width="120" height="18" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="20" y="38" width="16" height="155" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="20" y="193" width="100" height="18" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={20} y1={8} x2={140} y2={8} parts={lbl("b", "f,sup")} />
        <Cota x1={155} y1={20} x2={155} y2={38} parts={lbl("t", "f,sup")} off={26} />
        <Cota x1={20} y1={115} x2={36} y2={115} parts={lbl("t", "w")} />
        <Cota x1={155} y1={38} x2={155} y2={193} parts={lbl("h", "w")} off={14} />
        <Cota x1={20} y1={228} x2={120} y2={228} parts={lbl("b", "f,inf")} />
        <Cota x1={155} y1={193} x2={155} y2={211} parts={lbl("t", "f,inf")} off={26} />
      </svg>
    )
    case "cajon": return (
      <svg viewBox="0 0 270 240" className="w-full h-48">
        <rect x="20" y="20" width="180" height="180" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="38" y="38" width="144" height="144" fill="white" stroke="#1d4ed8" strokeWidth="1.5" />
        <Cota x1={20} y1={8} x2={200} y2={8} parts={lbl("b", "sup")} />
        <Cota x1={215} y1={20} x2={215} y2={200} parts={lbl("h")} off={12} />
        <Cota x1={20} y1={110} x2={38} y2={110} parts={lbl("t", "izq")} />
        <Cota x1={110} y1={20} x2={110} y2={38} parts={lbl("t", "sup")} off={18} />
        <Cota x1={182} y1={110} x2={200} y2={110} parts={lbl("t", "der")} />
        <Cota x1={110} y1={182} x2={110} y2={200} parts={lbl("t", "inf")} off={18} />
        <text x="110" y="232" textAnchor="middle" fontSize="8" fill="#6b7280">
          <tspan fontStyle="italic">b</tspan>
          <tspan fontSize="6" dy="2">inf</tspan>
          <tspan dy="-2"> independiente</tspan>
        </text>
      </svg>
    )
    case "coordenadas": return (
      <svg viewBox="0 0 220 180" className="w-full h-36">
        <line x1="20" y1="155" x2="200" y2="155" stroke="#9ca3af" strokeWidth="1" />
        <line x1="20" y1="155" x2="20" y2="10" stroke="#9ca3af" strokeWidth="1" />
        <text x="203" y="158" fontSize="10" fill="#9ca3af">x</text>
        <text x="14" y="8" fontSize="10" fill="#9ca3af">y</text>
        <polygon points="60,130 150,130 170,60 80,40 45,90"
          fill="rgba(59,130,246,0.12)" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="5,3" />
        <text x="52" y="136" fontSize="8" fill="#1d4ed8">P₁</text>
        <text x="148" y="136" fontSize="8" fill="#1d4ed8">P₂</text>
        <text x="168" y="58" fontSize="8" fill="#1d4ed8">P₃</text>
        <text x="74" y="38" fontSize="8" fill="#1d4ed8">P₄</text>
        <text x="28" y="88" fontSize="8" fill="#1d4ed8">P₅</text>
        <text x="110" y="115" fontSize="8" fill="#6b7280">sentido horario → área +</text>
        <text x="110" y="127" fontSize="8" fill="#6b7280">usar − Resta para huecos</text>
      </svg>
    )
    default: return null
  }
}

function niceStep(range: number, targetTicks = 5): number {
  const raw = range / targetTicks
  const exp = Math.floor(Math.log10(raw || 1))
  const base = Math.pow(10, exp)
  if (raw / base > 5) return base * 5
  if (raw / base > 2) return base * 2
  return base
}

function dibujarCanvas(canvas: HTMLCanvasElement, elementos: Elemento[], resultado: ResultadoSeccion | null) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const todosLosPts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  for (const el of elementos) {
    if (el.plantilla === "coordenadas") {
      if (el.coordPts) todosLosPts.push(...el.coordPts)
      continue
    }
    const pols = offsetPoligonos(getPoligonos(el.plantilla, el.params), el.x0, el.y0)
    for (const { pts } of pols) todosLosPts.push(...pts)
  }

  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity
  for (const p of todosLosPts) {
    if (p.x < xmin) xmin = p.x; if (p.x > xmax) xmax = p.x
    if (p.y < ymin) ymin = p.y; if (p.y > ymax) ymax = p.y
  }
  if (xmax - xmin < 1) { xmin -= 5; xmax += 5 }
  if (ymax - ymin < 1) { ymin -= 5; ymax += 5 }

  const padL = 50, padR = 20, padT = 20, padB = 30
  const W = canvas.width - padL - padR
  const H = canvas.height - padT - padB
  const mg = 0.15
  const scale = Math.min(W / ((xmax - xmin) * (1 + mg * 2)), H / ((ymax - ymin) * (1 + mg * 2)))
  const ox = padL + (-xmin + (xmax - xmin) * mg) * scale
  const oy = canvas.height - padB - (-ymin + (ymax - ymin) * mg) * scale
  const tx = (x: number) => ox + x * scale
  const ty = (y: number) => oy - y * scale
  const stepX = niceStep(xmax - xmin)
  const stepY = niceStep(ymax - ymin)

  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 0.5
  const x0g = Math.floor((xmin - (xmax - xmin) * mg) / stepX) * stepX
  const x1g = xmax + (xmax - xmin) * mg + stepX * 2
  for (let gx = x0g; gx <= x1g; gx = parseFloat((gx + stepX).toFixed(10))) {
    ctx.beginPath(); ctx.moveTo(tx(gx), 0); ctx.lineTo(tx(gx), canvas.height); ctx.stroke()
  }
  const y0g = Math.floor((ymin - (ymax - ymin) * mg) / stepY) * stepY
  const y1g = ymax + (ymax - ymin) * mg + stepY * 2
  for (let gy = y0g; gy <= y1g; gy = parseFloat((gy + stepY).toFixed(10))) {
    ctx.beginPath(); ctx.moveTo(0, ty(gy)); ctx.lineTo(canvas.width, ty(gy)); ctx.stroke()
  }

  ctx.fillStyle = "#9ca3af"; ctx.font = "9px sans-serif"; ctx.textAlign = "center"
  let lastLX = -Infinity
  for (let gx = x0g; gx <= x1g; gx = parseFloat((gx + stepX).toFixed(10))) {
    const px = tx(gx)
    if (px < padL || px > canvas.width - padR || px - lastLX < 30) continue
    lastLX = px
    ctx.fillText(Number.isInteger(gx) ? `${gx}` : `${parseFloat(gx.toFixed(2))}`, px, canvas.height - 6)
  }
  ctx.textAlign = "right"
  let lastLY = Infinity
  for (let gy = y0g; gy <= y1g; gy = parseFloat((gy + stepY).toFixed(10))) {
    const py = ty(gy)
    if (py < padT || py > canvas.height - padB || lastLY - py < 20) continue
    lastLY = py
    ctx.fillText(Number.isInteger(gy) ? `${gy}` : `${parseFloat(gy.toFixed(2))}`, padL - 4, py + 3)
  }

  ctx.strokeStyle = "#6b7280"; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(canvas.width, oy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, canvas.height); ctx.stroke()
  ctx.fillStyle = "#374151"; ctx.font = "bold 10px sans-serif"
  ctx.textAlign = "left"; ctx.fillText("x (cm)", canvas.width - 38, oy - 4)
  ctx.textAlign = "center"; ctx.fillText("y (cm)", ox + 4, padT - 6)

  const fills = ["rgba(59,130,246,0.2)", "rgba(16,185,129,0.2)", "rgba(245,158,11,0.2)", "rgba(239,68,68,0.2)", "rgba(139,92,246,0.2)"]
  const strokes = ["#1d4ed8", "#059669", "#d97706", "#dc2626", "#7c3aed"]

  elementos.forEach((el, idx) => {
    const pols = el.plantilla === "coordenadas"
      ? [{ pts: el.coordPts || [], signo: 1 as const }]
      : offsetPoligonos(getPoligonos(el.plantilla, el.params), el.x0, el.y0)
    const fill = fills[idx % fills.length]
    const stroke = strokes[idx % strokes.length]
    for (const { pts, signo } of pols) {
      if (pts.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(tx(pts[0].x), ty(pts[0].y))
      for (const p of pts) ctx.lineTo(tx(p.x), ty(p.y))
      ctx.closePath()
      ctx.fillStyle = el.signo > 0 && signo > 0 ? fill : "rgba(255,255,255,0.95)"
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.8
      ctx.fill(); ctx.stroke()
    }
    if (el.plantilla !== "coordenadas") {
      ctx.fillStyle = stroke; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"
      ctx.fillText(el.label, tx(el.x0 + 3), ty(el.y0 + 3))
    }
  })

  if (resultado) {
    const cx = tx(resultado.xc), cy = ty(resultado.yc)
    ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = "#dc2626"; ctx.fill()
    ctx.fillStyle = "#dc2626"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
    ctx.fillText(`C(${resultado.xc.toFixed(2)}, ${resultado.yc.toFixed(2)})`, cx + 7, cy - 5)
  }
}

function fmt(n: number, dec = 4) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(dec)
}

export default function SectionBuilder() {
  const [elementos, setElementos] = useState<Elemento[]>([])
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [plantillaActual, setPlantillaActual] = useState<Plantilla>("rectangular")
  const [paramsActuales, setParamsActuales] = useState<Params>({ b: 30, h: 50 })
  const [x0, setX0] = useState("0")
  const [y0, setY0] = useState("0")
  const [signoActual, setSignoActual] = useState<1 | -1>(1)
  const [resultado, setResultado] = useState<ResultadoSeccion | null>(null)
  const [coordInput, setCoordInput] = useState("")
  const [ptoX, setPtoX] = useState("")
  const [ptoY, setPtoY] = useState("")
  const [mostrarAgregar, setMostrarAgregar] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setSeccion = useSeccionStore((s) => s.setSeccion)
  const router = useRouter()
  const nextId = useRef(1)

  useEffect(() => {
    if (canvasRef.current) dibujarCanvas(canvasRef.current, elementos, resultado)
  }, [elementos, resultado])

  const calcularConElementos = (els: Elemento[]) => {
    if (els.length === 0) { setResultado(null); return }
    const pols: { pts: Poligono; signo: number }[] = []
    for (const el of els) {
      if (el.plantilla === "coordenadas") {
        if (el.coordPts && el.coordPts.length > 2) pols.push({ pts: el.coordPts, signo: el.signo })
        continue
      }
      const p = offsetPoligonos(getPoligonos(el.plantilla, el.params), el.x0, el.y0)
      pols.push(...p.map(q => ({ ...q, signo: q.signo * el.signo })))
    }
    if (pols.length === 0 || pols.every(p => p.pts.length < 3)) return
    setResultado(calcularSeccion(pols))
  }

  const handlePlantilla = (p: Plantilla) => {
    setPlantillaActual(p)
    const defaults: Params = {}
    plantillasConfig[p].campos.forEach(c => { defaults[c.key] = c.default })
    setParamsActuales(defaults)
  }

  const abrirNuevo = () => {
    setEditandoId(null); setPlantillaActual("rectangular")
    setParamsActuales({ b: 30, h: 50 }); setX0("0"); setY0("0"); setSignoActual(1)
    setCoordInput(""); setMostrarAgregar(true)
  }

  const abrirEditar = (el: Elemento) => {
    setEditandoId(el.id); setPlantillaActual(el.plantilla)
    setParamsActuales({ ...el.params }); setX0(String(el.x0)); setY0(String(el.y0)); setSignoActual(el.signo)
    if (el.coordPts) setCoordInput(el.coordPts.map(p => `${p.x},${p.y}`).join("\n"))
    setMostrarAgregar(true)
  }

  const guardar = () => {
    if (editandoId !== null) {
      const nuevos = elementos.map(e => {
        if (e.id !== editandoId) return e
        if (plantillaActual === "coordenadas") {
          try {
            const pts: Poligono = coordInput.trim().split("\n").filter(l => l.trim()).map(l => {
              const [x, y] = l.split(",").map(Number); return { x, y }
            })
            return { ...e, plantilla: plantillaActual, params: {}, x0: 0, y0: 0, signo: signoActual, coordPts: pts }
          } catch { alert("Error en coordenadas"); return e }
        }
        return { ...e, plantilla: plantillaActual, params: { ...paramsActuales }, x0: parseFloat(x0) || 0, y0: parseFloat(y0) || 0, signo: signoActual }
      })
      setElementos(nuevos); calcularConElementos(nuevos)
    } else {
      if (plantillaActual === "coordenadas") {
        try {
          const pts: Poligono = coordInput.trim().split("\n").filter(l => l.trim()).map(l => {
            const [x, y] = l.split(",").map(Number); return { x, y }
          })
          const el: Elemento = { id: nextId.current++, plantilla: "coordenadas", params: {}, x0: 0, y0: 0, signo: signoActual, label: `Coord${nextId.current - 1}`, coordPts: pts }
          const nuevos = [...elementos, el]; setElementos(nuevos); calcularConElementos(nuevos)
        } catch { alert("Error en coordenadas"); return }
      } else {
        const el: Elemento = { id: nextId.current++, plantilla: plantillaActual, params: { ...paramsActuales }, x0: parseFloat(x0) || 0, y0: parseFloat(y0) || 0, signo: signoActual, label: `E${nextId.current - 1}` }
        const nuevos = [...elementos, el]; setElementos(nuevos); calcularConElementos(nuevos)
      }
    }
    setMostrarAgregar(false); setEditandoId(null); setCoordInput("")
  }

  const eliminar = (id: number) => {
    const nuevos = elementos.filter(e => e.id !== id)
    setElementos(nuevos); calcularConElementos(nuevos)
  }

  const steiner = (() => {
    if (!resultado) return null
    const x = parseFloat(ptoX), y = parseFloat(ptoY)
    if (isNaN(x) || isNaN(y)) return null
    return { Ix: resultado.Icx + resultado.A * (y - resultado.yc) ** 2, Iy: resultado.Icy + resultado.A * (x - resultado.xc) ** 2 }
  })()

  const cargarEnModulo = (modulo: string) => {
    if (!resultado) return
    setSeccion({ nombre: `Sección compuesta (${elementos.length} elem.)`, A: resultado.A, Icx: resultado.Icx, Icy: resultado.Icy, Sx_top: resultado.Sx_top, Sx_bot: resultado.Sx_bot, Sy: resultado.Sy, rx: resultado.rx, ry: resultado.ry, J: resultado.J, E: null, fc: null, ft: null, fy: null }, "secciones")
    router.push(`/${modulo}`)
  }

  const colores = ["#1d4ed8", "#059669", "#d97706", "#dc2626", "#7c3aed"]

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
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">ELEMENTOS</div>
                  <button onClick={abrirNuevo} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Agregar</button>
                </div>
                {elementos.length === 0 && !mostrarAgregar && (
                  <div className="text-xs text-gray-400 text-center py-6">Agrega elementos para componer la sección</div>
                )}
                <div className="flex flex-col gap-2 mb-3">
                  {elementos.map((el, idx) => (
                    <div key={el.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${editandoId === el.id ? "border-blue-400 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: colores[idx % colores.length] }} />
                        <span className="text-sm font-medium text-gray-800">{el.label}</span>
                        <span className="text-xs text-gray-500">{plantillasConfig[el.plantilla].label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${el.signo > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>{el.signo > 0 ? "+suma" : "−resta"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">({el.x0},{el.y0})</span>
                        <button onClick={() => abrirEditar(el)} className="text-xs text-blue-500 hover:underline">Editar</button>
                        <button onClick={() => eliminar(el.id)} className="text-xs text-red-400 hover:underline">×</button>
                      </div>
                    </div>
                  ))}
                </div>

                {mostrarAgregar && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-xs text-blue-700 font-medium mb-3">
                      {editandoId !== null ? `EDITANDO — ${elementos.find(e => e.id === editandoId)?.label}` : "NUEVO ELEMENTO"}
                    </div>
                    <div className="text-xs text-gray-500 mb-1.5">Tipo de sección</div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(Object.keys(plantillasConfig) as Plantilla[]).map(p => (
                        <button key={p} onClick={() => handlePlantilla(p)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${plantillaActual === p ? "bg-blue-700 text-white border-blue-700" : "text-gray-600 border-gray-300 hover:border-blue-300"}`}>
                          {plantillasConfig[p].label}
                        </button>
                      ))}
                    </div>
                    <div className="bg-white rounded-lg p-2 mb-3 border border-blue-100">
                      <EsquemaReferencia plantilla={plantillaActual} />
                    </div>
                    {plantillaActual === "coordenadas" ? (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">Coordenadas (x,y) una por línea — sentido horario</div>
                        <textarea value={coordInput} onChange={e => setCoordInput(e.target.value)}
                          placeholder={"0,0\n30,0\n30,50\n0,50"} rows={6}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-400" />
                        <div className="text-xs text-gray-400 mt-1">Para huecos: agrega un segundo elemento con operación − Resta</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {plantillasConfig[plantillaActual].campos.map(c => (
                          <div key={c.key}>
                            <div className="text-xs text-gray-500 mb-0.5" dangerouslySetInnerHTML={{ __html: c.labelHtml }} />
                            <input type="number" value={paramsActuales[c.key] ?? ""}
                              onChange={e => setParamsActuales({ ...paramsActuales, [c.key]: parseFloat(e.target.value) })}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                          </div>
                        ))}
                      </div>
                    )}
                    {plantillaActual !== "coordenadas" && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">x₀ (cm)</div>
                          <input type="number" value={x0} onChange={e => setX0(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">y₀ (cm)</div>
                          <input type="number" value={y0} onChange={e => setY0(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">Operación</div>
                          <select value={signoActual} onChange={e => setSignoActual(parseInt(e.target.value) as 1 | -1)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400">
                            <option value={1}>+ Suma</option>
                            <option value={-1}>− Resta</option>
                          </select>
                        </div>
                      </div>
                    )}
                    {plantillaActual === "coordenadas" && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-0.5">Operación</div>
                        <select value={signoActual} onChange={e => setSignoActual(parseInt(e.target.value) as 1 | -1)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400">
                          <option value={1}>+ Suma</option>
                          <option value={-1}>− Resta</option>
                        </select>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={guardar} className="text-xs bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">
                        {editandoId !== null ? "Guardar cambios" : "Agregar a la sección"}
                      </button>
                      <button onClick={() => { setMostrarAgregar(false); setEditandoId(null); setCoordInput("") }} className="text-xs text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>

              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-2">INERCIA EN PUNTO SOLICITADO</div>
                  <div className="text-xs text-gray-500 mb-3">I<sub>x</sub>′ e I<sub>y</sub>′ respecto a ejes paralelos por (x,y) — Steiner</div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div><div className="text-xs text-gray-500 mb-1">x (cm)</div><input type="number" value={ptoX} onChange={e => setPtoX(e.target.value)} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" /></div>
                    <div><div className="text-xs text-gray-500 mb-1">y (cm)</div><input type="number" value={ptoY} onChange={e => setPtoY(e.target.value)} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" /></div>
                  </div>
                  {steiner && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg"><div className="text-xs text-blue-500">I<sub>x</sub>′ (cm⁴)</div><div className="text-sm font-medium text-blue-900">{fmt(steiner.Ix)}</div></div>
                      <div className="p-3 bg-blue-50 rounded-lg"><div className="text-xs text-blue-500">I<sub>y</sub>′ (cm⁴)</div><div className="text-sm font-medium text-blue-900">{fmt(steiner.Iy)}</div></div>
                    </div>
                  )}
                </div>
              )}

              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CARGAR EN MÓDULO</div>
                  <div className="flex flex-wrap gap-2">
                    {[{ key: "vigas", label: "Vigas" }, { key: "porticos", label: "Pórticos" }, { key: "armaduras", label: "Armaduras" }, { key: "matricial", label: "Método Matricial" }, { key: "pandeo", label: "Pandeo" }, { key: "diseno", label: "Diseño Estructural" }].map(mod => (
                      <button key={mod.key} onClick={() => cargarEnModulo(mod.key)} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">→ {mod.label}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PLANO CARTESIANO</div>
                <canvas ref={canvasRef} width={440} height={380} className="w-full border border-gray-100 rounded-lg bg-white" />
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-200 border border-blue-600 inline-block rounded-sm" />Área +</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-white border border-blue-600 inline-block rounded-sm" />Área − (hueco)</span>
                  <span className="flex items-center gap-1 text-red-500 font-bold">⊕ C(x̄,ȳ)</span>
                </div>
              </div>

              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-4">PROPIEDADES DE LA SECCIÓN</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Prop s="A" n="Área total" v={`${fmt(resultado.A)} cm²`} />
                    <Prop s={<>x̄</>} n="Centroide x" v={`${fmt(resultado.xc)} cm`} />
                    <Prop s={<>ȳ</>} n="Centroide y" v={`${fmt(resultado.yc)} cm`} />
                    <Prop s={<>I<sub>cx</sub></>} n="Inercia centroidal x" v={`${fmt(resultado.Icx)} cm⁴`} />
                    <Prop s={<>I<sub>cy</sub></>} n="Inercia centroidal y" v={`${fmt(resultado.Icy)} cm⁴`} />
                    <Prop s={<>I<sub>xy</sub></>} n="Inercia producto" v={`${fmt(resultado.Ixy)} cm⁴`} />
                    <Prop s={<>S<sub>x</sub>⁺</>} n="Módulo resistente sup." v={`${fmt(resultado.Sx_top)} cm³`} />
                    <Prop s={<>S<sub>x</sub>⁻</>} n="Módulo resistente inf." v={`${fmt(resultado.Sx_bot)} cm³`} />
                    <Prop s={<>S<sub>y</sub></>} n="Módulo resistente y" v={`${fmt(resultado.Sy)} cm³`} />
                    <Prop s={<>r<sub>x</sub></>} n="Radio de giro x" v={`${fmt(resultado.rx)} cm`} />
                    <Prop s={<>r<sub>y</sub></>} n="Radio de giro y" v={`${fmt(resultado.ry)} cm`} />
                    <Prop s="J" n="Momento polar" v={`${fmt(resultado.J)} cm⁴`} />
                    <Prop s={<>I<sub>1</sub></>} n="Inercia principal máx." v={`${fmt(resultado.I1)} cm⁴`} />
                    <Prop s={<>I<sub>2</sub></>} n="Inercia principal mín." v={`${fmt(resultado.I2)} cm⁴`} />
                    <Prop s={<>θ<sub>p</sub></>} n="Ángulo ejes principales" v={`${fmt(resultado.theta_p, 2)}°`} />
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

function Prop({ s, n, v }: { s: React.ReactNode; n: string; v: string }) {
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