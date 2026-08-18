 const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function llamarClaude(systemPrompt, messages, maxTokens = 1000) {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  const rawText = data.content?.[0]?.text || '{}';
  const clean = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

app.get('/', (req, res) => {
  res.send('Tutor backend funcionando ✅');
});

// ---------- RUTA TEMPORAL DE DIAGNÓSTICO ----------
// Borrar después de confirmar que la key está bien cargada.
app.get('/debug-key', (req, res) => {
  const key = ANTHROPIC_API_KEY || '';
  res.json({
    existe: !!ANTHROPIC_API_KEY,
    longitud: key.length,
    empiezaCon: key.slice(0, 15),
    terminaCon: key.slice(-6),
  });
});

// ---------- CHAT (gratis y pago) ----------
// Espera: { message, language, history }
// La corrección siempre viaja en la respuesta; el cliente decide si la
// muestra al toque (pago) o la junta para mostrar cada 10 mensajes (gratis).
app.post('/chat', async (req, res) => {
  try {
    const { message, language, history } = req.body;
    if (!message || !language) {
      return res.status(400).json({ error: 'Faltan campos: message y language' });
    }

    const systemPrompt = `Eres un tutor de idiomas experto en ${language}.
Mantené una conversación natural en ${language}, como un hablante nativo charlando normal.
No corrijas errores dentro de la charla misma.
Respondé SOLO con JSON válido (sin markdown) con esta forma exacta:
{
  "reply": "tu respuesta conversacional en ${language}",
  "correction": "si hubo errores, explicá brevemente en español cuáles y la forma correcta. Si no hubo errores, string vacío."
}`;

    const messages = [...(history || []), { role: 'user', content: message }];
    const parsed = await llamarClaude(systemPrompt, messages);
    res.json(parsed);
  } catch (error) {
    console.error('Error en /chat:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------- GENERAR TEST (solo pago) ----------
// Espera: { language }
// Devuelve 10 preguntas mezcladas: tipo "pregunta" (vocabulario/gramática,
// responde corto) y tipo "oracion" (el usuario escribe una oración libre
// sobre un tema dado, se corrige como examen).
app.post('/test/generate', async (req, res) => {
  try {
    const { language } = req.body;
    if (!language) return res.status(400).json({ error: 'Falta language' });

    const systemPrompt = `Generá un test de 10 preguntas para practicar ${language}, de nivel variado.
Mezclá dos tipos:
- "pregunta": pregunta corta de vocabulario o gramática (el estudiante responde una palabra o frase corta)
- "oracion": le pedís al estudiante que escriba una oración en ${language} sobre un tema o usando una palabra/estructura dada

Respondé SOLO con JSON válido (sin markdown) con esta forma exacta:
{
  "questions": [
    { "id": 1, "type": "pregunta" | "oracion", "prompt": "texto de la consigna en español" }
  ]
}
Debe haber exactamente 10 elementos en total, mezclando ambos tipos.`;

    const parsed = await llamarClaude(systemPrompt, [
      { role: 'user', content: `Generá el test de ${language}.` },
    ]);
    res.json(parsed);
  } catch (error) {
    console.error('Error en /test/generate:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------- CORREGIR TEST (solo pago) ----------
// Espera: { language, answers: [{ id, type, prompt, answer }] }
app.post('/test/grade', async (req, res) => {
  try {
    const { language, answers } = req.body;
    if (!language || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Faltan campos: language y answers' });
    }

    const systemPrompt = `Sos un corrector de exámenes de ${language}.
Te paso una lista de preguntas y las respuestas que dio el estudiante.
Para cada una, decidí si está correcta o no, y dejá una explicación breve en español.
Al final calculá el puntaje total (cuántas están bien sobre el total).

Respondé SOLO con JSON válido (sin markdown) con esta forma exacta:
{
  "score": 7,
  "total": 10,
  "results": [
    { "id": 1, "correct": true, "feedback": "explicación breve en español" }
  ]
}`;

    const parsed = await llamarClaude(
      systemPrompt,
      [{ role: 'user', content: JSON.stringify(answers) }],
      2000
    );
    res.json(parsed);
  } catch (error) {
    console.error('Error en /test/grade:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
