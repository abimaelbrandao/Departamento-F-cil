import { Empregado, ItemCalculadoFolha, FolhaEmpregado, Empresa, LancamentoVariavel } from '../types/dp';
import { RUBRICAS_SISTEMA } from '../data/initialData';

// ============================================================================
// CONSTANTES OFICIAIS DA LEGISLAÇÃO TRABALHISTA E PREVIDENCIÁRIA (VIGÊNCIA 2026)
// ============================================================================

export const SALARIO_MINIMO_NACIONAL = 1621.00; // Salário Mínimo Nacional 2026

// Portaria Interministerial MPS/MF nº 13/2026 (Tabela Progressiva INSS 2026)
export const TABELA_INSS_VIGENTE = [
  { limite: 1621.00, aliquota: 0.075, parcelaDeduzir: 0.00, faixaNome: '1ª Faixa (até R$ 1.621,00)' },
  { limite: 2902.84, aliquota: 0.090, parcelaDeduzir: 24.32, faixaNome: '2ª Faixa (R$ 1.621,01 até R$ 2.902,84)' },
  { limite: 4354.27, aliquota: 0.120, parcelaDeduzir: 111.40, faixaNome: '3ª Faixa (R$ 2.902,85 até R$ 4.354,27)' },
  { limite: 8475.55, aliquota: 0.140, parcelaDeduzir: 198.49, faixaNome: '4ª Faixa (R$ 4.354,28 até R$ 8.475,55)' },
];
export const TETO_INSS = 8475.55;
export const TETO_DESCONTO_INSS = 988.09;
export const ALIQUOTA_INSS_CONTRIBUINTE_INDIVIDUAL = 0.11; // 11% Pró-labore (Art. 21 Lei 8.212/91)
export const TETO_INSS_CONTRIBUINTE_INDIVIDUAL = 932.31; // 11% de R$ 8.475,55

// Tabela Progressiva IRRF 2026 + Redutor Lei nº 15.270/2025
export const DEDUCAO_IRRF_POR_DEPENDENTE = 189.59;
export const DESCONTO_SIMPLIFICADO_IRRF = 607.20; // 25% da faixa isenta (25% de R$ 2.428,80)

export const TABELA_IRRF_VIGENTE = [
  { limite: 2428.80, aliquota: 0.000, deducao: 0.00, faixaNome: 'Isento até R$ 2.428,80' },
  { limite: 2826.65, aliquota: 0.075, deducao: 182.16, faixaNome: '7,5% (R$ 2.428,81 até R$ 2.826,65)' },
  { limite: 3751.05, aliquota: 0.150, deducao: 394.16, faixaNome: '15,0% (R$ 2.826,66 até R$ 3.751,05)' },
  { limite: 4664.68, aliquota: 0.225, deducao: 675.49, faixaNome: '22,5% (R$ 3.751,06 até R$ 4.664,68)' },
  { limite: Infinity, aliquota: 0.275, deducao: 908.73, faixaNome: '27,5% (Acima de R$ 4.664,68)' },
];

export const REDUTOR_IRRF_LEI_15270 = {
  limiteIsencaoTotal: 5000.00,
  redutorMaximo: 312.89,
  limiteTransicao: 7350.00,
  constanteTransicao: 978.62,
  fatorTransicao: 0.133145,
};

// Salário-Família 2026 (Portaria Interministerial MPS/MF nº 13/2026)
export const LIMITE_SALARIO_FAMILIA = 1980.38;
export const VALOR_COTA_SALARIO_FAMILIA = 67.54;

// Porcentagens exatas dos direitos e descontos trabalhistas (CLT / Leis Esparsas)
export const PERCENTUAIS_TRABALHISTAS = {
  horaExtraDiurnaMinima: 50, // +50% (Art. 59 CLT / CF Art. 7º XVI)
  horaExtraDomingosFeriados: 100, // +100% (Lei 605/49 / Súmula 146 TST)
  adicionalNoturnoUrbano: 20, // +20% (Art. 73 CLT)
  fatorHoraNoturnaFicta: 60 / 52.5, // 1,142857 (52min30s)
  horaExtraNoturnaFator: 1.80, // 1,20 × 1,50 (OJ 97 SDI-1 TST)
  periculosidade: 30, // 30% s/ Salário Base (Art. 193 § 1º CLT)
  insalubridadeMinima: 10, // 10% s/ Salário Mínimo (Art. 192 CLT)
  insalubridadeMedia: 20, // 20% s/ Salário Mínimo (Art. 192 CLT)
  insalubridadeMaxima: 40, // 40% s/ Salário Mínimo (Art. 192 CLT)
  sobreaviso: 33.33, // 1/3 da hora normal (Art. 244 § 2º CLT)
  prontidao: 66.67, // 2/3 da hora normal (Art. 244 § 3º CLT)
  transferenciaProvisoria: 25, // 25% s/ salário (Art. 469 § 3º CLT)
  quebraCaixa: 10, // 10% s/ salário base (Súmula 247 TST)
  intrajornadaSuprimida: 50, // +50% indenizatório (Art. 71 § 4º CLT)
  adiantamentoSalariosPadrao: 40, // 40% do salário base
  valeTransporteTetoDesconto: 6, // Até 6% do salário base (Lei 7.418/85)
  patAlimentacaoTetoDesconto: 20, // Até 20% do custo do benefício (PAT)
  emprestimoConsignadoMargem: 35, // Até 35% da remuneração líquida (Lei 14.431/22)
  fgtsPadraoCLT: 8, // 8% (Lei 8.036/90)
  fgtsAprendiz: 2, // 2% (Art. 15 § 7º Lei 8.036/90)
  multaFGTSSemJustaCausa: 40, // 40% (Art. 18 § 1º Lei 8.036/90)
  multaFGTSAcordo484A: 20, // 20% (Art. 484-A CLT)
  tercoConstitucionalFerias: 33.33, // 1/3 (Art. 7º XVII CF/88)
  inssPatronalGeral: 20, // 20% (Art. 22 Lei 8.212/91 - Lucro Presumido/Real)
  decimoTerceiroPrimeiraParcela: 50, // 50% até 30/nov (Lei 4.749/65)
};

// Tabela de redução de férias por faltas injustificadas (Art. 130 da CLT)
export const TABELA_REDUCAO_FERIAS_FALTAS = [
  { faltasMin: 0, faltasMax: 5, diasDireito: 30, descricao: 'Até 5 faltas: 30 dias corridos' },
  { faltasMin: 6, faltasMax: 14, diasDireito: 24, descricao: 'De 6 a 14 faltas: 24 dias corridos' },
  { faltasMin: 15, faltasMax: 23, diasDireito: 18, descricao: 'De 15 a 23 faltas: 18 dias corridos' },
  { faltasMin: 24, faltasMax: 32, diasDireito: 12, descricao: 'De 24 a 32 faltas: 12 dias corridos' },
  { faltasMin: 33, faltasMax: Infinity, diasDireito: 0, descricao: 'Acima de 32 faltas: perde o direito ao período' },
];

export interface ResultadoCalculoINSS {
  valorTotal: number;
  aliquotaEfetiva: number;
  passos: string[];
  faixasCalculadas: { faixa: string; base: number; aliquota: number; valor: number }[];
}

export interface ResultadoCalculoIRRF {
  valorTotal: number;
  baseCalculo: number;
  aliquotaAplicada: number;
  deducaoAplicada: number;
  redutorLei15270: number;
  metodoUtilizado: 'DEDUCOES_LEGAIS' | 'DESCONTO_SIMPLIFICADO';
  passos: string[];
}

export function arredondarMoeda(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  const eps = valor >= 0 ? 1e-9 : -1e-9;
  return Math.round((valor + eps) * 100) / 100;
}

/**
 * Calcula o INSS Progressivo conforme EC 103/2019 e Portaria Interministerial MPS/MF nº 13/2026
 */
export function calcularINSSProgressivo(baseINSS: number): ResultadoCalculoINSS {
  const baseLimpa = Math.max(0, Number(baseINSS) || 0);
  const baseTributavel = Math.min(baseLimpa, TETO_INSS);
  let totalINSS = 0;
  let valorAnterior = 0;
  const passos: string[] = [];
  const faixasCalculadas: { faixa: string; base: number; aliquota: number; valor: number }[] = [];

  for (let i = 0; i < TABELA_INSS_VIGENTE.length; i++) {
    const { limite, aliquota, faixaNome } = TABELA_INSS_VIGENTE[i];

    if (baseTributavel > valorAnterior) {
      const baseDaFaixa = Math.min(baseTributavel, limite) - valorAnterior;
      const valorFaixa = baseDaFaixa * aliquota;
      totalINSS += valorFaixa;

      faixasCalculadas.push({
        faixa: faixaNome,
        base: arredondarMoeda(baseDaFaixa),
        aliquota: aliquota * 100,
        valor: arredondarMoeda(valorFaixa),
      });

      passos.push(
        `${faixaNome}: R$ ${baseDaFaixa.toFixed(2)} × ${(aliquota * 100).toFixed(1)}% = R$ ${valorFaixa.toFixed(2)}`
      );

      valorAnterior = limite;
    } else {
      break;
    }
  }

  totalINSS = Math.min(totalINSS, TETO_DESCONTO_INSS);
  const totalArredondado = arredondarMoeda(totalINSS);
  const aliquotaEfetiva = baseLimpa > 0 ? (totalArredondado / baseLimpa) * 100 : 0;

  if (baseLimpa > TETO_INSS) {
    passos.push(
      `Base ultrapassou o teto de R$ ${TETO_INSS.toFixed(2)}. Aplicação da contribuição máxima de R$ ${TETO_DESCONTO_INSS.toFixed(2)}.`
    );
  }

  return {
    valorTotal: totalArredondado,
    aliquotaEfetiva: arredondarMoeda(aliquotaEfetiva),
    passos,
    faixasCalculadas,
  };
}

/**
 * Calcula o IRRF 2026 com comparativo (Deduções Legais vs Desconto Simplificado R$ 607,20)
 * e aplicação do Redutor da Lei nº 15.270/2025 (isenção até R$ 5.000 e transição até R$ 7.350)
 */
export function calcularIRRF(
  baseBrutaIRRF: number,
  descontoINSS: number,
  quantidadeDependentes: number,
  outrasDeducoes: number = 0
): ResultadoCalculoIRRF {
  const rendimentoBruto = Math.max(0, Number(baseBrutaIRRF) || 0);
  const passos: string[] = [];

  // Método 1: Deduções Legais (INSS + Dependentes R$ 189,59 + Pensão Alimentícia/Outras)
  const totalDeducaoDependentes = Math.max(0, quantidadeDependentes) * DEDUCAO_IRRF_POR_DEPENDENTE;
  const totalDeducoesLegais = Math.max(0, descontoINSS) + totalDeducaoDependentes + Math.max(0, outrasDeducoes);
  const baseComDeducoesLegais = Math.max(0, rendimentoBruto - totalDeducoesLegais);

  // Método 2: Desconto Simplificado Mensal (R$ 607,20 em 2026)
  const baseComDescontoSimplificado = Math.max(0, rendimentoBruto - DESCONTO_SIMPLIFICADO_IRRF);

  let baseEscolhida: number;
  let metodo: 'DEDUCOES_LEGAIS' | 'DESCONTO_SIMPLIFICADO';

  if (totalDeducoesLegais >= DESCONTO_SIMPLIFICADO_IRRF) {
    baseEscolhida = baseComDeducoesLegais;
    metodo = 'DEDUCOES_LEGAIS';
    passos.push('Método adotado: DEDUÇÕES LEGAIS (mais vantajoso ao colaborador).');
    passos.push(
      `Deduções legais: R$ ${totalDeducoesLegais.toFixed(2)} (INSS: R$ ${descontoINSS.toFixed(2)} + ${quantidadeDependentes} dep.: R$ ${totalDeducaoDependentes.toFixed(2)}${outrasDeducoes > 0 ? ` + Pensão/Outras: R$ ${outrasDeducoes.toFixed(2)}` : ''}).`
    );
    passos.push(`Base tributável: R$ ${rendimentoBruto.toFixed(2)} - R$ ${totalDeducoesLegais.toFixed(2)} = R$ ${baseEscolhida.toFixed(2)}`);
  } else {
    baseEscolhida = baseComDescontoSimplificado;
    metodo = 'DESCONTO_SIMPLIFICADO';
    passos.push(`Método adotado: DESCONTO SIMPLIFICADO (R$ ${DESCONTO_SIMPLIFICADO_IRRF.toFixed(2)} — 25% da faixa isenta).`);
    passos.push(`Deduções legais somaram R$ ${totalDeducoesLegais.toFixed(2)}, sendo substituídas pelo desconto simplificado.`);
    passos.push(`Base tributável: R$ ${rendimentoBruto.toFixed(2)} - R$ ${DESCONTO_SIMPLIFICADO_IRRF.toFixed(2)} = R$ ${baseEscolhida.toFixed(2)}`);
  }

  let aliquota = 0;
  let parcelaDeducao = 0;
  let faixaDescricao = '';

  for (const faixa of TABELA_IRRF_VIGENTE) {
    if (baseEscolhida <= faixa.limite) {
      aliquota = faixa.aliquota;
      parcelaDeducao = faixa.deducao;
      faixaDescricao = faixa.faixaNome;
      break;
    }
  }

  let impostoTabela = 0;
  if (aliquota > 0) {
    impostoTabela = Math.max(0, (baseEscolhida * aliquota) - parcelaDeducao);
    passos.push(`Faixa IRRF: ${faixaDescricao}`);
    passos.push(
      `Imposto preliminar na tabela: (R$ ${baseEscolhida.toFixed(2)} × ${(aliquota * 100).toFixed(1)}%) - R$ ${parcelaDeducao.toFixed(2)} = R$ ${impostoTabela.toFixed(2)}`
    );
  } else {
    passos.push(`Base tributável de R$ ${baseEscolhida.toFixed(2)} está na faixa de isenção da tabela progressiva.`);
  }

  // Etapa adicional: Redutor da Lei nº 15.270/2025 sobre rendimentos tributáveis brutos
  let redutor = 0;
  let impostoFinal = impostoTabela;

  if (impostoTabela > 0) {
    if (rendimentoBruto <= REDUTOR_IRRF_LEI_15270.limiteIsencaoTotal) {
      redutor = Math.min(impostoTabela, REDUTOR_IRRF_LEI_15270.redutorMaximo);
      impostoFinal = 0;
      passos.push(
        `Redutor Lei nº 15.270/2025 (Rendimentos até R$ 5.000,00): isenção total aplicada (-R$ ${impostoTabela.toFixed(2)}).`
      );
    } else if (rendimentoBruto <= REDUTOR_IRRF_LEI_15270.limiteTransicao) {
      const redutorCalculado =
        REDUTOR_IRRF_LEI_15270.constanteTransicao -
        (REDUTOR_IRRF_LEI_15270.fatorTransicao * rendimentoBruto);
      redutor = Math.max(0, Math.min(impostoTabela, Math.round(redutorCalculado * 100) / 100));
      impostoFinal = Math.max(0, impostoTabela - redutor);
      passos.push(
        `Redutor gradual Lei nº 15.270/2025 (R$ 5.000,01 a R$ 7.350,00): 978,62 - (0,133145 × R$ ${rendimentoBruto.toFixed(2)}) = R$ ${redutor.toFixed(2)}.`
      );
      passos.push(
        `IRRF após redutor: R$ ${impostoTabela.toFixed(2)} - R$ ${redutor.toFixed(2)} = R$ ${impostoFinal.toFixed(2)}.`
      );
    }
  }

  return {
    valorTotal: arredondarMoeda(impostoFinal),
    baseCalculo: arredondarMoeda(baseEscolhida),
    aliquotaAplicada: impostoFinal > 0 ? aliquota * 100 : 0,
    deducaoAplicada: parcelaDeducao,
    redutorLei15270: arredondarMoeda(redutor),
    metodoUtilizado: metodo,
    passos,
  };
}

/**
 * Calculadora unificada de qualquer evento/rubrica trabalhista com porcentagens exatas.
 */
export function calcularValorRubricaEvento(params: {
  rubricaCodigo: string;
  referencia: number;
  unidadeReferencia: 'HORAS' | 'DIAS' | 'PERCENTUAL' | 'VALOR';
  valorManual?: number;
  empregado?: Empregado;
}): number {
  const { rubricaCodigo, referencia, unidadeReferencia, valorManual = 0, empregado } = params;

  if (unidadeReferencia === 'VALOR') {
    const val = valorManual > 0 ? valorManual : referencia;
    return Math.max(0, Math.round(val * 100) / 100);
  }

  if (valorManual > 0 && unidadeReferencia !== 'HORAS' && unidadeReferencia !== 'DIAS' && unidadeReferencia !== 'PERCENTUAL') {
    return Math.round(valorManual * 100) / 100;
  }

  const salario = empregado?.salarioBase || 0;
  const divisor = empregado?.divisorHoras || 220;
  const valorHora = salario / divisor;
  const valorDia = salario / 30;
  const ref = Number(referencia) || 0;

  if (rubricaCodigo === '0101') return Math.round(valorHora * 1.50 * ref * 100) / 100; // +50%
  if (rubricaCodigo === '0102') return Math.round(valorHora * 2.00 * ref * 100) / 100; // +100%
  if (rubricaCodigo === '0103') {
    // 20% + redução ficta (60 / 52,5)
    const horasFictas = ref * PERCENTUAIS_TRABALHISTAS.fatorHoraNoturnaFicta;
    return Math.round(valorHora * 0.20 * horasFictas * 100) / 100;
  }
  if (rubricaCodigo === '0114') {
    // Hora extra noturna: +20% noturno + 50% HE (1,20 * 1,50 = 1,80) com redução ficta
    const horasFictas = ref * PERCENTUAIS_TRABALHISTAS.fatorHoraNoturnaFicta;
    return Math.round(valorHora * 1.80 * horasFictas * 100) / 100;
  }
  if (rubricaCodigo === '0115') return Math.round(valorHora * 1.50 * ref * 100) / 100; // Intrajornada +50%
  if (rubricaCodigo === '0106') {
    const perc = unidadeReferencia === 'PERCENTUAL' && ref > 0 ? ref : 30;
    return Math.round(salario * (perc / 100) * 100) / 100;
  }
  if (rubricaCodigo === '0107') {
    const perc = unidadeReferencia === 'PERCENTUAL' && ref > 0 ? ref : 10;
    return Math.round(SALARIO_MINIMO_NACIONAL * (perc / 100) * 100) / 100;
  }
  if (rubricaCodigo === '0108') {
    const perc = unidadeReferencia === 'PERCENTUAL' && ref > 0 ? ref : 20;
    return Math.round(SALARIO_MINIMO_NACIONAL * (perc / 100) * 100) / 100;
  }
  if (rubricaCodigo === '0109') {
    const perc = unidadeReferencia === 'PERCENTUAL' && ref > 0 ? ref : 40;
    return Math.round(SALARIO_MINIMO_NACIONAL * (perc / 100) * 100) / 100;
  }
  if (rubricaCodigo === '0110') return Math.round((valorHora / 3) * ref * 100) / 100; // Sobreaviso 1/3
  if (rubricaCodigo === '0111') return Math.round((valorHora * (2 / 3)) * ref * 100) / 100; // Prontidão 2/3
  if (rubricaCodigo === '0112') {
    const perc = unidadeReferencia === 'PERCENTUAL' && ref > 0 ? ref : 25;
    return Math.round(salario * (perc / 100) * 100) / 100;
  }
  if (rubricaCodigo === '0113') {
    const perc = unidadeReferencia === 'PERCENTUAL' && ref > 0 ? ref : 10;
    return Math.round(salario * (perc / 100) * 100) / 100;
  }
  if (rubricaCodigo === '0119' || rubricaCodigo === '0201' || rubricaCodigo === '0202') {
    return Math.round(valorDia * ref * 100) / 100;
  }
  if (rubricaCodigo === '0203') {
    return Math.round(valorHora * ref * 100) / 100;
  }
  if (rubricaCodigo === '0020' || rubricaCodigo === '0204') {
    const perc = unidadeReferencia === 'PERCENTUAL' && ref > 0 ? ref : 40;
    return Math.round(salario * (perc / 100) * 100) / 100;
  }
  if (rubricaCodigo === '0301') {
    const perc = unidadeReferencia === 'PERCENTUAL' && ref > 0 ? Math.min(6, ref) : 6;
    return Math.round(salario * (perc / 100) * 100) / 100;
  }
  if (rubricaCodigo === '0015') {
    return Math.round(VALOR_COTA_SALARIO_FAMILIA * (ref > 0 ? ref : 1) * 100) / 100;
  }

  if (unidadeReferencia === 'PERCENTUAL') return Math.round(salario * (ref / 100) * 100) / 100;
  if (unidadeReferencia === 'DIAS') return Math.round(valorDia * ref * 100) / 100;
  if (unidadeReferencia === 'HORAS') return Math.round(valorHora * ref * 100) / 100;
  return Math.round((valorManual > 0 ? valorManual : ref) * 100) / 100;
}

/**
 * Calcula a folha de pagamento completa de um empregado (Mensal, Adiantamento, 13º 1ª/2ª/Integral)
 * com memória de cálculo determinística e aplicação exata de proventos e descontos da CLT.
 */
export function processarFolhaEmpregado(
  empregado: Empregado,
  empresa: Empresa,
  competencia: string,
  lancamentos: LancamentoVariavel[] = [],
  tipoFolha: 'MENSAL' | 'ADIANTAMENTO' | '13_PRIMEIRA_PARCELA' | '13_SEGUNDA_PARCELA' | '13_INTEGRAL' | 'COMPLEMENTAR' = 'MENSAL'
): FolhaEmpregado {
  const itens: ItemCalculadoFolha[] = [];
  const divisor = empregado.divisorHoras || 220;
  const salarioBase = Number(empregado.salarioBase || 0);
  const salarioHora = salarioBase / divisor;
  const salarioDia = salarioBase / 30;
  const ehDiretor = empregado.vinculo === 'DIRETOR_ESTATUTARIO';
  const ehEstagio = empregado.vinculo === 'ESTAGIO';
  const ehAprendiz = empregado.vinculo === 'APRENDIZ';

  // --------------------------------------------------------------------------
  // MODO 1: ADIANTAMENTO SALARIAL QUINZENAL (40% ou % da empresa)
  // --------------------------------------------------------------------------
  if (tipoFolha === 'ADIANTAMENTO') {
    const percentual = empresa.configuracoesFolha?.percentualAdiantamento || PERCENTUAIS_TRABALHISTAS.adiantamentoSalariosPadrao;
    const valorAdiantamento = Math.round((salarioBase * (percentual / 100)) * 100) / 100;

    itens.push({
      rubricaCodigo: '0020',
      descricao: 'Adiantamento Salarial Quinzenal',
      tipo: 'PROVENTO',
      referencia: `${percentual}%`,
      provento: valorAdiantamento,
      desconto: 0,
      memoriaCalculo: {
        titulo: 'Adiantamento Salarial Quinzenal',
        formula: 'Salário Base × Percentual de Adiantamento',
        passoAPasso: [
          `Salário Base: R$ ${salarioBase.toFixed(2)}`,
          `Percentual contratual/normativo: ${percentual}%`,
          `Cálculo: R$ ${salarioBase.toFixed(2)} × ${(percentual / 100).toFixed(2)} = R$ ${valorAdiantamento.toFixed(2)}`,
          `Não há desconto de INSS nem IRRF no pagamento quinzenal; a compensação ocorre na folha mensal.`
        ],
        baseCalculo: salarioBase,
        aliquotasOuFatores: { percentual, valorAdiantamento },
        fundamentoLegal: 'Art. 462 da CLT e Convenção Coletiva de Trabalho'
      }
    });

    return {
      id: `folha-${empregado.id}-${competencia}-adiantamento`,
      empregadoId: empregado.id,
      matricula: empregado.matricula,
      nomeEmpregado: empregado.nomeCompleto,
      cargo: empregado.cargo,
      departamento: empregado.departamento,
      competencia,
      tipoFolha: 'ADIANTAMENTO',
      salarioBase,
      itens,
      totalProventos: valorAdiantamento,
      totalDescontos: 0,
      valorLiquido: valorAdiantamento,
      bases: { baseINSS: 0, baseIRRF: 0, baseFGTS: 0, baseSalarioFamilia: 0 },
      encargosEmpresa: { fgtsDevido: 0, inssPatronal: 0, ratAjustado: 0, terceiros: 0, totalEncargos: 0 },
      statusPagamento: 'EMITIDO',
      dataEmissao: new Date().toISOString().split('T')[0],
    };
  }

  // --------------------------------------------------------------------------
  // MODO 2: 13º SALÁRIO (1ª PARCELA 50% / 2ª PARCELA / INTEGRAL)
  // --------------------------------------------------------------------------
  if (tipoFolha === '13_PRIMEIRA_PARCELA' || tipoFolha === '13_SEGUNDA_PARCELA' || tipoFolha === '13_INTEGRAL') {
    const adicionalPeric = empregado.adicionalPericulosidade ? Math.round(salarioBase * 0.30 * 100) / 100 : 0;
    const adicionalInsalub =
      empregado.adicionalInsalubridade === 'MINIMO_10'
        ? Math.round(SALARIO_MINIMO_NACIONAL * 0.10 * 100) / 100
        : empregado.adicionalInsalubridade === 'MEDIO_20'
        ? Math.round(SALARIO_MINIMO_NACIONAL * 0.20 * 100) / 100
        : empregado.adicionalInsalubridade === 'MAXIMO_40'
        ? Math.round(SALARIO_MINIMO_NACIONAL * 0.40 * 100) / 100
        : 0;
    const remuneracaoBase13 = salarioBase + adicionalPeric + adicionalInsalub;

    if (tipoFolha === '13_PRIMEIRA_PARCELA') {
      const valorParcela1 = Math.round(remuneracaoBase13 * 0.50 * 100) / 100;
      itens.push({
        rubricaCodigo: '0131',
        descricao: '13º Salário — 1ª Parcela (Adiantamento 50%)',
        tipo: 'PROVENTO',
        referencia: '50%',
        provento: valorParcela1,
        desconto: 0,
        memoriaCalculo: {
          titulo: '1ª Parcela do 13º Salário (Lei 4.749/1965)',
          formula: 'Remuneração Integral ÷ 2 (50%) — Sem desconto de INSS/IRRF',
          passoAPasso: [
            `Remuneração base do 13º: R$ ${remuneracaoBase13.toFixed(2)}`,
            `Percentual legal da 1ª parcela (até 30/nov): 50%`,
            `Cálculo: R$ ${remuneracaoBase13.toFixed(2)} × 50% = R$ ${valorParcela1.toFixed(2)}`,
            `FGTS (8% ou 2% Aprendiz) incide sobre a 1ª parcela no mês do pagamento.`
          ],
          baseCalculo: remuneracaoBase13,
          aliquotasOuFatores: { percentual: 50 },
          fundamentoLegal: 'Lei nº 4.090/1962 e Art. 2º da Lei nº 4.749/1965'
        }
      });

      const optanteFGTS13 = empregado.optanteFGTS !== false && !ehDiretor && !ehEstagio;
      const aliqFGTS13 = ehAprendiz ? 0.02 : (empregado.aliquotaFGTS || 0.08);
      const fgts13 = optanteFGTS13 ? Math.round(valorParcela1 * aliqFGTS13 * 100) / 100 : 0;

      return {
        id: `folha-${empregado.id}-${competencia}-13-1`,
        empregadoId: empregado.id,
        matricula: empregado.matricula,
        nomeEmpregado: empregado.nomeCompleto,
        cargo: empregado.cargo,
        departamento: empregado.departamento,
        competencia,
        tipoFolha,
        salarioBase,
        itens,
        totalProventos: valorParcela1,
        totalDescontos: 0,
        valorLiquido: valorParcela1,
        bases: { baseINSS: 0, baseIRRF: 0, baseFGTS: optanteFGTS13 ? valorParcela1 : 0, baseSalarioFamilia: 0 },
        encargosEmpresa: { fgtsDevido: fgts13, inssPatronal: 0, ratAjustado: 0, terceiros: 0, totalEncargos: fgts13 },
        statusPagamento: 'EMITIDO',
        dataEmissao: new Date().toISOString().split('T')[0],
      };
    }

    // 13ª Integral ou 2ª Parcela (Tributação exclusiva de INSS e IRRF sobre o total de 13º)
    const valor13Integral = Math.round(remuneracaoBase13 * 100) / 100;
    const adiantamento13Deduzir = tipoFolha === '13_SEGUNDA_PARCELA' ? Math.round(remuneracaoBase13 * 0.50 * 100) / 100 : 0;

    itens.push({
      rubricaCodigo: '0132',
      descricao: tipoFolha === '13_SEGUNDA_PARCELA' ? '13º Salário Integral (Base 2ª Parcela)' : '13º Salário Integral',
      tipo: 'PROVENTO',
      referencia: '12/12',
      provento: valor13Integral,
      desconto: 0,
      memoriaCalculo: {
        titulo: '13º Salário Integral (Gratificação Natalina)',
        formula: 'Remuneração Integral × 12/12 avos',
        passoAPasso: [
          `Salário Base + Adicionais habituais: R$ ${valor13Integral.toFixed(2)}`,
          `Tributação de INSS e IRRF ocorre integralmente em separado na 2ª parcela/quitação.`
        ],
        baseCalculo: valor13Integral,
        aliquotasOuFatores: { avos: '12/12' },
        fundamentoLegal: 'Art. 1º da Lei nº 4.090/1962'
      }
    });

    if (adiantamento13Deduzir > 0) {
      itens.push({
        rubricaCodigo: '0231',
        descricao: 'Desconto 1ª Parcela 13º Salário Paga',
        tipo: 'DESCONTO',
        referencia: '50%',
        provento: 0,
        desconto: adiantamento13Deduzir,
        memoriaCalculo: {
          titulo: 'Compensação da 1ª Parcela do 13º Salário',
          formula: '50% já antecipado até 30 de novembro',
          passoAPasso: [`Valor deduzido da 1ª parcela já quitada: R$ ${adiantamento13Deduzir.toFixed(2)}`],
          baseCalculo: valor13Integral,
          aliquotasOuFatores: { percentual: 50 },
          fundamentoLegal: 'Decreto nº 10.854/2021, Art. 78'
        }
      });
    }

    const inss13 = !ehEstagio ? calcularINSSProgressivo(valor13Integral) : { valorTotal: 0, aliquotaEfetiva: 0, passos: [], faixasCalculadas: [] };
    if (inss13.valorTotal > 0) {
      itens.push({
        rubricaCodigo: '0901',
        descricao: 'INSS s/ 13º Salário (Tributação Exclusiva)',
        tipo: 'DESCONTO',
        referencia: `${inss13.aliquotaEfetiva.toFixed(2)}%`,
        provento: 0,
        desconto: inss13.valorTotal,
        memoriaCalculo: {
          titulo: 'INSS Exclusivo sobre 13º Salário',
          formula: 'Tabela Progressiva 2026 aplicada exclusivamente sobre o 13º Integral',
          passoAPasso: inss13.passos,
          baseCalculo: valor13Integral,
          aliquotasOuFatores: { aliquotaEfetiva: `${inss13.aliquotaEfetiva}%` },
          fundamentoLegal: 'Art. 7º § 2º Decreto nº 3.048/1999 e Portaria MPS/MF nº 13/2026'
        }
      });
    }

    const depsIRRF = (empregado.dependentes || []).filter(d => d.irrf).length;
    const irrf13 = !ehEstagio ? calcularIRRF(valor13Integral, inss13.valorTotal, depsIRRF) : { valorTotal: 0, baseCalculo: 0, aliquotaAplicada: 0, deducaoAplicada: 0, redutorLei15270: 0, metodoUtilizado: 'DEDUCOES_LEGAIS' as const, passos: [] };
    if (irrf13.valorTotal > 0) {
      itens.push({
        rubricaCodigo: '0902',
        descricao: 'IRRF s/ 13º Salário (Tributação Exclusiva)',
        tipo: 'DESCONTO',
        referencia: `${irrf13.aliquotaAplicada.toFixed(1)}%`,
        provento: 0,
        desconto: irrf13.valorTotal,
        memoriaCalculo: {
          titulo: 'IRRF Exclusivo na Fonte s/ 13º Salário',
          formula: 'Tabela Progressiva 2026 + Redutor Lei nº 15.270/2025',
          passoAPasso: irrf13.passos,
          baseCalculo: irrf13.baseCalculo,
          aliquotasOuFatores: { aliquota: `${irrf13.aliquotaAplicada}%`, redutor: irrf13.redutorLei15270 },
          fundamentoLegal: 'Art. 16 Lei nº 8.134/1990 e Lei nº 15.270/2025'
        }
      });
    }

    const totalDesc13 = Math.round((adiantamento13Deduzir + inss13.valorTotal + irrf13.valorTotal) * 100) / 100;
    const liq13 = Math.max(0, Math.round((valor13Integral - totalDesc13) * 100) / 100);
    const optanteFGTS13 = empregado.optanteFGTS !== false && !ehDiretor && !ehEstagio;
    const aliqFGTS13 = ehAprendiz ? 0.02 : (empregado.aliquotaFGTS || 0.08);
    const baseFGTSRestante = Math.max(0, valor13Integral - adiantamento13Deduzir);
    const fgts13 = optanteFGTS13 ? Math.round(baseFGTSRestante * aliqFGTS13 * 100) / 100 : 0;

    return {
      id: `folha-${empregado.id}-${competencia}-13`,
      empregadoId: empregado.id,
      matricula: empregado.matricula,
      nomeEmpregado: empregado.nomeCompleto,
      cargo: empregado.cargo,
      departamento: empregado.departamento,
      competencia,
      tipoFolha,
      salarioBase,
      itens,
      totalProventos: valor13Integral,
      totalDescontos: totalDesc13,
      valorLiquido: liq13,
      bases: { baseINSS: valor13Integral, baseIRRF: irrf13.baseCalculo, baseFGTS: optanteFGTS13 ? baseFGTSRestante : 0, baseSalarioFamilia: 0 },
      encargosEmpresa: { fgtsDevido: fgts13, inssPatronal: 0, ratAjustado: 0, terceiros: 0, totalEncargos: fgts13 },
      statusPagamento: 'EMITIDO',
      dataEmissao: new Date().toISOString().split('T')[0],
    };
  }

  // --------------------------------------------------------------------------
  // MODO 3: FOLHA MENSAL / COMPLEMENTAR
  // --------------------------------------------------------------------------

  // 1. Salário Base / Pró-labore / Bolsa-Auxílio Estágio
  itens.push({
    rubricaCodigo: ehDiretor ? '908' : '0001',
    descricao: ehDiretor ? 'Pró-Labore' : ehEstagio ? 'Bolsa-Auxílio Estágio' : 'Salário Mensal Contratual',
    tipo: 'PROVENTO',
    referencia: ehDiretor ? '30 dia(s)' : '30D',
    provento: salarioBase,
    desconto: 0,
    memoriaCalculo: {
      titulo: ehDiretor ? 'Remuneração de Pró-Labore' : ehEstagio ? 'Bolsa-Auxílio de Estágio (Lei 11.788/08)' : 'Salário Base Mensal',
      formula: ehDiretor ? 'Valor fixado em contrato social / ata para o diretor' : 'Valor nominal contratado para jornada de 30 dias comerciais',
      passoAPasso: [
        `${ehDiretor ? 'Pró-Labore contratual fixado' : 'Salário base mensal fixo'}: R$ ${salarioBase.toFixed(2)}`,
        ehDiretor
          ? 'Remuneração de sócio/diretor sem vínculo empregatício CLT (11% INSS contribuinte individual; sem FGTS).'
          : ehEstagio
          ? 'Vínculo de estágio (Lei 11.788/2008): não incide INSS nem FGTS obrigatório.'
          : `Jornada: ${empregado.jornadaHorasSemanais || 44}h semanais (divisor ${divisor}h)`
      ],
      baseCalculo: salarioBase,
      aliquotasOuFatores: { divisor },
      fundamentoLegal: ehDiretor ? 'Lei 8.212/1991, Art. 12, V, f' : ehEstagio ? 'Lei nº 11.788/2008' : 'Art. 457 e 458 da CLT'
    }
  });

  // 1b. Adicionais Permanentes Cadastrados no Empregado (Periculosidade 30% / Insalubridade 10%, 20%, 40%)
  const temPericulosidadeManual = lancamentos.some(l => l.rubricaCodigo === '0106');
  if (empregado.adicionalPericulosidade && !temPericulosidadeManual && !ehDiretor && !ehEstagio) {
    const valPeric = Math.round(salarioBase * 0.30 * 100) / 100;
    itens.push({
      rubricaCodigo: '0106',
      descricao: 'Adicional de Periculosidade (30%)',
      tipo: 'PROVENTO',
      referencia: '30%',
      provento: valPeric,
      desconto: 0,
      memoriaCalculo: {
        titulo: 'Adicional de Periculosidade (30% s/ Salário Base)',
        formula: 'Salário Base × 30%',
        passoAPasso: [
          `Salário Base contratual: R$ ${salarioBase.toFixed(2)}`,
          `Alíquota legal fixa (Art. 193 § 1º CLT): 30%`,
          `Cálculo: R$ ${salarioBase.toFixed(2)} × 30% = R$ ${valPeric.toFixed(2)}`
        ],
        baseCalculo: salarioBase,
        aliquotasOuFatores: { percentual: 30 },
        fundamentoLegal: 'Art. 193, § 1º da CLT e Súmula nº 191 do TST'
      }
    });
  }

  const temInsalubManual = lancamentos.some(l => ['0107', '0108', '0109'].includes(l.rubricaCodigo));
  if (empregado.adicionalInsalubridade && empregado.adicionalInsalubridade !== 'NENHUMA' && !temInsalubManual && !ehDiretor && !ehEstagio) {
    const percInsalub =
      empregado.adicionalInsalubridade === 'MAXIMO_40'
        ? 40
        : empregado.adicionalInsalubridade === 'MEDIO_20'
        ? 20
        : 10;
    const codInsalub = percInsalub === 40 ? '0109' : percInsalub === 20 ? '0108' : '0107';
    const valInsalub = Math.round(SALARIO_MINIMO_NACIONAL * (percInsalub / 100) * 100) / 100;
    itens.push({
      rubricaCodigo: codInsalub,
      descricao: `Adicional de Insalubridade (${percInsalub}%)`,
      tipo: 'PROVENTO',
      referencia: `${percInsalub}%`,
      provento: valInsalub,
      desconto: 0,
      memoriaCalculo: {
        titulo: `Adicional de Insalubridade Grau ${percInsalub === 40 ? 'Máximo' : percInsalub === 20 ? 'Médio' : 'Mínimo'} (${percInsalub}%)`,
        formula: 'Salário Mínimo Nacional × Percentual do Grau',
        passoAPasso: [
          `Salário Mínimo Nacional 2026: R$ ${SALARIO_MINIMO_NACIONAL.toFixed(2)}`,
          `Grau apurado em laudo LTCAT/PPRA: ${percInsalub}%`,
          `Cálculo: R$ ${SALARIO_MINIMO_NACIONAL.toFixed(2)} × ${percInsalub}% = R$ ${valInsalub.toFixed(2)}`
        ],
        baseCalculo: SALARIO_MINIMO_NACIONAL,
        aliquotasOuFatores: { salarioMinimo: SALARIO_MINIMO_NACIONAL, percentual: percInsalub },
        fundamentoLegal: 'Art. 192 da CLT e Súmula Vinculante nº 4 do STF'
      }
    });
  }

  let baseReflexoDSRValor = 0;

  // 2. Processamento dos lançamentos variáveis da competência
  for (const lancamento of lancamentos) {
    const descricaoEvento = (lancamento.descricao || '').trim();
    const refNum = Number(lancamento.referencia) || 0;
    const valInformado = Number(lancamento.valor) || 0;

    if (lancamento.rubricaCodigo === '0101') {
      const qtdHoras = refNum;
      const valorHoraExtra = valInformado > 0 ? Math.round(valInformado * 100) / 100 : Math.round((salarioHora * 1.50 * qtdHoras) * 100) / 100;
      baseReflexoDSRValor += valorHoraExtra;

      itens.push({
        rubricaCodigo: '0101',
        descricao: descricaoEvento || 'Horas Extras 50%',
        tipo: 'PROVENTO',
        referencia: `${qtdHoras}h`,
        provento: valorHoraExtra,
        desconto: 0,
        memoriaCalculo: {
          titulo: descricaoEvento || 'Hora Extra 50% Diurna',
          formula: '(Salário Base ÷ Divisor) × 1,50 × Quantidade de Horas',
          passoAPasso: [
            `Salário Base: R$ ${salarioBase.toFixed(2)}`,
            `Divisor de Horas: ${divisor} horas`,
            `Salário-hora ordinário: R$ ${salarioHora.toFixed(4)}`,
            `Adicional de 50%: R$ ${salarioHora.toFixed(4)} × 1,50 = R$ ${(salarioHora * 1.5).toFixed(4)}/hora`,
            `Horas apuradas: ${qtdHoras} horas`,
            `Resultado: R$ ${valorHoraExtra.toFixed(2)}`
          ],
          baseCalculo: salarioBase,
          aliquotasOuFatores: { salarioHora: salarioHora.toFixed(4), adicional: '50%', multiplicador: 1.5, horas: qtdHoras },
          fundamentoLegal: 'Art. 59 da CLT e Art. 7º, XVI da CF/88'
        }
      });
    } else if (lancamento.rubricaCodigo === '0102') {
      const qtdHoras = refNum;
      const valorHoraExtra = valInformado > 0 ? Math.round(valInformado * 100) / 100 : Math.round((salarioHora * 2.00 * qtdHoras) * 100) / 100;
      baseReflexoDSRValor += valorHoraExtra;

      itens.push({
        rubricaCodigo: '0102',
        descricao: descricaoEvento || 'Horas Extras 100% (Domingos/Feriados)',
        tipo: 'PROVENTO',
        referencia: `${qtdHoras}h`,
        provento: valorHoraExtra,
        desconto: 0,
        memoriaCalculo: {
          titulo: descricaoEvento || 'Hora Extra 100% em Domingos e Feriados',
          formula: '(Salário Base ÷ Divisor) × 2,00 × Quantidade de Horas',
          passoAPasso: [
            `Salário Base: R$ ${salarioBase.toFixed(2)}`,
            `Salário-hora ordinário: R$ ${salarioHora.toFixed(4)}`,
            `Adicional de 100%: R$ ${salarioHora.toFixed(4)} × 2,00 = R$ ${(salarioHora * 2.0).toFixed(4)}/hora`,
            `Horas apuradas: ${qtdHoras} horas`,
            `Resultado: R$ ${valorHoraExtra.toFixed(2)}`
          ],
          baseCalculo: salarioBase,
          aliquotasOuFatores: { salarioHora: salarioHora.toFixed(4), adicional: '100%', multiplicador: 2.0, horas: qtdHoras },
          fundamentoLegal: 'Art. 9º da Lei nº 605/49 e Súmula 146 do TST'
        }
      });
    } else if (lancamento.rubricaCodigo === '0103') {
      const qtdHoras = refNum;
      const horasFictas = qtdHoras * PERCENTUAIS_TRABALHISTAS.fatorHoraNoturnaFicta;
      const valorNoturno = valInformado > 0 ? Math.round(valInformado * 100) / 100 : Math.round((salarioHora * 0.20 * horasFictas) * 100) / 100;
      baseReflexoDSRValor += valorNoturno;

      itens.push({
        rubricaCodigo: '0103',
        descricao: descricaoEvento || 'Adicional Noturno 20%',
        tipo: 'PROVENTO',
        referencia: `${qtdHoras}h`,
        provento: valorNoturno,
        desconto: 0,
        memoriaCalculo: {
          titulo: descricaoEvento || 'Adicional Noturno Urbano com Redução Ficta',
          formula: '(Salário-hora × 20%) × (Horas relógio × 60 ÷ 52,5)',
          passoAPasso: [
            `Horas noturnas no relógio (22h às 05h): ${qtdHoras} horas`,
            `Conversão da hora reduzida (Art. 73 §1º CLT): ${qtdHoras} × 1,142857 = ${horasFictas.toFixed(2)} horas`,
            `Salário-hora: R$ ${salarioHora.toFixed(4)}`,
            `Adicional noturno unitário (20%): R$ ${(salarioHora * 0.2).toFixed(4)}`,
            `Resultado: R$ ${valorNoturno.toFixed(2)}`
          ],
          baseCalculo: salarioBase,
          aliquotasOuFatores: { percentual: '20%', horaFictaFator: '1.142857 (52min30s)' },
          fundamentoLegal: 'Art. 73 da CLT e Súmula 60 do TST'
        }
      });
    } else if (lancamento.rubricaCodigo === '0114') {
      const qtdHoras = refNum;
      const horasFictas = qtdHoras * PERCENTUAIS_TRABALHISTAS.fatorHoraNoturnaFicta;
      const valorHENot = valInformado > 0 ? Math.round(valInformado * 100) / 100 : Math.round((salarioHora * 1.80 * horasFictas) * 100) / 100;
      baseReflexoDSRValor += valorHENot;

      itens.push({
        rubricaCodigo: '0114',
        descricao: descricaoEvento || 'Horas Extras Noturnas (50% + 20%)',
        tipo: 'PROVENTO',
        referencia: `${qtdHoras}h`,
        provento: valorHENot,
        desconto: 0,
        memoriaCalculo: {
          titulo: descricaoEvento || 'Hora Extra Noturna Integrada (OJ 97 SDI-1 TST)',
          formula: '(Salário-hora × 1,20 × 1,50) × (Horas × 60 ÷ 52,5)',
          passoAPasso: [
            `Hora noturna com 20%: R$ ${(salarioHora * 1.2).toFixed(4)}`,
            `Aplicação de +50% sobre a hora noturna: R$ ${(salarioHora * 1.8).toFixed(4)}`,
            `Horas reduzidas (52min30s): ${horasFictas.toFixed(2)} horas`,
            `Resultado: R$ ${valorHENot.toFixed(2)}`
          ],
          baseCalculo: salarioBase,
          aliquotasOuFatores: { multiplicadorCombinado: '1,80x (20% + 50%)', horaFicta: '1,142857' },
          fundamentoLegal: 'Art. 59 e Art. 73 CLT + OJ 97 SDI-1 TST'
        }
      });
    } else if (lancamento.rubricaCodigo === '0201') {
      const diasFalta = refNum;
      const valorFalta = valInformado > 0 ? Math.round(valInformado * 100) / 100 : Math.round((salarioDia * diasFalta) * 100) / 100;

      itens.push({
        rubricaCodigo: '0201',
        descricao: descricaoEvento || 'Faltas Injustificadas',
        tipo: 'DESCONTO',
        referencia: `${diasFalta}D`,
        provento: 0,
        desconto: valorFalta,
        memoriaCalculo: {
          titulo: descricaoEvento || 'Desconto de Faltas Injustificadas',
          formula: '(Salário Base ÷ 30) × Dias de Falta',
          passoAPasso: [
            `Salário Base: R$ ${salarioBase.toFixed(2)}`,
            `Salário-dia: R$ ${salarioDia.toFixed(4)}`,
            `Dias de ausência injustificada: ${diasFalta}`,
            `Cálculo: R$ ${valorFalta.toFixed(2)}`
          ],
          baseCalculo: salarioBase,
          aliquotasOuFatores: { diasFalta, salarioDia: salarioDia.toFixed(2) },
          fundamentoLegal: 'Art. 473 da CLT e Art. 6º da Lei 605/49'
        }
      });

      const temDSRFaltaManual = lancamentos.some(l => l.rubricaCodigo === '0202');
      if (!temDSRFaltaManual) {
        const valorDSRPerdido = Math.round((salarioDia * Math.min(diasFalta, 4)) * 100) / 100;
        itens.push({
          rubricaCodigo: '0202',
          descricao: 'DSR s/ Faltas (Perda Descanso Remunerado)',
          tipo: 'DESCONTO',
          referencia: `${Math.min(diasFalta, 4)}D`,
          provento: 0,
          desconto: valorDSRPerdido,
          memoriaCalculo: {
            titulo: 'Perda do DSR por Inassiduidade na Semana',
            formula: 'Salário-dia × Semanas com Falta',
            passoAPasso: [
              `A ausência injustificada na semana acarreta a perda do repouso semanal remunerado.`,
              `Dias de DSR descontados: ${Math.min(diasFalta, 4)}`,
              `Cálculo: R$ ${salarioDia.toFixed(2)} × ${Math.min(diasFalta, 4)} = R$ ${valorDSRPerdido.toFixed(2)}`
            ],
            baseCalculo: salarioBase,
            aliquotasOuFatores: { diasPerda: Math.min(diasFalta, 4) },
            fundamentoLegal: 'Art. 6º da Lei nº 605/49'
          }
        });
      }
    } else if (lancamento.rubricaCodigo === '0105') {
      const valorItem = valInformado > 0
        ? Math.round(valInformado * 100) / 100
        : lancamento.unidadeReferencia === 'PERCENTUAL'
        ? Math.round((salarioBase * (refNum / 100)) * 100) / 100
        : Math.round(refNum * 100) / 100;
      baseReflexoDSRValor += valorItem;

      itens.push({
        rubricaCodigo: '0105',
        descricao: descricaoEvento || 'Comissões / Gratificação',
        tipo: 'PROVENTO',
        referencia: lancamento.unidadeReferencia === 'PERCENTUAL' ? `${refNum}%` : '100%',
        provento: valorItem,
        desconto: 0,
        memoriaCalculo: {
          titulo: descricaoEvento || 'Comissões e Prêmios de Produtividade',
          formula: 'Valor apurado ou % sobre o Salário Base',
          passoAPasso: [
            `Valor apurado: R$ ${valorItem.toFixed(2)}`,
            `Incide integralmente para INSS, FGTS, IRRF e DSR (Súmula 27 TST).`
          ],
          baseCalculo: valorItem,
          aliquotasOuFatores: { valor: valorItem },
          fundamentoLegal: 'Art. 457, § 1º da CLT e Súmula nº 27 do TST'
        }
      });
    } else {
      const rubricaMeta = RUBRICAS_SISTEMA.find(r => r.codigo === lancamento.rubricaCodigo);
      const tipoRubrica: 'PROVENTO' | 'DESCONTO' =
        rubricaMeta?.tipo === 'DESCONTO' ||
        (!rubricaMeta && /^(02|03|09|3)/.test(lancamento.rubricaCodigo || ''))
          ? 'DESCONTO'
          : 'PROVENTO';

      const valorCalculado =
        valInformado > 0
          ? Math.round(valInformado * 100) / 100
          : calcularValorRubricaEvento({
              rubricaCodigo: lancamento.rubricaCodigo,
              referencia: refNum,
              unidadeReferencia: lancamento.unidadeReferencia || 'VALOR',
              valorManual: valInformado,
              empregado,
            });

      if (valorCalculado > 0) {
        const refDisplay =
          lancamento.unidadeReferencia === 'PERCENTUAL'
            ? `${refNum}%`
            : lancamento.unidadeReferencia === 'DIAS'
            ? `${refNum}D`
            : lancamento.unidadeReferencia === 'HORAS'
            ? `${refNum}h`
            : rubricaMeta?.percentualPadrao
            ? `${rubricaMeta.percentualPadrao}%`
            : '100%';

        itens.push({
          rubricaCodigo: lancamento.rubricaCodigo || '0105',
          descricao: descricaoEvento || rubricaMeta?.descricao || 'Evento Variável',
          tipo: tipoRubrica,
          referencia: refDisplay,
          provento: tipoRubrica === 'PROVENTO' ? valorCalculado : 0,
          desconto: tipoRubrica === 'DESCONTO' ? valorCalculado : 0,
          memoriaCalculo: {
            titulo: descricaoEvento || rubricaMeta?.descricao || 'Evento Variável da Folha',
            formula: rubricaMeta?.formulaResumo || 'Cálculo conforme parametrização legal da rubrica',
            passoAPasso: [
              `Rubrica: ${lancamento.rubricaCodigo} - ${descricaoEvento || rubricaMeta?.descricao || 'Evento Variável'}`,
              `Referência: ${refDisplay}`,
              `Valor apurado: R$ ${valorCalculado.toFixed(2)}`,
              `Incidências: INSS(${rubricaMeta?.incideINSS ? 'Sim' : 'Não'}) | IRRF(${rubricaMeta?.incideIRRF ? 'Sim' : 'Não'}) | FGTS(${rubricaMeta?.incideFGTS ? 'Sim' : 'Não'})`,
              lancamento.observacao ? `Observação: ${lancamento.observacao}` : `Origem: ${lancamento.origem || 'MANUAL'}`
            ],
            baseCalculo: valorCalculado,
            aliquotasOuFatores: {
              referencia: refNum,
              unidade: lancamento.unidadeReferencia || 'VALOR',
              percentualLegal: rubricaMeta?.percentualPadrao ? `${rubricaMeta.percentualPadrao}%` : 'Variável',
            },
            fundamentoLegal: rubricaMeta?.baseCalculoLegal || 'Art. 457 e 462 da CLT'
          }
        });
      }
    }
  }

  // 3. DSR sobre Horas Extras, Adicional Noturno e Comissões (se não lançado manualmente)
  const temDSRManual = lancamentos.some(l => l.rubricaCodigo === '0104');
  if (baseReflexoDSRValor > 0 && !temDSRManual) {
    const diasUteis = 25;
    const domingosEFeriados = 5;
    const valorDSR = Math.round(((baseReflexoDSRValor / diasUteis) * domingosEFeriados) * 100) / 100;

    itens.push({
      rubricaCodigo: '0104',
      descricao: 'D.S.R. sobre Horas Extras e Adicionais',
      tipo: 'PROVENTO',
      referencia: `${domingosEFeriados}/${diasUteis}`,
      provento: valorDSR,
      desconto: 0,
      memoriaCalculo: {
        titulo: 'Descanso Semanal Remunerado s/ Horas Extras, Noturno e Comissões',
        formula: '(Base Variável ÷ Dias Úteis) × Domingos e Feriados',
        passoAPasso: [
          `Soma de Horas Extras + Adicional Noturno + Comissões: R$ ${baseReflexoDSRValor.toFixed(2)}`,
          `Dias úteis considerados: ${diasUteis} | Domingos e feriados: ${domingosEFeriados}`,
          `Cálculo: (R$ ${baseReflexoDSRValor.toFixed(2)} ÷ ${diasUteis}) × ${domingosEFeriados} = R$ ${valorDSR.toFixed(2)}`
        ],
        baseCalculo: baseReflexoDSRValor,
        aliquotasOuFatores: { diasUteis, domingosEFeriados },
        fundamentoLegal: 'Art. 7º da Lei nº 605/49, Súmula 172 e Súmula 27 do TST'
      }
    });
  }

  // 4. Benefícios Contratuais (Vale Transporte até 6% & Vale Refeição PAT até 20%)
  const temVTManual = lancamentos.some(l => l.rubricaCodigo === '0301');
  const temVRManual = lancamentos.some(l => l.rubricaCodigo === '0302');

  for (const beneficio of (empregado.beneficios || [])) {
    if (!beneficio.ativo) continue;

    if (beneficio.tipo === 'VALE_TRANSPORTE' && !temVTManual) {
      const tetoDescontoVT = salarioBase * 0.06;
      const valorDescontoVT = Math.min(tetoDescontoVT, beneficio.valorBeneficio);
      const valorArredondado = Math.round(valorDescontoVT * 100) / 100;

      if (valorArredondado > 0) {
        itens.push({
          rubricaCodigo: '0301',
          descricao: 'Vale Transporte (Participação Colaborador — 6%)',
          tipo: 'DESCONTO',
          referencia: '6%',
          provento: 0,
          desconto: valorArredondado,
          memoriaCalculo: {
            titulo: 'Desconto Legal de Vale Transporte (Art. 4º Lei 7.418/85)',
            formula: 'Menor valor entre 6% do Salário Base e o Custo do Benefício',
            passoAPasso: [
              `Salário Base: R$ ${salarioBase.toFixed(2)}`,
              `Limite legal de 6%: R$ ${(salarioBase * 0.06).toFixed(2)}`,
              `Custo total dos vales fornecidos: R$ ${beneficio.valorBeneficio.toFixed(2)}`,
              `Valor aplicado (menor valor): R$ ${valorArredondado.toFixed(2)}`
            ],
            baseCalculo: salarioBase,
            aliquotasOuFatores: { percentual: '6%', custoTotal: beneficio.valorBeneficio },
            fundamentoLegal: 'Art. 4º, Parágrafo Único da Lei nº 7.418/1985'
          }
        });
      }
    } else if (beneficio.tipo === 'VALE_REFEICAO' && beneficio.descontoEmpregado > 0 && !temVRManual) {
      const tetoPAT = beneficio.valorBeneficio > 0 ? beneficio.valorBeneficio * 0.20 : beneficio.descontoEmpregado;
      const descontoPAT = Math.round(Math.min(beneficio.descontoEmpregado, tetoPAT) * 100) / 100;
      itens.push({
        rubricaCodigo: '0302',
        descricao: 'Vale Refeição (Coparticipação PAT — até 20%)',
        tipo: 'DESCONTO',
        referencia: 'PAT',
        provento: 0,
        desconto: descontoPAT,
        memoriaCalculo: {
          titulo: 'Desconto de Coparticipação em Alimentação/Refeição (PAT)',
          formula: 'Coparticipação limitada a até 20% do custo do benefício (PAT)',
          passoAPasso: [
            `Valor total do benefício fornecido: R$ ${beneficio.valorBeneficio.toFixed(2)}`,
            `Teto legal PAT (20%): R$ ${tetoPAT.toFixed(2)}`,
            `Coparticipação aplicada: R$ ${descontoPAT.toFixed(2)}`
          ],
          baseCalculo: beneficio.valorBeneficio,
          aliquotasOuFatores: { tetoPercentualPAT: '20%', descontoAplicado: descontoPAT },
          fundamentoLegal: 'Lei nº 6.321/1976 e Decreto nº 10.854/2021 (PAT)'
        }
      });
    }
  }

  // 5. Apuração preliminar das Bases Tributáveis (para Salário-Família, INSS, Pensão e IRRF)
  let baseINSS = 0;
  let baseIRRFBruta = 0;
  let baseFGTS = 0;
  let deducoesPensaoIRRF = 0;
  let somaProventos = 0;

  for (const item of itens) {
    const rubricaMeta = RUBRICAS_SISTEMA.find(r => r.codigo === item.rubricaCodigo);
    if (item.tipo === 'PROVENTO') {
      somaProventos += item.provento;
      const incideINSS = rubricaMeta ? rubricaMeta.incideINSS : item.rubricaCodigo !== '0015' && item.rubricaCodigo !== '0020';
      const incideIRRF = rubricaMeta ? rubricaMeta.incideIRRF : item.rubricaCodigo !== '0015' && item.rubricaCodigo !== '0020';
      const incideFGTS = rubricaMeta ? rubricaMeta.incideFGTS : item.rubricaCodigo !== '0015' && item.rubricaCodigo !== '0020';
      if (incideINSS) baseINSS += item.provento;
      if (incideIRRF) baseIRRFBruta += item.provento;
      if (incideFGTS) baseFGTS += item.provento;
    } else if (item.tipo === 'DESCONTO') {
      if (rubricaMeta?.incideINSS || item.rubricaCodigo === '0201' || item.rubricaCodigo === '0202' || item.rubricaCodigo === '0203') {
        baseINSS = Math.max(0, baseINSS - item.desconto);
      }
      if (rubricaMeta?.incideIRRF || item.rubricaCodigo === '0201' || item.rubricaCodigo === '0202' || item.rubricaCodigo === '0203') {
        baseIRRFBruta = Math.max(0, baseIRRFBruta - item.desconto);
      }
      if (rubricaMeta?.incideFGTS || item.rubricaCodigo === '0201' || item.rubricaCodigo === '0202' || item.rubricaCodigo === '0203') {
        baseFGTS = Math.max(0, baseFGTS - item.desconto);
      }
      if (rubricaMeta?.dedutivelIRRF || item.rubricaCodigo === '0303') {
        deducoesPensaoIRRF += item.desconto;
      }
    }
  }

  // 5b. Salário-Família Automático (Portaria MPS/MF nº 13/2026: cota R$ 67,54 se remuneração <= R$ 1.980,38)
  const temSalarioFamiliaManual = lancamentos.some(l => l.rubricaCodigo === '0015');
  const dependentesSalarioFamilia = (empregado.dependentes || []).filter(d => d.salarioFamilia).length;
  const remuneracaoParaSalFam = baseINSS > 0 ? baseINSS : salarioBase;

  if (
    !temSalarioFamiliaManual &&
    dependentesSalarioFamilia > 0 &&
    !ehDiretor &&
    !ehEstagio &&
    remuneracaoParaSalFam <= LIMITE_SALARIO_FAMILIA
  ) {
    const valorSalarioFamilia = Math.round(dependentesSalarioFamilia * VALOR_COTA_SALARIO_FAMILIA * 100) / 100;
    somaProventos += valorSalarioFamilia;
    itens.push({
      rubricaCodigo: '0015',
      descricao: 'Salário-Família Previdenciário',
      tipo: 'PROVENTO',
      referencia: `${dependentesSalarioFamilia} cota(s)`,
      provento: valorSalarioFamilia,
      desconto: 0,
      memoriaCalculo: {
        titulo: 'Cota de Salário-Família da Previdência Social (2026)',
        formula: 'Quantidade de Filhos Elegíveis × R$ 67,54',
        passoAPasso: [
          `Remuneração considerada: R$ ${remuneracaoParaSalFam.toFixed(2)} (dentro do limite de R$ ${LIMITE_SALARIO_FAMILIA.toFixed(2)})`,
          `Filhos menores de 14 anos ou inválidos: ${dependentesSalarioFamilia}`,
          `Cota vigente em 2026: R$ ${VALOR_COTA_SALARIO_FAMILIA.toFixed(2)} por dependente`,
          `Cálculo: ${dependentesSalarioFamilia} × R$ ${VALOR_COTA_SALARIO_FAMILIA.toFixed(2)} = R$ ${valorSalarioFamilia.toFixed(2)}`
        ],
        baseCalculo: remuneracaoParaSalFam,
        aliquotasOuFatores: { cota: VALOR_COTA_SALARIO_FAMILIA, tetoElegibilidade: LIMITE_SALARIO_FAMILIA },
        fundamentoLegal: 'Art. 65 a 70 da Lei nº 8.213/91 e Portaria MPS/MF nº 13/2026'
      }
    });
  }

  // 6. Cálculo Determinístico do INSS (Estagiário não contribui compulsoriamente; Diretor = 11%; CLT/Aprendiz = Progressivo 2026)
  let valorDescontoINSS = 0;
  if (ehEstagio) {
    valorDescontoINSS = 0;
  } else if (ehDiretor) {
    const baseEfetivaINSS = Math.min(baseINSS, TETO_INSS);
    valorDescontoINSS = Math.min(TETO_INSS_CONTRIBUINTE_INDIVIDUAL, Math.round(baseEfetivaINSS * ALIQUOTA_INSS_CONTRIBUINTE_INDIVIDUAL * 100) / 100);
    itens.push({
      rubricaCodigo: '310',
      descricao: 'INSS Pró-Labore (11%)',
      tipo: 'DESCONTO',
      referencia: '11%',
      provento: 0,
      desconto: valorDescontoINSS,
      memoriaCalculo: {
        titulo: 'Contribuição Previdenciária do Contribuinte Individual (Pró-Labore)',
        formula: 'Base Pró-Labore (limitada ao teto de R$ 8.475,55) × 11%',
        passoAPasso: [
          `Base apurada: R$ ${baseINSS.toFixed(2)}`,
          `Teto previdenciário 2026: R$ ${TETO_INSS.toFixed(2)}`,
          `Alíquota fixa de 11%: R$ ${baseEfetivaINSS.toFixed(2)} × 11% = R$ ${valorDescontoINSS.toFixed(2)}`
        ],
        baseCalculo: baseEfetivaINSS,
        aliquotasOuFatores: { aliquota: '11%', teto: TETO_INSS },
        fundamentoLegal: 'Art. 21 e Art. 28, III da Lei nº 8.212/1991'
      }
    });
  } else {
    const calculoINSS = calcularINSSProgressivo(baseINSS);
    valorDescontoINSS = calculoINSS.valorTotal;
    itens.push({
      rubricaCodigo: '0901',
      descricao: 'INSS s/ Folha de Pagamento',
      tipo: 'DESCONTO',
      referencia: `${calculoINSS.aliquotaEfetiva.toFixed(2)}%`,
      provento: 0,
      desconto: calculoINSS.valorTotal,
      memoriaCalculo: {
        titulo: 'Contribuição Previdenciária Progressiva 2026 (EC 103/2019)',
        formula: 'Faixas progressivas 7,5% | 9% | 12% | 14% até o Teto R$ 8.475,55',
        passoAPasso: [
          `Base de incidência do INSS: R$ ${baseINSS.toFixed(2)}`,
          ...calculoINSS.passos,
          `Total retido: R$ ${calculoINSS.valorTotal.toFixed(2)} (Alíquota efetiva: ${calculoINSS.aliquotaEfetiva.toFixed(2)}%)`
        ],
        baseCalculo: baseINSS,
        aliquotasOuFatores: { aliquotaEfetiva: `${calculoINSS.aliquotaEfetiva}%`, tetoBase: TETO_INSS, tetoDesconto: TETO_DESCONTO_INSS },
        fundamentoLegal: 'Art. 28 Lei 8.212/91, EC 103/2019 e Portaria MPS/MF nº 13/2026'
      }
    });
  }

  // 7. Pensão Alimentícia Configurada no Cadastro do Empregado (caso não lançada manualmente como 0303)
  const temPensaoManual = lancamentos.some(l => l.rubricaCodigo === '0303');
  if (!temPensaoManual) {
    let valorPensao = 0;
    if ((empregado.pensaoAlimenticiaValorFixo || 0) > 0) {
      valorPensao = Math.round(Number(empregado.pensaoAlimenticiaValorFixo) * 100) / 100;
    } else if ((empregado.pensaoAlimenticiaPercentual || 0) > 0) {
      const baseLiquidaAprox = Math.max(0, baseIRRFBruta - valorDescontoINSS);
      valorPensao = Math.round(baseLiquidaAprox * (Number(empregado.pensaoAlimenticiaPercentual) / 100) * 100) / 100;
    }
    if (valorPensao > 0) {
      deducoesPensaoIRRF += valorPensao;
      itens.push({
        rubricaCodigo: '0303',
        descricao: 'Pensão Alimentícia Judicial',
        tipo: 'DESCONTO',
        referencia: empregado.pensaoAlimenticiaPercentual ? `${empregado.pensaoAlimenticiaPercentual}%` : 'Judicial',
        provento: 0,
        desconto: valorPensao,
        memoriaCalculo: {
          titulo: 'Desconto de Pensão Alimentícia Judicial (Dedutível no IRRF)',
          formula: empregado.pensaoAlimenticiaPercentual
            ? `(Rendimentos - INSS) × ${empregado.pensaoAlimenticiaPercentual}%`
            : 'Valor fixo determinado em ofício judicial',
          passoAPasso: [
            `Valor apurado da pensão: R$ ${valorPensao.toFixed(2)}`,
            `Dedutível integralmente da base de IRRF (Art. 4º, II da Lei 9.250/95).`
          ],
          baseCalculo: Math.max(0, baseIRRFBruta - valorDescontoINSS),
          aliquotasOuFatores: { percentual: empregado.pensaoAlimenticiaPercentual || 'Fixo' },
          fundamentoLegal: 'Art. 529 do CPC e Art. 4º, II da Lei nº 9.250/1995'
        }
      });
    }
  }

  // 8. Cálculo Determinístico do IRRF 2026 (Lei 15.270/2025)
  const dependentesIRRF = (empregado.dependentes || []).filter(d => d.irrf).length;
  const calculoIRRF = calcularIRRF(baseIRRFBruta, valorDescontoINSS, dependentesIRRF, deducoesPensaoIRRF);

  if (calculoIRRF.valorTotal > 0) {
    itens.push({
      rubricaCodigo: '0902',
      descricao: 'IRRF s/ Salário',
      tipo: 'DESCONTO',
      referencia: `${calculoIRRF.aliquotaAplicada.toFixed(1)}%`,
      provento: 0,
      desconto: calculoIRRF.valorTotal,
      memoriaCalculo: {
        titulo: 'Imposto de Renda Retido na Fonte (IRRF 2026)',
        formula: '(Base Tributável × Alíquota) - Parcela a Deduzir - Redutor Lei 15.270/25',
        passoAPasso: [
          `Rendimentos tributáveis: R$ ${baseIRRFBruta.toFixed(2)}`,
          ...calculoIRRF.passos,
          `Valor retido do colaborador: R$ ${calculoIRRF.valorTotal.toFixed(2)}`
        ],
        baseCalculo: calculoIRRF.baseCalculo,
        aliquotasOuFatores: {
          aliquota: `${calculoIRRF.aliquotaAplicada}%`,
          deducaoTabela: calculoIRRF.deducaoAplicada,
          redutorLei15270: calculoIRRF.redutorLei15270,
          metodo: calculoIRRF.metodoUtilizado,
        },
        fundamentoLegal: 'Lei nº 7.713/1988 e Lei nº 15.270/2025 (Isenção até R$ 5.000,00)'
      }
    });
  }

  // 9. Totalizadores e Encargos Patronais
  let totalDescontos = 0;
  for (const item of itens) {
    if (item.tipo === 'DESCONTO') {
      totalDescontos += item.desconto;
    }
  }

  const valorLiquido = Math.max(0, Math.round((somaProventos - totalDescontos) * 100) / 100);

  // Encargos do Empregador (FGTS: 8% CLT, 2% Aprendiz, 0% Estágio/Diretor)
  const optanteFGTS = empregado.optanteFGTS !== false && !ehDiretor && !ehEstagio;
  const aliquotaFGTS = optanteFGTS ? (ehAprendiz ? 0.02 : (empregado.aliquotaFGTS || 0.08)) : 0;
  const fgtsDevidoEmpresa = optanteFGTS ? Math.round((baseFGTS * aliquotaFGTS) * 100) / 100 : 0;

  let inssPatronal = 0;
  let ratAjustado = 0;
  let terceiros = 0;

  if (empresa.regimeTributario !== 'SIMPLES_NACIONAL' && !ehEstagio) {
    inssPatronal = Math.round((baseINSS * 0.20) * 100) / 100;
    const ratEfetivo = !ehDiretor ? ((empresa.aliquotaRat || 2.0) / 100) * (empresa.fap || 1.0) : 0;
    ratAjustado = Math.round((baseINSS * ratEfetivo) * 100) / 100;
    terceiros = !ehDiretor ? Math.round((baseINSS * ((empresa.aliquotaTerceiros || 5.8) / 100)) * 100) / 100 : 0;
  }

  const totalEncargos = fgtsDevidoEmpresa + inssPatronal + ratAjustado + terceiros;

  return {
    id: `folha-${empregado.id}-${competencia}-${tipoFolha.toLowerCase()}`,
    empregadoId: empregado.id,
    matricula: empregado.matricula,
    nomeEmpregado: empregado.nomeCompleto,
    cargo: empregado.cargo,
    departamento: empregado.departamento,
    competencia,
    tipoFolha,
    salarioBase,
    itens,
    totalProventos: Math.round(somaProventos * 100) / 100,
    totalDescontos: Math.round(totalDescontos * 100) / 100,
    valorLiquido,
    bases: {
      baseINSS: !ehEstagio ? Math.round(baseINSS * 100) / 100 : 0,
      baseIRRF: Math.round(calculoIRRF.baseCalculo * 100) / 100,
      baseFGTS: optanteFGTS ? Math.round(baseFGTS * 100) / 100 : 0,
      baseSalarioFamilia: remuneracaoParaSalFam,
    },
    encargosEmpresa: {
      fgtsDevido: fgtsDevidoEmpresa,
      inssPatronal,
      ratAjustado,
      terceiros,
      totalEncargos: Math.round(totalEncargos * 100) / 100,
    },
    statusPagamento: 'EMITIDO',
    dataEmissao: new Date().toISOString().split('T')[0],
  };
}
