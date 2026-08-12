// app/lib/perfilGeostatico.ts
// Motor compartido del perfil geostático (σv, u, σ' vs profundidad) por estratos, con nivel
// freático y succión matricial opcional (modelo lineal simplificado: u varía de 0 en el NF a
// −γw·h en la altura h definida, y se asume u=0 por encima de esa altura).
//
// Extraído tal cual desde el useMemo `perfil` de Esfuerzos en el suelo (app/geotecnia/esfuerzos-suelo/page.tsx)
// para reutilizarlo en otros módulos (p. ej. Presión lateral de tierras) sin duplicar ni tener
// que revalidar la lógica de integración capa a capa. No se omitió ningún caso del original:
// breakpoints, selección de γ según el NF, y el punto doble en el límite superior de la succión.
//
// Lo que NO vive aquí (a propósito): la conversión de la estructura de "estrato" de cada módulo
// (con su propio modo directo/fases, φ, c, OCR, etc.) a la forma simple {zTop, zBottom, gammaArriba,
// gammaAbajo} que este motor necesita. Esa conversión es específica de la UI de cada página y debe
// quedarse en cada page.tsx — mezclarla aquí acoplaría el motor geotécnico puro a detalles de formulario.

export const GAMMA_W = 9.81 // kN/m³ — convención del proyecto (g = 9.81 m/s²)

export type CapaGeostatica = {
  zTop: number          // m (base)
  zBottom: number        // m (base)
  gammaArriba?: number   // kN/m³ — sobre el NF (o valor único si no hay NF)
  gammaAbajo?: number    // kN/m³ — bajo el NF (γsat)
}

export type PuntoGeostatico = { z: number; sigmaV: number; u: number; sigmaEf: number }

/**
 * Resuelve el perfil de esfuerzos verticales (σv), presión de poros (u) y esfuerzo
 * efectivo (σ' = σv − u) a lo largo de la profundidad, para una columna de capas.
 *
 * @param capas             Capas ordenadas de arriba hacia abajo, ya resueltas a γ en kN/m³.
 * @param nfDepth           Profundidad del nivel freático en m (base), o null si no hay NF.
 * @param succionActiva     Si se debe modelar succión matricial por encima del NF.
 * @param alturaSuccionBase Altura sobre el NF (m, base) hasta donde se modela la succión lineal.
 */
export function resolverPerfilGeostatico(
  capas: CapaGeostatica[],
  nfDepth: number | null,
  succionActiva: boolean,
  alturaSuccionBase: number
): PuntoGeostatico[] {
  if (capas.length === 0) return []
  const zMax = capas[capas.length - 1].zBottom
  if (!(zMax > 0)) return []

  // ── breakpoints: todos los puntos donde la pendiente del perfil puede cambiar ──
  const breakpoints = new Set<number>([0, zMax])
  for (const c of capas) {
    breakpoints.add(c.zTop)
    breakpoints.add(c.zBottom)
  }
  if (nfDepth !== null && nfDepth >= 0 && nfDepth <= zMax) breakpoints.add(nfDepth)

  // Límite superior de la zona de succión (si aplica)
  const zTopeSuccion = succionActiva && nfDepth !== null ? nfDepth - alturaSuccionBase : null
  if (zTopeSuccion !== null && zTopeSuccion >= 0 && zTopeSuccion <= zMax) {
    breakpoints.add(zTopeSuccion)
  }

  const zs = [...breakpoints]
    .filter(z => z >= 0 && z <= zMax + 1e-9)
    .sort((a, b) => a - b)

  // γ a usar en el punto medio de un tramo, según capa y posición respecto al NF
  const gammaEn = (zMid: number): number => {
    const capa =
      capas.find(c => zMid >= c.zTop - 1e-9 && zMid <= c.zBottom + 1e-9) ??
      capas[capas.length - 1]

    if (nfDepth === null) {
      return capa.gammaArriba ?? 0
    }

    return zMid <= nfDepth
      ? (capa.gammaArriba ?? 0)
      : (capa.gammaAbajo ?? 0)
  }

  // Presión de poros en un punto exacto z
  const uEn = (zVal: number): number => {
    if (nfDepth === null) return 0

    // Debajo del nivel freático
    if (zVal > nfDepth) {
      return GAMMA_W * (zVal - nfDepth)
    }

    // Exactamente en el nivel freático
    if (Math.abs(zVal - nfDepth) < 1e-9) {
      return 0
    }

    // Por encima del nivel freático
    const alturaSobreNF = nfDepth - zVal

    // Zona con succión
    if (
      succionActiva &&
      alturaSobreNF > 0 &&
      alturaSobreNF <= alturaSuccionBase + 1e-9
    ) {
      return -GAMMA_W * alturaSobreNF
    }

    // Zona seca sin succión
    return 0
  }

  let sigmaV = 0
  const puntos: PuntoGeostatico[] = []

  for (let i = 0; i < zs.length; i++) {
    if (i > 0) {
      const zA = zs[i - 1]
      const zB = zs[i]
      sigmaV += gammaEn((zA + zB) / 2) * (zB - zA)
    }

    const zVal = zs[i]

    // En el límite superior de la succión: punto doble (seco arriba, succión abajo)
    if (
      zTopeSuccion !== null &&
      Math.abs(zVal - zTopeSuccion) < 1e-9 &&
      alturaSuccionBase > 0
    ) {
      // Punto superior: suelo seco, u = 0
      puntos.push({ z: zVal, sigmaV, u: 0, sigmaEf: sigmaV })

      // Punto inferior: comienza la succión
      const uSuccion = -GAMMA_W * alturaSuccionBase
      puntos.push({ z: zVal, sigmaV, u: uSuccion, sigmaEf: sigmaV - uSuccion })

      continue
    }

    const u = uEn(zVal)
    puntos.push({ z: zVal, sigmaV, u, sigmaEf: sigmaV - u })
  }

  return puntos
}
