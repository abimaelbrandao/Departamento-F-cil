import React, { useState, useEffect, useMemo } from 'react';
import { Empregado, Empresa, LancamentoVariavel } from '../types/dp';
import { RUBRICAS_SISTEMA } from '../data/initialData';
import { api } from '../services/api';
import { formatarMoeda } from '../utils/formatters';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Users,
  User,
  Edit3,
  RotateCcw,
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

function parseNumeroDecimal(raw: string | number): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  const txt = String(raw || '').trim().replace(/\s/g, '');
  if (!txt) return 0;
  const normalized =
    txt.includes(',') && txt.includes('.')
      ? txt.replace(/\./g, '').replace(',', '.')
      : txt.replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function unidadePadraoPorRubrica(codigo: string): 'HORAS' | 'DIAS' | 'PERCENTUAL' | 'VALOR' {
  if (codigo === '0101' || codigo === '0102' || codigo === '0103') return 'HORAS';
  if (codigo === '0201' || codigo === '0202') return 'DIAS';
  return 'VALOR';
}

export const AddEventModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresa,
  competenciaAtual,
  empregados,
  colaboradorPreSelecionado,
  onEventoSalvo,
  lancamentoEmEdicao,
}) => {
  const [modoLote, setModoLote] = useState(false);
  const [empregadoId, setEmpregadoId] = useState<string>(colaboradorPreSelecionado?.id || '');
  const [empregadosSelecionadosLote, setEmpregadosSelecionadosLote] = useState<string[]>([]);
  const [rubricaCodigo, setRubricaCodigo] = useState('0101');
  const [nomeEvento, setNomeEvento] = useState('Horas Extras 50% Diurna');
  const [nomeEditadoManualmente, setNomeEditadoManualmente] = useState(false);
  const [referenciaInput, setReferenciaInput] = useState<string>('10');
  const [unidadeReferencia, setUnidadeReferencia] = useState<'HORAS' | 'DIAS' | 'PERCENTUAL' | 'VALOR'>('HORAS');
  const [valorManualInput, setValorManualInput] = useState<string>('0');
  const [observacao, setObservacao] = useState('');
  const [competenciaInformada, setCompetenciaInformada] = useState(competenciaAtual || '05/2026');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const colaboradoresAtivos = useMemo(
    () => empregados.filter(e => e.empresaId === empresa.id && e.status !== 'desligado'),
    [empregados, empresa.id]
  );

  const rubricaSelecionada =
    RUBRICAS_SISTEMA.find(r => r.codigo === rubricaCodigo) || RUBRICAS_SISTEMA[0];
  const empregadoSelecionado = colaboradoresAtivos.find(e => e.id === empregadoId);

  // Inicializa / reseta o formulário ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    setErro(null);

    if (lancamentoEmEdicao) {
      setEmpregadoId(lancamentoEmEdicao.empregadoId);
      setRubricaCodigo(lancamentoEmEdicao.rubricaCodigo);
      setNomeEvento(lancamentoEmEdicao.descricao || '');
      setNomeEditadoManualmente(true);
      setReferenciaInput(String(lancamentoEmEdicao.referencia ?? 1));
      setUnidadeReferencia(lancamentoEmEdicao.unidadeReferencia || 'VALOR');
      setValorManualInput(String(lancamentoEmEdicao.valor ?? 0));
      setObservacao(lancamentoEmEdicao.observacao || '');
      setCompetenciaInformada(lancamentoEmEdicao.competencia || competenciaAtual);
      setModoLote(false);
    } else {
      const rubInicial = RUBRICAS_SISTEMA.find(r => r.codigo === '0101') || RUBRICAS_SISTEMA[0];
      setRubricaCodigo(rubInicial.codigo);
      setNomeEvento(rubInicial.descricao);
      setNomeEditadoManualmente(false);
      setUnidadeReferencia(unidadePadraoPorRubrica(rubInicial.codigo));
      setReferenciaInput('10');
      setValorManualInput('0');
      setObservacao('');
      setCompetenciaInformada(competenciaAtual || '05/2026');
      setModoLote(false);
      setEmpregadosSelecionadosLote([]);
      if (colaboradorPreSelecionado) {
        setEmpregadoId(colaboradorPreSelecionado.id);
      } else if (colaboradoresAtivos.length > 0) {
        setEmpregadoId(colaboradoresAtivos[0].id);
      } else {
        setEmpregadoId('');
      }
    }
  }, [isOpen, lancamentoEmEdicao, colaboradorPreSelecionado, competenciaAtual]);

  useEffect(() => {
    if (!isOpen) return;
    if (!empregadoId && colaboradoresAtivos.length > 0) {
      setEmpregadoId(colaboradoresAtivos[0].id);
    }
  }, [isOpen, colaboradoresAtivos, empregadoId]);

  const handleTrocarRubrica = (novoCodigo: string) => {
    setRubricaCodigo(novoCodigo);
    const novaRub = RUBRICAS_SISTEMA.find(r => r.codigo === novoCodigo);
    if (novaRub && !nomeEditadoManualmente) {
      setNomeEvento(novaRub.descricao);
    }
    const novaUnidade = unidadePadraoPorRubrica(novoCodigo);
    setUnidadeReferencia(novaUnidade);

    if (novaUnidade === 'VALOR') {
      if (referenciaInput === '10') setReferenciaInput('1');
      if (novoCodigo === '0015' && parseNumeroDecimal(valorManualInput) <= 0) {
        setValorManualInput('62.04');
      } else if (novoCodigo === '0020' && empregadoSelecionado) {
        const adiant = Math.round((empregadoSelecionado.salarioBase || 0) * 0.4 * 100) / 100;
        setValorManualInput(String(adiant));
      }
    } else if (novaUnidade === 'HORAS' && parseNumeroDecimal(referenciaInput) <= 1) {
      setReferenciaInput('10');
    } else if (novaUnidade === 'DIAS' && parseNumeroDecimal(referenciaInput) === 10) {
      setReferenciaInput('1');
    }
  };

  const referenciaNum = parseNumeroDecimal(referenciaInput);
  const valorManualNum = parseNumeroDecimal(valorManualInput);

  // Cálculo automático ao vivo
  const calcularValorParaColaborador = (emp?: Empregado): number => {
    if (unidadeReferencia === 'VALOR') {
      return Math.round(valorManualNum * 100) / 100;
    }
    if (!emp) return Math.round(valorManualNum * 100) / 100;

    const salario = emp.salarioBase || 0;
    const divisor = emp.divisorHoras || 220;
    const valorHora = salario / divisor;
    const valorDia = salario / 30;

    if (rubricaCodigo === '0101') {
      return Math.round(valorHora * 1.5 * referenciaNum * 100) / 100;
    }
    if (rubricaCodigo === '0102') {
      return Math.round(valorHora * 2.0 * referenciaNum * 100) / 100;
    }
    if (rubricaCodigo === '0103') {
      return Math.round(valorHora * 0.2 * referenciaNum * 100) / 100;
    }
    if (rubricaCodigo === '0201') {
      return Math.round(valorDia * referenciaNum * 100) / 100;
    }
    if (unidadeReferencia === 'PERCENTUAL') {
      return Math.round(salario * (referenciaNum / 100) * 100) / 100;
    }
    if (unidadeReferencia === 'DIAS') {
      return Math.round(valorDia * referenciaNum * 100) / 100;
    }
    if (unidadeReferencia === 'HORAS') {
      return Math.round(valorHora * referenciaNum * 100) / 100;
    }
    return Math.round(valorManualNum * 100) / 100;
  };

  const valorEstimado = calcularValorParaColaborador(empregadoSelecionado);

  if (!isOpen) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!modoLote && !empregadoId) {
      setErro('Selecione um colaborador ativo para lançar o evento.');
      return;
    }
    if (modoLote && empregadosSelecionadosLote.length === 0) {
      setErro('Selecione pelo menos um colaborador para o lançamento em lote.');
      return;
    }

    const nomeFinal = nomeEvento.trim() || rubricaSelecionada.descricao;
    if (!nomeFinal) {
      setErro('Informe o nome do evento na folha.');
      return;
    }

    if (unidadeReferencia === 'VALOR') {
      if (valorManualNum <= 0) {
        setErro('Informe um valor monetário (R$) válido maior que zero.');
        return;
      }
    } else if (referenciaNum <= 0) {
      setErro('Informe uma quantidade/referência válida maior que zero.');
      return;
    }

    const refFinal = unidadeReferencia === 'VALOR' && referenciaNum <= 0 ? 1 : referenciaNum;

    try {
      setSalvando(true);

      // Garante que a competência existe no servidor/cache
      try {
        await api.criarCompetencia({
          empresaId: empresa.id,
          competencia: competenciaInformada,
        });
      } catch {
        // Segue se o cache local já mantiver a competência
      }

      if (lancamentoEmEdicao) {
        await api.editarLancamento(
          lancamentoEmEdicao.id,
          {
            rubricaCodigo,
            descricao: nomeFinal,
            referencia: refFinal,
            unidadeReferencia,
            valor: Number(valorEstimado),
            observacao,
          },
          {
            empresa,
            empregado: empregadoSelecionado,
            empregados,
            lancamentoBase: lancamentoEmEdicao,
          }
        );
      } else if (modoLote) {
        const lancamentos = empregadosSelecionadosLote.map(empId => {
          const emp = colaboradoresAtivos.find(c => c.id === empId);
          const val = calcularValorParaColaborador(emp);
          return {
            empregadoId: empId,
            competencia: competenciaInformada,
            rubricaCodigo,
            descricao: nomeFinal,
            referencia: refFinal,
            unidadeReferencia,
            valor: val,
            origem: 'MANUAL' as const,
            observacao,
          };
        });

        await api.salvarLancamentosLote({
          lancamentos,
          empresa,
          empregados,
        });
      } else {
        await api.salvarLancamento(
          {
            empregadoId,
            competencia: competenciaInformada,
            rubricaCodigo,
            descricao: nomeFinal,
            referencia: refFinal,
            unidadeReferencia,
            valor: Number(valorEstimado),
            origem: 'MANUAL',
            observacao,
          },
          {
            empresa,
            empregado: empregadoSelecionado,
            empregados,
          }
        );
      }

      await onEventoSalvo();
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao registrar evento na folha.');
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
            type="button"
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
                {colaboradoresAtivos.length === 0 ? (
                  <option value="">Nenhum colaborador ativo nesta empresa</option>
                ) : (
                  colaboradoresAtivos.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nomeCompleto} - Matrícula {emp.matricula} ({emp.cargo}) - Salário {formatarMoeda(emp.salarioBase)}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
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

          {/* Seleção de Rubrica + Nome Editável */}
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
                  onChange={e => handleTrocarRubrica(e.target.value)}
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

              {/* Nome Editável do Evento */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>
                      Nome do Evento na Folha e Recibo <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  {nomeEvento.trim() !== rubricaSelecionada.descricao && (
                    <button
                      type="button"
                      onClick={() => {
                        setNomeEvento(rubricaSelecionada.descricao);
                        setNomeEditadoManualmente(false);
                      }}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restaurar nome padrão
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={nomeEvento}
                  onChange={e => {
                    setNomeEvento(e.target.value);
                    setNomeEditadoManualmente(true);
                  }}
                  placeholder="Ex: Gratificação de Desempenho, Hora Extra Projeto X, Auxílio Creche..."
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {unidadeReferencia === 'VALOR' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Valor do Lançamento (R$) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={valorManualInput}
                      onChange={e => setValorManualInput(e.target.value)}
                      placeholder="Ex: 67,54"
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quantidade / Referência (Opcional)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={referenciaInput}
                      onChange={e => setReferenciaInput(e.target.value)}
                      placeholder="Ex: 1"
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quantidade / Referência <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={referenciaInput}
                      onChange={e => setReferenciaInput(e.target.value)}
                      placeholder="Ex: 10 ou 6,5"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Valor Estimado do Lançamento
                    </label>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>{formatarMoeda(valorEstimado)}</span>
                      <span className="text-[10px] text-slate-400 font-normal">Cálculo ao vivo CLT</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Informações da Rubrica e Incidências */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
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
              disabled={salvando || colaboradoresAtivos.length === 0}
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
