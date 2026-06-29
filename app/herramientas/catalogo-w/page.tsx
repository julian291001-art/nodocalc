"use client"
import { useState } from "react"
import Sidebar from "../../components/Sidebar"
import { perfilesW, PerfilW } from "../data/perfiles"
import { useSeccionStore } from "../../store/useSeccionStore"
import { useRouter } from "next/navigation"

export default function CatalogoW() {
  const [busqueda, setBusqueda] = useState("")
  const [minIx, setMinIx] = useState("")
  const [minA, setMinA] = useState("")
  const [minSx, setMinSx] = useState("")
  const setSeccion = useSeccionStore(s => s.setSeccion)
  const router = useRouter()

  const filtrados = perfilesW.filter((p: PerfilW) => {
    const matchBusqueda = p.designacion.toLowerCase().includes(busqueda.toLowerCase())
    const matchIx = minIx ? p.Ix >= parseFloat(minIx) : true
    const matchA = minA ? p.A >= parseFloat(minA) : true
    const matchSx = minSx ? p.Sx >= parseFloat(minSx) : true
    return matchBusqueda && matchIx && matchA && matchSx
  })

  const cargar = (p: PerfilW) => {
    setSeccion({
      nombre: p.designacion,
      A: p.A * 6.452,
      Icx: p.Ix * 41.62,
      Icy: p.Iy * 41.62,
      Sx_top: p.Sx * 16.39,
      Sx_bot: p.Sx * 16.39,
      Sy: p.Sy * 16.39,
      rx: p.rx * 2.54,
      ry: p.ry * 2.54,
      J: (p.Ix + p.Iy) * 41.62,
      E: null, fc: null, ft: null, fy: null
    }, "secciones")
    router.push("/herramientas/secciones")
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Catálogo W (AISC)</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-400 font-medium tracking-wider mb-3">FILTROS</div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Buscar designación</div>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="W12, W14×50..."
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
              <div>
                <div className="text-xs text-gray-500 mb-1">Sx mín (in³)</div>
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
                    <th className="px-3 py-3 text-center font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p: PerfilW, i: number) => (
                    <tr key={p.designacion} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
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
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => cargar(p)}
                          className="text-xs bg-blue-700 text-white px-2 py-1 rounded-lg hover:bg-blue-800">
                          → Cargar
                        </button>
                      </td>
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