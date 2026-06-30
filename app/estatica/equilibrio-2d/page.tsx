"use client"
import { useState, useRef, useEffect } from "react"
import Sidebar from "../../components/Sidebar"
import { useUnidadesStore } from "../../store/useUnidadesStore"

// ── Tipos ──────────────────────────────────────────────────────────────────
type Punto = { x: number; y: number }

type Cable = {
  id: number
  nombre: string
  anclaje: Punto // punto fijo donde termina el cable
  tensionConocida: boolean
  tensionValor: number // si es conocida
  color: string
}

type FuerzaExterna = {
  id: number
  nombre: string
  magnitud: number
  angulo: number // grados
  color: string
}

const COLORES = ["#1d4ed8", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"]

function fmt(n: number, dec = 2) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.0001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(dec)
}

// ── Solver de sistema lineal (Gauss-Jordan) ─────────────────────────────────
function resolverSistema(A: number[][], b: number[]): number[] | null {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let i = 0; i < n; i++) {
    let maxRow = i
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k
    ;[M[i], M[maxRow]] = [M[maxRow], M[i]]
    if (Math.abs(M[i][i]) < 1e-10) return null
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i]
      for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j]
    }
  }
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n]
    for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j]
    x[i] = sum / M[i][i]
  }
  return x
}

export default function Equilibrio2D() {
  const cfg = useUnidadesStore(s => s.config)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [nodo, setNodo] = useState<Punto>({ x: 0, y: 0 })
  const [cables, setCables] = useState<Cable[]>([
    { id: 1, nombre: "T₁", anclaje: { x: -3, y: 4 }, tensionConocida: false, tensionValor: 0, color: COLORES[0] },
    { id: 2, nombre: "T₂", anclaje: { x: 3, y: 4 }, tensionConocida: false, tensionValor: 0, color: COLORES[1] },
  ])
  const [fuerzasExt, setFuerzasExt] = useState<FuerzaExterna[]>([
    { id: 1, nombre: "W", magnitud: 500, angulo: 270, color: "#374151" },
  ])
  const [nextCableId, setNextCableId] = useState(3)
  const [nextFuerzaId, setNextFuerzaId] = useState(2)

  // ── Cálculo de ángulos de cables respecto al nudo ─────────────────────────
  const cablesConAngulo = cables.map(c => {
    const dx = c.anclaje.x - nodo.x
    const dy = c.anclaje.y - nodo.y
    const angulo = Math.atan2(dy, dx) * 180 / Math.PI
    const longitud = Math.sqrt(dx * dx + dy * dy)
    return { ...c, angulo, longitud }
  })

  // ── Resolver incógnitas ────────────────────────────────────────────────────
  const incognitas = cablesConAngulo.filter(c => !c.tensionConocida)
  const conocidas = cablesConAngulo.filter(c => c.tensionConocida)

  let solucion: number[] | null = null
  let determinado = incognitas.length === 2

  if (determinado) {
    // Suma de fuerzas conocidas (cables conocidos + fuerzas externas)
    let sumFx = 0, sumFy = 0
    for (const c of conocidas) {
      sumFx += c.tensionValor * Math.cos(c.angulo * Math.PI / 180)
      sumFy += c.tensionValor * Math.sin(c.angulo * Math.PI / 180)
    }
    for (const f of fuerzasExt) {
      sumFx += f.magnitud * Math.cos(f.angulo * Math.PI / 180)
      sumFy += f.magnitud * Math.sin(f.angulo * Math.PI / 180)
    }
    // Sistema: T1*cos(a1) + T2*cos(a2) = -sumFx ;  T1*sen(a1) + T2*sen(a2) = -sumFy
    const A = [
      [Math.cos(incognitas[0].angulo * Math.PI / 180), Math.cos(incognitas[1].angulo * Math.PI / 180)],
      [Math.sin(incognitas[0].angulo * Math.PI / 180), Math.sin(incognitas[1].angulo * Math.PI / 180)],
    ]
    const b = [-sumFx, -sumFy]
    solucion = resolverSistema(A, b)
  }

  const tensionesFinal = cablesConAngulo.map(c => {
    if (c.tensionConocida) return c.tensionValor
    const idx = incognitas.findIndex(i => i.id === c.id)
    return solucion ? solucion[idx] : 0
  })

  // Verificación: suma final
  let checkFx = 0, checkFy = 0
  cablesConAngulo.forEach((c, i) => {
    checkFx += tensionesFinal[i] * Math.cos(c.angulo * Math.PI / 180)
    checkFy += tensionesFinal[i] * Math.sin(c.angulo * Math.PI / 180)
  })
  fuerzasExt.forEach(f => {
    checkFx += f.magnitud * Math.cos(f.angulo * Math.PI / 180)
    checkFy += f.magnitud * Math.sin(f.angulo * Math.PI / 180)
  })

  // ── Dibujo ─────────────────────────────────────────────────────────────────
  useEffect(() => { dibujar() }, [nodo, cables, fuerzasExt, solucion])

  const dibujar = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight || 420
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, W, H)

    const padL = 45, padR = 20, padT = 20, padB = 30
    const allPts = [nodo, ...cables.map(c => c.anclaje)]
    const allX = allPts.map(p => p.x), allY = allPts.map(p => p.y)
    const maxAbs = Math.max(...allX.map(Math.abs), ...allY.map(Math.abs), 2) * 1.3
    const scaleX = (W - padL - padR) / (2 * maxAbs)
    const scaleY = (H - padT - padB) / (2 * maxAbs)
    const sc = Math.min(scaleX, scaleY)

    const centroX = (Math.min(...allX) + Math.max(...allX)) / 2
    const centroY = (Math.min(...allY) + Math.max(...allY)) / 2
    const cx = padL + (W - padL - padR) / 2
    const cy = padT + (H - padT - padB) / 2
    const tx = (x: number) => cx + (x - centroX) * sc
    const ty = (y: number) => cy - (y - centroY) * sc

    // Cuadrícula
    const rawStep = maxAbs / 3
    const exp = Math.floor(Math.log10(rawStep || 1))
    const base = Math.pow(10, exp)
    const step = rawStep / base > 5 ? base * 5 : rawStep / base > 2 ? base * 2 : base
    ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 0.5
    for (let v = Math.floor((centroX - maxAbs) / step) * step; v <= centroX + maxAbs; v += step) {
      ctx.beginPath(); ctx.moveTo(tx(v), padT); ctx.lineTo(tx(v), H - padB); ctx.stroke()
    }
    for (let v = Math.floor((centroY - maxAbs) / step) * step; v <= centroY + maxAbs; v += step) {
      ctx.beginPath(); ctx.moveTo(padL, ty(v)); ctx.lineTo(W - padR, ty(v)); ctx.stroke()
    }
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1
    ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB)

    const nx = tx(nodo.x), ny = ty(nodo.y)

    // Cables (líneas hasta el anclaje, con triángulo de soporte en el extremo)
    cablesConAngulo.forEach((c, i) => {
      const ax = tx(c.anclaje.x), ay = ty(c.anclaje.y)
      ctx.strokeStyle = c.color; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(ax, ay); ctx.stroke()

      // Soporte triangular (rayado) en el anclaje
      ctx.save()
      ctx.translate(ax, ay)
      const ang = Math.atan2(ny - ay, nx - ax)
      ctx.rotate(ang + Math.PI / 2)
      ctx.fillStyle = "#94a3b8"
      ctx.beginPath()
      ctx.moveTo(0, 0); ctx.lineTo(-7, 12); ctx.lineTo(7, 12); ctx.closePath(); ctx.fill()
      for (let k = -6; k <= 6; k += 4) {
        ctx.beginPath(); ctx.moveTo(k, 12); ctx.lineTo(k - 4, 18); ctx.stroke()
      }
      ctx.restore()

      // Etiqueta tensión
      ctx.fillStyle = c.color; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left"
      const lx = nx + (ax - nx) * 0.45, ly = ny + (ay - ny) * 0.45
      const T = tensionesFinal[i]
      ctx.fillText(`${c.nombre} = ${fmt(T)} ${cfg.fuerza}`, lx + 5, ly - 5)
    })

    // Fuerzas externas (flechas desde el nodo)
    const maxMag = Math.max(...fuerzasExt.map(f => f.magnitud), 1)
    fuerzasExt.forEach(f => {
      const len = 70
      const fx = nx + len * Math.cos(f.angulo * Math.PI / 180)
      const fy = ny - len * Math.sin(f.angulo * Math.PI / 180)
      ctx.strokeStyle = f.color; ctx.fillStyle = f.color; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(fx, fy); ctx.stroke()
      const headLen = 10
      const ang = Math.atan2(fy - ny, fx - nx)
      ctx.beginPath()
      ctx.moveTo(fx, fy)
      ctx.lineTo(fx - headLen * Math.cos(ang - 0.4), fy - headLen * Math.sin(ang - 0.4))
      ctx.lineTo(fx - headLen * Math.cos(ang + 0.4), fy - headLen * Math.sin(ang + 0.4))
      ctx.closePath(); ctx.fill()
      ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left"
      ctx.fillText(`${f.nombre} = ${fmt(f.magnitud)} ${cfg.fuerza}`, fx + 5, fy + 5)
    })

    // Punto del nudo
    ctx.beginPath(); ctx.arc(nx, ny, 5, 0, Math.PI * 2)
    ctx.fillStyle = "#1e293b"; ctx.fill()
    ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.stroke()

    // Etiquetas ejes
    ctx.fillStyle = "#374151"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
    ctx.fillText(`x (${cfg.longitud})`, W - padR - 35, padT - 6)
    ctx.fillText(`y (${cfg.longitud})`, padL + 4, padT - 6)
  }

  // ── Acciones ───────────────────────────────────────────────────────────────
  const agregarCable = () => {
    setCables([...cables, {
      id: nextCableId, nombre: `T${nextCableId}`,
      anclaje: { x: 0, y: 5 }, tensionConocida: false, tensionValor: 0,
      color: COLORES[(nextCableId - 1) % COLORES.length]
    }])
    setNextCableId(nextCableId + 1)
  }
  const eliminarCable = (id: number) => setCables(cables.filter(c => c.id !== id))
  const actualizarCable = (id: number, key: string, val: any) => {
    setCables(cables.map(c => c.id === id ? { ...c, [key]: val } : c))
  }

  const agregarFuerza = () => {
    setFuerzasExt([...fuerzasExt, {
      id: nextFuerzaId, nombre: `F${nextFuerzaId}`, magnitud: 100, angulo: 270, color: "#374151"
    }])
    setNextFuerzaId(nextFuerzaId + 1)
  }
  const eliminarFuerza = (id: number) => setFuerzasExt(fuerzasExt.filter(f => f.id !== id))
  const actualizarFuerza = (id: number, key: string, val: any) => {
    setFuerzasExt(fuerzasExt.map(f => f.id === id ? { ...f, [key]: val } : f))
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Estática /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Equilibrio 2D — Partícula (Cables y Poleas)</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">

            {/* Panel izquierdo */}
            <div className="flex flex-col gap-4">

              {/* Nodo */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">PUNTO DE EQUILIBRIO (NUDO)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">x ({cfg.longitud})</div>
                    <input type="number" value={nodo.x} onChange={e => setNodo({ ...nodo, x: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">y ({cfg.longitud})</div>
                    <input type="number" value={nodo.y} onChange={e => setNodo({ ...nodo, y: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
              </div>

              {/* Cables */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">CABLES</div>
                  <button onClick={agregarCable} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Agregar cable</button>
                </div>
                <div className="flex flex-col gap-3">
                  {cablesConAngulo.map((c, i) => (
                    <div key={c.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                          <input value={c.nombre} onChange={e => actualizarCable(c.id, "nombre", e.target.value)}
                            className="text-sm font-medium text-gray-800 bg-transparent w-14 focus:outline-none" />
                        </div>
                        <button onClick={() => eliminarCable(c.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Anclaje x ({cfg.longitud})</div>
                          <input type="number" value={c.anclaje.x}
                            onChange={e => actualizarCable(c.id, "anclaje", { ...c.anclaje, x: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Anclaje y ({cfg.longitud})</div>
                          <input type="number" value={c.anclaje.y}
                            onChange={e => actualizarCable(c.id, "anclaje", { ...c.anclaje, y: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mb-2">
                        Ángulo calculado: {fmt(c.angulo, 2)}° — Longitud: {fmt(c.longitud, 2)} {cfg.longitud}
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <input type="checkbox" checked={c.tensionConocida}
                          onChange={e => actualizarCable(c.id, "tensionConocida", e.target.checked)} />
                        Tensión conocida (si no, se calcula como incógnita)
                      </label>
                      {c.tensionConocida && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Valor de tensión ({cfg.fuerza})</div>
                          <input type="number" value={c.tensionValor}
                            onChange={e => actualizarCable(c.id, "tensionValor", parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fuerzas externas */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">FUERZAS EXTERNAS (peso, cargas aplicadas)</div>
                  <button onClick={agregarFuerza} className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">+ Agregar</button>
                </div>
                <div className="flex flex-col gap-3">
                  {fuerzasExt.map(f => (
                    <div key={f.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <input value={f.nombre} onChange={e => actualizarFuerza(f.id, "nombre", e.target.value)}
                          className="text-sm font-medium text-gray-800 bg-transparent w-14 focus:outline-none" />
                        <button onClick={() => eliminarFuerza(f.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Magnitud ({cfg.fuerza})</div>
                          <input type="number" value={f.magnitud}
                            onChange={e => actualizarFuerza(f.id, "magnitud", parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Ángulo (° desde +x)</div>
                          <input type="number" value={f.angulo}
                            onChange={e => actualizarFuerza(f.id, "angulo", parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-400 mt-2">Tip: peso hacia abajo = ángulo 270°</div>
              </div>
            </div>

            {/* Panel derecho */}
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DIAGRAMA DE CUERPO LIBRE</div>
                <canvas ref={canvasRef} className="w-full border border-gray-100 rounded-lg" style={{ height: 420 }} />
                <div className="mt-2 text-xs text-gray-400">↻ Convención: ángulos medidos antihorario desde el eje x positivo</div>
              </div>

              {/* Estado del sistema */}
              <div className={`rounded-xl p-4 border ${determinado ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                <div className={`text-xs font-medium ${determinado ? "text-green-700" : "text-amber-700"}`}>
                  {determinado
                    ? `✓ Sistema determinado — ${incognitas.length} incógnitas, 2 ecuaciones de equilibrio disponibles (ΣFx=0, ΣFy=0)`
                    : incognitas.length > 2
                      ? `⚠ Sistema con ${incognitas.length} incógnitas — más de 2 incógnitas no se puede resolver solo con equilibrio de partícula (faltan ecuaciones)`
                      : `⚠ Sistema con ${incognitas.length} incógnita(s) — marca al menos ${2 - incognitas.length} cable(s) más como conocido, o agrega otra incógnita hasta llegar a 2`}
                </div>
              </div>

              {/* Resultados */}
              {determinado && solucion && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">TENSIONES CALCULADAS</div>
                  <div className="grid grid-cols-2 gap-3">
                    {cablesConAngulo.map((c, i) => (
                      <div key={c.id} className="p-3 rounded-lg" style={{ background: c.color + "15", borderLeft: `3px solid ${c.color}` }}>
                        <div className="text-xs" style={{ color: c.color }}>{c.nombre} {c.tensionConocida ? "(dato)" : "(incógnita)"}</div>
                        <div className="text-lg font-bold" style={{ color: c.color }}>{fmt(tensionesFinal[i])} {cfg.fuerza}</div>
                        <div className="text-xs text-gray-400">∠ {fmt(c.angulo, 1)}°</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                    Verificación: ΣFx = {fmt(checkFx, 4)} {cfg.fuerza}   ΣFy = {fmt(checkFy, 4)} {cfg.fuerza} {Math.abs(checkFx) < 0.01 && Math.abs(checkFy) < 0.01 ? "✓" : ""}
                  </div>
                </div>
              )}

              {/* Desarrollo paso a paso */}
              {determinado && solucion && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DESARROLLO — ECUACIONES DE EQUILIBRIO</div>
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-bold text-gray-700 mb-1">ΣFx = 0:</div>
                      <div className="font-mono text-gray-600">
                        {cablesConAngulo.map(c => `${c.nombre}·cos(${fmt(c.angulo, 1)}°)`).join(" + ")}
                        {fuerzasExt.length > 0 && " + " + fuerzasExt.map(f => `${fmt(f.magnitud)}·cos(${fmt(f.angulo, 1)}°)`).join(" + ")}
                        {" = 0"}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-bold text-gray-700 mb-1">ΣFy = 0:</div>
                      <div className="font-mono text-gray-600">
                        {cablesConAngulo.map(c => `${c.nombre}·sen(${fmt(c.angulo, 1)}°)`).join(" + ")}
                        {fuerzasExt.length > 0 && " + " + fuerzasExt.map(f => `${fmt(f.magnitud)}·sen(${fmt(f.angulo, 1)}°)`).join(" + ")}
                        {" = 0"}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="font-bold text-blue-700 mb-1">Sistema de 2 ecuaciones con 2 incógnitas:</div>
                      {incognitas.map((inc, i) => (
                        <div key={inc.id} className="font-mono text-blue-700">{inc.nombre} = {fmt(solucion![i])} {cfg.fuerza}</div>
                      ))}
                    </div>
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