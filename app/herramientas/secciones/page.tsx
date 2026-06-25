"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/Sidebar"
import { useSeccionStore } from "../../store/useSeccionStore"

type Plantilla = "rectangular" | "circular" | "tubo" | "I" | "T" | "L" | "C" | "cajon" | "coordenadas"
type Params = Record<string, number>
type Poligono = { x: number; y: number }[]

type ResultadoSeccion = {
  A: number
  xc: number
  yc: number
  Icx: number
  Icy: number
  Ixy: number
  Sx_top: number
  Sx_bot: number
  Sy: number
  rx: number
  ry: number
  J: number
  I1: number
  I2: number
  theta_p: number
}

function propiedadesPoligono(pts: Poligono) {
  const n = pts.length
  let A = 0, Cx = 0, Cy = 0, Ix = 0, Iy = 0, Ixy = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const xi = pts[i].x, yi = pts[i].y
    const xj = pts[j].x, yj = pts[j].y
    const cross = xi * yj - xj * yi
    A += cross
    Cx += (xi + xj) * cross
    Cy += (yi + yj) * cross
    Ix += (yi * yi + yi * yj + yj * yj) * cross
    Iy += (xi * xi + xi * xj + xj * xj) * cross
    Ixy += (xi * yj + 2 * xi * yi + 2 * xj * yj + xj * yi) * cross
  }
  A /= 2
  Cx /= (6 * A)
  Cy /= (6 * A)
  Ix = Math.abs(Ix) / 12
  Iy = Math.abs(Iy) / 12
  Ixy = Ixy / 24
  return { A: Math.abs(A), Cx, Cy, Ix, Iy, Ixy }
}

function calcularSeccion(poligonos: { pts: Poligono; signo: number }[]): ResultadoSeccion {
  let A = 0, AxC = 0, AyC = 0
  for (const { pts, signo } of poligonos) {
    const p = propiedadesPoligono(pts)
    A += signo * p.A
    AxC += signo * p.A * p.Cx
    AyC += signo * p.A * p.Cy
  }
  const xc = AxC / A
  const yc = AyC / A

  let Icx = 0, Icy = 0, Icxy = 0
  for (const { pts, signo } of poligonos) {
    const p = propiedadesPoligono(pts)
    const dx = p.Cx - xc
    const dy = p.Cy - yc
    Icx += signo * (p.Ix + p.A * dy * dy)
    Icy += signo * (p.Iy + p.A * dx * dx)
    Icxy += signo * (p.Ixy + p.A * dx * dy)
  }

  let ymax = -Infinity, ymin = Infinity, xmax = -Infinity
  for (const { pts } of poligonos) {
    for (const p of pts) {
      if (p.y > ymax) ymax = p.y
      if (p.y < ymin) ymin = p.y
      if (Math.abs(p.x - xc) > xmax) xmax = Math.abs(p.x - xc)
    }
  }

  const Sx_top = Icx / (ymax - yc)
  const Sx_bot = Icx / (yc - ymin)
  const Sy = Icy / xmax
  const rx = Math.sqrt(Math.abs(Icx / A))
  const ry = Math.sqrt(Math.abs(Icy / A))
  const J = Icx + Icy
  const theta_p = 0.5 * Math.atan2(-2 * Icxy, Icx - Icy) * 180 / Math.PI
  const R = Math.sqrt(((Icx - Icy) / 2) ** 2 + Icxy ** 2)
  const I1 = (Icx + Icy) / 2 + R
  const I2 = (Icx + Icy) / 2 - R

  return { A, xc, yc, Icx, Icy, Ixy: Icxy, Sx_top, Sx_bot, Sy, rx, ry, J, I1, I2, theta_p }
}

function ptsRectangular(p: Params): Poligono {
  return [{ x: 0, y: 0 }, { x: p.b, y: 0 }, { x: p.b, y: p.h }, { x: 0, y: p.h }]
}

function ptsI(p: Params): { pts: Poligono; signo: number }[] {
  const { bf, tf, hw, tw, bfb, tfb } = p
  const h = tf + hw + tfb
  const ala_inf: Poligono = [{ x: 0, y: 0 }, { x: bfb, y: 0 }, { x: bfb, y: tfb }, { x: 0, y: tfb }]
  const alma: Poligono = [{ x: (bfb - tw) / 2, y: tfb }, { x: (bfb + tw) / 2, y: tfb }, { x: (bfb + tw) / 2, y: tfb + hw }, { x: (bfb - tw) / 2, y: tfb + hw }]
  const ala_sup: Poligono = [{ x: (bfb - bf) / 2, y: tfb + hw }, { x: (bfb - bf) / 2 + bf, y: tfb + hw }, { x: (bfb - bf) / 2 + bf, y: h }, { x: (bfb - bf) / 2, y: h }]
  return [{ pts: ala_inf, signo: 1 }, { pts: alma, signo: 1 }, { pts: ala_sup, signo: 1 }]
}

function ptsT(p: Params): { pts: Poligono; signo: number }[] {
  const { bf, tf, hw, tw } = p
  const alma: Poligono = [{ x: (bf - tw) / 2, y: 0 }, { x: (bf + tw) / 2, y: 0 }, { x: (bf + tw) / 2, y: hw }, { x: (bf - tw) / 2, y: hw }]
  const ala: Poligono = [{ x: 0, y: hw }, { x: bf, y: hw }, { x: bf, y: hw + tf }, { x: 0, y: hw + tf }]
  return [{ pts: alma, signo: 1 }, { pts: ala, signo: 1 }]
}

function ptsCajon(p: Params): { pts: Poligono; signo: number }[] {
  const { b, h, t } = p
  const ext: Poligono = [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: h }, { x: 0, y: h }]
  const int: Poligono = [{ x: t, y: t }, { x: b - t, y: t }, { x: b - t, y: h - t }, { x: t, y: h - t }]
  return [{ pts: ext, signo: 1 }, { pts: int, signo: -1 }]
}

function circlePoints(cx: number, cy: number, r: number, n = 64): Poligono {
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })
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

function getPoligonos(plantilla: Plantilla, params: Params): { pts: Poligono; signo: number }[] {
  switch (plantilla) {
    case "rectangular": return [{ pts: ptsRectangular(params), signo: 1 }]
    case "circular": return [{ pts: circlePoints(params.r, params.r, params.r), signo: 1 }]
    case "tubo": return [{ pts: circlePoints(params.r, params.r, params.r), signo: 1 }, { pts: circlePoints(params.r, params.r, params.r - params.t), signo: -1 }]
    case "I": return ptsI(params)
    case "T": return ptsT(params)
    case "L": return [{ pts: [{ x: 0, y: 0 }, { x: params.b, y: 0 }, { x: params.b, y: params.t }, { x: params.t, y: params.t }, { x: params.t, y: params.h }, { x: 0, y: params.h }], signo: 1 }]
    case "C": return [{ pts: [{ x: 0, y: 0 }, { x: params.bf, y: 0 }, { x: params.bf, y: params.tf }, { x: params.tw, y: params.tf }, { x: params.tw, y: params.tf + params.hw }, { x: params.bf, y: params.tf + params.hw }, { x: params.bf, y: params.tf * 2 + params.hw }, { x: 0, y: params.tf * 2 + params.hw }], signo: 1 }]
    case "cajon": return ptsCajon(params)
    default: return []
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

  const campos = plantillasConfig[plantilla].campos

  const handlePlantilla = (p: Plantilla) => {
    setPlantilla(p)
    const defaults: Params = {}
    plantillasConfig[p].campos.forEach(c => { defaults[c.key] = c.default })
    setParams(defaults)
    setResultado(null)
  }

  const calcular = () => {
    let poligonos: { pts: Poligono; signo: number }[]
    if (plantilla === "coordenadas") {
      try {
        const lineas = coordInput.trim().split("\n").filter(l => l.trim())
        const pts: Poligono = lineas.map(l => {
          const [x, y] = l.split(",").map(Number)
          return { x, y }
        })
        poligonos = [{ pts, signo: 1 }]
      } catch {
        alert("Error en las coordenadas. Formato: x,y por línea")
        return
      }
    } else {
      poligonos = getPoligonos(plantilla, params)
    }
    const res = calcularSeccion(poligonos)
    setResultado(res)
    dibujar(poligonos)
  }

  const dibujar = (poligonos: { pts: Poligono; signo: number }[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity
    for (const { pts } of poligonos) {
      for (const p of pts) {
        if (p.x < xmin) xmin = p.x
        if (p.x > xmax) xmax = p.x
        if (p.y < ymin) ymin = p.y
        if (p.y > ymax) ymax = p.y
      }
    }

    const pad = 20
    const W = canvas.width - pad * 2
    const H = canvas.height - pad * 2
    const scale = Math.min(W / (xmax - xmin || 1), H / (ymax - ymin || 1))
    const tx = (x: number) => pad + (x - xmin) * scale
    const ty = (y: number) => canvas.height - pad - (y - ymin) * scale

    for (const { pts, signo } of poligonos) {
      ctx.beginPath()
      ctx.moveTo(tx(pts[0].x), ty(pts[0].y))
      for (const p of pts) ctx.lineTo(tx(p.x), ty(p.y))
      ctx.closePath()
      ctx.fillStyle = signo > 0 ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,1)"
      ctx.strokeStyle = "#1d4ed8"
      ctx.lineWidth = 1.5
      ctx.fill()
      ctx.stroke()
    }
  }

  const calcularSteiner = () => {
    if (!resultado) return null
    const x = parseFloat(ptoX)
    const y = parseFloat(ptoY)
    if (isNaN(x) || isNaN(y)) return null
    const dx = x - resultado.xc
    const dy = y - resultado.yc
    return {
      Ix: resultado.Icx + resultado.A * dy * dy,
      Iy: resultado.Icy + resultado.A * dx * dx,
    }
  }

  const cargarEnModulo = (modulo: string) => {
    if (!resultado) return
    setSeccion({
      nombre: `Sección ${plantillasConfig[plantilla].label}`,
      A: resultado.A,
      Icx: resultado.Icx,
      Icy: resultado.Icy,
      Sx_top: resultado.Sx_top,
      Sx_bot: resultado.Sx_bot,
      Sy: resultado.Sy,
      rx: resultado.rx,
      ry: resultado.ry,
      J: resultado.J,
      E: null,
      fc: null,
      ft: null,
      fy: null,
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

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DIMENSIONES</div>
                {plantilla === "coordenadas" ? (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Ingresa coordenadas (x,y) una por línea. Sentido horario = área positiva, antihorario = hueco.</div>
                    <textarea value={coordInput} onChange={(e) => setCoordInput(e.target.value)}
                      placeholder={"0,0\n30,0\n30,50\n0,50"} rows={8}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {campos.map((c) => (
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
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">INERCIA EN PUNTO SOLICITADO (STEINER)</div>
                  <div className="text-xs text-gray-500 mb-3">Coordenadas del punto de interés para calcular inercia respecto a ejes paralelos.</div>
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
                  <div className="text-xs text-gray-500 mb-3">Selecciona el módulo donde quieres usar esta sección. Los datos se cargarán automáticamente.</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "vigas", label: "Vigas" },
                      { key: "porticos", label: "Pórticos" },
                      { key: "armaduras", label: "Armaduras" },
                      { key: "matricial", label: "Método Matricial" },
                      { key: "pandeo", label: "Pandeo" },
                      { key: "diseno", label: "Diseño Estructural" },
                    ].map((mod) => (
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
                <canvas ref={canvasRef} width={400} height={300}
                  className="w-full border border-gray-100 rounded-lg bg-gray-50" />
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