export const conversiones: Record<string, { unidades: string[]; factores: number[] }> = {
  "Fuerza": {
    unidades: ["N", "kN", "MN", "kgf", "tf", "lbf", "kip"],
    factores: [1, 1e3, 1e6, 9.80665, 9806.65, 4.44822, 4448.22]
  },
  "Longitud": {
    unidades: ["mm", "cm", "m", "km", "in", "ft", "yd"],
    factores: [0.001, 0.01, 1, 1000, 0.0254, 0.3048, 0.9144]
  },
  "Presión / Esfuerzo": {
    unidades: ["Pa", "kPa", "MPa", "GPa", "kgf/cm²", "tf/m²", "psi", "ksi"],
    factores: [1, 1e3, 1e6, 1e9, 98066.5, 9806.65, 6894.76, 6894760]
  },
  "Momento": {
    unidades: ["N·m", "kN·m", "MN·m", "kgf·m", "tf·m", "lbf·ft", "kip·ft"],
    factores: [1, 1e3, 1e6, 9.80665, 9806.65, 1.35582, 1355.82]
  },
  "Masa": {
    unidades: ["g", "kg", "ton", "lb", "slug"],
    factores: [0.001, 1, 1000, 0.453592, 14.5939]
  },
  "Área": {
    unidades: ["mm²", "cm²", "m²", "in²", "ft²"],
    factores: [1e-6, 1e-4, 1, 0.00064516, 0.092903]
  },
  // NUEVO — requerido por el módulo de Relaciones de Fase (volúmenes de suelo, agua, aire)
  "Volumen": {
    unidades: ["cm³", "m³", "L", "ft³", "in³", "gal (US)"],
    factores: [1e-6, 1, 1e-3, 0.0283168, 1.63871e-5, 0.00378541]
  },
  "Momento de inercia": {
    unidades: ["mm⁴", "cm⁴", "m⁴", "in⁴", "ft⁴"],
    factores: [1e-12, 1e-8, 1, 4.16231e-7, 8.63097e-3]
  },
  "Temperatura": {
    unidades: ["°C", "°F", "K"],
    factores: [1, 1, 1] // manejo especial
  },
}

export function convertirTemperatura(valor: number, desde: string, hacia: string): number {
  let celsius = valor
  if (desde === "°F") celsius = (valor - 32) * 5 / 9
  if (desde === "K") celsius = valor - 273.15
  if (hacia === "°C") return celsius
  if (hacia === "°F") return celsius * 9 / 5 + 32
  if (hacia === "K") return celsius + 273.15
  return celsius
}
