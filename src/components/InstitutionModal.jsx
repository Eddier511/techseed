import { useEffect, useState } from "react";
import { LuX } from "react-icons/lu";

const initialForm = {
  nombre: "",
  cedula_juridica: "",
  supervisor_nombre: "",
  supervisor_cargo: "",
  supervisor_email: "",
  contacto_email: "",
  tipo_servicio: "",
  estado: "Aprobada",
};

export default function InstitutionModal({
  isOpen,
  onClose,
  onSave,
  institutionData,
}) {
  const [form, setForm] = useState(initialForm);

  const isEditMode = !!institutionData;

  useEffect(() => {
    if (!isOpen) return;

    if (institutionData) {
      setForm({
        nombre: institutionData.nombre || "",
        cedula_juridica: institutionData.cedula_juridica || "",
        supervisor_nombre: institutionData.supervisor_nombre || "",
        supervisor_cargo: institutionData.supervisor_cargo || "",
        supervisor_email: institutionData.supervisor_email || "",
        contacto_email: institutionData.contacto_email || "",
        tipo_servicio: institutionData.tipo_servicio || "",
        estado: institutionData.estado || "Pendiente",
      });
    } else {
      setForm(initialForm);
    }
  }, [isOpen, institutionData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form, institutionData ? institutionData.id : null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {isEditMode ? "Institución registrada" : "Nueva institución TCU"}
            </p>
            <h3 className="text-lg font-semibold text-slate-900">
              {isEditMode
                ? "Ver / editar institución"
                : "Registrar nueva institución"}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"
          >
            <LuX size={20} />
          </button>
        </div>

        <form
          id="institution-form"
          onSubmit={handleSubmit}
          className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de la institución
            </label>
            <input
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(2,14,159,1)] focus:border-[rgba(2,14,159,1)]"
              placeholder="Ej: Hogar de Ancianos Luz y Vida"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cédula jurídica
              </label>
              <input
                name="cedula_juridica"
                type="text"
                value={form.cedula_juridica}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(2,14,159,1)] focus:border-[rgba(2,14,159,1)]"
                placeholder="Ej: 3-101-999999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de servicio
              </label>
              <input
                name="tipo_servicio"
                type="text"
                value={form.tipo_servicio}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(2,14,159,1)] focus:border-[rgba(2,14,159,1)]"
                placeholder="Ej: Adulto mayor, Educación, ONG..."
              />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800 mb-3">
              Información del supervisor
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del supervisor
                </label>
                <input
                  name="supervisor_nombre"
                  type="text"
                  value={form.supervisor_nombre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="Ej: Ana Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cargo del supervisor
                </label>
                <input
                  name="supervisor_cargo"
                  type="text"
                  value={form.supervisor_cargo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="Ej: Coordinadora TCU"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Correo del supervisor
                </label>
                <input
                  name="supervisor_email"
                  type="email"
                  value={form.supervisor_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="Ej: ana@institucion.org"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Correo de contacto general
                </label>
                <input
                  name="contacto_email"
                  type="email"
                  value={form.contacto_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="Ej: contacto@institucion.org"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Estado
            </label>
            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            >
              <option value="Aprobada">Aprobada / Habilitada</option>
              <option value="Deshabilitada">Deshabilitada</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Rechazada">Rechazada</option>
            </select>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600">
            En el portal del estudiante deben mostrarse únicamente las
            instituciones habilitadas. Puedes controlar eso dejando la
            institución en estado
            <b> Aprobada</b> y ocultarla poniendo <b>Deshabilitada</b>.
          </div>
        </form>

        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs md:text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="institution-form"
            className="px-5 py-2 text-xs md:text-sm font-semibold text-white rounded-xl shadow-sm bg-[rgba(2,14,159,1)] hover:bg-indigo-900"
          >
            {isEditMode ? "Actualizar institución" : "Guardar institución"}
          </button>
        </div>
      </div>
    </div>
  );
}
