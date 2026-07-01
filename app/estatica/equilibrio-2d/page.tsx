"use client"
import { useState, useRef, useEffect } from "react"
import Sidebar from "../../components/Sidebar"
import { useUnidadesStore } from "../../store/useUnidadesStore"

// ── Tipos ──────────────────────────────────────────────────────────────────
type TipoApoyo = "libre" | "fijo" | "pasador" | "rodillo" | "empotrado" | "polea"

type Nodo = {
  id: number
  nombre: string
  x: number
  y: number
  apoyo: TipoApoyo
  anguloRodillo: number
}

type TipoElemento = "cable" | "barra"

type Elemento = {
  id: number
  nombre: string
  nodoA: number
  nodoB: number
  tipo: TipoElemento
  conocido: boolean
  valorConocido: number
  tensionAdmisible: number
  color: string
}

type ModoFuerza = "completa" | "soloMagnitud" | "resultante"

type FuerzaExterna = {
  id: number
  nodoId: number
  nombre: string
  magnitud: number
  angulo: number
  modo: ModoFuerza
  color: string
}

const COLORES = ["#1d4ed8", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d", "#65a30d", "#ea580c", "#0d9488"]

function fmt(n: number, dec = 2) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.0001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(dec)
}

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

function combinaciones(arr: number[], k: number): number[][] {
  if (k === 0) return [[]]
  if (arr.length === 0) return []
  const [first, ...rest] = arr
  const withFirst = combinaciones(rest, k - 1).map(c => [first, ...c])
  const withoutFirst = combinaciones(rest, k)
  return [...withFirst, ...withoutFirst]
}

export default function Equilibrio2D() {
  const cfg = useUnidadesStore(s => s.config)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [nodos, setNodos] = useState<Nodo[]>([
    { id: 1, nombre: "A", x: -3, y: 4, apoyo: "fijo", anguloRodillo: 0 },
    { id: 2, nombre: "B", x: 3, y: 4, apoyo: "fijo", anguloRodillo: 0 },
    { id: 3, nombre: "C", x: 0, y: 0, apoyo: "libre", anguloRodillo: 0 },
  ])
  const [elementos, setElementos] = useState<Elemento[]>([
    { id: 1, nombre: "T₁", nodoA: 3, nodoB: 1, tipo: "cable", conocido: false, valorConocido: 0, tensionAdmisible: 500, color: COLORES[0] },
    { id: 2, nombre: "T₂", nodoA: 3, nodoB: 2, tipo: "cable", conocido: false, valorConocido: 0, tensionAdmisible: 500, color: COLORES[1] },
  ])
  const [fuerzas, setFuerzas] = useState<FuerzaExterna[]>([
    { id: 1, nodoId: 3, nombre: "W", magnitud: 100, angulo: 270, modo: "soloMagnitud", color: "#374151" },
  ])

  const [nextNodoId, setNextNodoId] = useState(4)
  const [nextElId, setNextElId] = useState(3)
  const [nextFId, setNextFId] = useState(2)
  const [mostrarAgregarNodo, setMostrarAgregarNodo] = useState(false)
  const [mostrarAgregarEl, setMostrarAgregarEl] = useState(false)
  const [modoDiseno, setModoDiseno] = useState(false)

  const getNodo = (id: number) => nodos.find(n => n.id === id)!

  const elementosCalc = elementos.map(e => {
    const A = getNodo(e.nodoA), B = getNodo(e.nodoB)
    const dx = B.x - A.x, dy = B.y - A.y
    const angDesdeA = Math.atan2(dy, dx) * 180 / Math.PI
    const longitud = Math.sqrt(dx * dx + dy * dy)
    return { ...e, angDesdeA, longitud }
  })

  type Incognita = { tipo: "elemento" | "reaccionX" | "reaccionY" | "resultanteX" | "resultanteY" | "fuerzaMag"; refId: number; nombre: string }
  const incognitas: Incognita[] = []
  elementosCalc.forEach(e => {
    if (!e.conocido) incognitas.push({ tipo: "elemento", refId: e.id, nombre: e.nombre })
  })
  fuerzas.forEach(f => {
    if (f.modo === "resultante") {
      incognitas.push({ tipo: "resultanteX", refId: f.id, nombre: `${f.nombre}x` })
      incognitas.push({ tipo: "resultanteY", refId: f.id, nombre: `${f.nombre}y` })
    } else if (f.modo === "soloMagnitud") {
      incognitas.push({ tipo: "fuerzaMag", refId: f.id, nombre: f.nombre })
    }
  })
  nodos.forEach(n => {
    if (n.apoyo === "pasador" || n.apoyo === "empotrado") {
      incognitas.push({ tipo: "reaccionX", refId: n.id, nombre: `${n.nombre}x` })
      incognitas.push({ tipo: "reaccionY", refId: n.id, nombre: `${n.nombre}y` })
    } else if (n.apoyo === "rodillo") {
      incognitas.push({ tipo: "reaccionX", refId: n.id, nombre: `R${n.nombre}` })
    }
  })

  const nodosConEcuacion = nodos.filter(n => n.apoyo !== "fijo")
  const numEcuaciones = nodosConEcuacion.length * 2
  const determinado = incognitas.length <= numEcuaciones && incognitas.length > 0

  let solucion: number[] | null = null
  let checkPorNodo: { nombre: string; fx: number; fy: number }[] = []

  if (determinado) {
    const A: number[][] = []
    const b: number[] = []

    nodosConEcuacion.forEach(n => {
      const rowX = new Array(incognitas.length).fill(0)
      const rowY = new Array(incognitas.length).fill(0)
      let knownX = 0, knownY = 0

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

      fuerzas.filter(f => f.nodoId === n.id).forEach(f => {
        if (f.modo === "completa") {
          knownX += f.magnitud * Math.cos(f.angulo * Math.PI / 180)
          knownY += f.magnitud * Math.sin(f.angulo * Math.PI / 180)
        } else if (f.modo === "soloMagnitud") {
          const idx = incognitas.findIndex(i => i.tipo === "fuerzaMag" && i.refId === f.id)
          rowX[idx] += Math.cos(f.angulo * Math.PI / 180)
          rowY[idx] += Math.sin(f.angulo * Math.PI / 180)
        } else {
          const idxX = incognitas.findIndex(i => i.tipo === "resultanteX" && i.refId === f.id)
          const idxY = incognitas.findIndex(i => i.tipo === "resultanteY" && i.refId === f.id)
          rowX[idxX] += 1
          rowY[idxY] += 1
        }
      })

      A.push(rowX); b.push(-knownX)
      A.push(rowY); b.push(-knownY)
    })

    const n = incognitas.length
    if (n === numEcuaciones) {
      solucion = resolverSistema(A, b)
    } else {
      const filasValidas: number[] = []
      for (let i = 0; i < A.length && filasValidas.length < n; i++) {
        if (A[i].some(v => Math.abs(v) > 1e-9)) filasValidas.push(i)
      }
      if (filasValidas.length === n) {
        solucion = resolverSistema(filasValidas.map(i => A[i]), filasValidas.map(i => b[i]))
      }
      if (!solucion) {
        const idxAll = A.map((_, i) => i)
        for (const combo of combinaciones(idxAll, n)) {
          const sol = resolverSistema(combo.map(i => A[i]), combo.map(i => b[i]))
          if (sol) { solucion = sol; break }
        }
      }
    }

    if (solucion) {
      checkPorNodo = nodosConEcuacion.map(n => {
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
          if (f.modo === "completa") {
            fx += f.magnitud * Math.cos(f.angulo * Math.PI / 180)
            fy += f.magnitud * Math.sin(f.angulo * Math.PI / 180)
          } else if (f.modo === "soloMagnitud") {
            const val = solucion![incognitas.findIndex(i => i.tipo === "fuerzaMag" && i.refId === f.id)]
            fx += val * Math.cos(f.angulo * Math.PI / 180)
            fy += val * Math.sin(f.angulo * Math.PI / 180)
          } else {
            fx += solucion![incognitas.findIndex(i => i.tipo === "resultanteX" && i.refId === f.id)]
            fy += solucion![incognitas.findIndex(i => i.tipo === "resultanteY" && i.refId === f.id)]
          }
        })
        return { nombre: n.nombre, fx, fy }
      })
    }
  }

  const cablesInvalidos = elementosCalc.filter(e => {
    if (e.tipo !== "cable") return false
    const idx = incognitas.findIndex(i => i.tipo === "elemento" && i.refId === e.id)
    const val = e.conocido ? e.valorConocido : (solucion && idx >= 0 ? solucion[idx] : 0)
    return val < -0.01
  })

  // ── Modo diseño: peso máximo según tensión admisible ───────────────────────
  let disenoResultado: { wMax: number; factoresK: { nombre: string; k: number; wMaxIndividual: number }[]; cableGobernante: string } | null = null

  if (modoDiseno && determinado && solucion) {
    const fuerzaPeso = fuerzas.find(f => f.modo === "soloMagnitud" || f.modo === "completa")
    if (fuerzaPeso) {
      const wActual = fuerzaPeso.modo === "soloMagnitud"
        ? solucion[incognitas.findIndex(i => i.tipo === "fuerzaMag" && i.refId === fuerzaPeso.id)]
        : fuerzaPeso.magnitud
      const factoresK = elementosCalc.filter(e => e.tipo === "cable" && !e.conocido).map(e => {
        const idx = incognitas.findIndex(i => i.tipo === "elemento" && i.refId === e.id)
        const tActual = idx >= 0 ? solucion![idx] : 0
        const k = wActual !== 0 ? tActual / wActual : 0
        const wMaxIndividual = k > 0 ? e.tensionAdmisible / k : Infinity
        return { nombre: e.nombre, k, wMaxIndividual }
      })
      if (factoresK.length > 0) {
        const validos = factoresK.filter(f => f.wMaxIndividual > 0 && isFinite(f.wMaxIndividual))
        if (validos.length > 0) {
          const wMax = Math.min(...validos.map(f => f.wMaxIndividual))
          const gobernante = validos.find(f => f.wMaxIndividual === wMax)
          disenoResultado = { wMax, factoresK, cableGobernante: gobernante?.nombre || "" }
        }
      }
    }
  }

  const valorIncognita = (idx: number) => solucion ? solucion[idx] : 0

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

    ctx.fillStyle = "#9ca3af"; ctx.font = "9px sans-serif"; ctx.textAlign = "center"
    let lastLX = -Infinity
    for (let v = Math.floor((centroX - maxAbs) / step) * step; v <= centroX + maxAbs; v += step) {
      const px = tx(v)
      if (px < padL || px > W - padR || px - lastLX < 32) continue
      lastLX = px
      ctx.fillText(Math.abs(v) < 0.001 ? "0" : parseFloat(v.toFixed(2)).toString(), px, H - padB + 12)
    }
    ctx.textAlign = "right"
    let lastLY = Infinity
    for (let v = Math.floor((centroY - maxAbs) / step) * step; v <= centroY + maxAbs; v += step) {
      const py = ty(v)
      if (py < padT || py > H - padB || lastLY - py < 18) continue
      lastLY = py
      ctx.fillText(Math.abs(v) < 0.001 ? "0" : parseFloat(v.toFixed(2)).toString(), padL - 4, py + 3)
    }

    elementosCalc.forEach((e) => {
      const A = getNodo(e.nodoA), B = getNodo(e.nodoB)
      const ax = tx(A.x), ay = ty(A.y), bx = tx(B.x), by = ty(B.y)
      const idx = incognitas.findIndex(ii => ii.tipo === "elemento" && ii.refId === e.id)
      const val = e.conocido ? e.valorConocido : (idx >= 0 ? valorIncognita(idx) : 0)
      const esInvalido = e.tipo === "cable" && val < -0.01
      ctx.strokeStyle = esInvalido ? "#dc2626" : e.color
      ctx.lineWidth = e.tipo === "barra" ? 4 : 2
      if (esInvalido) ctx.setLineDash([5, 3])
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = esInvalido ? "#dc2626" : e.color; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
      const lx = ax + (bx - ax) * 0.5, ly = ay + (by - ay) * 0.5
      ctx.fillText(`${e.nombre}=${fmt(val)} ${cfg.fuerza}${esInvalido ? " ⚠" : ""}`, lx + 4, ly - 4)
    })

    nodos.forEach(n => {
      const nx = tx(n.x), ny = ty(n.y)

      if (n.apoyo === "fijo") {
        ctx.strokeStyle = "#475569"; ctx.lineWidth = 1.5
        for (let k = -10; k <= 10; k += 5) { ctx.beginPath(); ctx.moveTo(nx + k, ny); ctx.lineTo(nx + k - 5, ny + 8); ctx.stroke() }
        ctx.beginPath(); ctx.moveTo(nx - 10, ny); ctx.lineTo(nx + 10, ny); ctx.stroke()
      } else if (n.apoyo === "pasador") {
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

    fuerzas.forEach(f => {
      const n = getNodo(f.nodoId)
      const nx = tx(n.x), ny = ty(n.y)
      let magMostrar = f.magnitud
      let angMostrar = f.angulo
      if (f.modo === "resultante" && solucion) {
        const idxX = incognitas.findIndex(ii => ii.tipo === "resultanteX" && ii.refId === f.id)
        const idxY = incognitas.findIndex(ii => ii.tipo === "resultanteY" && ii.refId === f.id)
        const rx = solucion[idxX], ry = solucion[idxY]
        magMostrar = Math.sqrt(rx * rx + ry * ry)
        angMostrar = Math.atan2(ry, rx) * 180 / Math.PI
      } else if (f.modo === "soloMagnitud" && solucion) {
        magMostrar = solucion[incognitas.findIndex(ii => ii.tipo === "fuerzaMag" && ii.refId === f.id)]
      }
      const len = 65
      const fx = nx + len * Math.cos(angMostrar * Math.PI / 180)
      const fy = ny - len * Math.sin(angMostrar * Math.PI / 180)
      ctx.strokeStyle = f.color; ctx.fillStyle = f.color; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(fx, fy); ctx.stroke()
      const ang = Math.atan2(fy - ny, fx - nx)
      ctx.beginPath()
      ctx.moveTo(fx, fy)
      ctx.lineTo(fx - 10 * Math.cos(ang - 0.4), fy - 10 * Math.sin(ang - 0.4))
      ctx.lineTo(fx - 10 * Math.cos(ang + 0.4), fy - 10 * Math.sin(ang + 0.4))
      ctx.closePath(); ctx.fill()
      ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
      ctx.fillText(`${f.nombre}=${fmt(magMostrar)}`, fx + 4, fy + 4)
    })

    ctx.fillStyle = "#374151"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
    ctx.fillText(`x (${cfg.longitud})`, W - padR - 35, padT - 6)
    ctx.fillText(`y (${cfg.longitud})`, padL + 4, padT - 6)
  }

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
      tipo: nuevoElTipo, conocido: false, valorConocido: 0, tensionAdmisible: 500, color: COLORES[(nextElId - 1) % COLORES.length]
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
    setFuerzas([...fuerzas, { id: nextFId, nodoId, nombre: `F${nextFId}`, magnitud: 100, angulo: 270, modo: "completa", color: "#374151" }])
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

            <div className="flex flex-col gap-4">

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={modoDiseno} onChange={e => setModoDiseno(e.target.checked)} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">Modo diseño: peso máximo según tensión admisible</div>
                    <div className="text-xs text-gray-500 mt-0.5">Marca cada cable con su tensión máxima admisible (capacidad). El sistema calcula el peso máximo que puede soportar el sistema sin sobrepasar esa tensión en ningún cable.</div>
                  </div>
                </label>
              </div>

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
                        <option value="libre">Libre (nudo de equilibrio — calcula incógnitas)</option>
                        <option value="fijo">Anclaje (pared, techo fijo — sin incógnitas)</option>
                        <option value="pasador">Pasador (2 reacciones — cuerpo rígido)</option>
                        <option value="rodillo">Rodillo (1 reacción — cuerpo rígido)</option>
                        <option value="empotrado">Empotrado (2 reacciones — cuerpo rígido)</option>
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
                      {modoDiseno && e.tipo === "cable" ? (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Tensión admisible / capacidad ({cfg.fuerza})</div>
                          <input type="number" value={e.tensionAdmisible} onChange={ev => actualizarElemento(e.id, "tensionAdmisible", parseFloat(ev.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                      ) : (
                        <>
                          <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                            <input type="checkbox" checked={e.conocido} onChange={ev => actualizarElemento(e.id, "conocido", ev.target.checked)} />
                            Valor conocido (si no, es incógnita)
                          </label>
                          {e.conocido && (
                            <input type="number" value={e.valorConocido} onChange={ev => actualizarElemento(e.id, "valorConocido", parseFloat(ev.target.value) || 0)}
                              placeholder={`Valor (${cfg.fuerza})`}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">FUERZAS EXTERNAS</div>
                  {nodos.length > 0 && (
                    <button onClick={() => agregarFuerza(nodos[0].id)} className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">+ Agregar fuerza</button>
                  )}
                </div>
                {fuerzas.length === 0 && <div className="text-xs text-gray-400 text-center py-4">Sin fuerzas externas agregadas</div>}
                <div className="flex flex-col gap-2">
                  {fuerzas.map(f => (
                    <div key={f.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input value={f.nombre} onChange={e => actualizarFuerza(f.id, "nombre", e.target.value)}
                            className="text-sm font-medium text-gray-800 bg-transparent w-14 focus:outline-none" />
                          <select value={f.nodoId} onChange={e => actualizarFuerza(f.id, "nodoId", parseInt(e.target.value))}
                            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400">
                            {nodos.map(n => <option key={n.id} value={n.id}>en {n.nombre}</option>)}
                          </select>
                        </div>
                        <button onClick={() => eliminarFuerza(f.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">Qué se conoce</div>
                      <select value={f.modo} onChange={e => actualizarFuerza(f.id, "modo", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-blue-400">
                        <option value="completa">Magnitud y ángulo conocidos (dato completo)</option>
                        <option value="soloMagnitud">Solo ángulo conocido — magnitud incógnita</option>
                        <option value="resultante">Nada conocido — magnitud y ángulo incógnitas</option>
                      </select>
                      {f.modo === "completa" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Magnitud ({cfg.fuerza})</div>
                            <input type="number" value={f.magnitud} onChange={e => actualizarFuerza(f.id, "magnitud", parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Ángulo (°)</div>
                            <input type="number" value={f.angulo} onChange={e => actualizarFuerza(f.id, "angulo", parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                        </div>
                      )}
                      {f.modo === "soloMagnitud" && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Ángulo conocido (°)</div>
                          <input type="number" value={f.angulo} onChange={e => actualizarFuerza(f.id, "angulo", parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          {modoDiseno ? (
                            <div className="text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1.5 mt-2">Esta fuerza se usa como referencia (W) para calcular el peso máximo en modo diseño</div>
                          ) : (
                            <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5 mt-2">Magnitud se calcula como incógnita</div>
                          )}
                        </div>
                      )}
                      {f.modo === "resultante" && (
                        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">Magnitud y ángulo (resultante completa) se calculan como incógnita</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DIAGRAMA</div>
                <canvas ref={canvasRef} className="w-full border border-gray-100 rounded-lg" style={{ height: 440 }} />
                <div className="mt-2 text-xs text-gray-400">↻ Ángulos antihorario desde +x. Rayado horizontal = anclaje. Triángulo rayado = pasador. Triángulo con ruedas = rodillo. Bloque rayado = empotrado. Línea roja punteada = cable en compresión (no válido).</div>
              </div>

              <div className={`rounded-xl p-4 border ${determinado ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                <div className={`text-xs font-medium ${determinado ? "text-green-700" : "text-amber-700"}`}>
                  {determinado
                    ? incognitas.length === numEcuaciones
                      ? `✓ Sistema determinado — ${incognitas.length} incógnitas, ${numEcuaciones} ecuaciones (2 por nudo: ΣFx=0, ΣFy=0)`
                      : `✓ Sistema resuelto — ${incognitas.length} incógnita(s) con ${numEcuaciones} ecuaciones disponibles (algunas ecuaciones se usan como verificación)`
                    : `⚠ Mecanismo — ${incognitas.length} incógnitas vs ${numEcuaciones} ecuaciones. Faltan elementos, apoyos o fuerzas para restringir el sistema.`}
                </div>
              </div>

              {cablesInvalidos.length > 0 && (
                <div className="rounded-xl p-4 border bg-red-50 border-red-200">
                  <div className="text-xs font-medium text-red-700">
                    ⚠ {cablesInvalidos.map(c => c.nombre).join(", ")} resulta en compresión (valor negativo) — un cable no puede empujar, solo tirar. Revisa la geometría o las cargas del problema.
                  </div>
                </div>
              )}

              {disenoResultado && (
                <div className="bg-white border-2 border-green-300 rounded-xl p-5">
                  <div className="text-xs text-green-600 font-medium tracking-wider mb-3">RESULTADO DE DISEÑO — PESO MÁXIMO ADMISIBLE</div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-3">
                    <div className="text-xs text-green-600 mb-1">Peso máximo que el sistema puede soportar</div>
                    <div className="text-2xl font-bold text-green-800">{fmt(disenoResultado.wMax)} {cfg.fuerza}</div>
                    <div className="text-xs text-green-600 mt-1">Cable gobernante: {disenoResultado.cableGobernante} (alcanza su tensión admisible primero)</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {disenoResultado.factoresK.map(f => (
                      <div key={f.nombre} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">{f.nombre}: factor k = {fmt(f.k, 4)} (T = k·W)</span>
                        <span className="font-medium text-gray-800">W_max individual = {fmt(f.wMaxIndividual)} {cfg.fuerza}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {determinado && solucion && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">RESULTADOS</div>
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const vistos = new Set<number>()
                      return incognitas.map((inc, idx) => {
                        if (inc.tipo === "resultanteX" || inc.tipo === "resultanteY") {
                          if (vistos.has(inc.refId)) return null
                          vistos.add(inc.refId)
                          const f = fuerzas.find(ff => ff.id === inc.refId)!
                          const idxX = incognitas.findIndex(ii => ii.tipo === "resultanteX" && ii.refId === inc.refId)
                          const idxY = incognitas.findIndex(ii => ii.tipo === "resultanteY" && ii.refId === inc.refId)
                          const rx = solucion![idxX], ry = solucion![idxY]
                          const mag = Math.sqrt(rx * rx + ry * ry)
                          const ang = Math.atan2(ry, rx) * 180 / Math.PI
                          return (
                            <div key={inc.refId} className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-600 col-span-2">
                              <div className="text-xs text-blue-500">{f.nombre} (resultante — incógnita)</div>
                              <div className="text-base font-bold text-blue-800">|{f.nombre}| = {fmt(mag)} {cfg.fuerza}   ∠ {fmt(ang, 2)}°</div>
                              <div className="text-xs text-gray-400">{f.nombre}x = {fmt(rx)} {cfg.fuerza}   {f.nombre}y = {fmt(ry)} {cfg.fuerza}</div>
                            </div>
                          )
                        }
                        if (inc.tipo === "fuerzaMag") {
                          const f = fuerzas.find(ff => ff.id === inc.refId)!
                          return (
                            <div key={idx} className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-600">
                              <div className="text-xs text-blue-500">{f.nombre} (magnitud — incógnita, ∠ {fmt(f.angulo, 1)}° conocido)</div>
                              <div className="text-base font-bold text-blue-800">{fmt(solucion![idx])} {cfg.fuerza}</div>
                            </div>
                          )
                        }
                        return (
                          <div key={idx} className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-600">
                            <div className="text-xs text-blue-500">{inc.nombre} {inc.tipo === "elemento" ? "(elemento)" : "(reacción)"}</div>
                            <div className="text-base font-bold text-blue-800">{fmt(solucion![idx])} {cfg.fuerza}</div>
                            {inc.tipo === "elemento" && (
                              <div className="text-xs text-gray-400">{solucion![idx] >= 0 ? "Tensión" : "Compresión ⚠"}</div>
                            )}
                          </div>
                        )
                      })
                    })()}
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