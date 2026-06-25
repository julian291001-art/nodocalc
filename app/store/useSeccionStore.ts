import { create } from "zustand"

type SeccionData = {
  nombre: string
  A: number
  Icx: number
  Icy: number
  Sx_top: number
  Sx_bot: number
  Sy: number
  rx: number
  ry: number
  J: number
  E: number | null
  fc: number | null
  ft: number | null
  fy: number | null
}

type SeccionStore = {
  seccion: SeccionData | null
  origen: string | null
  setSeccion: (s: SeccionData, origen: string) => void
  limpiarSeccion: () => void
}

export const useSeccionStore = create<SeccionStore>((set) => ({
  seccion: null,
  origen: null,
  setSeccion: (s, origen) => set({ seccion: s, origen }),
  limpiarSeccion: () => set({ seccion: null, origen: null }),
}))