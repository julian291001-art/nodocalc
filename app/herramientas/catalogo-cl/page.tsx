"use client"
import { useState } from "react"
import Sidebar from "../../components/Sidebar"
import { perfilesC, PerfilC, perfilesL, PerfilL } from "../data/perfiles"

export default function CatalogoCL() {
  const [tab, setTab] = useState<"C" | "L">("C")
  const [busqueda, setBusqueda] = useState("")
  const [minIx, setMinIx] = useState("")
  const [minA, setMinA] = useState("")

  const filtradosC = perfilesC.filter(p => {
    const matchBusqueda = p.designacion.toLowerCase().includes(busqueda.toLowerCase())
    const matchIx = minIx ? p.Ix >= parseFloat(minIx) : true
    const matchA = minA ? p.A >= parseFloat(minA) : true
    return matchBusqueda && matchIx && matchA
  })

  const filtradosL = perfilesL.filter(p => {
    const matchBusqueda = p.designacion.toLowerCase().includes(busqueda.toLowerCase())
    const matchIx = minIx ? p.Ix >= parseFloat(minIx) : true
    const matchA = minA ? p.A >= parseFloat(minA) : true
    return matchBusqueda && matchIx && matchA
  })

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Catálogo C y L (AISC)</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <div className="flex gap-3 mb-4">
              <button onClick={() => { setTab("C"); setBusqueda(""); setMinIx(""); setMinA("") }}
                className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${tab === "C" ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                Canal C
              </button>
              <button onClick={() => { setTab("L"); setBusqueda(""); setMinIx(""); setMinA("") }}
                className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${tab === "L" ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                Ángulo L
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Buscar designación</div>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder={tab === "C" ? "C6, C10×20..." : "L4×4, L6×4..."}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
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
            <div className="mt-2 text-xs text-gray-400">
              {tab === "C" ? filtradosC.length : filtradosL.length} perfiles encontrados
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              {tab === "C" ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-blue-700 text-white">
                      <th className="px-3 py-3 text-left font-medium">Designación</th>
                      <th className="px-3 py-3 text-right font-medium">A (in²)</th>
                      <th className="px-3 py-3 text-right font-medium">d (in)</th>
                      <th className="px-3 py-3 text-right font-medium">bf (in)</th>
                      <th className="px-3 py-3 text-right font-medium">tf (in)</th>
                      <th className="px-3 py-3 text-right font-medium">tw (in)</th>
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
                    {filtradosC.map((p, i) => (
                      <tr key={p.designacion} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                        <td className="px-3 py-2 font-medium text-blue-700">{p.designacion}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{p.A}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{p.d}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{p.bf}</td>
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
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-blue-700 text-white">
                      <th className="px-3 py-3 text-left font-medium">Designación</th>
                      <th className="px-3 py-3 text-right font-medium">A (in²)</th>
                      <th className="px-3 py-3 text-right font-medium">b1 (in)</th>
                      <th className="px-3 py-3 text-right font-medium">b2 (in)</th>
                      <th className="px-3 py-3 text-right font-medium">t (in)</th>
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
                    {filtradosL.map((p, i) => (
                      <tr key={p.designacion} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                        <td className="px-3 py-2 font-medium text-blue-700">{p.designacion}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{p.A}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{p.b1}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{p.b2}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{p.t}</td>
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}