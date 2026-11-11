import React, { useState, useEffect } from 'react';
import {
  Empresa,
  Empregado,
  FolhaEmpregado,
  CompetenciaFolha,
  ItemCalculadoFolha,
  PeriodoFerias,
  ContratoDocumento,
  Afastamento,
  ItemAgendaObrigacao,
  ESocialEvento,
  MovimentacaoMensalEmpresa,
  UserRole,
  StatusCompetencia,
  LancamentoVariavel,
} from './types/dp';
import { api } from './services/api';
import { formatarMoeda, formatarData, formatarCPF, formatarCompetenciaExtenso } from './utils/formatters';
import {
  gerarListagemFolhaPDF,
  gerarReciboPagamentoIndividualPDF,
  gerarRecibosEmLotePDF,
  gerarContratoTrabalhoPDF,
  gerarContratoExperienciaPDF,
  gerarRegistroEmpregadoPDF,
  gerarDocumentosAdmissaoConjuntoPDF,
} from './utils/pdfGenerator';
import { useTheme } from './utils/theme';
import { MemoryCalculationModal } from './components/MemoryCalculationModal';
import { CalculationComparisonDrawer } from './components/CalculationComparisonDrawer';
import { SpreadsheetImporterModal } from './components/SpreadsheetImporterModal';
import { TerminationSimulatorModal } from './components/TerminationSimulatorModal';
import { VacationPlannerModal } from './components/VacationPlannerModal';
import { NewEmployeeModal } from './components/NewEmployeeModal';
import { DocumentSigningModal } from './components/DocumentSigningModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { EmployeePortalView } from './components/EmployeePortalView';
import { PDFPreviewModal } from './components/PDFPreviewModal';
import { AdmissionDocumentsModal } from './components/AdmissionDocumentsModal';
import { VacationDocumentsModal } from './components/VacationDocumentsModal';
import { CompanyManagementModal } from './components/CompanyManagementModal';
import { CompetenceModal } from './components/CompetenceModal';
import { AddEventModal } from './components/AddEventModal';
import { EmployeeActionModal } from './components/EmployeeActionModal';
import {
  Building2,
  Users,
  Receipt,
  Palmtree,
  UserX,
  FileText,
  FileSpreadsheet,
  UploadCloud,
  FileCheck2,
  CalendarDays,
  Sparkles,
  Calculator,
  AlertTriangle,
  Lock,
  Unlock,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Layers,
  UserCheck,
  X,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Check,
  ChevronDown,
  Settings,
  Edit2,
  Trash2,
  UserCog,
  UserMinus,
  Eye,
  PlusCircle,
} from 'lucide-react';

const EMPRESA_PADRAO: Empresa = {
  id: 'emp-1',
  razaoSocial: 'Emplast Comércio de Embalagens e Descartáveis Ltda',
  nomeFantasia: 'Emplast Embalagens',
  cnpj: '31.849.201/0001-85',
  inscricaoEstadual: '110.293.840.112',
  inscricaoMunicipal: '9.821.042-1',
  regimeTributario: 'SIMPLES_NACIONAL',
  fpas: '507',
  aliquotaRat: 2.0,
  fap: 1.0,
  aliquotaTerceiros: 0,
  cnaePrincipal: '46.86-9-02',
  endereco: {
    logradouro: 'Av. das Indústrias',
    numero: '1500',
    bairro: 'Distrito Industrial',
    cidade: 'Campinas',
    uf: 'SP',
    cep: '13054-700',
  },
  contatoResponsavel: {
    nome: 'Mariana Duarte',
    email: 'mariana.duarte@emplast.com.br',
    telefone: '(19) 3788-9200',
  },
  configuracoesFolha: {
    diaPagamentoSalario: 5,
    diaAdiantamento: 20,
    percentualAdiantamento: 40,
    diaVencimentoFGTS: 20,
    diaVencimentoDCTFWeb: 15,
  },
};

export default function App() {
  // Tema global (Claro, Escuro, Automático)
  const { theme, setTheme } = useTheme();
  const [menuTemaAberto, setMenuTemaAberto] = useState(false);

  // Estado global do usuário e contexto de trabalho
  const [usuarioRole, setUsuarioRole] = useState<UserRole>('dp_operator');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaAtivaId, setEmpresaAtivaId] = useState<string>('');
  const [competenciaAtiva, setCompetenciaAtiva] = useState<string>('05/2026');
  const [abaNavegacao, setAbaNavegacao] = useState<
    'DASHBOARD' | 'FOLHA' | 'EMPREGADOS' | 'FERIAS' | 'RESCISAO' | 'CONTRATOS' | 'MOVIMENTACOES' | 'ESOCIAL'
  >('DASHBOARD');

  // Gestão de Empresas
  const [modalEmpresasAberto, setModalEmpresasAberto] = useState(false);
  const [modoEmpresasInicial, setModoEmpresasInicial] = useState<'LISTA' | 'NOVA' | 'EDITAR'>('LISTA');
  const [empresaParaEditar, setEmpresaParaEditar] = useState<Empresa | null>(null);
  const [menuEmpresasAberto, setMenuEmpresasAberto] = useState(false);
  const [bannerEmpresaRecemCriada, setBannerEmpresaRecemCriada] = useState<Empresa | null>(null);

  // Gestão de Competências
  const [modalCompetenciasAberto, setModalCompetenciasAberto] = useState(false);
  const [modoCompetenciaInicial, setModoCompetenciaInicial] = useState<'LISTA' | 'NOVA'>('LISTA');
  const [listaCompetencias, setListaCompetencias] = useState<CompetenciaFolha[]>([]);
  const [menuCompetenciasAberto, setMenuCompetenciasAberto] = useState(false);

  // Lançamentos Variáveis e Eventos
  const [modalAddEventAberto, setModalAddEventAberto] = useState(false);
  const [empregadoPreSelecionadoEvento, setEmpregadoPreSelecionadoEvento] = useState<Empregado | null>(null);
  const [lancamentosVariaveis, setLancamentosVariaveis] = useState<LancamentoVariavel[]>([]);
  const [lancamentoParaEditar, setLancamentoParaEditar] = useState<LancamentoVariavel | null>(null);

  // Ações de Colaborador (Ficha, Edição, Alteração Salarial/Função, Desligamento, Exclusão)
  const [modalEmployeeActionAberto, setModalEmployeeActionAberto] = useState(false);
  const [empregadoAcaoSelecionado, setEmpregadoAcaoSelecionado] = useState<Empregado | null>(null);
  const [modoEmployeeAction, setModoEmployeeAction] = useState<'CONSULTA' | 'EDICAO' | 'ALTERACAO_SALARIAL' | 'EXCLUSAO' | 'DESLIGAMENTO'>('CONSULTA');

  // Estado da barra lateral recolhível (computador) e drawer (celular)
  const [sidebarRecolhida, setSidebarRecolhida] = useState<boolean>(() => {
    try {
      return localStorage.getItem('df_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileDrawerAberto, setMobileDrawerAberto] = useState(false);

  const toggleSidebar = () => {
    setSidebarRecolhida(prev => {
      const next = !prev;
      try {
        localStorage.setItem('df_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Dados carregados da API
  const [empregados, setEmpregados] = useState<Empregado[]>([]);
  const [folhaData, setFolhaData] = useState<{ competencia: CompetenciaFolha; folhas: FolhaEmpregado[] } | null>(null);
  const [periodosFerias, setPeriodosFerias] = useState<PeriodoFerias[]>([]);
  const [documentos, setDocumentos] = useState<ContratoDocumento[]>([]);
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [agenda, setAgenda] = useState<ItemAgendaObrigacao[]>([]);
  const [esocialEventos, setEsocialEventos] = useState<ESocialEvento[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoMensalEmpresa[]>([]);

  // Estados de carregamento e feedback
  const [_carregandoGeral, setCarregandoGeral] = useState(true);
  const [processandoFolha, setProcessandoFolha] = useState(false);
  const [termoBuscaEmpregado, setTermoBuscaEmpregado] = useState('');

  // Modais interativos
  const [modalMemoriaItem, setModalMemoriaItem] = useState<{ item: ItemCalculadoFolha; salario: number; nome: string } | null>(null);
  const [drawerAuditoriaAberto, setDrawerAuditoriaAberto] = useState(false);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [modalNovaAdmissaoAberto, setModalNovaAdmissaoAberto] = useState(false);
  const [modalRescisaoEmpregado, setModalRescisaoEmpregado] = useState<Empregado | null>(null);
  const [modalFeriasEmpregado, setModalFeriasEmpregado] = useState<Empregado | null>(null);
  const [modalDocumentosFeriasEmpregado, setModalDocumentosFeriasEmpregado] = useState<{
    empregado: Empregado;
    periodo?: PeriodoFerias;
  } | null>(null);
  const [modalDocumentoStatus, setModalDocumentoStatus] = useState<ContratoDocumento | null>(null);
  const [modalAdmissaoEmpregado, setModalAdmissaoEmpregado] = useState<Empregado | null>(null);
  const [modalIAAberto, setModalIAAberto] = useState(false);
  const [modalReaberturaAberto, setModalReaberturaAberto] = useState(false);
  const [motivoReabertura, setMotivoReabertura] = useState('');
  const [notificacao, setNotificacao] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' | 'info' } | null>(null);

  const mostrarNotificacao = (mensagem: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso') => {
    setNotificacao({ mensagem, tipo });
    setTimeout(() => setNotificacao(null), 4500);
  };

  // Estados para emissão e visualização de PDFs
  const [pdfPreviewData, setPdfPreviewData] = useState<{
    isOpen: boolean;
    titulo: string;
    subtitulo?: string;
    pdfUrl: string | null;
    nomeArquivoDownload: string;
    onBaixarArquivo: () => void;
  }>({
    isOpen: false,
    titulo: '',
    pdfUrl: null,
    nomeArquivoDownload: '',
    onBaixarArquivo: () => {},
  });

  const [modalRecibosLoteAberto, setModalRecibosLoteAberto] = useState(false);
  const [trabalhadorReciboSelecionadoId, setTrabalhadorReciboSelecionadoId] = useState<string>('TODOS');

  // Carrega empresas iniciais
  const carregarEmpresas = async () => {
    try {
      const emps = await api.getEmpresas();
      setEmpresas(emps);
      if (emps.length > 0) {
        if (!empresaAtivaId || !emps.some(e => e.id === empresaAtivaId)) {
          setEmpresaAtivaId(emps[0].id);
        }
      } else {
        setEmpresaAtivaId('');
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  useEffect(() => {
    carregarEmpresas();
  }, []);

  // Carrega lista de competências para a empresa ativa
  const carregarCompetencias = async (empId: string) => {
    if (!empId) {
      setListaCompetencias([]);
      return;
    }
    try {
      const comps = await api.getCompetencias(empId);
      setListaCompetencias(comps);
      if (comps.length > 0 && !comps.some(c => c.competencia === competenciaAtiva)) {
        setCompetenciaAtiva(comps[0].competencia);
      }
    } catch (err) {
      console.error('Erro ao carregar competências:', err);
    }
  };

  useEffect(() => {
    if (empresaAtivaId) {
      carregarCompetencias(empresaAtivaId);
    }
  }, [empresaAtivaId]);

  // Recarrega todos os dados ao trocar de empresa ou competência
  const carregarDadosCompetencia = async () => {
    if (!empresaAtivaId) {
      setEmpregados([]);
      setFolhaData(null);
      setPeriodosFerias([]);
      setDocumentos([]);
      setAfastamentos([]);
      setAgenda([]);
      setEsocialEventos([]);
      setMovimentacoes([]);
      setLancamentosVariaveis([]);
      setCarregandoGeral(false);
      return;
    }
    try {
      setCarregandoGeral(true);
      const [emps, folhaRes, feriasRes, docsRes, afastRes, agendaRes, esocialRes, movRes, lancRes] = await Promise.all([
        api.getEmpregados(empresaAtivaId),
        api.getFolha(empresaAtivaId, competenciaAtiva),
        api.getFerias(empresaAtivaId),
        api.getDocumentos(empresaAtivaId),
        api.getAfastamentos(empresaAtivaId),
        api.getAgenda(empresaAtivaId),
        api.getESocial(empresaAtivaId),
        api.getMovimentacoes(empresaAtivaId, competenciaAtiva),
        api.getLancamentosVariaveis(empresaAtivaId, competenciaAtiva),
      ]);

      setEmpregados(emps);
      setFolhaData(folhaRes);
      setPeriodosFerias(feriasRes);
      setDocumentos(docsRes);
      setAfastamentos(afastRes);
      setAgenda(agendaRes);
      setEsocialEventos(esocialRes);
      setMovimentacoes(movRes);
      setLancamentosVariaveis(lancRes || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setCarregandoGeral(false);
    }
  };

  useEffect(() => {
    carregarDadosCompetencia();
  }, [empresaAtivaId, competenciaAtiva]);

  const empresaAtiva = empresas.find(e => e.id === empresaAtivaId) || (empresas.length > 0 ? empresas[0] : null);

  // Ações da Folha e Competência
  const handleCalcularFolhaCompleta = async () => {
    try {
      setProcessandoFolha(true);
      await api.calcularFolha({
        empresaId: empresaAtivaId,
        competencia: competenciaAtiva,
        tipoFolha: 'MENSAL',
      });
      await carregarDadosCompetencia();
      mostrarNotificacao('Folha de pagamento calculada com sucesso com regras vigentes e memória analítica!', 'sucesso');
    } catch (err: any) {
      mostrarNotificacao(err.message || 'Erro ao calcular folha', 'erro');
    } finally {
      setProcessandoFolha(false);
    }
  };

  const handleAvancarEtapa = async (novoStatus: StatusCompetencia) => {
    try {
      await api.atualizarStatusCompetencia({
        empresaId: empresaAtivaId,
        competencia: competenciaAtiva,
        status: novoStatus,
        usuario: 'Operador de DP',
      });
      await carregarDadosCompetencia();
      mostrarNotificacao(`Folha avançada para a etapa: ${novoStatus.replace('_', ' ')}`, 'sucesso');
    } catch (err: any) {
      mostrarNotificacao(err.message || 'Erro ao atualizar etapa', 'erro');
    }
  };

  const handleFecharCompetencia = async () => {
    if (!folhaData) return;
    try {
      await api.aprovarFecharCompetencia({
        empresaId: empresaAtivaId,
        competencia: competenciaAtiva,
        usuario: 'Operador de DP',
      });
      await carregarDadosCompetencia();
      mostrarNotificacao('Competência fechada com sucesso! Eventos S-1200 e S-1210 encaminhados ao eSocial.', 'sucesso');
    } catch (err: any) {
      mostrarNotificacao(err.message || 'Erro ao fechar folha', 'erro');
    }
  };

  const handleReabrirCompetencia = async () => {
    if (!motivoReabertura.trim()) {
      mostrarNotificacao('A justificativa é obrigatória para reabrir uma folha fechada.', 'erro');
      return;
    }
    try {
      await api.reabrirCompetencia({
        empresaId: empresaAtivaId,
        competencia: competenciaAtiva,
        motivo: motivoReabertura,
        usuario: 'Operador de DP',
      });
      setModalReaberturaAberto(false);
      setMotivoReabertura('');
      await carregarDadosCompetencia();
      mostrarNotificacao('Competência reaberta com sucesso e registrada no log de auditoria.', 'sucesso');
    } catch (err: any) {
      mostrarNotificacao(err.message || 'Erro ao reabrir folha', 'erro');
    }
  };

  const handleTransmitirESocial = async (eventoId: string) => {
    try {
      await api.transmitirESocial(eventoId);
      await carregarDadosCompetencia();
      mostrarNotificacao('Evento transmitido com sucesso com recibo oficial retornado!', 'sucesso');
    } catch (err: any) {
      mostrarNotificacao(err.message || 'Erro ao transmitir evento', 'erro');
    }
  };

  // Funções de Emissão de PDFs (Listagem de Folha Carta & Recibos de Pagamento A4)
  const handleAbrirListagemFolha = () => {
    if (!folhaData || folhaData.folhas.length === 0) {
      mostrarNotificacao('Nenhuma folha calculada para esta competência.', 'info');
      return;
    }
    const empAtual = empresaAtiva || EMPRESA_PADRAO;
    const url = gerarListagemFolhaPDF(empAtual, competenciaAtiva, folhaData.folhas, empregados, { returnBlobUrl: true }) as string;
    setPdfPreviewData({
      isOpen: true,
      titulo: 'Listagem de Folha de Pagamento',
      subtitulo: `Modelo Oficial (Carta Retrato) · Competência ${competenciaAtiva} · ${empAtual.razaoSocial}`,
      pdfUrl: url,
      nomeArquivoDownload: `Listagem_Folha_${competenciaAtiva.replace('/', '-')}_${empAtual.nomeFantasia || 'Empresa'}.pdf`,
      onBaixarArquivo: () => {
        gerarListagemFolhaPDF(empAtual, competenciaAtiva, folhaData.folhas, empregados);
      },
    });
  };

  const handleAbrirReciboIndividual = (folha: FolhaEmpregado, empObj: Empregado) => {
    const empAtual = empresaAtiva || EMPRESA_PADRAO;
    const url = gerarReciboPagamentoIndividualPDF(folha, empAtual, empObj, { returnBlobUrl: true }) as string;
    setPdfPreviewData({
      isOpen: true,
      titulo: `Recibo de Pagamento (Folha de Pagamento)`,
      subtitulo: `Modelo Oficial A4 Retrato · ${folha.nomeEmpregado} (Matrícula ${folha.matricula}) · Competência ${formatarCompetenciaExtenso(competenciaAtiva)}`,
      pdfUrl: url,
      nomeArquivoDownload: `Recibo_Pagamento_${competenciaAtiva.replace('/', '-')}_${folha.matricula}_${folha.nomeEmpregado.replace(/\s+/g, '_')}.pdf`,
      onBaixarArquivo: () => {
        gerarReciboPagamentoIndividualPDF(folha, empAtual, empObj);
      },
    });
  };

  const handleProcessarEmissaoRecibos = () => {
    if (!folhaData || folhaData.folhas.length === 0) {
      mostrarNotificacao('Nenhuma folha calculada para esta competência.', 'info');
      return;
    }

    const empAtual = empresaAtiva || EMPRESA_PADRAO;
    if (trabalhadorReciboSelecionadoId === 'TODOS') {
      const url = gerarRecibosEmLotePDF(empAtual, competenciaAtiva, folhaData.folhas, empregados, { returnBlobUrl: true }) as string;
      setPdfPreviewData({
        isOpen: true,
        titulo: 'Recibos de Pagamento em Lote',
        subtitulo: `Modelo A4 Retrato (1 página por trabalhador) · ${folhaData.folhas.length} trabalhadores · ${formatarCompetenciaExtenso(competenciaAtiva)}`,
        pdfUrl: url,
        nomeArquivoDownload: `Recibos_Folha_Lote_${competenciaAtiva.replace('/', '-')}_${empAtual.nomeFantasia || 'Empresa'}.pdf`,
        onBaixarArquivo: () => {
          gerarRecibosEmLotePDF(empAtual, competenciaAtiva, folhaData.folhas, empregados);
        },
      });
      setModalRecibosLoteAberto(false);
    } else {
      const folhaSel = folhaData.folhas.find(f => f.empregadoId === trabalhadorReciboSelecionadoId);
      const empSel = empregados.find(e => e.id === trabalhadorReciboSelecionadoId);
      if (folhaSel && empSel) {
        handleAbrirReciboIndividual(folhaSel, empSel);
        setModalRecibosLoteAberto(false);
      }
    }
  };

  // Se o perfil selecionado for 'employee', exibe o portal do colaborador
  if (usuarioRole === 'employee') {
    const colaboradorLogado = empregados[0] || {
      id: 'emp-lucas',
      matricula: '00101',
      nomeCompleto: 'Lucas Gabriel de Albuquerque',
      cargo: 'Engenheiro de Software',
      departamento: 'Tecnologia',
      salarioBase: 9200,
      cpf: '38829104812',
      dataAdmissao: '2022-03-10',
      vinculo: 'CLT' as const,
      status: 'ativo' as const,
      rg: '44.891.201-9',
      orgaoExpedidor: 'SSP/SP',
      pis: '128.94012.89-1',
      dataNascimento: '1992-04-14',
      sexo: 'M' as const,
      estadoCivil: 'CASADO' as const,
      nacionalidade: 'Brasileira',
      email: 'lucas.albuquerque@techvale.com.br',
      telefone: '(11) 98711-2044',
      endereco: { logradouro: 'Rua Vergueiro', numero: '2050', bairro: 'Vila Mariana', cidade: 'São Paulo', uf: 'SP', cep: '04102-000' },
      dadosBancarios: { banco: 'Itaú', codigoBanco: '341', agencia: '0340', conta: '98412-4', tipoConta: 'CORRENTE' as const },
      cbo: '2124-05',
      centroDeCusto: 'CC-01',
      tipoSalario: 'MENSALISTA' as const,
      jornadaHorasSemanais: 40,
      divisorHoras: 200,
      escala: 'Segunda a Sexta (09:00 às 18:00)',
      tipoContrato: 'INDETERMINADO' as const,
      dependentes: [],
      beneficios: [],
      documentosAdmissao: [],
      historicoAlteracoes: [],
      optanteFGTS: true,
      aliquotaFGTS: 0.08,
      empresaId: empresaAtivaId,
    };

    return (
      <EmployeePortalView
        empregado={colaboradorLogado}
        empresa={empresaAtiva || EMPRESA_PADRAO}
        folhas={folhaData?.folhas || []}
        periodoFerias={periodosFerias.find(f => f.empregadoId === colaboradorLogado.id)}
        documentos={documentos.filter(d => d.empregadoId === colaboradorLogado.id)}
        onVoltarParaAdmin={() => setUsuarioRole('dp_operator')}
      />
    );
  }

  const empregadosFiltrados = empregados.filter(e => {
    if (!termoBuscaEmpregado) return true;
    const term = termoBuscaEmpregado.toLowerCase();
    return (
      e.nomeCompleto.toLowerCase().includes(term) ||
      e.matricula.toLowerCase().includes(term) ||
      e.cargo.toLowerCase().includes(term) ||
      e.cpf.includes(term)
    );
  });

  const statusComp: StatusCompetencia = folhaData?.competencia?.status || 'ABERTA';
  const temCalculo = Boolean(folhaData && folhaData.folhas && folhaData.folhas.length > 0);

  // Módulos agrupados por rotina para a barra lateral
  const rotinasModulos = [
    {
      grupo: 'Rotinas Mensais',
      itens: [
        { id: 'DASHBOARD' as const, label: 'Visão Geral & Prazos', icon: CalendarDays },
        { id: 'FOLHA' as const, label: 'Folha de Pagamento', icon: Receipt },
        { id: 'FERIAS' as const, label: 'Férias & Afastamentos', icon: Palmtree },
        { id: 'RESCISAO' as const, label: 'Rescisão & TRCT', icon: UserX },
      ],
    },
    {
      grupo: 'Gestão de Pessoas',
      itens: [
        { id: 'EMPREGADOS' as const, label: 'Empregados & Admissão', icon: Users },
        { id: 'CONTRATOS' as const, label: 'Contratos & Recibos', icon: FileText },
        { id: 'MOVIMENTACOES' as const, label: 'Movimentações & Ponto', icon: UploadCloud },
      ],
    },
    {
      grupo: 'Obrigações & eSocial',
      itens: [
        { id: 'ESOCIAL' as const, label: 'eSocial & Obrigações', icon: FileCheck2 },
      ],
    },
  ];

  // Reordenação da Agenda de Prazos: Atrasados primeiro, seguidos por ordem cronológica
  const agendaOrdenada = [...agenda].sort((a, b) => {
    const pesoStatus = (st: string) => {
      if (st === 'ATRASADO') return 1;
      if (st === 'PROXIMO_VENCIMENTO') return 2;
      if (st === 'PENDENTE') return 3;
      return 4;
    };
    const diff = pesoStatus(a.status) - pesoStatus(b.status);
    if (diff !== 0) return diff;
    return new Date(a.dataLimite).getTime() - new Date(b.dataLimite).getTime();
  });

  // Ação ao clicar no item da agenda
  const handleAcaoAgenda = (item: ItemAgendaObrigacao) => {
    if (item.empregadoId) {
      const emp = empregados.find(e => e.id === item.empregadoId);
      if (emp) {
        if (item.titulo.toLowerCase().includes('férias') || item.descricao.toLowerCase().includes('férias')) {
          setModalFeriasEmpregado(emp);
          return;
        }
        if (item.titulo.toLowerCase().includes('rescis') || item.descricao.toLowerCase().includes('rescis') || item.titulo.toLowerCase().includes('trct')) {
          setModalRescisaoEmpregado(emp);
          return;
        }
        if (item.titulo.toLowerCase().includes('experiência') || item.titulo.toLowerCase().includes('contrato')) {
          setAbaNavegacao('CONTRATOS');
          return;
        }
      }
    }
    if (item.titulo.toLowerCase().includes('folha') || item.titulo.toLowerCase().includes('fgts')) {
      setAbaNavegacao('FOLHA');
      return;
    }
    if (item.titulo.toLowerCase().includes('esocial') || item.titulo.toLowerCase().includes('dctfweb')) {
      setAbaNavegacao('ESOCIAL');
      return;
    }
    setAbaNavegacao('FOLHA');
  };

  // Etapas visíveis do fluxo da competência
  const etapasFluxo: { status: StatusCompetencia; label: string; sub: string }[] = [
    { status: 'ABERTA', label: 'Aberta', sub: 'Lançamentos' },
    { status: 'EM_CONFERENCIA', label: 'Em conferência', sub: 'Auditoria' },
    { status: 'APROVADA', label: 'Aprovada', sub: 'Homologada' },
    { status: 'FECHADA', label: 'Fechada', sub: 'Transmitida' },
  ];

  const statusIndexMap: Record<StatusCompetencia, number> = {
    ABERTA: 0,
    EM_CONFERENCIA: 1,
    APROVADA: 2,
    FECHADA: 3,
  };
  const etapaAtualIndex = statusIndexMap[statusComp] ?? 0;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-['Inter','Plus_Jakarta_Sans',sans-serif] transition-colors">
      {/* 1. CABEÇALHO SIMPLIFICADO: EMPRESA, COMPETÊNCIA E SITUAÇÃO VISÍVEIS */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo e Botão de Recolher Sidebar (desktop) */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title={sidebarRecolhida ? 'Expandir barra lateral' : 'Recolher barra lateral'}
              aria-label="Alternar barra lateral"
            >
              {sidebarRecolhida ? <PanelLeftOpen className="w-5 h-5 text-blue-400" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-xs">
                DF
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block leading-tight">
                  Departamento Fácil
                </span>
                <span className="text-[11px] text-slate-400 hidden lg:block">
                  Gestão Trabalhista & Folha de Pagamento
                </span>
              </div>
            </div>
          </div>

          {/* Contexto Ativo: Empresa + Competência + Situação da Folha */}
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-800/90 px-2 py-1.5 rounded-xl border border-slate-700/80">
            {empresas.length === 0 ? (
              <button
                onClick={() => {
                  setModoEmpresasInicial('NOVA');
                  setEmpresaParaEditar(null);
                  setModalEmpresasAberto(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar primeira empresa
              </button>
            ) : (
              <>
                {/* Seletor de Empresa */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setMenuEmpresasAberto(!menuEmpresasAberto);
                      setMenuCompetenciasAberto(false);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-100 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-700/60 transition-colors max-w-[140px] sm:max-w-[220px]"
                    title="Empresa Selecionada (Clique para trocar, criar ou gerenciar)"
                  >
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {empresaAtiva?.nomeFantasia || empresaAtiva?.razaoSocial || 'Selecionar empresa'}
                    </span>
                    {empresaAtiva?.status === 'inativa' && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded shrink-0">Inativa</span>
                    )}
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>

                  {menuEmpresasAberto && (
                    <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 py-1.5 text-xs">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                        <span>Empresas ({empresas.length})</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                        {empresas.map(emp => (
                          <button
                            key={emp.id}
                            onClick={() => {
                              setEmpresaAtivaId(emp.id);
                              setMenuEmpresasAberto(false);
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                              emp.id === empresaAtivaId ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-slate-200'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="truncate font-semibold">{emp.nomeFantasia || emp.razaoSocial}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{emp.cnpj}</div>
                            </div>
                            {emp.status === 'inativa' && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded shrink-0">Inativa</span>
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-slate-800 mt-1 pt-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setMenuEmpresasAberto(false);
                            setModoEmpresasInicial('NOVA');
                            setEmpresaParaEditar(null);
                            setModalEmpresasAberto(true);
                          }}
                          className="w-full text-left px-3 py-1.5 text-blue-400 hover:bg-slate-800 font-bold flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Nova empresa
                        </button>
                        <button
                          onClick={() => {
                            setMenuEmpresasAberto(false);
                            setModoEmpresasInicial('LISTA');
                            setModalEmpresasAberto(true);
                          }}
                          className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Settings className="w-3.5 h-3.5 text-slate-400" />
                          Gerenciar empresas
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px h-5 bg-slate-700" />

                {/* Seletor de Competência */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setMenuCompetenciasAberto(!menuCompetenciasAberto);
                      setMenuEmpresasAberto(false);
                    }}
                    className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-100 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-700/60 transition-colors"
                    title="Competência Ativa (Clique para trocar, criar ou gerenciar)"
                  >
                    <CalendarDays className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{competenciaAtiva || 'Sem competência'}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>

                  {menuCompetenciasAberto && (
                    <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 py-1.5 text-xs">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                        Competências
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                        {listaCompetencias.length === 0 ? (
                          <div className="px-3 py-2 text-slate-400 text-[11px]">Nenhuma competência cadastrada.</div>
                        ) : (
                          listaCompetencias.map(comp => (
                            <button
                              key={comp.competencia}
                              onClick={() => {
                                setCompetenciaAtiva(comp.competencia);
                                setMenuCompetenciasAberto(false);
                              }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                                comp.competencia === competenciaAtiva ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-slate-200'
                              }`}
                            >
                              <div className="font-mono">{comp.competencia}</div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                comp.status === 'FECHADA'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : comp.status === 'APROVADA'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : comp.status === 'EM_CONFERENCIA'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}>
                                {comp.status.replace('_', ' ')}
                              </span>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="border-t border-slate-800 mt-1 pt-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setMenuCompetenciasAberto(false);
                            setModoCompetenciaInicial('NOVA');
                            setModalCompetenciasAberto(true);
                          }}
                          className="w-full text-left px-3 py-1.5 text-blue-400 hover:bg-slate-800 font-bold flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Nova competência
                        </button>
                        <button
                          onClick={() => {
                            setMenuCompetenciasAberto(false);
                            setModoCompetenciaInicial('LISTA');
                            setModalCompetenciasAberto(true);
                          }}
                          className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Settings className="w-3.5 h-3.5 text-slate-400" />
                          Gerenciar competências
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px h-5 bg-slate-700 hidden sm:block" />

                {/* Badge de Situação da Folha (Ícone + Texto) */}
                <div className="hidden sm:flex items-center pr-1">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${
                    statusComp === 'FECHADA'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : statusComp === 'APROVADA'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : statusComp === 'EM_CONFERENCIA'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}>
                    {statusComp === 'FECHADA' ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : statusComp === 'APROVADA' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : statusComp === 'EM_CONFERENCIA' ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                    {statusComp.replace('_', ' ')}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Área de Ferramentas: Consultor IA, Controle de Aparência e Perfil */}
          <div className="flex items-center gap-2">
            {/* Consultor IA como ação secundária */}
            <button
              onClick={() => setModalIAAberto(true)}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
              title="Consultor Jurídico Trabalhista IA (Ação Secundária)"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Consultor IA</span>
            </button>

            {/* Controle de Aparência (Claro, Escuro, Automático) */}
            <div className="relative">
              <button
                onClick={() => setMenuTemaAberto(!menuTemaAberto)}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-700 transition-colors"
                title="Aparência: Claro, Escuro ou Automático"
                aria-label="Selecionar tema visual"
              >
                {theme === 'light' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Monitor className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="hidden xl:inline text-[11px] font-medium capitalize">
                  {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Auto'}
                </span>
              </button>

              {menuTemaAberto && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-1 text-xs">
                  <button
                    onClick={() => { setTheme('light'); setMenuTemaAberto(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      theme === 'light'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      Claro
                    </span>
                    {theme === 'light' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  <button
                    onClick={() => { setTheme('dark'); setMenuTemaAberto(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-blue-400" />
                      Escuro
                    </span>
                    {theme === 'dark' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>

                  <button
                    onClick={() => { setTheme('system'); setMenuTemaAberto(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      theme === 'system'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-slate-400" />
                      Usar do dispositivo
                    </span>
                    {theme === 'system' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                </div>
              )}
            </div>

            {/* Alternador de Perfil */}
            <select
              value={usuarioRole}
              onChange={e => setUsuarioRole(e.target.value as UserRole)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer hidden sm:block"
              title="Perfil de Acesso"
            >
              <option value="dp_operator">Operador DP</option>
              <option value="admin">Administrador</option>
              <option value="gestor">Gestor Empresa</option>
              <option value="employee">Portal Empregado</option>
            </select>
          </div>
        </div>
      </header>

      {/* 2. ÁREA DE TRABALHO COM BARRA LATERAL RECOLHÍVEL (DESKTOP) E CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex w-full">
        {/* Barra Lateral (Desktop md:flex) */}
        <aside
          className={`hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 select-none shrink-0 ${
            sidebarRecolhida ? 'w-20' : 'w-64'
          }`}
        >
          <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
            {rotinasModulos.map(rotina => (
              <div key={rotina.grupo} className="space-y-1">
                {!sidebarRecolhida && (
                  <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                    {rotina.grupo}
                  </h3>
                )}
                {sidebarRecolhida && (
                  <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 mx-auto my-2" />
                )}

                <div className="space-y-1">
                  {rotina.itens.map(item => {
                    const Icon = item.icon;
                    const ativa = abaNavegacao === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setAbaNavegacao(item.id)}
                        title={item.label}
                        className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all group relative ${
                          ativa
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        } ${sidebarRecolhida ? 'justify-center' : 'justify-start'}`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${ativa ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'}`} />
                        {!sidebarRecolhida && (
                          <span className="truncate">{item.label}</span>
                        )}
                        {/* Tooltip acessível quando recolhida */}
                        {sidebarRecolhida && (
                          <span className="sr-only">{item.label}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé da Barra Lateral */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={() => setModalIAAberto(true)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-900/60 transition-colors ${
                sidebarRecolhida ? 'justify-center' : 'justify-start'
              }`}
              title="Consultor IA Especialista em CLT"
            >
              <Sparkles className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              {!sidebarRecolhida && <span>Consultor IA CLT</span>}
            </button>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL DAS TELAS */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          {/* Notificação Toast */}
          {notificacao && (
            <div className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in ${
              notificacao.tipo === 'sucesso'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : notificacao.tipo === 'erro'
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center gap-2">
                {notificacao.tipo === 'sucesso' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                )}
                <span>{notificacao.mensagem}</span>
              </div>
              <button onClick={() => setNotificacao(null)} className="p-1 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Alerta de Empresa Recém-Criada com Ações de Próximos Passos */}
          {bannerEmpresaRecemCriada && bannerEmpresaRecemCriada.id === empresaAtivaId && (
            <div className="p-4 bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Empresa {bannerEmpresaRecemCriada.nomeFantasia || bannerEmpresaRecemCriada.razaoSocial} cadastrada!
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Próximos passos recomendados para iniciar a operação:
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setModalNovaAdmissaoAberto(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar colaborador
                </button>
                <button
                  onClick={() => {
                    setModoCompetenciaInicial('NOVA');
                    setModalCompetenciasAberto(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Criar competência
                </button>
                <button
                  onClick={() => setBannerEmpresaRecemCriada(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  title="Dispensar aviso"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Zero-State quando não há nenhuma empresa cadastrada */}
          {empresas.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 px-4 text-center">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xs">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">
                  Bem-vindo ao Departamento Fácil
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-8">
                  Nenhuma empresa cadastrada no sistema. Comece cadastrando sua primeira empresa empregadora para gerenciar colaboradores, emitir contratos, lançar eventos e calcular a folha de pagamento.
                </p>

                {/* 4 Etapas do Fluxo Operacional */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-left mb-8">
                  <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Etapa 1</span>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Cadastrar Empresa</div>
                    <span className="text-[11px] text-slate-500">Razão Social e CNPJ</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-70">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Etapa 2</span>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Admitir Colaborador</div>
                    <span className="text-[11px] text-slate-500">Contrato e cargo</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-70">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Etapa 3</span>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Criar Competência</div>
                    <span className="text-[11px] text-slate-500">Mês normal ou 13º</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-70">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Etapa 4</span>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Lançar & Processar</div>
                    <span className="text-[11px] text-slate-500">Horas extras e recibos</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setModoEmpresasInicial('NOVA');
                    setEmpresaParaEditar(null);
                    setModalEmpresasAberto(true);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar primeira empresa
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* ABA: DASHBOARD GERAL & AGENDA DE OBRIGAÇÕES */}
              {/* ========================================================= */}
              {abaNavegacao === 'DASHBOARD' && (
                <div className="space-y-6">
              {/* Seção 1: Indicadores Financeiros da Competência com Destaque no Líquido a Pagar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      Folha de Pagamento · Competência {competenciaAtiva}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Apuração financeira consolidada de {empresaAtiva?.razaoSocial || EMPRESA_PADRAO.razaoSocial}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                    CNPJ: {empresaAtiva?.cnpj || EMPRESA_PADRAO.cnpj}
                  </span>
                </div>

                {temCalculo ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Cartão de Maior Destaque Visual (Spotlight): Líquido a Pagar */}
                    <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-200 block">
                            Líquido a Pagar aos Trabalhadores
                          </span>
                          <span className="text-[11px] font-semibold bg-white/15 px-2.5 py-0.5 rounded-full text-white">
                            Salário Líquido
                          </span>
                        </div>
                        <div className="text-3xl sm:text-4xl font-black tracking-tight mt-2 font-mono tabular-nums">
                          {formatarMoeda(folhaData?.competencia?.totalLiquido)}
                        </div>
                        <span className="text-xs text-blue-100 mt-1 block">
                          Valor total creditado na conta salário dos colaboradores
                        </span>
                      </div>

                      <div className="pt-4 border-t border-white/20 flex items-center justify-between text-xs text-blue-100">
                        <span>{folhaData?.competencia?.totalCalculados || 0} colaborador(es) apurados</span>
                        <button
                          onClick={() => setAbaNavegacao('FOLHA')}
                          className="font-bold underline hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          Ver folha analítica <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Grade com os Demais 4 Indicadores Complementares Reais */}
                    <div className="lg:col-span-7 grid grid-cols-2 gap-3.5">
                      {/* Proventos */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Total de Proventos
                        </span>
                        <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono tabular-nums">
                          {formatarMoeda(folhaData?.competencia?.totalProventos)}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                          Salários, adicionais e benefícios
                        </span>
                      </div>

                      {/* Descontos */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                          Descontos do Empregado
                        </span>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono tabular-nums">
                          - {formatarMoeda(folhaData?.competencia?.totalDescontos)}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                          INSS, IRRF, VT e faltas
                        </span>
                      </div>

                      {/* FGTS Empresa 8% */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                          FGTS da Empresa (8%)
                        </span>
                        <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono tabular-nums">
                          {formatarMoeda(folhaData?.competencia?.totalFGTS)}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                          Guia FGTS Digital (Patronal)
                        </span>
                      </div>

                      {/* Encargos Patronais Totais */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                          Encargos Patronais Totais
                        </span>
                        <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono tabular-nums">
                          {formatarMoeda(folhaData?.competencia?.totalEncargosEmpresa)}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                          INSS Empresa + RAT + FGTS
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Estado Vazio Explícito: Folha ainda não calculada */
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                      <Calculator className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        Folha ainda não calculada
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        A competência {competenciaAtiva} está aberta, mas os valores ainda não foram apurados para os {empregados.length} empregados cadastrados. Inicie o cálculo para gerar as rubricas, INSS progressivo e encargos.
                      </p>
                    </div>
                    <button
                      onClick={handleCalcularFolhaCompleta}
                      disabled={processandoFolha}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                      <Calculator className="w-4 h-4" />
                      {processandoFolha ? 'Processando cálculo...' : `Calcular Folha de ${competenciaAtiva}`}
                    </button>
                  </div>
                )}
              </div>

              {/* Seção 2: Fluxo da Competência em 4 Etapas Visíveis & Ação Principal */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Fluxo da Competência ({competenciaAtiva})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Acompanhamento sequencial da folha desde a abertura até o envio final
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Etapa Atual: <strong className="text-blue-600 dark:text-blue-400">{statusComp.replace('_', ' ')}</strong>
                  </span>
                </div>

                {/* Stepper Visual de 4 Etapas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  {etapasFluxo.map((etapa, idx) => {
                    const isConcluida = idx < etapaAtualIndex;
                    const isAtual = idx === etapaAtualIndex;

                    return (
                      <div
                        key={etapa.status}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isAtual
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20'
                            : isConcluida
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            isAtual
                              ? 'text-blue-600 dark:text-blue-400'
                              : isConcluida
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}>
                            Etapa {idx + 1}
                          </span>
                          {isConcluida ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : isAtual ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                        <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                          {etapa.label}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {etapa.sub}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Barra de Ações: Ação Principal Coerente com o Momento + Ações Complementares */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Ação Primária em Destaque */}
                  <div className="w-full sm:w-auto">
                    {statusComp === 'ABERTA' && (
                      temCalculo ? (
                        <button
                          onClick={() => handleAvancarEtapa('EM_CONFERENCIA')}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                        >
                          <ArrowRight className="w-4 h-4" />
                          Enviar Folha para Conferência
                        </button>
                      ) : (
                        <button
                          onClick={handleCalcularFolhaCompleta}
                          disabled={processandoFolha}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                        >
                          <Calculator className="w-4 h-4" />
                          {processandoFolha ? 'Processando...' : 'Calcular Folha Completa'}
                        </button>
                      )
                    )}

                    {statusComp === 'EM_CONFERENCIA' && (
                      <button
                        onClick={() => handleAvancarEtapa('APROVADA')}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Aprovar Folha de Pagamento
                      </button>
                    )}

                    {statusComp === 'APROVADA' && (
                      <button
                        onClick={handleFecharCompetencia}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                      >
                        <Lock className="w-4 h-4" />
                        Fechar Competência & Transmitir
                      </button>
                    )}

                    {statusComp === 'FECHADA' && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={handleAbrirListagemFolha}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Emitir Relatórios de Fechamento
                        </button>
                        <button
                          onClick={() => setModalReaberturaAberto(true)}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors"
                          title="Reabrir competência com justificativa auditável"
                        >
                          <Unlock className="w-4 h-4" />
                          Reabrir
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ações Complementares em Segundo Plano */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                    <button
                      onClick={() => setDrawerAuditoriaAberto(true)}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                      title="Auditoria Comparativa (Atual vs Mês Anterior)"
                    >
                      <Search className="w-3.5 h-3.5 text-blue-600" />
                      Auditoria Comparativa
                    </button>

                    <button
                      onClick={handleAbrirListagemFolha}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                      title="Gerar Listagem de Folha em papel Carta Retrato"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                      Listagem PDF
                    </button>

                    <button
                      onClick={() => setModalRecibosLoteAberto(true)}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                      title="Gerar Recibos de Pagamento em A4 Retrato"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                      Recibos A4
                    </button>

                    {statusComp !== 'FECHADA' && (
                      <button
                        onClick={handleCalcularFolhaCompleta}
                        disabled={processandoFolha}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                        title="Recalcular todas as variáveis"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        Recalcular
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 3: Agenda de Prazos Legais Reorganizada (Vencidos Primeiro) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Agenda e Controle de Prazos Legais do DP
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Itens ordenados por urgência (Atrasados com prioridade máxima para prevenção de multas)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {agenda.length} obrigações registradas
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {agendaOrdenada.map(item => {
                    const isAtrasado = item.status === 'ATRASADO';
                    const isPendente = item.status === 'PROXIMO_VENCIMENTO' || item.status === 'PENDENTE';
                    const isConcluido = item.status === 'CONCLUIDO';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleAcaoAgenda(item)}
                        className={`py-3.5 px-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer group ${
                          isAtrasado
                            ? 'hover:bg-rose-50/60 dark:hover:bg-rose-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Situação com Ícone + Texto */}
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isAtrasado
                                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                                : isPendente
                                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                                : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                            }`}>
                              {isAtrasado ? (
                                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              ) : isPendente ? (
                                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              )}
                              {isAtrasado ? 'Atrasado' : isPendente ? 'Pendente' : 'Concluído'}
                            </span>

                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.titulo}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {item.descricao}
                          </p>

                          {item.empregadoNome && (
                            <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium block">
                              Colaborador: {item.empregadoNome} · Responsável: {item.responsavel}
                            </span>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {formatarData(item.dataLimite)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Data limite legal</span>
                          </div>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1 flex items-center gap-0.5 sm:mt-1">
                            Acessar <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA: FOLHA DE PAGAMENTO ANALÍTICA & MEMÓRIA DE CÁLCULO */}
          {/* ========================================================= */}
          {abaNavegacao === 'FOLHA' && (
            <div className="space-y-4">
              {/* Header da Folha */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded">
                      Competência {competenciaAtiva}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Folha Analítica Mensal</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {empresaAtiva?.razaoSocial || EMPRESA_PADRAO.razaoSocial}
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setEmpregadoPreSelecionadoEvento(null);
                      setLancamentoParaEditar(null);
                      setModalAddEventAberto(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    title="Adicionar evento à folha (Horas extras, faltas, adicionais) individual ou em lote"
                  >
                    <Plus className="w-4 h-4" />
                    + Adicionar evento
                  </button>

                  <button
                    onClick={handleAbrirListagemFolha}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    title="Gerar Listagem de Folha de Pagamento em papel Carta Retrato (Modelo Oficial)"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Gerar Listagem de Folha
                  </button>

                  <button
                    onClick={() => setModalRecibosLoteAberto(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    title="Gerar Recibos de Pagamento individuais em A4 Retrato"
                  >
                    <Receipt className="w-4 h-4" />
                    Gerar Recibos de Pagamento
                  </button>

                  <button
                    onClick={() => setDrawerAuditoriaAberto(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                    title="Comparar Folha Atual vs Mês Anterior"
                  >
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Auditoria
                  </button>

                  <button
                    onClick={() => setModalImportarAberto(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                    title="Importar variáveis de ponto ou comissões"
                  >
                    <UploadCloud className="w-4 h-4 text-emerald-600" />
                    Importar
                  </button>

                  <button
                    onClick={handleCalcularFolhaCompleta}
                    disabled={processandoFolha || statusComp === 'FECHADA'}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                    title="Recalcular todas as verbas e tributos"
                  >
                    <Calculator className="w-4 h-4" />
                    {processandoFolha ? 'Recalculando...' : 'Recalcular'}
                  </button>
                </div>
              </div>

              {/* Tabela dos Empregados Calculados com Scroll Isolado */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Matrícula / Colaborador</th>
                        <th className="py-3 px-4">Cargo / Depto</th>
                        <th className="py-3 px-4 text-right">Salário Base</th>
                        <th className="py-3 px-4 text-right">Proventos (+)</th>
                        <th className="py-3 px-4 text-right">Descontos (-)</th>
                        <th className="py-3 px-4 text-right">Líquido a Pagar</th>
                        <th className="py-3 px-4 text-center">FGTS Mês (8%)</th>
                        <th className="py-3 px-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {folhaData?.folhas.map(folha => {
                        const empObj = empregados.find(e => e.id === folha.empregadoId);

                        return (
                          <tr key={folha.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-slate-100">{folha.nomeEmpregado}</div>
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Mat: {folha.matricula}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-800 dark:text-slate-200">{folha.cargo}</div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">{folha.departamento}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                              {formatarMoeda(folha.salarioBase)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                              {formatarMoeda(folha.totalProventos)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                              - {formatarMoeda(folha.totalDescontos)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-black text-blue-600 dark:text-blue-400 text-sm tabular-nums">
                              {formatarMoeda(folha.valorLiquido)}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                              {formatarMoeda(folha.encargosEmpresa.fgtsDevido)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEmpregadoPreSelecionadoEvento(empObj || null);
                                    setLancamentoParaEditar(null);
                                    setModalAddEventAberto(true);
                                  }}
                                  className="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                                  title="Lançar evento (HE, Falta, Adicional) para este colaborador"
                                >
                                  <Plus className="w-3 h-3" />
                                  Evento
                                </button>

                                <button
                                  onClick={() => {
                                    const itemPrincipal = folha.itens.find(i => i.rubricaCodigo === '0101') || folha.itens.find(i => i.rubricaCodigo === '0901') || folha.itens[0];
                                    setModalMemoriaItem({
                                      item: itemPrincipal,
                                      salario: folha.salarioBase,
                                      nome: folha.nomeEmpregado,
                                    });
                                  }}
                                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                                  title="Ver Memória de Cálculo Aritmética e Jurídica"
                                >
                                  <Calculator className="w-3 h-3" />
                                  Memória
                                </button>

                                {empObj && (
                                  <button
                                    onClick={() => handleAbrirReciboIndividual(folha, empObj)}
                                    className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                                    title="Visualizar e Baixar Recibo de Pagamento A4 Retrato"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    Recibo A4
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lançamentos e Eventos Variáveis da Folha com Edição e Exclusão Imediatas */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Lançamentos e Variáveis da Competência ({lancamentosVariaveis.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Horas extras, faltas, adicionais e comissões informados. Ajustes recalculam a folha e recibos imediatamente.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEmpregadoPreSelecionadoEvento(null);
                      setLancamentoParaEditar(null);
                      setModalAddEventAberto(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Adicionar evento
                  </button>
                </div>

                {lancamentosVariaveis.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500">
                    Nenhum evento variável registrado nesta competência. Use o botão "+ Adicionar evento" para lançar horas extras, faltas ou adicionais.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Colaborador</th>
                          <th className="py-2.5 px-3">Rubrica</th>
                          <th className="py-2.5 px-3 text-center">Referência</th>
                          <th className="py-2.5 px-3 text-right">Valor Calculado</th>
                          <th className="py-2.5 px-3">Observação</th>
                          <th className="py-2.5 px-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {lancamentosVariaveis.map(lanc => {
                          const emp = empregados.find(e => e.id === lanc.empregadoId);
                          return (
                            <tr key={lanc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {emp?.nomeCompleto || 'Colaborador'}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  Mat: {emp?.matricula || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold mr-1.5">
                                  {lanc.rubricaCodigo}
                                </span>
                                <span className="text-slate-800 dark:text-slate-200 font-medium">
                                  {lanc.descricao}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                                {lanc.referencia} {lanc.unidadeReferencia?.toLowerCase() || 'h'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                {formatarMoeda(lanc.valor)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[200px] truncate">
                                {lanc.observacao || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEmpregadoPreSelecionadoEvento(emp || null);
                                      setLancamentoParaEditar(lanc);
                                      setModalAddEventAberto(true);
                                    }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                                    title="Editar lançamento de evento"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.excluirLancamento(lanc.id);
                                        await carregarDadosCompetencia();
                                        mostrarNotificacao('Lançamento excluído com sucesso! Folha recalculada imediatamente.', 'sucesso');
                                      } catch (err: any) {
                                        mostrarNotificacao(err.message || 'Erro ao excluir lançamento', 'erro');
                                      }
                                    }}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                                    title="Excluir lançamento de evento"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Rubricas Processadas com Acesso Direto às Memórias de Cálculo */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Rubricas Processadas nesta Folha (Inspecione a memória aritmética e o fundamento legal):
                </span>
                <div className="flex flex-wrap gap-2">
                  {folhaData?.folhas[0]?.itens.map((it, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setModalMemoriaItem({
                          item: it,
                          salario: folhaData.folhas[0].salarioBase,
                          nome: folhaData.folhas[0].nomeEmpregado,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-bold">
                        {it.rubricaCodigo}
                      </span>
                      <span className="font-medium">{it.descricao}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA: EMPREGADOS & ADMISSÃO */}
          {/* ========================================================= */}
          {abaNavegacao === 'EMPREGADOS' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded">
                    Quadro de Empregados
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    Gestão Cadastral e Admissões
                  </h2>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, CPF ou matrícula..."
                      value={termoBuscaEmpregado}
                      onChange={e => setTermoBuscaEmpregado(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={() => setModalNovaAdmissaoAberto(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Admissão
                  </button>
                </div>
              </div>

              {/* Lista dos Empregados ou Estado Vazio */}
              {empregadosFiltrados.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum colaborador encontrado</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4 max-w-md mx-auto">
                    Cadastre o primeiro colaborador desta empresa para emitir contratos de experiência, ficha de registro e calcular a folha.
                  </p>
                  <button
                    onClick={() => setModalNovaAdmissaoAberto(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar colaborador
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {empregadosFiltrados.map(emp => (
                    <div
                      key={emp.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">Mat: {emp.matricula}</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            emp.status === 'ativo'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : emp.status === 'ferias'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              : emp.status === 'em_admissao'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}>
                            {emp.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{emp.nomeCompleto}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{emp.cargo} · {emp.departamento}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">CPF: {formatarCPF(emp.cpf)} · CBO {emp.cbo}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Salário Base</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">{formatarMoeda(emp.salarioBase)}</span>
                          </div>

                          {/* Ações Rápidas de Gestão Cadastral */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEmpregadoAcaoSelecionado(emp);
                                setModoEmployeeAction('CONSULTA');
                                setModalEmployeeActionAberto(true);
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-300 hover:text-blue-600 rounded-lg text-xs transition-colors"
                              title="Consultar Ficha Cadastral Completa"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setEmpregadoAcaoSelecionado(emp);
                                setModoEmployeeAction('EDICAO');
                                setModalEmployeeActionAberto(true);
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-xs transition-colors"
                              title="Editar Dados Cadastrais"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setEmpregadoAcaoSelecionado(emp);
                                setModoEmployeeAction('ALTERACAO_SALARIAL');
                                setModalEmployeeActionAberto(true);
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-lg text-xs transition-colors"
                              title="Registrar Alteração Salarial / Função / Horário"
                            >
                              <UserCog className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setEmpregadoAcaoSelecionado(emp);
                                setModoEmployeeAction('DESLIGAMENTO');
                                setModalEmployeeActionAberto(true);
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 text-slate-700 dark:text-slate-300 hover:text-amber-600 rounded-lg text-xs transition-colors"
                              title="Registrar Desligamento / Rescisão"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setEmpregadoAcaoSelecionado(emp);
                                setModoEmployeeAction('EXCLUSAO');
                                setModalEmployeeActionAberto(true);
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-700 dark:text-slate-300 hover:text-rose-600 rounded-lg text-xs transition-colors"
                              title="Excluir Colaborador (apenas sem movimentos)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Ações Oficiais em PDF: Admissão e Férias */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setModalAdmissaoEmpregado(emp)}
                            className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 rounded-xl text-xs font-bold transition-all shadow-2xs group"
                            title="Emitir Contrato de Experiência e Registro de Empregado"
                          >
                            <FileCheck2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                            <span className="truncate">Admissão</span>
                          </button>
                          <button
                            onClick={() => {
                              const pf = periodosFerias.find(p => p.empregadoId === emp.id);
                              setModalDocumentosFeriasEmpregado({ empregado: emp, periodo: pf });
                            }}
                            className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl text-xs font-bold transition-all shadow-2xs group"
                            title="Emitir Demonstrativo e Recibo de Férias em Carta"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
                            <span className="truncate">Doc. Férias</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA: FÉRIAS & AFASTAMENTOS */}
          {/* ========================================================= */}
          {abaNavegacao === 'FERIAS' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded">
                      Gestão de Ausências e Férias
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60">
                      Papel Carta · Pág 1: Demonstrativo · Pág 2: Recibo
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    Conferência, Programação e Documentos Oficiais de Férias
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Emissão oficial do Demonstrativo e Recibo de Quitação Integral conforme CLT Art. 129 a 145, com cálculo de INSS progressivo, FGTS e valor líquido por extenso.
                  </p>
                </div>

                {/* Ação rápida para abrir emissão com primeiro colaborador ativo */}
                {empregados.length > 0 && (
                  <button
                    onClick={() => {
                      const empEdenir = empregados.find(e => e.id === 'emp-edenir');
                      const empTarget = empEdenir || empregados[0];
                      const periodoTarget = periodosFerias.find(p => p.empregadoId === empTarget.id);
                      setModalDocumentosFeriasEmpregado({ empregado: empTarget, periodo: periodoTarget });
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all hover:shadow-md shrink-0"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Emitir Documentos de Férias</span>
                  </button>
                )}
              </div>

              {/* Lista dos Períodos de Férias */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Controle de Férias e Emissão de Documentos
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Selecione um trabalhador para visualizar, imprimir ou baixar o Demonstrativo e o Recibo de Férias.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {empregados.filter(e => e.status !== 'desligado').length} colaboradores
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {/* Primeiro lista os empregados com período cadastrado */}
                  {periodosFerias.map(pf => {
                    const emp = empregados.find(e => e.id === pf.empregadoId);
                    if (!emp) return null;
                    const prog = pf.programacoes[0];

                    return (
                      <div key={pf.id} className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                        <div className="space-y-1.5 max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{emp.nomeCompleto}</span>
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              Matrícula: {emp.matricula}
                            </span>
                            {emp.id === 'emp-edenir' && (
                              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded">
                                Modelo Anexo (Demonstrativo e Recibo)
                              </span>
                            )}
                            {prog && (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                                Férias Programadas
                              </span>
                            )}
                          </div>

                          <div className="text-slate-600 dark:text-slate-400 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>{emp.cargo}</span>
                            <span>·</span>
                            <span>Salário Base: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatarMoeda(emp.salarioBase)}</strong></span>
                            <span>·</span>
                            <span>Admissão: <strong className="font-mono">{formatarData(emp.dataAdmissao)}</strong></span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                            <span>Aquisitivo: {formatarData(pf.periodoAquisitivoInicio)} até {formatarData(pf.periodoAquisitivoFim)}</span>
                            <span>·</span>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              Limite Concessivo: {formatarData(pf.periodoConcessivoFim)}
                            </span>
                          </div>

                          {/* Se já possuir programação, exibe os dados do gozo e recibo */}
                          {prog && (
                            <div className="p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Gozo: </span>
                                <strong className="text-slate-900 dark:text-slate-100 font-mono">
                                  {formatarData(prog.dataInicio)} a {formatarData(prog.dataFim)} ({prog.diasGozo} dias)
                                </strong>
                              </div>
                              {prog.retornoTrabalho && (
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">Retorno: </span>
                                  <strong className="text-slate-900 dark:text-slate-100 font-mono">
                                    {formatarData(prog.retornoTrabalho)}
                                  </strong>
                                </div>
                              )}
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Líquido a Receber: </span>
                                <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                                  {formatarMoeda(prog.valorLiquido)}
                                </strong>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                          <button
                            onClick={() => setModalDocumentosFeriasEmpregado({ empregado: emp, periodo: pf })}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md"
                            title="Gerar Demonstrativo de Férias (Pág 1) e Recibo de Férias (Pág 2) em PDF Carta"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Emitir documentos de férias</span>
                          </button>

                          <button
                            onClick={() => setModalFeriasEmpregado(emp)}
                            className="flex items-center gap-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors"
                            title="Ajustar ou programar período de gozo"
                          >
                            <Palmtree className="w-3.5 h-3.5" />
                            <span>Programar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Colaboradores ativos que ainda não têm período explícito em periodosFerias */}
                  {empregados
                    .filter(e => e.status !== 'desligado' && !periodosFerias.some(p => p.empregadoId === e.id))
                    .map(emp => (
                      <div key={emp.id} className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{emp.nomeCompleto}</span>
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              Matrícula: {emp.matricula}
                            </span>
                            {emp.id === 'emp-edenir' && (
                              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded">
                                Modelo Anexo (Demonstrativo e Recibo)
                              </span>
                            )}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>{emp.cargo}</span>
                            <span>·</span>
                            <span>Salário Base: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatarMoeda(emp.salarioBase)}</strong></span>
                            <span>·</span>
                            <span>Admissão: <strong className="font-mono">{formatarData(emp.dataAdmissao)}</strong></span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                          <button
                            onClick={() => setModalDocumentosFeriasEmpregado({ empregado: emp })}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md"
                            title="Gerar Demonstrativo de Férias e Recibo de Férias em PDF Carta"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Emitir documentos de férias</span>
                          </button>

                          <button
                            onClick={() => setModalFeriasEmpregado(emp)}
                            className="flex items-center gap-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors"
                          >
                            <Palmtree className="w-3.5 h-3.5" />
                            <span>Programar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Afastamentos Médicos com Proteção de Sigilo */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Afastamentos e Atestados Médicos
                </h3>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {afastamentos.map(af => {
                    const emp = empregados.find(e => e.id === af.empregadoId);
                    return (
                      <div key={af.id} className="py-3 flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{emp?.nomeCompleto}</span>
                          <div className="text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                            Período: {formatarData(af.dataInicio)} a {formatarData(af.previsaoRetorno)} ({af.diasAfastamento} dias)
                          </div>
                          <div className="text-blue-600 dark:text-blue-400 font-medium">Impacto em folha: {af.impactoFolha}</div>
                          <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            Médico: {af.medicoEmitente} (CRM {af.crm}) · CID com sigilo controlado
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                          {af.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA: RESCISÃO & TRCT */}
          {/* ========================================================= */}
          {abaNavegacao === 'RESCISAO' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded">
                    Rescisão de Contrato de Trabalho
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    Termo de Rescisão (TRCT) & Homologação Oficial
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Geração em PDF oficial A4 retrato: Página 1 com TRCT (3 pares de colunas) e Página 2 com Termo de Homologação.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Colaboradores Ativos para Rescisão:
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {empregados.filter(e => e.status !== 'desligado').length} colaboradores ativos
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {empregados.filter(e => e.status !== 'desligado').map(emp => (
                    <div key={emp.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{emp.nomeCompleto}</span>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Matrícula: {emp.matricula}
                          </span>
                          {emp.id === 'emp-edenir' && (
                            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded">
                              Modelo Anexo (Suzy Kids)
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 block mt-0.5">
                          {emp.cargo} · Admissão: {formatarData(emp.dataAdmissao)} · Salário Contratual: {formatarMoeda(emp.salarioBase)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => setModalRescisaoEmpregado(emp)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Gerar TRCT e Homologação
                        </button>
                        <button
                          onClick={() => setModalRescisaoEmpregado(emp)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          Simular
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA: CONTRATOS & RECIBOS */}
          {/* ========================================================= */}
          {abaNavegacao === 'CONTRATOS' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded">
                    Repositório de Documentos
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    Controle de Emissão, Pagamento e Assinatura de Recibos
                  </h2>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Documento</th>
                        <th className="py-3 px-4">Empregado</th>
                        <th className="py-3 px-4">Data Emissão</th>
                        <th className="py-3 px-4">Fase Atual</th>
                        <th className="py-3 px-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {documentos.map(doc => {
                        const emp = empregados.find(e => e.id === doc.empregadoId);

                        return (
                          <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{doc.titulo}</td>
                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{emp?.nomeCompleto || '-'}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 tabular-nums">{formatarData(doc.dataEmissao)}</td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                doc.status === 'RECIBO_ASSINADO'
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
                                  : doc.status === 'PAGAMENTO_CONFIRMADO'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                              }`}>
                                {doc.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => setModalDocumentoStatus(doc)}
                                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Gerenciar Fase
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA: MOVIMENTAÇÕES MENSAIS & PONTO */}
          {/* ========================================================= */}
          {abaNavegacao === 'MOVIMENTACOES' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded">
                    Central de Movimentações Mensais
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    Variáveis da Empresa para o DP na Competência {competenciaAtiva}
                  </h2>
                </div>
                <button
                  onClick={() => setModalImportarAberto(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <UploadCloud className="w-4 h-4" />
                  Importar Planilha de Ponto / Comissões
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Movimentações Recebidas da Empresa
                </h3>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {movimentacoes.map(mov => {
                    const emp = empregados.find(e => e.id === mov.empregadoId);
                    return (
                      <div key={mov.id} className="py-3 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{emp?.nomeCompleto}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded">
                              {mov.tipo}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400">{mov.descricao}</p>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                            Enviado por: {mov.enviadoPor} em {formatarData(mov.dataEnvio)}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                          {mov.quantidade ? `${mov.quantidade}h` : formatarMoeda(mov.valor)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA: ESOCIAL, FGTS DIGITAL E DCTFWEB */}
          {/* ========================================================= */}
          {abaNavegacao === 'ESOCIAL' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded">
                    Obrigações Fiscais e Previdenciárias
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    eSocial, FGTS Digital e DCTFWeb
                  </h2>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Eventos eSocial da Competência
                </h3>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {esocialEventos.map(ev => (
                    <div key={ev.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">
                            {ev.codigoEvento}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{ev.descricao}</span>
                        </div>
                        {ev.numeroRecibo && (
                          <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400">
                            Recibo de Entrega: {ev.numeroRecibo}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          ev.statusEnvio === 'PROCESSADO_COM_SUCESSO'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                        }`}>
                          {ev.statusEnvio.replace(/_/g, ' ')}
                        </span>

                        {ev.statusEnvio !== 'PROCESSADO_COM_SUCESSO' && (
                          <button
                            onClick={() => handleTransmitirESocial(ev.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Transmitir Evento
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
      </div>

      {/* 3. NAVEGAÇÃO INFERIOR PARA CELULAR (md:hidden): Início, Folha, Pessoas e Mais */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-around py-2 px-1 md:hidden select-none">
        <button
          onClick={() => setAbaNavegacao('DASHBOARD')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
            abaNavegacao === 'DASHBOARD'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span>Início</span>
        </button>

        <button
          onClick={() => setAbaNavegacao('FOLHA')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
            abaNavegacao === 'FOLHA'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>Folha</span>
        </button>

        <button
          onClick={() => setAbaNavegacao('EMPREGADOS')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
            abaNavegacao === 'EMPREGADOS'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Pessoas</span>
        </button>

        <button
          onClick={() => setMobileDrawerAberto(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-bold transition-colors ${
            ['FERIAS', 'RESCISAO', 'CONTRATOS', 'MOVIMENTACOES', 'ESOCIAL'].includes(abaNavegacao)
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Mais</span>
        </button>
      </nav>

      {/* Drawer Móvel de Módulos ("Mais") */}
      {mobileDrawerAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end md:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Todos os Módulos do Sistema
              </h3>
              <button
                onClick={() => setMobileDrawerAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => { setAbaNavegacao('FERIAS'); setMobileDrawerAberto(false); }}
                className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold text-left transition-colors ${
                  abaNavegacao === 'FERIAS'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <Palmtree className="w-4 h-4 shrink-0" />
                Férias & Afastamentos
              </button>

              <button
                onClick={() => { setAbaNavegacao('RESCISAO'); setMobileDrawerAberto(false); }}
                className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold text-left transition-colors ${
                  abaNavegacao === 'RESCISAO'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <UserX className="w-4 h-4 shrink-0" />
                Rescisões & TRCT
              </button>

              <button
                onClick={() => { setAbaNavegacao('CONTRATOS'); setMobileDrawerAberto(false); }}
                className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold text-left transition-colors ${
                  abaNavegacao === 'CONTRATOS'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                Contratos & Recibos
              </button>

              <button
                onClick={() => { setAbaNavegacao('MOVIMENTACOES'); setMobileDrawerAberto(false); }}
                className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold text-left transition-colors ${
                  abaNavegacao === 'MOVIMENTACOES'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <UploadCloud className="w-4 h-4 shrink-0" />
                Movimentações & Ponto
              </button>

              <button
                onClick={() => { setAbaNavegacao('ESOCIAL'); setMobileDrawerAberto(false); }}
                className={`p-3 rounded-xl border flex items-center gap-2.5 font-bold text-left transition-colors col-span-2 ${
                  abaNavegacao === 'ESOCIAL'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                eSocial, DCTFWeb & FGTS Digital
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setModalIAAberto(true); setMobileDrawerAberto(false); }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Abrir Consultor Jurídico Trabalhista IA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAIS INTERATIVOS */}
      {/* ========================================================= */}

      {/* 1. Memória de Cálculo Interativa */}
      <MemoryCalculationModal
        item={modalMemoriaItem?.item || null}
        salarioBase={modalMemoriaItem?.salario || 0}
        nomeColaborador={modalMemoriaItem?.nome || ''}
        onClose={() => setModalMemoriaItem(null)}
      />

      {/* 2. Drawer de Auditoria Comparativa (Folha Atual vs Anterior) */}
      <CalculationComparisonDrawer
        empresaId={empresaAtivaId}
        competencia={competenciaAtiva}
        isOpen={drawerAuditoriaAberto}
        onClose={() => setDrawerAuditoriaAberto(false)}
      />

      {/* 3. Modal de Importação de Planilhas */}
      <SpreadsheetImporterModal
        isOpen={modalImportarAberto}
        onClose={() => setModalImportarAberto(false)}
        competencia={competenciaAtiva}
        onImportadoComSucesso={() => {
          carregarDadosCompetencia();
          mostrarNotificacao('Planilha importada com sucesso e variáveis vinculadas à folha!', 'sucesso');
        }}
      />

      {/* 4. Modal de Simulador de Rescisão e TRCT */}
      <TerminationSimulatorModal
        isOpen={Boolean(modalRescisaoEmpregado)}
        onClose={() => setModalRescisaoEmpregado(null)}
        empregado={modalRescisaoEmpregado}
        empresa={empresaAtiva || EMPRESA_PADRAO}
        onRescisaoConfirmada={() => {
          carregarDadosCompetencia();
          mostrarNotificacao('Rescisão confirmada e homologada com sucesso no sistema!', 'sucesso');
        }}
      />

      {/* 5. Modal de Programação de Férias */}
      <VacationPlannerModal
        isOpen={Boolean(modalFeriasEmpregado)}
        onClose={() => setModalFeriasEmpregado(null)}
        empregado={modalFeriasEmpregado}
        empresa={empresaAtiva || EMPRESA_PADRAO}
        periodoFerias={periodosFerias.find(f => f.empregadoId === modalFeriasEmpregado?.id)}
        onFeriasSalvas={() => {
          carregarDadosCompetencia();
          mostrarNotificacao('Programação de férias salva com sucesso!', 'sucesso');
        }}
        onEmitirDocumentos={(emp, pf) => {
          setModalDocumentosFeriasEmpregado({ empregado: emp, periodo: pf });
        }}
      />

      {/* 5b. Modal Oficial de Emissão de Documentos de Férias (Demonstrativo e Recibo) */}
      {modalDocumentosFeriasEmpregado && (
        <VacationDocumentsModal
          isOpen={Boolean(modalDocumentosFeriasEmpregado)}
          onClose={() => setModalDocumentosFeriasEmpregado(null)}
          empresa={empresaAtiva || EMPRESA_PADRAO}
          empregado={modalDocumentosFeriasEmpregado.empregado}
          periodoFerias={modalDocumentosFeriasEmpregado.periodo}
        />
      )}

      {/* 6. Modal de Nova Admissão */}
      <NewEmployeeModal
        isOpen={modalNovaAdmissaoAberto}
        onClose={() => setModalNovaAdmissaoAberto(false)}
        empresa={empresaAtiva || EMPRESA_PADRAO}
        onEmpregadoCriado={novo => {
          carregarDadosCompetencia();
          mostrarNotificacao(`Empregado ${novo.nomeCompleto} admitido com sucesso!`, 'sucesso');
        }}
      />

      {/* 7. Modal de Certificação de Documentos e Recibos */}
      <DocumentSigningModal
        isOpen={Boolean(modalDocumentoStatus)}
        onClose={() => setModalDocumentoStatus(null)}
        documento={modalDocumentoStatus}
        onDocumentoAtualizado={() => {
          carregarDadosCompetencia();
          mostrarNotificacao('Status do documento atualizado com sucesso!', 'sucesso');
        }}
      />

      {/* 8. Modal do Consultor IA */}
      <AIAssistantModal
        isOpen={modalIAAberto}
        onClose={() => setModalIAAberto(false)}
        competenciaAtual={competenciaAtiva}
      />

      {/* 8.1 Modal de Documentos de Admissão (Contrato de Experiência & Registro de Empregado) */}
      {modalAdmissaoEmpregado && (
        <AdmissionDocumentsModal
          isOpen={Boolean(modalAdmissaoEmpregado)}
          onClose={() => setModalAdmissaoEmpregado(null)}
          empresa={empresaAtiva || EMPRESA_PADRAO}
          empregado={modalAdmissaoEmpregado}
          onAtualizarEmpregado={empAtualizado => {
            setEmpregados(prev => prev.map(e => (e.id === empAtualizado.id ? empAtualizado : e)));
            setModalAdmissaoEmpregado(empAtualizado);
            mostrarNotificacao(`Cláusulas de ${empAtualizado.nomeCompleto} salvas com sucesso!`, 'sucesso');
          }}
        />
      )}

      {/* 9. Modal de Visualização e Impressão de PDF (Alta Fidelidade) */}
      <PDFPreviewModal
        isOpen={pdfPreviewData.isOpen}
        onClose={() => setPdfPreviewData(prev => ({ ...prev, isOpen: false, pdfUrl: null }))}
        titulo={pdfPreviewData.titulo}
        subtitulo={pdfPreviewData.subtitulo}
        pdfUrl={pdfPreviewData.pdfUrl}
        nomeArquivoDownload={pdfPreviewData.nomeArquivoDownload}
        onBaixarArquivo={pdfPreviewData.onBaixarArquivo}
      />

      {/* 10. Modal de Emissão de Recibos de Pagamento em Lote */}
      {modalRecibosLoteAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Emitir Recibos de Pagamento</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Modelo Oficial A4 Retrato · Competência {competenciaAtiva}</p>
                </div>
              </div>
              <button
                onClick={() => setModalRecibosLoteAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300">
                <p>
                  Os recibos são gerados no formato <strong>A4 Retrato Oficial</strong>, com proventos, descontos, base de cálculo e espaço para data e assinatura física ou digital.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Trabalhador(es) para Emissão:
                </label>
                <select
                  value={trabalhadorReciboSelecionadoId}
                  onChange={e => setTrabalhadorReciboSelecionadoId(e.target.value)}
                  className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">
                    Todos os colaboradores calculados ({folhaData?.folhas.length || 0} recibos em lote)
                  </option>
                  {folhaData?.folhas.map(f => (
                    <option key={f.empregadoId} value={f.empregadoId}>
                      {f.nomeEmpregado} (Matrícula {f.matricula}) - {formatarMoeda(f.valorLiquido)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
              <button
                onClick={() => setModalRecibosLoteAberto(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessarEmissaoRecibos}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              >
                <Receipt className="w-4 h-4" />
                Visualizar e Emitir Recibos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Modal de Justificativa para Reabertura de Folha Fechada */}
      {modalReaberturaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/70 dark:bg-amber-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Reabertura de Folha Fechada</h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300">Competência {competenciaAtiva} · {empresaAtiva?.razaoSocial || EMPRESA_PADRAO.razaoSocial}</p>
                </div>
              </div>
              <button
                onClick={() => setModalReaberturaAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Aviso de Auditoria:</strong> A reabertura cancela o fechamento fiscal provisoriamente e exige reenvio dos eventos retificadores ao eSocial (S-1298 e S-1200). Todas as alterações ficam gravadas com data, horário e usuário.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Justificativa Obrigatória da Reabertura:
                </label>
                <textarea
                  rows={3}
                  value={motivoReabertura}
                  onChange={e => setMotivoReabertura(e.target.value)}
                  placeholder="Ex: Inclusão de atestado médico retroativo ou ajuste de comissões aprovadas pela diretoria..."
                  className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
              <button
                onClick={() => setModalReaberturaAberto(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReabrirCompetencia}
                disabled={!motivoReabertura.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                Confirmar Reabertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. Modal de Gestão e Cadastro de Empresas */}
      <CompanyManagementModal
        isOpen={modalEmpresasAberto}
        onClose={() => setModalEmpresasAberto(false)}
        empresas={empresas}
        empresaAtivaId={empresaAtivaId}
        abrirCadastroDireto={modoEmpresasInicial === 'NOVA'}
        onSelecionarEmpresa={(id) => {
          setEmpresaAtivaId(id);
          setModalEmpresasAberto(false);
        }}
        onEmpresasAtualizadas={async () => {
          await carregarEmpresas();
          await carregarDadosCompetencia();
        }}
        onSolicitarCriarColaborador={(emp) => {
          setEmpresaAtivaId(emp.id);
          setBannerEmpresaRecemCriada(emp);
          setModalNovaAdmissaoAberto(true);
        }}
        onSolicitarCriarCompetencia={(emp) => {
          setEmpresaAtivaId(emp.id);
          setBannerEmpresaRecemCriada(emp);
          setModoCompetenciaInicial('NOVA');
          setModalCompetenciasAberto(true);
        }}
      />

      {/* 13. Modal de Gestão e Criação de Competências */}
      <CompetenceModal
        isOpen={modalCompetenciasAberto}
        onClose={() => setModalCompetenciasAberto(false)}
        empresa={empresaAtiva || EMPRESA_PADRAO}
        competenciaAtual={competenciaAtiva}
        abrirCadastroDireto={modoCompetenciaInicial === 'NOVA'}
        onSelecionarCompetencia={(comp) => {
          setCompetenciaAtiva(comp);
          setModalCompetenciasAberto(false);
        }}
        onCompetenciasAtualizadas={async () => {
          if (empresaAtivaId) {
            await carregarCompetencias(empresaAtivaId);
            await carregarDadosCompetencia();
          }
        }}
      />

      {/* 14. Modal de Adicionar / Editar Eventos (Horas extras, faltas, adicionais) */}
      <AddEventModal
        isOpen={modalAddEventAberto}
        onClose={() => {
          setModalAddEventAberto(false);
          setLancamentoParaEditar(null);
          setEmpregadoPreSelecionadoEvento(null);
        }}
        empresa={empresaAtiva || EMPRESA_PADRAO}
        competenciaAtual={competenciaAtiva}
        empregados={empregados}
        colaboradorPreSelecionado={empregadoPreSelecionadoEvento}
        lancamentoEmEdicao={lancamentoParaEditar}
        onEventoSalvo={async () => {
          setModalAddEventAberto(false);
          setLancamentoParaEditar(null);
          setEmpregadoPreSelecionadoEvento(null);
          await carregarDadosCompetencia();
          mostrarNotificacao('Evento salvo com sucesso! Folha recalculada imediatamente.', 'sucesso');
        }}
        onCriarCompetenciaSolicitada={(novaComp) => {
          setModalAddEventAberto(false);
          setCompetenciaAtiva(novaComp);
          setModoCompetenciaInicial('NOVA');
          setModalCompetenciasAberto(true);
        }}
      />

      {/* 15. Modal de Ações do Colaborador (Ficha Cadastral, Edição, Alteração Salarial/Função, Desligamento, Exclusão) */}
      <EmployeeActionModal
        isOpen={modalEmployeeActionAberto}
        onClose={() => {
          setModalEmployeeActionAberto(false);
          setEmpregadoAcaoSelecionado(null);
        }}
        empregado={empregadoAcaoSelecionado}
        empresa={empresaAtiva || EMPRESA_PADRAO}
        modoInicial={modoEmployeeAction}
        onEmpregadoAtualizado={async () => {
          setModalEmployeeActionAberto(false);
          setEmpregadoAcaoSelecionado(null);
          await carregarDadosCompetencia();
          mostrarNotificacao('Colaborador atualizado com sucesso!', 'sucesso');
        }}
        onAbrirRescisao={(emp) => {
          setModalEmployeeActionAberto(false);
          setModalRescisaoEmpregado(emp);
        }}
      />
    </div>
  );
}
