import React, { useState } from 'react';
import { Empregado, Empresa, FolhaEmpregado, PeriodoFerias, ContratoDocumento } from '../types/dp';
import { formatarMoeda, formatarData, formatarCPF } from '../utils/formatters';
import {
  gerarContrachequePDF,
  gerarContratoTrabalhoPDF,
  gerarContratoExperienciaPDF,
  gerarRegistroEmpregadoPDF,
  gerarDocumentosAdmissaoConjuntoPDF,
} from '../utils/pdfGenerator';
import { Download, Calendar, FileText, CheckCircle2, User, Clock, ArrowLeft, Send, Sparkles, FileCheck2 } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  empregado: Empregado;
  empresa: Empresa;
  folhas: FolhaEmpregado[];
  periodoFerias?: PeriodoFerias;
  documentos: ContratoDocumento[];
  onVoltarParaAdmin?: () => void;
}

export const EmployeePortalView: React.FC<Props> = ({
  empregado,
  empresa,
  folhas,
  periodoFerias,
  documentos,
  onVoltarParaAdmin,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'HOLERITES' | 'FERIAS' | 'DOCUMENTOS' | 'SOLICITACOES'>('HOLERITES');
  const [solicitandoFerias, setSolicitandoFerias] = useState(false);
  const [dataInicioFerias, setDataInicioFerias] = useState('2026-07-01');
  const [diasGozo, setDiasGozo] = useState(30);
  const [abono, setAbono] = useState(false);
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState(false);

  // Filtra apenas as folhas deste empregado específico (total isolamento de dados!)
  const minhasFolhas = folhas.filter(f => f.empregadoId === empregado.id);
  const ultimaFolha = minhasFolhas[0];

  const [mensagemFeedback, setMensagemFeedback] = useState<string | null>(null);

  const handleSolicitarFerias = async () => {
    try {
      setEnviandoSolicitacao(true);
      setMensagemFeedback(null);
      await api.programarFerias({
        empregadoId: empregado.id,
        dataInicio: dataInicioFerias,
        diasGozo,
        abonoPecuniario: abono,
        adiantamento13: false,
      });
      setMensagemFeedback('Solicitação de férias enviada ao Departamento Pessoal para aprovação com sucesso!');
      setSolicitandoFerias(false);
      setTimeout(() => setMensagemFeedback(null), 5000);
    } catch (err: any) {
      setMensagemFeedback(err.message || 'Erro ao enviar solicitação');
    } finally {
      setEnviandoSolicitacao(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-['Inter','Plus_Jakarta_Sans',sans-serif] transition-colors">
      {/* Top Banner Mobile & Desktop */}
      <header className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              {empregado.nomeCompleto.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                Portal do Colaborador · {empresa.nomeFantasia || empresa.razaoSocial}
              </span>
              <h1 className="text-sm font-bold text-white truncate max-w-[220px] sm:max-w-md">
                {empregado.nomeCompleto}
              </h1>
            </div>
          </div>

          {onVoltarParaAdmin && (
            <button
              onClick={onVoltarParaAdmin}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voltar ao DP</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {mensagemFeedback && (
          <div className="p-3.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {mensagemFeedback}
          </div>
        )}

        {/* Card do Perfil Resumido */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-md">
                Matrícula: {empregado.matricula}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">CPF: {formatarCPF(empregado.cpf)}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{empregado.cargo}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {empregado.departamento} · Admissão: {formatarData(empregado.dataAdmissao)} · Vínculo {empregado.vinculo}
            </p>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Salário Base Contratual</span>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100">{formatarMoeda(empregado.salarioBase)}</span>
          </div>
        </div>

        {/* Tabs de Navegação */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-1 shadow-2xs gap-1 overflow-x-auto">
          <button
            onClick={() => setAbaAtiva('HOLERITES')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap text-center ${
              abaAtiva === 'HOLERITES' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Contracheques (Holerites)
          </button>
          <button
            onClick={() => setAbaAtiva('FERIAS')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap text-center ${
              abaAtiva === 'FERIAS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Minhas Férias
          </button>
          <button
            onClick={() => setAbaAtiva('DOCUMENTOS')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap text-center ${
              abaAtiva === 'DOCUMENTOS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Contratos e Recibos
          </button>
        </div>

        {/* Aba: Holerites */}
        {abaAtiva === 'HOLERITES' && (
          <div className="space-y-4">
            {/* Destaque do Último Contracheque */}
            {ultimaFolha ? (
              <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Último Fechamento
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      Competência {ultimaFolha.competencia}
                    </h3>
                  </div>
                  <button
                    onClick={() => gerarContrachequePDF(ultimaFolha, empresa, empregado)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PDF
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Proventos</span>
                    <div className="text-xs font-bold text-emerald-700 mt-0.5">{formatarMoeda(ultimaFolha.totalProventos)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Descontos</span>
                    <div className="text-xs font-bold text-rose-700 mt-0.5">{formatarMoeda(ultimaFolha.totalDescontos)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Líquido Creditado</span>
                    <div className="text-sm font-black text-blue-700 mt-0.5">{formatarMoeda(ultimaFolha.valorLiquido)}</div>
                  </div>
                </div>

                {/* Discriminação resumida das verbas */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-800">Verbas e Descontos do Mês:</span>
                  <div className="divide-y divide-slate-100 text-xs">
                    {ultimaFolha.itens.map((it, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-800">{it.descricao}</span>
                          <span className="text-[11px] text-slate-500 ml-2 font-mono">Ref: {String(it.referencia)}</span>
                        </div>
                        <span className={`font-mono font-bold ${it.tipo === 'PROVENTO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {it.tipo === 'PROVENTO' ? '+' : '-'} {formatarMoeda(it.provento || it.desconto)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                Nenhum contracheque emitido até o momento.
              </div>
            )}

            {/* Histórico Anterior */}
            {minhasFolhas.length > 1 && (
              <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Histórico de Holerites</h4>
                <div className="divide-y divide-slate-100 text-xs">
                  {minhasFolhas.slice(1).map(f => (
                    <div key={f.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 font-mono">Competência {f.competencia}</div>
                        <span className="text-[11px] text-slate-500">Líquido: {formatarMoeda(f.valorLiquido)}</span>
                      </div>
                      <button
                        onClick={() => gerarContrachequePDF(f, empresa, empregado)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aba: Férias */}
        {abaAtiva === 'FERIAS' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Direito a Férias
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Saldo e Períodos Aquisitivos</h3>
                </div>
                {!solicitandoFerias && (
                  <button
                    onClick={() => setSolicitandoFerias(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
                  >
                    Solicitar Férias
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500">Saldo de Dias</span>
                  <div className="text-xl font-bold text-emerald-700 mt-0.5">
                    {periodoFerias?.saldoDiasRestantes || 30} dias
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Período Aquisitivo</span>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {formatarData(periodoFerias?.periodoAquisitivoInicio || '01/05/2024')} a {formatarData(periodoFerias?.periodoAquisitivoFim || '30/04/2025')}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Limite para Concessão</span>
                  <div className="text-xs font-bold text-rose-700 mt-0.5">
                    {formatarData(periodoFerias?.periodoConcessivoFim || '30/04/2026')}
                  </div>
                </div>
              </div>

              {/* Formulário de Solicitação */}
              {solicitandoFerias && (
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Nova Solicitação de Férias
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Data Início Desejada</label>
                      <input
                        type="date"
                        value={dataInicioFerias}
                        onChange={e => setDataInicioFerias(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Dias de Gozo</label>
                      <select
                        value={diasGozo}
                        onChange={e => setDiasGozo(Number(e.target.value))}
                        className="w-full text-xs border border-slate-300 rounded p-2 bg-white"
                      >
                        <option value={30}>30 Dias</option>
                        <option value={20}>20 Dias</option>
                        <option value={15}>15 Dias</option>
                        <option value={14}>14 Dias</option>
                        <option value={10}>10 Dias</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={abono}
                          onChange={e => setAbono(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        Vender 1/3 (Abono de 10 dias)
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setSolicitandoFerias(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSolicitarFerias}
                      disabled={enviandoSolicitacao}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                    >
                      {enviandoSolicitacao ? 'Enviando...' : 'Confirmar Solicitação'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba: Documentos e Contratos */}
        {abaAtiva === 'DOCUMENTOS' && (
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Repositório Pessoal
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Contrato de Trabalho e Termos</h3>
              </div>
              <button
                onClick={() => gerarDocumentosAdmissaoConjuntoPDF(empresa, empregado)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
              >
                <Download className="w-4 h-4" />
                Baixar Contrato + Registro (PDF)
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">
                    Contrato de Experiência de Trabalho
                  </div>
                  <span className="text-[11px] text-slate-500">Formalizado na admissão em {formatarData(empregado.dataAdmissao)} · 10 Cláusulas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[11px]">
                    Assinado
                  </span>
                  <button
                    onClick={() => gerarContratoExperienciaPDF(empresa, empregado)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    title="Baixar Contrato de Experiência avulso"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">
                    Ficha de Registro de Empregado
                  </div>
                  <span className="text-[11px] text-slate-500">Ficha cadastral oficial com qualificação civil, documentos e jornada</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[11px]">
                    Oficial
                  </span>
                  <button
                    onClick={() => gerarRegistroEmpregadoPDF(empresa, empregado)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    title="Baixar Registro de Empregado avulso"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
