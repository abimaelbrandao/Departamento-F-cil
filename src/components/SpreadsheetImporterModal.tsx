import React, { useState } from 'react';
import { api } from '../services/api';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Rubrica } from '../types/dp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  competencia: string;
  rubricasDisponiveis?: Rubrica[];
  onImportadoComSucesso: () => void;
}

export const SpreadsheetImporterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  competencia,
  rubricasDisponiveis = [],
  onImportadoComSucesso,
}) => {
  const [nomeArquivo, setNomeArquivo] = useState('folha_ponto_variaveis_maio.csv');
  const [rubricaPadrao, setRubricaPadrao] = useState('0101');
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [resultadoSucesso, setResultadoSucesso] = useState<any>(null);

  // Linhas de prévia editáveis simulando uma planilha de ponto / comissões
  const [linhasPrevia, setLinhasPrevia] = useState([
    { matricula: '00101', cpf: '388.291.048-12', nome: 'Lucas Gabriel', rubricaCodigo: '0101', horas: 6, valor: 0, unidade: 'HORAS', statusValido: true },
    { matricula: '00103', cpf: '298.711.458-02', nome: 'Carlos Eduardo', rubricaCodigo: '0101', horas: 4, valor: 0, unidade: 'HORAS', statusValido: true },
    { matricula: '00102', cpf: '412.891.238-90', nome: 'Mariana Ribeiro', rubricaCodigo: '0105', horas: 0, valor: 350.0, unidade: 'VALOR', statusValido: true },
    { matricula: '99999', cpf: '000.000.000-00', nome: 'Funcionário Inexistente (Exemplo de Erro)', rubricaCodigo: '0101', horas: 2, valor: 0, unidade: 'HORAS', statusValido: false, erro: 'Matrícula não localizada na empresa' },
  ]);

  if (!isOpen) return null;

  const handleImportar = async () => {
    try {
      setCarregando(true);
      setErroGeral(null);

      // Filtra apenas as linhas válidas para envio
      const linhasParaProcessar = linhasPrevia.filter(l => l.statusValido);

      const res = await api.importarPlanilha({
        nomeArquivo,
        competencia,
        linhas: linhasParaProcessar,
      });

      setResultadoSucesso(res);
      onImportadoComSucesso();
    } catch (err: any) {
      setErroGeral(err.message || 'Erro ao processar importação da planilha.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarExemploComissoes = () => {
    setNomeArquivo('comissoes_vendas_maio_2026.csv');
    setLinhasPrevia([
      { matricula: '00101', cpf: '388.291.048-12', nome: 'Lucas Gabriel', rubricaCodigo: '0105', horas: 0, valor: 1200.0, unidade: 'VALOR', statusValido: true },
      { matricula: '00102', cpf: '412.891.238-90', nome: 'Mariana Ribeiro', rubricaCodigo: '0105', horas: 0, valor: 500.0, unidade: 'VALOR', statusValido: true },
    ]);
    setResultadoSucesso(null);
    setErroGeral(null);
  };

  const simularArquivoDuplicado = () => {
    setNomeArquivo('import_folha_ponto_abril_2026.csv');
    setResultadoSucesso(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded">
                  Importador Inteligente
                </span>
                <span className="text-xs text-slate-500 font-medium">Competência {competencia}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                Importação de Planilhas de Ponto, Horas Extras e Benefícios
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Seletor de Arquivo e Mapeamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
              <UploadCloud className="w-8 h-8 text-emerald-600 mb-2" />
              <p className="text-xs font-bold text-slate-800">Arquivo Carregado:</p>
              <p className="text-xs font-mono text-emerald-700 font-semibold mt-0.5">{nomeArquivo}</p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={carregarExemploComissoes}
                  className="text-[11px] px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900"
                >
                  Planilha de Comissões
                </button>
                <button
                  type="button"
                  onClick={simularArquivoDuplicado}
                  className="text-[11px] px-2 py-1 bg-white border border-slate-200 rounded text-amber-700 hover:text-amber-900"
                >
                  Testar Duplicidade
                </button>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-800">Associação Automática de Colunas:</span>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Coluna Identificadora:</span>
                  <span className="font-mono font-semibold text-slate-800">Matrícula ou CPF</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rubrica Padrão de Ponto:</span>
                  <select
                    value={rubricaPadrao}
                    onChange={e => setRubricaPadrao(e.target.value)}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                  >
                    {rubricasDisponiveis.map(r => (
                      <option key={r.codigo} value={r.codigo}>
                        {r.codigo} - {r.descricao}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span>Trava de Reimportação:</span>
                  <span className="text-emerald-700 font-bold">Ativa (Anti-Duplicidade)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mensagens de Erro ou Sucesso */}
          {erroGeral && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{erroGeral}</p>
                <p className="text-rose-700 mt-1">
                  O sistema bloqueou a importação para proteger a integridade dos cálculos da folha de pagamento.
                </p>
              </div>
            </div>
          )}

          {resultadoSucesso && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Importação concluída com sucesso!</p>
                <p className="text-emerald-700 mt-0.5">
                  {resultadoSucesso.importadosCount} lançamento(s) integrado(s) na folha da competência {competencia}.
                </p>
              </div>
            </div>
          )}

          {/* Prévia com Indicação de Erros Linha a Linha */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Prévia da Planilha e Análise de Consistência ({linhasPrevia.length} linhas)
              </span>
              <span className="text-[11px] text-slate-500">Linhas com erro são sinalizadas antes de importar</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Linha</th>
                    <th className="py-2.5 px-3">Matrícula</th>
                    <th className="py-2.5 px-3">Nome / CPF</th>
                    <th className="py-2.5 px-3">Rubrica</th>
                    <th className="py-2.5 px-3">Qtd / Horas</th>
                    <th className="py-2.5 px-3">Valor (R$)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linhasPrevia.map((l, idx) => (
                    <tr
                      key={idx}
                      className={l.statusValido ? 'hover:bg-slate-50/50' : 'bg-rose-50/60 text-rose-950 font-medium'}
                    >
                      <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold">{l.matricula}</td>
                      <td className="py-2 px-3">{l.nome}</td>
                      <td className="py-2 px-3 font-mono">{l.rubricaCodigo}</td>
                      <td className="py-2 px-3">{l.horas > 0 ? `${l.horas}h` : '-'}</td>
                      <td className="py-2 px-3">{l.valor > 0 ? `R$ ${l.valor.toFixed(2)}` : '-'}</td>
                      <td className="py-2 px-3">
                        {l.statusValido ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Válido
                          </span>
                        ) : (
                          <span className="text-rose-700 font-bold flex items-center gap-1" title={l.erro}>
                            <AlertCircle className="w-3.5 h-3.5" /> {l.erro || 'Erro'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleImportar}
            disabled={carregando}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {carregando ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processando Lançamentos...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Validar e Integrar na Folha
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
