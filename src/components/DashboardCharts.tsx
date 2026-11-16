import React, { useState, useMemo, useEffect } from 'react';
import { Empregado, FolhaEmpregado, CompetenciaFolha } from '../types/dp';
import { formatarMoeda } from '../utils/formatters';
import { PieChart, Building, Box, BarChart3 } from 'lucide-react';
import { Payroll3DScene, Payroll3DCostItem, Payroll3DDeptoItem } from './Payroll3DScene';
import { Card3D } from './Card3D';

interface DashboardChartsProps {
  competencia?: CompetenciaFolha;
  folhas: FolhaEmpregado[];
  empregados: Empregado[];
  efeitos3D?: boolean;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  competencia,
  folhas,
  empregados,
  efeitos3D = true,
}) => {
  const [modoVisualizacao, setModoVisualizacao] = useState<'3D' | '2D'>(efeitos3D ? '3D' : '2D');

  useEffect(() => {
    setModoVisualizacao(efeitos3D ? '3D' : '2D');
  }, [efeitos3D]);

  const temFolha = folhas.length > 0 && Boolean(competencia);

  const liquido = competencia?.totalLiquido ?? folhas.reduce((s, f) => s + f.valorLiquido, 0);
  const descontos = competencia?.totalDescontos ?? folhas.reduce((s, f) => s + f.totalDescontos, 0);
  const fgts = competencia?.totalFGTS ?? folhas.reduce((s, f) => s + f.encargosEmpresa.fgtsDevido, 0);
  const encargosTotais =
    competencia?.totalEncargosEmpresa ??
    folhas.reduce((s, f) => s + f.encargosEmpresa.totalEncargos, 0);
  const encargosExcetoFgts = Math.max(0, encargosTotais - fgts);

  const desembolsoTotal = liquido + descontos + fgts + encargosExcetoFgts;
  const pct = (valor: number) =>
    desembolsoTotal > 0 ? Math.round((valor / desembolsoTotal) * 1000) / 10 : 0;

  const segmentos = useMemo(
    () => [
      {
        id: 'liquido',
        label: 'Líquido aos Trabalhadores',
        shortLabel: 'Líquido',
        valor: liquido,
        percentual: pct(liquido),
        barClass: 'bg-blue-600 dark:bg-blue-500',
        dotClass: 'bg-blue-600 dark:bg-blue-500',
        colorHex: 0x2563eb,
        cssColor: '#2563eb',
      },
      {
        id: 'descontos',
        label: 'Retenções & Descontos (INSS / IRRF / VT)',
        shortLabel: 'Retenções',
        valor: descontos,
        percentual: pct(descontos),
        barClass: 'bg-rose-500 dark:bg-rose-500',
        dotClass: 'bg-rose-500 dark:bg-rose-500',
        colorHex: 0xf43f5e,
        cssColor: '#f43f5e',
      },
      {
        id: 'fgts',
        label: 'FGTS Mensal (8%)',
        shortLabel: 'FGTS 8%',
        valor: fgts,
        percentual: pct(fgts),
        barClass: 'bg-emerald-500 dark:bg-emerald-500',
        dotClass: 'bg-emerald-500 dark:bg-emerald-500',
        colorHex: 0x10b981,
        cssColor: '#10b981',
      },
      {
        id: 'patronal',
        label: 'INSS Patronal, RAT & Terceiros',
        shortLabel: 'Patronal',
        valor: encargosExcetoFgts,
        percentual: pct(encargosExcetoFgts),
        barClass: 'bg-amber-500 dark:bg-amber-500',
        dotClass: 'bg-amber-500 dark:bg-amber-500',
        colorHex: 0xf59e0b,
        cssColor: '#f59e0b',
      },
    ],
    [liquido, descontos, fgts, encargosExcetoFgts, desembolsoTotal]
  );

  // Agrupamento por departamento (prioriza folhas apuradas; fallback para salários contratuais ativos)
  const { departamentos, totalMassaDeptos } = useMemo(() => {
    const deptoMap = new Map<string, { nome: string; qtd: number; massa: number }>();
    if (folhas.length > 0) {
      folhas.forEach(f => {
        const key = (f.departamento || 'Geral').trim();
        const atual = deptoMap.get(key) || { nome: key, qtd: 0, massa: 0 };
        atual.qtd += 1;
        atual.massa += f.totalProventos;
        deptoMap.set(key, atual);
      });
    } else {
      empregados
        .filter(e => e.status !== 'desligado')
        .forEach(e => {
          const key = (e.departamento || 'Geral').trim();
          const atual = deptoMap.get(key) || { nome: key, qtd: 0, massa: 0 };
          atual.qtd += 1;
          atual.massa += e.salarioBase;
          deptoMap.set(key, atual);
        });
    }

    const sorted = Array.from(deptoMap.values()).sort((a, b) => b.massa - a.massa);
    const total = sorted.reduce((s, d) => s + d.massa, 0);
    return { departamentos: sorted, totalMassaDeptos: total };
  }, [folhas, empregados]);

  const segmentos3D: Payroll3DCostItem[] = useMemo(
    () =>
      segmentos.map(s => ({
        id: s.id,
        label: s.label,
        shortLabel: s.shortLabel,
        valor: s.valor,
        percentual: s.percentual,
        colorHex: s.colorHex,
        cssColor: s.cssColor,
      })),
    [segmentos]
  );

  const deptos3D: Payroll3DDeptoItem[] = useMemo(
    () =>
      departamentos.slice(0, 5).map((d, idx) => ({
        id: `${idx}-${d.nome}`,
        nome: d.nome,
        qtd: d.qtd,
        massa: d.massa,
        share: totalMassaDeptos > 0 ? Math.round((d.massa / totalMassaDeptos) * 100) : 0,
      })),
    [departamentos, totalMassaDeptos]
  );

  if (!temFolha && departamentos.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Cabeçalho com alternância 3D Interativo vs Barras 2D */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {modoVisualizacao === '3D' ? (
              <Box className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            Análise Visual da Competência & Setores
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {modoVisualizacao === '3D'
              ? 'Cena 3D interativa com composição de custos (esquerda) e departamentos (direita)'
              : 'Detalhamento proporcional dos custos da folha e massa salarial por setor'}
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            onClick={() => setModoVisualizacao('3D')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              modoVisualizacao === '3D'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            Cena 3D
          </button>
          <button
            onClick={() => setModoVisualizacao('2D')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              modoVisualizacao === '2D'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Detalhado 2D
          </button>
        </div>
      </div>

      {modoVisualizacao === '3D' ? (
        <div className="space-y-3">
          <Payroll3DScene
            temFolha={temFolha}
            desembolsoTotal={desembolsoTotal}
            segmentos={segmentos3D}
            departamentos={deptos3D}
          />

          {/* Resumo Numérico Direto abaixo da Cena 3D */}
          {temFolha && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {segmentos.map(seg => (
                <Card3D
                  key={seg.id}
                  enabled={efeitos3D}
                  intensity="subtle"
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${seg.dotClass}`} />
                      <span className="truncate">{seg.shortLabel}</span>
                    </div>
                    <div className="text-sm font-black font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatarMoeda(seg.valor)}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    {seg.percentual.toFixed(1)}%
                  </span>
                </Card3D>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Gráfico 1: Composição do Custo Total da Folha */}
          <Card3D
            enabled={efeitos3D}
            intensity="subtle"
            className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Composição do Custo Total da Competência
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {temFolha
                    ? 'Proporção entre salários líquidos, retenções legais, FGTS e encargos patronais'
                    : 'Projeção detalhada ficará disponível assim que a folha da competência for calculada'}
                </p>
              </div>
              {temFolha && (
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Custo Total</span>
                  <span className="text-base font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                    {formatarMoeda(desembolsoTotal)}
                  </span>
                </div>
              )}
            </div>

            {temFolha ? (
              <>
                {/* Barra segmentada proporcional */}
                <div className="h-3.5 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
                  {segmentos.map(seg =>
                    seg.percentual > 0 ? (
                      <div
                        key={seg.label}
                        style={{ width: `${Math.max(seg.percentual, 1.5)}%` }}
                        className={`${seg.barClass} transition-all duration-300 border-r border-white/40 dark:border-slate-900/50 last:border-r-0`}
                        title={`${seg.label}: ${formatarMoeda(seg.valor)} (${seg.percentual}%)`}
                      />
                    ) : null
                  )}
                </div>

                {/* Tabela limpa com 4 componentes */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {segmentos.map(seg => (
                    <div key={seg.label} className="py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${seg.dotClass}`} />
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                          {seg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] w-12 text-right">
                          {seg.percentual.toFixed(1)}%
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 w-24 text-right">
                          {formatarMoeda(seg.valor)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                Calcule a folha para visualizar a distribuição exata entre líquido, retenções e encargos patronais.
              </div>
            )}
          </Card3D>

          {/* Gráfico 2: Distribuição por Departamento */}
          <Card3D
            enabled={efeitos3D}
            intensity="subtle"
            className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Distribuição por Departamento
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {folhas.length > 0 ? 'Total de proventos apurados por setor' : 'Base salarial ativa por setor'}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                {departamentos.length} setor(es)
              </span>
            </div>

            {departamentos.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Nenhum colaborador cadastrado para agrupar por departamento.
              </div>
            ) : (
              <div className="space-y-3">
                {departamentos.slice(0, 5).map(depto => {
                  const share = totalMassaDeptos > 0 ? Math.round((depto.massa / totalMassaDeptos) * 100) : 0;
                  return (
                    <div key={depto.nome} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {depto.nome}{' '}
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            · {depto.qtd} colab.
                          </span>
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                          {formatarMoeda(depto.massa)}{' '}
                          <span className="text-[11px] font-normal text-slate-500">({share}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(share, 3)}%` }}
                          className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card3D>
        </div>
      )}
    </div>
  );
};
