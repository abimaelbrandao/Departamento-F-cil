import React, { useState, useMemo } from 'react';
import {
  X,
  Palmtree,
  FileCheck2,
  Download,
  Eye,
  Calendar,
  Building2,
  User,
  SlidersHorizontal,
  CheckCircle2,
  Printer,
  Clock,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Empresa, Empregado, PeriodoFerias, DadosDocumentoFerias } from '../types/dp';
import {
  gerarDemonstrativoFeriasPDF,
  gerarReciboFeriasPDF,
  gerarDocumentosFeriasConjuntoPDF,
} from '../utils/pdfGenerator';
import { PDFPreviewModal } from './PDFPreviewModal';
import { formatarMoeda, formatarData, formatarValorDecimal, numeroParaExtenso } from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa;
  empregado: Empregado;
  periodoFerias?: PeriodoFerias;
}

export type TipoDocumentoFerias = 'DEMONSTRATIVO' | 'RECIBO' | 'CONJUNTO';

export const VacationDocumentsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresa,
  empregado,
  periodoFerias,
}) => {
  // Configuração padrão ou baseada na primeira programação existente
  const progInicial = periodoFerias?.programacoes && periodoFerias.programacoes.length > 0
    ? periodoFerias.programacoes[0]
    : null;

  // Parcela selecionada (para férias fracionadas)
  const [parcelaSelecionadaIdx, setParcelaSelecionadaIdx] = useState<number>(0);

  // Período aquisitivo
  const periodoAquisitivoInicio = periodoFerias?.periodoAquisitivoInicio || '2025-07-01';
  const periodoAquisitivoFim = periodoFerias?.periodoAquisitivoFim || '2026-06-30';

  // Parâmetros de gozo
  const [dataInicioGozo, setDataInicioGozo] = useState<string>(
    progInicial?.dataInicio || '2026-07-01'
  );
  const [diasGozo, setDiasGozo] = useState<number>(
    progInicial?.diasGozo || 30
  );
  const [abonoPecuniario, setAbonoPecuniario] = useState<boolean>(
    progInicial?.abonoPecuniario || false
  );
  const [adiantamento13, setAdiantamento13] = useState<boolean>(
    progInicial?.adiantamento13 || false
  );
  const [faltas, setFaltas] = useState<number>(
    periodoFerias?.faltasInjustificadas || 0
  );

  // Datas específicas requisitadas no modelo:
  // Data de fim calculada
  const dataFimCalculada = useMemo(() => {
    try {
      const d = new Date(dataInicioGozo + 'T00:00:00');
      d.setDate(d.getDate() + diasGozo - 1);
      return d.toISOString().split('T')[0];
    } catch {
      return dataInicioGozo;
    }
  }, [dataInicioGozo, diasGozo]);

  // Retorno ao serviço
  const [dataRetornoManual, setDataRetornoManual] = useState<string>('');
  const dataRetornoCalculada = useMemo(() => {
    if (dataRetornoManual) return dataRetornoManual;
    try {
      const d = new Date(dataFimCalculada + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    } catch {
      return dataFimCalculada;
    }
  }, [dataFimCalculada, dataRetornoManual]);

  // Data do Aviso de férias (CLT Art. 135: 30 dias de antecedência)
  const [dataAvisoManual, setDataAvisoManual] = useState<string>('');
  const dataAvisoCalculada = useMemo(() => {
    if (dataAvisoManual) return dataAvisoManual;
    try {
      const d = new Date(dataInicioGozo + 'T00:00:00');
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    } catch {
      return dataInicioGozo;
    }
  }, [dataInicioGozo, dataAvisoManual]);

  // Data do Recibo de quitação (CLT Art. 145: até 2 dias antes do início do gozo)
  const [dataReciboManual, setDataReciboManual] = useState<string>('');
  const dataReciboCalculada = useMemo(() => {
    if (dataReciboManual) return dataReciboManual;
    try {
      const d = new Date(dataInicioGozo + 'T00:00:00');
      d.setDate(d.getDate() - 2);
      return d.toISOString().split('T')[0];
    } catch {
      return dataInicioGozo;
    }
  }, [dataInicioGozo, dataReciboManual]);

  // Seleção de Tipo de Documento
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoFerias>('CONJUNTO');
  const [mostrarPersonalizacao, setMostrarPersonalizacao] = useState(false);

  // Estados de pré-visualização de PDF
  const [previewAberto, setPreviewAberto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitulo, setPreviewTitulo] = useState('');
  const [previewNomeArquivo, setPreviewNomeArquivo] = useState('');

  // Salário contratual considerado no cálculo
  const salarioContratual = empregado.salarioBase;

  // Cálculo matemático consistente
  const calculoValores = useMemo(() => {
    const valorFerias = diasGozo === 30
      ? salarioContratual
      : Math.round(((salarioContratual / 30) * diasGozo) * 100) / 100;

    const tercoFerias = Math.round((valorFerias / 3) * 100) / 100;

    const diasAbono = abonoPecuniario ? 10 : 0;
    const valorAbono = diasAbono > 0 ? Math.round(((salarioContratual / 30) * diasAbono) * 100) / 100 : 0;
    const tercoAbono = valorAbono > 0 ? Math.round((valorAbono / 3) * 100) / 100 : 0;

    const valor13 = adiantamento13 ? Math.round((salarioContratual * 0.5) * 100) / 100 : 0;

    const baseINSS = valorFerias + tercoFerias;

    // INSS Tabela Progressiva 2026 oficial (dedução oficial de 24,33 na 2ª faixa)
    let valorINSS = 0;
    let aliquotaINSSStr = '9%';
    if (baseINSS <= 1518.00) {
      valorINSS = Math.round((baseINSS * 0.075) * 100) / 100;
      aliquotaINSSStr = '7,5%';
    } else if (baseINSS <= 2793.88) {
      valorINSS = Math.round((baseINSS * 0.09 - 24.33) * 100) / 100;
      aliquotaINSSStr = '9%';
    } else if (baseINSS <= 4190.83) {
      valorINSS = Math.round((baseINSS * 0.12 - 108.15) * 100) / 100;
      aliquotaINSSStr = '12%';
    } else if (baseINSS <= 8157.41) {
      valorINSS = Math.round((baseINSS * 0.14 - 191.96) * 100) / 100;
      aliquotaINSSStr = '14%';
    } else {
      valorINSS = 950.08;
      aliquotaINSSStr = 'Teto';
    }

    // IRRF
    let valorIRRF = 0;
    const baseIRRF = baseINSS - valorINSS;
    if (baseIRRF > 2259.20) {
      if (baseIRRF <= 2826.65) valorIRRF = Math.round(((baseIRRF * 0.075) - 169.44) * 100) / 100;
      else if (baseIRRF <= 3751.05) valorIRRF = Math.round(((baseIRRF * 0.15) - 381.44) * 100) / 100;
      else if (baseIRRF <= 4664.68) valorIRRF = Math.round(((baseIRRF * 0.225) - 662.77) * 100) / 100;
      else valorIRRF = Math.round(((baseIRRF * 0.275) - 896.00) * 100) / 100;
      valorIRRF = Math.max(0, valorIRRF);
    }

    const totalProventos = Math.round((valorFerias + tercoFerias + valorAbono + tercoAbono + valor13) * 100) / 100;
    const totalDescontos = Math.round((valorINSS + valorIRRF) * 100) / 100;
    const liquido = Math.round((totalProventos - totalDescontos) * 100) / 100;

    const fgts = Math.round((baseINSS * 0.08) * 100) / 100;

    return {
      valorFerias,
      tercoFerias,
      valorAbono,
      tercoAbono,
      diasAbono,
      valor13,
      baseINSS,
      valorINSS,
      aliquotaINSSStr,
      valorIRRF,
      totalProventos,
      totalDescontos,
      liquido,
      fgts,
    };
  }, [salarioContratual, diasGozo, abonoPecuniario, adiantamento13]);

  if (!isOpen) return null;

  // Monta o payload de dados completo
  const montarDadosDocumento = (): DadosDocumentoFerias => {
    return {
      empresa,
      empregado,
      periodoAquisitivoInicio,
      periodoAquisitivoFim,
      dataInicioGozo,
      dataFimGozo: dataFimCalculada,
      dataRetornoServico: dataRetornoCalculada,
      diasGozo,
      diasAbono: calculoValores.diasAbono,
      abonoPecuniario,
      adiantamento13,
      faltas,
      salarioContratual,
      dataAviso: dataAvisoCalculada,
      dataRecibo: dataReciboCalculada,
      parcelaDescricao: diasGozo === 30 ? 'Período Integral (30 dias)' : `Parcela Fracionada (${diasGozo} dias)`,
      valorFerias: calculoValores.valorFerias,
      tercoFerias: calculoValores.tercoFerias,
      valorAbono: calculoValores.valorAbono,
      tercoAbono: calculoValores.tercoAbono,
      valor13: calculoValores.valor13,
      valorINSS: calculoValores.valorINSS,
      aliquotaINSS: calculoValores.aliquotaINSSStr,
      valorIRRF: calculoValores.valorIRRF,
      totalProventos: calculoValores.totalProventos,
      totalDescontos: calculoValores.totalDescontos,
      fgts: calculoValores.fgts,
      fgtsContribSocial: 0,
      liquido: calculoValores.liquido,
    };
  };

  const nomeLimpo = empregado.nomeCompleto.replace(/\s+/g, '_');

  // Abertura de pré-visualização
  const handleAbrirPreview = (tipo: TipoDocumentoFerias) => {
    const dados = montarDadosDocumento();
    let url: string | void = undefined;
    let titulo = '';
    let nomeArquivo = '';

    if (tipo === 'DEMONSTRATIVO') {
      titulo = 'Demonstrativo de Férias — Pré-visualização';
      nomeArquivo = `Demonstrativo_Ferias_${nomeLimpo}_${diasGozo}dias.pdf`;
      url = gerarDemonstrativoFeriasPDF(dados, { returnBlobUrl: true });
    } else if (tipo === 'RECIBO') {
      titulo = 'Recibo de Férias — Pré-visualização';
      nomeArquivo = `Recibo_Ferias_${nomeLimpo}_${diasGozo}dias.pdf`;
      url = gerarReciboFeriasPDF(dados, { returnBlobUrl: true });
    } else {
      titulo = 'Demonstrativo e Recibo de Férias — Pré-visualização';
      nomeArquivo = `Ferias_${nomeLimpo}_Demonstrativo_e_Recibo_${diasGozo}dias.pdf`;
      url = gerarDocumentosFeriasConjuntoPDF(dados, { returnBlobUrl: true });
    }

    if (url && typeof url === 'string') {
      setPreviewUrl(url);
      setPreviewTitulo(titulo);
      setPreviewNomeArquivo(nomeArquivo);
      setPreviewAberto(true);
    }
  };

  // Download direto
  const handleBaixarDireto = (tipo: TipoDocumentoFerias) => {
    const dados = montarDadosDocumento();
    if (tipo === 'DEMONSTRATIVO') {
      gerarDemonstrativoFeriasPDF(dados);
    } else if (tipo === 'RECIBO') {
      gerarReciboFeriasPDF(dados);
    } else {
      gerarDocumentosFeriasConjuntoPDF(dados);
    }
  };

  // Carregar parcela fracionada pré-definida
  const handleSelecionarParcelaFracionada = (dias: number, dataIni: string) => {
    setDiasGozo(dias);
    setDataInicioGozo(dataIni);
    setDataRetornoManual('');
    setDataAvisoManual('');
    setDataReciboManual('');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs">
        <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 rounded-xl">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Emitir Documentos de Férias
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded">
                    Papel Carta
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {empregado.nomeCompleto} · Matrícula: {empregado.matricula} · {empregado.cargo}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subheader com Dados Básicos */}
          <div className="bg-slate-100/70 dark:bg-slate-800/50 px-6 py-3 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block font-medium">Empresa</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {empresa.razaoSocial}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Período Aquisitivo</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  {formatarData(periodoAquisitivoInicio)} a {formatarData(periodoAquisitivoFim)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Salário Contratual</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {formatarMoeda(salarioContratual)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Duração Selecionada</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400 font-mono">
                  {diasGozo} dias de gozo
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Opções de Documento */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-3">
                1. Selecione o Documento para Emissão:
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Opção 1: Demonstrativo de Férias */}
                <div
                  onClick={() => setTipoDocumento('DEMONSTRATIVO')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    tipoDocumento === 'DEMONSTRATIVO'
                      ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Demonstrativo de Férias
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Pág. 1
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Identificação, quadro de períodos, base de cálculo, remuneração (proventos, descontos, FGTS e líquido), comunicado de férias e assinaturas com aviso prévio.
                  </p>
                </div>

                {/* Opção 2: Recibo de Férias */}
                <div
                  onClick={() => setTipoDocumento('RECIBO')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    tipoDocumento === 'RECIBO'
                      ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Recibo de Férias
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Pág. 2
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Formulário compacto na parte superior da página com quitação do valor líquido exato, assinatura do empregado, data do recibo e assinaturas do empregador e responsável.
                  </p>
                </div>

                {/* Opção 3: Demonstrativo + Recibo em um único PDF */}
                <div
                  onClick={() => setTipoDocumento('CONJUNTO')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                    tipoDocumento === 'CONJUNTO'
                      ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white rounded-full">
                    Recomendado
                  </span>
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Demonstrativo + Recibo
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                      2 Páginas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Documento único com as 2 páginas na ordem do anexo oficial: Pág. 1 Demonstrativo de Férias e Pág. 2 Recibo de Férias em papel Carta.
                  </p>
                </div>
              </div>
            </div>

            {/* Painel de Ações Rápidas: Pré-visualizar ou Baixar */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Emissão em Papel Carta (215,9 × 279,4 mm) · Fundo Branco e Texto Preto
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Valores e datas sincronizados entre as duas páginas com valor por extenso automático.
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => handleAbrirPreview(tipoDocumento)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar Prévia
                </button>

                <button
                  onClick={() => handleBaixarDireto(tipoDocumento)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar PDF
                </button>
              </div>
            </div>

            {/* Seletor Rápido de Férias Fracionadas e Períodos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Período e Fracionamento das Férias (Art. 134 CLT)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Até 3 parcelas (mínimo de 14 dias para uma delas)
                </span>
              </div>

              {/* Botões de atalho de parcelas */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSelecionarParcelaFracionada(30, '2026-07-01')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    diasGozo === 30
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Integral: 30 dias (01/07 a 30/07/2026)
                </button>

                <button
                  type="button"
                  onClick={() => handleSelecionarParcelaFracionada(15, '2026-07-01')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    diasGozo === 15
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  1ª Parcela: 15 dias (01/07 a 15/07/2026)
                </button>

                <button
                  type="button"
                  onClick={() => handleSelecionarParcelaFracionada(15, '2026-11-01')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    diasGozo === 15 && dataInicioGozo === '2026-11-01'
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  2ª Parcela: 15 dias (01/11 a 15/11/2026)
                </button>

                <button
                  type="button"
                  onClick={() => handleSelecionarParcelaFracionada(20, '2026-07-01')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    diasGozo === 20
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  20 dias (01/07 a 20/07/2026)
                </button>

                <button
                  type="button"
                  onClick={() => handleSelecionarParcelaFracionada(10, '2026-08-01')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    diasGozo === 10
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  10 dias (01/08 a 10/08/2026)
                </button>
              </div>

              {/* Resumo Financeiro da Parcela */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Remuneração Férias</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {formatarMoeda(calculoValores.valorFerias)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">1/3 Constitucional</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {formatarMoeda(calculoValores.tercoFerias)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Desconto INSS</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                    -{formatarMoeda(calculoValores.valorINSS)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Líquido a Receber</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatarMoeda(calculoValores.liquido)}
                  </span>
                </div>
              </div>

              {/* Valor por extenso sincronizado */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-400">
                <strong>Valor por extenso nas 2 páginas:</strong> {numeroParaExtenso(calculoValores.liquido)}
              </div>
            </div>

            {/* Painel de Personalização de Datas e Parâmetros (Aviso, Retorno, Recibo) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setMostrarPersonalizacao(!mostrarPersonalizacao)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Ajustar Datas e Parâmetros Legais (Aviso, Retorno e Recibo)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Mantenha campos distintos para data do aviso, período de gozo, retorno e recibo
                    </span>
                  </div>
                </div>

                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {mostrarPersonalizacao ? 'Ocultar Parâmetros' : 'Personalizar Datas'}
                </span>
              </button>

              {mostrarPersonalizacao && (
                <div className="p-4 bg-white dark:bg-slate-900 space-y-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Início do Gozo
                      </label>
                      <input
                        type="date"
                        value={dataInicioGozo}
                        onChange={e => setDataInicioGozo(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Dias de Gozo
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={30}
                        value={diasGozo}
                        onChange={e => setDiasGozo(parseInt(e.target.value, 10) || 1)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Fim do Gozo (Calculado)
                      </label>
                      <input
                        type="date"
                        value={dataFimCalculada}
                        disabled
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Retorno ao Serviço
                      </label>
                      <input
                        type="date"
                        value={dataRetornoCalculada}
                        onChange={e => setDataRetornoManual(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Padrão: dia seguinte ao término do gozo
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Data do Aviso (Comunicado)
                      </label>
                      <input
                        type="date"
                        value={dataAvisoCalculada}
                        onChange={e => setDataAvisoManual(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Padrão CLT: 30 dias antes do gozo
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Data do Recibo (Quitação)
                      </label>
                      <input
                        type="date"
                        value={dataReciboCalculada}
                        onChange={e => setDataReciboManual(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Padrão CLT: até 2 dias antes do gozo
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={abonoPecuniario}
                        onChange={e => setAbonoPecuniario(e.target.checked)}
                        className="rounded text-amber-600"
                      />
                      Vender 10 dias (Abono Pecuniário)
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={adiantamento13}
                        onChange={e => setAdiantamento13(e.target.checked)}
                        className="rounded text-amber-600"
                      />
                      Adiantar 50% do 13º Salário
                    </label>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <label className="text-slate-500 text-xs">Faltas Injustificadas:</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={faltas}
                        onChange={e => setFaltas(parseInt(e.target.value, 10) || 0)}
                        className="w-16 p-1 text-center border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Emissor: <strong>Departamento Fácil</strong> · Gerar o PDF não registra automaticamente pagamento ou assinatura
            </span>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Pré-visualização com Download e Impressão */}
      <PDFPreviewModal
        isOpen={previewAberto}
        onClose={() => setPreviewAberto(false)}
        titulo={previewTitulo}
        subtitulo="Documento gerado em tamanho real (Papel Carta) com texto nítido selecionável"
        pdfUrl={previewUrl}
        nomeArquivoDownload={previewNomeArquivo}
        onBaixarArquivo={() => handleBaixarDireto(tipoDocumento)}
      />
    </>
  );
};
