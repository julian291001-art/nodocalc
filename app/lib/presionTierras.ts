// app/lib/presionTierras.ts
// Motor de presión lateral de tierras — Rankine y Coulomb (caso general: talud β, trasdós
// inclinado θ, fricción muro-suelo δ) y presión en reposo K0, diferenciada por tipo de suelo.
//
// K0 — supuestos explícitos (confirmar si se prefiere otra referencia):
//  · Suelo FRICCIONANTE (arena, φ'>0, c≈0): Jaky — K0 = 1 − sin(φ'). No se aplica corrección
//    por OCR en este módulo (simplificación deliberada: para arena el efecto es secundario y
//    la fórmula de Mayne & Kulhawy requiere más parámetros de los que se piden aquí).
//  · Suelo COHESIVO (arcilla):
//      - Normalmente consolidada (OCR = 1): K0,NC = 0.19 + 0.233·log10(IP)  [Alpan, 1967; IP en %]
//      - Sobreconsolidada (OCR > 1): K0,OC = K0,NC · OCR^0.5  (aproximación usual para arcillas;
//        el exponente sin(φ') de Mayne & Kulhawy no aplica bien cuando φ'≈0)

export type EstadoEmpuje = "activo" | "pasivo" | "reposo"
export type TeoriaEmpuje = "rankine" | "coulomb"
export type TipoSueloK0 = "friccionante" | "cohesivo"

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

// ── Reposo — diferenciado por tipo de suelo (ver notas al inicio del archivo) ──
export function k0Reposo(tipoSuelo: TipoSueloK0, phiDeg: number, ip: number, ocr: number): number {
  if (tipoSuelo === "friccionante") {
    return 1 - Math.sin(phiDeg * D2R)
  }
  // cohesivo — Alpan (1967), IP en %; log10 no está definido para IP ≤ 0
  const ipSeguro = Math.max(1, ip)
  const k0nc = 0.19 + 0.233 * Math.log10(ipSeguro)
  const ocrSeguro = Math.max(1, ocr)
  return k0nc * Math.sqrt(ocrSeguro)
}

export function coeficiente(
  teoria: TeoriaEmpuje, estado: EstadoEmpuje,
  phiDeg: number, deltaDeg: number, betaDeg: number, thetaDeg: number,
  ocr: number, tipoSuelo: TipoSueloK0, ip: number
): number {
  if (estado === "reposo") return k0Reposo(tipoSuelo, phiDeg, ip, ocr)
  if (teoria === "rankine") return estado === "activo" ? kaRankine(phiDeg, betaDeg) : kpRankine(phiDeg, betaDeg)
  return estado === "activo" ? kaCoulomb(phiDeg, deltaDeg, betaDeg, thetaDeg) : kpCoulomb(phiDeg, deltaDeg, betaDeg, thetaDeg)
}

// ── Perfil de presión lateral por capa (φ, c, OCR, tipo de suelo, IP y β propios por capa) ──
export type CapaLateral = {
  zTop: number
  zBottom: number
  phi: number         // °
  c: number           // kPa (base interna, igual convención que esfuerzos-suelo)
  ocr: number
  betaLocal?: number  // °, si no se define usa el β global
  tipoSuelo: TipoSueloK0
  ip: number          // % — solo relevante si tipoSuelo = "cohesivo" y estado = "reposo"
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
    const K = coeficiente(teoria, estado, capa.phi, deltaGlobal, beta, thetaGlobal, capa.ocr, capa.tipoSuelo, capa.ip)
    let sigmaHEf = K * p.sigmaEf
    if (estado === "activo") sigmaHEf -= 2 * capa.c * Math.sqrt(Math.max(0, K))
    else if (estado === "pasivo") sigmaHEf += 2 * capa.c * Math.sqrt(Math.max(0, K))
    return { z: p.z, sigmaEf: p.sigmaEf, u: p.u, K, sigmaHEf, sigmaHTotal: sigmaHEf + p.u }
  })
}

// Resumen de K (un valor representativo por capa, evaluado en su propio φ/OCR/IP/β) —
// para la tarjeta de resultados "Coeficientes de empuje por capa".
export function resumenKPorCapa(
  capas: CapaLateral[], teoria: TeoriaEmpuje, estado: EstadoEmpuje,
  betaGlobal: number, deltaGlobal: number, thetaGlobal: number
): number[] {
  return capas.map(c => {
    const beta = c.betaLocal ?? betaGlobal
    return coeficiente(teoria, estado, c.phi, deltaGlobal, beta, thetaGlobal, c.ocr, c.tipoSuelo, c.ip)
  })
}

// Profundidad de la grieta de tracción (suelo cohesivo, estado activo): zc = 2c / (γ·√Ka)
export function profundidadGrieta(c: number, gamma: number, Ka: number): number {
  if (c <= 0 || gamma <= 0 || Ka <= 0) return 0
  return (2 * c) / (gamma * Math.sqrt(Ka))
}

// Resultante por integración trapezoidal (kN/m de muro). Se ignora la parte con σh < 0
// (grieta de tracción) en el cálculo de la fuerza — práctica estándar.
export function resultanteLateral(puntos: PuntoLateral[]): { E: number; zApp: number } {
  if (puntos.length < 2) return { E: 0, zApp: 0 }
  let E = 0, M = 0
  for (let i = 0; i < puntos.length - 1; i++) {
    const z1 = puntos[i].z, z2 = puntos[i + 1].z
    const v1 = Math.max(0, puntos[i].sigmaHTotal), v2 = Math.max(0, puntos[i + 1].sigmaHTotal)
    const dz = z2 - z1
    if (dz <= 0) continue
    const area = ((v1 + v2) / 2) * dz
    const zc = v1 + v2 === 0 ? (z1 + z2) / 2 : z1 + (dz * (v1 + 2 * v2)) / (3 * (v1 + v2))
    E += area
    M += area * zc
  }
  return { E, zApp: E > 0 ? M / E : 0 }
}