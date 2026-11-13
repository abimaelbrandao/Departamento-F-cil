import app from '../src/server/app';

export default function handler(req: any, res: any) {
  try {
    const rawUrl = req.url || '/api';
    const parsed = new URL(rawUrl, 'http://localhost');
    const pathParam = parsed.searchParams.get('__path') || req.query?.__path;

    if (pathParam) {
      const normalizedPath = Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam);
      parsed.searchParams.delete('__path');
      const remainingQuery = parsed.searchParams.toString();
      const cleanPath = normalizedPath.replace(/^\/+/, '');
      req.url = `/api/${cleanPath}${remainingQuery ? `?${remainingQuery}` : ''}`;
    } else if (!parsed.pathname.startsWith('/api')) {
      req.url = `/api${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
    }

    if (req.body !== undefined && req._body === undefined) {
      if (typeof req.body === 'string') {
        try {
          req.body = JSON.parse(req.body);
        } catch {
          // Mantém string se não for JSON válido
        }
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(req.body)) {
        try {
          req.body = JSON.parse(req.body.toString('utf-8'));
        } catch {
          // Mantém buffer se não for JSON válido
        }
      }
      req._body = true;
    }

    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel API Handler Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: typeof err?.message === 'string'
          ? err.message
          : 'Erro interno ao processar requisição na função serverless.',
      });
    }
  }
}
