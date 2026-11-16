import React, { useState, useEffect, useMemo } from 'react';
import {
  Empregado,
  Empresa,
  FolhaEmpregado,
  ItemCalculadoFolha,
  AcoesPermissao,
} from '../types/dp';
import {
  calcularAvos13NoAno,
  processarFolhaEmpregado,
} from '../services/calculosTrabalhistas';
import {
  gerarListagemAdiantamento13PDF,
  gerarReciboAdiantamento13PDF,
  gerarListagemFinal13PDF,
  gerarReciboFinal13PDF,
} from '../utils/pdfGenerator';
import { formatarMoeda, formatarData, obterIniciais, obterCorAvatar } from '../utils/formatters';
import { Card3D } from './Card3D';
import {
  Gift,
  Calculator,
  FileText,
  Receipt,
  Search,
  CheckCircle2,
  CalendarClock,
  Info,
  RotateCcw,
  Layers,
  Wallet,
  ShieldCheck,
} from 'lucide-react';

interface Parametro13Empregado {
  avos: number;
  percentualAdiantamento: number;
  mediasVariaveis: number;
  adiantamentoPagoManual?: number;
}

interface Estado13AnoEmpresa {
  parametrosPorEmpregado: Record<string, Parametro13Empregado>;
  folhasPrimeiraParcela: FolhaEmpregado[];
  folhasParcelaFinal: FolhaEmpregado[];
  ultimaAtualizacao?: string;
}

export interface PdfPreviewRequest {
  titulo: string;
  subtitulo: string;
  pdfUrl: string;
  nomeArquivoDownload: string;
  onBaixarArquivo: () => void;
}

interface DecimoTerceiroViewProps {
  empresaAtiva: Empresa;
  empregados: Empregado[];
  competenciaAtiva: string;
  efeitos3D: boolean;
  verificarPermissao: (acao: keyof AcoesPermissao, nomeAcaoLegivel: string) => boolean;
  mostrarNotificacao: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void;
  onAbrirMemoria: (item: ItemCalculadoFolha, nomeEmpregado: string) => void;
  onAbrirPdfPreview: (req: PdfPreviewRequest) => void;
}

const STORAGE_KEY_13 = 'df_13_salario_v1';

function carregarStore13(): Record<string, Estado13AnoEmpresa> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_13);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function salvarStore13(store: Record<string, Estado13AnoEmpresa>) {
  try {
    localStorage.setItem(STORAGE_KEY_13, JSON.stringify(store));
  } catch {
    // ignore storage quota errors
  }
}

export const DecimoTerceiroView: React.FC<DecimoTerceiroViewProps> = ({
  empresaAtiva,
  empregados,
  competenciaAtiva,
  efeitos3D,
  verificarPermissao,
  mostrarNotificacao,
  onAbrirMemoria,
  onAbrirPdfPreview,
}) => {
  const anoPadrao = Number(String(competenciaAtiva).split('/').pop()) || 2026;
  const [anoReferencia, setAnoReferencia] = useState<number>(anoPadrao);
  const [parcelaAtiva, setParcelaAtiva] = useState<'ADIANTAMENTO_50' | 'PARCELA_FINAL'>('ADIANTAMENTO_50');
  const [busca, setBusca] = useState('');
  const [store, setStore] = useState<Record<string, Estado13AnoEmpresa>>(() => carregarStore13());

  const chaveAnoEmpresa = `${empresaAtiva.id}_${anoReferencia}`;
  const colaboradoresAtivos = useMemo(
    () => empregados.filter(e => e.status !== 'desligado'),
    [empregados]
  );

  // Garante estado inicial consistente para a empresa e ano selecionados
  const estadoAtual: Estado13AnoEmpresa = useMemo(() => {
    const existente = store[chaveAnoEmpresa];
    const params: Record<string, Parametro13Empregado> = { ...(existente?.parametrosPorEmpregado || {}) };

    for (const emp of colaboradoresAtivos) {
      if (!params[emp.id]) {
        params[emp.id] = {
          avos: emp.vinculo === 'ESTAGIO' ? 0 : calcularAvos13NoAno(emp.dataAdmissao, anoReferencia),
          percentualAdiantamento: 50,
          mediasVariaveis: 0,
        };
      }
    }

    return {
      parametrosPorEmpregado: params,
      folhasPrimeiraParcela: existente?.folhasPrimeiraParcela || [],
      folhasParcelaFinal: existente?.folhasParcelaFinal || [],
      ultimaAtualizacao: existente?.ultimaAtualizacao,
    };
  }, [store, chaveAnoEmpresa, colaboradoresAtivos, anoReferencia]);

  // Persiste alterações do store
  useEffect(() => {
    salvarStore13(store);
  }, [store]);

  const atualizarEstadoEmpresa = (updater: (prev: Estado13AnoEmpresa) => Estado13AnoEmpresa) => {
    setStore(prevStore => {
      const base = prevStore[chaveAnoEmpresa] || estadoAtual;
      return {
        ...prevStore,
        [chaveAnoEmpresa]: updater(base),
      };
    });
  };

  const atualizarParametroEmpregado = (empId: string, patch: Partial<Parametro13Empregado>) => {
    atualizarEstadoEmpresa(prev => {
      const empObj = colaboradoresAtivos.find(e => e.id === empId);
      const paramBase = prev.parametrosPorEmpregado[empId] || {
        avos: empObj?.vinculo === 'ESTAGIO' ? 0 : calcularAvos13NoAno(empObj?.dataAdmissao || '', anoReferencia),
        percentualAdiantamento: 50,
        mediasVariaveis: 0,
      };
      return {
        ...prev,
        parametrosPorEmpregado: {
          ...prev.parametrosPorEmpregado,
          [empId]: { ...paramBase, ...patch },
        },
      };
    });
  };

  const handleCalcularPrimeiraParcela = () => {
    if (!verificarPermissao('calcularFolha', 'calcular o Adiantamento de 50% do 13º Salário')) return;
    const compAdiant = `11/${anoReferencia}`;
    const elegiveis = colaboradoresAtivos.filter(e => e.vinculo !== 'ESTAGIO');

    if (elegiveis.length === 0) {
      mostrarNotificacao('Não há colaboradores CLT/Aprendizes ativos elegíveis ao 13º salário.', 'info');
      return;
    }

    const novasFolhas = elegiveis.map(emp => {
      const p = estadoAtual.parametrosPorEmpregado[emp.id];
      return processarFolhaEmpregado(emp, empresaAtiva, compAdiant, [], '13_PRIMEIRA_PARCELA', {
        avos: p?.avos ?? calcularAvos13NoAno(emp.dataAdmissao, anoReferencia),
        percentualAdiantamento: p?.percentualAdiantamento ?? 50,
        valorMediasVariaveis: p?.mediasVariaveis ?? 0,
      });
    });

    atualizarEstadoEmpresa(prev => ({
      ...prev,
      folhasPrimeiraParcela: novasFolhas,
      ultimaAtualizacao: new Date().toISOString(),
    }));

    mostrarNotificacao(
      `1ª Parcela (Adiantamento ${anoReferencia}) calculada para ${novasFolhas.length} colaborador(es) sem descontos de INSS/IRRF.`,
      'sucesso'
    );
  };

  const handleCalcularParcelaFinal = () => {
    if (!verificarPermissao('calcularFolha', 'calcular a Parcela Final do 13º Salário')) return;
    const compFinal = `12/${anoReferencia}`;
    const elegiveis = colaboradoresAtivos.filter(e => e.vinculo !== 'ESTAGIO');

    if (elegiveis.length === 0) {
      mostrarNotificacao('Não há colaboradores CLT/Aprendizes ativos elegíveis ao 13º salário.', 'info');
      return;
    }

    const novasFolhas = elegiveis.map(emp => {
      const p = estadoAtual.parametrosPorEmpregado[emp.id];
      const folha1 = estadoAtual.folhasPrimeiraParcela.find(f => f.empregadoId === emp.id);
      const adiantamentoAutoOuManual =
        p?.adiantamentoPagoManual !== undefined
          ? p.adiantamentoPagoManual
          : folha1
          ? folha1.valorLiquido
          : undefined;

      return processarFolhaEmpregado(emp, empresaAtiva, compFinal, [], '13_SEGUNDA_PARCELA', {
        avos: p?.avos ?? calcularAvos13NoAno(emp.dataAdmissao, anoReferencia),
        valorMediasVariaveis: p?.mediasVariaveis ?? 0,
        adiantamentoPagoOverride: adiantamentoAutoOuManual,
      });
    });

    atualizarEstadoEmpresa(prev => ({
      ...prev,
      folhasParcelaFinal: novasFolhas,
      ultimaAtualizacao: new Date().toISOString(),
    }));

    mostrarNotificacao(
      `Parcela Final do 13º Salário (${anoReferencia}) apurada para ${novasFolhas.length} colaborador(es) com INSS/IRRF exclusivos e compensação da 1ª parcela.`,
      'sucesso'
    );
  };

  const handleRestaurarAvosCLT = () => {
    atualizarEstadoEmpresa(prev => {
      const novosParams: Record<string, Parametro13Empregado> = { ...prev.parametrosPorEmpregado };
      for (const emp of colaboradoresAtivos) {
        const atual = novosParams[emp.id] || {
          avos: 12,
          percentualAdiantamento: 50,
          mediasVariaveis: 0,
        };
        novosParams[emp.id] = {
          ...atual,
          avos: emp.vinculo === 'ESTAGIO' ? 0 : calcularAvos13NoAno(emp.dataAdmissao, anoReferencia),
          adiantamentoPagoManual: undefined,
        };
      }
      return { ...prev, parametrosPorEmpregado: novosParams };
    });
    mostrarNotificacao(`Avos proporcionais recalculados pela data de admissão em ${anoReferencia} (Lei nº 4.090/62).`, 'info');
  };

  const folhasAtivas =
    parcelaAtiva === 'ADIANTAMENTO_50'
      ? estadoAtual.folhasPrimeiraParcela
      : estadoAtual.folhasParcelaFinal;

  // Emissão dos 4 PDFs oficiais
  const handleAbrirListagemPDF = () => {
    if (folhasAtivas.length === 0) {
      mostrarNotificacao('Calcule primeiro a parcela selecionada antes de gerar a listagem.', 'info');
      return;
    }

    if (parcelaAtiva === 'ADIANTAMENTO_50') {
      const comp = `11/${anoReferencia}`;
      const url = gerarListagemAdiantamento13PDF(empresaAtiva, comp, folhasAtivas, colaboradoresAtivos, { returnBlobUrl: true }) as string;
      onAbrirPdfPreview({
        titulo: 'Listagem de Adiantamento de 13º Salário',
        subtitulo: `1ª Parcela (50%) · Competência ${comp} · ${empresaAtiva.razaoSocial}`,
        pdfUrl: url,
        nomeArquivoDownload: `Listagem_Adiantamento_13_${anoReferencia}_${empresaAtiva.nomeFantasia || 'Empresa'}.pdf`,
        onBaixarArquivo: () => gerarListagemAdiantamento13PDF(empresaAtiva, comp, folhasAtivas, colaboradoresAtivos),
      });
    } else {
      const comp = `12/${anoReferencia}`;
      const url = gerarListagemFinal13PDF(empresaAtiva, comp, folhasAtivas, colaboradoresAtivos, { returnBlobUrl: true }) as string;
      onAbrirPdfPreview({
        titulo: 'Listagem de Pagamento do 13º Salário (Final)',
        subtitulo: `Parcela Final · Competência ${comp} · ${empresaAtiva.razaoSocial}`,
        pdfUrl: url,
        nomeArquivoDownload: `Folha_13_Final_${anoReferencia}_${empresaAtiva.nomeFantasia || 'Empresa'}.pdf`,
        onBaixarArquivo: () => gerarListagemFinal13PDF(empresaAtiva, comp, folhasAtivas, colaboradoresAtivos),
      });
    }
  };

  const handleAbrirRecibosLotePDF = () => {
    if (folhasAtivas.length === 0) {
      mostrarNotificacao('Calcule primeiro a parcela selecionada antes de emitir os recibos.', 'info');
      return;
    }

    if (parcelaAtiva === 'ADIANTAMENTO_50') {
      const url = gerarReciboAdiantamento13PDF(folhasAtivas, empresaAtiva, colaboradoresAtivos, { returnBlobUrl: true }) as string;
      onAbrirPdfPreview({
        titulo: 'Recibos de Adiantamento de 13º Salário (Lote A4)',
        subtitulo: `1 recibo por página A4 · ${folhasAtivas.length} colaborador(es) · Novembro de ${anoReferencia}`,
        pdfUrl: url,
        nomeArquivoDownload: `Recibos_Adiantamento_13_${anoReferencia}_Lote.pdf`,
        onBaixarArquivo: () => gerarReciboAdiantamento13PDF(folhasAtivas, empresaAtiva, colaboradoresAtivos),
      });
    } else {
      const url = gerarReciboFinal13PDF(folhasAtivas, empresaAtiva, colaboradoresAtivos, { returnBlobUrl: true }) as string;
      onAbrirPdfPreview({
        titulo: 'Recibos de Pagamento do 13º Salário — Parcela Final (Lote A4)',
        subtitulo: `2 recibos por página A4 · ${folhasAtivas.length} colaborador(es) · Exercício ${anoReferencia}`,
        pdfUrl: url,
        nomeArquivoDownload: `Recibos_13_Final_${anoReferencia}_Lote.pdf`,
        onBaixarArquivo: () => gerarReciboFinal13PDF(folhasAtivas, empresaAtiva, colaboradoresAtivos),
      });
    }
  };

  const handleAbrirReciboIndividualPDF = (folha: FolhaEmpregado, emp: Empregado) => {
    if (parcelaAtiva === 'ADIANTAMENTO_50') {
      const url = gerarReciboAdiantamento13PDF(folha, empresaAtiva, emp, { returnBlobUrl: true }) as string;
      onAbrirPdfPreview({
        titulo: 'Recibo de Pagamento (Adiantamento de 13º Salário)',
        subtitulo: `${emp.nomeCompleto} · Matrícula ${emp.matricula} · Novembro de ${anoReferencia}`,
        pdfUrl: url,
        nomeArquivoDownload: `Recibo_Adiantamento_13_${anoReferencia}_${emp.matricula}.pdf`,
        onBaixarArquivo: () => gerarReciboAdiantamento13PDF(folha, empresaAtiva, emp),
      });
    } else {
      const url = gerarReciboFinal13PDF(folha, empresaAtiva, emp, { returnBlobUrl: true }) as string;
      onAbrirPdfPreview({
        titulo: 'Recibo de Pagamento (13º Salário Final)',
        subtitulo: `${emp.nomeCompleto} · Matrícula ${emp.matricula} · Competência ${anoReferencia}`,
        pdfUrl: url,
        nomeArquivoDownload: `Recibo_13_Final_${anoReferencia}_${emp.matricula}.pdf`,
        onBaixarArquivo: () => gerarReciboFinal13PDF(folha, empresaAtiva, emp),
      });
    }
  };

  // Totais para os cards
  const totais = useMemo(() => {
    return folhasAtivas.reduce(
      (acc, f) => {
        const itemINSS = f.itens.find(i => i.rubricaCodigo === '310')?.desconto || 0;
        const itemIRRF = f.itens.find(i => i.rubricaCodigo === '320')?.desconto || 0;
        const itemComp = f.itens.find(i => i.rubricaCodigo === '450')?.desconto || 0;
        acc.proventos += f.totalProventos;
        acc.descontos += f.totalDescontos;
        acc.liquido += f.valorLiquido;
        acc.fgts += f.encargosEmpresa?.fgtsDevido || 0;
        acc.bcFgts += f.bases?.baseFGTS || 0;
        acc.inss += itemINSS;
        acc.irrf += itemIRRF;
        acc.compensacao += itemComp;
        return acc;
      },
      { proventos: 0, descontos: 0, liquido: 0, fgts: 0, bcFgts: 0, inss: 0, irrf: 0, compensacao: 0 }
    );
  }, [folhasAtivas]);

  const colaboradoresFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return colaboradoresAtivos;
    return colaboradoresAtivos.filter(
      e =>
        e.nomeCompleto.toLowerCase().includes(q) ||
        e.matricula.toLowerCase().includes(q) ||
        e.cargo.toLowerCase().includes(q)
    );
  }, [colaboradoresAtivos, busca]);

  return (
    <div className="space-y-5 min-w-0">
      {/* Cabeçalho do Módulo de 13º Salário */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded inline-flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" />
              Gratificação Natalina · Lei nº 4.090/62 e 4.749/65
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {empresaAtiva.razaoSocial}
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1.5">
            13º Salário — Adiantamento 50% e Parcela Final
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Apuração proporcional em avos (&ge; 15 dias/mês), FGTS por parcela, tributação exclusiva de INSS/IRRF 2026 e emissão dos formulários oficiais em PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <CalendarClock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Exercício:</span>
            <select
              value={anoReferencia}
              onChange={e => setAnoReferencia(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(ano => (
                <option key={ano} value={ano} className="bg-white dark:bg-slate-900">
                  {ano}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRestaurarAvosCLT}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Recalcular automaticamente a quantidade de avos pela data de admissão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Recalcular Avos CLT
          </button>
        </div>
      </div>

      {/* Seletor das 2 Parcelas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setParcelaAtiva('ADIANTAMENTO_50')}
          className={`text-left p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
            parcelaAtiva === 'ADIANTAMENTO_50'
              ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                parcelaAtiva === 'ADIANTAMENTO_50'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                1ª Parcela
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                Comp. 11/{anoReferencia} · Venc. 30/11/{anoReferencia}
              </span>
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Adiantamento de 50% (Rubrica 150)
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Metade da remuneração proporcional sem descontos de INSS ou IRRF; incidência exclusiva de FGTS (8% / 2%).
            </p>
          </div>
          {estadoAtual.folhasPrimeiraParcela.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {estadoAtual.folhasPrimeiraParcela.length} calc.
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setParcelaAtiva('PARCELA_FINAL')}
          className={`text-left p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
            parcelaAtiva === 'PARCELA_FINAL'
              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
          }`}
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                parcelaAtiva === 'PARCELA_FINAL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                2ª Parcela
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                Comp. 12/{anoReferencia} · Venc. 20/12/{anoReferencia}
              </span>
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Parcela Final / Quitação (Rubricas 160 · 310 · 450)
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              13º Integral (X/12), INSS/IRRF exclusivos, desconto da 1ª parcela (450) e FGTS apenas sobre a diferença residual.
            </p>
          </div>
          {estadoAtual.folhasParcelaFinal.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {estadoAtual.folhasParcelaFinal.length} calc.
            </span>
          )}
        </button>
      </div>

      {/* KPI Cards com Efeito 3D */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <Card3D enabled={efeitos3D} intensity="subtle">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">
                {parcelaAtiva === 'ADIANTAMENTO_50' ? 'Total Bruto 1ª Parcela (150)' : '13º Salário Integral (160)'}
              </span>
              <Gift className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums">
              {formatarMoeda(totais.proventos)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {folhasAtivas.length} colaborador(es) calculado(s)
            </div>
          </div>
        </Card3D>

        <Card3D enabled={efeitos3D} intensity="subtle">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">
                {parcelaAtiva === 'ADIANTAMENTO_50' ? 'Descontos (INSS / IRRF)' : 'INSS (310) + IRRF (320)'}
              </span>
              <ShieldCheck className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1.5 tabular-nums">
              {parcelaAtiva === 'ADIANTAMENTO_50'
                ? 'R$ 0,00'
                : formatarMoeda(totais.inss + totais.irrf)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              {parcelaAtiva === 'ADIANTAMENTO_50'
                ? 'Isento na 1ª parcela (Lei 4.749/65)'
                : `INSS: ${formatarMoeda(totais.inss)} · IRRF: ${formatarMoeda(totais.irrf)}`}
            </div>
          </div>
        </Card3D>

        <Card3D enabled={efeitos3D} intensity="subtle">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">
                {parcelaAtiva === 'ADIANTAMENTO_50' ? 'Base de Cálculo FGTS' : 'Compensação 1ª Parc. (450)'}
              </span>
              <Layers className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums">
              {parcelaAtiva === 'ADIANTAMENTO_50'
                ? formatarMoeda(totais.bcFgts)
                : formatarMoeda(totais.compensacao)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              {parcelaAtiva === 'ADIANTAMENTO_50'
                ? `FGTS (8%/2%): ${formatarMoeda(totais.fgts)}`
                : `BC-FGTS residual: ${formatarMoeda(totais.bcFgts)}`}
            </div>
          </div>
        </Card3D>

        <Card3D enabled={efeitos3D} intensity="subtle">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Líquido a Pagar &amp; FGTS</span>
              <Wallet className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums">
              {formatarMoeda(totais.liquido)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              FGTS da competência: {formatarMoeda(totais.fgts)}
            </div>
          </div>
        </Card3D>
      </div>

      {/* Barra de Ferramentas: Cálculo e Emissão dos PDFs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Filtrar colaborador por nome, matrícula ou cargo..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={parcelaAtiva === 'ADIANTAMENTO_50' ? handleCalcularPrimeiraParcela : handleCalcularParcelaFinal}
            className={`${efeitos3D ? 'btn-3d' : ''} px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-xs`}
          >
            <Calculator className="w-4 h-4" />
            {parcelaAtiva === 'ADIANTAMENTO_50' ? 'Calcular Adiantamento (50%)' : 'Calcular Parcela Final'}
          </button>

          <button
            onClick={handleAbrirListagemPDF}
            disabled={folhasAtivas.length === 0}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {parcelaAtiva === 'ADIANTAMENTO_50' ? 'Listagem Adiantamento (PDF)' : 'Folha Final 13º (PDF)'}
          </button>

          <button
            onClick={handleAbrirRecibosLotePDF}
            disabled={folhasAtivas.length === 0}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {parcelaAtiva === 'ADIANTAMENTO_50' ? 'Recibos Adiantamento A4 (Lote)' : 'Recibos 13º Final A4 (Lote)'}
          </button>
        </div>
      </div>

      {/* Tabela Analítica do 13º Salário */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Colaborador / Admissão</th>
                <th className="py-3 px-2 text-center">Avos (1–12)</th>
                <th className="py-3 px-2 text-right">Médias / Var. (R$)</th>
                <th className="py-3 px-2 text-right">
                  {parcelaAtiva === 'ADIANTAMENTO_50' ? 'Perc. (%)' : 'Compens. 1ª Parc. (450)'}
                </th>
                <th className="py-3 px-3 text-right">
                  {parcelaAtiva === 'ADIANTAMENTO_50' ? 'Adiantamento (150)' : '13º Integral (160)'}
                </th>
                <th className="py-3 px-3 text-right">
                  {parcelaAtiva === 'ADIANTAMENTO_50' ? 'INSS / IRRF' : 'INSS (310) + IRRF (320)'}
                </th>
                <th className="py-3 px-3 text-right">Líquido &amp; FGTS</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {colaboradoresFiltrados.map(emp => {
                const ehEstagio = emp.vinculo === 'ESTAGIO';
                const param = estadoAtual.parametrosPorEmpregado[emp.id] || {
                  avos: ehEstagio ? 0 : calcularAvos13NoAno(emp.dataAdmissao, anoReferencia),
                  percentualAdiantamento: 50,
                  mediasVariaveis: 0,
                };
                const folha1 = estadoAtual.folhasPrimeiraParcela.find(f => f.empregadoId === emp.id);
                const folhaFinal = estadoAtual.folhasParcelaFinal.find(f => f.empregadoId === emp.id);
                const folhaExibida = parcelaAtiva === 'ADIANTAMENTO_50' ? folha1 : folhaFinal;

                const valorCompensacaoPadrao =
                  param.adiantamentoPagoManual !== undefined
                    ? param.adiantamentoPagoManual
                    : folha1
                    ? folha1.valorLiquido
                    : Math.round(((emp.salarioBase + param.mediasVariaveis) * (param.avos / 12) * 0.5) * 100) / 100;

                const itemPrincipal = folhaExibida?.itens.find(i =>
                  parcelaAtiva === 'ADIANTAMENTO_50' ? i.rubricaCodigo === '150' : i.rubricaCodigo === '160'
                );
                const valINSS = folhaExibida?.itens.find(i => i.rubricaCodigo === '310')?.desconto || 0;
                const valIRRF = folhaExibida?.itens.find(i => i.rubricaCodigo === '320')?.desconto || 0;

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 min-w-[220px]">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${obterCorAvatar(emp.nomeCompleto)}`}>
                          {obterIniciais(emp.nomeCompleto)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[210px]">
                            {emp.nomeCompleto}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono">Mat. {emp.matricula}</span>
                            <span>·</span>
                            <span>Adm. {formatarData(emp.dataAdmissao)}</span>
                            <span>·</span>
                            <span className="tabular-nums">{formatarMoeda(emp.salarioBase)}</span>
                            {ehEstagio && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
                                Estágio (Sem 13º)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      {ehEstagio ? (
                        <span className="text-[11px] text-slate-400">—</span>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={12}
                            value={param.avos}
                            onChange={e =>
                              atualizarParametroEmpregado(emp.id, {
                                avos: Math.max(0, Math.min(12, Number(e.target.value) || 0)),
                              })
                            }
                            className="w-12 text-center py-1 px-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">/12</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-2 text-right">
                      {ehEstagio ? (
                        <span className="text-[11px] text-slate-400">—</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={param.mediasVariaveis}
                          onChange={e =>
                            atualizarParametroEmpregado(emp.id, {
                              mediasVariaveis: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-24 text-right py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums"
                        />
                      )}
                    </td>

                    <td className="py-3 px-2 text-right">
                      {ehEstagio ? (
                        <span className="text-[11px] text-slate-400">—</span>
                      ) : parcelaAtiva === 'ADIANTAMENTO_50' ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={param.percentualAdiantamento}
                            onChange={e =>
                              atualizarParametroEmpregado(emp.id, {
                                percentualAdiantamento: Math.max(1, Math.min(100, Number(e.target.value) || 50)),
                              })
                            }
                            className="w-14 text-right py-1 px-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums"
                          />
                          <span className="text-[10px] text-slate-400">%</span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-end">
                          <input
                            type="number"
                            min={0}
                            step={10}
                            value={valorCompensacaoPadrao}
                            onChange={e =>
                              atualizarParametroEmpregado(emp.id, {
                                adiantamentoPagoManual: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-24 text-right py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums"
                          />
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {param.adiantamentoPagoManual !== undefined
                              ? 'Valor manual'
                              : folha1
                              ? 'Vinculado à 1ª parc.'
                              : 'Estimado 50%'}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums">
                      {folhaExibida ? (
                        <div>
                          <div className="font-bold text-emerald-700 dark:text-emerald-400">
                            {formatarMoeda(folhaExibida.totalProventos)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {itemPrincipal?.referencia || `${param.avos}/12`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Aguardando cálculo</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums">
                      {folhaExibida ? (
                        parcelaAtiva === 'ADIANTAMENTO_50' ? (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Isento</span>
                        ) : (
                          <div>
                            <div className="font-semibold text-rose-600 dark:text-rose-400">
                              - {formatarMoeda(valINSS + valIRRF)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              INSS {formatarMoeda(valINSS)}
                              {valIRRF > 0 ? ` · IR ${formatarMoeda(valIRRF)}` : ''}
                            </div>
                          </div>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums">
                      {folhaExibida ? (
                        <div>
                          <div className="font-extrabold text-blue-700 dark:text-blue-400">
                            {formatarMoeda(folhaExibida.valorLiquido)}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            FGTS: {formatarMoeda(folhaExibida.encargosEmpresa?.fgtsDevido || 0)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {folhaExibida ? (
                        <div className="inline-flex items-center gap-1.5">
                          {itemPrincipal && (
                            <button
                              onClick={() => onAbrirMemoria(itemPrincipal, emp.nomeCompleto)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors"
                            >
                              Memória
                            </button>
                          )}
                          <button
                            onClick={() => handleAbrirReciboIndividualPDF(folhaExibida, emp)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Recibo A4
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {colaboradoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                    Nenhum colaborador encontrado para o filtro informado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Nota técnica trabalhista no rodapé */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-start sm:items-center gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Regra Legal (Lei nº 4.090/62 e 4.749/65):</strong> 1ª parcela até 30/nov sem retenção de INSS/IRRF (FGTS sobre o valor pago); 2ª parcela até 20/dez com tributação exclusiva integral sobre o 13º e FGTS apenas sobre o saldo restante.
            </span>
          </div>
          {estadoAtual.ultimaAtualizacao && (
            <span className="font-mono text-[10px] shrink-0">
              Último cálculo: {new Date(estadoAtual.ultimaAtualizacao).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
