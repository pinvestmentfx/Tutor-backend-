// Backend mínimo para el tutor de idiomas.
// Guarda tu API key de Anthropic en una variable de entorno, NUNCA en el código.
//
// Instalación:
//   npm install express cors dotenv
// Ejecución:
//   ANTHROPIC_API_KEY=sk-ant-... node server.js

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const LANGUAGE_NAMES = {
  en: "Inglés",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  pt: "Portugués",
  ja: "Japonés",
};

function systemPrompt(lang, level) {
  const langName = LANGUAGE_NAMES[lang] || lang;
  return `Eres un tutor de ${langName} paciente y cálido, hablando con un estudiante de nivel ${level} (escala CEFR).

Reglas estrictas de formato — responde SIEMPRE en JSON válido, sin texto fuera del JSON, con esta forma exacta:
{
  "reply": "tu respuesta conversacional en ${langName}, adaptada al nivel ${level}",
  "translation": "traducción breve de tu respuesta al español",
  "correction": {
    "hasError": true o false,
    "original": "fragmento exacto que el estudiante escribió mal (o cadena vacía si no hay error)",
    "fixed": "la forma corregida (o cadena vacía)",
    "note": "explicación breve en español de por qué, en una frase (o cadena vacía)"
  }
}

Comportamiento:
- Mantén la conversación fluida y natural, sobre temas cotidianos, con vocabulario y gramática apropiados al nivel ${level}.
- Corrige como mucho UN error por turno, el más importante. Si no hay errores relevantes, hasError debe ser false.
- Nunca regañes; el tono de la corrección es de acompañamiento, no de examen.
- No agregues texto antes ni después del JSON.`;
}

app.post("/chat", async (req, res) => {
  try {
    const { messages, lang, level } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt(lang, level),
        messages,
      }),
    });

    const data = await response.json();
    const text = data.content.map((b) => b.text || "").join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    res.json(parsed);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "No se pudo generar la respuesta" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend escuchando en puerto ${PORT}`));
