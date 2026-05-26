import { useEffect, useState } from "react";
import {
  LuLayoutDashboard,
  LuBuilding,
  LuFile,
  LuFileText,
  LuUserCheck,
  LuLogOut,
  LuSearch,
  LuDownload,
  LuFileCheck,
  LuFileX,
  LuClock3,
  LuCircleAlert,
  LuFilter,
} from "react-icons/lu";
import { useAuth } from "../contexts/AuthContext.jsx";
import api from "../api/apiClient";

export default function ReportsPage() {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    resumen: {
      total: 0,
      aprobados: 0,
      rechazados: 0,
      observados: 0,
      pendientes: 0,
    },
    porInstitucion: [],
    porEstado: [],
    porCoordinador: [],
    pendientesPorEstado: [],
    solicitudes: [],
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const displayName = user?.nombre || "Coordinación TCU";
  const displayEmail = user?.email || "coordinacion.tcu@ufide.ac.cr";

  const fetchReports = async () => {
    try {
      setLoading(true);

      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await api.get("/solicitudes/reportes", { params });
      setReportData(res.data);
    } catch (err) {
      console.error("Error cargando reportes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFilter = () => {
    fetchReports();
  };

  const handleExportCSV = () => {
    const rows = (reportData.solicitudes || []).map((s) => ({
      ID: s.id,
      Codigo: s.codigo_publico || "",
      Estudiante: s.estudiante_nombre || "",
      Institucion: s.institucion_nombre || "",
      Proyecto: s.titulo_proyecto || "",
      Estado: s.estado_normalizado || s.estado || "",
      Coordinador: s.assigned_to || "Sin asignar",
      FechaCreacion: formatDateForInput(s.created_at),
    }));

    exportToCSV(rows, "reporte_solicitudes_tcu.csv");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-white border-r border-slate-200 shadow-sm hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-[rgba(2,14,159,1)] flex items-center justify-center text-white font-bold mr-3">
            A
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              TCU Administración
            </p>
            <p className="text-sm font-semibold text-slate-800">
              Panel de control
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-sm">
          <SidebarItem
            icon={LuLayoutDashboard}
            label="Dashboard Solicitudes"
            href="/admin"
          />
          <SidebarItem
            icon={LuBuilding}
            label="Instituciones"
            href="/instituciones"
          />
          <SidebarItem
            icon={LuFileText}
            label="Reportes"
            href="/reportes"
            active
          />
          <SidebarItem
            icon={LuUserCheck}
            label="Coordinadores"
            href="/coordinadores"
          />
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            <LuLogOut className="text-lg" />
            Cerrar sesión
          </button>
        </div>

        <div className="p-4 border-t border-slate-200 text-[11px] text-slate-500">
          © {new Date().getFullYear()} Universidad Fidélitas
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Gestión de reportes TCU
            </p>
            <p className="text-sm md:text-base font-semibold text-slate-800">
              Reportes operativos y estadísticos
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-700">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-500">{displayEmail}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
              {getInitials(displayName)}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <SummaryCard
              title="Total TCU"
              value={reportData.resumen.total}
              color="blue"
              icon={<LuFile className="text-lg" />}
            />
            <SummaryCard
              title="Aprobados"
              value={reportData.resumen.aprobados}
              color="green"
              icon={<LuFileCheck className="text-lg" />}
            />
            <SummaryCard
              title="Rechazados"
              value={reportData.resumen.rechazados}
              color="red"
              icon={<LuFileX className="text-lg" />}
            />
            <SummaryCard
              title="Mejoras / Observados"
              value={reportData.resumen.observados}
              color="yellow"
              icon={<LuCircleAlert className="text-lg" />}
            />
            <SummaryCard
              title="Pendientes"
              value={reportData.resumen.pendientes}
              color="slate"
              icon={<LuClock3 className="text-lg" />}
            />
          </div>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <LuFilter className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Filtros
                </h2>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
                <div className="flex flex-col lg:flex-row gap-3 flex-1">
                  <div className="relative w-full lg:max-w-md">
                    <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar estudiante, proyecto, institución o código..."
                      className="w-full border border-slate-300 rounded-xl pl-10 pr-3 py-2 text-sm"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm w-full lg:w-56"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="Enviado">Enviado</option>
                    <option value="En Revisión">En Revisión</option>
                    <option value="Observado">Observado</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>

                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />

                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />

                  <button
                    onClick={handleFilter}
                    className="px-4 py-2 rounded-xl bg-[#ffd600] hover:bg-yellow-300 text-slate-900 text-sm font-semibold"
                  >
                    Aplicar filtros
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                  >
                    <LuDownload className="text-base" />
                    Exportar CSV
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ReportCard title="Cantidad de TCU por institución">
              <SimpleBarList
                items={reportData.porInstitucion.map((item) => ({
                  label: item.institucion,
                  value: item.cantidad,
                }))}
                emptyText="No hay datos."
              />
            </ReportCard>

            <ReportCard title="Cantidad de TCU por estado">
              <SimpleBarList
                items={reportData.porEstado.map((item) => ({
                  label: item.estado,
                  value: item.cantidad,
                }))}
                emptyText="No hay datos."
              />
            </ReportCard>

            <ReportCard title="Atención por coordinador">
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-3 text-left">Coordinador</th>
                      <th className="p-3 text-left">Revisadas</th>
                      <th className="p-3 text-left">Aprobadas</th>
                      <th className="p-3 text-left">Rechazadas</th>
                      <th className="p-3 text-left">Observadas</th>
                      <th className="p-3 text-left">Pendientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.porCoordinador.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-6 text-center text-slate-500"
                        >
                          No hay registros.
                        </td>
                      </tr>
                    ) : (
                      reportData.porCoordinador.map((item, idx) => (
                        <tr
                          key={`${item.coordinador_email || "sin"}-${idx}`}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="p-3 font-medium text-slate-800">
                            {item.coordinador_nombre}
                          </td>
                          <td className="p-3">{item.revisadas}</td>
                          <td className="p-3">{item.aprobadas}</td>
                          <td className="p-3">{item.rechazadas}</td>
                          <td className="p-3">{item.observadas}</td>
                          <td className="p-3">{item.pendientes}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </ReportCard>

            <ReportCard title="TCU pendientes por atender">
              <SimpleBarList
                items={reportData.pendientesPorEstado.map((item) => ({
                  label: item.estado,
                  value: item.cantidad,
                }))}
                emptyText="No hay pendientes."
              />
            </ReportCard>
          </div>

          <ReportCard title="Detalle de solicitudes">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3 text-left">Código</th>
                    <th className="p-3 text-left">Estudiante</th>
                    <th className="p-3 text-left">Institución</th>
                    <th className="p-3 text-left">Proyecto</th>
                    <th className="p-3 text-left">Estado</th>
                    <th className="p-3 text-left">Coordinador</th>
                    <th className="p-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-6 text-center text-slate-500"
                      >
                        Cargando reportes...
                      </td>
                    </tr>
                  ) : reportData.solicitudes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-6 text-center text-slate-500"
                      >
                        No se encontraron registros.
                      </td>
                    </tr>
                  ) : (
                    reportData.solicitudes.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="p-3 font-medium text-slate-800">
                          {item.codigo_publico || `#${item.id}`}
                        </td>
                        <td className="p-3">{item.estudiante_nombre || "-"}</td>
                        <td className="p-3">
                          {item.institucion_nombre || "-"}
                        </td>
                        <td className="p-3 max-w-[280px]">
                          <span className="line-clamp-2">
                            {item.titulo_proyecto || "-"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-[11px] font-semibold ${getStatusClass(
                              item.estado_normalizado || item.estado,
                            )}`}
                          >
                            {item.estado_normalizado || item.estado}
                          </span>
                        </td>
                        <td className="p-3">
                          {item.assigned_to || "Sin asignar"}
                        </td>
                        <td className="p-3">{formatDate(item.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ReportCard>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, href = "#", active = false }) {
  const base =
    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm transition-colors";
  const stateClasses = active
    ? "bg-[#1453DB] text-gray-200"
    : "text-slate-700 hover:bg-blue-200";

  return (
    <a href={href} className={`${base} ${stateClasses}`}>
      {Icon && <Icon className="text-lg" />}
      <span>{label}</span>
    </a>
  );
}

function SummaryCard({ title, value, color = "blue", icon }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    yellow: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

function ReportCard({ title, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function SimpleBarList({ items = [], emptyText = "Sin datos." }) {
  const max = Math.max(...items.map((i) => i.value), 0);

  if (!items.length) {
    return <div className="text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const width = max > 0 ? (item.value / max) * 100 : 0;

        return (
          <div key={`${item.label}-${index}`}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-sm font-medium text-slate-700">{item.label}</p>
              <p className="text-sm font-bold text-slate-900">{item.value}</p>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#020e9f]"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getInitials(nameOrEmail) {
  const text = String(nameOrEmail || "").trim();
  if (!text) return "RP";
  if (text.includes("@")) return text.slice(0, 2).toUpperCase();

  const parts = text.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getStatusClass(estado) {
  switch (estado) {
    case "Enviado":
    case "En Revisión":
      return "bg-blue-100 text-blue-700";
    case "Observado":
      return "bg-yellow-100 text-yellow-700";
    case "Aprobado":
      return "bg-green-100 text-green-700";
    case "Rechazado":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateForInput(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function exportToCSV(rows, filename = "reporte.csv") {
  if (!rows?.length) return;

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
