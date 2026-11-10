import React, { useState } from 'react';
import { ContratoDocumento, StatusDocumento } from '../types/dp';
import { api } from '../services/api';
import { formatarData } from '../utils/formatters';
import { X, FileCheck, CheckCircle, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documento: ContratoDocumento | null;
  onDocumentoAtualizado: () => void;
}

export const DocumentSigningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  documento,
  onDocumentoAtualizado,
}) => {
  const [status, setStatus] = useState<StatusDocumento>(documento?.status || 'EMITIDO');
  const [dataPagamento, setDataPagamento] = useState<string>(documento?.dataPagamento || new Date().toISOString().split('T')[0]);
  const [dataAssinatura, setDataAssinatura] = useState<string>(documento?.dataAssinatura || new Date().toISOString().split('T')[0]);
  const [assinanteNome, setAssinanteNome] = useState<string>(documento?.assinanteNome || documento?.empregadoNome || '');
  const [comprovanteAnexo, setComprovanteAnexo] = useState<string>(documento?.comprovanteAnexo || '');
  const [salvando, setSalvando] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ texto: string; erro?: boolean } | null>(null);

  if (!isOpen || !documento) return null;

  const handleSalvarStatus = async () => {
    try {
      setSalvando(true);
      setStatusMsg(null);
      await api.atualizarStatusDocumento({
        documentoId: documento.id,
        status,
        dataPagamento: status !== 'EMITIDO' ? dataPagamento : undefined,
        dataAssinatura: status === 'RECIBO_ASSINADO' ? dataAssinatura : undefined,
        assinanteNome: status === 'RECIBO_ASSINADO' ? assinanteNome : undefined,
        comprovanteAnexo: status !== 'EMITIDO' ? comprovanteAnexo : undefined,
      });
      setStatusMsg({ texto: 'Status do documento atualizado com sucesso!' });
      setTimeout(() => {
        onDocumentoAtualizado();
        onClose();
      }, 700);
    } catch (err: any) {
      setStatusMsg({ texto: err.message || 'Erro ao atualizar status', erro: true });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                Certificação de Pagamento & Assinatura
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {documento.titulo}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {statusMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              statusMsg.erro
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
            }`}>
              {statusMsg.erro ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              {statusMsg.texto}
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p><strong>Colaborador:</strong> {documento.empregadoNome}</p>
            <p><strong>Competência / Data Emissão:</strong> {formatarData(documento.dataEmissao)}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status Atual do Documento</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as StatusDocumento)}
              className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="EMITIDO">1. Emitido (Aguardando Pagamento/Assinatura)</option>
              <option value="ENVIADO_ASSINATURA">2. Enviado para Assinatura (Física ou Digital)</option>
              <option value="PAGO">3. Pago (Comprovante Bancário Anexado)</option>
              <option value="RECIBO_ASSINADO">4. Recibo Assinado & Concluído</option>
            </select>
          </div>

          {status !== 'EMITIDO' && (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data da Quitação / Pagamento</label>
                  <input
                    type="date"
                    value={dataPagamento}
                    onChange={e => setDataPagamento(e.target.value)}
                    className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Código / Ref. do Comprovante</label>
                  <input
                    type="text"
                    placeholder="Ex: TED-98124 ou PIX-COMP-05"
                    value={comprovanteAnexo}
                    onChange={e => setComprovanteAnexo(e.target.value)}
                    className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {status === 'RECIBO_ASSINADO' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data da Assinatura</label>
                    <input
                      type="date"
                      value={dataAssinatura}
                      onChange={e => setDataAssinatura(e.target.value)}
                      className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Assinante / Titular</label>
                    <input
                      type="text"
                      placeholder="Nome do trabalhador ou procurador"
                      value={assinanteNome}
                      onChange={e => setAssinanteNome(e.target.value)}
                      className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Regra de Conformidade:</strong> A emissão do PDF não quita a obrigação trabalhista. O pagamento e a assinatura física ou digital devem ser certificados individualmente para efeito fiscal e previdenciário.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleSalvarStatus}
            disabled={salvando}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {salvando ? 'Salvando...' : 'Salvar Alteração de Status'}
          </button>
        </div>
      </div>
    </div>
  );
};
