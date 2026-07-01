import { useEffect, useMemo, useState } from "react";
import {
  LuLayoutDashboard,
  LuTicket,
  LuFile,
  LuUsers,
  LuFileText,
  LuUserCheck,
  LuEye,
  LuHand,
  LuArrowRightLeft,
  LuLogOut,
  LuBuilding,
  LuX,
} from "react-icons/lu";
import { toast } from "sonner";
import { useSolicitudes } from "../contexts/SolicitudContext";
import { useAuth } from "../contexts/AuthContext.jsx";
import api from "../api/apiClient";
import SolicitudModal from "../components/SolicitudModal";

export default function AdminDashboard() {
  const {
    solicitudes,
    loading,
    fetchAllSolicitudes,
    updateSolicitudStatus,
    returnSolicitudWithFlags,
    takeSolicitud,
    delegateSolicitud,
  } = useSolicitudes();

  const { user, logout } = useAuth();

  const myEmail = useMemo(() => getMyEmail(), []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);

  const [coordinators, setCoordinators] = useState([]);
  const [loadingCoords, setLoadingCoords] = useState(false);

  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [delegateTicket, setDelegateTicket] = useState(null);

  // ====== FILTROS ======
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("all");

  useEffect(() => {
    fetchAllSolicitudes().catch((err) =>
      console.error("Error cargando solicitudes:", err),
    );
  }, []);

  useEffect(() => {
    const loadCoordinators = async () => {
      setLoadingCoords(true);
      try {
        const res = await api.get("/user/coords/list");
        setCoordinators(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error cargando coordinadores:", err);
      } finally {
        setLoadingCoords(false);
      }
    };

    loadCoordinators();
  }, []);

  const openModal = (solicitud) => {
    setSelectedSolicitud(solicitud);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedSolicitud(null);
    setIsModalOpen(false);
  };

  const openDelegateModal = (ticket) => {
    setDelegateTicket(ticket);
    setDelegateModalOpen(true);
  };

  const closeDelegateModal = () => {
    setDelegateTicket(null);
    setDelegateModalOpen(false);
  };

  const handleApprove = async (observation) => {
    if (!selectedSolicitud || !selectedSolicitud._raw) return;
    const updated = await updateSolicitudStatus(
      selectedSolicitud._raw.id,
      "Aprobado",
      observation,
    );
    toast.success(
      updated?.codigo_aprobacion
        ? `TCU aprobado. Código de aprobación: ${updated.codigo_aprobacion}`
        : "TCU aprobado correctamente.",
    );
    closeModal();
    await fetchAllSolicitudes();
  };

  const handleReject = async (observation) => {
    if (!selectedSolicitud || !selectedSolicitud._raw) return;
    await updateSolicitudStatus(
      selectedSolicitud._raw.id,
      "Rechazado",
      observation,
    );
    closeModal();
    await fetchAllSolicitudes();
  };

  const handleReturn = async (payload) => {
    if (!selectedSolicitud || !selectedSolicitud._raw) return;

    try {
      await returnSolicitudWithFlags(selectedSolicitud._raw.id, payload);
      closeModal();
      await fetchAllSolicitudes();
      toast.success("Solicitud devuelta con observaciones.");
    } catch (err) {
      console.error("Error devolviendo solicitud:", err);
      toast.error("No se pudo devolver la solicitud.");
    }
  };

  const handleTake = async (idInterno) => {
    const tId = toast.loading("Asignando caso...");
    try {
      await takeSolicitud(idInterno);
      toast.success("Caso asignado correctamente.", { id: tId });
      await fetchAllSolicitudes();
    } catch (err) {
      console.error("Error tomando solicitud:", err);
      toast.error("No se pudo asignar el caso.", { id: tId });
    }
  };

  const handleDelegate = async (ticket, newEmail) => {
    if (!newEmail) return;

    if (
      !ticket.assigned_to ||
      String(ticket.assigned_to).toLowerCase() !== String(myEmail).toLowerCase()
    ) {
      toast.error("Solo el coordinador asignado puede delegar este caso.");
      return;
    }

    const tId = toast.loading("Delegando caso...");
    try {
      await delegateSolicitud(ticket._raw.id, newEmail);
      toast.success("Caso delegado correctamente.", { id: tId });
      closeDelegateModal();
      await fetchAllSolicitudes();
    } catch (err) {
      console.error("Error delegando solicitud:", err);
      toast.error("No se pudo delegar el caso.", { id: tId });
    }
  };

  const getStatusClass = (estado) => {
    switch (estado) {
      case "Enviado":
      case "En Revisión":
      case "Open":
        return "bg-blue-100 text-blue-700";
      case "Observado":
        return "bg-yellow-100 text-yellow-700";
      case "Aprobado":
      case "Closed":
        return "bg-green-100 text-green-700";
      case "Rechazado":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityClass = (prio) => {
    switch (prio) {
      case "High":
        return "bg-red-100 text-red-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      case "Low":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getAssignedClass = (assigned_to) => {
    if (!assigned_to) return "bg-slate-100 text-slate-700";
    return "bg-purple-100 text-purple-700";
  };

  const formatDue = (due) => {
    if (!due) return "-";
    const d = new Date(due);
    if (Number.isNaN(d.getTime())) return due;
    return d.toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getCoordinatorNameByEmail = (email) => {
    if (!email) return "Sin asignar";
    const found = coordinators.find(
      (c) => String(c.email).toLowerCase() === String(email).toLowerCase(),
    );
    return found?.nombre || email;
  };

  const getCoordinatorInitials = (nameOrEmail) => {
    const text = String(nameOrEmail || "").trim();
    if (!text) return "AD";

    if (text.includes("@")) {
      return text.slice(0, 2).toUpperCase();
    }

    const parts = text.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };

  const filteredSolicitudes = solicitudes.filter((s) => {
    const searchText = search.toLowerCase();

    const idStr = String(s.id || "");
    const reqStr = String(s.req || "");
    const subjStr = String(s.subj || "");

    const matchesSearch =
      !searchText ||
      idStr.toLowerCase().includes(searchText) ||
      reqStr.toLowerCase().includes(searchText) ||
      subjStr.toLowerCase().includes(searchText);

    const matchesPriority =
      priorityFilter === "all" || s.prio === priorityFilter;

    const matchesStatus = statusFilter === "all" || s.status === statusFilter;

    const due = s.due;
    const matchesFromDate = !fromDate || (due && due >= fromDate);
    const matchesToDate = !toDate || (due && due <= toDate);

    const matchesAssigned =
      assignedFilter === "all" ||
      (assignedFilter === "unassigned" && !s.assigned_to) ||
      (assignedFilter === "assigned" && !!s.assigned_to);

    return (
      matchesSearch &&
      matchesPriority &&
      matchesStatus &&
      matchesFromDate &&
      matchesToDate &&
      matchesAssigned
    );
  });

  const total = solicitudes.length;
  const pendientes = solicitudes.filter(
    (s) =>
      s.status === "Enviado" ||
      s.status === "En Revisión" ||
      s.status === "Observado" ||
      s.status === "Open",
  ).length;
  const aprobadas = solicitudes.filter((s) => s.status === "Aprobado").length;
  const rechazadas = solicitudes.filter((s) => s.status === "Rechazado").length;

  const coordinatorDisplayName = user?.nombre || "Coordinador TCU";
  const coordinatorDisplayEmail =
    user?.role === "COORD"
      ? user?.email || "coordinacion.tcu@ufide.ac.cr"
      : user?.email || "sistemas@ufide.ac.cr";

  return (
    <>
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
              active
            />
            <SidebarItem
              icon={LuBuilding}
              label="Instituciones"
              href="/instituciones"
            />
            <SidebarItem icon={LuFileText} label="Reportes" href="/reportes" />
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
                Panel administrativo
              </p>
              <p className="text-sm md:text-base font-semibold text-slate-800">
                Bandeja de solicitudes TCU
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-700">
                  {coordinatorDisplayName}
                </p>
                <p className="text-[11px] text-slate-500">
                  {coordinatorDisplayEmail}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                {getCoordinatorInitials(coordinatorDisplayName)}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="Total solicitudes"
                value={total}
                color="blue"
              />
              <SummaryCard
                title="Pendientes"
                value={pendientes}
                color="yellow"
              />
              <SummaryCard title="Aprobadas" value={aprobadas} color="green" />
              <SummaryCard title="Rechazadas" value={rechazadas} color="red" />
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Solicitudes recibidas
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Filtra por estudiante, estado, prioridad o rango de fechas.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    placeholder="Buscar por ID, estudiante o asunto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full md:w-80"
                  />

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-[200px]"
                  >
                    <option value="all">Todas las prioridades</option>
                    <option value="High">Alta</option>
                    <option value="Medium">Media</option>
                    <option value="Low">Baja</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-[190px]"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="Enviado">Enviado</option>
                    <option value="En Revisión">En Revisión</option>
                    <option value="Observado">Observado</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>

                  <select
                    value={assignedFilter}
                    onChange={(e) => setAssignedFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-[170px]"
                  >
                    <option value="all">Todos los casos</option>
                    <option value="unassigned">Sin asignar</option>
                    <option value="assigned">Asignados</option>
                  </select>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Vencimiento:</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <span>-</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-3 text-left">ID</th>
                      <th className="p-3 text-left">Estudiante</th>
                      <th className="p-3 text-left">Asunto</th>
                      <th className="p-3 text-left">Prioridad</th>
                      <th className="p-3 text-left">Estado</th>
                      <th className="p-3 text-left">Coordinador asignado</th>
                      <th className="p-3 text-left">Vencimiento</th>
                      <th className="p-3 text-left">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-6 text-center text-sm text-slate-500"
                        >
                          Cargando solicitudes...
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      filteredSolicitudes.map((ticket) => {
                        const isAssigned = !!ticket.assigned_to;
                        const isMine =
                          !!myEmail &&
                          !!ticket.assigned_to &&
                          String(ticket.assigned_to).toLowerCase() ===
                            String(myEmail).toLowerCase();

                        const canView = !isAssigned || isMine;
                        const canTake = !isAssigned;
                        const canDelegate = isMine;

                        return (
                          <tr
                            key={ticket._raw.id}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-3 font-medium text-slate-800">
                              {ticket.id}
                            </td>
                            <td className="p-3 text-slate-700">
                              {ticket.formData?.nombre || ticket.req || "-"}
                            </td>
                            <td className="p-3 text-slate-700 max-w-[260px]">
                              <span className="line-clamp-2">
                                {ticket.subj}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-3 py-1 rounded-full font-medium text-[11px] ${getPriorityClass(ticket.prio)}`}
                              >
                                {ticket.prio}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-3 py-1 rounded-full font-medium text-[11px] ${getStatusClass(ticket.status)}`}
                              >
                                {ticket.status}
                              </span>
                            </td>

                            <td className="p-3 text-slate-700">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-[11px] font-medium ${getAssignedClass(ticket.assigned_to)}`}
                              >
                                {ticket.assigned_to
                                  ? getCoordinatorNameByEmail(
                                      ticket.assigned_to,
                                    )
                                  : "Sin asignar"}
                              </span>
                            </td>

                            <td className="p-3 text-slate-700">
                              {formatDue(ticket.due)}
                            </td>

                            <td className="p-3 text-slate-700">
                              <div className="flex flex-wrap items-center gap-2">
                                {canView && (
                                  <button
                                    onClick={() => openModal(ticket)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                                  >
                                    <LuEye className="text-base" />
                                    Ver
                                  </button>
                                )}

                                {canTake && (
                                  <button
                                    onClick={() => handleTake(ticket._raw.id)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ffd600] hover:bg-yellow-300 text-slate-900 text-xs font-semibold"
                                  >
                                    <LuHand className="text-base" />
                                    Tomar
                                  </button>
                                )}

                                {canDelegate && (
                                  <button
                                    onClick={() => openDelegateModal(ticket)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                                  >
                                    <LuArrowRightLeft className="text-base" />
                                    Delegar
                                  </button>
                                )}

                                <span className="w-full text-[11px] text-slate-500 mt-1">
                                  {!isAssigned
                                    ? "Caso disponible"
                                    : isMine
                                      ? "Asignado a ti"
                                      : "Asignado a otro coordinador"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {!loading && filteredSolicitudes.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-6 text-center text-sm text-slate-500"
                        >
                          No se encontraron solicitudes con los filtros
                          seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div>
      </div>

      <SolicitudModal
        isOpen={isModalOpen}
        onClose={closeModal}
        solicitudData={selectedSolicitud}
        onApprove={handleApprove}
        onReject={handleReject}
        onReturn={handleReturn}
        canManage={
          !!selectedSolicitud?.assigned_to &&
          String(selectedSolicitud.assigned_to).toLowerCase() ===
            String(myEmail).toLowerCase()
        }
      />

      <DelegateModal
        isOpen={delegateModalOpen}
        onClose={closeDelegateModal}
        ticket={delegateTicket}
        coordinators={coordinators}
        myEmail={myEmail}
        onDelegate={handleDelegate}
        loadingCoords={loadingCoords}
      />
    </>
  );
}

function getMyEmail() {
  try {
    const direct =
      localStorage.getItem("user_email") ||
      localStorage.getItem("email") ||
      localStorage.getItem("auth_email");
    if (direct) return direct;

    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      return user?.email || user?.correo || "";
    }
    return "";
  } catch {
    return "";
  }
}

function SidebarItem({ icon: Icon, label, active = false, href = "#" }) {
  const base =
    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm transition-colors";
  const stateClasses = active
    ? "bg-[#1453DB] text-gray-200"
    : "text-slate-700 hover:bg-blue-200";

  return (
    <a href={href} className={base + " " + stateClasses}>
      {Icon && <Icon className="text-lg" />}
      <span>{label}</span>
    </a>
  );
}

function SummaryCard({ title, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
      <div
        className={`px-3 py-2 rounded-xl text-xs font-semibold ${colors[color]}`}
      >
        {title}
      </div>
      <div>
        <p className="text-xs text-slate-500">Total</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

function DelegateModal({
  isOpen,
  onClose,
  ticket,
  coordinators,
  myEmail,
  onDelegate,
  loadingCoords,
}) {
  if (!isOpen || !ticket) return null;

  const availableCoords = (coordinators || []).filter(
    (c) => String(c.email).toLowerCase() !== String(myEmail).toLowerCase(),
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Delegar caso
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona el coordinador al que deseas transferir esta solicitud.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <LuX />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Solicitud</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              #{ticket.id} —{" "}
              {ticket.formData?.nombre || ticket.req || "Sin nombre"}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {ticket.subj || "Sin asunto"}
            </p>
          </div>

          {loadingCoords ? (
            <div className="text-sm text-slate-500">
              Cargando coordinadores...
            </div>
          ) : availableCoords.length === 0 ? (
            <div className="text-sm text-slate-500">
              No hay coordinadores disponibles para delegar.
            </div>
          ) : (
            <div className="space-y-3">
              {availableCoords.map((coord) => (
                <button
                  key={coord.id}
                  onClick={() => onDelegate(ticket, coord.email)}
                  className="w-full text-left border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {coord.nombre || "Sin nombre"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{coord.email}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {coord.role} {coord.sede ? `• ${coord.sede}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
