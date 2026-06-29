import { create } from "zustand"
import { persist } from "zustand/middleware"

// ── Tipos de unidades por categoría ───────────────────────────────────────
export type UnidadLongitud = "mm" | "cm" | "m" | "in" | "ft"
export type UnidadFuerza = "N" | "kN" | "kgf" | "tf" | "lbf" | "kip"
export type UnidadMomento = "N·m" | "kN·m" | "kgf·m" | "tf·m" | "lbf·ft" | "kip·ft"
export type UnidadEsfuerzo = "Pa" | "kPa" | "MPa" | "kgf/cm²" | "tf/m²" | "psi" | "ksi"
export type UnidadDesplazamiento = "mm" | "cm" | "m" | "in"
export type UnidadGiro = "rad" | "mrad" | "°"
export type UnidadTemperatura = "°C" | "°F" | "K"
export type UnidadResorte = "N/m" | "kN/m" | "kgf/cm" | "tf/m" | "kip/in"
export type UnidadResorteRot = "N·m/rad" | "kN·m/rad" | "kgf·m/rad" | "tf·m/rad"
export type UnidadSeccion = "mm" | "cm" | "m" | "in"
export type UnidadInercia = "mm⁴" | "cm⁴" | "m⁴" | "in⁴"
export type UnidadModulo = "mm³" | "cm³" | "m³" | "in³"
export type UnidadMasa = "kg" | "t" | "lb" | "kip"
export type UnidadDensidad = "kg/m³" | "kN/m³" | "kgf/m³" | "lb/ft³"

export type SistemaUnidades = "SI" | "metrico" | "americano" | "personalizado"

export type ConfigUnidades = {
  sistema: SistemaUnidades
  // Geometría / secciones
  longitud: UnidadLongitud
  seccion: UnidadSeccion
  inercia: UnidadInercia
  modulo_resistente: UnidadModulo
  // Cargas
  fuerza: UnidadFuerza
  momento: UnidadMomento
  esfuerzo: UnidadEsfuerzo
  densidad: UnidadDensidad
  masa: UnidadMasa
  // Resultados
  desplazamiento: UnidadDesplazamiento
  giro: UnidadGiro
  resorte_lineal: UnidadResorte
  resorte_rotacional: UnidadResorteRot
  // Ambiente
  temperatura: UnidadTemperatura
}

// ── Presets por sistema ────────────────────────────────────────────────────
export const PRESETS: Record<Exclude<SistemaUnidades, "personalizado">, ConfigUnidades> = {
  SI: {
    sistema: "SI",
    longitud: "m",
    seccion: "cm",
    inercia: "cm⁴",
    modulo_resistente: "cm³",
    fuerza: "kN",
    momento: "kN·m",
    esfuerzo: "MPa",
    densidad: "kN/m³",
    masa: "t",
    desplazamiento: "mm",
    giro: "rad",
    resorte_lineal: "kN/m",
    resorte_rotacional: "kN·m/rad",
    temperatura: "°C",
  },
  metrico: {
    sistema: "metrico",
    longitud: "m",
    seccion: "cm",
    inercia: "cm⁴",
    modulo_resistente: "cm³",
    fuerza: "tf",
    momento: "tf·m",
    esfuerzo: "kgf/cm²",
    densidad: "kgf/m³",
    masa: "t",
    desplazamiento: "cm",
    giro: "rad",
    resorte_lineal: "tf/m",
    resorte_rotacional: "tf·m/rad",
    temperatura: "°C",
  },
  americano: {
    sistema: "americano",
    longitud: "ft",
    seccion: "in",
    inercia: "in⁴",
    modulo_resistente: "in³",
    fuerza: "kip",
    momento: "kip·ft",
    esfuerzo: "ksi",
    densidad: "lb/ft³",
    masa: "kip",
    desplazamiento: "in",
    giro: "rad",
    resorte_lineal: "kip/in",
    resorte_rotacional: "kN·m/rad",
    temperatura: "°F",
  },
}

type UnidadesStore = {
  config: ConfigUnidades
  setConfig: (c: ConfigUnidades) => void
  aplicarPreset: (s: Exclude<SistemaUnidades, "personalizado">) => void
  setSistema: (s: SistemaUnidades) => void
}

export const useUnidadesStore = create<UnidadesStore>()(
  persist(
    (set) => ({
      config: PRESETS.SI,
      setConfig: (c) => set({ config: c }),
      aplicarPreset: (s) => set({ config: PRESETS[s] }),
      setSistema: (s) => set((state) => ({ config: { ...state.config, sistema: s } })),
    }),
    { name: "nodocalc-unidades" }
  )
)