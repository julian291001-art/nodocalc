// app/lib/presionTierras.ts
// Motor de presión lateral de tierras — Rankine y Coulomb (caso general: talud β, trasdós
// inclinado θ, fricción muro-suelo δ) y presión en reposo K0.
//
// K0 — Jaky / Mayne & Kulhawy (1982), unificado para cualquier tipo de suelo:
//   K0,NC = 1 − sin(φ')
//   K0,OC = K0,NC · OCR^sin(φ')
// Se reemplazó la fórmula anterior (Alpan 1967 basada en IP, con √OCR) porque esa
// dependía del índice de plasticidad y de una corrección por OCR distinta para suelos
// cohesivos; Mayne–Kulhawy es la referencia estándar más usada y solo necesita φ' y OCR,
// aplicable tanto a friccionantes como a cohesivos.
//
// VALIDEZ DE RANKINE/COULOMB — antes el motor no advertía cuando los ángulos de entrada
// salían del rango físicamente válido de cada teoría, lo que podía producir denominadores
// cercanos a cero y coeficientes K absurdamente grandes (o negativos). Ahora
// `validezRankine` / `validezCoulomb` detectan esas condiciones para que la UI pueda avisar
// en vez de graficar un resultado sin sentido.

export type EstadoEmpuje = "activo" | "pasivo" | "reposo"
export type TeoriaEmpuje = "rankine" | "coulomb"
export type TipoSueloK0 = "friccionante" | "cohesivo" // se conserva el tipo por compatibilidad de UI, pero ya no cambia la fórmula de K0

const D2R = Math.PI / 180

// ── Rankine (talud inclinado β, muro vertical y liso) ──
export function kaRankine(phiDeg: number, betaDeg: number): number {
  const phi = phiDeg * D2R, beta = betaDeg * D2R
  const cb = Math.cos(beta), cphi2 = Math.cos(phi) ** 2
  const raiz = Math.sqrt(Math.max(0, cb * cb - cphi2))
  return cb * (cb - raiz) / (cb + raiz || 1e-9)
}
export function kpRankine(phiDeg: number, betaDeg: number): number {
  const phi = phiDeg * D2R, beta = betaDeg * D2R
  const cb = Math.cos(beta), cphi2 = Math.cos(phi) ** 2
  const raiz = Math.sqrt(Math.max(0, cb * cb - cphi2))
  return cb * (cb + raiz) / (cb - raiz || 1e-9)
}

// ── Coulomb (trasdós con inclinación θ respecto a la vertical, fricción muro-suelo δ,
//    talud β; todos en grados). θ > 0 = trasdós se abre hacia atrás (batter típico). ──
export function kaCoulomb(phiDeg: number, deltaDeg: number, betaDeg: number, thetaDeg: number): number {
  const phi = phiDeg * D2R, delta = deltaDeg * D2R, beta = betaDeg * D2R, theta = thetaDeg * D2R
  const num = Math.cos(phi - theta) ** 2
  const denBase = Math.cos(theta) ** 2 * Math.cos(theta + delta)
  const inner = Math.sqrt(Math.max(0,
    (Math.sin(phi + delta) * Math.sin(phi - beta)) / (Math.cos(theta + delta) * Math.cos(theta - beta))
  ))
  return num / (denBase * (1 + inner) ** 2)
}
export function kpCoulomb(phiDeg: number, deltaDeg: number, betaDeg: number, thetaDeg: number): number {
  const phi = phiDeg * D2R, delta = deltaDeg * D2R, beta = betaDeg * D2R, theta = thetaDeg * D2R
  const num = Math.cos(phi + theta) ** 2
  const denBase = Math.cos(theta) ** 2 * Math.cos(theta - delta)
  const inner = Math.sqrt(Math.max(0,
    (Math.sin(phi + delta) * Math.sin(phi + beta)) / (Math.cos(theta - delta) * Math.cos(theta - beta))
  ))
  return num / (denBase * (1 - inner) ** 2)
}

// ── Reposo — Jaky / Mayne & Kulhawy, unificado (ver nota al inicio del archivo) ──
export function k0Reposo(phiDeg: number, ocr: number): number {
  const sinPhi = Math.sin(Math.max(0, phiDeg) * D2R)
  const k0nc = 1 - sinPhi
  const ocrSeguro = Math.max(1, ocr)
  if (ocrSeguro <= 1) return k0nc
  return k0nc * Math.pow(ocrSeguro, sinPhi)
}

export function coeficiente(
  teoria: TeoriaEmpuje, estado: EstadoEmpuje,
  phiDeg: number, deltaDeg: number, betaDeg: number, thetaDeg: number,
  ocr: number
): number {
  if (estado === "reposo") return k0Reposo(phiDeg, ocr)
  if (teoria === "rankine") return estado === "activo" ? kaRankine(phiDeg, betaDeg) : kpRankine(phiDeg, betaDeg)
  return estado === "activo" ? kaCoulomb(phiDeg, deltaDeg, betaDeg, thetaDeg) : kpCoulomb(phiDeg, deltaDeg, betaDeg, thetaDeg)
}

// ── Validaciones de rango — para advertir en la UI antes de graficar un K sin sentido ──
export type Validez = { valido: boolean; mensaje?: string }

export function validezRankine(phiDeg: number, betaDeg: number): Validez {
  if (Math.abs(betaDeg) >= phiDeg) {
    return {
      valido: false,
      mensaje: `β (${betaDeg}°) debe ser menor que φ' (${phiDeg}°). Rankine no es válido cuando el talud es igual o más inclinado que el ángulo de fricción interna.`,
    }
  }
  return { valido: true }
}

export function validezCoulomb(phiDeg: number, deltaDeg: number, betaDeg: number, thetaDeg: number, estado: EstadoEmpuje): Validez {
  const margen = 89.5
  if (estado === "activo" && Math.abs(thetaDeg + deltaDeg) >= margen) {
    return {
      valido: false,
      mensaje: `θ + δ (${(thetaDeg + deltaDeg).toFixed(1)}°) está demasiado cerca de 90°. El denominador de Ka se anula y el coeficiente diverge — reduce θ o δ.`,
    }
  }
  if (estado === "pasivo" && Math.abs(thetaDeg - deltaDeg) >= margen) {
    return {
      valido: false,
      mensaje: `θ − δ (${(thetaDeg - deltaDeg).toFixed(1)}°) está demasiado cerca de 90°. El denominador de Kp se anula y el coeficiente diverge — reduce θ o δ.`,
    }
  }
  if (Math.abs(betaDeg) >= phiDeg) {
    return {
      valido: false,
      mensaje: `β (${betaDeg}°) debe ser menor que φ' (${phiDeg}°).`,
    }
  }
  return { valido: true }
}

export function validezCoeficiente(
  teoria: TeoriaEmpuje, estado: EstadoEmpuje,
  phiDeg: number, deltaDeg: number, betaDeg: number, thetaDeg: number
): Validez {
  if (estado === "reposo") return { valido: true }
  if (teoria === "rankine") return validezRankine(phiDeg, betaDeg)
  return validezCoulomb(phiDeg, deltaDeg, betaDeg, thetaDeg, estado)
}

// ── Perfil de presión lateral por capa (φ, c, OCR y β propios por capa) ──
export type CapaLateral = {
  zTop: number
  zBottom: number
  phi: number         // °
  c: number           // kPa (base interna, igual convención que esfuerzos-suelo)
  ocr: number
  betaLocal?: number  // °, si no se define usa el β global
}

export type PuntoLateral = {
  z: number
  sigmaEf: number
  u: number
  K: number
  sigmaHEf: number     // efectivo — puede ser negativo (grieta de tracción en suelo cohesivo)
  sigmaHTotal: number  // σ'h + u
}

export function resolverPerfilLateral(
  puntosGeostaticos: { z: number; sigmaEf: number; u: number }[],
  capas: CapaLateral[],
  teoria: TeoriaEmpuje,
  estado: EstadoEmpuje,
  betaGlobal: number,
  deltaGlobal: number,
  thetaGlobal: number
): PuntoLateral[] {
  if (capas.length === 0) return []
  return puntosGeostaticos.map(p => {
    const capa = capas.find(c => p.z >= c.zTop - 1e-9 && p.z <= c.zBottom + 1e-9) ?? capas[capas.length - 1]
    const beta = capa.betaLocal ?? betaGlobal
    const K = coeficiente(teoria, estado, capa.phi, deltaGlobal, beta, thetaGlobal, capa.ocr)
    let sigmaHEf = K * p.sigmaEf
    if (estado === "activo") sigmaHEf -= 2 * capa.c * Math.sqrt(Math.max(0, K))
    else if (estado === "pasivo") sigmaHEf += 2 * capa.c * Math.sqrt(Math.max(0, K))
    return { z: p.z, sigmaEf: p.sigmaEf, u: p.u, K, sigmaHEf, sigmaHTotal: sigmaHEf + p.u }
  })
}

// Resumen de K (un valor representativo por capa, evaluado en su propio φ/OCR/β) —
// para la tarjeta de resultados "Coeficientes de empuje por capa".
export function resumenKPorCapa(
  capas: CapaLateral[], teoria: TeoriaEmpuje, estado: EstadoEmpuje,
  betaGlobal: number, deltaGlobal: number, thetaGlobal: number
): number[] {
  return capas.map(c => {
    const beta = c.betaLocal ?? betaGlobal
    return coeficiente(teoria, estado, c.phi, deltaGlobal, beta, thetaGlobal, c.ocr)
  })
}

// Profundidad de la grieta de tracción (suelo cohesivo, estado activo): zc = 2c / (γ·√Ka)
export function profundidadGrieta(c: number, gamma: number, Ka: number): number {
  if (c <= 0 || gamma <= 0 || Ka <= 0) return 0
  return (2 * c) / (gamma * Math.sqrt(Ka))
}

// Integración trapezoidal genérica de un perfil {z, v} entre [zTop, zBottom], con v
// truncado a 0 por debajo (se ignora la parte negativa: grieta de tracción / succión).
function integrarTramo(puntos: { z: number; v: number }[], zTop: number, zBottom: number): { E: number; zApp: number } {
  const sub = puntos.filter(p => p.z >= zTop - 1e-9 && p.z <= zBottom + 1e-9).sort((a, b) => a.z - b.z)
  if (sub.length < 2) return { E: 0, zApp: (zTop + zBottom) / 2 }
  let E = 0, M = 0
  for (let i = 0; i < sub.length - 1; i++) {
    const z1 = sub[i].z, z2 = sub[i + 1].z
    const v1 = Math.max(0, sub[i].v), v2 = Math.max(0, sub[i + 1].v)
    const dz = z2 - z1
    if (dz <= 0) continue
    const area = ((v1 + v2) / 2) * dz
    const zc = v1 + v2 === 0 ? (z1 + z2) / 2 : z1 + (dz * (v1 + 2 * v2)) / (3 * (v1 + v2))
    E += area
    M += area * zc
  }
  return { E, zApp: E > 0 ? M / E : (zTop + zBottom) / 2 }
}

// Resultante total por integración trapezoidal (kN/m de muro). Se ignora la parte con
// σh < 0 (grieta de tracción) en el cálculo de la fuerza — práctica estándar.
export function resultanteLateral(puntos: PuntoLateral[]): { E: number; zApp: number } {
  return integrarTramo(puntos.map(p => ({ z: p.z, v: p.sigmaHTotal })), 0, puntos.length ? puntos[puntos.length - 1].z : 0)
}

// ── Resultantes desglosadas: una por cada capa de suelo (solo presión efectiva) +
//    una para el agua (presión de poros, en todo el perfil) + el total. Pensado para
//    dibujar los triángulos/trapecios por separado en el esquema del muro. ──
export type TramoResultante = { id: string; nombre: string; zTop: number; zBottom: number }
export type ResultanteDesglosada = { id: string; nombre: string; E: number; zApp: number }

export function resultantesDesglosadas(
  puntos: PuntoLateral[],
  tramos: TramoResultante[]
): { porCapa: ResultanteDesglosada[]; agua: { E: number; zApp: number }; total: { E: number; zApp: number } } {
  const zMax = puntos.length ? puntos[puntos.length - 1].z : 0

  const porCapa: ResultanteDesglosada[] = tramos.map(t => {
    const r = integrarTramo(puntos.map(p => ({ z: p.z, v: p.sigmaHEf })), t.zTop, t.zBottom)
    return { id: t.id, nombre: t.nombre, E: r.E, zApp: r.zApp }
  })

  const agua = integrarTramo(puntos.map(p => ({ z: p.z, v: p.u })), 0, zMax)

  // El total SIEMPRE se calcula con la integración directa sobre σh total (la misma que
  // resultanteLateral), no sumando las partes: si una capa cohesiva tiene grieta de
  // tracción (σ'h < 0) justo donde también hay presión de poros positiva, truncar cada
  // componente por separado en 0 y luego sumar puede diferir ligeramente de truncar la
  // suma combinada — que es el criterio físico correcto. Las partes (porCapa, agua) son
  // el desglose ilustrativo para el esquema; en el caso general (sin ese solape) coinciden
  // exactamente con el total.
  const total = resultanteLateral(puntos)

  return { porCapa, agua, total }
}