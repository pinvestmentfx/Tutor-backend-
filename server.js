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
  "correction": "si hubo errores, explicá brevemente en español cuáles y la forma
