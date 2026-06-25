"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import { useSeccionStore } from "../../store/useSeccionStore"

type Plantilla = "rectangular" | "circular" | "tubo" | "I" | "T" | "L" | "C" | "cajon" | "coordenadas"
type Params = Record<string, number>
type Poligono = { x: number; y: number }[]

type ResultadoSeccion = {
  A: number; xc: number; yc: number; Icx: number; Icy: number; Ixy: number
  Sx_top: number; Sx_bot: number; Sy: number; rx: number; ry: number
  J: number; I1: number; I2: number; theta_p: number
}

function propiedadesPoligono(pts: Poligono) {
  const n = pts.length
  let A = 0, Cx = 0, Cy = 0, Ix = 0, Iy = 0, Ixy = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y
    const cross = xi * yj - xj * yi
    A += cross; Cx += (xi + xj) * cross; Cy += (yi + yj) * cross
    Ix += (yi * yi + yi * yj + yj * yj) * cross
    Iy += (xi * xi + xi * xj + xj * xj) * cross
    Ixy += (xi * yj + 2 * xi * yi + 2 * xj * yj + xj * yi) * cross
  }
  A /= 2; Cx /= (6 * A); Cy /= (6 * A)
  Ix = Math.abs(Ix) / 12; Iy = Math.abs(Iy) / 12; Ixy = Ixy / 24
  return { A: Math.abs(A), Cx, Cy, Ix, Iy, Ixy }
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
    const dx = p.Cx - xc, dy = p.Cy - yc
    Icx += signo * (p.Ix + p.A * dy * dy)
    Icy += signo * (p.Iy + p.A * dx * dx)
    Icxy += signo * (p.Ixy + p.A * dx * dy)
  }
  let ymax = -Infinity, ymin = Infinity, xmax = -Infinity
  for (const { pts } of poligonos) {
    for (const p of pts) {
      if (p.y > ymax) ymax = p.y; if (p.y < ymin) ymin = p.y
      if (Math.abs(p.x - xc) > xmax) xmax = Math.abs(p.x - xc)
    }
  }
  const Sx_top = Icx / (ymax - yc), Sx_bot = Icx / (yc - ymin), Sy = Icy / xmax
  const rx = Math.sqrt(Math.abs(Icx / A)), ry = Math.sqrt(Math.abs(Icy / A)), J = Icx + Icy
  const theta_p = 0.5 * Math.atan2(-2 * Icxy, Icx - Icy) * 180 / Math.PI
  const R = Math.sqrt(((Icx - Icy) / 2) ** 2 + Icxy ** 2)
  return { A, xc, yc, Icx, Icy, Ixy: Icxy, Sx_top, Sx_bot, Sy, rx, ry, J, I1: (Icx + Icy) / 2 + R, I2: (Icx + Icy) / 2 - R, theta_p }
}

function circlePoints(cx: number, cy: number, r: number, n = 64): Poligono {
  return Array.from({ length: n }, (_, i) => ({ x: cx + r * Math.cos(2 * Math.PI * i / n), y: cy + r * Math.sin(2 * Math.PI * i / n) }))
}

function getPoligonos(plantilla: Plantilla, params: Params): { pts: Poligono; signo: number }[] {
  const { b, h, t, r, bf, tf, hw, tw, bfb, tfb } = params
  switch (plantilla) {
    case "rectangular": return [{ pts: [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: h }, { x: 0, y: h }], signo: 1 }]
    case "circular": return [{ pts: circlePoints(r, r, r), signo: 1 }]
    case "tubo": return [{ pts: circlePoints(r, r, r), signo: 1 }, { pts: circlePoints(r, r, r - t), signo: -1 }]
    case "I": return [
      { pts: [{ x: 0, y: 0 }, { x: bfb, y: 0 }, { x: bfb, y: tfb }, { x: 0, y: tfb }], signo: 1 },
      { pts: [{ x: (bfb - tw) / 2, y: tfb }, { x: (bfb + tw) / 2, y: tfb }, { x: (bfb + tw) / 2, y: tfb + hw }, { x: (bfb - tw) / 2, y: tfb + hw }], signo: 1 },
      { pts: [{ x: (bfb - bf) / 2, y: tfb + hw }, { x: (bfb - bf) / 2 + bf, y: tfb + hw }, { x: (bfb - bf) / 2 + bf, y: tfb + hw + tf }, { x: (bfb - bf) / 2, y: tfb + hw + tf }], signo: 1 },
    ]
    case "T": return [
      { pts: [{ x: (bf - tw) / 2, y: 0 }, { x: (bf + tw) / 2, y: 0 }, { x: (bf + tw) / 2, y: hw }, { x: (bf - tw) / 2, y: hw }], signo: 1 },
      { pts: [{ x: 0, y: hw }, { x: bf, y: hw }, { x: bf, y: hw + tf }, { x: 0, y: hw + tf }], signo: 1 },
    ]
    case "L": return [{ pts: [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: t }, { x: t, y: t }, { x: t, y: h }, { x: 0, y: h }], signo: 1 }]
    case "C": return [{ pts: [{ x: 0, y: 0 }, { x: bf, y: 0 }, { x: bf, y: tf }, { x: tw, y: tf }, { x: tw, y: tf + hw }, { x: bf, y: tf + hw }, { x: bf, y: tf * 2 + hw }, { x: 0, y: tf * 2 + hw }], signo: 1 }]
    case "cajon": return [
      { pts: [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: h }, { x: 0, y: h }], signo: 1 },
      { pts: [{ x: t, y: t }, { x: b - t, y: t }, { x: b - t, y: h - t }, { x: t, y: h - t }], signo: -1 },
    ]
    default: return []
  }
}

const plantillasConfig: Record<Plantilla, { label: string; campos: { key: string; label: string; default: number }[] }> = {
  rectangular: { label: "Rectangular", campos: [{ key: "b", label: "Base b (cm)", default: 30 }, { key: "h", label: "Altura h (cm)", default: 50 }] },
  circular: { label: "Circular sólida", campos: [{ key: "r", label: "Radio r (cm)", default: 20 }] },
  tubo: { label: "Tubo circular", campos: [{ key: "r", label: "Radio ext. r (cm)", default: 20 }, { key: "t", label: "Espesor t (cm)", default: 2 }] },
  I: { label: "Perfil I", campos: [{ key: "bf", label: "Ancho ala sup. bf (cm)", default: 20 }, { key: "tf", label: "Espesor ala sup. tf (cm)", default: 1.5 }, { key: "hw", label: "Alto alma hw (cm)", default: 30 }, { key: "tw", label: "Espesor alma tw (cm)", default: 1 }, { key: "bfb", label: "Ancho ala inf. bfb (cm)", default: 20 }, { key: "tfb", label: "Espesor ala inf. tfb (cm)", default: 1.5 }] },
  T: { label: "Perfil T", campos: [{ key: "bf", label: "Ancho ala bf (cm)", default: 20 }, { key: "tf", label: "Espesor ala tf (cm)", default: 2 }, { key: "hw", label: "Alto alma hw (cm)", default: 20 }, { key: "tw", label: "Espesor alma tw (cm)", default: 1.5 }] },
  L: { label: "Ángulo L", campos: [{ key: "b", label: "Ancho b (cm)", default: 10 }, { key: "h", label: "Alto h (cm)", default: 10 }, { key: "t", label: "Espesor t (cm)", default: 1 }] },
  C: { label: "Canal C", campos: [{ key: "bf", label: "Ancho ala bf (cm)", default: 8 }, { key: "tf", label: "Espesor ala tf (cm)", default: 1 }, { key: "hw", label: "Alto alma hw (cm)", default: 20 }, { key: "tw", label: "Espesor alma tw (cm)", default: 1 }] },
  cajon: { label: "Cajón rectangular", campos: [{ key: "b", label: "Base b (cm)", default: 30 }, { key: "h", label: "Altura h (cm)", default: 50 }, { key: "t", label: "Espesor t (cm)", default: 2 }] },
  coordenadas: { label: "Por coordenadas", campos: [] },
}

// SVG de referencia para cada plantilla
function EsquemaReferencia({ plantilla }: { plantilla: Plantilla }) {
  const s = "text-gray-600"
  const dim = "fill-blue-600 text-xs"
  switch (plantilla) {
    case "rectangular": return (
      <svg viewBox="0 0 200 160" className="w-full h-32">
        <rect x="40" y="20" width="120" height="100" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        {/* b */}
        <line x1="40" y1="135" x2="160" y2="135" stroke="#1d4ed8" strokeWidth="1" markerEnd="url(#arrow)" />
        <line x1="40" y1="130" x2="40" y2="140" stroke="#1d4ed8" strokeWidth="1" />
        <line x1="160" y1="130" x2="160" y2="140" stroke="#1d4ed8" strokeWidth="1" />
        <text x="100" y="150" textAnchor="middle" className={dim} fontSize="12" fill="#1d4ed8">b</text>
        {/* h */}
        <line x1="170" y1="20" x2="170" y2="120" stroke="#1d4ed8" strokeWidth="1" />
        <line x1="165" y1="20" x2="175" y2="20" stroke="#1d4ed8" strokeWidth="1" />
        <line x1="165" y1="120" x2="175" y2="120" stroke="#1d4ed8" strokeWidth="1" />
        <text x="185" y="75" textAnchor="middle" className={dim} fontSize="12" fill="#1d4ed8">h</text>
      </svg>
    )
    case "circular": return (
      <svg viewBox="0 0 200 160" className="w-full h-32">
        <circle cx="100" cy="80" r="60" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <line x1="100" y1="80" x2="160" y2="80" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="4,2" />
        <text x="130" y="70" textAnchor="middle" fontSize="12" fill="#1d4ed8">r</text>
        <circle cx="100" cy="80" r="2" fill="#1d4ed8" />
      </svg>
    )
    case "tubo": return (
      <svg viewBox="0 0 200 160" className="w-full h-32">
        <circle cx="100" cy="80" r="60" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <circle cx="100" cy="80" r="45" fill="white" stroke="#1d4ed8" strokeWidth="1.5" />
        <line x1="100" y1="80" x2="160" y2="80" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="4,2" />
        <text x="130" y="70" textAnchor="middle" fontSize="12" fill="#1d4ed8">r</text>
        <line x1="115" y1="80" x2="145" y2="80" stroke="#e11d48" strokeWidth="1.5" />
        <text x="130" y="95" textAnchor="middle" fontSize="11" fill="#e11d48">t</text>
        <circle cx="100" cy="80" r="2" fill="#1d4ed8" />
      </svg>
    )
    case "I": return (
      <svg viewBox="0 0 200 180" className="w-full h-36">
        {/* ala inf */}
        <rect x="30" y="140" width="140" height="15" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        {/* alma */}
        <rect x="87" y="40" width="26" height="100" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        {/* ala sup */}
        <rect x="50" y="25" width="100" height="15" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <text x="100" y="18" textAnchor="middle" fontSize="11" fill="#1d4ed8">bf</text>
        <text x="175" y="35" textAnchor="middle" fontSize="11" fill="#1d4ed8">tf</text>
        <text x="120" y="95" textAnchor="middle" fontSize="11" fill="#1d4ed8">tw</text>
        <text x="15" y="95" textAnchor="middle" fontSize="11" fill="#1d4ed8">hw</text>
        <text x="100" y="175" textAnchor="middle" fontSize="11" fill="#1d4ed8">bfb</text>
        <text x="175" y="152" textAnchor="middle" fontSize="11" fill="#1d4ed8">tfb</text>
      </svg>
    )
    case "T": return (
      <svg viewBox="0 0 200 160" className="w-full h-32">
        <rect x="30" y="20" width="140" height="20" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="87" y="40" width="26" height="100" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <text x="100" y="15" textAnchor="middle" fontSize="11" fill="#1d4ed8">bf</text>
        <text x="175" y="33" textAnchor="middle" fontSize="11" fill="#1d4ed8">tf</text>
        <text x="120" y="95" textAnchor="middle" fontSize="11" fill="#1d4ed8">tw</text>
        <text x="15" y="95" textAnchor="middle" fontSize="11" fill="#1d4ed8">hw</text>
      </svg>
    )
    case "L": return (
      <svg viewBox="0 0 200 160" className="w-full h-32">
        <polygon points="30,140 30,20 45,20 45,125 140,125 140,140" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <text x="85" y="155" textAnchor="middle" fontSize="11" fill="#1d4ed8">b</text>
        <text x="15" y="80" textAnchor="middle" fontSize="11" fill="#1d4ed8">h</text>
        <text x="60" y="110" textAnchor="middle" fontSize="11" fill="#e11d48">t</text>
      </svg>
    )
    case "C": return (
      <svg viewBox="0 0 200 160" className="w-full h-32">
        <polygon points="30,140 30,20 110,20 110,35 50,35 50,125 110,125 110,140" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <text x="70" y="15" textAnchor="middle" fontSize="11" fill="#1d4ed8">bf</text>
        <text x="120" y="30" textAnchor="middle" fontSize="11" fill="#1d4ed8">tf</text>
        <text x="15" y="80" textAnchor="middle" fontSize="11" fill="#1d4ed8">hw</text>
        <text x="42" y="80" textAnchor="middle" fontSize="11" fill="#e11d48">tw</text>
      </svg>
    )
    case "cajon": return (
      <svg viewBox="0 0 200 160" className="w-full h-32">
        <rect x="30" y="20" width="140" height="120" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="45" y="35" width="110" height="90" fill="white" stroke="#1d4ed8" strokeWidth="1.5" />
        <text x="100" y="155" textAnchor="middle" fontSize="11" fill="#1d4ed8">b</text>
        <text x="185" y="80" textAnchor="middle" fontSize="11" fill="#1d4ed8">h</text>
        <text x="38" y="80" textAnchor="middle" fontSize="11" fill="#e11d48">t</text>
      </svg>
    )
    case "coordenadas": return (
      <svg viewBox="0 0 200 160" className="w-full h-32">
        <line x1="20" y1="140" x2="180" y2="140" stroke="#9ca3af" strokeWidth="1" markerEnd="url(#arrowGray)" />
        <line x1="20" y1="140" x2="20" y2="10" stroke="#9ca3af" strokeWidth="1" />
        <text x="185" y="143" fontSize="11" fill="#9ca3af">x</text>
        <text x="15" y="8" fontSize="11" fill="#9ca3af">y</text>
        <polygon points="60,120 140,120 160,60 80,40 40,80" fill="rgba(59,130,246,0.15)" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="5,3" />
        <text x="50" y="125" fontSize="9" fill="#1d4ed8">P1</text>
        <text x="140" y="125" fontSize="9" fill="#1d4ed8">P2</text>
        <text x="155" y="58" fontSize="9" fill="#1d4ed8">P3</text>
        <text x="72" y="38" fontSize="9" fill="#1d4ed8">P4</text>
        <text x="25" y="78" fontSize="9" fill="#1d4ed8">P5</text>
        <text x="85" y="95" fontSize="10" fill="#6b7280">↻ horario = área +</text>
      </svg>
    )
    default: return null
  }
}

function fmt(n: number, dec = 4) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(dec)
}

export default function SectionBuilder() {
  const [plantilla, setPlantilla] = useState<Plantilla>("rectangular")
  const [params, setParams] = useState<Params>({ b: 30, h: 50 })
  const [resultado, setResultado] = useState<ResultadoSeccion | null>(null)
  const [coordInput, setCoordInput] = useState("")
  const [ptoX, setPtoX] = useState("")
  const [ptoY, setPtoY] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setSeccion = useSeccionStore((s) => s.setSeccion)
  const router = useRouter()

  const handlePlantilla = (p: Plantilla) => {
    setPlantilla(p)
    const defaults: Params = {}
    plantillasConfig[p].campos.forEach(c => { defaults[c.key] = c.default })
    setParams(defaults)
    setResultado(null)
  }

  const dibujar = (poligonos: { pts: Poligono; signo: number }[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Fondo cuadriculado
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 0.5
    for (let x = 0; x <= canvas.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
    }
    for (let y = 0; y <= canvas.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
    }

    // Ejes
    const pad = 30
    ctx.strokeStyle = "#9ca3af"
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad, canvas.height - pad); ctx.lineTo(canvas.width - 5, canvas.height - pad); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad, canvas.height - pad); ctx.lineTo(pad, 5); ctx.stroke()
    ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif"
    ctx.fillText("x", canvas.width - 12, canvas.height - pad + 4)
    ctx.fillText("y", pad - 4, 10)

    // Bounds
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity
    for (const { pts } of poligonos) {
      for (const p of pts) {
        if (p.x < xmin) xmin = p.x; if (p.x > xmax) xmax = p.x
        if (p.y < ymin) ymin = p.y; if (p.y > ymax) ymax = p.y
      }
    }

    const W = canvas.width - pad * 2 - 10
    const H = canvas.height - pad * 2 - 10
    const scale = Math.min(W / (xmax - xmin || 1), H / (ymax - ymin || 1))
    const tx = (x: number) => pad + (x - xmin) * scale
    const ty = (y: number) => canvas.height - pad - (y - ymin) * scale

    for (const { pts, signo } of poligonos) {
      ctx.beginPath()
      ctx.moveTo(tx(pts[0].x), ty(pts[0].y))
      for (const p of pts) ctx.lineTo(tx(p.x), ty(p.y))
      ctx.closePath()
      ctx.fillStyle = signo > 0 ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,1)"
      ctx.strokeStyle = "#1d4ed8"
      ctx.lineWidth = 2
      ctx.fill(); ctx.stroke()
    }

    // Centroide
    if (resultado) {
      const cx = tx(resultado.xc), cy = ty(resultado.yc)
      ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke()
      ctx.fillStyle = "#dc2626"; ctx.font = "10px sans-serif"
      ctx.fillText("C", cx + 5, cy - 5)
    }
  }

  const calcular = () => {
    let poligonos: { pts: Poligono; signo: number }[]
    if (plantilla === "coordenadas") {
      try {
        const lineas = coordInput.trim().split("\n").filter(l => l.trim())
        const pts: Poligono = lineas.map(l => { const [x, y] = l.split(",").map(Number); return { x, y } })
        poligonos = [{ pts, signo: 1 }]
      } catch {
        alert("Error en las coordenadas. Formato: x,y por línea"); return
      }
    } else {
      poligonos = getPoligonos(plantilla, params)
    }
    const res = calcularSeccion(poligonos)
    setResultado(res)
    setTimeout(() => dibujar(poligonos), 50)
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
      nombre: `Sección ${plantillasConfig[plantilla].label}`,
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
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">TIPO DE SECCIÓN</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(plantillasConfig) as Plantilla[]).map((p) => (
                    <button key={p} onClick={() => handlePlantilla(p)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${plantilla === p ? "bg-blue-700 text-white border-blue-700" : "text-gray-600 border-gray-300 hover:border-blue-300"}`}>
                      {plantillasConfig[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Esquema de referencia */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">REFERENCIA DE DIMENSIONES</div>
                <EsquemaReferencia plantilla={plantilla} />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DIMENSIONES</div>
                {plantilla === "coordenadas" ? (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Ingresa coordenadas (x,y) una por línea. Sentido horario = área positiva, antihorario = hueco.</div>
                    <textarea value={coordInput} onChange={(e) => setCoordInput(e.target.value)}
                      placeholder={"0,0\n30,0\n30,50\n0,50"} rows={6}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {plantillasConfig[plantilla].campos.map((c) => (
                      <div key={c.key}>
                        <div className="text-xs text-gray-500 mb-1">{c.label}</div>
                        <input type="number" value={params[c.key] ?? ""}
                          onChange={(e) => setParams({ ...params, [c.key]: parseFloat(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={calcular} className="mt-4 w-full bg-blue-700 text-white text-sm py-2.5 rounded-lg hover:bg-blue-800">
                  Calcular propiedades
                </button>
              </div>

              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">INERCIA EN PUNTO SOLICITADO</div>
                  <div className="text-xs text-gray-500 mb-3">Calcula Ix e Iy respecto a ejes paralelos que pasan por el punto (x,y) ingresado (Teorema de Steiner).</div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">x (cm)</div>
                      <input type="number" value={ptoX} onChange={(e) => setPtoX(e.target.value)} placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">y (cm)</div>
                      <input type="number" value={ptoY} onChange={(e) => setPtoY(e.target.value)} placeholder="0"
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

              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CARGAR EN MÓDULO</div>
                  <div className="text-xs text-gray-500 mb-3">Los datos de la sección se cargarán automáticamente en el módulo seleccionado.</div>
                  <div className="flex flex-wrap gap-2">
                    {[{ key: "vigas", label: "Vigas" }, { key: "porticos", label: "Pórticos" }, { key: "armaduras", label: "Armaduras" }, { key: "matricial", label: "Método Matricial" }, { key: "pandeo", label: "Pandeo" }, { key: "diseno", label: "Diseño Estructural" }].map((mod) => (
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
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">VISUALIZACIÓN</div>
                <canvas ref={canvasRef} width={420} height={320}
                  className="w-full border border-gray-100 rounded-lg bg-white" />
                {resultado && <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-200 border border-blue-700 inline-block rounded-sm"></span> Sección</span>
                  <span className="flex items-center gap-1"><span className="text-red-600 font-bold">+</span> Centroide</span>
                </div>}
              </div>

              {resultado && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-4">PROPIEDADES DE LA SECCIÓN</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Prop s="A" n="Área" v={`${fmt(resultado.A)} cm²`} />
                    <Prop s="ȳ" n="Centroide y" v={`${fmt(resultado.yc)} cm`} />
                    <Prop s="x̄" n="Centroide x" v={`${fmt(resultado.xc)} cm`} />
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