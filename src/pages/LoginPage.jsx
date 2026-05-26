import { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [code, setCode] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [debugCode, setDebugCode] = useState("");

  const handleMicrosoftClick = async () => {
    setErr("");
    setMsg("");
    setDebugCode("");

    const eclean = email.trim().toLowerCase();
    if (!eclean) return setErr("Ingresá tu correo.");

    try {
      setBusy(true);

      const res = await requestOtp(eclean);

      console.log("Respuesta requestOtp:", res);
      console.log("Código OTP para pruebas:", res?.code);

      setMsg(res?.message || "Código generado correctamente.");
      setDebugCode(res?.code || "");
      setStep(2);
    } catch (error) {
      console.error("Error requestOtp:", error?.response?.data || error);
      setErr(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "No se pudo enviar el código.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const eclean = email.trim().toLowerCase();
    const cclean = code.trim();

    if (!cclean) return setErr("Ingresá el código de 6 dígitos.");

    try {
      setBusy(true);
      const u = await verifyOtp(eclean, cclean, nombre.trim());

      if (u?.role === "COORD") navigate("/admin");
      else navigate("/portal");
    } catch (error) {
      console.error("Error verifyOtp:", error?.response?.data || error);
      setErr(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Código incorrecto o expirado.",
      );
    } finally {
      setBusy(false);
    }
  };

  const backToEmail = () => {
    setStep(1);
    setCode("");
    setMsg("");
    setErr("");
    setDebugCode("");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden px-4 py-8">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{
          backgroundImage: "url('/u-de-blog-1024x644.jpg')",
        }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,18,80,0.82)_20%,rgba(6,18,80,0.72)_40%,rgba(6,18,80,0.82)_50%)]" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-20 w-80 h-80 bg-[#ffd600]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-[fadeIn_.5s_ease-out]">
        <div className="text-center mb-6 md:mb-8">
          <div className="flex flex-col items-center">
            <img
              src="/FideLogo-04.png"
              alt="Universidad Fidélitas"
              className="h-24 md:h-28 w-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-white/88 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.30)] p-6 md:p-7">
          <div className="text-center">
            <h2 className="mt-2 text-2xl font-bold text-slate-200">
              Bienvenido a TechSeed
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Ingresá con tu correo de prueba
            </p>
          </div>

          {err && (
            <div className="mt-5 text-sm bg-red-50/90 text-red-700 border border-red-200 rounded-2xl p-3.5 shadow-sm">
              {err}
            </div>
          )}

          {msg && (
            <div className="mt-5 text-sm bg-blue-50/90 text-blue-700 border border-blue-200 rounded-2xl p-3.5 shadow-sm">
              {msg}
            </div>
          )}

          {debugCode && (
            <div className="mt-5 text-sm bg-amber-50/90 text-amber-800 border border-amber-200 rounded-2xl p-3.5 shadow-sm">
              <span className="font-semibold">Código para pruebas:</span>{" "}
              <span className="font-mono tracking-[0.2em]">{debugCode}</span>
            </div>
          )}

          {step === 1 ? (
            <div className="mt-6 space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Correo"
                  className="w-full p-2.5 border border-slate-200 rounded-2xl outline-none bg-white/95 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Nombre (opcional para primer ingreso)"
                  className="w-full p-2.5 border border-slate-200 rounded-2xl outline-none bg-white/95 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <button
                onClick={handleMicrosoftClick}
                disabled={busy}
                className="w-full border border-slate-200 bg-white/95 rounded-2xl p-2.5 flex items-center justify-center gap-3 hover:bg-slate-50 transition disabled:opacity-60 shadow-sm"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100">
                  <span className="grid grid-cols-2 gap-[2px]">
                    <span className="w-[9px] h-[9px] bg-red-500 block rounded-[1px]" />
                    <span className="w-[9px] h-[9px] bg-green-500 block rounded-[1px]" />
                    <span className="w-[9px] h-[9px] bg-blue-500 block rounded-[1px]" />
                    <span className="w-[9px] h-[9px] bg-yellow-400 block rounded-[1px]" />
                  </span>
                </span>

                <span className="text-sm font-semibold text-slate-700">
                  {busy ? "Enviando..." : "Solicitar código"}
                </span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-500">Login de prueba</p>
                <span className="text-[11px] px-2.5 py-1 text-slate-500">
                  Universidad Fidélitas
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                Código enviado a:{" "}
                <span className="font-semibold break-all">
                  {email.trim().toLowerCase()}
                </span>
              </div>

              <input
                inputMode="numeric"
                placeholder="Código de 6 dígitos"
                className="w-full p-2.5 border border-slate-200 rounded-2xl outline-none bg-white/95 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 tracking-[0.30em] text-center text-md font-semibold text-slate-800 placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 transition"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />

              <button
                disabled={busy}
                className="w-full bg-[rgba(2,14,159,1)] text-white p-2.5 rounded-2xl font-semibold disabled:opacity-60 hover:bg-indigo-900 transition shadow-lg shadow-blue-900/20"
              >
                {busy ? "Verificando..." : "Ingresar"}
              </button>

              <button
                type="button"
                onClick={backToEmail}
                className="w-full p-2.5 rounded-2xl font-semibold border border-slate-200 text-slate-700 bg-white/90 hover:bg-slate-50 transition"
              >
                Cambiar correo
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
