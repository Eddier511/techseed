import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import {
  LuLayoutDashboard,
  LuFilePlus2,
  LuFileSearch,
  LuUser,
  LuTarget,
  LuBuilding,
  LuFileText,
  LuCheck,
  LuLogOut,
  LuLock,
  LuTriangleAlert,
  LuInfo,
} from "react-icons/lu";

import { useSolicitudes } from "../contexts/SolicitudContext";
import StudentStatusPage from "./StudentStatusPage";
import api from "../api/apiClient";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

/* ============================================================
   FORM DATA INICIAL
   ============================================================ */
const initialFormData = {
  nombre: "",
  cedula: "",
  carrera: "",

  sede: "",
  estudiante_email: "",
  estudiante_phone: "",
  oficio: "",
  estado_civil: "",
  domicilio: "",
  lugar_trabajo: "",

  institucion_id: "",
  institucion: "",
  institucion_cedula: "",
  institucion_supervisor: "",
  institucion_correo: "",
  institucion_tipo_servicio: "",

  tituloProyecto: "",
  justificacion: "",
  objetivoGeneral: "",

  objetivosEspecificosItems: [""],
  beneficiarios: "",
  estrategiaSolucion: "",

  cronogramaItems: [{ actividad: "", tarea: "", horas: "" }],
};

function normalizeFormData(source) {
  if (!source) return initialFormData;

  return {
    ...initialFormData,
    ...source,
    objetivosEspecificosItems: Array.isArray(source.objetivosEspecificosItems)
      ? source.objetivosEspecificosItems.length
        ? source.objetivosEspecificosItems
        : [""]
      : [""],
    cronogramaItems: Array.isArray(source.cronogramaItems)
      ? source.cronogramaItems.length
        ? source.cronogramaItems
        : [{ actividad: "", tarea: "", horas: "" }]
      : [{ actividad: "", tarea: "", horas: "" }],
  };
}

function getRevisionEditConfig(solicitud) {
  const flags =
    solicitud?.revisionFlags || solicitud?._rawDetalle?.revision_flags;

  return {
    isObservedMode: solicitud?.estado === "Observado",
    institucion: Boolean(flags?.institucion_editable),
    proyecto: Boolean(flags?.proyecto_editable),
    objetivos: Boolean(flags?.objetivos_editable),
    cronograma: Boolean(flags?.cronograma_editable),
    comentarioRevisor: flags?.comentario_revisor || "",
  };
}

function SectionLockedNotice({
  text = "Esta sección está bloqueada por el momento.",
}) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-600">
      <LuLock className="text-sm" />
      <span>{text}</span>
    </div>
  );
}

/* ============================================================
   WIZARD DE INSCRIPCIÓN
   ============================================================ */
function StudentWizard({ onCompleted, existingSolicitud = null }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);

  const { addSolicitud, resubmitSolicitud } = useSolicitudes();

  const [instituciones, setInstituciones] = useState([]);
  const [loadingInstituciones, setLoadingInstituciones] = useState(false);

  const revisionConfig = useMemo(
    () => getRevisionEditConfig(existingSolicitud),
    [existingSolicitud],
  );

  const isObservedMode = revisionConfig.isObservedMode;

  const editableSections = {
    step1: !isObservedMode,
    step2: !isObservedMode || revisionConfig.institucion,
    step3: !isObservedMode || revisionConfig.proyecto,
    step4: !isObservedMode || revisionConfig.objetivos,
    step5: !isObservedMode || revisionConfig.cronograma,
  };

  const isBlank = (value) => String(value || "").trim().length === 0;

  const requiredFieldsByStep = {
    1: [
      ["nombre", "nombre completo"],
      ["cedula", "numero de identificacion"],
      ["carrera", "carrera"],
      ["sede", "sede"],
      ["estudiante_email", "correo electronico"],
      ["estudiante_phone", "numero telefonico"],
      ["oficio", "oficio"],
      ["estado_civil", "estado civil"],
      ["domicilio", "domicilio"],
      ["lugar_trabajo", "lugar de trabajo"],
    ],
    2: [
      ["institucion_id", "institucion"],
      ["institucion", "institucion"],
    ],
    3: [
      ["tituloProyecto", "titulo del proyecto"],
      ["justificacion", "descripcion del problema"],
      ["objetivoGeneral", "objetivo general"],
      ["beneficiarios", "beneficiarios"],
      ["estrategiaSolucion", "estrategia de solucion"],
    ],
  };

  const getMissingRequiredFields = (step) =>
    (requiredFieldsByStep[step] || [])
      .filter(([field]) => isBlank(formData[field]))
      .map(([, label]) => label);

  const isCronogramaValid = () => {
    const rows = Array.isArray(formData.cronogramaItems)
      ? formData.cronogramaItems
      : [];

    if (!rows.length) return false;

    return rows.every((row) => {
      const actividad = String(row?.actividad || "").trim();
      const tarea = String(row?.tarea || "").trim();
      const horasRaw = String(row?.horas || "").trim();
      const horasNum = Number(horasRaw);

      return (
        actividad &&
        tarea &&
        horasRaw &&
        Number.isFinite(horasNum) &&
        Number.isInteger(horasNum) &&
        horasNum > 0 &&
        horasNum <= 8
      );
    });
  };

  const areFirstThreeObjetivosValid = () => {
    const items = Array.isArray(formData.objetivosEspecificosItems)
      ? formData.objetivosEspecificosItems
      : [];

    if (items.length < 3) return false;

    return items
      .slice(0, 3)
      .every((item) => String(item || "").trim().length > 0);
  };

  const areAddedObjetivosValid = () => {
    const items = Array.isArray(formData.objetivosEspecificosItems)
      ? formData.objetivosEspecificosItems
      : [];

    return items
      .slice(3)
      .every((item) => String(item || "").trim().length > 0);
  };

  const showMessage = (text, type = "success") => {
    if (type === "error") {
      toast.error(text);
      return;
    }
    if (type === "warning") {
      toast.warning(text);
      return;
    }
    toast.success(text);
  };

  const validateCurrentStep = () => {
    if (!editableSections[`step${currentStep}`]) return true;

    const missingFields = getMissingRequiredFields(currentStep);
    if (missingFields.length) {
      showMessage(
        `Completa todos los campos requeridos antes de continuar: ${missingFields.join(", ")}.`,
        "error",
      );
      return false;
    }

    if (currentStep === 4) {
      if (!areFirstThreeObjetivosValid()) {
        showMessage(
          "Debes completar los primeros 3 objetivos especificos para continuar.",
          "error",
        );
        return false;
      }

      if (!areAddedObjetivosValid()) {
        showMessage(
          "Completa los objetivos especificos adicionales o elimina los que esten vacios.",
          "error",
        );
        return false;
      }
    }

    if (currentStep === 5 && !isCronogramaValid()) {
      showMessage(
        "Completa correctamente el cronograma. Cada fila debe tener actividad, tarea y horas entre 1 y 8.",
        "error",
      );
      return false;
    }

    return true;
  };

  useEffect(() => {
    let ignore = false;

    const loadUser = async () => {
      try {
        const res = await api.get("/user/me");
        const u = res.data;

        if (!u || ignore) return;

        setFormData((prev) => {
          const base = isObservedMode
            ? normalizeFormData(existingSolicitud?.formData)
            : normalizeFormData(prev);

          return {
            ...base,
            nombre: u.nombre || base.nombre || "",
            cedula: u.cedula || base.cedula || "",
            carrera: base.carrera || u.carrera || "",
            sede: base.sede || u.sede || "",
            estudiante_email: u.email || base.estudiante_email || "",
            estudiante_phone: base.estudiante_phone || u.phone || "",
            oficio: base.oficio || u.oficio || "",
            estado_civil: base.estado_civil || u.estado_civil || "",
            domicilio: base.domicilio || u.domicilio || "",
            lugar_trabajo: base.lugar_trabajo || u.lugar_trabajo || "",
          };
        });
      } catch (err) {
        console.error("Error cargando usuario:", err);
      }
    };

    loadUser();

    return () => {
      ignore = true;
    };
  }, [existingSolicitud, isObservedMode]);

  useEffect(() => {
    if (isObservedMode && existingSolicitud?.formData) {
      setFormData(normalizeFormData(existingSolicitud.formData));
    }
  }, [existingSolicitud, isObservedMode]);

  useEffect(() => {
    const loadInstituciones = async () => {
      setLoadingInstituciones(true);
      try {
        const res = await api.get("/instituciones", {
          params: { estado: "Habilitada" },
        });
        const list = Array.isArray(res.data) ? res.data : [];
        setInstituciones(list);
      } catch (err) {
        console.error("Error cargando instituciones:", err);
        showMessage("No se pudieron cargar las instituciones.", "error");
      } finally {
        setLoadingInstituciones(false);
      }
    };

    loadInstituciones();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const downloadResumenPDF = (data) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const maxWidth = pageWidth - marginX * 2;
    let y = 18;

    const ensurePage = (extraSpace = 12) => {
      if (y + extraSpace > pageHeight - 14) {
        doc.addPage();
        y = 20;
      }
    };

    const line = (text = "", size = 11, bold = false, spacing = 7) => {
      ensurePage(12);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);

      const lines = doc.splitTextToSize(String(text), maxWidth);
      doc.text(lines, marginX, y);
      y += lines.length * 6 + (spacing - 6);
    };

    const sectionTitle = (title) => {
      ensurePage(18);
      y += 3;
      doc.setFillColor(245, 247, 250);
      doc.rect(marginX, y - 5, maxWidth, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, marginX + 2, y);
      y += 8;
    };

    const objetivosItems = (
      Array.isArray(data.objetivosEspecificosItems)
        ? data.objetivosEspecificosItems
        : []
    )
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    const cronogramaItems = (
      Array.isArray(data.cronogramaItems) ? data.cronogramaItems : []
    )
      .map((r) => ({
        actividad: String(r?.actividad || "").trim(),
        tarea: String(r?.tarea || "").trim(),
        horas: String(r?.horas ?? "").trim(),
      }))
      .filter((r) => r.actividad || r.tarea || r.horas);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Anteproyecto TCU", marginX, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, marginX, y);
    y += 10;

    sectionTitle("1. Datos del estudiante");
    line(`Nombre: ${data.nombre || "No indicado"}`);
    line(`Cédula: ${data.cedula || "No indicada"}`);
    line(`Carrera: ${data.carrera || "No indicada"}`);
    line(`Sede: ${data.sede || "No indicada"}`);
    line(`Correo: ${data.estudiante_email || "No indicado"}`);
    line(`Teléfono: ${data.estudiante_phone || "No indicado"}`);
    line(`Oficio: ${data.oficio || "No indicado"}`);
    line(`Estado civil: ${data.estado_civil || "No indicado"}`);
    line(`Domicilio: ${data.domicilio || "No indicado"}`);
    line(`Lugar de trabajo: ${data.lugar_trabajo || "No indicado"}`);

    sectionTitle("2. Datos de la institución");
    line(`Institución: ${data.institucion || "No seleccionada"}`);
    line(`Cédula jurídica: ${data.institucion_cedula || "No indicada"}`);
    line(`Supervisor: ${data.institucion_supervisor || "No indicado"}`);
    line(`Correo de contacto: ${data.institucion_correo || "No indicado"}`);
    line(
      `Tipo de servicio: ${data.institucion_tipo_servicio || "No indicado"}`,
    );

    sectionTitle("3. Datos del proyecto");
    line(`Título del proyecto: ${data.tituloProyecto || "Sin título"}`);
    line(
      `Descripción del problema: ${data.justificacion || "Sin descripción"}`,
    );
    line(`Objetivo general: ${data.objetivoGeneral || "Sin objetivo general"}`);
    line(`Beneficiarios: ${data.beneficiarios || "Sin dato"}`);
    line(`Estrategia de solución: ${data.estrategiaSolucion || "Sin dato"}`);

    sectionTitle("4. Objetivos específicos");
    if (objetivosItems.length) {
      objetivosItems.forEach((obj, index) => {
        line(`${index + 1}. ${obj}`);
      });
    } else {
      line("No se agregaron objetivos específicos.");
    }

    sectionTitle("5. Cronograma");
    if (cronogramaItems.length) {
      cronogramaItems.forEach((item, index) => {
        line(`Actividad ${index + 1}: ${item.actividad || "—"}`, 11, true, 6);
        line(`Tarea: ${item.tarea || "—"}`, 11, false, 6);
        line(`Horas: ${item.horas || "0"}`, 11, false, 8);
      });
    } else {
      line("No se agregaron filas de cronograma.");
    }

    const safeName = String(data.nombre || "estudiante")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w-]/g, "");

    doc.save(`Anteproyecto_TCU_${safeName}.pdf`);
  };

  const addObjetivo = () => {
    setFormData((prev) => ({
      ...prev,
      objetivosEspecificosItems: [...prev.objetivosEspecificosItems, ""],
    }));
  };

  const removeObjetivo = (index) => {
    setFormData((prev) => {
      const arr = [...prev.objetivosEspecificosItems];

      // No permitir bajar de 3 objetivos
      if (arr.length <= 3) return prev;

      arr.splice(index, 1);

      return {
        ...prev,
        objetivosEspecificosItems: arr,
      };
    });
  };

  const updateObjetivo = (index, value) => {
    setFormData((prev) => {
      const arr = [...prev.objetivosEspecificosItems];
      arr[index] = value;
      return { ...prev, objetivosEspecificosItems: arr };
    });
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    if (currentStep === 1 && !isObservedMode) {
      try {
        await api.patch("/user/me", {
          cedula: formData.cedula,
          carrera: formData.carrera,
          sede: formData.sede,
          phone: formData.estudiante_phone,
          oficio: formData.oficio,
          estado_civil: formData.estado_civil,
          domicilio: formData.domicilio,
          lugar_trabajo: formData.lugar_trabajo,
        });
      } catch (err) {
        console.error("Error guardando perfil:", err);
        showMessage("No se pudo guardar tu información personal.", "error");
        return;
      }
    }
    if (currentStep === 4) {
      if (!areFirstThreeObjetivosValid()) {
        showMessage(
          "Debes completar los primeros 3 objetivos específicos para continuar.",
          "error",
        );
        return;
      }
    }

    if (currentStep === 5) {
      if (!isCronogramaValid()) {
        showMessage(
          "Completá correctamente el cronograma. Cada fila debe tener actividad, tarea y horas entre 1 y 8.",
          "error",
        );
        return;
      }
    }

    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    if (!formData.institucion_id || !formData.institucion) {
      showMessage("Por favor, selecciona una institución.", "error");
      return;
    }

    if (!String(formData.objetivoGeneral || "").trim()) {
      showMessage("Por favor, escribe el objetivo general.", "error");
      return;
    }

    if (!String(formData.justificacion || "").trim()) {
      showMessage("Por favor, escribe la descripción del problema.", "error");
      return;
    }

    try {
      downloadResumenPDF(formData);

      if (isObservedMode && existingSolicitud?.id) {
        await resubmitSolicitud(existingSolicitud.id, formData);
        showMessage("Correcciones enviadas correctamente.", "success");
      } else {
        await addSolicitud(formData);
        showMessage("¡Solicitud de TCU enviada con éxito!", "success");
      }

      if (onCompleted) onCompleted();
    } catch (err) {
      console.error("Error al enviar solicitud:", err);
      showMessage(
        "Ocurrió un error al enviar tu solicitud. Inténtalo de nuevo en unos minutos.",
        "error",
      );
    }
  };

  const steps = [
    { id: 1, name: "Datos Personales", icon: LuUser },
    { id: 2, name: "Institución", icon: LuBuilding },
    { id: 3, name: "Proyecto", icon: LuTarget },
    { id: 4, name: "Objetivos específicos", icon: LuFileText },
    { id: 5, name: "Cronograma", icon: LuFileText },
    { id: 6, name: "Confirmación", icon: LuFileText },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
      <div className="p-6 bg-slate-50 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 mb-4">
          {isObservedMode
            ? "Corrección de anteproyecto observado"
            : "Inscripción de Trabajo Comunal Universitario (TCU)"}
        </h1>

        {isObservedMode && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <LuTriangleAlert className="mt-0.5 text-lg" />
              <div>
                <p className="font-semibold mb-1">
                  Tu anteproyecto tiene observaciones.
                </p>
                <p>
                  Solo podrás editar las secciones habilitadas por el
                  coordinador. Lo demás se muestra bloqueado.
                </p>
                {revisionConfig.comentarioRevisor && (
                  <p className="mt-2 text-xs bg-white/70 border border-amber-200 rounded-xl px-3 py-2">
                    <span className="font-semibold">Comentario:</span>{" "}
                    {revisionConfig.comentarioRevisor}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <nav className="flex items-center justify-between gap-2">
          {steps.map((step, index) => {
            const stepIndex = index + 1;
            const isCompleted = stepIndex < currentStep;
            const isActive = stepIndex === currentStep;

            let circleClasses =
              "w-10 h-10 rounded-full flex items-center justify-center text-lg";
            if (isCompleted) circleClasses += " bg-emerald-500 text-white";
            else if (isActive)
              circleClasses += " bg-[rgba(2,14,159,1)] text-white";
            else circleClasses += " bg-slate-200 text-slate-600";

            const labelClasses =
              "mt-2 text-[11px] font-semibold text-center " +
              (isActive ? "text-[rgba(2,14,159,1)]" : "text-slate-500");

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className={circleClasses}>
                  {isCompleted ? <LuCheck /> : <step.icon />}
                </div>
                <p className={labelClasses}>{step.name}</p>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-6 md:p-8">
        {currentStep === 1 && (
          <Step1_DatosPersonales
            formData={formData}
            handleChange={handleChange}
            disabled={!editableSections.step1}
            isObservedMode={isObservedMode}
          />
        )}

        {currentStep === 2 && (
          <Step2_Institucion
            formData={formData}
            handleChange={handleChange}
            instituciones={instituciones}
            loading={loadingInstituciones}
            onNewInstitution={(inst) =>
              setInstituciones((prev) => [...prev, inst])
            }
            onNotify={showMessage}
            disabled={!editableSections.step2}
          />
        )}

        {currentStep === 3 && (
          <Step3_ProyectoU
            formData={formData}
            handleChange={handleChange}
            disabled={!editableSections.step3}
          />
        )}

        {currentStep === 4 && (
          <Step4_ObjetivosEspecificos
            formData={formData}
            addObjetivo={addObjetivo}
            removeObjetivo={removeObjetivo}
            updateObjetivo={updateObjetivo}
            disabled={!editableSections.step4}
          />
        )}

        {currentStep === 5 && (
          <Step5_Cronograma
            formData={formData}
            setFormData={setFormData}
            disabled={!editableSections.step5}
          />
        )}

        {currentStep === 6 && <Step6_Resumen formData={formData} />}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="px-6 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg shadow-sm disabled:opacity-50 hover:bg-slate-300 text-sm"
        >
          Atrás
        </button>

        <button
          onClick={handleNext}
          className="px-6 py-2 bg-[rgba(2,14,159,1)] text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-900 text-sm"
        >
          {currentStep === steps.length
            ? isObservedMode
              ? "Finalizar y Reenviar"
              : "Finalizar y Enviar"
            : "Siguiente"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD PRINCIPAL /PORTAL
   ============================================================ */

export default function StudentPortal() {
  const {
    mySolicitud,
    fetchMySolicitud,
    clearSolicitudState,
    fetchSolicitudDetalle,
  } = useSolicitudes();

  const [activeTab, setActiveTab] = useState("overview");
  const [globalFlash, setGlobalFlash] = useState(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        const base = await fetchMySolicitud();
        if (!ignore && base?.id) {
          await fetchSolicitudDetalle(base.id);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error cargando mi solicitud:", err);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName =
    user?.nombre ||
    mySolicitud?.estudiante_nombre ||
    "Estudiante Universidad Fidélitas";

  const displayCareer = user?.carrera || mySolicitud?.carrera || "TechSeed";

  const handleCompletedWizard = async () => {
    try {
      const base = await fetchMySolicitud();
      if (base?.id) {
        await fetchSolicitudDetalle(base.id);
      }
    } catch (err) {
      console.error("Error recargando mi solicitud:", err);
    }

    setActiveTab("estado");

    setGlobalFlash({
      text:
        mySolicitud?.estado === "Observado"
          ? "Tus correcciones fueron reenviadas exitosamente."
          : "Tu anteproyecto fue enviado exitosamente.",
      type: "success",
    });

    setTimeout(() => {
      setGlobalFlash(null);
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-white border-r border-slate-200 shadow-sm hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-[rgba(2,14,159,1)] flex items-center justify-center text-white font-bold mr-3">
            T
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              TCU Estudiantes
            </p>
            <p className="text-sm font-semibold text-slate-800">
              Panel de control
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-sm">
          <SidebarItem
            icon={LuLayoutDashboard}
            label="Resumen"
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          />
          <SidebarItem
            icon={LuFilePlus2}
            label={
              mySolicitud?.estado === "Aprobado"
                ? "TCU aprobado"
                : mySolicitud?.estado === "Observado"
                ? "Corregir anteproyecto"
                : "Inscripción de anteproyecto"
            }
            active={activeTab === "inscripcion"}
            onClick={() => setActiveTab("inscripcion")}
          />
          <SidebarItem
            icon={LuFileSearch}
            label="Estado del anteproyecto"
            active={activeTab === "estado"}
            onClick={() => setActiveTab("estado")}
          />
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => {
              clearSolicitudState();
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
              Panel del estudiante
            </p>
            <p className="text-sm md:text-base font-semibold text-slate-800">
              Bienvenido, {displayName}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-700">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500">{displayCareer}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center">
                <LuUser />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 bg-slate-50 overflow-y-auto">
          {activeTab === "overview" && (
            <OverviewSection
              mySolicitud={mySolicitud}
              goToInscripcion={() => setActiveTab("inscripcion")}
              goToEstado={() => setActiveTab("estado")}
            />
          )}

          {activeTab === "inscripcion" &&
            (mySolicitud && mySolicitud.estado !== "Observado" ? (
              <AlreadySubmittedCard
                solicitud={mySolicitud}
                goToEstado={() => setActiveTab("estado")}
              />
            ) : (
              <StudentWizard
                onCompleted={handleCompletedWizard}
                existingSolicitud={mySolicitud}
              />
            ))}

          {activeTab === "estado" && (
            <>
              {globalFlash && (
                <div className="fixed top-5 right-5 z-[9999] animate-[fadeIn_.25s_ease-out]">
                  <div
                    className={
                      "min-w-[320px] max-w-[420px] rounded-2xl shadow-xl border px-4 py-3 bg-white " +
                      (globalFlash.type === "error"
                        ? "border-red-200"
                        : "border-emerald-200")
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={
                          "mt-0.5 w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold " +
                          (globalFlash.type === "error"
                            ? "bg-red-500"
                            : "bg-emerald-500")
                        }
                      >
                        {globalFlash.type === "error" ? "!" : "✓"}
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {globalFlash.type === "error"
                            ? "Ocurrió un error"
                            : "Proceso completado"}
                        </p>
                        <p
                          className={
                            "text-sm mt-0.5 " +
                            (globalFlash.type === "error"
                              ? "text-red-700"
                              : "text-emerald-700")
                          }
                        >
                          {globalFlash.text}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setGlobalFlash(null)}
                        className="text-slate-400 hover:text-slate-600 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {mySolicitud ? (
                <StudentStatusPage solicitud={mySolicitud} />
              ) : (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 max-w-xl">
                  <h2 className="text-xl font-semibold text-slate-900 mb-3">
                    Aún no has enviado un anteproyecto
                  </h2>
                  <p className="text-sm text-slate-600 mb-6">
                    Para consultar el estado de tu TCU primero debes completar
                    la inscripción del anteproyecto.
                  </p>
                  <button
                    onClick={() => setActiveTab("inscripcion")}
                    className="px-5 py-2.5 bg-[rgba(2,14,159,1)] text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-900"
                  >
                    Ir a inscripción de anteproyecto
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   COMPONENTES DE APOYO
   ============================================================ */

function SidebarItem({ icon: Icon, label, active, onClick }) {
  const base =
    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm";
  const activeClasses = active
    ? " bg-[#1453DB] text-gray-200"
    : " text-slate-700 hover:bg-blue-200";

  return (
    <button onClick={onClick} className={base + activeClasses}>
      {Icon && <Icon className="text-lg" />}
      <span>{label}</span>
    </button>
  );
}

function OverviewSection({ mySolicitud, goToInscripcion, goToEstado }) {
  const status = mySolicitud?.estado || "Sin anteproyecto";
  const isApproved = status === "Aprobado";

  let statusClasses = "bg-slate-100 text-slate-600";
  if (status === "Aprobado") statusClasses = "bg-emerald-100 text-emerald-700";
  else if (status === "En Revisión")
    statusClasses = "bg-amber-100 text-amber-700";
  else if (status === "Observado") statusClasses = "bg-red-100 text-red-700";

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Estado del anteproyecto</p>
          <p
            className={
              "inline-flex px-3 py-1 rounded-full text-xs font-semibold " +
              statusClasses
            }
          >
            {status}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">Progreso del proceso</p>
            <p className="text-sm font-semibold text-slate-800">
              {mySolicitud ? "En curso" : "Pendiente de iniciar"}
            </p>
          </div>
          <button
            onClick={isApproved ? goToEstado : goToInscripcion}
            className="mt-3 text-[11px] font-semibold text-[rgba(2,14,159,1)] hover:underline"
          >
            {isApproved ? "Ver aprobación →" : "Ir a inscripción →"}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Acceso rápido</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={isApproved ? goToEstado : goToInscripcion}
              className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-white"
            >
              {isApproved
                ? "Ver aprobación"
                : mySolicitud?.estado === "Observado"
                ? "Corregir anteproyecto"
                : "Inscribir anteproyecto"}
            </button>
            <button
              onClick={goToEstado}
              className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700"
            >
              Ver estado
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            ¿Qué puedo hacer desde este panel?
          </h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>Registrar tu anteproyecto de TCU en línea.</li>
            <li>Monitorear el estado de la revisión.</li>
            <li>Consultar el historial de observaciones y acciones.</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            Próximos pasos
          </h3>
          <p className="text-sm text-slate-600 mb-3">
            {isApproved
              ? "Tu TCU ya fue aprobado. Consulta el estado para descargar el comprobante con tu código de aprobación."
              : "Inicia la inscripción de tu anteproyecto y asegúrate de tener listos tus documentos: constancia de matrícula y copia de cédula."}
          </p>
          <button
            onClick={isApproved ? goToEstado : goToInscripcion}
            className="px-4 py-2 bg-[rgba(2,14,159,1)] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-indigo-900"
          >
            {isApproved
              ? "Ir a estado"
              : mySolicitud?.estado === "Observado"
              ? "Corregir ahora"
              : "Comenzar inscripción ahora"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AlreadySubmittedCard({ solicitud, goToEstado }) {
  const isApproved = solicitud?.estado === "Aprobado";

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 max-w-3xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Inscripción de anteproyecto
        </p>
        <h2 className="text-2xl font-semibold text-slate-900 mt-1">
          {isApproved
            ? "Ya tienes aprobado el TCU"
            : "Ya tienes un anteproyecto registrado"}
        </h2>
      </div>

      <div
        className={
          "rounded-2xl px-4 py-4 mb-6 border " +
          (isApproved
            ? "border-emerald-200 bg-emerald-50"
            : "border-blue-200 bg-blue-50")
        }
      >
        <p
          className={
            "text-sm " + (isApproved ? "text-emerald-900" : "text-blue-900")
          }
        >
          {isApproved
            ? "Ya tienes aprobado el TCU. Ve a Estado para descargar tu comprobante y revisar el código de aprobación."
            : "Tu anteproyecto ya fue enviado y actualmente se encuentra en estado "}
          {!isApproved && (
            <>
              <span className="font-semibold">
                {solicitud?.estado || "Enviado"}
              </span>
              .
            </>
          )}
        </p>
        <p
          className={
            "text-sm mt-2 " +
            (isApproved ? "text-emerald-800" : "text-blue-800")
          }
        >
          {isApproved
            ? "No puedes registrar otro anteproyecto porque el proceso ya quedó aprobado."
            : "Desde aquí no puedes crear otro anteproyecto mientras este proceso siga activo. Puedes revisar el seguimiento, historial y observaciones en la sección de estado."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Estado actual:</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {solicitud?.estado || "Enviado"}
          </p>
        </div>
        {isApproved && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs text-emerald-700">Código de aprobación:</p>
            <p className="text-sm font-mono tracking-[0.2em] font-semibold text-emerald-900 mt-1">
              {solicitud?.codigo_aprobacion || "Pendiente"}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={goToEstado}
          className="px-5 py-2.5 bg-[rgba(2,14,159,1)] text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-900"
        >
          Ir a estado del anteproyecto
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   STEPS DEL WIZARD
   ============================================================ */

function Step1_DatosPersonales({
  formData,
  handleChange,
  disabled = false,
  isObservedMode = false,
}) {
  return (
    <div className={disabled ? "opacity-70" : ""}>
      <h3 className="text-lg font-semibold mb-6">
        Paso 1: Datos Personales y Académicos
      </h3>

      {disabled && isObservedMode && (
        <SectionLockedNotice text="Los datos personales no fueron habilitados para corrección." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="flex flex-col">
          <label className="mb-1 font-medium text-slate-700">
            Nombre Completo del estudiante
          </label>
          <input
            name="nombre"
            value={formData.nombre}
            type="text"
            className="p-2 border rounded-md bg-slate-100 text-slate-700 cursor-not-allowed"
            readOnly
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium text-slate-700">
            Número de Identificación
          </label>
          <input
            name="cedula"
            value={formData.cedula}
            onChange={handleChange}
            type="text"
            disabled={disabled}
            placeholder="Ej: 1-2345-6789"
            className={`p-2 border rounded-md ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
          />
        </div>

        <div className="flex flex-col md:col-span-2">
          <label className="mb-1 font-medium text-slate-700">Carrera</label>
          <input
            name="carrera"
            value={formData.carrera}
            onChange={handleChange}
            type="text"
            disabled={disabled}
            placeholder="Ej: Ingeniería en Desarrollo de Software"
            className={`p-2 border rounded-md ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium text-slate-700">Sede</label>
          <input
            name="sede"
            value={formData.sede}
            onChange={handleChange}
            type="text"
            disabled={disabled}
            placeholder="Ej: San Pedro"
            className={`p-2 border rounded-md ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium text-slate-700">
            Correo electrónico
          </label>
          <input
            name="estudiante_email"
            value={formData.estudiante_email}
            type="email"
            className="p-2 border rounded-md bg-slate-100 text-slate-700 cursor-not-allowed"
            readOnly
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium text-slate-700">
            Número telefónico
          </label>
          <input
            name="estudiante_phone"
            value={formData.estudiante_phone}
            onChange={handleChange}
            type="tel"
            disabled={disabled}
            placeholder="8888-8888"
            className={`p-2 border rounded-md ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium text-slate-700">Oficio</label>
          <input
            name="oficio"
            value={formData.oficio}
            onChange={handleChange}
            type="text"
            disabled={disabled}
            placeholder="Ej: Estudiante"
            className={`p-2 border rounded-md ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium text-slate-700">
            Estado Civil
          </label>
          <select
            name="estado_civil"
            value={formData.estado_civil}
            onChange={handleChange}
            disabled={disabled}
            className={`p-2 border rounded-md ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
          >
            <option value="">Seleccione</option>
            <option value="Soltero">Soltero</option>
            <option value="Casado">Casado</option>
            <option value="Divorciado">Divorciado</option>
            <option value="Viudo">Viudo</option>
          </select>
        </div>

        <div className="flex flex-col md:col-span-2">
          <label className="mb-1 font-medium text-slate-700">Domicilio</label>
          <input
            name="domicilio"
            value={formData.domicilio}
            onChange={handleChange}
            type="text"
            disabled={disabled}
            placeholder="Dirección completa"
            className={`p-2 border rounded-md ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
          />
        </div>

        <div className="flex flex-col md:col-span-2">
          <label className="mb-1 font-medium text-slate-700">
            Lugar de trabajo
          </label>
          <input
            name="lugar_trabajo"
            value={formData.lugar_trabajo}
            onChange={handleChange}
            type="text"
            disabled={disabled}
            placeholder="Ej: Empresa / Institución / Independiente"
            className={`p-2 border rounded-md ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
          />
        </div>
      </div>
    </div>
  );
}

function Step2_Institucion({
  formData,
  handleChange,
  instituciones,
  loading,
  onNewInstitution,
  onNotify,
  disabled = false,
}) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("Todos");

  const [newName, setNewName] = useState("");
  const [newCedulaJuridica, setNewCedulaJuridica] = useState("");
  const [newSupervisor, setNewSupervisor] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newType, setNewType] = useState("");
  const [saving, setSaving] = useState(false);

  const tipos = [
    "Todos",
    ...Array.from(
      new Set(
        (instituciones || []).map((i) => i.tipo_servicio).filter(Boolean),
      ),
    ),
  ];

  const filtered = (instituciones || []).filter((inst) => {
    const q = search.trim().toLowerCase();

    const bySearch =
      !q ||
      String(inst.nombre || "")
        .toLowerCase()
        .includes(q) ||
      String(inst.cedula_juridica || "")
        .toLowerCase()
        .includes(q) ||
      String(inst.supervisor_nombre || "")
        .toLowerCase()
        .includes(q) ||
      String(inst.contacto_email || "")
        .toLowerCase()
        .includes(q) ||
      String(inst.tipo_servicio || "")
        .toLowerCase()
        .includes(q);

    const byTipo =
      tipoFilter === "Todos" || String(inst.tipo_servicio || "") === tipoFilter;

    return bySearch && byTipo;
  });

  const selectInstitution = (inst) => {
    if (disabled) return;

    setShowNewForm(false);

    handleChange({ target: { name: "institucion_id", value: inst.id } });
    handleChange({ target: { name: "institucion", value: inst.nombre } });
    handleChange({
      target: { name: "institucion_cedula", value: inst.cedula_juridica || "" },
    });
    handleChange({
      target: {
        name: "institucion_supervisor",
        value: inst.supervisor_nombre || "",
      },
    });
    handleChange({
      target: {
        name: "institucion_correo",
        value: inst.supervisor_email || inst.contacto_email || "",
      },
    });
    handleChange({
      target: {
        name: "institucion_tipo_servicio",
        value: inst.tipo_servicio || "",
      },
    });
  };

  const handleSubmitNew = async () => {
    if (disabled) return;

    const payload = {
      nombre: newName.trim(),
      cedula_juridica: newCedulaJuridica.trim(),
      supervisor_nombre: newSupervisor.trim(),
      supervisor_email: newEmail.trim(),
      contacto_email: newEmail.trim(),
      tipo_servicio: newType.trim(),
    };

    if (
      !payload.nombre ||
      !payload.cedula_juridica ||
      !payload.supervisor_nombre ||
      !payload.supervisor_email ||
      !payload.tipo_servicio
    ) {
      onNotify(
        "Por favor, completá nombre, cédula jurídica, supervisor, correo y tipo de servicio para la institución.",
        "error",
      );
      return;
    }

    try {
      setSaving(true);

      const res = await api.post("/instituciones/solicitar", payload);
      const nueva = res.data;

      onNotify(
        "Institucion enviada para revision. Coordinacion podra habilitarla desde el catalogo.",
        "success",
      );

      if (onNewInstitution) onNewInstitution(nueva);

      handleChange({ target: { name: "institucion_id", value: nueva.id } });
      handleChange({ target: { name: "institucion", value: nueva.nombre } });
      handleChange({
        target: {
          name: "institucion_cedula",
          value: nueva.cedula_juridica || "",
        },
      });
      handleChange({
        target: {
          name: "institucion_supervisor",
          value: nueva.supervisor_nombre || "",
        },
      });
      handleChange({
        target: {
          name: "institucion_correo",
          value: nueva.supervisor_email || nueva.contacto_email || "",
        },
      });
      handleChange({
        target: {
          name: "institucion_tipo_servicio",
          value: nueva.tipo_servicio || "",
        },
      });

      setShowNewForm(false);
      setNewName("");
      setNewCedulaJuridica("");
      setNewSupervisor("");
      setNewEmail("");
      setNewType("");
    } catch (err) {
      console.error("Error registrando nueva institución:", err);

      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "No se pudo registrar la institución. Intenta de nuevo o contacta a coordinación.";

      onNotify(backendMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={disabled ? "opacity-70" : ""}>
      <h3 className="text-lg font-semibold mb-4">
        Paso 2: Selección de Institución
      </h3>

      {disabled && (
        <SectionLockedNotice text="La sección de institución no fue habilitada para corrección." />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            placeholder="Buscar por nombre, cédula jurídica, supervisor o correo..."
            className={`p-2 border rounded-md w-full md:max-w-lg ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
          />

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            disabled={disabled}
            className={`p-2 border rounded-md w-full md:w-64 ${
              disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
            }`}
          >
            {tipos.map((x) => (
              <option key={x} value={x}>
                {x === "Todos" ? "Todos los tipos" : x}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => !disabled && setShowNewForm(true)}
            disabled={disabled}
            className="px-4 py-2 text-xs bg-[rgba(2,14,159,1)] text-white rounded-md hover:bg-indigo-900 disabled:opacity-50"
          >
            No la encontré → Registrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3 border-b">Nombre institución</th>
                <th className="text-left p-3 border-b">Cédula jurídica</th>
                <th className="text-left p-3 border-b">Supervisor</th>
                <th className="text-left p-3 border-b">Correo</th>
                <th className="text-left p-3 border-b">Tipo de servicio</th>
                <th className="text-left p-3 border-b">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={6}>
                    Cargando instituciones...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={6}>
                    No se encontraron instituciones con esos filtros.
                  </td>
                </tr>
              ) : (
                filtered.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50">
                    <td className="p-3 border-b font-semibold text-slate-800">
                      {inst.nombre}
                    </td>
                    <td className="p-3 border-b text-slate-600">
                      {inst.cedula_juridica || "-"}
                    </td>
                    <td className="p-3 border-b text-slate-600">
                      {inst.supervisor_nombre || "-"}
                    </td>
                    <td className="p-3 border-b text-slate-600">
                      {inst.contacto_email || "-"}
                    </td>
                    <td className="p-3 border-b text-slate-600">
                      {inst.tipo_servicio || "-"}
                    </td>
                    <td className="p-3 border-b">
                      <button
                        type="button"
                        onClick={() => selectInstitution(inst)}
                        disabled={disabled}
                        className="text-[rgba(2,14,159,1)] font-semibold hover:underline disabled:opacity-50"
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-sm">
          <span className="font-semibold text-slate-800">Seleccionada: </span>
          <span className="text-slate-600">
            {formData.institucion || "Ninguna"}
          </span>
        </div>
      </div>

      {showNewForm && !disabled && (
        <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3 text-sm">
          <p className="font-semibold text-slate-800">
            Registrar nueva institución para aprobación
          </p>

          <input
            type="text"
            placeholder="Nombre de la institución"
            className="w-full p-2 border rounded-md"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Cédula jurídica"
            className="w-full p-2 border rounded-md"
            value={newCedulaJuridica}
            onChange={(e) => setNewCedulaJuridica(e.target.value)}
          />
          <input
            type="text"
            placeholder="Nombre del supervisor"
            className="w-full p-2 border rounded-md"
            value={newSupervisor}
            onChange={(e) => setNewSupervisor(e.target.value)}
          />
          <input
            type="email"
            placeholder="Correo de contacto"
            className="w-full p-2 border rounded-md"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <input
            type="text"
            placeholder="Tipo de servicio (Ej: Adulto mayor, Educación)"
            className="w-full p-2 border rounded-md"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          />

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-3 py-1.5 text-xs bg-slate-200 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitNew}
              disabled={saving}
              className="px-4 py-1.5 text-xs bg-[rgba(2,14,159,1)] text-white rounded-md disabled:opacity-60"
            >
              {saving ? "Enviando..." : "Enviar para aprobación"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function aiItemToText(item) {
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean")
    return String(item);
  if (item && typeof item === "object") {
    return (
      item.description ||
      item.issue ||
      item.tip ||
      item.text ||
      item.message ||
      JSON.stringify(item)
    );
  }
  return "";
}

function aiSuggestionToText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value && typeof value === "object") {
    return (
      value.suggestion ||
      value.text ||
      value.description ||
      value.message ||
      JSON.stringify(value, null, 2)
    );
  }
  return "";
}

function normalizeAiResult(result) {
  if (!result || typeof result !== "object") {
    return {
      score: 70,
      issues: [],
      tips: [],
      suggestion: "",
    };
  }

  return {
    score: Number.isFinite(Number(result.score)) ? Number(result.score) : 70,
    issues: Array.isArray(result.issues)
      ? result.issues.map(aiItemToText).filter(Boolean)
      : [],
    tips: Array.isArray(result.tips)
      ? result.tips.map(aiItemToText).filter(Boolean)
      : [],
    suggestion: aiSuggestionToText(result.suggestion),
  };
}

function Step3_ProyectoU({ formData, handleChange, disabled = false }) {
  const [aiLoadingField, setAiLoadingField] = useState(null);
  const [aiResultByField, setAiResultByField] = useState({});

  const askAI = async (field, text) => {
    if (disabled) return;

    try {
      setAiLoadingField(field);

      const res = await api.post("/ai/redaccion", {
        step: 3,
        field,
        text,
        formData,
      });

      const normalized = normalizeAiResult(res.data);

      setAiResultByField((prev) => ({
        ...prev,
        [field]: normalized,
      }));
    } catch (err) {
      console.error("Error usando IA en Step 3:", err);
      toast.error("No se pudo obtener ayuda de IA.");
    } finally {
      setAiLoadingField(null);
    }
  };

  const applySuggestion = (field) => {
    const suggestion = aiSuggestionToText(aiResultByField?.[field]?.suggestion);
    if (!suggestion) return;

    handleChange({
      target: {
        name: field,
        value: suggestion,
      },
    });

    toast.success("Sugerencia aplicada correctamente.");
  };

  const renderAIBox = (field) => {
    const result = aiResultByField?.[field];
    if (!result) return null;

    return (
      <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-slate-800">Análisis de IA</p>
        </div>

        {!!result.issues?.length && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              Observaciones
            </p>
            <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
              {result.issues.map((item, idx) => (
                <li key={idx}>{aiItemToText(item)}</li>
              ))}
            </ul>
          </div>
        )}

        {!!result.tips?.length && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-700 mb-1">
              Recomendaciones
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
              {result.tips.map((tip, idx) => (
                <li key={idx}>{aiItemToText(tip)}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-blue-100 bg-white p-3">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            Redacción sugerida
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {aiSuggestionToText(result.suggestion) ||
              "No se recibió sugerencia."}
          </p>
        </div>

        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={() => applySuggestion(field)}
            className="px-3 py-2 text-xs bg-[rgba(2,14,159,1)] text-white rounded-lg hover:bg-indigo-900"
          >
            Usar sugerencia
          </button>
        </div>
      </div>
    );
  };

  const textAreaClass = (disabled) =>
    `w-full p-2 border rounded-md ${
      disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
    }`;

  const aiButton = (field, text, label = "Ayudarme con IA") => (
    <div className="flex justify-end mt-2">
      <button
        type="button"
        onClick={() => askAI(field, text)}
        disabled={disabled || aiLoadingField === field}
        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-50"
      >
        {aiLoadingField === field ? "Analizando..." : `✨ ${label}`}
      </button>
    </div>
  );

  return (
    <div className={disabled ? "opacity-70" : ""}>
      <h3 className="text-lg font-semibold mb-4">Paso 3: Datos del proyecto</h3>

      {disabled && (
        <SectionLockedNotice text="La sección de proyecto no fue habilitada para corrección." />
      )}

      <div className="space-y-5 text-sm">
        <div>
          <textarea
            name="tituloProyecto"
            value={formData.tituloProyecto}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Título del proyecto"
            className={`${textAreaClass(disabled)} h-16`}
          />
          {aiButton(
            "tituloProyecto",
            formData.tituloProyecto,
            "Analizar título",
          )}
          {renderAIBox("tituloProyecto")}
        </div>

        <div>
          <textarea
            name="justificacion"
            value={formData.justificacion}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Descripción del problema"
            className={`${textAreaClass(disabled)} h-20`}
          />
          {aiButton(
            "justificacion",
            formData.justificacion,
            "Analizar descripción",
          )}
          {renderAIBox("justificacion")}
        </div>

        <div>
          <textarea
            name="objetivoGeneral"
            value={formData.objetivoGeneral}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Objetivo general"
            className={`${textAreaClass(disabled)} h-16`}
          />
          {aiButton(
            "objetivoGeneral",
            formData.objetivoGeneral,
            "Analizar objetivo",
          )}
          {renderAIBox("objetivoGeneral")}
        </div>

        <div>
          <textarea
            name="beneficiarios"
            value={formData.beneficiarios}
            onChange={handleChange}
            disabled={disabled}
            placeholder="¿A quién se beneficiará el proyecto?"
            className={`${textAreaClass(disabled)} h-16`}
          />
          {aiButton(
            "beneficiarios",
            formData.beneficiarios,
            "Analizar beneficiarios",
          )}
          {renderAIBox("beneficiarios")}
        </div>

        <div>
          <textarea
            name="estrategiaSolucion"
            value={formData.estrategiaSolucion}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Estrategia y pertinencia de solución (actividades principales)"
            className={`${textAreaClass(disabled)} h-20`}
          />
          {aiButton(
            "estrategiaSolucion",
            formData.estrategiaSolucion,
            "Analizar estrategia",
          )}
          {renderAIBox("estrategiaSolucion")}
        </div>
      </div>
    </div>
  );
}

function Step4_ObjetivosEspecificos({
  formData,
  addObjetivo,
  removeObjetivo,
  updateObjetivo,
  disabled = false,
}) {
  const baseItems = Array.isArray(formData.objetivosEspecificosItems)
    ? [...formData.objetivosEspecificosItems]
    : [];

  while (baseItems.length < 3) {
    baseItems.push("");
  }

  const items = baseItems;

  const [aiLoadingIndex, setAiLoadingIndex] = useState(null);
  const [aiResultByIndex, setAiResultByIndex] = useState({});

  const askAIObjective = async (idx, text) => {
    if (disabled) return;

    try {
      setAiLoadingIndex(idx);

      const res = await api.post("/ai/redaccion", {
        step: 4,
        field: "objetivoEspecifico",
        text,
        formData,
      });

      const normalized = normalizeAiResult(res.data);

      setAiResultByIndex((prev) => ({
        ...prev,
        [idx]: normalized,
      }));
    } catch (err) {
      console.error("Error usando IA en Step 4:", err);
      toast.error("No se pudo obtener ayuda de IA.");
    } finally {
      setAiLoadingIndex(null);
    }
  };

  const applySuggestion = (idx) => {
    const suggestion = aiSuggestionToText(aiResultByIndex?.[idx]?.suggestion);
    if (!suggestion) return;

    updateObjetivo(idx, suggestion);
    toast.success("Sugerencia aplicada correctamente.");
  };

  const renderObjectiveAIBox = (idx) => {
    const result = aiResultByIndex?.[idx];
    if (!result) return null;

    return (
      <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-slate-800">Análisis de IA</p>
        </div>

        {!!result.issues?.length && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              Observaciones
            </p>
            <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
              {result.issues.map((item, i) => (
                <li key={i}>{aiItemToText(item)}</li>
              ))}
            </ul>
          </div>
        )}

        {!!result.tips?.length && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-700 mb-1">
              Recomendaciones
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
              {result.tips.map((tip, i) => (
                <li key={i}>{aiItemToText(tip)}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-blue-100 bg-white p-3">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            Objetivo sugerido
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {aiSuggestionToText(result.suggestion) ||
              "No se recibió sugerencia."}
          </p>
        </div>

        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={() => applySuggestion(idx)}
            className="px-3 py-2 text-xs bg-[rgba(2,14,159,1)] text-white rounded-lg hover:bg-indigo-900"
          >
            Usar sugerencia
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={disabled ? "opacity-70" : ""}>
      <h3 className="text-lg font-semibold mb-4">
        Paso 4: Objetivos específicos
      </h3>

      {disabled && (
        <SectionLockedNotice text="La sección de objetivos no fue habilitada para corrección." />
      )}

      <p className="text-sm text-slate-600 mb-3">
        Debes completar obligatoriamente los primeros 3 objetivos específicos.
        Si necesitas más, puedes agregarlos después.
      </p>

      <div className="space-y-4">
        {items.map((obj, idx) => {
          const isRequired = idx < 3;
          const isEmpty = !String(obj || "").trim();

          return (
            <div key={idx} className="rounded-xl border border-slate-200 p-3">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Objetivo específico #{idx + 1}
                    </span>
                    {isRequired && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                        Obligatorio
                      </span>
                    )}
                  </div>

                  <input
                    value={obj}
                    onChange={(e) => updateObjetivo(idx, e.target.value)}
                    disabled={disabled}
                    placeholder={`Objetivo específico #${idx + 1}`}
                    className={`w-full p-2 border rounded-md text-sm ${
                      disabled
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                        : isRequired && isEmpty
                          ? "border-amber-300 bg-amber-50"
                          : ""
                    }`}
                  />

                  {isRequired && isEmpty && !disabled && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      Este objetivo es obligatorio.
                    </p>
                  )}

                  {!isRequired && !obj.trim() && !disabled && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Completa este objetivo adicional o quitalo.
                    </p>
                  )}

                  {!disabled && (
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => askAIObjective(idx, obj)}
                        disabled={aiLoadingIndex === idx}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-50"
                      >
                        {aiLoadingIndex === idx
                          ? "Analizando..."
                          : "✨ Analizar Objetivo Específico"}
                      </button>
                    </div>
                  )}

                  {renderObjectiveAIBox(idx)}
                </div>

                <button
                  type="button"
                  onClick={() => removeObjetivo(idx)}
                  disabled={items.length <= 3 || disabled}
                  className="px-3 py-2 text-xs bg-slate-200 rounded-md disabled:opacity-50 hover:bg-slate-300"
                  title="Quitar"
                >
                  Quitar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={addObjetivo}
          disabled={disabled}
          className="px-4 py-2 text-xs bg-[rgba(2,14,159,1)] text-white rounded-md hover:bg-indigo-900 disabled:opacity-50"
        >
          + Agregar objetivo
        </button>
      </div>
    </div>
  );
}

function Step5_Cronograma({ formData, setFormData, disabled = false }) {
  const items = formData.cronogramaItems || [
    { actividad: "", tarea: "", horas: "" },
  ];

  const [showHoursHelp, setShowHoursHelp] = useState(false);
  const [touchedRows, setTouchedRows] = useState({});

  const getRowErrors = (row) => {
    const actividad = String(row?.actividad || "").trim();
    const tarea = String(row?.tarea || "").trim();
    const horasRaw = String(row?.horas || "").trim();

    const errors = {
      actividad: !actividad,
      tarea: !tarea,
      horas: false,
      horasMensaje: "",
    };

    if (!horasRaw) {
      errors.horas = true;
      errors.horasMensaje = "Las horas son obligatorias.";
    } else {
      const horasNum = Number(horasRaw);

      if (!Number.isFinite(horasNum) || !Number.isInteger(horasNum)) {
        errors.horas = true;
        errors.horasMensaje = "Ingresá un número entero.";
      } else if (horasNum <= 0) {
        errors.horas = true;
        errors.horasMensaje = "Debe ser mayor a 0 horas.";
      } else if (horasNum > 8) {
        errors.horas = true;
        errors.horasMensaje = "El máximo permitido es 8 horas.";
      }
    }

    return errors;
  };

  const rowHasErrors = (row) => {
    const errors = getRowErrors(row);
    return errors.actividad || errors.tarea || errors.horas;
  };

  const markRowTouched = (idx) => {
    setTouchedRows((prev) => ({ ...prev, [idx]: true }));
  };

  const addRow = () => {
    if (disabled) return;

    const invalidIndexes = items
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => rowHasErrors(row))
      .map(({ idx }) => idx);

    if (invalidIndexes.length > 0) {
      const nextTouched = {};
      invalidIndexes.forEach((idx) => {
        nextTouched[idx] = true;
      });

      setTouchedRows((prev) => ({ ...prev, ...nextTouched }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      cronogramaItems: [...items, { actividad: "", tarea: "", horas: "" }],
    }));
  };

  const removeRow = (idx) => {
    if (disabled) return;

    setFormData((prev) => {
      const next = [...items];
      next.splice(idx, 1);

      return {
        ...prev,
        cronogramaItems: next.length
          ? next
          : [{ actividad: "", tarea: "", horas: "" }],
      };
    });

    setTouchedRows((prev) => {
      const clone = { ...prev };
      delete clone[idx];
      return clone;
    });
  };

  const updateRow = (idx, field, value) => {
    if (disabled) return;

    let nextValue = value;

    if (field === "horas") {
      nextValue = String(value).replace(/[^\d]/g, "");
    }

    setFormData((prev) => {
      const next = [...items];
      next[idx] = { ...next[idx], [field]: nextValue };
      return { ...prev, cronogramaItems: next };
    });
  };

  const getInputClass = (hasError, isDisabled) => {
    const base =
      "w-full p-2 rounded-md border outline-none transition-all text-sm";

    if (isDisabled) {
      return `${base} bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200`;
    }

    if (hasError) {
      return `${base} border-red-400 bg-red-50 text-slate-800 placeholder:text-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-500`;
    }

    return `${base} border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-100 focus:border-[rgba(2,14,159,1)]`;
  };

  const totalHoras = items.reduce((acc, row) => {
    const n = Number(row?.horas || 0);
    return Number.isFinite(n) ? acc + n : acc;
  }, 0);

  return (
    <div className={disabled ? "opacity-70" : ""}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold">Paso 5: Cronograma</h3>

        <div className="flex items-center gap-2">
          <div className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
            Total horas: {totalHoras}
          </div>

          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowHoursHelp(true)}
              onMouseLeave={() => setShowHoursHelp(false)}
              onClick={() => setShowHoursHelp((prev) => !prev)}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600"
            >
              <LuInfo className="text-base" />
            </button>

            {showHoursHelp && (
              <div className="absolute right-0 top-10 z-20 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">
                  Reglas para el cronograma
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cada fila del cronograma debe completarse obligatoriamente con
                  los campos de actividad, tarea y horas. El campo de horas debe
                  ser un valor numérico válido entre 1 y 8, por lo que no se
                  permite ingresar valores iguales a 0.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {disabled && (
        <SectionLockedNotice text="La sección de cronograma no fue habilitada para corrección." />
      )}

      <p className="text-sm text-slate-600 mb-3">
        Agregá actividades, tareas y horas estimadas.
      </p>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="p-3 border-b">Actividad</th>
              <th className="p-3 border-b">Tarea</th>
              <th className="p-3 border-b w-32">Horas</th>
              <th className="p-3 border-b w-24"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => {
              const errors = getRowErrors(row);
              const touched = !!touchedRows[idx];

              return (
                <tr key={idx} className="bg-white align-top">
                  <td className="p-2 border-b">
                    <input
                      className={getInputClass(
                        touched && errors.actividad,
                        disabled,
                      )}
                      value={row.actividad}
                      disabled={disabled}
                      onBlur={() => markRowTouched(idx)}
                      onChange={(e) =>
                        updateRow(idx, "actividad", e.target.value)
                      }
                      placeholder="Ej: Diagnóstico"
                    />
                    {touched && errors.actividad && (
                      <p className="mt-1 text-[11px] text-red-600">
                        La actividad es obligatoria.
                      </p>
                    )}
                  </td>

                  <td className="p-2 border-b">
                    <input
                      className={getInputClass(
                        touched && errors.tarea,
                        disabled,
                      )}
                      value={row.tarea}
                      disabled={disabled}
                      onBlur={() => markRowTouched(idx)}
                      onChange={(e) => updateRow(idx, "tarea", e.target.value)}
                      placeholder="Ej: Recolección de información"
                    />
                    {touched && errors.tarea && (
                      <p className="mt-1 text-[11px] text-red-600">
                        La tarea es obligatoria.
                      </p>
                    )}
                  </td>

                  <td className="p-2 border-b">
                    <input
                      className={getInputClass(
                        touched && errors.horas,
                        disabled,
                      )}
                      value={row.horas}
                      disabled={disabled}
                      onBlur={() => markRowTouched(idx)}
                      onChange={(e) => updateRow(idx, "horas", e.target.value)}
                      placeholder="1 a 8"
                      inputMode="numeric"
                    />
                    {touched && errors.horas && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.horasMensaje}
                      </p>
                    )}
                  </td>

                  <td className="p-2 border-b text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      disabled={items.length === 1 || disabled}
                      className="px-3 py-2 text-xs bg-slate-200 rounded-md disabled:opacity-50 hover:bg-slate-300"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between mt-3 gap-3 flex-wrap">
        <p className="text-xs text-slate-500">
          No se puede agregar una nueva fila si la anterior está vacía o tiene
          horas inválidas.
        </p>

        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          className="px-4 py-2 text-xs bg-[rgba(2,14,159,1)] text-white rounded-md hover:bg-indigo-900 disabled:opacity-50"
        >
          + Agregar fila
        </button>
      </div>
    </div>
  );
}

function Step6_Resumen({ formData }) {
  const objetivosItems = (
    Array.isArray(formData.objetivosEspecificosItems)
      ? formData.objetivosEspecificosItems
      : []
  )
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const cronogramaItems = (
    Array.isArray(formData.cronogramaItems) ? formData.cronogramaItems : []
  )
    .map((r) => ({
      actividad: String(r?.actividad || "").trim(),
      tarea: String(r?.tarea || "").trim(),
      horas: String(r?.horas ?? "").trim(),
    }))
    .filter((r) => r.actividad || r.tarea || r.horas);

  const Field = ({ label, value }) => (
    <div className="grid md:grid-cols-[220px_1fr] gap-2 py-2 border-b border-slate-100 last:border-b-0">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="text-slate-800 break-words">
        {value || "No indicado"}
      </span>
    </div>
  );

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Paso 6: Confirmación</h3>

      <p className="text-sm text-slate-600 mb-5">
        Revisá cuidadosamente toda la información. Al dar clic en
        <span className="font-semibold"> “Finalizar y Enviar” </span>
        se descargará un PDF con este resumen y luego se enviará tu anteproyecto
        para revisión.
      </p>

      <div className="space-y-5 text-sm">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-base font-semibold text-slate-900 mb-3">
            Datos del estudiante
          </h4>
          <div>
            <Field label="Nombre completo" value={formData.nombre} />
            <Field label="Cédula" value={formData.cedula} />
            <Field label="Carrera" value={formData.carrera} />
            <Field label="Sede" value={formData.sede} />
            <Field
              label="Correo electrónico"
              value={formData.estudiante_email}
            />
            <Field
              label="Número telefónico"
              value={formData.estudiante_phone}
            />
            <Field label="Oficio" value={formData.oficio} />
            <Field label="Estado civil" value={formData.estado_civil} />
            <Field label="Domicilio" value={formData.domicilio} />
            <Field label="Lugar de trabajo" value={formData.lugar_trabajo} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-base font-semibold text-slate-900 mb-3">
            Datos de la institución
          </h4>
          <div>
            <Field
              label="Institución seleccionada"
              value={formData.institucion}
            />
            <Field
              label="Cédula jurídica"
              value={formData.institucion_cedula}
            />
            <Field label="Supervisor" value={formData.institucion_supervisor} />
            <Field
              label="Correo de contacto"
              value={formData.institucion_correo}
            />
            <Field
              label="Tipo de servicio"
              value={formData.institucion_tipo_servicio}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-base font-semibold text-slate-900 mb-3">
            Datos del proyecto
          </h4>
          <div>
            <Field
              label="Título del proyecto"
              value={formData.tituloProyecto}
            />
            <Field
              label="Descripción del problema"
              value={formData.justificacion}
            />
            <Field label="Objetivo general" value={formData.objetivoGeneral} />
            <Field label="Beneficiarios" value={formData.beneficiarios} />
            <Field
              label="Estrategia de solución"
              value={formData.estrategiaSolucion}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-base font-semibold text-slate-900 mb-3">
            Objetivos específicos
          </h4>

          {objetivosItems.length ? (
            <div className="space-y-2">
              {objetivosItems.map((obj, i) => (
                <div
                  key={`${i}-${obj.slice(0, 20)}`}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <span className="font-semibold text-slate-700 mr-2">
                    {i + 1}.
                  </span>
                  <span className="text-slate-800">{obj}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">
              No agregaste objetivos específicos.
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-base font-semibold text-slate-900 mb-3">
            Cronograma
          </h4>

          {cronogramaItems.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">#</th>
                    <th className="text-left px-3 py-2 border-b">Actividad</th>
                    <th className="text-left px-3 py-2 border-b">Tarea</th>
                    <th className="text-left px-3 py-2 border-b">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {cronogramaItems.map((r, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">{r.actividad || "—"}</td>
                      <td className="px-3 py-2">{r.tarea || "—"}</td>
                      <td className="px-3 py-2">{r.horas || "0"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500">No agregaste filas de cronograma.</p>
          )}
        </div>
      </div>
    </div>
  );
}
