import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatarMoeda } from '../utils/formatters';
import { X, AlertTriangle, Info, AlertCircle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface Props {
  empresaId: string;
  competencia: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CalculationComparisonDrawer: React.FC<Props> = ({ empresaId, competencia, isOpen, onClose }) => {
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCarregando(true);
      api.getAuditoriaComparativa(empresaId, competencia)
        .then(res => setDados(res))
        .catch(err => console.error(err))
        .finally(() => setCarregando(false));
    }
  }, [isOpen, empresaId, competencia]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l border-slate-200 dark:border-slate-800 transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                Auditoria de Fechamento
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Comparativo Mensal</span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {competencia} vs {dados?.competenciaAnterior || 'Mês Anterior'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Cruzando folhas analíticas e detectando variações...</p>
            </div>
          ) : (
            <>
              {/* Resumo dos Totais */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Competência Anterior ({dados?.competenciaAnterior})</span>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {formatarMoeda(dados?.totalAnterior)}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Total Líquido Fechado</span>
                </div>
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 rounded-xl">
                  <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Competência Atual ({dados?.competenciaAtual})</span>
                  <div className="text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {formatarMoeda(dados?.totalAtual)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold mt-0.5">
                    {dados?.totalAtual >= (dados?.totalAnterior || 0) ? (
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" /> +{formatarMoeda(dados?.totalAtual - (dados?.totalAnterior || 0))}
                      </span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400 flex items-center gap-0.5">
                        <TrendingDown className="w-3.5 h-3.5" /> {formatarMoeda(dados?.totalAtual - (dados?.totalAnterior || 0))}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de Divergências */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Divergências e Anomalias Rastreadas ({dados?.divergencias?.length || 0})
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Conferência obrigatória antes do fechamento</span>
                </div>

                {(!dados?.divergencias || dados.divergencias.length === 0) ? (
                  <div className="p-8 text-center bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl text-emerald-800 dark:text-emerald-300">
                    <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                    <p className="font-bold text-sm">Nenhuma divergência crítica encontrada</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">A folha atual possui plena consistência histórica com o mês anterior.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dados.divergencias.map((div: any, idx: number) => {
                      const isAlert = div.severidade === 'alerta';
                      const isError = div.severidade === 'erro';

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border transition-all ${
                            isError
                              ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200'
                              : isAlert
                              ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200'
                              : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isError ? (
                                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                              ) : isAlert ? (
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                              ) : (
                                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              )}
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {div.tipo.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <span className="text-xs font-bold font-mono">
                              {div.impacto > 0 ? `+${formatarMoeda(div.impacto)}` : formatarMoeda(div.impacto)}
                            </span>
                          </div>

                          <div className="mt-2 pl-6">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{div.empregadoNome}</div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{div.descricao}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dicas de Fechamento */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">Regras de Prevenção de Erros do DP:</span>
                <p>• Variações salariais superiores a 15% devem possuir comprovação de acordo individual ou cartão de ponto com horas extras aprovadas.</p>
                <p>• Empregados desligados na competência não devem figurar na folha com remuneração cheia (utilizar cálculo de rescisão com saldo de dias).</p>
                <p>• Lançamentos de folha fechada são imutáveis. Caso precise alterar, reabra a competência registrando o motivo auditável.</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Auditoria automatizada</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Concluir Análise
          </button>
        </div>
      </div>
    </div>
  );
};
