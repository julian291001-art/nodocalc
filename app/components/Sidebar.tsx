"use client"
import { usePathname } from "next/navigation"

const modulos = [
  { href: "/estatica", icon: "⊛", label: "Estática" },
  { href: "/vigas", icon: "━", label: "Vigas" },
  { href: "/porticos", icon: "⬡", label: "Pórticos" },
  { href: "/armaduras", icon: "△", label: "Armaduras" },
  { href: "/matricial", icon: "⊞", label: "Método Matricial" },
  { href: "/pandeo", icon: "⊟", label: "Pandeo" },
  { href: "/dinamica", icon: "〜", label: "Dinámica Estructural" },
  { href: "/modal", icon: "◎", label: "Análisis Modal" },
  { href: "/geotecnia", icon: "⊡", label: "Geotecnia" },
  { href: "/hidraulica", icon: "💧", label: "Hidráulica" },
  { href: "/diseno", icon: "🏗", label: "Diseño Estructural" },
  { href: "/herramientas", icon: "🔧", label: "Herramientas" },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-56 bg-blue-900 flex flex-col flex-shrink-0">
      <div className="px-4 py-5 border-b border-blue-800">
        <a href="/" className="text-blue-100 font-medium text-base">◈ NodoCalc</a>
        <div className="text-blue-400 text-xs mt-1">Plataforma de cálculo para ingeniería civil</div>
      </div>
      <div className="p-2 flex-1 overflow-y-auto">
        <div className="text-blue-500 text-xs uppercase tracking-widest px-2 py-2">Principal</div>
        <a href="/">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 ${pathname === "/" ? "bg-blue-700 text-blue-100" : "text-blue-300 hover:bg-blue-800"}`}>
            <span>⊞</span><span>Dashboard</span>
          </div>
        </a>
        <div className="text-blue-500 text-xs uppercase tracking-widest px-2 py-2 mt-3">Módulos</div>
        {modulos.map((m) => (
          <a href={m.href} key={m.href}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 ${pathname === m.href ? "bg-blue-700 text-blue-100" : "text-blue-300 hover:bg-blue-800"}`}>
              <span>{m.icon}</span><span>{m.label}</span>
            </div>
          </a>
        ))}
        <div className="text-blue-500 text-xs uppercase tracking-widest px-2 py-2 mt-3">Cuenta</div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 text-blue-300 hover:bg-blue-800">
          <span>⚙</span><span>Ajustes</span>
        </div>
      </div>
      <div className="p-2 border-t border-blue-800">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-blue-800 cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-blue-100 text-xs font-medium">JL</div>
          <span className="text-blue-300 text-xs">Julián León</span>
        </div>
      </div>
    </div>
  )
}