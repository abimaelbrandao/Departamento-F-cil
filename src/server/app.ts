import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { EMPRESAS_INICIAIS, EMPREGADOS_INICIAIS, RUBRICAS_SISTEMA, PERIODOS_FERIAS_INICIAIS, AGENDA_INICIAL, ESOCIAL_EVENTOS_INICIAIS } from '../data/initialData';
import { processarFolhaEmpregado } from '../services/calculosTrabalhistas';
import { calcularFeriasComApropriacao, calcularRescisaoCompleta } from '../services/calculosFeriasRescisao';
import { Empresa, Empregado, Rubrica, FolhaEmpregado, CompetenciaFolha, LancamentoVariavel, PeriodoFerias, RescisaoSimulada, ContratoDocumento, Afastamento, ItemAgendaObrigacao, ESocialEvento, MovimentacaoMensalEmpresa } from '../types/dp';
import { validarCNPJ, validarCPF } from '../utils/formatters';

try {
  dotenv.config();
} catch {
  // Ignora erro caso .env não exista no ambiente serverless
}

const IS_SERVERLESS = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NOW_REGION
);
const DATA_DIR = IS_SERVERLESS ? '/tmp' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'departamento_facil.json');

// Interface para o banco persistente
interface DatabaseSchema {
  empresas: Empresa[];
  empregados: Empregado[];
  rubricas: Rubrica[];
  lancamentos: LancamentoVariavel[];
  folhasCalculadas: FolhaEmpregado[];
  competenciasStatus: Record<string, CompetenciaFolha>; // key: `${empresaId}_${competencia}`
  ferias: PeriodoFerias[];
  rescisoes: RescisaoSimulada[];
  documentos: ContratoDocumento[];
  afastamentos: Afastamento[];
  agenda: ItemAgendaObrigacao[];
  esocial: ESocialEvento[];
  movimentacoes: MovimentacaoMensalEmpresa[];
  importacoesRegistradas: string[]; // Hash/nomes para prevenir reimportação duplicada
  auditoriaLogs: { id: string; dataHora: string; usuario: string; acao: string; detalhes: any }[];
}

function inicializarDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Aviso ao criar diretório de dados:', err);
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Erro ao ler DB persistente, recriando:', err);
    }
  }

  // Popula com dados iniciais e folhas pré-calculadas
  const emp1 = EMPRESAS_INICIAIS[0];
  const empregadosEmp1 = EMPREGADOS_INICIAIS.filter(e => e.empresaId === emp1.id && e.status !== 'em_admissao');

  // Lançamentos variáveis de exemplo para 05/2026
  const lancamentosExemplo: LancamentoVariavel[] = [
    {
      id: 'lanc-lucas-he',
      empregadoId: 'emp-lucas',
      competencia: '05/2026',
      rubricaCodigo: '0101',
      descricao: 'Horas Extras 50%',
      referencia: 8,
      unidadeReferencia: 'HORAS',
      valor: 0,
      origem: 'MOVIMENTACAO_EMPRESA',
      observacao: 'Projeto de migração de nuvem aprovado pelo gestor',
    },
    {
      id: 'lanc-lucas-comissao',
      empregadoId: 'emp-lucas',
      competencia: '05/2026',
      rubricaCodigo: '0105',
      descricao: 'Bônus de Entrega Técnica',
      referencia: 1,
      unidadeReferencia: 'VALOR',
      valor: 1500.0,
      origem: 'MANUAL',
    },
    {
      id: 'lanc-carlos-vt',
      empregadoId: 'emp-carlos',
      competencia: '05/2026',
      rubricaCodigo: '0101',
      descricao: 'Horas Extras 50%',
      referencia: 4,
      unidadeReferencia: 'HORAS',
      valor: 0,
      origem: 'SISTEMA',
    },
  ];

  // Gera folhas calculadas para 04/2026 (fechada) e 05/2026 (em conferência)
  const folhasCalculadas: FolhaEmpregado[] = [];
  
  // Competência 04/2026 (Fechada)
  for (const emp of empregadosEmp1) {
    const folhaMesAnterior = processarFolhaEmpregado(emp, emp1, '04/2026', []);
    folhaMesAnterior.statusPagamento = 'RECIBO_ASSINADO';
    folhasCalculadas.push(folhaMesAnterior);
  }

  // Competência 05/2026 (Atual)
  for (const emp of empregadosEmp1) {
    const lancsEmp = lancamentosExemplo.filter(l => l.empregadoId === emp.id && l.competencia === '05/2026');
    const folhaAtual = processarFolhaEmpregado(emp, emp1, '05/2026', lancsEmp);
    folhasCalculadas.push(folhaAtual);
  }

  // Competência 09/2026 para Emplast (Mauro Henrique Costa Matos - Pró-Labore)
  const empEmplast = EMPRESAS_INICIAIS.find(e => e.id === 'emp-emplast');
  const empregadosEmplast = EMPREGADOS_INICIAIS.filter(e => e.empresaId === 'emp-emplast');
  if (empEmplast && empregadosEmplast.length > 0) {
    for (const emp of empregadosEmplast) {
      const folha09 = processarFolhaEmpregado(emp, empEmplast, '09/2026', []);
      folha09.dataEmissao = '2026-09-30';
      folha09.statusPagamento = 'RECIBO_ASSINADO';
      folhasCalculadas.push(folha09);
    }
  }

  const initialDb: DatabaseSchema = {
    empresas: EMPRESAS_INICIAIS,
    empregados: EMPREGADOS_INICIAIS,
    rubricas: RUBRICAS_SISTEMA,
    lancamentos: lancamentosExemplo,
    folhasCalculadas,
    competenciasStatus: {
      'emp-emplast_09/2026': {
        id: 'comp-emplast-092026',
        empresaId: 'emp-emplast',
        competencia: '09/2026',
        status: 'FECHADA',
        totalEmpregadosAtivos: 1,
        totalCalculados: 1,
        totalProventos: 1621.0,
        totalDescontos: 178.31,
        totalLiquido: 1442.69,
        totalEncargosEmpresa: 0,
        totalFGTS: 0,
        errosBloqueantes: [],
        alertasRevisao: [],
        historicoFechamento: {
          fechadoPor: 'Departamento Fácil',
          dataFechamento: '2026-09-30T18:00:00Z',
        },
      },
      'emp-1_04/2026': {
        id: 'comp-1-042026',
        empresaId: 'emp-1',
        competencia: '04/2026',
        status: 'FECHADA',
        totalEmpregadosAtivos: 4,
        totalCalculados: 4,
        totalProventos: 28900.0,
        totalDescontos: 5210.45,
        totalLiquido: 23689.55,
        totalEncargosEmpresa: 2312.0,
        totalFGTS: 2312.0,
        errosBloqueantes: [],
        alertasRevisao: [],
        historicoFechamento: {
          fechadoPor: 'Renata Albuquerque (DP)',
          dataFechamento: '2026-05-02T18:00:00Z',
        },
      },
      'emp-1_05/2026': {
        id: 'comp-1-052026',
        empresaId: 'emp-1',
        competencia: '05/2026',
        status: 'EM_CONFERENCIA',
        totalEmpregadosAtivos: 4,
        totalCalculados: 4,
        totalProventos: 31250.0,
        totalDescontos: 5680.12,
        totalLiquido: 25569.88,
        totalEncargosEmpresa: 2500.0,
        totalFGTS: 2500.0,
        errosBloqueantes: [],
        alertasRevisao: [
          'Lucas Gabriel teve acréscimo superior a 15% em relação ao mês anterior (Horas Extras e Bônus)',
          'Beatriz Helena em gozo de férias atravessando maio e junho'
        ],
      },
    },
    ferias: PERIODOS_FERIAS_INICIAIS,
    rescisoes: [],
    documentos: [
      {
        id: 'doc-contrato-carlos',
        empresaId: 'emp-1',
        empregadoId: 'emp-carlos',
        tipo: 'CONTRATO_EXPERIENCIA',
        titulo: 'Contrato de Experiência (45+45 dias)',
        conteudoHtml: 'Contrato individual de trabalho de experiência formalizado.',
        dataEmissao: '2026-03-20',
        status: 'RECIBO_ASSINADO',
        dataAssinatura: '2026-03-20',
        assinanteNome: 'Carlos Eduardo dos Santos',
        versao: 1,
      },
    ],
    afastamentos: [
      {
        id: 'afast-1',
        empresaId: 'emp-1',
        empregadoId: 'emp-mariana',
        tipo: 'ATESTADO_MEDICO',
        dataInicio: '2026-04-10',
        previsaoRetorno: '2026-04-12',
        dataRetornoEfetivo: '2026-04-13',
        diasAfastamento: 3,
        cid: 'J06.9 (Infecção aguda vias aéreas)',
        medicoEmitente: 'Dra. Carolina Mendonça',
        crm: '184920-SP',
        impactoFolha: 'Abonado pela empresa (sem desconto em folha por ser até 15 dias)',
        impactoFerias: 'Sem alteração no período aquisitivo (ausência inferior a 30 dias)',
        status: 'ENCERRADO',
      },
    ],
    agenda: AGENDA_INICIAL,
    esocial: ESOCIAL_EVENTOS_INICIAIS,
    movimentacoes: [
      {
        id: 'mov-1',
        empresaId: 'emp-1',
        competencia: '05/2026',
        empregadoId: 'emp-lucas',
        tipo: 'HORAS_EXTRAS',
        descricao: '8 horas extras realizadas para implantação de contingência de datacenter',
        quantidade: 8,
        dataEvento: '2026-05-12',
        enviadoPor: 'Gestão de Engenharia',
        status: 'INTEGRADO_NA_FOLHA',
        dataEnvio: '2026-05-14T10:00:00Z',
      },
    ],
    importacoesRegistradas: ['import_folha_ponto_abril_2026.csv'],
    auditoriaLogs: [
      {
        id: 'log-1',
        dataHora: '2026-05-02T18:00:00Z',
        usuario: 'Renata Albuquerque (DP)',
        acao: 'FECHAMENTO_FOLHA',
        detalhes: { empresaId: 'emp-1', competencia: '04/2026', totalLiquido: 23689.55 },
      },
    ],
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Aviso ao gravar DB inicial em disco (executando em memória):', err);
  }
  return initialDb;
}

let db = inicializarDB();

function salvarDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Aviso ao salvar DB em disco:', err);
  }
}

function parseNumeroSeguro(val: any, fallback: number = 0): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(/\s/g, '');
    if (!cleaned) return fallback;
    const normalized = cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) ? num : fallback;
  }
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

function sincronizarContextoEmpresaEmpregados(empresaPayload?: any, empregadoPayload?: any, empregadosPayload?: any[]) {
  if (empresaPayload && empresaPayload.id && !db.empresas.some(e => e.id === empresaPayload.id)) {
    db.empresas.push(empresaPayload as Empresa);
  }
  if (empregadoPayload && empregadoPayload.id && !db.empregados.some(e => e.id === empregadoPayload.id)) {
    db.empregados.push(empregadoPayload as Empregado);
  }
  if (Array.isArray(empregadosPayload)) {
    for (const empPay of empregadosPayload) {
      if (empPay && empPay.id && !db.empregados.some(e => e.id === empPay.id)) {
        db.empregados.push(empPay as Empregado);
      }
    }
  }
}

function calcularValorLancamentoServidor(
  emp: Empregado | undefined,
  rubricaCodigo: string,
  referencia: number,
  unidadeReferencia: string,
  valorInformado: number
): number {
  if (valorInformado > 0) return Math.round(valorInformado * 100) / 100;
  if (!emp) return Math.max(0, Math.round(referencia * 100) / 100);

  const salario = emp.salarioBase || 0;
  const divisor = emp.divisorHoras || 220;
  const vh = salario / divisor;
  const ref = referencia > 0 ? referencia : 1;

  if (rubricaCodigo === '0101') return Math.round(vh * 1.5 * ref * 100) / 100;
  if (rubricaCodigo === '0102') return Math.round(vh * 2.0 * ref * 100) / 100;
  if (rubricaCodigo === '0103') return Math.round(vh * 0.2 * ref * 100) / 100;
  if (rubricaCodigo === '0201') return Math.round((salario / 30) * ref * 100) / 100;
  if (unidadeReferencia === 'PERCENTUAL') return Math.round(salario * (ref / 100) * 100) / 100;
  if (unidadeReferencia === 'DIAS') return Math.round((salario / 30) * ref * 100) / 100;
  if (unidadeReferencia === 'HORAS') return Math.round(vh * ref * 100) / 100;
  return Math.round(ref * 100) / 100;
}

// Recalcula e sincroniza folha de pagamento e status da competência em memória/disco
function recalcularCompetenciaInterna(empresaId: string, competencia: string, empregadoId?: string) {
  const empresa = db.empresas.find(e => e.id === empresaId);
  if (!empresa) return;

  const compKey = `${empresaId}_${competencia}`;
  const compStatus = db.competenciasStatus[compKey];
  if (compStatus && compStatus.status === 'FECHADA') return;

  let empregadosParaCalcular = db.empregados.filter(
    e => e.empresaId === empresaId && e.status !== 'em_admissao' && e.status !== 'desligado'
  );
  if (empregadoId) {
    empregadosParaCalcular = empregadosParaCalcular.filter(e => e.id === empregadoId);
  }

  const tipoFolha = compStatus?.tipoFolha || 'MENSAL';

  for (const emp of empregadosParaCalcular) {
    const lancs = db.lancamentos.filter(l => l.empregadoId === emp.id && l.competencia === competencia);
    const folha = processarFolhaEmpregado(emp, empresa, competencia, lancs, tipoFolha);

    db.folhasCalculadas = db.folhasCalculadas.filter(
      f => !(f.empregadoId === emp.id && f.competencia === competencia && f.tipoFolha === tipoFolha)
    );
    db.folhasCalculadas.push(folha);
  }

  // Atualiza totais consolidados da competência
  const todasFolhasComp = db.folhasCalculadas.filter(
    f => f.competencia === competencia && db.empregados.some(e => e.id === f.empregadoId && e.empresaId === empresaId)
  );

  const ativosCount = db.empregados.filter(
    e => e.empresaId === empresaId && e.status !== 'em_admissao' && e.status !== 'desligado'
  ).length;

  db.competenciasStatus[compKey] = {
    id: compStatus?.id || `comp-${empresaId}-${competencia.replace('/', '')}`,
    empresaId,
    competencia,
    status: compStatus?.status === 'FECHADA' ? 'FECHADA' : (compStatus?.status || 'EM_CONFERENCIA'),
    tipoFolha,
    parcela13: compStatus?.parcela13,
    totalEmpregadosAtivos: ativosCount,
    totalCalculados: todasFolhasComp.length,
    totalProventos: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.totalProventos, 0) * 100) / 100,
    totalDescontos: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.totalDescontos, 0) * 100) / 100,
    totalLiquido: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.valorLiquido, 0) * 100) / 100,
    totalEncargosEmpresa: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.encargosEmpresa.totalEncargos, 0) * 100) / 100,
    totalFGTS: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.encargosEmpresa.fgtsDevido, 0) * 100) / 100,
    errosBloqueantes: compStatus?.errosBloqueantes || [],
    alertasRevisao: compStatus?.alertasRevisao || [],
  };

  salvarDB();
}

export const app = express();
const jsonBodyParser = express.json({ limit: '10mb' });
app.use((req, res, next) => {
  if ((req as any)._body) return next();
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // mantém como string se não for JSON
      }
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString('utf-8'));
      } catch {
        // mantém buffer
      }
    }
    (req as any)._body = true;
    return next();
  }
  return jsonBodyParser(req, res, next);
});

  // API Routes
  app.get('/api/status', (_req, res) => {
    res.json({ ok: true, version: '1.0.0', time: new Date().toISOString() });
  });

  // Empresas: Listagem
  app.get('/api/empresas', (_req, res) => {
    res.json(db.empresas);
  });

  // Empresas: Cadastro com validação de CNPJ e unicidade
  app.post('/api/empresas', (req, res) => {
    const { cnpj, razaoSocial } = req.body;
    if (!razaoSocial || !razaoSocial.trim()) {
      return res.status(400).json({ error: 'Razão Social é obrigatória.' });
    }
    if (!cnpj) {
      return res.status(400).json({ error: 'CNPJ é obrigatório.' });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return res.status(400).json({ error: 'CNPJ inválido. Deve conter 14 dígitos numéricos.' });
    }
    if (!validarCNPJ(cnpjLimpo)) {
      return res.status(400).json({ error: 'Dígitos verificadores do CNPJ são inválidos.' });
    }

    // Verifica duplicidade de CNPJ
    const jaExiste = db.empresas.some(e => e.cnpj.replace(/\D/g, '') === cnpjLimpo);
    if (jaExiste) {
      return res.status(409).json({ error: 'Já existe uma empresa cadastrada com este CNPJ.' });
    }

    const novaEmpresa: Empresa = {
      id: `emp-${Date.now()}`,
      razaoSocial: razaoSocial.trim(),
      nomeFantasia: req.body.nomeFantasia?.trim() || razaoSocial.trim(),
      cnpj: cnpjLimpo,
      inscricaoEstadual: req.body.inscricaoEstadual || 'ISENTO',
      inscricaoMunicipal: req.body.inscricaoMunicipal || '',
      codigoMunicipio: req.body.codigoMunicipio || '',
      regimeTributario: req.body.regimeTributario || 'SIMPLES_NACIONAL',
      fpas: req.body.fpas || '507',
      aliquotaRat: Number(req.body.aliquotaRat ?? 2.0),
      fap: Number(req.body.fap ?? 1.0),
      aliquotaTerceiros: Number(req.body.aliquotaTerceiros ?? 0),
      cnaePrincipal: req.body.cnaePrincipal || '6201-5/01 - Desenvolvimento de programas de computador sob encomenda',
      endereco: req.body.endereco || {
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: 'SP',
        cep: '',
      },
      contatoResponsavel: req.body.contatoResponsavel || {
        nome: '',
        email: '',
        telefone: '',
      },
      bancoConvenio: req.body.bancoConvenio || '',
      configuracoesFolha: req.body.configuracoesFolha || {
        diaPagamentoSalario: 5,
        diaAdiantamento: 20,
        percentualAdiantamento: 40,
        diaVencimentoFGTS: 20,
        diaVencimentoDCTFWeb: 15,
      },
      status: 'ativa',
    };

    db.empresas.push(novaEmpresa);
    salvarDB();
    res.status(201).json(novaEmpresa);
  });

  // Empresas: Edição
  app.put('/api/empresas/:id', (req, res) => {
    const idx = db.empresas.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Empresa não encontrada.' });

    if (req.body.cnpj) {
      const cnpjLimpo = req.body.cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14 || !validarCNPJ(cnpjLimpo)) {
        return res.status(400).json({ error: 'CNPJ informado é inválido.' });
      }
      const duplicado = db.empresas.some(e => e.id !== req.params.id && e.cnpj.replace(/\D/g, '') === cnpjLimpo);
      if (duplicado) {
        return res.status(409).json({ error: 'Já existe outra empresa cadastrada com este CNPJ.' });
      }
      req.body.cnpj = cnpjLimpo;
    }

    db.empresas[idx] = { ...db.empresas[idx], ...req.body };
    salvarDB();
    res.json(db.empresas[idx]);
  });

  // Empresas: Inativar ou Reativar
  app.patch('/api/empresas/:id/status', (req, res) => {
    const empresa = db.empresas.find(e => e.id === req.params.id);
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada.' });

    empresa.status = req.body.status === 'inativa' ? 'inativa' : 'ativa';
    salvarDB();
    res.json(empresa);
  });

  // Empresas: Exclusão com proteção de vínculos e suporte a exclusão forçada (?force=true)
  app.delete('/api/empresas/:id', (req, res) => {
    const { id } = req.params;
    const force = req.query.force === 'true';
    const empresa = db.empresas.find(e => e.id === id);
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada.' });

    const empsVinculados = db.empregados.filter(e => e.empresaId === id);
    const empIds = new Set(empsVinculados.map(e => e.id));
    const folhasVinculadas = db.folhasCalculadas.filter(f => empIds.has(f.empregadoId));
    const feriasVinculadas = db.ferias.filter(f => f.empresaId === id);
    const rescisoesVinculadas = db.rescisoes.filter(r => r.empresaId === id);

    const totalVinculos = empsVinculados.length + folhasVinculadas.length + feriasVinculadas.length + rescisoesVinculadas.length;

    if (totalVinculos > 0 && !force) {
      return res.status(400).json({
        error: `A empresa "${empresa.razaoSocial}" possui registros vinculados no banco de dados.`,
        motivo: 'Você pode inativar a empresa para manter o histórico fiscal ou confirmar a exclusão permanente removendo todos os vínculos.',
        vinculos: {
          colaboradores: empsVinculados.length,
          folhasCalculadas: folhasVinculadas.length,
          periodosFerias: feriasVinculadas.length,
          rescisoes: rescisoesVinculadas.length,
        },
        podeInativar: true,
        podeForcar: true,
      });
    }

    // Remove a empresa e todos os registros vinculados
    db.lancamentos = db.lancamentos.filter(l => !empIds.has(l.empregadoId));
    db.folhasCalculadas = db.folhasCalculadas.filter(f => !empIds.has(f.empregadoId));
    db.empregados = db.empregados.filter(e => e.empresaId !== id);
    db.ferias = db.ferias.filter(f => f.empresaId !== id);
    db.rescisoes = db.rescisoes.filter(r => r.empresaId !== id);
    db.documentos = db.documentos.filter(d => d.empresaId !== id);
    db.afastamentos = db.afastamentos.filter(a => a.empresaId !== id);
    db.agenda = db.agenda.filter(a => a.empresaId !== id);
    db.esocial = db.esocial.filter(e => (e as any).empresaId !== id);
    db.movimentacoes = db.movimentacoes.filter(m => m.empresaId !== id);
    for (const key of Object.keys(db.competenciasStatus)) {
      if (key.startsWith(`${id}_`)) {
        delete db.competenciasStatus[key];
      }
    }

    db.empresas = db.empresas.filter(e => e.id !== id);
    salvarDB();
    res.json({ success: true, message: `Empresa "${empresa.razaoSocial}" excluída com sucesso.` });
  });

  // Empregados: Listagem com filtro estrito por empresaId
  app.get('/api/empregados', (req, res) => {
    const { empresaId, status } = req.query;
    let list = db.empregados;
    if (empresaId) list = list.filter(e => e.empresaId === empresaId);
    if (status) list = list.filter(e => e.status === status);
    res.json(list);
  });

  app.get('/api/empregados/:id', (req, res) => {
    const emp = db.empregados.find(e => e.id === req.params.id);
    if (!emp) return res.status(404).json({ error: 'Empregado não encontrado' });
    res.json(emp);
  });

  // Empregados: Cadastro
  app.post('/api/empregados', (req, res) => {
    try {
      const body = req.body || {};
      const { cpf, empresaId, nomeCompleto } = body;
      if (!nomeCompleto || !String(nomeCompleto).trim()) {
        return res.status(400).json({ error: 'Nome completo é obrigatório.' });
      }
      if (!empresaId) {
        return res.status(400).json({ error: 'Empresa vinculada é obrigatória.' });
      }

      const cpfLimpo = cpf ? String(cpf).replace(/\D/g, '') : '';
      if (cpfLimpo && !validarCPF(cpfLimpo)) {
        return res.status(400).json({ error: 'CPF informado é inválido.' });
      }

      // Verifica se já existe colaborador com mesma matrícula ou CPF na mesma empresa
      if (cpfLimpo) {
        const duplicado = db.empregados.some(
          e => e.empresaId === empresaId && (e.cpf || '').replace(/\D/g, '') === cpfLimpo && e.status !== 'desligado'
        );
        if (duplicado) {
          return res.status(409).json({ error: 'Já existe um colaborador ativo cadastrado com este CPF nesta empresa.' });
        }
      }

      const novoEmpregado: Empregado = {
        ...body,
        id: body.id || `emp-${Date.now()}`,
        matricula: body.matricula || String(db.empregados.filter(e => e.empresaId === empresaId).length + 101).padStart(5, '0'),
        cpf: cpfLimpo || body.cpf || '',
        historicoAlteracoes: Array.isArray(body.historicoAlteracoes) ? body.historicoAlteracoes : [],
        documentosAdmissao: body.documentosAdmissao || [
          { id: `doc-1`, nome: 'Documento de Identidade (RG/CNH)', tipo: 'RG', obrigatorio: true, recebido: false, status: 'pendente' },
          { id: `doc-2`, nome: 'Cadastro de Pessoa Física (CPF)', tipo: 'CPF', obrigatorio: true, recebido: false, status: 'pendente' },
          { id: `doc-3`, nome: 'Comprovante de Residência', tipo: 'COMPROVANTE_RESIDENCIA', obrigatorio: true, recebido: false, status: 'pendente' },
          { id: `doc-4`, nome: 'Atestado de Saúde Ocupacional (ASO)', tipo: 'EXAME_ADMISSIONAL_ASO', obrigatorio: true, recebido: false, status: 'pendente' },
          { id: `doc-5`, nome: 'Carteira de Trabalho Digital', tipo: 'CTPS', obrigatorio: true, recebido: false, status: 'pendente' },
        ],
      };
      db.empregados.push(novoEmpregado);

      if (novoEmpregado.status === 'ativo') {
        const docId = `doc-contrato-${novoEmpregado.id}`;
        if (!db.documentos.some(d => d.id === docId)) {
          db.documentos.push({
            id: docId,
            empresaId: novoEmpregado.empresaId,
            empregadoId: novoEmpregado.id,
            tipo: novoEmpregado.tipoContrato === 'EXPERIENCIA_45_45' ? 'CONTRATO_EXPERIENCIA' : 'CONTRATO_TRABALHO_CLT',
            titulo: novoEmpregado.tipoContrato === 'EXPERIENCIA_45_45' ? 'Contrato de Experiência (45+45 dias)' : 'Contrato Individual de Trabalho CLT',
            conteudoHtml: 'Contrato gerado automaticamente na admissão.',
            dataEmissao: novoEmpregado.dataAdmissao || novoEmpregado.dataPrevisaoInicio || new Date().toISOString().split('T')[0],
            status: 'EMITIDO',
            versao: 1,
          });
        }
      }

      salvarDB();
      res.status(201).json(novoEmpregado);
    } catch (err: any) {
      console.error('Erro ao cadastrar empregado:', err);
      res.status(500).json({ error: err?.message || 'Erro interno ao cadastrar colaborador.' });
    }
  });

  // Empregados: Edição cadastral
  app.put('/api/empregados/:id', (req, res) => {
    const idx = db.empregados.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Empregado não encontrado' });

    if (req.body.cpf) {
      const cpfLimpo = req.body.cpf.replace(/\D/g, '');
      if (cpfLimpo.length === 11 && !validarCPF(cpfLimpo)) {
        return res.status(400).json({ error: 'CPF informado é inválido.' });
      }
      req.body.cpf = cpfLimpo;
    }

    db.empregados[idx] = { ...db.empregados[idx], ...req.body };
    salvarDB();
    res.json(db.empregados[idx]);
  });

  // Empregados: Exclusão com verificação de histórico
  app.delete('/api/empregados/:id', (req, res) => {
    const { id } = req.params;
    const emp = db.empregados.find(e => e.id === id);
    if (!emp) return res.status(404).json({ error: 'Colaborador não encontrado.' });

    const folhasFechadas = db.folhasCalculadas.filter(
      f => f.empregadoId === id && db.competenciasStatus[`${emp.empresaId}_${f.competencia}`]?.status === 'FECHADA'
    );
    const feriasPagas = db.ferias.filter(
      f => f.empregadoId === id && f.programacoes?.some(p => p.status === 'PAGA' || p.reciboAssinado)
    );
    const rescisoes = db.rescisoes.filter(r => r.empregadoId === id);

    const totalMovimentosOficiais = folhasFechadas.length + feriasPagas.length + rescisoes.length;

    if (totalMovimentosOficiais > 0) {
      return res.status(400).json({
        error: `Não é possível excluir o colaborador "${emp.nomeCompleto}". Ele possui movimentações trabalhistas oficiais e folhas fechadas.`,
        sugestao: 'Para encerramento do contrato de trabalho, utilize a opção "Registrar Desligamento" e gere o TRCT.',
        vinculos: {
          folhasFechadas: folhasFechadas.length,
          feriasPagas: feriasPagas.length,
          rescisoes: rescisoes.length,
        },
        podeDesligar: true,
      });
    }

    // Exclusão permitida para cadastro sem movimentações fechadas (criado por engano)
    db.folhasCalculadas = db.folhasCalculadas.filter(f => f.empregadoId !== id);
    db.lancamentos = db.lancamentos.filter(l => l.empregadoId !== id);
    db.ferias = db.ferias.filter(f => f.empregadoId !== id);
    db.documentos = db.documentos.filter(d => d.empregadoId !== id);
    db.empregados = db.empregados.filter(e => e.id !== id);

    salvarDB();
    res.json({ success: true, message: `Colaborador "${emp.nomeCompleto}" excluído com sucesso.` });
  });

  // Empregados: Registrar Desligamento
  app.post('/api/empregados/:id/desligamento', (req, res) => {
    const { id } = req.params;
    const { dataDesligamento, motivo, observacoes } = req.body;
    const emp = db.empregados.find(e => e.id === id);
    if (!emp) return res.status(404).json({ error: 'Colaborador não encontrado.' });

    const dataFinalDesligamento = dataDesligamento || new Date().toISOString().split('T')[0];
    emp.status = 'desligado';
    emp.dataDesligamento = dataFinalDesligamento;

    if (!emp.historicoAlteracoes) emp.historicoAlteracoes = [];
    emp.historicoAlteracoes.push({
      id: `hist-deslig-${Date.now()}`,
      dataVigencia: dataFinalDesligamento,
      dataRegistro: new Date().toISOString().split('T')[0],
      tipo: 'LOTACAO',
      valorAnterior: 'Ativo',
      valorNovo: `Desligado (${motivo || 'Rescisão contratual'})`,
      motivo: observacoes || motivo || 'Desligamento registrado pelo operador do DP',
      responsavel: 'Operador DP',
    });

    salvarDB();
    res.json({ success: true, empregado: emp });
  });

  // Registra alteração com histórico e vigência (salário, cargo, etc.)
  app.post('/api/empregados/:id/alteracao', (req, res) => {
    const { tipo, valorNovo, dataVigencia, motivo, responsavel } = req.body;
    const emp = db.empregados.find(e => e.id === req.params.id);
    if (!emp) return res.status(404).json({ error: 'Empregado não encontrado' });

    let valorAnterior: any = '';
    if (tipo === 'SALARIO') {
      valorAnterior = emp.salarioBase;
      emp.salarioBase = Number(valorNovo);
    } else if (tipo === 'CARGO') {
      valorAnterior = emp.cargo;
      emp.cargo = String(valorNovo);
    } else if (tipo === 'JORNADA') {
      valorAnterior = emp.escala;
      emp.escala = String(valorNovo);
    }

    const reg = {
      id: `hist-${Date.now()}`,
      dataVigencia,
      dataRegistro: new Date().toISOString().split('T')[0],
      tipo,
      valorAnterior,
      valorNovo,
      motivo,
      responsavel: responsavel || 'Operador DP',
    };

    if (!emp.historicoAlteracoes) emp.historicoAlteracoes = [];
    emp.historicoAlteracoes.push(reg);

    salvarDB();
    res.json({ empregado: emp, alteracao: reg });
  });

  // Aprova admissão e integra na folha
  app.post('/api/empregados/:id/aprovar-admissao', (req, res) => {
    let emp = db.empregados.find(e => e.id === req.params.id);
    if (!emp && req.body?.empregado && req.body.empregado.id === req.params.id) {
      emp = req.body.empregado as Empregado;
      db.empregados.push(emp);
    }
    if (!emp) return res.status(404).json({ error: 'Empregado não encontrado' });

    emp.status = 'ativo';
    emp.dataAdmissao = emp.dataPrevisaoInicio || emp.dataAdmissao || new Date().toISOString().split('T')[0];

    // Gera o contrato de trabalho (idempotente)
    const docId = `doc-contrato-${emp.id}`;
    let novoDoc = db.documentos.find(d => d.id === docId);
    if (!novoDoc) {
      novoDoc = {
        id: docId,
        empresaId: emp.empresaId,
        empregadoId: emp.id,
        tipo: emp.tipoContrato === 'EXPERIENCIA_45_45' ? 'CONTRATO_EXPERIENCIA' : 'CONTRATO_TRABALHO_CLT',
        titulo: emp.tipoContrato === 'EXPERIENCIA_45_45' ? 'Contrato de Experiência (45+45 dias)' : 'Contrato Individual de Trabalho CLT',
        conteudoHtml: 'Contrato gerado automaticamente na admissão.',
        dataEmissao: emp.dataAdmissao,
        status: 'EMITIDO',
        versao: 1,
      };
      db.documentos.push(novoDoc);
    }

    // Registra evento eSocial S-2200
    const novoESocial: ESocialEvento = {
      id: `es-${Date.now()}`,
      codigoEvento: 'S-2200',
      descricao: `Cadastramento Inicial e Admissão - ${emp.nomeCompleto}`,
      empregadoNome: emp.nomeCompleto,
      statusEnvio: 'GERADO',
      dataTransmissao: new Date().toISOString(),
      arquivoXmlSimulado: `<?xml version="1.0" encoding="UTF-8"?><eSocial><evtAdmissao><cpfTrab>${emp.cpf}</cpfTrab><nmTrab>${emp.nomeCompleto}</nmTrab><matricula>${emp.matricula}</matricula></evtAdmissao></eSocial>`,
    };
    db.esocial.unshift(novoESocial);

    salvarDB();
    res.json({ success: true, empregado: emp, contrato: novoDoc, esocial: novoESocial });
  });

  // Folha de Pagamento: Consulta de competência
  app.get(
    [
      '/api/folha',
      '/api/folha/:empresaId',
      '/api/folha/:empresaId/:competencia',
      '/api/folha/:empresaId/:mes/:ano',
    ],
    (req, res) => {
      const empresaId = req.params.empresaId || (req.query.empresaId as string) || '';
      let competencia = req.params.competencia || (req.query.competencia as string) || '';
      if (!competencia && req.params.mes && req.params.ano) {
        competencia = `${req.params.mes}/${req.params.ano}`;
      }
      if (competencia) {
        competencia = decodeURIComponent(competencia);
      }
      const folhas = db.folhasCalculadas.filter(
        f => f.competencia === competencia && db.empregados.some(e => e.id === f.empregadoId && e.empresaId === empresaId)
      );

    const compKey = `${empresaId}_${competencia}`;
    let compStatus = db.competenciasStatus[compKey];

    if (!compStatus) {
      compStatus = {
        id: `comp-${empresaId}-${competencia.replace('/', '')}`,
        empresaId,
        competencia,
        status: 'ABERTA',
        totalEmpregadosAtivos: db.empregados.filter(e => e.empresaId === empresaId && e.status !== 'em_admissao').length,
        totalCalculados: folhas.length,
        totalProventos: folhas.reduce((acc, f) => acc + f.totalProventos, 0),
        totalDescontos: folhas.reduce((acc, f) => acc + f.totalDescontos, 0),
        totalLiquido: folhas.reduce((acc, f) => acc + f.valorLiquido, 0),
        totalEncargosEmpresa: folhas.reduce((acc, f) => acc + f.encargosEmpresa.totalEncargos, 0),
        totalFGTS: folhas.reduce((acc, f) => acc + f.encargosEmpresa.fgtsDevido, 0),
        errosBloqueantes: [],
        alertasRevisao: [],
      };
      db.competenciasStatus[compKey] = compStatus;
      salvarDB();
    }

    res.json({ competencia: compStatus, folhas });
  });

  // Processar ou Reprocessar Folha (Individual, Grupo ou Toda a Empresa)
  app.post('/api/folha/calcular', (req, res) => {
    try {
      const {
        empresaId,
        competencia,
        empregadoId,
        tipoFolha = 'MENSAL',
        empresa: empresaPayload,
        empregados: empregadosPayload,
        lancamentos: lancamentosPayload,
      } = req.body || {};

      if (!empresaId || !competencia) {
        return res.status(400).json({ error: 'Empresa e competência são obrigatórias para calcular a folha.' });
      }

      sincronizarContextoEmpresaEmpregados(empresaPayload, undefined, empregadosPayload);

      const empresa = db.empresas.find(e => e.id === empresaId);
      if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });

      if (Array.isArray(lancamentosPayload)) {
        for (const lPay of lancamentosPayload) {
          if (lPay && lPay.id && !db.lancamentos.some(l => l.id === lPay.id)) {
            db.lancamentos.push(lPay as LancamentoVariavel);
          }
        }
      }

      const compKey = `${empresaId}_${competencia}`;
      const compStatus = db.competenciasStatus[compKey];
      if (compStatus && compStatus.status === 'FECHADA') {
        return res.status(400).json({ error: 'Esta competência está FECHADA. É obrigatório reabrir antes de recalcular.' });
      }

      let empregadosParaCalcular = db.empregados.filter(
        e => e.empresaId === empresaId && e.status !== 'em_admissao' && e.status !== 'desligado'
      );
      if (empregadoId) {
        empregadosParaCalcular = empregadosParaCalcular.filter(e => e.id === empregadoId);
      }

      const novasFolhas: FolhaEmpregado[] = [];

      for (const emp of empregadosParaCalcular) {
        const lancs = db.lancamentos.filter(l => l.empregadoId === emp.id && l.competencia === competencia);
        const folha = processarFolhaEmpregado(emp, empresa, competencia, lancs, tipoFolha);

        db.folhasCalculadas = db.folhasCalculadas.filter(
          f => !(f.empregadoId === emp.id && f.competencia === competencia && f.tipoFolha === folha.tipoFolha)
        );

        db.folhasCalculadas.push(folha);
        novasFolhas.push(folha);
      }

      const todasFolhasComp = db.folhasCalculadas.filter(
        f => f.competencia === competencia && db.empregados.some(e => e.id === f.empregadoId && e.empresaId === empresaId)
      );

      const ativosCount = db.empregados.filter(
        e => e.empresaId === empresaId && e.status !== 'em_admissao' && e.status !== 'desligado'
      ).length;
      const erros: string[] = [];
      const alertas: string[] = [];

      if (todasFolhasComp.length < ativosCount) {
        alertas.push(`Existem ${ativosCount - todasFolhasComp.length} colaborador(es) ativo(s) sem cálculo na competência.`);
      }

      db.competenciasStatus[compKey] = {
        id: compStatus?.id || `comp-${empresaId}-${competencia.replace(/\D/g, '')}`,
        empresaId,
        competencia,
        status: compStatus?.status === 'FECHADA' ? 'FECHADA' : 'EM_CONFERENCIA',
        tipoFolha: compStatus?.tipoFolha || tipoFolha,
        totalEmpregadosAtivos: ativosCount,
        totalCalculados: todasFolhasComp.length,
        totalProventos: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.totalProventos, 0) * 100) / 100,
        totalDescontos: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.totalDescontos, 0) * 100) / 100,
        totalLiquido: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.valorLiquido, 0) * 100) / 100,
        totalEncargosEmpresa: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.encargosEmpresa.totalEncargos, 0) * 100) / 100,
        totalFGTS: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.encargosEmpresa.fgtsDevido, 0) * 100) / 100,
        errosBloqueantes: erros,
        alertasRevisao: alertas,
      };

      salvarDB();
      res.json({ success: true, calculadas: novasFolhas, competenciaStatus: db.competenciasStatus[compKey] });
    } catch (err: any) {
      console.error('Erro ao calcular folha:', err);
      res.status(500).json({ error: err?.message || 'Erro interno ao processar cálculo da folha.' });
    }
  });

  // Processar Folha de Pagamento em Lote para múltiplas competências
  app.post('/api/folha/calcular-lote', (req, res) => {
    try {
      const {
        empresaId,
        competencias,
        tipoFolha = 'MENSAL',
        empregadoId,
        empresa: empresaPayload,
        empregados: empregadosPayload,
        lancamentos: lancamentosPayload,
      } = req.body || {};

      if (!empresaId || !Array.isArray(competencias) || competencias.length === 0) {
        return res.status(400).json({ error: 'Informe a empresa e ao menos uma competência para gerar a folha em lote.' });
      }

      sincronizarContextoEmpresaEmpregados(empresaPayload, undefined, empregadosPayload);

      const empresa = db.empresas.find(e => e.id === empresaId);
      if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });

      if (Array.isArray(lancamentosPayload)) {
        for (const lPay of lancamentosPayload) {
          if (lPay && lPay.id && !db.lancamentos.some(l => l.id === lPay.id)) {
            db.lancamentos.push(lPay as LancamentoVariavel);
          }
        }
      }

      let empregadosParaCalcular = db.empregados.filter(
        e => e.empresaId === empresaId && e.status !== 'em_admissao' && e.status !== 'desligado'
      );
      if (empregadoId) {
        empregadosParaCalcular = empregadosParaCalcular.filter(e => e.id === empregadoId);
      }

      const ativosCount = db.empregados.filter(
        e => e.empresaId === empresaId && e.status !== 'em_admissao' && e.status !== 'desligado'
      ).length;

      const competenciasUnicas: string[] = Array.from(
        new Set(competencias.map((c: any) => String(c || '').trim()).filter(Boolean))
      );

      const resultados: Array<{
        competencia: string;
        status: 'PROCESSADA' | 'IGNORADA_FECHADA';
        competenciaStatus: CompetenciaFolha;
        folhas: FolhaEmpregado[];
        mensagem: string;
      }> = [];

      let processadas = 0;
      let ignoradasFechadas = 0;

      for (const compStr of competenciasUnicas) {
        const compKey = `${empresaId}_${compStr}`;
        const existente = db.competenciasStatus[compKey];

        if (existente && existente.status === 'FECHADA') {
          ignoradasFechadas++;
          const folhasExistentes = db.folhasCalculadas.filter(
            f => f.competencia === compStr && db.empregados.some(e => e.id === f.empregadoId && e.empresaId === empresaId)
          );
          resultados.push({
            competencia: compStr,
            status: 'IGNORADA_FECHADA',
            competenciaStatus: existente,
            folhas: folhasExistentes,
            mensagem: 'Competência fechada (mantida sem alteração).',
          });
          continue;
        }

        const novasFolhas: FolhaEmpregado[] = [];
        for (const emp of empregadosParaCalcular) {
          const lancs = db.lancamentos.filter(l => l.empregadoId === emp.id && l.competencia === compStr);
          const folha = processarFolhaEmpregado(emp, empresa, compStr, lancs, tipoFolha);

          db.folhasCalculadas = db.folhasCalculadas.filter(
            f => !(f.empregadoId === emp.id && f.competencia === compStr && f.tipoFolha === folha.tipoFolha)
          );

          db.folhasCalculadas.push(folha);
          novasFolhas.push(folha);
        }

        const todasFolhasComp = db.folhasCalculadas.filter(
          f => f.competencia === compStr && db.empregados.some(e => e.id === f.empregadoId && e.empresaId === empresaId)
        );

        const alertas: string[] = [];
        if (todasFolhasComp.length < ativosCount) {
          alertas.push(`Existem ${ativosCount - todasFolhasComp.length} colaborador(es) ativo(s) sem cálculo na competência.`);
        }

        const compAtualizada: CompetenciaFolha = {
          id: existente?.id || `comp-${empresaId}-${compStr.replace(/\D/g, '')}`,
          empresaId,
          competencia: compStr,
          status: 'EM_CONFERENCIA',
          tipoFolha: existente?.tipoFolha || tipoFolha,
          totalEmpregadosAtivos: ativosCount,
          totalCalculados: todasFolhasComp.length,
          totalProventos: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.totalProventos, 0) * 100) / 100,
          totalDescontos: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.totalDescontos, 0) * 100) / 100,
          totalLiquido: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.valorLiquido, 0) * 100) / 100,
          totalEncargosEmpresa: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.encargosEmpresa.totalEncargos, 0) * 100) / 100,
          totalFGTS: Math.round(todasFolhasComp.reduce((acc, f) => acc + f.encargosEmpresa.fgtsDevido, 0) * 100) / 100,
          errosBloqueantes: [],
          alertasRevisao: alertas,
        };

        db.competenciasStatus[compKey] = compAtualizada;
        processadas++;

        resultados.push({
          competencia: compStr,
          status: 'PROCESSADA',
          competenciaStatus: compAtualizada,
          folhas: todasFolhasComp,
          mensagem: `${todasFolhasComp.length} colaborador(es) calculado(s).`,
        });
      }

      db.auditoriaLogs.unshift({
        id: `log-lote-${Date.now()}`,
        dataHora: new Date().toISOString(),
        usuario: 'Operador DP',
        acao: 'CALCULO_FOLHA_LOTE',
        detalhes: { empresaId, competencias: competenciasUnicas, processadas, ignoradasFechadas },
      });

      salvarDB();
      res.json({
        success: true,
        totalCompetencias: competenciasUnicas.length,
        processadas,
        ignoradasFechadas,
        resultados,
      });
    } catch (err: any) {
      console.error('Erro ao calcular folha em lote:', err);
      res.status(500).json({ error: err?.message || 'Erro interno ao processar folha em lote.' });
    }
  });

  // Aprovar e Fechar Competência
  app.post('/api/folha/aprovar-fechar', (req, res) => {
    const { empresaId, competencia, usuario = 'Operador DP' } = req.body;
    const compKey = `${empresaId}_${competencia}`;
    const comp = db.competenciasStatus[compKey];
    if (!comp) return res.status(404).json({ error: 'Competência não encontrada' });

    if (comp.errosBloqueantes && comp.errosBloqueantes.length > 0) {
      return res.status(400).json({ error: 'Existem erros impeditivos para o fechamento.', erros: comp.errosBloqueantes });
    }

    comp.status = 'FECHADA';
    comp.historicoFechamento = {
      fechadoPor: usuario,
      dataFechamento: new Date().toISOString(),
    };

    // Gera eventos eSocial S-1200 (Remuneração) e S-1210 (Pagamentos)
    const eventoS1200: ESocialEvento = {
      id: `es-1200-${Date.now()}`,
      codigoEvento: 'S-1200',
      descricao: `Remuneração de Trabalhador - Competência ${competencia}`,
      competencia,
      statusEnvio: 'GERADO',
      dataTransmissao: new Date().toISOString(),
      arquivoXmlSimulado: `<?xml version="1.0" encoding="UTF-8"?><eSocial><evtRemun><idePeriodo>${competencia}</idePeriodo></evtRemun></eSocial>`,
    };
    db.esocial.unshift(eventoS1200);

    db.auditoriaLogs.unshift({
      id: `log-${Date.now()}`,
      dataHora: new Date().toISOString(),
      usuario,
      acao: 'FECHAMENTO_FOLHA',
      detalhes: { empresaId, competencia, totalLiquido: comp.totalLiquido },
    });

    salvarDB();
    res.json({ success: true, competencia: comp, esocial: eventoS1200 });
  });

  // Reabrir Competência com justificativa auditável
  app.post('/api/folha/reabrir', (req, res) => {
    const { empresaId, competencia, motivo, usuario = 'Operador DP' } = req.body;
    if (!motivo || motivo.trim().length < 5) {
      return res.status(400).json({ error: 'Justificativa é obrigatória para reabertura de folha.' });
    }

    const compKey = `${empresaId}_${competencia}`;
    const comp = db.competenciasStatus[compKey];
    if (!comp) return res.status(404).json({ error: 'Competência não encontrada' });

    comp.status = 'EM_CONFERENCIA';
    if (!comp.historicoFechamento) comp.historicoFechamento = {};
    comp.historicoFechamento.reabertoPor = usuario;
    comp.historicoFechamento.dataReabertura = new Date().toISOString();
    comp.historicoFechamento.motivoReabertura = motivo;

    db.auditoriaLogs.unshift({
      id: `log-${Date.now()}`,
      dataHora: new Date().toISOString(),
      usuario,
      acao: 'REABERTURA_FOLHA',
      detalhes: { empresaId, competencia, motivo },
    });

    salvarDB();
    res.json({ success: true, competencia: comp });
  });

  // Atualizar Etapa da Competência (ABERTA -> EM_CONFERENCIA -> APROVADA -> FECHADA)
  app.post('/api/folha/status', (req, res) => {
    const { empresaId, competencia, status: novoStatus, usuario = 'Operador DP' } = req.body;
    const compKey = `${empresaId}_${competencia}`;
    const comp = db.competenciasStatus[compKey];
    if (!comp) return res.status(404).json({ error: 'Competência não encontrada' });

    comp.status = novoStatus;
    if (novoStatus === 'FECHADA') {
      comp.historicoFechamento = {
        fechadoPor: usuario,
        dataFechamento: new Date().toISOString(),
      };
    }

    db.auditoriaLogs.unshift({
      id: `log-${Date.now()}`,
      dataHora: new Date().toISOString(),
      usuario,
      acao: `ETAPA_FOLHA_${novoStatus}`,
      detalhes: { empresaId, competencia, novoStatus },
    });

    salvarDB();
    res.json({ success: true, competencia: comp });
  });

  // Auditoria Comparativa: Folha Atual vs Mês Anterior
  app.get(
    [
      '/api/folha/auditoria-comparativa',
      '/api/folha/auditoria-comparativa/:empresaId',
      '/api/folha/auditoria-comparativa/:empresaId/:competencia',
      '/api/folha/auditoria-comparativa/:empresaId/:mes/:ano',
    ],
    (req, res) => {
      const empresaId = req.params.empresaId || (req.query.empresaId as string) || '';
      let competencia = req.params.competencia || (req.query.competencia as string) || '';
      if (!competencia && req.params.mes && req.params.ano) {
        competencia = `${req.params.mes}/${req.params.ano}`;
      }
      if (competencia) {
        competencia = decodeURIComponent(competencia);
      }

      // Calcula mês anterior (MM/YYYY)
      const partes = (competencia || '').split('/');
      let mes = parseInt(partes[0] || '5', 10);
      let ano = parseInt(partes[1] || '2026', 10);
      if (mes === 1) {
        mes = 12;
        ano -= 1;
      } else {
        mes -= 1;
      }
      const compAnterior = `${String(mes).padStart(2, '0')}/${ano}`;

    const folhasAtuais = db.folhasCalculadas.filter(
      f => f.competencia === competencia && db.empregados.some(e => e.id === f.empregadoId && e.empresaId === empresaId)
    );
    const folhasAnteriores = db.folhasCalculadas.filter(
      f => f.competencia === compAnterior && db.empregados.some(e => e.id === f.empregadoId && e.empresaId === empresaId)
    );

    const divergencias = [];

    for (const folhaAtual of folhasAtuais) {
      const folhaAnt = folhasAnteriores.find(f => f.empregadoId === folhaAtual.empregadoId);

      if (!folhaAnt) {
        divergencias.push({
          tipo: 'NOVO_COLABORADOR',
          severidade: 'info',
          empregadoNome: folhaAtual.nomeEmpregado,
          descricao: `Primeiro cálculo para este colaborador (sem histórico em ${compAnterior}).`,
          impacto: folhaAtual.valorLiquido,
        });
        continue;
      }

      // Variação salarial base
      if (folhaAtual.salarioBase !== folhaAnt.salarioBase) {
        divergencias.push({
          tipo: 'ALTERACAO_SALARIAL',
          severidade: 'alerta',
          empregadoNome: folhaAtual.nomeEmpregado,
          descricao: `Salário alterado de R$ ${folhaAnt.salarioBase.toFixed(2)} para R$ ${folhaAtual.salarioBase.toFixed(2)}.`,
          impacto: folhaAtual.salarioBase - folhaAnt.salarioBase,
        });
      }

      // Variação relevante no líquido (> 15%)
      const diffLiquido = folhaAtual.valorLiquido - folhaAnt.valorLiquido;
      const percDiff = folhaAnt.valorLiquido > 0 ? (Math.abs(diffLiquido) / folhaAnt.valorLiquido) * 100 : 0;
      if (percDiff > 15) {
        divergencias.push({
          tipo: 'VARIACAO_LIQUIDO',
          severidade: 'alerta',
          empregadoNome: folhaAtual.nomeEmpregado,
          descricao: `Variação de ${percDiff.toFixed(1)}% no líquido a receber (Anterior: R$ ${folhaAnt.valorLiquido.toFixed(2)} | Atual: R$ ${folhaAtual.valorLiquido.toFixed(2)}).`,
          impacto: diffLiquido,
        });
      }

      // Rubricas novas que não existiam no mês anterior
      for (const item of folhaAtual.itens) {
        const itemAnt = folhaAnt.itens.find(i => i.rubricaCodigo === item.rubricaCodigo);
        if (!itemAnt) {
          divergencias.push({
            tipo: 'RUBRICA_NOVA',
            severidade: 'info',
            empregadoNome: folhaAtual.nomeEmpregado,
            descricao: `Rubrica lançada pela primeira vez: ${item.descricao} (${item.tipo === 'PROVENTO' ? '+' : '-'} R$ ${(item.provento || item.desconto).toFixed(2)}).`,
            impacto: item.provento || item.desconto,
          });
        }
      }
    }

    // Empregados ativos que estavam no mês anterior mas não estão na folha atual
    for (const folhaAnt of folhasAnteriores) {
      const temAtual = folhasAtuais.some(f => f.empregadoId === folhaAnt.empregadoId);
      if (!temAtual) {
        divergencias.push({
          tipo: 'SEM_CALCULO',
          severidade: 'erro',
          empregadoNome: folhaAnt.nomeEmpregado,
          descricao: `Colaborador calculado em ${compAnterior} mas ausente na folha atual de ${competencia}.`,
          impacto: -folhaAnt.valorLiquido,
        });
      }
    }

    res.json({
      competenciaAtual: competencia,
      competenciaAnterior: compAnterior,
      totalAtual: folhasAtuais.reduce((a, b) => a + b.valorLiquido, 0),
      totalAnterior: folhasAnteriores.reduce((a, b) => a + b.valorLiquido, 0),
      divergencias,
    });
  });

  // Importação de Planilha com Detecção de Duplicidade
  app.post('/api/importar-planilha', (req, res) => {
    const { nomeArquivo, competencia, linhas } = req.body;

    if (db.importacoesRegistradas.includes(nomeArquivo)) {
      return res.status(409).json({
        error: 'Arquivo já importado anteriormente!',
        detalhes: `A planilha "${nomeArquivo}" já foi processada nesta empresa para evitar lançamentos duplicados de ponto ou benefícios.`,
      });
    }

    const lancamentosCriados: LancamentoVariavel[] = [];
    const errosPorLinha: { linha: number; erro: string }[] = [];

    for (let i = 0; i < (linhas || []).length; i++) {
      const l = linhas[i];
      const emp = db.empregados.find(e => e.matricula === l.matricula || e.cpf.replace(/\D/g, '') === String(l.cpf).replace(/\D/g, ''));

      if (!emp) {
        errosPorLinha.push({ linha: i + 1, erro: `Empregado com matrícula "${l.matricula}" ou CPF "${l.cpf}" não encontrado.` });
        continue;
      }

      const novoLanc: LancamentoVariavel = {
        id: `lanc-imp-${Date.now()}-${i}`,
        empregadoId: emp.id,
        competencia,
        rubricaCodigo: l.rubricaCodigo || '0101',
        descricao: l.descricao || 'Importação de Ponto/Variáveis',
        referencia: Number(l.referencia || l.horas || 1),
        unidadeReferencia: l.unidade || 'HORAS',
        valor: Number(l.valor || 0),
        origem: 'IMPORTACAO',
        comprovanteNome: nomeArquivo,
      };

      db.lancamentos.push(novoLanc);
      lancamentosCriados.push(novoLanc);
    }

    db.importacoesRegistradas.push(nomeArquivo);
    salvarDB();

    res.json({
      success: true,
      importadosCount: lancamentosCriados.length,
      errosCount: errosPorLinha.length,
      errosPorLinha,
    });
  });

  // ==========================================
  // Competências: CRUD e Gestão de Períodos
  // ==========================================
  app.get('/api/competencias/:empresaId', (req, res) => {
    const { empresaId } = req.params;
    const list: CompetenciaFolha[] = [];

    for (const [key, comp] of Object.entries(db.competenciasStatus)) {
      if (key.startsWith(`${empresaId}_`) || comp.empresaId === empresaId) {
        list.push(comp);
      }
    }

    // Ordenação cronológica decrescente
    list.sort((a, b) => {
      const pA = a.competencia.split('/');
      const pB = b.competencia.split('/');
      const mA = parseInt(pA[0], 10) || 1;
      const yA = parseInt(pA[1], 10) || 2026;
      const mB = parseInt(pB[0], 10) || 1;
      const yB = parseInt(pB[1], 10) || 2026;
      return (yB * 100 + mB) - (yA * 100 + mA);
    });

    res.json(list);
  });

  app.post('/api/competencias', (req, res) => {
    try {
      const { empresaId, competencia, tipoFolha = 'MENSAL', parcela13 } = req.body || {};
      if (!empresaId || !competencia) {
        return res.status(400).json({ error: 'Empresa e competência são obrigatórias.' });
      }

      const compKey = `${empresaId}_${competencia}`;
      let comp = db.competenciasStatus[compKey];
      if (comp) {
        return res.json({ existe: true, competencia: comp, message: 'Competência já existente.' });
      }

      const ativosCount = db.empregados.filter(
        e => e.empresaId === empresaId && e.status !== 'em_admissao' && e.status !== 'desligado'
      ).length;

      comp = {
        id: `comp-${empresaId}-${String(competencia).replace('/', '')}`,
        empresaId,
        competencia,
        status: 'ABERTA',
        tipoFolha,
        parcela13,
        totalEmpregadosAtivos: ativosCount,
        totalCalculados: 0,
        totalProventos: 0,
        totalDescontos: 0,
        totalLiquido: 0,
        totalEncargosEmpresa: 0,
        totalFGTS: 0,
        errosBloqueantes: [],
        alertasRevisao: [],
      };

      db.competenciasStatus[compKey] = comp;
      salvarDB();
      res.status(201).json({ existe: false, competencia: comp });
    } catch (err: any) {
      console.error('Erro ao criar competência:', err);
      res.status(500).json({ error: err?.message || 'Erro interno ao criar competência.' });
    }
  });

  app.put(['/api/competencias/:empresaId/:competencia', '/api/competencias/:empresaId/:mes/:ano'], (req, res) => {
    const { empresaId } = req.params;
    const competencia = req.params.competencia ? decodeURIComponent(req.params.competencia) : `${req.params.mes}/${req.params.ano}`;
    const { novaCompetencia, tipoFolha } = req.body;

    const oldKey = `${empresaId}_${competencia}`;
    const comp = db.competenciasStatus[oldKey];
    if (!comp) return res.status(404).json({ error: 'Competência não encontrada.' });

    if (comp.status === 'FECHADA') {
      return res.status(400).json({ error: 'Competência fechada não pode ter o período alterado. Reabra primeiro.' });
    }

    if (novaCompetencia && novaCompetencia !== competencia) {
      const newKey = `${empresaId}_${novaCompetencia}`;
      if (db.competenciasStatus[newKey]) {
        return res.status(409).json({ error: `A competência ${novaCompetencia} já existe nesta empresa.` });
      }

      for (const l of db.lancamentos) {
        if (l.competencia === competencia && db.empregados.some(e => e.id === l.empregadoId && e.empresaId === empresaId)) {
          l.competencia = novaCompetencia;
        }
      }

      for (const f of db.folhasCalculadas) {
        if (f.competencia === competencia && db.empregados.some(e => e.id === f.empregadoId && e.empresaId === empresaId)) {
          f.competencia = novaCompetencia;
        }
      }

      comp.competencia = novaCompetencia;
      delete db.competenciasStatus[oldKey];
      db.competenciasStatus[newKey] = comp;
    }

    if (tipoFolha) comp.tipoFolha = tipoFolha;
    salvarDB();
    res.json(comp);
  });

  app.delete(['/api/competencias/:empresaId/:competencia', '/api/competencias/:empresaId/:mes/:ano'], (req, res) => {
    const { empresaId } = req.params;
    const competencia = req.params.competencia ? decodeURIComponent(req.params.competencia) : `${req.params.mes}/${req.params.ano}`;
    const { force } = req.query;

    const compKey = `${empresaId}_${competencia}`;
    const comp = db.competenciasStatus[compKey];
    if (!comp) return res.status(404).json({ error: 'Competência não encontrada.' });

    if (comp.status === 'FECHADA') {
      return res.status(400).json({ error: 'Não é possível excluir uma competência fechada. É necessário reabri-la primeiro.' });
    }

    const lancs = db.lancamentos.filter(
      l => l.competencia === competencia && db.empregados.some(e => e.id === l.empregadoId && e.empresaId === empresaId)
    );

    if (lancs.length > 0 && force !== 'true') {
      return res.status(400).json({
        error: `A competência ${competencia} possui ${lancs.length} lançamento(s) de evento(s) vinculado(s).`,
        count: lancs.length,
        podeForcar: true,
      });
    }

    db.lancamentos = db.lancamentos.filter(
      l => !(l.competencia === competencia && db.empregados.some(e => e.id === l.empregadoId && e.empresaId === empresaId))
    );
    db.folhasCalculadas = db.folhasCalculadas.filter(
      f => !(f.competencia === competencia && db.empregados.some(e => e.id === f.empregadoId && e.empresaId === empresaId))
    );
    delete db.competenciasStatus[compKey];

    salvarDB();
    res.json({ success: true, message: `Competência ${competencia} excluída com sucesso.` });
  });

  // ==========================================
  // Lançamentos Variáveis (Eventos na Folha)
  // ==========================================
  app.get('/api/lancamentos-variaveis', (req, res) => {
    try {
      const { competencia, empregadoId, empresaId } = req.query;
      let list = db.lancamentos;
      if (competencia) list = list.filter(l => l.competencia === competencia);
      if (empregadoId) list = list.filter(l => l.empregadoId === empregadoId);
      if (empresaId) {
        list = list.filter(l => db.empregados.some(e => e.id === l.empregadoId && e.empresaId === empresaId));
      }
      res.json(list);
    } catch (err: any) {
      console.error('Erro ao listar lançamentos:', err);
      res.status(500).json({ error: err?.message || 'Erro interno ao listar eventos.' });
    }
  });

  app.post('/api/lancamentos-variaveis', (req, res) => {
    try {
      const {
        empresa: empresaPayload,
        empregado: empregadoPayload,
        empregados: empregadosPayload,
        ...lancBody
      } = req.body || {};

      sincronizarContextoEmpresaEmpregados(empresaPayload, empregadoPayload, empregadosPayload);

      if (!lancBody.empregadoId || !lancBody.competencia) {
        return res.status(400).json({ error: 'Colaborador e competência são obrigatórios para lançar o evento.' });
      }

      const emp = db.empregados.find(e => e.id === lancBody.empregadoId);
      if (emp) {
        const compStatus = db.competenciasStatus[`${emp.empresaId}_${lancBody.competencia}`];
        if (compStatus?.status === 'FECHADA') {
          return res.status(400).json({ error: `A competência ${lancBody.competencia} está FECHADA. Reabra antes de lançar eventos.` });
        }
      }

      const refNum = parseNumeroSeguro(lancBody.referencia, 1);
      const valInformado = parseNumeroSeguro(lancBody.valor, 0);
      const unidade = (lancBody.unidadeReferencia || 'VALOR') as LancamentoVariavel['unidadeReferencia'];
      const rubricaCod = String(lancBody.rubricaCodigo || '0105');

      const valorFinal = calcularValorLancamentoServidor(emp, rubricaCod, refNum, unidade, valInformado);

      const novo: LancamentoVariavel = {
        id: lancBody.id || `lanc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        empregadoId: String(lancBody.empregadoId),
        competencia: String(lancBody.competencia),
        rubricaCodigo: rubricaCod,
        descricao: String(lancBody.descricao || 'Evento Variável').trim(),
        referencia: refNum,
        unidadeReferencia: unidade,
        valor: valorFinal,
        origem: lancBody.origem || 'MANUAL',
        comprovanteNome: lancBody.comprovanteNome,
        observacao: lancBody.observacao,
      };

      db.lancamentos.push(novo);
      salvarDB();

      if (emp) {
        recalcularCompetenciaInterna(emp.empresaId, novo.competencia, emp.id);
      }

      res.status(201).json(novo);
    } catch (err: any) {
      console.error('Erro ao salvar lançamento:', err);
      res.status(500).json({ error: err?.message || 'Erro interno ao gravar evento na folha.' });
    }
  });

  app.put('/api/lancamentos-variaveis/:id', (req, res) => {
    try {
      const {
        empresa: empresaPayload,
        empregado: empregadoPayload,
        empregados: empregadosPayload,
        lancamento: lancPayload,
        ...updateBody
      } = req.body || {};

      sincronizarContextoEmpresaEmpregados(empresaPayload, empregadoPayload, empregadosPayload);

      let idx = db.lancamentos.findIndex(l => l.id === req.params.id);
      if (idx === -1) {
        const baseFallback = lancPayload || updateBody;
        if (baseFallback?.empregadoId && baseFallback?.competencia) {
          const novoSync: LancamentoVariavel = {
            id: req.params.id,
            empregadoId: String(baseFallback.empregadoId),
            competencia: String(baseFallback.competencia),
            rubricaCodigo: String(baseFallback.rubricaCodigo || '0105'),
            descricao: String(baseFallback.descricao || 'Evento Variável').trim(),
            referencia: parseNumeroSeguro(baseFallback.referencia, 1),
            unidadeReferencia: (baseFallback.unidadeReferencia || 'VALOR') as any,
            valor: parseNumeroSeguro(baseFallback.valor, 0),
            origem: baseFallback.origem || 'MANUAL',
            observacao: baseFallback.observacao,
          };
          db.lancamentos.push(novoSync);
          idx = db.lancamentos.length - 1;
        } else {
          return res.status(404).json({ error: 'Lançamento não encontrado.' });
        }
      }

      const lanc = db.lancamentos[idx];
      const emp = db.empregados.find(e => e.id === lanc.empregadoId);

      if (emp) {
        const compStatus = db.competenciasStatus[`${emp.empresaId}_${lanc.competencia}`];
        if (compStatus?.status === 'FECHADA') {
          return res.status(400).json({ error: `A competência ${lanc.competencia} está FECHADA. Reabra antes de editar eventos.` });
        }
      }

      const refNum = updateBody.referencia !== undefined
        ? parseNumeroSeguro(updateBody.referencia, lanc.referencia)
        : lanc.referencia;
      const rubricaCod = String(updateBody.rubricaCodigo || lanc.rubricaCodigo);
      const unidade = (updateBody.unidadeReferencia || lanc.unidadeReferencia || 'VALOR') as LancamentoVariavel['unidadeReferencia'];
      const valInformado = updateBody.valor !== undefined ? parseNumeroSeguro(updateBody.valor, 0) : lanc.valor;

      const novoValor =
        updateBody.valor !== undefined && valInformado > 0
          ? Math.round(valInformado * 100) / 100
          : updateBody.referencia !== undefined || updateBody.rubricaCodigo !== undefined || updateBody.unidadeReferencia !== undefined
          ? calcularValorLancamentoServidor(emp, rubricaCod, refNum, unidade, valInformado)
          : lanc.valor;

      db.lancamentos[idx] = {
        ...lanc,
        ...updateBody,
        rubricaCodigo: rubricaCod,
        descricao: updateBody.descricao !== undefined ? String(updateBody.descricao).trim() || lanc.descricao : lanc.descricao,
        referencia: refNum,
        unidadeReferencia: unidade,
        valor: novoValor,
        id: lanc.id,
        empregadoId: lanc.empregadoId,
        competencia: lanc.competencia,
      };
      salvarDB();

      if (emp) {
        recalcularCompetenciaInterna(emp.empresaId, lanc.competencia, emp.id);
      }

      res.json(db.lancamentos[idx]);
    } catch (err: any) {
      console.error('Erro ao editar lançamento:', err);
      res.status(500).json({ error: err?.message || 'Erro interno ao editar evento.' });
    }
  });

  app.delete('/api/lancamentos-variaveis/:id', (req, res) => {
    try {
      const lanc = db.lancamentos.find(l => l.id === req.params.id);
      if (!lanc) return res.status(404).json({ error: 'Lançamento não encontrado.' });

      const emp = db.empregados.find(e => e.id === lanc.empregadoId);
      if (emp) {
        const compStatus = db.competenciasStatus[`${emp.empresaId}_${lanc.competencia}`];
        if (compStatus?.status === 'FECHADA') {
          return res.status(400).json({ error: `A competência ${lanc.competencia} está FECHADA. Reabra antes de excluir eventos.` });
        }
      }

      db.lancamentos = db.lancamentos.filter(l => l.id !== req.params.id);
      salvarDB();

      if (emp) {
        recalcularCompetenciaInterna(emp.empresaId, lanc.competencia, emp.id);
      }

      res.json({ success: true, message: 'Evento excluído e folha recalculada.' });
    } catch (err: any) {
      console.error('Erro ao excluir lançamento:', err);
      res.status(500).json({ error: err?.message || 'Erro interno ao excluir evento.' });
    }
  });

  app.post('/api/lancamentos-variaveis/lote', (req, res) => {
    try {
      const {
        lancamentos,
        empresa: empresaPayload,
        empregados: empregadosPayload,
      } = req.body || {};

      sincronizarContextoEmpresaEmpregados(empresaPayload, undefined, empregadosPayload);

      if (!Array.isArray(lancamentos) || lancamentos.length === 0) {
        return res.status(400).json({ error: 'Nenhum lançamento fornecido.' });
      }

      const criados: LancamentoVariavel[] = [];
      const empIdsAfetados = new Set<string>();
      let compAfetada = '';
      let empresaIdAfetada = '';

      for (const l of lancamentos) {
        const emp = db.empregados.find(e => e.id === l.empregadoId);
        const refNum = parseNumeroSeguro(l.referencia, 1);
        const valInformado = parseNumeroSeguro(l.valor, 0);
        const unidade = (l.unidadeReferencia || 'VALOR') as LancamentoVariavel['unidadeReferencia'];
        const rubricaCod = String(l.rubricaCodigo || '0105');
        const valorFinal = calcularValorLancamentoServidor(emp, rubricaCod, refNum, unidade, valInformado);

        const novo: LancamentoVariavel = {
          id: l.id || `lanc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          empregadoId: String(l.empregadoId),
          competencia: String(l.competencia),
          rubricaCodigo: rubricaCod,
          descricao: String(l.descricao || 'Evento Variável').trim(),
          referencia: refNum,
          unidadeReferencia: unidade,
          valor: valorFinal,
          origem: l.origem || 'MANUAL',
          comprovanteNome: l.comprovanteNome,
          observacao: l.observacao,
        };
        db.lancamentos.push(novo);
        criados.push(novo);
        empIdsAfetados.add(novo.empregadoId);
        compAfetada = novo.competencia;

        if (emp) empresaIdAfetada = emp.empresaId;
      }

      salvarDB();

      if (empresaIdAfetada && compAfetada) {
        for (const empId of empIdsAfetados) {
          recalcularCompetenciaInterna(empresaIdAfetada, compAfetada, empId);
        }
      }

      res.status(201).json({ success: true, count: criados.length, lancamentos: criados });
    } catch (err: any) {
      console.error('Erro ao salvar lançamentos em lote:', err);
      res.status(500).json({ error: err?.message || 'Erro interno ao gravar eventos em lote.' });
    }
  });

  // Férias: Consulta e Programação
  app.get('/api/ferias/:empresaId', (req, res) => {
    const { empresaId } = req.params;
    const list = db.ferias.filter(f => f.empresaId === empresaId);
    res.json(list);
  });

  app.post('/api/ferias/programar', (req, res) => {
    const { empregadoId, dataInicio, diasGozo, abonoPecuniario, adiantamento13 } = req.body;
    const emp = db.empregados.find(e => e.id === empregadoId);
    if (!emp) return res.status(404).json({ error: 'Empregado não encontrado' });

    const calculo = calcularFeriasComApropriacao(emp, dataInicio, diasGozo, abonoPecuniario, adiantamento13);

    let registro = db.ferias.find(f => f.empregadoId === empregadoId);
    if (!registro) {
      registro = {
        id: `fer-${empregadoId}`,
        empregadoId,
        empresaId: emp.empresaId,
        periodoAquisitivoInicio: '2024-05-01',
        periodoAquisitivoFim: '2025-04-30',
        periodoConcessivoFim: '2026-04-30',
        saldoDiasDireito: 30,
        faltasInjustificadas: 0,
        diasGozados: 0,
        saldoDiasRestantes: 30,
        status: 'PROGRAMADA',
        programacoes: [],
      };
      db.ferias.push(registro);
    }

    const novaProg = {
      id: `prog-${Date.now()}`,
      dataInicio,
      dataFim: calculo.dataFim,
      diasGozo: calculo.diasGozo,
      abonoPecuniario: !!abonoPecuniario,
      diasAbono: calculo.diasAbono,
      adiantamento13: !!adiantamento13,
      competenciaApropriacao: calculo.atravessaMeses ? [calculo.apropriacao.mes1.competencia, calculo.apropriacao.mes2!.competencia] : [calculo.apropriacao.mes1.competencia],
      diasMes1: {
        competencia: calculo.apropriacao.mes1.competencia,
        dias: calculo.apropriacao.mes1.dias,
        valorProporcional: calculo.apropriacao.mes1.valor,
      },
      diasMes2: calculo.apropriacao.mes2 ? {
        competencia: calculo.apropriacao.mes2.competencia,
        dias: calculo.apropriacao.mes2.dias,
        valorProporcional: calculo.apropriacao.mes2.valor,
      } : undefined,
      totalBruto: calculo.totalBruto,
      inssFerias: calculo.valorINSSFerias,
      irrfFerias: calculo.valorIRRFFerias,
      valorLiquido: calculo.valorLiquido,
      status: 'SOLICITADA' as const,
      dataLimitePagamento: calculo.dataLimitePagamento,
    };

    registro.programacoes.push(novaProg);
    salvarDB();
    res.json({ success: true, programacao: novaProg, calculo });
  });

  // Rescisão: Listagem, Simulação, Confirmação e Cancelamento
  app.get('/api/rescisoes/:empresaId', (req, res) => {
    const { empresaId } = req.params;
    const list = db.rescisoes.filter(r => r.empresaId === empresaId && r.status !== 'CANCELADA');
    res.json(list);
  });

  app.post('/api/rescisao/simular', (req, res) => {
    try {
      const { empregadoId, motivo, dataDesligamento, tipoAviso, saldoFGTSComprovado, adiantamentoPago, empregado } = req.body || {};
      let emp = db.empregados.find(e => e.id === empregadoId);
      if (!emp && empregado && empregado.id === empregadoId) {
        emp = empregado as Empregado;
      }
      if (!emp) return res.status(404).json({ error: 'Empregado não encontrado' });

      const rescisao = calcularRescisaoCompleta(
        emp,
        motivo,
        dataDesligamento,
        tipoAviso,
        Number(saldoFGTSComprovado || 0),
        Number(adiantamentoPago || 0)
      );

      res.json(rescisao);
    } catch (err: any) {
      console.error('Erro ao simular rescisão:', err);
      res.status(500).json({ error: err?.message || 'Erro ao calcular simulação de rescisão.' });
    }
  });

  app.post('/api/rescisao/confirmar', (req, res) => {
    try {
      const body = req.body || {};
      const rescisaoData: RescisaoSimulada = body.rescisao ? body.rescisao : body;
      let emp = db.empregados.find(e => e.id === rescisaoData.empregadoId);
      if (!emp && body.empregado && body.empregado.id === rescisaoData.empregadoId) {
        emp = body.empregado as Empregado;
        db.empregados.push(emp);
      }
      if (!emp) return res.status(404).json({ error: 'Empregado não encontrado' });

      rescisaoData.status = 'CONFIRMADA';
      rescisaoData.dataConfirmacao = new Date().toISOString();

      emp.status = 'desligado';
      emp.dataDesligamento = rescisaoData.dataDesligamento;

      // Salva ou atualiza rescisão no histórico
      const idxResc = db.rescisoes.findIndex(r => r.id === rescisaoData.id);
      if (idxResc >= 0) {
        db.rescisoes[idxResc] = rescisaoData;
      } else {
        db.rescisoes.push(rescisaoData);
      }

      // Emite documento TRCT no repositório de documentos
      const trctDocId = `doc-trct-${rescisaoData.id}`;
      if (!db.documentos.some(d => d.id === trctDocId)) {
        db.documentos.push({
          id: trctDocId,
          empresaId: emp.empresaId,
          empregadoId: emp.id,
          tipo: 'TRCT',
          titulo: `TRCT e Termo de Homologação - ${emp.nomeCompleto}`,
          conteudoHtml: 'Termo de Rescisão do Contrato de Trabalho gerado na homologação.',
          dataEmissao: rescisaoData.dataDesligamento,
          status: 'EMITIDO',
          versao: 1,
        });
      }

      // Cria evento eSocial S-2299 (Desligamento)
      const eventoS2299: ESocialEvento = {
        id: `es-2299-${Date.now()}`,
        codigoEvento: 'S-2299',
        descricao: `Desligamento do Trabalhador - ${emp.nomeCompleto}`,
        empregadoNome: emp.nomeCompleto,
        statusEnvio: 'GERADO',
        dataTransmissao: new Date().toISOString(),
        arquivoXmlSimulado: `<?xml version="1.0" encoding="UTF-8"?><eSocial><evtDeslig><cpfTrab>${emp.cpf}</cpfTrab><dtDeslig>${rescisaoData.dataDesligamento}</dtDeslig><mtvDeslig>${rescisaoData.motivo}</mtvDeslig></evtDeslig></eSocial>`,
      };
      db.esocial.unshift(eventoS2299);

      salvarDB();
      res.json({ success: true, rescisao: rescisaoData, empregado: emp, esocial: eventoS2299 });
    } catch (err: any) {
      console.error('Erro ao confirmar rescisão:', err);
      res.status(500).json({ error: err?.message || 'Erro ao confirmar rescisão.' });
    }
  });

  app.post('/api/rescisao/cancelar', (req, res) => {
    try {
      const { empregadoId, rescisaoId, motivo, empregado } = req.body || {};
      if (!empregadoId) {
        return res.status(400).json({ error: 'Empregado é obrigatório para cancelar a rescisão.' });
      }

      let emp = db.empregados.find(e => e.id === empregadoId);
      if (!emp && empregado && empregado.id === empregadoId) {
        emp = empregado as Empregado;
        db.empregados.push(emp);
      }
      if (!emp) return res.status(404).json({ error: 'Empregado não encontrado' });

      const agora = new Date().toISOString();
      let canceladas = 0;
      for (const r of db.rescisoes) {
        if (r.empregadoId === empregadoId && r.status !== 'CANCELADA' && (!rescisaoId || r.id === rescisaoId)) {
          r.status = 'CANCELADA';
          r.dataCancelamento = agora;
          r.motivoCancelamento = motivo || 'Cancelada pelo operador do DP';
          canceladas++;
        }
      }

      // Reativa o vínculo do colaborador
      emp.status = 'ativo';
      delete emp.dataDesligamento;
      if (!emp.historicoAlteracoes) emp.historicoAlteracoes = [];
      emp.historicoAlteracoes.push({
        id: `hist-cancel-resc-${Date.now()}`,
        dataVigencia: agora.split('T')[0],
        dataRegistro: agora.split('T')[0],
        tipo: 'LOTACAO',
        valorAnterior: 'Desligado',
        valorNovo: 'Ativo (Rescisão Cancelada)',
        motivo: motivo || 'Cancelamento de rescisão contratual',
        responsavel: 'Operador DP',
      });

      // Remove TRCT associado caso não assinado
      db.documentos = db.documentos.filter(
        d => !(d.empregadoId === empregadoId && d.tipo === 'TRCT' && d.status !== 'RECIBO_ASSINADO')
      );

      db.auditoriaLogs.unshift({
        id: `log-cancel-resc-${Date.now()}`,
        dataHora: agora,
        usuario: 'Operador DP',
        acao: 'CANCELAMENTO_RESCISAO',
        detalhes: { empresaId: emp.empresaId, empregadoId, motivo, canceladas },
      });

      salvarDB();
      res.json({
        success: true,
        empregado: emp,
        rescisoesCanceladas: canceladas,
        message: `Rescisão de ${emp.nomeCompleto} cancelada e vínculo reativado com sucesso.`,
      });
    } catch (err: any) {
      console.error('Erro ao cancelar rescisão:', err);
      res.status(500).json({ error: err?.message || 'Erro ao cancelar rescisão.' });
    }
  });

  // Documentos e Recibos (Emitido -> Pago -> Assinado)
  app.get('/api/documentos/:empresaId', (req, res) => {
    const empresaId = req.params.empresaId;
    const ativosEmpresa = db.empregados.filter(
      e => e.empresaId === empresaId && e.status !== 'em_admissao'
    );
    let adicionou = false;
    for (const emp of ativosEmpresa) {
      const temContrato = db.documentos.some(
        d =>
          d.empregadoId === emp.id &&
          (d.tipo === 'CONTRATO_EXPERIENCIA' || d.tipo === 'CONTRATO_TRABALHO_CLT')
      );
      if (!temContrato) {
        db.documentos.push({
          id: `doc-contrato-${emp.id}`,
          empresaId: emp.empresaId,
          empregadoId: emp.id,
          tipo: emp.tipoContrato === 'EXPERIENCIA_45_45' ? 'CONTRATO_EXPERIENCIA' : 'CONTRATO_TRABALHO_CLT',
          titulo:
            emp.tipoContrato === 'EXPERIENCIA_45_45'
              ? 'Contrato de Experiência (45+45 dias)'
              : 'Contrato Individual de Trabalho CLT',
          conteudoHtml: 'Contrato gerado automaticamente na admissão.',
          dataEmissao: emp.dataAdmissao || emp.dataPrevisaoInicio || new Date().toISOString().split('T')[0],
          status: 'EMITIDO',
          versao: 1,
        });
        adicionou = true;
      }
    }
    if (adicionou) salvarDB();

    const list = db.documentos.filter(d => d.empresaId === empresaId);
    res.json(list);
  });

  app.post('/api/documentos/status', (req, res) => {
    const { documentoId, status, dataPagamento, dataAssinatura, assinanteNome, comprovanteAnexo } = req.body;
    const doc = db.documentos.find(d => d.id === documentoId);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });

    doc.status = status;
    if (dataPagamento) doc.dataPagamento = dataPagamento;
    if (dataAssinatura) doc.dataAssinatura = dataAssinatura;
    if (assinanteNome) doc.assinanteNome = assinanteNome;
    if (comprovanteAnexo) doc.comprovanteAnexo = comprovanteAnexo;

    salvarDB();
    res.json(doc);
  });

  // Movimentações Mensais (Empresa enviando ao DP)
  app.get(
    [
      '/api/movimentacoes',
      '/api/movimentacoes/:empresaId',
      '/api/movimentacoes/:empresaId/:competencia',
      '/api/movimentacoes/:empresaId/:mes/:ano',
    ],
    (req, res) => {
      const empresaId = req.params.empresaId || (req.query.empresaId as string) || '';
      let competencia = req.params.competencia || (req.query.competencia as string) || '';
      if (!competencia && req.params.mes && req.params.ano) {
        competencia = `${req.params.mes}/${req.params.ano}`;
      }
      if (competencia) {
        competencia = decodeURIComponent(competencia);
      }
      const list = db.movimentacoes.filter(
        m => (!empresaId || m.empresaId === empresaId) && (!competencia || m.competencia === competencia)
      );
      res.json(list);
    }
  );

  app.post('/api/movimentacoes', (req, res) => {
    const nova: MovimentacaoMensalEmpresa = {
      ...req.body,
      id: `mov-${Date.now()}`,
      status: 'ENVIADO',
      dataEnvio: new Date().toISOString(),
    };
    db.movimentacoes.unshift(nova);
    salvarDB();
    res.status(201).json(nova);
  });

  // Agenda e Afastamentos
  app.get('/api/agenda/:empresaId', (req, res) => {
    const list = db.agenda.filter(a => a.empresaId === req.params.empresaId);
    res.json(list);
  });

  app.get('/api/afastamentos/:empresaId', (req, res) => {
    const list = db.afastamentos.filter(a => a.empresaId === req.params.empresaId);
    res.json(list);
  });

  app.post('/api/afastamentos', (req, res) => {
    const novo: Afastamento = {
      ...req.body,
      id: `afast-${Date.now()}`,
    };
    db.afastamentos.unshift(novo);
    salvarDB();
    res.status(201).json(novo);
  });

  // eSocial
  app.get('/api/esocial/:empresaId', (_req, res) => {
    res.json(db.esocial);
  });

  app.post('/api/esocial/transmitir', (req, res) => {
    const { eventoId } = req.body;
    const evento = db.esocial.find(e => e.id === eventoId);
    if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });

    evento.statusEnvio = 'PROCESSADO_COM_SUCESSO';
    evento.numeroRecibo = `1.2.202605.${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;
    evento.numeroProtocolo = `PROT-ES-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    evento.dataTransmissao = new Date().toISOString();

    salvarDB();
    res.json(evento);
  });

  // Assistente de IA Especialista em DP e CLT Brasileira via Gemini SDK
  app.post('/api/ai/consultar', async (req, res) => {
    try {
      const { pergunta, contexto } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.json({
          resposta: `**Orientação do Especialista em DP (Modo Determinístico):**\n\nPara a dúvida apresentada: "${pergunta}"\n\n- **Base Legal:** Consolidação das Leis do Trabalho (CLT), Emenda Constitucional 103/2019 e Lei 14.663/2023.\n- **Regra Prática:** No cálculo da folha, garanta que os lançamentos de horas extras e comissões componham as bases de INSS, FGTS e tenham reflexo direto no DSR (Lei 605/49).\n- **Conferência:** O desconto de vale-transporte é limitado a 6% do salário base ou custo do benefício (o que for menor). Para rescisão, o pagamento deve ocorrer estritamente em até 10 dias corridos do término contratual (Art. 477 § 6º).`,
        });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é um Consultor Jurídico Trabalhista e Especialista Sênior em Departamento Pessoal no Brasil (CLT, eSocial, Previdência, FGTS Digital e Receita Federal).
Contexto do sistema Departamento Fácil: ${JSON.stringify(contexto || {})}
Pergunta do usuário: "${pergunta}"

Forneça uma resposta clara, técnica, precisa e prática em Português do Brasil com:
1. Resumo direto e conclusivo
2. Fundamentação legal (artigos da CLT, Leis, Súmulas do TST ou Instruções Normativas)
3. Regra de cálculo ou memória aritmética aplicável
4. Cuidados para o fechamento da folha e envio ao eSocial.
Mantenha a resposta concisa, profissional e didática.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ resposta: response.text });
    } catch (err: any) {
      console.error('Erro ao consultar Gemini:', err);
      res.json({
        resposta: 'O assistente de DP identificou a questão. Recomenda-se aplicar o cálculo determinístico conforme os parâmetros da CLT e verificar os comprovantes antes de fechar a competência.',
      });
    }
  });

  // Consulta de CNPJ em tempo real com fallback duplo (BrasilAPI -> ReceitaWS)
  app.get('/api/cnpj/:cnpj', async (req, res) => {
    const cnpjLimpo = (req.params.cnpj || '').replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return res.status(400).json({ error: 'CNPJ deve conter 14 dígitos numéricos.' });
    }

    // 1. Tentar BrasilAPI
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'DepartamentoFacil/1.0' },
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data: any = await resp.json();
        return res.json({
          razaoSocial: data.razao_social || '',
          nomeFantasia: data.nome_fantasia || data.razao_social || '',
          cnaePrincipal: data.cnae_fiscal ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao || ''}` : '',
          logradouro: data.logradouro || '',
          numero: data.numero || '',
          bairro: data.bairro || '',
          cidade: data.municipio || '',
          uf: data.uf || '',
          cep: data.cep || '',
          regimeTributario: data.opcao_pelo_simples ? 'SIMPLES_NACIONAL' : 'LUCRO_PRESUMIDO',
          status: data.descricao_situacao_cadastral || 'ATIVA',
        });
      }
    } catch (err) {
      console.warn('BrasilAPI falhou ou timeout:', err);
    }

    // 2. Tentar ReceitaWS
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const resp = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data: any = await resp.json();
        if (data.status !== 'ERROR') {
          const cnae = data.atividade_principal?.[0];
          return res.json({
            razaoSocial: data.nome || '',
            nomeFantasia: data.fantasia || data.nome || '',
            cnaePrincipal: cnae ? `${cnae.code} - ${cnae.text}` : '',
            logradouro: data.logradouro || '',
            numero: data.numero || '',
            bairro: data.bairro || '',
            cidade: data.municipio || '',
            uf: data.uf || '',
            cep: data.cep ? data.cep.replace(/\D/g, '') : '',
            regimeTributario: data.simples?.optante ? 'SIMPLES_NACIONAL' : 'LUCRO_PRESUMIDO',
            status: data.situacao || 'ATIVA',
          });
        }
      }
    } catch (err) {
      console.warn('ReceitaWS falhou ou timeout:', err);
    }

    return res.status(404).json({
      error: 'Não foi possível consultar automaticamente o CNPJ na Receita Federal. Preencha os campos manualmente.',
    });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Rota da API não encontrada.' });
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API Error]', err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({
      error: typeof err?.message === 'string' ? err.message : 'Erro interno do servidor.',
    });
  });

  export default app;
