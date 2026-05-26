import { useEffect, useMemo, useState } from "react";
import {
  LuLayoutDashboard,
  LuTicket,
  LuUsers,
  LuFile,
  LuFileText,
  LuUserCheck,
  LuSettings,
  LuSearch,
  LuShieldCheck,
  LuUserRound,
  LuBuilding,
  LuLogOut,
} from "react-icons/lu";
import { toast } from "sonner";
import api from "../api/apiClient";
import { useAuth } from "../contexts/AuthContext.jsx";

function getRoleClass(role) {
  switch (role) {
    case "COORD":
      return "bg-emerald-100 text-emerald-700";
    case "STUDENT":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getInitials(name, email) {
  const base = String(name || "").trim();
  if (base) {
    const parts = base.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  const e = String(email || "").trim();
  return e ? e.slice(0, 2).toUpperCase() : "US";
}

export default function CoordinatorsPage() {
  const { user, logout } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/user/list/all");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      toast.error("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openRoleModal = (u) => {
    setSelectedUser(u);
    setModalOpen(true);
  };

  const closeRoleModal = () => {
    setSelectedUser(null);
    setModalOpen(false);
  };

  const handleChangeRole = async (targetUser, newRole) => {
    const tId = toast.loading("Actualizando rol...");
    try {
      await api.patch(`/user/${targetUser.id}/role`, {
        role: newRole,
      });

      toast.success("Rol actualizado correctamente.", { id: tId });

      setUsers((current) =>
        current.map((u) =>
          u.id === targetUser.id ? { ...u, role: newRole } : u,
        ),
      );

      closeRoleModal();
    } catch (err) {
      console.error("Error actualizando rol:", err);
      toast.error("No se pudo actualizar el rol.", { id: tId });
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();

    return users.filter((u) => {
      const matchesSearch =
        !q ||
        String(u.nombre || "")
          .toLowerCase()
          .includes(q) ||
        String(u.email || "")
          .toLowerCase()
          .includes(q) ||
        String(u.cedula || "")
          .toLowerCase()
          .includes(q);

      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const total = users.length;
  const coords = users.filter((u) => u.role === "COORD").length;
  const students = users.filter((u) => u.role === "STUDENT").length;
  const activeUsers = users.filter((u) => Number(u.is_active) === 1).length;

  const displayName = user?.nombre || "Coordinador TCU";
  const displayRole =
    user?.role === "COORD" ? "Coordinación TCU" : user?.role || "Administrador";

  return (
    <>
      <div className="min-h-screen bg-slate-100 flex">
        {/* SIDEBAR */}
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
            <SidebarItem icon={LuFileText} label="Reportes" href="/reportes" />
            <SidebarItem
              icon={LuUserCheck}
              label="Coordinadores"
              href="/coordinadores"
              active
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

        {/* CONTENEDOR PRINCIPAL */}
        <div className="flex-1 flex flex-col">
          {/* TOPBAR */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Gestión de coordinadores TCU
              </p>
              <p className="text-sm md:text-base font-semibold text-slate-800">
                Asignación de roles para usuarios del sistema
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-700">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500">{displayRole}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                {getInitials(displayName, user?.email)}
              </div>
            </div>
          </header>

          {/* CONTENIDO */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
            {/* TARJETAS RESUMEN */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard title="Total usuarios" value={total} color="blue" />
              <SummaryCard title="Coordinadores" value={coords} color="green" />
              <SummaryCard
                title="Estudiantes"
                value={students}
                color="yellow"
              />
              <SummaryCard
                title="Usuarios activos"
                value={activeUsers}
                color="purple"
              />
            </div>

            {/* TABLA */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Usuarios registrados
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Busca usuarios y asígnales el rol de coordinador.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="relative w-full md:w-80">
                    <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, correo o cédula..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm"
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-[180px]"
                  >
                    <option value="all">Todos los roles</option>
                    <option value="COORD">Coordinadores</option>
                    <option value="STUDENT">Estudiantes</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-3 text-left">Usuario</th>
                      <th className="p-3 text-left">Correo</th>
                      <th className="p-3 text-left">Cédula</th>
                      <th className="p-3 text-left">Carrera</th>
                      <th className="p-3 text-left">Rol actual</th>
                      <th className="p-3 text-left">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-6 text-center text-sm text-slate-500"
                        >
                          Cargando usuarios...
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                                {getInitials(u.nombre, u.email)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {u.nombre || "Sin nombre"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {u.sede || "Sin sede"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 text-slate-700">{u.email}</td>
                          <td className="p-3 text-slate-700">
                            {u.cedula || "-"}
                          </td>
                          <td className="p-3 text-slate-700">
                            {u.carrera || "-"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-semibold ${getRoleClass(
                                u.role,
                              )}`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => openRoleModal(u)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(2,14,159,1)] text-white text-xs font-semibold hover:bg-indigo-900"
                            >
                              <LuShieldCheck className="text-sm" />
                              Gestionar rol
                            </button>
                          </td>
                        </tr>
                      ))}

                    {!loading && filteredUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-6 text-center text-sm text-slate-500"
                        >
                          No se encontraron usuarios con los filtros
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

      <RoleModal
        isOpen={modalOpen}
        onClose={closeRoleModal}
        userData={selectedUser}
        onChangeRole={handleChangeRole}
      />
    </>
  );
}

function RoleModal({ isOpen, onClose, userData, onChangeRole }) {
  if (!isOpen || !userData) return null;

  const isCoord = userData.role === "COORD";

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">
            Gestionar rol del usuario
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Asigna o modifica el rol del usuario dentro del sistema TCU.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {userData.nombre || "Sin nombre"}
            </p>
            <p className="text-xs text-slate-500 mt-1">{userData.email}</p>
            <p className="text-xs text-slate-500 mt-1">
              Rol actual:{" "}
              <span className="font-semibold text-slate-700">
                {userData.role}
              </span>
            </p>
          </div>

          <div className="grid gap-3">
            {!isCoord ? (
              <button
                onClick={() => onChangeRole(userData, "COORD")}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Asignar como coordinador
              </button>
            ) : (
              <button
                onClick={() => onChangeRole(userData, "STUDENT")}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Quitar rol de coordinador
              </button>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
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
    purple: "bg-purple-50 text-purple-700",
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
