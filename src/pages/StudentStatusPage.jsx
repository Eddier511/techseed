import { useMemo } from "react";
import {
  LuCheck,
  LuClipboardList,
  LuSend,
  LuSearch,
  LuBadgeCheck,
  LuInfo,
} from "react-icons/lu";

const timelineSteps = [
  {
    id: 1,
    name: "Registro completado",
    icon: LuClipboardList,
  },
  {
    id: 2,
    name: "Enviado",
    icon: LuSend,
  },
  {
    id: 3,
    name: "En revisión",
    icon: LuSearch,
  },
  {
    id: 4,
    name: "Observado",
    icon: LuInfo,
  },
  {
    id: 5,
    name: "Aprobado",
    icon: LuBadgeCheck,
  },
];

const getActiveStepIndex = (status) => {
  if (status === "Aprobado") return 5;
  if (status === "Observado") return 4;
  if (status === "En Revisión") return 3;
  if (status === "Enviado") return 2;
  return 1;
};

export default function StudentStatusPage({ solicitud }) {
  const status = solicitud?.status || solicitud?.estado || "Enviado";
  const activeStep = getActiveStepIndex(status);

  const { nombre, carrera, institucion, tituloProyecto, objetivoGeneral } =
    solicitud.formData || {};

  const assignedTo = solicitud.assigned_to;
  const due = solicitud.due;

  const statusColor =
    status === "Aprobado"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Rechazado"
        ? "bg-red-100 text-red-700"
        : status === "Observado"
          ? "bg-amber-100 text-amber-700"
          : status === "En Revisión"
            ? "bg-indigo-100 text-indigo-700"
            : "bg-blue-100 text-blue-700";

  const historyRaw = Array.isArray(solicitud.history) ? solicitud.history : [];

  const history = historyRaw.length
    ? [...historyRaw].sort((a, b) => {
        const da = new Date(a.date || a.fecha || a.created_at || 0).getTime();
        const db = new Date(b.date || b.fecha || b.created_at || 0).getTime();
        return db - da;
      })
    : [];

  const approvalCode = useMemo(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      const idx = Math.floor(Math.random() * chars.length);
      code += chars[idx];
    }
    return code;
  }, [solicitud.id, status]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* HEADER */}
      <div className="p-6 md:p-7 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Seguimiento de anteproyecto
            </p>

            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              Estado de tu solicitud
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {nombre && (
                <span className="px-2.5 py-1 rounded-full bg-slate-100 font-medium">
                  👤 {nombre}
                </span>
              )}
              {carrera && (
                <span className="px-2.5 py-1 rounded-full bg-slate-100">
                  🎓 {carrera}
                </span>
              )}
              {institucion && (
                <span className="px-2.5 py-1 rounded-full bg-slate-100">
                  🏢 {institucion}
                </span>
              )}
              {assignedTo && (
                <span className="px-2.5 py-1 rounded-full bg-slate-100">
                  🧑‍🏫 Revisor: {assignedTo}
                </span>
              )}
              {due && (
                <span className="px-2.5 py-1 rounded-full bg-slate-100">
                  ⏰ Vencimiento:{" "}
                  {new Date(due).toLocaleDateString("es-CR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}
            >
              Estado: {status}
            </span>
            <p className="text-[11px] text-slate-500 max-w-xs text-right">
              Desde este panel puedes consultar en qué estado se encuentra tu
              anteproyecto y revisar la bitácora de cambios realizada por el
              sistema o la coordinación.
            </p>
          </div>
        </div>

        {/* TIMELINE */}
        <nav className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {timelineSteps.map((step, index) => {
            const stepIndex = index + 1;
            const isCompleted = stepIndex < activeStep;
            const isActive = stepIndex === activeStep;
            const isWarning =
              status === "Observado" && step.name === "Observado";

            return (
              <div
                key={step.id}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-sm border
                    ${isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : ""}
                    ${
                      isActive && !isWarning
                        ? "bg-[rgba(2,14,159,1)] border-[rgba(2,14,159,1)] text-white"
                        : ""
                    }
                    ${
                      isWarning
                        ? "bg-amber-500 border-amber-500 text-white animate-pulse"
                        : ""
                    }
                    ${
                      !isCompleted && !isActive && !isWarning
                        ? "bg-white border-slate-200 text-slate-500"
                        : ""
                    }`}
                >
                  {isCompleted ? (
                    <LuCheck />
                  ) : isWarning ? (
                    <LuInfo />
                  ) : (
                    <step.icon />
                  )}
                </div>

                <p
                  className={`mt-2 text-[11px] sm:text-xs font-semibold leading-tight
                    ${isActive ? "text-[rgba(2,14,159,1)]" : "text-slate-500"}`}
                >
                  {step.name}
                </p>
              </div>
            );
          })}
        </nav>

        {status === "Observado" && (
          <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 flex gap-3 text-sm">
            <span className="mt-0.5">
              <LuInfo />
            </span>
            <div>
              <p className="font-bold mb-1">
                Tu solicitud presenta observaciones.
              </p>
              <p className="text-xs sm:text-sm">
                Revisa la bitácora para ver los comentarios registrados por la
                coordinación y realizar los ajustes correspondientes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* TARJETA APROBACIÓN */}
      {status === "Aprobado" && (
        <div className="px-6 md:px-8 pt-4">
          <div className="bg-white border border-emerald-200 rounded-2xl shadow-sm p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                Comprobante de aprobación
              </p>

              <h2 className="text-sm md:text-base font-bold text-slate-900 mt-1">
                Trabajo Comunal Universitario – Aprobado
              </h2>

              <div className="mt-2 text-xs text-slate-700 space-y-1">
                <p>
                  <span className="font-semibold">Estudiante:</span>{" "}
                  {nombre || "—"}
                </p>
                <p>
                  <span className="font-semibold">Título del proyecto:</span>{" "}
                  {tituloProyecto || "Sin título registrado"}
                </p>
                <p>
                  <span className="font-semibold">Objetivo general:</span>{" "}
                  {objetivoGeneral || "Sin objetivo registrado"}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-emerald-700">
                    Estado:
                  </span>{" "}
                  Aprobado por la coordinación de TCU.
                </p>
              </div>

              <div className="mt-3">
                <p className="text-[11px] uppercase font-semibold text-slate-500">
                  Código de aprobación
                </p>
                <p className="mt-1 inline-block font-mono text-lg tracking-[0.35em] bg-slate-900 text-white px-3 py-2 rounded-lg">
                  {approvalCode}
                </p>
              </div>
            </div>

            <div className="flex md:flex-col items-end md:items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-[rgba(2,14,159,1)] text-white shadow-sm hover:bg-indigo-900"
              >
                Descargar documento
              </button>

              <p className="text-[10px] text-gray-800 font-semibold max-w-[220px] text-right md:text-center border border-[#ffd600] rounded-lg p-2">
                Este documento debe ser subido al sistema universitario para
                continuar con el proceso.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BITÁCORA */}
      <div className="p-6 md:p-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Historial y bitácora de cambios
        </h3>

        <p className="text-xs text-slate-500 mb-4">
          Aquí se registran las acciones realizadas sobre tu anteproyecto:
          envíos, revisiones, observaciones y aprobaciones.
        </p>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">
                    Fecha
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-600">
                    Acción
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-600">
                    Usuario
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-600">
                    Observación
                  </th>
                </tr>
              </thead>

              <tbody>
                {history.length > 0 ? (
                  history.map((entry, index) => {
                    const fecha =
                      entry.date || entry.fecha || entry.created_at || null;
                    const accion = entry.action || entry.accion || "-";
                    const usuario = entry.user || entry.usuario || "-";
                    const mensaje =
                      entry.message || entry.mensaje || "Sin observaciones";

                    return (
                      <tr
                        key={index}
                        className="border-t border-slate-200 hover:bg-slate-50"
                      >
                        <td className="p-3 text-slate-700 whitespace-nowrap align-top">
                          {fecha
                            ? new Date(fecha).toLocaleDateString("es-CR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "-"}
                        </td>
                        <td className="p-3 text-slate-800 font-medium align-top">
                          {accion}
                        </td>
                        <td className="p-3 text-slate-700 align-top">
                          {usuario}
                        </td>
                        <td className="p-3 text-slate-700 align-top">
                          {mensaje}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      Aún no hay movimientos registrados en la bitácora para
                      esta solicitud.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
