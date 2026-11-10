import React, { useState } from 'react';
import { Empregado, Empresa, PeriodoFerias } from '../types/dp';
import { calcularFeriasComApropriacao } from '../services/calculosFeriasRescisao';
import { formatarMoeda, formatarData } from '../utils/formatters';
import { api } from '../services/api';
import { X, Calendar, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empregado: Empregado | null;
  empresa: Empresa;
  periodoFerias?: PeriodoFerias;
  onFeriasSalvas: () => void;
  onEmitirDocumentos?: (empregado: Empregado, periodo?: PeriodoFerias) => void;
}

export const VacationPlannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empregado,
  empresa: _empresa,
  periodoFerias,
  onFeriasSalvas,
  onEmitirDocumentos,
}) => {
  const [dataInicio, setDataInicio] = useState('2026-05-20');
  const [diasGozo, setDiasGozo] = useState<number>(30);
  const [abonoPecuniario, setAbonoPecuniario] = useState(false);
  const [adiantamento13, setAdiantamento13] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ texto: string; erro?: boolean } | null>(null);

  if (!isOpen || !empregado) return null;

  // Cálculo ao vivo com apropriação de competência
  const calculo = calcularFeriasComApropriacao(
    empregado,
    dataInicio,
    diasGozo,
    abonoPecuniario,
    adiantamento13
  );

  const handleSalvarProgramacao = async () => {
    try {
      setCarregando(true);
      setStatusMsg(null);
      await api.programarFerias({
        empregadoId: empregado.id,
        dataInicio,
        diasGozo,
        abonoPecuniario,
        adiantamento13,
      });
      setStatusMsg({ texto: 'Férias programadas com sucesso! Memória de cálculo e apropriação por competência registradas.' });
      setTimeout(() => {
        onFeriasSalvas();
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ texto: err.message || 'Erro ao programar férias', erro: true });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                  Programação & Simulação de Férias
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">CLT Art. 129 a 145</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {empregado.nomeCompleto} - Salário Base {formatarMoeda(empregado.salarioBase)}
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
        <div className="p-6 overflow-y-auto space-y-6">
          {statusMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              statusMsg.erro
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
            }`}>
              {statusMsg.erro ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {statusMsg.texto}
            </div>
          )}

          {/* Período Aquisitivo e Concessivo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Período Aquisitivo</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatarData(periodoFerias?.periodoAquisitivoInicio || '2024-05-01')} até {formatarData(periodoFerias?.periodoAquisitivoFim || '2025-04-30')}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Limite Concessivo (Dobra)</span>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                Até {formatarData(periodoFerias?.periodoConcessivoFim || '2026-04-30')}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Saldo de Direito</span>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                {periodoFerias?.saldoDiasRestantes || 30} dias disponíveis
              </p>
            </div>
          </div>

          {/* Configuração do Gozo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data Início do Gozo</label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Dias de Gozo</label>
              <select
                value={diasGozo}
                onChange={e => setDiasGozo(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value={30}>30 Dias (Período Integral)</option>
                <option value={20}>20 Dias (Comum com abono pecuniário)</option>
                <option value={15}>15 Dias (1º Período Fracionado)</option>
                <option value={14}>14 Dias (Mínimo obrigatório Art. 134)</option>
                <option value={10}>10 Dias (Fracionamento complementar)</option>
              </select>
            </div>

            <div className="space-y-2 pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={abonoPecuniario}
                  onChange={e => setAbonoPecuniario(e.target.checked)}
                  className="rounded text-amber-600"
                />
                Vender 10 dias (Abono Pecuniário)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={adiantamento13}
                  onChange={e => setAdiantamento13(e.target.checked)}
                  className="rounded text-amber-600"
                />
                Adiantar 50% do 13º Salário
              </label>
            </div>
          </div>

          {/* Destaque de Prazos Legais */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
            <span>
              <strong>Prazo Máximo de Pagamento:</strong> até 2 dias antes do início do gozo (Art. 145 CLT)
            </span>
            <span className="font-bold bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-950 dark:text-blue-200 font-mono">
              {formatarData(calculo.dataLimitePagamento)}
            </span>
          </div>

          {/* Destaque de Apropriação Bi-Mensal se atravessar dois meses */}
          {calculo.atravessaMeses && calculo.apropriacao.mes2 && (
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Apropriação Contábil por Competência (Atravessa 2 meses)
              </div>
              <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                O período de gozo atravessa duas competências. Para evitar pagamento em duplicidade na folha mensal subsequente, o sistema apropriou:
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs">
                  <div className="font-bold text-indigo-950 dark:text-indigo-200 font-mono">{calculo.apropriacao.mes1.competencia}</div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">{calculo.apropriacao.mes1.dias} dias gozados no 1º mês</div>
                  <div className="font-bold text-indigo-800 dark:text-indigo-300 mt-1">{formatarMoeda(calculo.apropriacao.mes1.valor)}</div>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs">
                  <div className="font-bold text-indigo-950 dark:text-indigo-200 font-mono">{calculo.apropriacao.mes2.competencia}</div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">{calculo.apropriacao.mes2.dias} dias gozados no 2º mês</div>
                  <div className="font-bold text-indigo-800 dark:text-indigo-300 mt-1">{formatarMoeda(calculo.apropriacao.mes2.valor)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            {onEmitirDocumentos && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEmitirDocumentos(empregado, periodoFerias);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Emitir Documentos de Férias
              </button>
            )}
          </div>
          <button
            onClick={handleSalvarProgramacao}
            disabled={carregando}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {carregando ? 'Salvando...' : 'Salvar Programação de Férias'}
          </button>
        </div>
      </div>
    </div>
  );
};
