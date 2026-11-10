const { createApp } = require('./src/app');

const PORT = Number(process.env.PORT || 3000);

createApp().listen(PORT, () => {
  console.log(`Pokédex Explorer (monólito) rodando em http://localhost:${PORT}`);
});
