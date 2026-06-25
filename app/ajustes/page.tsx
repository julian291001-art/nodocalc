import Sidebar from "../components/Sidebar"

export default function Ajustes() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-gray-400 text-sm">Cuenta /</span>
          <span className="text-gray-800 font-medium text-base ml-1">Ajustes</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">

            {/* Perfil */}
            <Section titulo="Perfil">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center text-white text-xl font-medium">JL</div>
                <div>
                  <div className="text-sm font-medium text-gray-800">Julián León</div>
                  <div className="text-xs text-gray-500 mt-0.5">julianesteban@ejemplo.com</div>
                  <button className="text-xs text-blue-600 mt-1 hover:underline">Cambiar foto</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Nombre completo" value="Julián Esteban León Flórez" />
                <Campo label="Correo electrónico" value="julianesteban@ejemplo.com" />
                <Campo label="Universidad / Empresa" value="Universidad Distrital FJC" />
                <Campo label="País" value="Colombia" />
              </div>
              <button className="mt-4 text-sm bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">Guardar cambios</button>
            </Section>

            {/* Plan */}
            <Section titulo="Plan y facturación">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl mb-4">
                <div>
                  <div className="text-sm font-medium text-blue-800">Plan actual: Gratis</div>
                  <div className="text-xs text-blue-600 mt-0.5">3 módulos, 3 cálculos por día, sin PDF</div>
                </div>
                <a href="/precios" className="text-sm bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">Mejorar plan</a>
              </div>
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">Código de descuento</div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Ingresa tu código" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-blue-400" />
                  <button className="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900">Aplicar</button>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Historial de pagos</div>
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-4 text-center">No hay pagos registrados</div>
              </div>
            </Section>

            {/* Seguridad */}
            <Section titulo="Seguridad">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-800">Contraseña</div>
                    <div className="text-xs text-gray-500 mt-0.5">Última actualización hace 30 días</div>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline">Cambiar</button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-800">Sesión activa</div>
                    <div className="text-xs text-gray-500 mt-0.5">MacBook — Bogotá, Colombia</div>
                  </div>
                  <button className="text-xs text-red-500 hover:underline">Cerrar sesión</button>
                </div>
                <button className="text-xs text-red-500 hover:underline text-left">Cerrar sesión en todos los dispositivos</button>
              </div>
            </Section>

            {/* Preferencias */}
            <Section titulo="Preferencias">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Idioma</div>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                    <option>Español</option>
                    <option>English</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Sistema de unidades</div>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                    <option>SI (kN, m, kPa)</option>
                    <option>Métrico (kgf, cm, kgf/cm²)</option>
                    <option>Americano (kip, ft, psi)</option>
                  </select>
                </div>
              </div>
              <button className="mt-4 text-sm bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">Guardar preferencias</button>
            </Section>

            {/* Notificaciones */}
            <Section titulo="Notificaciones">
              <div className="flex flex-col gap-3">
                <Toggle label="Avisos de nuevos módulos" desc="Recibe un correo cuando se lance un nuevo módulo" />
                <Toggle label="Recordatorios de proyectos" desc="Notificaciones sobre proyectos guardados sin terminar" />
                <Toggle label="Novedades y actualizaciones" desc="Boletín mensual con nuevas funciones de NodoCalc" />
              </div>
            </Section>

          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="text-sm font-medium text-gray-800 mb-4">{titulo}</div>
      {children}
    </div>
  )
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <input type="text" defaultValue={value} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
    </div>
  )
}

function Toggle({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <div className="text-sm text-gray-800">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer flex-shrink-0">
        <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
      </div>
    </div>
  )
}