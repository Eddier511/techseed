import { useEffect, useMemo, useState } from "react";
import {
  LuLayoutDashboard,
  LuFileText,
  LuUserCheck,
  LuBuilding,
  LuLogOut,
  LuEye,
} from "react-icons/lu";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext.jsx";
import InstitutionModal from "../components/InstitutionModal";
import api from "../api/apiClient";

const getStatusClass = (status) => {
  switch (status) {
    case "Habilitada":
      return "bg-emerald-100 text-emerald-700";
    case "Deshabilitada":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

function mapInstitutionFromApi(apiInst) {
  if (!apiInst) return null;

  return {
    id: apiInst.id,
    nombre: apiInst.nombre || "",
    cedula_juridica: apiInst.cedula_juridica || "",
    supervisor_nombre: apiInst.supervisor_nombre || "",
    supervisor_cargo: apiInst.supervisor_cargo || "",
    supervisor_email: apiInst.supervisor_email || "",
    contacto_email: apiInst.contacto_email || "",
    tipo_servicio: apiInst.tipo_servicio || "",
    estado: apiInst.estado || "Deshabilitada",
    created_at: apiInst.created_at || null,
    updated_at: apiInst.updated_at || null,
    _raw: apiInst,
  };
}

export default function InstitutionsPage() {
  const { user, logout } = useAuth();

  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/instituciones");
      const listApi = Array.isArray(res.data) ? res.data : [];
      const listUi = listApi.map(mapInstitutionFromApi);
      setInstitutions(listUi);
    } catch (err) {
      console.error("Error cargando instituciones:", err);
      toast.error("No se pudieron cargar las instituciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const openModal = (institution = null) => {
    setSelectedInstitution(institution);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedInstitution(null);
    setIsModalOpen(false);
  };

  const handleToggleEnabled = async (institution) => {
    if (!institution?.id) return;

    const nextStatus =
      institution.estado === "Habilitada" ? "Deshabilitada" : "Habilitada";

    const t = toast.loading(
      nextStatus === "Habilitada"
        ? "Habilitando institución..."
        : "Deshabilitando institución...",
    );

    try {
      const res = await api.patch(`/instituciones/${institution.id}/status`, {
        estado: nextStatus,
      });

      const updated = mapInstitutionFromApi(res.data);
      setInstitutions((current) =>
        current.map((inst) => (inst.id === updated.id ? updated : inst)),
      );

      if (selectedInstitution?.id === institution.id) {
        setSelectedInstitution(updated);
      }

      toast.success(
        nextStatus === "Habilitada"
          ? "Institución habilitada."
          : "Institución deshabilitada.",
        { id: t },
      );
    } catch (err) {
      console.error("Error cambiando estado de institución:", err);
      toast.error("No se pudo actualizar el estado.", { id: t });
    }
  };

  const handleSave = async (formData, id) => {
    const payload = {
      nombre: formData.nombre?.trim() || "",
      cedula_juridica: formData.cedula_juridica?.trim() || "",
      supervisor_nombre: formData.supervisor_nombre?.trim() || "",
      supervisor_cargo: formData.supervisor_cargo?.trim() || "",
      supervisor_email: formData.supervisor_email?.trim() || "",
      contacto_email: formData.contacto_email?.trim() || "",
      tipo_servicio: formData.tipo_servicio?.trim() || "",
      estado: formData.estado || "Habilitada",
    };

    if (
      !payload.nombre ||
      !payload.cedula_juridica ||
      !payload.supervisor_nombre ||
      !payload.supervisor_email
    ) {
      toast.error(
        "Nombre, cédula jurídica, supervisor y correo del supervisor son requeridos.",
      );
      return;
    }

    const t = toast.loading(
      id ? "Actualizando institución..." : "Registrando institución...",
    );

    try {
      if (id) {
        const res = await api.put(`/instituciones/${id}`, payload);
        const updated = mapInstitutionFromApi(res.data);

        setInstitutions((current) =>
          current.map((inst) => (inst.id === updated.id ? updated : inst)),
        );
      } else {
        const res = await api.post("/instituciones", payload);
        const nueva = mapInstitutionFromApi(res.data);

        setInstitutions((current) => [nueva, ...current]);
      }

      toast.success(
        id
          ? "Institución actualizada correctamente."
          : "Institución registrada correctamente.",
        { id: t },
      );
      closeModal();
    } catch (err) {
      console.error("Error guardando institución:", err);
      const msg =
        err?.response?.data?.message ||
        "No se pudo guardar la institución. Intenta de nuevo.";
      toast.error(msg, { id: t });
    }
  };

  const filteredInstitutions = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return institutions.filter((inst) => {
      const matchesSearch =
        !searchText ||
        String(inst.nombre || "")
          .toLowerCase()
          .includes(searchText) ||
        String(inst.cedula_juridica || "")
          .toLowerCase()
          .includes(searchText) ||
        String(inst.supervisor_nombre || "")
          .toLowerCase()
          .includes(searchText) ||
        String(inst.supervisor_email || "")
          .toLowerCase()
          .includes(searchText) ||
        String(inst.contacto_email || "")
          .toLowerCase()
          .includes(searchText) ||
        String(inst.tipo_servicio || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "all" || inst.estado === statusFilter;

      const matchesType =
        typeFilter === "all" ||
        String(inst.tipo_servicio || "").toLowerCase() ===
          String(typeFilter).toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [institutions, search, statusFilter, typeFilter]);

  const uniqueTypes = Array.from(
    new Set(institutions.map((i) => i.tipo_servicio).filter(Boolean)),
  );

  const total = institutions.length;
  const enabled = institutions.filter((i) => i.estado === "Habilitada").length;
  const disabled = institutions.filter(
    (i) => i.estado === "Deshabilitada",
  ).length;

  const displayName = user?.nombre || "Coordinación TCU";
  const displayEmail = user?.email || "coordinacion.tcu@ufide.ac.cr";

  const getInitials = (nameOrEmail) => {
    const text = String(nameOrEmail || "").trim();
    if (!text) return "IN";
    if (text.includes("@")) return text.slice(0, 2).toUpperCase();
    const parts = text.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };

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
              href="/admin"
            />
            <SidebarItem
              icon={LuBuilding}
              label="Instituciones"
              href="/instituciones"
              active
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
                Gestión de instituciones TCU
              </p>
              <p className="text-sm md:text-base font-semibold text-slate-800">
                Catálogo de instituciones aliadas
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-700">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500">{displayEmail}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                {getInitials(displayName)}
              </div>

              <button
                onClick={() => openModal(null)}
                className="px-4 py-2 bg-[rgba(2,14,159,1)] text-white text-xs md:text-sm font-semibold rounded-xl shadow-sm hover:bg-indigo-900"
              >
                + Registrar institución
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard
                title="Total instituciones"
                value={total}
                color="blue"
              />
              <SummaryCard title="Habilitadas" value={enabled} color="green" />
              <SummaryCard
                title="Deshabilitadas"
                value={disabled}
                color="slate"
              />
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Instituciones registradas
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Filtra por nombre, correo, supervisor, tipo o estado.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, cédula, supervisor, correo o tipo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full md:w-[420px]"
                  />

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-[180px]"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="Habilitada">Habilitadas</option>
                    <option value="Deshabilitada">Deshabilitadas</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-[220px]"
                  >
                    <option value="all">Todos los tipos</option>
                    {uniqueTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-3 text-left">Institución</th>
                      <th className="p-3 text-left">Supervisor</th>
                      <th className="p-3 text-left">Correos</th>
                      <th className="p-3 text-left">Tipo</th>
                      <th className="p-3 text-left">Estado</th>
                      <th className="p-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-6 text-center text-sm text-slate-500"
                        >
                          Cargando instituciones...
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      filteredInstitutions.map((inst) => (
                        <tr
                          key={inst.id}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-3">
                            <p className="text-slate-800 font-semibold">
                              {inst.nombre}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Cédula jurídica: {inst.cedula_juridica || "-"}
                            </p>
                          </td>

                          <td className="p-3 text-slate-700">
                            <p className="font-medium">
                              {inst.supervisor_nombre || "-"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {inst.supervisor_cargo || "Sin cargo"}
                            </p>
                          </td>

                          <td className="p-3 text-slate-700">
                            <p>{inst.supervisor_email || "-"}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {inst.contacto_email || "-"}
                            </p>
                          </td>

                          <td className="p-3 text-slate-700">
                            {inst.tipo_servicio || "-"}
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-3 py-1 rounded-full font-medium text-[11px] ${getStatusClass(
                                inst.estado,
                              )}`}
                            >
                              {inst.estado}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => openModal(inst)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[rgba(2,14,159,1)] font-semibold text-xs"
                              >
                                <LuEye className="text-sm" />
                                Ver / editar
                              </button>

                              <button
                                onClick={() => handleToggleEnabled(inst)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold text-xs ${
                                  inst.estado === "Habilitada"
                                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                }`}
                              >
                                {inst.estado === "Habilitada"
                                  ? "Deshabilitar"
                                  : "Habilitar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                    {!loading && filteredInstitutions.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-6 text-center text-sm text-slate-500"
                        >
                          No se encontraron instituciones con los filtros
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

      <InstitutionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        institutionData={selectedInstitution}
      />
    </>
  );
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
    slate: "bg-slate-100 text-slate-700",
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
