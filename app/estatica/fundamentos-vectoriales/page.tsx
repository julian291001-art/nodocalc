"use client"
import { useState, useRef, useEffect } from "react"
import Sidebar from "../../components/Sidebar"
import { useUnidadesStore } from "../../store/useUnidadesStore"

type Fuerza = {
  id: number
  nombre: string
  magnitud: number
  angulo: number // grados desde eje x positivo
  color: string
}

const COLORES = ["#1d4ed8", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d", "#65a30d"]

function fmt(n: number, dec = 4) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(dec)
}

function fmt2(n: number) { return n.toFixed(2) }

export default function FundamentosVectoriales() {
  const cfg = useUnidadesStore(s => s.config)
  const [fuerzas, setFuerzas] = useState<Fuerza[]>([
    { id: 1, nombre: "F₁", magnitud: 100, angulo: 30, color: COLORES[0] },
    { id: 2, nombre: "F₂", magnitud: 80, angulo: 120, color: COLORES[1] },
  ])
  const [metodo, setMetodo] = useState<"vectorial" | "descomposicion" | "poligono">("descomposicion")
  const [nextId, setNextId] = useState(3)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mostrarModalPDF, setMostrarModalPDF] = useState(false)
  const [datosPDF, setDatosPDF] = useState({ ingeniero: "", empresa: "", proyecto: "", descripcion: "", fecha: "" })
  const [estadoPDF, setEstadoPDF] = useState<"idle" | "generando">("idle")
  // Calcular resultante
  const Rx = fuerzas.reduce((s, f) => s + f.magnitud * Math.cos(f.angulo * Math.PI / 180), 0)
  const Ry = fuerzas.reduce((s, f) => s + f.magnitud * Math.sin(f.angulo * Math.PI / 180), 0)
  const R = Math.sqrt(Rx * Rx + Ry * Ry)
  const theta = Math.atan2(Ry, Rx) * 180 / Math.PI

  useEffect(() => {
    dibujar()
  }, [fuerzas, metodo])

const dibujar = () => {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext("2d")!

  const dpr = window.devicePixelRatio || 1
  const W = canvas.offsetWidth
  const H = canvas.offsetHeight || 380
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.scale(dpr, dpr)

  ctx.fillStyle = "#f8fafc"
  ctx.fillRect(0, 0, W, H)

  const cx = W / 2, cy = H / 2
  const maxMag = Math.max(...fuerzas.map(f => f.magnitud), R, 1)
  const scale = Math.min(W, H) * 0.38 / maxMag

  // Cuadrícula
  ctx.strokeStyle = "#e2e8f0"
  ctx.lineWidth = 0.5
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath(); ctx.moveTo(cx + i * 30, 0); ctx.lineTo(cx + i * 30, H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, cy + i * 30); ctx.lineTo(W, cy + i * 30); ctx.stroke()
  }

  // Ejes
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke()
  ctx.fillStyle = "#94a3b8"; ctx.font = "11px sans-serif"
  ctx.fillText("x", W - 14, cy - 5)
  ctx.fillText("y", cx + 5, 12)

  function flecha(x1: number, y1: number, x2: number, y2: number, color: string, grosor = 2) {
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) return
    const headLen = 12, headAngle = 0.4
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = grosor
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - headLen * Math.cos(Math.atan2(dy, dx) - headAngle), y2 - headLen * Math.sin(Math.atan2(dy, dx) - headAngle))
    ctx.lineTo(x2 - headLen * Math.cos(Math.atan2(dy, dx) + headAngle), y2 - headLen * Math.sin(Math.atan2(dy, dx) + headAngle))
    ctx.closePath(); ctx.fill()
  }

  if (metodo === "poligono") {
    let px = cx, py = cy
    fuerzas.forEach(f => {
      const vx = f.magnitud * scale * Math.cos(f.angulo * Math.PI / 180)
      const vy = -f.magnitud * scale * Math.sin(f.angulo * Math.PI / 180)
      flecha(px, py, px + vx, py + vy, f.color, 2.5)
      ctx.fillStyle = f.color; ctx.font = "bold 11px sans-serif"
      ctx.fillText(f.nombre, px + vx / 2 + 6, py + vy / 2)
      px += vx; py += vy
    })
    if (fuerzas.length > 1) {
      flecha(cx, cy, px, py, "#dc2626", 3)
      ctx.fillStyle = "#dc2626"; ctx.font = "bold 12px sans-serif"
      ctx.fillText("R", (cx + px) / 2 + 8, (cy + py) / 2)
    }
  } else {
    fuerzas.forEach(f => {
      const vx = f.magnitud * scale * Math.cos(f.angulo * Math.PI / 180)
      const vy = -f.magnitud * scale * Math.sin(f.angulo * Math.PI / 180)
      flecha(cx, cy, cx + vx, cy + vy, f.color, 2.5)
      if (metodo === "descomposicion") {
        ctx.setLineDash([4, 3])
        ctx.strokeStyle = f.color + "80"; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + vx, cy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx + vx, cy); ctx.lineTo(cx + vx, cy + vy); ctx.stroke()
        ctx.setLineDash([])
      }
      ctx.fillStyle = f.color; ctx.font = "bold 11px sans-serif"
      ctx.fillText(f.nombre, cx + vx * 1.08, cy + vy * 1.08)
      ctx.strokeStyle = f.color + "60"; ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, 28, -f.angulo * Math.PI / 180, 0)
      if (f.angulo > 0) ctx.arc(cx, cy, 28, 0, -f.angulo * Math.PI / 180, true)
      ctx.stroke()
    })
    if (fuerzas.length > 0 && R > 0.01) {
      const rvx = Rx * scale, rvy = -Ry * scale
      flecha(cx, cy, cx + rvx, cy + rvy, "#dc2626", 3)
      ctx.fillStyle = "#dc2626"; ctx.font = "bold 13px sans-serif"
      ctx.fillText("R", cx + rvx * 1.1, cy + rvy * 1.1)
    }
  }
}

  const agregarFuerza = () => {
    const id = nextId
    setNextId(id + 1)
    setFuerzas([...fuerzas, {
      id,
      nombre: `F${id}`,
      magnitud: 100,
      angulo: 0,
      color: COLORES[(id - 1) % COLORES.length]
    }])
  }

  const eliminar = (id: number) => setFuerzas(fuerzas.filter(f => f.id !== id))

  const actualizar = (id: number, key: keyof Fuerza, val: string | number) => {
    setFuerzas(fuerzas.map(f => f.id === id ? { ...f, [key]: typeof val === "string" && key !== "nombre" ? parseFloat(val) || 0 : val } : f))
  }

  const descargarPDF = async () => {
  setEstadoPDF("generando")
  try {
    const { pdf } = await import("@react-pdf/renderer")
    const { PDFVectorial } = await import("../../components/PDFVectorial")
    const imagenCanvas = canvasRef.current ? canvasRef.current.toDataURL("image/png") : ""
    const blob = await pdf(
      <PDFVectorial
        fuerzas={fuerzas}
        Rx={Rx} Ry={Ry} R={R} theta={theta}
        metodo={metodo}
        imagenCanvas={imagenCanvas}
        datosUsuario={datosPDF}
        unidadFuerza={cfg.fuerza}
      />
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `NodoCalc_Vectorial_${datosPDF.proyecto || "memoria"}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) { console.error(err) }
  setEstadoPDF("idle")
}

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Estática /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Fundamentos Vectoriales</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">

            {/* Panel izquierdo — entrada */}
            <div className="flex flex-col gap-4">

              {/* Método */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MÉTODO</div>
                <div className="flex gap-2">
                  {([
                    { key: "descomposicion", label: "Descomposición rectangular" },
                    { key: "vectorial", label: "Vectorial (i, j)" },
                    { key: "poligono", label: "Polígono de fuerzas" },
                  ] as const).map(m => (
                    <button key={m.key} onClick={() => setMetodo(m.key)}
                      className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${metodo === m.key ? "bg-blue-700 text-white border-blue-700" : "text-gray-600 border-gray-300 hover:border-blue-300"}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuerzas */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">FUERZAS</div>
                  <button onClick={agregarFuerza} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Agregar</button>
                </div>

                <div className="flex flex-col gap-3">
                  {fuerzas.map(f => (
                    <div key={f.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: f.color }} />
                          <input value={f.nombre} onChange={e => actualizar(f.id, "nombre", e.target.value)}
                            className="text-sm font-medium text-gray-800 bg-transparent w-12 focus:outline-none" />
                        </div>
                        <button onClick={() => eliminar(f.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Magnitud ({cfg.fuerza})</div>
                          <input type="number" value={f.magnitud}
                            onChange={e => actualizar(f.id, "magnitud", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Ángulo θ (°)</div>
                          <input type="number" value={f.angulo}
                            onChange={e => actualizar(f.id, "angulo", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                      </div>
                      {/* Slider de ángulo */}
                      <div className="mt-2">
                        <input type="range" min="-180" max="180" value={f.angulo}
                          onChange={e => actualizar(f.id, "angulo", e.target.value)}
                          className="w-full accent-blue-700" />
                        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                          <span>-180°</span><span>0°</span><span>180°</span>
                        </div>
                      </div>
                      {/* Componentes en tiempo real */}
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-blue-50 rounded-lg px-2 py-1.5">
                          <span className="text-blue-500">Fx = </span>
                          <span className="font-medium text-blue-800">{fmt2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))} {cfg.fuerza}</span>
                        </div>
                        <div className="bg-blue-50 rounded-lg px-2 py-1.5">
                          <span className="text-blue-500">Fy = </span>
                          <span className="font-medium text-blue-800">{fmt2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))} {cfg.fuerza}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resultante */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">RESULTANTE</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="text-xs text-red-500 mb-1">Rx</div>
                    <div className="text-lg font-bold text-red-700">{fmt2(Rx)}</div>
                    <div className="text-xs text-red-400">{cfg.fuerza}</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="text-xs text-red-500 mb-1">Ry</div>
                    <div className="text-lg font-bold text-red-700">{fmt2(Ry)}</div>
                    <div className="text-xs text-red-400">{cfg.fuerza}</div>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl border border-red-200 col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-red-600 mb-1">|R| — Magnitud resultante</div>
                        <div className="text-2xl font-bold text-red-800">{fmt2(R)} <span className="text-sm font-normal">{cfg.fuerza}</span></div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-red-600 mb-1">θ — Dirección</div>
                        <div className="text-2xl font-bold text-red-800">{fmt2(theta)}°</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel derecho — gráfico y desarrollo */}
            <div className="flex flex-col gap-4">

              {/* Canvas */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DIAGRAMA VECTORIAL</div>
                <canvas ref={canvasRef}
                  className="w-full border border-gray-100 rounded-lg" style={{ height: 380 }} />
                <div className="mt-2 flex gap-4 text-xs text-gray-400 flex-wrap">
                  {fuerzas.map(f => (
                    <span key={f.id} className="flex items-center gap-1">
                      <span className="w-3 h-1.5 rounded inline-block" style={{ background: f.color }} />
                      {f.nombre} = {fmt2(f.magnitud)} {cfg.fuerza} ∠ {f.angulo}°
                    </span>
                  ))}
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-1.5 rounded inline-block bg-red-600" />
                    R = {fmt2(R)} {cfg.fuerza} ∠ {fmt2(theta)}°
                  </span>
                </div>
              </div>

              {/* Desarrollo paso a paso */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DESARROLLO — {metodo === "descomposicion" ? "DESCOMPOSICIÓN RECTANGULAR" : metodo === "vectorial" ? "MÉTODO VECTORIAL" : "POLÍGONO DE FUERZAS"}</div>

                {metodo === "descomposicion" && (
                  <div className="flex flex-col gap-3">
                    <div className="text-xs text-gray-500 mb-1">Se descompone cada fuerza en sus componentes rectangulares:</div>
                    {fuerzas.map(f => (
                      <div key={f.id} className="p-3 rounded-lg border-l-4 bg-gray-50" style={{ borderLeftColor: f.color }}>
                        <div className="text-xs font-bold mb-1" style={{ color: f.color }}>{f.nombre} = {fmt2(f.magnitud)} {cfg.fuerza} ∠ {f.angulo}°</div>
                        <div className="text-xs text-gray-600 font-mono">
                          {f.nombre}x = {fmt2(f.magnitud)} × cos({f.angulo}°) = <span className="font-bold text-gray-800">{fmt2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))} {cfg.fuerza}</span>
                        </div>
                        <div className="text-xs text-gray-600 font-mono mt-0.5">
                          {f.nombre}y = {fmt2(f.magnitud)} × sen({f.angulo}°) = <span className="font-bold text-gray-800">{fmt2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))} {cfg.fuerza}</span>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="text-xs font-bold text-red-700 mb-1">Suma de componentes:</div>
                      <div className="text-xs text-red-700 font-mono">Rx = {fuerzas.map(f => `${fmt2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))}`).join(" + ")} = <span className="font-bold">{fmt2(Rx)} {cfg.fuerza}</span></div>
                      <div className="text-xs text-red-700 font-mono mt-0.5">Ry = {fuerzas.map(f => `${fmt2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))}`).join(" + ")} = <span className="font-bold">{fmt2(Ry)} {cfg.fuerza}</span></div>
                      <div className="text-xs text-red-700 font-mono mt-1">|R| = √(Rx² + Ry²) = √({fmt2(Rx)}² + {fmt2(Ry)}²) = <span className="font-bold">{fmt2(R)} {cfg.fuerza}</span></div>
                      <div className="text-xs text-red-700 font-mono mt-0.5">θ = arctan(Ry/Rx) = arctan({fmt2(Ry)}/{fmt2(Rx)}) = <span className="font-bold">{fmt2(theta)}°</span></div>
                    </div>
                  </div>
                )}

                {metodo === "vectorial" && (
                  <div className="flex flex-col gap-3">
                    <div className="text-xs text-gray-500 mb-1">Representación vectorial en forma cartesiana:</div>
                    {fuerzas.map(f => (
                      <div key={f.id} className="p-3 rounded-lg border-l-4 bg-gray-50" style={{ borderLeftColor: f.color }}>
                        <div className="text-xs font-mono" style={{ color: f.color }}>
                          <span className="font-bold">{f.nombre}</span> = {fmt2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))} î + ({fmt2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))}) ĵ {cfg.fuerza}
                        </div>
                      </div>
                    ))}
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="text-xs font-bold text-red-700 mb-1">Resultante vectorial:</div>
                      <div className="text-xs text-red-700 font-mono">
                        R = ({fuerzas.map(f => fmt2(f.magnitud * Math.cos(f.angulo * Math.PI / 180))).join(" + ")}) î + ({fuerzas.map(f => fmt2(f.magnitud * Math.sin(f.angulo * Math.PI / 180))).join(" + ")}) ĵ
                      </div>
                      <div className="text-xs text-red-700 font-mono mt-1 font-bold">R = {fmt2(Rx)} î + {fmt2(Ry)} ĵ {cfg.fuerza}</div>
                      <div className="text-xs text-red-700 font-mono mt-1">|R| = <span className="font-bold">{fmt2(R)} {cfg.fuerza}</span>  θ = <span className="font-bold">{fmt2(theta)}°</span></div>
                    </div>
                  </div>
                )}

                {metodo === "poligono" && (
                  <div className="flex flex-col gap-3">
                    <div className="text-xs text-gray-500 mb-1">Se colocan los vectores en secuencia cabeza a cola. La resultante cierra el polígono:</div>
                    {fuerzas.map((f, i) => (
                      <div key={f.id} className="p-3 rounded-lg border-l-4 bg-gray-50" style={{ borderLeftColor: f.color }}>
                        <div className="text-xs" style={{ color: f.color }}>
                          <span className="font-bold">Paso {i + 1}:</span> Trazar {f.nombre} = {fmt2(f.magnitud)} {cfg.fuerza} ∠ {f.angulo}° desde el extremo anterior
                        </div>
                      </div>
                    ))}
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="text-xs font-bold text-red-700 mb-1">Resultante — vector de cierre:</div>
                      <div className="text-xs text-red-700 font-mono">R = {fmt2(R)} {cfg.fuerza}  ∠  θ = {fmt2(theta)}°</div>
                    </div>
                  </div>
                )}
                {/* PDF */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">MEMORIA DE CÁLCULO PDF</div>
                  {!mostrarModalPDF ? (
                    <button onClick={() => setMostrarModalPDF(true)}
                      className="w-full text-sm bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors">
                      📄 Generar memoria de cálculo
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="text-xs text-gray-500">Datos para el encabezado del reporte</div>
                      {([
                        { key: "ingeniero", label: "Nombre del ingeniero" },
                        { key: "proyecto", label: "Nombre del proyecto" },
                        { key: "empresa", label: "Empresa / Universidad" },
                        { key: "descripcion", label: "Descripción del problema" },
                      ] as { key: keyof typeof datosPDF; label: string }[]).map(f => (
                        <div key={f.key}>
                          <div className="text-xs text-gray-500 mb-0.5">{f.label}</div>
                          <input type="text" value={datosPDF[f.key]}
                            onChange={e => setDatosPDF({ ...datosPDF, [f.key]: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-400" />
                        </div>
                      ))}
                      <button onClick={descargarPDF}
                        className="w-full text-sm bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors">
                        {estadoPDF === "generando" ? "⏳ Generando PDF..." : "⬇ Descargar memoria de cálculo"}
                      </button>
                      <button onClick={() => setMostrarModalPDF(false)} className="text-xs text-gray-400 hover:underline text-center">Cancelar</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}