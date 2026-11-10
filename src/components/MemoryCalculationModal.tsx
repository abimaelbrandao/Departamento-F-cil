import React, { useState } from 'react';
import { ItemCalculadoFolha } from '../types/dp';
import { formatarMoeda } from '../utils/formatters';
import { X, Sparkles, BookOpen, Calculator, Scale, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  item: ItemCalculadoFolha | null;
  salarioBase: number;
  nomeColaborador: string;
  onClose: () => void;
}

export const MemoryCalculationModal: React.FC<Props> = ({ item, salarioBase, nomeColaborador, onClose }) => {
  const [explicacaoIA, setExplicacaoIA] = useState<string | null>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);

  if (!item) return null;

  const mem = item.memoriaCalculo;

  const solicitarExplicacaoIA = async () => {
    try {
      setCarregandoIA(true);
      const res = await api.consultarIA(
        `Explique detalhadamente como a verba "${item.descricao}" foi calculada para o colaborador "${nomeColaborador}" com base nos dados: ${JSON.stringify(mem)}. Detalhe a razão legal e se há impacto em FGTS e férias.`,
        { item, salarioBase }
      );
      setExplicacaoIA(res.resposta);
    } catch {
      setExplicacaoIA('Não foi possível carregar a explicação da IA no momento.');
    } finally {
      setCarregandoIA(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                  Rubrica {item.rubricaCodigo}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  item.tipo === 'PROVENTO' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                }`}>
                  {item.tipo === 'PROVENTO' ? 'Provento (Acréscimo)' : 'Desconto'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{item.descricao}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Valor Resultante */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resultado da Verba</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">Colaborador: <span className="font-semibold text-slate-900 dark:text-slate-100">{nomeColaborador}</span></p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-black ${item.tipo === 'PROVENTO' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {item.tipo === 'PROVENTO' ? '+' : '-'} {formatarMoeda(item.provento || item.desconto)}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Ref: {String(item.referencia)}</p>
            </div>
          </div>

          {/* Fórmula e Regra */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Scale className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Fórmula Aplicada
            </div>
            <div className="p-3.5 bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-xl font-mono text-sm leading-relaxed border border-slate-800">
              {mem?.formula || 'Fórmula padrão conforme convenção ou legislação'}
            </div>
          </div>

          {/* Passo a Passo Aritmético */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Passo a Passo da Memória de Cálculo
            </div>
            <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 p-4 space-y-2.5">
              {mem?.passoAPasso?.map((passo, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[11px] mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{passo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fundamento Legal e Origem da Regra */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Fundamento Legal e Precedentes:</span>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300 font-medium">
                {mem?.fundamentoLegal || 'Consolidação das Leis do Trabalho (CLT) e Normas Regulamentadoras da RFB/MTE.'}
              </p>
            </div>
          </div>

          {/* IA Assistente de Explicação */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {!explicacaoIA && (
              <button
                onClick={solicitarExplicacaoIA}
                disabled={carregandoIA}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {carregandoIA ? 'Consultando Legislação Trabalhista com IA...' : 'Pedir Explicação Jurídica Completa com IA'}
              </button>
            )}

            {explicacaoIA && (
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Parecer do Consultor de Departamento Pessoal
                </div>
                <div className="text-xs text-indigo-950 dark:text-indigo-200 whitespace-pre-line leading-relaxed font-normal">
                  {explicacaoIA}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Fechar Memória
          </button>
        </div>
      </div>
    </div>
  );
};
