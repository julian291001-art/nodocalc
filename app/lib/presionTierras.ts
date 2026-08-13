// app/lib/presionTierras.ts
// Motor de presión lateral de tierras — Rankine y Coulomb (caso general: talud β, trasdós
// inclinado θ, fricción muro-suelo δ) y presión en reposo K0.
//
// K0 — Jaky / Mayne & Kulhawy (1982), unificado para cualquier tipo de suelo:
//   K0,NC = 1 − sin(φ')
//   K0,OC = K0,NC · OCR^sin(φ')
//
// VALIDEZ DE RANKINE/COULOMB — `validezRankine` / `validezCoulomb` detectan ángulos fuera
// del rango físicamente válido de cada teoría (denominador cercano a cero → K absurdo).
//
// GRIETA DE TRACCIÓN Y AGUA — CORRECCIÓN (ver hilo con Miguel): el suelo no transmite
// tracción, así que en la zona de grieta (σ'h efectivo < 0 por la cohesión) el aporte del
// suelo a la presión total debe ser CERO, no un valor negativo. El agua, en cambio, actúa
// con su presión hidrostática completa dentro de la grieta (la llena). Antes el código
// calculaba `sigmaHTotal = sigmaHEf + u` sin truncar primero la parte del suelo, así que
// una σ'h muy negativa "restaba" presión de agua real en vez de anularse — subestimando la
// resultante total exactamente en la franja donde el agua ya pesa más. Ahora se trunca
// PRIMERO la parte del suelo (`Math.max(0, sigmaHEf)`) y luego se suma el agua completa.
//
// CRUCE POR CERO DENTRO DE UNA CAPA — cuando σ'h efectivo pasa de negativo a positivo
// dentro de una misma capa (grieta que termina a mitad de capa, como en el ejemplo: arranca
// en −13.6 kPa y termina en +12.4 kPa), truncar solo los dos extremos de un trapecio y
// mantener el mismo ancho sobrestima el área real (calcula el trapecio completo en vez del
// triángulo desde el cruce real hasta el final). Ahora se inserta el punto exacto donde
// σ'h = 0 (interpolación lineal — exacta, porque σ'v ya es lineal entre dos quiebres
// consecutivos) para que la integración por tramos nunca cruce cero dentro de un mismo
// segmento.
//
// PERFIL POR CAPAS — cada capa genera sus propios puntos (techo, base, cualquier quiebre
// geostático interno como el NF, y ahora también el cruce por cero si aplica) evaluados
// solo con su propio K/c, así que en cada frontera entre capas quedan automáticamente DOS
// puntos con el mismo z y el mismo σ'v pero distinto σ'h — uno "desde arriba" y otro "desde
// abajo" — en vez de una rampa interpolada entre valores de capas distintas.

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

// Corrección de cohesión (Bell) sobre σ'h — constante dentro de una misma capa, ya que K y c
// no cambian con la profundidad dentro de ella.
function offsetCohesion(estado: EstadoEmpuje, c: number, K: number): number {
  if (estado === "activo") return -2 * c * Math.sqrt(Math.max(0, K))
  if (estado === "pasivo") return 2 * c * Math.sqrt(Math.max(0, K))
  return 0
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
  capaId: string        // de qué capa viene el K/c usado en este punto
  sigmaEf: number
  u: number
  K: number
  sigmaHEf: number       // efectivo SIN truncar — puede ser negativo (grieta de tracción);
                          // se conserva así para graficar la línea real de σ'h
  sigmaHTotal: number     // max(0, σ'h) + u — el suelo no transmite tracción, el agua sí
                          // actúa completa dentro de la grieta
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
    const offset = offsetCohesion(estado, capa.c, K)

    // z's propios de esta capa: su techo, su base, y cualquier quiebre geostático interno
    // (p. ej. el nivel freático si cae dentro de la capa).
    const zsCapa = new Set<number>([capa.zTop, capa.zBottom])
    for (const p of puntosGeostaticos) {
      if (p.z > capa.zTop + 1e-9 && p.z < capa.zBottom - 1e-9) zsCapa.add(p.z)
    }
    const zsOrdenados = Array.from(zsCapa).sort((a, b) => a - b)

    // valores base en cada quiebre (sin insertar aún el cruce por cero)
    const base = zsOrdenados.map(z => {
      const { sigmaEf, u } = interpolarGeostatico(puntosGeostaticos, z)
      return { z, sigmaEf, u, sigmaHEf: K * sigmaEf + offset }
    })

    // inserta el punto EXACTO donde σ'h cruza cero, en cualquier tramo donde cambie de
    // signo — así ningún segmento posterior mezcla parte de tracción con parte de
    // compresión, y la integración por trapecios (que trunca en los extremos) queda exacta.
    const conCruce: typeof base = []
    for (let i = 0; i < base.length; i++) {
      conCruce.push(base[i])
      if (i < base.length - 1) {
        const a = base[i], b = base[i + 1]
        if ((a.sigmaHEf < 0 && b.sigmaHEf > 0) || (a.sigmaHEf > 0 && b.sigmaHEf < 0)) {
          const t = -a.sigmaHEf / (b.sigmaHEf - a.sigmaHEf)
          const z0 = a.z + t * (b.z - a.z)
          const { sigmaEf: sigmaEf0, u: u0 } = interpolarGeostatico(puntosGeostaticos, z0)
          conCruce.push({ z: z0, sigmaEf: sigmaEf0, u: u0, sigmaHEf: 0 })
        }
      }
    }

    for (const pt of conCruce) {
      resultado.push({
        z: pt.z,
        capaId: capa.id,
        sigmaEf: pt.sigmaEf,
        u: pt.u,
        K,
        sigmaHEf: pt.sigmaHEf,
        sigmaHTotal: Math.max(0, pt.sigmaHEf) + pt.u,
      })
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
// (por seguridad — con el cruce por cero ya insertado en resolverPerfilLateral, ningún
// segmento debería cruzar cero internamente, así que este truncado en los extremos ya no
// es una aproximación sino el valor exacto). Los pares con dz=0 —que aparecen a propósito
// en cada frontera de capa, como el punto "desde arriba" y "desde abajo"— no aportan área,
// que es el comportamiento físico correcto para una discontinuidad puntual.
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

// ── Resultantes desglosadas: una por cada capa de suelo (solo presión efectiva, ya
//    truncada en sigmaHTotal/sigmaHEf según corresponda) + una para el agua (presión de
//    poros, en todo el perfil) + el total. Pensado para dibujar los triángulos/trapecios
//    por separado en el esquema del muro. ──
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

  // El total se calcula con la integración directa sobre σh total (ya con el suelo
  // truncado a 0 dentro de la grieta y el agua completa — ver notas al inicio del
  // archivo), que ahora SÍ coincide con la suma de las partes (porCapa + agua), salvo
  // redondeo, porque ambas usan el mismo criterio de truncado por separado.
  const total = resultanteLateral(puntos)

  return { porCapa, agua, total }
}