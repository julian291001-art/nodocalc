"use client"
import { useState } from "react"
import Sidebar from "../../components/Sidebar"
import { conversiones, convertirTemperatura } from "../../lib/conversiones"

export default function Unidades() {
  const [categoria, setCategoria] = useState("Fuerza")
  const [valor, setValor] = useState("")
  const [desde, setDesde] = useState("kN")
  const [hacia, setHacia] = useState("kgf")

  const categoriaData = conversiones[categoria]

  const calcular = () => {
    const num = parseFloat(valor)
    if (isNaN(num)) return null
    if (categoria === "Temperatura") return convertirTemperatura(num, desde, hacia)
    const idxDesde = categoriaData.unidades.indexOf(desde)
    const idxHacia = categoriaData.unidades.indexOf(hacia)
    if (idxDesde === -1 || idxHacia === -1) return null
    const enBase = num * categoriaData.factores[idxDesde]
    return enBase / categoriaData.factores[idxHacia]
  }

  const resultado = calcular()

  const handleCategoria = (cat: string) => {
    setCategoria(cat)
    setDesde(conversiones[cat].unidades[0])
    setHacia(conversiones[cat].unidades[1])
    setValor("")
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Conversión de unidades</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">

            {/* Categorías */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">CATEGORÍA</div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(conversiones).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoria(cat)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${categoria === cat ? "bg-blue-700 text-white border-blue-700" : "text-gray-600 border-gray-300 hover:border-blue-300"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Convertidor */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-4">CONVERTIDOR</div>
              <div className="grid grid-cols-3 gap-4 items-end">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Valor</div>
                  <input
                    type="number"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Desde</div>
                  <select
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  >
                    {categoriaData.unidades.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Hacia</div>
                  <select
                    value={hacia}
                    onChange={(e) => setHacia(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  >
                    {categoriaData.unidades.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resultado */}
              {resultado !== null && valor !== "" && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <div className="text-xs text-blue-500 mb-1">Resultado</div>
                  <div className="text-2xl font-medium text-blue-900">
                    {resultado.toExponential(6).includes("e+0") || Math.abs(resultado) >= 0.001 && Math.abs(resultado) < 1e6
                      ? resultado.toPrecision(6)
                      : resultado.toExponential(4)}
                    <span className="text-base ml-2">{hacia}</span>
                  </div>
                  <div className="text-xs text-blue-400 mt-1">
                    {valor} {desde} = {resultado.toPrecision(6)} {hacia}
                  </div>
                </div>
              )}
            </div>

            {/* Tabla de equivalencias */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">TABLA DE EQUIVALENCIAS — 1 {categoriaData.unidades[0]}</div>
              <div className="flex flex-col gap-2">
                {categoriaData.unidades.map((u) => {
                  let eq
                  if (categoria === "Temperatura") {
                    eq = convertirTemperatura(1, categoriaData.unidades[0], u)
                  } else {
                    eq = categoriaData.factores[0] / categoriaData.factores[categoriaData.unidades.indexOf(u)]
                  }
                  return (
                    <div key={u} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-600">{u}</span>
                      <span className="text-sm font-medium text-gray-800">
                        {Math.abs(eq) >= 0.001 && Math.abs(eq) < 1e6 ? eq.toPrecision(5) : eq.toExponential(4)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}