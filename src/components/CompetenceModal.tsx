import React, { useState } from 'react';
import { Empresa, CompetenciaFolha } from '../types/dp';
import { api } from '../services/api';
import { formatarMoeda, formatarCompetenciaExtenso } from '../utils/formatters';
import {
  CalendarDays,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Unlock,
  Lock,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa;
  competenciaAtual: string;
  onSelecionarCompetencia: (competencia: string) => void;
  onCompetenciasAtualizadas: () => void;
  abrirCadastroDireto?: boolean;
}

export const CompetenceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresa,
  competenciaAtual,
  onSelecionarCompetencia,
  onCompetenciasAtualizadas,
  abrirCadastroDireto = false,
}) => {
  const [modo, setModo] = useState<'LISTA' | 'NOVA'>(abrirCadastroDireto ? 'NOVA' : 'LISTA');
  const [competencias, setCompetencias] = useState<CompetenciaFolha[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ texto: string; erro?: boolean } | null>(null);

  // Formulário de Nova Competência
  const [mes, setMes] = useState('06');
  const [ano, setAno] = useState('2026');
  const [isDecimoTerceiro, setIsDecimoTerceiro] = useState(false);
  const [tipoFolha, setTipoFolha] = useState<
    'MENSAL' | 'ADIANTAMENTO' | '13_PRIMEIRA_PARCELA' | '13_SEGUNDA_PARCELA' | '13_INTEGRAL'
  >('MENSAL');

  // Edição de Mês/Ano
  const [competenciaEmEdicao, setCompetenciaEmEdicao] = useState<CompetenciaFolha | null>(null);
  const [novoPeriodoEdicao, setNovoPeriodoEdicao] = useState('');

  // Confirmação de exclusão
  const [competenciaParaExcluir, setCompetenciaParaExcluir] = useState<CompetenciaFolha | null>(null);
  const [confirmarForceExclusao, setConfirmarForceExclusao] = useState<{ count: number } | null>(null);

  React.useEffect(() => {
    if (isOpen && empresa?.id) {
      setModo(abrirCadastroDireto ? 'NOVA' : 'LISTA');
      setStatusMsg(null);
      carregarCompetencias();
    }
  }, [isOpen, empresa?.id, abrirCadastroDireto]);

  const carregarCompetencias = async () => {
    try {
      setCarregando(true);
      const list = await api.getCompetencias(empresa.id);
      setCompetencias(list);
    } catch (err: any) {
      console.error('Erro ao carregar competências:', err);
    } finally {
      setCarregando(false);
    }
  };

  if (!isOpen || !empresa) return null;

  const handleCriarCompetencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const compString = isDecimoTerceiro ? `13/${ano}` : `${mes.padStart(2, '0')}/${ano}`;

    try {
      setSalvando(true);
      const res = await api.criarCompetencia({
        empresaId: empresa.id,
        competencia: compString,
        tipoFolha: isDecimoTerceiro ? '13_INTEGRAL' : tipoFolha,
      });

      onCompetenciasAtualizadas();
      onSelecionarCompetencia(compString);
      setStatusMsg({
        texto: res.existe
          ? `Competência ${compString} já existia e foi selecionada.`
          : `Competência ${compString} criada com sucesso para ${empresa.razaoSocial}!`,
      });

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ texto: err.message || 'Erro ao criar competência', erro: true });
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirCompetencia = async (force: boolean = false) => {
    if (!competenciaParaExcluir) return;

    try {
      setSalvando(true);
      await api.excluirCompetencia(empresa.id, competenciaParaExcluir.competencia, force);
      setCompetenciaParaExcluir(null);
      setConfirmarForceExclusao(null);
      carregarCompetencias();
      onCompetenciasAtualizadas();
      setStatusMsg({ texto: 'Competência excluída com sucesso.' });
    } catch (err: any) {
      if (err.podeForcar && err.count > 0) {
        setConfirmarForceExclusao({ count: err.count });
      } else {
        setStatusMsg({ texto: err.message || 'Erro ao excluir competência.', erro: true });
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarEdicaoPeriodo = async () => {
    if (!competenciaEmEdicao || !novoPeriodoEdicao) return;

    try {
      setSalvando(true);
      await api.atualizarCompetencia(empresa.id, competenciaEmEdicao.competencia, {
        novaCompetencia: novoPeriodoEdicao,
      });
      if (competenciaAtual === competenciaEmEdicao.competencia) {
        onSelecionarCompetencia(novoPeriodoEdicao);
      }
      setCompetenciaEmEdicao(null);
      carregarCompetencias();
      onCompetenciasAtualizadas();
      setStatusMsg({ texto: 'Período da competência atualizado com sucesso.' });
    } catch (err: any) {
      setStatusMsg({ texto: err.message || 'Erro ao atualizar competência.', erro: true });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {modo === 'NOVA' ? 'Criar Nova Competência' : 'Gerenciar Competências'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Empresa: <strong className="text-slate-700 dark:text-slate-300">{empresa.razaoSocial}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {modo === 'NOVA' ? (
              <button
                type="button"
                onClick={() => setModo('LISTA')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Ver Todas
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModo('NOVA')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nova competência</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                statusMsg.erro
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              }`}
            >
              {statusMsg.erro ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{statusMsg.texto}</span>
            </div>
          )}

          {/* MODO CRIAR NOVA COMPETÊNCIA */}
          {modo === 'NOVA' && (
            <form onSubmit={handleCriarCompetencia} className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Período de Apuração da Folha
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                    <input
                      type="checkbox"
                      checked={isDecimoTerceiro}
                      onChange={e => setIsDecimoTerceiro(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Competência Anual (13º Salário)</span>
                  </label>
                </div>

                {!isDecimoTerceiro ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mês</label>
                      <select
                        value={mes}
                        onChange={e => setMes(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                      >
                        <option value="01">01 - Janeiro</option>
                        <option value="02">02 - Fevereiro</option>
                        <option value="03">03 - Março</option>
                        <option value="04">04 - Abril</option>
                        <option value="05">05 - Maio</option>
                        <option value="06">06 - Junho</option>
                        <option value="07">07 - Julho</option>
                        <option value="08">08 - Agosto</option>
                        <option value="09">09 - Setembro</option>
                        <option value="10">10 - Outubro</option>
                        <option value="11">11 - Novembro</option>
                        <option value="12">12 - Dezembro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ano</label>
                      <input
                        type="number"
                        min={2020}
                        max={2035}
                        value={ano}
                        onChange={e => setAno(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300">
                    <p className="font-bold">Competência Anual de 13º Salário: 13/{ano}</p>
                    <p className="text-[11px] mt-0.5">
                      Apuração exclusiva da gratificação natalina para cálculo dos encargos previdenciários e IRRF anual.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Processamento da Folha
                  </label>
                  <select
                    value={tipoFolha}
                    onChange={e => setTipoFolha(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="MENSAL">Folha Mensal Normal (Salários e Encargos)</option>
                    <option value="ADIANTAMENTO">Adiantamento Quinzenal (Sem incidência de INSS/FGTS)</option>
                    <option value="13_PRIMEIRA_PARCELA">13º Salário - 1ª Parcela (50% Salário sem descontos)</option>
                    <option value="13_SEGUNDA_PARCELA">13º Salário - 2ª Parcela (Quitação com INSS e IRRF)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModo('LISTA')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{salvando ? 'Criando...' : 'Criar Competência e Abrir'}</span>
                </button>
              </div>
            </form>
          )}

          {/* MODO LISTAGEM DE COMPETÊNCIAS */}
          {modo === 'LISTA' && (
            <div className="space-y-3">
              {carregando ? (
                <div className="text-center py-8 text-xs text-slate-500">Carregando competências...</div>
              ) : competencias.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 space-y-3">
                  <CalendarDays className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nenhuma competência cadastrada para esta empresa.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModo('NOVA')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Criar Primeira Competência
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  {competencias.map(comp => {
                    const isAtiva = comp.competencia === competenciaAtual;

                    return (
                      <div
                        key={comp.id || comp.competencia}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isAtiva ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono">
                              {comp.competencia}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              ({formatarCompetenciaExtenso(comp.competencia)})
                            </span>
                            {isAtiva && (
                              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950 px-2 py-0.5 rounded">
                                Selecionada
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                comp.status === 'FECHADA'
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  : comp.status === 'APROVADA'
                                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {comp.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>{comp.totalCalculados || 0} calculados</span>
                            <span>·</span>
                            <span>
                              Total Líquido:{' '}
                              <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                                {formatarMoeda(comp.totalLiquido)}
                              </strong>
                            </span>
                            <span>·</span>
                            <span>FGTS: {formatarMoeda(comp.totalFGTS)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {!isAtiva && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelecionarCompetencia(comp.competencia);
                                onClose();
                              }}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                            >
                              Abrir
                            </button>
                          )}

                          {comp.status !== 'FECHADA' && comp.totalCalculados === 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCompetenciaEmEdicao(comp);
                                setNovoPeriodoEdicao(comp.competencia);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Corrigir Mês/Ano da Competência Vazia"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {comp.status !== 'FECHADA' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCompetenciaParaExcluir(comp);
                                setConfirmarForceExclusao(null);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Excluir Competência Aberta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Corrigir Mês/Ano */}
      {competenciaEmEdicao && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Corrigir Período da Competência
            </h3>
            <p className="text-xs text-slate-500">
              Altere o mês/ano para a competência aberta que ainda não possui folhas fechadas.
            </p>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">Novo Período (MM/AAAA)</label>
              <input
                type="text"
                value={novoPeriodoEdicao}
                onChange={e => setNovoPeriodoEdicao(e.target.value)}
                placeholder="Ex: 07/2026"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCompetenciaEmEdicao(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarEdicaoPeriodo}
                disabled={salvando}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Salvar Alteração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Competência */}
      {competenciaParaExcluir && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Excluir Competência {competenciaParaExcluir.competencia}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Empresa: <strong>{empresa.razaoSocial}</strong>
                </p>
              </div>
            </div>

            {confirmarForceExclusao ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold">Aviso de Lançamentos em Rascunho:</p>
                <p>
                  Esta competência possui <strong>{confirmarForceExclusao.count} evento(s) lançado(s)</strong> em rascunho. Ao confirmar, todos esses lançamentos rascunho desta competência serão excluídos.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Tem certeza de que deseja excluir esta competência aberta?
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setCompetenciaParaExcluir(null);
                  setConfirmarForceExclusao(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleExcluirCompetencia(Boolean(confirmarForceExclusao))}
                disabled={salvando}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                {salvando ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
