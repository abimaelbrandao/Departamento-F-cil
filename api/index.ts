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
