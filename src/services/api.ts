import { Empresa, Empregado, FolhaEmpregado, CompetenciaFolha, LancamentoVariavel, PeriodoFerias, RescisaoSimulada, ContratoDocumento, Afastamento, ItemAgendaObrigacao, ESocialEvento, MovimentacaoMensalEmpresa } from '../types/dp';
import { EMPRESAS_INICIAIS } from '../data/initialData';

// URL base configurável via variável de ambiente VITE_API_URL
const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  ''
).replace(/\/$/, '');

// Cache local de segurança para contingência caso a rota do servidor esteja offline ou em deploy estático puro
const CACHE_EMPRESAS_KEY = 'dp_facil_empresas_cache_v1';

function getEmpresasCache(): Empresa[] {
  try {
    if (typeof window === 'undefined') return EMPRESAS_INICIAIS;
    const item = localStorage.getItem(CACHE_EMPRESAS_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler cache local de empresas:', e);
  }
  return EMPRESAS_INICIAIS;
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

/**
 * Função utilitária central de requisição segura.
 * - Verifica o status HTTP antes de processar
 * - Verifica o cabeçalho Content-Type para evitar parse de HTML como JSON
 * - Fornece mensagens descritivas para 404, falhas de rota na Vercel e erros de servidor
 */
async function requestJson<T>(
  url: string,
  options?: RequestInit,
  actionDescription: string = 'processar requisição'
): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  let res: Response;

  try {
    res = await fetch(fullUrl, options);
  } catch (netErr: any) {
    throw new Error(
      `Falha de conexão com o servidor ao ${actionDescription}: ${netErr.message || 'Verifique sua conexão de rede ou a URL da API.'}`
    );
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
        const error = new Error(
          errPayload.error || errPayload.message || `Erro HTTP ${res.status} ao ${actionDescription}`
        ) as any;
        error.status = res.status;
        error.vinculos = errPayload.vinculos;
        error.podeInativar = errPayload.podeInativar;
        error.sugestao = errPayload.sugestao;
        error.podeDesligar = errPayload.podeDesligar;
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
      throw err;
    }

    const err = new Error(
      `O servidor retornou status ${res.status} (${res.statusText || 'Erro'}) ao ${actionDescription}.`
    ) as any;
    err.status = res.status;
    throw err;
  }

  if (!isJson) {
    const rawText = await res.text().catch(() => '');
    if (rawText.includes('The page') || rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
      const err = new Error(
        `Resposta inesperada do servidor (HTML em vez de JSON ao ${actionDescription}). O endpoint "${url}" não está roteando para o backend.`
      ) as any;
      err.isHtmlResponse = true;
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
        setEmpresasCache(empresas);
        return empresas;
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

      // Atualiza cache de contingência
      const novasEmpresas = empresa.id
        ? cacheAtual.map(e => (e.id === salva.id ? salva : e))
        : [...cacheAtual, salva];
      setEmpresasCache(novasEmpresas);

      return salva;
    } catch (err: any) {
      // Se a falha for 404 (deploy puramente estático sem Serverless Function ativa na Vercel),
      // salvamos no armazenamento local persistente de contingência para que o usuário não perca seu trabalho!
      if (err.isNotFound || err.isHtmlResponse || (err.status === 404)) {
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
      if (err.isNotFound || err.status === 404) {
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

  async excluirEmpresa(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await requestJson<{ success: boolean; message: string }>(
        `/api/empresas/${id}`,
        { method: 'DELETE' },
        'excluir empresa'
      );
      const cache = getEmpresasCache().filter(e => e.id !== id);
      setEmpresasCache(cache);
      return res;
    } catch (err: any) {
      if (err.isNotFound || err.status === 404) {
        const cache = getEmpresasCache().filter(e => e.id !== id);
        setEmpresasCache(cache);
        return { success: true, message: 'Empresa removida com sucesso do armazenamento.' };
      }
      throw err;
    }
  },

  async getEmpregados(empresaId?: string): Promise<Empregado[]> {
    const url = empresaId ? `/api/empregados?empresaId=${empresaId}` : '/api/empregados';
    try {
      return await requestJson<Empregado[]>(url, undefined, 'listar colaboradores');
    } catch (err) {
      console.warn('Erro ao carregar colaboradores do servidor:', err);
      return [];
    }
  },

  async salvarEmpregado(empregado: Partial<Empregado>): Promise<Empregado> {
    const method = empregado.id ? 'PUT' : 'POST';
    const url = empregado.id ? `/api/empregados/${empregado.id}` : '/api/empregados';
    return requestJson<Empregado>(
      url,
      {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empregado),
      },
      'salvar colaborador'
    );
  },

  async registrarAlteracaoEmpregado(id: string, dados: { tipo: string; valorNovo: any; dataVigencia: string; motivo: string; responsavel: string }) {
    return requestJson(
      `/api/empregados/${id}/alteracao`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'registrar alteração contratual'
    );
  },

  async aprovarAdmissao(id: string) {
    return requestJson(
      `/api/empregados/${id}/aprovar-admissao`,
      { method: 'POST' },
      'aprovar admissão'
    );
  },

  async excluirEmpregado(id: string): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(
      `/api/empregados/${id}`,
      { method: 'DELETE' },
      'excluir colaborador'
    );
  },

  async registrarDesligamento(id: string, dados: { dataDesligamento: string; motivo: string; observacoes?: string }) {
    return requestJson(
      `/api/empregados/${id}/desligamento`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'registrar desligamento'
    );
  },

  async getFolha(empresaId: string, competencia: string): Promise<{ competencia: CompetenciaFolha; folhas: FolhaEmpregado[] }> {
    return requestJson(
      `/api/folha/${empresaId}/${encodeURIComponent(competencia)}`,
      undefined,
      'obter folha da competência'
    );
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
    return requestJson(
      `/api/folha/auditoria-comparativa/${empresaId}/${encodeURIComponent(competencia)}`,
      undefined,
      'consultar auditoria comparativa'
    );
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
    try {
      return await requestJson<CompetenciaFolha[]>(`/api/competencias/${empresaId}`, undefined, 'listar competências');
    } catch {
      return [];
    }
  },

  async criarCompetencia(dados: { empresaId: string; competencia: string; tipoFolha?: string; parcela13?: string }): Promise<{ success: boolean; existe?: boolean; competencia?: CompetenciaFolha; message?: string }> {
    return requestJson<{ success: boolean; existe?: boolean; competencia?: CompetenciaFolha; message?: string }>(
      '/api/competencias',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'criar competência'
    );
  },

  async atualizarCompetencia(empresaId: string, competencia: string, dados: { novaCompetencia?: string; tipoFolha?: string }) {
    return requestJson(
      `/api/competencias/${empresaId}/${encodeURIComponent(competencia)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'atualizar competência'
    );
  },

  async excluirCompetencia(empresaId: string, competencia: string, force?: boolean): Promise<{ success: boolean; message: string }> {
    return requestJson(
      `/api/competencias/${empresaId}/${encodeURIComponent(competencia)}?force=${Boolean(force)}`,
      { method: 'DELETE' },
      'excluir competência'
    );
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

  async simularRescisao(dados: { empregadoId: string; motivo: string; dataDesligamento: string; tipoAviso: string; saldoFGTSComprovado?: number; adiantamentoPago?: number }): Promise<RescisaoSimulada> {
    return requestJson(
      '/api/rescisao/simular',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'simular rescisão'
    );
  },

  async confirmarRescisao(rescisao: RescisaoSimulada) {
    return requestJson(
      '/api/rescisao/confirmar',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rescisao),
      },
      'confirmar rescisão'
    );
  },

  async getDocumentos(empresaId: string): Promise<ContratoDocumento[]> {
    try {
      return await requestJson(`/api/documentos/${empresaId}`, undefined, 'listar documentos');
    } catch {
      return [];
    }
  },

  async atualizarStatusDocumento(dados: { documentoId: string; status: string; dataPagamento?: string; dataAssinatura?: string; assinanteNome?: string; comprovanteAnexo?: string }) {
    return requestJson(
      '/api/documentos/status',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      },
      'atualizar status do documento'
    );
  },

  async getMovimentacoes(empresaId: string, competencia: string): Promise<MovimentacaoMensalEmpresa[]> {
    try {
      return await requestJson(
        `/api/movimentacoes/${empresaId}/${encodeURIComponent(competencia)}`,
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
