// app/lib/vigas/motor.ts
// Motor de doble integración clásica generalizado (Macaulay + apoyos indeterminados + rótulas)

export type TipoApoyo = "simple" | "empotrado" | "libre" | "guia"

export interface Apoyo {
  id: string
  x: number
  tipo: TipoApoyo
  asentamiento?: number
  giroImpuesto?: number
}

export interface Rotula {
  id: string
  x: number
}

export type Carga =
  | { id: string; tipo: "puntual"; x: number; P: number }
  | { id: string; tipo: "momento"; x: number; M: number }
  | { id: string; tipo: "distribuida"; xi: number; xf: number; wi: number; wf: number }

export interface Termino {
  coef: number
  power: number
  x0: number
}

function evalTermino(t: Termino, x: number): number {
  const d = x - t.x0
  if (d < 0) return 0
  if (t.power === 0) return d >= 0 ? t.coef : 0
  return t.coef * Math.pow(d, t.power)
}

function integrarTermino(t: Termino): Termino {
  const nuevaPower = t.power + 1
  return { coef: t.coef / nuevaPower, power: nuevaPower, x0: t.x0 }
}

function evalTerminos(terminos: Termino[], x: number): number {
  return terminos.reduce((acc, t) => acc + evalTermino(t, x), 0)
}

// Contribución a M(x) de una carga distribuida trapezoidal/triangular/uniforme en [xi,xf].
// Se descompone en: parte uniforme (altura wi) + parte triangular (rampa 0 -> wf-wi).
// Devuelve los términos en convención "sin negar" (el llamador les cambia el signo,
// igual que hace con las cargas puntuales).
function terminosMomentoDeCargaDistribuida(xi: number, xf: number, wi: number, wf: number): Termino[] {
  const Lseg = xf - xi
  if (Lseg <= 0) return []
  const pendiente = (wf - wi) / Lseg // m

  // Parte uniforme (verificada: M_udl(x) = w/2[<x-xi>^2 - <x-xf>^2])
  const terminosUniforme: Termino[] = [
    { coef: wi / 2, power: 2, x0: xi },
    { coef: -wi / 2, power: 2, x0: xf },
  ]

  if (Math.abs(pendiente) < 1e-12) return terminosUniforme

  // Parte triangular (rampa 0 en xi -> pendiente*Lseg en xf, truncada en xf).
  // Derivación: M_tri(x) = -m/6<x-xi>^3 + m/6<x-xf>^3 + (m*Lseg/2)<x-xf>^2  (forma final, con signo)
  // Como el llamador niega todo el arreglo, aquí devolvemos la versión "sin negar":
  const terminosTriangular: Termino[] = [
    { coef: pendiente / 6, power: 3, x0: xi },
    { coef: -pendiente / 6, power: 3, x0: xf },
    { coef: -(pendiente * Lseg) / 2, power: 2, x0: xf },
  ]

  return [...terminosUniforme, ...terminosTriangular]
}

interface Incognita {
  nombre: string
  terminoBase: Omit<Termino, "coef">
  tipo: "reaccionVertical" | "reaccionMomento" | "C1" | "C2"
  apoyoId?: string
  segmentoDesdeRotulaId?: string
}

export interface ResultadoViga {
  L: number
  reacciones: Record<string, { Fy?: number; M?: number }>
  constantes: Record<string, number>
  M: (x: number) => number
  V: (x: number) => number
  theta: (x: number, EI: number) => number
  v: (x: number, EI: number) => number
  pasos: string[]
  terminosM: Termino[]
  puntosCriticos: number[]
}

function resolverSistemaLineal(A: number[][], b: number[]): number[] {
  const n = A.length
  const M = A.map((fila, i) => [...fila, b[i]])

  for (let col = 0; col < n; col++) {
    let pivote = col
    for (let f = col + 1; f < n; f++) {
      if (Math.abs(M[f][col]) > Math.abs(M[pivote][col])) pivote = f
    }
    if (Math.abs(M[pivote][col]) < 1e-10) continue
    ;[M[col], M[pivote]] = [M[pivote], M[col]]

    for (let f = 0; f < n; f++) {
      if (f === col) continue
      const factor = M[f][col] / M[col][col]
      for (let c = col; c <= n; c++) M[f][c] -= factor * M[col][c]
    }
  }

  return M.map((fila, i) => fila[n] / fila[i])
}

export function resolverViga(
  L: number,
  apoyos: Apoyo[],
  cargas: Carga[],
  rotulas: Rotula[] = []
): ResultadoViga {
  const pasos: string[] = []
  const apoyosOrdenados = [...apoyos].sort((a, b) => a.x - b.x)
  const rotulasOrdenadas = [...rotulas].sort((a, b) => a.x - b.x)

  const incognitas: Incognita[] = []
  for (const ap of apoyosOrdenados) {
    if (ap.tipo === "libre") continue
    incognitas.push({
      nombre: `Fy_${ap.id}`,
      terminoBase: { power: 1, x0: ap.x },
      tipo: "reaccionVertical",
      apoyoId: ap.id,
    })
    if (ap.tipo === "empotrado") {
      incognitas.push({
        nombre: `M_${ap.id}`,
        terminoBase: { power: 0, x0: ap.x },
        tipo: "reaccionMomento",
        apoyoId: ap.id,
      })
    }
  }

  incognitas.push({ nombre: "C1", terminoBase: { power: 1, x0: 0 }, tipo: "C1" })
  incognitas.push({ nombre: "C2", terminoBase: { power: 0, x0: 0 }, tipo: "C2" })
  for (const r of rotulasOrdenadas) {
    incognitas.push({
      nombre: `dC1_${r.id}`,
      terminoBase: { power: 1, x0: r.x },
      tipo: "C1",
      segmentoDesdeRotulaId: r.id,
    })
  }

  const n = incognitas.length

  const terminosCarga: Termino[] = []
  for (const c of cargas) {
    if (c.tipo === "puntual") {
      terminosCarga.push({ coef: -c.P, power: 1, x0: c.x })
    } else if (c.tipo === "momento") {
      terminosCarga.push({ coef: c.M, power: 0, x0: c.x })
    } else if (c.tipo === "distribuida") {
      const tt = terminosMomentoDeCargaDistribuida(c.xi, c.xf, c.wi, c.wf)
      terminosCarga.push(...tt.map((t) => ({ ...t, coef: -t.coef })))
    }
  }

  const terminosCargaIntegrados1 = terminosCarga.map(integrarTermino)
  const terminosCargaIntegrados2 = terminosCargaIntegrados1.map(integrarTermino)

  const filaFy = new Array(n).fill(0)
  let sumaCargasVerticales = 0
  for (const c of cargas) {
    if (c.tipo === "puntual") sumaCargasVerticales += c.P
    if (c.tipo === "distribuida") sumaCargasVerticales += ((c.wi + c.wf) / 2) * (c.xf - c.xi)
  }
  incognitas.forEach((inc, i) => {
    if (inc.tipo === "reaccionVertical") filaFy[i] = 1
  })

  const filaM0 = new Array(n).fill(0)
  let sumaMomentosCargas = 0
  for (const c of cargas) {
    if (c.tipo === "puntual") sumaMomentosCargas += c.P * c.x
    if (c.tipo === "momento") sumaMomentosCargas += -c.M
    if (c.tipo === "distribuida") {
      const W = ((c.wi + c.wf) / 2) * (c.xf - c.xi)
      const xc = c.xi + ((c.xf - c.xi) * (2 * c.wf + c.wi)) / (3 * (c.wi + c.wf) || 1)
      sumaMomentosCargas += W * xc
    }
  }
  incognitas.forEach((inc, i) => {
    if (inc.tipo === "reaccionVertical") filaM0[i] = inc.terminoBase.x0
    if (inc.tipo === "reaccionMomento") filaM0[i] = 1
  })

  const filas: number[][] = [filaFy, filaM0]
  const bs: number[] = [sumaCargasVerticales, sumaMomentosCargas]
  pasos.push("ΣFy = 0 y ΣM = 0 planteadas respecto al sistema global de reacciones e incógnitas.")

  function filaValorEnX(x: number, derivar: 0 | 1): number[] {
    const fila = new Array(n).fill(0)
    incognitas.forEach((inc, i) => {
      if (inc.tipo === "reaccionVertical") {
        const base: Termino = { coef: 1, power: 1, x0: inc.terminoBase.x0 }
        const integrado = derivar === 1 ? integrarTermino(base) : integrarTermino(integrarTermino(base))
        fila[i] = evalTermino(integrado, x)
      } else if (inc.tipo === "reaccionMomento") {
        const base: Termino = { coef: 1, power: 0, x0: inc.terminoBase.x0 }
        const integrado = derivar === 1 ? integrarTermino(base) : integrarTermino(integrarTermino(base))
        fila[i] = evalTermino(integrado, x)
      } else if (inc.tipo === "C1") {
        const x0 = inc.terminoBase.x0
        if (derivar === 1) fila[i] = x >= x0 ? 1 : 0
        else fila[i] = x >= x0 ? x - x0 : 0
      } else if (inc.tipo === "C2") {
        fila[i] = derivar === 1 ? 0 : 1
      }
    })
    return fila
  }
  function valorConocidoEnX(x: number, derivar: 0 | 1): number {
    const terminos = derivar === 1 ? terminosCargaIntegrados1 : terminosCargaIntegrados2
    return evalTerminos(terminos, x)
  }

  for (const ap of apoyosOrdenados) {
    if (ap.tipo === "libre") continue
    filas.push(filaValorEnX(ap.x, 0))
    bs.push((ap.asentamiento ?? 0) - valorConocidoEnX(ap.x, 0))
    pasos.push(`Condición de borde: EI·v(${ap.x}) = ${(ap.asentamiento ?? 0)} · EI (apoyo ${ap.id}, ${ap.tipo})`)

    if (ap.tipo === "empotrado") {
      filas.push(filaValorEnX(ap.x, 1))
      bs.push((ap.giroImpuesto ?? 0) - valorConocidoEnX(ap.x, 1))
      pasos.push(`Condición de borde: EI·θ(${ap.x}) = ${(ap.giroImpuesto ?? 0)} · EI (apoyo ${ap.id}, empotrado)`)
    }
    if (ap.tipo === "guia") {
      filas.push(filaValorEnX(ap.x, 1))
      bs.push((ap.giroImpuesto ?? 0) - valorConocidoEnX(ap.x, 1))
      pasos.push(`Condición de borde: EI·θ(${ap.x}) = ${(ap.giroImpuesto ?? 0)} · EI (apoyo ${ap.id}, guía)`)
    }
  }

  for (const r of rotulasOrdenadas) {
    const fila = new Array(n).fill(0)
    incognitas.forEach((inc, i) => {
      if (inc.tipo === "reaccionVertical") fila[i] = evalTermino({ coef: 1, power: 1, x0: inc.terminoBase.x0 }, r.x)
      if (inc.tipo === "reaccionMomento") fila[i] = evalTermino({ coef: 1, power: 0, x0: inc.terminoBase.x0 }, r.x)
    })
    filas.push(fila)
    bs.push(-evalTerminos(terminosCarga, r.x))
    pasos.push(`Condición de rótula: M(${r.x}) = 0 (articulación ${r.id})`)
  }

  const filasFinal = filas.slice(0, n)
  const bsFinal = bs.slice(0, n)

  const solucion = resolverSistemaLineal(filasFinal, bsFinal)

  const reacciones: Record<string, { Fy?: number; M?: number }> = {}
  const constantes: Record<string, number> = {}
  const terminosReacciones: Termino[] = []

  incognitas.forEach((inc, i) => {
    const valor = solucion[i]
    if (inc.tipo === "reaccionVertical") {
      reacciones[inc.apoyoId!] = { ...(reacciones[inc.apoyoId!] || {}), Fy: valor }
      terminosReacciones.push({ coef: valor, power: 1, x0: inc.terminoBase.x0 })
    } else if (inc.tipo === "reaccionMomento") {
      reacciones[inc.apoyoId!] = { ...(reacciones[inc.apoyoId!] || {}), M: valor }
      terminosReacciones.push({ coef: valor, power: 0, x0: inc.terminoBase.x0 })
    } else if (inc.tipo === "C1") {
      constantes[inc.nombre] = valor
    } else if (inc.tipo === "C2") {
      constantes[inc.nombre] = valor
    }
  })

  const terminosMTotal = [...terminosCarga, ...terminosReacciones].filter((t) => Math.abs(t.coef) > 1e-9)
  const terminosThetaEI = terminosMTotal.map(integrarTermino)
  const terminosVEI = terminosThetaEI.map(integrarTermino)

  function M(x: number) {
    return evalTerminos(terminosMTotal, x)
  }
  function V(x: number) {
    const h = 1e-4
    return (M(x + h) - M(x - h)) / (2 * h)
  }
  function theta(x: number, EI: number) {
    let acumuladoC1 = constantes["C1"] ?? 0
    for (const r of rotulasOrdenadas) {
      if (x >= r.x) acumuladoC1 += constantes[`dC1_${r.id}`] ?? 0
    }
    return (evalTerminos(terminosThetaEI, x) + acumuladoC1) / EI
  }
  function v(x: number, EI: number) {
    let extra = (constantes["C1"] ?? 0) * x + (constantes["C2"] ?? 0)
    for (const r of rotulasOrdenadas) {
      if (x >= r.x) extra += (constantes[`dC1_${r.id}`] ?? 0) * (x - r.x)
    }
    return (evalTerminos(terminosVEI, x) + extra) / EI
  }

  const setPuntos = new Set<number>([0, L])
  apoyosOrdenados.forEach((a) => setPuntos.add(Number(a.x.toFixed(6))))
  rotulasOrdenadas.forEach((r) => setPuntos.add(Number(r.x.toFixed(6))))
  for (const c of cargas) {
    if (c.tipo === "puntual" || c.tipo === "momento") setPuntos.add(Number(c.x.toFixed(6)))
    if (c.tipo === "distribuida") {
      setPuntos.add(Number(c.xi.toFixed(6)))
      setPuntos.add(Number(c.xf.toFixed(6)))
    }
  }
  const puntosCriticos = Array.from(setPuntos).sort((a, b) => a - b)

  return { L, reacciones, constantes, M, V, theta, v, pasos, terminosM: terminosMTotal, puntosCriticos }
}