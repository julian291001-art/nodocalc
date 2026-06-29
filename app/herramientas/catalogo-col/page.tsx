"use client"
import { useState } from "react"
import Sidebar from "../../components/Sidebar"
import { perfilesColombiaos, PerfilColombiano } from "../data/perfiles"

export default function CatalogoCol() {
  const [busqueda, setBusqueda] = useState("")
  const [tipo, setTipo] = useState("TODOS")
  const [fabricante, setFabricante] = useState("TODOS")
  const [minIx, setMinIx] = useState("")

  const tipos = ["TODOS", ...Array.from(new Set(perfilesColombiaos.map(p => p.tipo)))]
  const fabricantes = ["TODOS", ...Array.from(new Set(perfilesColombiaos.map(p => p.fabricante)))]

  const filtrados = perfilesColombiaos.filter(p => {
    const matchBusqueda = p.designacion.toLowerCase().includes(busqueda.toLowerCase())
    const matchTipo = tipo === "TODOS" ? true : p.tipo === tipo
    const matchFab = fabricante === "TODOS" ? true : p.fabricante === fabricante
    const matchIx = minIx ? p.Ix >= parseFloat(minIx) : true
    return matchBusqueda && matchTipo && matchFab && matchIx
  })

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Perfiles Colombianos</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-xs text-blue-700">
            Perfiles tubulares ASTM A500 Grado C de <strong>Colmena</strong> y perfiles C formados en frío Grado 50 de <strong>Acesco</strong>. Propiedades en unidades del Sistema Internacional (cm, cm², cm⁴, cm³, kg/m).
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">FILTROS</div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Buscar designación</div>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="TC 100, TR 50..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Tipo</div>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Fabricante</div>
                <select value={fabricante} onChange={e => setFabricante(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  {fabricantes.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Ix mín (cm⁴)</div>
                <input type="number" value={minIx} onChange={e => setMinIx(e.target.value)}
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
                    <th className="px-3 py-3 text-left font-medium">Tipo</th>
                    <th className="px-3 py-3 text-left font-medium">Fabricante</th>
                    <th className="px-3 py-3 text-right font-medium">A (cm²)</th>
                    <th className="px-3 py-3 text-right font-medium">h (cm)</th>
                    <th className="px-3 py-3 text-right font-medium">b (cm)</th>
                    <th className="px-3 py-3 text-right font-medium">t (cm)</th>
                    <th className="px-3 py-3 text-right font-medium">Ix (cm⁴)</th>
                    <th className="px-3 py-3 text-right font-medium">Sx (cm³)</th>
                    <th className="px-3 py-3 text-right font-medium">rx (cm)</th>
                    <th className="px-3 py-3 text-right font-medium">Iy (cm⁴)</th>
                    <th className="px-3 py-3 text-right font-medium">Sy (cm³)</th>
                    <th className="px-3 py-3 text-right font-medium">ry (cm)</th>
                    <th className="px-3 py-3 text-right font-medium">Peso (kg/m)</th>
                    <th className="px-3 py-3 text-left font-medium">Norma</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p, i) => (
                    <tr key={p.designacion} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                      <td className="px-3 py-2 font-medium text-blue-700">{p.designacion}</td>
                      <td className="px-3 py-2 text-gray-600">{p.tipo}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.fabricante === "Colmena" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        }`}>{p.fabricante}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.A}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.h}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.b}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.t}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.Ix}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.Sx}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.rx}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.Iy}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.Sy}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.ry}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.peso}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{p.norma}</td>
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