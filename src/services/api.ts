import { Empresa, Empregado, FolhaEmpregado, CompetenciaFolha, LancamentoVariavel, PeriodoFerias, RescisaoSimulada, ContratoDocumento, Afastamento, ItemAgendaObrigacao, ESocialEvento, MovimentacaoMensalEmpresa, MotivoRescisao } from '../types/dp';
import { EMPRESAS_INICIAIS, EMPREGADOS_INICIAIS } from '../data/initialData';
import { validarCPF } from '../utils/formatters';
import { calcularRescisaoCompleta } from './calculosFeriasRescisao';

// URL base configurável via variável de ambiente VITE_API_URL (aceita apenas URLs HTTP/HTTPS válidas)
const rawApiUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  ''
).trim();
const API_BASE_URL = /^https?:\/\//i.test(rawApiUrl) ? rawApiUrl.replace(/\/$/, '') : '';

// Cache local de segurança para contingência caso a rota do servidor esteja offline ou em deploy estático puro
const CACHE_EMPRESAS_KEY = 'dp_facil_empresas_cache_v1';
const CACHE_DELETED_EMPRESAS_KEY = 'dp_facil_empresas_deleted_v1';

function getDeletedEmpresasIds(): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set();
    const raw = localStorage.getItem(CACHE_DELETED_EMPRESAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    }
  } catch {
    // ignora erro de leitura
  }
  return new Set();
}

function markEmpresaDeletedLocal(id: string) {
  try {
    if (typeof window === 'undefined') return;
    const ids = getDeletedEmpresasIds();
    ids.add(id);
    localStorage.setItem(CACHE_DELETED_EMPRESAS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignora erro de escrita
  }
}

function unmarkEmpresaDeletedLocal(id: string) {
  try {
    if (typeof window === 'undefined') return;
    const ids = getDeletedEmpresasIds();
    if (ids.delete(id)) {
      localStorage.setItem(CACHE_DELETED_EMPRESAS_KEY, JSON.stringify(Array.from(ids)));
    }
  } catch {
    // ignora erro de escrita
  }
}

function getEmpresasCache(): Empresa[] {
  const deleted = getDeletedEmpresasIds();
  try {
    if (typeof window === 'undefined') return EMPRESAS_INICIAIS;
    const item = localStorage.getItem(CACHE_EMPRESAS_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed)) {
        return parsed.filter((e: Empresa) => !deleted.has(e.id));
      }
    }
  } catch (e) {
    console.warn('Erro ao ler cache local de empresas:', e);
  }
  return EMPRESAS_INICIAIS.filter(e => !deleted.has(e.id));
}

function setEmpresasCache(empresas: Empresa[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_EMPRESAS_KEY, JSON.stringify(empresas));
    }
  } catch (e) {
    console.warn('Erro ao gravar cache local de empresas:', e);
  }
}

const CACHE_EMPREGADOS_KEY = 'dp_facil_empregados_cache_v1';
const CACHE_DELETED_EMPREGADOS_KEY = 'dp_facil_empregados_deleted_v1';

function getDeletedEmpregadosIds(): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set();
    const raw = localStorage.getItem(CACHE_DELETED_EMPREGADOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    }
  } catch {
    // ignora
  }
  return new Set();
}

function markEmpregadoDeletedLocal(id: string) {
  try {
    if (typeof window === 'undefined') return;
    const ids = getDeletedEmpregadosIds();
    ids.add(id);
    localStorage.setItem(CACHE_DELETED_EMPREGADOS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignora
  }
}

function unmarkEmpregadoDeletedLocal(id: string) {
  try {
    if (typeof window === 'undefined') return;
    const ids = getDeletedEmpregadosIds();
    if (ids.delete(id)) {
      localStorage.setItem(CACHE_DELETED_EMPREGADOS_KEY, JSON.stringify(Array.from(ids)));
    }
  } catch {
    // ignora
  }
}

function getEmpregadosCache(): Empregado[] {
  const deleted = getDeletedEmpregadosIds();
  try {
    if (typeof window === 'undefined') return EMPREGADOS_INICIAIS;
    const item = localStorage.getItem(CACHE_EMPREGADOS_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed)) {
        return parsed.filter((e: Empregado) => !deleted.has(e.id));
      }
    }
  } catch (e) {
    console.warn('Erro ao ler cache local de colaboradores:', e);
  }
  return EMPREGADOS_INICIAIS.filter(e => !deleted.has(e.id));
}

function setEmpregadosCache(empregados: Empregado[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_EMPREGADOS_KEY, JSON.stringify(empregados));
    }
  } catch (e) {
    console.warn('Erro ao gravar cache local de colaboradores:', e);
  }
}

const CACHE_COMPETENCIAS_KEY = 'dp_facil_competencias_cache_v1';
const CACHE_DELETED_COMPETENCIAS_KEY = 'dp_facil_competencias_deleted_v1';
const CACHE_DOCUMENTOS_KEY = 'dp_facil_documentos_cache_v1';
const CACHE_RESCISOES_KEY = 'dp_facil_rescisoes_cache_v1';

function compKey(empresaId: string, competencia: string) {
  return `${empresaId}_${competencia}`;
}

function getDeletedCompetenciasKeys(): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set();
    const raw = localStorage.getItem(CACHE_DELETED_COMPETENCIAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    }
  } catch {
    // ignora
  }
  return new Set();
}

function markCompetenciaDeletedLocal(empresaId: string, competencia: string) {
  try {
    if (typeof window === 'undefined') return;
    const keys = getDeletedCompetenciasKeys();
    keys.add(compKey(empresaId, competencia));
    localStorage.setItem(CACHE_DELETED_COMPETENCIAS_KEY, JSON.stringify(Array.from(keys)));
  } catch {
    // ignora
  }
}

function unmarkCompetenciaDeletedLocal(empresaId: string, competencia: string) {
  try {
    if (typeof window === 'undefined') return;
    const keys = getDeletedCompetenciasKeys();
    if (keys.delete(compKey(empresaId, competencia))) {
      localStorage.setItem(CACHE_DELETED_COMPETENCIAS_KEY, JSON.stringify(Array.from(keys)));
    }
  } catch {
    // ignora
  }
}

function getCompetenciasCache(): CompetenciaFolha[] {
  const deleted = getDeletedCompetenciasKeys();
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(CACHE_COMPETENCIAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((c: CompetenciaFolha) => !deleted.has(compKey(c.empresaId, c.competencia)));
      }
    }
  } catch {
    // ignora
  }
  return [];
}

function setCompetenciasCache(competencias: CompetenciaFolha[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_COMPETENCIAS_KEY, JSON.stringify(competencias));
    }
  } catch {
    // ignora
  }
}

function ordenarCompetencias(list: CompetenciaFolha[]): CompetenciaFolha[] {
  return [...list].sort((a, b) => {
    const pA = (a.competencia || '').split('/');
    const pB = (b.competencia || '').split('/');
    const mA = parseInt(pA[0], 10) || 1;
    const yA = parseInt(pA[1], 10) || 2026;
    const mB = parseInt(pB[0], 10) || 1;
    const yB = parseInt(pB[1], 10) || 2026;
    return yB * 100 + mB - (yA * 100 + mA);
  });
}

function getDocumentosCache(): ContratoDocumento[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(CACHE_DOCUMENTOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignora
  }
  return [];
}

function setDocumentosCache(docs: ContratoDocumento[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_DOCUMENTOS_KEY, JSON.stringify(docs));
    }
  } catch {
    // ignora
  }
}

function ensureContratoAdmissaoLocal(emp: Empregado): ContratoDocumento | null {
  if (!emp || !emp.id || emp.status === 'em_admissao') return null;
  const docs = getDocumentosCache();
  const existente = docs.find(
    d =>
      d.empregadoId === emp.id &&
      (d.tipo === 'CONTRATO_EXPERIENCIA' || d.tipo === 'CONTRATO_TRABALHO_CLT')
  );
  if (existente) return existente;

  const novoDoc: ContratoDocumento = {
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
  };
  setDocumentosCache([...docs, novoDoc]);
  return novoDoc;
}

function getRescisoesCache(): RescisaoSimulada[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(CACHE_RESCISOES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignora
  }
  return [];
}

function setRescisoesCache(rescisoes: RescisaoSimulada[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_RESCISOES_KEY, JSON.stringify(rescisoes));
    }
  } catch {
    // ignora
  }
}

function extractErrorMessage(payload: any, fallback: string): string {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload.trim() || fallback;

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }
  if (payload.error && typeof payload.error === 'object') {
    const nested = payload.error.message || payload.error.error || payload.error.code;
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim();
    }
  }
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }
  if (payload.message && typeof payload.message === 'object') {
    const nested = payload.message.message || payload.message.error;
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim();
    }
  }
  return fallback;
}

/**
 * Função utilitária central de requisição segura.
 * - Verifica o status HTTP antes de processar
 * - Verifica o cabeçalho Content-Type para evitar parse de HTML como JSON
 * - Fornece mensagens descritivas para 404, falhas de rota na Vercel e erros de servidor
 */
async function requestJson<T>(
  url: string,
  options?: RequestInit,
  actionDescription: string = 'processar requisição',
  retryCount: number = 0
): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  let res: Response;

  const reqHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  try {
    res = await fetch(fullUrl, {
      ...options,
      headers: reqHeaders,
    });
  } catch (netErr: any) {
    const err = new Error(
      `Falha de conexão com o servidor ao ${actionDescription}: ${netErr.message || 'Verifique sua conexão de rede ou a URL da API.'}`
    ) as any;
    err.isBackendUnavailable = true;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!res.ok) {
    if (isJson) {
      let errPayload: any = null;
      try {
        errPayload = await res.json();
      } catch {
        // Se falhar o parse do JSON de erro, prossegue com o texto
      }

      if (errPayload) {
        const isPlatformErrorObj =
          typeof errPayload.error === 'object' && errPayload.error !== null;
        const msg = extractErrorMessage(
          errPayload,
          `Erro HTTP ${res.status} ao ${actionDescription}`
        );
        const error = new Error(msg) as any;
        error.status = res.status;
        error.vinculos = errPayload.vinculos;
        error.podeInativar = errPayload.podeInativar;
        error.podeForcar = errPayload.podeForcar;
        error.count = errPayload.count;
        error.sugestao = errPayload.sugestao;
        error.podeDesligar = errPayload.podeDesligar;
        error.isBackendUnavailable = res.status >= 500 || isPlatformErrorObj;
        throw error;
      }
    }

    // Se a resposta não for JSON (por exemplo, página 404 HTML da Vercel "The page could not be found...")
    const rawText = await res.text().catch(() => '');
    if (res.status === 404 || rawText.includes('The page') || rawText.includes('404')) {
      const err = new Error(
        `Serviço de API não encontrado (HTTP 404 em "${url}"). Verifique se as rotas da Vercel (vercel.json / Serverless Function) ou a variável VITE_API_URL estão configuradas.`
      ) as any;
      err.status = 404;
      err.isNotFound = true;
      err.isBackendUnavailable = true;
      throw err;
    }

    const err = new Error(
      `O servidor retornou status ${res.status} (${res.statusText || 'Erro'}) ao ${actionDescription}.`
    ) as any;
    err.status = res.status;
    err.isBackendUnavailable = res.status >= 500;
    throw err;
  }

  if (!isJson) {
    // Se o servidor retornou HTML temporariamente (ex: reload do dev-server ou Vite iniciando), tenta 1 retry rápido
    if (retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 350));
      return requestJson<T>(url, options, actionDescription, 1);
    }

    const rawText = await res.text().catch(() => '');
    if (rawText.includes('The page') || rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
      const err = new Error(
        `Resposta inesperada do servidor (HTML em vez de JSON ao ${actionDescription}). O endpoint "${url}" não está roteando para o backend.`
      ) as any;
      err.isHtmlResponse = true;
      err.isBackendUnavailable = true;
      throw err;
    }
    throw new Error(
      `Servidor retornou formato não suportado (${contentType || 'desconhecido'}) ao ${actionDescription}.`
    );
  }

  return res.json();
}

export const api = {
  async getStatus() {
    return requestJson('/api/status', undefined, 'verificar status do sistema');
  },

  // Consulta de CNPJ com fallback em cascata (Backend -> BrasilAPI -> ReceitaWS)
  async consultarCNPJ(cnpj: string): Promise<{
    razaoSocial: string;
    nomeFantasia: string;
    cnaePrincipal: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    regimeTributario: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
    status?: string;
  }> {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ deve conter 14 dígitos numéricos.');
    }

    // 1. Tentar rota do backend (/api/cnpj/:cnpj)
    try {
      const dados = await requestJson<any>(`/api/cnpj/${cnpjLimpo}`, undefined, 'consultar CNPJ no servidor');
      if (dados && (dados.razaoSocial || dados.nome)) {
        return {
          razaoSocial: dados.razaoSocial || dados.nome || '',
          nomeFantasia: dados.nomeFantasia || dados.fantasia || dados.razaoSocial || dados.nome || '',
          cnaePrincipal: dados.cnaePrincipal || '',
          logradouro: dados.logradouro || '',
          numero: dados.numero || '',
          bairro: dados.bairro || '',
          cidade: dados.cidade || dados.municipio || '',
          uf: dados.uf || '',
          cep: dados.cep ? dados.cep.replace(/\D/g, '') : '',
          regimeTributario: dados.regimeTributario || 'SIMPLES_NACIONAL',
          status: dados.status || 'ATIVA',
        };
      }
    } catch (err: any) {
      console.warn('[CNPJ] Consulta via backend falhou, tentando fallback direto client-side:', err.message);
    }

    // 2. Fallback direto client-side na BrasilAPI
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (resp.ok) {
        const data = await resp.json();
        return {
          razaoSocial: data.razao_social || '',
          nomeFantasia: data.nome_fantasia || data.razao_social || '',
          cnaePrincipal: data.cnae_fiscal ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao || ''}` : '',
          logradouro: data.logradouro || '',
          numero: data.numero || '',
          bairro: data.bairro || '',
          cidade: data.municipio || '',
          uf: data.uf || '',
          cep: data.cep ? data.cep.replace(/\D/g, '') : '',
          regimeTributario: data.opcao_pelo_simples ? 'SIMPLES_NACIONAL' : 'LUCRO_PRESUMIDO',
          status: data.descricao_situacao_cadastral || 'ATIVA',
        };
      }
    } catch (directErr) {
      console.warn('[CNPJ] Consulta direta BrasilAPI falhou:', directErr);
    }

    // 3. Fallback no ReceitaWS via JSONP / CORS proxy ou fetch simples
    try {
      const resp = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.status !== 'ERROR') {
          const cnae = data.atividade_principal?.[0];
          return {
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
          };
        }
      }
    } catch (wsErr) {
      console.warn('[CNPJ] Consulta ReceitaWS falhou:', wsErr);
    }

    throw new Error('Não foi possível consultar os dados do CNPJ automaticamente na Receita. O formulário está disponível para preenchimento manual.');
  },

  async getEmpresas(): Promise<Empresa[]> {
    try {
      const empresas = await requestJson<Empresa[]>('/api/empresas', undefined, 'carregar empresas');
      if (Array.isArray(empresas)) {
        const deleted = getDeletedEmpresasIds();
        const filtradas = empresas.filter(e => !deleted.has(e.id));
        setEmpresasCache(filtradas);
        return filtradas;
      }
    } catch (err: any) {
      console.warn('[Departamento Fácil] API /api/empresas indisponível, recorrendo ao cache local persistente:', err.message);
    }
    return getEmpresasCache();
  },

  async salvarEmpresa(empresa: Partial<Empresa>): Promise<Empresa> {
    const method = empresa.id ? 'PUT' : 'POST';
    const url = empresa.id ? `/api/empresas/${empresa.id}` : '/api/empresas';
    const cnpjLimpo = (empresa.cnpj || '').replace(/\D/g, '');

    // Validação preventiva no client antes de chamar a rede
    const cacheAtual = getEmpresasCache();
    const duplicadoLocal = cacheAtual.some(
      e => e.id !== empresa.id && e.cnpj.replace(/\D/g, '') === cnpjLimpo
    );
    if (duplicadoLocal) {
      throw new Error('Já existe outra empresa cadastrada com este CNPJ.');
    }

    try {
      const salva = await requestJson<Empresa>(
        url,
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(empresa),
        },
        'salvar empresa'
      );

      unmarkEmpresaDeletedLocal(salva.id);
      // Atualiza cache de contingência
      const novasEmpresas = empresa.id
        ? cacheAtual.map(e => (e.id === salva.id ? salva : e))
        : [...cacheAtual, salva];
      setEmpresasCache(novasEmpresas);

      return salva;
    } catch (err: any) {
      // Se a rota de backend estiver indisponível na Vercel (404/HTML/5xx serverless),
      // salvamos no armazenamento local persistente de contingência para que o usuário não perca seu trabalho!
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        console.warn('[Departamento Fácil] Rota de backend ausente na Vercel. Persistindo com segurança no armazenamento local.');
        const empresaSalva: Empresa = {
          id: empresa.id || `emp-local-${Date.now()}`,
          razaoSocial: (empresa.razaoSocial || '').trim(),
          nomeFantasia: (empresa.nomeFantasia || empresa.razaoSocial || '').trim(),
          cnpj: cnpjLimpo,
          inscricaoEstadual: empresa.inscricaoEstadual || 'ISENTO',
          inscricaoMunicipal: empresa.inscricaoMunicipal || '',
          cnaePrincipal: empresa.cnaePrincipal || '',
          regimeTributario: empresa.regimeTributario || 'SIMPLES_NACIONAL',
          fpas: empresa.fpas || '507',
          aliquotaRat: empresa.aliquotaRat ?? 2.0,
          fap: empresa.fap ?? 1.0,
          aliquotaTerceiros: empresa.aliquotaTerceiros ?? 0,
          endereco: empresa.endereco || {
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: 'São Paulo',
            uf: 'SP',
            cep: '',
          },
          configuracoesFolha: empresa.configuracoesFolha || {
            diaPagamentoSalario: 5,
            diaAdiantamento: 20,
            percentualAdiantamento: 40,
            diaVencimentoFGTS: 20,
            diaVencimentoDCTFWeb: 15,
          },
          contatoResponsavel: empresa.contatoResponsavel || {
            nome: 'Responsável DP',
            email: 'dp@empresa.com.br',
            telefone: '(11) 99999-0000',
          },
          status: empresa.status || 'ativa',
        };

        const novasEmpresas = empresa.id
          ? cacheAtual.map(e => (e.id === empresaSalva.id ? empresaSalva : e))
          : [...cacheAtual, empresaSalva];
        setEmpresasCache(novasEmpresas);
        return empresaSalva;
      }

      // Se for outro erro (ex: validação de CNPJ ou duplicidade reportada pelo backend), repassa o erro
      throw err;
    }
  },

  async inativarEmpresa(id: string, inativa: boolean): Promise<Empresa> {
    try {
      const atualizada = await requestJson<Empresa>(
        `/api/empresas/${id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: inativa ? 'inativa' : 'ativa' }),
        },
        'alterar status da empresa'
      );
      const cache = getEmpresasCache().map(e => (e.id === id ? atualizada : e));
      setEmpresasCache(cache);
      return atualizada;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        const cache = getEmpresasCache();
        const emp = cache.find(e => e.id === id);
        if (emp) {
          emp.status = inativa ? 'inativa' : 'ativa';
          setEmpresasCache([...cache]);
          return emp;
        }
      }
      throw err;
    }
  },

  async excluirEmpresa(id: string, force: boolean = false): Promise<{ success: boolean; message: string }> {
    try {
      const res = await requestJson<{ success: boolean; message: string }>(
        `/api/empresas/${id}${force ? '?force=true' : ''}`,
        { method: 'DELETE' },
        'excluir empresa'
      );
      markEmpresaDeletedLocal(id);
      const cache = getEmpresasCache().filter(e => e.id !== id);
      setEmpresasCache(cache);
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        markEmpresaDeletedLocal(id);
        const cache = getEmpresasCache().filter(e => e.id !== id);
        setEmpresasCache(cache);
        return { success: true, message: 'Empresa removida com sucesso do armazenamento.' };
      }
      throw err;
    }
  },

  async getEmpregados(empresaId?: string): Promise<Empregado[]> {
    const url = empresaId ? `/api/empregados?empresaId=${encodeURIComponent(empresaId)}` : '/api/empregados';
    const deleted = getDeletedEmpregadosIds();
    const cacheAtual = getEmpregadosCache();
    try {
      const remotos = await requestJson<Empregado[]>(url, undefined, 'listar colaboradores');
      if (Array.isArray(remotos)) {
        const remotosFiltrados = remotos.filter(e => !deleted.has(e.id));
        const idsRemotos = new Set(remotosFiltrados.map(e => e.id));
        // Preserva colaboradores gravados em contingência local ainda não presentes no backend efêmero
        const locaisExtras = cacheAtual.filter(
          e => (!empresaId || e.empresaId === empresaId) && e.id.startsWith('emp-local-') && !idsRemotos.has(e.id)
        );
        const combinados = [...remotosFiltrados, ...locaisExtras];

        // Atualiza cache completo mantendo registros de outras empresas intactos
        const outrasEmpresas = empresaId ? cacheAtual.filter(e => e.empresaId !== empresaId) : [];
        setEmpregadosCache([...outrasEmpresas, ...combinados]);
        return combinados;
      }
    } catch (err: any) {
      console.warn('[Departamento Fácil] Erro ao carregar colaboradores do servidor, usando cache local:', err.message);
    }
    return empresaId ? cacheAtual.filter(e => e.empresaId === empresaId) : cacheAtual;
  },

  async salvarEmpregado(empregado: Partial<Empregado>): Promise<Empregado> {
    const nome = (empregado.nomeCompleto || '').trim();
    if (!nome) {
      throw new Error('Nome completo é obrigatório.');
    }
    if (!empregado.id && !empregado.empresaId) {
      throw new Error('Empresa vinculada é obrigatória.');
    }

    const cpfLimpo = (empregado.cpf || '').replace(/\D/g, '');
    if (cpfLimpo && !validarCPF(cpfLimpo)) {
      throw new Error('CPF informado é inválido.');
    }

    const cacheAtual = getEmpregadosCache();
    const empresaTargetId = empregado.empresaId || cacheAtual.find(e => e.id === empregado.id)?.empresaId || '';
    if (cpfLimpo && empresaTargetId) {
      const duplicado = cacheAtual.some(
        e =>
          e.id !== empregado.id &&
          e.empresaId === empresaTargetId &&
          (e.cpf || '').replace(/\D/g, '') === cpfLimpo &&
          e.status !== 'desligado'
      );
      if (duplicado) {
        throw new Error('Já existe um colaborador ativo cadastrado com este CPF nesta empresa.');
      }
    }

    const method = empregado.id ? 'PUT' : 'POST';
    const url = empregado.id ? `/api/empregados/${empregado.id}` : '/api/empregados';

    try {
      const salvo = await requestJson<Empregado>(
        url,
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(empregado),
        },
        'salvar colaborador'
      );

      unmarkEmpregadoDeletedLocal(salvo.id);
      const atualizado = empregado.id
        ? cacheAtual.map(e => (e.id === salvo.id ? salvo : e))
        : [...cacheAtual, salvo];
      setEmpregadosCache(atualizado);
      if (salvo.status === 'ativo') {
        ensureContratoAdmissaoLocal(salvo);
      }
      return salvo;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        console.warn('[Departamento Fácil] Backend indisponível ao salvar colaborador. Gravando no armazenamento local.');
        const existente = empregado.id ? cacheAtual.find(e => e.id === empregado.id) : undefined;
        const novoOuAtualizado: Empregado = {
          ...(existente || ({} as Empregado)),
          ...(empregado as Empregado),
          id: empregado.id || `emp-local-${Date.now()}`,
          empresaId: empresaTargetId,
          nomeCompleto: nome,
          cpf: cpfLimpo || empregado.cpf || existente?.cpf || '',
          matricula:
            empregado.matricula ||
            existente?.matricula ||
            String(cacheAtual.filter(e => e.empresaId === empresaTargetId).length + 101).padStart(5, '0'),
          historicoAlteracoes: empregado.historicoAlteracoes || existente?.historicoAlteracoes || [],
          documentosAdmissao:
            empregado.documentosAdmissao ||
            existente?.documentosAdmissao || [
              { id: 'doc-1', nome: 'Documento de Identidade (RG/CNH)', tipo: 'RG', obrigatorio: true, recebido: false, status: 'pendente' },
              { id: 'doc-2', nome: 'Cadastro de Pessoa Física (CPF)', tipo: 'CPF', obrigatorio: true, recebido: false, status: 'pendente' },
              { id: 'doc-3', nome: 'Comprovante de Residência', tipo: 'COMPROVANTE_RESIDENCIA', obrigatorio: true, recebido: false, status: 'pendente' },
              { id: 'doc-4', nome: 'Atestado de Saúde Ocupacional (ASO)', tipo: 'EXAME_ADMISSIONAL_ASO', obrigatorio: true, recebido: false, status: 'pendente' },
              { id: 'doc-5', nome: 'Carteira de Trabalho Digital', tipo: 'CTPS', obrigatorio: true, recebido: false, status: 'pendente' },
            ],
        };

        unmarkEmpregadoDeletedLocal(novoOuAtualizado.id);
        const atualizado = existente
          ? cacheAtual.map(e => (e.id === novoOuAtualizado.id ? novoOuAtualizado : e))
          : [...cacheAtual, novoOuAtualizado];
        setEmpregadosCache(atualizado);
        if (novoOuAtualizado.status === 'ativo') {
          ensureContratoAdmissaoLocal(novoOuAtualizado);
        }
        return novoOuAtualizado;
      }

      throw err;
    }
  },

  async registrarAlteracaoEmpregado(id: string, dados: { tipo: string; valorNovo: any; dataVigencia: string; motivo: string; responsavel: string }) {
    try {
      const res: any = await requestJson(
        `/api/empregados/${id}/alteracao`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        },
        'registrar alteração contratual'
      );
      if (res?.empregado) {
        const cache = getEmpregadosCache().map(e => (e.id === id ? res.empregado : e));
        setEmpregadosCache(cache);
      }
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        const cache = getEmpregadosCache();
        const emp = cache.find(e => e.id === id);
        if (emp) {
          let valorAnterior: any = '';
          if (dados.tipo === 'SALARIO') {
            valorAnterior = emp.salarioBase;
            emp.salarioBase = Number(dados.valorNovo);
          } else if (dados.tipo === 'CARGO') {
            valorAnterior = emp.cargo;
            emp.cargo = String(dados.valorNovo);
          } else if (dados.tipo === 'JORNADA') {
            valorAnterior = emp.escala;
            emp.escala = String(dados.valorNovo);
          }
          const reg = {
            id: `hist-${Date.now()}`,
            dataVigencia: dados.dataVigencia,
            dataRegistro: new Date().toISOString().split('T')[0],
            tipo: dados.tipo as any,
            valorAnterior,
            valorNovo: dados.valorNovo,
            motivo: dados.motivo,
            responsavel: dados.responsavel || 'Operador DP',
          };
          emp.historicoAlteracoes = [...(emp.historicoAlteracoes || []), reg];
          setEmpregadosCache([...cache]);
          return { empregado: emp, alteracao: reg };
        }
      }
      throw err;
    }
  },

  async aprovarAdmissao(id: string, empregadoFallback?: Empregado) {
    try {
      const res: any = await requestJson(
        `/api/empregados/${id}/aprovar-admissao`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(empregadoFallback ? { empregado: empregadoFallback } : {}),
        },
        'aprovar admissão'
      );
      if (res?.empregado) {
        const cache = getEmpregadosCache();
        const exists = cache.some(e => e.id === id);
        setEmpregadosCache(exists ? cache.map(e => (e.id === id ? res.empregado : e)) : [...cache, res.empregado]);
        ensureContratoAdmissaoLocal(res.empregado);
      }
      if (res?.contrato) {
        const docs = getDocumentosCache();
        if (!docs.some(d => d.id === res.contrato.id)) {
          setDocumentosCache([...docs, res.contrato]);
        }
      }
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        const cache = getEmpregadosCache();
        const emp = cache.find(e => e.id === id) || empregadoFallback;
        if (emp) {
          emp.status = 'ativo';
          emp.dataAdmissao = emp.dataPrevisaoInicio || emp.dataAdmissao || new Date().toISOString().split('T')[0];
          const exists = cache.some(e => e.id === emp.id);
          setEmpregadosCache(exists ? cache.map(e => (e.id === emp.id ? emp : e)) : [...cache, emp]);
          const contrato = ensureContratoAdmissaoLocal(emp);
          return { success: true, empregado: emp, contrato };
        }
      }
      throw err;
    }
  },

  async excluirEmpregado(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await requestJson<{ success: boolean; message: string }>(
        `/api/empregados/${id}`,
        { method: 'DELETE' },
        'excluir colaborador'
      );
      markEmpregadoDeletedLocal(id);
      setEmpregadosCache(getEmpregadosCache().filter(e => e.id !== id));
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        markEmpregadoDeletedLocal(id);
        setEmpregadosCache(getEmpregadosCache().filter(e => e.id !== id));
        return { success: true, message: 'Colaborador excluído com sucesso do armazenamento.' };
      }
      throw err;
    }
  },

  async registrarDesligamento(id: string, dados: { dataDesligamento: string; motivo: string; observacoes?: string }) {
    try {
      const res: any = await requestJson(
        `/api/empregados/${id}/desligamento`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        },
        'registrar desligamento'
      );
      if (res?.empregado) {
        setEmpregadosCache(getEmpregadosCache().map(e => (e.id === id ? res.empregado : e)));
      }
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        const cache = getEmpregadosCache();
        const emp = cache.find(e => e.id === id);
        if (emp) {
          emp.status = 'desligado';
          emp.dataDesligamento = dados.dataDesligamento || new Date().toISOString().split('T')[0];
          setEmpregadosCache([...cache]);
          return { success: true, empregado: emp };
        }
      }
      throw err;
    }
  },

  async getFolha(empresaId: string, competencia: string): Promise<{ competencia: CompetenciaFolha; folhas: FolhaEmpregado[] }> {
    const compDecodificada = decodeURIComponent(competencia || '05/2026');
    const query = `empresaId=${encodeURIComponent(empresaId)}&competencia=${encodeURIComponent(compDecodificada)}`;

    try {
      return await requestJson<{ competencia: CompetenciaFolha; folhas: FolhaEmpregado[] }>(
        `/api/folha?${query}`,
        undefined,
        'obter folha da competência'
      );
    } catch (err: any) {
      try {
        return await requestJson<{ competencia: CompetenciaFolha; folhas: FolhaEmpregado[] }>(
          `/api/folha/${encodeURIComponent(empresaId)}/${encodeURIComponent(compDecodificada)}`,
          undefined,
          'obter folha da competência'
        );
      } catch (pathErr) {
        console.warn('[getFolha] Fallback seguro para folha inicial:', pathErr);
        const compCache = getCompetenciasCache().find(
          c => c.empresaId === empresaId && c.competencia === compDecodificada
        );
        const ativosEmpresa = getEmpregadosCache().filter(
          e => e.empresaId === empresaId && e.status !== 'em_admissao' && e.status !== 'desligado'
        ).length;
        return {
          competencia: compCache || {
            id: `comp-${empresaId}-${compDecodificada.replace(/\D/g, '')}`,
            empresaId,
            competencia: compDecodificada,
            status: 'ABERTA',
            totalEmpregadosAtivos: ativosEmpresa,
            totalCalculados: 0,
            totalProventos: 0,
            totalDescontos: 0,
            totalLiquido: 0,
            totalEncargosEmpresa: 0,
            totalFGTS: 0,
            errosBloqueantes: [],
            alertasRevisao: [],
          },
          folhas: [],
        };
      }
    }
  },

  async calcularFolha(dados: { empresaId: string; competencia: string; empregadoId?: string; tipoFolha?: string }) {
    return requestJson(
      '/api/folha/calcular',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'calcular folha de pagamento'
    );
  },

  async aprovarFecharCompetencia(dados: { empresaId: string; competencia: string; usuario?: string }) {
    return requestJson(
      '/api/folha/aprovar-fechar',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'fechar competência'
    );
  },

  async reabrirCompetencia(dados: { empresaId: string; competencia: string; motivo: string; usuario?: string }) {
    return requestJson(
      '/api/folha/reabrir',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'reabrir competência'
    );
  },

  async atualizarStatusCompetencia(dados: { empresaId: string; competencia: string; status: 'ABERTA' | 'EM_CONFERENCIA' | 'APROVADA' | 'FECHADA'; usuario?: string }) {
    return requestJson(
      '/api/folha/status',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'atualizar status da competência'
    );
  },

  async getAuditoriaComparativa(empresaId: string, competencia: string) {
    const compDecodificada = decodeURIComponent(competencia || '05/2026');
    try {
      return await requestJson(
        `/api/folha/auditoria-comparativa?empresaId=${encodeURIComponent(empresaId)}&competencia=${encodeURIComponent(compDecodificada)}`,
        undefined,
        'consultar auditoria comparativa'
      );
    } catch {
      return {
        competenciaAtual: compDecodificada,
        competenciaAnterior: '',
        totaisAtuais: { totalProventos: 0, totalDescontos: 0, totalLiquido: 0, totalFGTS: 0, totalEncargosEmpresa: 0 },
        totaisAnteriores: { totalProventos: 0, totalDescontos: 0, totalLiquido: 0, totalFGTS: 0, totalEncargosEmpresa: 0 },
        diferencas: { totalProventos: 0, totalDescontos: 0, totalLiquido: 0, totalFGTS: 0, totalEncargosEmpresa: 0 },
        alertasVariacao: [],
        comparativoPorEmpregado: [],
      };
    }
  },

  async importarPlanilha(dados: { nomeArquivo: string; competencia: string; linhas: any[] }) {
    return requestJson(
      '/api/importar-planilha',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'importar planilha'
    );
  },

  // Competências
  async getCompetencias(empresaId: string): Promise<CompetenciaFolha[]> {
    const cacheAtual = getCompetenciasCache();
    const deleted = getDeletedCompetenciasKeys();
    try {
      const remotos = await requestJson<CompetenciaFolha[]>(`/api/competencias/${encodeURIComponent(empresaId)}`, undefined, 'listar competências');
      if (Array.isArray(remotos)) {
        const filtrados = remotos.filter(c => !deleted.has(compKey(c.empresaId || empresaId, c.competencia)));
        const keysRemotas = new Set(filtrados.map(c => compKey(c.empresaId || empresaId, c.competencia)));
        const extrasLocais = cacheAtual.filter(
          c => c.empresaId === empresaId && !keysRemotas.has(compKey(c.empresaId, c.competencia))
        );
        const combinados = ordenarCompetencias([...filtrados, ...extrasLocais]);
        const outrasEmpresas = cacheAtual.filter(c => c.empresaId !== empresaId);
        setCompetenciasCache([...outrasEmpresas, ...combinados]);
        return combinados;
      }
    } catch (err: any) {
      console.warn('[Departamento Fácil] Erro ao listar competências no servidor, recorrendo ao cache local:', err.message);
    }
    return ordenarCompetencias(cacheAtual.filter(c => c.empresaId === empresaId));
  },

  async criarCompetencia(dados: { empresaId: string; competencia: string; tipoFolha?: string; parcela13?: string }): Promise<{ success: boolean; existe?: boolean; competencia?: CompetenciaFolha; message?: string }> {
    const cacheAtual = getCompetenciasCache();
    try {
      const res = await requestJson<{ success: boolean; existe?: boolean; competencia?: CompetenciaFolha; message?: string }>(
        '/api/competencias',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        },
        'criar competência'
      );
      if (res?.competencia) {
        unmarkCompetenciaDeletedLocal(dados.empresaId, res.competencia.competencia);
        const keyNova = compKey(dados.empresaId, res.competencia.competencia);
        const semDuplicada = cacheAtual.filter(c => compKey(c.empresaId, c.competencia) !== keyNova);
        setCompetenciasCache([...semDuplicada, res.competencia]);
      }
      return { ...res, success: res?.success ?? true };
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        console.warn('[Departamento Fácil] Backend indisponível ao criar competência. Salvando localmente:', err.message);
        unmarkCompetenciaDeletedLocal(dados.empresaId, dados.competencia);
        const existente = cacheAtual.find(
          c => c.empresaId === dados.empresaId && c.competencia === dados.competencia
        );
        if (existente) {
          return {
            success: true,
            existe: true,
            competencia: existente,
            message: 'Competência já existente.',
          };
        }
        const ativosCount = getEmpregadosCache().filter(
          e => e.empresaId === dados.empresaId && e.status !== 'em_admissao' && e.status !== 'desligado'
        ).length;
        const novaComp: CompetenciaFolha = {
          id: `comp-${dados.empresaId}-${dados.competencia.replace(/\D/g, '')}`,
          empresaId: dados.empresaId,
          competencia: dados.competencia,
          status: 'ABERTA',
          tipoFolha: (dados.tipoFolha as any) || 'MENSAL',
          parcela13: dados.parcela13 as any,
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
        setCompetenciasCache([...cacheAtual, novaComp]);
        return {
          success: true,
          existe: false,
          competencia: novaComp,
          message: `Competência ${dados.competencia} criada com sucesso.`,
        };
      }
      throw err;
    }
  },

  async atualizarCompetencia(empresaId: string, competencia: string, dados: { novaCompetencia?: string; tipoFolha?: string }) {
    const cacheAtual = getCompetenciasCache();
    try {
      const res: any = await requestJson(
        `/api/competencias/${encodeURIComponent(empresaId)}/${encodeURIComponent(competencia)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        },
        'atualizar competência'
      );
      const atualizado = cacheAtual.map(c =>
        c.empresaId === empresaId && c.competencia === competencia ? res : c
      );
      setCompetenciasCache(atualizado);
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        const comp = cacheAtual.find(c => c.empresaId === empresaId && c.competencia === competencia);
        if (comp) {
          if (dados.novaCompetencia && dados.novaCompetencia !== competencia) {
            if (cacheAtual.some(c => c.empresaId === empresaId && c.competencia === dados.novaCompetencia)) {
              throw new Error(`A competência ${dados.novaCompetencia} já existe nesta empresa.`);
            }
            markCompetenciaDeletedLocal(empresaId, competencia);
            unmarkCompetenciaDeletedLocal(empresaId, dados.novaCompetencia);
            comp.competencia = dados.novaCompetencia;
          }
          if (dados.tipoFolha) comp.tipoFolha = dados.tipoFolha as any;
          setCompetenciasCache([...cacheAtual]);
          return comp;
        }
      }
      throw err;
    }
  },

  async excluirCompetencia(empresaId: string, competencia: string, force?: boolean): Promise<{ success: boolean; message: string }> {
    const cacheAtual = getCompetenciasCache();
    try {
      const res = await requestJson<{ success: boolean; message: string }>(
        `/api/competencias/${encodeURIComponent(empresaId)}/${encodeURIComponent(competencia)}?force=${Boolean(force)}`,
        { method: 'DELETE' },
        'excluir competência'
      );
      markCompetenciaDeletedLocal(empresaId, competencia);
      setCompetenciasCache(cacheAtual.filter(c => !(c.empresaId === empresaId && c.competencia === competencia)));
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        markCompetenciaDeletedLocal(empresaId, competencia);
        setCompetenciasCache(cacheAtual.filter(c => !(c.empresaId === empresaId && c.competencia === competencia)));
        return { success: true, message: `Competência ${competencia} excluída com sucesso.` };
      }
      throw err;
    }
  },

  async getLancamentos(competencia?: string, empregadoId?: string, empresaId?: string): Promise<LancamentoVariavel[]> {
    let url = '/api/lancamentos-variaveis?';
    if (competencia) url += `competencia=${encodeURIComponent(competencia)}&`;
    if (empregadoId) url += `empregadoId=${empregadoId}&`;
    if (empresaId) url += `empresaId=${empresaId}&`;
    try {
      return await requestJson<LancamentoVariavel[]>(url, undefined, 'listar lançamentos variáveis');
    } catch {
      return [];
    }
  },

  async getLancamentosVariaveis(empresaId: string, competencia: string): Promise<LancamentoVariavel[]> {
    return this.getLancamentos(competencia, undefined, empresaId);
  },

  async salvarLancamento(lancamento: Partial<LancamentoVariavel>) {
    return requestJson(
      '/api/lancamentos-variaveis',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lancamento),
      },
      'salvar lançamento'
    );
  },

  async editarLancamento(id: string, lancamento: Partial<LancamentoVariavel>) {
    return requestJson(
      `/api/lancamentos-variaveis/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lancamento),
      },
      'editar lançamento'
    );
  },

  async excluirLancamento(id: string) {
    return requestJson(
      `/api/lancamentos-variaveis/${id}`,
      { method: 'DELETE' },
      'excluir lançamento'
    );
  },

  async salvarLancamentosLote(dados: { lancamentos: Partial<LancamentoVariavel>[] }) {
    return requestJson(
      '/api/lancamentos-variaveis/lote',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'salvar lançamentos em lote'
    );
  },

  async getFerias(empresaId: string): Promise<PeriodoFerias[]> {
    try {
      return await requestJson(`/api/ferias/${empresaId}`, undefined, 'listar férias');
    } catch {
      return [];
    }
  },

  async programarFerias(dados: { empregadoId: string; dataInicio: string; diasGozo: number; abonoPecuniario: boolean; adiantamento13: boolean }) {
    return requestJson(
      '/api/ferias/programar',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'programar férias'
    );
  },

  async getRescisoes(empresaId: string): Promise<RescisaoSimulada[]> {
    const cacheAtual = getRescisoesCache();
    try {
      const remotos = await requestJson<RescisaoSimulada[]>(
        `/api/rescisoes/${encodeURIComponent(empresaId)}`,
        undefined,
        'listar rescisões'
      );
      if (Array.isArray(remotos)) {
        const idsRemotos = new Set(remotos.map(r => r.id));
        const locaisExtras = cacheAtual.filter(
          r => r.empresaId === empresaId && r.status !== 'CANCELADA' && !idsRemotos.has(r.id)
        );
        const combinados = [...remotos, ...locaisExtras];
        const outrasEmpresas = cacheAtual.filter(r => r.empresaId !== empresaId);
        setRescisoesCache([...outrasEmpresas, ...combinados]);
        return combinados;
      }
    } catch (err: any) {
      console.warn('[Departamento Fácil] Erro ao listar rescisões no servidor, usando cache local:', err.message);
    }
    return cacheAtual.filter(r => r.empresaId === empresaId && r.status !== 'CANCELADA');
  },

  async simularRescisao(dados: {
    empregadoId: string;
    motivo: string;
    dataDesligamento: string;
    tipoAviso: string;
    saldoFGTSComprovado?: number;
    adiantamentoPago?: number;
    empregado?: Empregado;
  }): Promise<RescisaoSimulada> {
    try {
      return await requestJson<RescisaoSimulada>(
        '/api/rescisao/simular',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        },
        'simular rescisão'
      );
    } catch (err: any) {
      const empFallback =
        dados.empregado || getEmpregadosCache().find(e => e.id === dados.empregadoId);
      if (
        empFallback &&
        (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404 || err.status >= 500)
      ) {
        console.warn('[Departamento Fácil] Calculando simulação de rescisão em modo contingência local:', err.message);
        return calcularRescisaoCompleta(
          empFallback,
          dados.motivo as MotivoRescisao,
          dados.dataDesligamento,
          dados.tipoAviso as 'TRABALHADO' | 'INDENIZADO' | 'DISPENSADO',
          Number(dados.saldoFGTSComprovado || 0),
          Number(dados.adiantamentoPago || 0)
        );
      }
      throw err;
    }
  },

  async confirmarRescisao(rescisao: RescisaoSimulada, empregadoFallback?: Empregado) {
    const rescisaoFinal: RescisaoSimulada = {
      ...rescisao,
      status: 'CONFIRMADA',
      isMinuta: false,
      dataConfirmacao: rescisao.dataConfirmacao || new Date().toISOString(),
    };
    const empCache = getEmpregadosCache();
    const empAlvo = empregadoFallback || empCache.find(e => e.id === rescisaoFinal.empregadoId);

    const atualizarCachesPosConfirmacao = (empAtualizado?: Empregado, rescisaoAtualizada?: RescisaoSimulada) => {
      const resc = rescisaoAtualizada || rescisaoFinal;
      const rescCache = getRescisoesCache();
      const idx = rescCache.findIndex(r => r.id === resc.id);
      setRescisoesCache(idx >= 0 ? rescCache.map(r => (r.id === resc.id ? resc : r)) : [...rescCache, resc]);

      const empObj = empAtualizado || empAlvo;
      if (empObj) {
        empObj.status = 'desligado';
        empObj.dataDesligamento = resc.dataDesligamento;
        const exists = empCache.some(e => e.id === empObj.id);
        setEmpregadosCache(exists ? empCache.map(e => (e.id === empObj.id ? empObj : e)) : [...empCache, empObj]);

        const docs = getDocumentosCache();
        const trctDocId = `doc-trct-${resc.id}`;
        if (!docs.some(d => d.id === trctDocId)) {
          setDocumentosCache([
            ...docs,
            {
              id: trctDocId,
              empresaId: empObj.empresaId,
              empregadoId: empObj.id,
              tipo: 'TRCT',
              titulo: `TRCT e Termo de Homologação - ${empObj.nomeCompleto}`,
              conteudoHtml: 'Termo de Rescisão do Contrato de Trabalho gerado na homologação.',
              dataEmissao: resc.dataDesligamento,
              status: 'EMITIDO',
              versao: 1,
            },
          ]);
        }
      }
    };

    try {
      const res: any = await requestJson(
        '/api/rescisao/confirmar',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rescisao: rescisaoFinal, empregado: empAlvo }),
        },
        'confirmar rescisão'
      );
      atualizarCachesPosConfirmacao(res?.empregado, res?.rescisao);
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        atualizarCachesPosConfirmacao(empAlvo, rescisaoFinal);
        return { success: true, rescisao: rescisaoFinal, empregado: empAlvo };
      }
      throw err;
    }
  },

  async cancelarRescisao(dados: {
    empregadoId: string;
    rescisaoId?: string;
    motivo?: string;
    empregado?: Empregado;
  }): Promise<{ success: boolean; empregado?: Empregado; rescisoesCanceladas?: number; message?: string }> {
    const empCache = getEmpregadosCache();
    const empAlvo = dados.empregado || empCache.find(e => e.id === dados.empregadoId);

    const atualizarCachesPosCancelamento = (empAtualizado?: Empregado) => {
      const agora = new Date().toISOString();
      const rescCache = getRescisoesCache().map(r => {
        if (r.empregadoId === dados.empregadoId && r.status !== 'CANCELADA' && (!dados.rescisaoId || r.id === dados.rescisaoId)) {
          return {
            ...r,
            status: 'CANCELADA' as const,
            dataCancelamento: agora,
            motivoCancelamento: dados.motivo || 'Cancelada pelo operador do DP',
          };
        }
        return r;
      });
      setRescisoesCache(rescCache);

      const empObj = empAtualizado || empAlvo;
      if (empObj) {
        empObj.status = 'ativo';
        delete empObj.dataDesligamento;
        const exists = empCache.some(e => e.id === empObj.id);
        setEmpregadosCache(exists ? empCache.map(e => (e.id === empObj.id ? empObj : e)) : [...empCache, empObj]);
      }

      const docs = getDocumentosCache().filter(
        d => !(d.empregadoId === dados.empregadoId && d.tipo === 'TRCT' && d.status !== 'RECIBO_ASSINADO')
      );
      setDocumentosCache(docs);
    };

    try {
      const res: any = await requestJson(
        '/api/rescisao/cancelar',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...dados, empregado: empAlvo }),
        },
        'cancelar rescisão'
      );
      atualizarCachesPosCancelamento(res?.empregado);
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        atualizarCachesPosCancelamento(empAlvo);
        return {
          success: true,
          empregado: empAlvo,
          message: `Rescisão de ${empAlvo?.nomeCompleto || 'colaborador'} cancelada e vínculo reativado com sucesso.`,
        };
      }
      throw err;
    }
  },

  async getDocumentos(empresaId: string): Promise<ContratoDocumento[]> {
    // Garante geração local de contratos de admissão para todos os colaboradores da empresa que já não estão em rascunho
    const empsEmpresa = getEmpregadosCache().filter(
      e => e.empresaId === empresaId && e.status !== 'em_admissao'
    );
    for (const emp of empsEmpresa) {
      ensureContratoAdmissaoLocal(emp);
    }

    const cacheAtual = getDocumentosCache();
    try {
      const remotos = await requestJson<ContratoDocumento[]>(
        `/api/documentos/${encodeURIComponent(empresaId)}`,
        undefined,
        'listar documentos'
      );
      if (Array.isArray(remotos)) {
        const idsRemotos = new Set(remotos.map(d => d.id));
        const locaisExtras = cacheAtual.filter(
          d => d.empresaId === empresaId && !idsRemotos.has(d.id)
        );
        const combinados = [...remotos, ...locaisExtras];
        const outrasEmpresas = cacheAtual.filter(d => d.empresaId !== empresaId);
        setDocumentosCache([...outrasEmpresas, ...combinados]);
        return combinados;
      }
    } catch (err: any) {
      console.warn('[Departamento Fácil] Erro ao listar documentos no servidor, recorrendo ao cache local:', err.message);
    }
    return cacheAtual.filter(d => d.empresaId === empresaId);
  },

  async atualizarStatusDocumento(dados: { documentoId: string; status: string; dataPagamento?: string; dataAssinatura?: string; assinanteNome?: string; comprovanteAnexo?: string }) {
    const cacheAtual = getDocumentosCache();
    try {
      const res: any = await requestJson(
        '/api/documentos/status',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        },
        'atualizar status do documento'
      );
      setDocumentosCache(cacheAtual.map(d => (d.id === dados.documentoId ? res : d)));
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.isHtmlResponse || err.isBackendUnavailable || err.status === 404) {
        const doc = cacheAtual.find(d => d.id === dados.documentoId);
        if (doc) {
          doc.status = dados.status as any;
          if (dados.dataPagamento) doc.dataPagamento = dados.dataPagamento;
          if (dados.dataAssinatura) doc.dataAssinatura = dados.dataAssinatura;
          if (dados.assinanteNome) doc.assinanteNome = dados.assinanteNome;
          if (dados.comprovanteAnexo) doc.comprovanteAnexo = dados.comprovanteAnexo;
          setDocumentosCache([...cacheAtual]);
          return doc;
        }
      }
      throw err;
    }
  },

  async getMovimentacoes(empresaId: string, competencia: string): Promise<MovimentacaoMensalEmpresa[]> {
    try {
      const compDecodificada = decodeURIComponent(competencia || '05/2026');
      return await requestJson(
        `/api/movimentacoes?empresaId=${encodeURIComponent(empresaId)}&competencia=${encodeURIComponent(compDecodificada)}`,
        undefined,
        'listar movimentações'
      );
    } catch {
      return [];
    }
  },

  async enviarMovimentacao(dados: Partial<MovimentacaoMensalEmpresa>) {
    return requestJson(
      '/api/movimentacoes',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'enviar movimentação'
    );
  },

  async getAgenda(empresaId: string): Promise<ItemAgendaObrigacao[]> {
    try {
      return await requestJson(`/api/agenda/${empresaId}`, undefined, 'obter agenda de obrigações');
    } catch {
      return [];
    }
  },

  async getAfastamentos(empresaId: string): Promise<Afastamento[]> {
    try {
      return await requestJson(`/api/afastamentos/${empresaId}`, undefined, 'listar afastamentos');
    } catch {
      return [];
    }
  },

  async salvarAfastamento(dados: Partial<Afastamento>) {
    return requestJson(
      '/api/afastamentos',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'salvar afastamento'
    );
  },

  async getESocial(empresaId: string): Promise<ESocialEvento[]> {
    try {
      return await requestJson(`/api/esocial/${empresaId}`, undefined, 'listar eventos do eSocial');
    } catch {
      return [];
    }
  },

  async transmitirESocial(eventoId: string) {
    return requestJson(
      '/api/esocial/transmitir',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventoId }),
      },
      'transmitir evento do eSocial'
    );
  },

  async consultarIA(pergunta: string, contexto?: any): Promise<{ resposta: string }> {
    return requestJson(
      '/api/ai/consultar',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta, contexto }),
      },
      'consultar assistente IA de DP'
    );
  },
};
