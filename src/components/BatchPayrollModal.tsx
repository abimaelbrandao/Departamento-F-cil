import React, { useEffect, useMemo, useState } from 'react';
import { Empresa, Empregado, CompetenciaFolha } from '../types/dp';
import { api, RespostaFolhaLote } from '../services/api';
import { formatarMoeda, formatarCompetenciaExtenso } from '../utils/formatters';
import {
  Calculator,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Layers,
  Lock,
  Play,
  X,
  ArrowRight,
  Users,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa;
  empregados: Empregado[];
  competenciaAtual: string;
  competenciasExistentes: CompetenciaFolha[];
  modoInicial?: 'INDIVIDUAL' | 'LOTE';
  onSelecionarCompetencia: (competencia: string) => void;
  onFolhaProcessada: () => Promise<void> | void;
}

const MESES = [
  { valor: '01', label: '01 - Janeiro' },
  { valor: '02', label: '02 - Fevereiro' },
  { valor: '03', label: '03 - Março' },
  { valor: '04', label: '04 - Abril' },
  { valor: '05', label: '05 - Maio' },
  { valor: '06', label: '06 - Junho' },
  { valor: '07', label: '07 - Julho' },
  { valor: '08', label: '08 - Agosto' },
  { valor: '09', label: '09 - Setembro' },
  { valor: '10', label: '10 - Outubro' },
  { valor: '11', label: '11 - Novembro' },
  { valor: '12', label: '12 - Dezembro' },
];

type TipoFolhaOpcao = 'MENSAL' | 'ADIANTAMENTO' | '13_PRIMEIRA_PARCELA' | '13_SEGUNDA_PARCELA';

function parseComp(comp: string): { mes: number; ano: number } | null {
  const match = String(comp || '').trim().match(/^(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return { mes: Number(match[1]), ano: Number(match[2]) };
}

function gerarIntervaloCompetencias(
  mesIni: string,
  anoIni: string,
  mesFim: string,
  anoFim: string,
  incluir13: boolean
): string[] {
  const m1 = Number(mesIni);
  const a1 = Number(anoIni);
  const m2 = Number(mesFim);
  const a2 = Number(anoFim);

  if (
    !Number.isInteger(m1) ||
    !Number.isInteger(a1) ||
    !Number.isInteger(m2) ||
    !Number.isInteger(a2) ||
    m1 < 1 ||
    m1 > 12 ||
    m2 < 1 ||
    m2 > 12
  ) {
    return [];
  }

  const startIdx = a1 * 12 + (m1 - 1);
  const endIdx = a2 * 12 + (m2 - 1);
  if (endIdx < startIdx) return [];

  // Limite de segurança de 36 meses por lote
  const total = Math.min(endIdx - startIdx + 1, 36);
  const list: string[] = [];
  const anosPresentes = new Set<number>();

  for (let i = 0; i < total; i++) {
    const idx = startIdx + i;
    const ano = Math.floor(idx / 12);
    const mes = (idx % 12) + 1;
    list.push(`${String(mes).padStart(2, '0')}/${ano}`);
    anosPresentes.add(ano);
  }

  if (incluir13) {
    Array.from(anosPresentes)
      .sort((x, y) => x - y)
      .forEach(ano => {
        list.push(`13/${ano}`);
      });
  }

  return list;
}

export const BatchPayrollModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresa,
  empregados,
  competenciaAtual,
  competenciasExistentes,
  modoInicial = 'LOTE',
  onSelecionarCompetencia,
  onFolhaProcessada,
}) => {
  const parsedAtual = useMemo(() => parseComp(competenciaAtual) || { mes: 5, ano: 2026 }, [competenciaAtual]);
  const anoPadrao = String(parsedAtual.ano);
  const mesPadrao = String(parsedAtual.mes === 13 ? 12 : parsedAtual.mes).padStart(2, '0');

  const [modo, setModo] = useState<'INDIVIDUAL' | 'LOTE'>(modoInicial);
  const [tipoFolha, setTipoFolha] = useState<TipoFolhaOpcao>('MENSAL');
  const [empregadoId, setEmpregadoId] = useState<string>('TODOS');

  // Modo Individual
  const [origemCompIndividual, setOrigemCompIndividual] = useState<'EXISTENTE' | 'NOVA'>('EXISTENTE');
  const [compExistenteSelecionada, setCompExistenteSelecionada] = useState<string>(competenciaAtual || '05/2026');
  const [mesInd, setMesInd] = useState<string>(mesPadrao);
  const [anoInd, setAnoInd] = useState<string>(anoPadrao);
  const [is13Ind, setIs13Ind] = useState<boolean>(parsedAtual.mes === 13);

  // Modo Lote
  const [subModoLote, setSubModoLote] = useState<'INTERVALO' | 'MANUAL'>('INTERVALO');
  const [mesIni, setMesIni] = useState<string>(mesPadrao);
  const [anoIni, setAnoIni] = useState<string>(anoPadrao);
  const [mesFim, setMesFim] = useState<string>(
    String(Math.min(12, (parsedAtual.mes === 13 ? 12 : parsedAtual.mes) + 2)).padStart(2, '0')
  );
  const [anoFim, setAnoFim] = useState<string>(anoPadrao);
  const [incluir13Intervalo, setIncluir13Intervalo] = useState<boolean>(false);

  const [anoManual, setAnoManual] = useState<string>(anoPadrao);
  const [selecaoManual, setSelecaoManual] = useState<string[]>([]);

  // Execução & Resultado
  const [processando, setProcessando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [sucessoIndividual, setSucessoIndividual] = useState<{
    competencia: string;
    totalCalculados: number;
    totalLiquido: number;
    totalFGTS: number;
  } | null>(null);
  const [resultadoLote, setResultadoLote] = useState<RespostaFolhaLote | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setModo(modoInicial);
    setErroMsg(null);
    setSucessoIndividual(null);
    setResultadoLote(null);
    setEmpregadoId('TODOS');

    const p = parseComp(competenciaAtual) || { mes: 5, ano: 2026 };
    const mStr = String(p.mes === 13 ? 12 : p.mes).padStart(2, '0');
    const aStr = String(p.ano);

    setCompExistenteSelecionada(
      competenciasExistentes.some(c => c.competencia === competenciaAtual)
        ? competenciaAtual
        : competenciasExistentes[0]?.competencia || competenciaAtual || '05/2026'
    );
    setOrigemCompIndividual(competenciasExistentes.length > 0 ? 'EXISTENTE' : 'NOVA');
    setMesInd(mStr);
    setAnoInd(aStr);
    setIs13Ind(p.mes === 13);

    setMesIni(mStr);
    setAnoIni(aStr);
    setMesFim(String(Math.min(12, Number(mStr) + 2)).padStart(2, '0'));
    setAnoFim(aStr);
    setAnoManual(aStr);
    setSelecaoManual(competenciaAtual ? [competenciaAtual] : []);
  }, [isOpen, modoInicial, competenciaAtual, competenciasExistentes]);

  const empregadosAtivos = useMemo(
    () => empregados.filter(e => e.status !== 'em_admissao' && e.status !== 'desligado'),
    [empregados]
  );

  const mapaCompetencias = useMemo(() => {
    const map = new Map<string, CompetenciaFolha>();
    for (const c of competenciasExistentes) {
      map.set(c.competencia, c);
    }
    return map;
  }, [competenciasExistentes]);

  const competenciasIntervalo = useMemo(
    () => gerarIntervaloCompetencias(mesIni, anoIni, mesFim, anoFim, incluir13Intervalo),
    [mesIni, anoIni, mesFim, anoFim, incluir13Intervalo]
  );

  const opcoesManuaisAno = useMemo(() => {
    const anoNum = Number(anoManual) || 2026;
    const base = [
      ...MESES.map(m => `${m.valor}/${anoNum}`),
      `13/${anoNum}`,
    ];
    // Inclui competências existentes de outros anos no final, sem duplicar
    const extras = competenciasExistentes
      .map(c => c.competencia)
      .filter(c => !base.includes(c));
    return [...base, ...extras];
  }, [anoManual, competenciasExistentes]);

  const competenciasLoteAlvo = useMemo(
    () => (subModoLote === 'INTERVALO' ? competenciasIntervalo : selecaoManual),
    [subModoLote, competenciasIntervalo, selecaoManual]
  );

  const compIndividualAlvo = useMemo(() => {
    if (origemCompIndividual === 'EXISTENTE' && competenciasExistentes.length > 0) {
      return compExistenteSelecionada;
    }
    return is13Ind ? `13/${anoInd}` : `${mesInd.padStart(2, '0')}/${anoInd}`;
  }, [origemCompIndividual, competenciasExistentes.length, compExistenteSelecionada, is13Ind, mesInd, anoInd]);

  if (!isOpen) return null;

  const aplicarPresetIntervalo = (preset: 'ANO_ATUAL' | 'PROX_3' | 'TRIMESTRE') => {
    const baseAno = parsedAtual.ano;
    const baseMes = parsedAtual.mes === 13 ? 1 : parsedAtual.mes;
    if (preset === 'ANO_ATUAL') {
      setMesIni('01');
      setAnoIni(String(baseAno));
      setMesFim('12');
      setAnoFim(String(baseAno));
    } else if (preset === 'PROX_3') {
      const startIdx = baseAno * 12 + (baseMes - 1);
      const endIdx = startIdx + 2;
      setMesIni(String((startIdx % 12) + 1).padStart(2, '0'));
      setAnoIni(String(Math.floor(startIdx / 12)));
      setMesFim(String((endIdx % 12) + 1).padStart(2, '0'));
      setAnoFim(String(Math.floor(endIdx / 12)));
    } else {
      const trimStart = Math.floor((baseMes - 1) / 3) * 3 + 1;
      const trimEnd = trimStart + 2;
      setMesIni(String(trimStart).padStart(2, '0'));
      setAnoIni(String(baseAno));
      setMesFim(String(trimEnd).padStart(2, '0'));
      setAnoFim(String(baseAno));
    }
  };

  const toggleManualComp = (comp: string) => {
    setSelecaoManual(prev =>
      prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp]
    );
  };

  const handleGerarIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg(null);
    setSucessoIndividual(null);

    if (empregadosAtivos.length === 0) {
      setErroMsg('Não há colaboradores ativos vinculados a esta empresa para calcular a folha.');
      return;
    }

    const compInfo = mapaCompetencias.get(compIndividualAlvo);
    if (compInfo?.status === 'FECHADA') {
      setErroMsg(`A competência ${compIndividualAlvo} está FECHADA. Reabra-a antes de gerar ou recalcular.`);
      return;
    }

    try {
      setProcessando(true);
      const res: any = await api.calcularFolha({
        empresaId: empresa.id,
        competencia: compIndividualAlvo,
        empregadoId: empregadoId === 'TODOS' ? undefined : empregadoId,
        tipoFolha,
        empresa,
        empregados,
      });

      await onFolhaProcessada();
      onSelecionarCompetencia(compIndividualAlvo);

      const calculadas = Array.isArray(res?.calculadas) ? res.calculadas : [];
      const statusComp = res?.competenciaStatus;

      setSucessoIndividual({
        competencia: compIndividualAlvo,
        totalCalculados: statusComp?.totalCalculados ?? calculadas.length,
        totalLiquido:
          statusComp?.totalLiquido ??
          calculadas.reduce((acc: number, f: any) => acc + (f.valorLiquido || 0), 0),
        totalFGTS:
          statusComp?.totalFGTS ??
          calculadas.reduce((acc: number, f: any) => acc + (f.encargosEmpresa?.fgtsDevido || 0), 0),
      });
    } catch (err: any) {
      setErroMsg(err?.message || 'Erro ao gerar folha de pagamento para a competência.');
    } finally {
      setProcessando(false);
    }
  };

  const handleGerarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg(null);
    setResultadoLote(null);

    if (empregadosAtivos.length === 0) {
      setErroMsg('Não há colaboradores ativos vinculados a esta empresa para gerar a folha em lote.');
      return;
    }

    if (competenciasLoteAlvo.length === 0) {
      setErroMsg('Selecione pelo menos uma competência válida (ou verifique se o período inicial é menor ou igual ao final).');
      return;
    }

    try {
      setProcessando(true);
      const res = await api.calcularFolhaLote({
        empresaId: empresa.id,
        competencias: competenciasLoteAlvo,
        tipoFolha,
        empregadoId: empregadoId === 'TODOS' ? undefined : empregadoId,
        empresa,
        empregados,
      });

      await onFolhaProcessada();
      setResultadoLote(res);

      // Seleciona automaticamente a primeira competência processada
      const primeiraProcessada = res.resultados.find(r => r.status === 'PROCESSADA');
      if (primeiraProcessada) {
        onSelecionarCompetencia(primeiraProcessada.competencia);
      }
    } catch (err: any) {
      setErroMsg(err?.message || 'Erro ao gerar folha de pagamento em lote.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Gerar Folha de Pagamento
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {empresa.razaoSocial} · <strong>{empregadosAtivos.length}</strong> colaborador(es) ativo(s)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-6 pt-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setModo('INDIVIDUAL');
              setErroMsg(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
              modo === 'INDIVIDUAL'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Por Competência (Individual)
          </button>

          <button
            type="button"
            onClick={() => {
              setModo('LOTE');
              setErroMsg(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
              modo === 'LOTE'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Em Lote (Múltiplas Competências)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {erroMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{erroMsg}</span>
            </div>
          )}

          {empregadosAtivos.length === 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-start gap-2.5">
              <Users className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                Nenhum colaborador ativo encontrado para esta empresa. Conclua a admissão de pelo menos um colaborador antes de processar a folha.
              </span>
            </div>
          )}

          {/* Parâmetros Comuns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Processamento da Folha
              </label>
              <select
                value={tipoFolha}
                onChange={e => setTipoFolha(e.target.value as TipoFolhaOpcao)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="MENSAL">Folha Mensal Normal (Salários, Verbas e Encargos)</option>
                <option value="ADIANTAMENTO">Adiantamento Quinzenal (Sem INSS/FGTS)</option>
                <option value="13_PRIMEIRA_PARCELA">13º Salário — 1ª Parcela (50% sem descontos)</option>
                <option value="13_SEGUNDA_PARCELA">13º Salário — 2ª Parcela (Quitação com INSS/IRRF)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Abrangência de Colaboradores
              </label>
              <select
                value={empregadoId}
                onChange={e => setEmpregadoId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="TODOS">
                  Todos os colaboradores ativos ({empregadosAtivos.length})
                </option>
                {empregadosAtivos.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nomeCompleto} (Mat. {emp.matricula})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MODO 1: POR COMPETÊNCIA (INDIVIDUAL)                      */}
          {/* ========================================================= */}
          {modo === 'INDIVIDUAL' && (
            <form onSubmit={handleGerarIndividual} className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Escolha a Competência de Destino
                  </span>
                  <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
                    {competenciasExistentes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOrigemCompIndividual('EXISTENTE')}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                          origemCompIndividual === 'EXISTENTE'
                            ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        Já Cadastrada
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOrigemCompIndividual('NOVA')}
                      className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                        origemCompIndividual === 'NOVA' || competenciasExistentes.length === 0
                          ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Informar Mês / Ano
                    </button>
                  </div>
                </div>

                {origemCompIndividual === 'EXISTENTE' && competenciasExistentes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {competenciasExistentes.map(c => {
                      const selecionada = compExistenteSelecionada === c.competencia;
                      const fechada = c.status === 'FECHADA';
                      return (
                        <button
                          key={c.competencia}
                          type="button"
                          disabled={fechada}
                          onClick={() => setCompExistenteSelecionada(c.competencia)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            fechada
                              ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                              : selecionada
                              ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-white dark:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100">
                              {c.competencia}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                fechada
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                  : c.status === 'APROVADA'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {c.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {formatarCompetenciaExtenso(c.competencia)} · {c.totalCalculados || 0} calc.
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Se a competência não existir, ela será criada automaticamente antes do cálculo.
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                        <input
                          type="checkbox"
                          checked={is13Ind}
                          onChange={e => setIs13Ind(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>13º Salário Anual (13/AAAA)</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {!is13Ind && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Mês
                          </label>
                          <select
                            value={mesInd}
                            onChange={e => setMesInd(e.target.value)}
                            className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                          >
                            {MESES.map(m => (
                              <option key={m.valor} value={m.valor}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className={is13Ind ? 'col-span-2' : ''}>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Ano
                        </label>
                        <input
                          type="number"
                          min={2020}
                          max={2035}
                          value={anoInd}
                          onChange={e => setAnoInd(e.target.value)}
                          className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {sucessoIndividual && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Folha da competência {sucessoIndividual.competencia} gerada com sucesso!</span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      {sucessoIndividual.totalCalculados} colaborador(es) · Líquido:{' '}
                      <strong className="font-mono">{formatarMoeda(sucessoIndividual.totalLiquido)}</strong> · FGTS:{' '}
                      <strong className="font-mono">{formatarMoeda(sucessoIndividual.totalFGTS)}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelecionarCompetencia(sucessoIndividual.competencia);
                      onClose();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>Visualizar na Folha</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={processando || empregadosAtivos.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>
                    {processando
                      ? 'Gerando folha...'
                      : `Gerar Folha de ${compIndividualAlvo}`}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* MODO 2: EM LOTE (MÚLTIPLAS COMPETÊNCIAS)                  */}
          {/* ========================================================= */}
          {modo === 'LOTE' && (
            <form onSubmit={handleGerarLote} className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Seleção das Competências do Lote
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Competências inexistentes são criadas automaticamente. Competências com status FECHADA são preservadas.
                    </p>
                  </div>

                  <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSubModoLote('INTERVALO')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        subModoLote === 'INTERVALO'
                          ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Por Intervalo (De / Até)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubModoLote('MANUAL')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        subModoLote === 'MANUAL'
                          ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Seleção Manual
                    </button>
                  </div>
                </div>

                {subModoLote === 'INTERVALO' ? (
                  <div className="space-y-4">
                    {/* Atalhos Rápidos */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Atalhos:
                      </span>
                      <button
                        type="button"
                        onClick={() => aplicarPresetIntervalo('PROX_3')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 text-[11px] font-semibold transition-colors"
                      >
                        Próximos 3 Meses
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarPresetIntervalo('TRIMESTRE')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 text-[11px] font-semibold transition-colors"
                      >
                        Trimestre Atual
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarPresetIntervalo('ANO_ATUAL')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 text-[11px] font-semibold transition-colors"
                      >
                        Ano Completo (01 a 12)
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Mês Inicial
                        </label>
                        <select
                          value={mesIni}
                          onChange={e => setMesIni(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                        >
                          {MESES.map(m => (
                            <option key={m.valor} value={m.valor}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Ano Inicial
                        </label>
                        <input
                          type="number"
                          min={2020}
                          max={2035}
                          value={anoIni}
                          onChange={e => setAnoIni(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Mês Final
                        </label>
                        <select
                          value={mesFim}
                          onChange={e => setMesFim(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                        >
                          {MESES.map(m => (
                            <option key={m.valor} value={m.valor}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Ano Final
                        </label>
                        <input
                          type="number"
                          min={2020}
                          max={2035}
                          value={anoFim}
                          onChange={e => setAnoFim(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                      <input
                        type="checkbox"
                        checked={incluir13Intervalo}
                        onChange={e => setIncluir13Intervalo(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Incluir competência anual de 13º Salário (13/AAAA) no lote</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Ano de Referência:
                        </label>
                        <input
                          type="number"
                          min={2020}
                          max={2035}
                          value={anoManual}
                          onChange={e => setAnoManual(e.target.value)}
                          className="w-24 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            const abertas = opcoesManuaisAno.filter(
                              c => mapaCompetencias.get(c)?.status !== 'FECHADA'
                            );
                            setSelecaoManual(abertas);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        >
                          Selecionar Abertas ({anoManual})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelecaoManual([])}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                      {opcoesManuaisAno.map(comp => {
                        const info = mapaCompetencias.get(comp);
                        const fechada = info?.status === 'FECHADA';
                        const marcada = selecaoManual.includes(comp);

                        return (
                          <button
                            key={comp}
                            type="button"
                            onClick={() => toggleManualComp(comp)}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-1.5 ${
                              marcada
                                ? fechada
                                  ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30'
                                  : 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500/30'
                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 bg-white dark:bg-slate-800/40'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {marcada ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                                  {comp}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5 pl-5">
                                {info ? info.status.replace('_', ' ') : 'Nova'}
                              </span>
                            </div>
                            {fechada && (
                              <span title="Competência fechada (será ignorada)" className="shrink-0 mt-0.5">
                                <Lock className="w-3 h-3 text-rose-500" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Prévia do Lote */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Prévia do Lote ({competenciasLoteAlvo.length} competência(s))
                    </span>
                    {competenciasLoteAlvo.some(c => mapaCompetencias.get(c)?.status === 'FECHADA') && (
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Competências FECHADAS serão preservadas automaticamente
                      </span>
                    )}
                  </div>

                  {competenciasLoteAlvo.length === 0 ? (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                      Intervalo inválido ou nenhuma competência selecionada.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {competenciasLoteAlvo.map(comp => {
                        const info = mapaCompetencias.get(comp);
                        const fechada = info?.status === 'FECHADA';
                        return (
                          <span
                            key={comp}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono font-bold border ${
                              fechada
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                : info
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {fechada && <Lock className="w-2.5 h-2.5" />}
                            {comp}
                            <span className="font-sans font-normal text-[10px] opacity-80">
                              {fechada ? '(Fechada)' : info ? '' : '(Nova)'}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Relatório de Resultado do Lote */}
              {resultadoLote && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Processamento em Lote Concluído: {resultadoLote.processadas} processada(s)
                        {resultadoLote.ignoradasFechadas > 0
                          ? ` · ${resultadoLote.ignoradasFechadas} fechada(s) ignorada(s)`
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Competência</th>
                          <th className="py-2.5 px-3">Situação</th>
                          <th className="py-2.5 px-3 text-center">Calc.</th>
                          <th className="py-2.5 px-3 text-right">Proventos</th>
                          <th className="py-2.5 px-3 text-right">Descontos</th>
                          <th className="py-2.5 px-3 text-right">Líquido</th>
                          <th className="py-2.5 px-3 text-right">FGTS</th>
                          <th className="py-2.5 px-3 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {resultadoLote.resultados.map(item => (
                          <tr key={item.competencia} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                              {item.competencia}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.status === 'PROCESSADA'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {item.status === 'PROCESSADA' ? 'Processada' : 'Ignorada (Fechada)'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {item.competenciaStatus.totalCalculados}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                              {formatarMoeda(item.competenciaStatus.totalProventos)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                              {formatarMoeda(item.competenciaStatus.totalDescontos)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                              {formatarMoeda(item.competenciaStatus.totalLiquido)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {formatarMoeda(item.competenciaStatus.totalFGTS)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelecionarCompetencia(item.competencia);
                                  onClose();
                                }}
                                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-bold"
                              >
                                Abrir na Folha
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={processando || competenciasLoteAlvo.length === 0 || empregadosAtivos.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" />
                  <span>
                    {processando
                      ? 'Processando lote...'
                      : `Gerar Folha em Lote (${competenciasLoteAlvo.length} competência${
                          competenciasLoteAlvo.length === 1 ? '' : 's'
                        })`}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
