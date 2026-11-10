import React, { useState, useEffect } from 'react';
import { Empregado, Empresa, RescisaoSimulada, MotivoRescisao } from '../types/dp';
import { api } from '../services/api';
import { formatarMoeda, formatarData, formatarValorDecimal } from '../utils/formatters';
import { gerarTRCTeHomologacaoPDF, gerarTRCTPDF } from '../utils/pdfGenerator';
import { PDFPreviewModal } from './PDFPreviewModal';
import { X, Calculator, FileText, CheckCircle2, AlertTriangle, Download, ArrowRight, ShieldAlert, Printer } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empregado: Empregado | null;
  empresa: Empresa;
  onRescisaoConfirmada: () => void;
}

export const TerminationSimulatorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empregado,
  empresa,
  onRescisaoConfirmada,
}) => {
  const [motivo, setMotivo] = useState<MotivoRescisao>('SEM_JUSTA_CAUSA_EMPREGADOR');
  const [dataDesligamento, setDataDesligamento] = useState(new Date().toISOString().split('T')[0]);
  const [tipoAviso, setTipoAviso] = useState<'INDENIZADO' | 'TRABALHADO' | 'DISPENSADO'>('INDENIZADO');
  const [saldoFGTSComprovado, setSaldoFGTSComprovado] = useState<number>(0);
  const [adiantamentoJaPago, setAdiantamentoJaPago] = useState<number>(0);

  // Campos para o Termo de Homologação
  const [ressalvas, setRessalvas] = useState<string>('');
  const [isMinuta, setIsMinuta] = useState<boolean>(true);

  // Estado para o modal de pré-visualização do PDF
  const [previewModalAberto, setPreviewModalAberto] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewTitulo, setPreviewTitulo] = useState<string>('');

  const [simulacao, setSimulacao] = useState<RescisaoSimulada | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (isOpen && empregado) {
      // Simulação inicial automática
      executarSimulacao();
    }
  }, [isOpen, empregado, motivo, dataDesligamento, tipoAviso, saldoFGTSComprovado, adiantamentoJaPago]);

  if (!isOpen || !empregado) return null;

  const executarSimulacao = async () => {
    try {
      setCarregando(true);
      const res = await api.simularRescisao({
        empregadoId: empregado.id,
        motivo,
        dataDesligamento,
        tipoAviso,
        saldoFGTSComprovado,
        adiantamentoPago: adiantamentoJaPago,
      });
      setSimulacao(res);
    } catch (err) {
      console.error('Erro ao simular rescisão:', err);
    } finally {
      setCarregando(false);
    }
  };

  const obterSimulacaoAtualizada = (): RescisaoSimulada | null => {
    if (!simulacao) return null;
    return {
      ...simulacao,
      ressalvas: ressalvas.trim(),
      isMinuta,
    };
  };

  const handleGerarTRCTeHomologacao = (abrirPreview: boolean = true) => {
    const simAtual = obterSimulacaoAtualizada();
    if (!simAtual) return;

    if (abrirPreview) {
      const url = gerarTRCTeHomologacaoPDF(simAtual, empresa, empregado, { returnBlobUrl: true }) as string;
      setPreviewBlobUrl(url);
      setPreviewTitulo(`TRCT e Homologação de Rescisão - ${empregado.nomeCompleto}`);
      setPreviewModalAberto(true);
    } else {
      gerarTRCTeHomologacaoPDF(simAtual, empresa, empregado);
    }
  };

  const handleConfirmarDesligamento = async () => {
    const simAtual = obterSimulacaoAtualizada();
    if (!simAtual) return;
    const confirmou = window.confirm(
      `Confirma a homologação da rescisão de ${empregado.nomeCompleto}?\n\nApós confirmar, o status do colaborador será atualizado para "Desligado" e os eventos serão integrados no eSocial (S-2299).`
    );
    if (!confirmou) return;

    try {
      setConfirmando(true);
      simAtual.status = 'CONFIRMADA';
      simAtual.isMinuta = false;
      await api.confirmarRescisao(simAtual);
      setIsMinuta(false);
      onRescisaoConfirmada();
      onClose();
    } catch (err: any) {
      console.error('Erro ao confirmar rescisão:', err);
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-950/60 px-2 py-0.5 rounded">
                  Simulador de Desligamento
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Prévia de TRCT & FGTS</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {empregado.nomeCompleto} (Matrícula {empregado.matricula})
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
          {/* Parâmetros da Simulação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Motivo do Desligamento</label>
              <select
                value={motivo}
                onChange={e => setMotivo(e.target.value as MotivoRescisao)}
                className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="SEM_JUSTA_CAUSA_EMPREGADOR">Dispensa Sem Justa Causa pelo Empregador</option>
                <option value="PEDIDO_DEMISSAO_EMPREGADO">Pedido de Demissão pelo Empregado</option>
                <option value="ACORDO_CONSENSUAL_484A">Acordo Mútuo / Consensual (Art. 484-A CLT)</option>
                <option value="TERMINO_CONTRATO_EXPERIENCIA">Término Normal de Contrato de Experiência</option>
                <option value="RESCISAO_ANTECIPADA_EXPERIENCIA">Rescisão Antecipada de Experiência</option>
                <option value="COM_JUSTA_CAUSA_EMPREGADOR">Demissão com Justa Causa (Falta Grave)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data do Desligamento</label>
              <input
                type="date"
                value={dataDesligamento}
                onChange={e => setDataDesligamento(e.target.value)}
                className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Modalidade de Aviso Prévio</label>
              <select
                value={tipoAviso}
                onChange={e => setTipoAviso(e.target.value as any)}
                className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="INDENIZADO">Aviso Prévio Indenizado (Lei 12.506)</option>
                <option value="TRABALHADO">Aviso Prévio Trabalhado (Redução 2h ou 7 dias)</option>
                <option value="DISPENSADO">Dispensado do Cumprimento</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Saldo FGTS Comprovado no Extrato (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00 (Deixe 0 para estimar)"
                value={saldoFGTSComprovado || ''}
                onChange={e => setSaldoFGTSComprovado(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              />
              <span className="text-[10px] text-slate-500">Base para cálculo da multa rescisória (40% ou 20%)</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Adiantamento Já Pago no Mês (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={adiantamentoJaPago || ''}
                onChange={e => setAdiantamentoJaPago(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              />
              <span className="text-[10px] text-slate-500">Deduz na rescisão para evitar pagamento em duplicidade</span>
            </div>

            <div className="flex flex-col justify-end">
              <span className="text-xs text-slate-600 font-medium">Prazo Legal de Pagamento (Art. 477):</span>
              <span className="text-xs font-bold text-blue-700 mt-1">
                Até {formatarData(simulacao?.dataLimitePagamento)} (10 dias corridos)
              </span>
            </div>
          </div>

          {/* Resultado das Verbas Calculadas */}
          {simulacao && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase">Total Bruto Rescisório</span>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    {formatarMoeda(simulacao.totalBruto)}
                  </div>
                  <span className="text-[10px] text-emerald-600">Soma de todas as verbas rescisórias</span>
                </div>

                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
                  <span className="text-[11px] font-bold text-rose-800 uppercase">Total de Descontos</span>
                  <div className="text-xl font-black text-rose-700 mt-1">
                    {formatarMoeda(simulacao.totalDescontos)}
                  </div>
                  <span className="text-[10px] text-rose-600">INSS saldo + adiantamento já pago</span>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-800 uppercase">Líquido a Pagar ao Trabalhador</span>
                  <div className="text-xl font-black text-blue-700 mt-1">
                    {formatarMoeda(simulacao.liquidoRescisao)}
                  </div>
                  <span className="text-[10px] text-blue-600">Valor líquido no TRCT</span>
                </div>
              </div>

              {/* Tabela de Verbas Rescisórias */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2 px-3">Parcela Rescisória</th>
                      <th className="py-2 px-3">Referência / Regra</th>
                      <th className="py-2 px-3">Base / Fundamento Legal</th>
                      <th className="py-2 px-3 text-right">Proventos (+)</th>
                      <th className="py-2 px-3 text-right">Descontos (-)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3 font-medium">Saldo de Salário</td>
                      <td className="py-2 px-3 font-mono">{simulacao.saldoSalarioDias} dias trabalhados</td>
                      <td className="py-2 px-3 text-slate-500">Art. 4º da CLT</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatarMoeda(simulacao.valorSaldoSalario)}</td>
                      <td className="py-2 px-3 text-right">-</td>
                    </tr>
                    {simulacao.valorAvisoPrevio > 0 && (
                      <tr>
                        <td className="py-2 px-3 font-medium">Aviso Prévio Indenizado</td>
                        <td className="py-2 px-3 font-mono">{simulacao.diasAvisoIndenizado} dias (30d + 3d/ano)</td>
                        <td className="py-2 px-3 text-slate-500">Lei Federal nº 12.506/2011</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatarMoeda(simulacao.valorAvisoPrevio)}</td>
                        <td className="py-2 px-3 text-right">-</td>
                      </tr>
                    )}
                    {simulacao.decimoTerceiroProporcional > 0 && (
                      <tr>
                        <td className="py-2 px-3 font-medium">13º Salário Proporcional</td>
                        <td className="py-2 px-3 font-mono">Meses trabalhados no ano corrente</td>
                        <td className="py-2 px-3 text-slate-500">Lei nº 4.090/1962</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatarMoeda(simulacao.decimoTerceiroProporcional)}</td>
                        <td className="py-2 px-3 text-right">-</td>
                      </tr>
                    )}
                    {simulacao.decimoTerceiroIndenizado > 0 && (
                      <tr>
                        <td className="py-2 px-3 font-medium">13º Salário sobre Aviso Prévio</td>
                        <td className="py-2 px-3 font-mono">Projeção do aviso indenizado</td>
                        <td className="py-2 px-3 text-slate-500">Art. 487 § 1º CLT</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatarMoeda(simulacao.decimoTerceiroIndenizado)}</td>
                        <td className="py-2 px-3 text-right">-</td>
                      </tr>
                    )}
                    {simulacao.feriasProporcionaisComTerco > 0 && (
                      <tr>
                        <td className="py-2 px-3 font-medium">Férias Proporcionais + 1/3 Constitucional</td>
                        <td className="py-2 px-3 font-mono">Período aquisitivo em curso</td>
                        <td className="py-2 px-3 text-slate-500">Art. 146 CLT e Art. 7º, XVII CF/88</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatarMoeda(simulacao.feriasProporcionaisComTerco)}</td>
                        <td className="py-2 px-3 text-right">-</td>
                      </tr>
                    )}
                    {simulacao.feriasVencidasComTerco > 0 && (
                      <tr>
                        <td className="py-2 px-3 font-medium">Férias Vencidas + 1/3 Constitucional</td>
                        <td className="py-2 px-3 font-mono">Período aquisitivo completo</td>
                        <td className="py-2 px-3 text-slate-500">Súmula 171 do TST</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatarMoeda(simulacao.feriasVencidasComTerco)}</td>
                        <td className="py-2 px-3 text-right">-</td>
                      </tr>
                    )}
                    {/* Descontos */}
                    <tr>
                      <td className="py-2 px-3 font-medium">INSS sobre Saldo de Salário</td>
                      <td className="py-2 px-3 font-mono">Tabela Progressiva</td>
                      <td className="py-2 px-3 text-slate-500">Emenda Constitucional 103/2019</td>
                      <td className="py-2 px-3 text-right">-</td>
                      <td className="py-2 px-3 text-right font-semibold text-rose-700">{formatarMoeda(simulacao.descontos.inssSaldoSalario)}</td>
                    </tr>
                    {simulacao.descontos.adiantamentoJaPago > 0 && (
                      <tr className="bg-amber-50/40">
                        <td className="py-2 px-3 font-medium">Adiantamento Salarial já creditado no mês</td>
                        <td className="py-2 px-3 font-mono">Conciliação folha</td>
                        <td className="py-2 px-3 text-slate-500">Dedução para evitar pagamento duplo</td>
                        <td className="py-2 px-3 text-right">-</td>
                        <td className="py-2 px-3 text-right font-semibold text-rose-700">{formatarMoeda(simulacao.descontos.adiantamentoJaPago)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Demonstrativo do FGTS por Competência e Multa */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Demonstrativo do FGTS & Multa Rescisória (Guia GRRF / FGTS Digital)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Conferência de depósitos obrigatórios por competência
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Multa Rescisória:</span>
                    <div className="text-base font-bold text-rose-700">
                      {formatarMoeda(simulacao.multaFGTS)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80">
                  {simulacao.demonstrativoFGTS.competenciasCalculadas.slice(0, 8).map((comp, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px]">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-semibold text-slate-700">{comp.competencia}</span>
                        {comp.depositado ? (
                          <span className="text-emerald-700 font-bold text-[10px]">Comprovado</span>
                        ) : (
                          <span className="text-amber-700 font-bold text-[10px]">Pendente</span>
                        )}
                      </div>
                      <div className="text-slate-600 mt-0.5">{formatarMoeda(comp.valorDevido)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Termo de Homologação & Configuração dos Termos (A4 Retrato) */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-200/80 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText className="w-4 h-4 text-indigo-700" />
                      Termo de Rescisão (TRCT) e Termo de Homologação (Modelo Oficial A4)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Geração conjunta em 2 páginas A4 retrato conforme modelo oficial do Ministério do Trabalho
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 self-start sm:self-auto">
                    <input
                      type="checkbox"
                      checked={isMinuta}
                      onChange={e => setIsMinuta(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Emitir como Minuta (Pagamento Pendente)</span>
                  </label>
                </div>

                {/* Campo 155 - Ressalvas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Campo 155 – Ressalvas (Página 2 - Termo de Homologação)
                  </label>
                  <textarea
                    rows={2}
                    value={ressalvas}
                    onChange={e => setRessalvas(e.target.value)}
                    placeholder="Espaço para discriminar eventuais ressalvas levantadas no ato da rescisão contratual. Se vazio, o campo permanecerá limpo no documento oficial."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    O texto preenchido acima aparecerá exatamente no quadro do Campo 155 na 2ª página do PDF. Se estiver vazio, não imprime nenhum marcador.
                  </span>
                </div>

                {/* Validação de Conciliação e Balanço Líquido */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-200/60 bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-xs">
                    <span className="text-slate-500">Conferência dos Totais: </span>
                    <span className="font-semibold text-slate-800">Total Bruto ({formatarMoeda(simulacao.totalBruto)})</span>
                    <span className="text-slate-400"> - </span>
                    <span className="font-semibold text-rose-700">Deduções ({formatarMoeda(simulacao.totalDescontos)})</span>
                    <span className="text-slate-400"> = </span>
                    <span className="font-bold text-indigo-700">Líquido ({formatarMoeda(simulacao.liquidoRescisao)})</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Total Líquido validado até o centavo
                  </span>
                </div>
              </div>

              {/* Pendências Documentais para Conclusão */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/70 rounded-xl space-y-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  Checklist Obrigatório de Pendências para Desligamento:
                </span>
                <ul className="text-xs text-amber-800 space-y-1 pl-5 list-disc">
                  {simulacao.pendenciasDocumentais.map((pend, idx) => (
                    <li key={idx}>{pend}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGerarTRCTeHomologacao(false)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
              title="Baixar arquivo PDF diretamente no computador"
            >
              <Download className="w-4 h-4" />
              Baixar PDF
            </button>
            <button
              onClick={() => handleGerarTRCTeHomologacao(true)}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <FileText className="w-4 h-4" />
              Gerar TRCT e Homologação
            </button>
            <button
              onClick={handleConfirmarDesligamento}
              disabled={confirmando}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirmando ? 'Homologando...' : 'Confirmar e Homologar'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Pré-visualização do PDF do TRCT e Homologação */}
      <PDFPreviewModal
        isOpen={previewModalAberto}
        onClose={() => setPreviewModalAberto(false)}
        pdfUrl={previewBlobUrl}
        titulo={previewTitulo}
        subtitulo="Termo de Rescisão (Pág. 1) e Termo de Homologação (Pág. 2) em A4 Retrato Oficial"
        nomeArquivoDownload={`TRCT_Homologacao_${empregado.matricula}_${empregado.nomeCompleto.replace(/\s+/g, '_')}.pdf`}
        onBaixarArquivo={() => handleGerarTRCTeHomologacao(false)}
      />
    </div>
  );
};
