const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getPromptByStep(step, field, text, formData = {}) {
  const contexto = `
Contexto del formulario:
- Título del proyecto: ${formData.tituloProyecto || ""}
- Descripción del problema: ${formData.justificacion || ""}
- Objetivo general: ${formData.objetivoGeneral || ""}
- Beneficiarios: ${formData.beneficiarios || ""}
- Estrategia de solución: ${formData.estrategiaSolucion || ""}
`;

  if (step === 3) {
    return `
Sos un asistente académico para anteproyectos de TCU de la Universidad Fidélitas.

Tu tarea es revisar y mejorar el campo "${field}" sin inventar información nueva.

Reglas obligatorias:
- corregí redacción, claridad y formalidad
- mantené el sentido académico
- evitá ambigüedad
- si es objetivo general, verificá que inicie con verbo en infinitivo
- si es título, verificá claridad, especificidad y enfoque
- respondé únicamente en JSON válido
- "issues" debe traer al menos 1 observación concreta
- "tips" debe traer exactamente 2 recomendaciones concretas
- "suggestion" debe traer una redacción mejorada
- "score" debe ir de 1 a 10

${contexto}

Texto actual:
${text || ""}

Respondé exactamente con este formato:
{
  "score": 0,
  "issues": ["..."],
  "tips": ["...", "..."],
  "suggestion": "..."
}
`;
  }

  if (step === 4) {
    return `
Sos un asistente académico para anteproyectos de TCU de la Universidad Fidélitas.

Estás revisando un objetivo específico.

Reglas obligatorias:
- verificá si inicia con verbo en infinitivo
- revisá claridad
- evitá redundancia
- mejorá la redacción
- respondé únicamente en JSON válido
- "issues" debe traer al menos 1 observación concreta
- "tips" debe traer exactamente 2 recomendaciones concretas
- "suggestion" debe traer una redacción mejorada
- "score" debe ir de 1 a 10

${contexto}

Texto actual:
${text || ""}

Respondé exactamente con este formato:
{
  "score": 0,
  "issues": ["..."],
  "tips": ["...", "..."],
  "suggestion": "..."
}
`;
  }

  if (step === 5) {
    return `
Sos un asistente académico para anteproyectos de TCU de la Universidad Fidélitas.

Estás revisando una fila de cronograma.

Reglas obligatorias:
- validá claridad de actividad
- validá claridad de tarea
- revisá coherencia entre actividad y tarea
- sugerí mejor redacción
- respondé únicamente en JSON válido
- "issues" debe traer al menos 1 observación concreta
- "tips" debe traer exactamente 2 recomendaciones concretas
- "suggestion" debe traer una redacción mejorada
- "score" debe ir de 1 a 10

${contexto}

Campo a revisar: ${field}
Texto actual:
${text || ""}

Respondé exactamente con este formato:
{
  "score": 0,
  "issues": ["..."],
  "tips": ["...", "..."],
  "suggestion": "..."
}
`;
  }

  return `
Sos un asistente académico.

Mejorá el siguiente texto sin inventar datos y respondé únicamente en JSON válido.

Reglas obligatorias:
- "issues" debe traer al menos 1 observación concreta
- "tips" debe traer exactamente 2 recomendaciones concretas
- "suggestion" debe traer una redacción mejorada
- "score" debe ir de 1 a 10

Texto:
${text || ""}

Formato:
{
  "score": 0,
  "issues": ["..."],
  "tips": ["...", "..."],
  "suggestion": "..."
}
`;
}

function toText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value && typeof value === "object") {
    return (
      value.description ||
      value.issue ||
      value.tip ||
      value.text ||
      value.message ||
      JSON.stringify(value)
    );
  }
  return "";
}

function getDefaultIssue(step, field) {
  if (step === 3 && field === "tituloProyecto") {
    return "El título puede mejorarse en claridad, precisión y enfoque académico.";
  }
  if (step === 4) {
    return "El objetivo específico puede mejorarse en redacción y precisión.";
  }
  if (step === 5) {
    return "El texto puede detallarse mejor para que sea más claro y coherente.";
  }
  return "El texto puede mejorarse en claridad y redacción.";
}

function getDefaultTips(step, field) {
  if (step === 3 && field === "tituloProyecto") {
    return [
      "Hacé el título más específico respecto al problema o sistema que se desarrollará.",
      "Usá una redacción más clara y académica, evitando términos demasiado generales.",
    ];
  }

  if (step === 4) {
    return [
      "Iniciá el objetivo con un verbo en infinitivo.",
      "Redactá el objetivo de forma concreta y evitando redundancias.",
    ];
  }

  if (step === 5) {
    return [
      "Describí la actividad y la tarea con mayor precisión.",
      "Asegurate de que la tarea esté directamente relacionada con la actividad.",
    ];
  }

  return [
    "Mejorá la claridad del texto.",
    "Usá una redacción más formal y precisa.",
  ];
}

function normalizeAiPayload(raw, step, field, originalText) {
  const safe = raw && typeof raw === "object" ? raw : {};

  const issues = Array.isArray(safe.issues)
    ? safe.issues.map(toText).filter(Boolean)
    : [];

  const tips = Array.isArray(safe.tips)
    ? safe.tips.map(toText).filter(Boolean)
    : [];

  const suggestion =
    toText(safe.suggestion) || String(originalText || "").trim();

  return {
    score: Number.isFinite(Number(safe.score)) ? Number(safe.score) : 7,
    issues: issues.length ? issues : [getDefaultIssue(step, field)],
    tips: tips.length ? tips : getDefaultTips(step, field),
    suggestion,
  };
}

async function redactarAyuda(req, res) {
  try {
    const { step, field, text, formData } = req.body;

    if (!step || !field) {
      return res.status(400).json({
        message: "step y field son requeridos",
      });
    }

    const prompt = getPromptByStep(step, field, text, formData);

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: prompt,
    });

    const rawText = response.output_text || "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        score: 7,
        issues: [],
        tips: [],
        suggestion: rawText,
      };
    }

    const normalized = normalizeAiPayload(parsed, step, field, text);
    return res.json(normalized);
  } catch (err) {
    console.error("Error en IA:", err);
    return res.status(500).json({
      message: "Error consultando OpenAI",
      error: err.message,
    });
  }
}

module.exports = {
  redactarAyuda,
};
