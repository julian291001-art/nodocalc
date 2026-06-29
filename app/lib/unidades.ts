import type { ConfigUnidades } from "../store/useUnidadesStore"

// ── Factores de conversión a unidades base (SI puro) ──────────────────────
// Base: m, N, Pa, kg, °C, rad

export const factorLongitud: Record<string, number> = {
  mm: 0.001, cm: 0.01, m: 1, "in": 0.0254, ft: 0.3048,
}
export const factorFuerza: Record<string, number> = {
  N: 1, kN: 1000, kgf: 9.80665, tf: 9806.65, lbf: 4.44822, kip: 4448.22,
}
export const factorMomento: Record<string, number> = {
  "N·m": 1, "kN·m": 1000, "kgf·m": 9.80665, "tf·m": 9806.65,
  "lbf·ft": 1.35582, "kip·ft": 1355.82,
}
export const factorEsfuerzo: Record<string, number> = {
  Pa: 1, kPa: 1000, MPa: 1e6, "kgf/cm²": 98066.5, "tf/m²": 9806.65, psi: 6894.76, ksi: 6894757,
}
export const factorDesplazamiento: Record<string, number> = {
  mm: 0.001, cm: 0.01, m: 1, "in": 0.0254,
}
export const factorTemperatura = {
  toBase: (v: number, u: string) => u === "°C" ? v : u === "°F" ? (v - 32) * 5 / 9 : v - 273.15,
  fromBase: (v: number, u: string) => u === "°C" ? v : u === "°F" ? v * 9 / 5 + 32 : v + 273.15,
}

// Conversión genérica: valor en unidad origen → valor en unidad destino
export function convertir(valor: number, desde: string, hacia: string, tipo: "longitud" | "fuerza" | "momento" | "esfuerzo" | "desplazamiento"): number {
  const tablas = { longitud: factorLongitud, fuerza: factorFuerza, momento: factorMomento, esfuerzo: factorEsfuerzo, desplazamiento: factorDesplazamiento }
  const tabla = tablas[tipo]
  const base = valor * (tabla[desde] ?? 1)
  return base / (tabla[hacia] ?? 1)
}

// ── Formateo con unidades ──────────────────────────────────────────────────
export function fmtVal(n: number, dec = 4): string {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(2)
  return n.toFixed(dec)
}

export function fmtLong(n: number, cfg: ConfigUnidades, dec = 4) {
  return `${fmtVal(n, dec)} ${cfg.longitud}`
}
export function fmtSeccion(n: number, cfg: ConfigUnidades, dec = 4) {
  return `${fmtVal(n, dec)} ${cfg.seccion}`
}
export function fmtInercia(n: number, cfg: ConfigUnidades, dec = 4) {
  return `${fmtVal(n, dec)} ${cfg.inercia}`
}
export function fmtModulo(n: number, cfg: ConfigUnidades, dec = 4) {
  return `${fmtVal(n, dec)} ${cfg.modulo_resistente}`
}
export function fmtFuerza(n: number, cfg: ConfigUnidades, dec = 4) {
  return `${fmtVal(n, dec)} ${cfg.fuerza}`
}
export function fmtMomento(n: number, cfg: ConfigUnidades, dec = 4) {
  return `${fmtVal(n, dec)} ${cfg.momento}`
}
export function fmtEsfuerzo(n: number, cfg: ConfigUnidades, dec = 4) {
  return `${fmtVal(n, dec)} ${cfg.esfuerzo}`
}
export function fmtDesp(n: number, cfg: ConfigUnidades, dec = 4) {
  return `${fmtVal(n, dec)} ${cfg.desplazamiento}`
}
export function fmtGiro(n: number, cfg: ConfigUnidades, dec = 6) {
  return `${fmtVal(n, dec)} ${cfg.giro}`
}
export function fmtTemp(n: number, cfg: ConfigUnidades, dec = 2) {
  return `${fmtVal(n, dec)} ${cfg.temperatura}`
}
export function fmtResorte(n: number, cfg: ConfigUnidades, dec = 4) {
  return `${fmtVal(n, dec)} ${cfg.resorte_lineal}`
}
export function fmtResorteRot(n: number, cfg: ConfigUnidades, dec = 4) {
  return `${fmtVal(n, dec)} ${cfg.resorte_rotacional}`
}

// Etiquetas cortas para inputs
export function labelLong(cfg: ConfigUnidades) { return cfg.longitud }
export function labelSeccion(cfg: ConfigUnidades) { return cfg.seccion }
export function labelInercia(cfg: ConfigUnidades) { return cfg.inercia }
export function labelModulo(cfg: ConfigUnidades) { return cfg.modulo_resistente }
export function labelFuerza(cfg: ConfigUnidades) { return cfg.fuerza }
export function labelMomento(cfg: ConfigUnidades) { return cfg.momento }
export function labelEsfuerzo(cfg: ConfigUnidades) { return cfg.esfuerzo }
export function labelDesp(cfg: ConfigUnidades) { return cfg.desplazamiento }
export function labelGiro(cfg: ConfigUnidades) { return cfg.giro }