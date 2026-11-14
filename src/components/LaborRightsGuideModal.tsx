import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  Search,
  Percent,
  ArrowUpCircle,
  ArrowDownCircle,
  ShieldCheck,
  Palmtree,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { RUBRICAS_SISTEMA } from '../data/initialData';
import {
  SALARIO_MINIMO_NACIONAL,
  TABELA_INSS_VIGENTE,
  TETO_INSS,
  TETO_DESCONTO_INSS,
  ALIQUOTA_INSS_CONTRIBUINTE_INDIVIDUAL,
  TETO_INSS_CONTRIBUINTE_INDIVIDUAL,
  TABELA_IRRF_VIGENTE,
  DEDUCAO_IRRF_POR_DEPENDENTE,
  DESCONTO_SIMPLIFICADO_IRRF,
  REDUTOR_IRRF_LEI_15270,
  LIMITE_SALARIO_FAMILIA,
  VALOR_COTA_SALARIO_FAMILIA,
  PERCENTUAIS_TRABALHISTAS,
  TABELA_REDUCAO_FERIAS_FALTAS,
} from '../services/calculosTrabalhistas';
import { formatarMoeda } from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type AbaGuia = 'PROVENTOS' | 'DESCONTOS' | 'IMPOSTOS' | 'FGTS_FERIAS_RESCISAO';

const BadgeIncidencia: React.FC<{ label: string; ativo?: boolean }> = ({ label, ativo }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
      ativo
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60'
        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200/70 dark:border-slate-700/60'
    }`}
  >
    {ativo ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
    {label}
  </span>
);

export const LaborRightsGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [aba, setAba] = useState<AbaGuia>('PROVENTOS');
  const [busca, setBusca] = useState('');

  const proventos = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return RUBRICAS_SISTEMA.filter(
      r =>
        r.tipo === 'PROVENTO' &&
        (!q ||
          r.codigo.toLowerCase().includes(q) ||
          r.descricao.toLowerCase().includes(q) ||
          r.baseCalculoLegal.toLowerCase().includes(q) ||
          (r.formulaResumo || '').toLowerCase().includes(q))
    );
  }, [busca]);

  const descontos = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return RUBRICAS_SISTEMA.filter(
      r =>
        r.tipo === 'DESCONTO' &&
        (!q ||
          r.codigo.toLowerCase().includes(q) ||
          r.descricao.toLowerCase().includes(q) ||
          r.baseCalculoLegal.toLowerCase().includes(q) ||
          (r.formulaResumo || '').toLowerCase().includes(q))
    );
  }, [busca]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Direitos Trabalhistas &amp; Alíquotas Exatas (Vigência 2026)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Parâmetros oficiais CLT, Portaria MPS/MF nº 13/2026 e Lei nº 15.270/2025 aplicados pelo motor de cálculo
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

        {/* Faixa de Resumo de Referência 2026 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Salário Mínimo 2026</span>
            <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
              {formatarMoeda(SALARIO_MINIMO_NACIONAL)}
            </span>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Teto INSS / Desconto Máx.</span>
            <span className="font-mono font-black text-blue-700 dark:text-blue-400 text-sm">
              {formatarMoeda(TETO_INSS)} / {formatarMoeda(TETO_DESCONTO_INSS)}
            </span>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Isenção IRRF (Lei 15.270)</span>
            <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
              Até {formatarMoeda(REDUTOR_IRRF_LEI_15270.limiteIsencaoTotal)}
            </span>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Salário-Família 2026</span>
            <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
              {formatarMoeda(VALOR_COTA_SALARIO_FAMILIA)} (até {formatarMoeda(LIMITE_SALARIO_FAMILIA)})
            </span>
          </div>
        </div>

        {/* Navegação de Abas + Busca */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setAba('PROVENTOS')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-colors ${
                aba === 'PROVENTOS'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              Proventos &amp; Adicionais ({proventos.length})
            </button>
            <button
              type="button"
              onClick={() => setAba('DESCONTOS')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-colors ${
                aba === 'DESCONTOS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              Descontos &amp; Limites ({descontos.length})
            </button>
            <button
              type="button"
              onClick={() => setAba('IMPOSTOS')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-colors ${
                aba === 'IMPOSTOS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              INSS &amp; IRRF 2026
            </button>
            <button
              type="button"
              onClick={() => setAba('FGTS_FERIAS_RESCISAO')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-colors ${
                aba === 'FGTS_FERIAS_RESCISAO'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              FGTS, Férias &amp; Rescisão
            </button>
          </div>

          {(aba === 'PROVENTOS' || aba === 'DESCONTOS') && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Filtrar rubrica ou artigo CLT..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {(aba === 'PROVENTOS' || aba === 'DESCONTOS') && (
            <div className="space-y-3">
              {(aba === 'PROVENTOS' ? proventos : descontos).map(r => (
                <div
                  key={r.codigo}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {r.codigo}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {r.descricao}
                      </span>
                      {r.percentualPadrao !== undefined && (
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                          {r.percentualPadrao}%
                        </span>
                      )}
                    </div>
                    {r.formulaResumo && (
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                        {r.formulaResumo}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Base Legal: {r.baseCalculoLegal}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <BadgeIncidencia label="INSS" ativo={r.incideINSS} />
                    <BadgeIncidencia label="IRRF" ativo={r.incideIRRF} />
                    <BadgeIncidencia label="FGTS" ativo={r.incideFGTS} />
                    {r.incideDSR && <BadgeIncidencia label="DSR" ativo />}
                    {r.dedutivelIRRF && <BadgeIncidencia label="DEDUZ IRRF" ativo />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {aba === 'IMPOSTOS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tabela INSS 2026 */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-800/30">
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/50 border-b border-blue-100 dark:border-blue-900/50">
                  <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                    Tabela Progressiva INSS 2026 (Portaria MPS/MF nº 13/2026)
                  </h3>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">Faixa Salarial</th>
                      <th className="py-2.5 px-3 text-right">Alíquota</th>
                      <th className="py-2.5 px-3 text-right">Parcela a Deduzir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {TABELA_INSS_VIGENTE.map((f, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{f.faixaNome}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                          {(f.aliquota * 100).toFixed(1).replace('.', ',')}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatarMoeda(f.parcelaDeduzir)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <strong>Teto de Desconto CLT/Empregado:</strong> {formatarMoeda(TETO_DESCONTO_INSS)} (sobre o teto de {formatarMoeda(TETO_INSS)})
                  </div>
                  <div>
                    <strong>Pró-Labore / Contribuinte Individual:</strong> {(ALIQUOTA_INSS_CONTRIBUINTE_INDIVIDUAL * 100).toFixed(0)}% fixos (teto {formatarMoeda(TETO_INSS_CONTRIBUINTE_INDIVIDUAL)})
                  </div>
                  <div>
                    <strong>Salário-Família 2026:</strong> {formatarMoeda(VALOR_COTA_SALARIO_FAMILIA)} por filho &lt; 14 anos para remuneração até {formatarMoeda(LIMITE_SALARIO_FAMILIA)}
                  </div>
                </div>
              </div>

              {/* Tabela IRRF 2026 */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-800/30">
                <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-100 dark:border-emerald-900/50">
                  <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                    Tabela Progressiva IRRF 2026 + Redutor Lei nº 15.270/2025
                  </h3>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">Base de Cálculo Mensal</th>
                      <th className="py-2.5 px-3 text-right">Alíquota</th>
                      <th className="py-2.5 px-3 text-right">Dedução Tabela</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {TABELA_IRRF_VIGENTE.map((f, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{f.faixaNome}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {(f.aliquota * 100).toFixed(1).replace('.', ',')}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatarMoeda(f.deducao)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <strong>Redutor Lei nº 15.270/2025:</strong> Isenção total para rendimentos até {formatarMoeda(REDUTOR_IRRF_LEI_15270.limiteIsencaoTotal)} (redutor até {formatarMoeda(REDUTOR_IRRF_LEI_15270.redutorMaximo)}). De R$ 5.000,01 a {formatarMoeda(REDUTOR_IRRF_LEI_15270.limiteTransicao)}: <span className="font-mono">978,62 - (0,133145 × R)</span>.
                  </div>
                  <div>
                    <strong>Dedução por Dependente:</strong> {formatarMoeda(DEDUCAO_IRRF_POR_DEPENDENTE)} · <strong>Desconto Simplificado Mensal:</strong> {formatarMoeda(DESCONTO_SIMPLIFICADO_IRRF)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {aba === 'FGTS_FERIAS_RESCISAO' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Porcentagens de Encargos, FGTS e Rescisão */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    FGTS, Encargos Patronais &amp; Verbas Rescisórias
                  </h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">FGTS Mensal Padrão (CLT)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{PERCENTUAIS_TRABALHISTAS.fgtsPadraoCLT}%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">FGTS Jovem Aprendiz (Lei 10.097)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{PERCENTUAIS_TRABALHISTAS.fgtsAprendiz}%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Multa FGTS (Dispensa s/ Justa Causa / Indireta)</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{PERCENTUAIS_TRABALHISTAS.multaFGTSSemJustaCausa}%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Multa FGTS + Aviso Indenizado no Acordo (Art. 484-A)</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{PERCENTUAIS_TRABALHISTAS.multaFGTSAcordo484A}% FGTS / 50% Aviso</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Aviso Prévio Proporcional (Lei 12.506/11)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">30 dias + 3 dias/ano (máx. 90d)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Rescisão Antecipada Experiência (Art. 479 CLT)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">50% dos dias restantes</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">13º Salário — 1ª Parcela (até 30/nov)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{PERCENTUAIS_TRABALHISTAS.decimoTerceiroPrimeiraParcela}% (sem INSS/IRRF)</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-600 dark:text-slate-300">INSS Patronal Base (Lucro Presumido/Real)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{PERCENTUAIS_TRABALHISTAS.inssPatronalGeral}% (+ RAT×FAP + Terceiros)</span>
                  </div>
                </div>
              </div>

              {/* Tabela Redução de Férias Art. 130 CLT */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-800/30">
                <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-100 dark:border-amber-900/50">
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    Férias: Adicional de 1/3 (33,33%) &amp; Redução por Faltas (Art. 130 CLT)
                  </h3>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">Faltas Injustificadas no Período</th>
                      <th className="py-2.5 px-3 text-right">Dias de Férias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {TABELA_REDUCAO_FERIAS_FALTAS.map((f, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{f.descricao}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                          {f.diasDireito} dias
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <strong>Adicional Constitucional:</strong> +1/3 (33,33%) sobre os dias de férias e sobre o Abono Pecuniário.
                  </div>
                  <div>
                    <strong>Abono Pecuniário (Art. 143 CLT):</strong> Conversão de até 1/3 (10 dias) em pecúnia — <strong>ISENTO</strong> de INSS, IRRF e FGTS.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Todas as rubricas acima alimentam automaticamente a Folha Mensal, Férias, 13º Salário e TRCT.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};
