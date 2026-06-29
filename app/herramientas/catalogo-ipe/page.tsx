"use client"
import { useState } from "react"
import Sidebar from "../../components/Sidebar"
import { perfilesIPE, PerfilIPE } from "../data/perfiles"

export default function CatalogoIPE() {
  const [busqueda, setBusqueda] = useState("")
  const [minIx, setMinIx] = useState("")
  const [minA, setMinA] = useState("")
  const [minSx, setMinSx] = useState("")

  const filtrados = perfilesIPE.filter(p => {
    const matchBusqueda = p.designacion.toLowerCase().includes(busqueda.toLowerCase())
    const matchIx = minIx ? p.Ix >= parseFloat(minIx) : true
    const matchA = minA ? p.A >= parseFloat(minA) : true
    const matchSx = minSx ? p.Sx >= parseFloat(minSx) : true
    return matchBusqueda && matchIx && matchA && matchSx
  })

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Catálogo IPE (Europa)</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">FILTROS</div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Buscar designación</div>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="IPE 200, IPE 300..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Ix mín (cm⁴)</div>
                <input type="number" value={minIx} onChange={e => setMinIx(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">A mín (cm²)</div>
                <input type="number" value={minA} onChange={e => setMinA(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Sx mín (cm³)</div>
                <input type="number" value={minSx} onChange={e => setMinSx(e.target.value)}
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
                    <th className="px-3 py-3 text-right font-medium">A (cm²)</th>
                    <th className="px-3 py-3 text-right font-medium">h (mm)</th>
                    <th className="px-3 py-3 text-right font-medium">b (mm)</th>
                    <th className="px-3 py-3 text-right font-medium">tf (mm)</th>
                    <th className="px-3 py-3 text-right font-medium">tw (mm)</th>
                    <th className="px-3 py-3 text-right font-medium">Ix (cm⁴)</th>
                    <th className="px-3 py-3 text-right font-medium">Sx (cm³)</th>
                    <th className="px-3 py-3 text-right font-medium">rx (cm)</th>
                    <th className="px-3 py-3 text-right font-medium">Iy (cm⁴)</th>
                    <th className="px-3 py-3 text-right font-medium">Sy (cm³)</th>
                    <th className="px-3 py-3 text-right font-medium">ry (cm)</th>
                    <th className="px-3 py-3 text-right font-medium">Peso (kg/m)</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p, i) => (
                    <tr key={p.designacion} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                      <td className="px-3 py-2 font-medium text-blue-700">{p.designacion}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.A}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.h}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.b}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.tf}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.tw}</td>
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