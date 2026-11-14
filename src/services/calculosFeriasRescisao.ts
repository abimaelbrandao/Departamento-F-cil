import { Empregado, RescisaoSimulada, MotivoRescisao } from '../types/dp';
import {
  SALARIO_MINIMO_NACIONAL,
  TABELA_REDUCAO_FERIAS_FALTAS,
  PERCENTUAIS_TRABALHISTAS,
  calcularINSSProgressivo,
  calcularIRRF,
} from './calculosTrabalhistas';

/**
 * Calcula a remuneração base mensal incorporando adicionais habituais cadastrados no empregado
 * (Periculosidade 30% s/ Salário Base e Insalubridade 10%/20%/40% s/ Salário Mínimo Nacional)
 */
export function calcularRemuneracaoBaseComAdicionais(empregado: Empregado): number {
  const salarioBase = Number(empregado.salarioBase || 0);
  const ehDiretor = empregado.vinculo === 'DIRETOR_ESTATUTARIO';
  const ehEstagio = empregado.vinculo === 'ESTAGIO';
  if (ehDiretor || ehEstagio) return salarioBase;

  const peric = empregado.adicionalPericulosidade
    ? Math.round(salarioBase * (PERCENTUAIS_TRABALHISTAS.periculosidade / 100) * 100) / 100
    : 0;

  let insalub = 0;
  if (empregado.adicionalInsalubridade === 'MINIMO_10') {
    insalub = Math.round(SALARIO_MINIMO_NACIONAL * 0.10 * 100) / 100;
  } else if (empregado.adicionalInsalubridade === 'MEDIO_20') {
    insalub = Math.round(SALARIO_MINIMO_NACIONAL * 0.20 * 100) / 100;
  } else if (empregado.adicionalInsalubridade === 'MAXIMO_40') {
    insalub = Math.round(SALARIO_MINIMO_NACIONAL * 0.40 * 100) / 100;
  }

  return Math.round((salarioBase + peric + insalub) * 100) / 100;
}

/**
 * Tabela oficial de redução do direito a férias por faltas injustificadas (Art. 130 da CLT)
 */
export function diasFeriasPorFaltasCLT(faltasInjustificadas: number): number {
  const faltas = Math.max(0, Math.floor(Number(faltasInjustificadas) || 0));
  const faixa = TABELA_REDUCAO_FERIAS_FALTAS.find(
    f => faltas >= f.faltasMin && faltas <= f.faltasMax
  );
  return faixa ? faixa.diasDireito : 0;
}

/**
 * Simula e calcula férias de acordo com as regras da CLT pós-reforma trabalhista e tabelas 2026
 */
export function calcularFeriasComApropriacao(
  empregado: Empregado,
  dataInicio: string,
  diasGozo: number,
  abonoPecuniario: boolean = false, // Venda de 10 dias (Art. 143 CLT - máx 1/3)
  adiantamento13: boolean = false,
  faltasNoPeriodoAquisitivo: number = 0
) {
  const salarioBase = calcularRemuneracaoBaseComAdicionais(empregado);
  const salarioDia = salarioBase / 30;
  const ehEstagio = empregado.vinculo === 'ESTAGIO';
  const ehAprendiz = empregado.vinculo === 'APRENDIZ';
  const diasDireitoCLT = diasFeriasPorFaltasCLT(faltasNoPeriodoAquisitivo);

  // Dias de gozo e abono
  const diasSolicitadosLimitados = Math.min(Math.max(0, diasGozo), diasDireitoCLT || 30);
  const diasAbono = abonoPecuniario ? Math.max(0, Math.min(10, Math.floor(diasDireitoCLT / 3))) : 0;
  const diasEfetivosGozo = abonoPecuniario
    ? Math.min(diasSolicitadosLimitados, Math.max(0, (diasDireitoCLT || 30) - diasAbono))
    : diasSolicitadosLimitados;

  // 1. Remuneração dos dias de férias
  const valorFeriasGozo = diasEfetivosGozo === 30
    ? Math.round(salarioBase * 100) / 100
    : Math.round((salarioDia * diasEfetivosGozo) * 100) / 100;
  const tercoConstitucionalGozo = Math.round((valorFeriasGozo / 3) * 100) / 100;

  // 2. Abono pecuniário (se solicitado — isento de INSS, IRRF e FGTS)
  let valorAbono = 0;
  let tercoAbono = 0;
  if (abonoPecuniario && diasAbono > 0) {
    valorAbono = Math.round((salarioDia * diasAbono) * 100) / 100;
    tercoAbono = Math.round((valorAbono / 3) * 100) / 100;
  }

  // 3. Adiantamento da 1ª parcela do 13º (opcional — 50%, sem desconto INSS/IRRF)
  let valorAdiantamento13 = 0;
  if (adiantamento13) {
    valorAdiantamento13 = Math.round((salarioBase * 0.50) * 100) / 100;
  }

  // Base tributável para INSS e IRRF das férias:
  // O Abono Pecuniário e seu 1/3 são ISENTOS de INSS e IRRF (Súmula 125 STJ / Parecer PGFN)
  const baseTributavelFerias = Math.round((valorFeriasGozo + tercoConstitucionalGozo) * 100) / 100;

  // Cálculo do INSS s/ Férias (Tabela Progressiva 2026)
  const inssCalculado = !ehEstagio
    ? calcularINSSProgressivo(baseTributavelFerias)
    : { valorTotal: 0, aliquotaEfetiva: 0, passos: [], faixasCalculadas: [] };
  const valorINSSFerias = inssCalculado.valorTotal;

  // Cálculo do IRRF s/ Férias (Tributação exclusiva na fonte 2026 + Lei 15.270/2025)
  const dependentesIRRF = (empregado.dependentes || []).filter(d => d.irrf).length;
  const irrfCalculado = !ehEstagio
    ? calcularIRRF(baseTributavelFerias, valorINSSFerias, dependentesIRRF)
    : {
        valorTotal: 0,
        baseCalculo: 0,
        aliquotaAplicada: 0,
        deducaoAplicada: 0,
        redutorLei15270: 0,
        metodoUtilizado: 'DEDUCOES_LEGAIS' as const,
        passos: [],
      };
  const valorIRRFFerias = irrfCalculado.valorTotal;

  // FGTS s/ férias gozadas + 1/3 (8% CLT, 2% Aprendiz, 0% Estágio/Diretor)
  const aliqFGTS = empregado.optanteFGTS === false || ehEstagio || empregado.vinculo === 'DIRETOR_ESTATUTARIO'
    ? 0
    : ehAprendiz
    ? 0.02
    : (empregado.aliquotaFGTS || 0.08);
  const valorFGTSFerias = Math.round(((baseTributavelFerias + valorAdiantamento13) * aliqFGTS) * 100) / 100;

  // Total Bruto e Líquido
  const totalBruto = Math.round((valorFeriasGozo + tercoConstitucionalGozo + valorAbono + tercoAbono + valorAdiantamento13) * 100) / 100;
  const totalDescontos = Math.round((valorINSSFerias + valorIRRFFerias) * 100) / 100;
  const valorLiquido = Math.max(0, Math.round((totalBruto - totalDescontos) * 100) / 100);

  // Apropriação bi-mensal caso o período atravesse dois meses
  const dInicio = new Date(dataInicio + 'T00:00:00');
  const dFim = new Date(dInicio);
  dFim.setDate(dFim.getDate() + Math.max(1, diasEfetivosGozo) - 1);

  const mesInicio = dInicio.getMonth();
  const mesFim = dFim.getMonth();
  const anoInicio = dInicio.getFullYear();
  const anoFim = dFim.getFullYear();

  const comp1 = `${String(mesInicio + 1).padStart(2, '0')}/${anoInicio}`;
  const comp2 = `${String(mesFim + 1).padStart(2, '0')}/${anoFim}`;

  let diasMes1 = diasEfetivosGozo;
  let diasMes2 = 0;

  if (mesInicio !== mesFim || anoInicio !== anoFim) {
    const ultimoDiaMes1 = new Date(anoInicio, mesInicio + 1, 0).getDate();
    diasMes1 = ultimoDiaMes1 - dInicio.getDate() + 1;
    diasMes2 = Math.max(0, diasEfetivosGozo - diasMes1);
  }

  const divisorDias = Math.max(1, diasEfetivosGozo);
  const valorProporcionalMes1 = Math.round((baseTributavelFerias * (diasMes1 / divisorDias)) * 100) / 100;
  const valorProporcionalMes2 = Math.round((baseTributavelFerias - valorProporcionalMes1) * 100) / 100;

  // Data limite para pagamento (Art. 145 CLT: até 2 dias antes do início do gozo)
  const dataLimitePagamento = new Date(dInicio);
  dataLimitePagamento.setDate(dataLimitePagamento.getDate() - 2);

  return {
    diasDireitoCLT,
    diasGozo: diasEfetivosGozo,
    diasAbono,
    valorFeriasGozo,
    tercoConstitucionalGozo,
    valorAbono,
    tercoAbono,
    valorAdiantamento13,
    baseTributavelFerias,
    valorINSSFerias,
    inssCalculado,
    valorIRRFFerias,
    irrfCalculado,
    valorFGTSFerias,
    totalBruto,
    totalDescontos,
    valorLiquido,
    dataFim: dFim.toISOString().split('T')[0],
    dataLimitePagamento: dataLimitePagamento.toISOString().split('T')[0],
    atravessaMeses: diasMes2 > 0,
    apropriacao: {
      mes1: { competencia: comp1, dias: diasMes1, valor: valorProporcionalMes1 },
      mes2: diasMes2 > 0 ? { competencia: comp2, dias: diasMes2, valor: valorProporcionalMes2 } : null
    }
  };
}

/**
 * Funções auxiliares para códigos e descrições oficiais do TRCT
 */
export function obterCodigoAfastamento(motivo: MotivoRescisao): string {
  switch (motivo) {
    case 'SEM_JUSTA_CAUSA_EMPREGADOR':
      return 'SJ2';
    case 'PEDIDO_DEMISSAO_EMPREGADO':
      return 'PD0';
    case 'COM_JUSTA_CAUSA_EMPREGADOR':
      return 'JC0';
    case 'ACORDO_CONSENSUAL_484A':
      return 'AC0';
    case 'RESCISAO_INDIRETA':
      return 'RI0';
    case 'TERMINO_CONTRATO_EXPERIENCIA':
      return 'RA1';
    case 'RESCISAO_ANTECIPADA_EXPERIENCIA':
      return 'RA2';
    default:
      return 'SJ2';
  }
}

export function obterDescricaoCausaAfastamento(motivo: MotivoRescisao): string {
  switch (motivo) {
    case 'SEM_JUSTA_CAUSA_EMPREGADOR':
      return 'Despedida sem justa causa, pelo empregador';
    case 'PEDIDO_DEMISSAO_EMPREGADO':
      return 'Rescisão a pedido do empregado';
    case 'COM_JUSTA_CAUSA_EMPREGADOR':
      return 'Despedida por justa causa, pelo empregador';
    case 'ACORDO_CONSENSUAL_484A':
      return 'Extinção do contrato por acordo entre as partes (Art. 484-A da CLT)';
    case 'RESCISAO_INDIRETA':
      return 'Rescisão indireta do contrato de trabalho';
    case 'TERMINO_CONTRATO_EXPERIENCIA':
      return 'Término de contrato de trabalho por prazo determinado';
    case 'RESCISAO_ANTECIPADA_EXPERIENCIA':
      return 'Rescisão antecipada do contrato de experiência (Art. 479 CLT)';
    default:
      return 'Despedida sem justa causa, pelo empregador';
  }
}

export function calcularRescisaoCompleta(
  empregado: Empregado,
  motivo: MotivoRescisao,
  dataDesligamento: string,
  tipoAviso: 'TRABALHADO' | 'INDENIZADO' | 'DISPENSADO' = 'INDENIZADO',
  saldoFGTSAtualComprovado: number = 0,
  adiantamentoJaPagoNaCompetencia: number = 0
): RescisaoSimulada {
  const salarioBase = calcularRemuneracaoBaseComAdicionais(empregado);
  const salarioDia = salarioBase / 30;
  const ehEstagio = empregado.vinculo === 'ESTAGIO';
  const ehAprendiz = empregado.vinculo === 'APRENDIZ';
  const ehDiretor = empregado.vinculo === 'DIRETOR_ESTATUTARIO';

  const dataAdmBase = empregado.dataAdmissao || empregado.dataPrevisaoInicio || dataDesligamento;
  const dAdmissao = new Date(dataAdmBase + 'T00:00:00');
  const dDesligamento = new Date(dataDesligamento + 'T00:00:00');

  // Tempo de serviço em anos completos
  let anosCompletos = dDesligamento.getFullYear() - dAdmissao.getFullYear();
  const m = dDesligamento.getMonth() - dAdmissao.getMonth();
  if (m < 0 || (m === 0 && dDesligamento.getDate() < dAdmissao.getDate())) {
    anosCompletos--;
  }
  anosCompletos = Math.max(0, anosCompletos);

  // 1. Aviso Prévio Proporcional (Lei nº 12.506/2011) ou Indenização Art. 479 CLT
  let diasAvisoTotal = 30;
  if (motivo === 'SEM_JUSTA_CAUSA_EMPREGADOR' || motivo === 'RESCISAO_INDIRETA' || motivo === 'ACORDO_CONSENSUAL_484A') {
    diasAvisoTotal = Math.min(90, 30 + (anosCompletos * 3));
  }

  let diasAvisoIndenizado = 0;
  let valorAvisoPrevio = 0;
  let avisoPrevioDescontado = 0;

  if (motivo === 'RESCISAO_ANTECIPADA_EXPERIENCIA') {
    // Art. 479 CLT: indenização de 50% dos dias faltantes para o término previsto da experiência
    const dataFimPrevistaStr = empregado.dataFimExperiencia2 || empregado.dataFimExperiencia1;
    let dFimExp = dataFimPrevistaStr ? new Date(dataFimPrevistaStr + 'T00:00:00') : new Date(dAdmissao);
    if (!dataFimPrevistaStr) {
      dFimExp.setDate(dFimExp.getDate() + 89);
    }
    const diffDiasRestantes = Math.max(
      0,
      Math.round((dFimExp.getTime() - dDesligamento.getTime()) / (1000 * 60 * 60 * 24))
    );
    diasAvisoIndenizado = Math.ceil(diffDiasRestantes * 0.5);
    valorAvisoPrevio = Math.round((salarioDia * (diffDiasRestantes * 0.5)) * 100) / 100;
  } else if (motivo === 'PEDIDO_DEMISSAO_EMPREGADO') {
    if (tipoAviso === 'INDENIZADO') {
      // Art. 487 § 2º CLT: desconto limitado a 30 dias quando empregado não cumpre e empresa não dispensa
      avisoPrevioDescontado = Math.round(salarioBase * 100) / 100;
    }
  } else if (tipoAviso === 'INDENIZADO') {
    diasAvisoIndenizado = diasAvisoTotal;
    if (motivo === 'ACORDO_CONSENSUAL_484A') {
      // Art. 484-A CLT: 50% do aviso prévio indenizado
      valorAvisoPrevio = Math.round(((salarioDia * diasAvisoTotal) / 2) * 100) / 100;
    } else if (motivo === 'SEM_JUSTA_CAUSA_EMPREGADOR' || motivo === 'RESCISAO_INDIRETA') {
      valorAvisoPrevio = Math.round((salarioDia * diasAvisoTotal) * 100) / 100;
    }
  } else if (tipoAviso === 'TRABALHADO') {
    // Dias excedentes da Lei 12.506 indenizados no desligamento
    diasAvisoIndenizado = Math.max(0, anosCompletos * 3);
    if (diasAvisoIndenizado > 0 && (motivo === 'SEM_JUSTA_CAUSA_EMPREGADOR' || motivo === 'RESCISAO_INDIRETA')) {
      valorAvisoPrevio = Math.round((salarioDia * diasAvisoIndenizado) * 100) / 100;
    } else if (diasAvisoIndenizado > 0 && motivo === 'ACORDO_CONSENSUAL_484A') {
      valorAvisoPrevio = Math.round(((salarioDia * diasAvisoIndenizado) / 2) * 100) / 100;
    }
  }

  // Data do Aviso Prévio
  let dataAviso = '';
  if (tipoAviso === 'TRABALHADO') {
    const dAviso = new Date(dDesligamento);
    dAviso.setDate(dAviso.getDate() - 30);
    dataAviso = dAviso.toISOString().split('T')[0];
  } else {
    dataAviso = dataDesligamento;
  }

  // 2. Saldo de Salário (dias trabalhados no mês do desligamento)
  const diaDoMesDesligamento = dDesligamento.getDate();
  const saldoSalarioDias = diaDoMesDesligamento;
  const valorSaldoSalario = Math.round((salarioDia * saldoSalarioDias) * 100) / 100;

  // 3. 13º Salário Proporcional (avos trabalhados no ano corrente - fração >= 15 dias no mês = 1 avo)
  let avos13 = 0;
  const anoDesligamento = dDesligamento.getFullYear();
  const mesInicio13 = (dAdmissao.getFullYear() === anoDesligamento) ? dAdmissao.getMonth() : 0;
  const mesFim13 = dDesligamento.getMonth();

  avos13 = Math.max(0, mesFim13 - mesInicio13);
  if (dAdmissao.getFullYear() === anoDesligamento && dAdmissao.getMonth() === mesFim13) {
    // Admitido e demitido no mesmo mês: verifica dias trabalhados
    const diasTrabMesmoMes = dDesligamento.getDate() - dAdmissao.getDate() + 1;
    avos13 = diasTrabMesmoMes >= 15 ? 1 : 0;
  } else {
    if (dAdmissao.getFullYear() === anoDesligamento) {
      const ultimoDiaMesAdm = new Date(anoDesligamento, dAdmissao.getMonth() + 1, 0).getDate();
      const diasTrabMesAdm = ultimoDiaMesAdm - dAdmissao.getDate() + 1;
      if (diasTrabMesAdm < 15) avos13 = Math.max(0, avos13 - 1);
    }
    if (diaDoMesDesligamento >= 15) {
      avos13 += 1;
    }
  }
  avos13 = Math.min(12, Math.max(0, avos13));

  let decimoTerceiroProporcional = 0;
  let decimoTerceiroIndenizado = 0;

  if (motivo !== 'COM_JUSTA_CAUSA_EMPREGADOR') {
    decimoTerceiroProporcional = Math.round(((salarioBase / 12) * avos13) * 100) / 100;

    // Reflexo do aviso prévio indenizado na projeção do 13º (CLT Art. 487 §1º)
    if (
      tipoAviso === 'INDENIZADO' &&
      (motivo === 'SEM_JUSTA_CAUSA_EMPREGADOR' || motivo === 'RESCISAO_INDIRETA' || motivo === 'ACORDO_CONSENSUAL_484A') &&
      diasAvisoIndenizado >= 15
    ) {
      const avosProjecaoAviso = Math.max(1, Math.floor(diasAvisoIndenizado / 30));
      decimoTerceiroIndenizado = Math.round(((salarioBase / 12) * avosProjecaoAviso) * 100) / 100;
    }
  }

  // 4. Férias Proporcionais + 1/3 Constitucional (33,33%)
  let ultimoAniversarioAdmissao = new Date(anoDesligamento, dAdmissao.getMonth(), dAdmissao.getDate());
  if (ultimoAniversarioAdmissao > dDesligamento) {
    ultimoAniversarioAdmissao = new Date(anoDesligamento - 1, dAdmissao.getMonth(), dAdmissao.getDate());
  }

  let avosFerias = (dDesligamento.getFullYear() - ultimoAniversarioAdmissao.getFullYear()) * 12 + (dDesligamento.getMonth() - ultimoAniversarioAdmissao.getMonth());
  if (dDesligamento.getDate() < ultimoAniversarioAdmissao.getDate()) {
    const diasFrac = dDesligamento.getDate() - ultimoAniversarioAdmissao.getDate() + 30;
    if (diasFrac >= 15) avosFerias = Math.max(0, avosFerias); // já conta o avo parcial
    else avosFerias = Math.max(0, avosFerias - 1);
  } else {
    const diasFrac = dDesligamento.getDate() - ultimoAniversarioAdmissao.getDate() + 1;
    if (diasFrac >= 15 && avosFerias < 12) avosFerias += 1;
  }
  avosFerias = Math.min(12, Math.max(0, avosFerias));

  let feriasProporcionaisBase = 0;
  let tercoFeriasConstitucional = 0;
  let feriasProporcionaisComTerco = 0;
  let feriasVencidasBase = 0;
  let tercoFeriasVencidas = 0;
  let feriasVencidasComTerco = 0;

  if (motivo !== 'COM_JUSTA_CAUSA_EMPREGADOR') {
    feriasProporcionaisBase = Math.round(((salarioBase / 12) * avosFerias) * 100) / 100;
    tercoFeriasConstitucional = Math.round((feriasProporcionaisBase / 3) * 100) / 100;
    feriasProporcionaisComTerco = Math.round((feriasProporcionaisBase + tercoFeriasConstitucional) * 100) / 100;
  }

  // 5. Dedução Previdenciária (INSS 2026) e IRRF 2026 (Lei 15.270/2025)
  const dependentesIRRF = (empregado.dependentes || []).filter(d => d.irrf).length;
  const inssSaldoSalario = !ehEstagio ? calcularINSSProgressivo(valorSaldoSalario).valorTotal : 0;
  const base13Tributavel = Math.round((decimoTerceiroProporcional + decimoTerceiroIndenizado) * 100) / 100;
  const inss13 = !ehEstagio ? calcularINSSProgressivo(base13Tributavel).valorTotal : 0;

  // Férias indenizadas (+1/3) e Aviso Prévio indenizado são ISENTOS de IRRF (Súmula 386 STJ / Art. 6º V Lei 7.713)
  const irrfRescisao = !ehEstagio ? calcularIRRF(valorSaldoSalario, inssSaldoSalario, dependentesIRRF).valorTotal : 0;
  const irrfDecimoTerceiro = !ehEstagio ? calcularIRRF(base13Tributavel, inss13, dependentesIRRF).valorTotal : 0;

  // Pensão alimentícia em TRCT se configurada no cadastro do colaborador
  const percPensaoTRCT = Number(empregado.pensaoAlimenticiaPercentualTRCT || empregado.pensaoAlimenticiaPercentual || 0);
  const pensaoAlimenticia = percPensaoTRCT > 0
    ? Math.round(Math.max(0, (valorSaldoSalario + decimoTerceiroProporcional - inssSaldoSalario - inss13)) * (percPensaoTRCT / 100) * 100) / 100
    : 0;

  // 6. Multa Rescisória do FGTS (40% sem justa causa / indireta / antecipada empregador; 20% acordo 484-A)
  let percentualMultaFGTS = 0;
  if (
    motivo === 'SEM_JUSTA_CAUSA_EMPREGADOR' ||
    motivo === 'RESCISAO_INDIRETA' ||
    motivo === 'RESCISAO_ANTECIPADA_EXPERIENCIA'
  ) {
    percentualMultaFGTS = 0.40;
  } else if (motivo === 'ACORDO_CONSENSUAL_484A') {
    percentualMultaFGTS = 0.20;
  }

  const aliqFGTSMensal = empregado.optanteFGTS === false || ehEstagio || ehDiretor
    ? 0
    : ehAprendiz
    ? 0.02
    : (empregado.aliquotaFGTS || 0.08);

  const mesesTrabalhadosTotal = Math.max(
    1,
    ((dDesligamento.getFullYear() - dAdmissao.getFullYear()) * 12) +
    (dDesligamento.getMonth() - dAdmissao.getMonth()) + 1
  );
  const saldoFGTSEstimado = Math.round((salarioBase * aliqFGTSMensal * mesesTrabalhadosTotal) * 100) / 100;
  const saldoBaseParaMulta = saldoFGTSAtualComprovado > 0 ? saldoFGTSAtualComprovado : saldoFGTSEstimado;
  const multaFGTS = aliqFGTSMensal > 0 ? Math.round((saldoBaseParaMulta * percentualMultaFGTS) * 100) / 100 : 0;

  // 7. Demonstrativo do FGTS por competência
  const demonstrativoFGTSCompetencias = [];
  let totalDepositado = 0;
  let totalDevido = 0;

  for (let i = 0; i < Math.min(12, mesesTrabalhadosTotal); i++) {
    const dComp = new Date(dDesligamento);
    dComp.setMonth(dComp.getMonth() - i);
    const compNome = `${String(dComp.getMonth() + 1).padStart(2, '0')}/${dComp.getFullYear()}`;
    const valorMesDevido = Math.round((salarioBase * aliqFGTSMensal) * 100) / 100;
    const depositado = i > 1;
    totalDevido += valorMesDevido;
    if (depositado) totalDepositado += valorMesDevido;

    demonstrativoFGTSCompetencias.push({
      competencia: compNome,
      valorDevido: valorMesDevido,
      depositado
    });
  }

  // 8. Totais e Deduções
  const totalBruto = Math.round((
    valorSaldoSalario +
    valorAvisoPrevio +
    decimoTerceiroProporcional +
    decimoTerceiroIndenizado +
    feriasVencidasComTerco +
    feriasProporcionaisComTerco
  ) * 100) / 100;

  const totalDescontos = Math.round((
    inssSaldoSalario +
    irrfRescisao +
    inss13 +
    irrfDecimoTerceiro +
    adiantamentoJaPagoNaCompetencia +
    avisoPrevioDescontado +
    pensaoAlimenticia
  ) * 100) / 100;

  const liquidoRescisao = Math.max(0, Math.round((totalBruto - totalDescontos) * 100) / 100);

  // Prazo de pagamento da rescisão: Art. 477 § 6º da CLT (até 10 dias corridos do término do contrato)
  const dLimite = new Date(dDesligamento);
  dLimite.setDate(dLimite.getDate() + 10);

  return {
    id: `rescisao-${empregado.id}-${Date.now()}`,
    empregadoId: empregado.id,
    empresaId: empregado.empresaId,
    motivo,
    dataAviso,
    dataDesligamento,
    tipoAviso,
    diasAvisoIndenizado: diasAvisoIndenizado > 0 ? diasAvisoIndenizado : (tipoAviso === 'INDENIZADO' ? diasAvisoTotal : 0),
    saldoSalarioDias,
    valorSaldoSalario,
    valorAvisoPrevio,
    decimoTerceiroProporcional,
    decimoTerceiroIndenizado,
    feriasVencidasComTerco,
    feriasProporcionaisComTerco,
    feriasProporcionaisBase,
    tercoFeriasConstitucional,
    feriasVencidasBase,
    tercoFeriasVencidas,
    avosDecimoTerceiro: avos13,
    avosFerias,
    remuneracaoMesAnterior: salarioBase,
    codigoAfastamento: obterCodigoAfastamento(motivo),
    causaAfastamentoDescricao: obterDescricaoCausaAfastamento(motivo),
    tipoContratoDescricao: empregado.tipoContrato === 'EXPERIENCIA_45_45'
      ? '2 - Contrato de trabalho por prazo determinado'
      : '1 - Contrato de trabalho por prazo indeterminado',
    multaFGTS,
    saldoFGTSParaMulta: saldoBaseParaMulta,
    descontos: {
      inssSaldoSalario,
      irrfRescisao,
      adiantamentoJaPago: adiantamentoJaPagoNaCompetencia,
      outrosDescontos: inss13,
      inssDecimoTerceiro: inss13,
      irrfDecimoTerceiro,
      avisoPrevioDescontado,
      pensaoAlimenticia,
    },
    totalBruto,
    totalDescontos,
    liquidoRescisao,
    dataLimitePagamento: dLimite.toISOString().split('T')[0],
    demonstrativoFGTS: {
      competenciasCalculadas: demonstrativoFGTSCompetencias,
      totalCalculado: Math.round(totalDevido * 100) / 100,
      totalDepositado: Math.round(totalDepositado * 100) / 100,
      diferencasPendentes: Math.round((totalDevido - totalDepositado) * 100) / 100,
    },
    pendenciasDocumentais: [
      'Exame Médico Demissional (ASO Demissional)',
      'Devolução de crachá e equipamentos de trabalho',
      'Comprovante de entrega da Guia GRRF / FGTS Digital',
      'Assinatura do Termo de Rescisão de Contrato de Trabalho (TRCT)',
      'Anotação de baixa na Carteira de Trabalho Digital (eSocial S-2299)'
    ],
    status: 'SIMULACAO',
  };
}
