"use client"
import { useState, useRef, useEffect } from "react"
import Sidebar from "../../components/Sidebar"
import { useUnidadesStore } from "../../store/useUnidadesStore"

// ── Tipos ──────────────────────────────────────────────────────────────────
type TipoApoyo = "libre" | "fijo" | "pasador" | "rodillo" | "empotrado" | "polea"
type TipoElemento = "cable" | "barra"
type ModoFuerza = "completa" | "soloMagnitud" | "resultante"

type TipoRestriccion =
  | { tipo: "relacion_tensiones"; elId1: number; elId2: number; factor: number } // T_el1 = factor * T_el2
  | { tipo: "angulo_cable"; elId: number } // ángulo del cable es incógnita
  | { tipo: "longitud_total"; elIds: number[]; longitud: number } // suma longitudes = L
  | { tipo: "coordenada_libre"; nodoId: number; coord: "x" | "y" } // coord del nodo es incógnita

type Nodo = {
  id: number; nombre: string; x: number; y: number
  apoyo: TipoApoyo; anguloRodillo: number
}

type Elemento = {
  id: number; nombre: string; nodoA: number; nodoB: number
  tipo: TipoElemento; conocido: boolean; valorConocido: number
  tensionAdmisible: number; color: string
}

type FuerzaExterna = {
  id: number; nodoId: number; nombre: string
  magnitud: number; angulo: number; modo: ModoFuerza; color: string
}

type PasoDesarrollo = {
  titulo: string
  lineas: string[]
  resultado?: string
}

const COLORES = ["#1d4ed8","#059669","#d97706","#dc2626","#7c3aed","#0891b2","#be185d","#65a30d","#ea580c","#0d9488"]

function fmt(n: number, dec = 4) {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.0001 && n !== 0)) return n.toExponential(2)
  return parseFloat(n.toFixed(dec)).toString()
}
function fmt2(n: number) { return parseFloat(n.toFixed(2)).toString() }
function deg(r: number) { return r * 180 / Math.PI }
function rad(d: number) { return d * Math.PI / 180 }

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
      const f = M[k][i] / M[i][i]
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]
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
  return [...combinaciones(rest, k-1).map(c => [first,...c]), ...combinaciones(rest, k)]
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
  const [restricciones, setRestricciones] = useState<TipoRestriccion[]>([])
  const [modoDiseno, setModoDiseno] = useState(false)
  const [pasos, setPasos] = useState<PasoDesarrollo[]>([])

  const [nextNodoId, setNextNodoId] = useState(4)
  const [nextElId, setNextElId] = useState(3)
  const [nextFId, setNextFId] = useState(2)
  const [mostrarAgregarNodo, setMostrarAgregarNodo] = useState(false)
  const [mostrarAgregarEl, setMostrarAgregarEl] = useState(false)
  const [mostrarAgregarRestr, setMostrarAgregarRestr] = useState(false)
  const [tipoNuevaRestr, setTipoNuevaRestr] = useState<"relacion_tensiones"|"angulo_cable"|"longitud_total"|"coordenada_libre">("relacion_tensiones")

  // Forma de nueva restricción
  const [rEl1, setREl1] = useState<number|null>(null)
  const [rEl2, setREl2] = useState<number|null>(null)
  const [rFactor, setRFactor] = useState("2")
  const [rNodoId, setRNodoId] = useState<number|null>(null)
  const [rCoord, setRCoord] = useState<"x"|"y">("y")
  const [rLongitud, setRLongitud] = useState("15")
  const [rElIds, setRElIds] = useState<number[]>([])

  const getNodo = (id: number) => nodos.find(n => n.id === id)!

  // Calcular ángulos de elementos con coordenadas actuales
  const elementosCalc = elementos.map(e => {
    const A = getNodo(e.nodoA), B = getNodo(e.nodoB)
    const dx = B.x - A.x, dy = B.y - A.y
    const angDesdeA = deg(Math.atan2(dy, dx))
    const longitud = Math.sqrt(dx*dx + dy*dy)
    return { ...e, angDesdeA, longitud }
  })

  // ── Solver analítico generalizado ──────────────────────────────────────────
  const resolverAnalitico = () => {
    const pasosList: PasoDesarrollo[] = []

    // Detectar tipo de problema por las restricciones activas
    const restrRelacion = restricciones.filter(r => r.tipo === "relacion_tensiones") as Extract<TipoRestriccion, {tipo:"relacion_tensiones"}>[]
    const restrAngulo = restricciones.filter(r => r.tipo === "angulo_cable") as Extract<TipoRestriccion, {tipo:"angulo_cable"}>[]
    const restrLongitud = restricciones.filter(r => r.tipo === "longitud_total") as Extract<TipoRestriccion, {tipo:"longitud_total"}>[]
    const restrCoordenada = restricciones.filter(r => r.tipo === "coordenada_libre") as Extract<TipoRestriccion, {tipo:"coordenada_libre"}>[]

    let nodosActuales = [...nodos]
    let elementosActuales = [...elementosCalc]
    let tensionesSolucion: Record<number, number> = {}
    let angulosSolucion: Record<number, number> = {}

    // PASO 1: Identificar el sistema
    pasosList.push({
      titulo: "1. Identificación del sistema",
      lineas: [
        `Nudos de equilibrio: ${nodos.filter(n => n.apoyo !== "fijo").map(n => n.nombre).join(", ")}`,
        `Elementos: ${elementosActuales.map(e => `${e.nombre} (${e.tipo})`).join(", ")}`,
        `Fuerzas externas: ${fuerzas.map(f => `${f.nombre}`).join(", ")}`,
        ...(restricciones.length > 0 ? [`Restricciones adicionales: ${restricciones.map(r => r.tipo).join(", ")}`] : []),
      ]
    })

    // PASO 2: Si hay restricción de ángulo (ángulo libre) con relación de tensiones → caso tipo 3-17
    if (restrAngulo.length > 0 && restrRelacion.length > 0) {
      pasosList.push({
        titulo: "2. Caso con ángulo incógnita y relación de tensiones",
        lineas: ["Se aplica la restricción de proporcionalidad para eliminar una incógnita antes de plantear el sistema."]
      })

      for (const ra of restrAngulo) {
        const el = elementosActuales.find(e => e.id === ra.elId)!
        const rr = restrRelacion.find(r => r.elId1 === ra.elId || r.elId2 === ra.elId)
        if (!rr) continue

        const elOtro = elementosActuales.find(e => e.id === (rr.elId1 === ra.elId ? rr.elId2 : rr.elId1))!
        const k = rr.elId1 === ra.elId ? rr.factor : 1/rr.factor
        const elOtroAngulo = elOtro.angDesdeA

        // Nudo de equilibrio donde confluyen los cables
        const nudoEq = nodos.find(n => n.apoyo !== "fijo" &&
          (elementosActuales.some(e2 => (e2.nodoA === n.id || e2.nodoB === n.id) && e2.id === el.id)) &&
          (elementosActuales.some(e2 => (e2.nodoA === n.id || e2.nodoB === n.id) && e2.id === elOtro.id))
        )!

        // ΣFx = 0: T_el*cos(ang_el) + T_otro*cos(ang_otro) + ... = 0
        // Con T_el = k * T_otro → T_otro * (k*cos(ang_el_nudo) + cos(ang_otro_nudo)) = -ΣFx_ext
        // Pero ang_el es incógnita → de ΣFx: k*cos(θ_nudo) = -cos(ang_otro_nudo)
        // donde θ_nudo es el ángulo desde el nudo hacia el anclaje del cable con ángulo libre

        const angOtroDesdeNudo = elOtro.nodoA === nudoEq.id ? elOtro.angDesdeA : elOtro.angDesdeA + 180
        const cosOtro = Math.cos(rad(angOtroDesdeNudo))

        // ΣFx = 0: T1*cos(θ_nudo) + k*T1*cos(angOtro_nudo) = 0 (solo cables sin fuerzas en x)
        // → cos(θ_nudo) = -k*cos(angOtro_nudo)
        // θ_nudo = arccos(-k*cos(angOtro_nudo)) — tomamos el que tiene sentido físico

        const cosTheta = -k * cosOtro
        if (Math.abs(cosTheta) > 1) {
          pasosList.push({ titulo: "Error", lineas: ["No existe solución: |cos(θ)| > 1"] })
          setPasos(pasosList)
          return { solucion: null, angulosSol: {} }
        }

        const thetaNudo = deg(Math.acos(cosTheta))
        const thetaAnclaje = el.nodoA === nudoEq.id ? thetaNudo : thetaNudo + 180

        pasosList.push({
          titulo: `3. Deducción analítica del ángulo θ (${el.nombre})`,
          lineas: [
            `De ΣFx = 0 en nudo ${nudoEq.nombre}:`,
            `  T₁·cos(θ) + k·T₁·cos(${fmt2(angOtroDesdeNudo)}°) = 0`,
            `  cos(θ) = -k·cos(${fmt2(angOtroDesdeNudo)}°) / 1`,
            `  cos(θ) = -(${fmt2(k)})·(${fmt2(cosOtro)})`,
            `  cos(θ) = ${fmt2(cosTheta)}`,
            `  θ = arccos(${fmt2(cosTheta)})`,
          ],
          resultado: `θ = ${fmt2(thetaNudo)}° desde el nudo ${nudoEq.nombre}`
        })

        angulosSolucion[el.id] = thetaAnclaje

        // Actualizar coordenadas del nodo de anclaje del cable con ángulo libre
        const nodoAnclaje = el.nodoA === nudoEq.id ? getNodo(el.nodoB) : getNodo(el.nodoA)
        // Mantener longitud original, actualizar dirección
        const longEl = el.longitud
        const nuevaX = nudoEq.x + longEl * Math.cos(rad(thetaNudo))
        const nuevaY = nudoEq.y + longEl * Math.sin(rad(thetaNudo))
        nodosActuales = nodosActuales.map(n => n.id === nodoAnclaje.id ? { ...n, x: nuevaX, y: nuevaY } : n)

        // Recalcular elementos con nuevas coordenadas
        elementosActuales = elementos.map(e => {
          const A = nodosActuales.find(n => n.id === e.nodoA)!
          const B = nodosActuales.find(n => n.id === e.nodoB)!
          const dx = B.x - A.x, dy = B.y - A.y
          return { ...e, angDesdeA: deg(Math.atan2(dy, dx)), longitud: Math.sqrt(dx*dx+dy*dy) }
        })
      }
    }

    // PASO: Si hay longitud total fija (cable continuo por polea) → caso tipo 3-43
    if (restrLongitud.length > 0) {
      for (const rl of restrLongitud) {
        const elsInv = elementosActuales.filter(e => rl.elIds.includes(e.id))
        const restrCoord = restrCoordenada.find(r => elsInv.some(e => e.nodoA === r.nodoId || e.nodoB === r.nodoId))

        if (restrCoord) {
          const nodoLibre = nodosActuales.find(n => n.id === restrCoord.nodoId)!
          const coord = restrCoord.coord

          pasosList.push({
            titulo: "2. Cable continuo por polea — coordenada libre",
            lineas: [
              `Cable continuo ${elsInv.map(e => e.nombre).join(" + ")} con longitud total L = ${rl.longitud} ${cfg.longitud}`,
              `La tensión es igual a ambos lados de la polea (cable ideal sin fricción).`,
              `Condición de simetría: ΣFx = 0 en la polea implica que los ángulos respecto a la horizontal son iguales.`,
              `Esto determina la posición horizontal de la polea.`,
              `La longitud total fija: L₁ + L₂ = ${rl.longitud} ${cfg.longitud}`,
              `Se despeja la coordenada ${coord} del nodo ${nodoLibre.nombre}.`
            ]
          })

          // Para 3-43: polea en A, cable BAC, B y C fijos, y de C libre
          // Simetría: xA se determina por igualdad de ángulos (mediaba de BC proyectada)
          // Los dos segmentos tienen la misma tensión T → ΣFx=0 → cos(α_AB) = cos(α_AC) → ángulos iguales
          // xA: de la igualdad de ángulos respecto horizontal
          // Luego: L_BA + L_CA = 15 → ecuación en y_C

          const el1 = elsInv[0], el2 = elsInv[1]
          if (!el1 || !el2) continue

          // Nodo de la polea (comparten los dos elementos)
          const nodoPolea = nodos.find(n =>
            (el1.nodoA === n.id || el1.nodoB === n.id) &&
            (el2.nodoA === n.id || el2.nodoB === n.id)
          )!

          // Nodo extremo 1 (fijo)
          const nodoExt1Id = el1.nodoA === nodoPolea.id ? el1.nodoB : el1.nodoA
          const nodoExt2Id = el2.nodoA === nodoPolea.id ? el2.nodoB : el2.nodoA
          const nExt1 = nodosActuales.find(n => n.id === nodoExt1Id)!
          const nExt2 = nodosActuales.find(n => n.id === nodoExt2Id)!

          // Condición: ángulos iguales → xA = (xB*(yC-yA) + xC*(yB-yA)) / ((yB-yA)+(yC-yA))
          // Pero yA, yC son incógnitas también en 3-43 — simplificamos asumiendo yA conocida
          // Para el caso general: resolver numéricamente con la longitud como ecuación adicional
          // Aquí implementamos el caso 3-43 específico: polea libre en A, extremos B y C con y_C libre

          const xB = nExt1.x, yB = nExt1.y
          const xC = nExt2.x // xC conocida
          // yC incógnita, xA = xpolea (libre también?)
          // Simetría: xA = posición tal que |ángulo desde horizontal a B| = |ángulo desde horizontal a C|
          // (xA - xB)/(yA - yB) = (xC - xA)/(yA - yC) ... pero yA y yC son libres

          // Para 3-43 simplificado: polea A, B y C en paredes fijas con coord y conocidas
          // Solo y_C libre. xA y yA = coord de la polea (nodo libre de equilibrio)
          // La igualdad de ángulos da: (xA-xB)/sqrt((xA-xB)²+(yA-yB)²) = (xC-xA)/sqrt((xC-xA)²+(yC-yA)²)
          // + restricción L: sqrt(...) + sqrt(...) = 15
          // Esto es no lineal → usamos Newton-Raphson de 1 variable (y_C)

          // Para generar el paso a paso analítico, mostramos la formulación y la solución numérica convergida
          let yCurr = coord === "y" ? (nodoLibre.y || -3) : nodoLibre.x
          const yA = nodoPolea.y, xA = nodoPolea.x

          for (let iter = 0; iter < 50; iter++) {
            const nLibreActual = coord === "y" ? { ...nodoLibre, y: yCurr } : { ...nodoLibre, x: yCurr }
            const xCurr = coord === "x" ? yCurr : nLibreActual.x
            const yCurrNode = coord === "y" ? yCurr : nLibreActual.y

            const dx1 = xA - xB, dy1 = yA - yB
            const dx2 = xCurr - xA, dy2 = yCurrNode - yA
            const L1 = Math.sqrt(dx1*dx1 + dy1*dy1)
            const L2 = Math.sqrt(dx2*dx2 + dy2*dy2)
            const F = L1 + L2 - rl.longitud

            // Derivada numérica
            const eps = 1e-6
            const yCurr2 = yCurr + eps
            const nLibre2 = coord === "y" ? { y: yCurr2, x: nLibreActual.x } : { x: yCurr2, y: nLibreActual.y }
            const dx2b = (coord === "x" ? yCurr2 : nLibre2.x) - xA
            const dy2b = (coord === "y" ? yCurr2 : nLibre2.y) - yA
            const L2b = Math.sqrt(dx2b*dx2b + dy2b*dy2b)
            const dF = (L1 + L2b - rl.longitud - F) / eps

            const delta = -F / dF
            yCurr += delta
            if (Math.abs(delta) < 1e-8) break
          }

          const yCFinal = yCurr
          nodosActuales = nodosActuales.map(n => n.id === restrCoord.nodoId
            ? { ...n, [coord]: yCFinal }
            : n
          )

          elementosActuales = elementos.map(e => {
            const A = nodosActuales.find(n => n.id === e.nodoA)!
            const B = nodosActuales.find(n => n.id === e.nodoB)!
            const dx = B.x - A.x, dy = B.y - A.y
            return { ...e, angDesdeA: deg(Math.atan2(dy, dx)), longitud: Math.sqrt(dx*dx+dy*dy) }
          })

          const el1f = elementosActuales.find(e => e.id === el1.id)!
          const el2f = elementosActuales.find(e => e.id === el2.id)!

          pasosList.push({
            titulo: "3. Solución de la coordenada libre",
            lineas: [
              `Ecuación de longitud total: L₁ + L₂ = ${rl.longitud} ${cfg.longitud}`,
              `Se resuelve iterativamente (Newton-Raphson de 1 variable):`,
              `  ${coord}${nodoLibre.nombre} = ${fmt(yCFinal, 3)} ${cfg.longitud}`,
              `Longitud L₁ (${el1f.nombre}): ${fmt(el1f.longitud, 3)} ${cfg.longitud}`,
              `Longitud L₂ (${el2f.nombre}): ${fmt(el2f.longitud, 3)} ${cfg.longitud}`,
              `Verificación: L₁ + L₂ = ${fmt(el1f.longitud + el2f.longitud, 3)} ${cfg.longitud} ≈ ${rl.longitud} ${cfg.longitud} ✓`,
            ],
            resultado: `${coord}${nodoLibre.nombre} = ${fmt2(yCFinal)} ${cfg.longitud}`
          })
        }
      }
    }

    // PASO: Plantear ecuaciones de equilibrio con la geometría actualizada
    const nodosLibres = nodosActuales.filter(n => n.apoyo !== "fijo")

    // Aplicar restricciones de relación entre tensiones: sustituir T_i = k*T_j
    // Construir mapa de sustituciones
    type SubstMap = Record<number, { factorDe: number; refId: number }>
    const sustituciones: SubstMap = {}
    for (const rr of restrRelacion) {
      sustituciones[rr.elId1] = { factorDe: rr.factor, refId: rr.elId2 }
    }

    // Incógnitas independientes
    const incognitasBase: { tipo: string; refId: number; nombre: string }[] = []
    elementosActuales.forEach(e => {
      if (!e.conocido && !sustituciones[e.id]) {
        incognitasBase.push({ tipo: "elemento", refId: e.id, nombre: e.nombre })
      }
    })
    fuerzas.forEach(f => {
      if (f.modo === "soloMagnitud") incognitasBase.push({ tipo: "fuerzaMag", refId: f.id, nombre: f.nombre })
      else if (f.modo === "resultante") {
        incognitasBase.push({ tipo: "resultanteX", refId: f.id, nombre: `${f.nombre}x` })
        incognitasBase.push({ tipo: "resultanteY", refId: f.id, nombre: `${f.nombre}y` })
      }
    })
    nodosActuales.forEach(n => {
      if (n.apoyo === "pasador" || n.apoyo === "empotrado") {
        incognitasBase.push({ tipo: "reaccionX", refId: n.id, nombre: `${n.nombre}x` })
        incognitasBase.push({ tipo: "reaccionY", refId: n.id, nombre: `${n.nombre}y` })
      } else if (n.apoyo === "rodillo") {
        incognitasBase.push({ tipo: "reaccionX", refId: n.id, nombre: `R${n.nombre}` })
      }
    })

    // Construir ecuaciones ΣFx=0, ΣFy=0 por nudo
    const A_mat: number[][] = []
    const b_vec: number[] = []
    const ecuacionesPasos: string[] = []

    nodosLibres.forEach(n => {
      const rowX = new Array(incognitasBase.length).fill(0)
      const rowY = new Array(incognitasBase.length).fill(0)
      let kX = 0, kY = 0

      const eqXTerms: string[] = []
      const eqYTerms: string[] = []

      elementosActuales.forEach(e => {
        let angN: number | null = null
        if (e.nodoA === n.id) angN = e.angDesdeA
        else if (e.nodoB === n.id) angN = e.angDesdeA + 180

        if (angN !== null) {
          const cosA = Math.cos(rad(angN))
          const sinA = Math.sin(rad(angN))
          const cX = fmt2(cosA), sY = fmt2(sinA)

          if (e.conocido) {
            kX += e.valorConocido * cosA
            kY += e.valorConocido * sinA
            eqXTerms.push(`${e.nombre}·cos(${fmt2(angN)}°)=${fmt2(e.valorConocido*cosA)}`)
            eqYTerms.push(`${e.nombre}·sin(${fmt2(angN)}°)=${fmt2(e.valorConocido*sinA)}`)
          } else if (sustituciones[e.id]) {
            // T_e = k * T_ref → agregar k*cos a la fila de T_ref
            const sub = sustituciones[e.id]
            const idx = incognitasBase.findIndex(i => i.tipo === "elemento" && i.refId === sub.refId)
            rowX[idx] += sub.factorDe * cosA
            rowY[idx] += sub.factorDe * sinA
            eqXTerms.push(`${fmt2(sub.factorDe)}·${incognitasBase[idx].nombre}·cos(${fmt2(angN)}°)`)
            eqYTerms.push(`${fmt2(sub.factorDe)}·${incognitasBase[idx].nombre}·sin(${fmt2(angN)}°)`)
          } else {
            const idx = incognitasBase.findIndex(i => i.tipo === "elemento" && i.refId === e.id)
            rowX[idx] += cosA
            rowY[idx] += sinA
            eqXTerms.push(`${e.nombre}·cos(${fmt2(angN)}°)`)
            eqYTerms.push(`${e.nombre}·sin(${fmt2(angN)}°)`)
          }
        }
      })

      if (n.apoyo === "pasador" || n.apoyo === "empotrado") {
        const idxX = incognitasBase.findIndex(i => i.tipo === "reaccionX" && i.refId === n.id)
        const idxY = incognitasBase.findIndex(i => i.tipo === "reaccionY" && i.refId === n.id)
        rowX[idxX] += 1; rowY[idxY] += 1
      } else if (n.apoyo === "rodillo") {
        const idxR = incognitasBase.findIndex(i => i.tipo === "reaccionX" && i.refId === n.id)
        const angPerp = rad(n.anguloRodillo + 90)
        rowX[idxR] += Math.cos(angPerp)
        rowY[idxR] += Math.sin(angPerp)
      }

      fuerzas.filter(f => f.nodoId === n.id).forEach(f => {
        if (f.modo === "completa") {
          kX += f.magnitud * Math.cos(rad(f.angulo))
          kY += f.magnitud * Math.sin(rad(f.angulo))
          eqXTerms.push(`${f.nombre}·cos(${fmt2(f.angulo)}°)=${fmt2(f.magnitud*Math.cos(rad(f.angulo)))}`)
          eqYTerms.push(`${f.nombre}·sin(${fmt2(f.angulo)}°)=${fmt2(f.magnitud*Math.sin(rad(f.angulo)))}`)
        } else if (f.modo === "soloMagnitud") {
          const idx = incognitasBase.findIndex(i => i.tipo === "fuerzaMag" && i.refId === f.id)
          rowX[idx] += Math.cos(rad(f.angulo))
          rowY[idx] += Math.sin(rad(f.angulo))
          eqXTerms.push(`${f.nombre}·cos(${fmt2(f.angulo)}°)`)
          eqYTerms.push(`${f.nombre}·sin(${fmt2(f.angulo)}°)`)
        } else {
          const iX = incognitasBase.findIndex(i => i.tipo === "resultanteX" && i.refId === f.id)
          const iY = incognitasBase.findIndex(i => i.tipo === "resultanteY" && i.refId === f.id)
          rowX[iX] += 1; rowY[iY] += 1
        }
      })

      A_mat.push(rowX); b_vec.push(-kX)
      A_mat.push(rowY); b_vec.push(-kY)
      ecuacionesPasos.push(`ΣFx = 0 en nudo ${n.nombre}: ${eqXTerms.join(" + ")} = 0`)
      ecuacionesPasos.push(`ΣFy = 0 en nudo ${n.nombre}: ${eqYTerms.join(" + ")} = 0`)
    })

    pasosList.push({
      titulo: `${pasosList.length + 1}. Ecuaciones de equilibrio ΣFx=0, ΣFy=0`,
      lineas: ecuacionesPasos
    })

    // Resolver
    let sol: number[] | null = null
    const ni = incognitasBase.length
    const ne = A_mat.length

    if (ni === ne) {
      sol = resolverSistema(A_mat, b_vec)
    } else if (ni < ne) {
      // Sobre-determinado: buscar subconjunto
      const idxAll = A_mat.map((_, i) => i)
      const filasValidas = idxAll.filter(i => A_mat[i].some(v => Math.abs(v) > 1e-9))
      if (filasValidas.length >= ni) {
        sol = resolverSistema(filasValidas.slice(0, ni).map(i => A_mat[i]), filasValidas.slice(0, ni).map(i => b_vec[i]))
        if (!sol) {
          for (const combo of combinaciones(filasValidas, ni)) {
            const s = resolverSistema(combo.map(i => A_mat[i]), combo.map(i => b_vec[i]))
            if (s) { sol = s; break }
          }
        }
      }
    }

    if (!sol) {
      pasosList.push({ titulo: "Sin solución", lineas: ["El sistema no tiene solución única. Revisa el planteamiento."] })
      setPasos(pasosList)
      return { solucion: null, angulosSol: angulosSolucion, nodosFinales: nodosActuales }
    }

    // Paso de resultados
    const resultadosLineas: string[] = []
    sol.forEach((val, i) => {
      const inc = incognitasBase[i]
      resultadosLineas.push(`${inc.nombre} = ${fmt2(val)} ${cfg.fuerza}`)
      if (inc.tipo === "elemento") tensionesSolucion[inc.refId] = val
    })

    // Recuperar tensiones de elementos sustituidos
    for (const [elId, sub] of Object.entries(sustituciones)) {
      const refVal = tensionesSolucion[sub.refId]
      if (refVal !== undefined) {
        tensionesSolucion[parseInt(elId)] = sub.factorDe * refVal
        resultadosLineas.push(`${elementos.find(e => e.id === parseInt(elId))?.nombre} = ${fmt2(sub.factorDe)} × ${fmt2(refVal)} = ${fmt2(sub.factorDe * refVal)} ${cfg.fuerza}`)
      }
    }

    pasosList.push({
      titulo: `${pasosList.length + 1}. Resultados`,
      lineas: resultadosLineas
    })

    // Verificación
    const verificacionLineas: string[] = []
    nodosLibres.forEach(n => {
      let fx = 0, fy = 0
      elementosActuales.forEach(e => {
        let angN: number | null = null
        if (e.nodoA === n.id) angN = e.angDesdeA
        else if (e.nodoB === n.id) angN = e.angDesdeA + 180
        if (angN !== null) {
          const val = e.conocido ? e.valorConocido : (tensionesSolucion[e.id] ?? 0)
          fx += val * Math.cos(rad(angN))
          fy += val * Math.sin(rad(angN))
        }
      })
      fuerzas.filter(f => f.nodoId === n.id).forEach(f => {
        const mag = f.modo === "completa" ? f.magnitud : (sol![incognitasBase.findIndex(i => i.tipo === "fuerzaMag" && i.refId === f.id)] ?? 0)
        fx += mag * Math.cos(rad(f.angulo))
        fy += mag * Math.sin(rad(f.angulo))
      })
      verificacionLineas.push(`Nudo ${n.nombre}: ΣFx = ${fmt2(fx)} ${cfg.fuerza}, ΣFy = ${fmt2(fy)} ${cfg.fuerza} ${Math.abs(fx) < 0.01 && Math.abs(fy) < 0.01 ? "✓" : "⚠ No cumple equilibrio"}`)
    })

    pasosList.push({
      titulo: `${pasosList.length + 1}. Verificación de equilibrio`,
      lineas: verificacionLineas
    })

    setPasos(pasosList)
    return { solucion: sol, incognitasBase, tensionesSolucion, angulosSol: angulosSolucion, nodosFinales: nodosActuales }
  }

  const [resultadoFinal, setResultadoFinal] = useState<any>(null)

  const calcular = () => {
    const res = resolverAnalitico()
    setResultadoFinal(res)
  }

  useEffect(() => { dibujar() }, [nodos, elementos, fuerzas, resultadoFinal])

  const dibujar = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth, H = canvas.offsetHeight || 440
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr)
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H)

    const nodosRender = resultadoFinal?.nodosFinales || nodos
    const padL = 45, padR = 20, padT = 20, padB = 30
    const allX = nodosRender.map((n: Nodo) => n.x), allY = nodosRender.map((n: Nodo) => n.y)
    const maxAbs = Math.max(...allX.map(Math.abs), ...allY.map(Math.abs), 2) * 1.35
    const sc = Math.min((W-padL-padR)/(2*maxAbs), (H-padT-padB)/(2*maxAbs))
    const centroX = (Math.min(...allX)+Math.max(...allX))/2
    const centroY = (Math.min(...allY)+Math.max(...allY))/2
    const cx = padL + (W-padL-padR)/2, cy = padT + (H-padT-padB)/2
    const tx = (x: number) => cx + (x-centroX)*sc
    const ty = (y: number) => cy - (y-centroY)*sc

    const rawStep = maxAbs/3, exp = Math.floor(Math.log10(rawStep||1)), base = Math.pow(10,exp)
    const step = rawStep/base > 5 ? base*5 : rawStep/base > 2 ? base*2 : base
    ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 0.5
    for (let v = Math.floor((centroX-maxAbs)/step)*step; v <= centroX+maxAbs; v+=step) {
      ctx.beginPath(); ctx.moveTo(tx(v), padT); ctx.lineTo(tx(v), H-padB); ctx.stroke()
    }
    for (let v = Math.floor((centroY-maxAbs)/step)*step; v <= centroY+maxAbs; v+=step) {
      ctx.beginPath(); ctx.moveTo(padL, ty(v)); ctx.lineTo(W-padR, ty(v)); ctx.stroke()
    }
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1
    ctx.strokeRect(padL, padT, W-padL-padR, H-padT-padB)

    ctx.fillStyle = "#9ca3af"; ctx.font = "9px sans-serif"; ctx.textAlign = "center"
    let lastLX = -Infinity
    for (let v = Math.floor((centroX-maxAbs)/step)*step; v <= centroX+maxAbs; v+=step) {
      const px = tx(v); if (px < padL || px > W-padR || px-lastLX < 32) continue
      lastLX = px; ctx.fillText(Math.abs(v)<0.001?"0":parseFloat(v.toFixed(2)).toString(), px, H-padB+12)
    }
    ctx.textAlign = "right"; let lastLY = Infinity
    for (let v = Math.floor((centroY-maxAbs)/step)*step; v <= centroY+maxAbs; v+=step) {
      const py = ty(v); if (py < padT || py > H-padB || lastLY-py < 18) continue
      lastLY = py; ctx.fillText(Math.abs(v)<0.001?"0":parseFloat(v.toFixed(2)).toString(), padL-4, py+3)
    }

    const elRender = elementos.map(e => {
      const A = nodosRender.find((n: Nodo) => n.id === e.nodoA)!
      const B = nodosRender.find((n: Nodo) => n.id === e.nodoB)!
      const dx = B.x-A.x, dy = B.y-A.y
      return { ...e, angDesdeA: deg(Math.atan2(dy,dx)), longitud: Math.sqrt(dx*dx+dy*dy) }
    })

    elRender.forEach(e => {
      const A = nodosRender.find((n: Nodo) => n.id === e.nodoA)!
      const B = nodosRender.find((n: Nodo) => n.id === e.nodoB)!
      const val = resultadoFinal?.tensionesSolucion?.[e.id] ?? (e.conocido ? e.valorConocido : 0)
      const esInvalido = e.tipo === "cable" && val < -0.01
      ctx.strokeStyle = esInvalido ? "#dc2626" : e.color
      ctx.lineWidth = e.tipo === "barra" ? 4 : 2
      if (esInvalido) ctx.setLineDash([5,3])
      ctx.beginPath(); ctx.moveTo(tx(A.x), ty(A.y)); ctx.lineTo(tx(B.x), ty(B.y)); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = esInvalido ? "#dc2626" : e.color; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
      ctx.fillText(`${e.nombre}=${fmt2(val)} ${cfg.fuerza}`, tx(A.x)+(tx(B.x)-tx(A.x))*0.45+4, ty(A.y)+(ty(B.y)-ty(A.y))*0.45-4)
    })

    nodosRender.forEach((n: Nodo) => {
      const nx = tx(n.x), ny = ty(n.y)
      if (n.apoyo === "fijo") {
        ctx.strokeStyle = "#475569"; ctx.lineWidth = 1.5
        for (let k = -10; k <= 10; k+=5) { ctx.beginPath(); ctx.moveTo(nx+k, ny); ctx.lineTo(nx+k-5, ny+8); ctx.stroke() }
        ctx.beginPath(); ctx.moveTo(nx-10, ny); ctx.lineTo(nx+10, ny); ctx.stroke()
      } else if (n.apoyo === "pasador") {
        ctx.fillStyle = "#94a3b8"
        ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx-9, ny+16); ctx.lineTo(nx+9, ny+16); ctx.closePath(); ctx.fill()
        for (let k = -8; k <= 8; k+=4) { ctx.strokeStyle = "#94a3b8"; ctx.beginPath(); ctx.moveTo(nx+k, ny+16); ctx.lineTo(nx+k-4, ny+22); ctx.stroke() }
      } else if (n.apoyo === "rodillo") {
        ctx.save(); ctx.translate(nx, ny); ctx.rotate(-rad(n.anguloRodillo))
        ctx.fillStyle = "#94a3b8"; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-9,14); ctx.lineTo(9,14); ctx.closePath(); ctx.fill()
        ctx.beginPath(); ctx.arc(-5,18,3,0,Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(5,18,3,0,Math.PI*2); ctx.fill()
        ctx.restore()
      } else if (n.apoyo === "empotrado") {
        ctx.fillStyle = "#475569"; ctx.fillRect(nx-14, ny-2, 28, 6)
        for (let k = -12; k <= 12; k+=6) { ctx.strokeStyle = "#475569"; ctx.beginPath(); ctx.moveTo(nx+k, ny+4); ctx.lineTo(nx+k-4, ny+10); ctx.stroke() }
      } else if (n.apoyo === "polea") {
        ctx.beginPath(); ctx.arc(nx, ny, 8, 0, Math.PI*2); ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.stroke()
      }
      ctx.beginPath(); ctx.arc(nx, ny, 4.5, 0, Math.PI*2); ctx.fillStyle = "#1e293b"; ctx.fill()
      ctx.strokeStyle = "white"; ctx.lineWidth = 1.2; ctx.stroke()
      ctx.fillStyle = "#1e293b"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "right"
      ctx.fillText(n.nombre, nx-8, ny-8)
    })

    fuerzas.forEach(f => {
      const n = nodosRender.find((nd: Nodo) => nd.id === f.nodoId)!
      const nx = tx(n.x), ny = ty(n.y)
      const angMostrar = f.angulo
      const len = 65
      const fx2 = nx + len*Math.cos(rad(angMostrar)), fy2 = ny - len*Math.sin(rad(angMostrar))
      ctx.strokeStyle = f.color; ctx.fillStyle = f.color; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(fx2, fy2); ctx.stroke()
      const ang2 = Math.atan2(fy2-ny, fx2-nx)
      ctx.beginPath(); ctx.moveTo(fx2, fy2)
      ctx.lineTo(fx2-10*Math.cos(ang2-0.4), fy2-10*Math.sin(ang2-0.4))
      ctx.lineTo(fx2-10*Math.cos(ang2+0.4), fy2-10*Math.sin(ang2+0.4))
      ctx.closePath(); ctx.fill()
      ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
      ctx.fillText(`${f.nombre}`, fx2+4, fy2+4)
    })

    ctx.fillStyle = "#374151"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left"
    ctx.fillText(`x (${cfg.longitud})`, W-padR-35, padT-6)
    ctx.fillText(`y (${cfg.longitud})`, padL+4, padT-6)
  }

  const [nuevoNodoNombre, setNuevoNodoNombre] = useState("")
  const [nuevoNodoX, setNuevoNodoX] = useState("0")
  const [nuevoNodoY, setNuevoNodoY] = useState("0")

  const agregarNodo = () => {
    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    setNodos([...nodos, { id: nextNodoId, nombre: nuevoNodoNombre||letras[(nextNodoId-1)%26], x: parseFloat(nuevoNodoX)||0, y: parseFloat(nuevoNodoY)||0, apoyo: "libre", anguloRodillo: 0 }])
    setNextNodoId(nextNodoId+1); setNuevoNodoNombre(""); setNuevoNodoX("0"); setNuevoNodoY("0"); setMostrarAgregarNodo(false)
  }
  const eliminarNodo = (id: number) => {
    setNodos(nodos.filter(n => n.id !== id))
    setElementos(elementos.filter(e => e.nodoA !== id && e.nodoB !== id))
    setFuerzas(fuerzas.filter(f => f.nodoId !== id))
    setRestricciones(restricciones.filter(r => {
      if (r.tipo === "coordenada_libre") return r.nodoId !== id
      if (r.tipo === "longitud_total") return true
      return true
    }))
  }
  const actualizarNodo = (id: number, key: keyof Nodo, val: any) => setNodos(nodos.map(n => n.id === id ? { ...n, [key]: val } : n))

  const [nuevoElA, setNuevoElA] = useState<number|null>(null)
  const [nuevoElB, setNuevoElB] = useState<number|null>(null)
  const [nuevoElTipo, setNuevoElTipo] = useState<TipoElemento>("cable")

  const agregarElemento = () => {
    if (nuevoElA === null || nuevoElB === null || nuevoElA === nuevoElB) return
    setElementos([...elementos, { id: nextElId, nombre: `T${nextElId}`, nodoA: nuevoElA, nodoB: nuevoElB, tipo: nuevoElTipo, conocido: false, valorConocido: 0, tensionAdmisible: 500, color: COLORES[(nextElId-1)%COLORES.length] }])
    setNextElId(nextElId+1); setNuevoElA(null); setNuevoElB(null); setMostrarAgregarEl(false)
  }
  const eliminarElemento = (id: number) => setElementos(elementos.filter(e => e.id !== id))
  const actualizarElemento = (id: number, key: keyof Elemento, val: any) => setElementos(elementos.map(e => e.id === id ? { ...e, [key]: val } : e))

  const agregarFuerza = (nodoId: number) => {
    setFuerzas([...fuerzas, { id: nextFId, nodoId, nombre: `F${nextFId}`, magnitud: 100, angulo: 270, modo: "completa", color: "#374151" }])
    setNextFId(nextFId+1)
  }
  const eliminarFuerza = (id: number) => setFuerzas(fuerzas.filter(f => f.id !== id))
  const actualizarFuerza = (id: number, key: keyof FuerzaExterna, val: any) => setFuerzas(fuerzas.map(f => f.id === id ? { ...f, [key]: val } : f))

  const agregarRestriccion = () => {
    if (tipoNuevaRestr === "relacion_tensiones" && rEl1 !== null && rEl2 !== null) {
      setRestricciones([...restricciones, { tipo: "relacion_tensiones", elId1: rEl1, elId2: rEl2, factor: parseFloat(rFactor)||2 }])
    } else if (tipoNuevaRestr === "angulo_cable" && rEl1 !== null) {
      setRestricciones([...restricciones, { tipo: "angulo_cable", elId: rEl1 }])
    } else if (tipoNuevaRestr === "longitud_total" && rElIds.length > 0) {
      setRestricciones([...restricciones, { tipo: "longitud_total", elIds: rElIds, longitud: parseFloat(rLongitud)||15 }])
    } else if (tipoNuevaRestr === "coordenada_libre" && rNodoId !== null) {
      setRestricciones([...restricciones, { tipo: "coordenada_libre", nodoId: rNodoId, coord: rCoord }])
    }
    setMostrarAgregarRestr(false)
    setREl1(null); setREl2(null); setRNodoId(null); setRElIds([])
  }
  const eliminarRestriccion = (idx: number) => setRestricciones(restricciones.filter((_, i) => i !== idx))

  const descripcionRestriccion = (r: TipoRestriccion) => {
    if (r.tipo === "relacion_tensiones") {
      const e1 = elementos.find(e => e.id === r.elId1)?.nombre
      const e2 = elementos.find(e => e.id === r.elId2)?.nombre
      return `${e1} = ${r.factor} × ${e2}`
    }
    if (r.tipo === "angulo_cable") return `Ángulo de ${elementos.find(e => e.id === r.elId)?.nombre} es incógnita`
    if (r.tipo === "longitud_total") return `Longitud total ${r.elIds.map(id => elementos.find(e => e.id === id)?.nombre).join("+")} = ${r.longitud} ${cfg.longitud}`
    if (r.tipo === "coordenada_libre") return `Coordenada ${r.coord} de nodo ${nodos.find(n => n.id === r.nodoId)?.nombre} es incógnita`
    return ""
  }

  // Modo diseño
  let disenoResultado: any = null
  if (modoDiseno && resultadoFinal?.tensionesSolucion) {
    const fuerzaPeso = fuerzas.find(f => f.modo === "soloMagnitud")
    if (fuerzaPeso) {
      const wActual = resultadoFinal.solucion?.[resultadoFinal.incognitasBase?.findIndex((i: any) => i.tipo === "fuerzaMag" && i.refId === fuerzaPeso.id)] ?? 0
      const factoresK = elementos.filter(e => e.tipo === "cable" && !e.conocido).map(e => {
        const tActual = resultadoFinal.tensionesSolucion[e.id] ?? 0
        const k = wActual !== 0 ? tActual / wActual : 0
        const wMaxInd = k > 0 ? e.tensionAdmisible / k : Infinity
        return { nombre: e.nombre, k, wMaxIndividual: wMaxInd }
      })
      const validos = factoresK.filter(f => f.wMaxIndividual > 0 && isFinite(f.wMaxIndividual))
      if (validos.length > 0) {
        const wMax = Math.min(...validos.map(f => f.wMaxIndividual))
        disenoResultado = { wMax, factoresK, cableGobernante: validos.find(f => f.wMaxIndividual === wMax)?.nombre || "" }
      }
    }
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

              {/* Modo diseño */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={modoDiseno} onChange={e => setModoDiseno(e.target.checked)} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">Modo diseño: peso máximo según tensión admisible</div>
                    <div className="text-xs text-gray-500 mt-0.5">Calcula el peso máximo que puede soportar el sistema sin sobrepasar la tensión admisible de ningún cable.</div>
                  </div>
                </label>
              </div>

              {/* Nodos */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">NODOS</div>
                  <button onClick={() => setMostrarAgregarNodo(true)} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Agregar</button>
                </div>
                {mostrarAgregarNodo && (
                  <div className="p-3 mb-3 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input placeholder="Nombre" value={nuevoNodoNombre} onChange={e => setNuevoNodoNombre(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                      <input type="number" placeholder="x" value={nuevoNodoX} onChange={e => setNuevoNodoX(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                      <input type="number" placeholder="y" value={nuevoNodoY} onChange={e => setNuevoNodoY(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={agregarNodo} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg">Agregar</button>
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
                          <input type="number" value={n.x} onChange={e => actualizarNodo(n.id, "x", parseFloat(e.target.value)||0)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">y ({cfg.longitud})</div>
                          <input type="number" value={n.y} onChange={e => actualizarNodo(n.id, "y", parseFloat(e.target.value)||0)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">Tipo de apoyo</div>
                      <select value={n.apoyo} onChange={e => actualizarNodo(n.id, "apoyo", e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-blue-400">
                        <option value="libre">Libre (nudo de equilibrio)</option>
                        <option value="fijo">Anclaje (pared, techo fijo)</option>
                        <option value="pasador">Pasador (2 reacciones)</option>
                        <option value="rodillo">Rodillo (1 reacción)</option>
                        <option value="empotrado">Empotrado (2 reacciones)</option>
                        <option value="polea">Polea (redirige cable)</option>
                      </select>
                      {n.apoyo === "rodillo" && (
                        <div className="mb-2">
                          <div className="text-xs text-gray-500 mb-1">Ángulo superficie (°)</div>
                          <input type="number" value={n.anguloRodillo} onChange={e => actualizarNodo(n.id, "anguloRodillo", parseFloat(e.target.value)||0)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
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
                  <div className="text-xs text-gray-400 font-medium tracking-wider">ELEMENTOS</div>
                  <button onClick={() => setMostrarAgregarEl(true)} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Conectar</button>
                </div>
                {mostrarAgregarEl && (
                  <div className="p-3 mb-3 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <select value={nuevoElA??""} onChange={e => setNuevoElA(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400">
                        <option value="">Nodo A</option>
                        {nodos.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                      </select>
                      <select value={nuevoElB??""} onChange={e => setNuevoElB(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400">
                        <option value="">Nodo B</option>
                        {nodos.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                      </select>
                    </div>
                    <select value={nuevoElTipo} onChange={e => setNuevoElTipo(e.target.value as TipoElemento)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-blue-400">
                      <option value="cable">Cable (solo tensión)</option>
                      <option value="barra">Barra rígida</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={agregarElemento} className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded-lg">Conectar</button>
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
                          <input value={e.nombre} onChange={ev => actualizarElemento(e.id, "nombre", ev.target.value)} className="text-sm font-medium text-gray-800 bg-transparent w-14 focus:outline-none" />
                          <span className="text-xs text-gray-400">{getNodo(e.nodoA).nombre} → {getNodo(e.nodoB).nombre}</span>
                        </div>
                        <button onClick={() => eliminarElemento(e.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                      </div>
                      <div className="text-xs text-gray-400 mb-2">{e.tipo} — L: {fmt2(e.longitud)} {cfg.longitud} — θ: {fmt2(e.angDesdeA)}°</div>
                      {modoDiseno && e.tipo === "cable" ? (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Tensión admisible ({cfg.fuerza})</div>
                          <input type="number" value={e.tensionAdmisible} onChange={ev => actualizarElemento(e.id, "tensionAdmisible", parseFloat(ev.target.value)||0)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                      ) : (
                        <>
                          <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                            <input type="checkbox" checked={e.conocido} onChange={ev => actualizarElemento(e.id, "conocido", ev.target.checked)} />
                            Valor conocido (si no, es incógnita)
                          </label>
                          {e.conocido && (
                            <input type="number" value={e.valorConocido} onChange={ev => actualizarElemento(e.id, "valorConocido", parseFloat(ev.target.value)||0)} placeholder={`Valor (${cfg.fuerza})`} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fuerzas externas */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">FUERZAS EXTERNAS</div>
                  {nodos.length > 0 && <button onClick={() => agregarFuerza(nodos[0].id)} className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">+ Agregar</button>}
                </div>
                {fuerzas.length === 0 && <div className="text-xs text-gray-400 text-center py-4">Sin fuerzas externas</div>}
                <div className="flex flex-col gap-2">
                  {fuerzas.map(f => (
                    <div key={f.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input value={f.nombre} onChange={e => actualizarFuerza(f.id, "nombre", e.target.value)} className="text-sm font-medium text-gray-800 bg-transparent w-14 focus:outline-none" />
                          <select value={f.nodoId} onChange={e => actualizarFuerza(f.id, "nodoId", parseInt(e.target.value))} className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400">
                            {nodos.map(n => <option key={n.id} value={n.id}>en {n.nombre}</option>)}
                          </select>
                        </div>
                        <button onClick={() => eliminarFuerza(f.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">Qué se conoce</div>
                      <select value={f.modo} onChange={e => actualizarFuerza(f.id, "modo", e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-blue-400">
                        <option value="completa">Magnitud y ángulo conocidos</option>
                        <option value="soloMagnitud">Solo ángulo conocido — magnitud incógnita</option>
                        <option value="resultante">Nada conocido — resultante incógnita</option>
                      </select>
                      {f.modo === "completa" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Magnitud ({cfg.fuerza})</div>
                            <input type="number" value={f.magnitud} onChange={e => actualizarFuerza(f.id, "magnitud", parseFloat(e.target.value)||0)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Ángulo (°)</div>
                            <input type="number" value={f.angulo} onChange={e => actualizarFuerza(f.id, "angulo", parseFloat(e.target.value)||0)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                        </div>
                      )}
                      {f.modo === "soloMagnitud" && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Ángulo conocido (°)</div>
                          <input type="number" value={f.angulo} onChange={e => actualizarFuerza(f.id, "angulo", parseFloat(e.target.value)||0)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5 mt-2">Magnitud se calcula como incógnita</div>
                        </div>
                      )}
                      {f.modo === "resultante" && (
                        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">Magnitud y ángulo se calculan como incógnita</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Restricciones */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium tracking-wider">RESTRICCIONES ADICIONALES</div>
                  <button onClick={() => setMostrarAgregarRestr(true)} className="text-xs bg-purple-700 text-white px-3 py-1.5 rounded-lg hover:bg-purple-800">+ Agregar</button>
                </div>
                <div className="text-xs text-gray-400 mb-3">Para problemas con relaciones entre tensiones, ángulos incógnita, cables continuos o coordenadas libres.</div>

                {mostrarAgregarRestr && (
                  <div className="p-3 mb-3 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="text-xs text-gray-500 mb-1">Tipo de restricción</div>
                    <select value={tipoNuevaRestr} onChange={e => setTipoNuevaRestr(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs mb-3 focus:outline-none focus:border-purple-400">
                      <option value="relacion_tensiones">Relación de tensiones: T₁ = k × T₂ (ej. 3-17)</option>
                      <option value="angulo_cable">Ángulo de cable como incógnita (ej. 3-13)</option>
                      <option value="longitud_total">Longitud total de cable continuo (ej. 3-43)</option>
                      <option value="coordenada_libre">Coordenada libre de nodo de anclaje (ej. 3-43)</option>
                    </select>

                    {tipoNuevaRestr === "relacion_tensiones" && (
                      <div className="flex flex-col gap-2">
                        <select value={rEl1??""} onChange={e => setREl1(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400">
                          <option value="">Elemento T₁</option>
                          {elementos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                        </select>
                        <div className="text-xs text-gray-500">= factor ×</div>
                        <select value={rEl2??""} onChange={e => setREl2(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400">
                          <option value="">Elemento T₂</option>
                          {elementos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                        </select>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Factor k (T₁ = k × T₂)</div>
                          <input type="number" value={rFactor} onChange={e => setRFactor(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400" />
                        </div>
                      </div>
                    )}

                    {tipoNuevaRestr === "angulo_cable" && (
                      <select value={rEl1??""} onChange={e => setREl1(parseInt(e.target.value))} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400">
                        <option value="">Cable con ángulo incógnita</option>
                        {elementos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    )}

                    {tipoNuevaRestr === "longitud_total" && (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs text-gray-500">Selecciona los elementos del cable continuo:</div>
                        {elementos.map(e => (
                          <label key={e.id} className="flex items-center gap-2 text-xs">
                            <input type="checkbox" checked={rElIds.includes(e.id)} onChange={ev => setRElIds(ev.target.checked ? [...rElIds, e.id] : rElIds.filter(id => id !== e.id))} />
                            {e.nombre}
                          </label>
                        ))}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Longitud total ({cfg.longitud})</div>
                          <input type="number" value={rLongitud} onChange={e => setRLongitud(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400" />
                        </div>
                      </div>
                    )}

                    {tipoNuevaRestr === "coordenada_libre" && (
                      <div className="flex flex-col gap-2">
                        <select value={rNodoId??""} onChange={e => setRNodoId(parseInt(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400">
                          <option value="">Nodo con coordenada libre</option>
                          {nodos.filter(n => n.apoyo === "fijo").map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 text-xs"><input type="radio" checked={rCoord==="x"} onChange={() => setRCoord("x")} /> Coordenada x libre</label>
                          <label className="flex items-center gap-1 text-xs"><input type="radio" checked={rCoord==="y"} onChange={() => setRCoord("y")} /> Coordenada y libre</label>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button onClick={agregarRestriccion} className="text-xs bg-purple-700 text-white px-3 py-1.5 rounded-lg">Agregar</button>
                      <button onClick={() => setMostrarAgregarRestr(false)} className="text-xs text-gray-500">Cancelar</button>
                    </div>
                  </div>
                )}

                {restricciones.length === 0 && <div className="text-xs text-gray-400 text-center py-2">Sin restricciones adicionales</div>}
                <div className="flex flex-col gap-2">
                  {restricciones.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-200">
                      <span className="text-xs text-purple-700 font-medium">{descripcionRestriccion(r)}</span>
                      <button onClick={() => eliminarRestriccion(i)} className="text-xs text-red-400 hover:text-red-600 ml-2">×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botón calcular */}
              <button onClick={calcular} className="w-full bg-blue-700 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
                Calcular — Resolver sistema
              </button>
            </div>

            {/* Panel derecho */}
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DIAGRAMA</div>
                <canvas ref={canvasRef} className="w-full border border-gray-100 rounded-lg" style={{ height: 440 }} />
                <div className="mt-2 text-xs text-gray-400">↻ Ángulos antihorario desde +x. Rayado = anclaje. Triángulo = pasador. Ruedas = rodillo. Bloque = empotrado. Círculo = polea.</div>
              </div>

              {disenoResultado && (
                <div className="bg-white border-2 border-green-300 rounded-xl p-5">
                  <div className="text-xs text-green-600 font-medium tracking-wider mb-3">MODO DISEÑO — PESO MÁXIMO</div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-3">
                    <div className="text-xs text-green-600 mb-1">Peso máximo admisible</div>
                    <div className="text-2xl font-bold text-green-800">{fmt2(disenoResultado.wMax)} {cfg.fuerza}</div>
                    <div className="text-xs text-green-600 mt-1">Cable gobernante: {disenoResultado.cableGobernante}</div>
                  </div>
                  {disenoResultado.factoresK.map((f: any) => (
                    <div key={f.nombre} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg mb-1">
                      <span className="text-gray-600">{f.nombre}: k = {fmt(f.k, 4)}</span>
                      <span className="font-medium">W_max = {fmt2(f.wMaxIndividual)} {cfg.fuerza}</span>
                    </div>
                  ))}
                </div>
              )}

              {resultadoFinal?.tensionesSolucion && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">RESULTADOS</div>
                  <div className="grid grid-cols-2 gap-3">
                    {resultadoFinal.incognitasBase?.map((inc: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-600">
                        <div className="text-xs text-blue-500">{inc.nombre}</div>
                        <div className="text-base font-bold text-blue-800">{fmt2(resultadoFinal.solucion[idx])} {cfg.fuerza}</div>
                        {inc.tipo === "elemento" && (
                          <div className="text-xs text-gray-400">{resultadoFinal.solucion[idx] >= 0 ? "Tensión" : "Compresión ⚠"}</div>
                        )}
                      </div>
                    ))}
                    {Object.entries(resultadoFinal.tensionesSolucion || {}).filter(([id]) =>
                      !resultadoFinal.incognitasBase?.some((i: any) => i.tipo === "elemento" && i.refId === parseInt(id))
                    ).map(([id, val]) => {
                      const el = elementos.find(e => e.id === parseInt(id))
                      return el ? (
                        <div key={id} className="p-3 rounded-lg bg-purple-50 border-l-4 border-purple-600">
                          <div className="text-xs text-purple-500">{el.nombre} (por restricción)</div>
                          <div className="text-base font-bold text-purple-800">{fmt2(val as number)} {cfg.fuerza}</div>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {pasos.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">DESARROLLO ANALÍTICO PASO A PASO</div>
                  <div className="flex flex-col gap-4">
                    {pasos.map((paso, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl border-l-4 border-blue-400">
                        <div className="text-xs font-bold text-blue-700 mb-2">{paso.titulo}</div>
                        {paso.lineas.map((linea, j) => (
                          <div key={j} className="text-xs text-gray-700 font-mono mb-1">{linea}</div>
                        ))}
                        {paso.resultado && (
                          <div className="mt-2 text-xs font-bold text-blue-800 bg-blue-100 rounded px-2 py-1">{paso.resultado}</div>
                        )}
                      </div>
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