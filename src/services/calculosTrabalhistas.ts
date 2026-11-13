import { Empregado, ItemCalculadoFolha, FolhaEmpregado, Empresa, LancamentoVariavel } from '../types/dp';
import { RUBRICAS_SISTEMA } from '../data/initialData';

// Constantes vigentes da Legislação Trabalhista e Previdenciária Brasileira
export const TABELA_INSS_VIGENTE = [
  { limite: 1412.00, aliquota: 0.075, faixaNome: '1ª Faixa (até R$ 1.412,00)' },
  { limite: 2666.68, aliquota: 0.090, faixaNome: '2ª Faixa (R$ 1.412,01 até R$ 2.666,68)' },
  { limite: 4000.03, aliquota: 0.120, faixaNome: '3ª Faixa (R$ 2.666,69 até R$ 4.000,03)' },
  { limite: 7786.02, aliquota: 0.140, faixaNome: '4ª Faixa (R$ 4.000,04 até R$ 7.786,02)' },
];
export const TETO_INSS = 7786.02;
export const TETO_DESCONTO_INSS = 908.86;

export const DEDUCAO_IRRF_POR_DEPENDENTE = 189.59;
export const DESCONTO_SIMPLIFICADO_IRRF = 564.80; // Opção legal da MP 1.171/23 e Lei 14.663/23

export const TABELA_IRRF_VIGENTE = [
  { limite: 2259.20, aliquota: 0.000, deducao: 0.00, faixaNome: 'Isento até R$ 2.259,20' },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44, faixaNome: '7,5% (R$ 2.259,21 até R$ 2.826,65)' },
  { limite: 3751.05, aliquota: 0.150, deducao: 381.44, faixaNome: '15,0% (R$ 2.826,66 até R$ 3.751,05)' },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77, faixaNome: '22,5% (R$ 3.751,06 até R$ 4.664,68)' },
  { limite: Infinity, aliquota: 0.275, deducao: 896.00, faixaNome: '27,5% (Acima de R$ 4.664,68)' },
];

export const LIMITE_SALARIO_FAMILIA = 1819.26;
export const VALOR_COTA_SALARIO_FAMILIA = 62.04;

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
  metodoUtilizado: 'DEDUCOES_LEGAIS' | 'DESCONTO_SIMPLIFICADO';
  passos: string[];
}

/**
 * Calcula o INSS Progressivo conforme a Emenda Constitucional 103/2019
 */
export function calcularINSSProgressivo(baseINSS: number): ResultadoCalculoINSS {
  const baseTributavel = Math.min(baseINSS, TETO_INSS);
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
        base: Math.round(baseDaFaixa * 100) / 100,
        aliquota: aliquota * 100,
        valor: Math.round(valorFaixa * 100) / 100,
      });

      passos.push(
        `${faixaNome}: R$ ${baseDaFaixa.toFixed(2)} × ${(aliquota * 100).toFixed(1)}% = R$ ${valorFaixa.toFixed(2)}`
      );

      valorAnterior = limite;
    } else {
      break;
    }
  }

  // Teto de segurança
  totalINSS = Math.min(totalINSS, TETO_DESCONTO_INSS);
  const totalArredondado = Math.round(totalINSS * 100) / 100;
  const aliquotaEfetiva = baseINSS > 0 ? (totalArredondado / baseINSS) * 100 : 0;

  if (baseINSS > TETO_INSS) {
    passos.push(`Base ultrapassou o teto de R$ ${TETO_INSS.toFixed(2)}. Aplicação da contribuição máxima fixada em R$ ${TETO_DESCONTO_INSS.toFixed(2)}.`);
  }

  return {
    valorTotal: totalArredondado,
    aliquotaEfetiva: Math.round(aliquotaEfetiva * 100) / 100,
    passos,
    faixasCalculadas,
  };
}

/**
 * Calcula o IRRF com comparativo entre deduções legais e desconto simplificado
 */
export function calcularIRRF(
  baseBrutaIRRF: number,
  descontoINSS: number,
  quantidadeDependentes: number,
  outrasDeducoes: number = 0
): ResultadoCalculoIRRF {
  const passos: string[] = [];

  // Método 1: Deduções Legais (Previdência Oficial + Dependentes + Outras)
  const totalDeducaoDependentes = quantidadeDependentes * DEDUCAO_IRRF_POR_DEPENDENTE;
  const totalDeducoesLegais = descontoINSS + totalDeducaoDependentes + outrasDeducoes;
  const baseComDeducoesLegais = Math.max(0, baseBrutaIRRF - totalDeducoesLegais);

  // Método 2: Desconto Simplificado Mensal (R$ 564,80)
  const baseComDescontoSimplificado = Math.max(0, baseBrutaIRRF - DESCONTO_SIMPLIFICADO_IRRF);

  // Determina qual base é menor (mais vantajosa ao empregado)
  let baseEscolhida: number;
  let metodo: 'DEDUCOES_LEGAIS' | 'DESCONTO_SIMPLIFICADO';

  if (totalDeducoesLegais >= DESCONTO_SIMPLIFICADO_IRRF) {
    baseEscolhida = baseComDeducoesLegais;
    metodo = 'DEDUCOES_LEGAIS';
    passos.push(`Método adotado: DEDUÇÕES LEGAIS (Mais vantajoso ao colaborador).`);
    passos.push(`Total de deduções legais: R$ ${totalDeducoesLegais.toFixed(2)} (INSS: R$ ${descontoINSS.toFixed(2)} + ${quantidadeDependentes} dependente(s): R$ ${totalDeducaoDependentes.toFixed(2)}).`);
    passos.push(`Base tributável: R$ ${baseBrutaIRRF.toFixed(2)} - R$ ${totalDeducoesLegais.toFixed(2)} = R$ ${baseEscolhida.toFixed(2)}`);
  } else {
    baseEscolhida = baseComDescontoSimplificado;
    metodo = 'DESCONTO_SIMPLIFICADO';
    passos.push(`Método adotado: DESCONTO SIMPLIFICADO (Lei 14.663/2023 - R$ ${DESCONTO_SIMPLIFICADO_IRRF.toFixed(2)}).`);
    passos.push(`Deduções legais somaram apenas R$ ${totalDeducoesLegais.toFixed(2)}, sendo superadas pelo desconto simplificado.`);
    passos.push(`Base tributável: R$ ${baseBrutaIRRF.toFixed(2)} - R$ ${DESCONTO_SIMPLIFICADO_IRRF.toFixed(2)} = R$ ${baseEscolhida.toFixed(2)}`);
  }

  // Localiza a faixa na tabela progressiva do IRRF
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

  let imposto = 0;
  if (aliquota > 0) {
    imposto = Math.max(0, (baseEscolhida * aliquota) - parcelaDeducao);
    passos.push(`Faixa IRRF: ${faixaDescricao}`);
    passos.push(`Cálculo: (R$ ${baseEscolhida.toFixed(2)} × ${(aliquota * 100).toFixed(1)}%) - R$ ${parcelaDeducao.toFixed(2)} = R$ ${imposto.toFixed(2)}`);
  } else {
    passos.push(`Base tributável de R$ ${baseEscolhida.toFixed(2)} está dentro da faixa de isenção.`);
  }

  return {
    valorTotal: Math.round(imposto * 100) / 100,
    baseCalculo: Math.round(baseEscolhida * 100) / 100,
    aliquotaAplicada: aliquota * 100,
    deducaoAplicada: parcelaDeducao,
    metodoUtilizado: metodo,
    passos,
  };
}

/**
 * Calcula a folha mensal completa de um empregado com memória de cálculo determinística
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
  const salarioHora = empregado.salarioBase / divisor;
  const salarioDia = empregado.salarioBase / 30;

  if (tipoFolha === 'ADIANTAMENTO') {
    // Adiantamento salarial (geralmente 40% do salário base, sem incidência de INSS/IRRF no adiantamento)
    const percentual = empresa.configuracoesFolha?.percentualAdiantamento || 40;
    const valorAdiantamento = Math.round((empregado.salarioBase * (percentual / 100)) * 100) / 100;

    itens.push({
      rubricaCodigo: '0020',
      descricao: 'Adiantamento Salarial',
      tipo: 'PROVENTO',
      referencia: `${percentual}%`,
      provento: valorAdiantamento,
      desconto: 0,
      memoriaCalculo: {
        titulo: 'Adiantamento Salarial Quinzenal',
        formula: 'Salário Base × Percentual de Adiantamento',
        passoAPasso: [
          `Salário Base: R$ ${empregado.salarioBase.toFixed(2)}`,
          `Percentual contratual/normativo: ${percentual}%`,
          `Cálculo: R$ ${empregado.salarioBase.toFixed(2)} × ${percentual / 100} = R$ ${valorAdiantamento.toFixed(2)}`,
          `Nota: O adiantamento não sofre desconto de INSS nem IRRF no momento do pagamento, sendo descontado integralmente na folha mensal.`
        ],
        baseCalculo: empregado.salarioBase,
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
      salarioBase: empregado.salarioBase,
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

  // 1. Salário Base / Pró-labore
  const ehDiretor = empregado.vinculo === 'DIRETOR_ESTATUTARIO';
  itens.push({
    rubricaCodigo: ehDiretor ? '908' : '0001',
    descricao: ehDiretor ? 'Pro labore' : 'Salário Mensal Contratual',
    tipo: 'PROVENTO',
    referencia: ehDiretor ? '30 dia(s)' : '30D',
    provento: empregado.salarioBase,
    desconto: 0,
    memoriaCalculo: {
      titulo: ehDiretor ? 'Remuneração de Pró-Labore' : 'Salário Base Mensal',
      formula: ehDiretor ? 'Valor fixado em contrato social / ata para o diretor' : 'Valor nominal contratado para jornada de 30 dias comerciais',
      passoAPasso: [
        `${ehDiretor ? 'Pró-Labore contratual fixado' : 'Salário base mensal fixo'}: R$ ${empregado.salarioBase.toFixed(2)}`,
        ehDiretor ? 'Remuneração de sócio/diretor sem vínculo empregatício CLT (não incide FGTS por padrão).' : `Jornada: ${empregado.jornadaHorasSemanais}h semanais (divisor ${divisor}h)`
      ],
      baseCalculo: empregado.salarioBase,
      aliquotasOuFatores: { divisor },
      fundamentoLegal: ehDiretor ? 'Lei 8.212/1991, Art. 12, V, f' : 'Art. 457 e 458 da CLT'
    }
  });

  let totalHorasExtrasValor = 0;
  let totalAdicionaisValor = 0;
  let totalFaltasValor = 0;

  // 2. Processamento dos lançamentos variáveis da competência
  for (const lancamento of lancamentos) {
    const descricaoEvento = (lancamento.descricao || '').trim();
    const refNum = Number(lancamento.referencia) || 0;
    const valInformado = Number(lancamento.valor) || 0;

    if (lancamento.rubricaCodigo === '0101') {
      // Hora Extra 50%
      const qtdHoras = refNum;
      const valorHoraExtra = valInformado > 0 ? Math.round(valInformado * 100) / 100 : Math.round((salarioHora * 1.50 * qtdHoras) * 100) / 100;
      totalHorasExtrasValor += valorHoraExtra;

      itens.push({
        rubricaCodigo: '0101',
        descricao: descricaoEvento || 'Horas Extras 50%',
        tipo: 'PROVENTO',
        referencia: qtdHoras,
        provento: valorHoraExtra,
        desconto: 0,
        memoriaCalculo: {
          titulo: descricaoEvento || 'Hora Extra 50% Diurna',
          formula: '(Salário Base ÷ Divisor) × 1,50 × Quantidade de Horas',
          passoAPasso: [
            `Salário Base: R$ ${empregado.salarioBase.toFixed(2)}`,
            `Divisor de Horas: ${divisor} horas`,
            `Salário-hora ordinário: R$ ${salarioHora.toFixed(4)}`,
            `Adicional de 50%: R$ ${salarioHora.toFixed(4)} × 1,50 = R$ ${(salarioHora * 1.5).toFixed(4)}/hora`,
            `Horas apuradas: ${qtdHoras} horas`,
            `Resultado: R$ ${valorHoraExtra.toFixed(2)}`
          ],
          baseCalculo: empregado.salarioBase,
          aliquotasOuFatores: { salarioHora: salarioHora.toFixed(4), multiplicador: 1.5, horas: qtdHoras },
          fundamentoLegal: 'Art. 59 da CLT e Art. 7º, XVI da CF/88'
        }
      });
    } else if (lancamento.rubricaCodigo === '0102') {
      // Hora Extra 100%
      const qtdHoras = refNum;
      const valorHoraExtra = valInformado > 0 ? Math.round(valInformado * 100) / 100 : Math.round((salarioHora * 2.00 * qtdHoras) * 100) / 100;
      totalHorasExtrasValor += valorHoraExtra;

      itens.push({
        rubricaCodigo: '0102',
        descricao: descricaoEvento || 'Horas Extras 100% (Domingos/Feriados)',
        tipo: 'PROVENTO',
        referencia: qtdHoras,
        provento: valorHoraExtra,
        desconto: 0,
        memoriaCalculo: {
          titulo: descricaoEvento || 'Hora Extra 100% em Domingos e Feriados',
          formula: '(Salário Base ÷ Divisor) × 2,00 × Quantidade de Horas',
          passoAPasso: [
            `Salário Base: R$ ${empregado.salarioBase.toFixed(2)}`,
            `Salário-hora ordinário: R$ ${salarioHora.toFixed(4)}`,
            `Adicional de 100%: R$ ${salarioHora.toFixed(4)} × 2,00 = R$ ${(salarioHora * 2.0).toFixed(4)}/hora`,
            `Horas apuradas: ${qtdHoras} horas`,
            `Resultado: R$ ${valorHoraExtra.toFixed(2)}`
          ],
          baseCalculo: empregado.salarioBase,
          aliquotasOuFatores: { salarioHora: salarioHora.toFixed(4), multiplicador: 2.0, horas: qtdHoras },
          fundamentoLegal: 'Art. 9º da Lei nº 605/49 e Súmula 146 do TST'
        }
      });
    } else if (lancamento.rubricaCodigo === '0103') {
      // Adicional Noturno 20%
      const qtdHoras = refNum;
      // Fator de redução da hora noturna (60 / 52.5 = 1.142857)
      const horasFictas = qtdHoras * (60 / 52.5);
      const valorNoturno = valInformado > 0 ? Math.round(valInformado * 100) / 100 : Math.round((salarioHora * 0.20 * horasFictas) * 100) / 100;
      totalAdicionaisValor += valorNoturno;

      itens.push({
        rubricaCodigo: '0103',
        descricao: descricaoEvento || 'Adicional Noturno 20%',
        tipo: 'PROVENTO',
        referencia: qtdHoras,
        provento: valorNoturno,
        desconto: 0,
        memoriaCalculo: {
          titulo: descricaoEvento || 'Adicional Noturno Urbano com Redução Ficta',
          formula: '(Salário-hora × 20%) × (Horas relógio × 60 ÷ 52,5)',
          passoAPasso: [
            `Horas noturnas no ponto: ${qtdHoras} horas`,
            `Conversão da hora reduzida (Art. 73 §1º CLT): ${qtdHoras} × 1,142857 = ${horasFictas.toFixed(2)} horas computadas`,
            `Salário-hora: R$ ${salarioHora.toFixed(4)}`,
            `Adicional noturno unitário (20%): R$ ${(salarioHora * 0.2).toFixed(4)}`,
            `Resultado: R$ ${valorNoturno.toFixed(2)}`
          ],
          baseCalculo: empregado.salarioBase,
          aliquotasOuFatores: { percentual: 20, horaFictaFator: 1.142857 },
          fundamentoLegal: 'Art. 73 da CLT e Súmula 60 do TST'
        }
      });
    } else if (lancamento.rubricaCodigo === '0201') {
      // Faltas Injustificadas
      const diasFalta = refNum;
      const valorFalta = valInformado > 0 ? Math.round(valInformado * 100) / 100 : Math.round((salarioDia * diasFalta) * 100) / 100;
      totalFaltasValor += valorFalta;

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
            `Salário Base: R$ ${empregado.salarioBase.toFixed(2)}`,
            `Salário-dia: R$ ${salarioDia.toFixed(4)}`,
            `Dias de ausência injustificada: ${diasFalta}`,
            `Cálculo: R$ ${valorFalta.toFixed(2)}`
          ],
          baseCalculo: empregado.salarioBase,
          aliquotasOuFatores: { diasFalta, salarioDia: salarioDia.toFixed(2) },
          fundamentoLegal: 'Art. 473 da CLT e Art. 6º da Lei 605/49'
        }
      });

      // Reflexo da falta no DSR (perda do descanso semanal remunerado da semana da falta)
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
            `A ausência injustificada no decorrer da semana acarreta a perda da remuneração do repouso semanal.`,
            `Dias de DSR descontados: ${Math.min(diasFalta, 4)}`,
            `Cálculo: R$ ${salarioDia.toFixed(2)} × ${Math.min(diasFalta, 4)} = R$ ${valorDSRPerdido.toFixed(2)}`
          ],
          baseCalculo: empregado.salarioBase,
          aliquotasOuFatores: { diasPerda: Math.min(diasFalta, 4) },
          fundamentoLegal: 'Art. 6º da Lei nº 605/49'
        }
      });
    } else if (lancamento.rubricaCodigo === '0105') {
      // Gratificações / Comissões
      const valorItem = valInformado > 0
        ? Math.round(valInformado * 100) / 100
        : lancamento.unidadeReferencia === 'PERCENTUAL'
        ? Math.round((empregado.salarioBase * (refNum / 100)) * 100) / 100
        : Math.round(refNum * 100) / 100;
      itens.push({
        rubricaCodigo: '0105',
        descricao: descricaoEvento || 'Comissões / Gratificação',
        tipo: 'PROVENTO',
        referencia: lancamento.unidadeReferencia === 'PERCENTUAL' ? `${refNum}%` : '100%',
        provento: valorItem,
        desconto: 0,
        memoriaCalculo: {
          titulo: descricaoEvento || 'Comissões e Prêmios de Produtividade',
          formula: 'Valor apurado ou declarado para a competência',
          passoAPasso: [
            `Valor informado pela empresa: R$ ${valorItem.toFixed(2)}`,
            `Origem: ${lancamento.origem || 'MANUAL'}`,
            `Incide integralmente para INSS, FGTS e IRRF.`
          ],
          baseCalculo: valorItem,
          aliquotasOuFatores: { valor: valorItem },
          fundamentoLegal: 'Art. 457, § 1º da CLT'
        }
      });
    } else {
      // Qualquer outra rubrica cadastrada/lançada manualmente (0015, 0020, 0104, 0202, 0301, 0302, 908, 310, etc.)
      const rubricaMeta = RUBRICAS_SISTEMA.find(r => r.codigo === lancamento.rubricaCodigo);
      const tipoRubrica: 'PROVENTO' | 'DESCONTO' =
        rubricaMeta?.tipo === 'DESCONTO' ||
        (!rubricaMeta && /^(02|03|09|3)/.test(lancamento.rubricaCodigo || ''))
          ? 'DESCONTO'
          : 'PROVENTO';

      let valorCalculado = valInformado;
      if (valorCalculado <= 0) {
        if (lancamento.unidadeReferencia === 'PERCENTUAL') {
          valorCalculado = empregado.salarioBase * (refNum / 100);
        } else if (lancamento.unidadeReferencia === 'DIAS') {
          valorCalculado = salarioDia * refNum;
        } else if (lancamento.unidadeReferencia === 'HORAS') {
          valorCalculado = salarioHora * refNum;
        } else {
          valorCalculado = refNum;
        }
      }
      valorCalculado = Math.round(valorCalculado * 100) / 100;

      if (valorCalculado > 0) {
        const refDisplay =
          lancamento.unidadeReferencia === 'PERCENTUAL'
            ? `${refNum}%`
            : lancamento.unidadeReferencia === 'DIAS'
            ? `${refNum}D`
            : lancamento.unidadeReferencia === 'HORAS'
            ? `${refNum}h`
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
            formula:
              lancamento.unidadeReferencia === 'PERCENTUAL'
                ? 'Salário Base × Percentual informado'
                : lancamento.unidadeReferencia === 'DIAS'
                ? '(Salário Base ÷ 30) × Dias informados'
                : lancamento.unidadeReferencia === 'HORAS'
                ? '(Salário Base ÷ Divisor) × Horas informadas'
                : 'Valor direto informado pelo operador',
            passoAPasso: [
              `Rubrica: ${lancamento.rubricaCodigo} - ${descricaoEvento || rubricaMeta?.descricao || 'Evento Variável'}`,
              `Referência informada: ${refNum} (${lancamento.unidadeReferencia || 'VALOR'})`,
              `Valor apurado: R$ ${valorCalculado.toFixed(2)}`,
              lancamento.observacao ? `Observação: ${lancamento.observacao}` : `Origem: ${lancamento.origem || 'MANUAL'}`
            ],
            baseCalculo: valorCalculado,
            aliquotasOuFatores: { referencia: refNum, unidade: lancamento.unidadeReferencia || 'VALOR' },
            fundamentoLegal: rubricaMeta?.baseCalculoLegal || 'Art. 457 e 462 da CLT'
          }
        });
      }
    }
  }

  // 3. DSR sobre Horas Extras (se houver HE apurada)
  if (totalHorasExtrasValor > 0) {
    // Estimativa de dias úteis padrão no mês: 25 úteis e 5 domingos/feriados
    const diasUteis = 25;
    const domingosEFeriados = 5;
    const valorDSRSobreHE = Math.round(((totalHorasExtrasValor / diasUteis) * domingosEFeriados) * 100) / 100;

    itens.push({
      rubricaCodigo: '0104',
      descricao: 'D.S.R. sobre Horas Extras',
      tipo: 'PROVENTO',
      referencia: `${domingosEFeriados}/${diasUteis}`,
      provento: valorDSRSobreHE,
      desconto: 0,
      memoriaCalculo: {
        titulo: 'Descanso Semanal Remunerado sobre Horas Extras',
        formula: '(Total de Horas Extras ÷ Dias Úteis) × Domingos e Feriados',
        passoAPasso: [
          `Total de Horas Extras no mês: R$ ${totalHorasExtrasValor.toFixed(2)}`,
          `Dias úteis do calendário da competência: ${diasUteis}`,
          `Domingos e feriados da competência: ${domingosEFeriados}`,
          `Cálculo: (R$ ${totalHorasExtrasValor.toFixed(2)} ÷ ${diasUteis}) × ${domingosEFeriados} = R$ ${valorDSRSobreHE.toFixed(2)}`
        ],
        baseCalculo: totalHorasExtrasValor,
        aliquotasOuFatores: { diasUteis, domingosEFeriados },
        fundamentoLegal: 'Art. 7º da Lei nº 605/49 e Súmula nº 172 do TST'
      }
    });
  }

  // 4. Benefícios Contratuais (Vale Transporte & Vale Refeição)
  for (const beneficio of (empregado.beneficios || [])) {
    if (!beneficio.ativo) continue;

    if (beneficio.tipo === 'VALE_TRANSPORTE') {
      // Lei 7.418/85: Desconto de até 6% do salário base ou o valor total do benefício concedido (o menor)
      const tetoDescontoVT = empregado.salarioBase * 0.06;
      const valorDescontoVT = Math.min(tetoDescontoVT, beneficio.valorBeneficio);
      const valorArredondado = Math.round(valorDescontoVT * 100) / 100;

      itens.push({
        rubricaCodigo: '0301',
        descricao: 'Vale Transporte (Participação Colaborador)',
        tipo: 'DESCONTO',
        referencia: '6%',
        provento: 0,
        desconto: valorArredondado,
        memoriaCalculo: {
          titulo: 'Desconto Legal de Vale Transporte',
          formula: 'Menor valor entre 6% do Salário Base e o Custo do Benefício',
          passoAPasso: [
            `Salário Base: R$ ${empregado.salarioBase.toFixed(2)}`,
            `Limite legal de 6%: R$ ${(empregado.salarioBase * 0.06).toFixed(2)}`,
            `Custo total dos vales fornecidos: R$ ${beneficio.valorBeneficio.toFixed(2)}`,
            `Valor aplicado (menor valor): R$ ${valorArredondado.toFixed(2)}`
          ],
          baseCalculo: empregado.salarioBase,
          aliquotasOuFatores: { percentual: 6, custoTotal: beneficio.valorBeneficio },
          fundamentoLegal: 'Art. 4º, Parágrafo Único da Lei nº 7.418/1985'
        }
      });
    } else if (beneficio.tipo === 'VALE_REFEICAO' && beneficio.descontoEmpregado > 0) {
      itens.push({
        rubricaCodigo: '0302',
        descricao: 'Vale Refeição (Coparticipação PAT)',
        tipo: 'DESCONTO',
        referencia: 'PAT',
        provento: 0,
        desconto: beneficio.descontoEmpregado,
        memoriaCalculo: {
          titulo: 'Desconto de Coparticipação em Alimentação/Refeição',
          formula: 'Participação do trabalhador autorizada no PAT',
          passoAPasso: [
            `Valor total do benefício fornecido: R$ ${beneficio.valorBeneficio.toFixed(2)}`,
            `Coparticipação pactuada do empregado: R$ ${beneficio.descontoEmpregado.toFixed(2)}`
          ],
          baseCalculo: beneficio.valorBeneficio,
          aliquotasOuFatores: { descontoFixo: beneficio.descontoEmpregado },
          fundamentoLegal: 'Lei nº 6.321/1976 (PAT)'
        }
      });
    }
  }

  // 5. Salário-Família (se elegível e remuneração <= limite)
  const dependentesSalarioFamilia = (empregado.dependentes || []).filter(d => d.salarioFamilia).length;
  if (dependentesSalarioFamilia > 0 && empregado.salarioBase <= LIMITE_SALARIO_FAMILIA) {
    const valorSalarioFamilia = dependentesSalarioFamilia * VALOR_COTA_SALARIO_FAMILIA;
    itens.push({
      rubricaCodigo: '0015',
      descricao: 'Salário-Família Previdenciário',
      tipo: 'PROVENTO',
      referencia: dependentesSalarioFamilia,
      provento: valorSalarioFamilia,
      desconto: 0,
      memoriaCalculo: {
        titulo: 'Cota de Salário-Família da Previdência Social',
        formula: 'Quantidade de Filhos Elegíveis × Valor da Cota Legal',
        passoAPasso: [
          `Remuneração mensal: R$ ${empregado.salarioBase.toFixed(2)} (abaixo do teto de R$ ${LIMITE_SALARIO_FAMILIA.toFixed(2)})`,
          `Filhos menores de 14 anos ou inválidos: ${dependentesSalarioFamilia}`,
          `Valor da cota: R$ ${VALOR_COTA_SALARIO_FAMILIA.toFixed(2)} por dependente`,
          `Cálculo: ${dependentesSalarioFamilia} × R$ ${VALOR_COTA_SALARIO_FAMILIA.toFixed(2)} = R$ ${valorSalarioFamilia.toFixed(2)}`,
          `Nota: O empregador paga na folha e deduz na DCTFWeb/Previdência.`
        ],
        baseCalculo: empregado.salarioBase,
        aliquotasOuFatores: { cota: VALOR_COTA_SALARIO_FAMILIA, qtdDependentes: dependentesSalarioFamilia },
        fundamentoLegal: 'Art. 65 a 70 da Lei nº 8.213/1991'
      }
    });
  }

  // 6. Apuração das Bases Tributáveis
  let baseINSS = 0;
  let baseFGTS = 0;
  let somaProventos = 0;
  let somaDescontosNaoFiscais = 0;

  for (const item of itens) {
    const rubricaMeta = RUBRICAS_SISTEMA.find(r => r.codigo === item.rubricaCodigo);
    if (item.tipo === 'PROVENTO') {
      somaProventos += item.provento;
      // Salário-família (0015) e Adiantamento (0020) não incidem INSS/FGTS
      const incideINSS = rubricaMeta ? rubricaMeta.incideINSS : item.rubricaCodigo !== '0015' && item.rubricaCodigo !== '0020';
      const incideFGTS = rubricaMeta ? rubricaMeta.incideFGTS : item.rubricaCodigo !== '0015' && item.rubricaCodigo !== '0020';
      if (incideINSS) baseINSS += item.provento;
      if (incideFGTS) baseFGTS += item.provento;
    } else if (item.tipo === 'DESCONTO') {
      somaDescontosNaoFiscais += item.desconto;
      // Faltas e descontos com incidência reduzem a base do INSS e FGTS
      if (item.rubricaCodigo === '0201' || item.rubricaCodigo === '0202' || rubricaMeta?.incideINSS) {
        baseINSS = Math.max(0, baseINSS - item.desconto);
      }
      if (item.rubricaCodigo === '0201' || item.rubricaCodigo === '0202' || rubricaMeta?.incideFGTS) {
        baseFGTS = Math.max(0, baseFGTS - item.desconto);
      }
    }
  }

  // 7. Cálculo Determinístico do INSS
  let valorDescontoINSS = 0;
  if (ehDiretor) {
    // Contribuinte Individual (Pró-labore): 11% fixo até o teto do INSS
    const baseEfetivaINSS = Math.min(baseINSS, TETO_INSS);
    valorDescontoINSS = Math.round(baseEfetivaINSS * 0.11 * 100) / 100;
    itens.push({
      rubricaCodigo: '310',
      descricao: 'INSS',
      tipo: 'DESCONTO',
      referencia: '11%',
      provento: 0,
      desconto: valorDescontoINSS,
      memoriaCalculo: {
        titulo: 'Contribuição Previdenciária do Contribuinte Individual (Pró-Labore)',
        formula: 'Base Pró-Labore (limitada ao teto) × 11%',
        passoAPasso: [
          `Base de incidência apurada: R$ ${baseINSS.toFixed(2)}`,
          `Limite máximo do salário de contribuição (Teto): R$ ${TETO_INSS.toFixed(2)}`,
          `Alíquota legal de 11% (Art. 21 da Lei 8.212/91): R$ ${baseEfetivaINSS.toFixed(2)} × 11% = R$ ${valorDescontoINSS.toFixed(2)}`
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
        titulo: 'Contribuição Previdenciária Progressiva (INSS Empregado)',
        formula: 'Soma das alíquotas marginais aplicadas a cada faixa salarial (EC 103/2019)',
        passoAPasso: [
          `Base de incidência do INSS apurada: R$ ${baseINSS.toFixed(2)}`,
          ...calculoINSS.passos,
          `Total retido do colaborador: R$ ${calculoINSS.valorTotal.toFixed(2)} (Alíquota efetiva média: ${calculoINSS.aliquotaEfetiva.toFixed(2)}%)`
        ],
        baseCalculo: baseINSS,
        aliquotasOuFatores: { aliquotaEfetiva: `${calculoINSS.aliquotaEfetiva}%`, teto: TETO_INSS },
        fundamentoLegal: 'Art. 28 da Lei 8.212/1991 e Emenda Constitucional nº 103/2019'
      }
    });
  }

  // 8. Cálculo Determinístico do IRRF
  const dependentesIRRF = (empregado.dependentes || []).filter(d => d.irrf).length;
  const calculoIRRF = calcularIRRF(baseINSS, valorDescontoINSS, dependentesIRRF);

  if (calculoIRRF.valorTotal > 0) {
    itens.push({
      rubricaCodigo: '0902',
      descricao: 'IRRF s/ Salário',
      tipo: 'DESCONTO',
      referencia: `${calculoIRRF.aliquotaAplicada.toFixed(1)}%`,
      provento: 0,
      desconto: calculoIRRF.valorTotal,
      memoriaCalculo: {
        titulo: 'Imposto de Renda Retido na Fonte (IRRF)',
        formula: '(Base Tributável × Alíquota) - Parcela a Deduzir',
        passoAPasso: [
          `Rendimentos tributáveis: R$ ${baseINSS.toFixed(2)}`,
          ...calculoIRRF.passos,
          `Valor retido do colaborador: R$ ${calculoIRRF.valorTotal.toFixed(2)}`
        ],
        baseCalculo: calculoIRRF.baseCalculo,
        aliquotasOuFatores: {
          aliquota: `${calculoIRRF.aliquotaAplicada}%`,
          deducao: calculoIRRF.deducaoAplicada,
          metodo: calculoIRRF.metodoUtilizado
        },
        fundamentoLegal: 'Lei nº 7.713/1988 e Lei nº 14.663/2023 (Desconto Simplificado)'
      }
    });
  }

  // 9. Totalizadores e Encargos da Empresa
  let totalDescontos = 0;
  for (const item of itens) {
    if (item.tipo === 'DESCONTO') {
      totalDescontos += item.desconto;
    }
  }

  const valorLiquido = Math.round((somaProventos - totalDescontos) * 100) / 100;

  // Encargos do Empregador (NÃO reduzem o líquido do empregado!)
  const optanteFGTS = empregado.optanteFGTS !== false && empregado.vinculo !== 'DIRETOR_ESTATUTARIO';
  const aliquotaFGTS = optanteFGTS ? (empregado.aliquotaFGTS || 0.08) : 0;
  const fgtsDevidoEmpresa = optanteFGTS ? Math.round((baseFGTS * aliquotaFGTS) * 100) / 100 : 0;

  // INSS Patronal conforme regime tributário
  let inssPatronal = 0;
  let ratAjustado = 0;
  let terceiros = 0;

  if (empresa.regimeTributario !== 'SIMPLES_NACIONAL') {
    // Lucro Presumido / Lucro Real: 20% Patronal + RAT × FAP + Outras entidades (ex: 5.8%)
    inssPatronal = Math.round((baseINSS * 0.20) * 100) / 100;
    const ratEfetivo = ((empresa.aliquotaRat || 2.0) / 100) * (empresa.fap || 1.0);
    ratAjustado = Math.round((baseINSS * ratEfetivo) * 100) / 100;
    terceiros = Math.round((baseINSS * ((empresa.aliquotaTerceiros || 5.8) / 100)) * 100) / 100;
  }

  const totalEncargos = fgtsDevidoEmpresa + inssPatronal + ratAjustado + terceiros;

  return {
    id: `folha-${empregado.id}-${competencia}-mensal`,
    empregadoId: empregado.id,
    matricula: empregado.matricula,
    nomeEmpregado: empregado.nomeCompleto,
    cargo: empregado.cargo,
    departamento: empregado.departamento,
    competencia,
    tipoFolha: 'MENSAL',
    salarioBase: empregado.salarioBase,
    itens,
    totalProventos: Math.round(somaProventos * 100) / 100,
    totalDescontos: Math.round(totalDescontos * 100) / 100,
    valorLiquido,
    bases: {
      baseINSS: Math.round(baseINSS * 100) / 100,
      baseIRRF: Math.round(calculoIRRF.baseCalculo * 100) / 100,
      baseFGTS: optanteFGTS ? Math.round(baseFGTS * 100) / 100 : 0,
      baseSalarioFamilia: empregado.salarioBase,
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
