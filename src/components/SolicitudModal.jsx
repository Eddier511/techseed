import { useEffect, useMemo, useState } from "react";
import { LuX } from "react-icons/lu";
import api from "../api/apiClient";
import { useSolicitudes } from "../contexts/SolicitudContext";

const TABS = [
  { id: "estudiante", label: "Estudiante" },
  { id: "institucion", label: "Institución" },
  { id: "proyecto", label: "Proyecto" },
  { id: "objetivos", label: "Objetivos" },
  { id: "cronograma", label: "Cronograma" },
];

function Field({ label, value }) {
  return (
    <div className="text-xs md:text-sm text-slate-700">
      <span className="font-semibold">{label}: </span>
      {value ?? "—"}
    </div>
  );
}

function Box({ children }) {
  return (
    <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs md:text-sm text-slate-700">
      {children}
    </div>
  );
}

export default function SolicitudModal({
  isOpen,
  onClose,
  solicitudData,
  onApprove,
  onReject,
  onReturn,
  canManage = false,
}) {
  const { fetchSolicitudDetalle } = useSolicitudes();

  const [observation, setObservation] = useState("");
  const [activeTab, setActiveTab] = useState("estudiante");

  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState("");

  const [institucionDetalle, setInstitucionDetalle] = useState(null);

  const [editableFlags, setEditableFlags] = useState({
    institucion: false,
    proyecto: false,
    objetivos: false,
    cronograma: false,
  });

  const canRender = isOpen && !!solicitudData;
  const internalId = solicitudData?._raw?.id ?? solicitudData?.id;

  useEffect(() => {
    if (!canRender) return;

    setObservation("");
    setActiveTab("estudiante");
    setErrorDetalle("");
    setEditableFlags({
      institucion: false,
      proyecto: false,
      objetivos: false,
      cronograma: false,
    });
  }, [canRender]);

  useEffect(() => {
    const loadDetalle = async () => {
      if (!canRender || !internalId) return;

      setLoadingDetalle(true);
      setErrorDetalle("");

      try {
        const ui = await fetchSolicitudDetalle(internalId);
        setDetalle(ui || null);

        const rf =
          ui?._rawDetalle?.revision_flags || ui?.revision_flags || null;

        if (rf) {
          setEditableFlags({
            institucion: !!rf.institucion_editable,
            proyecto: !!rf.proyecto_editable,
            objetivos: !!rf.objetivos_editable,
            cronograma: !!rf.cronograma_editable,
          });

          if (rf.comentario_revisor) {
            setObservation(rf.comentario_revisor);
          }
        }
      } catch (e) {
        console.error("Error cargando detalle:", e);
        setErrorDetalle(
          "No se pudo cargar el detalle completo. Se mostrará la información disponible.",
        );
        setDetalle(null);
      } finally {
        setLoadingDetalle(false);
      }
    };

    loadDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRender, internalId]);

  useEffect(() => {
    const loadInstitucion = async () => {
      if (!canRender) return;

      const s = detalle || solicitudData;
      const institucionId = s?.institucion_id || s?.formData?.institucion_id;

      if (!institucionId) {
        setInstitucionDetalle(null);
        return;
      }

      try {
        const res = await api.get("/instituciones");
        const list = Array.isArray(res.data) ? res.data : [];
        const found = list.find((x) => String(x.id) === String(institucionId));
        setInstitucionDetalle(found || null);
      } catch (e) {
        console.warn("No se pudo cargar instituciones:", e);
        setInstitucionDetalle(null);
      }
    };

    loadInstitucion();
  }, [canRender, detalle, solicitudData]);

  const s = detalle || solicitudData || {};
  const legacyForm = s.formData || {};

  const objetivosItems = useMemo(() => {
    const arr =
      (Array.isArray(s.objetivosEspecificosItems) &&
        s.objetivosEspecificosItems) ||
      (Array.isArray(legacyForm.objetivosEspecificosItems) &&
        legacyForm.objetivosEspecificosItems) ||
      [];

    if (arr.length) {
      return arr.map((x) => String(x || "").trim()).filter(Boolean);
    }

    const legacyText =
      legacyForm.objetivosEspecificos ||
      s.objetivos_especificos ||
      s.objetivosEspecificos ||
      "";

    return String(legacyText)
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [s, legacyForm]);

  const cronogramaItems = useMemo(() => {
    const arr =
      (Array.isArray(s.cronogramaItems) && s.cronogramaItems) ||
      (Array.isArray(legacyForm.cronogramaItems) &&
        legacyForm.cronogramaItems) ||
      [];

    return arr
      .map((r) => ({
        actividad: String(r?.actividad || "").trim(),
        tarea: String(r?.tarea || "").trim(),
        horas: r?.horas ?? "",
      }))
      .filter((r) => r.actividad || r.tarea || String(r.horas).trim() !== "");
  }, [s, legacyForm]);

  if (!canRender) return null;

  const status = s.status || s.estado || "Enviado";

  const nombre = legacyForm.nombre || s.estudiante_nombre || "";
  const cedula = legacyForm.cedula || s.estudiante_cedula || "";
  const carrera = legacyForm.carrera || s.carrera || "";
  const sede = legacyForm.sede || s.sede || "";
  const estudiante_email =
    legacyForm.estudiante_email || s.estudiante_email || "";
  const estudiante_phone =
    legacyForm.estudiante_phone || s.estudiante_phone || "";
  const oficio = legacyForm.oficio || s.oficio || "";
  const estado_civil = legacyForm.estado_civil || s.estado_civil || "";
  const domicilio = legacyForm.domicilio || s.domicilio || "";
  const lugar_trabajo = legacyForm.lugar_trabajo || s.lugar_trabajo || "";

  const institucionNombre =
    legacyForm.institucion || s.institucion_nombre || "";

  const tituloProyecto =
    legacyForm.tituloProyecto || s.tituloProyecto || s.titulo_proyecto || "";

  const justificacion =
    legacyForm.justificacion || s.descripcion_problema || s.justificacion || "";

  const objetivoGeneral =
    legacyForm.objetivoGeneral || s.objetivo_general || "";

  const beneficiarios =
    legacyForm.beneficiarios || s.beneficiario || s.beneficiarios || "";

  const estrategiaSolucion =
    legacyForm.estrategiaSolucion ||
    s.estrategiaSolucion ||
    s.estrategia_solucion ||
    "";

  const handleReturnClick = () => {
    if (!canManage) return;

    if (!observation.trim()) {
      alert("Por favor, escriba una observación para devolver la solicitud.");
      return;
    }

    if (
      !editableFlags.institucion &&
      !editableFlags.proyecto &&
      !editableFlags.objetivos &&
      !editableFlags.cronograma
    ) {
      alert(
        "Debes marcar al menos una sección para habilitar edición al estudiante.",
      );
      return;
    }

    onReturn({
      observation: observation.trim(),
      editableFlags: {
        institucion: editableFlags.institucion,
        proyecto: editableFlags.proyecto,
        objetivos: editableFlags.objetivos,
        cronograma: editableFlags.cronograma,
      },
    });
  };

  const handleApproveClick = () => {
    if (!canManage) return;
    onApprove(observation.trim() || "Aprobado sin comentarios.");
  };

  const handleRejectClick = () => {
    if (!canManage) return;
    if (!observation.trim()) {
      alert("Por favor, justifique el rechazo en las observaciones.");
      return;
    }
    onReject(observation.trim());
  };

  const isEditableStatus =
    status === "Enviado" ||
    status === "Observado" ||
    status === "En Revisión" ||
    status === "Open";

  const statusColor =
    status === "Aprobado" || status === "Closed"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Rechazado"
        ? "bg-red-100 text-red-700"
        : status === "Observado"
          ? "bg-amber-100 text-amber-700"
          : "bg-blue-100 text-blue-700";

  const canEditObservation = canManage && isEditableStatus;
  const showActions = canManage && isEditableStatus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 md:p-4">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-200 bg-slate-50">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Revisión de anteproyecto
            </p>
            <h3 className="text-xl font-semibold text-slate-900">
              Solicitud #{internalId}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}
            >
              {status}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"
            >
              <LuX size={20} />
            </button>
          </div>
        </div>

        <div className="px-7 pt-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={[
                    "px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border transition",
                    active
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {(loadingDetalle || errorDetalle) && (
            <div className="mt-3">
              {loadingDetalle && (
                <p className="text-xs text-slate-500">
                  Cargando detalle completo del anteproyecto...
                </p>
              )}
              {errorDetalle && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  {errorDetalle}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-7 py-5 space-y-5 max-h-[62vh] overflow-y-auto">
          {activeTab === "estudiante" && (
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">
                Datos del estudiante
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Nombre" value={nombre || "—"} />
                <Field label="Cédula" value={cedula || "—"} />
                <Field label="Carrera" value={carrera || "—"} />
                <Field label="Sede" value={sede || "—"} />
                <Field label="Correo" value={estudiante_email || "—"} />
                <Field label="Teléfono" value={estudiante_phone || "—"} />
                <Field label="Oficio" value={oficio || "—"} />
                <Field label="Estado civil" value={estado_civil || "—"} />
                <Field label="Domicilio" value={domicilio || "—"} />
                <Field label="Lugar de trabajo" value={lugar_trabajo || "—"} />
              </div>
            </section>
          )}

          {activeTab === "institucion" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  Institución
                </h4>

                {canManage && isEditableStatus && (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={editableFlags.institucion}
                      onChange={(e) =>
                        setEditableFlags((prev) => ({
                          ...prev,
                          institucion: e.target.checked,
                        }))
                      }
                    />
                    Habilitar corrección
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nombre" value={institucionNombre || "—"} />
                <Field
                  label="Cédula jurídica"
                  value={institucionDetalle?.cedula_juridica || "—"}
                />
                <Field
                  label="Supervisor"
                  value={institucionDetalle?.supervisor_nombre || "—"}
                />
                <Field
                  label="Cargo"
                  value={institucionDetalle?.supervisor_cargo || "—"}
                />
                <Field
                  label="Correo supervisor"
                  value={institucionDetalle?.supervisor_email || "—"}
                />
                <Field
                  label="Tipo de servicio"
                  value={institucionDetalle?.tipo_servicio || "—"}
                />
                <Field
                  label="Estado institución"
                  value={institucionDetalle?.estado || "—"}
                />
              </div>

              {!institucionDetalle && (
                <p className="text-xs text-slate-500">
                  No se encontró detalle extra de la institución.
                </p>
              )}
            </section>
          )}

          {activeTab === "proyecto" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  Proyecto
                </h4>

                {canManage && isEditableStatus && (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={editableFlags.proyecto}
                      onChange={(e) =>
                        setEditableFlags((prev) => ({
                          ...prev,
                          proyecto: e.target.checked,
                        }))
                      }
                    />
                    Habilitar corrección
                  </label>
                )}
              </div>

              <div>
                <p className="font-semibold mb-1 text-xs md:text-sm">
                  Título del proyecto
                </p>
                <Box>{tituloProyecto || "Sin título registrado."}</Box>
              </div>

              <div>
                <p className="font-semibold mb-1 text-xs md:text-sm">
                  Descripción del problema / Justificación
                </p>
                <Box>{justificacion || "Sin justificación registrada."}</Box>
              </div>

              <div>
                <p className="font-semibold mb-1 text-xs md:text-sm">
                  ¿A quién se beneficiará el proyecto?
                </p>
                <Box>{beneficiarios || "Sin beneficiarios registrados."}</Box>
              </div>

              <div>
                <p className="font-semibold mb-1 text-xs md:text-sm">
                  Estrategia y pertinencia de solución
                </p>
                <Box>
                  {estrategiaSolucion ||
                    "Sin estrategia de solución registrada."}
                </Box>
              </div>
            </section>
          )}

          {activeTab === "objetivos" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  Objetivos
                </h4>

                {canManage && isEditableStatus && (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={editableFlags.objetivos}
                      onChange={(e) =>
                        setEditableFlags((prev) => ({
                          ...prev,
                          objetivos: e.target.checked,
                        }))
                      }
                    />
                    Habilitar corrección
                  </label>
                )}
              </div>

              <div>
                <p className="font-semibold mb-1 text-xs md:text-sm">
                  Objetivo general
                </p>
                <Box>
                  {objetivoGeneral || "Sin objetivo general registrado."}
                </Box>
              </div>

              <div>
                <p className="font-semibold mb-2 text-xs md:text-sm">
                  Objetivos específicos
                </p>

                {objetivosItems.length ? (
                  <div className="space-y-2">
                    {objetivosItems.map((obj, idx) => (
                      <Box key={idx}>
                        <span className="font-semibold">{idx + 1}.</span> {obj}
                      </Box>
                    ))}
                  </div>
                ) : (
                  <Box>Sin objetivos específicos registrados.</Box>
                )}
              </div>
            </section>
          )}

          {activeTab === "cronograma" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  Cronograma
                </h4>

                {canManage && isEditableStatus && (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={editableFlags.cronograma}
                      onChange={(e) =>
                        setEditableFlags((prev) => ({
                          ...prev,
                          cronograma: e.target.checked,
                        }))
                      }
                    />
                    Habilitar corrección
                  </label>
                )}
              </div>

              {cronogramaItems.length ? (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="min-w-full text-xs md:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-left text-slate-600">
                        <th className="px-4 py-3 font-semibold">#</th>
                        <th className="px-4 py-3 font-semibold">Actividad</th>
                        <th className="px-4 py-3 font-semibold">Tarea</th>
                        <th className="px-4 py-3 font-semibold">Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cronogramaItems.map((r, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-200 last:border-b-0"
                        >
                          <td className="px-4 py-3 text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3">{r.actividad || "—"}</td>
                          <td className="px-4 py-3">{r.tarea || "—"}</td>
                          <td className="px-4 py-3">{r.horas ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Box>Sin cronograma registrado.</Box>
              )}
            </section>
          )}

          <section className="pt-1">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">
              Observaciones del revisor
            </h4>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(2,14,159,1)] focus:border-[rgba(2,14,159,1)]"
              rows={4}
              placeholder="Escribir observaciones para el estudiante..."
              readOnly={!canEditObservation}
            />

            {!canManage && (
              <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                Esta solicitud está en modo lectura. Solo el coordinador
                asignado puede gestionarla.
              </p>
            )}

            {canManage && !isEditableStatus && (
              <p className="mt-1 text-[11px] text-slate-500">
                Esta solicitud ya fue cerrada. Las observaciones no se pueden
                editar.
              </p>
            )}
          </section>
        </div>

        <div className="flex justify-between items-center px-7 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs md:text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
          >
            Cerrar
          </button>

          {showActions && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleReturnClick}
                className="px-4 py-2 text-xs md:text-sm font-semibold text-amber-800 bg-amber-100 rounded-xl hover:bg-amber-200"
              >
                Devolver con observaciones
              </button>
              <button
                onClick={handleRejectClick}
                className="px-4 py-2 text-xs md:text-sm font-semibold text-red-800 bg-red-100 rounded-xl hover:bg-red-200"
              >
                Rechazar
              </button>
              <button
                onClick={handleApproveClick}
                className="px-4 py-2 text-xs md:text-sm font-semibold text-white rounded-xl shadow-sm bg-emerald-600 hover:bg-emerald-700"
              >
                Aprobar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
