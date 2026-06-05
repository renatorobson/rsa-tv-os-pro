const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');

const app = express();

// Conexão corrigida e segura lendo as variáveis automáticas do Render
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'sistema-super-secreto-os',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const verificarAutenticacao = (req, res, next) => {
  if (req.session.usuarioLogado) {
    next();
  } else {
    res.redirect('/login');
  }
};

// TELA DE LOGIN ATUALIZADA - RSA TV OS PRO
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RSA TV OS PRO - Login</title>
      <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    </head>
    <body class="bg-slate-900 flex flex-col items-center justify-center h-screen p-4">
      <div class="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-700">
        <div class="text-center mb-6">
          <h2 class="text-white text-2xl font-bold tracking-tight text-blue-500">RSA TV OS PRO</h2>
          <p class="text-slate-400 text-sm mt-1">Controle Operacional Integrado</p>
        </div>
        <form action="/login" method="POST" class="space-y-4">
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-1">Usuário</label>
            <input type="text" name="usuario" required class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
          </div>
          <div>
            <label class="block text-slate-300 text-sm font-medium mb-1">Senha</label>
            <input type="password" name="senha" required class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
          </div>
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors mt-2 shadow-lg">Entrar no Painel</button>
        </form>
      </div>
      <footer class="mt-6 text-center text-xs text-slate-500 space-y-1">
        <p>Desenvolvido por <span class="text-slate-400 font-medium">Renato Robson</span></p>
        <p>&copy; 2026 RSA TV. Todos os direitos reservados.</p>
      </footer>
    </body>
    </html>
  `);
});

// Rota de login modificada com diagnóstico de erro detalhado
app.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;
  try {
    const result = await pool.query('SELECT * FROM "usuarios" WHERE "usuario" = $1 AND "senha" = $2', [usuario, senha]);
    if (result.rows.length > 0) {
      req.session.usuarioLogado = usuario;
      res.redirect('/');
    } else {
      res.send('<script>alert("Usuário ou senha incorretos!"); window.location="/login";</script>');
    }
  } catch (err) {
    // Se der qualquer erro de banco, ele vai cuspir a mensagem exata na sua tela
    res.status(500).send('Erro detectado: ' + err.message);
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/', verificarAutenticacao, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- APIS DO PAINEL ---
app.get('/api/dados', verificarAutenticacao, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "meus_dados" WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dados', verificarAutenticacao, async (req, res) => {
  const { nome, pix } = req.body;
  try {
    const verificar = await pool.query('SELECT id FROM "meus_dados" WHERE id = 1');
    if (verificar.rows.length > 0) {
      await pool.query('UPDATE "meus_dados" SET nome = $1, pix = $2 WHERE id = 1', [nome, pix]);
    } else {
      await pool.query('INSERT INTO "meus_dados" (id, nome, pix) VALUES (1, $1, $2)', [nome, pix]);
    }
    res.redirect('/');
  } catch (err) { res.status(500).send('Erro: ' + err.message); }
});

app.get('/api/empresas', verificarAutenticacao, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "empresas" ORDER BY nome_empresa ASC');
    res.json(result.rows || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/empresas', verificarAutenticacao, async (req, res) => {
  const { nome_empresa } = req.body;
  try {
    if (nome_empresa) await pool.query('INSERT INTO "empresas" (nome_empresa) VALUES ($1) ON CONFLICT DO NOTHING', [nome_empresa]);
    res.redirect('/');
  } catch (err) { res.status(500).send('Erro: ' + err.message); }
});

app.get('/api/locais', verificarAutenticacao, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "locais" ORDER BY nome_local ASC');
    res.json(result.rows || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/locais', verificarAutenticacao, async (req, res) => {
  const { empresa_id, nome_local } = req.body;
  try {
    if (empresa_id && nome_local) await pool.query('INSERT INTO "locais" (empresa_id, nome_local) VALUES ($1, $2)', [empresa_id, nome_local]);
    res.redirect('/');
  } catch (err) { res.status(500).send('Erro: ' + err.message); }
});

app.get('/api/catalogo', verificarAutenticacao, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "catalogo_servicos" ORDER BY nome_servico ASC');
    res.json(result.rows || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/catalogo', verificarAutenticacao, async (req, res) => {
  const { nome_servico, valor_fixo, por_ponto } = req.body;
  const cobrancaPonto = por_ponto === 'on' ? 1 : 0;
  try {
    if (nome_servico && valor_fixo) {
      await pool.query('INSERT INTO "catalogo_servicos" (nome_servico, valor_fixo, por_ponto) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [nome_servico, parseFloat(valor_fixo), cobrancaPonto]);
    }
    res.redirect('/');
  } catch (err) { res.status(500).send('Erro: ' + err.message); }
});

app.get('/api/servicos', verificarAutenticacao, async (req, res) => {
  const query = `
    SELECT servicos.*, empresas.nome_empresa, locais.nome_local, 
           catalogo_servicos.nome_servico, catalogo_servicos.valor_fixo, catalogo_servicos.por_ponto,
           CASE 
             WHEN catalogo_servicos.por_ponto = 1 THEN (catalogo_servicos.valor_fixo * servicos.pontos_realizados)
             ELSE catalogo_servicos.valor_fixo 
           END as valor
    FROM "servicos" 
    LEFT JOIN "empresas" ON servicos.empresa_id = empresas.id 
    LEFT JOIN "locais" ON servicos.local_id = locais.id
    LEFT JOIN "catalogo_servicos" ON servicos.catalogo_id = catalogo_servicos.id
    ORDER BY servicos.id DESC`;
  try {
    const result = await pool.query(query);
    res.json(result.rows || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/servicos', verificarAutenticacao, async (req, res) => {
  const { empresa_id, local_id, ticket_externo, catalogo_id, pontos_realizados } = req.body;
  const qtdPontos = pontos_realizados ? parseInt(pontos_realizados) : 0;
  try {
    await pool.query(
      'INSERT INTO "servicos" (empresa_id, local_id, ticket_externo, catalogo_id, pontos_realizados, status) VALUES ($1, $2, $3, $4, $5, \'Pendente\')',
      [parseInt(empresa_id), parseInt(local_id), ticket_externo, parseInt(catalogo_id), qtdPontos]
    );
    res.redirect('/');
  } catch (err) { res.status(500).send('Erro: ' + err.message); }
});

app.post('/api/servicos/status', verificarAutenticacao, async (req, res) => {
  const { id, status } = req.body;
  try {
    await pool.query('UPDATE "servicos" SET status = $1 WHERE id = $2', [status, parseInt(id)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/servicos/editar-ticket', verificarAutenticacao, async (req, res) => {
  const { id, novo_ticket } = req.body;
  if (id && novo_ticket) {
    try {
      await pool.query('UPDATE "servicos" SET ticket_externo = $1 WHERE id = $2', [novo_ticket, parseInt(id)]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  } else {
    res.status(400).json({ success: false, error: "Dados incompletos" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RSA TV OS PRO online na porta ${PORT}!`));
