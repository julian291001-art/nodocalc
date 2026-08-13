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
// VALIDEZ DE RANKINE/COULOMB — el motor advierte cuando los ángulos de entrada salen del
// rango físicamente válido de cada teoría, lo que podía producir denominadores cercanos a
// cero y coeficientes K absurdamente grandes (o negativos). `validezRankine` /
// `validezCoulomb` detectan esas condiciones para que la UI pueda avisar en vez de
// graficar un resultado sin sentido.
//
// PERFIL POR CAPAS — antes `resolverPerfilLateral` recorría los puntos geostáticos ya
// aplanados y le asignaba a cada uno UNA sola capa (la primera que hiciera match por
// rango de z), incluso justo en la frontera entre dos capas. Ahí un mismo z cumple la
// condición para ambas capas, y `Array.find` siempre se quedaba con la de arriba — así
// que el primer tramo de la capa inferior arrancaba calculado con las propiedades de la
// capa superior en vez de las suyas, en lugar de tener el salto vertical real que exige
// la física (mismo σ'v, distinto K/c a cada lado). Esto subestimaba el área bajo la curva
// (la resultante) y, en pasivo, podía producir σ'h con signo incorrecto cerca de esa
// frontera. Ahora se recorre capa por capa: cada capa genera sus propios puntos (techo,
// base y cualquier quiebre geostático interno como el NF) evaluados solo con su propio
// K/c, así que en cada frontera quedan automáticamente DOS puntos con el mismo z y el
// mismo σ'v pero distinto σ'h — uno "desde arriba" y otro "desde abajo" — en vez de una
// rampa interpolada entre valores de capas distintas.

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
  id: string          // necesario para poder distinguir, en una frontera, a qué capa
                       // pertenece cada uno de los dos puntos que se generan ahí
  zTop: number
  zBottom: number
  phi: number          // °
  c: number            // kPa (base interna, igual convención que esfuerzos-suelo)
  ocr: number
  betaLocal?: number   // °, si no se define usa el β global
}

export type PuntoLateral = {
  z: number
  capaId: string        // de qué capa viene el K/c usado en este punto — clave para poder
                         // desglosar y dibujar los polígonos de presión sin ambigüedad en
                         // las fronteras entre capas
  sigmaEf: number
  u: number
  K: number
  sigmaHEf: number       // efectivo — puede ser negativo (grieta de tracción en suelo cohesivo)
  sigmaHTotal: number    // σ'h + u
}

// Interpola σ'v y u del perfil geostático en cualquier z (los puntos geostáticos ya son
// lineales a trozos, así que una interpolación lineal simple es exacta).
function interpolarGeostatico(
  pts: { z: number; sigmaEf: number; u: number }[], z: number
): { sigmaEf: number; u: number } {
  if (pts.length === 0) return { sigmaEf: 0, u: 0 }
  if (z <= pts[0].z) return { sigmaEf: pts[0].sigmaEf, u: pts[0].u }
  const ultimo = pts[pts.length - 1]
  if (z >= ultimo.z) return { sigmaEf: ultimo.sigmaEf, u: ultimo.u }
  for (let i = 0; i < pts.length - 1; i++) {
    if (z >= pts[i].z && z <= pts[i + 1].z) {
      const t = (z - pts[i].z) / (pts[i + 1].z - pts[i].z || 1)
      return {
        sigmaEf: pts[i].sigmaEf + t * (pts[i + 1].sigmaEf - pts[i].sigmaEf),
        u: pts[i].u + t * (pts[i + 1].u - pts[i].u),
      }
    }
  }
  return { sigmaEf: ultimo.sigmaEf, u: ultimo.u }
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
  if (capas.length === 0 || puntosGeostaticos.length === 0) return []
  const resultado: PuntoLateral[] = []

  for (const capa of capas) {
    const beta = capa.betaLocal ?? betaGlobal
    const K = coeficiente(teoria, estado, capa.phi, deltaGlobal, beta, thetaGlobal, capa.ocr)

    // z's propios de esta capa: su techo, su base, y cualquier quiebre geostático interno
    // (p. ej. el nivel freático si cae dentro de la capa).
    const zsCapa = new Set<number>([capa.zTop, capa.zBottom])
    for (const p of puntosGeostaticos) {
      if (p.z > capa.zTop + 1e-9 && p.z < capa.zBottom - 1e-9) zsCapa.add(p.z)
    }

    for (const z of Array.from(zsCapa).sort((a, b) => a - b)) {
      const { sigmaEf, u } = interpolarGeostatico(puntosGeostaticos, z)
      let sigmaHEf = K * sigmaEf
      if (estado === "activo") sigmaHEf -= 2 * capa.c * Math.sqrt(Math.max(0, K))
      else if (estado === "pasivo") sigmaHEf += 2 * capa.c * Math.sqrt(Math.max(0, K))
      resultado.push({ z, capaId: capa.id, sigmaEf, u, K, sigmaHEf, sigmaHTotal: sigmaHEf + u })
    }
  }
  return resultado
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

// Integra un perfil {z, v} ya acotado a la zona que corresponde (una capa completa, el
// agua en todo el dominio, o el perfil entero para el total). v se trunca a 0 hacia abajo
// (se ignora la parte negativa: grieta de tracción / succión). Los pares con dz=0 —que
// ahora aparecen a propósito en cada frontera de capa, como el punto "desde arriba" y
// "desde abajo"— no aportan área, que es justo el comportamiento físico correcto para una
// discontinuidad puntual (un salto vertical no encierra área).
function integrarPerfil(puntos: { z: number; v: number }[]): { E: number; zApp: number } {
  const sub = [...puntos].sort((a, b) => a.z - b.z)
  if (sub.length < 2) return { E: 0, zApp: sub[0]?.z ?? 0 }
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
  return { E, zApp: E > 0 ? M / E : (sub[0].z + sub[sub.length - 1].z) / 2 }
}

// Resultante total (kN/m de muro), integrando σh total sobre TODO el perfil (todas las
// capas concatenadas, incluidos los pares duplicados de cada frontera).
export function resultanteLateral(puntos: PuntoLateral[]): { E: number; zApp: number } {
  return integrarPerfil(puntos.map(p => ({ z: p.z, v: p.sigmaHTotal })))
}

// ── Resultantes desglosadas: una por cada capa de suelo (solo presión efectiva) +
//    una para el agua (presión de poros, en todo el perfil) + el total. Pensado para
//    dibujar los triángulos/trapecios por separado en el esquema del muro.
//
//    Antes se filtraba por rango de z sobre la lista de puntos ya aplanada, lo que en una
//    frontera mezclaba dentro del mismo trapecio el punto "desde arriba" de una capa y el
//    "desde abajo" de la siguiente (dos K distintos conviviendo en un mismo polígono).
//    Ahora se filtra por capaId, así cada polígono usa exclusivamente los puntos que le
//    pertenecen — sin ambigüedad y sin subestimar el área. ──
export type TramoResultante = { id: string; nombre: string; zTop: number; zBottom: number }
export type ResultanteDesglosada = { id: string; nombre: string; E: number; zApp: number }

export function resultantesDesglosadas(
  puntos: PuntoLateral[],
  tramos: TramoResultante[]
): { porCapa: ResultanteDesglosada[]; agua: { E: number; zApp: number }; total: { E: number; zApp: number } } {
  const porCapa: ResultanteDesglosada[] = tramos.map(t => {
    const pts = puntos.filter(p => p.capaId === t.id).map(p => ({ z: p.z, v: p.sigmaHEf }))
    const r = integrarPerfil(pts)
    return { id: t.id, nombre: t.nombre, E: r.E, zApp: r.zApp }
  })

  // u(z) es continua entre capas (no depende de φ'/c'), así que basta con un valor por z
  // — se colapsan los duplicados que aparecen en cada frontera de capa.
  const vistos = new Map<number, number>()
  for (const p of puntos) if (!vistos.has(p.z)) vistos.set(p.z, p.u)
  const aguaPts = Array.from(vistos.entries()).map(([z, v]) => ({ z, v }))
  const agua = integrarPerfil(aguaPts)

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