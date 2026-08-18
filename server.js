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
