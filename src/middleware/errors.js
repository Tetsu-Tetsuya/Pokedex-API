/**
 * Padroniza TODAS as respostas de erro no formato:
 *   { "error": { "status": 404, "message": "Pokémon \"xyz\" não encontrado." } }
 * Assim o frontend sempre sabe onde encontrar a mensagem.
 */

function notFound(req, res) {
  res.status(404).json({ error: { status: 404, message: `Rota ${req.method} ${req.path} não existe.` } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // JSON malformado no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { status: 400, message: 'JSON inválido no corpo da requisição.' } });
  }
  const status = err.status || 500;
  if (status >= 500 && status !== 503) console.error(err);
  res.status(status).json({
    error: {
      status,
      message: status === 500 ? 'Erro interno no servidor.' : err.message,
    },
  });
}

module.exports = { notFound, errorHandler };
