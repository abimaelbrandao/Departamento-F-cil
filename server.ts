import app from './src/server/app';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const parsed = parseInt(process.argv[portArgIdx + 1], 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  if (process.env.NODE_ENV !== 'production') {
    const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    // Em desenvolvimento, garante porta 3000 para evitar conflito com o proxy Nginx na porta 8080
    if (!Number.isNaN(envPort) && envPort > 0 && envPort !== 8080) {
      return envPort;
    }
    return process.env.DEFAULT_APP_PORT ? parseInt(process.env.DEFAULT_APP_PORT, 10) : 3000;
  }

  return process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
}

const PORT = resolvePort();

async function startServer() {
  // Garante resposta JSON 404 para rotas /api/* desconhecidas antes do fallback SPA
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint de API não encontrado.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Departamento Fácil] Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});

export default app;
