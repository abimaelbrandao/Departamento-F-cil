import React from 'react';
import { X, Download, FileText, CheckCircle2, Printer } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  pdfUrl: string | null;
  nomeArquivoDownload: string;
  onBaixarArquivo: () => void;
}

export const PDFPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  pdfUrl,
  nomeArquivoDownload,
  onBaixarArquivo,
}) => {
  if (!isOpen) return null;

  const handleImprimir = () => {
    const iframe = document.getElementById('preview-pdf-iframe') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      } catch {
        // Fallback se cross-origin bloquear
      }
    }
    // Fallback: abre diálogo padrão do navegador
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[92vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{titulo}</h2>
              {subtitulo && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitulo}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImprimir}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
              title="Imprimir documento em papel Carta"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={onBaixarArquivo}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              Baixar Arquivo PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors ml-2"
              title="Fechar Visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Container / Iframe - White paper preserved */}
        <div className="flex-1 bg-slate-200/70 dark:bg-slate-950/90 p-2 sm:p-4 flex items-center justify-center overflow-hidden">
          {pdfUrl ? (
            <iframe
              id="preview-pdf-iframe"
              src={pdfUrl}
              title={titulo}
              className="w-full h-full rounded-xl bg-white shadow-md border border-slate-300 dark:border-slate-700"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              Gerando visualização do documento em alta fidelidade...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Documento pronto para impressão e assinatura física ou digital
          </span>
          <span className="font-mono text-slate-400 dark:text-slate-500 text-[11px] truncate max-w-xs">{nomeArquivoDownload}</span>
        </div>
      </div>
    </div>
  );
};
