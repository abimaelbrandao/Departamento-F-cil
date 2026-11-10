import React, { useState } from 'react';
import {
  X,
  FileText,
  FileCheck2,
  Printer,
  Download,
  Eye,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  ShieldAlert,
  Save,
  HelpCircle
} from 'lucide-react';
import { Empresa, Empregado } from '../types/dp';
import {
  CLAUSULAS_CONTRATO_EXPERIENCIA_PADRAO,
  ClausulaContratoItem,
  gerarContratoExperienciaPDF,
  gerarRegistroEmpregadoPDF,
  gerarDocumentosAdmissaoConjuntoPDF,
} from '../utils/pdfGenerator';
import { PDFPreviewModal } from './PDFPreviewModal';
import { formatarMoeda, formatarData, formatarCNPJ, formatarCPF, formatarValorDecimal, numeroParaExtenso } from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa;
  empregado: Empregado;
  onAtualizarEmpregado?: (empregadoAtualizado: Empregado) => void;
}

export type TipoDocumentoAdmissao = 'CONTRATO' | 'REGISTRO' | 'CONJUNTO';

export const AdmissionDocumentsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresa,
  empregado,
  onAtualizarEmpregado,
}) => {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoAdmissao>('CONJUNTO');
  const [modoEdicaoClausulas, setModoEdicaoClausulas] = useState(false);

  // Inicializa cláusulas customizadas ou o padrão
  const [clausulas, setClausulas] = useState<ClausulaContratoItem[]>(() => {
    if (empregado.clausulasContratoCustom && empregado.clausulasContratoCustom.length === 10) {
      return empregado.clausulasContratoCustom.map(c => ({
        numero: c.numero,
        titulo: CLAUSULAS_CONTRATO_EXPERIENCIA_PADRAO.find(p => p.numero === c.numero)?.titulo || `Cláusula ${c.numero}`,
        texto: c.texto,
      }));
    }
    return CLAUSULAS_CONTRATO_EXPERIENCIA_PADRAO;
  });

  const [salvoSucesso, setSalvoSucesso] = useState(false);

  // Estado para o modal de pré-visualização do PDF
  const [previewAberto, setPreviewAberto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitulo, setPreviewTitulo] = useState('');
  const [previewNomeArquivo, setPreviewNomeArquivo] = useState('');

  if (!isOpen) return null;

  const nomeLimpo = empregado.nomeCompleto.replace(/\s+/g, '_');
  const salarioExtenso = numeroParaExtenso(empregado.salarioBase);

  // Handler para gerar e abrir o preview do PDF
  const handleAbrirPreview = (tipo: TipoDocumentoAdmissao) => {
    let url: string | void = undefined;
    let titulo = '';
    let nomeArquivo = '';

    if (tipo === 'CONTRATO') {
      titulo = 'Contrato de Experiência de Trabalho — Pré-visualização';
      nomeArquivo = `Contrato_Experiencia_${nomeLimpo}.pdf`;
      url = gerarContratoExperienciaPDF(empresa, empregado, { returnBlobUrl: true }, clausulas);
    } else if (tipo === 'REGISTRO') {
      titulo = 'Registro de Empregado (Ficha Cadastral) — Pré-visualização';
      nomeArquivo = `Registro_Empregado_${nomeLimpo}.pdf`;
      url = gerarRegistroEmpregadoPDF(empresa, empregado, { returnBlobUrl: true });
    } else {
      titulo = 'Contrato de Experiência + Registro de Empregado — Pré-visualização';
      nomeArquivo = `Admissao_${nomeLimpo}_Contrato_e_Registro.pdf`;
      url = gerarDocumentosAdmissaoConjuntoPDF(empresa, empregado, { returnBlobUrl: true }, clausulas);
    }

    if (url && typeof url === 'string') {
      setPreviewUrl(url);
      setPreviewTitulo(titulo);
      setPreviewNomeArquivo(nomeArquivo);
      setPreviewAberto(true);
    }
  };

  // Handler para download direto
  const handleBaixarDireto = (tipo: TipoDocumentoAdmissao) => {
    if (tipo === 'CONTRATO') {
      gerarContratoExperienciaPDF(empresa, empregado, undefined, clausulas);
    } else if (tipo === 'REGISTRO') {
      gerarRegistroEmpregadoPDF(empresa, empregado);
    } else {
      gerarDocumentosAdmissaoConjuntoPDF(empresa, empregado, undefined, clausulas);
    }
  };

  // Atualiza texto de uma cláusula específica
  const handleAlterarTextoClausula = (numero: number, novoTexto: string) => {
    setClausulas(prev =>
      prev.map(c => (c.numero === numero ? { ...c, texto: novoTexto } : c))
    );
  };

  // Restaura cláusulas originais do anexo
  const handleRestaurarPadrao = () => {
    setClausulas(CLAUSULAS_CONTRATO_EXPERIENCIA_PADRAO);
    setSalvoSucesso(false);
  };

  // Salva no registro do empregado
  const handleSalvarClausulas = () => {
    if (onAtualizarEmpregado) {
      const empregadoAtualizado: Empregado = {
        ...empregado,
        clausulasContratoCustom: clausulas.map(c => ({
          numero: c.numero,
          texto: c.texto,
        })),
      };
      onAtualizarEmpregado(empregadoAtualizado);
    }
    setSalvoSucesso(true);
    setTimeout(() => setSalvoSucesso(false), 3000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs">
        <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 rounded-xl">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Emitir Documentos de Admissão
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded">
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

          {/* Subheader com Dados Chave da Admissão */}
          <div className="bg-slate-100/70 dark:bg-slate-800/50 px-6 py-3 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block font-medium">Empregadora</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {empresa.razaoSocial}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Admissão</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatarData(empregado.dataAdmissao)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Salário Contratual</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {formatarMoeda(empregado.salarioBase)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Prazo de Experiência</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {empregado.diasExperienciaTotal || 45} dias iniciais
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Opções de Emissão */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-3">
                1. Selecione o Documento para Emissão:
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Opção 1: Contrato de Experiência */}
                <div
                  onClick={() => setTipoDocumento('CONTRATO')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    tipoDocumento === 'CONTRATO'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Contrato de Experiência
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      1 Página
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Contrato com identificação das partes, 10 cláusulas integrais, assinaturas de testemunhas e empregador/empregado, e termo de prorrogação no rodapé.
                  </p>
                </div>

                {/* Opção 2: Registro de Empregado */}
                <div
                  onClick={() => setTipoDocumento('REGISTRO')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    tipoDocumento === 'REGISTRO'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Registro de Empregado
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      1 Página
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Ficha cadastral completa com dados do empregador e autenticação, foto 3x4, documentos, grade semanal de jornada (SEG a DOM), ASO e histórico.
                  </p>
                </div>

                {/* Opção 3: Contrato + Registro em um único PDF */}
                <div
                  onClick={() => setTipoDocumento('CONJUNTO')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                    tipoDocumento === 'CONJUNTO'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white rounded-full">
                    Recomendado
                  </span>
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Contrato + Registro
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                      2 Páginas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Documento único com as 2 páginas na ordem do anexo oficial: Pág. 1 Contrato de Experiência e Pág. 2 Registro de Empregado em papel Carta.
                  </p>
                </div>
              </div>
            </div>

            {/* Painel de Ações Rápidas: Pré-visualizar ou Baixar */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Emissão Imediata em Papel Carta (215,9 × 279,4 mm)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Compatível com visualização em tela, impressão e download direto.
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => handleAbrirPreview(tipoDocumento)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
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

            {/* Seção de Revisão das Cláusulas (Contrato de Experiência) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setModoEdicaoClausulas(!modoEdicaoClausulas)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Revisar e Editar Cláusulas Contratuais (Cláusulas 1 a 10)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Permite revisar e personalizar o texto integral do modelo antes de gerar o PDF
                    </span>
                  </div>
                </div>

                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {modoEdicaoClausulas ? 'Ocultar Edição' : 'Revisar / Personalizar'}
                </span>
              </button>

              {modoEdicaoClausulas && (
                <div className="p-4 bg-white dark:bg-slate-900 space-y-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Você pode usar as tags dinâmicas: <strong>{'{CARGO}'}</strong>, <strong>{'{SALARIO}'}</strong>, <strong>{'{SALARIO_EXTENSO}'}</strong> e <strong>{'{DIAS_EXPERIENCIA}'}</strong>.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRestaurarPadrao}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-semibold border border-slate-200 dark:border-slate-700"
                        title="Restaurar texto oficial original do anexo"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurar Padrão Oficial
                      </button>

                      <button
                        onClick={handleSalvarClausulas}
                        className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold shadow-xs transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Salvar Cláusulas
                      </button>
                    </div>
                  </div>

                  {salvoSucesso && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Cláusulas salvas com sucesso para o empregado {empregado.nomeCompleto}!
                    </div>
                  )}

                  <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                    {clausulas.map(item => (
                      <div
                        key={item.numero}
                        className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] font-mono">
                              Cláusula {item.numero}
                            </span>
                            {item.titulo}
                          </span>
                        </div>

                        <textarea
                          rows={3}
                          value={item.texto}
                          onChange={e => handleAlterarTextoClausula(item.numero, e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Emissor: <strong>Departamento Fácil</strong> · Padrão Ministério do Trabalho / eSocial
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
