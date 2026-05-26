import { useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
  });

  const toggle = (key) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h1 className="text-lg font-semibold text-slate-900">
            Configuración
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantalla base (luego conectamos opciones reales).
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Notificaciones
              </p>
              <p className="text-xs text-slate-600">
                Activar o desactivar avisos del sistema.
              </p>
            </div>
            <button
              onClick={() => toggle("notifications")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                settings.notifications
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {settings.notifications ? "Activadas" : "Desactivadas"}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Modo oscuro
              </p>
              <p className="text-xs text-slate-600">
                (Placeholder) Cambiar tema visual.
              </p>
            </div>
            <button
              onClick={() => toggle("darkMode")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                settings.darkMode
                  ? "bg-slate-900 text-white hover:bg-black"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {settings.darkMode ? "Activo" : "Inactivo"}
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Nota: estas opciones son de ejemplo. Se conectarán a base de datos o
            configuración real más adelante.
          </p>
        </div>
      </div>
    </div>
  );
}
