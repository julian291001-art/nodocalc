// ─────────────────────────────────────────────────────────────────────────────
// MOTOR COMPARTIDO DE RELACIONES DE FASE
// Extraído de Herramientas → Relaciones de fase para poder reutilizarse en
// cualquier otro módulo (p. ej. Esfuerzos en el suelo) sin duplicar la lógica
// de resolución ni las fórmulas geotécnicas. Todo se resuelve en unidades
// consistentes con el γw que reciba cada llamada (el motor es agnóstico a la
// unidad: solo exige que γw y las variables de peso/volumen estén en la misma
// base).
// ─────────────────────────────────────────────────────────────────────────────

export type VarKey =
  | "Gs" | "e" | "n" | "w" | "S"
  | "gamma" | "gammad" | "gammasat" | "gammap"
  | "Ws" | "Ww" | "W"
  | "Vs" | "Vw" | "Va" | "Vv" | "V"

export type Vars = Partial<Record<VarKey, number>>

export type Grupo = "indices" | "unitarios" | "pesos" | "volumenes"

export type VarMeta = {
  key: VarKey
  labelHtml: string
  grupo: Grupo
  esPorcentaje: boolean
  esUnitario: boolean   // usa unidad de peso unitario (γw)
  esPeso: boolean
  esVolumen: boolean
}

export const ALL_VARS: VarKey[] = [
  "Gs", "e", "n", "w", "S",
  "gamma", "gammad", "gammasat", "gammap",
  "Ws", "Ww", "W",
  "Vs", "Vw", "Va", "Vv", "V",
]

export const META: Record<VarKey, VarMeta> = {
  Gs:       { key: "Gs",       labelHtml: "Gravedad específica de sólidos G<sub>s</sub>",   grupo: "indices",   esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: false },
  e:        { key: "e",        labelHtml: "Relación de vacíos e",                            grupo: "indices",   esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: false },
  n:        { key: "n",        labelHtml: "Porosidad n (%)",                                 grupo: "indices",   esPorcentaje: true,  esUnitario: false, esPeso: false, esVolumen: false },
  w:        { key: "w",        labelHtml: "Contenido de agua w (%)",                          grupo: "indices",   esPorcentaje: true,  esUnitario: false, esPeso: false, esVolumen: false },
  S:        { key: "S",        labelHtml: "Grado de saturación S (%)",                       grupo: "indices",   esPorcentaje: true,  esUnitario: false, esPeso: false, esVolumen: false },
  gamma:    { key: "gamma",    labelHtml: "Peso unitario total γ",                           grupo: "unitarios", esPorcentaje: false, esUnitario: true,  esPeso: false, esVolumen: false },
  gammad:   { key: "gammad",   labelHtml: "Peso unitario seco γ<sub>d</sub>",                 grupo: "unitarios", esPorcentaje: false, esUnitario: true,  esPeso: false, esVolumen: false },
  gammasat: { key: "gammasat", labelHtml: "Peso unitario saturado γ<sub>sat</sub>",           grupo: "unitarios", esPorcentaje: false, esUnitario: true,  esPeso: false, esVolumen: false },
  gammap:   { key: "gammap",   labelHtml: "Peso unitario sumergido γ'",                       grupo: "unitarios", esPorcentaje: false, esUnitario: true,  esPeso: false, esVolumen: false },
  Ws:       { key: "Ws",       labelHtml: "Peso de sólidos W<sub>s</sub>",                    grupo: "pesos",     esPorcentaje: false, esUnitario: false, esPeso: true,  esVolumen: false },
  Ww:       { key: "Ww",       labelHtml: "Peso de agua W<sub>w</sub>",                       grupo: "pesos",     esPorcentaje: false, esUnitario: false, esPeso: true,  esVolumen: false },
  W:        { key: "W",        labelHtml: "Peso total W",                                     grupo: "pesos",     esPorcentaje: false, esUnitario: false, esPeso: true,  esVolumen: false },
  Vs:       { key: "Vs",       labelHtml: "Volumen de sólidos V<sub>s</sub>",                 grupo: "volumenes", esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: true  },
  Vw:       { key: "Vw",       labelHtml: "Volumen de agua V<sub>w</sub>",                    grupo: "volumenes", esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: true  },
  Va:       { key: "Va",       labelHtml: "Volumen de aire V<sub>a</sub>",                    grupo: "volumenes", esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: true  },
  Vv:       { key: "Vv",       labelHtml: "Volumen de vacíos V<sub>v</sub>",                  grupo: "volumenes", esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: true  },
  V:        { key: "V",        labelHtml: "Volumen total V",                                  grupo: "volumenes", esPorcentaje: false, esUnitario: false, esPeso: false, esVolumen: true  },
}

export const GRUPOS: { id: Grupo; titulo: string }[] = [
  { id: "indices",   titulo: "Índices y relaciones" },
  { id: "unitarios", titulo: "Pesos unitarios" },
  { id: "pesos",     titulo: "Pesos" },
  { id: "volumenes", titulo: "Volúmenes" },
]

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE RESOLUCIÓN (reglas + punto fijo)
// ─────────────────────────────────────────────────────────────────────────────
export type Regla = { out: VarKey; inputs: VarKey[]; f: (v: Vars) => number }

export function construirReglas(yw: number): Regla[] {
  return [
    // Volúmenes / índices
    { out: "e",  inputs: ["Vv", "Vs"], f: v => v.Vv! / v.Vs! },
    { out: "Vv", inputs: ["e", "Vs"],  f: v => v.e! * v.Vs! },
    { out: "Vs", inputs: ["Vv", "e"],  f: v => v.Vv! / v.e! },
    { out: "V",  inputs: ["Vs", "Vv"], f: v => v.Vs! + v.Vv! },
    { out: "Vs", inputs: ["V", "Vv"],  f: v => v.V! - v.Vv! },
    { out: "Vv", inputs: ["V", "Vs"],  f: v => v.V! - v.Vs! },
    { out: "n",  inputs: ["Vv", "V"],  f: v => v.Vv! / v.V! },
    { out: "Vv", inputs: ["n", "V"],   f: v => v.n! * v.V! },
    { out: "V",  inputs: ["Vv", "n"],  f: v => v.Vv! / v.n! },
    { out: "n",  inputs: ["e"],        f: v => v.e! / (1 + v.e!) },
    { out: "e",  inputs: ["n"],        f: v => v.n! / (1 - v.n!) },
    { out: "Vv", inputs: ["Vw", "Va"], f: v => v.Vw! + v.Va! },
    { out: "Vw", inputs: ["Vv", "Va"], f: v => v.Vv! - v.Va! },
    { out: "Va", inputs: ["Vv", "Vw"], f: v => v.Vv! - v.Vw! },
    { out: "V",  inputs: ["Vs", "Vw", "Va"], f: v => v.Vs! + v.Vw! + v.Va! },
    { out: "Vs", inputs: ["V", "Vw", "Va"],  f: v => v.V! - v.Vw! - v.Va! },
    { out: "Vw", inputs: ["V", "Vs", "Va"],  f: v => v.V! - v.Vs! - v.Va! },
    { out: "Va", inputs: ["V", "Vs", "Vw"],  f: v => v.V! - v.Vs! - v.Vw! },

    // Saturación
    { out: "S",  inputs: ["Vw", "Vv"], f: v => v.Vw! / v.Vv! },
    { out: "Vw", inputs: ["S", "Vv"],  f: v => v.S! * v.Vv! },
    { out: "Vv", inputs: ["Vw", "S"],  f: v => (v.S! !== 0 ? v.Vw! / v.S! : NaN) },

    // Humedad y pesos
    { out: "w",  inputs: ["Ww", "Ws"], f: v => v.Ww! / v.Ws! },
    { out: "Ww", inputs: ["w", "Ws"],  f: v => v.w! * v.Ws! },
    { out: "Ws", inputs: ["Ww", "w"],  f: v => (v.w! !== 0 ? v.Ww! / v.w! : NaN) },
    { out: "W",  inputs: ["Ws", "Ww"], f: v => v.Ws! + v.Ww! },
    { out: "Ws", inputs: ["W", "Ww"],  f: v => v.W! - v.Ww! },
    { out: "Ww", inputs: ["W", "Ws"],  f: v => v.W! - v.Ws! },
    { out: "Ww", inputs: ["Vw"],       f: v => v.Vw! * yw },
    { out: "Vw", inputs: ["Ww"],       f: v => v.Ww! / yw },

    // Gravedad específica
    { out: "Gs", inputs: ["Ws", "Vs"], f: v => v.Ws! / (v.Vs! * yw) },
    { out: "Ws", inputs: ["Gs", "Vs"], f: v => v.Gs! * v.Vs! * yw },
    { out: "Vs", inputs: ["Ws", "Gs"], f: v => v.Ws! / (v.Gs! * yw) },

    // Pesos unitarios
    { out: "gamma",  inputs: ["W", "V"],       f: v => v.W! / v.V! },
    { out: "W",      inputs: ["gamma", "V"],   f: v => v.gamma! * v.V! },
    { out: "V",      inputs: ["W", "gamma"],   f: v => v.W! / v.gamma! },
    { out: "gammad", inputs: ["Ws", "V"],      f: v => v.Ws! / v.V! },
    { out: "Ws",     inputs: ["gammad", "V"],  f: v => v.gammad! * v.V! },
    { out: "V",      inputs: ["Ws", "gammad"], f: v => v.Ws! / v.gammad! },
    { out: "gammad", inputs: ["gamma", "w"],   f: v => v.gamma! / (1 + v.w!) },
    { out: "gamma",  inputs: ["gammad", "w"],  f: v => v.gammad! * (1 + v.w!) },
    { out: "w",      inputs: ["gamma", "gammad"], f: v => v.gamma! / v.gammad! - 1 },
    { out: "gammad", inputs: ["Gs", "e"],      f: v => (v.Gs! * yw) / (1 + v.e!) },
    { out: "e",      inputs: ["Gs", "gammad"], f: v => (v.Gs! * yw) / v.gammad! - 1 },
    { out: "Gs",     inputs: ["gammad", "e"],  f: v => (v.gammad! * (1 + v.e!)) / yw },
    { out: "gammasat", inputs: ["Gs", "e"],    f: v => ((v.Gs! + v.e!) * yw) / (1 + v.e!) },
    { out: "gammasat", inputs: ["gammad", "n"], f: v => v.gammad! + v.n! * yw },
    { out: "gammap", inputs: ["gammasat"],     f: v => v.gammasat! - yw },
    { out: "gammasat", inputs: ["gammap"],     f: v => v.gammap! + yw },
    { out: "gammap", inputs: ["Gs", "e"],      f: v => ((v.Gs! - 1) * yw) / (1 + v.e!) },
    { out: "Gs",     inputs: ["gammap", "e"],  f: v => (v.gammap! * (1 + v.e!)) / yw + 1 },
    { out: "gamma",  inputs: ["Gs", "S", "e"], f: v => ((v.Gs! + v.S! * v.e!) * yw) / (1 + v.e!) },

    // Relación fundamental S·e = w·Gs
    { out: "e",  inputs: ["S", "w", "Gs"], f: v => (v.w! * v.Gs!) / v.S! },
    { out: "S",  inputs: ["e", "w", "Gs"], f: v => (v.w! * v.Gs!) / v.e! },
    { out: "w",  inputs: ["S", "e", "Gs"], f: v => (v.S! * v.e!) / v.Gs! },
    { out: "Gs", inputs: ["S", "e", "w"],  f: v => (v.S! * v.e!) / v.w! },
  ]
}

export function resolverFases(conocidos: Vars, yw: number): Vars {
  const vars: Vars = { ...conocidos }
  const reglas = construirReglas(yw)
  let cambio = true
  let iter = 0
  while (cambio && iter < 30) {
    cambio = false
    iter++
    for (const reg of reglas) {
      if (vars[reg.out] !== undefined) continue
      if (reg.inputs.every(k => vars[k] !== undefined && Number.isFinite(vars[k]!))) {
        const val = reg.f(vars)
        if (Number.isFinite(val)) {
          vars[reg.out] = val < 0 && val > -1e-9 ? 0 : val
          cambio = true
        }
      }
    }
  }
  return vars
}

// ─────────────────────────────────────────────────────────────────────────────
// FRACCIONES DE FASE (a partir de e/n y S — no requiere valores absolutos)
// ─────────────────────────────────────────────────────────────────────────────
export type Fracciones =
  | { modo: "sin_datos" }
  | { modo: "indiferenciado"; solido: number; vacios: number }
  | { modo: "seco"; solido: number; aire: number }
  | { modo: "saturado"; solido: number; agua: number }
  | { modo: "completo"; solido: number; agua: number; aire: number }

export function calcularFracciones(v: Vars): Fracciones {
  let n = v.n
  if (n === undefined && v.e !== undefined && Number.isFinite(v.e)) n = v.e / (1 + v.e)
  if (n === undefined || !Number.isFinite(n) || n < 0 || n > 1) return { modo: "sin_datos" }

  const solido = 1 - n
  const S = v.S

  if (S === undefined || !Number.isFinite(S)) return { modo: "indiferenciado", solido, vacios: n }
  if (S <= 1e-6) return { modo: "seco", solido, aire: n }
  if (S >= 1 - 1e-6) return { modo: "saturado", solido, agua: n }
  return { modo: "completo", solido, agua: S * n, aire: n - S * n }
}
