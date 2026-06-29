"use client"
import Sidebar from "../../components/Sidebar"

export default function CatalogoHSS() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Herramientas /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Catálogo HSS y CHS</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🔧</div>
            <div className="text-gray-500 text-sm">Próximamente</div>
            <div className="text-gray-400 text-xs mt-1">Tubos cuadrados, rectangulares y circulares huecos</div>
          </div>
        </div>
      </div>
    </div>
  )
}