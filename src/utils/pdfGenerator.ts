import { jsPDF } from 'jspdf';
import { FolhaEmpregado, Empresa, Empregado, RescisaoSimulada, DadosDocumentoFerias } from '../types/dp';
import { formatarMoeda, formatarData, formatarCNPJ, formatarCPF, formatarCompetenciaExtenso, formatarValorDecimal, numeroParaExtenso, formatarDataPorExtenso, formatarCEP } from './formatters';

/**
 * 1. LISTAGEM DE FOLHA DE PAGAMENTO
 * Modelo de referência: "Listagem de Folha - 0027.pdf"
 * Papel Carta (Letter: 215.9 x 279.4 mm), orientação Retrato.
 */
export function gerarListagemFolhaPDF(
  empresa: Empresa,
  competencia: string,
  folhas: FolhaEmpregado[],
  empregados: Empregado[],
  options?: { returnBlobUrl?: boolean }
): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const marginLeft = 10;
  const marginRight = 10;

  const dataEmissao = formatarData(new Date().toISOString().split('T')[0]);

  // Função auxiliar para desenhar o cabeçalho padrão da Listagem de Folha
  const desenharCabecalho = (pageNumber: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);

    // Linha 1: Título e Página
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Folha de Pagamento', marginLeft, 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Pag.: ${pageNumber}`, pageWidth - marginRight, 13.5, { align: 'right' });

    // Linha 2: Razão Social, CNPJ e Sistema Emissor
    doc.text(`Empresa: ${empresa.razaoSocial.toUpperCase()} - CNPJ: ${formatarCNPJ(empresa.cnpj)}`, marginLeft, 18);
    doc.text('Departamento Fácil', pageWidth - marginRight, 18, { align: 'right' });

    // Linha 3: Competência
    doc.text(`Mês/Ano: ${competencia}`, marginLeft, 22.2);

    // Linha 4: Emissão
    doc.text(`Emissão: ${dataEmissao}`, marginLeft, 26);

    // Linha divisória horizontal
    doc.line(marginLeft, 28, pageWidth - marginRight, 28);

    // Cabeçalho das Colunas do Corpo (sem fundo cinza, fundo branco com linhas)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    // Colunas: Código | Empregado | Evento | Referência | Provento | Desconto
    doc.text('Código', marginLeft + 0.3, 31.8);
    doc.text('Empregado', marginLeft + 14.3, 31.8);
    doc.text('Evento', marginLeft + 70.4, 31.8);
    doc.text('Referência', marginLeft + 143, 31.8, { align: 'right' });
    doc.text('Provento', marginLeft + 165, 31.8, { align: 'right' });
    doc.text('Desconto', pageWidth - marginRight - 0.4, 31.8, { align: 'right' });

    // Linha divisória abaixo dos títulos das colunas
    doc.line(marginLeft, 33.5, pageWidth - marginRight, 33.5);

    return 38; // Próximo Y utilizável
  };

  let currentPage = 1;
  let currentY = desenharCabecalho(currentPage);

  // Consolidação de eventos para o Total Geral
  const mapaEventosConsolidados: Record<
    string,
    { codigo: string; descricao: string; qtdOcorrencias: number; totalProvento: number; totalDesconto: number }
  > = {};

  let somaGeralProventos = 0;
  let somaGeralDescontos = 0;
  let somaGeralFGTS = 0;
  let somaGeralLiquido = 0;
  let somaGeralBCINSS = 0;
  let somaGeralBCFGTS = 0;

  // Itera sobre todos os trabalhadores calculados
  for (let idx = 0; idx < folhas.length; idx++) {
    const folha = folhas[idx];
    const emp = empregados.find(e => e.id === folha.empregadoId);

    // Estima a altura necessária para este bloco de trabalhador
    const qtdEventos = folha.itens.length;
    const alturaBlocoTrabalhador = 9 + (qtdEventos * 4.2) + 24;

    // Verifica se precisa de quebra de página
    if (currentY + alturaBlocoTrabalhador > pageHeight - 15) {
      doc.addPage('letter', 'portrait');
      currentPage++;
      currentY = desenharCabecalho(currentPage);
    }

    // 1. Linha do Trabalhador: Matrícula e Nome
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    const matriculaFormatada = (folha.matricula || emp?.matricula || String(idx + 1)).padStart(6, '0');
    doc.text(matriculaFormatada, marginLeft + 0.3, currentY);

    doc.setFont('helvetica', 'bold');
    doc.text(folha.nomeEmpregado.toUpperCase(), marginLeft + 14.3, currentY);

    currentY += 4.5;

    // 2. Linha do Cargo
    doc.setFont('helvetica', 'normal');
    doc.text(`Cargo: ${(folha.cargo || emp?.cargo || '').toUpperCase()}`, marginLeft + 0.3, currentY);

    // 3. Linhas dos Eventos do Trabalhador
    for (const item of folha.itens) {
      // Acumula na consolidação do Total Geral
      if (!mapaEventosConsolidados[item.rubricaCodigo]) {
        mapaEventosConsolidados[item.rubricaCodigo] = {
          codigo: item.rubricaCodigo,
          descricao: item.descricao,
          qtdOcorrencias: 0,
          totalProvento: 0,
          totalDesconto: 0,
        };
      }
      mapaEventosConsolidados[item.rubricaCodigo].qtdOcorrencias += 1;
      mapaEventosConsolidados[item.rubricaCodigo].totalProvento += item.provento || 0;
      mapaEventosConsolidados[item.rubricaCodigo].totalDesconto += item.desconto || 0;

      currentY += 4.2;

      // Evento e Descrição
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`${item.rubricaCodigo} ${item.descricao}`, marginLeft + 70.4, currentY);

      // Referência
      const refStr = typeof item.referencia === 'number' ? formatarValorDecimal(item.referencia) : String(item.referencia || '');
      doc.text(refStr, marginLeft + 143, currentY, { align: 'right' });

      // Provento ou Desconto alinhados à direita
      if (item.provento > 0) {
        doc.text(formatarValorDecimal(item.provento), marginLeft + 165, currentY, { align: 'right' });
      }
      if (item.desconto > 0) {
        doc.text(formatarValorDecimal(item.desconto), pageWidth - marginRight - 0.4, currentY, { align: 'right' });
      }
    }

    currentY += 4.5;

    // 4. Linha de Subtotais com pequenos traços acima dos valores
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(marginLeft + 148, currentY - 3, marginLeft + 165, currentY - 3);
    doc.line(pageWidth - marginRight - 18, currentY - 3, pageWidth - marginRight - 0.4, currentY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(formatarValorDecimal(folha.totalProventos), marginLeft + 165, currentY, { align: 'right' });
    doc.text(formatarValorDecimal(folha.totalDescontos), pageWidth - marginRight - 0.4, currentY, { align: 'right' });

    currentY += 4.2;

    // 5. Linha de FGTS e Líquido a receber
    const fgtsIndiv = emp?.optanteFGTS ? (folha.encargosEmpresa?.fgtsDevido || 0) : 0;
    const fgtsTexto = emp?.optanteFGTS ? formatarValorDecimal(fgtsIndiv) : '';
    doc.text(`FGTS: ${fgtsTexto}`, marginLeft + 125, currentY);
    doc.text('Líquido a receber:', marginLeft + 148, currentY);
    doc.text(formatarValorDecimal(folha.valorLiquido), pageWidth - marginRight - 0.4, currentY, { align: 'right' });

    currentY += 5.5;

    // 6. Linha de Data e Assinatura
    doc.text('Data: _____ / _____ / _________', marginLeft + 70.4, currentY);
    doc.text('Assinatura: _________________________________________', marginLeft + 105, currentY);

    currentY += 5.5;

    // 7. Tabela de Parâmetros Contratuais e Bases (com linhas superior e inferior)
    doc.line(marginLeft, currentY - 3.2, pageWidth - marginRight, currentY - 3.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('Admissão', marginLeft + 4, currentY);
    doc.text('Dep.', marginLeft + 24, currentY);
    doc.text('Filhos', marginLeft + 36, currentY);
    doc.text('Hr/mês', marginLeft + 48, currentY);
    doc.text('Sal. Cont.', marginLeft + 65, currentY);
    doc.text('BC-INSS', marginLeft + 85, currentY);
    doc.text('BC-FGTS', marginLeft + 105, currentY);

    currentY += 3.8;

    const adm = emp ? formatarData(emp.dataAdmissao) : '-';
    const dep = emp?.dependentes?.filter(d => d.irrf)?.length || 0;
    const filhos = emp?.dependentes?.filter(d => d.salarioFamilia)?.length || 0;
    const hrs = emp?.jornadaHorasSemanais ? (emp.divisorHoras ? `${emp.divisorHoras}:00` : '220:00') : '220:00';
    const salCont = folha.salarioBase || emp?.salarioBase || 0;
    const bcFgts = emp?.optanteFGTS ? formatarValorDecimal(folha.bases.baseFGTS) : '';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(adm, marginLeft + 2, currentY);
    doc.text(String(dep), marginLeft + 26, currentY);
    doc.text(String(filhos), marginLeft + 38, currentY);
    doc.text(hrs, marginLeft + 48, currentY);
    doc.text(formatarValorDecimal(salCont), marginLeft + 65, currentY);
    doc.text(formatarValorDecimal(folha.bases.baseINSS), marginLeft + 85, currentY);
    if (bcFgts) {
      doc.text(bcFgts, marginLeft + 105, currentY);
    }

    doc.line(marginLeft, currentY + 2, pageWidth - marginRight, currentY + 2);

    currentY += 6;

    // Acumula totais gerais
    somaGeralProventos += folha.totalProventos;
    somaGeralDescontos += folha.totalDescontos;
    somaGeralFGTS += fgtsIndiv;
    somaGeralLiquido += folha.valorLiquido;
    somaGeralBCINSS += folha.bases.baseINSS;
    somaGeralBCFGTS += emp?.optanteFGTS ? folha.bases.baseFGTS : 0;
  }

  // 8. TOTAL GERAL (Consolidação de Eventos e Resumo Geral)
  const eventosConsolidados = Object.values(mapaEventosConsolidados).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const alturaTotalGeral = 15 + (eventosConsolidados.length * 4.2) + 20;

  if (currentY + alturaTotalGeral > pageHeight - 20) {
    doc.addPage('letter', 'portrait');
    currentPage++;
    currentY = desenharCabecalho(currentPage);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('Total Geral', marginLeft + 0.3, currentY);

  doc.setFont('helvetica', 'normal');
  doc.text(` (${folhas.length} empregado${folhas.length > 1 ? 's' : ''})`, marginLeft + 16, currentY);

  for (const ev of eventosConsolidados) {
    currentY += 4.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${ev.codigo} ${ev.descricao}`, marginLeft + 70.4, currentY);

    if (ev.totalProvento > 0) {
      doc.text(formatarValorDecimal(ev.totalProvento), marginLeft + 165, currentY, { align: 'right' });
    }
    if (ev.totalDesconto > 0) {
      doc.text(formatarValorDecimal(ev.totalDesconto), pageWidth - marginRight - 0.4, currentY, { align: 'right' });
    }
  }

  currentY += 4.5;

  // Subtotais consolidados com pequenos traços
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(marginLeft + 148, currentY - 3, marginLeft + 165, currentY - 3);
  doc.line(pageWidth - marginRight - 18, currentY - 3, pageWidth - marginRight - 0.4, currentY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(formatarValorDecimal(somaGeralProventos), marginLeft + 165, currentY, { align: 'right' });
  doc.text(formatarValorDecimal(somaGeralDescontos), pageWidth - marginRight - 0.4, currentY, { align: 'right' });

  currentY += 4.2;

  // Linha 1 de Fechamento Geral
  doc.text(`FGTS: ${formatarValorDecimal(somaGeralFGTS)}`, marginLeft + 125, currentY);
  doc.text('Líquido a receber:', marginLeft + 148, currentY);
  doc.text(formatarValorDecimal(somaGeralLiquido), pageWidth - marginRight - 0.4, currentY, { align: 'right' });

  currentY += 4.5;

  // Linha 2 de Fechamento Geral: BC-INSS e BC-FGTS
  doc.text(`BC-INSS: ${formatarValorDecimal(somaGeralBCINSS)}`, marginLeft + 135, currentY);
  doc.text(`BC-FGTS: ${formatarValorDecimal(somaGeralBCFGTS)}`, marginLeft + 172, currentY);

  // Indicação de Fim no rodapé da última página
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Fim', pageWidth - marginRight - 0.4, pageHeight - 12, { align: 'right' });

  const fileName = `Listagem_Folha_${competencia.replace('/', '-')}_${empresa.nomeFantasia || 'Empresa'}.pdf`;

  if (options?.returnBlobUrl) {
    return doc.output('bloburl').toString();
  } else {
    doc.save(fileName);
  }
}

/**
 * 2. RECIBO DE PAGAMENTO INDIVIDUAL
 * Modelo de referência: "Recibo de Folha - 0027.pdf"
 * Papel A4 Retrato (210 x 297 mm).
 * Formulário compacto ocupando a parte superior da página (~120 mm),
 * preservando a metade inferior totalmente em branco conforme o modelo anexado.
 */
export function desenharReciboPagamentoNaPagina(
  doc: jsPDF,
  folha: FolhaEmpregado,
  empresa: Empresa,
  empregado: Empregado
) {
  const marginLeft = 20;
  const contentWidth = 170; // 20mm margem esquerda, 20mm margem direita => 170mm largura total
  const startY = 10;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  // 1. CABEÇALHO DO RECIBO (Y: 10 a 19 mm, altura 9 mm)
  // Divisão: Caixa da esquerda (Recibo de Pagamento) e Caixa da direita (Data e Assinatura)
  const wCabEsq = 75.5;
  const wCabDir = contentWidth - wCabEsq; // 94.5 mm
  const hCab = 9;

  doc.rect(marginLeft, startY, contentWidth, hCab, 'S');
  doc.line(marginLeft + wCabEsq, startY, marginLeft + wCabEsq, startY + hCab);

  // À esquerda: "Recibo de Pagamento" centralizado em negrito e "( Folha de Pagamento )"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Recibo de Pagamento', marginLeft + (wCabEsq / 2), startY + 4.2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('( Folha de Pagamento )', marginLeft + (wCabEsq / 2), startY + 7.6, { align: 'center' });

  // À direita: "Data e Assinatura"
  const xDir = marginLeft + wCabEsq;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Data e Assinatura', xDir + 2, startY + 2.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('___/___/____', xDir + 2, startY + 7.2);
  doc.text('____________________________________', xDir + 25.5, startY + 7.2);

  let curY = startY + hCab;

  // 2. PRIMEIRA LINHA DE IDENTIFICAÇÃO (Empregador | Inscrição | Admissão | Competência)
  // Y: 19 a 25.5 mm, altura 6.5 mm
  const hLinha1 = 6.5;
  doc.rect(marginLeft, curY, contentWidth, hLinha1, 'S');

  const xInsc = marginLeft + 75.5;
  const xAdm = marginLeft + 113;
  const xComp = marginLeft + 131;

  doc.line(xInsc, curY, xInsc, curY + hLinha1);
  doc.line(xAdm, curY, xAdm, curY + hLinha1);
  doc.line(xComp, curY, xComp, curY + hLinha1);

  // Empregador
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Empregador', marginLeft + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(empresa.razaoSocial.toUpperCase().substring(0, 44), marginLeft + 1.5, curY + 5.5);

  // Inscrição
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Inscrição', xInsc + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(formatarCNPJ(empresa.cnpj), xInsc + 1.5, curY + 5.5);

  // Admissão
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Admissão', xAdm + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(formatarData(empregado.dataAdmissao), xAdm + 1.5, curY + 5.5);

  // Competência
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Competência', xComp + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const compExtenso = formatarCompetenciaExtenso(folha.competencia);
  doc.text(compExtenso, xComp + 1.5, curY + 5.5);

  curY += hLinha1;

  // 3. SEGUNDA LINHA DE IDENTIFICAÇÃO (Empregado | Cargo | Lotação)
  // Y: 25.5 a 32 mm, altura 6.5 mm
  const hLinha2 = 6.5;
  doc.rect(marginLeft, curY, contentWidth, hLinha2, 'S');

  const xCargo = marginLeft + 75.5;
  const xLot = marginLeft + 123;

  doc.line(xCargo, curY, xCargo, curY + hLinha2);
  doc.line(xLot, curY, xLot, curY + hLinha2);

  // Empregado (Matrícula com zeros à esquerda + Nome)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Empregado', marginLeft + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const matricula = (empregado.matricula || folha.matricula || '1').padStart(6, '0');
  doc.text(`${matricula} ${empregado.nomeCompleto.toUpperCase()}`.substring(0, 45), marginLeft + 1.5, curY + 5.5);

  // Cargo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Cargo', xCargo + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(empregado.cargo.toUpperCase().substring(0, 26), xCargo + 1.5, curY + 5.5);

  // Lotação
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Lotação', xLot + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const lotacao = (empregado.centroDeCusto || empregado.departamento || 'ADMINISTRAÇÃO').toUpperCase();
  doc.text(lotacao.substring(0, 26), xLot + 1.5, curY + 5.5);

  curY += hLinha2;

  // 4. TERCEIRA LINHA DE IDENTIFICAÇÃO (CPF | Banco | Agência | Conta | Tipo de Conta)
  // Y: 32 a 38.5 mm, altura 6.5 mm
  const hLinha3 = 6.5;
  doc.rect(marginLeft, curY, contentWidth, hLinha3, 'S');

  const xBanco = marginLeft + 41.5;
  const xAg = marginLeft + 81.5;
  const xConta = marginLeft + 110;
  const xTpConta = marginLeft + 141;

  doc.line(xBanco, curY, xBanco, curY + hLinha3);
  doc.line(xAg, curY, xAg, curY + hLinha3);
  doc.line(xConta, curY, xConta, curY + hLinha3);
  doc.line(xTpConta, curY, xTpConta, curY + hLinha3);

  // CPF
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('CPF:', marginLeft + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(formatarCPF(empregado.cpf), marginLeft + 1.5, curY + 5.5);

  // Banco
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Banco', xBanco + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(empregado.dadosBancarios?.banco || '', xBanco + 1.5, curY + 5.5);

  // Agência
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Agência', xAg + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(empregado.dadosBancarios?.agencia || '', xAg + 1.5, curY + 5.5);

  // Conta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Conta', xConta + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(empregado.dadosBancarios?.conta || '', xConta + 1.5, curY + 5.5);

  // Tipo de Conta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Tipo de Conta', xTpConta + 1.5, curY + 2.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(empregado.dadosBancarios?.tipoConta || '', xTpConta + 1.5, curY + 5.5);

  curY += hLinha3;

  // 5. TÍTULO: DISCRIMINAÇÃO DAS VERBAS (altura 4.2 mm)
  const hTitVerbas = 4.2;
  doc.rect(marginLeft, curY, contentWidth, hTitVerbas, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Discriminação das Verbas', marginLeft + (contentWidth / 2), curY + 3.0, { align: 'center' });

  curY += hTitVerbas;

  // 6. CABEÇALHO DA TABELA DE VERBAS (altura 4.2 mm)
  // Colunas: Cod. (9.5mm) | Descrição (87mm) | Referência (28.5mm) | Provento (20mm) | Desconto (25mm)
  const hHeadVerbas = 4.2;
  doc.rect(marginLeft, curY, contentWidth, hHeadVerbas, 'S');

  const xColCod = marginLeft; // 20
  const xColDesc = marginLeft + 9.5; // 29.5
  const xColRef = marginLeft + 96.5; // 116.5
  const xColProv = marginLeft + 125; // 145
  const xColDescVal = marginLeft + 145; // 165
  const xRightLimit = marginLeft + contentWidth; // 190

  doc.line(xColDesc, curY, xColDesc, curY + hHeadVerbas);
  doc.line(xColRef, curY, xColRef, curY + hHeadVerbas);
  doc.line(xColProv, curY, xColProv, curY + hHeadVerbas);
  doc.line(xColDescVal, curY, xColDescVal, curY + hHeadVerbas);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Cod.', xColCod + 1.5, curY + 3.0);
  doc.text('Descrição', xColDesc + 1.5, curY + 3.0);
  doc.text('Referência', xColProv - 2, curY + 3.0, { align: 'right' });
  doc.text('Provento', xColDescVal - 2, curY + 3.0, { align: 'right' });
  doc.text('Desconto', xRightLimit - 2, curY + 3.0, { align: 'right' });

  curY += hHeadVerbas;

  // 7. CORPO DA TABELA DE VERBAS (altura fixa de 50 mm com divisórias contínuas)
  const hCorpoVerbas = 50;
  const tableStartY = curY;

  doc.rect(marginLeft, tableStartY, contentWidth, hCorpoVerbas, 'S');
  doc.line(xColDesc, tableStartY, xColDesc, tableStartY + hCorpoVerbas);
  doc.line(xColRef, tableStartY, xColRef, tableStartY + hCorpoVerbas);
  doc.line(xColProv, tableStartY, xColProv, tableStartY + hCorpoVerbas);
  doc.line(xColDescVal, tableStartY, xColDescVal, tableStartY + hCorpoVerbas);

  let rowY = tableStartY + 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (const item of folha.itens) {
    doc.text(item.rubricaCodigo, xColCod + 1.5, rowY);
    doc.text(item.descricao.substring(0, 48), xColDesc + 1.5, rowY);

    const refStr = typeof item.referencia === 'number' ? formatarValorDecimal(item.referencia) : String(item.referencia || '');
    doc.text(refStr, xColProv - 2, rowY, { align: 'right' });

    if (item.provento > 0) {
      doc.text(formatarValorDecimal(item.provento), xColDescVal - 2, rowY, { align: 'right' });
    }
    if (item.desconto > 0) {
      doc.text(formatarValorDecimal(item.desconto), xRightLimit - 2, rowY, { align: 'right' });
    }

    rowY += 4.2;
  }

  curY = tableStartY + hCorpoVerbas;

  // 8. QUADRO DE TOTAIS (Y: curY a curY + 13.5 mm)
  // Linha 1 (6.8 mm): Total de Proventos e Total de Descontos
  // Linha 2 (6.7 mm): Célula sombreada cinza de Líquido a Receber à direita
  const hTotais = 13.5;
  const hTotRow1 = 6.8;
  const hTotRow2 = 6.7;

  doc.rect(marginLeft, curY, contentWidth, hTotais, 'S');
  doc.line(marginLeft, curY + hTotRow1, xRightLimit, curY + hTotRow1);

  // Divisórias da linha de Proventos/Descontos
  doc.line(xColProv, curY, xColProv, curY + hTotRow1);
  doc.line(xColDescVal, curY, xColDescVal, curY + hTotRow1);

  // Total de Proventos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Total de Proventos', xColDescVal - 2, curY + 2.7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(formatarValorDecimal(folha.totalProventos), xColDescVal - 2, curY + 5.9, { align: 'right' });

  // Total de Descontos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Total de Descontos', xRightLimit - 2, curY + 2.7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(formatarValorDecimal(folha.totalDescontos), xRightLimit - 2, curY + 5.9, { align: 'right' });

  // Linha 2 de Totais: Fundo cinza para "Líquido a Receber" no compartimento da direita
  const yLiq = curY + hTotRow1;
  doc.setFillColor(215, 215, 215);
  doc.rect(xColDescVal, yLiq, 25, hTotRow2, 'F');
  doc.line(xColDescVal, yLiq, xColDescVal, yLiq + hTotRow2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Líquido a Receber', xRightLimit - 2, yLiq + 2.6, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(formatarValorDecimal(folha.valorLiquido), xRightLimit - 2, yLiq + 5.8, { align: 'right' });

  curY += hTotais;

  // 9. FAIXA INFERIOR (6 compartimentos iguais na ordem exata solicitada)
  // 1. Salário Contratual | 2. Base de Cálculo do INSS | 3. Base de Cálculo do FGTS | 4. FGTS | 5. FGTS Contribuição Social | 6. Base de Cálculo do IRRF(S)
  const hFaixa = 7.6;
  const colW = contentWidth / 6; // 28.33 mm cada

  doc.rect(marginLeft, curY, contentWidth, hFaixa, 'S');

  for (let i = 1; i < 6; i++) {
    const xDiv = marginLeft + (i * colW);
    doc.line(xDiv, curY, xDiv, curY + hFaixa);
  }

  const bases = [
    { label: 'Salário Contratual', valor: folha.salarioBase || empregado.salarioBase || 0, sempreExibir: true },
    { label: 'Base de Cálculo do INSS', valor: folha.bases.baseINSS, sempreExibir: true },
    { label: 'Base de Cálculo do FGTS', valor: empregado.optanteFGTS ? folha.bases.baseFGTS : 0, sempreExibir: empregado.optanteFGTS },
    { label: 'FGTS', valor: empregado.optanteFGTS ? folha.encargosEmpresa?.fgtsDevido || 0 : 0, sempreExibir: empregado.optanteFGTS },
    { label: 'FGTS Contribuição Social', valor: 0, sempreExibir: false },
    { label: 'Base de Cálculo do IRRF(S)', valor: folha.bases.baseIRRF, sempreExibir: folha.bases.baseIRRF > 0 },
  ];

  for (let i = 0; i < bases.length; i++) {
    const b = bases[i];
    const xCenter = marginLeft + (i * colW) + (colW / 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(0, 0, 0);
    doc.text(b.label, xCenter, curY + 2.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const valorStr = b.sempreExibir ? formatarValorDecimal(b.valor) : '';
    if (valorStr) {
      doc.text(valorStr, xCenter, curY + 6.4, { align: 'center' });
    }
  }

  curY += hFaixa;
  return curY;
}

/**
 * Gera PDF do Recibo de Pagamento de um único trabalhador (A4 Retrato)
 */
export function gerarReciboPagamentoIndividualPDF(
  folha: FolhaEmpregado,
  empresa: Empresa,
  empregado: Empregado,
  options?: { returnBlobUrl?: boolean }
): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  desenharReciboPagamentoNaPagina(doc, folha, empresa, empregado);

  const fileName = `Recibo_Pagamento_${folha.competencia.replace('/', '-')}_${empregado.matricula}_${empregado.nomeCompleto.replace(/\s+/g, '_')}.pdf`;

  if (options?.returnBlobUrl) {
    return doc.output('bloburl').toString();
  } else {
    doc.save(fileName);
  }
}

/**
 * Gera Recibos de Pagamento em lote para TODOS os trabalhadores calculados
 * Cada trabalhador inicia em uma nova página A4 Retrato.
 */
export function gerarRecibosEmLotePDF(
  empresa: Empresa,
  competencia: string,
  folhas: FolhaEmpregado[],
  empregados: Empregado[],
  options?: { returnBlobUrl?: boolean }
): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < folhas.length; i++) {
    if (i > 0) {
      doc.addPage('a4', 'portrait');
    }
    const folha = folhas[i];
    const emp = empregados.find(e => e.id === folha.empregadoId) || {
      id: folha.empregadoId,
      matricula: folha.matricula,
      nomeCompleto: folha.nomeEmpregado,
      cargo: folha.cargo,
      departamento: folha.departamento,
      salarioBase: folha.salarioBase,
      cpf: '000.000.000-00',
      dataAdmissao: '2024-01-01',
      vinculo: 'CLT' as const,
      status: 'ativo' as const,
      rg: '',
      orgaoExpedidor: '',
      pis: '',
      dataNascimento: '',
      sexo: 'M' as const,
      estadoCivil: 'SOLTEIRO' as const,
      nacionalidade: 'Brasileira',
      email: '',
      telefone: '',
      endereco: { logradouro: '', numero: '', bairro: '', cidade: '', uf: '', cep: '' },
      dadosBancarios: { banco: 'Banco', codigoBanco: '001', agencia: '0001', conta: '00000-0', tipoConta: 'CORRENTE' as const },
      cbo: '',
      centroDeCusto: '',
      tipoSalario: 'MENSALISTA' as const,
      jornadaHorasSemanais: 44,
      divisorHoras: 220,
      escala: '',
      tipoContrato: 'INDETERMINADO' as const,
      dependentes: [],
      beneficios: [],
      documentosAdmissao: [],
      historicoAlteracoes: [],
      optanteFGTS: true,
      aliquotaFGTS: 0.08,
      empresaId: empresa.id,
    };

    desenharReciboPagamentoNaPagina(doc, folha, empresa, emp);
  }

  const fileName = `Recibos_Folha_Lote_${competencia.replace('/', '-')}_${empresa.nomeFantasia || 'Empresa'}.pdf`;

  if (options?.returnBlobUrl) {
    return doc.output('bloburl').toString();
  } else {
    doc.save(fileName);
  }
}

/**
 * Compatibilidade legada para emissão individual direta (Contracheque)
 */
export function gerarContrachequePDF(folha: FolhaEmpregado, empresa: Empresa, empregado: Empregado) {
  gerarReciboPagamentoIndividualPDF(folha, empresa, empregado);
}

/**
 * Desenha um campo com borda retangular, label superior pequena e valor formatado
 */
function desenharCampoTRCT(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  valor: string,
  options?: { alignValue?: 'left' | 'right' | 'center'; boldValue?: boolean; labelWidth?: number }
) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(30, 30, 30);
  doc.text(label, x + 1.2, y + 2.5);

  doc.setFont('helvetica', options?.boldValue ? 'bold' : 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(0, 0, 0);

  const valY = y + h - 1.8;
  if (options?.alignValue === 'right') {
    doc.text(valor || '', x + w - 1.5, valY, { align: 'right' });
  } else if (options?.alignValue === 'center') {
    doc.text(valor || '', x + (w / 2), valY, { align: 'center' });
  } else {
    doc.text(valor || '', x + 1.2, valY);
  }
}

/**
 * Desenha o cabeçalho de seção com fundo cinza claro e borda preta
 */
function desenharBarraSecaoTRCT(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  titulo: string,
  align: 'left' | 'center' = 'center',
  fontSize: number = 7.5
) {
  doc.setFillColor(225, 225, 225);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);

  const textX = align === 'center' ? x + (w / 2) : x + 2;
  const textY = y + (h / 2) + (fontSize * 0.12);
  doc.text(titulo, textX, textY, { align });
}

/**
 * Desenha uma célula de verba ou dedução (Rubrica / Descrição e Valor)
 */
function desenharCelulaRubricaValor(
  doc: jsPDF,
  x: number,
  y: number,
  rubricaW: number,
  valorW: number,
  h: number,
  rubricaTexto: string,
  valorNumerico: number,
  options?: { isHeader?: boolean; isTotal?: boolean; isLiquid?: boolean; hideZero?: boolean }
) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  if (options?.isHeader) {
    doc.setFillColor(242, 242, 242);
    doc.rect(x, y, rubricaW, h, 'FD');
    doc.rect(x + rubricaW, y, valorW, h, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(0, 0, 0);
    doc.text(rubricaTexto, x + 1.5, y + (h / 2) + 1.0);
    doc.text('Valor', x + rubricaW + valorW - 1.5, y + (h / 2) + 1.0, { align: 'right' });
    return;
  }

  if (options?.isTotal || options?.isLiquid) {
    doc.setFillColor(232, 232, 232);
    doc.rect(x, y, rubricaW, h, 'FD');
    doc.rect(x + rubricaW, y, valorW, h, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.text(rubricaTexto, x + 1.5, y + (h / 2) + 1.1);

    doc.setFontSize(7.2);
    doc.text(formatarValorDecimal(valorNumerico), x + rubricaW + valorW - 1.5, y + (h / 2) + 1.1, { align: 'right' });
    return;
  }

  doc.rect(x, y, rubricaW, h, 'S');
  doc.rect(x + rubricaW, y, valorW, h, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(0, 0, 0);

  // Quebra linhas se houver \n
  const linhas = rubricaTexto.split('\n');
  if (linhas.length > 1) {
    doc.text(linhas[0], x + 1.2, y + 2.3);
    doc.text(linhas[1], x + 1.2, y + 4.5);
  } else {
    doc.text(rubricaTexto, x + 1.2, y + (h / 2) + 0.8);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.text(formatarValorDecimal(valorNumerico), x + rubricaW + valorW - 1.2, y + (h / 2) + 1.0, { align: 'right' });
}

/**
 * PÁGINA 1 — TERMO DE RESCISÃO DO CONTRATO DE TRABALHO
 */
function desenharTRCTPagina1(
  doc: jsPDF,
  rescisao: RescisaoSimulada,
  empresa: Empresa,
  empregado: Empregado
) {
  const marginLeft = 10;
  const contentWidth = 190;
  let curY = 10;

  // Título Principal
  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 6.5, 'TERMO DE RESCISÃO DO CONTRATO DE TRABALHO', 'center', 9.5);
  curY += 6.5;

  // 1. IDENTIFICAÇÃO DO EMPREGADOR (Campos 01 a 09)
  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 4.2, 'IDENTIFICAÇÃO DO EMPREGADOR', 'center', 7.5);
  curY += 4.2;

  // Linha 1 (01, 02)
  const hRow = 7.5;
  desenharCampoTRCT(doc, marginLeft, curY, 55, hRow, '01 CNPJ/CEI', formatarCNPJ(empresa.cnpj));
  desenharCampoTRCT(doc, marginLeft + 55, curY, 135, hRow, '02 Razão Social/Nome', empresa.razaoSocial);
  curY += hRow;

  // Linha 2 (03, 04)
  const endEmp = empresa.endereco || ({} as any);
  const enderecoEmpresa = `${endEmp.logradouro || ''}${endEmp.numero ? `, ${endEmp.numero}` : ''}`;
  desenharCampoTRCT(doc, marginLeft, curY, 140, hRow, '03 Endereço (logradouro, nº, andar, apartamento)', enderecoEmpresa);
  desenharCampoTRCT(doc, marginLeft + 140, curY, 50, hRow, '04 Bairro', endEmp.bairro || '');
  curY += hRow;

  // Linha 3 (05, 06, 07, 08, 09)
  const cnaeCod = empresa.cnaePrincipal ? empresa.cnaePrincipal.split(' ')[0] : '4781-4/00';
  desenharCampoTRCT(doc, marginLeft, curY, 70, hRow, '05 Município', endEmp.cidade || '');
  desenharCampoTRCT(doc, marginLeft + 70, curY, 16, hRow, '06 UF', endEmp.uf || '');
  desenharCampoTRCT(doc, marginLeft + 86, curY, 28, hRow, '07 CEP', endEmp.cep || '');
  desenharCampoTRCT(doc, marginLeft + 114, curY, 30, hRow, '08 CNAE', cnaeCod);
  desenharCampoTRCT(doc, marginLeft + 144, curY, 46, hRow, '09 CNPJ/CEI Tomador/Obra', empregado.cnpjTomadorObra || '');
  curY += hRow;

  // 2. IDENTIFICAÇÃO DO TRABALHADOR (Campos 10 a 20)
  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 4.2, 'IDENTIFICAÇÃO DO TRABALHADOR', 'center', 7.5);
  curY += 4.2;

  // Linha 1 (10, 11)
  desenharCampoTRCT(doc, marginLeft, curY, 55, hRow, '10 PIS/PASEP', empregado.pis || '');
  desenharCampoTRCT(doc, marginLeft + 55, curY, 135, hRow, '11 Nome', (empregado.nomeCompleto || '').toUpperCase());
  curY += hRow;

  // Linha 2 (12, 13)
  const endTrab = empregado.endereco || ({} as any);
  const enderecoEmpregado = `${endTrab.logradouro || ''}${endTrab.numero ? `, ${endTrab.numero}` : ''}${endTrab.complemento ? ', ' + endTrab.complemento : ''}`;
  desenharCampoTRCT(doc, marginLeft, curY, 135, hRow, '12 Endereço (logradouro, nº, andar, apartamento)', enderecoEmpregado);
  desenharCampoTRCT(doc, marginLeft + 135, curY, 55, hRow, '13 Bairro', endTrab.bairro || '');
  curY += hRow;

  // Linha 3 (14, 15, 16, 17, 18)
  const ctpsStr = `${empregado.ctpsNumero || '00000842279'}/${empregado.ctpsSerie || '00050'} ${empregado.ctpsUF || endTrab.uf || ''}`;
  desenharCampoTRCT(doc, marginLeft, curY, 68, hRow, '14 Município', endTrab.cidade || '');
  desenharCampoTRCT(doc, marginLeft + 68, curY, 16, hRow, '15 UF', endTrab.uf || '');
  desenharCampoTRCT(doc, marginLeft + 84, curY, 28, hRow, '16 CEP', endTrab.cep || '');
  desenharCampoTRCT(doc, marginLeft + 112, curY, 46, hRow, '17 CTPS (nº, série, UF)', ctpsStr);
  desenharCampoTRCT(doc, marginLeft + 158, curY, 32, hRow, '18 CPF', formatarCPF(empregado.cpf));
  curY += hRow;

  // Linha 4 (19, 20)
  desenharCampoTRCT(doc, marginLeft, curY, 48, hRow, '19 Data de nascimento', formatarData(empregado.dataNascimento));
  desenharCampoTRCT(doc, marginLeft + 48, curY, 142, hRow, '20 Nome da mãe', (empregado.nomeMae || 'NÃO INFORMADA').toUpperCase());
  curY += hRow;

  // 3. DADOS DO CONTRATO (Campos 21 a 32)
  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 4.2, 'DADOS DO CONTRATO', 'center', 7.5);
  curY += 4.2;

  // Linha 1 (21)
  const tipoContratoStr = rescisao.tipoContratoDescricao || (empregado.tipoContrato === 'EXPERIENCIA_45_45' ? '2 - Contrato de trabalho por prazo determinado' : '1 - Contrato de trabalho por prazo indeterminado');
  desenharCampoTRCT(doc, marginLeft, curY, contentWidth, hRow, '21 Tipo de Contrato', tipoContratoStr);
  curY += hRow;

  // Linha 2 (22)
  desenharCampoTRCT(doc, marginLeft, curY, contentWidth, hRow, '22 Causa do Afastamento', rescisao.causaAfastamentoDescricao || 'Despedida sem justa causa, pelo empregador');
  curY += hRow;

  // Linha 3 (23, 24, 25, 26, 27)
  const remunAnt = formatarValorDecimal(rescisao.remuneracaoMesAnterior || empregado.salarioBase);
  desenharCampoTRCT(doc, marginLeft, curY, 38, hRow, '23 Remuneração Mês Ant.', remunAnt);
  desenharCampoTRCT(doc, marginLeft + 38, curY, 34, hRow, '24 Data de admissão', formatarData(empregado.dataAdmissao));
  desenharCampoTRCT(doc, marginLeft + 72, curY, 40, hRow, '25 Data do Aviso Prévio', formatarData(rescisao.dataAviso));
  desenharCampoTRCT(doc, marginLeft + 112, curY, 38, hRow, '26 Data de afastamento', formatarData(rescisao.dataDesligamento));
  desenharCampoTRCT(doc, marginLeft + 150, curY, 40, hRow, '27 Cód. afastamento', rescisao.codigoAfastamento || 'SJ2');
  curY += hRow;

  // Linha 4 (28, 29, 30)
  const pensaoTRCT = `${formatarValorDecimal(empregado.pensaoAlimenticiaPercentualTRCT || 0)}%`;
  const pensaoFGTS = `${formatarValorDecimal(empregado.pensaoAlimenticiaPercentualFGTS || 0)}%`;
  desenharCampoTRCT(doc, marginLeft, curY, 40, hRow, '28 Pensão Alim. (%) TRCT', pensaoTRCT);
  desenharCampoTRCT(doc, marginLeft + 40, curY, 42, hRow, '29 Pens. alim.(%) FGTS', pensaoFGTS);
  desenharCampoTRCT(doc, marginLeft + 82, curY, 108, hRow, '30 Categoria do Trabalhador', empregado.categoriaTrabalhador || '01 - Empregado');
  curY += hRow;

  // Linha 5 (31, 32)
  desenharCampoTRCT(doc, marginLeft, curY, 50, hRow, '31 Código Sindical', empregado.codigoSindical || '000.000.00000-0');
  desenharCampoTRCT(doc, marginLeft + 50, curY, 140, hRow, '32 CNPJ e Nome da Entidade Sindical Laboral', empregado.sindicatoLaboral || '06.302.632/0001-96 - SINDICATO DOS COMERCIARIOS');
  curY += hRow;

  // 4. DISCRIMINAÇÃO DAS VERBAS RESCISÓRIAS
  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 4.2, 'DISCRIMINAÇÃO DAS VERBAS RESCISÓRIAS', 'center', 7.5);
  curY += 4.2;

  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 4.0, 'VERBAS RESCISÓRIAS', 'left', 7.0);
  curY += 4.0;

  // Cabeçalho das 3 colunas de Rubricas
  // colWidth = 190 / 3 = 63.333 mm
  // par: rubricaW = 46.333, valorW = 17.000
  const pairW = contentWidth / 3;
  const valW = 17.0;
  const rubW = pairW - valW;
  const hVerbaRow = 5.2;

  // Linha de cabeçalho das 3 colunas
  for (let i = 0; i < 3; i++) {
    const pX = marginLeft + (i * pairW);
    desenharCelulaRubricaValor(doc, pX, curY, rubW, valW, 4.0, 'Rubrica', 0, { isHeader: true });
  }
  curY += 4.0;

  // Dados das Verbas Rescisórias pré-impressas
  const avos13 = rescisao.avosDecimoTerceiro || 9;
  const avosFerias = rescisao.avosFerias || 3;
  const diasAviso = rescisao.diasAvisoIndenizado || 3;
  const feriasPropBase = rescisao.feriasProporcionaisBase ?? Math.round((rescisao.feriasProporcionaisComTerco * 0.75) * 100) / 100;
  const tercoFerias = rescisao.tercoFeriasConstitucional ?? Math.round((rescisao.feriasProporcionaisComTerco * 0.25) * 100) / 100;

  const verbasMatriz: Array<[string, number, string, number, string, number]> = [
    [
      `50 Saldo de ${rescisao.saldoSalarioDias}/dia(s) Salário \n(Líquido de _/falta(s) e DSR)`,
      rescisao.valorSaldoSalario,
      '51 Comissões',
      0,
      '52 Gratificação',
      0,
    ],
    [
      '53 Adic. de Insalubridade %',
      0,
      '54 Adic. de Periculosidade %',
      0,
      '55 Adic. Noturno _ Horas a_%',
      0,
    ],
    [
      '56.1 Horas Extras _ horas a_%',
      0,
      '57 Gorjetas',
      0,
      '58 Descanso Semanal \nRemunerado(DSR)',
      0,
    ],
    [
      '59 Reflexo do DSR sobre \nSalário Variável',
      0,
      '60 Multa Art. 477, §8º/CLT',
      0,
      '62 Salário-Família',
      0,
    ],
    [
      `63 13º Salário Proporcional \n${avos13}/12 avos`,
      rescisao.decimoTerceiroProporcional,
      '64.1 13º Salário-Exerc. _ _/12 \navos',
      0,
      `65 Férias Proporc. ${avosFerias}/12 avos`,
      feriasPropBase,
    ],
    [
      '66.1 Férias Venc. Per. Aquis. \n/ / a / /',
      rescisao.feriasVencidasBase || 0,
      '68 Terço Constituc. de Férias',
      tercoFerias,
      `69 Aviso Prévio Indenizado ${diasAviso} \ndias`,
      rescisao.valorAvisoPrevio,
    ],
    [
      '70 13º Salário (Aviso Prévio \nIndenizado)',
      rescisao.decimoTerceiroIndenizado || 0,
      '71 Férias (Aviso Prévio \nIndenizado)',
      0,
      '99 Ajuste do Saldo Devedor',
      0,
    ],
    // Linha vazia 1
    ['', 0, '', 0, '', 0],
    // Linha vazia 2
    ['', 0, '', 0, '', 0],
  ];

  for (const row of verbasMatriz) {
    // Par 1
    desenharCelulaRubricaValor(doc, marginLeft, curY, rubW, valW, hVerbaRow, row[0], row[1]);
    // Par 2
    desenharCelulaRubricaValor(doc, marginLeft + pairW, curY, rubW, valW, hVerbaRow, row[2], row[3]);
    // Par 3
    desenharCelulaRubricaValor(doc, marginLeft + (2 * pairW), curY, rubW, valW, hVerbaRow, row[4], row[5]);
    curY += hVerbaRow;
  }

  // Linha de Fechamento do TOTAL BRUTO
  doc.rect(marginLeft, curY, pairW, hVerbaRow, 'S');
  doc.rect(marginLeft + pairW, curY, pairW, hVerbaRow, 'S');
  desenharCelulaRubricaValor(doc, marginLeft + (2 * pairW), curY, rubW, valW, hVerbaRow, 'TOTAL BRUTO', rescisao.totalBruto, { isTotal: true });
  curY += hVerbaRow;

  // 5. DEDUÇÕES
  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 4.0, 'DEDUÇÕES', 'left', 7.0);
  curY += 4.0;

  // Cabeçalho das 3 colunas de Deduções
  for (let i = 0; i < 3; i++) {
    const pX = marginLeft + (i * pairW);
    desenharCelulaRubricaValor(doc, pX, curY, rubW, valW, 4.0, 'Desconto', 0, { isHeader: true });
  }
  curY += 4.0;

  const inss13Valor = rescisao.descontos.inssDecimoTerceiro || rescisao.descontos.outrosDescontos || 0;

  const deducoesMatriz: Array<[string, number, string, number, string, number]> = [
    [
      '100 Pensão Alimentícia',
      rescisao.descontos.pensaoAlimenticia || 0,
      '101 Adiantamento Salarial',
      rescisao.descontos.adiantamentoJaPago || 0,
      '102 Adiantamento 13º Salário',
      0,
    ],
    [
      '103 Aviso Prévio Indenizado \ndias',
      rescisao.descontos.avisoPrevioDescontado || 0,
      '112.1 Previdência Social',
      rescisao.descontos.inssSaldoSalario,
      '112.2 Prev. Social - 13º Salário',
      inss13Valor,
    ],
    [
      '114.1 IRRF',
      rescisao.descontos.irrfRescisao || 0,
      '114.2 IRRF sobre 13º Salário',
      rescisao.descontos.irrfDecimoTerceiro || 0,
      '',
      0,
    ],
  ];

  for (const row of deducoesMatriz) {
    desenharCelulaRubricaValor(doc, marginLeft, curY, rubW, valW, hVerbaRow, row[0], row[1]);
    desenharCelulaRubricaValor(doc, marginLeft + pairW, curY, rubW, valW, hVerbaRow, row[2], row[3]);
    desenharCelulaRubricaValor(doc, marginLeft + (2 * pairW), curY, rubW, valW, hVerbaRow, row[4], row[5]);
    curY += hVerbaRow;
  }

  // Linhas de Fechamento: TOTAL DEDUÇÕES e VALOR LÍQUIDO
  doc.rect(marginLeft, curY, pairW * 2, hVerbaRow, 'S');
  desenharCelulaRubricaValor(doc, marginLeft + (2 * pairW), curY, rubW, valW, hVerbaRow, 'TOTAL DEDUÇÕES', rescisao.totalDescontos, { isTotal: true });
  curY += hVerbaRow;

  doc.rect(marginLeft, curY, pairW * 2, hVerbaRow, 'S');
  desenharCelulaRubricaValor(doc, marginLeft + (2 * pairW), curY, rubW, valW, hVerbaRow, 'VALOR LÍQUIDO', rescisao.liquidoRescisao, { isLiquid: true });
  curY += hVerbaRow;
}

/**
 * PÁGINA 2 — TERMO DE HOMOLOGAÇÃO DE RESCISÃO DO CONTRATO DE TRABALHO
 */
function desenharHomologacaoPagina2(
  doc: jsPDF,
  rescisao: RescisaoSimulada,
  empresa: Empresa,
  empregado: Empregado
) {
  const marginLeft = 10;
  const contentWidth = 190;
  let curY = 10;
  const hRow = 7.5;

  // Título Principal
  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 6.5, 'TERMO DE HOMOLOGAÇÃO DE RESCISÃO DO CONTRATO DE TRABALHO', 'center', 9.5);
  curY += 6.5;

  // Se estiver pendente de pagamento (Minuta)
  if (rescisao.isMinuta || (rescisao.status !== 'PAGA' && rescisao.status !== 'HOMOLOGADA')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 50, 50);
    doc.text('DOCUMENTO EMITIDO COMO MINUTA - PAGAMENTO E HOMOLOGAÇÃO PENDENTES', 105, curY + 4, { align: 'center' });
    curY += 5.5;
  }

  // 1. EMPREGADOR (Campos 01, 02)
  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 4.2, 'EMPREGADOR', 'left', 7.5);
  curY += 4.2;

  desenharCampoTRCT(doc, marginLeft, curY, 55, hRow, '01 CNPJ/CEI', formatarCNPJ(empresa.cnpj));
  desenharCampoTRCT(doc, marginLeft + 55, curY, 135, hRow, '02 Razão Social/Nome', empresa.razaoSocial);
  curY += hRow;

  // 2. TRABALHADOR (Campos 10, 11, 17, 18, 19, 20)
  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 4.2, 'TRABALHADOR', 'left', 7.5);
  curY += 4.2;

  // Linha 1: 10 PIS / PASEP, 11 Nome
  desenharCampoTRCT(doc, marginLeft, curY, 55, hRow, '10 PIS / PASEP', empregado.pis || '');
  desenharCampoTRCT(doc, marginLeft + 55, curY, 135, hRow, '11 Nome', (empregado.nomeCompleto || '').toUpperCase());
  curY += hRow;

  // Linha 2: 17 CTPS, 18 CPF, 19 Data de nascimento, 20 Nome da mãe
  const ctpsStr = `${empregado.ctpsNumero || '00000842279'}/${empregado.ctpsSerie || '00050'} ${empregado.ctpsUF || empregado.endereco?.uf || ''}`;
  desenharCampoTRCT(doc, marginLeft, curY, 55, hRow, '17 CTPS (nº, série, UF)', ctpsStr);
  desenharCampoTRCT(doc, marginLeft + 55, curY, 35, hRow, '18 CPF', formatarCPF(empregado.cpf));
  desenharCampoTRCT(doc, marginLeft + 90, curY, 35, hRow, '19 Data de nascimento', formatarData(empregado.dataNascimento));
  desenharCampoTRCT(doc, marginLeft + 125, curY, 65, hRow, '20 Nome da mãe', (empregado.nomeMae || 'NÃO INFORMADA').toUpperCase());
  curY += hRow;

  // 3. CONTRATO (Campos 22, 24, 25, 26, 27, 29, 30, 31, 32)
  desenharBarraSecaoTRCT(doc, marginLeft, curY, contentWidth, 4.2, 'CONTRATO', 'left', 7.5);
  curY += 4.2;

  // Linha 1: 22 Causa do Afastamento
  desenharCampoTRCT(doc, marginLeft, curY, contentWidth, hRow, '22 Causa do Afastamento', rescisao.causaAfastamentoDescricao || 'Despedida sem justa causa, pelo empregador');
  curY += hRow;

  // Linha 2: 24 Data admissão, 25 Data Aviso, 26 Data afastamento, 27 Cód. Afast., 29 Pensão FGTS
  const pensaoFGTS = `${formatarValorDecimal(empregado.pensaoAlimenticiaPercentualFGTS || 0)}%`;
  desenharCampoTRCT(doc, marginLeft, curY, 38, hRow, '24 Data de admissão', formatarData(empregado.dataAdmissao));
  desenharCampoTRCT(doc, marginLeft + 38, curY, 42, hRow, '25 Data do Aviso Prévio', formatarData(rescisao.dataAviso));
  desenharCampoTRCT(doc, marginLeft + 80, curY, 40, hRow, '26 Data de afastamento', formatarData(rescisao.dataDesligamento));
  desenharCampoTRCT(doc, marginLeft + 120, curY, 28, hRow, '27 Cód. Afast.', rescisao.codigoAfastamento || 'SJ2');
  desenharCampoTRCT(doc, marginLeft + 148, curY, 42, hRow, '29 Pensão Alimentícia (%) FGTS', pensaoFGTS);
  curY += hRow;

  // Linha 3: 30 Categoria do Trabalhador
  desenharCampoTRCT(doc, marginLeft, curY, contentWidth, hRow, '30 Categoria do Trabalhador', empregado.categoriaTrabalhador || '01 - Empregado');
  curY += hRow;

  // Linha 4: 31 Código Sindical, 32 CNPJ e Nome da Entidade Sindical Laboral
  desenharCampoTRCT(doc, marginLeft, curY, 50, hRow, '31 Código Sindical', empregado.codigoSindical || '000.000.00000-0');
  desenharCampoTRCT(doc, marginLeft + 50, curY, 140, hRow, '32 CNPJ e Nome da Entidade Sindical Laboral', empregado.sindicatoLaboral || '06.302.632/0001-96 - SINDICATO DOS COMERCIARIOS');
  curY += hRow + 4.0;

  // 4. TEXTO DECLARATÓRIO DO MODELO
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(0, 0, 0);

  const valorLiquidoFormatado = formatarValorDecimal(rescisao.liquidoRescisao);
  const textoDeclaratorio = `Foi realizada a rescisão do contrato do trabalhador acima qualificado, nos termos do artigo nº 477 da Consolidação das Leis do Trabalho (CLT). Sendo comprovado neste ato o efetivo pagamento das verbas rescisórias especificadas no corpo do TRCT, no valor líquido de R$ ${valorLiquidoFormatado}, o qual, devidamente rubricado pelas partes, é parte integrante do presente Termo. Fica ressalvado o direito de o trabalhador pleitear judicialmente os direitos informados no campo 155, abaixo.`;

  const linhasTexto = doc.splitTextToSize(textoDeclaratorio, contentWidth);
  doc.text(linhasTexto, marginLeft, curY);
  curY += (linhasTexto.length * 4.0) + 6.0;

  // 5. LINHA DE LOCAL E DATA
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('_________________________ / ____ , ____ de ____________________ de ______', 105, curY, { align: 'center' });
  curY += 14.0;

  // 6. QUADROS DE ASSINATURA (Campos 150 a 154)
  // 150 Assinatura do Empregador ou Preposto
  doc.line(marginLeft, curY, marginLeft + 75, curY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('150 Assinatura do Empregador ou Preposto', marginLeft, curY + 3.8);
  curY += 13.0;

  // 151 e 152
  doc.line(marginLeft, curY, marginLeft + 75, curY);
  doc.text('151 Assinatura do Trabalhador', marginLeft, curY + 3.8);

  doc.line(marginLeft + 100, curY, marginLeft + 175, curY);
  doc.text('152 Assinatura do Responsável Legal do Trabalhador', marginLeft + 100, curY + 3.8);
  curY += 13.0;

  // 153 e 154
  doc.line(marginLeft, curY, marginLeft + 75, curY);
  doc.text('153 Carimbo e Assinatura Assistente', marginLeft, curY + 3.8);

  doc.line(marginLeft + 100, curY, marginLeft + 175, curY);
  doc.text('154 Nome do Órgão Homologador', marginLeft + 100, curY + 3.8);
  curY += 10.0;

  // 7. CAMPO 155 – RESSALVAS
  const hRessalvas = 28;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(marginLeft, curY, contentWidth, hRessalvas, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('155 Ressalvas', marginLeft + 1.5, curY + 3.5);

  if (rescisao.ressalvas && rescisao.ressalvas.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const ressalvasLinhas = doc.splitTextToSize(rescisao.ressalvas.trim(), contentWidth - 4);
    doc.text(ressalvasLinhas, marginLeft + 2, curY + 7);
  }
  // Se não houver ressalvas, deixa o espaço livre sem imprimir "[Mensagem]"
  curY += hRessalvas + 4.0;

  // 8. CAMPO 156 – INFORMAÇÕES À CAIXA E RODAPÉ OFICIAL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('156 Informações à CAIXA:', marginLeft, curY + 3.2);
  curY += 4.5;

  doc.setFillColor(225, 225, 225);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(marginLeft, curY, contentWidth, 14, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('A ASSISTÊNCIA NO ATO DE RESCISÃO CONTRATUAL É GRATUITA.', 105, curY + 4.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Pode o trabalhador iniciar ação judicial quanto aos créditos resultantes das relações de trabalho até o limite de', 105, curY + 8.8, { align: 'center' });
  doc.text('dois anos após a extinção do contrato de trabalho (Inc. XXIX, Art. 7º da Constituição Federal/1988)', 105, curY + 12.0, { align: 'center' });
}

/**
 * Gera o documento completo (TRCT Página 1 + Homologação Página 2) em um único PDF
 * em papel A4, orientação retrato, conforme modelo oficial anexo.
 */
export function gerarTRCTeHomologacaoPDF(
  rescisao: RescisaoSimulada,
  empresa: Empresa,
  empregado: Empregado,
  options?: { returnBlobUrl?: boolean }
): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Página 1: Termo de Rescisão do Contrato de Trabalho
  desenharTRCTPagina1(doc, rescisao, empresa, empregado);

  // Página 2: Termo de Homologação de Rescisão do Contrato de Trabalho
  doc.addPage('a4', 'portrait');
  desenharHomologacaoPagina2(doc, rescisao, empresa, empregado);

  const fileName = `TRCT_Homologacao_${empregado.nomeCompleto.replace(/\s+/g, '_')}_${formatarData(rescisao.dataDesligamento).replace(/\//g, '-')}.pdf`;

  if (options?.returnBlobUrl) {
    return doc.output('bloburl').toString();
  } else {
    doc.save(fileName);
  }
}

/**
 * Wrapper de compatibilidade legada
 */
export function gerarTRCTPDF(
  rescisao: RescisaoSimulada,
  empresa: Empresa,
  empregado: Empregado,
  options?: { returnBlobUrl?: boolean }
): string | void {
  return gerarTRCTeHomologacaoPDF(rescisao, empresa, empregado, options);
}

/**
 * -------------------------------------------------------------------------------------------
 * MÓDULO DE DOCUMENTOS DE ADMISSÃO:
 * 1. Contrato de Experiência de Trabalho (Página 1 do modelo de referência)
 * 2. Registro de Empregado (Página 2 do modelo de referência)
 * 3. Conjunto Contrato + Registro em um único PDF (2 páginas)
 * Formato: Papel Carta (Letter: 215.9 x 279.4 mm), orientação Retrato.
 * -------------------------------------------------------------------------------------------
 */

export interface ClausulaContratoItem {
  numero: number;
  titulo?: string;
  texto: string;
}

export const CLAUSULAS_CONTRATO_EXPERIENCIA_PADRAO: ClausulaContratoItem[] = [
  {
    numero: 1,
    titulo: 'Admissão, Função e Remuneração',
    texto: `Fica o EMPREGADO admitido no quadro de funcionários da EMPREGADORA para exercer as funções de {CARGO}, mediante a remuneração de R$ {SALARIO} ( {SALARIO_EXTENSO} ) por mês.\nEm circunstância, porém, de ser a função especificada não importa na intransferibilidade do EMPREGADO para outro serviço no qual demonstre melhor capacidade de adaptação desde que compatível com a sua condição pessoal.`,
  },
  {
    numero: 2,
    titulo: 'Horário de Trabalho e Ficha de Registro',
    texto: `O horário de trabalho será anotado na sua ficha de registro e a eventual redução da jornada, por determinação da EMPREGADORA, não inovará este ajuste, permanecendo sempre íntegra a obrigação do EMPREGADO de cumprir o horário que lhe for determinado, observando o limite legal.`,
  },
  {
    numero: 3,
    titulo: 'Horas Extraordinárias e Banco de Horas',
    texto: `Obriga-se também o EMPREGADO a prestar serviços em horas extraordinárias, sempre que lhe for determinado pela EMPREGADORA, na forma prevista em lei. Na hipótese desta faculdade pela EMPREGADORA, o empregado receberá as horas extraordinárias com o acréscimo legal, salvo a ocorrência de compensação, com a consequente redução da compensação, com a consequente redução da jornada de trabalho em outro dia.`,
  },
  {
    numero: 4,
    titulo: 'Turnos e Revezamento',
    texto: `Aceita o EMPREGADO, expressamente, a condição de prestar serviços em qualquer dos turnos de trabalho, isto é, tanto durante o dia como a noite, desde que sem simultaneidade, observadas as prescrições legais reguladoras do assunto, quanto a remuneração.`,
  },
  {
    numero: 5,
    titulo: 'Transferência de Localidade (Art. 469 da CLT)',
    texto: `Fica ajustado nos termos de que dispõe o parágrafo 1º do artigo 469, da Consolidação das Leis do Trabalho, que o EMPREGADO acatará ordem emanada da EMPREGADORA para a prestação de serviços tanto na localidade de celebração do Contrato de Trabalho, como em qualquer outra cidade, capital ou vila do território nacional, quer essa transferência seja transitória, quer seja definitiva.`,
  },
  {
    numero: 6,
    titulo: 'Regulamento Interno e Disciplinar',
    texto: `No ato da assinatura deste contrato, o EMPREGADO recebe o regulamento interno da empresa cujas cláusulas fazem parte do contrato de trabalho, e a violação de qualquer delas implicará em sanção, cuja graduação dependerá da gravidade da mesma, culminando com a rescisão do contrato.`,
  },
  {
    numero: 7,
    titulo: 'Desconto por Danos e Prejuízos (Art. 462 da CLT)',
    texto: `Em caso de dano causado pelo EMPREGADO, fica a EMPREGADORA, autorizada a efetivar o desconto da importância correspondente ao prejuízo, o qual fará, com fundamentos no parágrafo 1º do artigo 462 da Consolidação das Leis do Trabalho, já que essa possibilidade fica expressamente prevista em Contrato.`,
  },
  {
    numero: 8,
    titulo: 'Cláusula Assecuratória de Rescisão Recíproca (Art. 481 da CLT)',
    texto: `Aos contratos por prazo determinado, que contiverem cláusula assecuratória do direito recíproco de rescisão antes de expirado o termo ajustado, aplicam-se, caso seja exercido tal direito por qualquer das Partes, os princípios que regem a rescisão dos contratos por prazo indeterminado (Art. 481, da CLT).`,
  },
  {
    numero: 9,
    titulo: 'Prazo da Experiência e Avaliação Recíproca',
    texto: `O presente contrato, vigirá durante {DIAS_EXPERIENCIA} dias , sendo celebrado para as partes verificarem reciprocamente, a conveniência ou não de se vincularem em caráter definitivo a Contrato de Trabalho. A Empresa passando a conhecer as aptidões do EMPREGADO e suas qualidades pessoais e morais; o EMPREGADO verificando se o ambiente e os métodos de trabalho atendem a sua conveniência.`,
  },
  {
    numero: 10,
    titulo: 'Conversão em Contrato por Prazo Indeterminado',
    texto: `Na Hipótese deste ajuste transformar-se em Contrato por Prazo Indeterminado, pelo decurso do tempo, continuarão em plena vigência as cláusulas de 1(um) a 7(sete), enquanto durarem as relações do EMPREGADO com a EMPREGADORA. E por estarem de pleno acordo, as partes contratantes, assinam o presente Contrato de Experiência em duas vias, ficando a primeira em poder da EMPREGADORA, e a segunda com o EMPREGADO, que dela dará o competente recibo.`,
  },
];

/**
 * Desenha a Página 1: Contrato de Experiência de Trabalho
 */
export function desenharContratoExperienciaPagina(
  doc: jsPDF,
  empresa: Empresa,
  empregado: Empregado,
  clausulasCustom?: ClausulaContratoItem[]
) {
  const pageWidth = 215.9; // Carta
  const pageHeight = 279.4;
  const marginLeft = 15;
  const contentWidth = 186;

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.2);

  // Título centralizado
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text('Contrato de Experiência de Trabalho', pageWidth / 2, 12, { align: 'center' });

  // Preamble - Identificação das partes
  let curY = 17.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);

  const ctpsStr = empregado.ctpsNumero || '00000842279';
  const serieStr = empregado.ctpsSerie || '00050';
  const matriculaESocial = empregado.matriculaESocial || empregado.cpf || empregado.matricula;

  const endEmpresaContrato = empresa.endereco || ({} as any);
  const textoPreambulo = `Entre a firma ${empresa.razaoSocial} estabelecida em ${endEmpresaContrato.cidade || 'São Paulo'} à ${endEmpresaContrato.logradouro || ''}, ${endEmpresaContrato.numero || ''} CNPJ/CEI ${formatarCNPJ(empresa.cnpj)} doravante designada simplesmente EMPREGADORA e, ${empregado.nomeCompleto} portador da Carteira Profissional No.${ctpsStr} Serie ${serieStr} e matrícula do eSocial ${matriculaESocial} a seguir, chamado apenas de EMPREGADO, é celebrado o presente CONTRATO DE EXPERIÊNCIA, que terá vigência a partir da data de início da prestação de serviços, de acordo com as condições a seguir especificadas:`;

  const preambuloLinhas = doc.splitTextToSize(textoPreambulo, contentWidth);
  doc.text(preambuloLinhas, marginLeft, curY);
  curY += (preambuloLinhas.length * 3.3) + 2.5;

  // Cláusulas 1 a 10
  const clausulasTrabalho = clausulasCustom && clausulasCustom.length === 10
    ? clausulasCustom
    : CLAUSULAS_CONTRATO_EXPERIENCIA_PADRAO;

  const salarioExtenso = numeroParaExtenso(empregado.salarioBase);
  const salarioFormatado = formatarValorDecimal(empregado.salarioBase);
  const cargoFormatado = (empregado.cargo || 'VENDEDOR(A)').toUpperCase();
  const diasExperiencia = empregado.diasExperienciaTotal || 45;

  for (const item of clausulasTrabalho) {
    let textoClausula = item.texto
      .replace('{CARGO}', cargoFormatado)
      .replace('{SALARIO}', salarioFormatado)
      .replace('{SALARIO_EXTENSO}', salarioExtenso)
      .replace('{DIAS_EXPERIENCIA}', String(diasExperiencia));

    const textoCompleto = `${item.numero}- ${textoClausula}`;
    const linhas = doc.splitTextToSize(textoCompleto, contentWidth);
    doc.text(linhas, marginLeft, curY);
    curY += (linhas.length * 3.1) + 1.8;
  }

  // Local e data de assinatura do contrato
  curY += 2.0;
  const cidadeContrato = empresa.endereco?.cidade || 'São Paulo';
  const textoDataContrato = formatarDataPorExtenso(empregado.dataAdmissao || new Date().toISOString().split('T')[0], cidadeContrato);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(textoDataContrato, marginLeft, curY);
  curY += 6.0;

  // Bloco de Assinaturas do Contrato
  // Esquerda: Testemunhas (2 linhas) | Direita: Empregado e Empregador
  const colEsqX = marginLeft;
  const colDirX = marginLeft + 90;
  const lineW = 75;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('Testemunhas', colEsqX, curY);
  doc.text('Empregado ou Responsável quando menor', colDirX, curY);
  curY += 7.0;

  doc.line(colEsqX, curY, colEsqX + lineW, curY);
  doc.line(colDirX, curY, colDirX + lineW, curY);
  curY += 7.5;

  doc.line(colEsqX, curY, colEsqX + lineW, curY);
  doc.text('Empregador', colDirX, curY - 3.5);
  doc.line(colDirX, curY, colDirX + lineW, curY);
  curY += 7.5;

  // Termo de Prorrogação
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Termo de Prorrogação', marginLeft, curY);
  curY += 4.0;

  // Texto da prorrogação
  let dataProrrogadoAte = '__/__/____';
  let dataAssinaturaProrrogacao = `${empresa.endereco?.cidade || 'São Paulo'}, ___ de _________________ de ______`;

  if (empregado.dataFimExperiencia2) {
    dataProrrogadoAte = formatarData(empregado.dataFimExperiencia2);
  }
  if (empregado.dataFimExperiencia1) {
    dataAssinaturaProrrogacao = formatarDataPorExtenso(empregado.dataFimExperiencia1, empresa.endereco?.cidade || 'São Paulo');
  }

  const textoProrrogacao = `Por mútuo acordo entre as partes, fica o presente contrato de experiência, que deveria vencer nesta data prorrogado até ${dataProrrogadoAte}.`;
  doc.setFontSize(7.2);
  doc.text(textoProrrogacao, marginLeft, curY);
  curY += 4.5;

  doc.text(dataAssinaturaProrrogacao, marginLeft, curY);
  curY += 5.5;

  // Assinaturas da Prorrogação
  doc.text('Testemunhas', colEsqX, curY);
  doc.text('Empregado ou Responsável quando menor', colDirX, curY);
  curY += 7.0;

  doc.line(colEsqX, curY, colEsqX + lineW, curY);
  doc.line(colDirX, curY, colDirX + lineW, curY);
  curY += 7.5;

  doc.line(colEsqX, curY, colEsqX + lineW, curY);
  doc.text('Empregador', colDirX, curY - 3.5);
  doc.line(colDirX, curY, colDirX + lineW, curY);

  // Rodapé da Página 1
  const footerY = 271;
  doc.line(marginLeft, footerY, pageWidth - marginLeft, footerY);
  doc.setFontSize(7);
  doc.text('Contrato de Experiência de Trabalho', marginLeft, footerY + 3.8);
  doc.text(': 1', pageWidth - marginLeft, footerY + 3.8, { align: 'right' });
}

/**
 * Desenha a Página 2: Registro de Empregado (Ficha Cadastral Oficial)
 */
export function desenharRegistroEmpregadoPagina(
  doc: jsPDF,
  empresa: Empresa,
  empregado: Empregado
) {
  const marginLeft = 12;
  const contentWidth = 191.9; // Carta 215.9mm - 24mm = 191.9mm
  const startY = 10;
  const totalHeight = 258; // até Y = 268 mm

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.25);

  // Borda Externa Geral do Registro
  doc.rect(marginLeft, startY, contentWidth, totalHeight, 'S');

  // 1. CABEÇALHO (Y: 10 a 20 mm)
  doc.line(marginLeft, 20, marginLeft + contentWidth, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('REGISTRO DE EMPREGADO', marginLeft + (contentWidth / 2), 17, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const matriculaFmt = empregado.matricula ? empregado.matricula.padStart(6, '0') : '000001';
  doc.text(`Número: ${matriculaFmt}`, marginLeft + contentWidth - 2.5, 17, { align: 'right' });

  // 2. QUADRO: EMPREGADOR (Y: 20 a 44 mm)
  const xDivAutenticacao = marginLeft + 148; // Coluna da direita para Autenticação
  doc.line(xDivAutenticacao, 20, xDivAutenticacao, 44);
  doc.line(marginLeft, 44, marginLeft + contentWidth, 44);

  // Coluna Autenticação à direita
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Autenticação', xDivAutenticacao + ((contentWidth - 148) / 2), 41.5, { align: 'center' });

  // Dados do Empregador à esquerda
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Empregador', marginLeft + 1.5, 23.2);

  doc.setFontSize(7.0);
  // Linha 1
  doc.text(`Razão Social:  ${empresa.razaoSocial}`, marginLeft + 3, 27.5);
  doc.text(`CNPJ:  ${formatarCNPJ(empresa.cnpj)}`, marginLeft + 70, 27.5);
  const cnaeTexto = empresa.cnaePrincipal ? empresa.cnaePrincipal.split(' - ')[0] : '';
  doc.text(`Atividade Econômica:  ${cnaeTexto}`, marginLeft + 110, 27.5);

  // Linha 2
  const endEmpReg = empresa.endereco || ({} as any);
  doc.text(`Endereço:  ${endEmpReg.logradouro || ''}${endEmpReg.numero ? `, ${endEmpReg.numero}` : ''}`, marginLeft + 3, 31.8);
  doc.text(`Código Município:  ${empresa.codigoMunicipio || '11300'}`, marginLeft + 110, 31.8);

  // Linha 3
  doc.text(`Bairro:  ${endEmpReg.bairro || ''}`, marginLeft + 3, 36.2);
  doc.text(`Cidade:  ${endEmpReg.cidade || ''}`, marginLeft + 70, 36.2);
  doc.text(`UF:  ${endEmpReg.uf || ''}`, marginLeft + 110, 36.2);

  // Linha 4
  doc.text(`CEP:  ${formatarCEP(endEmpReg.cep || '')}`, marginLeft + 3, 40.5);

  // 3. QUADRO: DADOS PESSOAIS (Y: 44 a 90 mm)
  const wFoto = 28;
  const xDadosPessoais = marginLeft + wFoto;
  doc.line(xDadosPessoais, 44, xDadosPessoais, 90);
  doc.line(marginLeft, 90, marginLeft + contentWidth, 90);

  // Espaço Foto 3x4 à esquerda
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('3 x 4', marginLeft + (wFoto / 2), 67, { align: 'center' });

  // Header Dados Pessoais
  doc.setFontSize(6.8);
  doc.text('Dados Pessoais', xDadosPessoais + 2, 47.2);
  doc.line(xDadosPessoais, 48.5, marginLeft + contentWidth, 48.5);

  // Linhas de Dados Pessoais à direita
  doc.setFontSize(7.0);
  const matriculaESocialFmt = empregado.matriculaESocial || empregado.cpf || empregado.matricula;

  // Linha 1 (Y: 52.5)
  doc.text(`Código:  ${matriculaFmt}`, xDadosPessoais + 3, 52.5);
  doc.text(`Matrícula eSocial:  ${matriculaESocialFmt}`, xDadosPessoais + 50, 52.5);

  // Linha 2 (Y: 56.5)
  doc.text(`Nome:  ${empregado.nomeCompleto.toUpperCase()}`, xDadosPessoais + 3, 56.5);

  // Linha 3 (Y: 60.5)
  const nomePai = (empregado.nomePai || 'ALBERTO PEREIRA').toUpperCase();
  const nomeMae = (empregado.nomeMae || 'FABRICIANA GARCIA PEREIRA').toUpperCase();
  doc.text(`Pai:  ${nomePai}`, xDadosPessoais + 3, 60.5);
  doc.text(`Mãe:  ${nomeMae}`, xDadosPessoais + 70, 60.5);

  // Linha 4 (Y: 64.5)
  doc.text(`Nascimento:  ${formatarData(empregado.dataNascimento)}`, xDadosPessoais + 3, 64.5);
  doc.text(`Naturalidade:  ${empregado.naturalidade || 'Peri Mirim'}`, xDadosPessoais + 45, 64.5);
  doc.text(`UF:  ${empregado.naturalidadeUF || 'MA'}`, xDadosPessoais + 95, 64.5);
  doc.text(`Nacionalidade:  ${empregado.nacionalidadeCodigo || '10'}`, xDadosPessoais + 115, 64.5);

  // Linha 5 (Y: 68.5)
  const sexoDesc = empregado.sexo === 'F' ? 'Feminino' : empregado.sexo === 'M' ? 'Masculino' : 'Outro';
  let estCivilDesc = 'Solteiro';
  if (empregado.estadoCivil === 'CASADO') estCivilDesc = 'Casado';
  else if (empregado.estadoCivil === 'DIVORCIADO') estCivilDesc = 'Divorciado';
  else if (empregado.estadoCivil === 'VIUVO') estCivilDesc = 'Viúvo';
  else if (empregado.estadoCivil === 'UNIAO_ESTAVEL') estCivilDesc = 'União Estável';

  doc.text(`Sexo:  ${sexoDesc}`, xDadosPessoais + 3, 68.5);
  doc.text(`Estado Civil:  ${estCivilDesc}`, xDadosPessoais + 45, 68.5);
  doc.text(`Etnia ou Raça:  ${empregado.etniaRaca || 'Parda'}`, xDadosPessoais + 95, 68.5);

  // Linha 6 (Y: 72.5)
  doc.text(`Instrução:  ${empregado.grauInstrucao || 'Ensino Médio completo'}`, xDadosPessoais + 3, 72.5);

  // Linha 7 (Y: 76.5)
  const endTrabReg = empregado.endereco || ({} as any);
  doc.text(`Endereço:  ${endTrabReg.logradouro || ''}${endTrabReg.numero ? `, ${endTrabReg.numero}` : ''}`, xDadosPessoais + 3, 76.5);
  doc.text(`Bairro:  ${endTrabReg.bairro || ''}`, xDadosPessoais + 95, 76.5);

  // Linha 8 (Y: 80.5)
  doc.text(`Cidade:  ${endTrabReg.cidade || ''}`, xDadosPessoais + 3, 80.5);
  doc.text(`UF:  ${endTrabReg.uf || ''}`, xDadosPessoais + 65, 80.5);
  doc.text(`CEP:  ${formatarCEP(endTrabReg.cep || '')}`, xDadosPessoais + 95, 80.5);

  // Linha 9 (Y: 84.5)
  doc.text(`Fone:  ${empregado.telefone || ''}`, xDadosPessoais + 3, 84.5);
  doc.text(`Celular:  ${empregado.telefone || ''}`, xDadosPessoais + 45, 84.5);
  doc.text(`Email:  ${empregado.email || ''}`, xDadosPessoais + 85, 84.5);

  // 4. QUADRO: DOCUMENTOS (Y: 90 a 123 mm)
  doc.line(marginLeft, 123, marginLeft + contentWidth, 123);
  doc.setFontSize(6.8);
  doc.text('Documentos', marginLeft + 1.5, 93.2);
  doc.line(marginLeft, 94.5, marginLeft + contentWidth, 94.5);

  doc.setFontSize(7.0);
  // Linha 1: CTPS e PIS
  const ctpsNum = empregado.ctpsNumero || '00000842279';
  const ctpsSer = empregado.ctpsSerie || '00050';
  const ctpsUfVal = empregado.ctpsUF || empregado.endereco.uf || 'MA';
  const ctpsEmissao = empregado.ctpsDataEmissao ? formatarData(empregado.ctpsDataEmissao) : '29/04/2015';
  const pisVal = empregado.pis || '124.766.396.90';

  doc.text(`CTPS Número:  ${ctpsNum}`, marginLeft + 3, 98.2);
  doc.text(`Série:  ${ctpsSer}`, marginLeft + 60, 98.2);
  doc.text(`DV:  ${empregado.ctpsDV || ''}`, marginLeft + 85, 98.2);
  doc.text(`UF:  ${ctpsUfVal}`, marginLeft + 105, 98.2);
  doc.text(`Emissão:  ${ctpsEmissao}`, marginLeft + 120, 98.2);
  doc.text(`PIS/PASEP:  ${pisVal}`, marginLeft + 150, 98.2);

  // Linha 2: RG e CPF
  const rgNum = empregado.rg || '0468430220120';
  const rgEmissao = empregado.rgDataEmissao ? formatarData(empregado.rgDataEmissao) : '27/11/2012';
  const rgOrgao = empregado.orgaoExpedidor ? empregado.orgaoExpedidor.split('/')[0] : 'SSP';
  const rgUfVal = empregado.rgUF || empregado.endereco.uf || 'MA';

  doc.text(`RG Número:  ${rgNum}`, marginLeft + 3, 102.5);
  doc.text(`Emissão:  ${rgEmissao}`, marginLeft + 60, 102.5);
  doc.text(`Órgão Emissor:  ${rgOrgao}`, marginLeft + 95, 102.5);
  doc.text(`UF:  ${rgUfVal}`, marginLeft + 130, 102.5);
  doc.text(`CPF:  ${formatarCPF(empregado.cpf)}`, marginLeft + 150, 102.5);

  // Linha 3: Título de Eleitor
  const titNum = empregado.tituloEleitor || '023373011163';
  const titZona = empregado.tituloZona || '001';
  const titSecao = empregado.tituloSecao || '0664';
  doc.text(`Título:  ${titNum}`, marginLeft + 3, 106.8);
  doc.text(`Zona:  ${titZona}`, marginLeft + 60, 106.8);
  doc.text(`Seção:  ${titSecao}`, marginLeft + 95, 106.8);

  // Linha 4: Certificado Militar
  doc.text(`Certif. Militar:  ${empregado.certificadoMilitar || ''}`, marginLeft + 3, 111.0);
  doc.text(`Série:  ${empregado.militarSerie || ''}`, marginLeft + 60, 111.0);
  doc.text(`Tipo:  ${empregado.militarTipo || ''}`, marginLeft + 95, 111.0);
  doc.text(`Categoria:  ${empregado.militarCategoria || ''}`, marginLeft + 130, 111.0);

  // Linha 5: CSM/OAM e CNH
  doc.text(`CSM/OAM:  ${empregado.csmOam || ''}`, marginLeft + 3, 115.2);
  doc.text(`RM/DN/COMAR:  ${empregado.rmDnComar || ''}`, marginLeft + 50, 115.2);
  doc.text(`Habilitação:  ${empregado.cnh || ''}`, marginLeft + 130, 115.2);

  // Linha 6: Órgão de Classe
  doc.text(`Órgão Classe:  ${empregado.orgaoClasse || ''}`, marginLeft + 3, 119.5);
  doc.text(`Expedidor:  ${empregado.orgaoClasseExpedidor || ''}`, marginLeft + 50, 119.5);
  doc.text(`UF:  ${empregado.orgaoClasseUF || ''}`, marginLeft + 80, 119.5);
  doc.text(`Expedição:  ${empregado.orgaoClasseExpedicao || ''}`, marginLeft + 110, 119.5);
  doc.text(`Validade:  ${empregado.orgaoClasseValidade || ''}`, marginLeft + 145, 119.5);

  // 5. QUADRO: IMIGRAÇÃO (Y: 123 a 133 mm)
  doc.line(marginLeft, 133, marginLeft + contentWidth, 133);
  doc.setFontSize(6.8);
  doc.text('Imigração', marginLeft + 1.5, 126.0);
  doc.line(marginLeft, 127.2, marginLeft + contentWidth, 127.2);

  doc.setFontSize(7.0);
  doc.text(`Ano de Chegada:  ${empregado.anoChegadaImigracao || ''}`, marginLeft + 3, 130.8);
  doc.text(`Tipo de Visto:  ${empregado.tipoVistoImigracao || ''}`, marginLeft + 45, 130.8);
  doc.text(`Validade da RG:  ${empregado.validadeRGImigracao || ''}`, marginLeft + 90, 130.8);
  doc.text(`Validade da CTPS:  ${empregado.validadeCTPSImigracao || ''}`, marginLeft + 135, 130.8);

  // 6. QUADRO: DADOS CONTRATUAIS (Y: 133 a 143 mm)
  doc.line(marginLeft, 143, marginLeft + contentWidth, 143);
  doc.setFontSize(6.8);
  doc.text('Dados Contratuais', marginLeft + 1.5, 136.0);
  doc.line(marginLeft, 137.2, marginLeft + contentWidth, 137.2);

  doc.setFontSize(7.0);
  const dataAdmStr = formatarData(empregado.dataAdmissao);
  const formaPgtoStr = empregado.tipoSalario === 'HORISTA' ? 'Horista' : 'Mensal';
  const setorStr = empregado.departamento ? empregado.departamento.toUpperCase() : '001- GERAL';
  const desligamentoStr = empregado.dataDesligamento ? formatarData(empregado.dataDesligamento) : '';

  doc.text(`Admissão:  ${dataAdmStr}`, marginLeft + 3, 140.8);
  doc.text(`Forma de Pgto.:  ${formaPgtoStr}`, marginLeft + 40, 140.8);
  doc.text(`Setor:  ${setorStr}`, marginLeft + 85, 140.8);
  doc.text(`Desligamento:  ${desligamentoStr}`, marginLeft + 145, 140.8);

  // 7. QUADRO: JORNADA DE TRABALHO & OUTRAS INFORMAÇÕES (Y: 143 a 191 mm)
  const xDivJornada = marginLeft + 115;
  doc.line(xDivJornada, 143, xDivJornada, 191);
  doc.line(marginLeft, 191, marginLeft + contentWidth, 191);

  // Lado Esquerdo: Jornada de Trabalho
  doc.setFontSize(6.8);
  doc.text('Jornada de Trabalho', marginLeft + 1.5, 146.0);
  doc.line(marginLeft, 147.2, xDivJornada, 147.2);

  doc.setFontSize(6.5);
  doc.text('JORNADA: 000001 - JORNADA DE TRABALHO   ESCALA:4 - JORNADA', marginLeft + 2, 150.8);
  doc.text('COM HORÁRIO DIÁRIO FIXO E FOLGA FIXA (NO DOMINGO)', marginLeft + 2, 154.5);

  // Cabeçalho da Grade de Horários
  doc.setFontSize(6.8);
  doc.text('DIA    E1          S1          E2          S2          E3    S3    E4    S4', marginLeft + 2, 159.0);

  // Linhas dos Dias da Semana
  const escalaGrade = [
    { dia: 'SEG', e1: '08:00', s1: '12:00', e2: '14:00', s2: '18:00' },
    { dia: 'TER', e1: '08:00', s1: '12:00', e2: '14:00', s2: '18:00' },
    { dia: 'QUA', e1: '08:00', s1: '12:00', e2: '14:00', s2: '18:00' },
    { dia: 'QUI', e1: '08:00', s1: '12:00', e2: '14:00', s2: '18:00' },
    { dia: 'SEX', e1: '08:00', s1: '12:00', e2: '14:00', s2: '18:00' },
    { dia: 'SÁB', e1: '08:00', s1: '12:00', e2: '', s2: '' },
    { dia: 'DOM', e1: 'FOLGA', s1: '', e2: '', s2: '' },
  ];

  let jY = 163.0;
  for (const item of escalaGrade) {
    if (item.dia === 'DOM') {
      doc.text('DOM  FOLGA', marginLeft + 2, jY);
    } else if (item.dia === 'SÁB') {
      doc.text(`SÁB   ${item.e1}    ${item.s1}`, marginLeft + 2, jY);
    } else {
      doc.text(`${item.dia}   ${item.e1}    ${item.s1}    ${item.e2}    ${item.s2}`, marginLeft + 2, jY);
    }
    jY += 4.0;
  }

  // Lado Direito: Outras Informações
  doc.setFontSize(6.8);
  doc.text('Outras Informações', xDivJornada + 1.5, 146.0);
  doc.line(xDivJornada, 147.2, marginLeft + contentWidth, 147.2);

  doc.setFontSize(7.0);
  const cipaDesc = empregado.participaCIPA ? 'Sim' : 'Não';
  const dataAsoDesc = empregado.dataUltimoASO ? formatarData(empregado.dataUltimoASO) : formatarData(empregado.dataAdmissao);
  doc.text(`Participa do CIPA:  ${cipaDesc}`, xDivJornada + 10, 154.5);
  doc.text(`Último Exame Médico:  ${dataAsoDesc}`, xDivJornada + 10, 162.0);

  // 8. QUADRO: HISTÓRICO DE CARGOS E FUNÇÕES (Y: 191 a 205 mm)
  doc.line(marginLeft, 205, marginLeft + contentWidth, 205);
  doc.setFontSize(6.8);
  doc.text('Histórico de Cargos e Funções', marginLeft + 1.5, 194.0);
  doc.line(marginLeft, 195.2, marginLeft + contentWidth, 195.2);

  doc.setFontSize(7.0);
  const mesAnoHist = empregado.dataAdmissao ? `${empregado.dataAdmissao.substring(5, 7)}/${empregado.dataAdmissao.substring(0, 4)}` : '07/2025';
  const cboNumerico = (empregado.cbo || '5211-10').replace(/\D/g, '');
  const cargoStr = (empregado.cargo || 'VENDEDOR(A)').toUpperCase();

  doc.text(`Mês/Ano:  ${mesAnoHist}`, marginLeft + 3, 199.5);
  doc.text(`CBO/Cargo:  ${cboNumerico}-${cargoStr}`, marginLeft + 35, 199.5);
  doc.text(`Função:  ${cargoStr}`, marginLeft + 25, 203.2);

  // 9. QUADRO: HISTÓRICO DE SALÁRIOS (Y: 205 a 219 mm)
  doc.line(marginLeft, 219, marginLeft + contentWidth, 219);
  doc.setFontSize(6.8);
  doc.text('Histórico de Salários', marginLeft + 1.5, 208.0);
  doc.line(marginLeft, 209.2, marginLeft + contentWidth, 209.2);

  doc.setFontSize(7.0);
  doc.text(`Mês/Ano:  ${mesAnoHist}`, marginLeft + 3, 214.5);
  doc.text(`Valor:  ${formatarValorDecimal(empregado.salarioBase)}`, marginLeft + 35, 214.5);

  // 10. ASSINATURAS DO RODAPÉ (Y: 219 a 268 mm)
  const lineY = 258;
  const colW = 75;
  const col1X = marginLeft + 12;
  const col2X = marginLeft + contentWidth - 12 - colW;

  doc.line(col1X, lineY, col1X + colW, lineY);
  doc.line(col2X, lineY, col2X + colW, lineY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('Assinatura do Empregador', col1X + (colW / 2), lineY + 4.2, { align: 'center' });
  doc.text('Assinatura do Empregado', col2X + (colW / 2), lineY + 4.2, { align: 'center' });
}

/**
 * 1. Emite o PDF avulso: Contrato de Experiência de Trabalho
 * Em papel Carta, orientação retrato.
 */
export function gerarContratoExperienciaPDF(
  empresa: Empresa,
  empregado: Empregado,
  options?: { returnBlobUrl?: boolean },
  clausulasCustom?: ClausulaContratoItem[]
): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  desenharContratoExperienciaPagina(doc, empresa, empregado, clausulasCustom);

  const fileName = `Contrato_Experiencia_${empregado.nomeCompleto.replace(/\s+/g, '_')}.pdf`;
  if (options?.returnBlobUrl) {
    return doc.output('bloburl').toString();
  } else {
    doc.save(fileName);
  }
}

/**
 * 2. Emite o PDF avulso: Registro de Empregado
 * Em papel Carta, orientação retrato.
 */
export function gerarRegistroEmpregadoPDF(
  empresa: Empresa,
  empregado: Empregado,
  options?: { returnBlobUrl?: boolean }
): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  desenharRegistroEmpregadoPagina(doc, empresa, empregado);

  const fileName = `Registro_Empregado_${empregado.nomeCompleto.replace(/\s+/g, '_')}.pdf`;
  if (options?.returnBlobUrl) {
    return doc.output('bloburl').toString();
  } else {
    doc.save(fileName);
  }
}

/**
 * 3. Emite o documento conjunto: Contrato + Registro em um único PDF
 * Página 1 = Contrato de Experiência de Trabalho
 * Página 2 = Registro de Empregado
 * Em papel Carta, orientação retrato.
 */
export function gerarDocumentosAdmissaoConjuntoPDF(
  empresa: Empresa,
  empregado: Empregado,
  options?: { returnBlobUrl?: boolean },
  clausulasCustom?: ClausulaContratoItem[]
): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  // Página 1: Contrato de Experiência
  desenharContratoExperienciaPagina(doc, empresa, empregado, clausulasCustom);

  // Página 2: Registro de Empregado
  doc.addPage('letter', 'portrait');
  desenharRegistroEmpregadoPagina(doc, empresa, empregado);

  const fileName = `Admissao_${empregado.nomeCompleto.replace(/\s+/g, '_')}_Contrato_e_Registro.pdf`;
  if (options?.returnBlobUrl) {
    return doc.output('bloburl').toString();
  } else {
    doc.save(fileName);
  }
}

/**
 * Compatibilidade legada para chamadas existentes
 */
export function gerarContratoTrabalhoPDF(
  empresa: Empresa,
  empregado: Empregado,
  options?: { returnBlobUrl?: boolean }
): string | void {
  return gerarContratoExperienciaPDF(empresa, empregado, options);
}

/**
 * -------------------------------------------------------------------------------------------
 * MÓDULO DE FÉRIAS E AFASTAMENTOS:
 * 1. Demonstrativo de Férias (Página 1 do modelo de referência)
 * 2. Recibo de Férias (Página 2 do modelo de referência)
 * 3. Conjunto Demonstrativo + Recibo em um único PDF (2 páginas)
 * Formato: Papel Carta (Letter: 215.9 x 279.4 mm), orientação Retrato.
 * -------------------------------------------------------------------------------------------
 */

/**
 * Desenha a Página 1: Demonstrativo de Férias
 */
export function desenharDemonstrativoFeriasPagina(
  doc: jsPDF,
  dados: DadosDocumentoFerias
) {
  const pageWidth = 215.9; // Papel Carta
  const pageHeight = 279.4;
  const marginLeft = 15;
  const contentWidth = 185.9;

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.25);

  const empresa = dados.empresa;
  const empregado = dados.empregado;
  const matriculaESocial = empregado.matriculaESocial || empregado.cpf || empregado.matricula;
  const lotacao = empregado.departamento ? empregado.departamento.toUpperCase() : 'GERAL';

  // 1. IDENTIFICAÇÃO (Y: 12 a 40 mm)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DEMONSTRATIVO DE FÉRIAS', marginLeft, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  // Coluna esquerda
  doc.text(`Empresa     :  ${empresa.razaoSocial}`, marginLeft, 19.5);
  doc.text(`CNPJ          :  ${formatarCNPJ(empresa.cnpj)}`, marginLeft, 23.5);
  doc.text(`Empregado  :  ${empregado.nomeCompleto.toUpperCase()}`, marginLeft, 27.5);
  doc.text(`CPF            :  ${formatarCPF(empregado.cpf)}`, marginLeft, 31.5);
  doc.text(`Matrícula eSocial: ${matriculaESocial}`, marginLeft, 35.5);
  doc.text(`Lotação      :  ${lotacao}`, marginLeft, 39.5);

  // Coluna direita (Admissão e Cargo)
  const xColDir = marginLeft + 125;
  doc.text(`Admissão:  ${formatarData(empregado.dataAdmissao)}`, xColDir, 27.5);
  doc.text(`Cargo:  ${(empregado.cargo || 'VENDEDOR(A)').toUpperCase()}`, xColDir, 31.5);

  // 2. QUADRO DE PERÍODOS (Y: 42 a 52 mm, altura 10 mm)
  const yPeriodos = 42;
  const hPeriodos = 10;
  doc.rect(marginLeft, yPeriodos, contentWidth, hPeriodos, 'S');

  const wPerCol = contentWidth / 3;
  doc.line(marginLeft + wPerCol, yPeriodos, marginLeft + wPerCol, yPeriodos + hPeriodos);
  doc.line(marginLeft + (2 * wPerCol), yPeriodos, marginLeft + (2 * wPerCol), yPeriodos + hPeriodos);

  // Período de Aquisição
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('Período de Aquisição', marginLeft + (wPerCol / 2), yPeriodos + 3.8, { align: 'center' });
  doc.text(`${formatarData(dados.periodoAquisitivoInicio)} a ${formatarData(dados.periodoAquisitivoFim)}`, marginLeft + (wPerCol / 2), yPeriodos + 7.8, { align: 'center' });

  // Período de Gozo
  doc.text('Período de Gozo', marginLeft + wPerCol + (wPerCol / 2), yPeriodos + 3.8, { align: 'center' });
  doc.text(`de ${formatarData(dados.dataInicioGozo)} a ${formatarData(dados.dataFimGozo)}`, marginLeft + wPerCol + (wPerCol / 2), yPeriodos + 7.8, { align: 'center' });

  // Retorno ao Serviço
  let dataRetorno = dados.dataRetornoServico;
  if (!dataRetorno && dados.dataFimGozo) {
    const dF = new Date(dados.dataFimGozo + 'T00:00:00');
    dF.setDate(dF.getDate() + 1);
    dataRetorno = dF.toISOString().split('T')[0];
  }
  doc.text('Retorno ao Serviço', marginLeft + (2 * wPerCol) + (wPerCol / 2), yPeriodos + 3.8, { align: 'center' });
  doc.text(`${formatarData(dataRetorno)}`, marginLeft + (2 * wPerCol) + (wPerCol / 2), yPeriodos + 7.8, { align: 'center' });

  // 3. BASE DE CÁLCULO DA REMUNERAÇÃO DAS FÉRIAS (Y: 53.5 a 63.5 mm)
  const yBase = 53.5;
  const hBase = 10;
  doc.rect(marginLeft, yBase, contentWidth, hBase, 'S');

  const wBaseCol1 = 115;
  const wBaseCol2 = 28;
  doc.line(marginLeft + wBaseCol1, yBase, marginLeft + wBaseCol1, yBase + hBase);
  doc.line(marginLeft + wBaseCol1 + wBaseCol2, yBase, marginLeft + wBaseCol1 + wBaseCol2, yBase + hBase);

  // Col 1: Título e Modalidade
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('BASE DE CÁLCULO DA REMUNERAÇÃO DAS FÉRIAS', marginLeft + (wBaseCol1 / 2), yBase + 3.8, { align: 'center' });
  doc.text('Base de Cálculo Mensal/Horário/Tarefa/Outros', marginLeft + (wBaseCol1 / 2), yBase + 7.8, { align: 'center' });

  // Col 2: Faltas
  doc.text('Faltas', marginLeft + wBaseCol1 + (wBaseCol2 / 2), yBase + 3.8, { align: 'center' });
  doc.text(`${dados.faltas || 0}`, marginLeft + wBaseCol1 + (wBaseCol2 / 2), yBase + 7.8, { align: 'center' });

  // Col 3: Salário Contratual
  const salarioContratual = dados.salarioContratual;
  const xCol3Right = marginLeft + contentWidth - 3;
  doc.text('Salário Contratual', xCol3Right, yBase + 3.8, { align: 'right' });
  doc.text(`${formatarValorDecimal(salarioContratual)}`, xCol3Right, yBase + 7.8, { align: 'right' });

  // 4. DEMONSTRATIVO DA BASE DE CÁLCULO (Y: 65.5 a 78 mm)
  let curY = 67.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('DEMONSTRATIVO DA BASE DE CÁLCULO', marginLeft, curY);
  curY += 1.8;
  doc.line(marginLeft, curY, marginLeft + contentWidth, curY);

  curY += 3.8;
  doc.setFont('helvetica', 'normal');
  doc.text('Evento', marginLeft, curY);
  doc.text('Referência', marginLeft + 110, curY, { align: 'right' });
  doc.text('Valor', marginLeft + 145, curY, { align: 'right' });
  doc.text('Total', marginLeft + contentWidth - 2, curY, { align: 'right' });

  curY += 1.8;
  doc.line(marginLeft, curY, marginLeft + contentWidth, curY);

  curY += 4.0;
  // Evento 011 Salário-Base
  doc.text('011 Salário-Base', marginLeft, curY);
  doc.text(`${dados.diasGozo} dia(s)`, marginLeft + 110, curY, { align: 'right' });
  doc.text(`${formatarValorDecimal(salarioContratual)}`, marginLeft + 145, curY, { align: 'right' });
  // Valor total proporcional da base
  const valorBaseCalculo = dados.diasGozo === 30
    ? salarioContratual
    : Math.round(((salarioContratual / 30) * dados.diasGozo) * 100) / 100;
  doc.text(`${formatarValorDecimal(valorBaseCalculo)}`, marginLeft + contentWidth - 2, curY, { align: 'right' });

  curY += 2.0;
  doc.line(marginLeft, curY, marginLeft + contentWidth, curY);

  // 5. REMUNERAÇÃO (Y: ~81 mm)
  curY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text('REMUNERAÇÃO', marginLeft, curY);
  curY += 1.8;
  doc.line(marginLeft, curY, marginLeft + contentWidth, curY);

  curY += 3.8;
  doc.setFont('helvetica', 'normal');
  doc.text('Evento', marginLeft, curY);
  doc.text('Referência', marginLeft + 110, curY, { align: 'right' });
  doc.text('Provento', marginLeft + 145, curY, { align: 'right' });
  doc.text('Desconto', marginLeft + contentWidth - 2, curY, { align: 'right' });

  curY += 1.8;
  doc.line(marginLeft, curY, marginLeft + contentWidth, curY);

  // Cálculos das rubricas
  const valorFerias = dados.valorFerias !== undefined
    ? dados.valorFerias
    : (dados.diasGozo === 30 ? salarioContratual : Math.round(((salarioContratual / 30) * dados.diasGozo) * 100) / 100);

  const tercoFerias = dados.tercoFerias !== undefined
    ? dados.tercoFerias
    : Math.round((valorFerias / 3) * 100) / 100;

  const diasAbono = dados.abonoPecuniario ? (dados.diasAbono || 10) : 0;
  const valorAbono = dados.valorAbono !== undefined
    ? dados.valorAbono
    : (diasAbono > 0 ? Math.round(((salarioContratual / 30) * diasAbono) * 100) / 100 : 0);

  const tercoAbono = dados.tercoAbono !== undefined
    ? dados.tercoAbono
    : (valorAbono > 0 ? Math.round((valorAbono / 3) * 100) / 100 : 0);

  const valor13 = dados.valor13 !== undefined
    ? dados.valor13
    : (dados.adiantamento13 ? Math.round((salarioContratual * 0.5) * 100) / 100 : 0);

  // Base para INSS e FGTS
  const baseTributavel = valorFerias + tercoFerias;

  // INSS
  let valorINSS = dados.valorINSS;
  let aliquotaINSSStr = dados.aliquotaINSS || '9%';
  if (valorINSS === undefined) {
    if (baseTributavel <= 1518.00) {
      valorINSS = Math.round((baseTributavel * 0.075) * 100) / 100;
      aliquotaINSSStr = '7,5%';
    } else if (baseTributavel <= 2793.88) {
      valorINSS = Math.round((baseTributavel * 0.09 - 24.33) * 100) / 100;
      aliquotaINSSStr = '9%';
    } else if (baseTributavel <= 4190.83) {
      valorINSS = Math.round((baseTributavel * 0.12 - 108.15) * 100) / 100;
      aliquotaINSSStr = '12%';
    } else if (baseTributavel <= 8157.41) {
      valorINSS = Math.round((baseTributavel * 0.14 - 191.96) * 100) / 100;
      aliquotaINSSStr = '14%';
    } else {
      valorINSS = 950.08;
      aliquotaINSSStr = 'Teto';
    }
  }

  // IRRF
  let valorIRRF = dados.valorIRRF !== undefined ? dados.valorIRRF : 0;
  if (dados.valorIRRF === undefined) {
    const baseIRRF = baseTributavel - (valorINSS || 0);
    if (baseIRRF > 2259.20) {
      if (baseIRRF <= 2826.65) valorIRRF = Math.round(((baseIRRF * 0.075) - 169.44) * 100) / 100;
      else if (baseIRRF <= 3751.05) valorIRRF = Math.round(((baseIRRF * 0.15) - 381.44) * 100) / 100;
      else if (baseIRRF <= 4664.68) valorIRRF = Math.round(((baseIRRF * 0.225) - 662.77) * 100) / 100;
      else valorIRRF = Math.round(((baseIRRF * 0.275) - 896.00) * 100) / 100;
      valorIRRF = Math.max(0, valorIRRF);
    }
  }

  const totalProventos = dados.totalProventos !== undefined
    ? dados.totalProventos
    : Math.round((valorFerias + tercoFerias + valorAbono + tercoAbono + valor13) * 100) / 100;

  const totalDescontos = dados.totalDescontos !== undefined
    ? dados.totalDescontos
    : Math.round(((valorINSS || 0) + valorIRRF + (dados.outrosDescontos || 0)) * 100) / 100;

  const liquido = dados.liquido !== undefined
    ? dados.liquido
    : Math.round((totalProventos - totalDescontos) * 100) / 100;

  const fgts = dados.fgts !== undefined
    ? dados.fgts
    : Math.round((baseTributavel * 0.08) * 100) / 100;

  const fgtsContribSocial = dados.fgtsContribSocial !== undefined ? dados.fgtsContribSocial : 0;

  // Linhas de Eventos
  curY += 4.0;
  doc.text('110 Remuneração de Férias', marginLeft, curY);
  doc.text(`${dados.diasGozo} dia(s)`, marginLeft + 110, curY, { align: 'right' });
  doc.text(`${formatarValorDecimal(valorFerias)}`, marginLeft + 145, curY, { align: 'right' });

  curY += 4.0;
  doc.text('111 1/3 de Férias', marginLeft, curY);
  doc.text(`${formatarValorDecimal(tercoFerias)}`, marginLeft + 145, curY, { align: 'right' });

  if (valorAbono > 0) {
    curY += 4.0;
    doc.text('112 Abono Pecuniário', marginLeft, curY);
    doc.text(`${diasAbono} dia(s)`, marginLeft + 110, curY, { align: 'right' });
    doc.text(`${formatarValorDecimal(valorAbono)}`, marginLeft + 145, curY, { align: 'right' });

    curY += 4.0;
    doc.text('113 1/3 de Abono Pecuniário', marginLeft, curY);
    doc.text(`${formatarValorDecimal(tercoAbono)}`, marginLeft + 145, curY, { align: 'right' });
  }

  if (valor13 > 0) {
    curY += 4.0;
    doc.text('120 1ª Parc. 13º Salário', marginLeft, curY);
    doc.text('50%', marginLeft + 110, curY, { align: 'right' });
    doc.text(`${formatarValorDecimal(valor13)}`, marginLeft + 145, curY, { align: 'right' });
  }

  // Descontos
  curY += 4.0;
  doc.text('310 INSS', marginLeft, curY);
  doc.text(`${aliquotaINSSStr}`, marginLeft + 110, curY, { align: 'right' });
  doc.text(`${formatarValorDecimal(valorINSS || 0)}`, marginLeft + contentWidth - 2, curY, { align: 'right' });

  if (valorIRRF > 0) {
    curY += 4.0;
    doc.text('320 IRRF', marginLeft, curY);
    doc.text(`${formatarValorDecimal(valorIRRF)}`, marginLeft + contentWidth - 2, curY, { align: 'right' });
  }

  // Linha superior dos totais
  curY += 2.5;
  doc.line(marginLeft + 115, curY, marginLeft + contentWidth, curY);

  curY += 3.8;
  doc.text(`${formatarValorDecimal(totalProventos)}`, marginLeft + 145, curY, { align: 'right' });
  doc.text(`${formatarValorDecimal(totalDescontos)}`, marginLeft + contentWidth - 2, curY, { align: 'right' });

  // Linha inferior dos totais
  curY += 1.8;
  doc.line(marginLeft + 115, curY, marginLeft + contentWidth, curY);

  // 6. FECHAMENTO (FGTS e Líquido a Receber)
  curY += 4.8;
  const textoFechamento = `FGTS Contribuição Social: ${formatarValorDecimal(fgtsContribSocial)}    FGTS: ${formatarValorDecimal(fgts)}    Líquido a Receber: ${formatarValorDecimal(liquido)}`;
  doc.text(textoFechamento, marginLeft + contentWidth - 2, curY, { align: 'right' });

  // 7. TEXTO DE COMUNICAÇÃO DAS FÉRIAS (Aviso)
  curY += 15.0;
  const valorLiquidoExtenso = numeroParaExtenso(liquido);
  const textoComunicacao = `Comunicamos-lhe que, de acordo com a lei, ser-lhe-ão concedidas férias relativas ao período acima descrito, ficando a sua disposição a importância de R$ ${formatarValorDecimal(liquido)} (${valorLiquidoExtenso}) relativa aos ${dados.diasGozo} dias de férias.`;

  const linhasComunicado = doc.splitTextToSize(textoComunicacao, contentWidth);
  doc.text(linhasComunicado, marginLeft, curY);
  curY += (linhasComunicado.length * 3.6) + 14.0;

  // 8. ASSINATURAS DO DEMONSTRATIVO
  // Coluna esquerda: Empregado e data do aviso
  // Coluna direita: Empregador
  const wAss = 75;
  const xColEsq = marginLeft;
  const xColDirAss = marginLeft + 95;

  doc.line(xColEsq, curY, xColEsq + wAss, curY);
  doc.line(xColDirAss, curY, xColDirAss + wAss, curY);

  curY += 4.0;
  doc.text('Empregado', xColEsq + (wAss / 2), curY, { align: 'center' });
  doc.text('Empregador', xColDirAss + (wAss / 2), curY, { align: 'center' });

  curY += 4.5;
  let dataAviso = dados.dataAviso;
  if (!dataAviso && dados.dataInicioGozo) {
    const dIni = new Date(dados.dataInicioGozo + 'T00:00:00');
    dIni.setDate(dIni.getDate() - 30);
    dataAviso = dIni.toISOString().split('T')[0];
  }
  const textoDataAviso = formatarDataPorExtenso(dataAviso, empresa.endereco.cidade);
  doc.text(textoDataAviso, xColEsq + (wAss / 2), curY, { align: 'center' });

  // Linha para Assinatura do Responsável, em Caso de Empregado Menor
  curY += 14.0;
  doc.line(xColEsq, curY, xColEsq + wAss, curY);
  curY += 4.0;
  doc.text('Assinatura do Responsável, em Caso de Empregado Menor', xColEsq, curY);
}

/**
 * Desenha a Página 2: Recibo de Férias
 */
export function desenharReciboFeriasPagina(
  doc: jsPDF,
  dados: DadosDocumentoFerias
) {
  const marginLeft = 15;
  const contentWidth = 185.9; // Papel Carta: 215.9mm - 30mm = 185.9mm

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.25);

  const empresa = dados.empresa;
  const empregado = dados.empregado;

  // Linha superior do formulário
  doc.line(marginLeft, 12, marginLeft + contentWidth, 12);

  // 1. TÍTULO E IDENTIFICAÇÃO (Formulário compacto na parte superior da página)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RECIBO DE FÉRIAS', marginLeft, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Empresa     :  ${empresa.razaoSocial}`, marginLeft, 22.5);
  doc.text(`Empregado  :  ${empregado.nomeCompleto.toUpperCase()}`, marginLeft, 26.5);

  // Cálculos do valor líquido idêntico ao Demonstrativo
  const salarioContratual = dados.salarioContratual;
  const valorFerias = dados.valorFerias !== undefined
    ? dados.valorFerias
    : (dados.diasGozo === 30 ? salarioContratual : Math.round(((salarioContratual / 30) * dados.diasGozo) * 100) / 100);

  const tercoFerias = dados.tercoFerias !== undefined
    ? dados.tercoFerias
    : Math.round((valorFerias / 3) * 100) / 100;

  const diasAbono = dados.abonoPecuniario ? (dados.diasAbono || 10) : 0;
  const valorAbono = dados.valorAbono !== undefined
    ? dados.valorAbono
    : (diasAbono > 0 ? Math.round(((salarioContratual / 30) * diasAbono) * 100) / 100 : 0);

  const tercoAbono = dados.tercoAbono !== undefined
    ? dados.tercoAbono
    : (valorAbono > 0 ? Math.round((valorAbono / 3) * 100) / 100 : 0);

  const valor13 = dados.valor13 !== undefined
    ? dados.valor13
    : (dados.adiantamento13 ? Math.round((salarioContratual * 0.5) * 100) / 100 : 0);

  const baseTributavel = valorFerias + tercoFerias;

  let valorINSS = dados.valorINSS;
  if (valorINSS === undefined) {
    if (baseTributavel <= 1518.00) {
      valorINSS = Math.round((baseTributavel * 0.075) * 100) / 100;
    } else if (baseTributavel <= 2793.88) {
      valorINSS = Math.round((baseTributavel * 0.09 - 24.33) * 100) / 100;
    } else if (baseTributavel <= 4190.83) {
      valorINSS = Math.round((baseTributavel * 0.12 - 108.15) * 100) / 100;
    } else if (baseTributavel <= 8157.41) {
      valorINSS = Math.round((baseTributavel * 0.14 - 191.96) * 100) / 100;
    } else {
      valorINSS = 950.08;
    }
  }

  let valorIRRF = dados.valorIRRF !== undefined ? dados.valorIRRF : 0;
  if (dados.valorIRRF === undefined) {
    const baseIRRF = baseTributavel - (valorINSS || 0);
    if (baseIRRF > 2259.20) {
      if (baseIRRF <= 2826.65) valorIRRF = Math.round(((baseIRRF * 0.075) - 169.44) * 100) / 100;
      else if (baseIRRF <= 3751.05) valorIRRF = Math.round(((baseIRRF * 0.15) - 381.44) * 100) / 100;
      else if (baseIRRF <= 4664.68) valorIRRF = Math.round(((baseIRRF * 0.225) - 662.77) * 100) / 100;
      else valorIRRF = Math.round(((baseIRRF * 0.275) - 896.00) * 100) / 100;
      valorIRRF = Math.max(0, valorIRRF);
    }
  }

  const totalProventos = dados.totalProventos !== undefined
    ? dados.totalProventos
    : Math.round((valorFerias + tercoFerias + valorAbono + tercoAbono + valor13) * 100) / 100;

  const totalDescontos = dados.totalDescontos !== undefined
    ? dados.totalDescontos
    : Math.round(((valorINSS || 0) + valorIRRF + (dados.outrosDescontos || 0)) * 100) / 100;

  const liquido = dados.liquido !== undefined
    ? dados.liquido
    : Math.round((totalProventos - totalDescontos) * 100) / 100;

  const valorLiquidoExtenso = numeroParaExtenso(liquido);

  // 2. TEXTO DE RECEBIMENTO E QUITAÇÃO (Y: 33 mm)
  let curY = 32.5;
  const textoRecibo = `Recebi a quantia de R$ ${formatarValorDecimal(liquido)} (${valorLiquidoExtenso}) correspondente as minhas férias ora concedidas e que vou gozar, de acordo com o aviso que recebi em tempo hábil ao qual dei o meu "ciente". Por ser verdade, firmo o presente recibo, dando plena e geral quitação.`;

  const linhasRecibo = doc.splitTextToSize(textoRecibo, contentWidth);
  doc.text(linhasRecibo, marginLeft, curY);
  curY += (linhasRecibo.length * 3.6) + 14.0;

  // 3. ASSINATURA DO EMPREGADO E DATA DO RECIBO (Lado Direito)
  const wAss = 75;
  const xColDirAss = marginLeft + 95;
  const xColEsqAss = marginLeft;

  doc.line(xColDirAss, curY, xColDirAss + wAss, curY);
  curY += 4.0;
  doc.text('Empregado', xColDirAss + (wAss / 2), curY, { align: 'center' });

  curY += 4.5;
  let dataRecibo = dados.dataRecibo;
  if (!dataRecibo && dados.dataInicioGozo) {
    const dIni = new Date(dados.dataInicioGozo + 'T00:00:00');
    dIni.setDate(dIni.getDate() - 2);
    dataRecibo = dIni.toISOString().split('T')[0];
  }
  const textoDataRecibo = formatarDataPorExtenso(dataRecibo, empresa.endereco.cidade);
  doc.text(textoDataRecibo, xColDirAss + (wAss / 2), curY, { align: 'center' });

  // 4. LINHA INFERIOR DE ASSINATURAS (Empregador à esquerda e Responsável Menor à direita)
  curY += 12.0;
  doc.line(xColEsqAss, curY, xColEsqAss + wAss, curY);
  doc.line(xColDirAss, curY, xColDirAss + wAss, curY);

  curY += 4.0;
  doc.text('Empregador', xColEsqAss + (wAss / 2), curY, { align: 'center' });
  doc.text('Assinatura do Responsável, em Caso de Empregado Menor', xColDirAss + (wAss / 2), curY, { align: 'center' });

  // Linha divisória de fechamento do formulário superior
  curY += 5.0;
  doc.line(marginLeft, curY, marginLeft + contentWidth, curY);

  // Todo o restante da página Carta preservado em branco conforme modelo oficial
}

/**
 * 1. Emite o PDF avulso: Demonstrativo de Férias
 * Em papel Carta, orientação retrato.
 */
export function gerarDemonstrativoFeriasPDF(
  dados: DadosDocumentoFerias,
  options?: { returnBlobUrl?: boolean }
): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  desenharDemonstrativoFeriasPagina(doc, dados);

  const fileName = `Demonstrativo_Ferias_${dados.empregado.nomeCompleto.replace(/\s+/g, '_')}_${dados.diasGozo}dias.pdf`;
  if (options?.returnBlobUrl) {
    return doc.output('bloburl').toString();
  } else {
    doc.save(fileName);
  }
}

/**
 * 2. Emite o PDF avulso: Recibo de Férias
 * Em papel Carta, orientação retrato.
 */
export function gerarReciboFeriasPDF(
  dados: DadosDocumentoFerias,
  options?: { returnBlobUrl?: boolean }
): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  desenharReciboFeriasPagina(doc, dados);

  const fileName = `Recibo_Ferias_${dados.empregado.nomeCompleto.replace(/\s+/g, '_')}_${dados.diasGozo}dias.pdf`;
  if (options?.returnBlobUrl) {
    return doc.output('bloburl').toString();
  } else {
    doc.save(fileName);
  }
}

/**
 * 3. Emite o conjunto completo: Demonstrativo de Férias + Recibo de Férias
 * Página 1 = Demonstrativo de Férias
 * Página 2 = Recibo de Férias
 * Em papel Carta, orientação retrato.
 */
export function gerarDocumentosFeriasConjuntoPDF(
  dados: DadosDocumentoFerias,
  options?: { returnBlobUrl?: boolean }
): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  // Página 1: Demonstrativo de Férias
  desenharDemonstrativoFeriasPagina(doc, dados);

  // Página 2: Recibo de Férias
  doc.addPage('letter', 'portrait');
  desenharReciboFeriasPagina(doc, dados);

  const fileName = `Ferias_${dados.empregado.nomeCompleto.replace(/\s+/g, '_')}_Demonstrativo_e_Recibo_${dados.diasGozo}dias.pdf`;
  if (options?.returnBlobUrl) {
    return doc.output('bloburl').toString();
  } else {
    doc.save(fileName);
  }
}

