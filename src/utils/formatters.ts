export function formatarMoeda(valor: number | undefined | null): string {
  if (valor === undefined || valor === null || isNaN(valor)) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatarValorDecimal(valor: number | undefined | null): string {
  if (valor === undefined || valor === null || isNaN(valor)) return '0,00';
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const MESES_EXTENSO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function formatarCompetenciaExtenso(competencia: string | undefined): string {
  if (!competencia) return '';
  const partes = competencia.split('/');
  if (partes.length === 2) {
    const mesIdx = parseInt(partes[0], 10) - 1;
    const ano = partes[1];
    if (mesIdx >= 0 && mesIdx < 12) {
      return `${MESES_EXTENSO[mesIdx]} de ${ano}`;
    }
  }
  return competencia;
}

export function formatarData(dataIsoOuTimestamp: string | number | undefined | null): string {
  if (!dataIsoOuTimestamp) return '-';
  try {
    const dStr = String(dataIsoOuTimestamp);
    // Se já estiver no formato DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dStr)) return dStr;
    // Se for AAAA-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(dStr)) {
      const [ano, mes, dia] = dStr.split('T')[0].split('-');
      return `${dia}/${mes}/${ano}`;
    }
    const d = new Date(dataIsoOuTimestamp);
    if (isNaN(d.getTime())) return String(dataIsoOuTimestamp);
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return String(dataIsoOuTimestamp);
  }
}

export function formatarCPF(cpf: string | undefined): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatarCNPJ(cnpj: string | undefined): string {
  if (!cnpj) return '';
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatarCEP(cep: string | undefined): string {
  if (!cep) return '';
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return cep;
  return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
}

export function formatarPercentual(valor: number | undefined): string {
  if (valor === undefined || valor === null) return '0%';
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
}

export function validarCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(clean.charAt(i)) * (10 - i);
  let resto = 11 - (soma % 11);
  const dig1 = resto === 10 || resto === 11 ? 0 : resto;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(clean.charAt(i)) * (11 - i);
  resto = 11 - (soma % 11);
  const dig2 = resto === 10 || resto === 11 ? 0 : resto;

  return dig1 === parseInt(clean.charAt(9)) && dig2 === parseInt(clean.charAt(10));
}

/**
 * Converte valor numérico monetário para texto em reais por extenso
 * Exemplo: 1686.14 -> "Mil Seiscentos e Oitenta e Seis Reais e Quatorze Centavos"
 */
export function numeroParaExtenso(valor: number | undefined | null): string {
  if (valor === undefined || valor === null || isNaN(valor) || valor === 0) {
    return 'Zero Reais';
  }

  const unidades = ['', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove'];
  const especiais = ['Dez', 'Onze', 'Doze', 'Treze', 'Quatorze', 'Quinze', 'Dezesseis', 'Dezessete', 'Dezoito', 'Dezenove'];
  const dezenas = ['', '', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta', 'Sessenta', 'Setenta', 'Oitenta', 'Noventa'];
  const centenas = ['', 'Cento', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos', 'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos'];

  function converterCentena(n: number): string {
    if (n === 100) return 'Cem';
    let res = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) res += centenas[c];

    if (d === 1) {
      if (res) res += ' e ';
      res += especiais[u];
      return res;
    }

    if (d > 1) {
      if (res) res += ' e ';
      res += dezenas[d];
    }

    if (u > 0) {
      if (res) res += ' e ';
      res += unidades[u];
    }

    return res;
  }

  const v = Math.round(valor * 100) / 100;
  const inteiros = Math.floor(v);
  const centavos = Math.round((v - inteiros) * 100);

  const partesInteiras: string[] = [];
  const milhoes = Math.floor(inteiros / 1000000);
  const milhares = Math.floor((inteiros % 1000000) / 1000);
  const resto = inteiros % 1000;

  if (milhoes > 0) {
    partesInteiras.push(milhoes === 1 ? 'Um Milhão' : `${converterCentena(milhoes)} Milhões`);
  }
  if (milhares > 0) {
    partesInteiras.push(milhares === 1 ? 'Mil' : `${converterCentena(milhares)} Mil`);
  }
  if (resto > 0) {
    // Se já temos milhares/milhões e resto < 100 ou divisível por 100, no português padrão adiciona 'e'
    const prefixo = partesInteiras.length > 0 && (resto < 100 || resto % 100 === 0) ? 'e ' : '';
    partesInteiras.push(prefixo + converterCentena(resto));
  }

  let textoInteiro = '';
  if (inteiros === 1) {
    textoInteiro = 'Um Real';
  } else if (inteiros > 1) {
    textoInteiro = `${partesInteiras.join(' ')} Reais`;
  }

  let textoCentavos = '';
  if (centavos > 0) {
    const strCentavos = converterCentena(centavos);
    textoCentavos = centavos === 1 ? 'Um Centavo' : `${strCentavos} Centavos`;
  }

  if (textoInteiro && textoCentavos) {
    return `${textoInteiro} e ${textoCentavos}`;
  } else if (textoInteiro) {
    return textoInteiro;
  } else if (textoCentavos) {
    return textoCentavos;
  }
  return 'Zero Reais';
}

/**
 * Formata data por extenso para termos jurídicos e contratos
 * Ex: "2025-07-01", "São Luís" -> "São Luís, 1º de julho de 2025"
 */
export function formatarDataPorExtenso(dataStr: string | undefined, cidade?: string): string {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  if (!dataStr) {
    return cidade ? `${cidade}, ___ de ____________ de ______` : '___ de ____________ de ______';
  }

  let dia = 1;
  let mesIdx = 0;
  let ano = 2025;

  if (/^\d{4}-\d{2}-\d{2}/.test(dataStr)) {
    const parts = dataStr.split('T')[0].split('-');
    ano = parseInt(parts[0], 10);
    mesIdx = parseInt(parts[1], 10) - 1;
    dia = parseInt(parts[2], 10);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
    const parts = dataStr.split('/');
    dia = parseInt(parts[0], 10);
    mesIdx = parseInt(parts[1], 10) - 1;
    ano = parseInt(parts[2], 10);
  }

  const diaFormatado = dia === 1 ? '1º' : String(dia).padStart(2, '0');
  const mesFormatado = meses[mesIdx] || 'julho';
  const textoData = `${diaFormatado} de ${mesFormatado} de ${ano}`;

  return cidade ? `${cidade}, ${textoData}` : textoData;
}
