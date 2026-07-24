// app/lib/vigas/motorFuerzas.ts
//
// Método de Fuerzas (Flexibilidad) para vigas.
//
// Idea central: la "viga primaria" (determinada, tras liberar las
// redundantes) se resuelve reutilizando exactamente el mismo motor de
// doble integración (resolverViga) ya validado — solo se le pasa una
// versión "rebajada" de los apoyos (por ejemplo, un empotrado sin su Fy
// redundante se convierte en una guía; sin su M redundante, en un
// rodillo; sin ninguna, en libre). Esto evita reescribir la estática
// desde cero y hereda toda la validación ya hecha.
//
// Estado "0": primaria + TODAS las cargas reales -> M0(x)
// Estado "i": primaria + una carga UNITARIA en el punto liberado i -> mi(x)
//
// Coeficientes de flexibilidad (trabajo virtual):
//   δij = ∫ mi(x)·mj(x) / EI dx   (0 a L)
//   δiL = ∫ M0(x)·mi(x) / EI dx   (0 a L)
//
// Resorte en la redundante i: se suma 1/k directamente a δii (la
// flexibilidad propia del resorte, en serie con la de la viga).
//
// Ecuación de compatibilidad:  Σ δij·Xj + δiL = Δi
//   Δi = 0 para apoyo rígido normal, = asentamiento/giro impuesto si se
//   definió, = 0 para resortes (ya absorbido en δii).
//
// Superposición final:  M(x) = M0(x) + Σ Xi·mi(x)

import {
  Apoyo,
  Carga,
  Rotula,
  TipoApoyo,
  Termino,
  resolverViga,
  evalTerminos,
  resolverSistemaLineal,
  integrarTermino,
} from "./motor"

export interface Resorte {
  id: string
  x: number
  tipo: "vertical" | "rotacional"
  k: number // kN/m (vertical) o kN·m/rad (rotacional) — unidades base
}

export type ComponenteRedundante = "Fy" | "M"

export interface RedundanteApoyo {
  origen: "apoyo"
  apoyoId: string
  componente: ComponenteRedundante
}
export interface RedundanteResorte {
  origen: "resorte"
  resorteId: string
}
export type Redundante = RedundanteApoyo | RedundanteResorte

export interface EstadoFuerzas {
  nombre: string // "0" para el real, "X1","X2",... para los unitarios
  terminosM: Termino[]
  puntosCriticos: number[]
  reacciones: Record<string, { Fy?: number; M?: number }>
}

export interface ResultadoFuerzas {
  L: number
  n: number
  redundantes: Redundante[]
  estado0: EstadoFuerzas
  estadosUnitarios: EstadoFuerzas[]
  matrizFlexibilidad: number[][]
  vectorCarga: number[]
  vectorImpuesto: number[]
  X: number[]
  terminosM: Termino[]
  puntosCriticos: number[]
  reacciones: Record<string, { Fy?: number; M?: number }>
  EI: number
}

function contarActivos(apoyos: Apoyo[]) {
  let numFy = 0
  let numM = 0
  for (const ap of apoyos) {
    if (ap.tipo === "rodillo" || ap.tipo === "articulado" || ap.tipo === "empotrado") numFy++
    if (ap.tipo === "empotrado" || ap.tipo === "guia") numM++
  }
  return { numFy, numM }
}

export function gradoIndeterminacion(apoyos: Apoyo[], rotulas: Rotula[], resortes: Resorte[]): number {
  const { numFy, numM } = contarActivos(apoyos)
  const r = numFy + numM + resortes.length
  return r - 2 - rotulas.length
}

// Rebaja el tipo de un apoyo segun que componentes queden activas (no redundantes).
export function tipoRebajado(tipoOriginal: TipoApoyo, tieneFy: boolean, tieneM: boolean): TipoApoyo {
  if (tipoOriginal === "libre") return "libre"
  if (tipoOriginal === "guia") return tieneM ? "guia" : "libre"
  if (tipoOriginal === "rodillo") return tieneFy ? "rodillo" : "libre"
  if (tipoOriginal === "articulado") return tieneFy ? "articulado" : "libre"
  // empotrado
  if (tieneFy && tieneM) return "empotrado"
  if (tieneFy) return "rodillo"
  if (tieneM) return "guia"
  return "libre"
}

function esRedundanteApoyo(redundantes: Redundante[], apoyoId: string, componente: ComponenteRedundante): boolean {
  return redundantes.some((r) => r.origen === "apoyo" && r.apoyoId === apoyoId && r.componente === componente)
}

// Integracion numerica (Simpson) del producto de dos funciones M(x) sobre [0,L].
export function integrarProducto(f: (x: number) => number, g: (x: number) => number, L: number, n = 2000): number {
  if (L <= 0) return 0
  const pasos = n % 2 === 0 ? n : n + 1
  const h = L / pasos
  let suma = f(0) * g(0) + f(L) * g(L)
  for (let i = 1; i < pasos; i++) {
    const x = i * h
    suma += (i % 2 === 0 ? 2 : 4) * f(x) * g(x)
  }
  return (suma * h) / 3
}

export function resolverPorFuerzas(
  L: number,
  apoyos: Apoyo[],
  cargas: Carga[],
  rotulas: Rotula[],
  resortes: Resorte[],
  redundantesSeleccionadas: RedundanteApoyo[],
  EI: number
): ResultadoFuerzas {
  const apoyosOrdenados = [...apoyos].sort((a, b) => a.x - b.x)
  const rotulasOrdenadas = [...rotulas].sort((a, b) => a.x - b.x)

  const n = gradoIndeterminacion(apoyosOrdenados, rotulasOrdenadas, resortes)
  const requeridasDelUsuario = n - resortes.length

  if (n < 0) {
    throw new Error(
      `La viga es inestable (mecanismo) antes de aplicar el método de fuerzas — grado de indeterminación = ${n}. Revisa los apoyos.`
    )
  }
  if (requeridasDelUsuario < 0) {
    throw new Error(
      `Hay más resortes (${resortes.length}) que grados de indeterminación (${n}). Quita algún resorte o agrega apoyos rígidos.`
    )
  }
  if (redundantesSeleccionadas.length !== requeridasDelUsuario) {
    throw new Error(
      `Grado de indeterminación = ${n} (${resortes.length} resorte(s) + ${requeridasDelUsuario} redundante(s) a elegir tú). Actualmente tienes marcadas ${redundantesSeleccionadas.length}. Marca exactamente ${requeridasDelUsuario} componente(s) de reacción como redundante.`
    )
  }

  // Lista completa de redundantes: las del usuario + una por cada resorte.
  const redundantes: Redundante[] = [
    ...redundantesSeleccionadas,
    ...resortes.map((r): RedundanteResorte => ({ origen: "resorte", resorteId: r.id })),
  ]

  // Construir la viga primaria: cada apoyo se "rebaja" segun sus componentes redundantes.
  const apoyosPrimaria: Apoyo[] = apoyosOrdenados.map((ap) => {
    const activo = contarActivos([ap])
    const tieneFyOriginal = activo.numFy > 0
    const tieneMOriginal = activo.numM > 0
    const tieneFy = tieneFyOriginal && !esRedundanteApoyo(redundantesSeleccionadas, ap.id, "Fy")
    const tieneM = tieneMOriginal && !esRedundanteApoyo(redundantesSeleccionadas, ap.id, "M")
    return { ...ap, tipo: tipoRebajado(ap.tipo, tieneFy, tieneM) }
  })
  // Los resortes NUNCA quedan en la primaria (siempre son redundantes).

  function resolverEstado(nombre: string, cargasEstado: Carga[]): EstadoFuerzas {
    const resultado = resolverViga(L, apoyosPrimaria, cargasEstado, rotulasOrdenadas)
    if (!resultado.estabilidad.esEstable || resultado.estabilidad.dsi !== 0) {
      throw new Error(
        `La viga primaria (tras liberar las redundantes elegidas) no quedó estáticamente determinada — revisa que hayas marcado las redundantes correctas. (${resultado.estabilidad.mensaje})`
      )
    }
    return {
      nombre,
      terminosM: resultado.terminosM,
      puntosCriticos: resultado.puntosCriticos,
      reacciones: resultado.reacciones,
    }
  }

  const estado0 = resolverEstado("0", cargas)

  const estadosUnitarios: EstadoFuerzas[] = redundantes.map((red, i) => {
    let cargaUnitaria: Carga
    if (red.origen === "apoyo") {
      const ap = apoyosOrdenados.find((a) => a.id === red.apoyoId)!
      cargaUnitaria =
        red.componente === "Fy"
          ? { id: `unit${i}`, tipo: "puntual", x: ap.x, P: -1 }
          : { id: `unit${i}`, tipo: "momento", x: ap.x, M: 1 }
    } else {
      const res = resortes.find((r) => r.id === red.resorteId)!
      cargaUnitaria =
        res.tipo === "vertical"
          ? { id: `unit${i}`, tipo: "puntual", x: res.x, P: -1 }
          : { id: `unit${i}`, tipo: "momento", x: res.x, M: 1 }
    }
    return resolverEstado(`X${i + 1}`, [cargaUnitaria])
  })

  function funcionM(terminos: Termino[]) {
    return (x: number) => evalTerminos(terminos, x)
  }

  const m0fn = funcionM(estado0.terminosM)
  const mifns = estadosUnitarios.map((e) => funcionM(e.terminosM))

  const matrizFlexibilidad: number[][] = redundantes.map((_, i) =>
    redundantes.map((_, j) => integrarProducto(mifns[i], mifns[j], L) / EI)
  )
  const vectorCarga: number[] = redundantes.map((_, i) => integrarProducto(m0fn, mifns[i], L) / EI)

  const vectorImpuesto: number[] = redundantes.map((red) => {
    if (red.origen === "apoyo") {
      const ap = apoyosOrdenados.find((a) => a.id === red.apoyoId)!
      return red.componente === "Fy" ? ap.asentamiento ?? 0 : ap.giroImpuesto ?? 0
    }
    return 0
  })

  // Resorte: se suma 1/k a su propia diagonal de flexibilidad.
  redundantes.forEach((red, i) => {
    if (red.origen === "resorte") {
      const res = resortes.find((r) => r.id === red.resorteId)!
      matrizFlexibilidad[i][i] += 1 / res.k
    }
  })

  // Sistema: Σ δij·Xj = Δi - δiL
  const bs = redundantes.map((_, i) => vectorImpuesto[i] - vectorCarga[i])
  const X = redundantes.length > 0 ? resolverSistemaLineal(matrizFlexibilidad, bs) : []

  // Superposicion de M(x): M0 + Σ Xi·mi
  const terminosM: Termino[] = [...estado0.terminosM]
  estadosUnitarios.forEach((e, i) => {
    e.terminosM.forEach((t) => terminosM.push({ ...t, coef: t.coef * X[i] }))
  })

  // Reacciones finales por superposicion.
  const reacciones: Record<string, { Fy?: number; M?: number }> = {}
  for (const ap of apoyosOrdenados) {
    const activo = contarActivos([ap])
    const out: { Fy?: number; M?: number } = {}
    if (activo.numFy > 0) {
      const idxRedundante = redundantes.findIndex((r) => r.origen === "apoyo" && r.apoyoId === ap.id && r.componente === "Fy")
      if (idxRedundante >= 0) {
        out.Fy = X[idxRedundante]
      } else {
        let valor = estado0.reacciones[ap.id]?.Fy ?? 0
        estadosUnitarios.forEach((e, i) => {
          valor += X[i] * (e.reacciones[ap.id]?.Fy ?? 0)
        })
        out.Fy = valor
      }
    }
    if (activo.numM > 0) {
      const idxRedundante = redundantes.findIndex((r) => r.origen === "apoyo" && r.apoyoId === ap.id && r.componente === "M")
      if (idxRedundante >= 0) {
        out.M = X[idxRedundante]
      } else {
        let valor = estado0.reacciones[ap.id]?.M ?? 0
        estadosUnitarios.forEach((e, i) => {
          valor += X[i] * (e.reacciones[ap.id]?.M ?? 0)
        })
        out.M = valor
      }
    }
    reacciones[ap.id] = out
  }
  // Fuerza en cada resorte = su propia redundante.
  resortes.forEach((res) => {
    const idx = redundantes.findIndex((r) => r.origen === "resorte" && r.resorteId === res.id)
    reacciones[res.id] = res.tipo === "vertical" ? { Fy: X[idx] } : { M: X[idx] }
  })

  const setPuntos = new Set<number>([0, L])
  apoyosOrdenados.forEach((a) => setPuntos.add(Number(a.x.toFixed(6))))
  rotulasOrdenadas.forEach((r) => setPuntos.add(Number(r.x.toFixed(6))))
  resortes.forEach((r) => setPuntos.add(Number(r.x.toFixed(6))))
  for (const c of cargas) {
    if (c.tipo === "puntual" || c.tipo === "momento") setPuntos.add(Number(c.x.toFixed(6)))
    if (c.tipo === "distribuida") {
      setPuntos.add(Number(c.xi.toFixed(6)))
      setPuntos.add(Number(c.xf.toFixed(6)))
    }
  }
  const puntosCriticos = Array.from(setPuntos).sort((a, b) => a - b)

  return {
    L,
    n,
    redundantes,
    estado0,
    estadosUnitarios,
    matrizFlexibilidad,
    vectorCarga,
    vectorImpuesto,
    X,
    terminosM,
    puntosCriticos,
    reacciones,
    EI,
  }
}

// ── Constantes de integracion para theta(x) y v(x) del resultado final ─────
// Una vez superpuesto M(x) (ya incluye TODAS las reacciones, redundantes y
// no redundantes), faltan las constantes C1, C2 y un salto dC1 por cada
// rotula (igual que en motor.ts). Como M(x) ya es el definitivo, esto se
// resuelve con un sistema chico (2 + numRotulas incognitas) usando las
// mismas condiciones de borde originales de la viga.
export interface ConstantesIntegracion {
  C1: number
  C2: number
  dC1PorRotula: Record<string, number>
  theta: (x: number) => number
  v: (x: number) => number
}

export function calcularConstantesIntegracion(
  L: number,
  apoyosOriginales: Apoyo[],
  rotulas: Rotula[],
  terminosM: Termino[],
  EI: number
): ConstantesIntegracion {
  const apoyosOrdenados = [...apoyosOriginales].sort((a, b) => a.x - b.x)
  const rotulasOrdenadas = [...rotulas].sort((a, b) => a.x - b.x)

  const terminosThetaEI = terminosM.map(integrarTermino)
  const terminosVEI = terminosThetaEI.map(integrarTermino)

  type Incog = { tipo: "C1" | "C2" | "dC1"; rotulaId?: string }
  const incognitas: Incog[] = [{ tipo: "C1" }, { tipo: "C2" }, ...rotulasOrdenadas.map((r) => ({ tipo: "dC1" as const, rotulaId: r.id }))]
  const nInc = incognitas.length

  function filaEnX(x: number, esTheta: boolean): number[] {
    return incognitas.map((inc) => {
      if (inc.tipo === "C1") return esTheta ? 1 : x
      if (inc.tipo === "C2") return esTheta ? 0 : 1
      const r = rotulasOrdenadas.find((rr) => rr.id === inc.rotulaId)!
      if (x < r.x) return 0
      return esTheta ? 1 : x - r.x
    })
  }

  const filas: number[][] = []
  const bs: number[] = []
  for (const ap of apoyosOrdenados) {
    const activo = ap.tipo === "rodillo" || ap.tipo === "articulado" || ap.tipo === "empotrado"
    if (activo) {
      filas.push(filaEnX(ap.x, false))
      bs.push((ap.asentamiento ?? 0) * EI - evalTerminos(terminosVEI, ap.x))
    }
    const activoM = ap.tipo === "empotrado" || ap.tipo === "guia"
    if (activoM) {
      filas.push(filaEnX(ap.x, true))
      bs.push((ap.giroImpuesto ?? 0) * EI - evalTerminos(terminosThetaEI, ap.x))
    }
    if (filas.length >= nInc) break
  }

  const filasFinal = filas.slice(0, nInc)
  const bsFinal = bs.slice(0, nInc)
  const solucion = filasFinal.length === nInc ? resolverSistemaLineal(filasFinal, bsFinal) : new Array(nInc).fill(0)

  let C1 = 0
  let C2 = 0
  const dC1PorRotula: Record<string, number> = {}
  incognitas.forEach((inc, i) => {
    if (inc.tipo === "C1") C1 = solucion[i]
    else if (inc.tipo === "C2") C2 = solucion[i]
    else if (inc.rotulaId) dC1PorRotula[inc.rotulaId] = solucion[i]
  })

  function theta(x: number): number {
    let acumulado = C1
    for (const r of rotulasOrdenadas) if (x >= r.x) acumulado += dC1PorRotula[r.id] ?? 0
    return (evalTerminos(terminosThetaEI, x) + acumulado) / EI
  }
  function v(x: number): number {
    let extra = C1 * x + C2
    for (const r of rotulasOrdenadas) if (x >= r.x) extra += (dC1PorRotula[r.id] ?? 0) * (x - r.x)
    return (evalTerminos(terminosVEI, x) + extra) / EI
  }

  return { C1, C2, dC1PorRotula, theta, v }
}