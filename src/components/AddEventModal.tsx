import React, { useState, useEffect } from 'react';
import { Empregado, Empresa, Rubrica, LancamentoVariavel } from '../types/dp';
import { RUBRICAS_SISTEMA } from '../data/initialData';
import { api } from '../services/api';
import { formatarMoeda } from '../utils/formatters';
import {
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Users,
  User,
  Clock,
  DollarSign,
  Calendar,
  Layers,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa;
  competenciaAtual: string;
  empregados: Empregado[];
  colaboradorPreSelecionado?: Empregado | null;
  onEventoSalvo: () => void;
  onCriarCompetenciaSolicitada?: (novaComp: string) => void;
  lancamentoEmEdicao?: LancamentoVariavel | null;
}

export const AddEventModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresa,
  competenciaAtual,
  empregados,
  colaboradorPreSelecionado,
  onEventoSalvo,
  onCriarCompetenciaSolicitada,
  lancamentoEmEdicao,
}) => {
  const [modoLote, setModoLote] = useState(false);
  const [empregadoId, setEmpregadoId] = useState<string>(colaboradorPreSelecionado?.id || '');
  const [empregadosSelecionadosLote, setEmpregadosSelecionadosLote] = useState<string[]>([]);
  const [rubricaCodigo, setRubricaCodigo] = useState('0101');
  const [referencia, setReferencia] = useState<number>(10);
  const [unidadeReferencia, setUnidadeReferencia] = useState<'HORAS' | 'DIAS' | 'PERCENTUAL' | 'VALOR'>('HORAS');
  const [valorManual, setValorManual] = useState<number>(0);
  const [observacao, setObservacao] = useState('');
  const [competenciaInformada, setCompetenciaInformada] = useState(competenciaAtual || '06/2026');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Colaboradores ativos da empresa
  const colaboradoresAtivos = empregados.filter(
    e => e.empresaId === empresa.id && e.status !== 'desligado'
  );

  useEffect(() => {
    if (colaboradorPreSelecionado) {
      setEmpregadoId(colaboradorPreSelecionado.id);
    } else if (colaboradoresAtivos.length > 0 && !empregadoId) {
      setEmpregadoId(colaboradoresAtivos[0].id);
    }
  }, [colaboradorPreSelecionado, colaboradoresAtivos]);

  useEffect(() => {
    if (lancamentoEmEdicao) {
      setEmpregadoId(lancamentoEmEdicao.empregadoId);
      setRubricaCodigo(lancamentoEmEdicao.rubricaCodigo);
      setReferencia(lancamentoEmEdicao.referencia);
      setUnidadeReferencia(lancamentoEmEdicao.unidadeReferencia);
      setValorManual(lancamentoEmEdicao.valor);
      setObservacao(lancamentoEmEdicao.observacao || '');
      setCompetenciaInformada(lancamentoEmEdicao.competencia);
      setModoLote(false);
    }
  }, [lancamentoEmEdicao]);

  useEffect(() => {
    setCompetenciaInformada(competenciaAtual);
  }, [competenciaAtual]);

  const rubricaSelecionada = RUBRICAS_SISTEMA.find(r => r.codigo === rubricaCodigo) || RUBRICAS_SISTEMA[0];
  const empregadoSelecionado = colaboradoresAtivos.find(e => e.id === empregadoId);

  // Atualiza unidade default conforme a rubrica
  useEffect(() => {
    if (!lancamentoEmEdicao) {
      if (rubricaCodigo === '0101' || rubricaCodigo === '0102' || rubricaCodigo === '0103') {
        setUnidadeReferencia('HORAS');
      } else if (rubricaCodigo === '0201' || rubricaCodigo === '0202') {
        setUnidadeReferencia('DIAS');
      } else if (rubricaCodigo === '0105' || rubricaCodigo === '0020') {
        setUnidadeReferencia('VALOR');
      }
    }
  }, [rubricaCodigo, lancamentoEmEdicao]);

  // Cálculo de valor sugerido/estimado
  const calcularValorSugerido = () => {
    if (!empregadoSelecionado) return 0;
    const salario = empregadoSelecionado.salarioBase || 0;
    const divisor = empregadoSelecionado.divisorHoras || 220;
    const valorHora = salario / divisor;

    if (rubricaCodigo === '0101') {
      // HE 50%
      return Math.round(valorHora * 1.5 * referencia * 100) / 100;
    }
    if (rubricaCodigo === '0102') {
      // HE 100%
      return Math.round(valorHora * 2.0 * referencia * 100) / 100;
    }
    if (rubricaCodigo === '0103') {
      // Adicional Noturno 20%
      return Math.round(valorHora * 0.2 * referencia * 100) / 100;
    }
    if (rubricaCodigo === '0201') {
      // Falta em dias
      const valorDia = salario / 30;
      return Math.round(valorDia * referencia * 100) / 100;
    }
    if (rubricaCodigo === '0020') {
      // Adiantamento 40%
      return Math.round(salario * 0.4 * 100) / 100;
    }
    return valorManual;
  };

  const valorEstimado = unidadeReferencia === 'VALOR' ? valorManual : calcularValorSugerido();

  if (!isOpen) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!modoLote && !empregadoId) {
      setErro('Selecione um colaborador.');
      return;
    }
    if (modoLote && empregadosSelecionadosLote.length === 0) {
      setErro('Selecione pelo menos um colaborador para o lançamento em lote.');
      return;
    }
    if (!referencia || referencia <= 0) {
      setErro('Informe uma referência válida maior que zero.');
      return;
    }

    try {
      setSalvando(true);

      // Garante que a competência existe no servidor
      await api.criarCompetencia({
        empresaId: empresa.id,
        competencia: competenciaInformada,
      });

      if (lancamentoEmEdicao) {
        // Edição de lançamento existente
        await api.editarLancamento(lancamentoEmEdicao.id, {
          rubricaCodigo,
          descricao: rubricaSelecionada.descricao,
          referencia: Number(referencia),
          unidadeReferencia,
          valor: Number(valorEstimado),
          observacao,
        });
      } else if (modoLote) {
        // Lançamento em lote
        const lancamentos = empregadosSelecionadosLote.map(empId => {
          const emp = colaboradoresAtivos.find(c => c.id === empId);
          let val = valorEstimado;
          if (emp && unidadeReferencia === 'HORAS') {
            const vh = emp.salarioBase / (emp.divisorHoras || 220);
            const fator = rubricaCodigo === '0102' ? 2.0 : 1.5;
            val = Math.round(vh * fator * referencia * 100) / 100;
          }

          return {
            empregadoId: empId,
            competencia: competenciaInformada,
            rubricaCodigo,
            descricao: rubricaSelecionada.descricao,
            referencia: Number(referencia),
            unidadeReferencia,
            valor: val,
            origem: 'MANUAL' as const,
            observacao,
          };
        });

        await api.salvarLancamentosLote({ lancamentos });
      } else {
        // Lançamento individual
        await api.salvarLancamento({
          empregadoId,
          competencia: competenciaInformada,
          rubricaCodigo,
          descricao: rubricaSelecionada.descricao,
          referencia: Number(referencia),
          unidadeReferencia,
          valor: Number(valorEstimado),
          origem: 'MANUAL',
          observacao,
        });
      }

      onEventoSalvo();
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao registrar evento.');
    } finally {
      setSalvando(false);
    }
  };

  const toggleSelecionarTodosLote = () => {
    if (empregadosSelecionadosLote.length === colaboradoresAtivos.length) {
      setEmpregadosSelecionadosLote([]);
    } else {
      setEmpregadosSelecionadosLote(colaboradoresAtivos.map(c => c.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {lancamentoEmEdicao ? 'Editar Evento da Folha' : 'Lançar Evento / Rubrica'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Competência: <strong className="font-mono text-slate-700 dark:text-slate-300">{competenciaInformada}</strong> · {empresa.razaoSocial}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSalvar} className="p-6 overflow-y-auto space-y-5">
          {erro && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Seletor Individual vs Em Lote */}
          {!lancamentoEmEdicao && (
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setModoLote(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                  !modoLote
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Lançamento Individual</span>
              </button>
              <button
                type="button"
                onClick={() => setModoLote(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                  modoLote
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Lançamento em Lote (Múltiplos)</span>
              </button>
            </div>
          )}

          {/* Seleção do Colaborador (Modo Individual) */}
          {!modoLote ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Colaborador Beneficiário <span className="text-rose-500">*</span>
              </label>
              <select
                value={empregadoId}
                onChange={e => setEmpregadoId(e.target.value)}
                disabled={Boolean(lancamentoEmEdicao)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
              >
                {colaboradoresAtivos.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nomeCompleto} - Matrícula {emp.matricula} ({emp.cargo}) - Salário {formatarMoeda(emp.salarioBase)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Seleção dos Colaboradores (Modo Lote) */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Selecione os Colaboradores para Lançamento em Lote
                </label>
                <button
                  type="button"
                  onClick={toggleSelecionarTodosLote}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  {empregadosSelecionadosLote.length === colaboradoresAtivos.length
                    ? 'Desmarcar Todos'
                    : 'Selecionar Todos'}
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 p-2 bg-slate-50/50 dark:bg-slate-800/40">
                {colaboradoresAtivos.map(emp => {
                  const isChecked = empregadosSelecionadosLote.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) {
                            setEmpregadosSelecionadosLote(prev => [...prev, emp.id]);
                          } else {
                            setEmpregadosSelecionadosLote(prev => prev.filter(id => id !== emp.id));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{emp.nomeCompleto}</span>
                        <span className="text-slate-500 dark:text-slate-400 ml-2">
                          {emp.cargo} · {formatarMoeda(emp.salarioBase)}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seleção de Rubrica */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Evento / Rubrica a Lançar
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rubrica do Sistema <span className="text-rose-500">*</span>
                </label>
                <select
                  value={rubricaCodigo}
                  onChange={e => setRubricaCodigo(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <optgroup label="Proventos (Rendimentos)">
                    {RUBRICAS_SISTEMA.filter(r => r.tipo === 'PROVENTO').map(r => (
                      <option key={r.codigo} value={r.codigo}>
                        {r.codigo} - {r.descricao}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Descontos">
                    {RUBRICAS_SISTEMA.filter(r => r.tipo === 'DESCONTO').map(r => (
                      <option key={r.codigo} value={r.codigo}>
                        {r.codigo} - {r.descricao}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Unidade da Referência
                </label>
                <select
                  value={unidadeReferencia}
                  onChange={e => setUnidadeReferencia(e.target.value as any)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="HORAS">Horas (ex: 8 horas extras)</option>
                  <option value="DIAS">Dias (ex: 2 faltas)</option>
                  <option value="PERCENTUAL">Percentual % (ex: 20%)</option>
                  <option value="VALOR">Valor Monetário Direto (R$)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantidade / Referência <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={referencia}
                  onChange={e => setReferencia(Number(e.target.value))}
                  placeholder="Ex: 10"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Estimado do Lançamento
                </label>
                {unidadeReferencia === 'VALOR' ? (
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={valorManual}
                    onChange={e => setValorManual(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                ) : (
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>{formatarMoeda(valorEstimado)}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Cálculo ao vivo CLT</span>
                  </div>
                )}
              </div>
            </div>

            {/* Informações da Rubrica e Incidências */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400">Tipo:</span>
                <span
                  className={`font-bold ${
                    rubricaSelecionada.tipo === 'PROVENTO'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {rubricaSelecionada.tipo}
                </span>
                <span>·</span>
                <span className="text-slate-500 dark:text-slate-400">Incidências:</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  INSS: {rubricaSelecionada.incideINSS ? 'SIM' : 'NÃO'} | FGTS: {rubricaSelecionada.incideFGTS ? 'SIM' : 'NÃO'} | IRRF: {rubricaSelecionada.incideIRRF ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Fundamento: {rubricaSelecionada.baseCalculoLegal}
              </div>
            </div>
          </div>

          {/* Observação / Motivo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Observação / Justificativa Opcional
            </label>
            <input
              type="text"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Ex: Horas extras autorizadas pela diretoria no projeto de migração..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {salvando
                  ? 'Calculando e Gravando...'
                  : lancamentoEmEdicao
                  ? 'Salvar Alteração do Evento'
                  : 'Lançar e Recalcular Folha'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
