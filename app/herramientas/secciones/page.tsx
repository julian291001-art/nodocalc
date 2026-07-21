"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import { useSeccionStore } from "../../store/useSeccionStore"
import { useUnidadesStore } from "../../store/useUnidadesStore"
import { fmtVal, labelSeccion, labelInercia, labelModulo } from "../../lib/unidades"

type Plantilla = "rectangular" | "circular" | "tubo" | "I" | "T" | "L" | "C" | "cajon" | "coordenadas"
type Params = Record<string, number>
type Poligono = { x: number; y: number }[]
type PoligonoEntry = { pts: Poligono; signo: number; exacto?: { cx: number; cy: number; r: number } }

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

type DatosPDF = {
  ingeniero: string; empresa: string; proyecto: string; descripcion: string; fecha: string
}

// ── Helpers globales ───────────────────────────────────────────────────────
function f2(n: number) { return n.toFixed(2) }
function fmt(n: number, dec = 4) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(dec)
}

// ── Geometría ──────────────────────────────────────────────────────────────
function circlePoints(cx: number, cy: number, r: number, n = 128): Poligono {
  return Array.from({ length: n }, (_, i) => ({
    x: cx + r * Math.cos(2 * Math.PI * i / n),
    y: cy + r * Math.sin(2 * Math.PI * i / n),
  }))
}

function propiedadesCirculoExacto(cx: number, cy: number, r: number) {
  const A = Math.PI * r * r
  const Ix = Math.PI * r * r * r * r / 4 + A * cy * cy
  const Iy = Math.PI * r * r * r * r / 4 + A * cx * cx
  return { A, Cx: cx, Cy: cy, Ix, Iy, Ixy: 0 }
}

function getPoligonos(plantilla: Plantilla, p: Params): PoligonoEntry[] {
  const { b = 0, h = 0, t = 0, r = 0, bf_sup = 0, tf_sup = 0, bf_inf = 0, tf_inf = 0, hw = 0, tw = 0, t_sup = 0, t_inf = 0, t_izq = 0, t_der = 0, b_sup = 0, b_inf = 0, bf = 0, tf = 0, x_alma = 0, x_sup = 0 } = p
  switch (plantilla) {
    case "rectangular":
      return [{ pts: [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: h }, { x: 0, y: h }], signo: 1 }]
    case "circular":
      return [{ pts: [], signo: 1, exacto: { cx: r, cy: r, r } }]
    case "tubo":
      return [{ pts: [], signo: 1, exacto: { cx: r, cy: r, r } }, { pts: [], signo: -1, exacto: { cx: r, cy: r, r: r - t } }]
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
      return [{ pts: [{ x: 0, y: 0 }, { x: bf_inf, y: 0 }, { x: bf_inf, y: tf_inf }, { x: tw, y: tf_inf }, { x: tw, y: tf_inf + hw }, { x: bf_sup, y: tf_inf + hw }, { x: bf_sup, y: hTotal }, { x: 0, y: hTotal }], signo: 1 }]
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

function offsetPoligonos(pols: PoligonoEntry[], x0: number, y0: number): PoligonoEntry[] {
  return pols.map(({ pts, signo, exacto }) => ({
    pts: pts.map(p => ({ x: p.x + x0, y: p.y + y0 })),
    signo,
    exacto: exacto ? { cx: exacto.cx + x0, cy: exacto.cy + y0, r: exacto.r } : undefined,
  }))
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

function calcularSeccion(poligonos: PoligonoEntry[]): ResultadoSeccion {
  let A = 0, AxC = 0, AyC = 0
  for (const { pts, signo, exacto } of poligonos) {
    const p = exacto ? propiedadesCirculoExacto(exacto.cx, exacto.cy, exacto.r) : propiedadesPoligono(pts)
    A += signo * p.A; AxC += signo * p.A * p.Cx; AyC += signo * p.A * p.Cy
  }
  const xc = AxC / A, yc = AyC / A
  let Icx = 0, Icy = 0, Icxy = 0
  for (const { pts, signo, exacto } of poligonos) {
    const p = exacto ? propiedadesCirculoExacto(exacto.cx, exacto.cy, exacto.r) : propiedadesPoligono(pts)
    const Icx_propio = p.Ix - p.A * p.Cy * p.Cy
    const Icy_propio = p.Iy - p.A * p.Cx * p.Cx
    const Icxy_propio = p.Ixy - p.A * p.Cx * p.Cy
    Icx += signo * (Icx_propio + p.A * (p.Cy - yc) ** 2)
    Icy += signo * (Icy_propio + p.A * (p.Cx - xc) ** 2)
    Icxy += signo * (Icxy_propio + p.A * (p.Cx - xc) * (p.Cy - yc))
  }
  let ymax = -Infinity, ymin = Infinity, xmaxD = -Infinity
  for (const { pts, exacto } of poligonos) {
    const ptsEval = exacto ? circlePoints(exacto.cx, exacto.cy, exacto.r, 64) : pts
    for (const p of ptsEval) {
      if (p.y > ymax) ymax = p.y; if (p.y < ymin) ymin = p.y
      if (Math.abs(p.x - xc) > xmaxD) xmaxD = Math.abs(p.x - xc)
    }
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
      </svg>
    )
    case "coordenadas": return (
      <svg viewBox="0 0 220 180" className="w-full h-36">
        <line x1="20" y1="155" x2="200" y2="155" stroke="#9ca3af" strokeWidth="1" />
        <line x1="20" y1="155" x2="20" y2="10" stroke="#9ca3af" strokeWidth="1" />
        <text x="203" y="158" fontSize="10" fill="#9ca3af">x</text>
        <text x="14" y="8" fontSize="10" fill="#9ca3af">y</text>
        <polygon points="60,130 150,130 170,60 80,40 45,90" fill="rgba(59,130,246,0.12)" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="5,3" />
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
function dibujarCanvas(canvas: HTMLCanvasElement, elementos: Elemento[], resultado: ResultadoSeccion | null, unidad: string = "cm") {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const W = canvas.offsetWidth
  const H = canvas.offsetHeight || 380
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.scale(dpr, dpr)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, H)

  const todosLosPts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  for (const el of elementos) {
    if (el.plantilla === "coordenadas") { if (el.coordPts) todosLosPts.push(...el.coordPts); continue }
    const pols = offsetPoligonos(getPoligonos(el.plantilla, el.params), el.x0, el.y0)
    for (const { pts, exacto } of pols) {
      if (exacto) todosLosPts.push(...circlePoints(exacto.cx, exacto.cy, exacto.r, 32))
      else todosLosPts.push(...pts)
    }
  }

  const padL = 45, padR = 20, padT = 20, padB = 30
  const allX = todosLosPts.map(p => p.x)
  const allY = todosLosPts.map(p => p.y)
  const maxAbsX = Math.max(...allX.map(Math.abs), 1)
  const maxAbsY = Math.max(...allY.map(Math.abs), 1)
  const maxAbs = Math.max(maxAbsX, maxAbsY) * 1.3

  const scaleX = (W - padL - padR) / (2 * maxAbs)
  const scaleY = (H - padT - padB) / (2 * maxAbs)
  const sc = Math.min(scaleX, scaleY)

  // Centro del plano basado en el centro de la geometría, no en (0,0) fijo
  const centroX = (Math.min(...allX) + Math.max(...allX)) / 2
  const centroY = (Math.min(...allY) + Math.max(...allY)) / 2
  const cx = padL + (W - padL - padR) / 2
  const cy = padT + (H - padT - padB) / 2

  const tx = (x: number) => cx + (x - centroX) * sc
  const ty = (y: number) => cy - (y - centroY) * sc

  const rawStep = maxAbs / 3
  const exp = Math.floor(Math.log10(rawStep || 1))
  const base = Math.pow(10, exp)
  const step = rawStep / base > 5 ? base * 5 : rawStep / base > 2 ? base * 2 : base

  // Cuadrícula
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 0.5
  const xStart = Math.floor((centroX - maxAbs) / step) * step
  const xEnd = centroX + maxAbs
  for (let v = xStart; v <= xEnd; v = parseFloat((v + step).toFixed(10))) {
    ctx.beginPath(); ctx.moveTo(tx(v), padT); ctx.lineTo(tx(v), H - padB); ctx.stroke()
  }
  const yStart = Math.floor((centroY - maxAbs) / step) * step
  const yEnd = centroY + maxAbs
  for (let v = yStart; v <= yEnd; v = parseFloat((v + step).toFixed(10))) {
    ctx.beginPath(); ctx.moveTo(padL, ty(v)); ctx.lineTo(W - padR, ty(v)); ctx.stroke()
  }

  // Etiquetas de ejes
  ctx.fillStyle = "#9ca3af"; ctx.font = "9px sans-serif"; ctx.textAlign = "center"
  let lastLX = -Infinity
  for (let v = xStart; v <= xEnd; v = parseFloat((v + step).toFixed(10))) {
    const px = tx(v)
    if (px < padL || px > W - padR || px - lastLX < 32) continue
    lastLX = px
    const label = Number.isInteger(v) ? `${v}` : parseFloat(v.toFixed(2)).toString()
    ctx.fillText(label, px, H - padB + 12)
  }
  ctx.textAlign = "right"
  let lastLY = Infinity
  for (let v = yStart; v <= yEnd; v = parseFloat((v + step).toFixed(10))) {
    const py = ty(v)
    if (py < padT || py > H - padB || lastLY - py < 18) continue
    lastLY = py
    const label = Number.isInteger(v) ? `${v}` : parseFloat(v.toFixed(2)).toString()
    ctx.fillText(label, padL - 4, py + 3)
  }

  // Ejes principales (pasan por el origen real x=0, y=0 si está visible)
  ctx.strokeStyle = "#6b7280"; ctx.lineWidth = 1.2
  const oy0 = ty(0), ox0 = tx(0)
  if (oy0 >= padT && oy0 <= H - padB) {
    ctx.beginPath(); ctx.moveTo(padL, oy0); ctx.lineTo(W - padR, oy0); ctx.stroke()
  }
  if (ox0 >= padL && ox0 <= W - padR) {
    ctx.beginPath(); ctx.moveTo(ox0, padT); ctx.lineTo(ox0, H - padB); ctx.stroke()
  }
  // Borde del área de dibujo
  ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1
  ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB)

  ctx.fillStyle = "#374151"; ctx.font = "bold 10px sans-serif"
  ctx.textAlign = "left"; ctx.fillText(`x (${unidad})`, W - padR - 30, padT - 6)
  ctx.textAlign = "left"; ctx.fillText(`y (${unidad})`, padL + 4, padT - 6)

  // Dibujar elementos
  const fills = ["rgba(59,130,246,0.2)", "rgba(16,185,129,0.2)", "rgba(245,158,11,0.2)", "rgba(239,68,68,0.2)", "rgba(139,92,246,0.2)"]
  const strokes = ["#1d4ed8", "#059669", "#d97706", "#dc2626", "#7c3aed"]
  elementos.forEach((el, idx) => {
    const fill = fills[idx % fills.length], stroke = strokes[idx % strokes.length]
    if (el.plantilla === "coordenadas") {
      const pts = el.coordPts || []; if (pts.length < 2) return
      ctx.beginPath(); ctx.moveTo(tx(pts[0].x), ty(pts[0].y))
      for (const p of pts) ctx.lineTo(tx(p.x), ty(p.y))
      ctx.closePath()
      ctx.fillStyle = el.signo > 0 ? fill : "rgba(255,255,255,0.95)"
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.8; ctx.fill(); ctx.stroke(); return
    }
    const pols = offsetPoligonos(getPoligonos(el.plantilla, el.params), el.x0, el.y0)
    for (const { pts, signo, exacto } of pols) {
      const drawPts = exacto ? circlePoints(exacto.cx, exacto.cy, exacto.r, 128) : pts
      if (drawPts.length < 2) continue
      ctx.beginPath(); ctx.moveTo(tx(drawPts[0].x), ty(drawPts[0].y))
      for (const p of drawPts) ctx.lineTo(tx(p.x), ty(p.y))
      ctx.closePath()
      ctx.fillStyle = el.signo > 0 && signo > 0 ? fill : "rgba(255,255,255,0.95)"
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.8; ctx.fill(); ctx.stroke()
    }
    ctx.fillStyle = stroke; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"
    ctx.fillText(el.label, tx(el.x0 + 3), ty(el.y0 + 3))
  })

  if (resultado) {
    const ccx = tx(resultado.xc), ccy = ty(resultado.yc)
    ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(ccx - 10, ccy); ctx.lineTo(ccx + 10, ccy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ccx, ccy - 10); ctx.lineTo(ccx, ccy + 10); ctx.stroke()
    ctx.beginPath(); ctx.arc(ccx, ccy, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = "#dc2626"; ctx.fill()
    ctx.fillStyle = "#dc2626"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
    ctx.fillText(`C(${resultado.xc.toFixed(2)}, ${resultado.yc.toFixed(2)})`, ccx + 7, ccy - 5)
  }
}

// ── Botón PDF ──────────────────────────────────────────────────────────────
function PDFBoton({ elementos, resultado, datosPDF, canvasRef }: {
  elementos: Elemento[]
  resultado: ResultadoSeccion
  datosPDF: DatosPDF
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}) {
  const [estado, setEstado] = useState<"idle" | "preparando" | "listo" | "generando">("idle")
  const [imagenCanvas, setImagenCanvas] = useState<string>("")
  const [ecuacionesPNG, setEcuacionesPNG] = useState<Record<string, string>>({})

  const prepararPDF = async () => {
    setEstado("preparando")
    try {
      const { renderizarEcuaciones } = await import("../../components/renderEcuacion")
      const imgCanvas = canvasRef.current ? canvasRef.current.toDataURL("image/png") : ""
      setImagenCanvas(imgCanvas)
      const eqs: { key: string; latex: string; display?: boolean; altura?: number }[] = []
      const R = Math.sqrt(Math.pow((resultado.Icx - resultado.Icy) / 2, 2) + Math.pow(resultado.Ixy, 2))

      // Ecuaciones globales
      eqs.push(
        { key: "global_A_gen", latex: "A = \\sum_i \\left( \\text{signo}_i \\times A_i \\right)" },
        { key: "global_A_res", latex: `A = ${fmt(resultado.A)} \\text{ cm}^2`, altura: 35 },
        { key: "global_xc_gen", latex: "\\bar{x} = \\frac{\\sum_i \\left( \\text{signo}_i \\times A_i \\times \\bar{x}_i \\right)}{A}" },
        { key: "global_xc_res", latex: `\\bar{x} = ${fmt(resultado.xc)} \\text{ cm}`, altura: 35 },
        { key: "global_yc_gen", latex: "\\bar{y} = \\frac{\\sum_i \\left( \\text{signo}_i \\times A_i \\times \\bar{y}_i \\right)}{A}" },
        { key: "global_yc_res", latex: `\\bar{y} = ${fmt(resultado.yc)} \\text{ cm}`, altura: 35 },
        { key: "global_Icx_gen", latex: "I_{cx} = \\sum_i \\left[ \\text{signo}_i \\times \\left( I_{cx,i}^{\\text{propio}} + A_i \\cdot (\\bar{y}_i - \\bar{y})^2 \\right) \\right]" },
        { key: "global_Icx_steiner", latex: "I_{cx,i}^{\\text{propio}} = I_{x,\\text{origen},i} - A_i \\cdot \\bar{y}_i^2" },
        { key: "global_Icx_res", latex: `I_{cx} = ${fmt(resultado.Icx)} \\text{ cm}^4`, altura: 35 },
        { key: "global_Icy_gen", latex: "I_{cy} = \\sum_i \\left[ \\text{signo}_i \\times \\left( I_{cy,i}^{\\text{propio}} + A_i \\cdot (\\bar{x}_i - \\bar{x})^2 \\right) \\right]" },
        { key: "global_Icy_res", latex: `I_{cy} = ${fmt(resultado.Icy)} \\text{ cm}^4`, altura: 35 },
        { key: "global_Ixy_gen", latex: "I_{xy} = \\sum_i \\left[ \\text{signo}_i \\times \\left( I_{xy,i}^{\\text{propio}} + A_i (\\bar{x}_i - \\bar{x})(\\bar{y}_i - \\bar{y}) \\right) \\right]" },
        { key: "global_Ixy_res", latex: `I_{xy} = ${fmt(resultado.Ixy)} \\text{ cm}^4`, altura: 35 },
        { key: "global_J_gen", latex: "J = I_{cx} + I_{cy}" },
        { key: "global_J_sus", latex: `J = ${fmt(resultado.Icx)} + ${fmt(resultado.Icy)}` },
        { key: "global_J_res", latex: `J = ${fmt(resultado.J)} \\text{ cm}^4`, altura: 35 },
        { key: "mod_Sxp_gen", latex: "S_x^{+} = \\frac{I_{cx}}{y_{\\max} - \\bar{y}}" },
        { key: "mod_Sxp_sus", latex: `S_x^{+} = \\frac{${fmt(resultado.Icx)}}{y_{\\max} - ${fmt(resultado.yc)}}` },
        { key: "mod_Sxp_res", latex: `S_x^{+} = ${fmt(resultado.Sx_top)} \\text{ cm}^3`, altura: 35 },
        { key: "mod_Sxm_gen", latex: "S_x^{-} = \\frac{I_{cx}}{\\bar{y} - y_{\\min}}" },
        { key: "mod_Sxm_sus", latex: `S_x^{-} = \\frac{${fmt(resultado.Icx)}}{${fmt(resultado.yc)} - y_{\\min}}` },
        { key: "mod_Sxm_res", latex: `S_x^{-} = ${fmt(resultado.Sx_bot)} \\text{ cm}^3`, altura: 35 },
        { key: "mod_Sy_gen", latex: "S_y = \\frac{I_{cy}}{x_{\\max}}" },
        { key: "mod_Sy_sus", latex: `S_y = \\frac{${fmt(resultado.Icy)}}{x_{\\max}}` },
        { key: "mod_Sy_res", latex: `S_y = ${fmt(resultado.Sy)} \\text{ cm}^3`, altura: 35 },
        { key: "mod_rx_gen", latex: "r_x = \\sqrt{\\frac{I_{cx}}{A}}" },
        { key: "mod_rx_sus", latex: `r_x = \\sqrt{\\frac{${fmt(resultado.Icx)}}{${fmt(resultado.A)}}}` },
        { key: "mod_rx_int", latex: `r_x = \\sqrt{${fmt(resultado.Icx / resultado.A)}}` },
        { key: "mod_rx_res", latex: `r_x = ${fmt(resultado.rx)} \\text{ cm}`, altura: 35 },
        { key: "mod_ry_gen", latex: "r_y = \\sqrt{\\frac{I_{cy}}{A}}" },
        { key: "mod_ry_sus", latex: `r_y = \\sqrt{\\frac{${fmt(resultado.Icy)}}{${fmt(resultado.A)}}}` },
        { key: "mod_ry_int", latex: `r_y = \\sqrt{${fmt(resultado.Icy / resultado.A)}}` },
        { key: "mod_ry_res", latex: `r_y = ${fmt(resultado.ry)} \\text{ cm}`, altura: 35 },
        { key: "ejes_R_gen", latex: "R = \\sqrt{\\left(\\frac{I_{cx} - I_{cy}}{2}\\right)^2 + I_{xy}^2}" },
        { key: "ejes_R_sus", latex: `R = \\sqrt{\\left(\\frac{${fmt(resultado.Icx)} - ${fmt(resultado.Icy)}}{2}\\right)^2 + ${fmt(resultado.Ixy)}^2}` },
        { key: "ejes_R_res", latex: `R = ${fmt(R)} \\text{ cm}^4`, altura: 35 },
        { key: "ejes_I1_gen", latex: "I_1 = \\frac{I_{cx} + I_{cy}}{2} + R" },
        { key: "ejes_I1_sus", latex: `I_1 = \\frac{${fmt(resultado.Icx)} + ${fmt(resultado.Icy)}}{2} + ${fmt(R)}` },
        { key: "ejes_I1_res", latex: `I_1 = ${fmt(resultado.I1)} \\text{ cm}^4`, altura: 35 },
        { key: "ejes_I2_gen", latex: "I_2 = \\frac{I_{cx} + I_{cy}}{2} - R" },
        { key: "ejes_I2_sus", latex: `I_2 = \\frac{${fmt(resultado.Icx)} + ${fmt(resultado.Icy)}}{2} - ${fmt(R)}` },
        { key: "ejes_I2_res", latex: `I_2 = ${fmt(resultado.I2)} \\text{ cm}^4`, altura: 35 },
        { key: "ejes_tp_gen", latex: "\\theta_p = \\frac{1}{2} \\arctan\\left(\\frac{-2 I_{xy}}{I_{cx} - I_{cy}}\\right)" },
        { key: "ejes_tp_sus", latex: `\\theta_p = \\frac{1}{2} \\arctan\\left(\\frac{-2 \\times ${fmt(resultado.Ixy)}}{${fmt(resultado.Icx)} - ${fmt(resultado.Icy)}}\\right)` },
        { key: "ejes_tp_res", latex: `\\theta_p = ${resultado.theta_p.toFixed(2)}^\\circ`, altura: 35 },
      )

      // Ecuaciones por elemento
      for (const el of elementos) {
        const pre = `el_${el.id}_`
        const p = el.params

        if (el.plantilla === "rectangular") {
          const A = p.b * p.h
          const xc = p.b / 2 + el.x0
          const yc = p.h / 2 + el.y0
          const Icx = p.b * Math.pow(p.h, 3) / 12
          const Icy = p.h * Math.pow(p.b, 3) / 12
          eqs.push(
            { key: `${pre}A_gen`, latex: "A = b \\times h" },
            { key: `${pre}A_sus`, latex: `A = ${f2(p.b)} \\times ${f2(p.h)}` },
            { key: `${pre}A_res`, latex: `A = ${fmt(A)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}xc_gen`, latex: "\\bar{x} = \\frac{b}{2} + x_0" },
            { key: `${pre}xc_sus`, latex: `\\bar{x} = \\frac{${f2(p.b)}}{2} + ${f2(el.x0)}` },
            { key: `${pre}xc_res`, latex: `\\bar{x} = ${fmt(xc)} \\text{ cm}`, altura: 35 },
            { key: `${pre}yc_gen`, latex: "\\bar{y} = \\frac{h}{2} + y_0" },
            { key: `${pre}yc_sus`, latex: `\\bar{y} = \\frac{${f2(p.h)}}{2} + ${f2(el.y0)}` },
            { key: `${pre}yc_res`, latex: `\\bar{y} = ${fmt(yc)} \\text{ cm}`, altura: 35 },
            { key: `${pre}Icx_gen`, latex: "I_{cx} = \\frac{b \\cdot h^3}{12}" },
            { key: `${pre}Icx_sus`, latex: `I_{cx} = \\frac{${f2(p.b)} \\times ${f2(p.h)}^3}{12}` },
            { key: `${pre}Icx_int`, latex: `I_{cx} = \\frac{${f2(p.b)} \\times ${f2(Math.pow(p.h, 3))}}{12}` },
            { key: `${pre}Icx_res`, latex: `I_{cx} = ${fmt(Icx)} \\text{ cm}^4`, altura: 35 },
            { key: `${pre}Icy_gen`, latex: "I_{cy} = \\frac{h \\cdot b^3}{12}" },
            { key: `${pre}Icy_sus`, latex: `I_{cy} = \\frac{${f2(p.h)} \\times ${f2(p.b)}^3}{12}` },
            { key: `${pre}Icy_int`, latex: `I_{cy} = \\frac{${f2(p.h)} \\times ${f2(Math.pow(p.b, 3))}}{12}` },
            { key: `${pre}Icy_res`, latex: `I_{cy} = ${fmt(Icy)} \\text{ cm}^4`, altura: 35 },
          )
        }

        if (el.plantilla === "circular") {
          const A = Math.PI * p.r * p.r
          const xc = p.r + el.x0
          const yc = p.r + el.y0
          const Ic = Math.PI * Math.pow(p.r, 4) / 4
          eqs.push(
            { key: `${pre}A_gen`, latex: "A = \\pi r^2" },
            { key: `${pre}A_sus`, latex: `A = \\pi \\times ${f2(p.r)}^2` },
            { key: `${pre}A_res`, latex: `A = ${fmt(A)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}cc_gen`, latex: "(\\bar{x}, \\bar{y}) = (r + x_0,\\; r + y_0)" },
            { key: `${pre}cc_res`, latex: `(\\bar{x}, \\bar{y}) = (${fmt(xc)},\\; ${fmt(yc)}) \\text{ cm}`, altura: 35 },
            { key: `${pre}Ic_gen`, latex: "I_c = \\frac{\\pi r^4}{4}" },
            { key: `${pre}Ic_sus`, latex: `I_c = \\frac{\\pi \\times ${f2(p.r)}^4}{4}` },
            { key: `${pre}Ic_res`, latex: `I_{cx} = I_{cy} = ${fmt(Ic)} \\text{ cm}^4`, altura: 35 },
          )
        }

        if (el.plantilla === "tubo") {
          const ri = p.r - p.t
          const A = Math.PI * (p.r * p.r - ri * ri)
          const Ic = Math.PI * (Math.pow(p.r, 4) - Math.pow(ri, 4)) / 4
          eqs.push(
            { key: `${pre}ri_gen`, latex: "r_i = r - t" },
            { key: `${pre}ri_res`, latex: `r_i = ${f2(p.r)} - ${f2(p.t)} = ${fmt(ri)} \\text{ cm}`, altura: 35 },
            { key: `${pre}A_gen`, latex: "A = \\pi (r^2 - r_i^2)" },
            { key: `${pre}A_sus`, latex: `A = \\pi (${f2(p.r)}^2 - ${f2(ri)}^2)` },
            { key: `${pre}A_res`, latex: `A = ${fmt(A)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}Ic_gen`, latex: "I_c = \\frac{\\pi (r^4 - r_i^4)}{4}" },
            { key: `${pre}Ic_sus`, latex: `I_c = \\frac{\\pi (${f2(p.r)}^4 - ${f2(ri)}^4)}{4}` },
            { key: `${pre}Ic_res`, latex: `I_{cx} = I_{cy} = ${fmt(Ic)} \\text{ cm}^4`, altura: 35 },
          )
        }

        if (el.plantilla === "I") {
          const A1 = p.bf_inf * p.tf_inf
          const A2 = p.tw * p.hw
          const A3 = p.bf_sup * p.tf_sup
          const y1 = p.tf_inf / 2 + el.y0
          const y2 = p.tf_inf + p.hw / 2 + el.y0
          const y3 = p.tf_inf + p.hw + p.tf_sup / 2 + el.y0
          const A = A1 + A2 + A3
          const yc = (A1 * y1 + A2 * y2 + A3 * y3) / A
          const Ic1 = p.bf_inf * Math.pow(p.tf_inf, 3) / 12
          const Ic2 = p.tw * Math.pow(p.hw, 3) / 12
          const Ic3 = p.bf_sup * Math.pow(p.tf_sup, 3) / 12
          const Ics1 = Ic1 + A1 * Math.pow(y1 - yc, 2)
          const Ics2 = Ic2 + A2 * Math.pow(y2 - yc, 2)
          const Ics3 = Ic3 + A3 * Math.pow(y3 - yc, 2)
          const Icx = Ics1 + Ics2 + Ics3
          eqs.push(
            { key: `${pre}A1_gen`, latex: "A_1 = b_{f,inf} \\times t_{f,inf}" },
            { key: `${pre}A1_res`, latex: `A_1 = ${f2(p.bf_inf)} \\times ${f2(p.tf_inf)} = ${fmt(A1)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}y1_gen`, latex: "\\bar{y}_1 = \\frac{t_{f,inf}}{2} + y_0" },
            { key: `${pre}y1_res`, latex: `\\bar{y}_1 = ${fmt(y1)} \\text{ cm}`, altura: 35 },
            { key: `${pre}A2_gen`, latex: "A_2 = t_w \\times h_w" },
            { key: `${pre}A2_res`, latex: `A_2 = ${f2(p.tw)} \\times ${f2(p.hw)} = ${fmt(A2)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}y2_gen`, latex: "\\bar{y}_2 = t_{f,inf} + \\frac{h_w}{2} + y_0" },
            { key: `${pre}y2_res`, latex: `\\bar{y}_2 = ${fmt(y2)} \\text{ cm}`, altura: 35 },
            { key: `${pre}A3_gen`, latex: "A_3 = b_{f,sup} \\times t_{f,sup}" },
            { key: `${pre}A3_res`, latex: `A_3 = ${f2(p.bf_sup)} \\times ${f2(p.tf_sup)} = ${fmt(A3)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}y3_gen`, latex: "\\bar{y}_3 = t_{f,inf} + h_w + \\frac{t_{f,sup}}{2} + y_0" },
            { key: `${pre}y3_res`, latex: `\\bar{y}_3 = ${fmt(y3)} \\text{ cm}`, altura: 35 },
            { key: `${pre}A_gen`, latex: "A = A_1 + A_2 + A_3" },
            { key: `${pre}A_res`, latex: `A = ${f2(A1)} + ${f2(A2)} + ${f2(A3)} = ${fmt(A)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}yc_gen`, latex: "\\bar{y} = \\frac{A_1 \\bar{y}_1 + A_2 \\bar{y}_2 + A_3 \\bar{y}_3}{A}" },
            { key: `${pre}yc_sus`, latex: `\\bar{y} = \\frac{${f2(A1)} \\times ${f2(y1)} + ${f2(A2)} \\times ${f2(y2)} + ${f2(A3)} \\times ${f2(y3)}}{${f2(A)}}` },
            { key: `${pre}yc_res`, latex: `\\bar{y} = ${fmt(yc)} \\text{ cm}`, altura: 35 },
            { key: `${pre}Ics1_gen`, latex: "I_{cs,1} = \\frac{b_{f,inf} \\cdot t_{f,inf}^3}{12} + A_1(\\bar{y}_1 - \\bar{y})^2" },
            { key: `${pre}Ics1_sus`, latex: `I_{cs,1} = \\frac{${f2(p.bf_inf)} \\times ${f2(p.tf_inf)}^3}{12} + ${f2(A1)}(${f2(y1)} - ${f2(yc)})^2` },
            { key: `${pre}Ics1_res`, latex: `I_{cs,1} = ${fmt(Ic1)} + ${fmt(A1 * Math.pow(y1 - yc, 2))} = ${fmt(Ics1)} \\text{ cm}^4`, altura: 35 },
            { key: `${pre}Ics2_gen`, latex: "I_{cs,2} = \\frac{t_w \\cdot h_w^3}{12} + A_2(\\bar{y}_2 - \\bar{y})^2" },
            { key: `${pre}Ics2_sus`, latex: `I_{cs,2} = \\frac{${f2(p.tw)} \\times ${f2(p.hw)}^3}{12} + ${f2(A2)}(${f2(y2)} - ${f2(yc)})^2` },
            { key: `${pre}Ics2_res`, latex: `I_{cs,2} = ${fmt(Ic2)} + ${fmt(A2 * Math.pow(y2 - yc, 2))} = ${fmt(Ics2)} \\text{ cm}^4`, altura: 35 },
            { key: `${pre}Ics3_gen`, latex: "I_{cs,3} = \\frac{b_{f,sup} \\cdot t_{f,sup}^3}{12} + A_3(\\bar{y}_3 - \\bar{y})^2" },
            { key: `${pre}Ics3_sus`, latex: `I_{cs,3} = \\frac{${f2(p.bf_sup)} \\times ${f2(p.tf_sup)}^3}{12} + ${f2(A3)}(${f2(y3)} - ${f2(yc)})^2` },
            { key: `${pre}Ics3_res`, latex: `I_{cs,3} = ${fmt(Ic3)} + ${fmt(A3 * Math.pow(y3 - yc, 2))} = ${fmt(Ics3)} \\text{ cm}^4`, altura: 35 },
            { key: `${pre}Icx_gen`, latex: "I_{cx} = I_{cs,1} + I_{cs,2} + I_{cs,3}" },
            { key: `${pre}Icx_sus`, latex: `I_{cx} = ${fmt(Ics1)} + ${fmt(Ics2)} + ${fmt(Ics3)}` },
            { key: `${pre}Icx_res`, latex: `I_{cx} = ${fmt(Icx)} \\text{ cm}^4`, altura: 35 },
          )
        }

        if (el.plantilla === "T") {
          const A1 = p.tw * p.hw
          const A2 = p.bf * p.tf
          const y1 = p.hw / 2 + el.y0
          const y2 = p.hw + p.tf / 2 + el.y0
          const A = A1 + A2
          const yc = (A1 * y1 + A2 * y2) / A
          const Ic1 = p.tw * Math.pow(p.hw, 3) / 12
          const Ic2 = p.bf * Math.pow(p.tf, 3) / 12
          const Ics1 = Ic1 + A1 * Math.pow(y1 - yc, 2)
          const Ics2 = Ic2 + A2 * Math.pow(y2 - yc, 2)
          const Icx = Ics1 + Ics2
          eqs.push(
            { key: `${pre}A1_gen`, latex: "A_1 = t_w \\times h_w" },
            { key: `${pre}A1_res`, latex: `A_1 = ${fmt(A1)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}y1_gen`, latex: "\\bar{y}_1 = \\frac{h_w}{2} + y_0" },
            { key: `${pre}y1_res`, latex: `\\bar{y}_1 = ${fmt(y1)} \\text{ cm}`, altura: 35 },
            { key: `${pre}A2_gen`, latex: "A_2 = b_f \\times t_f" },
            { key: `${pre}A2_res`, latex: `A_2 = ${fmt(A2)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}y2_gen`, latex: "\\bar{y}_2 = h_w + \\frac{t_f}{2} + y_0" },
            { key: `${pre}y2_res`, latex: `\\bar{y}_2 = ${fmt(y2)} \\text{ cm}`, altura: 35 },
            { key: `${pre}A_gen`, latex: "A = A_1 + A_2" },
            { key: `${pre}A_res`, latex: `A = ${fmt(A)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}yc_gen`, latex: "\\bar{y} = \\frac{A_1 \\bar{y}_1 + A_2 \\bar{y}_2}{A}" },
            { key: `${pre}yc_sus`, latex: `\\bar{y} = \\frac{${f2(A1)} \\times ${f2(y1)} + ${f2(A2)} \\times ${f2(y2)}}{${f2(A)}}` },
            { key: `${pre}yc_res`, latex: `\\bar{y} = ${fmt(yc)} \\text{ cm}`, altura: 35 },
            { key: `${pre}Ics1_gen`, latex: "I_{cs,1} = \\frac{t_w h_w^3}{12} + A_1(\\bar{y}_1 - \\bar{y})^2" },
            { key: `${pre}Ics1_sus`, latex: `I_{cs,1} = \\frac{${f2(p.tw)} \\times ${f2(p.hw)}^3}{12} + ${f2(A1)}(${f2(y1)} - ${f2(yc)})^2` },
            { key: `${pre}Ics1_res`, latex: `I_{cs,1} = ${fmt(Ics1)} \\text{ cm}^4`, altura: 35 },
            { key: `${pre}Ics2_gen`, latex: "I_{cs,2} = \\frac{b_f t_f^3}{12} + A_2(\\bar{y}_2 - \\bar{y})^2" },
            { key: `${pre}Ics2_sus`, latex: `I_{cs,2} = \\frac{${f2(p.bf)} \\times ${f2(p.tf)}^3}{12} + ${f2(A2)}(${f2(y2)} - ${f2(yc)})^2` },
            { key: `${pre}Ics2_res`, latex: `I_{cs,2} = ${fmt(Ics2)} \\text{ cm}^4`, altura: 35 },
            { key: `${pre}Icx_gen`, latex: "I_{cx} = I_{cs,1} + I_{cs,2}" },
            { key: `${pre}Icx_sus`, latex: `I_{cx} = ${fmt(Ics1)} + ${fmt(Ics2)}` },
            { key: `${pre}Icx_res`, latex: `I_{cx} = ${fmt(Icx)} \\text{ cm}^4`, altura: 35 },
          )
        }

        if (el.plantilla === "L") {
          const A1 = p.b * p.t
          const A2 = p.t * (p.h - p.t)
          const A = A1 + A2
          const xc1 = p.b / 2 + el.x0
          const yc1 = p.t / 2 + el.y0
          const xc2 = p.t / 2 + el.x0
          const yc2 = p.t + (p.h - p.t) / 2 + el.y0
          const xcG = (A1 * xc1 + A2 * xc2) / A
          const ycG = (A1 * yc1 + A2 * yc2) / A
          eqs.push(
            { key: `${pre}A1_gen`, latex: "A_1 = b \\times t" },
            { key: `${pre}A1_res`, latex: `A_1 = ${fmt(A1)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}A2_gen`, latex: "A_2 = t \\times (h - t)" },
            { key: `${pre}A2_res`, latex: `A_2 = ${fmt(A2)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}A_gen`, latex: "A = A_1 + A_2" },
            { key: `${pre}A_res`, latex: `A = ${fmt(A)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}xc_gen`, latex: "\\bar{x} = \\frac{A_1 \\bar{x}_1 + A_2 \\bar{x}_2}{A}" },
            { key: `${pre}xc_sus`, latex: `\\bar{x} = \\frac{${f2(A1)} \\times ${f2(xc1)} + ${f2(A2)} \\times ${f2(xc2)}}{${f2(A)}}` },
            { key: `${pre}xc_res`, latex: `\\bar{x} = ${fmt(xcG)} \\text{ cm}`, altura: 35 },
            { key: `${pre}yc_gen`, latex: "\\bar{y} = \\frac{A_1 \\bar{y}_1 + A_2 \\bar{y}_2}{A}" },
            { key: `${pre}yc_sus`, latex: `\\bar{y} = \\frac{${f2(A1)} \\times ${f2(yc1)} + ${f2(A2)} \\times ${f2(yc2)}}{${f2(A)}}` },
            { key: `${pre}yc_res`, latex: `\\bar{y} = ${fmt(ycG)} \\text{ cm}`, altura: 35 },
          )
        }

        if (el.plantilla === "C") {
          const A1 = p.bf_inf * p.tf_inf
          const A2 = p.tw * p.hw
          const A3 = p.bf_sup * p.tf_sup
          const y1 = p.tf_inf / 2 + el.y0
          const y2 = p.tf_inf + p.hw / 2 + el.y0
          const y3 = p.tf_inf + p.hw + p.tf_sup / 2 + el.y0
          const A = A1 + A2 + A3
          const yc = (A1 * y1 + A2 * y2 + A3 * y3) / A
          const Ic1 = p.bf_inf * Math.pow(p.tf_inf, 3) / 12
          const Ic2 = p.tw * Math.pow(p.hw, 3) / 12
          const Ic3 = p.bf_sup * Math.pow(p.tf_sup, 3) / 12
          const Ics1 = Ic1 + A1 * Math.pow(y1 - yc, 2)
          const Ics2 = Ic2 + A2 * Math.pow(y2 - yc, 2)
          const Ics3 = Ic3 + A3 * Math.pow(y3 - yc, 2)
          const Icx = Ics1 + Ics2 + Ics3
          eqs.push(
            { key: `${pre}A1_gen`, latex: "A_1 = b_{f,inf} \\times t_{f,inf}" },
            { key: `${pre}A1_res`, latex: `A_1 = ${fmt(A1)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}A2_gen`, latex: "A_2 = t_w \\times h_w" },
            { key: `${pre}A2_res`, latex: `A_2 = ${fmt(A2)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}A3_gen`, latex: "A_3 = b_{f,sup} \\times t_{f,sup}" },
            { key: `${pre}A3_res`, latex: `A_3 = ${fmt(A3)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}A_gen`, latex: "A = A_1 + A_2 + A_3" },
            { key: `${pre}A_res`, latex: `A = ${fmt(A)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}yc_gen`, latex: "\\bar{y} = \\frac{A_1 \\bar{y}_1 + A_2 \\bar{y}_2 + A_3 \\bar{y}_3}{A}" },
            { key: `${pre}yc_sus`, latex: `\\bar{y} = \\frac{${f2(A1)} \\times ${f2(y1)} + ${f2(A2)} \\times ${f2(y2)} + ${f2(A3)} \\times ${f2(y3)}}{${f2(A)}}` },
            { key: `${pre}yc_res`, latex: `\\bar{y} = ${fmt(yc)} \\text{ cm}`, altura: 35 },
            { key: `${pre}Icx_gen`, latex: "I_{cx} = I_{cs,1} + I_{cs,2} + I_{cs,3}" },
            { key: `${pre}Icx_sus`, latex: `I_{cx} = ${fmt(Ics1)} + ${fmt(Ics2)} + ${fmt(Ics3)}` },
            { key: `${pre}Icx_res`, latex: `I_{cx} = ${fmt(Icx)} \\text{ cm}^4`, altura: 35 },
          )
        }

        if (el.plantilla === "cajon") {
          const bI = p.b_inf || p.b
          const tS = p.t_sup || p.t, tI = p.t_inf || p.t
          const tL = p.t_izq || p.t, tR = p.t_der || p.t
          const Aext = bI * p.h
          const bint = bI - tL - tR
          const hint = p.h - tS - tI
          const Aint = bint * hint
          const A = Aext - Aint
          const Icx_ext = bI * Math.pow(p.h, 3) / 12
          const Icx_int = bint * Math.pow(hint, 3) / 12
          eqs.push(
            { key: `${pre}Aext_gen`, latex: "A_{ext} = b_{inf} \\times h" },
            { key: `${pre}Aext_res`, latex: `A_{ext} = ${f2(bI)} \\times ${f2(p.h)} = ${fmt(Aext)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}Aint_gen`, latex: "A_{int} = (b_{inf} - t_{izq} - t_{der})(h - t_{sup} - t_{inf})" },
            { key: `${pre}Aint_res`, latex: `A_{int} = ${f2(bint)} \\times ${f2(hint)} = ${fmt(Aint)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}A_gen`, latex: "A = A_{ext} - A_{int}" },
            { key: `${pre}A_res`, latex: `A = ${fmt(Aext)} - ${fmt(Aint)} = ${fmt(A)} \\text{ cm}^2`, altura: 35 },
            { key: `${pre}Icx_gen`, latex: "I_{cx,ext} = \\frac{b_{inf} h^3}{12} \\qquad I_{cx,int} = \\frac{b_{int} h_{int}^3}{12}" },
            { key: `${pre}Icx_sus`, latex: `I_{cx,ext} = ${fmt(Icx_ext)} \\text{ cm}^4 \\qquad I_{cx,int} = ${fmt(Icx_int)} \\text{ cm}^4` },
            { key: `${pre}Icx_res`, latex: `I_{cx} \\approx ${fmt(Icx_ext - Icx_int)} \\text{ cm}^4`, altura: 35 },
          )
        }

        if (el.plantilla === "coordenadas") {
          eqs.push(
            { key: `${pre}gauss_A`, latex: "A = \\frac{1}{2} \\left| \\sum_{i=0}^{n-1} (x_i y_{i+1} - x_{i+1} y_i) \\right|", altura: 75 },
            { key: `${pre}gauss_xc`, latex: "\\bar{x} = \\frac{1}{6A} \\sum_{i=0}^{n-1} (x_i + x_{i+1})(x_i y_{i+1} - x_{i+1} y_i)", altura: 75 },
            { key: `${pre}gauss_yc`, latex: "\\bar{y} = \\frac{1}{6A} \\sum_{i=0}^{n-1} (y_i + y_{i+1})(x_i y_{i+1} - x_{i+1} y_i)", altura: 75 },
            { key: `${pre}gauss_Ix`, latex: "I_x = \\frac{1}{12} \\sum_{i=0}^{n-1} (y_i^2 + y_i y_{i+1} + y_{i+1}^2)(x_i y_{i+1} - x_{i+1} y_i)", altura: 75 },
          )
        }
      }

      const pngs = await renderizarEcuaciones(eqs)
      setEcuacionesPNG(pngs)
      setEstado("listo")
    } catch (err) {
      console.error("Error preparando PDF:", err)
      setEstado("idle")
    }
  }

  const descargar = async () => {
    setEstado("generando")
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { PDFSeccion: PDFComp } = await import("../../components/PDFSeccion")
      const blob = await pdf(
        <PDFComp
          elementos={elementos}
          resultado={resultado}
          datosUsuario={{ ...datosPDF, fecha: new Date().toLocaleDateString("es-CO") }}
          imagenCanvas={imagenCanvas}
          ecuacionesPNG={ecuacionesPNG}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `NodoCalc_Seccion_${datosPDF.proyecto || "memoria"}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
    setEstado("listo")
  }

  if (estado === "idle") return (
    <button onClick={prepararPDF} className="w-full text-sm bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors">
      📄 Preparar memoria de cálculo
    </button>
  )
  if (estado === "preparando") return (
    <div className="text-xs text-gray-500 text-center py-3 animate-pulse">⏳ Renderizando ecuaciones KaTeX...</div>
  )
  if (estado === "generando") return (
    <div className="text-xs text-gray-500 text-center py-3 animate-pulse">⏳ Generando PDF...</div>
  )
  return (
    <div className="flex flex-col gap-2">
      <button onClick={descargar} className="w-full text-sm bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors">
        ⬇ Descargar memoria de cálculo PDF
      </button>
      <button onClick={() => setEstado("idle")} className="text-xs text-gray-400 hover:underline text-center">
        Regenerar ecuaciones
      </button>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
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
  const [mostrarModalPDF, setMostrarModalPDF] = useState(false)
  const [datosPDF, setDatosPDF] = useState<DatosPDF>({ ingeniero: "", empresa: "", proyecto: "", descripcion: "", fecha: "" })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setSeccion = useSeccionStore((s) => s.setSeccion)
  const router = useRouter()
  const nextId = useRef(1)
  const cfg = useUnidadesStore(s => s.config) 
  useEffect(() => {
    if (canvasRef.current) dibujarCanvas(canvasRef.current, elementos, resultado)
  }, [elementos, resultado])

  const calcularConElementos = (els: Elemento[]) => {
    if (els.length === 0) { setResultado(null); return }
    const pols: PoligonoEntry[] = []
    for (const el of els) {
      if (el.plantilla === "coordenadas") {
        if (el.coordPts && el.coordPts.length > 2) pols.push({ pts: el.coordPts, signo: el.signo })
        continue
      }
      const p = offsetPoligonos(getPoligonos(el.plantilla, el.params), el.x0, el.y0)
      pols.push(...p.map(q => ({ ...q, signo: q.signo * el.signo })))
    }
    if (pols.length === 0) return
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
            const pts: Poligono = coordInput.trim().split("\n").filter(l => l.trim()).map(l => { const [x, y] = l.split(",").map(Number); return { x, y } })
            return { ...e, plantilla: plantillaActual, params: {}, x0: 0, y0: 0, signo: signoActual, coordPts: pts }
          } catch { alert("Error en coordenadas"); return e }
        }
        return { ...e, plantilla: plantillaActual, params: { ...paramsActuales }, x0: parseFloat(x0) || 0, y0: parseFloat(y0) || 0, signo: signoActual }
      })
      setElementos(nuevos); calcularConElementos(nuevos)
    } else {
      if (plantillaActual === "coordenadas") {
        try {
          const pts: Poligono = coordInput.trim().split("\n").filter(l => l.trim()).map(l => { const [x, y] = l.split(",").map(Number); return { x, y } })
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
                        <div className="text-xs text-gray-400 mt-1">Para huecos agrega otro elemento con − Resta</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {plantillasConfig[plantillaActual].campos.map(c => (
                          <div key={c.key}>
                            <div className="text-xs text-gray-500 mb-0.5" dangerouslySetInnerHTML={{ __html: c.labelHtml.replace(/\(cm\)/g, `(${cfg.seccion})`) }}></div>
                            <input type="number" value={paramsActuales[c.key] ?? ""}
                              onChange={e => setParamsActuales({ ...paramsActuales, [c.key]: parseFloat(e.target.value) })}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {plantillaActual !== "coordenadas" && (
                        <>
                          <div>
                            <div className="text-xs text-gray-500 mb-0.5">x₀ ({cfg.seccion})</div>
                            <input type="number" value={x0} onChange={e => setX0(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-0.5">y₀ ({cfg.seccion})</div>
                            <input type="number" value={y0} onChange={e => setY0(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                          </div>
                        </>
                      )}
                      <div className={plantillaActual === "coordenadas" ? "col-span-3" : ""}>
                        <div className="text-xs text-gray-500 mb-0.5">Operación</div>
                        <select value={signoActual} onChange={e => setSignoActual(parseInt(e.target.value) as 1 | -1)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400">
                          <option value={1}>+ Suma</option>
                          <option value={-1}>− Resta</option>
                        </select>
                      </div>
                    </div>
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
                      <div className="text-xs text-blue-500">I<sub>x</sub>′ ({cfg.inercia})</div>
                      <div className="text-xs text-blue-500">I<sub>y</sub>′ ({cfg.inercia})</div>
                    </div>
                  )}
                </div>
              )}

              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CARGAR EN MÓDULO</div>
                  <div className="flex flex-wrap gap-2">
                    {[{ key: "vigas/doble-integracion", label: "Vigas — Doble integración" }, { key: "vigas/ecuaciones-singularidad", label: "Vigas — Ecuaciones de singularidad" }, { key: "porticos", label: "Pórticos" }, { key: "armaduras", label: "Armaduras" }, { key: "matricial", label: "Método Matricial" }, { key: "pandeo", label: "Pandeo" }, { key: "diseno", label: "Diseño Estructural" }].map(mod => (
                      <button key={mod.key} onClick={() => cargarEnModulo(mod.key)} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">→ {mod.label}</button>
                    ))}
                  </div>
                </div>
              )}

              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MEMORIA DE CÁLCULO PDF</div>
                  {!mostrarModalPDF ? (
                    <button onClick={() => setMostrarModalPDF(true)} className="w-full text-sm bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors">
                      📄 Generar memoria de cálculo
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="text-xs text-gray-500">Datos para el encabezado del reporte</div>
                      {([
                        { key: "ingeniero", label: "Nombre del ingeniero" },
                        { key: "proyecto", label: "Nombre del proyecto" },
                        { key: "empresa", label: "Empresa / Universidad" },
                        { key: "descripcion", label: "Descripción de la sección" },
                      ] as { key: keyof DatosPDF; label: string }[]).map(f => (
                        <div key={f.key}>
                          <div className="text-xs text-gray-500 mb-0.5">{f.label}</div>
                          <input type="text" value={datosPDF[f.key]}
                            onChange={e => setDatosPDF({ ...datosPDF, [f.key]: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-400" />
                        </div>
                      ))}
                      <PDFBoton elementos={elementos} resultado={resultado} datosPDF={datosPDF} canvasRef={canvasRef} />
                      <button onClick={() => setMostrarModalPDF(false)} className="text-xs text-gray-400 hover:underline text-center">Cancelar</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PLANO CARTESIANO</div>
                <canvas ref={canvasRef} className="w-full border border-gray-100 rounded-lg bg-white" style={{ height: 380 }} />
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
                   <Prop s="A" n="Área total" v={`${fmt(resultado.A)} ${cfg.seccion}²`} />
                        <Prop s={<>x̄</>} n="Centroide x" v={`${fmt(resultado.xc)} ${cfg.seccion}`} />
                        <Prop s={<>ȳ</>} n="Centroide y" v={`${fmt(resultado.yc)} ${cfg.seccion}`} />
                        <Prop s={<>I<sub>cx</sub></>} n="Inercia centroidal x" v={`${fmt(resultado.Icx)} ${cfg.inercia}`} />
                        <Prop s={<>I<sub>cy</sub></>} n="Inercia centroidal y" v={`${fmt(resultado.Icy)} ${cfg.inercia}`} />
                        <Prop s={<>I<sub>xy</sub></>} n="Inercia producto" v={`${fmt(resultado.Ixy)} ${cfg.inercia}`} />
                        <Prop s={<>S<sub>x</sub>⁺</>} n="Módulo resistente sup." v={`${fmt(resultado.Sx_top)} ${cfg.modulo_resistente}`} />
                        <Prop s={<>S<sub>x</sub>⁻</>} n="Módulo resistente inf." v={`${fmt(resultado.Sx_bot)} ${cfg.modulo_resistente}`} />
                        <Prop s={<>S<sub>y</sub></>} n="Módulo resistente y" v={`${fmt(resultado.Sy)} ${cfg.modulo_resistente}`} />
                        <Prop s={<>r<sub>x</sub></>} n="Radio de giro x" v={`${fmt(resultado.rx)} ${cfg.seccion}`} />
                        <Prop s={<>r<sub>y</sub></>} n="Radio de giro y" v={`${fmt(resultado.ry)} ${cfg.seccion}`} />
                        <Prop s="J" n="Momento polar" v={`${fmt(resultado.J)} ${cfg.inercia}`} />
                        <Prop s={<>I<sub>1</sub></>} n="Inercia principal máx." v={`${fmt(resultado.I1)} ${cfg.inercia}`} />
                        <Prop s={<>I<sub>2</sub></>} n="Inercia principal mín." v={`${fmt(resultado.I2)} ${cfg.inercia}`} />
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