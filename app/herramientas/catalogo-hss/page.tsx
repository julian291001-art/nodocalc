"use client"
import { useState } from "react"
import Sidebar from "../../components/Sidebar"
import { perfilesHSS, PerfilHSS } from "../data/perfiles"

export default function CatalogoHSS() {
  const [tipo, setTipo] = useState<"TODOS" | "cuadrado" | "rectangular" | "circular">("TODOS")
  const [busqueda, setBusqueda] = useState("")
  const [minIx, setMinIx] = useState("")
  const [minA, setMinA] = useState("")

  const filtrados = perfilesHSS.filter(p => {
    const matchBusqueda = p.designacion.toLowerCase().includes(busqueda.toLowerCase())
    const matchTipo = tipo === "TODOS" ? true : p.tipo === tipo
    const matchIx = minIx ? p.Ix >= parseFloat(minIx) : true
    const matchA = minA ? p.A >= parseFloat(minA) : true
    return matchBusqueda && matchTipo && matchIx && matchA
  })

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Catálogo HSS y CHS (AISC)</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">FILTROS</div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Buscar designación</div>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="HSS6×6, HSS8×4..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Tipo</div>
                <select value={tipo} onChange={e => setTipo(e.target.value as typeof tipo)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="TODOS">Todos</option>
                  <option value="cuadrado">Cuadrado</option>
                  <option value="rectangular">Rectangular</option>
                  <option value="circular">Circular (CHS)</option>
                </select>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Ix mín (in⁴)</div>
                <input type="number" value={minIx} onChange={e => setMinIx(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">A mín (in²)</div>
                <input type="number" value={minA} onChange={e => setMinA(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">{filtrados.length} perfiles encontrados</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="px-3 py-3 text-left font-medium">Designación</th>
                    <th className="px-3 py-3 text-center font-medium">Tipo</th>
                    <th className="px-3 py-3 text-right font-medium">H (in)</th>
                    <th className="px-3 py-3 text-right font-medium">B (in)</th>
                    <th className="px-3 py-3 text-right font-medium">t (in)</th>
                    <th className="px-3 py-3 text-right font-medium">A (in²)</th>
                    <th className="px-3 py-3 text-right font-medium">Ix (in⁴)</th>
                    <th className="px-3 py-3 text-right font-medium">Sx (in³)</th>
                    <th className="px-3 py-3 text-right font-medium">rx (in)</th>
                    <th className="px-3 py-3 text-right font-medium">Iy (in⁴)</th>
                    <th className="px-3 py-3 text-right font-medium">Sy (in³)</th>
                    <th className="px-3 py-3 text-right font-medium">ry (in)</th>
                    <th className="px-3 py-3 text-right font-medium">Peso (lb/ft)</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p, i) => (
                    <tr key={p.designacion} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                      <td className="px-3 py-2 font-medium text-blue-700">{p.designacion}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.tipo === "cuadrado" ? "bg-blue-100 text-blue-700" :
                          p.tipo === "rectangular" ? "bg-green-100 text-green-700" :
                          "bg-purple-100 text-purple-700"
                        }`}>{p.tipo}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.H}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.B}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.t}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.A}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.Ix}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.Sx}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.rx}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.Iy}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.Sy}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.ry}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.peso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}