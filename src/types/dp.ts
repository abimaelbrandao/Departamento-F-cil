export type UserRole = 'admin' | 'dp_operator' | 'gestor' | 'employee';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string; // If employee portal
  companyId: string;
  avatar?: string;
}

export type VinculoEmpregaticio = 'CLT' | 'APRENDIZ' | 'ESTAGIO' | 'DIRETOR_ESTATUTARIO' | 'PJ';

export type StatusAdmissao = 'pendente' | 'em_analise' | 'aprovado' | 'integrado';

export interface DocumentoAdmissao {
  id: string;
  nome: string;
  tipo: 'RG' | 'CPF' | 'CTPS' | 'COMPROVANTE_RESIDENCIA' | 'TITULO_ELEITOR' | 'CERTIDAO_NASC_CASAMENTO' | 'EXAME_ADMISSIONAL_ASO' | 'FOTO_3X4';
  obrigatorio: boolean;
  recebido: boolean;
  dataRecebimento?: string;
  status: 'pendente' | 'em_analise' | 'validado' | 'rejeitado';
  arquivoUrl?: string;
  observacoes?: string;
}

export interface Dependente {
  id: string;
  nome: string;
  parentesco: 'FILHO' | 'CONJUGE' | 'PAIS' | 'ENTEADO' | 'OUTRO';
  dataNascimento: string;
  cpf: string;
  irrf: boolean; // deduz no IRRF
  salarioFamilia: boolean; // elegível a salário família (< 14 anos ou inválido)
  invalido?: boolean;
}

export interface HistoricoAlteracao {
  id: string;
  dataVigencia: string;
  dataRegistro: string;
  tipo: 'SALARIO' | 'CARGO' | 'JORNADA' | 'LOTACAO';
  valorAnterior: string | number;
  valorNovo: string | number;
  motivo: string;
  responsavel: string;
}

export interface Beneficio {
  id: string;
  nome: string;
  tipo: 'VALE_TRANSPORTE' | 'VALE_REFEICAO' | 'PLANO_SAUDE' | 'SEGURO_VIDA' | 'OUTRO';
  valorBeneficio: number;
  descontoEmpregado: number; // valor fixo ou calculado
  percentualDesconto?: number; // ex: 6% do salário base no VT
  ativo: boolean;
}

export interface Empregado {
  id: string;
  empresaId: string;
  matricula: string;
  nomeCompleto: string;
  cpf: string;
  rg: string;
  orgaoExpedidor: string;
  pis: string;
  dataNascimento: string;
  sexo: 'M' | 'F' | 'OUTRO';
  estadoCivil: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'UNIAO_ESTAVEL' | 'VIUVO';
  nacionalidade: string;
  email: string;
  telefone: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  dadosBancarios: {
    banco: string;
    codigoBanco: string;
    agencia: string;
    conta: string;
    tipoConta: 'CORRENTE' | 'POUPANCA' | 'SALARIO';
    chavePix?: string;
  };
  vinculo: VinculoEmpregaticio;
  status: 'ativo' | 'em_admissao' | 'ferias' | 'afastado' | 'desligado';
  dataAdmissao: string;
  dataPrevisaoInicio?: string;
  cargo: string;
  cbo: string;
  departamento: string;
  centroDeCusto: string;
  salarioBase: number;
  tipoSalario: 'MENSALISTA' | 'HORISTA';
  jornadaHorasSemanais: number;
  divisorHoras: number; // 220, 200, 180
  escala: string; // Ex: 'Segunda a Sexta (08:00 às 17:48)'
  tipoContrato: 'INDETERMINADO' | 'EXPERIENCIA_45_45' | 'DETERMINADO' | 'TEMPORARIO';
  diasExperienciaTotal?: number; // 90
  dataFimExperiencia1?: string; // 45 dias
  dataFimExperiencia2?: string; // 90 dias
  dependentes: Dependente[];
  beneficios: Beneficio[];
  documentosAdmissao: DocumentoAdmissao[];
  historicoAlteracoes: HistoricoAlteracao[];
  optanteFGTS: boolean;
  aliquotaFGTS: number; // 8% normal, 2% jovem aprendiz
  nomeMae?: string;
  ctpsNumero?: string;
  ctpsSerie?: string;
  ctpsUF?: string;
  codigoSindical?: string;
  sindicatoLaboral?: string;
  pensaoAlimenticiaPercentualTRCT?: number;
  pensaoAlimenticiaPercentualFGTS?: number;
  categoriaTrabalhador?: string;
  cnpjTomadorObra?: string;
  observacoes?: string;
  // Campos complementares para Ficha de Registro e Admissão
  nomePai?: string;
  naturalidade?: string;
  naturalidadeUF?: string;
  nacionalidadeCodigo?: string;
  etniaRaca?: string;
  grauInstrucao?: string;
  ctpsDV?: string;
  ctpsDataEmissao?: string;
  rgDataEmissao?: string;
  rgUF?: string;
  tituloEleitor?: string;
  tituloZona?: string;
  tituloSecao?: string;
  certificadoMilitar?: string;
  militarSerie?: string;
  militarTipo?: string;
  militarCategoria?: string;
  csmOam?: string;
  rmDnComar?: string;
  cnh?: string;
  cnhCategoria?: string;
  cnhValidade?: string;
  orgaoClasse?: string;
  orgaoClasseExpedidor?: string;
  orgaoClasseUF?: string;
  orgaoClasseExpedicao?: string;
  orgaoClasseValidade?: string;
  anoChegadaImigracao?: string;
  tipoVistoImigracao?: string;
  validadeRGImigracao?: string;
  validadeCTPSImigracao?: string;
  matriculaESocial?: string;
  participaCIPA?: boolean;
  dataUltimoASO?: string;
  dataDesligamento?: string;
  jornadaDetalhada?: {
    codigo?: string;
    escalaId?: string;
    escalaDescricao?: string;
    observacaoJornada?: string;
    grade?: Array<{
      dia: string;
      e1: string;
      s1: string;
      e2: string;
      s2: string;
      e3?: string;
      s3?: string;
      e4?: string;
      s4?: string;
    }>;
  };
  clausulasContratoCustom?: Array<{
    numero: number;
    texto: string;
  }>;
}

export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  codigoMunicipio?: string;
  regimeTributario: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  fpas: string;
  aliquotaRat: number; // ex: 2.0%
  fap: number; // ex: 1.0
  aliquotaTerceiros: number; // ex: 5.8% (outras entidades)
  cnaePrincipal: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  contatoResponsavel?: {
    nome: string;
    email: string;
    telefone: string;
  };
  bancoConvenio?: string;
  configuracoesFolha: {
    diaPagamentoSalario: number; // 5º dia útil
    diaAdiantamento: number; // dia 20
    percentualAdiantamento: number; // 40%
    diaVencimentoFGTS: number; // dia 20
    diaVencimentoDCTFWeb: number; // dia 15
  };
  cctId?: string; // Convenção coletiva vinculada
  status?: 'ativa' | 'inativa';
}

export type TipoRubrica = 'PROVENTO' | 'DESCONTO' | 'INFORMATIVA';

export interface Rubrica {
  codigo: string;
  descricao: string;
  tipo: TipoRubrica;
  incideINSS: boolean;
  incideIRRF: boolean;
  incideFGTS: boolean;
  incideDSR?: boolean;
  baseCalculoLegal: string;
  vigenciaInicio: string;
  vigenciaFim?: string;
}

export interface LancamentoVariavel {
  id: string;
  empregadoId: string;
  competencia: string; // MM/YYYY
  rubricaCodigo: string;
  descricao: string;
  referencia: number; // ex: 10 horas, 2 dias, percentual
  unidadeReferencia: 'HORAS' | 'DIAS' | 'PERCENTUAL' | 'VALOR';
  valor: number;
  origem: 'MANUAL' | 'IMPORTACAO' | 'SISTEMA' | 'MOVIMENTACAO_EMPRESA';
  comprovanteNome?: string;
  observacao?: string;
}

export interface ItemCalculadoFolha {
  rubricaCodigo: string;
  descricao: string;
  tipo: TipoRubrica;
  referencia: number | string;
  provento: number;
  desconto: number;
  memoriaCalculo: {
    titulo: string;
    formula: string;
    passoAPasso: string[];
    baseCalculo: number;
    aliquotasOuFatores: Record<string, number | string>;
    fundamentoLegal: string;
  };
}

export interface FolhaEmpregado {
  id: string;
  empregadoId: string;
  matricula: string;
  nomeEmpregado: string;
  cargo: string;
  departamento: string;
  competencia: string; // MM/YYYY
  tipoFolha: 'MENSAL' | 'ADIANTAMENTO' | '13_PRIMEIRA_PARCELA' | '13_SEGUNDA_PARCELA' | 'COMPLEMENTAR';
  salarioBase: number;
  itens: ItemCalculadoFolha[];
  totalProventos: number;
  totalDescontos: number;
  valorLiquido: number;
  bases: {
    baseINSS: number;
    baseIRRF: number;
    baseFGTS: number;
    baseSalarioFamilia: number;
  };
  encargosEmpresa: {
    fgtsDevido: number; // 8% da empresa, não desconta do empregado
    inssPatronal: number;
    ratAjustado: number;
    terceiros: number;
    totalEncargos: number;
  };
  statusPagamento: 'EMITIDO' | 'PAGO' | 'RECIBO_ASSINADO';
  dataEmissao: string;
  dataPagamento?: string;
  dataAssinatura?: string;
  comprovantePagamento?: string;
}

export type StatusCompetencia = 'ABERTA' | 'EM_CONFERENCIA' | 'APROVADA' | 'FECHADA';

export interface CompetenciaFolha {
  id: string;
  empresaId: string;
  competencia: string; // MM/YYYY
  status: StatusCompetencia;
  totalEmpregadosAtivos: number;
  totalCalculados: number;
  totalProventos: number;
  totalDescontos: number;
  totalLiquido: number;
  totalEncargosEmpresa: number;
  totalFGTS: number;
  errosBloqueantes: string[];
  alertasRevisao: string[];
  tipoFolha?: 'MENSAL' | 'ADIANTAMENTO' | '13_PRIMEIRA_PARCELA' | '13_SEGUNDA_PARCELA' | '13_INTEGRAL' | 'COMPLEMENTAR';
  parcela13?: '1' | '2' | 'INTEGRAL';
  historicoFechamento?: {
    fechadoPor?: string;
    dataFechamento?: string;
    reabertoPor?: string;
    dataReabertura?: string;
    motivoReabertura?: string;
  };
}

export interface PeriodoFerias {
  id: string;
  empregadoId: string;
  empresaId: string;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  periodoConcessivoFim: string;
  saldoDiasDireito: number; // normalmente 30
  faltasInjustificadas: number;
  diasGozados: number;
  saldoDiasRestantes: number;
  status: 'EM_AQUISICAO' | 'A_VENCER' | 'VENCENDO' | 'PROGRAMADA' | 'GOZADA' | 'DOBRADA';
  programacoes: {
    id: string;
    dataInicio: string;
    dataFim: string;
    diasGozo: number;
    abonoPecuniario: boolean;
    diasAbono: number; // 10 dias
    adiantamento13: boolean;
    competenciaApropriacao: string[]; // ex: ['05/2026', '06/2026'] se atravessar mês
    diasMes1?: { competencia: string; dias: number; valorProporcional: number };
    diasMes2?: { competencia: string; dias: number; valorProporcional: number };
    totalBruto: number;
    inssFerias: number;
    irrfFerias: number;
    valorLiquido: number;
    status: 'SOLICITADA' | 'APROVADA' | 'PAGA' | 'GOZADA';
    dataLimitePagamento: string; // 2 dias antes do início
    retornoTrabalho?: string;
    dataAviso?: string;
    dataRecibo?: string;
    parcelaIndex?: number;
    parcelaTotal?: number;
    comprovante?: string;
    dataPagamento?: string;
    reciboAssinado?: boolean;
    dataAssinatura?: string;
  }[];
}

export interface DadosDocumentoFerias {
  empresa: Empresa;
  empregado: Empregado;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  dataInicioGozo: string;
  dataFimGozo: string;
  dataRetornoServico: string;
  diasGozo: number;
  diasAbono?: number;
  abonoPecuniario?: boolean;
  adiantamento13?: boolean;
  faltas?: number;
  salarioContratual: number;
  dataAviso?: string;
  dataRecibo?: string;
  parcelaDescricao?: string;
  valorFerias?: number;
  tercoFerias?: number;
  valorAbono?: number;
  tercoAbono?: number;
  valor13?: number;
  valorINSS?: number;
  aliquotaINSS?: string;
  valorIRRF?: number;
  aliquotaIRRF?: string;
  outrosDescontos?: number;
  totalProventos?: number;
  totalDescontos?: number;
  fgts?: number;
  fgtsContribSocial?: number;
  liquido?: number;
}

export type MotivoRescisao = 
  | 'SEM_JUSTA_CAUSA_EMPREGADOR'
  | 'PEDIDO_DEMISSAO_EMPREGADO'
  | 'COM_JUSTA_CAUSA_EMPREGADOR'
  | 'RESCISAO_INDIRETA'
  | 'ACORDO_CONSENSUAL_484A'
  | 'TERMINO_CONTRATO_EXPERIENCIA'
  | 'RESCISAO_ANTECIPADA_EXPERIENCIA';

export interface RescisaoSimulada {
  id: string;
  empregadoId: string;
  empresaId: string;
  motivo: MotivoRescisao;
  dataAviso: string;
  dataDesligamento: string;
  tipoAviso: 'TRABALHADO' | 'INDENIZADO' | 'DISPENSADO';
  diasAvisoIndenizado: number; // Lei 12.506 (30 + 3 por ano)
  saldoSalarioDias: number;
  valorSaldoSalario: number;
  valorAvisoPrevio: number;
  decimoTerceiroProporcional: number;
  decimoTerceiroIndenizado: number;
  feriasVencidasComTerco: number;
  feriasProporcionaisComTerco: number;
  feriasProporcionaisBase?: number;
  tercoFeriasConstitucional?: number;
  feriasVencidasBase?: number;
  tercoFeriasVencidas?: number;
  avosDecimoTerceiro?: number;
  avosFerias?: number;
  periodoAquisitivoVencido?: string;
  remuneracaoMesAnterior?: number;
  codigoAfastamento?: string; // ex: 'SJ2'
  causaAfastamentoDescricao?: string; // ex: 'Despedida sem justa causa, pelo empregador'
  tipoContratoDescricao?: string;
  ressalvas?: string;
  isMinuta?: boolean; // Pagamento pendente vs efetivo
  multaFGTS: number; // 40% ou 20%
  saldoFGTSParaMulta: number;
  descontos: {
    inssSaldoSalario: number;
    irrfRescisao: number;
    adiantamentoJaPago: number;
    outrosDescontos: number; // INSS 13º
    inssDecimoTerceiro?: number;
    irrfDecimoTerceiro?: number;
    avisoPrevioDescontado?: number;
    pensaoAlimenticia?: number;
  };
  totalBruto: number;
  totalDescontos: number;
  liquidoRescisao: number;
  dataLimitePagamento: string; // 10 dias corridos
  demonstrativoFGTS: {
    competenciasCalculadas: { competencia: string; valorDevido: number; depositado: boolean }[];
    totalCalculado: number;
    totalDepositado: number;
    diferencasPendentes: number;
  };
  pendenciasDocumentais: string[];
  status: 'SIMULACAO' | 'CONFIRMADA' | 'PAGA' | 'HOMOLOGADA';
  dataConfirmacao?: string;
  comprovantePagamento?: string;
  trctAssinado?: boolean;
}

export type StatusDocumento = 'EMITIDO' | 'ENVIADO_ASSINATURA' | 'PAGO' | 'PAGAMENTO_CONFIRMADO' | 'RECIBO_ASSINADO';

export interface ContratoDocumento {
  id: string;
  empresaId: string;
  empregadoId: string;
  empregadoNome?: string;
  tipo: 'CONTRATO_TRABALHO_CLT' | 'CONTRATO_EXPERIENCIA' | 'PRORROGACAO_EXPERIENCIA' | 'TERMO_ADITIVO' | 'ACORDO_BANCO_HORAS' | 'RECIBO_SALARIO' | 'RECIBO_FERIAS' | 'TRCT';
  titulo: string;
  conteudoHtml: string;
  dataEmissao: string;
  status: StatusDocumento;
  dataPagamento?: string;
  dataAssinatura?: string;
  assinanteNome?: string;
  comprovanteAnexo?: string;
  versao: number;
}

export interface Afastamento {
  id: string;
  empregadoId: string;
  empresaId: string;
  tipo: 'DOENCA_B31' | 'ACIDENTE_TRABALHO_B91' | 'LICENCA_MATERNIDADE' | 'LICENCA_PATERNIDADE' | 'ATESTADO_MEDICO' | 'OUTROS';
  dataInicio: string;
  previsaoRetorno: string;
  dataRetornoEfetivo?: string;
  diasAfastamento: number;
  cid?: string; // Protegido com sigilo
  medicoEmitente?: string;
  crm?: string;
  documentoUrl?: string;
  impactoFolha: string;
  impactoFerias: string;
  status: 'ATIVO' | 'ENCERRADO';
}

export interface ItemAgendaObrigacao {
  id: string;
  empresaId: string;
  empregadoId?: string;
  titulo: string;
  tipo: 'EXPERIENCIA' | 'FERIAS_DOBRO' | 'FOLHA_SALARIO' | 'ADIANTAMENTO' | 'FGTS_DIGITAL' | 'DCTFWEB' | 'RESCISAO';
  dataLimite: string;
  empregadoNome?: string;
  responsavel: string;
  status: 'PENDENTE' | 'PROXIMO_VENCIMENTO' | 'CONCLUIDO' | 'ATRASADO';
  descricao: string;
}

export interface ESocialEvento {
  id: string;
  codigoEvento: 'S-1000' | 'S-2200' | 'S-1200' | 'S-1210' | 'S-2299' | 'S-2230';
  descricao: string;
  competencia?: string;
  empregadoNome?: string;
  statusEnvio: 'GERADO' | 'TRANSMITIDO' | 'PROCESSADO_COM_SUCESSO' | 'REJEITADO';
  numeroRecibo?: string;
  numeroProtocolo?: string;
  dataTransmissao?: string;
  arquivoXmlSimulado: string;
  mensagensRetorno?: string[];
}

export interface MovimentacaoMensalEmpresa {
  id: string;
  empresaId: string;
  competencia: string;
  empregadoId: string;
  tipo: 'HORAS_EXTRAS' | 'FALTAS' | 'COMISSAO' | 'PREMIO' | 'BENEFICIO' | 'AVISO_ADMISSAO';
  descricao: string;
  quantidade?: number;
  valor?: number;
  dataEvento: string;
  comprovanteNome?: string;
  enviadoPor: string;
  status: 'ENVIADO' | 'EM_ANALISE' | 'INTEGRADO_NA_FOLHA' | 'RECUSADO';
  dataEnvio: string;
}

export interface ConciliacaoPagamento {
  id: string;
  empregadoId: string;
  competencia: string;
  valorAprovadoFolha: number;
  valorPagoInformado: number;
  status: 'CONCILIADO' | 'PAGAMENTO_PARCIAL' | 'PAGAMENTO_DUPLICADO' | 'PENDENTE';
  comprovanteUrl?: string;
  dataPagamento?: string;
  diferenca: number;
}
