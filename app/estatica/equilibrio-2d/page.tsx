"use client"
import { useState, useRef, useEffect } from "react"
import Sidebar from "../../components/Sidebar"
import { useUnidadesStore } from "../../store/useUnidadesStore"

// ── Tipos ──────────────────────────────────────────────────────────────────
type TipoApoyo = "libre" | "pasador" | "rodillo" | "empotrado" | "polea"

type Nodo = {
  id: number
  nombre: string
  x: number
  y: number
  apoyo: TipoApoyo
  anguloRodillo: number // ángulo de la superficie del rodillo (grados), solo si apoyo === "rodillo"
}

type TipoElemento = "cable" | "barra"

type Elemento = {
  id: number
  nombre: string
  nodoA: number // id del nodo origen
  nodoB: number // id del nodo destino
  tipo: TipoElemento
  conocido: boolean
  valorConocido: number // si conocido = true
  color: string
}

type FuerzaExterna = {
  id: number
  nodoId: number
  nombre: string
  magnitud: number
  angulo: number
  color: string
}

const COLORES = ["#1d4ed8", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d", "#65a30d", "#ea580c", "#0d9488"]

function fmt(n: number, dec = 2) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.0001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(dec)
}

// ── Solver de Gauss generalizado ────────────────────────────────────────────
function resolverSistema(A: number[][], b: number[]): number[] | null {
  const n = b.length
  if (n === 0) return []
  const M = A.map((row, i) => [...row, b[i]])
  for (let i = 0; i < n; i++) {
    let maxRow = i
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k
    ;[M[i], M[maxRow]] = [M[maxRow], M[i]]
    if (Math.abs(M[i][i]) < 1e-9) return null
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

  const [nodos, setNodos] = useState<Nodo[]>([
    { id: 1, nombre: "A", x: -3, y: 4, apoyo: "libre", anguloRodillo: 0 },
    { id: 2, nombre: "B", x: 3, y: 4, apoyo: "libre", anguloRodillo: 0 },
    { id: 3, nombre: "C", x: 0, y: 0, apoyo: "libre", anguloRodillo: 0 },
  ])
  const [elementos, setElementos] = useState<Elemento[]>([
    { id: 1, nombre: "T₁", nodoA: 3, nodoB: 1, tipo: "cable", conocido: false, valorConocido: 0, color: COLORES[0] },
    { id: 2, nombre: "T₂", nodoA: 3, nodoB: 2, tipo: "cable", conocido: false, valorConocido: 0, color: COLORES[1] },
  ])
  const [fuerzas, setFuerzas] = useState<FuerzaExterna[]>([
    { id: 1, nodoId: 3, nombre: "W", magnitud: 500, angulo: 270, color: "#374151" },
  ])

  const [nextNodoId, setNextNodoId] = useState(4)
  const [nextElId, setNextElId] = useState(3)
  const [nextFId, setNextFId] = useState(2)
  const [mostrarAgregarNodo, setMostrarAgregarNodo] = useState(false)
  const [mostrarAgregarEl, setMostrarAgregarEl] = useState(false)

  const getNodo = (id: number) => nodos.find(n => n.id === id)!

  // ── Ángulo y longitud de cada elemento (desde nodoA hacia nodoB) ──────────
  const elementosCalc = elementos.map(e => {
    const A = getNodo(e.nodoA), B = getNodo(e.nodoB)
    const dx = B.x - A.x, dy = B.y - A.y
    const angDesdeA = Math.atan2(dy, dx) * 180 / Math.PI
    const longitud = Math.sqrt(dx * dx + dy * dy)
    return { ...e, angDesdeA, longitud }
  })

  // ── Armar incógnitas: una por elemento no-conocido, más reacciones de apoyo ─
  type Incognita = { tipo: "elemento" | "reaccionX" | "reaccionY"; refId: number; nombre: string }
  const incognitas: Incognita[] = []
  elementosCalc.forEach(e => {
    if (!e.conocido) incognitas.push({ tipo: "elemento", refId: e.id, nombre: e.nombre })
  })
  nodos.forEach(n => {
    if (n.apoyo === "pasador" || n.apoyo === "empotrado") {
      incognitas.push({ tipo: "reaccionX", refId: n.id, nombre: `${n.nombre}x` })
      incognitas.push({ tipo: "reaccionY", refId: n.id, nombre: `${n.nombre}y` })
    } else if (n.apoyo === "rodillo") {
      incognitas.push({ tipo: "reaccionX", refId: n.id, nombre: `R${n.nombre}` }) // 1 reacción perpendicular a superficie, guardada en "X" por simplicidad
    }
  })

  // Nodos libres (no apoyo) generan 2 ecuaciones cada uno: ΣFx=0, ΣFy=0
  const nodosLibres = nodos.filter(n => n.apoyo === "libre" || n.apoyo === "polea")
  const numEcuaciones = nodosLibres.length * 2
  const determinado = incognitas.length === numEcuaciones && incognitas.length > 0

  let solucion: number[] | null = null
  let checkPorNodo: { nombre: string; fx: number; fy: number }[] = []

  if (determinado) {
    const A: number[][] = []
    const b: number[] = []

    nodosLibres.forEach(n => {
      const rowX = new Array(incognitas.length).fill(0)
      const rowY = new Array(incognitas.length).fill(0)
      let knownX = 0, knownY = 0

      // Elementos conectados a este nodo
      elementosCalc.forEach(e => {
        let angDesdeNodo: number | null = null
        if (e.nodoA === n.id) angDesdeNodo = e.angDesdeA
        else if (e.nodoB === n.id) angDesdeNodo = e.angDesdeA + 180

        if (angDesdeNodo !== null) {
          const cosA = Math.cos(angDesdeNodo * Math.PI / 180)
          const sinA = Math.sin(angDesdeNodo * Math.PI / 180)
          if (e.conocido) {
            knownX += e.valorConocido * cosA
            knownY += e.valorConocido * sinA
          } else {
            const idx = incognitas.findIndex(i => i.tipo === "elemento" && i.refId === e.id)
            rowX[idx] += cosA
            rowY[idx] += sinA
          }
        }
      })

      // Reacciones de apoyo en este nodo (si aplica)
      if (n.apoyo === "pasador" || n.apoyo === "empotrado") {
        const idxX = incognitas.findIndex(i => i.tipo === "reaccionX" && i.refId === n.id)
        const idxY = incognitas.findIndex(i => i.tipo === "reaccionY" && i.refId === n.id)
        rowX[idxX] += 1
        rowY[idxY] += 1
      } else if (n.apoyo === "rodillo") {
        const idxR = incognitas.findIndex(i => i.tipo === "reaccionX" && i.refId === n.id)
        const angPerp = (n.anguloRodillo + 90) * Math.PI / 180
        rowX[idxR] += Math.cos(angPerp)
        rowY[idxR] += Math.sin(angPerp)
      }

      // Fuerzas externas en este nodo
      fuerzas.filter(f => f.nodoId === n.id).forEach(f => {
        knownX += f.magnitud * Math.cos(f.angulo * Math.PI / 180)
        knownY += f.magnitud * Math.sin(f.angulo * Math.PI / 180)
      })

      A.push(rowX); b.push(-knownX)
      A.push(rowY); b.push(-knownY)
    })

    solucion = resolverSistema(A, b)

    // Verificación
    if (solucion) {
      checkPorNodo = nodosLibres.map(n => {
        let fx = 0, fy = 0
        elementosCalc.forEach(e => {
          let angDesdeNodo: number | null = null
          if (e.nodoA === n.id) angDesdeNodo = e.angDesdeA
          else if (e.nodoB === n.id) angDesdeNodo = e.angDesdeA + 180
          if (angDesdeNodo !== null) {
            const val = e.conocido ? e.valorConocido : solucion![incognitas.findIndex(i => i.tipo === "elemento" && i.refId === e.id)]
            fx += val * Math.cos(angDesdeNodo * Math.PI / 180)
            fy += val * Math.sin(angDesdeNodo * Math.PI / 180)
          }
        })
        if (n.apoyo === "pasador" || n.apoyo === "empotrado") {
          fx += solucion![incognitas.findIndex(i => i.tipo === "reaccionX" && i.refId === n.id)]
          fy += solucion![incognitas.findIndex(i => i.tipo === "reaccionY" && i.refId === n.id)]
        } else if (n.apoyo === "rodillo") {
          const idxR = incognitas.findIndex(i => i.tipo === "reaccionX" && i.refId === n.id)
          const angPerp = (n.anguloRodillo + 90) * Math.PI / 180
          fx += solucion![idxR] * Math.cos(angPerp)
          fy += solucion![idxR] * Math.sin(angPerp)
        }
        fuerzas.filter(f => f.nodoId === n.id).forEach(f => {
          fx += f.magnitud * Math.cos(f.angulo * Math.PI / 180)
          fy += f.magnitud * Math.sin(f.angulo * Math.PI / 180)
        })
        return { nombre: n.nombre, fx, fy }
      })
    }
  }

  const valorIncognita = (idx: number) => solucion ? solucion[idx] : 0

  // ── Dibujo ─────────────────────────────────────────────────────────────────
  useEffect(() => { dibujar() }, [nodos, elementos, fuerzas, solucion])

  const dibujar = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight || 440
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, W, H)

    const padL = 45, padR = 20, padT = 20, padB = 30
    const allX = nodos.map(n => n.x), allY = nodos.map(n => n.y)
    const maxAbs = Math.max(...allX.map(Math.abs), ...allY.map(Math.abs), 2) * 1.35
    const scaleX = (W - padL - padR) / (2 * maxAbs)
    const scaleY = (H - padT - padB) / (2 * maxAbs)
    const sc = Math.min(scaleX, scaleY)
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
    ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 0.5
    for (let v = Math.floor((centroX - maxAbs) / step) * step; v <= centroX + maxAbs; v += step) {
      ctx.beginPath(); ctx.moveTo(tx(v), padT); ctx.lineTo(tx(v), H - padB); ctx.stroke()
    }
    for (let v = Math.floor((centroY - maxAbs) / step) * step; v <= centroY + maxAbs; v += step) {
      ctx.beginPath(); ctx.moveTo(padL, ty(v)); ctx.lineTo(W - padR, ty(v)); ctx.stroke()
    }
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1
    ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB)

    // Elementos (cables/barras)
    elementosCalc.forEach((e, i) => {
      const A = getNodo(e.nodoA), B = getNodo(e.nodoB)
      const ax = tx(A.x), ay = ty(A.y), bx = tx(B.x), by = ty(B.y)
      ctx.strokeStyle = e.color; ctx.lineWidth = e.tipo === "barra" ? 4 : 2
      if (e.tipo === "cable") ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()

      const val = e.conocido ? e.valorConocido : (incognitas.findIndex(ii => ii.tipo === "elemento" && ii.refId === e.id) >= 0 ? valorIncognita(incognitas.findIndex(ii => ii.tipo === "elemento" && ii.refId === e.id)) : 0)
      ctx.fillStyle = e.color; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
      const lx = ax + (bx - ax) * 0.5, ly = ay + (by - ay) * 0.5
      ctx.fillText(`${e.nombre}=${fmt(val)} ${cfg.fuerza}`, lx + 4, ly - 4)
    })

    // Nodos + apoyos
    nodos.forEach(n => {
      const nx = tx(n.x), ny = ty(n.y)

      if (n.apoyo === "pasador") {
        ctx.fillStyle = "#94a3b8"
        ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx - 9, ny + 16); ctx.lineTo(nx + 9, ny + 16); ctx.closePath(); ctx.fill()
        for (let k = -8; k <= 8; k += 4) { ctx.strokeStyle = "#94a3b8"; ctx.beginPath(); ctx.moveTo(nx + k, ny + 16); ctx.lineTo(nx + k - 4, ny + 22); ctx.stroke() }
      } else if (n.apoyo === "rodillo") {
        ctx.save(); ctx.translate(nx, ny); ctx.rotate(n.anguloRodillo * Math.PI / 180 * -1)
        ctx.fillStyle = "#94a3b8"
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, 14); ctx.lineTo(9, 14); ctx.closePath(); ctx.fill()
        ctx.beginPath(); ctx.arc(-5, 18, 3, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(5, 18, 3, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      } else if (n.apoyo === "empotrado") {
        ctx.fillStyle = "#475569"
        ctx.fillRect(nx - 14, ny - 2, 28, 6)
        for (let k = -12; k <= 12; k += 6) { ctx.strokeStyle = "#475569"; ctx.beginPath(); ctx.moveTo(nx + k, ny + 4); ctx.lineTo(nx + k - 4, ny + 10); ctx.stroke() }
      } else if (n.apoyo === "polea") {
        ctx.beginPath(); ctx.arc(nx, ny, 8, 0, Math.PI * 2)
        ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.stroke()
      }

      ctx.beginPath(); ctx.arc(nx, ny, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = "#1e293b"; ctx.fill()
      ctx.strokeStyle = "white"; ctx.lineWidth = 1.2; ctx.stroke()

      ctx.fillStyle = "#1e293b"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "right"
      ctx.fillText(n.nombre, nx - 8, ny - 8)
    })

    // Fuerzas externas
    fuerzas.forEach(f => {
      const n = getNodo(f.nodoId)
      const nx = tx(n.x), ny = ty(n.y)
      const len = 65
      const fx = nx + len * Math.cos(f.angulo * Math.PI / 180)
      const fy = ny - len * Math.sin(f.angulo * Math.PI / 180)
      ctx.strokeStyle = f.color; ctx.fillStyle = f.color; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(fx, fy); ctx.stroke()
      const ang = Math.atan2(fy - ny, fx - nx)
      ctx.beginPath()
      ctx.moveTo(fx, fy)
      ctx.lineTo(fx - 10 * Math.cos(ang - 0.4), fy - 10 * Math.sin(ang - 0.4))
      ctx.lineTo(fx - 10 * Math.cos(ang + 0.4), fy - 10 * Math.sin(ang + 0.4))
      ctx.closePath(); ctx.fill()
      ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
      ctx.fillText(`${f.nombre}=${fmt(f.magnitud)}`, fx + 4, fy + 4)
    })

    ctx.fillStyle = "#374151"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
    ctx.fillText(`x (${cfg.longitud})`, W - padR - 35, padT - 6)
    ctx.fillText(`y (${cfg.longitud})`, padL + 4, padT - 6)
  }

  // ── Acciones ───────────────────────────────────────────────────────────────
  const [nuevoNodoNombre, setNuevoNodoNombre] = useState("")
  const [nuevoNodoX, setNuevoNodoX] = useState("0")
  const [nuevoNodoY, setNuevoNodoY] = useState("0")

  const agregarNodo = () => {
    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const nombre = nuevoNodoNombre || letras[(nextNodoId - 1) % 26]
    setNodos([...nodos, { id: nextNodoId, nombre, x: parseFloat(nuevoNodoX) || 0, y: parseFloat(nuevoNodoY) || 0, apoyo: "libre", anguloRodillo: 0 }])
    setNextNodoId(nextNodoId + 1)
    setNuevoNodoNombre(""); setNuevoNodoX("0"); setNuevoNodoY("0")
    setMostrarAgregarNodo(false)
  }
  const eliminarNodo = (id: number) => {
    setNodos(nodos.filter(n => n.id !== id))
    setElementos(elementos.filter(e => e.nodoA !== id && e.nodoB !== id))
    setFuerzas(fuerzas.filter(f => f.nodoId !== id))
  }
  const actualizarNodo = (id: number, key: keyof Nodo, val: any) => {
    setNodos(nodos.map(n => n.id === id ? { ...n, [key]: val } : n))
  }

  const [nuevoElA, setNuevoElA] = useState<number | null>(null)
  const [nuevoElB, setNuevoElB] = useState<number | null>(null)
  const [nuevoElTipo, setNuevoElTipo] = useState<TipoElemento>("cable")

  const agregarElemento = () => {
    if (nuevoElA === null || nuevoElB === null || nuevoElA === nuevoElB) return
    setElementos([...elementos, {
      id: nextElId, nombre: `T${nextElId}`, nodoA: nuevoElA, nodoB: nuevoElB,
      tipo: nuevoElTipo, conocido: false, valorConocido: 0, color: COLORES[(nextElId - 1) % COLORES.length]
    }])
    setNextElId(nextElId + 1)
    setNuevoElA(null); setNuevoElB(null)
    setMostrarAgregarEl(false)
  }
  const eliminarElemento = (id: number) => setElementos(elementos.filter(e => e.id !== id))
  const actualizarElemento = (id: number, key: keyof Elemento, val: any) => {
    setElementos(elementos.map(e => e.id === id ? { ...e, [key]: val } : e))
  }

  const agregarFuerza = (nodoId: number) => {
    setFuerzas([...fuerzas, { id: nextFId, nodoId, nombre: `F${nextFId}`, magnitud: 100, angulo: 270, color: "#374151" }])
    setNextFId(nextFId + 1)
  }
  const eliminarFuerza = (id: number) => setFuerzas(fuerzas.filter(f => f.id !== id))
  const actualizarFuerza = (id: number, key: keyof FuerzaExterna, val: any) => {
    setFuerzas(fuerzas.map(f => f.id === id ? { ...f, [key]: val } : f))
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Estática /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Equilibrio 2D — Sistema de Nodos y Elementos</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">

            {/* Panel izquierdo */}
            <div className="flex flex-col gap-4">

              {/* Nodos */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">NODOS</div>
                  <button onClick={() => setMostrarAgregarNodo(true)} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Agregar nodo</button>
                </div>

                {mostrarAgregarNodo && (
                  <div className="p-3 mb-3 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input placeholder="Nombre" value={nuevoNodoNombre} onChange={e => setNuevoNodoNombre(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                      <input type="number" placeholder="x" value={nuevoNodoX} onChange={e => setNuevoNodoX(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                      <input type="number" placeholder="y" value={nuevoNodoY} onChange={e => setNuevoNodoY(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={agregarNodo} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">Agregar</button>
                      <button onClick={() => setMostrarAgregarNodo(false)} className="text-xs text-gray-500">Cancelar</button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {nodos.map(n => (
                    <div key={n.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-800">{n.nombre}</span>
                        <button onClick={() => eliminarNodo(n.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">x ({cfg.longitud})</div>
                          <input type="number" value={n.x} onChange={e => actualizarNodo(n.id, "x", parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">y ({cfg.longitud})</div>
                          <input type="number" value={n.y} onChange={e => actualizarNodo(n.id, "y", parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">Tipo de apoyo</div>
                      <select value={n.apoyo} onChange={e => actualizarNodo(n.id, "apoyo", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-blue-400">
                        <option value="libre">Libre (nudo de equilibrio)</option>
                        <option value="pasador">Pasador (2 reacciones)</option>
                        <option value="rodillo">Rodillo (1 reacción)</option>
                        <option value="empotrado">Empotrado (2 reacciones — sin momento aquí)</option>
                        <option value="polea">Polea (redirige cable)</option>
                      </select>
                      {n.apoyo === "rodillo" && (
                        <div className="mb-2">
                          <div className="text-xs text-gray-500 mb-1">Ángulo superficie rodillo (°)</div>
                          <input type="number" value={n.anguloRodillo} onChange={e => actualizarNodo(n.id, "anguloRodillo", parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                        </div>
                      )}
                      <button onClick={() => agregarFuerza(n.id)} className="text-xs text-gray-600 hover:underline">+ Fuerza externa en este nodo</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Elementos */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">ELEMENTOS (cables / barras)</div>
                  <button onClick={() => setMostrarAgregarEl(true)} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Conectar</button>
                </div>

                {mostrarAgregarEl && (
                  <div className="p-3 mb-3 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <select value={nuevoElA ?? ""} onChange={e => setNuevoElA(parseInt(e.target.value))}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400">
                        <option value="">Nodo A</option>
                        {nodos.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                      </select>
                      <select value={nuevoElB ?? ""} onChange={e => setNuevoElB(parseInt(e.target.value))}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400">
                        <option value="">Nodo B</option>
                        {nodos.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                      </select>
                    </div>
                    <select value={nuevoElTipo} onChange={e => setNuevoElTipo(e.target.value as TipoElemento)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-blue-400">
                      <option value="cable">Cable (solo tensión)</option>
                      <option value="barra">Barra rígida (tensión o compresión)</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={agregarElemento} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">Conectar</button>
                      <button onClick={() => setMostrarAgregarEl(false)} className="text-xs text-gray-500">Cancelar</button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {elementosCalc.map(e => (
                    <div key={e.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: e.color }} />
                          <input value={e.nombre} onChange={ev => actualizarElemento(e.id, "nombre", ev.target.value)}
                            className="text-sm font-medium text-gray-800 bg-transparent w-14 focus:outline-none" />
                          <span className="text-xs text-gray-400">{getNodo(e.nodoA).nombre} → {getNodo(e.nodoB).nombre}</span>
                        </div>
                        <button onClick={() => eliminarElemento(e.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                      </div>
                      <div className="text-xs text-gray-400 mb-2">{e.tipo === "cable" ? "Cable" : "Barra rígida"} — longitud: {fmt(e.longitud, 2)} {cfg.longitud} — ángulo: {fmt(e.angDesdeA, 1)}°</div>
                      <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <input type="checkbox" checked={e.conocido} onChange={ev => actualizarElemento(e.id, "conocido", ev.target.checked)} />
                        Valor conocido (si no, es incógnita)
                      </label>
                      {e.conocido && (
                        <input type="number" value={e.valorConocido} onChange={ev => actualizarElemento(e.id, "valorConocido", parseFloat(ev.target.value) || 0)}
                          placeholder={`Valor (${cfg.fuerza})`}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fuerzas externas */}
              {fuerzas.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">FUERZAS EXTERNAS</div>
                  <div className="flex flex-col gap-2">
                    {fuerzas.map(f => (
                      <div key={f.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">En nodo {getNodo(f.nodoId).nombre}</span>
                          <button onClick={() => eliminarFuerza(f.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input value={f.nombre} onChange={e => actualizarFuerza(f.id, "nombre", e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                          <input type="number" value={f.magnitud} onChange={e => actualizarFuerza(f.id, "magnitud", parseFloat(e.target.value) || 0)}
                            placeholder="Magnitud" className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                          <input type="number" value={f.angulo} onChange={e => actualizarFuerza(f.id, "angulo", parseFloat(e.target.value) || 0)}
                            placeholder="Ángulo" className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Panel derecho */}
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DIAGRAMA</div>
                <canvas ref={canvasRef} className="w-full border border-gray-100 rounded-lg" style={{ height: 440 }} />
                <div className="mt-2 text-xs text-gray-400">↻ Ángulos antihorario desde +x. Triángulo rayado = pasador. Triángulo con ruedas = rodillo. Bloque rayado = empotrado.</div>
              </div>

              <div className={`rounded-xl p-4 border ${determinado ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                <div className={`text-xs font-medium ${determinado ? "text-green-700" : "text-amber-700"}`}>
                  {determinado
                    ? `✓ Sistema determinado — ${incognitas.length} incógnitas, ${numEcuaciones} ecuaciones (2 por nudo libre: ΣFx=0, ΣFy=0)`
                    : incognitas.length > numEcuaciones
                      ? `⚠ Sistema indeterminado — ${incognitas.length} incógnitas vs ${numEcuaciones} ecuaciones disponibles. Marca más valores como conocidos.`
                      : `⚠ Mecanismo — ${incognitas.length} incógnitas vs ${numEcuaciones} ecuaciones. Faltan elementos o apoyos para restringir el sistema.`}
                </div>
              </div>

              {determinado && solucion && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">RESULTADOS</div>
                  <div className="grid grid-cols-2 gap-3">
                    {incognitas.map((inc, i) => (
                      <div key={i} className="p-3 rounded-lg bg-blue-50 border-l-3 border-blue-600">
                        <div className="text-xs text-blue-500">{inc.nombre} {inc.tipo === "elemento" ? "(elemento)" : "(reacción)"}</div>
                        <div className="text-base font-bold text-blue-800">{fmt(solucion![i])} {cfg.fuerza}</div>
                        {inc.tipo === "elemento" && (
                          <div className="text-xs text-gray-400">{solucion![i] >= 0 ? "Tensión" : "Compresión"}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                    {checkPorNodo.map(c => (
                      <div key={c.nombre}>Nudo {c.nombre}: ΣFx={fmt(c.fx, 4)}  ΣFy={fmt(c.fy, 4)} {Math.abs(c.fx) < 0.01 && Math.abs(c.fy) < 0.01 ? "✓" : ""}</div>
                    ))}
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